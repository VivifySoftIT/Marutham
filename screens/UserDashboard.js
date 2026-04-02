import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
  Dimensions,
  Modal,
  ActivityIndicator,
  Image,
} from 'react-native';

import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import ApiService from '../service/api';
import MemberIdService from '../service/MemberIdService';
import { useLanguage } from '../service/LanguageContext';

const { width } = Dimensions.get('window');

// Birthday Wishes Section Component
const BirthdayWishesSection = ({ memberId }) => {
  const { t } = useLanguage(); // Add useLanguage hook
  const [birthdayWish, setBirthdayWish] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (memberId) {
      loadBirthdayWish();
    }
  }, [memberId]);

  const loadBirthdayWish = async () => {
    try {
      setLoading(true);
      const wish = await ApiService.getTodaysBirthdayWish(memberId);
      if (wish) {
        console.log('Birthday wish received:', wish);
        setBirthdayWish(wish);
      } else {
        // No wish found - this is normal, don't log as error
        setBirthdayWish(null);
      }
    } catch (error) {
      // Only log if it's a real error (not just "not found")
      if (!error.message || !error.message.includes('No birthday wish found')) {
        console.error('Error loading birthday wish:', error);
      }
      setBirthdayWish(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Animatable.View
        animation="fadeInUp"
        delay={500}
        style={styles.sectionContainer}
      >
        <View style={styles.birthdayWishCard}>
          <ActivityIndicator size="small" color="#4A90E2" />
          <Text style={styles.birthdayWishLoading}>{t('checkingBirthdayWishes')}</Text>
        </View>
      </Animatable.View>
    );
  }

  if (!birthdayWish) {
    return null; // Don't show anything if no birthday wish
  }

  return (
    <Animatable.View
      animation="bounceIn"
      delay={500}
      style={styles.sectionContainer}
    >
      <LinearGradient
        colors={['#FFE5E5', '#FFF0F0']} // Red theme to match birthday notifications
        style={styles.birthdayWishCard}
      >
        <View style={styles.birthdayWishHeader}>
          <Icon name="cake-variant" size={40} color="#FF6B6B" /> {/* Red cake color */}
          <View style={styles.birthdayWishContent}>
            <Text style={styles.birthdayWishTitle}>🎉 {t('birthdayWishReceived')}</Text>
            <Text style={styles.birthdayWishMessage}>
              {birthdayWish.senderName || t('member')} {t('sentYouBirthdayWishes')}
            </Text>
            <Text style={styles.birthdayWishTime}>
              {new Date(birthdayWish.sentDate).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </Animatable.View>
  );
};

// Define waterBlueColors OUTSIDE the component
const waterBlueColors = {
  primary: '#4A90E2',
  light: '#87CEEB',
  lighter: '#B3E0F2',
  lightest: '#E0F7FA',
  dark: '#357ABD',
  darker: '#1E5A96',
};

// API base URL
const API_BASE_URL = 'https://www.vivifysoft.in/AlaigalBE';

const UserDashboard = () => {
  const navigation = useNavigation();
  const { t, language } = useLanguage();
  
  // Debug logging
  console.log('UserDashboard - Current language:', language);
  console.log('UserDashboard - Language type:', typeof language);
  
  // Utility function to check if text contains Tamil characters
  const isTamilText = (text) => {
    return /[\u0B80-\u0BFF]/.test(text);
  };

  // Function to get translated notification title using t() keys
  const getNotificationTitle = (messageType, subject) => {
    if (messageType === 'Birthday') {
      if (subject && subject.includes('Reminder')) return t('birthdayReminderTitle');
      if (subject && subject.includes('Wish')) return `🎉 ${t('birthdayWishReceived')}`;
      return t('birthdayNotificationTitle');
    }
    if (messageType === 'BirthdayWishReceived') return `🎉 ${t('birthdayWishReceived')}`;
    if (messageType === 'Payment') return t('paymentNotificationTitle');
    if (messageType === 'Meeting') return t('meetingNotificationTitle');
    if (messageType === 'Event') return t('eventNotificationTitle');
    if (messageType === 'NewMember') return t('newMemberNotificationTitle');
    if (subject && subject.trim()) return subject;
    return `${messageType} ${t('notificationSuffix')}`;
  };

  // Function to get translated notification message using t() keys
  const getNotificationMessage = (msg, fallback) => {
    if (!msg.content || !msg.content.trim()) {
      // Use t() key-based defaults
      if (msg.messageType === 'Birthday' || msg.messageType === 'BirthdayWishReceived')
        return t('birthdayWishDefaultMsg');
      if (msg.messageType === 'Payment') return t('paymentNotificationMsg');
      if (msg.messageType === 'Meeting') return t('meetingNotificationMsg');
      if (msg.messageType === 'Event') return t('eventNotificationMsg');
      if (msg.messageType === 'NewMember') return t('newMemberNotificationMsg');
      return fallback || t('newNotificationReceived');
    }
    // Return raw content — language-specific display handled by t() keys above
    return msg.content;
  };
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);
  const [greeting, setGreeting] = useState('');
  const [dailyKural, setDailyKural] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('all'); // 'all', 'weekly', 'monthly', 'annual'
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  // State for inline settings
  const [showLanguageSettings, setShowLanguageSettings] = useState(false);
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);

  // Language options - Only English and Tamil
  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'ta', name: 'Tamil', flag: '🇮🇳' },
  ];

  const [notifications, setNotifications] = useState([]);

  // User statistics
  const [stats, setStats] = useState({
    referralGiven: 0,
    referralReceived: 0,
    tyfcbGiven: 0,
    tyfcbReceived: 0,
    ceusCount: 0,
    visitorsCount: 0,
    businessesVisited: 0,
  });

  const periods = [
    { id: 'all', label: t('allTime'), icon: 'calendar' },
    { id: 'weekly', label: t('weekly'), icon: 'calendar-week' },
    { id: 'monthly', label: t('monthly'), icon: 'calendar-month' },
    { id: 'annual', label: t('annual'), icon: 'calendar-range' },
  ];

  useEffect(() => {
    loadUserData();
    setGreetingMessage();
    loadDashboardReminders();
    loadDailyKural();
  }, []);

  // Reload notifications when language changes so titles/messages update
  useEffect(() => {
    loadDashboardReminders();
  }, [language]);

  useFocusEffect(
    React.useCallback(() => {
      loadUserData();
      loadDashboardReminders();
    }, [])
  );

  const setGreetingMessage = () => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting(t('goodMorning'));
    else if (hour < 18) setGreeting(t('goodAfternoon'));
    else setGreeting(t('goodEvening'));
  };

  // Get current user's member ID using MemberIdService
  const getCurrentUserMemberId = async () => {
    return await MemberIdService.getCurrentUserMemberId();
  };
  const loadUserData = async () => {
    try {
      setLoading(true);

      const username = await AsyncStorage.getItem('username');
      const fullName = await AsyncStorage.getItem('fullName');
      const email = await AsyncStorage.getItem('email');
      const phone = await AsyncStorage.getItem('phone');
      const userId = await AsyncStorage.getItem('userId');

      console.log('UserDashboard - Loading user data:');
      console.log('Username:', username);
      console.log('FullName:', fullName);

      // Get member ID using the function
      const memberId = await getCurrentUserMemberId();
      console.log('UserDashboard - Retrieved memberId:', memberId);

      // Get member details if memberId exists
      let memberDetails = null;
      if (memberId) {
        try {
          console.log('UserDashboard - Fetching member details for ID:', memberId);
          const response = await fetch(`${API_BASE_URL}/api/Members/${memberId}`);
          if (response.ok) {
            memberDetails = await response.json();
            console.log('UserDashboard - Member details:', memberDetails);
          }
        } catch (error) {
          console.error('UserDashboard - Error fetching member details:', error);
        }
      }

      setUserData({
        username,
        fullName: memberDetails?.name || fullName || 'Member',
        email: memberDetails?.email || email || '',
        phone: memberDetails?.phone || phone || '',
        memberId: memberId?.toString() || '',
        memberCode: memberDetails?.memberCode || 'N/A',
        memberType: memberDetails?.memberType || 'Member',
        userId,
      });

      // Load user statistics from API with selected period
      if (memberId) {
        console.log('UserDashboard - Calling fetchMemberStats with memberId:', memberId);
        await fetchMemberStats(memberId, selectedPeriod);
      } else {
        console.log('UserDashboard - No memberId found');
        // Set default stats if no member ID
        setStats(prev => ({ ...prev }));
      }
    } catch (error) {
      console.error('UserDashboard - Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMemberStats = async (memberId, period = 'all') => {
    try {
      // Ensure memberId is valid
      if (!memberId || memberId === 'undefined') {
        console.log('UserDashboard - Invalid memberId:', memberId);
        setStats({
          referralGiven: 0,
          referralReceived: 0,
          tyfcbGiven: 0,
          tyfcbReceived: 0,
          ceusCount: 0,
          visitorsCount: 0,
          businessesVisited: 0,
        });
        return;
      }

      console.log('UserDashboard - fetchMemberStats called with memberId:', memberId, 'period:', period);
      setLoading(true);

      // Convert memberId to number if it's a string
      const memberIdNum = typeof memberId === 'string' ? parseInt(memberId, 10) : memberId;

      let url = `${API_BASE_URL}/api/Inventory/member/${memberIdNum}`;
      if (period && period !== 'all') {
        url += `?period=${period}`;
      }

      const response = await fetch(url);
      const responseText = await response.text();
      console.log('UserDashboard - API response status:', response.status);
      console.log('UserDashboard - API response text:', responseText);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${responseText}`);
      }

      if (responseText) {
        const data = JSON.parse(responseText);
        console.log('UserDashboard - Parsed stats data:', data);

        const newStats = {
          referralGiven: data.referralsGiven || data.ReferralsGiven || 0,
          referralReceived: data.referralsReceived || data.ReferralsReceived || 0,
          tyfcbGiven: data.thanksGiven || data.ThanksGiven || 0,
          tyfcbReceived: data.thanksReceived || data.ThanksReceived || 0,
          ceusCount: data.ceus || data.CEUs || 0,
          visitorsCount: data.visitors || data.Visitors || 0,
          businessesVisited: data.businessesVisited || data.BusinessesVisited || 0,
        };
        console.log('UserDashboard - Setting stats:', newStats);
        setStats(newStats);
      }
    } catch (error) {
      console.error('UserDashboard - Error fetching member stats:', error);
      // Don't show alert, just log the error
      console.log('UserDashboard - Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodSelect = async (periodId) => {
    setSelectedPeriod(periodId);
    setShowPeriodDropdown(false);

    if (userData?.memberId) {
      setLoading(true);
      await fetchMemberStats(userData.memberId, periodId === 'all' ? null : periodId);
    }
  };

const loadDailyKural = async () => {
  try {
    // Cache key includes today's date so it refreshes daily
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `dailyKural_${today}`;
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      setDailyKural(JSON.parse(cached));
      return;
    }
    const kural = await ApiService.getDailyThirukkural();
    if (kural) {
      setDailyKural(kural);
      await AsyncStorage.setItem(cacheKey, JSON.stringify(kural));
    }
  } catch (error) {
    console.log('UserDashboard - Could not load daily kural:', error.message);
  }
};

const loadDashboardReminders = async () => {
  try {
    const memberId = await getCurrentUserMemberId();
    if (!memberId) {
      console.log('UserDashboard - No memberId for reminders');
      setNotifications([]);
      setNotificationCount(0);
      return;
    }

    console.log('UserDashboard - Loading dashboard reminders for memberId:', memberId);

    // ONLY load message notifications (includes Birthday, NewMember, Event, etc.)
    let messageNotifications = null;
    let birthdayWishReceived = null;
    let upcomingMeetings = [];
    let memberPayments = null;
    
    try {
      messageNotifications = await ApiService.getMessageNotificationReport(null, 'daily', memberId);
      console.log('UserDashboard - Message notifications response:', messageNotifications);
      if (messageNotifications && messageNotifications.data) {
        messageNotifications = messageNotifications.data;
      } else if (!Array.isArray(messageNotifications)) {
        messageNotifications = [];
      }
      console.log('UserDashboard - Processed message notifications:', messageNotifications);
    } catch (error) {
      console.error('UserDashboard - Error loading message notifications:', error);
      messageNotifications = [];
    }

    // Load meetings from MeetingDetails table (correct endpoint)
    try {
      const meetingsData = await ApiService.getMeetingDetails();
      const allMeetings = Array.isArray(meetingsData) ? meetingsData : [];
      // meetingDate is DateOnly string "YYYY-MM-DD" — filter today and future
      const todayStr = new Date().toISOString().split('T')[0];
      upcomingMeetings = allMeetings.filter(m => {
        const d = m.meetingDate || m.MeetingDate || '';
        return d >= todayStr;
      });
      console.log('UserDashboard - Upcoming meetings from MeetingDetails:', upcomingMeetings.length);
    } catch (error) {
      console.log('UserDashboard - Could not load meetings:', error.message);
      upcomingMeetings = [];
    }

    // Load member payment status
    try {
      memberPayments = await ApiService.getMemberPayments(memberId);
      console.log('UserDashboard - Member payments:', memberPayments);
    } catch (error) {
      console.log('UserDashboard - Could not load member payments:', error.message);
      memberPayments = null;
    }

    // Load birthday wish received
    try {
      birthdayWishReceived = await ApiService.getTodaysBirthdayWish(memberId);
      console.log('UserDashboard - Birthday wish received:', birthdayWishReceived);
    } catch (error) {
      console.log('UserDashboard - No birthday wish received today');
      birthdayWishReceived = null;
    }

    const newNotifications = [];

    // Add birthday wish received as a notification with different color
    if (birthdayWishReceived) {
      // Validate and format the birthday wish time
      let wishTime = '';
      if (birthdayWishReceived.sentDate) {
        const wishDate = new Date(birthdayWishReceived.sentDate);
        if (!isNaN(wishDate.getTime())) {
          wishTime = wishDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      }

      newNotifications.push({
        id: `birthday-wish-${birthdayWishReceived.id || Date.now()}`,
        type: 'birthday-wish-received',
        messageType: 'BirthdayWishReceived',
        title: `🎉 ${t('birthdayWishReceived')}`,
        message: `${birthdayWishReceived.senderName || t('member')} ${t('sentYouBirthdayWishes')}`,
        time: wishTime,
        icon: 'cake-variant',
        color: '#E91E63', // Pink color for received wishes
        backgroundColor: '#FCE4EC', // Light pink background
        isRead: false,
        canRespond: false, // Birthday wishes received don't need response
        attachmentUrl: null,
        eventDate: birthdayWishReceived.sentDate,
        createdBy: birthdayWishReceived.senderId,
      });
    }

    // ✅ ONLY process message notifications — no reminders!

    // Add upcoming meeting notifications from MeetingDetails
    if (upcomingMeetings.length > 0) {
      upcomingMeetings.forEach((meeting) => {
        const meetingDate = meeting.meetingDate || meeting.MeetingDate || '';
        const rawTitle = meeting.meetingTitle || meeting.MeetingTitle || '';
        const rawPlace = meeting.place || meeting.Place || '';
        const rawTime = meeting.time || meeting.Time || '';
        const timeStr = rawTime ? rawTime.substring(0, 5) : '';
        const meetingType = meeting.meetingType || meeting.MeetingType || '';
        const desc = meeting.description || meeting.Description || '';

        // Format date for display (will be re-formatted at render via rawDate)
        let displayDate = '';
        if (meetingDate) {
          const [y, m, d] = meetingDate.split('-');
          const dt = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
          displayDate = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }

        newNotifications.push({
          id: `meeting-${meeting.id || meeting.Id}`,
          type: 'meeting',
          messageType: 'Meeting',
          title: `📅 ${rawTitle || t('meetingNotificationTitle')}`,
          message: [displayDate, timeStr, rawPlace].filter(Boolean).join(' • '),
          time: displayDate,
          icon: 'calendar-clock',
          color: '#4ECDC4',
          backgroundColor: '#E8F8F7',
          isRead: false,
          canRespond: true,
          meetingId: meeting.id || meeting.Id,
          eventDate: meetingDate,
          meetingType,
          description: desc,
          // Raw fields for re-rendering when language changes
          rawTitle,
          rawDate: meetingDate,
          rawPlace,
          rawTime: timeStr,
        });
      });
    }

    // Add payment due notification using MemberPaymentSummaryDto structure
    if (memberPayments && memberPayments.totalDueAmount > 0) {
      const dueMonths = memberPayments.dueMonths || [];
      const nextDue = dueMonths[0]; // earliest due month
      newNotifications.push({
        id: `payment-due-${memberId}`,
        type: 'payment',
        messageType: 'Payment',
        title: `💳 ${t('paymentDueTitle')}`,
        message: nextDue
          ? `₹${nextDue.dueAmount} ${t('dueFor')} ${nextDue.month}`
          : `₹${memberPayments.totalDueAmount} ${t('totalDue')}`,
        time: '',
        icon: 'credit-card-clock',
        color: '#FF9800',
        backgroundColor: '#FFF3E0',
        isRead: false,
        canRespond: true,
        totalDue: memberPayments.totalDueAmount,
        dueMonths,
      });
    }
    if (messageNotifications && messageNotifications.length > 0) {
      messageNotifications.forEach((msg) => {
        console.log('Processing message notification:', {
          id: msg.id,
          messageType: msg.messageType,
          subject: msg.subject,
          content: msg.content,
          recipientName: msg.recipientName,
          recipientMemberId: msg.recipientMemberId,
          memberName: msg.memberName,
          memberId: msg.memberId,
          toMemberName: msg.toMemberName,
          toMemberId: msg.toMemberId,
          allFields: Object.keys(msg)
        });
        
        const notificationTypeMap = {
          'Payment': { icon: 'credit-card-check', color: '#4CAF50', backgroundColor: '#E8F5E9' },
          'Birthday': { icon: 'cake-variant', color: '#FF6B6B', backgroundColor: '#FFE5E5' }, // Red cake color
          'Event': { icon: 'calendar-star', color: '#FF9800', backgroundColor: '#FFF3E0' },
          'Meeting': { icon: 'calendar-clock', color: '#4ECDC4', backgroundColor: '#E8F8F7' },
          'Welcome': { icon: 'hand-wave', color: '#9C27B0', backgroundColor: '#F3E5F5' },
          'NewMember': { icon: 'account-plus', color: '#2196F3', backgroundColor: '#E3F2FD' }
        };
        const typeConfig = notificationTypeMap[msg.messageType] ||
          { icon: 'information', color: '#45B7D1', backgroundColor: '#E3F2FD' };

        let notificationMessage = msg.content || t('newNotificationReceived');
        let displayTime = '';
        
        // Helper function to validate and format date
        const formatDateSafely = (dateString) => {
          if (!dateString) return null;
          const date = new Date(dateString);
          if (isNaN(date.getTime())) return null; // Invalid date
          return date;
        };
        
        if ((msg.messageType === 'Event' || msg.messageType === 'Meeting') && msg.date) {
          const eventDate = formatDateSafely(msg.date);
          if (eventDate) {
            const formattedDate = eventDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });
            notificationMessage = `${notificationMessage}\n📅 ${formattedDate}`;
            // For meeting notifications, display the meeting date instead of created date
            displayTime = formattedDate;
          }
        } else if (msg.createdDate) {
          // For non-meeting notifications, display created date
          const createdDate = formatDateSafely(msg.createdDate);
          if (createdDate) {
            displayTime = createdDate.toLocaleDateString();
          }
        }

        // Extract recipient information from the message content or other fields
        let recipientName = t('member');
        let recipientMemberId = null;
        
        // Try to extract recipient name from content for Birthday/NewMember notifications
        if (msg.messageType === 'Birthday' || msg.messageType === 'NewMember') {
          // Check if there's a recipient field in the API response
          if (msg.recipientName) {
            recipientName = msg.recipientName;
            recipientMemberId = msg.recipientMemberId;
          } else if (msg.recipient) {
            recipientName = msg.recipient;
            recipientMemberId = msg.recipientId;
          } else if (msg.memberName) {
            recipientName = msg.memberName;
            recipientMemberId = msg.memberId;
          } else if (msg.toMemberName) {
            recipientName = msg.toMemberName;
            recipientMemberId = msg.toMemberId;
          } else if (msg.content) {
            // Try to extract name from content with various patterns
            const patterns = [
              /(?:Happy Birthday to|Birthday wishes for|Birthday of|Wishing)\s+([A-Za-z\s\.]+?)(?:\s|$|!|\.|,|\n)/i,
              /(?:Welcome)\s+([A-Za-z\s\.]+?)(?:\s|$|!|\.|,|\n)/i,
              /(?:New member)\s+([A-Za-z\s\.]+?)(?:\s|$|!|\.|,|\n)/i,
              /([A-Za-z\s\.]+?)(?:'s birthday|has joined)/i
            ];
            
            for (const pattern of patterns) {
              const match = msg.content.match(pattern);
              if (match && match[1] && match[1].trim() !== 'member') {
                recipientName = match[1].trim();
                console.log('Extracted recipient name from content:', recipientName);
                break;
              }
            }
          }
          
          // Log the extraction results for debugging
          console.log('Notification recipient extraction:', {
            messageType: msg.messageType,
            originalContent: msg.content,
            extractedName: recipientName,
            extractedId: recipientMemberId,
            msgFields: Object.keys(msg),
            allMsgData: msg
          });
        }

        newNotifications.push({
          id: `message-${Math.abs(msg.id || Date.now())}`,
          type: 'message',
          messageType: msg.messageType,
          title: getNotificationTitle(msg.messageType, msg.subject),
          message: getNotificationMessage(msg, notificationMessage),
          time: displayTime,
          icon: typeConfig.icon,
          color: typeConfig.color,
          backgroundColor: typeConfig.backgroundColor,
          isRead: false,
          canRespond: (msg.messageType === 'Birthday' || msg.messageType === 'NewMember' || msg.messageType === 'Meeting' || msg.messageType === 'Payment'),
          attachmentUrl: msg.attachmentUrl,
          eventDate: msg.date,
          createdBy: msg.createdBy,
          recipientName: recipientName,
          recipientMemberId: recipientMemberId,
          meetingId: msg.meetingId || msg.id, // For meeting responses
        });
      });
    }

    setNotifications(newNotifications);
    setNotificationCount(newNotifications.filter(n => !n.isRead).length);
    console.log('UserDashboard - Set notifications from API:', newNotifications.length);
    console.log('UserDashboard - Unread notifications:', newNotifications.filter(n => !n.isRead).length);
    console.log('UserDashboard - Notification details:', newNotifications.map(n => ({ id: n.id, title: n.title, isRead: n.isRead })));
  } catch (error) {
    console.error('UserDashboard - Error loading dashboard reminders:', error);
    setNotifications([]);
    setNotificationCount(0);
  }
};

  const handleLogout = () => {
    Alert.alert(
      t('logout'),
      t('areYouSureLogout'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          onPress: async () => {
            try {
              // clear member id cache
              await MemberIdService.clearMemberId();

              await ApiService.logout();
              await AsyncStorage.clear();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('Error during logout:', error);
              // Force logout even if API fails
              await AsyncStorage.clear();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            }
          },
        },
      ]
    );
  };

  // Mark notification as read
  const markNotificationAsRead = (notificationId) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId
          ? { ...notif, isRead: true }
          : notif
      )
    );

    // Update notification count
    const unreadCount = notifications.filter(n => !n.isRead && n.id !== notificationId).length;
    setNotificationCount(unreadCount);
  };

  // Clear all notifications
  const clearAllNotifications = () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, isRead: true })));
    setNotificationCount(0);
  };

  // Handle birthday response
// Handle birthday response with API call
const handleBirthdayResponse = async (notification) => {
  try {
    // Get sender's member ID (current user)
    const senderMemberId = await getCurrentUserMemberId();
    
    if (!senderMemberId) {
      Alert.alert(t('error'), t('couldNotFindMemberId'));
      return;
    }

    // Get recipient's member ID - if not available, try to fetch by name
    let recipientMemberId = notification.recipientMemberId;
    
    if (!recipientMemberId && notification.recipientName) {
      try {
        console.log('Fetching member ID for:', notification.recipientName);
        setLoading(true);
        
        // Get all members and search by name
        const allMembers = await ApiService.getMembers();
        const member = allMembers.find(m => 
          m.name && m.name.toLowerCase() === notification.recipientName.toLowerCase()
        );
        
        if (member) {
          recipientMemberId = member.id;
          console.log('Found member ID:', recipientMemberId);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching member:', error);
        setLoading(false);
      }
    }
    
    // Final validation
    if (!recipientMemberId) {
      Alert.alert(
        t('memberNotFound'),
        `${t('couldNotFindMemberIdFor')} ${notification.recipientName}. ${t('pleaseTryAgainLater')}`
      );
      return;
    }
    
    Alert.alert(
      t('sendBirthdayWishes'),
      `${t('sendBirthdayWishesTo')} ${notification.recipientName}?`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('send'),
          onPress: async () => {
            try {
              setLoading(true);

              // Prepare the request data according to SendBirthdayWishDto
              const requestData = {
                MemberId: recipientMemberId,
                CreatedBy: senderMemberId,
                CustomMessage: null // Optional: You can add custom message input if needed
              };

              // Log the request for debugging
              console.log('Sending birthday wish:', requestData);

              // Call the birthday wish API - CORRECT ENDPOINT
              const response = await fetch(`${API_BASE_URL}/api/MessageNotifications/birthday/wish`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json'
                },
                body: JSON.stringify(requestData)
              });

              if (!response.ok) {
                const errorText = await response.text();
                console.error('Birthday wish API error - Status:', response.status);
                console.error('Birthday wish API error - Response:', errorText);
                
                let errorMessage = t('failedToSendBirthdayWish');
                
                try {
                  const errorJson = JSON.parse(errorText);
                  errorMessage = errorJson.title || errorJson.message || errorJson.error || errorMessage;
                  console.error('Birthday wish API error - Parsed:', errorJson);
                } catch (e) {
                  // If not JSON, use the text as is
                  if (errorText && errorText.length < 200) {
                    errorMessage = errorText;
                  }
                }
                
                Alert.alert('Error', errorMessage);
                setLoading(false);
                return;
              }

              const result = await response.json();
              console.log('Birthday wish sent successfully:', result);
              
              // Mark notification as read
              markNotificationAsRead(notification.id);
              
              Alert.alert(
                t('success'),
                `${t('birthdayWishesSentTo')} ${notification.recipientName}! 🎉`,
                [{ text: t('ok') }]
              );
              
              // Refresh notifications to update UI
              await loadDashboardReminders();
              
            } catch (error) {
              console.error('Error sending birthday wish:', error);
              console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                notification: notification
              });
              Alert.alert(t('error'), `${t('anErrorOccurred')} ${error.message || t('unknownError')}`);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  } catch (error) {
    console.error('Error in handleBirthdayResponse:', error);
    Alert.alert(t('error'), t('failedToProcessBirthdayWish'));
  }
};

  // Handle payment response
  const handlePaymentResponse = (notification) => {
    Alert.alert(
      t('paymentNotification'),
      t('viewPaymentDetails'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('viewDetails'),
          onPress: () => {
            // Navigate to payments screen or show payment details
            navigation.navigate('MyPayments');
            markNotificationAsRead(notification.id);
          },
        },
      ]
    );
  };

 // Handle meeting response - POST to /api/MeetingDetails/{id}/rsvp
const handleMeetingResponse = async (notification) => {
  try {
    const memberId = await getCurrentUserMemberId();
    if (!memberId) {
      Alert.alert(t('error'), t('couldNotFindMemberId'));
      return;
    }
    const memberIdInt = parseInt(memberId, 10);

    const rsvp = async (status) => {
      try {
        setLoading(true);
        const meetingId = notification.meetingId;
        if (!meetingId) {
          Alert.alert(t('error') || 'Error', 'Meeting ID not found');
          return;
        }
        console.log(`RSVP meeting ${meetingId} for member ${memberIdInt} status=${status}`);
        const response = await fetch(
          `${API_BASE_URL}/api/MeetingDetails/${meetingId}/rsvp`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ MemberId: memberIdInt, Status: status }),
          }
        );
        console.log('RSVP response status:', response.status);
        if (response.ok) {
          const msg = status === 1
            ? `${t('youHaveConfirmedAttendance') || 'Attendance confirmed'} ✅`
            : `${t('youIndicatedNotAttend') || 'Response recorded'} ❌`;
          Alert.alert(t('success') || 'Success', msg, [{ text: t('ok') || 'OK' }]);
          markNotificationAsRead(notification.id);
          await loadDashboardReminders();
        } else {
          const errorText = await response.text();
          console.error('RSVP error:', response.status, errorText);
          let errorMessage = 'Failed to record response';
          try { errorMessage = JSON.parse(errorText).message || errorMessage; } catch (e) {}
          Alert.alert(t('error') || 'Error', errorMessage);
        }
      } catch (error) {
        console.error('RSVP error:', error);
        Alert.alert(t('error') || 'Error', error.message);
      } finally {
        setLoading(false);
      }
    };

    Alert.alert(
      t('meetingResponse') || 'Meeting Response',
      notification.message || 'Will you attend this meeting?',
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('attend') || 'Attend ✅', onPress: () => rsvp(1) },
        { text: t('notAttend') || 'Not Attending ❌', style: 'destructive', onPress: () => rsvp(2) },
      ]
    );
  } catch (error) {
    console.error('Error in handleMeetingResponse:', error);
    Alert.alert(t('error'), t('failedToProcessMeetingResponse') || 'Failed to process meeting response');
  }
};
  // Handle notification press
  const handleNotificationPress = (notification) => {
    console.log('Notification pressed:', {
      id: notification.id,
      type: notification.type,
      messageType: notification.messageType,
      canRespond: notification.canRespond,
      recipientMemberId: notification.recipientMemberId
    });

    if (notification.canRespond) {
      if (notification.type === 'birthday') {
        console.log('Handling birthday response from dashboard reminders');
        handleBirthdayResponse(notification);
      } else if (notification.type === 'message' && (notification.messageType === 'Birthday' || notification.messageType === 'NewMember')) {
        // Handle birthday/new member wishes from message notifications
        console.log('Handling wish response from message notifications');
        handleWishResponse(notification);
      } else if (notification.type === 'message' && notification.messageType === 'Meeting') {
        console.log('Handling meeting response');
        handleMeetingResponse(notification);
      } else if (notification.type === 'meeting') {
        console.log('Handling meeting response');
        handleMeetingResponse(notification);
      } else if (notification.type === 'message' && notification.messageType === 'Payment') {
        console.log('Handling payment response');
        handlePaymentResponse(notification);
      }
    } else {
      console.log('Notification cannot respond, marking as read');
      markNotificationAsRead(notification.id);
    }
  };

  // Handle wish response for Birthday and NewMember notifications
  const handleWishResponse = async (notification) => {
    try {
      // Get sender's member ID (current user)
      const senderMemberId = await getCurrentUserMemberId();
      
      if (!senderMemberId) {
        Alert.alert(t('error'), t('couldNotFindMemberId'));
        return;
      }

      const isBirthday = notification.messageType === 'Birthday';
      const wishType = isBirthday ? t('sendBirthdayWishes') : t('sendWelcomeWishes');
      const recipientName = notification.recipientName || t('member');
      
      console.log('Processing wish response for:', recipientName, 'Type:', wishType);
      
      // Skip if recipient name is just the generic member placeholder
      if (recipientName === t('member')) {
        // Try one more time to extract from notification content if available
        if (notification.message) {
          const patterns = [
            /(?:Happy Birthday to|Birthday wishes for|Birthday of|Wishing)\s+([A-Za-z\s]+?)(?:\s|$|!|\.|,)/i,
            /(?:Welcome)\s+([A-Za-z\s]+?)(?:\s|$|!|\.|,)/i,
            /(?:New member)\s+([A-Za-z\s]+?)(?:\s|$|!|\.|,)/i,
            /([A-Za-z\s]+?)(?:'s birthday|has joined)/i
          ];
          
          for (const pattern of patterns) {
            const match = notification.message.match(pattern);
            if (match && match[1] && match[1].trim() !== t('member')) {
              recipientName = match[1].trim();
              console.log('Extracted recipient name from notification message:', recipientName);
              break;
            }
          }
        }
        
        // If still the generic member placeholder, show error
        if (recipientName === t('member')) {
          Alert.alert(
            t('unableToSendWish'),
            t('couldNotIdentifyRecipient'),
            [{ text: t('ok') }]
          );
          return;
        }
      }
      
      // Fetch the actual member ID by name if not already set
      let recipientMemberId = notification.recipientMemberId;
      
      if (!recipientMemberId && recipientName && recipientName !== t('member')) {
        console.log('Fetching member ID for:', recipientName);
        try {
          const response = await fetch(`${API_BASE_URL}/api/Members`);
          if (response.ok) {
            const members = await response.json();
            // Try exact match first
            let member = members.find(m => m.name && m.name.toLowerCase() === recipientName.toLowerCase());
            
            // If no exact match, try partial match
            if (!member) {
              member = members.find(m => m.name && m.name.toLowerCase().includes(recipientName.toLowerCase()));
            }
            
            if (member) {
              recipientMemberId = member.id;
              console.log('Found member ID:', recipientMemberId, 'for name:', recipientName);
            } else {
              console.log('No member found for name:', recipientName);
            }
          }
        } catch (error) {
          console.error('Error fetching member ID:', error);
        }
      }
      
      if (!recipientMemberId) {
        Alert.alert(t('error'), t('couldNotFindMember'));
        return;
      }
      
      Alert.alert(
        `${t('send')} ${wishType}`,
        `${t('send')} ${wishType.toLowerCase()} ${t('to')} ${recipientName}?`,
        [
          { text: t('cancel'), style: 'cancel' },
          {
            text: t('send'),
            onPress: async () => {
              try {
                setLoading(true);

                // Prepare the request data according to SendBirthdayWishDto
                const requestData = {
                  MemberId: recipientMemberId,
                  CreatedBy: senderMemberId,
                  CustomMessage: null // Optional: You can add custom message input if needed
                };

                // Log the request for debugging
                console.log(`Sending ${wishType}:`, requestData);

                // Use birthday wish endpoint for both (or create separate endpoint for welcome)
                // For now, using birthday wish endpoint as the structure is the same
                const endpoint = isBirthday 
                  ? '/api/MessageNotifications/birthday/wish'
                  : '/api/MessageNotifications/birthday/wish'; // TODO: Change to welcome endpoint when available

                const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                  },
                  body: JSON.stringify(requestData)
                });

                if (!response.ok) {
                  const errorText = await response.text();
                  console.error(`${wishType} API error - Status:`, response.status);
                  console.error(`${wishType} API error - Response:`, errorText);
                  
                  let errorMessage = `${t('failedToSendBirthdayWish')} ${wishType.toLowerCase()}. ${t('tryAgain')}`;
                  
                  try {
                    const errorJson = JSON.parse(errorText);
                    errorMessage = errorJson.title || errorJson.message || errorJson.error || errorMessage;
                    console.error(`${wishType} API error - Parsed:`, errorJson);
                  } catch (e) {
                    if (errorText && errorText.length < 200) {
                      errorMessage = errorText;
                    }
                  }
                  
                  Alert.alert('Error', errorMessage);
                  setLoading(false);
                  return;
                }

                const result = await response.json();
                console.log(`${wishType} sent successfully:`, result);
                
                // Mark notification as read
                markNotificationAsRead(notification.id);
                
                Alert.alert(
                  t('success'),
                  `${wishType} ${t('sentTo')} ${recipientName}! 🎉`,
                  [{ text: t('ok') }]
                );
                
                // Refresh notifications to update UI
                await loadDashboardReminders();
                
              } catch (error) {
                console.error(`Error sending ${wishType}:`, error);
                console.error('Error details:', {
                  message: error.message,
                  stack: error.stack,
                  notification: notification
                });
                Alert.alert(t('error'), `${t('anErrorOccurred')} ${error.message || t('unknownError')}`);
              } finally {
                setLoading(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error in handleWishResponse:', error);
      Alert.alert(t('error'), t('failedToProcessWishRequest'));
    }
  };

  // Activity Stat Card with Water Color Theme and Shadows
  const StatCard = ({ icon, label, value, color = waterBlueColors.primary, onPress, delay = 0 }) => (
    <Animatable.View
      animation="fadeInUp"
      delay={delay}
      style={styles.statCardWrapper}
    >
      <TouchableOpacity
        style={styles.statCard}
        onPress={onPress}
        activeOpacity={0.8}
      >
        {/* Water Blue Gradient Background */}
        <LinearGradient
          colors={['#E8F4FD', '#F0F9FF']}
          style={styles.statCardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Water effect overlay */}
          <View style={styles.waterEffect} />

          {/* Content */}
          <View style={styles.statContent}>
            <LinearGradient
              colors={[waterBlueColors.light, waterBlueColors.primary]}
              style={styles.statIconContainer}
            >
              <Icon name={icon} size={18} color="#FFF" />
            </LinearGradient>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={[
              styles.statLabel,
              language === 'ta' && styles.tamilStatLabel
            ]}>{label}</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animatable.View>
  );

  const getPeriodLabel = () => {
    const period = periods.find(p => p.id === selectedPeriod);
    return period ? period.label : 'All Time';
  };

  // Returns translated title/message/time for a notification at render time
  const getNotificationDisplay = (notification) => {
    if ((notification.type === 'meeting' || notification.messageType === 'Meeting') && notification.rawDate) {
      // Format date in current locale
      const [y, m, d] = notification.rawDate.split('-');
      const dt = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      const displayDate = language === 'ta'
        ? dt.toLocaleDateString('ta-IN', { month: 'short', day: 'numeric', year: 'numeric' })
        : dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      const titleText = notification.rawTitle || t('meetingNotificationTitle');
      const parts = [displayDate, notification.rawTime, notification.rawPlace].filter(Boolean);

      return {
        title: `📅 ${titleText}`,
        message: parts.join(' • '),
        time: displayDate,
      };
    }
    return {
      title: notification.title,
      message: notification.message,
      time: notification.time,
    };
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={waterBlueColors.primary} barStyle="light-content" />

      {/* Header with Water Blue Gradient */}
      <LinearGradient
        colors={[waterBlueColors.primary, waterBlueColors.light]}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
  {/* Left: Settings Icon */}
  <TouchableOpacity
    style={styles.headerIconButton}
    onPress={() => navigation.navigate('SettingsScreen')}
  >
    <Icon name="cog" size={24} color="#FFF" />
  </TouchableOpacity>

  {/* Center: Alaigal Title with Logo - Takes up remaining space */}
  <View style={styles.headerTitleContainer}>
    <View style={styles.logoTitleContainer}>
      <View style={styles.logoContainer}>
        <Image 
          source={require('../assets/logomarutham.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
      </View>
      <Text style={[
  styles.welcomeText,
  t('alaigal') === 'அலைகள்' && styles.tamilText
]}>
  {t('alaigal')}
</Text>
    </View>
  </View>

  {/* Right: Notification and Logout Icons */}
  <View style={styles.headerRightContainer}>
    <TouchableOpacity
      onPress={() => setShowNotifications(true)}
      style={styles.headerActionButton}
    >
      <Icon name="bell" size={22} color="#FFF" />
      {notificationCount > 0 && (
        <View style={styles.notificationDot}>
          <Text style={styles.notificationDotText}>{notificationCount}</Text>
        </View>
      )}
    </TouchableOpacity>

    <TouchableOpacity
      onPress={handleLogout}
      style={styles.headerActionButton}
    >
      <Icon name="logout" size={22} color="#FFF" />
    </TouchableOpacity>
  </View>
</View>
<View style={styles.headerCenterContent}>
              {dailyKural ? (
                <Text style={styles.thirukkuralQuote}>
                  {`“${dailyKural.tamil}” — திருக்குறள் ${dailyKural.number}`}
                </Text>
              ) : null}
            </View>
          {/* Enhanced Member Info Card - My Card Style */}
          {/* Card removed as requested */}
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Loading Indicator */}
        {loading && (
          <Animatable.View animation="fadeIn" style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={waterBlueColors.primary} />
              <Text style={styles.loadingText}>{t('loadingYourDashboard')}</Text>
            </View>
          </Animatable.View>
        )}

        {/* Swipeable Notifications Card - Only show if there are notifications */}
        {notifications.length > 0 && (
          <Animatable.View
            animation="fadeInUp"
            delay={200}
            style={styles.notificationCard}
          >
            <View style={styles.notificationCardHeader}>
              <Text style={[
                styles.notificationCardTitle,
                language === 'ta' && styles.tamilNotificationCardTitle
              ]}>🔔 {t('recentNotifications')}</Text>
              <TouchableOpacity onPress={() => setShowNotifications(true)}>
                <Text style={styles.viewAllNotifications}>{t('viewAll')}</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.notificationScrollView}
              contentContainerStyle={styles.notificationScrollContent}
            >
              {notifications.slice(0, 5).map((notification) => {
                const display = getNotificationDisplay(notification);
                return (
                <TouchableOpacity
                  key={notification.id}
                  style={[
                    styles.notificationSwipeCard,
                    !notification.isRead && styles.unreadNotificationCard
                  ]}
                  onPress={() => handleNotificationPress(notification)}
                  activeOpacity={0.8}
                >
                  <View style={[
                    styles.notificationSwipeIcon,
                    { backgroundColor: notification.backgroundColor }
                  ]}>
                    <Icon name={notification.icon} size={18} color={notification.color} />
                  </View>
                  <View style={styles.notificationSwipeContent}>
                    <Text style={[
                      styles.notificationSwipeTitle,
                      language === 'ta' && styles.tamilNotificationSwipeTitle
                    ]} numberOfLines={2}>
                      {display.title}
                    </Text>
                    <Text style={[
                      styles.notificationSwipeMessage,
                      language === 'ta' && styles.tamilNotificationSwipeMessage
                    ]} numberOfLines={2}>
                      {display.message}
                    </Text>
                    {display.time && (
                      <Text style={styles.notificationSwipeTime}>
                        {display.time}
                      </Text>
                    )}
                    {(notification.canRespond && (notification.messageType === 'Birthday' || notification.messageType === 'NewMember' || notification.messageType === 'Meeting' || notification.messageType === 'Payment')) && (
                      <View style={styles.respondBadge}>
                        <Text style={styles.respondBadgeText}>
                          {notification.messageType === 'Meeting' ? t('tapToRespond') : 
                           notification.messageType === 'Payment' ? t('tapToView') : t('tapToRespond')}
                        </Text>
                      </View>
                    )}
                  </View>
                  {!notification.isRead && (
                    <View style={[styles.swipeUnreadIndicator, { backgroundColor: '#FF0000' }]} />
                  )}
                </TouchableOpacity>
                );
              })}

              {/* Remove the "View More" card as requested */}
            </ScrollView>
          </Animatable.View>
        )}

        {/* Stats Section with Period Selector */}
        <Animatable.View
          animation="fadeInUp"
          delay={300}
          style={styles.sectionContainer}
        >
          <View style={styles.sectionHeader}>
            <Text style={[
              styles.sectionTitle,
              t('myActivity') === 'என் செயல்பாடு' && styles.tamilSectionTitle
            ]}>📊 {t('myActivity')}</Text>

            {/* Period Selector Dropdown */}
            <View style={styles.periodSelectorContainer}>
              <TouchableOpacity
                style={styles.periodSelectorButton}
                onPress={() => setShowPeriodDropdown(!showPeriodDropdown)}
                activeOpacity={0.7}
              >
                <Icon name="calendar" size={18} color={waterBlueColors.primary} />
                <Text style={[
                  styles.periodSelectorText,
                  language === 'ta' && styles.tamilPeriodSelectorText
                ]}>{getPeriodLabel()}</Text>
                <Icon
                  name={showPeriodDropdown ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={waterBlueColors.primary}
                />
              </TouchableOpacity>

              {showPeriodDropdown && (
                <View style={styles.periodDropdown}>
                  {periods.map((period) => (
                    <TouchableOpacity
                      key={period.id}
                      style={[
                        styles.periodDropdownItem,
                        selectedPeriod === period.id && styles.periodDropdownItemSelected
                      ]}
                      onPress={() => handlePeriodSelect(period.id)}
                    >
                      <Icon
                        name={period.icon}
                        size={18}
                        color={selectedPeriod === period.id ? waterBlueColors.primary : '#666'}
                      />
                      <Text style={[
                        styles.periodDropdownText,
                        selectedPeriod === period.id && styles.periodDropdownTextSelected,
                        language === 'ta' && styles.tamilPeriodDropdownText
                      ]}>
                        {period.label}
                      </Text>
                      {selectedPeriod === period.id && (
                        <Icon name="check" size={18} color={waterBlueColors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Quick Access Cards - Member List & One-to-One Meeting */}
          <View style={styles.quickAccessGrid}>
            {/* Member List Card */}
            <TouchableOpacity
              style={styles.quickAccessCard}
              onPress={() => navigation.navigate('MembersDirectory')}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#4A90E2', '#357ABD']}
                style={styles.quickAccessGradient}
              >
                <View style={styles.quickAccessIconContainer}>
                  <Icon name="account-group" size={28} color="#FFF" />
                </View>
                <Text style={styles.quickAccessTitle}>{t('MemberList') || 'Member List'}</Text>
                <Text style={styles.quickAccessSubtitle}>{t('viewAllMembers') || 'View all members'}</Text>
                <View style={styles.quickAccessArrow}>
                  <Icon name="arrow-right" size={18} color="#FFF" />
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* One-to-One Meeting Card */}
            <TouchableOpacity
              style={styles.quickAccessCard}
              onPress={() => navigation.navigate('OneToOneSlip')}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#87CEEB', '#4A90E2']}
                style={styles.quickAccessGradient}
              >
                <View style={styles.quickAccessIconContainer}>
                  <Icon name="calendar-account" size={28} color="#FFF" />
                </View>
                <Text style={styles.quickAccessTitle}>{t('oneToOneMeeting') || 'One-to-One Meeting'}</Text>
                <Text style={styles.quickAccessSubtitle}>{t('scheduleNewMeeting') || 'Schedule new meeting'}</Text>
                <View style={styles.quickAccessArrow}>
                  <Icon name="arrow-right" size={18} color="#FFF" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Activity Cards with Water Theme */}
          <View style={styles.statsGrid}>
            <StatCard
              icon="account-arrow-right"
              label={t('referralsGiven')}
              value={stats.referralGiven}
              delay={100}
              onPress={() => navigation.navigate('MyFeed', { tab: 'referral', referralTab: 'give' })}
            />
            <StatCard
              icon="account-arrow-left"
              label={t('referralsReceived')}
              value={stats.referralReceived}
              delay={150}
              onPress={() => navigation.navigate('MyFeed', { tab: 'referral', referralTab: 'my' })}
            />
            <StatCard
              icon="handshake"
              label={t('thanksNoteGiven')}
              value={stats.tyfcbGiven}
              delay={200}
              onPress={() => navigation.navigate('MyFeed', { tab: 'thanksnote', subTab: 'given' })}
            />
            <StatCard
              icon="hand-heart"
              label={t('thanksNoteReceived')}
              value={stats.tyfcbReceived}
              delay={250}
              onPress={() => navigation.navigate('MyFeed', { tab: 'thanksnote', subTab: 'received' })}
            />
            <StatCard
              icon="briefcase-account"
              label={t('businessVisits')}
              value={stats.businessesVisited}
              delay={300}
              onPress={() => Alert.alert(t('businessVisits'), t('viewDetails'))}
            />
            <StatCard
              icon="account-multiple"
              label={t('visitors')}
              value={stats.visitorsCount}
              delay={350}
              onPress={() => navigation.navigate('MyFeed', { tab: 'visitors' })}
            />
          </View>
        </Animatable.View>

        {/* Revenue Summary Card with Period Info */}
        <Animatable.View
          animation="fadeInUp"
          delay={400}
          style={styles.revenueSection}
        >
          {/* <LinearGradient
            colors={[waterBlueColors.primary, waterBlueColors.dark]}
            style={styles.revenueCard}
          >
            <View style={styles.revenueContent}>
              <View style={styles.revenueIcon}>
                <Icon name="briefcase-account" size={30} color="#FFF" />
              </View>
              <View style={styles.revenueInfo}>
                <Text style={styles.revenueLabel}>Businesses Visited</Text>
                <Text style={styles.revenueValue}>
                  {stats.businessesVisited}
                </Text>
                <Text style={styles.revenuePeriod}>
                  {getPeriodLabel()}
                </Text>
              </View>
              <Icon name="trending-up" size={24} color="#FFF" style={styles.trendIcon} />
            </View>
          </LinearGradient> */}
        </Animatable.View>

        {/* Birthday Wishes now included in Recent Notifications */}

        {/* Info Card */}
        <Animatable.View
          animation="fadeInUp"
          delay={700}
          style={styles.infoSection}
        >
          <LinearGradient
            colors={[waterBlueColors.lightest, '#E8F4FD']}
            style={styles.infoCard}
          >
            <LinearGradient
              colors={[waterBlueColors.light, waterBlueColors.primary]}
              style={styles.infoIcon}
            >
              <Icon name="information" size={20} color="#FFF" />
            </LinearGradient>
            <View style={styles.infoContent}>
              <Text style={[
                styles.infoTitle,
                language === 'ta' && styles.tamilInfoTitle
              ]}>{t('welcomeToAlaigal')}</Text>
              <Text style={[
                styles.infoText,
                language === 'ta' && styles.tamilInfoText
              ]}>
                {t('connectWithMembers')}
              </Text>
              <Text style={[
                styles.infoPeriod,
                language === 'ta' && styles.tamilInfoPeriod
              ]}>
                {t('currentlyViewing')} {getPeriodLabel()} {t('statistics')}
              </Text>
            </View>
          </LinearGradient>
        </Animatable.View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* User Details Modal */}
      <Modal
        transparent={true}
        animationType="slide"
        visible={showUserModal}
        onRequestClose={() => setShowUserModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowUserModal(false)}
          />
          <View style={styles.modalContainer}>
            <LinearGradient
              colors={[waterBlueColors.primary, waterBlueColors.light]}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>👤 {t('memberDetails')}</Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setShowUserModal(false)}
              >
                <Icon name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </LinearGradient>

            <View style={styles.modalContent}>
              {/* Profile Section */}
              <View style={styles.modalProfileSection}>
                <LinearGradient
                  colors={[waterBlueColors.light, waterBlueColors.primary]}
                  style={styles.modalAvatar}
                >
                  <Icon name="account" size={40} color="#FFF" />
                </LinearGradient>
                <View style={styles.modalProfileInfo}>
                  <Text style={styles.modalUserName}>{userData?.fullName || 'Member'}</Text>

                  {/* Member ID prominently displayed */}
                  {userData?.memberId && (
                    <View style={styles.modalMemberIdContainer}>
                      <Icon name="id-card" size={16} color={waterBlueColors.primary} />
                      <Text style={styles.modalMemberId}>{t('memberId')}: {userData.memberId}</Text>
                    </View>
                  )}

                  <Text style={styles.modalUserRole}>{userData?.memberType || t('alaigalNetworkMember')}</Text>
                </View>
              </View>

              {/* Settings Options */}
              <View style={styles.settingsOptions}>
                {/* Language Settings */}
                <TouchableOpacity
                  style={styles.settingsOption}
                  onPress={() => setShowLanguageSettings(!showLanguageSettings)}
                >
                  <View style={[styles.optionIcon, { backgroundColor: '#E3F2FD' }]}>
                    <Icon name="translate" size={22} color={waterBlueColors.primary} />
                  </View>
                  <Text style={styles.settingsOptionText}>{t('language')}</Text>
                  <Icon name={showLanguageSettings ? "chevron-up" : "chevron-down"} size={20} color="#999" />
                </TouchableOpacity>

                {showLanguageSettings && (
                  <View style={styles.inlineSettingsContainer}>
                    {languages.map((lang) => (
                      <TouchableOpacity
                        key={lang.code}
                        style={styles.languageOption}
                        onPress={() => {
                          // Handle language selection
                          Alert.alert(t('language'), `${lang.name} ${t('selected')}`);
                          setShowLanguageSettings(false);
                        }}
                      >
                        <Text style={styles.languageFlag}>{lang.flag}</Text>
                        <Text style={styles.languageName}>{lang.name}</Text>
                        <Icon name="check-circle" size={16} color={waterBlueColors.primary} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Privacy & Security Settings */}
                <TouchableOpacity
                  style={styles.settingsOption}
                  onPress={() => setShowPrivacySettings(!showPrivacySettings)}
                >
                  <View style={[styles.optionIcon, { backgroundColor: '#FFF3E0' }]}>
                    <Icon name="shield-lock" size={22} color="#FF9800" />
                  </View>
                  <Text style={styles.settingsOptionText}>{t('privacySecurity')}</Text>
                  <Icon name={showPrivacySettings ? "chevron-up" : "chevron-down"} size={20} color="#999" />
                </TouchableOpacity>

                {showPrivacySettings && (
                  <View style={styles.inlineSettingsContainer}>
                    <TouchableOpacity style={styles.privacyOption}>
                      <Text style={styles.privacyOptionText}>{t('twoFactorAuthentication')}</Text>
                      <Text style={styles.privacyOptionStatus}>{t('disabled')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.privacyOption}>
                      <Text style={styles.privacyOptionText}>{t('loginNotifications')}</Text>
                      <Text style={styles.privacyOptionStatus}>{t('enabled')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.privacyOption}>
                      <Text style={styles.privacyOptionText}>{t('dataPrivacy')}</Text>
                      <Text style={styles.privacyOptionStatus}>{t('viewSettings')}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Change Password - Navigate to separate screen */}
                <TouchableOpacity
                  style={styles.settingsOption}
                  onPress={() => {
                    setShowUserModal(false);
                    navigation.navigate('ChangePassword');
                  }}
                >
                  <View style={[styles.optionIcon, { backgroundColor: '#E8F5E9' }]}>
                    <Icon name="lock-reset" size={22} color="#4CAF50" />
                  </View>
                  <Text style={styles.settingsOptionText}>{t('changePassword')}</Text>
                  <Icon name="chevron-right" size={20} color="#999" />
                </TouchableOpacity>

                {/* Edit Profile - Navigate to separate screen */}
                <TouchableOpacity
                  style={styles.settingsOption}
                  onPress={() => {
                    setShowUserModal(false);
                    navigation.navigate('Profile');
                  }}
                >
                  <View style={[styles.optionIcon, { backgroundColor: '#FCE4EC' }]}>
                    <Icon name="account-edit" size={22} color="#E91E63" />
                  </View>
                  <Text style={styles.settingsOptionText}>{t('editProfile')}</Text>
                  <Icon name="chevron-right" size={20} color="#999" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Notifications Modal */}
      <Modal
        transparent={true}
        animationType="slide"
        visible={showNotifications}
        onRequestClose={() => setShowNotifications(false)}
      >
        <View style={styles.notificationModalOverlay}>
          <TouchableOpacity
            style={styles.notificationModalBackdrop}
            activeOpacity={1}
            onPress={() => setShowNotifications(false)}
          />
          <View style={styles.notificationModalContainer}>
            <View style={styles.notificationModalHeader}>
              <Text style={styles.notificationModalTitle}>🔔 {t('notifications')}</Text>
              <View style={styles.notificationHeaderActions}>
                {notificationCount > 0 && (
                  <TouchableOpacity
                    style={styles.clearAllButton}
                    onPress={clearAllNotifications}
                  >
                    <Text style={styles.clearAllText}>{t('clearAll')}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowNotifications(false)}
                >
                  <Icon name="close" size={22} color={waterBlueColors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={styles.notificationsList} showsVerticalScrollIndicator={false}>
              {notifications.length === 0 ? (
                <View style={styles.emptyNotifications}>
                  <Icon name="bell-off" size={48} color="#BDC3C7" />
                  <Text style={styles.emptyNotificationsText}>{t('noNotifications')}</Text>
                  <Text style={styles.emptyNotificationsSubtext}>{t('youreAllCaughtUp')}</Text>
                </View>
              ) : (
                notifications.map((notification) => {
                  const display = getNotificationDisplay(notification);
                  return (
                  <TouchableOpacity
                    key={notification.id}
                    style={[
                      styles.notificationItem,
                      !notification.isRead && styles.unreadNotificationItem
                    ]}
                    onPress={() => handleNotificationPress(notification)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.notificationIcon,
                      { backgroundColor: notification.backgroundColor }
                    ]}>
                      <Icon name={notification.icon} size={20} color={notification.color} />
                    </View>
                    <View style={styles.notificationContent}>
                      <View style={styles.notificationHeader}>
                        <View style={styles.notificationTitleContainer}>
                          <Text style={[
                            styles.notificationItemTitle,
                            !notification.isRead && styles.unreadNotificationTitle
                          ]}>
                            {display.title}
                          </Text>
                        </View>
                        {!notification.isRead && (
                          <View style={[styles.unreadIndicator, { backgroundColor: '#FF0000' }]} />
                        )}
                      </View>
                      <Text style={styles.notificationItemMessage}>
                        {display.message}
                      </Text>
                      {display.time && (
                        <Text style={styles.notificationItemTime}>
                          {display.time}
                        </Text>
                      )}
                      {notification.canRespond && (
                        <View style={styles.respondButton}>
                          <Icon name="reply" size={14} color={waterBlueColors.primary} />
                          <Text style={styles.respondButtonText}>{t('tapToRespond')}</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            {/* Notification Categories */}
            <View style={styles.notificationCategories}>
              <Text style={styles.categoriesTitle}>{t('quickFilters')}</Text>
              <View style={styles.categoriesRow}>
                <TouchableOpacity style={[styles.categoryChip, { backgroundColor: '#FFE5E5' }]}>
                  <Icon name="cake" size={16} color="#FF6B6B" />
                  <Text style={[styles.categoryText, { color: '#FF6B6B' }]}>{t('birthdays')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.categoryChip, { backgroundColor: '#E8F8F7' }]}>
                  <Icon name="calendar-clock" size={16} color="#4ECDC4" />
                  <Text style={[styles.categoryText, { color: '#4ECDC4' }]}>{t('meetings')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.categoryChip, { backgroundColor: '#E3F2FD' }]}>
                  <Icon name="information" size={16} color="#45B7D1" />
                  <Text style={[styles.categoryText, { color: '#45B7D1' }]}>{t('admin')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FBFF',
  },
  headerGradient: {
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 10,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    height: 140, // Reduced height since member card is removed

  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    height: 120, // Reduced height
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  menuButtonHeader: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22, // Increased from 22
    fontWeight: '900',
    color: '#FFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  headerMemberName: {
    fontSize: 22, // Increased from 18
    fontWeight: '600',
    color: '#FFF',
    textAlign: 'center',
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  headerSubtitle: {
    fontSize: 20, // Increased from 14
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
    fontWeight: '500',
  },
  headerActionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative', // Add relative positioning for absolute child
  },
  // Enhanced User Display Card - Single Line Layout
  // Enhanced Member Info Card - My Card Style
  memberInfoCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginTop: 5,
    marginHorizontal: 15,
    elevation: 4,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  memberInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  memberInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    elevation: 3,
    shadowColor: '#357ABD',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  memberNameSection: {
    flex: 1,
  },
  memberName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 4,
  },
  memberTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  memberTypeLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  memberInfoRight: {
    marginLeft: 8,
  },
  memberIdCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F4FD',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: waterBlueColors.light,
    gap: 6,
  },
  memberIdInfo: {
    alignItems: 'center',
  },
  memberIdLabel: {
    fontSize: 9,
    color: '#666',
    fontWeight: '500',
    marginBottom: 2,
  },
  memberIdValue: {
    fontSize: 14,
    color: waterBlueColors.primary,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 20,
  },
  // Loading styles
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#FFF',
    borderRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 14,
    color: '#357ABD',
    fontWeight: '600',
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start', // Changed from 'center' to 'flex-start'
    marginBottom: 15,
    position: 'relative',
    flexWrap: 'wrap', // Allow wrapping if needed
  },
  sectionTitle: {
    fontSize: 22, // Increased from 20
    fontWeight: '800',
    color: '#2C3E50',
    textAlign: 'left',
    flex: 1,
    flexWrap: 'wrap',
  },
  // Tamil text specific styling
  tamilSectionTitle: {
    fontSize: 20, // Slightly smaller for Tamil
    lineHeight: 28, // Better line height for Tamil
    letterSpacing: 0, // Remove letter spacing for Tamil
  },
  // Period Selector Styles
  periodSelectorContainer: {
    position: 'relative',
    marginTop: 2, // Add small top margin for better alignment
  },
  periodSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: waterBlueColors.light,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    minHeight: 36, // Ensure consistent height
  },
  periodSelectorText: {
    fontSize: 13,
    color: waterBlueColors.primary,
    fontWeight: '600',
    marginHorizontal: 8,
    textAlign: 'center',
    minWidth: 60, // Ensure consistent width
  },
  // Tamil period selector text
  tamilPeriodSelectorText: {
    fontSize: 12, // Slightly smaller for Tamil
    lineHeight: 18, // Better line height
    letterSpacing: 0, // Remove letter spacing
  },
  periodDropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginTop: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    zIndex: 1000,
    minWidth: 150,
  },
  periodDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  periodDropdownItemSelected: {
    backgroundColor: '#F0F9FF',
  },
  periodDropdownText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    textAlign: 'left',
  },
  periodDropdownTextSelected: {
    color: waterBlueColors.primary,
    fontWeight: '600',
  },
  // Tamil dropdown text
  tamilPeriodDropdownText: {
    fontSize: 13, // Slightly smaller for Tamil
    lineHeight: 20, // Better line height
    letterSpacing: 0, // Remove letter spacing
  },
  periodIndicator: {
    backgroundColor: '#F0F9FF',
    padding: 10,
    borderRadius: 10,
    marginBottom: 15,
    borderLeftWidth: 3,
    borderLeftColor: waterBlueColors.primary,
  },
  periodIndicatorText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'left',
  },
  periodIndicatorValue: {
    color: waterBlueColors.primary,
    fontWeight: '600',
  },
  // Tamil period indicator text
  tamilPeriodIndicatorText: {
    fontSize: 12, // Slightly smaller for Tamil
    lineHeight: 18, // Better line height
    letterSpacing: 0, // Remove letter spacing
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCardWrapper: {
    width: '48%',
    marginBottom: 12,
  },
  statCard: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    position: 'relative',
  },
  statCardGradient: {
    padding: 12,
    position: 'relative',
  },
  waterEffect: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#87CEEB',
    opacity: 0.5,
  },
  statContent: {
    alignItems: 'center',
    position: 'relative',
    zIndex: 2,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    elevation: 3,
    shadowColor: '#357ABD',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E5A96',
    marginBottom: 3,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  statLabel: {
    fontSize: 14, // Increased from 11
    color: '#357ABD',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18, // Better line height
  },
  // Tamil stat label
  tamilStatLabel: {
    fontSize: 12, // Slightly smaller for Tamil
    lineHeight: 16, // Better line height for Tamil
    letterSpacing: 0, // Remove letter spacing
    paddingHorizontal: 2, // Add small padding
  },
  revenueSection: {
    marginBottom: 20,
  },
  revenueCard: {
    borderRadius: 16,
    padding: 20,
    elevation: 6,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  revenueContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  revenueIcon: {
    marginRight: 15,
  },
  revenueInfo: {
    flex: 1,
  },
  revenueLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 6,
  },
  revenueValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFF',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  revenuePeriod: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontStyle: 'italic',
    marginTop: 4,
  },
  trendIcon: {
    marginLeft: 10,
  },
  menuContainer: {
    borderRadius: 16,
    padding: 15,
    elevation: 4,
    shadowColor: '#87CEEB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  menuButtonWrapper: {
    width: '48%',
    marginBottom: 8,
  },
  menuButton: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  menuButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  menuIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    position: 'relative',
    elevation: 2,
    shadowColor: '#87CEEB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  menuBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#F44336',
    borderRadius: 8,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  menuBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
  },
  menuLabel: {
    flex: 1,
    fontSize: 13,
    color: '#2C3E50',
    fontWeight: '600',
  },
  infoSection: {
    marginBottom: 20,
  },
  infoCard: {
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#87CEEB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: '#E0F7FA',
  },
  infoIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    elevation: 3,
    shadowColor: '#357ABD',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E5A96',
    marginBottom: 8,
    textAlign: 'left',
  },
  infoText: {
    fontSize: 13,
    color: '#357ABD',
    lineHeight: 20,
    textAlign: 'left',
  },
  infoPeriod: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 6,
    textAlign: 'left',
  },
  // Tamil info text
  tamilInfoTitle: {
    fontSize: 15, // Slightly smaller for Tamil
    lineHeight: 22, // Better line height
    letterSpacing: 0, // Remove letter spacing
  },
  tamilInfoText: {
    fontSize: 12, // Slightly smaller for Tamil
    lineHeight: 18, // Better line height
    letterSpacing: 0, // Remove letter spacing
  },
  tamilInfoPeriod: {
    fontSize: 11, // Slightly smaller for Tamil
    lineHeight: 16, // Better line height
    letterSpacing: 0, // Remove letter spacing
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '80%',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  closeModalButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  modalContent: {
    padding: 24,
  },
  modalProfileSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 6,
    shadowColor: '#357ABD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalProfileInfo: {
    alignItems: 'center',
  },
  modalUserName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#2C3E50',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalMemberIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F4FD',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  modalMemberId: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4A90E2',
    marginLeft: 6,
  },
  modalUserRole: {
    fontSize: 15,
    color: '#4A90E2',
    fontWeight: '600',
  },
  // Enhanced Settings Options
  settingsOptions: {
    marginTop: 12,
  },
  settingsOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 4,
    backgroundColor: '#FAFBFC',
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  settingsOptionText: {
    flex: 1,
    fontSize: 16,
    color: '#2C3E50',
    fontWeight: '600',
  },
  // Compact Info Grid
  infoGridCompact: {
    marginBottom: 20,
  },
  infoGridItemCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FBFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0F7FA',
  },
  infoGridTextCompact: {
    flex: 1,
    marginLeft: 12,
  },
  infoGridLabelCompact: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  infoGridValueCompact: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2C3E50',
  },
  // Info Grid
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  infoGridItem: {
    width: '48%',
    backgroundColor: '#F8FBFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0F7FA',
  },
  infoGridLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 6,
    marginBottom: 4,
    textAlign: 'center',
  },
  infoGridValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    textAlign: 'center',
  },
  statsSection: {
    marginBottom: 25,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E5A96',
    marginBottom: 15,
  },
  statsGridModal: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItemModal: {
    width: '48%',
    backgroundColor: '#F8FBFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0F7FA',
  },
  statNumberModal: {
    fontSize: 24,
    fontWeight: '800',
    color: '#4A90E2',
    marginBottom: 4,
  },
  statLabelModal: {
    fontSize: 12,
    color: '#357ABD',
    fontWeight: '600',
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  modalActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90E2',
    paddingVertical: 14,
    borderRadius: 12,
    marginHorizontal: 5,
    elevation: 3,
    shadowColor: '#357ABD',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  modalActionText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Notification styles
  notificationDot: {
    position: 'absolute',
    top: -4, // Better alignment with bell icon
    right: -4, // Better alignment with bell icon
    backgroundColor: '#FF6B6B',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    elevation: 4, // Increased elevation for better visibility
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    zIndex: 10, // Ensure it appears above other elements
  },
  notificationDotText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 10, // Better line height for number alignment
    includeFontPadding: false, // Remove extra padding on Android
  },
  notificationCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 8,
    marginBottom: 10,
    elevation: 3,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  notificationCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  notificationCardTitle: {
    fontSize: 16, // Increased from 12
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'left',
  },
  // Tamil notification title
  tamilNotificationCardTitle: {
    fontSize: 15, // Slightly smaller for Tamil
    lineHeight: 22, // Better line height
    letterSpacing: 0, // Remove letter spacing
  },
  viewAllNotifications: {
    fontSize: 11,
    color: '#4A90E2',
    fontWeight: '600',
  },
  notificationScrollView: {
    marginHorizontal: -10,
  },
  notificationScrollContent: {
    paddingHorizontal: 10,
  },
  notificationSwipeCard: {
    width: 170,
    backgroundColor: '#F8FBFF',
    borderRadius: 8,
    padding: 8, // Increased padding for better spacing
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#E8F1FF',
    position: 'relative',
    minHeight: 100, // Ensure consistent height
  },
  unreadNotificationCard: {
    backgroundColor: '#F0F7FF',
    borderColor: '#4A90E2',
    borderWidth: 1.5,
    paddingRight: 16, // Increased padding on right for red dot space
  },
  notificationSwipeIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  notificationSwipeContent: {
    flex: 1,
    paddingRight: 8, // Increased padding to avoid overlap with red dot
  },
  notificationSwipeTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
    lineHeight: 16,
    textAlign: 'left',
  },
  notificationSwipeMessage: {
    fontSize: 11,
    color: '#5D6D7E',
    lineHeight: 14,
    marginBottom: 6,
    textAlign: 'left',
  },
  notificationSwipeTime: {
    fontSize: 10,
    color: '#95A5A6',
    fontWeight: '500',
    textAlign: 'left',
  },
  // Tamil notification text
  tamilNotificationSwipeTitle: {
    fontSize: 12, // Slightly smaller for Tamil
    lineHeight: 15, // Better line height
    letterSpacing: 0, // Remove letter spacing
    paddingRight: 2, // Extra padding to avoid red dot overlap
  },
  tamilNotificationSwipeMessage: {
    fontSize: 10, // Slightly smaller for Tamil
    lineHeight: 13, // Better line height
    letterSpacing: 0, // Remove letter spacing
    paddingRight: 2, // Extra padding to avoid red dot overlap
  },
  swipeUnreadIndicator: {
    position: 'absolute',
    top: 6, // Better positioning from top
    right: 6, // Better positioning from right
    width: 8, // Larger size for better visibility
    height: 8,
    borderRadius: 5,
    backgroundColor: '#FF4444', // Brighter red color
  },
  respondBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  respondBadgeText: {
    fontSize: 9,
    color: '#4A90E2',
    fontWeight: '600',
  },
  moreNotificationsCard: {
    width: 120,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#4A90E2',
    borderStyle: 'dashed',
  },
  moreNotificationsText: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '600',
    marginTop: 4,
  },
  notificationModalOverlay: {
    flex: 1,
  },
  notificationModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  notificationModalContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '70%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  notificationModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  notificationHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearAllButton: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 10,
  },
  clearAllText: {
    color: '#4A90E2',
    fontSize: 12,
    fontWeight: '600',
  },
  notificationModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3E50',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationsList: {
    maxHeight: 400,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    borderRadius: 8,
    marginBottom: 4,
  },
  unreadNotificationItem: {
    backgroundColor: '#F8FBFF',
    borderLeftWidth: 3,
    borderLeftColor: '#4A90E2',
  },
  notificationIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    minHeight: 20, // Ensure minimum height for red dot
  },
  unreadIndicator: {
    width: 8, // Even larger size for maximum visibility
    height: 8,
    borderRadius: 8,
    backgroundColor: '#FF0000', // Bright red color
  },
  notificationTitleContainer: {
    flex: 1,
    marginRight: 8,
  },
  notificationItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  unreadNotificationTitle: {
    fontWeight: '700',
    color: '#2C3E50',
  },
  notificationItemMessage: {
    fontSize: 13,
    color: '#5D6D7E',
    lineHeight: 18,
    marginBottom: 4,
  },
  notificationItemTime: {
    fontSize: 12,
    color: '#95A5A6',
  },
  respondButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  respondButtonText: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyNotifications: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyNotificationsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7F8C8D',
    marginTop: 12,
  },
  emptyNotificationsSubtext: {
    fontSize: 12,
    color: '#BDC3C7',
    marginTop: 4,
  },
  notificationCategories: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    marginTop: 8,
  },
  categoriesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  // Inline Settings Styles
  inlineSettingsContainer: {
    backgroundColor: '#F8F9FA',
    marginLeft: 64,
    marginRight: 6,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: waterBlueColors.primary,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E9EA',
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: '#FFF',
  },
  languageFlag: {
    fontSize: 20,
    marginRight: 14,
  },
  languageName: {
    flex: 1,
    fontSize: 15,
    color: '#2C3E50',
    fontWeight: '600',
  },
  privacyOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E9EA',
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: '#FFF',
  },
  privacyOptionText: {
    fontSize: 15,
    color: '#2C3E50',
    fontWeight: '600',
  },
  privacyOptionStatus: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    fontWeight: '500',
  },
  birthdayWishCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  birthdayWishHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  birthdayWishContent: {
    flex: 1,
    marginLeft: 12,
  },
  birthdayWishTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B6B', // Red color to match birthday notifications
    marginBottom: 4,
  },
  birthdayWishMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  birthdayWishTime: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  birthdayWishLoading: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
  },
  thirukkuralQuote: {
  fontSize: 12,
  color: 'rgba(255, 255, 255, 0.95)',
  textAlign: 'center',
  marginTop: 4,
  fontStyle: 'italic',
  fontWeight: '500',
  lineHeight: 20,
  paddingHorizontal: 20,
},
thirukkuralMeaning: {
  fontSize: 11,
  color: 'rgba(255, 255, 255, 0.80)',
  textAlign: 'center',
  marginTop: 4,
  lineHeight: 18,
  paddingHorizontal: 20,
},
headerTopRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 10,
  paddingHorizontal: 4,
},
headerTitleContainer: {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  marginHorizontal: 8,
},
headerIconButton: {
  width: 44,
  height: 44,
  borderRadius: 22,
  backgroundColor: 'rgba(255, 255, 255, 0.15)',
  justifyContent: 'center',
  alignItems: 'center',
},
headerRightContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 4,
},
welcomeText: {
  fontSize: 22, // Base size — will be adjusted per language
  fontWeight: '900',
  color: '#FFF',
  textAlign: 'center',
  textShadowColor: 'rgba(0, 0, 0, 0.3)',
  textShadowOffset: { width: 2, height: 2 },
  textShadowRadius: 6,
  fontFamily: 'serif', // Keep serif for English; Tamil may fallback gracefully
},
tamilText: {
  fontSize: 18, // Larger than English to accommodate wider glyphs
  letterSpacing: 0, // Critical: Tamil doesn’t need letter spacing
  lineHeight: 26, // Improve vertical spacing
},
logoTitleContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
},
logoContainer: {
  width: 42,
  height: 42,
  borderRadius: 26,
  backgroundColor: '#FFFFFF',
  justifyContent: 'center',
  alignItems: 'center',
  marginRight: 12,
  elevation: 4,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius: 4,
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.8)',
},
headerLogo: {
  width: 42,
  height: 42,
  // Removed tintColor to show original blue logo colors
},
// Quick Access Cards
quickAccessGrid: {
  flexDirection: 'row',
  gap: 12,
  marginTop: 8,
  marginBottom: 20,
},
quickAccessCard: {
  flex: 1,
  borderRadius: 16,
  overflow: 'hidden',
  elevation: 4,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 8,
  minHeight: 110,
},
quickAccessGradient: {
  flex: 1,
  padding: 16,
  minHeight: 110,
  justifyContent: 'flex-start',
},
quickAccessIconContainer: {
  width: 48,
  height: 48,
  borderRadius: 24,
  backgroundColor: 'rgba(255, 255, 255, 0.2)',
  justifyContent: 'center',
  alignItems: 'center',
  marginBottom: 8,
},
quickAccessTitle: {
  fontSize: 15,
  fontWeight: '700',
  color: '#FFF',
  marginBottom: 4,
  marginTop: 4,
},
quickAccessSubtitle: {
  fontSize: 12,
  color: 'rgba(255, 255, 255, 0.95)',
  fontWeight: '500',
  marginBottom: 4,
  lineHeight: 16,
  numberOfLines: 2,
},
quickAccessArrow: {
  position: 'absolute',
  bottom: 12,
  right: 12,
  width: 28,
  height: 28,
  borderRadius: 14,
  backgroundColor: 'rgba(255, 255, 255, 0.2)',
  justifyContent: 'center',
  alignItems: 'center',
},
});

export default UserDashboard;