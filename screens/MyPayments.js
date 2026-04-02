import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ImageBackground,
  Image,
  Dimensions,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import MemberIdService from '../service/MemberIdService';
import CompanyNameService from '../service/CompanyNameService';
import SpeechToTextInput from '../components/SpeechToTextInput';

const { width } = Dimensions.get('window');

// Use the correct API base URL
const API_BASE_URL = 'https://www.vivifysoft.in/AlaigalBE';

const ApiService = {
  async request(method, url, data = null) {
    try {
      // Try different token storage keys
      const token = await AsyncStorage.getItem('jwt_token') ||
        await AsyncStorage.getItem('token') ||
        await AsyncStorage.getItem('authToken');

      const config = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      };

      if (data) config.body = JSON.stringify(data);

      console.log(`${method} ${url}`, data ? `with data: ${JSON.stringify(data)}` : '');

      const response = await fetch(`${API_BASE_URL}${url}`, config);

      const responseText = await response.text();
      console.log(`Response status: ${response.status}`, responseText);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${responseText}`);
      }

      return responseText ? JSON.parse(responseText) : {};
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  },

  get: (url) => ApiService.request('GET', url),
  post: (url, data) => ApiService.request('POST', url, data),
};

const MyPayments = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [payments, setPayments] = useState([]);
  const [dueMonths, setDueMonths] = useState([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [totalDue, setTotalDue] = useState(0);
  const [memberName, setMemberName] = useState('');
  const [companyName, setCompanyName] = useState('Alaigal');
  const [currentMemberId, setCurrentMemberId] = useState(null);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [showPaymentDatePicker, setShowPaymentDatePicker] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'UPI',
    transactionId: '',
    paymentForMonth: '', // e.g., "Jan,Feb,Mar"
    paymentDate: new Date(),
  });
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  // Load member ID on component mount
  useEffect(() => {
    const loadMemberId = async () => {
      const id = await getMemberId();
      setCurrentMemberId(id);
      const name = await CompanyNameService.getCompanyName();
      setCompanyName(name);
    };
    loadMemberId();
  }, []);

  const getMemberId = async () => {
    try {
      const memberId = await MemberIdService.getCurrentUserMemberId();
      if (memberId) {
        setCurrentMemberId(memberId);
        return memberId;
      }
      return null;
    } catch (error) {
      console.error('Error getting member ID:', error);
      return null;
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadPaymentData();
    }, [])
  );

  const loadPaymentData = async () => {
    try {
      setLoading(true);
      const memberId = await getMemberId();
      if (!memberId) {
        Alert.alert('Error', 'Member ID not found. Please log in again.');
        return;
      }

      // Get payment data from backend
      const response = await ApiService.get(`/api/Payments/member/${memberId}`);

      console.log('API Response:', JSON.stringify(response, null, 2));

      // Map payments for UI - using correct field names from API
      const mappedPayments = (response.payments || []).map((p, index) => ({
        id: p.paymentId?.toString() || index.toString(),
        month: p.paymentForMonth || 'Unknown', // Changed from PaymentForMonth
        amount: p.amount || 0,
        status: p.status || (p.receiptNo ? 'Paid' : 'Unpaid'),
        dueDate: p.paymentEndDate ? new Date(p.paymentEndDate).toISOString().split('T')[0] : 'N/A',
        paidDate: p.paymentDate ? new Date(p.paymentDate).toISOString().split('T')[0] : null,
        type: 'Monthly',
        receiptId: p.receiptNo || null, // Changed from ReceiptNo
        transactionId: p.transactionId || null, // Note: API returns transactionId
        paymentMethod: p.paymentMethod || 'Unknown',
      }));

      console.log('Mapped payments:', mappedPayments);

      setPayments(mappedPayments);
      setDueMonths(response.dueMonths || []);
      setTotalPaid(response.totalPaidAmount || 0);
      setTotalDue(response.totalDueAmount || 0);
      setMemberName(response.memberName || '');
    } catch (error) {
      console.error('Load Payments Error:', error);
      Alert.alert('Error', error.message || 'Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPaymentData();
    setRefreshing(false);
  };
  const handleAddPayment = async () => {
    // Validation
    if (!paymentForm.amount.trim() || isNaN(paymentForm.amount) || parseFloat(paymentForm.amount) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid amount');
      return;
    }
    if (!paymentForm.transactionId.trim()) {
      Alert.alert('Validation Error', 'Please enter Transaction ID');
      return;
    }
    if (!paymentForm.paymentForMonth.trim()) {
      Alert.alert('Validation Error', 'Please enter month (e.g., Jan or January)');
      return;
    }

    const memberId = await getMemberId();
    if (!memberId) {
      Alert.alert('Error', 'Member ID not found. Please log in again.');
      return;
    }

    // Get auth token
    let authToken;
    try {
      authToken = await AsyncStorage.getItem('userToken') ||
        await AsyncStorage.getItem('jwt_token') ||
        await AsyncStorage.getItem('token') ||
        await AsyncStorage.getItem('authToken');

      if (!authToken) {
        Alert.alert('Authentication Error', 'Please login again. Token not found.');
        navigation.navigate('Login');
        return;
      }
    } catch (error) {
      console.error('Error getting token:', error);
      Alert.alert('Error', 'Unable to retrieve authentication token');
      return;
    }

    // Format month properly - single month only (not multiple)
    const monthInput = paymentForm.paymentForMonth.trim();
    let formattedMonth = '';

    // Convert to proper month name format
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const monthAbbreviations = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    // Check if input is a valid month (full name or abbreviation)
    const lowerInput = monthInput.toLowerCase();
    let isValidMonth = false;

    // Check full month names
    for (let i = 0; i < monthNames.length; i++) {
      if (lowerInput === monthNames[i].toLowerCase() ||
        lowerInput === monthAbbreviations[i].toLowerCase()) {
        formattedMonth = monthAbbreviations[i]; // Use abbreviated month name (Jan, Feb, etc.)
        isValidMonth = true;
        break;
      }
    }

    // Check month abbreviations
    if (!isValidMonth) {
      Alert.alert('Validation Error', 'Please enter a valid month name (e.g., Jan or January)');
      return;
    }

    // Create payload matching backend DTO structure
    const payload = {
      MemberId: parseInt(memberId),
      Amount: parseFloat(paymentForm.amount),
      PaymentType: "Monthly", // According to your backend, this is required
      PaymentMethod: paymentForm.paymentMethod || "UPI",
      TransactionId: paymentForm.transactionId.trim(),
      PaymentForMonth: formattedMonth, // Single month name like "January"
      PaymentDate: paymentForm.paymentDate.toISOString().split('T')[0], // YYYY-MM-DD format
      Status: "Paid", // Default status
      CreatedBy: "Member" // Or get from user info
    };

    console.log('Submitting payment with payload:', JSON.stringify(payload, null, 2));

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/Inventory/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
      });

      console.log('Response status:', response.status);

      const responseText = await response.text();
      console.log('Response text:', responseText);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: `;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage += errorData.message || errorData.error || errorData.title || responseText;
        } catch (e) {
          errorMessage += responseText || 'Unknown error occurred';
        }
        throw new Error(errorMessage);
      }

      // Parse response
      let result = {};
      if (responseText) {
        try {
          result = JSON.parse(responseText);
          console.log('Payment created successfully:', result);
        } catch (e) {
          console.warn('Response parsing warning:', e.message);
          result = { message: 'Payment submitted successfully' };
        }
      }

      // Show success message with receipt number
      const receiptNumber = result.receiptNumber || result.data?.receiptNumber;
      const successMessage = receiptNumber
        ? `Payment submitted successfully!\nReceipt Number: ${receiptNumber}`
        : 'Payment submitted successfully!';

      Alert.alert('Success', successMessage);

      // Reset form
      setPaymentForm({
        amount: '',
        paymentMethod: 'UPI',
        transactionId: '',
        paymentForMonth: '',
        paymentDate: new Date(),
      });
      setShowAddPaymentModal(false);

      // Refresh payment list
      setTimeout(() => {
        loadPaymentData();
      }, 1000);

    } catch (error) {
      console.error('Submit Payment Error:', error);

      let errorMsg = error.message || 'Failed to submit payment';
      if (error.message.includes('Network request failed')) {
        errorMsg = 'Network error. Please check your internet connection.';
      } else if (error.message.includes('401')) {
        errorMsg = 'Session expired. Please login again.';
      } else if (error.message.includes('403')) {
        errorMsg = 'Access denied. Please check your permissions.';
      } else if (error.message.includes('500')) {
        errorMsg = 'Server error. Please try again later.';
      } else if (error.message.includes('400')) {
        errorMsg = 'Invalid payment data. Please check your inputs.';
      } else if (error.message.includes('member not found')) {
        errorMsg = 'Member not found. Please check your member ID.';
      }

      Alert.alert('Payment Error', errorMsg);

      // Redirect to login on auth errors
      if (error.message.includes('401') || error.message.includes('403')) {
        setTimeout(() => {
          navigation.navigate('Login');
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentDateChange = (event, selectedDate) => {
    setShowPaymentDatePicker(false);
    if (selectedDate) {
      setPaymentForm(prev => ({ ...prev, paymentDate: selectedDate }));
    }
  };

  const handleViewReceipt = (payment) => {
    setSelectedPayment(payment);
    setShowReceiptModal(true);
  };

  const handleDownloadReceipt = async () => {
    if (!selectedPayment) return;

    try {
      const receiptContent = `
ALAIGAL MEMBERS NETWORK
================================

PAYMENT RECEIPT

Receipt ID: ${selectedPayment.receiptId}
Date: ${selectedPayment.paidDate}
Payment Method: ${selectedPayment.paymentMethod}

MEMBER DETAILS
Name: ${memberName || 'N/A'}
Member ID: ${currentMemberId ? `MEM-${currentMemberId}` : 'N/A'}

PAYMENT DETAILS
Month: ${selectedPayment.month}
Amount: ₹${selectedPayment.amount.toLocaleString()}
Payment Type: ${selectedPayment.type}
Status: ${selectedPayment.status}
Due Date: ${selectedPayment.dueDate}
Paid Date: ${selectedPayment.paidDate}

TRANSACTION DETAILS
Transaction ID: ${selectedPayment.transactionId || 'N/A'}

Thank you for your payment!

For queries, contact: support@alaigal.com
Phone: +91-XXXXXXXXXX

================================
This is an electronically generated receipt.
      `;

      const fileName = `Receipt_${selectedPayment.receiptId || Date.now()}.txt`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(filePath, receiptContent);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'text/plain',
          dialogTitle: 'Download Receipt',
        });
      }
    } catch (error) {
      console.error('Download Receipt Error:', error);
      Alert.alert('Error', 'Failed to download receipt');
    }
  };

  const handlePayNow = (payment) => {
    Alert.alert('Make Payment', `Pay ₹${payment.amount} for ${payment.month}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Pay Now', onPress: () => {
          // For unpaid items, open add payment modal with pre-filled data
          setPaymentForm({
            amount: payment.amount.toString(),
            paymentMethod: 'UPI',
            transactionId: '',
            paymentForMonth: payment.month,
            paymentDate: new Date(),
          });
          setShowAddPaymentModal(true);
        }
      },
    ]);
  };

  const renderPaymentItem = ({ item }) => (
    <View style={styles.paymentCard}>
      <View style={styles.paymentHeader}>
        <View style={styles.paymentInfo}>
          <Text style={styles.paymentMonth}>{item.month}</Text>
          <Text style={styles.paymentType}>{item.type} Payment</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'Paid' ? '#4CAF50' : '#FF9800' }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <View style={styles.paymentDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Amount:</Text>
          <Text style={styles.detailValue}>₹{item.amount.toLocaleString()}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Due Date:</Text>
          <Text style={styles.detailValue}>{item.dueDate}</Text>
        </View>
        {item.status === 'Paid' && item.paidDate && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Paid Date:</Text>
            <Text style={styles.detailValue}>{item.paidDate}</Text>
          </View>
        )}
        {item.receiptId && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Receipt ID:</Text>
            <Text style={styles.detailValue}>{item.receiptId}</Text>
          </View>
        )}
        {item.paymentMethod && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Method:</Text>
            <Text style={styles.detailValue}>{item.paymentMethod}</Text>
          </View>
        )}
      </View>
      {item.status === 'Unpaid' && (
        <TouchableOpacity style={styles.payButton} onPress={() => handlePayNow(item)}>
          <Icon name="credit-card" size={18} color="#FFF" />
          <Text style={styles.payButtonText}>Pay Now</Text>
        </TouchableOpacity>
      )}
      {item.status === 'Paid' && (
        <TouchableOpacity
          style={styles.receiptButton}
          onPress={() => handleViewReceipt(item)}
        >
          <Icon name="file-document" size={18} color="#4A90E2" />
          <Text style={styles.receiptButtonText}>View Receipt</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderDueMonthItem = ({ item }) => (
    <View style={styles.dueMonthCard}>
      <Text style={styles.dueMonthText}>{item.Month || item.month}</Text>
      <Text style={styles.dueAmountText}>₹{item.DueAmount || item.dueAmount}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#4A90E2" barStyle="light-content" />
      <LinearGradient colors={['#4A90E2', '#87CEEB']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Payments</Text>
        <TouchableOpacity onPress={() => setShowAddPaymentModal(true)}>
          <Icon name="plus-circle" size={24} color="#FFF" />
        </TouchableOpacity>
      </LinearGradient>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Loading payments...</Text>
        </View>
      ) : (
        <ImageBackground
          source={require('../assets/logomarutham.png')}
          style={styles.contentBackground}
          imageStyle={styles.backgroundImageStyle}
        >
          <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
            {/* Member Info */}
            {memberName && (
              <View style={styles.memberInfoCard}>
                <Icon name="account" size={20} color="#4A90E2" />
                <Text style={styles.memberInfoText}>Welcome, {memberName}</Text>
              </View>
            )}

            {/* Summary Cards */}
            <View style={styles.summaryContainer}>
              <LinearGradient colors={['#4CAF50', '#66BB6A']} style={styles.summaryCard}>
                <Icon name="check-circle" size={32} color="#FFF" />
                <Text style={styles.summaryLabel}>Total Paid</Text>
                <Text style={styles.summaryAmount}>₹{totalPaid.toLocaleString()}</Text>
              </LinearGradient>
              <LinearGradient colors={['#FF9800', '#FFB74D']} style={styles.summaryCard}>
                <Icon name="alert-circle" size={32} color="#FFF" />
                <Text style={styles.summaryLabel}>Amount Due</Text>
                <Text style={styles.summaryAmount}>₹{totalDue.toLocaleString()}</Text>
              </LinearGradient>
            </View>

            {/* Due Months */}
            {dueMonths.length > 0 && (
              <View style={styles.dueMonthsSection}>
                <Text style={styles.sectionTitle}>Pending Payments</Text>
                <FlatList
                  data={dueMonths}
                  renderItem={renderDueMonthItem}
                  keyExtractor={(item, index) => index.toString()}
                  scrollEnabled={false}
                />
              </View>
            )}

            {/* Payment History */}
            <View style={styles.historySection}>
              <Text style={styles.sectionTitle}>Payment History</Text>
              {payments.length === 0 ? (
                <View style={styles.emptyState}>
                  <Icon name="file-document-outline" size={48} color="#CCC" />
                  <Text style={styles.emptyStateText}>No payments found</Text>
                </View>
              ) : (
                <FlatList
                  data={payments}
                  renderItem={renderPaymentItem}
                  keyExtractor={item => item.id}
                  scrollEnabled={false}
                />
              )}
            </View>

            {/* Info Card */}
            <View style={styles.infoCard}>
              <Icon name="information" size={20} color="#4A90E2" />
              <Text style={styles.infoText}>
                All payments must be made by the due date. Late payments may incur additional charges.
                Receipts are automatically generated upon successful payment.
              </Text>
            </View>
            <View style={{ height: 30 }} />
          </ScrollView>
        </ImageBackground>
      )}

      {/* Add Payment Modal */}
      <Modal
        transparent={true}
        animationType="slide"
        visible={showAddPaymentModal}
        onRequestClose={() => setShowAddPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Payment Details</Text>
              <TouchableOpacity onPress={() => setShowAddPaymentModal(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Amount */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Amount (₹) *</Text>
                <View style={styles.inputContainer}>
                  <Icon name="currency-inr" size={18} color="#4A90E2" style={styles.inputIcon} />
                  <SpeechToTextInput
                    style={styles.input}
                    placeholder="e.g., 5000"
                    value={paymentForm.amount}
                    onChangeText={(text) => setPaymentForm(prev => ({ ...prev, amount: text.replace(/[^0-9]/g, '') }))}
                    keyboardType="numeric"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              {/* Payment Method - Editable */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Payment Method *</Text>
                <View style={styles.inputContainer}>
                  <Icon name="credit-card" size={18} color="#4A90E2" style={styles.inputIcon} />
                  <SpeechToTextInput
                    style={styles.input}
                    placeholder="e.g., UPI, Credit Card, Net Banking"
                    value={paymentForm.paymentMethod}
                    onChangeText={(text) => setPaymentForm(prev => ({ ...prev, paymentMethod: text }))}
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              {/* Payment Date */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Payment Date *</Text>
                <TouchableOpacity
                  style={styles.dateInputContainer}
                  onPress={() => setShowPaymentDatePicker(true)}
                >
                  <Icon name="calendar" size={18} color="#4A90E2" style={styles.inputIcon} />
                  <Text style={styles.dateText}>
                    {paymentForm.paymentDate.toDateString()}
                  </Text>
                </TouchableOpacity>
                {showPaymentDatePicker && (
                  <DateTimePicker
                    value={paymentForm.paymentDate}
                    mode="date"
                    display="default"
                    onChange={handlePaymentDateChange}
                  />
                )}
              </View>

              {/* Transaction ID */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Transaction ID *</Text>
                <View style={styles.inputContainer}>
                  <Icon name="barcode" size={18} color="#4A90E2" style={styles.inputIcon} />
                  <SpeechToTextInput
                    style={styles.input}
                    placeholder="e.g., TXN123456789"
                    value={paymentForm.transactionId}
                    onChangeText={(text) => setPaymentForm(prev => ({ ...prev, transactionId: text }))}
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              {/* Payment For Month */}
              {/* Payment For Month - Update the hint text */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Payment For Month *</Text>
                <Text style={styles.formHint}>
                  Enter month abbreviation (e.g., Jan, Feb, Mar)
                </Text>
                <View style={styles.inputContainer}>
                  <Icon name="calendar-month" size={18} color="#4A90E2" style={styles.inputIcon} />
                  <SpeechToTextInput
                    style={styles.input}
                    placeholder="e.g., Jan"
                    value={paymentForm.paymentForMonth}
                    onChangeText={(text) => setPaymentForm(prev => ({ ...prev, paymentForMonth: text }))}
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleAddPayment}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Icon name="check-circle" size={20} color="#FFF" />
                    <Text style={styles.submitButtonText}>Submit Payment</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddPaymentModal(false)}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Receipt Modal */}
      <Modal
        transparent={true}
        animationType="slide"
        visible={showReceiptModal}
        onRequestClose={() => setShowReceiptModal(false)}
      >
        <View style={styles.receiptModalOverlay}>
          <View style={styles.receiptModalContainer}>
            <View style={styles.receiptHeader}>
              <TouchableOpacity onPress={() => setShowReceiptModal(false)}>
                <Icon name="arrow-left" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.receiptHeaderTitle}>Payment Receipt</Text>
              <TouchableOpacity onPress={handleDownloadReceipt}>
                <Icon name="download" size={24} color="#4A90E2" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.receiptContent}>
              <View style={styles.receiptLogoSection}>
                <Image
                  source={require('../assets/logomarutham.png')}
                  style={styles.receiptLogo}
                  resizeMode="contain"
                />
                <Text style={styles.receiptCompanyName}>{companyName.toUpperCase()}</Text>
                <Text style={styles.receiptCompanySubtitle}>Members Network</Text>
              </View>

              <Text style={styles.receiptTitle}>PAYMENT RECEIPT</Text>

              <View style={styles.receiptInfoRow}>
                <View style={styles.receiptInfoItem}>
                  <Text style={styles.receiptInfoLabel}>Receipt ID</Text>
                  <Text style={styles.receiptInfoValue}>{selectedPayment?.receiptId || 'N/A'}</Text>
                </View>
                <View style={styles.receiptInfoItem}>
                  <Text style={styles.receiptInfoLabel}>Date</Text>
                  <Text style={styles.receiptInfoValue}>{selectedPayment?.paidDate || 'N/A'}</Text>
                </View>
              </View>

              <View style={styles.receiptDivider} />

              <View style={styles.receiptSection}>
                <Text style={styles.receiptSectionTitle}>Member Details</Text>
                <View style={styles.receiptDetailRow}>
                  <Text style={styles.receiptDetailLabel}>Name:</Text>
                  <Text style={styles.receiptDetailValue}>{memberName || 'N/A'}</Text>
                </View>
                <View style={styles.receiptDetailRow}>
                  <Text style={styles.receiptDetailLabel}>Member ID:</Text>
                  <Text style={styles.receiptDetailValue}>
                    {currentMemberId ? `MEM-${currentMemberId}` : 'N/A'}
                  </Text>
                </View>
              </View>

              <View style={styles.receiptSection}>
                <Text style={styles.receiptSectionTitle}>Payment Details</Text>
                <View style={styles.receiptDetailRow}>
                  <Text style={styles.receiptDetailLabel}>Month:</Text>
                  <Text style={styles.receiptDetailValue}>{selectedPayment?.month || 'N/A'}</Text>
                </View>
                <View style={styles.receiptDetailRow}>
                  <Text style={styles.receiptDetailLabel}>Amount:</Text>
                  <Text style={styles.receiptDetailValue}>₹{selectedPayment?.amount?.toLocaleString() || '0'}</Text>
                </View>
                <View style={styles.receiptDetailRow}>
                  <Text style={styles.receiptDetailLabel}>Payment Method:</Text>
                  <Text style={styles.receiptDetailValue}>{selectedPayment?.paymentMethod || 'N/A'}</Text>
                </View>
                <View style={styles.receiptDetailRow}>
                  <Text style={styles.receiptDetailLabel}>Due Date:</Text>
                  <Text style={styles.receiptDetailValue}>{selectedPayment?.dueDate || 'N/A'}</Text>
                </View>
                <View style={styles.receiptDetailRow}>
                  <Text style={styles.receiptDetailLabel}>Paid Date:</Text>
                  <Text style={styles.receiptDetailValue}>{selectedPayment?.paidDate || 'N/A'}</Text>
                </View>
              </View>

              <View style={styles.receiptAmountBox}>
                <Text style={styles.receiptAmountLabel}>Total Amount Paid</Text>
                <Text style={styles.receiptAmountValue}>₹{selectedPayment?.amount?.toLocaleString() || '0'}</Text>
              </View>

              <View style={styles.receiptSection}>
                <Text style={styles.receiptSectionTitle}>Transaction Details</Text>
                <View style={styles.receiptDetailRow}>
                  <Text style={styles.receiptDetailLabel}>Transaction ID:</Text>
                  <Text style={styles.receiptDetailValue}>{selectedPayment?.transactionId || 'N/A'}</Text>
                </View>
                <View style={styles.receiptDetailRow}>
                  <Text style={styles.receiptDetailLabel}>Status:</Text>
                  <Text style={[styles.receiptDetailValue, { color: '#4CAF50' }]}>{selectedPayment?.status || 'N/A'}</Text>
                </View>
              </View>

              <View style={styles.receiptFooter}>
                <Text style={styles.receiptFooterText}>Thank you for your payment!</Text>
                <Text style={styles.receiptFooterSubtext}>For queries, contact: support@alaigal.com</Text>
                <Text style={styles.receiptFooterSubtext}>This is an electronically generated receipt.</Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.receiptDownloadButton}
              onPress={handleDownloadReceipt}
            >
              <Icon name="download" size={20} color="#FFF" />
              <Text style={styles.receiptDownloadButtonText}>Download Receipt</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F9FC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 15 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
  contentBackground: { flex: 1 },
  backgroundImageStyle: { opacity: 0.1 },
  content: { flex: 1, padding: 15 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#4A90E2', fontSize: 14 },

  memberInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
  },
  memberInfoText: { marginLeft: 10, fontSize: 14, fontWeight: '600', color: '#1976D2' },

  summaryContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, gap: 10 },
  summaryCard: { flex: 1, borderRadius: 12, padding: 15, alignItems: 'center', elevation: 3 },
  summaryLabel: { fontSize: 12, color: '#FFF', marginTop: 8, opacity: 0.9 },
  summaryAmount: { fontSize: 20, fontWeight: 'bold', color: '#FFF', marginTop: 4 },

  dueMonthsSection: { marginBottom: 20 },
  dueMonthCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  dueMonthText: { fontSize: 14, fontWeight: '600', color: '#333' },
  dueAmountText: { fontSize: 16, fontWeight: 'bold', color: '#FF9800' },

  historySection: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#4A90E2', marginBottom: 12 },

  emptyState: { alignItems: 'center', padding: 40 },
  emptyStateText: { marginTop: 10, color: '#999', fontSize: 14 },

  paymentCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 15, marginBottom: 12, elevation: 2 },
  paymentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  paymentInfo: { flex: 1 },
  paymentMonth: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  paymentType: { fontSize: 12, color: '#999', marginTop: 2 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600', color: '#FFF' },
  paymentDetails: { marginBottom: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  detailLabel: { fontSize: 13, color: '#666' },
  detailValue: { fontSize: 13, fontWeight: '600', color: '#333' },
  payButton: { backgroundColor: '#4A90E2', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 8 },
  payButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600', marginLeft: 8 },
  receiptButton: { backgroundColor: '#E3F2FD', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 8 },
  pendingConfirmBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  pendingConfirmText: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '500',
    flex: 1,
  },
  receiptButtonText: { color: '#4A90E2', fontSize: 14, fontWeight: '600', marginLeft: 8 },

  infoCard: { flexDirection: 'row', backgroundColor: '#E3F2FD', padding: 15, borderRadius: 12, marginBottom: 20 },
  infoText: { flex: 1, fontSize: 13, color: '#1976D2', marginLeft: 10, lineHeight: 20 },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#4A90E2' },
  modalContent: { padding: 20 },
  formGroup: { marginBottom: 18 },
  formLabel: { fontSize: 14, fontWeight: '600', color: '#4A90E2', marginBottom: 8 },
  formHint: { fontSize: 11, color: '#999', marginBottom: 4, fontStyle: 'italic' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', borderRadius: 10, borderWidth: 1, borderColor: '#87CEEB', paddingHorizontal: 12, minHeight: 45 },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 14, color: '#333', paddingVertical: 10 },
  dateInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', borderRadius: 10, borderWidth: 1, borderColor: '#87CEEB', paddingHorizontal: 12, minHeight: 45 },
  dateText: { flex: 1, fontSize: 14, color: '#333', marginLeft: 8 },
  submitButton: { backgroundColor: '#4A90E2', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 10, marginTop: 20, marginBottom: 10 },
  submitButtonDisabled: { backgroundColor: '#87CEEB' },
  submitButtonText: { color: '#FFF', fontSize: 15, fontWeight: 'bold', marginLeft: 8 },
  cancelButton: { backgroundColor: '#E0E0E0', padding: 14, borderRadius: 10, alignItems: 'center', marginBottom: 20 },
  cancelButtonText: { color: '#666', fontSize: 15, fontWeight: '600' },

  // Receipt Modal Styles
  receiptModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  receiptModalContainer: { flex: 1, backgroundColor: '#FFF', marginTop: 40, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  receiptHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  receiptHeaderTitle: { fontSize: 18, fontWeight: 'bold', color: '#4A90E2' },
  receiptContent: { flex: 1, padding: 20 },
  receiptLogoSection: { alignItems: 'center', marginBottom: 20, paddingBottom: 15, borderBottomWidth: 2, borderBottomColor: '#4A90E2' },
  receiptLogo: { width: 80, height: 80, marginBottom: 10 },
  receiptCompanyName: { fontSize: 24, fontWeight: 'bold', color: '#4A90E2' },
  receiptCompanySubtitle: { fontSize: 12, color: '#666', marginTop: 4 },
  receiptTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 20 },
  receiptInfoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  receiptInfoItem: { flex: 1 },
  receiptInfoLabel: { fontSize: 12, color: '#999', marginBottom: 4 },
  receiptInfoValue: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  receiptDivider: { height: 1, backgroundColor: '#E0E0E0', marginVertical: 15 },
  receiptSection: { marginBottom: 20 },
  receiptSectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#4A90E2', marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#E3F2FD' },
  receiptDetailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  receiptDetailLabel: { fontSize: 13, color: '#666', fontWeight: '500' },
  receiptDetailValue: { fontSize: 13, color: '#333', fontWeight: '600' },
  receiptAmountBox: { backgroundColor: '#E3F2FD', padding: 15, borderRadius: 10, marginBottom: 20, alignItems: 'center', borderLeftWidth: 4, borderLeftColor: '#4A90E2' },
  receiptAmountLabel: { fontSize: 12, color: '#666', marginBottom: 8 },
  receiptAmountValue: { fontSize: 28, fontWeight: 'bold', color: '#4A90E2' },
  receiptFooter: { alignItems: 'center', paddingVertical: 20, borderTopWidth: 1, borderTopColor: '#E0E0E0' },
  receiptFooterText: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  receiptFooterSubtext: { fontSize: 11, color: '#999', marginBottom: 4 },
  receiptDownloadButton: { backgroundColor: '#4A90E2', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, marginHorizontal: 20, marginBottom: 20, borderRadius: 10 },
  receiptDownloadButtonText: { color: '#FFF', fontSize: 15, fontWeight: 'bold', marginLeft: 8 },
});

export default MyPayments;

