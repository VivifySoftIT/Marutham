import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Alert,
  Dimensions,
  Modal,
  ActivityIndicator,
} from 'react-native';

import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import ApiService from '../service/api';
import MemberIdService from '../service/MemberIdService';

const { width } = Dimensions.get('window');

// Birthday Wishes Section Component
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
        delay={500}
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
      delay={500}
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
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState(null);
  const [greeting, setGreeting] = useState('');
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
    { id: 'all', label: 'All Time', icon: 'calendar' },
    { id: 'weekly', label: 'Weekly', icon: 'calendar-week' },
    { id: 'monthly', label: 'Monthly', icon: 'calendar-month' },
    { id: 'annual', label: 'Annual', icon: 'calendar-range' },
  ];

  useEffect(() => {
    loadUserData();
    setGreetingMessage();
    loadDashboardReminders();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadUserData();
      loadDashboardReminders();
    }, [])
  );

  const setGreetingMessage = () => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
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

    // Load message notifications (includes Birthday, NewMember, Event, Meeting, Payment, etc.)
    let messageNotifications = null;

    try {
      messageNotifications = await ApiService.getMessageNotificationReport(null, 'daily', memberId);
      console.log('UserDashboard - Message notifications response:', messageNotifications);
      
      // Extract data array from response
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

    // Convert message notifications to UI format
    const newNotifications = [];

    // Add message notifications from API (includes Event, Meeting, Payment, Welcome, NewMember, Birthday)
    if (messageNotifications && messageNotifications.length > 0) {
      messageNotifications.forEach((msg) => {
        // Map message types to notification config
        const notificationTypeMap = {
          'Payment': { icon: 'credit-card-alert', color: '#4CAF50', backgroundColor: '#E8F5E9' },
          'Birthday': { icon: 'cake-variant', color: '#FF6B6B', backgroundColor: '#FFE5E5' },
          'Event': { icon: 'calendar-star', color: '#FF9800', backgroundColor: '#FFF3E0' },
          'Meeting': { icon: 'calendar-clock', color: '#4ECDC4', backgroundColor: '#E8F8F7' },
          'Welcome': { icon: 'hand-wave', color: '#9C27B0', backgroundColor: '#F3E5F5' },
          'NewMember': { icon: 'account-plus', color: '#2196F3', backgroundColor: '#E3F2FD' }
        };

        const typeConfig = notificationTypeMap[msg.messageType] ||
          { icon: 'information', color: '#45B7D1', backgroundColor: '#E3F2FD' };

        // Format the notification message
        let notificationMessage = msg.content || 'New notification received';
        
        // Add date info for Event/Meeting types
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
          
          // Store the raw notification data for later lookup
          // We'll fetch the actual member ID when the user taps to respond
          // This avoids the ID mismatch issue
        }

        const notificationObj = {
          id: `message-${msg.id}`,
          type: 'message',
          messageType: msg.messageType,
          title: msg.subject || `${msg.messageType} Notification`,
          message: notificationMessage,
          time: msg.createdDate ? new Date(msg.createdDate).toLocaleDateString() : 'Recent',
          icon: typeConfig.icon,
          color: typeConfig.color,
          backgroundColor: typeConfig.backgroundColor,
          isRead: msg.isSent || false,
          canRespond: (msg.messageType === 'Birthday' || msg.messageType === 'NewMember') && recipientName ? true : false,
          attachmentUrl: msg.attachmentUrl,
          eventDate: msg.date, // Store event/meeting date
          createdBy: msg.createdBy,
          recipientMemberId: recipientMemberId, // May be null, will fetch when responding
          recipientName: recipientName || msg.content,
        };

        console.log('Created message notification:', {
          id: notificationObj.id,
          messageType: notificationObj.messageType,
          canRespond: notificationObj.canRespond,
          recipientMemberId: notificationObj.recipientMemberId,
          recipientName: notificationObj.recipientName
        });

        newNotifications.push(notificationObj);
      });
    }

    // Set notifications and count
    setNotifications(newNotifications);
    setNotificationCount(newNotifications.filter(n => !n.isRead).length);

    console.log('UserDashboard - Set notifications from API:', newNotifications.length);
    console.log('UserDashboard - Notification count:', newNotifications.filter(n => !n.isRead).length);

  } catch (error) {
    console.error('UserDashboard - Error loading dashboard reminders:', error);
    setNotifications([]);
    setNotificationCount(0);
  }
};

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardReminders(); // Reload notifications
    if (userData?.memberId) {
      await fetchMemberStats(userData.memberId, selectedPeriod === 'all' ? null : selectedPeriod);
    } else {
      await loadUserData();
    }
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
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
      Alert.alert('Error', 'Could not find your member ID. Please try again.');
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
        'Member Not Found',
        `Could not find member ID for ${notification.recipientName}. Please try again later.`
      );
      return;
    }
    
    Alert.alert(
      'Send Birthday Wishes',
      `Send birthday wishes to ${notification.recipientName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
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
                
                let errorMessage = 'Failed to send birthday wish. Please try again.';
                
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
                'Success',
                `Birthday wishes sent to ${notification.recipientName}! 🎉`,
                [{ text: 'OK' }]
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
              Alert.alert('Error', `An error occurred: ${error.message || 'Unknown error'}`);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  } catch (error) {
    console.error('Error in handleBirthdayResponse:', error);
    Alert.alert('Error', 'Failed to process birthday wish request.');
  }
};

  // Handle meeting response
  const handleMeetingResponse = (notification) => {
    Alert.alert(
      'Meeting Response',
      `Respond to "${notification.meetingTitle}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: () => {
            // Here you would call your API to accept meeting
            Alert.alert('Success', 'Meeting accepted!');
            markNotificationAsRead(notification.id);
          },
        },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: () => {
            // Here you would call your API to decline meeting
            Alert.alert('Success', 'Meeting declined.');
            markNotificationAsRead(notification.id);
          },
        },
      ]
    );
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
      } else if (notification.type === 'meeting') {
        console.log('Handling meeting response');
        handleMeetingResponse(notification);
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
        Alert.alert('Error', 'Could not find your member ID. Please try again.');
        return;
      }

      const isBirthday = notification.messageType === 'Birthday';
      const wishType = isBirthday ? 'Birthday Wishes' : 'Welcome Wishes';
      const recipientName = notification.recipientName || 'member';
      
      // Fetch the actual member ID by name if not already set
      let recipientMemberId = notification.recipientMemberId;
      
      if (!recipientMemberId && recipientName) {
        console.log('Fetching member ID for:', recipientName);
        try {
          const response = await fetch(`${API_BASE_URL}/api/Members`);
          if (response.ok) {
            const members = await response.json();
            const member = members.find(m => m.name === recipientName);
            if (member) {
              recipientMemberId = member.id;
              console.log('Found member ID:', recipientMemberId);
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
                  setLoading(false);
                  return;
                }

                const result = await response.json();
                console.log(`${wishType} sent successfully:`, result);
                
                // Mark notification as read
                markNotificationAsRead(notification.id);
                
                Alert.alert(
                  'Success',
                  `${wishType} sent to ${recipientName}! 🎉`,
                  [{ text: 'OK' }]
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
            <Text style={styles.statLabel}>{label}</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animatable.View>
  );

  const MenuButton = ({ icon, label, onPress, badge, color = waterBlueColors.primary, delay = 0 }) => (
    <Animatable.View
      animation="fadeInUp"
      delay={delay}
      style={styles.menuButtonWrapper}
    >
      <TouchableOpacity style={styles.menuButton} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.menuButtonContent}>
          <LinearGradient
            colors={[waterBlueColors.lightest, waterBlueColors.light]}
            style={styles.menuIconContainer}
          >
            <Icon name={icon} size={20} color={waterBlueColors.primary} />
            {badge && (
              <View style={styles.menuBadge}>
                <Text style={styles.menuBadgeText}>{badge}</Text>
              </View>
            )}
          </LinearGradient>
          <Text style={styles.menuLabel}>{label}</Text>
          <Icon name="chevron-right" size={16} color="#999" />
        </View>
      </TouchableOpacity>
    </Animatable.View>
  );

  const getPeriodLabel = () => {
    const period = periods.find(p => p.id === selectedPeriod);
    return period ? period.label : 'All Time';
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
            {/* Settings Icon */}
            <TouchableOpacity
              style={styles.settingsIconButton}
              onPress={() => navigation.navigate('SettingsScreen')}
            >
              <Icon name="cog" size={22} color="#FFF" />
            </TouchableOpacity>

            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>{greeting}</Text>
              <Text style={styles.headerSubtitle}>Welcome to Alaigal</Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
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
                style={[styles.headerActionButton, { marginLeft: 8 }]}
              >
                <Icon name="logout" size={22} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Enhanced Member Info Card - My Card Style */}
          <Animatable.View
            animation="fadeIn"
            delay={200}
            style={styles.memberInfoCard}
          >
            <View style={styles.memberInfoContent}>
              {/* Left: Avatar and Name */}
              <View style={styles.memberInfoLeft}>
                <LinearGradient
                  colors={[waterBlueColors.light, waterBlueColors.primary]}
                  style={styles.memberAvatar}
                >
                  <Icon name="account" size={28} color="#FFF" />
                </LinearGradient>

                <View style={styles.memberNameSection}>
                  <Text style={styles.memberName}>{userData?.fullName || 'Member'}</Text>
                  <View style={styles.memberTypeContainer}>
                    <Icon name="shield-account" size={12} color={waterBlueColors.primary} />
                    <Text style={styles.memberTypeLabel}>{userData?.memberType || 'Member'}</Text>
                  </View>
                </View>
              </View>

              {/* Right: Member ID Badge */}
              <View style={styles.memberInfoRight}>
                {userData?.memberId && (
                  <View style={styles.memberIdCard}>
                    <Icon name="id-card" size={14} color={waterBlueColors.primary} />
                    <View style={styles.memberIdInfo}>
                      <Text style={styles.memberIdLabel}>ID</Text>
                      <Text style={styles.memberIdValue}>{userData.memberId}</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </Animatable.View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={waterBlueColors.primary}
            colors={[waterBlueColors.primary]}
          />
        }
      >
        {/* Loading Indicator */}
        {loading && !refreshing && (
          <Animatable.View animation="fadeIn" style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={waterBlueColors.primary} />
              <Text style={styles.loadingText}>Loading your dashboard...</Text>
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
              <Text style={styles.notificationCardTitle}>🔔 Recent Notifications</Text>
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
                    <Icon name={notification.icon} size={18} color={notification.color} />
                  </View>
                  <View style={styles.notificationSwipeContent}>
                    <Text style={styles.notificationSwipeTitle} numberOfLines={2}>
                      {notification.title}
                    </Text>
                    <Text style={styles.notificationSwipeMessage} numberOfLines={2}>
                      {notification.message}
                    </Text>
                    <Text style={styles.notificationSwipeTime}>
                      {notification.time}
                    </Text>
                    {notification.canRespond && (
                      <View style={styles.respondBadge}>
                        <Text style={styles.respondBadgeText}>Tap to respond</Text>
                      </View>
                    )}
                  </View>
                  {!notification.isRead && (
                    <View style={styles.swipeUnreadIndicator} />
                  )}
                </TouchableOpacity>
              ))}

              {/* Add more notifications card */}
              <TouchableOpacity
                style={styles.moreNotificationsCard}
                onPress={() => setShowNotifications(true)}
              >
                <Icon name="plus-circle" size={24} color={waterBlueColors.primary} />
                <Text style={styles.moreNotificationsText}>View More</Text>
              </TouchableOpacity>
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
            <Text style={styles.sectionTitle}>📊 My Activity</Text>

            {/* Period Selector Dropdown */}
            <View style={styles.periodSelectorContainer}>
              <TouchableOpacity
                style={styles.periodSelectorButton}
                onPress={() => setShowPeriodDropdown(!showPeriodDropdown)}
                activeOpacity={0.7}
              >
                <Icon name="calendar" size={18} color={waterBlueColors.primary} />
                <Text style={styles.periodSelectorText}>{getPeriodLabel()}</Text>
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
                        selectedPeriod === period.id && styles.periodDropdownTextSelected
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

          {/* Period Indicator */}
          <View style={styles.periodIndicator}>
            <Text style={styles.periodIndicatorText}>
              Showing data for: <Text style={styles.periodIndicatorValue}>{getPeriodLabel()}</Text>
            </Text>
          </View>

          {/* Activity Cards with Water Theme */}
          <View style={styles.statsGrid}>
            <StatCard
              icon="account-arrow-right"
              label="Referrals Given"
              value={stats.referralGiven}
              delay={100}
              onPress={() => navigation.navigate('MyFeed', { tab: 'referral', referralTab: 'give' })}
            />
            <StatCard
              icon="account-arrow-left"
              label="Referrals Received"
              value={stats.referralReceived}
              delay={150}
              onPress={() => navigation.navigate('MyFeed', { tab: 'referral', referralTab: 'my' })}
            />
            <StatCard
              icon="handshake"
              label="ThanksNote Given"
              value={stats.tyfcbGiven}
              delay={200}
              onPress={() => navigation.navigate('MyFeed', { tab: 'tyfcb' })}
            />
            <StatCard
              icon="hand-heart"
              label="ThanksNote Received"
              value={stats.tyfcbReceived}
              delay={250}
              onPress={() => navigation.navigate('MyFeed', { tab: 'tyfcb' })}
            />
            <StatCard
              icon="school"
              label="CEUs"
              value={stats.ceusCount}
              delay={300}
              onPress={() => Alert.alert('Coming Soon', 'View CEU details')}
            />
            <StatCard
              icon="account-multiple"
              label="Visitors"
              value={stats.visitorsCount}
              delay={350}
              onPress={() => navigation.navigate('Visitors')}
            />
          </View>
        </Animatable.View>

        {/* Revenue Summary Card with Period Info */}
        <Animatable.View
          animation="fadeInUp"
          delay={400}
          style={styles.revenueSection}
        >
          <LinearGradient
            colors={[waterBlueColors.primary, waterBlueColors.dark]}
            style={styles.revenueCard}
          >
            <View style={styles.revenueContent}>
              <View style={styles.revenueIcon}>
                <Icon name="currency-inr" size={30} color="#FFF" />
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
          </LinearGradient>
        </Animatable.View>

        {/* Birthday Wishes Received Section */}
        <BirthdayWishesSection memberId={userData?.memberId} />

        {/* Quick Actions */}
        <Animatable.View
          animation="fadeInUp"
          delay={600}
          style={styles.sectionContainer}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
          </View>

          <LinearGradient
            colors={['#F0F9FF', '#FFFFFF']}
            style={styles.menuContainer}
          >
            <View style={styles.menuGrid}>
              <MenuButton
                icon="timeline-text"
                label="My Activity Log"
                onPress={() => navigation.navigate('MyFeed')}
                delay={100}
              />
              <MenuButton
                icon="account-group"
                label="Members Directory"
                onPress={() => navigation.navigate('MembersDirectory')}
                delay={150}
              />
              <MenuButton
                icon="account-arrow-right"
                label="Referral"
                onPress={() => navigation.navigate('ReferralSlip')}
                delay={200}
              />
              <MenuButton
                icon="handshake"
                label="Thanks Note"
                onPress={() => navigation.navigate('TYFCBSlip')}
                delay={250}
              />
              <MenuButton
                icon="calendar-account"
                label="1:1 Meetings"
                onPress={() => navigation.navigate('OneToOneSlip')}
                delay={300}
              />
              <MenuButton
                icon="account-plus"
                label="Visitors"
                onPress={() => navigation.navigate('Visitors')}
                delay={350}
              />
              <MenuButton
                icon="credit-card"
                label="Payments"
                onPress={() => navigation.navigate('MyPayments')}
                delay={400}
              />
              <MenuButton
                icon="lock-reset"
                label="Change Password"
                onPress={() => navigation.navigate('ChangePassword')}
                delay={450}
              />
            </View>
          </LinearGradient>
        </Animatable.View>

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
              <Text style={styles.infoTitle}>Welcome to Alaigal!</Text>
              <Text style={styles.infoText}>
                Connect with members, give referrals, and grow your business together in our professional network.
                {userData?.memberId ? ` Member ID: ${userData.memberId}` : ' Member ID: Not assigned'}
              </Text>
              <Text style={styles.infoPeriod}>
                Currently viewing: {getPeriodLabel()} statistics
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
              <Text style={styles.modalTitle}>👤 Member Details</Text>
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
                      <Text style={styles.modalMemberId}>Member ID: {userData.memberId}</Text>
                    </View>
                  )}

                  <Text style={styles.modalUserRole}>{userData?.memberType || 'Alaigal Network Member'}</Text>
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
                  <Text style={styles.settingsOptionText}>Language</Text>
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
                          Alert.alert('Language', `${lang.name} selected`);
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
                  <Text style={styles.settingsOptionText}>Privacy & Security</Text>
                  <Icon name={showPrivacySettings ? "chevron-up" : "chevron-down"} size={20} color="#999" />
                </TouchableOpacity>

                {showPrivacySettings && (
                  <View style={styles.inlineSettingsContainer}>
                    <TouchableOpacity style={styles.privacyOption}>
                      <Text style={styles.privacyOptionText}>Two-Factor Authentication</Text>
                      <Text style={styles.privacyOptionStatus}>Disabled</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.privacyOption}>
                      <Text style={styles.privacyOptionText}>Login Notifications</Text>
                      <Text style={styles.privacyOptionStatus}>Enabled</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.privacyOption}>
                      <Text style={styles.privacyOptionText}>Data Privacy</Text>
                      <Text style={styles.privacyOptionStatus}>View Settings</Text>
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
                  <Text style={styles.settingsOptionText}>Change Password</Text>
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
                  <Text style={styles.settingsOptionText}>Edit Profile</Text>
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

            <ScrollView style={styles.notificationsList} showsVerticalScrollIndicator={false}>
              {notifications.length === 0 ? (
                <View style={styles.emptyNotifications}>
                  <Icon name="bell-off" size={48} color="#BDC3C7" />
                  <Text style={styles.emptyNotificationsText}>No notifications</Text>
                  <Text style={styles.emptyNotificationsSubtext}>You're all caught up!</Text>
                </View>
              ) : (
                notifications.map((notification) => (
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
                      {notification.canRespond && (
                        <View style={styles.respondButton}>
                          <Icon name="reply" size={14} color={waterBlueColors.primary} />
                          <Text style={styles.respondButtonText}>Tap to respond</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            {/* Notification Categories */}
            <View style={styles.notificationCategories}>
              <Text style={styles.categoriesTitle}>Quick Filters</Text>
              <View style={styles.categoriesRow}>
                <TouchableOpacity style={[styles.categoryChip, { backgroundColor: '#FFE5E5' }]}>
                  <Icon name="cake" size={16} color="#FF6B6B" />
                  <Text style={[styles.categoryText, { color: '#FF6B6B' }]}>Birthdays</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.categoryChip, { backgroundColor: '#E8F8F7' }]}>
                  <Icon name="calendar-clock" size={16} color="#4ECDC4" />
                  <Text style={[styles.categoryText, { color: '#4ECDC4' }]}>Meetings</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.categoryChip, { backgroundColor: '#E3F2FD' }]}>
                  <Icon name="information" size={16} color="#45B7D1" />
                  <Text style={[styles.categoryText, { color: '#45B7D1' }]}>Admin</Text>
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
    height: 180, // Reduced height for single line layout
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    height: 180, // Reduced height
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
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  headerSubtitle: {
    fontSize: 14,
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
    alignItems: 'center',
    marginBottom: 15,
    position: 'relative',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2C3E50',
  },
  // Period Selector Styles
  periodSelectorContainer: {
    position: 'relative',
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
  },
  periodSelectorText: {
    fontSize: 13,
    color: waterBlueColors.primary,
    fontWeight: '600',
    marginHorizontal: 8,
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
  },
  periodDropdownTextSelected: {
    color: waterBlueColors.primary,
    fontWeight: '600',
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
  },
  periodIndicatorValue: {
    color: waterBlueColors.primary,
    fontWeight: '600',
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
    fontSize: 11,
    color: '#357ABD',
    fontWeight: '600',
    textAlign: 'center',
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
  },
  infoText: {
    fontSize: 13,
    color: '#357ABD',
    lineHeight: 20,
  },
  infoPeriod: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 6,
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
  notificationDotText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  notificationCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  notificationCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  notificationCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C3E50',
  },
  viewAllNotifications: {
    fontSize: 11,
    color: '#4A90E2',
    fontWeight: '600',
  },
  notificationScrollView: {
    marginHorizontal: -16,
  },
  notificationScrollContent: {
    paddingHorizontal: 16,
  },
  notificationSwipeCard: {
    width: 200,
    backgroundColor: '#F8FBFF',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E8F1FF',
    position: 'relative',
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
    fontSize: 13,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
    lineHeight: 16,
  },
  notificationSwipeMessage: {
    fontSize: 11,
    color: '#5D6D7E',
    lineHeight: 14,
    marginBottom: 6,
  },
  notificationSwipeTime: {
    fontSize: 10,
    color: '#95A5A6',
    fontWeight: '500',
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
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B6B',
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
});

export default UserDashboard;