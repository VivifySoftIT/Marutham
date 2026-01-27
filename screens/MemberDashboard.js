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
  Dimensions,
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

const { width } = Dimensions.get('window');

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
  const [totalMembers, setTotalMembers] = useState(0);
  const [activeMembers, setActiveMembers] = useState(0);
  const [pendingPayments, setPendingPayments] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState('₹0');
  const [accountName, setAccountName] = useState('Admin User');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  // For swipeable sections
  const [activeStatIndex, setActiveStatIndex] = useState(0);
  const [activeQuickActionIndex, setActiveQuickActionIndex] = useState(0);

  const statsScrollRef = useRef(null);
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

  // Set greeting based on time
  useEffect(() => {
    const currentHour = new Date().getHours();
    let newGreeting = '';
    let newQuote = '';

    if (currentHour < 12) {
      newGreeting = t('goodMorning');
      newQuote = t('startYourDay');
    } else if (currentHour < 18) {
      newGreeting = t('goodAfternoon');
      newQuote = t('keepMomentum');
    } else {
      newGreeting = t('goodEvening');
      newQuote = t('reflectAchievements');
    }

    setGreeting(newGreeting);
    setQuote(newQuote);

    loadDashboardData();
  }, [t]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      console.log('Loading dashboard data...');

      const token = await AsyncStorage.getItem('token') ||
        await AsyncStorage.getItem('jwt_token') ||
        await AsyncStorage.getItem('authToken');

      // Check if we have a token
      if (!token) {
        console.log('No authentication token found');
        setDemoData();
        return;
      }

      const response = await fetch('https://www.vivifysoft.in/AlaigalBE/api/Inventory/dashboard-summary', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('Dashboard API Status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Dashboard API Error:', errorText);
        setDemoData();
        return;
      }

      const data = await response.json();
      console.log('Dashboard API Data:', data);

      if (data) {
        setTotalMembers(data.totalMembers || 0);
        setActiveMembers(data.activeMembers || 0);
        setPendingPayments(data.membersWithPaymentDue || 0);

        const revenue = await fetchTotalRevenue();
        setTotalRevenue(revenue);
      } else {
        setDemoData();
      }

      // Load notifications
      await loadNotifications();
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setDemoData();
      Alert.alert(
        'Info',
        'Using demo data. API connection failed. Please check your network and API configuration.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load notifications from API (same as UserDashboard)
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

      // Load dashboard reminders and message notifications separately with error handling
      let reminders = null;
      let messageNotifications = null;

      try {
        reminders = await ApiService.getDashboardReminders(memberId);
        console.log('MemberDashboard - Dashboard reminders:', reminders);
      } catch (error) {
        console.error('MemberDashboard - Error loading dashboard reminders:', error);
      }

      try {
        messageNotifications = await ApiService.getMessageNotificationReport(null, 'daily', memberId);
        console.log('MemberDashboard - Message notifications response:', messageNotifications);
        
        // Extract data array from response
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

      // Convert reminders to notifications format
      const newNotifications = [];

      // Add birthday notifications
      if (reminders && reminders.teamBirthdays && reminders.teamBirthdays.length > 0) {
        reminders.teamBirthdays.forEach((birthday, index) => {
          newNotifications.push({
            id: `birthday-${birthday.name}-${index}`,
            type: 'birthday',
            title: 'Birthday Reminder',
            message: birthday.isToday
              ? `${birthday.name}'s birthday is today! 🎉`
              : `${birthday.name}'s birthday in ${birthday.daysUntil} day${birthday.daysUntil > 1 ? 's' : ''}`,
            time: birthday.isToday ? 'Today' : `In ${birthday.daysUntil} day${birthday.daysUntil > 1 ? 's' : ''}`,
            icon: 'cake',
            color: '#FF6B6B',
            backgroundColor: '#FFE5E5',
            isRead: false,
          });
        });
      }

      // Add meeting notifications
      if (reminders && reminders.upcomingMeetings && reminders.upcomingMeetings.length > 0) {
        reminders.upcomingMeetings.forEach((meeting) => {
          newNotifications.push({
            id: `meeting-${meeting.id}`,
            type: 'meeting',
            title: 'Meeting Reminder',
            message: meeting.isToday
              ? `${meeting.meetingTitle || 'Meeting'} today at ${meeting.time}`
              : `${meeting.meetingTitle || 'Meeting'} on ${meeting.date} at ${meeting.time}`,
            time: meeting.isToday ? 'Today' : meeting.date,
            icon: 'calendar-clock',
            color: '#4ECDC4',
            backgroundColor: '#E8F8F7',
            isRead: false,
          });
        });
      }

      // Add message notifications from API
      if (messageNotifications && messageNotifications.length > 0) {
        messageNotifications.forEach((msg) => {
          // Map message types to notification config
          const notificationTypeMap = {
            'Payment': { icon: 'credit-card-alert', color: '#FFA726', backgroundColor: '#FFF3E0' },
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

          newNotifications.push({
            id: `message-${msg.id}`,
            type: 'message',
            messageType: msg.messageType,
            title: msg.subject || `${msg.messageType} Notification`,
            message: notificationMessage,
            time: msg.createdDate ? new Date(msg.createdDate).toLocaleDateString() : 'Recent',
            icon: typeConfig.icon,
            color: typeConfig.color,
            backgroundColor: typeConfig.backgroundColor,
            isRead: false,
            eventDate: msg.date, // Store event/meeting date
            createdBy: msg.createdBy,
            attachmentUrl: msg.attachmentUrl,
          });
        });
      }

      // Update notifications state
      if (newNotifications.length > 0) {
        setNotifications(newNotifications);
        setNotificationCount(newNotifications.filter(n => !n.isRead).length);
        console.log('MemberDashboard - Loaded notifications:', newNotifications.length);
      } else {
        // Keep empty state if no notifications
        setNotifications([]);
        setNotificationCount(0);
        console.log('MemberDashboard - No notifications available');
      }
    } catch (error) {
      console.error('MemberDashboard - Error loading notifications:', error);
    }
  };

  const setDemoData = () => {
    setTotalMembers(125);
    setActiveMembers(98);
    setPendingPayments(27);
    setTotalRevenue('₹2,45,500');
  };

  // Function to fetch total revenue
  const fetchTotalRevenue = async () => {
    try {
      return '₹2,45,500';
    } catch (error) {
      console.error('Error fetching revenue:', error);
      return '₹0';
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  // Handle stats scroll
  const handleStatsScroll = (event) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(contentOffsetX / 120);
    setActiveStatIndex(newIndex);
  };

  // Handle quick actions scroll
  const handleQuickActionsScroll = (event) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(contentOffsetX / 120);
    setActiveQuickActionIndex(newIndex);
  };

  // Dashboard modules
  const modules = [
    {
      id: 'add-member',
      title: 'Add New Member',
      icon: 'account-plus',
      description: 'Register new members',
      action: () => navigation.navigate('NewMember'),
      badge: null,
    },
    {
      id: 'members',
      title: 'Members List',
      icon: 'account-group',
      description: 'View all members',
      action: () => navigation.navigate('MembersList'),
      badge: totalMembers,
    },
    {
      id: 'payment',
      title: 'Payment Details',
      icon: 'credit-card-multiple',
      description: 'Payment records & history',
      action: () => navigation.navigate('PaymentDetails'),
      badge: pendingPayments,
    },
    {
      id: 'attendance',
      title: 'Attendance',
      icon: 'calendar-check',
      description: 'Member attendance records',
      action: () => navigation.navigate('Attendance'),
      badge: null,
    },
    {
      id: 'reports',
      title: 'Reports',
      icon: 'chart-bar',
      description: 'Generate reports',
      action: () => navigation.navigate('Reports'),
      badge: null,
    },
    {
      id: 'messages',
      title: 'Messages',
      icon: 'message-text',
      description: 'Send notifications',
      action: () => navigation.navigate('Messages'),
      badge: 3,
    },
  ];

  const quickActions = [
    {
      id: 'send-notice',
      icon: 'bullhorn',
      title: 'Broadcast',
      action: () => navigation.navigate('SendNotice'),
    },
    {
      id: 'generate-report',
      icon: 'file-document',
      title: 'Quick Report',
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

  const statsData = [
    { icon: 'account-group', value: totalMembers, label: 'Total Members' },
    { icon: 'account-check', value: activeMembers, label: 'Active' },
    { icon: 'alert-circle', value: pendingPayments, label: 'Dues Outstanding' },
  ];

  const handleModulePress = (module) => {
    module.action();
  };

  const handleQuickAction = (action) => {
    action.action();
  };

  const StatCard = ({ icon, value, label, delay, index }) => (
    <Animatable.View
      animation="fadeInUp"
      delay={delay}
      style={[
        styles.statCard,
        activeStatIndex === index && styles.activeStatCard
      ]}
    >
      <View style={styles.statCardContent}>
        <View style={[styles.statIconContainer, { backgroundColor: `${waterBlueColors.primary}15` }]}>
          <Icon name={icon} size={18} color={waterBlueColors.primary} />
        </View>
        <Text style={styles.statNumber}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </Animatable.View>
  );

  const QuickActionCard = ({ action, index }) => {
    // All quick actions now use card-style design with consistent colors
    const getActionColors = () => {
      // All actions get gradient colors for card-like appearance
      if (action.id === 'send-notice') {
        return [waterBlueColors.primary, waterBlueColors.dark];
      } else if (action.id === 'generate-report') {
        return ['#5DADE2', waterBlueColors.primary];
      } else {
        return [waterBlueColors.light, '#5DADE2'];
      }
    };

    return (
      <TouchableOpacity
        style={[
          styles.quickActionCard,
          activeQuickActionIndex === index && styles.activeQuickActionCard
        ]}
        onPress={() => handleQuickAction(action)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={getActionColors()}
          style={styles.quickActionGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.quickActionIconContainer}>
            <Icon name={action.icon} size={20} color="#FFF" />
          </View>
          <Text style={styles.quickActionText}>{action.title}</Text>
        </LinearGradient>
      </TouchableOpacity>
    );
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
              <Text style={styles.headerTitle}>{greeting}, {accountName}</Text>
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

          {/* Stats Cards - Swipeable */}
          {loading ? (
            <View style={styles.loadingStats}>
              <ActivityIndicator size="small" color="#FFF" />
              <Text style={styles.loadingText}>Loading stats...</Text>
            </View>
          ) : (
            <View style={styles.statsContainer}>
              <ScrollView
                ref={statsScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.statsScrollView}
                contentContainerStyle={styles.statsContent}
                onScroll={handleStatsScroll}
                scrollEventThrottle={16}
                pagingEnabled
                snapToInterval={120}
                decelerationRate="fast"
              >
                {statsData.map((stat, index) => (
                  <StatCard
                    key={stat.label}
                    icon={stat.icon}
                    value={stat.value}
                    label={stat.label}
                    delay={100 * index}
                    index={index}
                  />
                ))}
              </ScrollView>

              {/* Stats Indicators */}
              <View style={styles.indicatorsContainer}>
                {statsData.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.indicator,
                      activeStatIndex === index && styles.activeIndicator
                    ]}
                  />
                ))}
              </View>
            </View>
          )}
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
        {/* Welcome Card */}
        <Animatable.View
          animation="fadeIn"
          delay={500}
          style={styles.welcomeCard}
        >
          <LinearGradient
            colors={[waterBlueColors.lightest, '#F5FBFF']}
            style={styles.welcomeCardGradient}
          >
            <View style={styles.welcomeContent}>
              <Text style={styles.welcomeTitle}>👋 {t('welcomeBack')}!</Text>
              <Text style={styles.welcomeText}>{quote}</Text>
            </View>
            <View style={styles.welcomeIcon}>
              <TouchableOpacity onPress={() => setShowNotifications(true)}>
                <Icon name="hand-wave" size={36} color={waterBlueColors.primary} />
                {notificationCount > 0 && (
                  <View style={styles.welcomeNotificationDot}>
                    <Text style={styles.welcomeNotificationText}>{notificationCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animatable.View>

        {/* Swipeable Notifications Card - Only show if there are notifications */}
        {notifications.length > 0 && (
          <Animatable.View
            animation="fadeInUp"
            delay={600}
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
              {notifications.slice(0, 5).map((notification, index) => (
                <TouchableOpacity
                  key={notification.id}
                  style={[
                    styles.notificationSwipeCard,
                    !notification.isRead && styles.unreadNotificationCard
                  ]}
                  onPress={() => markNotificationAsRead(notification.id)}
                  activeOpacity={0.8}
                >
                  <View style={[
                    styles.notificationSwipeIcon,
                    { backgroundColor: notification.backgroundColor }
                  ]}>
                    <Icon name={notification.icon} size={18} color={notification.color} />
                  </View>
                  <View style={styles.notificationSwipeContent}>
                    <Text style={styles.notificationSwipeTitle} numberOfLines={1}>
                      {notification.title}
                    </Text>
                    <Text style={styles.notificationSwipeMessage} numberOfLines={1}>
                      {notification.message}
                    </Text>
                    <Text style={styles.notificationSwipeTime}>
                      {notification.time}
                    </Text>
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
            <Text style={styles.sectionTitle}>📊 Management Modules</Text>
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
                      {module.badge !== null && (
                        <View style={[styles.badge, { backgroundColor: waterBlueColors.primary }]}>
                          <Text style={styles.badgeText}>{module.badge}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.moduleTitle}>{module.title}</Text>
                    <Text style={styles.moduleDescription}>{module.description}</Text>
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
                <Icon name="account-plus" size={18} color={waterBlueColors.primary} />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>New member registered</Text>
                <Text style={styles.activityTimeText}>10:30 AM</Text>
              </View>
            </View>
            <View style={styles.activityItem}>
              <View style={[styles.activityIcon, { backgroundColor: `${waterBlueColors.primary}15` }]}>
                <Icon name="cash-check" size={18} color={waterBlueColors.primary} />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>Payment received</Text>
                <Text style={styles.activityTimeText}>09:15 AM</Text>
              </View>
            </View>
          </View>
        </Animatable.View>
      </ScrollView>

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
                    onPress={() => markNotificationAsRead(notification.id)}
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
                <TouchableOpacity style={[styles.categoryChip, { backgroundColor: '#FFF3E0' }]}>
                  <Icon name="credit-card" size={16} color="#FFA726" />
                  <Text style={[styles.categoryText, { color: '#FFA726' }]}>Payments</Text>
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
    backgroundColor: '#F0F4F8',
  },
  headerGradient: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 10,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    height: 180,
  },
  header: {
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 16,
    height: 180,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    height: 40,
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
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    lineHeight: 24,
    minHeight: 24,
  },
  loadingStats: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 85,
  },
  loadingText: {
    color: '#FFF',
    fontSize: 12,
    marginTop: 8,
  },
  statsContainer: {
    marginTop: 10,
  },
  statsScrollView: {
    marginHorizontal: -8,
  },
  statsContent: {
    paddingHorizontal: 16,
  },
  statCard: {
    width: 110,
    height: 85,
    marginRight: 10,
    borderRadius: 12,
    backgroundColor: '#FFF',
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
    borderWidth: 1,
    borderColor: '#E8F0FE',
  },
  activeStatCard: {
    opacity: 1,
    transform: [{ scale: 1 }],
    elevation: 4,
    shadowColor: waterBlueColors.primary,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    borderColor: waterBlueColors.primary,
  },
  statCardContent: {
    padding: 12,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: '#666',
    fontWeight: '600',
    lineHeight: 12,
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
  welcomeTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#1A2332',
    marginBottom: 6,
    lineHeight: 24,
    minHeight: 24,
  },
  welcomeText: {
    fontSize: 13,
    color: '#5D6D7E',
    lineHeight: 19,
    fontWeight: '500',
    minHeight: 19,
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
  notificationCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    elevation: 6,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    height: 155,
  },
  notificationCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  notificationCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A2332',
  },
  viewAllNotifications: {
    fontSize: 12,
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
    width: 180, // Decreased from 200
    backgroundColor: '#F8FBFF',
    borderRadius: 12,
    padding: 10, // Reduced from 12
    marginRight: 8, // Reduced from 12
    borderWidth: 1,
    borderColor: '#E8F1FF',
    position: 'relative',
    height: 80, // Decreased from auto
  },
  unreadNotificationCard: {
    backgroundColor: '#F0F7FF',
    borderColor: '#4A90E2',
    borderWidth: 1.5,
  },
  notificationSwipeIcon: {
    width: 28, // Decreased from 32
    height: 28, // Decreased from 32
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6, // Reduced from 8
  },
  notificationSwipeContent: {
    flex: 1,
  },
  notificationSwipeTitle: {
    fontSize: 12, // Decreased from 13
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 2, // Reduced from 4
    lineHeight: 14, // Reduced from 16
    minHeight: 14,
  },
  notificationSwipeMessage: {
    fontSize: 10, // Decreased from 11
    color: '#5D6D7E',
    lineHeight: 12, // Reduced from 14
    marginBottom: 4, // Reduced from 6
    minHeight: 12,
  },
  notificationSwipeTime: {
    fontSize: 9, // Decreased from 10
    color: '#95A5A6',
    fontWeight: '500',
  },
  swipeUnreadIndicator: {
    position: 'absolute',
    top: 6, // Reduced from 8
    right: 6, // Reduced from 8
    width: 6, // Reduced from 8
    height: 6, // Reduced from 8
    borderRadius: 3, // Reduced from 4
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
    lineHeight: 22,
    minHeight: 22,
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
    width: 110,
    height: 110,
    marginRight: 10,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  activeQuickActionCard: {
    opacity: 1,
    transform: [{ scale: 1 }],
    elevation: 8,
    shadowColor: waterBlueColors.primary,
    shadowOpacity: 0.25,
  },
  quickActionGradient: {
    padding: 16,
    alignItems: 'center',
    borderRadius: 14,
    height: '100%',
    justifyContent: 'center',
    minHeight: 110,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    lineHeight: 17,
    minHeight: 17,
    flexShrink: 0,
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8F0FE',
    elevation: 3,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    minHeight: 105, // Increased from 100 to accommodate Tamil text better
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
    fontSize: 13,
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
  notificationsList: {
    maxHeight: 400,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10, // Reduced from 16
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    borderRadius: 8,
    marginBottom: 4,
    minHeight: 70, // Added min height
  },
  unreadNotificationItem: {
    backgroundColor: '#F8FBFF',
    borderLeftWidth: 3,
    borderLeftColor: '#4A90E2',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  unreadIndicator: {
    width: 6, // Reduced from 8
    height: 6, // Reduced from 8
    borderRadius: 3, // Reduced from 4
    backgroundColor: '#FF6B6B',
  },
  unreadNotificationTitle: {
    fontWeight: '700',
    color: '#2C3E50',
  },
  notificationItemMessage: {
    fontSize: 12, // Reduced from 13
    color: '#5D6D7E',
    lineHeight: 16, // Reduced from 18
    marginBottom: 4,
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
  notificationItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  notificationItemTime: {
    fontSize: 12,
    color: '#95A5A6',
  },
});

export default MemberDashboard;