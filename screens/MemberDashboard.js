import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import ApiService from '../service/api';
import MemberIdService from '../service/MemberIdService';
import CompanyNameService from '../service/CompanyNameService';
import { useLanguage } from '../service/LanguageContext';
import API_BASE_URL from '../apiConfig';

// Birthday Wishes Section Component for MemberDashboard
const BirthdayWishesSection = ({ memberId }) => {
  const { t } = useLanguage();
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
        delay={650}
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
      delay={650}
      style={styles.sectionContainer}
    >
      <LinearGradient
        colors={['#FFE5E5', '#FFF0F0']}
        style={styles.birthdayWishCard}
      >
        <View style={styles.birthdayWishHeader}>
          <Icon name="cake-variant" size={40} color="#FF6B6B" />
          <View style={styles.birthdayWishContent}>
            <Text style={styles.birthdayWishTitle}>🎉 {t('birthdayWishReceived')}</Text>
            <Text style={styles.birthdayWishMessage}>
              {birthdayWish.senderName || t('member')} {t('sentYouBirthdayWishes')}
            </Text>
            <Text style={styles.birthdayWishTime}>
              {new Date(birthdayWish.sentDate).toLocaleTimeString([], {
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

// Define waterBlueColors outside the component so it's accessible
const waterBlueColors = {
  primary: '#4A90E2',
  light: '#87CEEB',
  lighter: '#B3E0F2',
  lightest: '#E0F7FA',
  dark: '#357ABD',
  darker: '#1E5A96',
};

const MemberDashboard = () => {
  const navigation = useNavigation();
  const { t, language } = useLanguage();
  const [greeting, setGreeting] = useState('');
  const [quote, setQuote] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentMemberId, setCurrentMemberId] = useState(null);
  const [selectedNotificationFilter, setSelectedNotificationFilter] = useState('all');
  const [memberName, setMemberName] = useState('');
  const [companyName, setCompanyName] = useState('Alaigal');

  // For swipeable sections
  const [activeQuickActionIndex, setActiveQuickActionIndex] = useState(0);

  const quickActionsScrollRef = useRef(null);

  const [notifications, setNotifications] = useState([]);
  const [pendingVisitorRequests, setPendingVisitorRequests] = useState([]);
  const [allPendingVisitorRequests, setAllPendingVisitorRequests] = useState([]);

  // Handle logout
  const handleLogout = async () => {
    Alert.alert(
      t('confirmLogout'),
      t('areYouSureLogout'),
      [
        {
          text: t('cancel'),
          style: 'cancel',
        },
        {
          text: t('logout'),
          style: 'destructive',
          onPress: async () => {
            try {
              // clear member id cache
              await MemberIdService.clearMemberId();

              await AsyncStorage.removeItem('jwt_token');
              await AsyncStorage.removeItem('token');
              await AsyncStorage.removeItem('authToken');
              await AsyncStorage.removeItem('username');
              await AsyncStorage.removeItem('password');

              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('Error during logout:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
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

    const unreadCount = notifications.filter(n => !n.isRead && n.id !== notificationId).length;
    setNotificationCount(unreadCount);
  };

  // Clear all notifications
  const clearAllNotifications = () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, isRead: true })));
    setNotificationCount(0);
  };

  // Returns translated title/message/time for a notification at render time
  const getNotificationDisplay = (notification) => {
    if ((notification.type === 'meeting' || notification.messageType === 'Meeting') && notification.rawDate) {
      const [y, m, d] = notification.rawDate.split('-');
      const dt = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      const displayDate = language === 'ta'
        ? dt.toLocaleDateString('ta-IN', { month: 'short', day: 'numeric', year: 'numeric' })
        : dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const titleText = notification.rawTitle || t('meetingNotificationTitle');
      const parts = [displayDate, notification.rawTime, notification.rawPlace].filter(Boolean);
      return { title: `📅 ${titleText}`, message: parts.join(' • '), time: displayDate };
    }
    return { title: notification.title, message: notification.message, time: notification.time };
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
        handleWishResponse(notification);
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

  // Handle meeting response - Updated to use the birthday-wish API with status parameter
  const handleMeetingResponse = async (notification) => {
    try {
      const memberId = await MemberIdService.getCurrentUserMemberId();

      if (!memberId) {
        Alert.alert('Error', 'Could not find your member ID. Please try again.');
        return;
      }

      Alert.alert(
        t('meetingResponse'),
        t('respondToMeetingNotification'),
        [
          { text: t('cancel'), style: 'cancel' },
          {
            text: t('attend'),
            onPress: async () => {
              try {
                setLoading(true);

                console.log('Sending attendance response for member:', memberId, 'status: 1 (Attend)');

                // Call the birthday-wish API with status=1 for "Attend"
                // This API handles both birthday wishes AND meeting responses
                const response = await fetch(
                  `${API_BASE_URL}/api/MessageNotifications/birthday-wish/${memberId}?status=1`,
                  {
                    method: 'GET',
                    headers: {
                      'Content-Type': 'application/json',
                      'Accept': 'application/json'
                    }
                  }
                );

                console.log('Meeting attendance API response status:', response.status);

                if (response.ok) {
                  const result = await response.json();
                  console.log('Meeting attendance response successful:', result);

                  Alert.alert(
                    t('success'),
                    `${t('youHaveConfirmedAttendance')} ✅\n\n${t('attendanceMarkedInSystem')}`,
                    [{ text: t('ok') }]
                  );

                  // Mark notification as read
                  markNotificationAsRead(notification.id);

                  // Refresh notifications to update UI
                  await loadNotifications();

                } else if (response.status === 404) {
                  // For meeting responses, 404 is expected (no birthday wish exists)
                  // But the status parameter still creates the meeting status and attendance
                  console.log('No birthday wish found, but meeting status recorded via status=1');

                  Alert.alert(
                    t('success'),
                    `${t('yourResponseRecorded')} ✅\n\n${t('attendanceMarkedInSystem')}`,
                    [{ text: t('ok') }]
                  );

                  markNotificationAsRead(notification.id);
                  await loadNotifications();
                } else {
                  const errorText = await response.text();
                  console.error('Meeting attendance API error:', errorText);
                  Alert.alert('Success', 'Your attendance intention has been noted!');
                  markNotificationAsRead(notification.id);
                }
              } catch (error) {
                console.error('Error confirming meeting attendance:', error);
                Alert.alert('Success', 'Your attendance has been recorded!');
                markNotificationAsRead(notification.id);
              } finally {
                setLoading(false);
              }
            },
          },
          {
            text: 'Not Attend',
            style: 'destructive',
            onPress: async () => {
              try {
                setLoading(true);

                console.log('Sending not-attend response for member:', memberId, 'status: 2 (Not Attend)');

                // Call the birthday-wish API with status=2 for "Not Attend"
                const response = await fetch(
                  `${API_BASE_URL}/api/MessageNotifications/birthday-wish/${memberId}?status=2`,
                  {
                    method: 'GET',
                    headers: {
                      'Content-Type': 'application/json',
                      'Accept': 'application/json'
                    }
                  }
                );

                console.log('Not-attend API response status:', response.status);

                if (response.ok) {
                  const result = await response.json();
                  console.log('Not-attend response successful:', result);

                  Alert.alert(
                    t('responseRecorded'),
                    `${t('youIndicatedNotAttend')} ❌\n\n${t('responseRecordedInSystem')}`,
                    [{ text: t('ok') }]
                  );

                  markNotificationAsRead(notification.id);
                  await loadNotifications();

                } else if (response.status === 404) {
                  // For meeting responses, 404 is expected (no birthday wish exists)
                  // But the status parameter still creates the meeting status
                  console.log('No birthday wish found, but meeting status recorded via status=2');

                  Alert.alert(
                    t('responseRecorded'),
                    `${t('yourResponseRecorded')} ❌\n\n${t('responseRecordedInSystem')}`,
                    [{ text: t('ok') }]
                  );

                  markNotificationAsRead(notification.id);
                  await loadNotifications();
                } else {
                  const errorText = await response.text();
                  console.error('Not-attend API error:', errorText);
                  Alert.alert('Success', 'Your response has been recorded!');
                  markNotificationAsRead(notification.id);
                }
              } catch (error) {
                console.error('Error recording not-attend response:', error);
                Alert.alert('Success', 'Your response has been recorded!');
                markNotificationAsRead(notification.id);
              } finally {
                setLoading(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error in handleMeetingResponse:', error);
      Alert.alert('Error', 'Failed to process meeting response.');
    }
  };

  // Handle payment response — navigate directly to PaymentDetails without memberId lookup
  const handlePaymentResponse = (notification) => {
    Alert.alert(
      t('paymentNotification'),
      t('viewPaymentDetails'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('viewDetails'),
          onPress: () => {
            markNotificationAsRead(notification.id);
            try {
              navigation.navigate('PaymentDetails', { notification, paymentId: notification.paymentId || null });
            } catch (err) {
              console.error('Error navigating to PaymentDetails:', err);
              navigation.navigate('PaymentDetails', { notification, paymentId: notification.paymentId || null });
            }
            // Close notifications modal
            setShowNotifications(false);
          },
        },
      ]
    );
  };

  // Handle wish response for Birthday and NewMember notifications
  const handleWishResponse = async (notification) => {
    try {
      // Get sender's member ID (current user)
      const senderMemberId = await MemberIdService.getCurrentUserMemberId();

      if (!senderMemberId) {
        Alert.alert('Error', 'Could not find your member ID. Please try again.');
        return;
      }

      const isBirthday = notification.messageType === 'Birthday';
      const wishType = isBirthday ? t('birthdayWishes') : t('welcomeWishes');
      let recipientName = notification.recipientName || t('member');

      console.log('Processing wish response for:', recipientName, 'Type:', wishType);

      // Skip if recipient name is just "member" (generic placeholder)
      if (recipientName === 'member') {
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
            if (match && match[1] && match[1].trim() !== 'member') {
              recipientName = match[1].trim();
              console.log('Extracted recipient name from notification message:', recipientName);
              break;
            }
          }
        }

        // If still "member", show error
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

      if (!recipientMemberId && recipientName && recipientName !== 'member') {
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
        Alert.alert('Error', 'Could not find the member. Please try again.');
        return;
      }

      Alert.alert(
        `Send ${wishType}`,
        `Send ${wishType.toLowerCase()} to ${recipientName}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Send',
            onPress: async () => {
              try {
                setLoading(true);

                // For birthday wishes, use the POST endpoint to send the wish
                // For meeting responses, we use the GET endpoint with status parameter
                if (isBirthday) {
                  // Prepare the request data according to SendBirthdayWishDto
                  const requestData = {
                    MemberId: recipientMemberId,
                    CreatedBy: senderMemberId,
                    CustomMessage: null // Optional: You can add custom message input if needed
                  };

                  // Log the request for debugging
                  console.log(`Sending ${wishType}:`, requestData);

                  // Use birthday wish POST endpoint for sending wishes
                  const endpoint = '/api/MessageNotifications/birthday/wish';

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

                    // Handle specific error cases
                    if (response.status === 404) {
                      Alert.alert('Error', `Member not found. Please check if ${recipientName} is a valid member.`);
                    } else {
                      let errorMessage = `Failed to send ${wishType.toLowerCase()}. Please try again.`;

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
                    }
                    setLoading(false);
                    return;
                  }

                  const result = await response.json();
                  console.log(`${wishType} sent successfully:`, result);
                } else {
                  // For welcome wishes, we might need a different endpoint
                  // For now, treat it similar to birthday wishes
                  console.log('Welcome wish functionality not yet implemented');
                  Alert.alert('Info', 'Welcome wish functionality will be available soon.');
                  setLoading(false);
                  return;
                }

                // Mark notification as read
                markNotificationAsRead(notification.id);

                Alert.alert(
                  'Success',
                  `${wishType} sent to ${recipientName}! 🎉`,
                  [{ text: 'OK' }]
                );

                // Refresh notifications to update UI
                await loadNotifications();

              } catch (error) {
                console.error(`Error sending ${wishType}:`, error);
                console.error('Error details:', {
                  message: error.message,
                  stack: error.stack,
                  notification: notification
                });
                Alert.alert('Error', `An error occurred: ${error.message || 'Unknown error'}`);
              } finally {
                setLoading(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error in handleWishResponse:', error);
      Alert.alert('Error', 'Failed to process wish request.');
    }
  };

  // Set greeting based on time
  useEffect(() => {
    const updateGreeting = () => {
      const currentHour = new Date().getHours();
      let newGreeting = '';
      let newQuote = '';

      if (currentHour >= 1 && currentHour < 12) {
        newGreeting = `🌅 ${t('goodMorning')}`;
        newQuote = t('startDayPositive');
      } else if (currentHour >= 12 && currentHour < 16) {
        newGreeting = `☀️ ${t('goodAfternoon')}`;
        newQuote = t('keepMomentum');
      } else if (currentHour >= 16 && currentHour < 20) {
        newGreeting = ` 🌙 ${t('goodEvening')}`;
        newQuote = t('reflectAchievements');
      } else if (currentHour >= 20 || currentHour < 1) {
        newGreeting = `🌙 ${t('goodNight')}`;
        newQuote = t('restWellRecharge');
      }

      console.log('Setting greeting to:', newGreeting); // Debug log
      setGreeting(newGreeting);
      setQuote(newQuote);
    };

    // Update greeting immediately
    updateGreeting();

    // Update greeting every minute to reflect time changes
    const interval = setInterval(updateGreeting, 60000);

    loadDashboardData();
    loadCurrentMemberId();

    return () => clearInterval(interval);
  }, [t]);

  const loadCurrentMemberId = async () => {
    const memberId = await MemberIdService.getCurrentUserMemberId();
    setCurrentMemberId(memberId);
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      console.log('Loading dashboard data...');

      // Load notifications
      await loadNotifications();

      // Load member name
      await loadMemberName();

      // Load company name
      const name = await CompanyNameService.getCompanyName();
      setCompanyName(name);

      // Load pending visitor member requests
      await loadPendingVisitorRequests();
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert(
        'Info',
        'Failed to load dashboard data. Please check your network connection.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadNotifications = async () => {
    try {
      const memberId = await MemberIdService.getCurrentUserMemberId();
      if (!memberId) {
        console.log('MemberDashboard - No memberId for notifications');
        setNotifications([]);
        setNotificationCount(0);
        return;
      }

      console.log('MemberDashboard - Loading notifications for memberId:', memberId);

      let messageNotifications = null;
      let birthdayReminders = null;

      try {
        messageNotifications = await ApiService.getMessageNotificationReport(null, 'daily', memberId);
        console.log('MemberDashboard - Message notifications response:', messageNotifications);
        if (messageNotifications && messageNotifications.data) {
          messageNotifications = messageNotifications.data;
        } else if (!Array.isArray(messageNotifications)) {
          messageNotifications = [];
        }
        console.log('MemberDashboard - Processed message notifications:', messageNotifications);
      } catch (error) {
        console.error('MemberDashboard - Error loading message notifications:', error);
        messageNotifications = [];
      }

      // Load birthday reminders
      try {
        birthdayReminders = await ApiService.getBirthdayReminders(memberId);
        console.log('MemberDashboard - Birthday reminders response:', birthdayReminders);
        if (birthdayReminders && birthdayReminders.data) {
          birthdayReminders = birthdayReminders.data;
        } else if (!Array.isArray(birthdayReminders)) {
          birthdayReminders = [];
        }
      } catch (error) {
        console.log('MemberDashboard - No birthday reminders found');
        birthdayReminders = [];
      }

      const newNotifications = [];

      // Add birthday reminders as notifications with tap-to-respond
      if (birthdayReminders && birthdayReminders.length > 0) {
        birthdayReminders.forEach((reminder) => {
          newNotifications.push({
            id: `birthday-reminder-${reminder.id || Date.now()}`,
            type: 'birthday',
            messageType: 'Birthday',
            title: `🎂 ${t('birthdayReminderTitle')}`,
            message: `${t('todayIs')} ${reminder.memberName || t('member')}${t('birthdayExclaim')} ${t('sendThemWishes')}`,
            time: t('today'),
            icon: 'cake-variant',
            color: '#9C27B0',
            backgroundColor: '#F3E5F5',
            isRead: false,
            canRespond: true,
            attachmentUrl: null,
            eventDate: reminder.birthDate,
            createdBy: null,
            recipientName: reminder.memberName,
            recipientMemberId: reminder.memberId,
          });
        });
      }

      // ✅ Only process message notifications (no reminders!)
      if (messageNotifications && messageNotifications.length > 0) {
        messageNotifications.forEach((msg) => {
          const notificationTypeMap = {
            'Payment': { icon: 'credit-card-check', color: '#FFA726', backgroundColor: '#FFF3E0' },
            'Birthday': { icon: 'cake-variant', color: '#9C27B0', backgroundColor: '#F3E5F5' },
            'Event': { icon: 'calendar-star', color: '#FF9800', backgroundColor: '#FFF3E0' },
            'Meeting': { icon: 'calendar-clock', color: '#4ECDC4', backgroundColor: '#E8F8F7' },
            'Welcome': { icon: 'hand-wave', color: '#9C27B0', backgroundColor: '#F3E5F5' },
            'NewMember': { icon: 'account-plus', color: '#2196F3', backgroundColor: '#E3F2FD' }
          };
          const typeConfig = notificationTypeMap[msg.messageType] ||
            { icon: 'information', color: '#45B7D1', backgroundColor: '#E3F2FD' };

          // Use t()-based default message when content is missing
          let notificationMessage = msg.content || t('newNotificationReceived');
          if ((msg.messageType === 'Event' || msg.messageType === 'Meeting') && msg.date) {
            const eventDate = new Date(msg.date);
            const formattedDate = eventDate.toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric'
            });
            notificationMessage = `${notificationMessage}\n📅 ${formattedDate}`;
          }

          // Translated title using t() keys
          const getTitle = (messageType, subject) => {
            if (messageType === 'Birthday') return `🎂 ${t('birthdayReminderTitle')}`;
            if (messageType === 'BirthdayWishReceived') return `🎉 ${t('birthdayWishReceived')}`;
            if (messageType === 'Payment') return t('paymentNotificationTitle');
            if (messageType === 'Meeting') return t('meetingNotificationTitle');
            if (messageType === 'Event') return t('eventNotificationTitle');
            if (messageType === 'NewMember') return t('newMemberNotificationTitle');
            if (subject && subject.trim()) return subject;
            return `${messageType} ${t('notificationSuffix')}`;
          };

          // Extract member IDs for Birthday and NewMember notifications
          let recipientMemberId = null;
          let recipientName = null;

          if (msg.messageType === 'Birthday' || msg.messageType === 'NewMember') {
            if (msg.messageType === 'Birthday' && msg.content) {
              const match = msg.content.match(/Today is (.+)'s birthday/);
              if (match) recipientName = match[1];
            }
            if (msg.messageType === 'NewMember' && msg.content) {
              const match = msg.content.match(/New member joined: (.+)/);
              if (match) recipientName = match[1];
            }
          }

          newNotifications.push({
            id: `message-${msg.id}`,
            type: 'message',
            messageType: msg.messageType,
            title: getTitle(msg.messageType, msg.subject),
            message: notificationMessage,
            time: msg.messageType === 'Meeting' && msg.date
              ? new Date(msg.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
              : (msg.createdDate ? new Date(msg.createdDate).toLocaleDateString() : t('recent')),
            icon: typeConfig.icon,
            color: typeConfig.color,
            backgroundColor: typeConfig.backgroundColor,
            isRead: false,
            canRespond: true,
            eventDate: msg.date,
            createdBy: msg.createdBy,
            attachmentUrl: msg.attachmentUrl,
            recipientMemberId: recipientMemberId,
            recipientName: recipientName || msg.content,
          });
        });
      }

      setNotifications(newNotifications);
      setNotificationCount(newNotifications.filter(n => !n.isRead).length);
      console.log('MemberDashboard - Loaded notifications:', newNotifications.length);
    } catch (error) {
      console.error('MemberDashboard - Error loading notifications:', error);
      setNotifications([]);
      setNotificationCount(0);
    }
  };

  // Load member name
  const loadMemberName = async () => {
    try {
      const fullName = await AsyncStorage.getItem('fullName');
      const memberId = await MemberIdService.getCurrentUserMemberId();

      console.log('Loading member name - fullName:', fullName, 'memberId:', memberId); // Debug log

      if (fullName) {
        console.log('Setting member name from AsyncStorage:', fullName);
        setMemberName(fullName);
      } else if (memberId) {
        // Try to get member details from API
        try {
          const response = await fetch(`${API_BASE_URL}/api/Members/${memberId}`);
          if (response.ok) {
            const memberDetails = await response.json();
            const name = memberDetails?.name || t('member');
            console.log('Setting member name from API:', name);
            setMemberName(name);
          }
        } catch (error) {
          console.error('Error fetching member details:', error);
          setMemberName('Admin User');
        }
      } else {
        console.log('No fullName or memberId found, using default');
        setMemberName('Admin User');
      }
    } catch (error) {
      console.error('Error loading member name:', error);
      setMemberName('Admin User');
    }
  };

  const loadPendingVisitorRequests = async () => {
    try {
      const memberId = await MemberIdService.getCurrentUserMemberId();
      if (!memberId) return;
      // Member's own submitted requests
      const response = await fetch(`${API_BASE_URL}/api/Inventory/visitors/pending-member-requests/${memberId}`);
      if (response.ok) {
        const data = await response.json();
        setPendingVisitorRequests(Array.isArray(data) ? data : []);
      }
      // All pending requests (admin view)
      const allRes = await fetch(`${API_BASE_URL}/api/Inventory/visitors/all-pending-member-requests`);
      if (allRes.ok) {
        const allData = await allRes.json();
        setAllPendingVisitorRequests(Array.isArray(allData) ? allData : []);
      }
    } catch (error) {
      console.error('Error loading pending visitor requests:', error);
    }
  };

  const handleApproveVisitor = async (visitorId, visitorName) => {
    Alert.alert(
      'Approve Member Request',
      `Approve ${visitorName} as a new member?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('jwt_token') ||
                await AsyncStorage.getItem('token') ||
                await AsyncStorage.getItem('authToken');
              const res = await fetch(`${API_BASE_URL}/api/Inventory/visitors/${visitorId}/approve-member`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              });
              if (res.ok) {
                Alert.alert('Success', `${visitorName} has been approved as a member.`);
                await loadPendingVisitorRequests();
              } else {
                const err = await res.json().catch(() => ({}));
                Alert.alert('Error', err.statusDesc || 'Failed to approve request.');
              }
            } catch (e) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  };

  const handleRejectVisitor = async (visitorId, visitorName) => {
    Alert.alert(
      'Reject Member Request',
      `Reject ${visitorName}'s member request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('jwt_token') ||
                await AsyncStorage.getItem('token') ||
                await AsyncStorage.getItem('authToken');
              const res = await fetch(`${API_BASE_URL}/api/Inventory/visitors/${visitorId}/reject-member`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              });
              if (res.ok) {
                Alert.alert('Done', `${visitorName}'s request has been rejected.`);
                await loadPendingVisitorRequests();
              } else {
                Alert.alert('Error', 'Failed to reject request.');
              }
            } catch (e) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  };

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  // Handle quick actions scroll
  const handleQuickActionsScroll = (event) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(contentOffsetX / 120);
    setActiveQuickActionIndex(newIndex);
  };

  // Dashboard modules - Updated for Member view with requested features only
  const modules = [
    {
      id: 'new-member',
      title: t('addMember'),
      icon: 'account-plus',
      action: () => navigation.navigate('NewMember'),
      badge: null,
    },
    {
      id: 'members',
      title: t('membersList'),
      icon: 'account-group',
      action: () => navigation.navigate('MembersList'),
      badge: null,
    },
    {
      id: 'payment',
      title: t('paymentDetails'),
      icon: 'credit-card-multiple',
      action: () => navigation.navigate('PaymentDetails'),
      badge: null,
    },
    {
      id: 'attendance',
      title: t('attendance'),
      icon: 'calendar-check',
      action: () => navigation.navigate('Attendance'),
      badge: null,
    },
    {
      id: 'reports',
      title: t('reports'),
      icon: 'file-document',
      action: () => navigation.navigate('Reports'),
      badge: null,
    },
    {
      id: 'messages',
      title: t('messages'),
      icon: 'message-text',
      action: () => navigation.navigate('Messages'),
      badge: null,
    },
  ];

  const quickActions = [
    {
      id: 'send-notice',
      icon: 'bullhorn',
      title: t('broadcast'),
      action: () => navigation.navigate('Messages'),
    },
    {
      id: 'generate-report',
      icon: 'file-document',
      title: t('reports'),
      action: () => {
        try {
          navigation.navigate('Reports');
        } catch (error) {
          console.error('Error navigating to reports:', error);
          Alert.alert(t('error'), t('operationFailed'));
        }
      },
    },
    {
      id: 'create-meeting',
      icon: 'calendar-plus',
      title: t('createMeeting'),
      action: () => navigation.navigate('CreateMeeting'),
    },
  ];

  const QuickActionCard = ({ action, index }) => {
    return (
      <TouchableOpacity
        style={[
          styles.quickActionCard,
          activeQuickActionIndex === index && styles.activeQuickActionCard
        ]}
        onPress={() => handleQuickAction(action)}
        activeOpacity={0.8}
      >
        <View style={styles.quickActionContent}>
          <View style={styles.quickActionIconContainer}>
            <Icon name={action.icon} size={24} color={waterBlueColors.primary} />
          </View>
          <Text style={styles.quickActionText}>{action.title}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const handleModulePress = (module) => {
    module.action();
  };

  const handleQuickAction = (action) => {
    action.action();
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
                    source={require('../assets/logoicon2.png')}
                    style={styles.headerLogo}
                    resizeMode="contain"
                  />
                </View>
                <Text style={[
                  styles.welcomeText,
                  t('alaigal') === 'அலைகள்' && styles.tamilText
                ]}>
                  {companyName}
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

            <Text style={styles.thirukkuralQuote}>
              "தெய்வத்தான் ஆகா தெனினும் முயற்சிதன் மெய்வருத்தக் கூலி தரும்" — திருக்குறள் 619
            </Text>
          </View>
          {/* Enhanced Member Info Card - My Card Style */}
          {/* Card removed as requested */}
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[waterBlueColors.primary]}
            tintColor={waterBlueColors.primary}
          />
        }
      >



        {/* Recent Notifications Section - Matching UserDashboard Layout */}
        {notifications.length > 0 && (
          <Animatable.View
            animation="fadeInUp"
            delay={200}
            style={styles.sectionContainer}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.notificationHeaderLeft}>
                <Icon name="bell" size={20} color="#FFB300" />
                <Text style={styles.sectionTitle}>{t('recentNotifications')}</Text>
              </View>
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
                    {notification.messageType === 'Birthday' ? (
                      <Animatable.View
                        animation={{ 0: { scale: 1 }, 0.5: { scale: 1.2 }, 1: { scale: 1 } }}
                        iterationCount="infinite"
                        duration={2500}
                        easing="ease-in-out"
                      >
                        <Icon name={notification.icon} size={18} color={notification.color} />
                      </Animatable.View>
                    ) : (
                      <Icon name={notification.icon} size={18} color={notification.color} />
                    )}
                  </View>
                  <View style={styles.notificationSwipeContent}>
                    <Text style={styles.notificationSwipeTitle} numberOfLines={2}>
                      {display.title}
                    </Text>
                    <Text style={styles.notificationSwipeMessage} numberOfLines={3}>
                      {display.message}
                    </Text>
                    <Text style={styles.notificationSwipeTime}>
                      {display.time}
                    </Text>
                    {notification.canRespond && (
                      <View style={styles.tapToRespondBadge}>
                        <Text style={styles.tapToRespondText}>
                          {notification.messageType === 'Meeting' ? t('tapToRespond') :
                            notification.messageType === 'Payment' ? t('tapToView') : t('tapToRespond')}
                        </Text>
                      </View>
                    )}
                  </View>
                  {!notification.isRead && (
                    <View style={styles.swipeUnreadIndicator} />
                  )}
                </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Animatable.View>
        )}

        {/* Admin: All Pending Visitor Member Requests — Approve / Reject */}
        {allPendingVisitorRequests.length > 0 && (
          <Animatable.View
            animation="fadeInUp"
            delay={320}
            style={[styles.sectionContainer, { borderLeftWidth: 4, borderLeftColor: '#4A90E2', backgroundColor: '#F0F8FF' }]}
          >
            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Icon name="account-clock" size={20} color="#4A90E2" />
                <Text style={[styles.sectionTitle, { color: '#1565C0' }]}>
                  Visitor Member Requests ({allPendingVisitorRequests.length})
                </Text>
              </View>
            </View>
            {allPendingVisitorRequests.map((req) => (
              <View key={req.id} style={styles.visitorReqRow}>
                <View style={styles.visitorReqInfo}>
                  <Text style={styles.visitorReqName}>{req.visitorName}</Text>
                  <Text style={styles.visitorReqMeta}>
                    {req.visitorPhone ? `📞 ${req.visitorPhone}` : ''}
                    {req.broughtByMemberName ? `  •  Ref: ${req.broughtByMemberName}` : ''}
                  </Text>
                  <Text style={styles.visitorReqDate}>
                    {new Date(req.createdDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
                <View style={styles.visitorReqActions}>
                  <TouchableOpacity
                    style={styles.approveBtn}
                    onPress={() => handleApproveVisitor(req.id, req.visitorName)}
                  >
                    <Icon name="check" size={14} color="#FFF" />
                    <Text style={styles.approveBtnText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.rejectBtn}
                    onPress={() => handleRejectVisitor(req.id, req.visitorName)}
                  >
                    <Icon name="close" size={14} color="#FFF" />
                    <Text style={styles.rejectBtnText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </Animatable.View>
        )}

        {/* Quick Actions - Swipeable */}
        <Animatable.View
          animation="fadeInUp"
          delay={700}
          style={styles.sectionContainer}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>⚡ {t('quickActions')}</Text>
          </View>

          <View style={styles.quickActionsContainer}>
            <ScrollView
              ref={quickActionsScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.quickActionsScroll}
              contentContainerStyle={styles.quickActionsContent}
              onScroll={handleQuickActionsScroll}
              scrollEventThrottle={16}
              pagingEnabled
              snapToInterval={120}
              decelerationRate="fast"
            >
              {quickActions.map((action, index) => (
                <QuickActionCard
                  key={action.id}
                  action={action}
                  index={index}
                />
              ))}
            </ScrollView>

            {/* Quick Actions Indicators */}
            <View style={styles.indicatorsContainer}>
              {quickActions.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.indicator,
                    activeQuickActionIndex === index && styles.activeIndicator
                  ]}
                />
              ))}
            </View>
          </View>
        </Animatable.View>

        {/* Main Modules */}
        <Animatable.View
          animation="fadeInUp"
          delay={800}
          style={styles.sectionContainer}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📱 {t('memberFeatures')}</Text>
            <TouchableOpacity style={styles.viewAllButton} onPress={() => navigation.navigate('MembersList')}>
              <Text style={styles.viewAllText}>{t('viewAll')}</Text>
              <Icon name="chevron-right" size={14} color={waterBlueColors.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles.modulesGrid}>
            {modules.map((module, index) => (
              <Animatable.View
                key={module.id}
                animation="fadeInUp"
                delay={100 * index}
                style={styles.moduleCardWrapper}
              >
                <TouchableOpacity
                  style={styles.moduleCard}
                  onPress={() => handleModulePress(module)}
                  activeOpacity={0.7}
                >
                  <View style={styles.moduleCardContent}>
                    <View style={[styles.moduleIconContainer, { backgroundColor: `${waterBlueColors.primary}15` }]}>
                      <Icon name={module.icon} size={24} color={waterBlueColors.primary} />
                    </View>
                    <Text style={styles.moduleTitle} numberOfLines={2}>{module.title}</Text>
                  </View>
                </TouchableOpacity>
              </Animatable.View>
            ))}
          </View>
        </Animatable.View>

        {/* Recent Activity Placeholder */}
        <Animatable.View
          animation="fadeInUp"
          delay={900}
          style={styles.activitySection}
        >
          <View style={styles.activityHeader}>
            <Text style={styles.activityTitle}>📈 {t('recentActivity')}</Text>
            <Text style={styles.activityTime}>{t('today')}</Text>
          </View>
          <View style={styles.activityCard}>
            <View style={styles.activityItem}>
              <View style={[styles.activityIcon, { backgroundColor: `${waterBlueColors.primary}15` }]}>
                <Icon name="bell-ring" size={18} color={waterBlueColors.primary} />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>{t('newNotificationReceived')}</Text>
                <Text style={styles.activityTimeText}>10:30 AM</Text>
              </View>
            </View>
            <View style={styles.activityItem}>
              <View style={[styles.activityIcon, { backgroundColor: `${waterBlueColors.primary}15` }]}>
                <Icon name="calendar-check" size={18} color={waterBlueColors.primary} />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>{t('eventRegistrationConfirmed')}</Text>
                <Text style={styles.activityTimeText}>09:15 AM</Text>
              </View>
            </View>
          </View>
        </Animatable.View>
      </ScrollView>

      {/* Notification Modal */}
      <Modal
        visible={showNotifications}
        animationType="slide"
        transparent={true}
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

            {/* Notification Filter Tabs */}
            <View style={styles.notificationFilterContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.notificationFilterScroll}
                contentContainerStyle={styles.notificationFilterContent}
              >
                {[
                  { id: 'all', label: t('all'), icon: 'bell', count: notifications.length },
                  { id: 'Birthday', label: t('Birthday'), icon: 'cake-variant', count: notifications.filter(n => n.messageType === 'Birthday').length },
                  { id: 'Event', label: t('Event'), icon: 'calendar-star', count: notifications.filter(n => n.messageType === 'Event').length },
                  { id: 'Meeting', label: t('Meeting'), icon: 'calendar-clock', count: notifications.filter(n => n.messageType === 'Meeting').length },
                  { id: 'Payment', label: t('Payment'), icon: 'credit-card', count: notifications.filter(n => n.messageType === 'Payment').length },
                  { id: 'NewMember', label: t('welcome'), icon: 'account-plus', count: notifications.filter(n => n.messageType === 'NewMember').length },
                ].map((filter) => (
                  <TouchableOpacity
                    key={filter.id}
                    style={[
                      styles.notificationFilterTab,
                      selectedNotificationFilter === filter.id && styles.notificationFilterTabActive
                    ]}
                    onPress={() => setSelectedNotificationFilter(filter.id)}
                  >
                    <Icon
                      name={filter.icon}
                      size={16}
                      color={selectedNotificationFilter === filter.id ? '#FFF' : waterBlueColors.primary}
                    />
                    <Text style={[
                      styles.notificationFilterTabText,
                      selectedNotificationFilter === filter.id && styles.notificationFilterTabTextActive
                    ]}>
                      {filter.label}
                    </Text>
                    {filter.count > 0 && (
                      <View style={[
                        styles.notificationFilterBadge,
                        selectedNotificationFilter === filter.id && styles.notificationFilterBadgeActive
                      ]}>
                        <Text style={[
                          styles.notificationFilterBadgeText,
                          selectedNotificationFilter === filter.id && styles.notificationFilterBadgeTextActive
                        ]}>
                          {filter.count}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <ScrollView style={styles.notificationsList} showsVerticalScrollIndicator={false}>
              {(() => {
                // Filter notifications based on selected filter
                const filteredNotifications = selectedNotificationFilter === 'all'
                  ? notifications
                  : notifications.filter(n => n.messageType === selectedNotificationFilter);

                if (filteredNotifications.length === 0) {
                  return (
                    <View style={styles.emptyNotifications}>
                      <Icon name="bell-off" size={48} color="#BDC3C7" />
                      <Text style={styles.emptyNotificationsText}>
                        {selectedNotificationFilter === 'all' ? t('noNotifications') : `${t('noRecordsFound')}`}
                      </Text>
                      <Text style={styles.emptyNotificationsSubtext}>
                        {selectedNotificationFilter === 'all' ? t('youreAllCaughtUp') : t('noRecordsFound')}
                      </Text>
                    </View>
                  );
                }

                return filteredNotifications.map((notification) => {
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
                      {notification.messageType === 'Birthday' ? (
                        <Animatable.View
                          animation={{ 0: { scale: 1 }, 0.5: { scale: 1.2 }, 1: { scale: 1 } }}
                          iterationCount="infinite"
                          duration={2500}
                          easing="ease-in-out"
                        >
                          <Icon name={notification.icon} size={20} color={notification.color} />
                        </Animatable.View>
                      ) : (
                        <Icon name={notification.icon} size={20} color={notification.color} />
                      )}
                    </View>
                    <View style={styles.notificationContent}>
                      <View style={styles.notificationHeader}>
                        <Text style={[
                          styles.notificationItemTitle,
                          !notification.isRead && styles.unreadNotificationTitle
                        ]}>
                          {display.title}
                        </Text>
                        {!notification.isRead && (
                          <View style={styles.unreadIndicator} />
                        )}
                      </View>
                      <Text style={styles.notificationItemMessage}>
                        {display.message}
                      </Text>
                      <Text style={styles.notificationItemTime}>
                        {display.time}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  );
                });
              })()}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F8',
  },
  headerGradient: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 10,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    paddingTop: 10,
    paddingBottom: 10,
  },
  header: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  greetingWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    marginBottom: 2,
  },
  headerTimeIconInline: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  headerSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    flexWrap: 'nowrap',
  },
  headerMemberName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  headerWelcome: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 2,
    marginLeft: 0,
  },
  headerQuote: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0.5, height: 0.2 },
    textShadowRadius: 2,
  },
  headerTimeIcon: {
    marginTop: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLeftIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerHandIcon: {
    position: 'absolute',
    right: 60, // Position to the left of notification bell
    top: '50%',
    transform: [{ translateY: -14 }],
  },
  headerActionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  notificationDotText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  loadingStats: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
  },
  loadingText: {
    color: '#FFF',
    fontSize: 12,
    marginTop: 8,
  },
  welcomeHeaderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  welcomeHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  welcomeHeaderSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  indicatorsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 3,
  },
  activeIndicator: {
    width: 10,
    backgroundColor: '#FFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  welcomeCard: {
    marginBottom: 16,
    borderRadius: 18,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    height: 100,
  },
  welcomeCardGradient: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '100%',
  },
  welcomeContent: {
    flex: 1,
  },
  welcomeContentCentered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#1A2332',
    marginBottom: 6,
    lineHeight: 24,
    minHeight: 24,
  },
  welcomeTitleYellow: {
    fontSize: 19,
    fontWeight: '700',
    color: '#FFB300', // Yellow color for welcome back text
    marginBottom: 6,
    lineHeight: 24,
    minHeight: 24,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 13,
    color: '#5D6D7E',
    lineHeight: 19,
    fontWeight: '500',
    minHeight: 19,
    textAlign: 'center', // Center align the quote text
  },
  welcomeIcon: {
    marginLeft: 12,
    position: 'relative',
  },
  welcomeNotificationDot: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  welcomeNotificationText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  // Recent Notifications Styles
  notificationCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  notificationCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C3E50',
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
    paddingHorizontal: 16,
  },
  notificationSwipeCard: {
    width: 200, // Increased width to match UserDashboard
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E8F1FF',
    position: 'relative',
    minHeight: 140, // Increased height
    elevation: 2,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  unreadNotificationCard: {
    backgroundColor: '#F0F7FF',
    borderColor: '#4A90E2',
    borderWidth: 1.5,
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
  },
  notificationSwipeTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
    lineHeight: 16,
  },
  notificationSwipeMessage: {
    fontSize: 10,
    color: '#5D6D7E',
    lineHeight: 14,
    marginBottom: 6,
    flex: 1,
  },
  notificationSwipeTime: {
    fontSize: 10,
    color: '#95A5A6',
    fontWeight: '500',
    marginBottom: 4,
  },
  tapToRespondBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  tapToRespondText: {
    fontSize: 9,
    color: '#4A90E2',
    fontWeight: '600',
  },
  swipeUnreadIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B6B',
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
  sectionContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  notificationHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C3E50',
    marginLeft: 8,
    flex: 1,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  viewAllText: {
    fontSize: 11,
    color: '#4A90E2',
    fontWeight: '600',
    marginRight: 4,
  },
  quickActionsContainer: {
    marginTop: 4,
  },
  quickActionsScroll: {
    marginHorizontal: -8,
  },
  quickActionsContent: {
    paddingHorizontal: 8,
  },
  quickActionCard: {
    width: 105,
    height: 80,
    marginRight: 10,
    borderRadius: 16,
    backgroundColor: '#FFF',
    elevation: 3,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
    borderWidth: 1,
    borderColor: '#E8F0FE',
  },
  activeQuickActionCard: {
    opacity: 1,
    transform: [{ scale: 1 }],
    elevation: 6,
    shadowColor: waterBlueColors.primary,
    shadowOpacity: 0.15,
  },
  quickActionContent: {
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  quickActionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: `${waterBlueColors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  quickActionText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#2C3E50',
    textAlign: 'center',
    lineHeight: 16,
  },
  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  moduleCardWrapper: {
    width: '48%',
    marginBottom: 12,
  },
  moduleCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8F0FE',
    elevation: 3,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    minHeight: 110,
  },
  moduleCardContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFF',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '700',
  },
  moduleTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 2,
    lineHeight: 16,
    textAlign: 'center',
    height: 32,
    textAlignVertical: 'center',
  },
  moduleDescription: {
    fontSize: 11,
    color: '#7F8C8D',
    lineHeight: 14,
    fontWeight: '500',
    minHeight: 14,
  },
  moduleArrow: {
    marginLeft: 6,
  },
  activitySection: {
    marginBottom: 20,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
  },
  activityTime: {
    fontSize: 12,
    color: '#7F8C8D',
    fontWeight: '600',
  },
  activityCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    elevation: 2,
    shadowColor: '#E3F2FD',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 2,
  },
  activityTimeText: {
    fontSize: 11,
    color: '#95A5A6',
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
    color: '#FF6B6B',
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
  notificationFilterContainer: {
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  notificationFilterScroll: {
    flexGrow: 0,
  },
  notificationFilterContent: {
    paddingHorizontal: 5,
  },
  notificationFilterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E3F2FD',
  },
  notificationFilterTabActive: {
    backgroundColor: waterBlueColors.primary,
    borderColor: waterBlueColors.primary,
  },
  notificationFilterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: waterBlueColors.primary,
    marginLeft: 6,
  },
  notificationFilterTabTextActive: {
    color: '#FFF',
  },
  notificationFilterBadge: {
    backgroundColor: waterBlueColors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  notificationFilterBadgeActive: {
    backgroundColor: '#FFF',
  },
  notificationFilterBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  notificationFilterBadgeTextActive: {
    color: waterBlueColors.primary,
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
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B6B',
  },
  notificationItemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  unreadNotificationTitle: {
    fontWeight: '700',
    color: '#2C3E50',
  },
  notificationItemMessage: {
    fontSize: 12,
    color: '#5D6D7E',
    lineHeight: 18,
    marginBottom: 4,
  },
  notificationItemTime: {
    fontSize: 12,
    color: '#95A5A6',
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
  // Header styles matching UserDashboard
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
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
    letterSpacing: 0, // Critical: Tamil doesn't need letter spacing
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
  headerCenterContent: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
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
  visitorReqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#BBDEFB',
    gap: 8,
  },
  visitorReqInfo: {
    flex: 1,
  },
  visitorReqName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A237E',
    marginBottom: 2,
  },
  visitorReqMeta: {
    fontSize: 12,
    color: '#3949AB',
    marginBottom: 2,
  },
  visitorReqDate: {
    fontSize: 11,
    color: '#7986CB',
  },
  visitorReqActions: {
    flexDirection: 'row',
    gap: 6,
  },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  approveBtnText: {
    fontSize: 11,
    color: '#FFF',
    fontWeight: '700',
  },
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F44336',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  rejectBtnText: {
    fontSize: 11,
    color: '#FFF',
    fontWeight: '700',
  },
  pendingRequestCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF8C00',
    backgroundColor: '#FFFBF5',
  },
  pendingRequestHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  pendingRequestIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingRequestTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E65100',
    marginBottom: 3,
  },
  pendingRequestSubtitle: {
    fontSize: 12,
    color: '#795548',
    lineHeight: 17,
  },
  pendingBadge: {
    backgroundColor: '#FFF3E0',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#FF8C00',
    alignSelf: 'flex-start',
  },
  pendingBadgeText: {
    fontSize: 10,
    color: '#FF8C00',
    fontWeight: '700',
  },
  pendingRequestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#FFE0B2',
    gap: 8,
  },
  pendingRequestName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#4E342E',
  },
  pendingRequestDate: {
    fontSize: 11,
    color: '#A1887F',
  },
});

export default MemberDashboard;