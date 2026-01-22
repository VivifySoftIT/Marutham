import React, { useState, useEffect } from 'react';
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
import ApiService from '../service/api'; // Import your API service
import { useLanguage } from '../service/LanguageContext';

const { width } = Dimensions.get('window');

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
  const [notificationCount, setNotificationCount] = useState(3);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'birthday',
      title: 'Birthday Reminder',
      message: 'John Doe\'s birthday is today! 🎉',
      time: '09:00 AM Today',
      icon: 'cake',
      color: '#FF6B6B',
      backgroundColor: '#FFE5E5',
      isRead: false,
    },
    {
      id: 2,
      type: 'meeting',
      title: 'Meeting Reminder',
      message: 'Monthly board meeting at 2:00 PM',
      time: '1 hour ago',
      icon: 'calendar-clock',
      color: '#4ECDC4',
      backgroundColor: '#E8F8F7',
      isRead: false,
    },
    {
      id: 3,
      type: 'admin',
      title: 'Admin Notice',
      message: 'New safety protocols have been updated',
      time: '2 hours ago',
      icon: 'information',
      color: '#45B7D1',
      backgroundColor: '#E3F2FD',
      isRead: false,
    },
    {
      id: 4,
      type: 'payment',
      title: 'Payment Notification',
      message: '5 members have pending payments due',
      time: '3 hours ago',
      icon: 'credit-card-alert',
      color: '#FFA726',
      backgroundColor: '#FFF3E0',
      isRead: true,
    },
    {
      id: 5,
      type: 'birthday',
      title: 'Upcoming Birthday',
      message: 'Sarah Wilson\'s birthday is tomorrow',
      time: 'Yesterday',
      icon: 'cake-variant',
      color: '#FF6B6B',
      backgroundColor: '#FFE5E5',
      isRead: true,
    },
  ]);

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
              // Clear all stored data
              await AsyncStorage.removeItem('jwt_token');
              await AsyncStorage.removeItem('token');
              await AsyncStorage.removeItem('authToken');
              await AsyncStorage.removeItem('username');
              await AsyncStorage.removeItem('password');
              
              // Reset navigation to login screen
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
    
    // Update notification count
    const unreadCount = notifications.filter(n => !n.isRead && n.id !== notificationId).length;
    setNotificationCount(unreadCount);
  };

  // Clear all notifications
  const clearAllNotifications = () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, isRead: true })));
    setNotificationCount(0);
  };

  // Water blue color theme
  const waterBlueColors = {
    primary: '#4A90E2',
    light: '#87CEEB',
    lighter: '#B3E0F2',
    lightest: '#E0F7FA',
    dark: '#357ABD',
    darker: '#1E5A96',
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
    
    // Load dashboard data
    loadDashboardData();
  }, [t]);

  // Replace the loadDashboardData function with this:
const loadDashboardData = async () => {
  try {
    setLoading(true);
    console.log('Loading dashboard data...');
    
    // Get auth token
    const token = await AsyncStorage.getItem('token') || 
                  await AsyncStorage.getItem('jwt_token') || 
                  await AsyncStorage.getItem('authToken');
    
    // Call the API directly
    const response = await fetch('https://www.vivifysoft.in/AlaigalBE/api/Inventory/dashboard-summary', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });
    
    console.log('Dashboard API Status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Dashboard API Error:', errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Dashboard API Data:', data);
    
    // Update state with API data
    if (data) {
      setTotalMembers(data.totalMembers || 0);
      setActiveMembers(data.activeMembers || 0);
      setPendingPayments(data.membersWithPaymentDue || 0);
      
      // For total revenue, you might need a separate API call
      const revenue = await fetchTotalRevenue();
      setTotalRevenue(revenue);
    }
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    // Fallback to static data for testing
    setTotalMembers(125);
    setActiveMembers(98);
    setPendingPayments(27);
    setTotalRevenue('₹2,45,500');
    
    Alert.alert(
      'Info', 
      'Using demo data. API connection failed. Please check your network and API configuration.'
    );
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};

  // Function to fetch total revenue (you might need to adjust this based on your API)
  const fetchTotalRevenue = async () => {
    try {
      // If you have an API for total revenue, call it here
      // For example: const response = await ApiService.getTotalRevenue();
      // return `₹${response.totalRevenue.toLocaleString()}`;
      
      // For now, return a static value or calculate from payments
      return '₹2,45,500'; // Replace with actual API call
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

  // Dashboard modules with water blue theme
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
      icon: 'bell-ring', 
      title: 'Send Notice', 
      action: () => navigation.navigate('SendNotice'),
    },
    { 
      id: 'generate-report', 
      icon: 'file-document', 
      title: 'Quick Report', 
      action: () => navigation.navigate('Reports'),
    },
  ];

  // Direct navigation handlers
  const handleModulePress = (module) => {
    module.action();
  };

  const handleQuickAction = (action) => {
    action.action();
  };

  const StatCard = ({ icon, value, label, delay }) => (
    <Animatable.View 
      animation="fadeInUp"
      delay={delay}
      style={styles.statCard}
    >
      <LinearGradient
        colors={[waterBlueColors.lightest, '#F0F9FF']}
        style={styles.statCardGradient}
      >
        <Text style={styles.statNumber}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </LinearGradient>
    </Animatable.View>
  );

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
          
          {/* Stats Cards */}
          {loading ? (
            <View style={styles.loadingStats}>
              <ActivityIndicator size="small" color="#FFF" />
              <Text style={styles.loadingText}>Loading stats...</Text>
            </View>
          ) : (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.statsScrollView}
              contentContainerStyle={styles.statsContent}
            >
              <StatCard 
                icon="account-group" 
                value={totalMembers} 
                label="Total Members"
                delay={100}
              />
              <StatCard 
                icon="account-check" 
                value={activeMembers} 
                label="Active"
                delay={200}
              />
              <StatCard 
                icon="alert-circle" 
                value={pendingPayments} 
                label="Payment Pending"
                delay={300}
              />
             
            </ScrollView>
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
                <Icon name="bell" size={36} color={waterBlueColors.primary} />
                {notificationCount > 0 && (
                  <View style={styles.welcomeNotificationDot}>
                    <Text style={styles.welcomeNotificationText}>{notificationCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animatable.View>

        {/* Swipeable Notifications Card */}
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
                  <Text style={styles.notificationSwipeTitle} numberOfLines={2}>
                    {notification.title}
                  </Text>
                  <Text style={styles.notificationSwipeMessage} numberOfLines={2}>
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

        {/* Quick Actions */}
        <Animatable.View 
          animation="fadeInUp"
          delay={600}
          style={styles.sectionContainer}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
          </View>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={action.id}
                style={styles.quickActionCard}
                onPress={() => handleQuickAction(action)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[waterBlueColors.light, waterBlueColors.primary]}
                  style={styles.quickActionGradient}
                >
                  <View style={styles.quickActionIcon}>
                    <Icon name={action.icon} size={24} color="#FFF" />
                  </View>
                  <Text style={styles.quickActionText}>{action.title}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </Animatable.View>

        {/* Main Modules */}
        <Animatable.View 
          animation="fadeInUp"
          delay={700}
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
          delay={800}
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

      {/* Settings Modal - REMOVED */}
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
    elevation: 6,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    height: 190,
  },
  header: {
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 16,
    height: 190,
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
  },
  loadingStats: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 90,
  },
  loadingText: {
    color: '#FFF',
    fontSize: 12,
    marginTop: 8,
  },
  statsScrollView: {
    marginHorizontal: -16,
  },
  statsContent: {
    paddingHorizontal: 16,
  },
  statCard: {
    width: 130,
    height: 85,
    marginRight: 10,
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  statCardGradient: {
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  welcomeCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    height: 100,
  },
  welcomeCardGradient: {
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '100%',
  },
  welcomeContent: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 6,
  },
  welcomeText: {
    fontSize: 13,
    color: '#5D6D7E',
    lineHeight: 18,
    fontWeight: '500',
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
    borderRadius: 16,
    padding: 16,
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
    marginBottom: 12,
  },
  notificationCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
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
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    width: '48%',
    marginBottom: 10,
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    height: 90,
  },
  quickActionGradient: {
    padding: 14,
    alignItems: 'center',
    borderRadius: 14,
    height: '100%',
    justifyContent: 'center',
  },
  quickActionIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFF',
    textAlign: 'center',
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
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F4FF',
    elevation: 1,
    shadowColor: '#E3F2FD',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    height: 100,
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
  },
  moduleDescription: {
    fontSize: 11,
    color: '#7F8C8D',
    lineHeight: 14,
    fontWeight: '500',
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
  settingsModalOverlay: {
    flex: 1,
  },
  settingsModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  settingsModalContainer: {
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
  settingsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingsModalTitle: {
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
  accountInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FBFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E3F2FD',
  },
  accountAvatar: {
    marginRight: 14,
  },
  avatarGradient: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  accountDetails: {
    flex: 1,
  },
  accountName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 4,
  },
  accountRole: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '600',
    marginBottom: 2,
  },
  accountEmail: {
    fontSize: 12,
    color: '#7F8C8D',
    fontWeight: '500',
  },
  settingsOptions: {
    maxHeight: 280,
  },
  settingsOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  settingsOptionText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    fontWeight: '600',
  },
  notificationBadge: {
    backgroundColor: '#FD79A8',
    borderRadius: 8,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  notificationBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
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