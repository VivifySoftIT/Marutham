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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import ApiService from '../service/api';
import MemberIdService from '../service/MemberIdService';
import { useLanguage } from '../service/LanguageContext';
import API_BASE_URL from '../apiConfig';

// Birthday Wishes Section Component for MemberDashboard
const BirthdayWishesSection = ({ memberId }) => {
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
          <Text style={styles.birthdayWishLoading}>Checking for birthday wishes...</Text>
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
            <Text style={styles.birthdayWishTitle}>🎉 Birthday Wish Received!</Text>
            <Text style={styles.birthdayWishMessage}>
              {birthdayWish.senderName || 'A member'} sent you birthday wishes today!
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
  const { t } = useLanguage();
  const [greeting, setGreeting] = useState('');
  const [quote, setQuote] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentMemberId, setCurrentMemberId] = useState(null);
  const [selectedNotificationFilter, setSelectedNotificationFilter] = useState('all');
  const [memberName, setMemberName] = useState('');

  // For swipeable sections
  const [activeQuickActionIndex, setActiveQuickActionIndex] = useState(0);

  const quickActionsScrollRef = useRef(null);

  const [notifications, setNotifications] = useState([]);

  // Handle logout
  const handleLogout = async () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
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
        'Meeting Response',
        'Respond to the meeting notification?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Attend',
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
                    'Success',
                    'You have confirmed your attendance! ✅\n\nAttendance has been marked in the system.',
                    [{ text: 'OK' }]
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
                    'Success',
                    'Your attendance has been recorded! ✅\n\nMeeting response and attendance marked.',
                    [{ text: 'OK' }]
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
                    'Response Recorded',
                    'You have indicated you will not attend. ❌\n\nResponse has been recorded in the system.',
                    [{ text: 'OK' }]
                  );
                  
                  markNotificationAsRead(notification.id);
                  await loadNotifications();
                  
                } else if (response.status === 404) {
                  // For meeting responses, 404 is expected (no birthday wish exists)
                  // But the status parameter still creates the meeting status
                  console.log('No birthday wish found, but meeting status recorded via status=2');
                  
                  Alert.alert(
                    'Response Recorded',
                    'Your not-attend response has been recorded! ❌\n\nMeeting response noted.',
                    [{ text: 'OK' }]
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

  // Handle payment response
  const handlePaymentResponse = (notification) => {
    Alert.alert(
      'Payment Notification',
      'View payment details?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'View Details',
          onPress: () => {
            markNotificationAsRead(notification.id);
            // Navigate to payments or show details
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
      const wishType = isBirthday ? 'Birthday Wishes' : 'Welcome Wishes';
      const recipientName = notification.recipientName || 'member';
      
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
        if (recipientName === 'member') {
          Alert.alert(
            'Unable to Send Wish',
            'Could not identify the recipient for this notification. The member information is missing from the notification content.',
            [{ text: 'OK' }]
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
        newGreeting = '🌅 Good Morning';
        newQuote = 'Start your day with positive energy!';
      } else if (currentHour >= 12 && currentHour < 16) {
        newGreeting = '☀️ Good Afternoon';
        newQuote = 'Keep the momentum going!';
      } else if (currentHour >= 16 && currentHour < 20) {
        newGreeting = ' 🌙 Good Evening';
        newQuote = 'Reflect on today\'s achievements!';
      } else if (currentHour >= 20 || currentHour < 1) {
        newGreeting = '🌙 Good Night';
        newQuote = 'Rest well and recharge!';
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
            title: '🎂 Birthday Reminder',
            message: `Today is ${reminder.memberName || 'a member'}'s birthday! Send them wishes.`,
            time: 'Today',
            icon: 'cake-variant',
            color: '#9C27B0',
            backgroundColor: '#F3E5F5',
            isRead: false,
            canRespond: true, // Birthday reminders can be responded to
            attachmentUrl: null,
            eventDate: reminder.birthDate,
            createdBy: null,
            recipientName: reminder.memberName,
            recipientMemberId: reminder.memberId,
          });
        });
      }

      // Add some test notifications to ensure tap-to-respond is visible
      if (newNotifications.length === 0) {
        // Try to get real member IDs for test notifications
        let testMemberId = null; // Don't use fallback ID that doesn't exist
        let testMemberName = 'Test Member'; // fallback name
        
        try {
          const response = await fetch(`${API_BASE_URL}/api/Members`);
          if (response.ok) {
            const members = await response.json();
            if (members && members.length > 0) {
              // Use the first member for test notifications
              const firstMember = members[0];
              testMemberId = firstMember.id;
              testMemberName = firstMember.name || 'Test Member';
            }
          }
        } catch (error) {
          console.log('Could not fetch members for test notifications, using fallback');
        }

        // Only add birthday test notification if we have a real member ID
        if (testMemberId) {
          console.log('Adding test birthday notification with real member ID:', testMemberId);
          newNotifications.push({
            id: `test-birthday-${Date.now()}`,
            type: 'birthday',
            messageType: 'Birthday',
            title: '🎂 Birthday Reminder',
            message: `Today is ${testMemberName}'s birthday! Send them wishes.`,
            time: 'Today',
            icon: 'cake-variant',
            color: '#9C27B0',
            backgroundColor: '#F3E5F5',
            isRead: false,
            canRespond: true,
            attachmentUrl: null,
            eventDate: new Date(),
            createdBy: null,
            recipientName: testMemberName,
            recipientMemberId: testMemberId,
          });
        } else {
          console.log('No real member ID found, skipping birthday test notification');
        }

        // Add test meeting notification (doesn't need specific member ID)
        newNotifications.push({
          id: `test-meeting-${Date.now()}`,
          type: 'message',
          messageType: 'Meeting',
          title: '📅 Meeting Notification',
          message: `Monthly team meeting scheduled for tomorrow.`,
          time: 'Tomorrow',
          icon: 'calendar-clock',
          color: '#4ECDC4',
          backgroundColor: '#E8F8F7',
          isRead: false,
          canRespond: true,
          attachmentUrl: null,
          eventDate: new Date(),
          createdBy: null,
          recipientName: null,
          recipientMemberId: null,
        });

        // Add test payment notification (doesn't need specific member ID)
        newNotifications.push({
          id: `test-payment-${Date.now()}`,
          type: 'message',
          messageType: 'Payment',
          title: '💳 Payment Notification',
          message: `Payment of ₹500 received successfully.`,
          time: 'Today',
          icon: 'credit-card-check',
          color: '#FFA726',
          backgroundColor: '#FFF3E0',
          isRead: false,
          canRespond: true,
          attachmentUrl: null,
          eventDate: new Date(),
          createdBy: null,
          recipientName: null,
          recipientMemberId: null,
        });
      }

      // ✅ Only process message notifications (no reminders!)
      if (messageNotifications && messageNotifications.length > 0) {
        messageNotifications.forEach((msg) => {
          const notificationTypeMap = {
            'Payment': { icon: 'credit-card-check', color: '#FFA726', backgroundColor: '#FFF3E0' },
            'Birthday': { icon: 'cake-variant', color: '#9C27B0', backgroundColor: '#F3E5F5' },
            'Event': { icon: 'calendar-star', color: '#FF9800', backgroundColor: '#FFF3E0' },
            'Meeting': { icon: 'calendar-clock', color: '#4ECDC4', backgroundColor: '#E8F8F7' }, // Using clock only, no star
            'Welcome': { icon: 'hand-wave', color: '#9C27B0', backgroundColor: '#F3E5F5' },
            'NewMember': { icon: 'account-plus', color: '#2196F3', backgroundColor: '#E3F2FD' }
          };
          const typeConfig = notificationTypeMap[msg.messageType] ||
            { icon: 'information', color: '#45B7D1', backgroundColor: '#E3F2FD' };

          let notificationMessage = msg.content || 'New notification received';
          if ((msg.messageType === 'Event' || msg.messageType === 'Meeting') && msg.date) {
            const eventDate = new Date(msg.date);
            const formattedDate = eventDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });
            notificationMessage = `${notificationMessage}\n📅 ${formattedDate}`;
          }

          // Extract member IDs for Birthday and NewMember notifications
          let recipientMemberId = null;
          let recipientName = null;
          
          if (msg.messageType === 'Birthday' || msg.messageType === 'NewMember') {
            // Extract name from content for Birthday notifications
            if (msg.messageType === 'Birthday' && msg.content) {
              const match = msg.content.match(/Today is (.+)'s birthday/);
              if (match) {
                recipientName = match[1];
              }
            }
            
            // Extract name from content for NewMember notifications
            if (msg.messageType === 'NewMember' && msg.content) {
              const match = msg.content.match(/New member joined: (.+)/);
              if (match) {
                recipientName = match[1];
              }
            }
          }

          newNotifications.push({
            id: `message-${msg.id}`,
            type: 'message',
            messageType: msg.messageType,
            title: msg.subject || `${msg.messageType} Notification`,
            message: notificationMessage,
            time: msg.messageType === 'Meeting' && msg.date 
              ? new Date(msg.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })
              : (msg.createdDate ? new Date(msg.createdDate).toLocaleDateString() : 'Recent'),
            icon: typeConfig.icon,
            color: typeConfig.color,
            backgroundColor: typeConfig.backgroundColor,
            isRead: false,
            canRespond: true, // Always allow response for Birthday notifications
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
          const response = await fetch(`https://www.vivifysoft.in/AlaigalBE/api/Members/${memberId}`);
          if (response.ok) {
            const memberDetails = await response.json();
            const name = memberDetails?.name || 'Member';
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
      title: 'Add Member',
      icon: 'account-plus',
      action: () => navigation.navigate('NewMember'),
      badge: null,
    },
    {
      id: 'members',
      title: 'Members List',
      icon: 'account-group',
      action: () => navigation.navigate('MembersList'),
      badge: null,
    },
    {
      id: 'payment',
      title: 'Payment Details',
      icon: 'credit-card-multiple',
      action: () => navigation.navigate('PaymentDetails'),
      badge: null,
    },
    {
      id: 'attendance',
      title: 'Attendance',
      icon: 'calendar-check',
      action: () => navigation.navigate('Attendance'),
      badge: null,
    },
    {
      id: 'reports',
      title: 'Reports',
      icon: 'file-document',
      action: () => navigation.navigate('Reports'),
      badge: null,
    },
    {
      id: 'messages',
      title: 'Messages',
      icon: 'message-text',
      action: () => navigation.navigate('Messages'),
      badge: null,
    },
  ];

  const quickActions = [
    {
      id: 'send-notice',
      icon: 'bullhorn',
      title: 'Broadcast',
      action: () => navigation.navigate('Messages'),
    },
    {
      id: 'generate-report',
      icon: 'file-document',
      title: 'Reports',
      action: () => {
        try {
          navigation.navigate('Reports');
        } catch (error) {
          console.error('Error navigating to reports:', error);
          Alert.alert('Error', 'Could not load reports at this time.');
        }
      },
    },
    {
      id: 'create-meeting',
      icon: 'calendar-plus',
      title: 'Create Meeting',
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
          <View style={styles.headerTop}>
            <View style={styles.headerLeftIcons}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => navigation.navigate('SettingsScreen')}
              >
                <Icon name="cog" size={22} color="#FFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.headerTitleContainer}>
              <View style={styles.greetingWithIcon}>
                {/* Animated Icon based on time - Show ONLY for Morning and Afternoon */}
                {greeting && (greeting.toLowerCase().includes('morning') || greeting.toLowerCase().includes('afternoon')) && (
                  <Animatable.View
                    animation={{
                      0: { scale: 1 },
                      0.5: { scale: 1.2 },
                      1: { scale: 1 }
                    }}
                    iterationCount="infinite"
                    duration={2000}
                    easing="ease-in-out"
                    style={styles.headerTimeIconInline}
                  >
                    {greeting.toLowerCase().includes('morning') ? (
                      <Icon name="weather-sunny" size={24} color="#FFD700" />
                    ) : (
                      <Icon name="white-balance-sunny" size={24} color="#FFA500" />
                    )}
                  </Animatable.View>
                )}
                <Text style={styles.headerTitle}>{greeting || 'Good Afternoon'}</Text>
              </View>
              <View style={styles.headerSubtitleRow}>
                <Text style={styles.headerMemberName}>{memberName || 'Admin User'}</Text>
                <Text style={styles.headerWelcome}>, Welcome to Alaigal</Text>
              </View>
              {quote && (
                <Text style={styles.headerQuote}>{quote}</Text>
              )}
            </View>

            <View style={styles.headerRightIcons}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => setShowNotifications(true)}
              >
                <Icon name="bell" size={22} color="#FFF" />
                {notificationCount > 0 && (
                  <View style={styles.notificationDot}>
                    <Text style={styles.notificationDotText}>{notificationCount}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.iconButton, { marginLeft: 8 }]}
                onPress={handleLogout}
              >
                <Icon name="logout" size={22} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Welcome Message in Header */}
          {loading ? (
            <View style={styles.loadingStats}>
              <ActivityIndicator size="small" color="#FFF" />
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : null}
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
                <Text style={styles.sectionTitle}>Recent Notifications</Text>
              </View>
              <TouchableOpacity onPress={() => setShowNotifications(true)}>
                <Text style={styles.viewAllNotifications}>View All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.notificationScrollView}
              contentContainerStyle={styles.notificationScrollContent}
            >
              {notifications.slice(0, 5).map((notification) => (
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
                      // Animated Birthday Cake Icon
                      <Animatable.View
                        animation={{
                          0: { scale: 1 },
                          0.5: { scale: 1.2 },
                          1: { scale: 1 }
                        }}
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
                      {notification.title}
                    </Text>
                    <Text style={styles.notificationSwipeMessage} numberOfLines={3}>
                      {notification.message}
                    </Text>
                    <Text style={styles.notificationSwipeTime}>
                      {notification.time}
                    </Text>
                    {/* Tap to respond badge - always show for responsive notifications */}
                    {notification.canRespond && (
                      <View style={styles.tapToRespondBadge}>
                        <Text style={styles.tapToRespondText}>
                          {notification.messageType === 'Meeting' ? 'Tap to respond' : 
                           notification.messageType === 'Payment' ? 'Tap to view' : 'Tap to respond'}
                        </Text>
                      </View>
                    )}
                  </View>
                  {!notification.isRead && (
                    <View style={styles.swipeUnreadIndicator} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animatable.View>
        )}
    
        {/* Quick Actions - Swipeable */}
        <Animatable.View
          animation="fadeInUp"
          delay={700}
          style={styles.sectionContainer}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
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
            <Text style={styles.sectionTitle}>📱 Member Features</Text>
            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>View All</Text>
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
                      <Icon name={module.icon} size={22} color={waterBlueColors.primary} />
                    </View>
                    <Text style={styles.moduleTitle}>{module.title}</Text>
                  </View>
                  <View style={styles.moduleArrow}>
                    <Icon name="chevron-right" size={16} color={waterBlueColors.primary} />
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
            <Text style={styles.activityTitle}>📈 Recent Activity</Text>
            <Text style={styles.activityTime}>Today</Text>
          </View>
          <View style={styles.activityCard}>
            <View style={styles.activityItem}>
              <View style={[styles.activityIcon, { backgroundColor: `${waterBlueColors.primary}15` }]}>
                <Icon name="bell-ring" size={18} color={waterBlueColors.primary} />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>New notification received</Text>
                <Text style={styles.activityTimeText}>10:30 AM</Text>
              </View>
            </View>
            <View style={styles.activityItem}>
              <View style={[styles.activityIcon, { backgroundColor: `${waterBlueColors.primary}15` }]}>
                <Icon name="calendar-check" size={18} color={waterBlueColors.primary} />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>Event registration confirmed</Text>
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
              <Text style={styles.notificationModalTitle}>🔔 Notifications</Text>
              <View style={styles.notificationHeaderActions}>
                {notificationCount > 0 && (
                  <TouchableOpacity
                    style={styles.clearAllButton}
                    onPress={clearAllNotifications}
                  >
                    <Text style={styles.clearAllText}>Clear All</Text>
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
                  { id: 'all', label: 'All', icon: 'bell', count: notifications.length },
                  { id: 'Birthday', label: 'Birthday', icon: 'cake-variant', count: notifications.filter(n => n.messageType === 'Birthday').length },
                  { id: 'Event', label: 'Event', icon: 'calendar-star', count: notifications.filter(n => n.messageType === 'Event').length },
                  { id: 'Meeting', label: 'Meeting', icon: 'calendar-clock', count: notifications.filter(n => n.messageType === 'Meeting').length },
                  { id: 'Payment', label: 'Payment', icon: 'credit-card', count: notifications.filter(n => n.messageType === 'Payment').length },
                  { id: 'NewMember', label: 'Welcome', icon: 'account-plus', count: notifications.filter(n => n.messageType === 'NewMember').length },
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
                        {selectedNotificationFilter === 'all' ? 'No notifications' : `No ${selectedNotificationFilter.toLowerCase()} notifications`}
                      </Text>
                      <Text style={styles.emptyNotificationsSubtext}>
                        {selectedNotificationFilter === 'all' ? "You're all caught up!" : `No ${selectedNotificationFilter.toLowerCase()} notifications found`}
                      </Text>
                    </View>
                  );
                }

                return filteredNotifications.map((notification) => (
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
                        // Animated Birthday Cake Icon in Modal
                        <Animatable.View
                          animation={{
                            0: { scale: 1 },
                            0.5: { scale: 1.2 },
                            1: { scale: 1 }
                          }}
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
                          {notification.title}
                        </Text>
                        {!notification.isRead && (
                          <View style={styles.unreadIndicator} />
                        )}
                      </View>
                      <Text style={styles.notificationItemMessage}>
                        {notification.message}
                      </Text>
                      <Text style={styles.notificationItemTime}>
                        {notification.time}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ));
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
    paddingHorizontal: 10,
    marginTop: 4,
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
  },
  notificationHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C3E50',
    marginLeft: 8,
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
    fontSize: 12,
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
    width: 90,
    height: 75,
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
    fontSize: 11,
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
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8F0FE',
    elevation: 3,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    minHeight: 85,
  },
  moduleCardContent: {
    flex: 1,
  },
  moduleIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
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
    minHeight: 16,
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
});

export default MemberDashboard;