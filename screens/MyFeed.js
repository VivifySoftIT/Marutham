import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, FlatList, ActivityIndicator, RefreshControl, Alert, ImageBackground, Modal, ScrollView, TextInput } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import API_BASE_URL from '../apiConfig';

const MyFeed = ({ route }) => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(route?.params?.tab || 'all');
  const [referralTab, setReferralTab] = useState(route?.params?.referralTab || 'my');
  const [thanksNoteTab, setThanksNoteTab] = useState(route?.params?.subTab || 'given');
  const [feedData, setFeedData] = useState([]);
  const [updatingItemId, setUpdatingItemId] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailModalType, setDetailModalType] = useState('');
  
  // Payment-specific states
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [showPaymentDatePicker, setShowPaymentDatePicker] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'UPI',
    transactionId: '',
    paymentForMonth: '',
    paymentDate: new Date(),
  });
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showPaymentMethodDropdown, setShowPaymentMethodDropdown] = useState(false);

  const paymentMethods = [
    { label: 'UPI', value: 'UPI', icon: 'qrcode' },
    { label: 'Credit Card', value: 'Credit Card', icon: 'credit-card' },
    { label: 'Debit Card', value: 'Debit Card', icon: 'credit-card-outline' },
    { label: 'Net Banking', value: 'Net Banking', icon: 'bank' },
    { label: 'Cash', value: 'Cash', icon: 'cash' },
    { label: 'Others', value: 'Others', icon: 'dots-horizontal' }
  ];

  useFocusEffect(
    React.useCallback(() => {
      loadFeedData();
    }, [activeTab, referralTab])
  );

  // Get current user's member ID
  const getCurrentUserMemberId = async () => {
    try {
      const storedMemberId = await AsyncStorage.getItem('memberId');
      if (storedMemberId) {
        return parseInt(storedMemberId);
      }

      const userId = await AsyncStorage.getItem('userId');
      const fullName = await AsyncStorage.getItem('fullName');

      if (userId) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/Members/GetByUserId/${userId}`);
          if (response.ok) {
            const memberData = await response.json();
            if (memberData && memberData.id) {
              await AsyncStorage.setItem('memberId', memberData.id.toString());
              return memberData.id;
            }
          }
        } catch (error) {
          console.log('GetByUserId failed:', error);
        }
      }

      if (fullName) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/Members`);
          if (response.ok) {
            const members = await response.json();
            const member = members.find(m =>
              m.name && m.name.trim().toLowerCase() === fullName.trim().toLowerCase()
            );

            if (member) {
              await AsyncStorage.setItem('memberId', member.id.toString());
              return member.id;
            }
          }
        } catch (error) {
          console.log('Name search failed:', error);
        }
      }

      return null;
    } catch (error) {
      console.error('Error getting member ID:', error);
      return null;
    }
  };

  const loadFeedData = async () => {
    try {
      setLoading(true);

      const memberId = await getCurrentUserMemberId();
      if (!memberId) {
        Alert.alert('Error', 'Could not find your member ID. Please try logging in again.');
        setLoading(false);
        return;
      }

      if (activeTab === 'payment') {
        // Load payment data and convert to feed format
        await loadPaymentDataAsFeed(memberId);
        return;
      } else if (activeTab === 'visitor' || activeTab === 'visitors') {
        // Load visitor data and convert to feed format
        await loadVisitorDataAsFeed(memberId);
        return;
      }

      let endpoint = `/api/Feed/member/${memberId}`;

      if (activeTab === 'referral') {
        endpoint = `/api/Feed/member/${memberId}/referrals`;
      } else if (activeTab === 'tyfcb' || activeTab === 'thanksnote') {
        endpoint = `/api/Feed/member/${memberId}/tyfcb`;
      } else if (activeTab === 'one_to_one') {
        endpoint = `/api/Feed/member/${memberId}/meetings`;
      } else if (activeTab === 'visitor' || activeTab === 'visitors') {
        endpoint = `/api/Feed/member/${memberId}/visitors`;
      }

      console.log('Fetching feed from:', `${API_BASE_URL}${endpoint}`);

      const response = await fetch(`${API_BASE_URL}${endpoint}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('API Response:', data);

      if (Array.isArray(data)) {
        setFeedData(data);
      } else if (data && Array.isArray(data.result)) {
        setFeedData(data.result);
      } else if (data && typeof data === 'object') {
        setFeedData([data]);
      } else {
        setFeedData([]);
      }
    } catch (error) {
      console.error('Error loading feed:', error);
      Alert.alert('Error', 'Failed to load feed data. Please try again.');
      setFeedData([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFeedData();
    setRefreshing(false);
  };

  // Payment data as feed format
  const loadPaymentDataAsFeed = async (memberId) => {
    try {
      console.log('Loading payment data as feed for member:', memberId);
      const token = await AsyncStorage.getItem('jwt_token') ||
        await AsyncStorage.getItem('token') ||
        await AsyncStorage.getItem('authToken');

      const response = await fetch(`${API_BASE_URL}/api/Payments/member/${memberId}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Payment API Response:', data);

      // Convert payment data to regular feed format (like other feed items)
      const paymentFeedItems = (data.payments || []).map((payment, index) => ({
        id: `payment_${payment.paymentId || index}`,
        type: payment.receiptNo ? 'payment_made' : 'payment_due',
        title: payment.receiptNo ? 'Payment Made' : 'Payment Due',
        description: `Payment for ${payment.paymentForMonth || 'Unknown'}`,
        memberName: data.memberName || 'You',
        amount: payment.amount || 0,
        date: payment.paymentDate || payment.paymentEndDate || new Date().toISOString(),
        status: payment.receiptNo ? 'Paid' : 'Pending',
        icon: payment.receiptNo ? 'check-circle' : 'alert-circle',
        color: payment.receiptNo ? '#4CAF50' : '#FF9800',
        // Additional payment details
        paymentMethod: payment.paymentMethod,
        receiptNo: payment.receiptNo,
        transactionId: payment.transactionId,
        paymentForMonth: payment.paymentForMonth,
        dueDate: payment.paymentEndDate,
        paidDate: payment.paymentDate,
      }));

      console.log('Mapped payment feed items:', paymentFeedItems);
      setFeedData(paymentFeedItems);

    } catch (error) {
      console.error('Error loading payment data:', error);
      Alert.alert('Error', 'Failed to load payment data');
      setFeedData([]);
    }
  };

  // Visitor data as feed format
  const loadVisitorDataAsFeed = async (memberId) => {
    try {
      console.log('Loading visitor data as feed for member:', memberId);
      const token = await AsyncStorage.getItem('jwt_token') ||
        await AsyncStorage.getItem('token') ||
        await AsyncStorage.getItem('authToken');

      // Try the specific visitor API endpoint first
      let response = await fetch(`${API_BASE_URL}/api/Visitors/member/${memberId}/visitors`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      // If 404, try alternative endpoint patterns
      if (response.status === 404) {
        console.log('Visitor API endpoint not found, trying alternatives...');
        const alternativeEndpoints = [
          `/api/Feed/member/${memberId}/visitors`,
          `/api/Visitor/member/${memberId}/visitors`,
          `/api/Members/${memberId}/visitors`,
          `/api/Visitors/${memberId}`,
        ];

        let foundEndpoint = false;
        for (const endpoint of alternativeEndpoints) {
          try {
            response = await fetch(`${API_BASE_URL}${endpoint}`, {
              headers: {
                'Content-Type': 'application/json',
                ...(token && { Authorization: `Bearer ${token}` }),
              },
            });
            
            if (response.ok) {
              foundEndpoint = true;
              break;
            }
          } catch (err) {
            console.log('Endpoint failed:', endpoint);
          }
        }

        if (!foundEndpoint) {
          throw new Error('No working visitor endpoint found');
        }
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Visitor API Response:', data);

      // Handle different response formats
      let visitorsArray = [];
      if (Array.isArray(data)) {
        visitorsArray = data;
      } else if (data && Array.isArray(data.visitors)) {
        visitorsArray = data.visitors;
      } else if (data && Array.isArray(data.result)) {
        visitorsArray = data.result;
      }

      // Convert visitor data to regular feed format (like other feed items)
      const visitorFeedItems = visitorsArray.map((visitor, index) => ({
        id: `visitor_${visitor.id || index}`,
        type: visitor.becameMember || visitor.BecameMember ? 'visitor_became_member' : 'visitor_brought',
        title: visitor.becameMember || visitor.BecameMember ? 'Visitor Became Member' : 'Visitor Brought',
        description: `${visitor.visitorName || visitor.VisitorName || 'Unknown Visitor'} from ${visitor.visitorBusiness || visitor.VisitorBusiness || visitor.company || visitor.Company || 'Unknown Company'}`,
        memberName: visitor.visitorName || visitor.VisitorName || `${visitor.firstName || visitor.FirstName || ''} ${visitor.lastName || visitor.LastName || ''}`.trim() || 'Unknown Visitor',
        date: visitor.visitDate || visitor.VisitDate || new Date().toISOString(),
        status: visitor.becameMember || visitor.BecameMember ? 'Member' : (visitor.status || visitor.Status || 'Pending'),
        icon: visitor.becameMember || visitor.BecameMember ? 'account-plus' : 'account-group',
        color: visitor.becameMember || visitor.BecameMember ? '#4CAF50' : '#FF9800',
        // Additional visitor details
        visitorPhone: visitor.visitorPhone || visitor.VisitorPhone || visitor.mobileNumber || visitor.MobileNumber,
        visitorEmail: visitor.visitorEmail || visitor.VisitorEmail,
        visitorBusiness: visitor.visitorBusiness || visitor.VisitorBusiness || visitor.company || visitor.Company,
        notes: visitor.notes || visitor.Notes,
        becameMember: visitor.becameMember || visitor.BecameMember,
      }));

      console.log('Mapped visitor feed items:', visitorFeedItems);
      setFeedData(visitorFeedItems);

    } catch (error) {
      console.error('Error loading visitor data:', error);
      if (!error.message.includes('404')) {
        Alert.alert('Error', 'Failed to load visitor data');
      }
      setFeedData([]);
    }
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

    const memberId = await getCurrentUserMemberId();
    if (!memberId) {
      Alert.alert('Error', 'Member ID not found. Please log in again.');
      return;
    }

    const authToken = await AsyncStorage.getItem('jwt_token') ||
      await AsyncStorage.getItem('token') ||
      await AsyncStorage.getItem('authToken');

    if (!authToken) {
      Alert.alert('Authentication Error', 'Please login again. Token not found.');
      return;
    }

    // Format month properly
    const monthInput = paymentForm.paymentForMonth.trim();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthAbbreviations = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const lowerInput = monthInput.toLowerCase();
    let formattedMonth = '';
    let isValidMonth = false;

    for (let i = 0; i < monthNames.length; i++) {
      if (lowerInput === monthNames[i].toLowerCase() || lowerInput === monthAbbreviations[i].toLowerCase()) {
        formattedMonth = monthAbbreviations[i];
        isValidMonth = true;
        break;
      }
    }

    if (!isValidMonth) {
      Alert.alert('Validation Error', 'Please enter a valid month name (e.g., Jan or January)');
      return;
    }

    const payload = {
      MemberId: parseInt(memberId),
      Amount: parseFloat(paymentForm.amount),
      PaymentType: "Monthly",
      PaymentMethod: paymentForm.paymentMethod || "UPI",
      TransactionId: paymentForm.transactionId.trim(),
      PaymentForMonth: formattedMonth,
      PaymentDate: paymentForm.paymentDate.toISOString().split('T')[0],
      Status: "Paid",
      CreatedBy: "Member"
    };

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

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
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
        loadFeedData();
      }, 1000);

    } catch (error) {
      console.error('Submit Payment Error:', error);
      Alert.alert('Payment Error', error.message || 'Failed to submit payment');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentDateChange = (_, selectedDate) => {
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
Name: ${selectedPayment.memberName || 'N/A'}
Member ID: ${await getCurrentUserMemberId() ? `MEM-${await getCurrentUserMemberId()}` : 'N/A'}

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

  const handleDownloadPaymentReceipt = async (paymentItem) => {
    try {
      const currentMemberId = await getCurrentUserMemberId();
      const memberName = paymentItem.memberName || 'N/A';
      
      const receiptContent = `
ALAIGAL MEMBERS NETWORK
================================

PAYMENT RECEIPT

Receipt ID: ${paymentItem.receiptNo || 'N/A'}
Date: ${formatDate(paymentItem.paidDate || paymentItem.date)}
Payment Method: ${paymentItem.paymentMethod || 'N/A'}

MEMBER DETAILS
Name: ${memberName}
Member ID: ${currentMemberId ? `MEM-${currentMemberId}` : 'N/A'}

PAYMENT DETAILS
Month: ${paymentItem.paymentForMonth || 'Unknown'}
Amount: ₹${(paymentItem.amount || 0).toLocaleString()}
Payment Type: Monthly
Status: ${paymentItem.status}
Due Date: ${paymentItem.dueDate || 'N/A'}
Paid Date: ${formatDate(paymentItem.paidDate || paymentItem.date)}

TRANSACTION DETAILS
Transaction ID: ${paymentItem.transactionId || 'N/A'}

Thank you for your payment!

For queries, contact: support@alaigal.com
Phone: +91-XXXXXXXXXX

================================
This is an electronically generated receipt.
      `;

      const fileName = `Receipt_${paymentItem.receiptNo || Date.now()}.txt`;
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
    const amount = payment.amount || 0;
    Alert.alert('Make Payment', `Pay ₹${amount.toLocaleString()} for ${payment.month || 'Unknown'}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Pay Now', onPress: () => {
          setPaymentForm({
            amount: amount.toString(),
            paymentMethod: 'UPI',
            transactionId: '',
            paymentForMonth: payment.month || '',
            paymentDate: new Date(),
          });
          setShowAddPaymentModal(true);
        }
      },
    ]);
  };

  const updateReferralStatus = async (referralId, status) => {
    try {
      setUpdatingItemId(referralId);

      const token = await AsyncStorage.getItem('jwt_token') ||
        await AsyncStorage.getItem('token') ||
        await AsyncStorage.getItem('authToken');

      if (!token) {
        Alert.alert('Error', 'Authentication token not found. Please login again.');
        navigation.navigate('Login');
        return;
      }

      // Find the actual item to get the entity ID
      const item = feedData.find(i => i.id === referralId);
      console.log('Found feed item for Referral update:', JSON.stringify(item, null, 2));

      // Try to get the actual entity ID from various possible fields
      let numericId = item?.entityId || item?.referralId || item?.referenceId;

      // If no entity ID field found, try extracting from composite ID
      if (!numericId) {
        numericId = referralId;
        if (typeof referralId === 'string' && referralId.includes('_')) {
          const parts = referralId.split('_');
          numericId = parts[parts.length - 1];
          console.log('Extracted numeric ID from composite:', referralId, '->', numericId);
        }
      } else {
        console.log('Using entity ID from feed item:', numericId);
      }

      const endpoint = `${API_BASE_URL}/api/Referrals/status`;
      const payload = {
        Id: parseInt(numericId),
        Status: status
      };

      console.log('Referral API Call:', {
        endpoint,
        method: 'POST',
        payload,
        hasToken: !!token
      });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      console.log('Referral Response Status:', response.status, response.statusText);

      const responseText = await response.text();
      console.log('Referral Response Body:', responseText);

      if (response.ok) {
        let result = {};
        try {
          result = responseText ? JSON.parse(responseText) : {};
        } catch (e) {
          console.log('Response is not JSON, treating as success');
        }

        console.log('Referral status update successful:', result);

        setFeedData(prevData =>
          prevData.map(item =>
            item.id === referralId
              ? { ...item, status: status, updatedDate: new Date().toISOString() }
              : item
          )
        );

        Alert.alert('Success', `Referral ${status.toLowerCase()} successfully!`);
        setShowDetailModal(false);
      } else {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorData.error || responseText || errorMessage;
        } catch (e) {
          errorMessage = responseText || errorMessage;
        }
        console.error('Referral API Error:', errorMessage);
        throw new Error(errorMessage);
      }

    } catch (error) {
      console.error('Error updating referral status:', error);
      Alert.alert('Error', error.message || 'Failed to update referral status');
    } finally {
      setUpdatingItemId(null);
    }
  };

  const updateTYFCBStatus = async (tyfcbId, status) => {
    try {
      setUpdatingItemId(tyfcbId);

      const token = await AsyncStorage.getItem('jwt_token') ||
        await AsyncStorage.getItem('token') ||
        await AsyncStorage.getItem('authToken');

      if (!token) {
        Alert.alert('Error', 'Authentication token not found. Please login again.');
        navigation.navigate('Login');
        return;
      }

      // Find the actual item to get the entity ID
      const item = feedData.find(i => i.id === tyfcbId);
      console.log('Found feed item for TYFCB update:', JSON.stringify(item, null, 2));

      // Try to get the actual entity ID from various possible fields
      let numericId = item?.entityId || item?.tyfcbId || item?.referenceId;

      // If no entity ID field found, try extracting from composite ID
      if (!numericId) {
        numericId = tyfcbId;
        if (typeof tyfcbId === 'string' && tyfcbId.includes('_')) {
          const parts = tyfcbId.split('_');
          numericId = parts[parts.length - 1];
          console.log('Extracted numeric ID from composite:', tyfcbId, '->', numericId);
        }
      } else {
        console.log('Using entity ID from feed item:', numericId);
      }

      const endpoint = `${API_BASE_URL}/api/TYFCB/tyfcb/${numericId}/status`;
      const payload = { Status: status };

      console.log('TYFCB API Call:', {
        endpoint,
        method: 'POST',
        payload,
        hasToken: !!token
      });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      console.log('TYFCB Response Status:', response.status, response.statusText);

      const responseText = await response.text();
      console.log('TYFCB Response Body:', responseText);

      if (response.ok) {
        let result = {};
        try {
          result = responseText ? JSON.parse(responseText) : {};
        } catch (e) {
          console.log('Response is not JSON, treating as success');
        }

        console.log('TYFCB status update successful:', result);

        setFeedData(prevData =>
          prevData.map(item =>
            item.id === tyfcbId
              ? { ...item, status: status, updatedDate: new Date().toISOString() }
              : item
          )
        );

        Alert.alert('Success', `ThanksNote ${status.toLowerCase()}ed successfully!`);
        setShowDetailModal(false);
      } else {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorData.error || responseText || errorMessage;
        } catch (e) {
          errorMessage = responseText || errorMessage;
        }
        console.error('TYFCB API Error:', errorMessage);
        throw new Error(errorMessage);
      }

    } catch (error) {
      console.error('Error updating ThanksNote status:', error);
      Alert.alert('Error', error.message || 'Failed to update ThanksNote status');
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleItemPress = (item) => {
    console.log('Feed item pressed:', JSON.stringify(item, null, 2));

    // Only show detail modal for received items that are pending
    // Allow action regardless of current tab (e.g. from 'All' tab)
    const isReceivableItem =
      item.type === 'referral_received' ||
      item.type === 'tyfcb_received';

    const isPending = !item.status || item.status === 'Pending' || item.status === 'pending';

    if (isReceivableItem && isPending) {
      setSelectedItem(item);
      setDetailModalType(item.type === 'referral_received' ? 'referral' : 'tyfcb');
      setShowDetailModal(true);
    } else {
      // For other items, just show a read-only detail view
      setSelectedItem(item);
      setDetailModalType('view');
      setShowDetailModal(true);
    }
  };

  const confirmStatusUpdate = () => {
    if (!selectedItem) return;

    if (detailModalType === 'referral') {
      updateReferralStatus(selectedItem.id, 'Confirmed');
    } else if (detailModalType === 'tyfcb') {
      updateTYFCBStatus(selectedItem.id, 'Confirmed');
    }
  };

  const rejectStatusUpdate = () => {
    if (!selectedItem) return;

    if (detailModalType === 'referral') {
      updateReferralStatus(selectedItem.id, 'Rejected');
    } else if (detailModalType === 'tyfcb') {
      updateTYFCBStatus(selectedItem.id, 'Reject');
    }
  };

  const getFilteredData = () => {
    if (activeTab === 'referral') {
      if (referralTab === 'give') {
        return feedData.filter(item => item.type === 'referral_given');
      } else {
        return feedData.filter(item => item.type === 'referral_received');
      }
    }
    
    if (activeTab === 'thanksnote' || activeTab === 'tyfcb') {
      if (thanksNoteTab === 'given') {
        return feedData.filter(item => item.type === 'tyfcb_given');
      } else {
        return feedData.filter(item => item.type === 'tyfcb_received');
      }
    }
    
    return feedData;
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  };

  const renderFeedItem = ({ item }) => {
    let iconName = 'information';
    let iconColor = '#4A90E2';

    switch (item.type) {
      case 'referral_given':
        iconName = 'account-arrow-right';
        iconColor = '#4CAF50';
        break;
      case 'referral_received':
        iconName = 'account-arrow-left';
        iconColor = '#2196F3';
        break;
      case 'tyfcb_given':
        iconName = 'handshake';
        iconColor = '#FF9800';
        break;
      case 'tyfcb_received':
        iconName = 'hand-heart';
        iconColor = '#E91E63';
        break;
      case 'one_to_one':
        iconName = 'calendar-account';
        iconColor = '#3F51B5';
        break;
      case 'payment_made':
        iconName = 'check-circle';
        iconColor = '#4CAF50';
        break;
      case 'payment_due':
        iconName = 'alert-circle';
        iconColor = '#FF9800';
        break;
      case 'visitor_brought':
        iconName = 'account-group';
        iconColor = '#FF9800';
        break;
      case 'visitor_became_member':
        iconName = 'account-plus';
        iconColor = '#4CAF50';
        break;
      default:
        iconName = item.icon || 'information';
        iconColor = item.color || '#4A90E2';
    }

    let statusColor = '#FF9800';
    if (item.status === 'Confirmed' || item.status === 'Completed' || item.status === 'Approved' || item.status === 'Paid' || item.status === 'Member') {
      statusColor = '#4CAF50';
    } else if (item.status === 'Rejected' || item.status === 'Cancelled') {
      statusColor = '#F44336';
    }

    return (
      <TouchableOpacity
        style={styles.feedCard}
        onPress={() => handleItemPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
          <Icon name={iconName} size={28} color={iconColor} />
        </View>
        <View style={styles.feedContent}>
          <View style={styles.feedHeader}>
            <Text style={styles.feedTitle}>{item.title || 'Activity'}</Text>
            {item.status && (
              <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            )}
          </View>
          <Text style={styles.feedDescription}>{item.description || 'No description available'}</Text>
          {item.memberName && (
            <Text style={styles.memberName}>Member: {item.memberName}</Text>
          )}
          <Text style={styles.feedDate}>
            {formatDate(item.date || new Date().toISOString())}
            {item.amount > 0 && ` • Amount: ₹${item.amount.toLocaleString()}`}
          </Text>

          {/* Show download button only for paid payment items */}
          {item.type === 'payment_made' && item.status === 'Paid' && (
            <View style={styles.paymentActions}>
              <TouchableOpacity
                style={styles.downloadButton}
                onPress={() => handleDownloadPaymentReceipt(item)}
              >
                <Icon name="download" size={16} color="#4A90E2" />
                <Text style={styles.downloadButtonText}>Download Receipt</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Show click hint for receivable items */}
          {((item.type === 'referral_received') ||
            (item.type === 'tyfcb_received')) &&
            (!item.status || item.status === 'Pending' || item.status === 'pending') && (
              <View style={styles.clickHint}>
                <Icon name="hand-pointing-right" size={14} color="#4A90E2" />
                <Text style={styles.clickHintText}>Tap to view and take action</Text>
              </View>
            )}
        </View>
      </TouchableOpacity>
    );
  };

  const filteredData = getFilteredData();
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#4A90E2" barStyle="light-content" />
      <LinearGradient colors={['#4A90E2', '#87CEEB']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Activity Log</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <View style={styles.tabBarContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarContent}
        >
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'all' && styles.tabButtonActive]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'all' && styles.tabButtonTextActive]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'referral' && styles.tabButtonActive]}
            onPress={() => setActiveTab('referral')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'referral' && styles.tabButtonTextActive]}>Referrals</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, (activeTab === 'tyfcb' || activeTab === 'thanksnote') && styles.tabButtonActive]}
            onPress={() => setActiveTab('thanksnote')}
          >
            <Text style={[styles.tabButtonText, (activeTab === 'tyfcb' || activeTab === 'thanksnote') && styles.tabButtonTextActive]}>ThanksNote</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'one_to_one' && styles.tabButtonActive]}
            onPress={() => setActiveTab('one_to_one')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'one_to_one' && styles.tabButtonTextActive]}>Meetings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'payment' && styles.tabButtonActive]}
            onPress={() => setActiveTab('payment')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'payment' && styles.tabButtonTextActive]}>Payments</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, (activeTab === 'visitor' || activeTab === 'visitors') && styles.tabButtonActive]}
            onPress={() => setActiveTab('visitors')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'visitor' && styles.tabButtonTextActive]}>Visitors</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Action shortcuts */}
      <View style={styles.shortcutContainer}>
        {activeTab === 'referral' && (
          <TouchableOpacity
            style={styles.shortcutButton}
            onPress={() => navigation.navigate('ReferralSlip')}
          >
            <Icon name="plus-circle" size={18} color="#FFF" />
            <Text style={styles.shortcutButtonText}>Add Referral</Text>
          </TouchableOpacity>
        )}
        {(activeTab === 'tyfcb' || activeTab === 'thanksnote') && (
          <TouchableOpacity
            style={[styles.shortcutButton, { backgroundColor: '#FF9800' }]}
            onPress={() => navigation.navigate('TYFCBSlip')}
          >
            <Icon name="plus-circle" size={18} color="#FFF" />
            <Text style={styles.shortcutButtonText}>Add ThanksNote</Text>
          </TouchableOpacity>
        )}
        {activeTab === 'payment' && (
          <TouchableOpacity
            style={[styles.shortcutButton, { backgroundColor: '#4CAF50' }]}
            onPress={() => setShowAddPaymentModal(true)}
          >
            <Icon name="plus-circle" size={18} color="#FFF" />
            <Text style={styles.shortcutButtonText}>Add Payment</Text>
          </TouchableOpacity>
        )}
        {(activeTab === 'visitor' || activeTab === 'visitors') && (
          <TouchableOpacity
            style={[styles.shortcutButton, { backgroundColor: '#9C27B0' }]}
            onPress={() => navigation.navigate('Visitors')}
          >
            <Icon name="plus-circle" size={18} color="#FFF" />
            <Text style={styles.shortcutButtonText}>Add Visitor</Text>
          </TouchableOpacity>
        )}
      </View>

      {activeTab === 'referral' && (
        <View style={styles.referralToggle}>
          <TouchableOpacity
            style={[styles.toggleButton, referralTab === 'give' && styles.toggleButtonActive]}
            onPress={() => setReferralTab('give')}
          >
            <Icon name="account-arrow-right" size={18} color={referralTab === 'give' ? '#FFF' : '#4A90E2'} />
            <Text style={[styles.toggleText, referralTab === 'give' && styles.toggleTextActive]}>Given</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, referralTab === 'my' && styles.toggleButtonActive]}
            onPress={() => setReferralTab('my')}
          >
            <Icon name="account-arrow-left" size={18} color={referralTab === 'my' ? '#FFF' : '#4A90E2'} />
            <Text style={[styles.toggleText, referralTab === 'my' && styles.toggleTextActive]}>Received</Text>
          </TouchableOpacity>
        </View>
      )}

      {(activeTab === 'thanksnote' || activeTab === 'tyfcb') && (
        <View style={styles.referralToggle}>
          <TouchableOpacity
            style={[styles.toggleButton, thanksNoteTab === 'given' && styles.toggleButtonActive]}
            onPress={() => setThanksNoteTab('given')}
          >
            <Icon name="handshake" size={18} color={thanksNoteTab === 'given' ? '#FFF' : '#FF9800'} />
            <Text style={[styles.toggleText, thanksNoteTab === 'given' && styles.toggleTextActive]}>Given</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, thanksNoteTab === 'received' && styles.toggleButtonActive]}
            onPress={() => setThanksNoteTab('received')}
          >
            <Icon name="hand-heart" size={18} color={thanksNoteTab === 'received' ? '#FFF' : '#FF9800'} />
            <Text style={[styles.toggleText, thanksNoteTab === 'received' && styles.toggleTextActive]}>Received</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
        </View>
      ) : filteredData.length > 0 ? (
        <ImageBackground
          source={require('../assets/logoicon.png')}
          style={styles.backgroundImage}
          imageStyle={styles.backgroundImageStyle}
        >
          <FlatList
            data={filteredData}
            renderItem={renderFeedItem}
            keyExtractor={(item, index) => `${item.type}-${item.id}-${index}`}
            contentContainerStyle={styles.feedList}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#4A90E2']}
                tintColor="#4A90E2"
              />
            }
          />
        </ImageBackground>
      ) : (
        <ImageBackground
          source={require('../assets/logoicon.png')}
          style={styles.backgroundImage}
          imageStyle={styles.backgroundImageStyle}
        >
          <View style={styles.emptyContainer}>
            <Icon name="inbox" size={60} color="#CCC" />
            <Text style={styles.emptyText}>
              No activities yet
            </Text>
            <Text style={styles.emptySubtext}>
              Your activities will appear here
            </Text>
            {!loading && (
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={loadFeedData}
              >
                <Icon name="refresh" size={20} color="#4A90E2" />
                <Text style={styles.refreshButtonText}>Refresh</Text>
              </TouchableOpacity>
            )}
          </View>
        </ImageBackground>
      )}

      {/* Detail Modal */}
      <Modal
        transparent={true}
        animationType="slide"
        visible={showDetailModal}
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {detailModalType === 'referral' ? 'Referral Details' :
                  detailModalType === 'tyfcb' ? 'Thanks Note' : 'Activity Details'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowDetailModal(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {selectedItem && (
                <>
                  {/* Icon and Title */}
                  <View style={styles.detailHeader}>
                    <View style={[styles.detailIconContainer, {
                      backgroundColor: selectedItem.type === 'referral_received' ? '#2196F320' :
                        selectedItem.type === 'tyfcb_received' ? '#E91E6320' : '#4A90E220'
                    }]}>
                      <Icon
                        name={selectedItem.type === 'referral_received' ? 'account-arrow-left' :
                          selectedItem.type === 'tyfcb_received' ? 'hand-heart' : 'information'}
                        size={32}
                        color={selectedItem.type === 'referral_received' ? '#2196F3' :
                          selectedItem.type === 'tyfcb_received' ? '#E91E63' : '#4A90E2'}
                      />
                    </View>
                    <Text style={styles.detailTitle}>{selectedItem.title || 'Activity'}</Text>
                  </View>

                  {/* Status Badge */}
                  {selectedItem.status && (
                    <View style={[styles.detailStatusBadge, {
                      backgroundColor: selectedItem.status === 'Confirmed' ? '#4CAF50' :
                        selectedItem.status === 'Rejected' ? '#F44336' : '#FF9800'
                    }]}>
                      <Text style={styles.detailStatusText}>
                        Status: {selectedItem.status}
                      </Text>
                    </View>
                  )}

                  {/* Details Grid - 2 columns layout */}
                  <View style={styles.detailsGrid}>
                    {/* Row 1: Date and Member */}
                    <View style={styles.detailItem}>
                      <Icon name="calendar" size={20} color="#666" />
                      <Text style={styles.detailLabel}>Date</Text>
                      <Text style={styles.detailValue}>
                        {formatDate(selectedItem.date || new Date().toISOString())}
                      </Text>
                    </View>

                    <View style={styles.detailItem}>
                      <Icon name="account" size={20} color="#666" />
                      <Text style={styles.detailLabel}>Member</Text>
                      <Text style={styles.detailValue}>
                        {selectedItem.memberName || 'N/A'}
                      </Text>
                    </View>

                    {/* Row 2: Amount and Type */}
                    <View style={styles.detailItem}>
                      <Icon name="currency-usd" size={20} color="#666" />
                      <Text style={styles.detailLabel}>Amount</Text>
                      <Text style={[styles.detailValue, { color: selectedItem.amount > 0 ? '#4CAF50' : '#666', fontWeight: 'bold' }]}>
                        {selectedItem.amount > 0 ? `₹${selectedItem.amount.toLocaleString()}` : 'N/A'}
                      </Text>
                    </View>

                    <View style={styles.detailItem}>
                      <Icon name="shape" size={20} color="#666" />
                      <Text style={styles.detailLabel}>Type</Text>
                      <Text style={styles.detailValue}>
                        {selectedItem.type === 'referral_received' ? 'Referral Received' :
                          selectedItem.type === 'referral_given' ? 'Referral Given' :
                            selectedItem.type === 'tyfcb_received' ? 'ThanksNote Received' :
                              selectedItem.type === 'tyfcb_given' ? 'ThanksNote Given' :
                                selectedItem.type === 'payment_made' ? 'Payment Made' :
                                  selectedItem.type === 'payment_due' ? 'Payment Due' :
                                    selectedItem.type === 'visitor_brought' ? 'Visitor Brought' :
                                      selectedItem.type === 'visitor_became_member' ? 'Visitor Became Member' : 'Activity'}
                      </Text>
                    </View>
                  </View>

                  {/* Description */}
                  <View style={styles.descriptionContainer}>
                    <Text style={styles.descriptionLabel}>Description</Text>
                    <Text style={styles.descriptionText}>
                      {selectedItem.description || 'No description available'}
                    </Text>
                  </View>

                  {/* Additional Notes if available */}
                  {selectedItem.notes && (
                    <View style={styles.notesContainer}>
                      <Text style={styles.notesLabel}>Notes</Text>
                      <Text style={styles.notesText}>{selectedItem.notes}</Text>
                    </View>
                  )}

                  {/* Action Buttons - Always visible for received items */}
                  {((selectedItem.type === 'referral_received') ||
                    (selectedItem.type === 'tyfcb_received')) && (
                      <View style={styles.actionButtonsContainer}>
                        <Text style={styles.actionTitle}>
                          {(!selectedItem.status || selectedItem.status === 'Pending' || selectedItem.status === 'pending')
                            ? 'Take Action'
                            : 'Actions'}
                        </Text>
                        <View style={styles.actionButtons}>
                          <TouchableOpacity
                            style={[styles.actionButton, styles.confirmActionButton]}
                            onPress={confirmStatusUpdate}
                            disabled={updatingItemId === selectedItem.id ||
                              (selectedItem.status && selectedItem.status !== 'Pending' && selectedItem.status !== 'pending')}
                          >
                            {updatingItemId === selectedItem.id ? (
                              <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                              <>
                                <Icon name="check-circle" size={20} color="#FFF" />
                                <Text style={styles.actionButtonText}>Confirm</Text>
                              </>
                            )}
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.actionButton, styles.rejectActionButton]}
                            onPress={rejectStatusUpdate}
                            disabled={updatingItemId === selectedItem.id ||
                              (selectedItem.status && selectedItem.status !== 'Pending' && selectedItem.status !== 'pending')}
                          >
                            {updatingItemId === selectedItem.id ? (
                              <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                              <>
                                <Icon name="close-circle" size={20} color="#FFF" />
                                <Text style={styles.actionButtonText}>Reject</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                        {selectedItem.status && selectedItem.status !== 'Pending' && selectedItem.status !== 'pending' && (
                          <Text style={styles.actionHint}>
                            This item has already been {selectedItem.status.toLowerCase()}
                          </Text>
                        )}
                      </View>
                    )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Payment Modal */}
      <Modal
        transparent={true}
        animationType="slide"
        visible={showAddPaymentModal}
        onRequestClose={() => {
          setShowAddPaymentModal(false);
          setShowPaymentMethodDropdown(false);
        }}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPaymentMethodDropdown(false)}
        >
          <TouchableOpacity 
            style={styles.modalContainer}
            activeOpacity={1}
            onPress={() => {}}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Payment Details</Text>
              <TouchableOpacity onPress={() => {
                setShowAddPaymentModal(false);
                setShowPaymentMethodDropdown(false);
              }}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Amount */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Amount (₹) *</Text>
                <View style={styles.inputContainer}>
                  <Icon name="currency-inr" size={18} color="#4A90E2" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 5000"
                    value={paymentForm.amount}
                    onChangeText={(text) => setPaymentForm(prev => ({ ...prev, amount: text.replace(/[^0-9]/g, '') }))}
                    keyboardType="numeric"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              {/* Payment Method */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Payment Method *</Text>
                <TouchableOpacity
                  style={styles.dropdownContainer}
                  onPress={() => setShowPaymentMethodDropdown(!showPaymentMethodDropdown)}
                >
                  <Icon 
                    name={paymentMethods.find(method => method.value === paymentForm.paymentMethod)?.icon || 'credit-card'} 
                    size={18} 
                    color="#4A90E2" 
                    style={styles.inputIcon} 
                  />
                  <Text style={styles.dropdownText}>
                    {paymentForm.paymentMethod || 'Select Payment Method'}
                  </Text>
                  <Icon 
                    name={showPaymentMethodDropdown ? 'chevron-up' : 'chevron-down'} 
                    size={20} 
                    color="#4A90E2" 
                  />
                </TouchableOpacity>
                
                {showPaymentMethodDropdown && (
                  <View style={styles.dropdownList}>
                    {paymentMethods.map((method, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.dropdownItem,
                          paymentForm.paymentMethod === method.value && styles.dropdownItemSelected
                        ]}
                        onPress={() => {
                          setPaymentForm(prev => ({ ...prev, paymentMethod: method.value }));
                          setShowPaymentMethodDropdown(false);
                        }}
                      >
                        <Icon name={method.icon} size={18} color="#4A90E2" />
                        <Text style={[
                          styles.dropdownItemText,
                          paymentForm.paymentMethod === method.value && styles.dropdownItemTextSelected
                        ]}>
                          {method.label}
                        </Text>
                        {paymentForm.paymentMethod === method.value && (
                          <Icon name="check" size={18} color="#4A90E2" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
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
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., TXN123456789"
                    value={paymentForm.transactionId}
                    onChangeText={(text) => setPaymentForm(prev => ({ ...prev, transactionId: text }))}
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              {/* Payment For Month */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Payment For Month *</Text>
                <Text style={styles.formHint}>
                  Enter month abbreviation (e.g., Jan, Feb, Mar)
                </Text>
                <View style={styles.inputContainer}>
                  <Icon name="calendar-month" size={18} color="#4A90E2" style={styles.inputIcon} />
                  <TextInput
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
                onPress={() => {
                  setShowAddPaymentModal(false);
                  setShowPaymentMethodDropdown(false);
                }}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
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
                <Text style={styles.receiptCompanyName}>ALAIGAL</Text>
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
                  <Text style={styles.receiptDetailValue}>{selectedPayment?.memberName || 'N/A'}</Text>
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
                  <Text style={styles.receiptDetailValue}>₹{(selectedPayment?.amount || 0).toLocaleString()}</Text>
                </View>
                <View style={styles.receiptDetailRow}>
                  <Text style={styles.receiptDetailLabel}>Payment Method:</Text>
                  <Text style={styles.receiptDetailValue}>{selectedPayment?.paymentMethod || 'N/A'}</Text>
                </View>
              </View>

              <View style={styles.receiptAmountBox}>
                <Text style={styles.receiptAmountLabel}>Total Amount Paid</Text>
                <Text style={styles.receiptAmountValue}>₹{(selectedPayment?.amount || 0).toLocaleString()}</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF'
  },
  tabBarContainer: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tabBarContent: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center'
  },
  tabButtonActive: {
    backgroundColor: '#4A90E2'
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666'
  },
  tabButtonTextActive: {
    color: '#FFF'
  },
  referralToggle: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingHorizontal: 15,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    gap: 6
  },
  toggleButtonActive: {
    backgroundColor: '#4A90E2'
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666'
  },
  toggleTextActive: {
    color: '#FFF'
  },
  shortcutContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    flexDirection: 'row',
    justifyContent: 'flex-start'
  },
  shortcutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A90E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    gap: 6
  },
  shortcutButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold'
  },
  backgroundImage: {
    flex: 1
  },
  backgroundImageStyle: {
    opacity: 0.1,
    resizeMode: 'contain'
  },
  feedList: {
    padding: 15,
    paddingBottom: 30
  },
  feedCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15
  },
  feedContent: {
    flex: 1
  },
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  feedTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    flex: 1
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFF'
  },
  feedDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
    lineHeight: 18
  },
  memberName: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '500',
    marginBottom: 4
  },
  feedDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8
  },
  clickHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    alignSelf: 'flex-start'
  },
  clickHintText: {
    fontSize: 11,
    color: '#4A90E2',
    fontWeight: '500',
    marginLeft: 6
  },
  paymentActions: {
    marginTop: 8,
    alignSelf: 'flex-start'
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4A90E2',
    gap: 6
  },
  downloadButtonText: {
    fontSize: 11,
    color: '#4A90E2',
    fontWeight: '600'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 15,
    textAlign: 'center'
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
    textAlign: 'center'
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4A90E2',
    gap: 8
  },
  refreshButtonText: {
    color: '#4A90E2',
    fontWeight: '600',
    fontSize: 14
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333'
  },
  closeButton: {
    padding: 4
  },
  modalContent: {
    padding: 20
  },
  // Detail Modal Styles
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20
  },
  detailIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    flex: 1
  },
  detailStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 20
  },
  detailStatusText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14
  },
  detailsGrid: {
    marginBottom: 20,
    gap: 12
  },
  detailRow: {
    flexDirection: 'row',
    gap: 12
  },
  detailItem: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center'
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    marginBottom: 4
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center'
  },
  descriptionContainer: {
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8
  },
  descriptionText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20
  },
  notesContainer: {
    backgroundColor: '#FFF8E1',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800'
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9800',
    marginBottom: 8
  },
  notesText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20
  },
  actionButtonsContainer: {
    marginTop: 20
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center'
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 15
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 10
  },
  confirmActionButton: {
    backgroundColor: '#4CAF50'
  },
  rejectActionButton: {
    backgroundColor: '#F44336'
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600'
  },
  actionHint: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic'
  },

  // Modal Styles
  formGroup: { 
    marginBottom: 18 
  },
  formLabel: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#4A90E2', 
    marginBottom: 8 
  },
  formHint: { 
    fontSize: 11, 
    color: '#999', 
    marginBottom: 4, 
    fontStyle: 'italic' 
  },
  inputContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F8F9FA', 
    borderRadius: 10, 
    borderWidth: 1, 
    borderColor: '#87CEEB', 
    paddingHorizontal: 12, 
    minHeight: 45 
  },
  inputIcon: { 
    marginRight: 8 
  },
  input: { 
    flex: 1, 
    fontSize: 14, 
    color: '#333', 
    paddingVertical: 10 
  },
  dateInputContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F8F9FA', 
    borderRadius: 10, 
    borderWidth: 1, 
    borderColor: '#87CEEB', 
    paddingHorizontal: 12, 
    minHeight: 45 
  },
  dateText: { 
    flex: 1, 
    fontSize: 14, 
    color: '#333', 
    marginLeft: 8 
  },
  dropdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#87CEEB',
    paddingHorizontal: 12,
    minHeight: 45,
    justifyContent: 'space-between'
  },
  dropdownText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 8
  },
  dropdownList: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#87CEEB',
    marginTop: 5,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    maxHeight: 200
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 12
  },
  dropdownItemSelected: {
    backgroundColor: '#E3F2FD'
  },
  dropdownItemText: {
    flex: 1,
    fontSize: 14,
    color: '#333'
  },
  dropdownItemTextSelected: {
    color: '#4A90E2',
    fontWeight: '600'
  },
  submitButton: { 
    backgroundColor: '#4A90E2', 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 14, 
    borderRadius: 10, 
    marginTop: 20, 
    marginBottom: 10 
  },
  submitButtonDisabled: { 
    backgroundColor: '#87CEEB' 
  },
  submitButtonText: { 
    color: '#FFF', 
    fontSize: 15, 
    fontWeight: 'bold', 
    marginLeft: 8 
  },
  cancelButton: { 
    backgroundColor: '#E0E0E0', 
    padding: 14, 
    borderRadius: 10, 
    alignItems: 'center', 
    marginBottom: 20 
  },
  cancelButtonText: { 
    color: '#666', 
    fontSize: 15, 
    fontWeight: '600' 
  },

  // Receipt Modal Styles
  receiptModalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0, 0, 0, 0.5)' 
  },
  receiptModalContainer: { 
    flex: 1, 
    backgroundColor: '#FFF', 
    marginTop: 40, 
    borderTopLeftRadius: 20, 
    borderTopRightRadius: 20 
  },
  receiptHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: '#E0E0E0' 
  },
  receiptHeaderTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#4A90E2' 
  },
  receiptContent: { 
    flex: 1, 
    padding: 20 
  },
  receiptLogoSection: { 
    alignItems: 'center', 
    marginBottom: 20, 
    paddingBottom: 15, 
    borderBottomWidth: 2, 
    borderBottomColor: '#4A90E2' 
  },
  receiptCompanyName: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#4A90E2' 
  },
  receiptCompanySubtitle: { 
    fontSize: 12, 
    color: '#666', 
    marginTop: 4 
  },
  receiptTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#333', 
    textAlign: 'center', 
    marginBottom: 20 
  },
  receiptInfoRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 15 
  },
  receiptInfoItem: { 
    flex: 1 
  },
  receiptInfoLabel: { 
    fontSize: 12, 
    color: '#999', 
    marginBottom: 4 
  },
  receiptInfoValue: { 
    fontSize: 14, 
    fontWeight: 'bold', 
    color: '#333' 
  },
  receiptDivider: { 
    height: 1, 
    backgroundColor: '#E0E0E0', 
    marginVertical: 15 
  },
  receiptSection: { 
    marginBottom: 20 
  },
  receiptSectionTitle: { 
    fontSize: 14, 
    fontWeight: 'bold', 
    color: '#4A90E2', 
    marginBottom: 12, 
    paddingBottom: 8, 
    borderBottomWidth: 1, 
    borderBottomColor: '#E3F2FD' 
  },
  receiptDetailRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 10 
  },
  receiptDetailLabel: { 
    fontSize: 13, 
    color: '#666', 
    fontWeight: '500' 
  },
  receiptDetailValue: { 
    fontSize: 13, 
    color: '#333', 
    fontWeight: '600' 
  },
  receiptAmountBox: { 
    backgroundColor: '#E3F2FD', 
    padding: 15, 
    borderRadius: 10, 
    marginBottom: 20, 
    alignItems: 'center', 
    borderLeftWidth: 4, 
    borderLeftColor: '#4A90E2' 
  },
  receiptAmountLabel: { 
    fontSize: 12, 
    color: '#666', 
    marginBottom: 8 
  },
  receiptAmountValue: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#4A90E2' 
  },
  receiptFooter: { 
    alignItems: 'center', 
    paddingVertical: 20, 
    borderTopWidth: 1, 
    borderTopColor: '#E0E0E0' 
  },
  receiptFooterText: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#333', 
    marginBottom: 8 
  },
  receiptFooterSubtext: { 
    fontSize: 11, 
    color: '#999', 
    marginBottom: 4 
  },
  receiptDownloadButton: { 
    backgroundColor: '#4A90E2', 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 14, 
    marginHorizontal: 20, 
    marginBottom: 20, 
    borderRadius: 10 
  },
  receiptDownloadButtonText: { 
    color: '#FFF', 
    fontSize: 15, 
    fontWeight: 'bold', 
    marginLeft: 8 
  },
});

export default MyFeed;