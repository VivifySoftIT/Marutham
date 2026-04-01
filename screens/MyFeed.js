import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, FlatList, ActivityIndicator, RefreshControl, Alert, ImageBackground, Modal, ScrollView, TextInput, Platform } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Voice from '@react-native-voice/voice';
import API_BASE_URL from '../apiConfig';
import { useLanguage } from '../service/LanguageContext';

const MyFeed = ({ route }) => {
  const navigation = useNavigation();
  const { t, language } = useLanguage();
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
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [activeVoiceField, setActiveVoiceField] = useState(null);

  const paymentMethods = [
    { label: t('upi'), value: 'UPI', icon: 'qrcode' },
    { label: t('creditCard') || t('card'), value: 'Credit Card', icon: 'credit-card' },
    { label: t('debitCard') || t('card'), value: 'Debit Card', icon: 'credit-card-outline' },
    { label: t('netBanking') || t('online'), value: 'Net Banking', icon: 'bank' },
    { label: t('cash'), value: 'Cash', icon: 'cash' },
    { label: t('other'), value: 'Others', icon: 'dots-horizontal' }
  ];

  const months = [
    { label: t('january') || 'January', value: 'Jan', fullName: 'January' },
    { label: t('february') || 'February', value: 'Feb', fullName: 'February' },
    { label: t('march') || 'March', value: 'Mar', fullName: 'March' },
    { label: t('april') || 'April', value: 'Apr', fullName: 'April' },
    { label: t('may') || 'May', value: 'May', fullName: 'May' },
    { label: t('june') || 'June', value: 'Jun', fullName: 'June' },
    { label: t('july') || 'July', value: 'Jul', fullName: 'July' },
    { label: t('august') || 'August', value: 'Aug', fullName: 'August' },
    { label: t('september') || 'September', value: 'Sep', fullName: 'September' },
    { label: t('october') || 'October', value: 'Oct', fullName: 'October' },
    { label: t('november') || 'November', value: 'Nov', fullName: 'November' },
    { label: t('december') || 'December', value: 'Dec', fullName: 'December' }
  ];

  useFocusEffect(
    React.useCallback(() => {
      loadFeedData();
      
      // Cleanup function for voice recognition
      return () => {
        if (Platform.OS !== 'web') {
          Voice.destroy().then(Voice.removeAllListeners);
        }
      };
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
        Alert.alert(t('error'), t('couldNotFindMemberId'));
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
      Alert.alert(t('error'), t('errorMessage'));
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
      const paymentFeedItems = (data.payments || []).map((payment, index) => {
        const isConfirmed = payment.status === 'AdminConfirmed';
        return {
          id: `payment_${payment.paymentId || index}`,
          paymentId: payment.paymentId,
          type: payment.receiptNo ? 'payment_made' : 'payment_due',
          title: payment.receiptNo ? t('paymentReceived') : t('pendingPayments'),
          description: `${t('payment')} ${t('for')} ${payment.paymentForMonth || t('unknown')}`,
          memberName: data.memberName || t('you'),
          amount: payment.amount || 0,
          date: payment.paymentDate || payment.paymentEndDate || new Date().toISOString(),
          status: payment.status || (payment.receiptNo ? 'Paid' : 'Pending'),
          adminConfirmed: isConfirmed,
          icon: payment.receiptNo ? 'check-circle' : 'alert-circle',
          color: payment.receiptNo ? '#4CAF50' : '#FF9800',
          paymentMethod: payment.paymentMethod,
          receiptNo: payment.receiptNo,
          transactionId: payment.transactionId,
          paymentForMonth: payment.paymentForMonth,
          dueDate: payment.paymentEndDate,
          paidDate: payment.paymentDate,
        };
      });

      console.log('Mapped payment feed items:', paymentFeedItems);
      setFeedData(paymentFeedItems);

    } catch (error) {
      console.error('Error loading payment data:', error);
      Alert.alert(t('error'), t('errorMessage'));
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
        title: visitor.becameMember || visitor.BecameMember ? t('visitorBecameMember') : t('visitor'),
        description: `${visitor.visitorName || visitor.VisitorName || t('unknownVisitor')} ${t('from')} ${visitor.visitorBusiness || visitor.VisitorBusiness || visitor.company || visitor.Company || t('unknownCompany')}`,
        memberName: visitor.visitorName || visitor.VisitorName || `${visitor.firstName || visitor.FirstName || ''} ${visitor.lastName || visitor.LastName || ''}`.trim() || t('unknownVisitor'),
        date: visitor.visitDate || visitor.VisitDate || new Date().toISOString(),
        status: visitor.becameMember || visitor.BecameMember ? t('member') : (visitor.status || visitor.Status || t('pending')),
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
        Alert.alert(t('error'), t('errorMessage'));
      }
      setFeedData([]);
    }
  };
  const handleAddPayment = async () => {
    // Validation
    if (!paymentForm.amount.trim() || isNaN(paymentForm.amount) || parseFloat(paymentForm.amount) <= 0) {
      Alert.alert(t('validationError'), t('pleaseEnterValidAmount'));
      return;
    }
    if (!paymentForm.transactionId.trim()) {
      Alert.alert(t('validationError'), t('pleaseEnterTransactionId'));
      return;
    }
    if (!paymentForm.paymentForMonth.trim()) {
      Alert.alert(t('validationError'), t('pleaseEnterMonth'));
      return;
    }

    const memberId = await getCurrentUserMemberId();
    if (!memberId) {
      Alert.alert(t('error'), t('memberIdNotFound'));
      return;
    }

    const authToken = await AsyncStorage.getItem('jwt_token') ||
      await AsyncStorage.getItem('token') ||
      await AsyncStorage.getItem('authToken');

    if (!authToken) {
      Alert.alert(t('authenticationError'), t('pleaseLoginAgain'));
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
      Alert.alert(t('validationError'), t('pleaseEnterValidMonth'));
      return;
    }

    const payload = {
      MemberId: parseInt(memberId),
      Amount: parseFloat(paymentForm.amount),
      PaymentType: t('monthlyPayment'),
      PaymentMethod: paymentForm.paymentMethod || "UPI",
      TransactionId: paymentForm.transactionId.trim(),
      PaymentForMonth: formattedMonth,
      PaymentDate: paymentForm.paymentDate.toISOString().split('T')[0],
      Status: t('paid'),
      CreatedBy: t('member')
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
        ? `${t('paymentSubmittedSuccessfully')}\n${t('receiptNumber', { number: receiptNumber })}`
        : t('paymentSubmittedSuccessfully');

      Alert.alert(t('success'), successMessage);

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
      Alert.alert(t('paymentError'), error.message || t('errorMessage'));
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

  const startVoiceInput = async (fieldName) => {
    if (Platform.OS === 'web') {
      Alert.alert(t('voiceInput'), t('pleaseUseMobileApp'));
      return;
    }

    try {
      setIsListening(true);
      setActiveVoiceField(fieldName);

      // Capture the intended field in a local variable so async handlers use the correct target
      const targetField = fieldName;

      // Remove previous listeners to avoid duplicate callbacks
      try {
        if (Voice && Voice.removeAllListeners) Voice.removeAllListeners();
      } catch (e) {
        // ignore
      }

      // Set up voice recognition event handlers (use captured targetField)
      Voice.onSpeechStart = () => {
        console.log('Voice recognition started for:', targetField);
      };

      Voice.onSpeechEnd = () => {
        console.log('Voice recognition ended for:', targetField);
        setIsListening(false);
        setActiveVoiceField(null);
      };

      Voice.onSpeechResults = (event) => {
        console.log('Voice results:', event.value);
        console.log('Captured voice target field:', targetField);

        if (event.value && event.value.length > 0) {
          const spokenText = event.value[0];
          console.log('Spoken text for', targetField, ':', spokenText);

          switch (targetField) {
            case 'amount': {
              const amountMatch = spokenText.match(/\d+(?:[\.\,]\d+)?/g);
              if (amountMatch) {
                // join and normalize decimals (replace comma with dot)
                const raw = amountMatch.join('');
                const normalized = raw.replace(',', '.');
                const amount = normalized;
                console.log('Setting amount:', amount);
                setPaymentForm(prev => ({ ...prev, amount: amount }));
              } else {
                Alert.alert(t('error'), t('pleaseSpeakNumbersOnly') || 'Please speak numbers only for amount');
              }
              break;
            }

            case 'transactionId': {
              const cleanTransactionId = spokenText.trim().replace(/\s+/g, '');
              console.log('Setting transaction ID:', cleanTransactionId);
              setPaymentForm(prev => ({ ...prev, transactionId: cleanTransactionId }));
              break;
            }

            case 'paymentForMonth': {
              const cleanMonth = spokenText.trim();
              console.log('Setting payment month:', cleanMonth);
              setPaymentForm(prev => ({ ...prev, paymentForMonth: cleanMonth }));
              setShowMonthDropdown(true);
              break;
            }

            default:
              console.warn('Unknown voice field:', targetField);
              break;
          }
        }
      };

      Voice.onSpeechError = (error) => {
        console.error('Voice recognition error:', error);
        setIsListening(false);
        setActiveVoiceField(null);
        Alert.alert(t('voiceError'), t('voiceRecognitionFailed'));
      };

      await Voice.start('en-IN');
    } catch (error) {
      console.error('Error starting voice recognition:', error);
      setIsListening(false);
      setActiveVoiceField(null);
      Alert.alert(t('voiceError'), t('voiceRecognitionFailed'));
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
${t('alaigalMembersNetwork')}
================================

${t('paymentReceipt').toUpperCase()}

${t('receiptId')}: ${selectedPayment.receiptId}
${t('date')}: ${selectedPayment.paidDate}
${t('paymentMethod')}: ${selectedPayment.paymentMethod}

${t('memberDetails').toUpperCase()}
${t('name')}: ${selectedPayment.memberName || t('notAvailable')}
${t('memberId')}: ${await getCurrentUserMemberId() ? `MEM-${await getCurrentUserMemberId()}` : t('notAvailable')}

${t('paymentDetails').toUpperCase()}
${t('month')}: ${selectedPayment.month}
${t('amount')}: \u20B9${selectedPayment.amount.toLocaleString()}
${t('paymentType')}: ${selectedPayment.type}
${t('status')}: ${selectedPayment.status}
${t('dueDate')}: ${selectedPayment.dueDate}
${t('paidDate')}: ${selectedPayment.paidDate}

${t('transactionDetails').toUpperCase()}
${t('transactionId')}: ${selectedPayment.transactionId || t('notAvailable')}

${t('thankYouPayment')}

${t('supportContact')}
Phone: +91-XXXXXXXXXX

================================
${t('electronicReceipt')}
      `;

      const fileName = `Receipt_${selectedPayment.receiptId || Date.now()}.txt`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(filePath, receiptContent);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'text/plain',
          dialogTitle: t('downloadReceipt'),
        });
      }
    } catch (error) {
      console.error('Download Receipt Error:', error);
      Alert.alert(t('error'), t('failedToDownloadReceipt'));
    }
  };

  const handleDownloadPaymentReceipt = async (paymentItem) => {
    try {
      const currentMemberId = await getCurrentUserMemberId();
      const memberName = paymentItem.memberName || t('notAvailable');
      
      const receiptContent = `
${t('alaigalMembersNetwork')}
================================

${t('paymentReceipt').toUpperCase()}

${t('receiptId')}: ${paymentItem.receiptNo || t('notAvailable')}
${t('date')}: ${formatDate(paymentItem.paidDate || paymentItem.date)}
${t('paymentMethod')}: ${paymentItem.paymentMethod || t('notAvailable')}

${t('memberDetails').toUpperCase()}
${t('name')}: ${memberName}
${t('memberId')}: ${currentMemberId ? `MEM-${currentMemberId}` : t('notAvailable')}

${t('paymentDetails').toUpperCase()}
${t('month')}: ${paymentItem.paymentForMonth || t('unknown')}
${t('amount')}: \u20B9${(paymentItem.amount || 0).toLocaleString()}
${t('paymentType')}: ${t('monthlyPayment')}
${t('status')}: ${paymentItem.status}
${t('dueDate')}: ${paymentItem.dueDate || t('notAvailable')}
${t('paidDate')}: ${formatDate(paymentItem.paidDate || paymentItem.date)}

${t('transactionDetails').toUpperCase()}
${t('transactionId')}: ${paymentItem.transactionId || t('notAvailable')}

${t('thankYouPayment')}

${t('supportContact')}
Phone: +91-XXXXXXXXXX

================================
${t('electronicReceipt')}
      `;

      const fileName = `Receipt_${paymentItem.receiptNo || Date.now()}.txt`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(filePath, receiptContent);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'text/plain',
          dialogTitle: t('downloadReceipt'),
        });
      }
    } catch (error) {
      console.error('Download Receipt Error:', error);
      Alert.alert(t('error'), t('failedToDownloadReceipt'));
    }
  };

  const handlePayNow = (payment) => {
    const amount = payment.amount || 0;
    Alert.alert(t('makePayment'), `${t('payAmount', { amount: amount.toLocaleString(), month: payment.month || t('unknown') })}`, [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('payNow'), onPress: () => {
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
        Alert.alert(t('error'), t('authenticationError') + '. ' + t('pleaseLoginAgain'));
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

        Alert.alert(t('success'), `${t('referral')} ${status.toLowerCase()}ed ${t('successfully')}!`);
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
      Alert.alert(t('error'), error.message || t('errorMessage'));
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
        Alert.alert(t('error'), t('authenticationError') + '. ' + t('pleaseLoginAgain'));
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

      const endpoint = `${API_BASE_URL}/api/TYFCB/${numericId}/status`;
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

        Alert.alert(t('success'), `${t('thanksNote')} ${status.toLowerCase()}ed ${t('successfully')}!`);
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
      Alert.alert(t('error'), error.message || t('errorMessage'));
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

    const translatedStatus = translateStatus(item.status);
    const isPending = !item.status || translatedStatus === t('pending');

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
      // Use current language for date formatting
      const locale = language === 'ta' ? 'ta-IN' : 'en-US';
      return date.toLocaleDateString(locale, {
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

  // Helper function to translate feed item titles
  const translateFeedTitle = (item) => {
    if (!item.title) return t('activity');
    
    const title = item.title.toLowerCase();
    
    // Map common English titles to Tamil translations with proper patterns
    if (title.includes('referral given') || title.includes('referral sent') || title.includes('you gave') || title.includes('gave referral') || title.includes('sent referral')) {
      return t('referralGiven');
    }
    if (title.includes('referral received') || title.includes('you received referral') || title.includes('received referral')) {
      return t('referralReceived');
    }
    if ((title.includes('thanks') || title.includes('tyfcb')) && (title.includes('given') || title.includes('you gave') || title.includes('sent'))) {
      return t('thanksNoteGiven');
    }
    if ((title.includes('thanks') || title.includes('tyfcb')) && (title.includes('received') || title.includes('you received'))) {
      return t('thanksNoteReceived');
    }
    if (title.includes('one to one') || title.includes('meeting') || title.includes('you met') || title.includes('1:1') || title.includes('one-to-one')) {
      return t('oneToOneMeeting');
    }
    if (title.includes('payment received') || title.includes('payment made')) {
      return t('paymentReceived');
    }
    if (title.includes('pending payment') || title.includes('payment due')) {
      return t('pendingPayments');
    }
    if (title.includes('visitor') || title.includes('you visited')) {
      return t('visitor');
    }
    
    // If no match found, return the original title or fallback
    return item.title || t('activity');
  };

  // Helper function to translate feed item descriptions
  const translateFeedDescription = (item) => {
    if (!item.description) return t('noDataAvailable');
    
    // For English, return original description as-is (don't change published behavior)
    if (language !== 'ta') {
      return item.description;
    }
    
    // Only provide Tamil translations when language is Tamil
    const description = item.description.toLowerCase();
    
    // Handle "you visited" patterns in Tamil
    if (description.includes('you visited') || description.includes('you brought visitor') || description.includes('visitor brought')) {
      const businessName = item.visitorBusiness || item.company || item.businessName || item.memberName || 'D';
      return `à®¨à¯€à®™à¯à®•à®³à¯ ${businessName} à® à®ªà®¾à®°à¯à®µà¯ˆà®¯à®¿à®Ÿà¯à®Ÿà¯€à®°à¯à®•à®³à¯`;
    }
    
    if (description.includes('you met') || description.includes('you had meeting') || description.includes('meeting with') || description.includes('1:1 with')) {
      const memberName = item.memberName || 'D';
      return `à®¨à¯€à®™à¯à®•à®³à¯ ${memberName} à® à®šà®¨à¯à®¤à®¿à®¤à¯à®¤à¯€à®°à¯à®•à®³à¯`;
    }
    
    if (description.includes('you gave referral') || description.includes('you gave a referral') || description.includes('you referred') || description.includes('referral to') || description.includes('sent referral')) {
      const memberName = item.memberName || 'D';
      return `à®¨à¯€à®™à¯à®•à®³à¯ ${memberName} à®•à¯à®•à¯ à®ªà®°à®¿à®¨à¯à®¤à¯à®°à¯ˆ à®µà®´à®™à¯à®•à®¿à®©à¯€à®°à¯à®•à®³à¯`;
    }
    
    if (description.includes('you received referral') || description.includes('referral from') || description.includes('got referral')) {
      const memberName = item.memberName || 'D';
      return `à®¨à¯€à®™à¯à®•à®³à¯ ${memberName} à®‡à®Ÿà®®à®¿à®°à¯à®¨à¯à®¤à¯ à®ªà®°à®¿à®¨à¯à®¤à¯à®°à¯ˆ à®ªà¯†à®±à¯à®±à¯€à®°à¯à®•à®³à¯`;
    }
    
    if (description.includes('you gave thanks') || description.includes('you sent thanks') || description.includes('thanks to') || description.includes('tyfcb to')) {
      const memberName = item.memberName || 'D';
      return `à®¨à¯€à®™à¯à®•à®³à¯ ${memberName} à®•à¯à®•à¯ à®¨à®©à¯à®±à®¿ à®¤à¯†à®°à®¿à®µà®¿à®¤à¯à®¤à¯€à®°à¯à®•à®³à¯`;
    }
    
    if (description.includes('you received thanks') || description.includes('thanks from') || description.includes('tyfcb from') || description.includes('got thanks')) {
      const memberName = item.memberName || 'D';
      return `${memberName} à®‰à®™à¯à®•à®³à¯à®•à¯à®•à¯ à®¨à®©à¯à®±à®¿ à®¤à¯†à®°à®¿à®µà®¿à®¤à¯à®¤à®¾à®°à¯`;
    }
    
    // Handle third person patterns in Tamil
    if (description.includes('gave referral') || description.includes('sent referral')) {
      const memberName = item.memberName || 'D';
      return `${memberName} à®ªà®°à®¿à®¨à¯à®¤à¯à®°à¯ˆ à®•à¯Šà®Ÿà¯à®¤à¯à®¤à®¾à®°à¯`;
    }
    
    if (description.includes('received referral') || description.includes('got referral')) {
      const memberName = item.memberName || 'D';
      return `${memberName} à®ªà®°à®¿à®¨à¯à®¤à¯à®°à¯ˆ à®ªà¯†à®±à¯à®±à®¾à®°à¯`;
    }
    
    if (description.includes('gave thanks') || description.includes('sent thanks')) {
      const memberName = item.memberName || 'D';
      return `${memberName} à®¨à®©à¯à®±à®¿ à®¤à¯†à®°à®¿à®µà®¿à®¤à¯à®¤à®¾à®°à¯`;
    }
    
    if (description.includes('received thanks') || description.includes('got thanks')) {
      const memberName = item.memberName || 'D';
      return `${memberName} à®¨à®©à¯à®±à®¿ à®ªà¯†à®±à¯à®±à®¾à®°à¯`;
    }
    
    // Handle specific thanks note activity types in Tamil
    if (item.type === 'tyfcb_given' || item.type === 'thanksnote_given') {
      const memberName = item.memberName || 'D';
      return `à®¨à¯€à®™à¯à®•à®³à¯ ${memberName} à®•à¯à®•à¯ à®¨à®©à¯à®±à®¿ à®¤à¯†à®°à®¿à®µà®¿à®¤à¯à®¤à¯€à®°à¯à®•à®³à¯`;
    }
    
    if (item.type === 'tyfcb_received' || item.type === 'thanksnote_received') {
      const memberName = item.memberName || 'D';
      return `${memberName} à®‰à®™à¯à®•à®³à¯à®•à¯à®•à¯ à®¨à®©à¯à®±à®¿ à®¤à¯†à®°à®¿à®µà®¿à®¤à¯à®¤à®¾à®°à¯`;
    }
    
    // For payment items in Tamil
    if (item.type === 'payment_made' || item.type === 'payment_due') {
      return `${item.paymentForMonth || 'à®¤à¯†à®°à®¿à®¯à®¾à®¤'} à®®à®¾à®¤à®¤à¯à®¤à®¿à®±à¯à®•à®¾à®© à®ªà®£à®®à¯`;
    }
    
    // For visitor items in Tamil
    if (item.type === 'visitor_brought' || item.type === 'visitor_became_member') {
      const visitorName = item.memberName || item.visitorName || 'D';
      const company = item.visitorBusiness || item.company || '';
      if (company) {
        return `${visitorName} ${company} à®‡à®²à¯ à®‡à®°à¯à®¨à¯à®¤à¯`;
      } else {
        return `${visitorName} à®ªà®¾à®°à¯à®µà¯ˆà®¯à®¾à®³à®°à¯`;
      }
    }
    
    // Return original description if no Tamil translation pattern matches
    return item.description;
  };

  // Helper function to translate status values
  const translateStatus = (status) => {
    if (!status) return '';
    
    const statusLower = status.toLowerCase();
    
    // Map common English status values to Tamil translations
    if (statusLower === 'pending' || statusLower === 'waiting') return t('pending');
    if (statusLower === 'completed' || statusLower === 'complete' || statusLower === 'done') return t('completed');
    if (statusLower === 'confirmed' || statusLower === 'confirm') return t('confirmed');
    if (statusLower === 'approved' || statusLower === 'approve') return t('approved');
    if (statusLower === 'rejected' || statusLower === 'reject' || statusLower === 'declined') return t('rejected');
    if (statusLower === 'cancelled' || statusLower === 'cancel' || statusLower === 'canceled') return t('cancelled');
    if (statusLower === 'paid' || statusLower === 'payment made') return t('paid');
    if (statusLower === 'unpaid' || statusLower === 'not paid') return t('unpaid');
    if (statusLower === 'active') return t('active');
    if (statusLower === 'inactive') return t('inactive');
    if (statusLower === 'member') return t('member');
    
    // Return original status if no translation found
    return status;
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
    const translatedStatus = translateStatus(item.status);
    if (translatedStatus === t('confirmed') || translatedStatus === t('completed') || translatedStatus === t('approved') || translatedStatus === t('paid') || translatedStatus === t('member')) {
      statusColor = '#4CAF50';
    } else if (translatedStatus === t('rejected') || translatedStatus === t('cancelled')) {
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
            <Text style={styles.feedTitle}>{translateFeedTitle(item)}</Text>
            {item.status && (
              <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                <Text style={styles.statusText}>{translatedStatus}</Text>
              </View>
            )}
          </View>
          <Text style={styles.feedDescription}>{translateFeedDescription(item)}</Text>
          {item.memberName && (
            <Text style={styles.memberName}>{t('member')}: {item.memberName}</Text>
          )}
          <Text style={styles.feedDate}>
            {formatDate(item.date || new Date().toISOString())}
            {item.amount > 0 && ` \u2022 ${t('amount')}: \u20B9${item.amount.toLocaleString()}`}
          </Text>

          {/* Show download button only for admin-confirmed payment items */}
          {item.type === 'payment_made' && item.adminConfirmed && (
            <View style={styles.paymentActions}>
              <TouchableOpacity
                style={styles.downloadButton}
                onPress={() => handleDownloadPaymentReceipt(item)}
              >
                <Icon name="download" size={16} color="#4A90E2" />
                <Text style={styles.downloadButtonText}>{t('downloadReceipt')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Show pending confirmation badge for submitted but not yet confirmed payments */}
          {item.type === 'payment_made' && !item.adminConfirmed && (
            <View style={styles.pendingConfirmBadge}>
              <Icon name="clock-outline" size={13} color="#FF8C00" />
              <Text style={styles.pendingConfirmText}>Pending Admin Confirmation</Text>
            </View>
          )}

          {/* Show click hint for receivable items */}
          {((item.type === 'referral_received') ||
            (item.type === 'tyfcb_received')) &&
            (!item.status || translateStatus(item.status) === t('pending')) && (
              <View style={styles.clickHint}>
                <Icon name="hand-pointing-right" size={14} color="#4A90E2" />
                <Text style={styles.clickHintText}>{t('tapToView')}</Text>
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
        <Text style={styles.headerTitle}>{t('myActivityLog')}</Text>
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
            <Text style={[styles.tabButtonText, activeTab === 'all' && styles.tabButtonTextActive]}>{t('allTime')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'referral' && styles.tabButtonActive]}
            onPress={() => setActiveTab('referral')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'referral' && styles.tabButtonTextActive]}>{t('referral')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, (activeTab === 'tyfcb' || activeTab === 'thanksnote') && styles.tabButtonActive]}
            onPress={() => setActiveTab('thanksnote')}
          >
            <Text style={[styles.tabButtonText, (activeTab === 'tyfcb' || activeTab === 'thanksnote') && styles.tabButtonTextActive]}>{t('thanksNote')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'one_to_one' && styles.tabButtonActive]}
            onPress={() => setActiveTab('one_to_one')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'one_to_one' && styles.tabButtonTextActive]}>{t('meetings')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'payment' && styles.tabButtonActive]}
            onPress={() => setActiveTab('payment')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'payment' && styles.tabButtonTextActive]}>{t('payments')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, (activeTab === 'visitor' || activeTab === 'visitors') && styles.tabButtonActive]}
            onPress={() => setActiveTab('visitors')}
          >
            <Text style={[styles.tabButtonText, (activeTab === 'visitor' || activeTab === 'visitors') && styles.tabButtonTextActive]}>{t('visitors')}</Text>
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
            <Text style={styles.shortcutButtonText}>{t('addReferral')}</Text>
          </TouchableOpacity>
        )}
        {(activeTab === 'tyfcb' || activeTab === 'thanksnote') && (
          <TouchableOpacity
            style={[styles.shortcutButton, { backgroundColor: '#FF9800' }]}
            onPress={() => navigation.navigate('TYFCBSlip')}
          >
            <Icon name="plus-circle" size={18} color="#FFF" />
            <Text style={styles.shortcutButtonText}>{t('addThanksNote')}</Text>
          </TouchableOpacity>
        )}
        {activeTab === 'payment' && (
          <TouchableOpacity
            style={[styles.shortcutButton, { backgroundColor: '#4CAF50' }]}
            onPress={() => setShowAddPaymentModal(true)}
          >
            <Icon name="plus-circle" size={18} color="#FFF" />
            <Text style={styles.shortcutButtonText}>{t('addPayment')}</Text>
          </TouchableOpacity>
        )}
        {(activeTab === 'visitor' || activeTab === 'visitors') && (
          <TouchableOpacity
            style={[styles.shortcutButton, { backgroundColor: '#9C27B0' }]}
            onPress={() => navigation.navigate('Visitors')}
          >
            <Icon name="plus-circle" size={18} color="#FFF" />
            <Text style={styles.shortcutButtonText}>{t('addVisitor')}</Text>
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
            <Text style={[styles.toggleText, referralTab === 'give' && styles.toggleTextActive]}>{t('given')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, referralTab === 'my' && styles.toggleButtonActive]}
            onPress={() => setReferralTab('my')}
          >
            <Icon name="account-arrow-left" size={18} color={referralTab === 'my' ? '#FFF' : '#4A90E2'} />
            <Text style={[styles.toggleText, referralTab === 'my' && styles.toggleTextActive]}>{t('received')}</Text>
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
            <Text style={[styles.toggleText, thanksNoteTab === 'given' && styles.toggleTextActive]}>{t('given')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, thanksNoteTab === 'received' && styles.toggleButtonActive]}
            onPress={() => setThanksNoteTab('received')}
          >
            <Icon name="hand-heart" size={18} color={thanksNoteTab === 'received' ? '#FFF' : '#FF9800'} />
            <Text style={[styles.toggleText, thanksNoteTab === 'received' && styles.toggleTextActive]}>{t('received')}</Text>
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
              {t('noDataAvailable')}
            </Text>
            <Text style={styles.emptySubtext}>
              {t('feedUpdates')}
            </Text>
            {!loading && (
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={loadFeedData}
              >
                <Icon name="refresh" size={20} color="#4A90E2" />
                <Text style={styles.refreshButtonText}>{t('refresh')}</Text>
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
                {detailModalType === 'referral' ? t('referralDetails') :
                  detailModalType === 'tyfcb' ? t('thanksNote') : t('activityDetails')}
              </Text>
              <TouchableOpacity
                onPress={() => setShowDetailModal(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}
              contentContainerStyle={styles.modalContentContainer} >
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
                    <Text style={styles.detailTitle}>{translateFeedTitle(selectedItem)}</Text>
                  </View>

                  {/* Status Badge */}
                  {selectedItem.status && (
                    <View style={[styles.detailStatusBadge, {
                      backgroundColor: translateStatus(selectedItem.status) === t('confirmed') ? '#4CAF50' :
                        translateStatus(selectedItem.status) === t('rejected') ? '#F44336' : '#FF9800'
                    }]}>
                      <Text style={styles.detailStatusText}>
                        {t('status')}: {translateStatus(selectedItem.status)}
                      </Text>
                    </View>
                  )}

                  {/* Details Grid - 2 columns layout */}
                  <View style={styles.detailsGrid}>
                    {/* Row 1: Date and Member */}
                    <View style={styles.detailItem}>
                      <Icon name="calendar" size={20} color="#666" />
                      <Text style={styles.detailLabel}>{t('date')}</Text>
                      <Text style={styles.detailValue}>
                        {formatDate(selectedItem.date || new Date().toISOString())}
                      </Text>
                    </View>

                    <View style={styles.detailItem}>
                      <Icon name="account" size={20} color="#666" />
                      <Text style={styles.detailLabel}>{t('member')}</Text>
                      <Text style={styles.detailValue}>
                        {selectedItem.memberName || t('notAvailable')}
                      </Text>
                    </View>

                    {/* Row 2: Amount and Type */}
                    <View style={styles.detailItem}>
                      <Icon name="currency-usd" size={20} color="#666" />
                      <Text style={styles.detailLabel}>{t('amount')}</Text>
                      <Text style={[styles.detailValue, { color: selectedItem.amount > 0 ? '#4CAF50' : '#666', fontWeight: 'bold' }]}>
                        {selectedItem.amount > 0 ? `\u20B9${selectedItem.amount.toLocaleString()}` : t('notAvailable')}
                      </Text>
                    </View>

                    <View style={styles.detailItem}>
                      <Icon name="shape" size={20} color="#666" />
                      <Text style={styles.detailLabel}>{t('paymentType')}</Text>
                      <Text style={styles.detailValue}>
                        {selectedItem.type === 'referral_received' ? t('referralReceived') :
                          selectedItem.type === 'referral_given' ? t('referralGiven') :
                            selectedItem.type === 'tyfcb_received' ? t('thanksNoteReceived') :
                              selectedItem.type === 'tyfcb_given' ? t('thanksNoteGiven') :
                                selectedItem.type === 'payment_made' ? t('paymentReceived') :
                                  selectedItem.type === 'payment_due' ? t('pendingPayments') :
                                    selectedItem.type === 'visitor_brought' ? t('visitor') :
                                      selectedItem.type === 'visitor_became_member' ? t('visitorBecameMember') : t('activity')}
                      </Text>
                    </View>
                  </View>

                  {/* Description */}
                  <View style={styles.descriptionContainer}>
                    <Text style={styles.descriptionLabel}>{t('description')}</Text>
                    <Text style={styles.descriptionText}>
                      {translateFeedDescription(selectedItem)}
                    </Text>
                  </View>

                  {/* Additional Notes if available */}
                  {selectedItem.notes && (
                    <View style={styles.notesContainer}>
                      <Text style={styles.notesLabel}>{t('additionalNotes')}</Text>
                      <Text style={styles.notesText}>{selectedItem.notes}</Text>
                    </View>
                  )}

                  {/* Action Buttons - Always visible for received items */}
                  {((selectedItem.type === 'referral_received') ||
                    (selectedItem.type === 'tyfcb_received')) && (
                      <View style={styles.actionButtonsContainer}>
                        <Text style={styles.actionTitle}>
                          {(!selectedItem.status || translateStatus(selectedItem.status) === t('pending'))
                            ? t('takeAction')
                            : t('actions')}
                        </Text>
                        <View style={styles.actionButtons}>
                          <TouchableOpacity
                            style={[styles.actionButton, styles.confirmActionButton]}
                            onPress={confirmStatusUpdate}
                            disabled={updatingItemId === selectedItem.id ||
                              (selectedItem.status && translateStatus(selectedItem.status) !== t('pending'))}
                          >
                            {updatingItemId === selectedItem.id ? (
                              <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                              <>
                                <Icon name="check-circle" size={20} color="#FFF" />
                                <Text style={styles.actionButtonText}>{t('confirm')}</Text>
                              </>
                            )}
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.actionButton, styles.rejectActionButton]}
                            onPress={rejectStatusUpdate}
                            disabled={updatingItemId === selectedItem.id ||
                              (selectedItem.status && translateStatus(selectedItem.status) !== t('pending'))}
                          >
                            {updatingItemId === selectedItem.id ? (
                              <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                              <>
                                <Icon name="close-circle" size={20} color="#FFF" />
                                <Text style={styles.actionButtonText}>{t('reject')}</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                        {selectedItem.status && translateStatus(selectedItem.status) !== t('pending') && (
                          <Text style={styles.actionHint}>
                            {t('alreadyProcessed')} {translateStatus(selectedItem.status).toLowerCase()}
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
          setShowMonthDropdown(false);
        }}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPaymentMethodDropdown(false) || setShowMonthDropdown(false)}
        >
          <TouchableOpacity 
            style={styles.modalContainer}
            activeOpacity={1}
            onPress={() => {}}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('addPaymentDetails')}</Text>
              <TouchableOpacity onPress={() => {
                setShowAddPaymentModal(false);
                setShowPaymentMethodDropdown(false);
                setShowMonthDropdown(false);
              }}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Amount */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{t('amountRequired')}</Text>
                <View style={styles.inputContainer}>
                  <Icon name="currency-inr" size={18} color="#4A90E2" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder={t('enterAmount')}
                    value={paymentForm.amount}
                    onChangeText={(text) => setPaymentForm(prev => ({ ...prev, amount: text.replace(/[^0-9]/g, '') }))}
                    keyboardType="numeric"
                    placeholderTextColor="#999"
                  />
                  <TouchableOpacity
                    onPress={() => startVoiceInput('amount')}
                    style={[styles.voiceButton, isListening && activeVoiceField === 'amount' && { backgroundColor: '#FFE5E5' }]}
                  >
                    <Icon 
                      name={isListening && activeVoiceField === 'amount' ? "microphone" : "microphone-outline"} 
                      size={18} 
                      color={isListening && activeVoiceField === 'amount' ? "#F44336" : "#4A90E2"} 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Payment Method */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{t('paymentMethodRequired')}</Text>
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
                    {paymentForm.paymentMethod || t('paymentMethod')}
                  </Text>
                  <Icon 
                    name={showPaymentMethodDropdown ? 'chevron-up' : 'chevron-down'} 
                    size={20} 
                    color="#4A90E2" 
                  />
                </TouchableOpacity>
                
                {showPaymentMethodDropdown && (
                  <ScrollView 
                    style={styles.dropdownList}
                    nestedScrollEnabled={true}
                    showsVerticalScrollIndicator={true}
                  >
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
                  </ScrollView>
                )}
              </View>

              {/* Payment Date */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{t('paymentDateRequired')}</Text>
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
                <Text style={styles.formLabel}>{t('transactionIdRequired')}</Text>
                <View style={styles.inputContainer}>
                  <Icon name="barcode" size={18} color="#4A90E2" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder={t('enterTransactionId')}
                    value={paymentForm.transactionId}
                    onChangeText={(text) => setPaymentForm(prev => ({ ...prev, transactionId: text }))}
                    placeholderTextColor="#999"
                  />
                  <TouchableOpacity
                    onPress={() => startVoiceInput('transactionId')}
                    style={[styles.voiceButton, isListening && activeVoiceField === 'transactionId' && { backgroundColor: '#FFE5E5' }]}
                  >
                    <Icon 
                      name={isListening && activeVoiceField === 'transactionId' ? "microphone" : "microphone-outline"} 
                      size={18} 
                      color={isListening && activeVoiceField === 'transactionId' ? "#F44336" : "#4A90E2"} 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Payment For Month */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{t('paymentForMonthRequired')}</Text>
                <Text style={styles.formHint}>
                  {t('enterMonthHint')}
                </Text>
                
                {/* Single Input Field with Autocomplete */}
                <View style={styles.inputContainer}>
                  <Icon name="calendar-month" size={18} color="#4A90E2" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder={t('enterMonth')}
                    value={paymentForm.paymentForMonth}
                    onChangeText={(text) => {
                      setPaymentForm(prev => ({ ...prev, paymentForMonth: text }));
                      // Show dropdown when user starts typing
                      setShowMonthDropdown(text.length > 0);
                    }}
                    onFocus={() => {
                      // Show dropdown when field is focused and has text
                      if (paymentForm.paymentForMonth.length > 0) {
                        setShowMonthDropdown(true);
                      }
                    }}
                    placeholderTextColor="#999"
                  />
                  {paymentForm.paymentForMonth.length > 0 && (
                    <TouchableOpacity 
                      onPress={() => {
                        setPaymentForm(prev => ({ ...prev, paymentForMonth: '' }));
                        setShowMonthDropdown(false);
                      }}
                      style={styles.clearButton}
                    >
                      <Icon name="close-circle" size={18} color="#999" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => startVoiceInput('paymentForMonth')}
                    style={[styles.voiceButton, isListening && activeVoiceField === 'paymentForMonth' && { backgroundColor: '#FFE5E5' }]}
                  >
                    <Icon 
                      name={isListening && activeVoiceField === 'paymentForMonth' ? "microphone" : "microphone-outline"} 
                      size={18} 
                      color={isListening && activeVoiceField === 'paymentForMonth' ? "#F44336" : "#4A90E2"} 
                    />
                  </TouchableOpacity>
                </View>
                
                {/* Smart Autocomplete Dropdown */}
                {showMonthDropdown && paymentForm.paymentForMonth.length > 0 && (
                  <ScrollView 
                    style={styles.dropdownList}
                    nestedScrollEnabled={true}
                    showsVerticalScrollIndicator={true}
                  >
                    {months
                      .filter(month => 
                        month.label.toLowerCase().includes(paymentForm.paymentForMonth.toLowerCase()) ||
                        month.value.toLowerCase().includes(paymentForm.paymentForMonth.toLowerCase()) ||
                        month.fullName.toLowerCase().includes(paymentForm.paymentForMonth.toLowerCase())
                      )
                      .map((month, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setPaymentForm(prev => ({ ...prev, paymentForMonth: month.value }));
                            setShowMonthDropdown(false);
                          }}
                        >
                          <Icon name="calendar" size={18} color="#4A90E2" />
                          <Text style={styles.dropdownItemText}>
                            {month.label} ({month.value})
                          </Text>
                          <Icon name="arrow-right" size={16} color="#4A90E2" />
                        </TouchableOpacity>
                      ))
                    }
                    {months.filter(month => 
                      month.label.toLowerCase().includes(paymentForm.paymentForMonth.toLowerCase()) ||
                      month.value.toLowerCase().includes(paymentForm.paymentForMonth.toLowerCase()) ||
                      month.fullName.toLowerCase().includes(paymentForm.paymentForMonth.toLowerCase())
                    ).length === 0 && (
                      <View style={styles.noResultsContainer}>
                        <Icon name="calendar-alert" size={24} color="#999" />
                        <Text style={styles.noResultsText}>{t('noMatchingMonths')}</Text>
                      </View>
                    )}
                  </ScrollView>
                )}
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
                    <Text style={styles.submitButtonText}>{t('submitPayment')}</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowAddPaymentModal(false);
                  setShowPaymentMethodDropdown(false);
                  setShowMonthDropdown(false);
                }}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
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
              <Text style={styles.receiptHeaderTitle}>{t('paymentReceipt')}</Text>
              <TouchableOpacity onPress={handleDownloadReceipt}>
                <Icon name="download" size={24} color="#4A90E2" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.receiptContent}>
              <View style={styles.receiptLogoSection}>
                <Text style={styles.receiptCompanyName}>{t('alaigalMembersNetwork').split(' ')[0]}</Text>
                <Text style={styles.receiptCompanySubtitle}>{t('alaigalMembersNetwork').split(' ').slice(1).join(' ')}</Text>
              </View>

              <Text style={styles.receiptTitle}>{t('paymentReceipt').toUpperCase()}</Text>

              <View style={styles.receiptInfoRow}>
                <View style={styles.receiptInfoItem}>
                  <Text style={styles.receiptInfoLabel}>{t('receiptId')}</Text>
                  <Text style={styles.receiptInfoValue}>{selectedPayment?.receiptId || t('notAvailable')}</Text>
                </View>
                <View style={styles.receiptInfoItem}>
                  <Text style={styles.receiptInfoLabel}>{t('date')}</Text>
                  <Text style={styles.receiptInfoValue}>{selectedPayment?.paidDate || t('notAvailable')}</Text>
                </View>
              </View>

              <View style={styles.receiptDivider} />

              <View style={styles.receiptSection}>
                <Text style={styles.receiptSectionTitle}>{t('memberDetails')}</Text>
                <View style={styles.receiptDetailRow}>
                  <Text style={styles.receiptDetailLabel}>{t('name')}:</Text>
                  <Text style={styles.receiptDetailValue}>{selectedPayment?.memberName || t('notAvailable')}</Text>
                </View>
              </View>

              <View style={styles.receiptSection}>
                <Text style={styles.receiptSectionTitle}>{t('paymentDetails')}</Text>
                <View style={styles.receiptDetailRow}>
                  <Text style={styles.receiptDetailLabel}>{t('month')}:</Text>
                  <Text style={styles.receiptDetailValue}>{selectedPayment?.month || t('notAvailable')}</Text>
                </View>
                <View style={styles.receiptDetailRow}>
                  <Text style={styles.receiptDetailLabel}>{t('amount')}:</Text>
                  <Text style={styles.receiptDetailValue}>\u20B9{(selectedPayment?.amount || 0).toLocaleString()}</Text>
                </View>
                <View style={styles.receiptDetailRow}>
                  <Text style={styles.receiptDetailLabel}>{t('paymentMethod')}:</Text>
                  <Text style={styles.receiptDetailValue}>{selectedPayment?.paymentMethod || t('notAvailable')}</Text>
                </View>
              </View>

              <View style={styles.receiptAmountBox}>
                <Text style={styles.receiptAmountLabel}>{t('totalAmountPaid')}</Text>
                <Text style={styles.receiptAmountValue}>\u20B9{(selectedPayment?.amount || 0).toLocaleString()}</Text>
              </View>

              <View style={styles.receiptFooter}>
                <Text style={styles.receiptFooterText}>{t('thankYouPayment')}</Text>
                <Text style={styles.receiptFooterSubtext}>{t('supportContact')}</Text>
                <Text style={styles.receiptFooterSubtext}>{t('electronicReceipt')}</Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.receiptDownloadButton}
              onPress={handleDownloadReceipt}
            >
              <Icon name="download" size={20} color="#FFF" />
              <Text style={styles.receiptDownloadButtonText}>{t('downloadReceipt')}</Text>
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
  modalContentContainer: {
  paddingBottom: 40,  // â† Extra space at bottom so buttons are visible
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
  pendingConfirmBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF8C00',
    marginTop: 8,
    alignSelf: 'flex-start',
    gap: 5,
  },
  pendingConfirmText: {
    fontSize: 11,
    color: '#FF8C00',
    fontWeight: '600',
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
    maxHeight: '80%',
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
    padding: 16
  },
  // Detail Modal Styles
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
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
    marginBottom: 16,
    gap: 10
  },
  detailRow: {
    flexDirection: 'row',
    gap: 12
  },
  detailItem: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 12,
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
    padding: 12,
    borderRadius: 10,
    marginBottom: 16
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
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
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
    marginTop: 16
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
    maxHeight: 200,
    overflow: 'hidden',
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
  orText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#666',
    marginVertical: 8,
    fontStyle: 'italic',
  },
  clearButton: {
    padding: 4,
  },
  voiceButton: {
    padding: 4,
    marginLeft: 4,
  },
  noResultsContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noResultsText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
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
