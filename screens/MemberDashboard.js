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

const { width } = Dimensions.get('window');

const MemberDashboard = () => {
  const navigation = useNavigation();
  const [greeting, setGreeting] = useState('');
  const [quote, setQuote] = useState('');
  const [totalMembers, setTotalMembers] = useState(0);
  const [activeMembers, setActiveMembers] = useState(0);
  const [pendingPayments, setPendingPayments] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState('₹0');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [accountName, setAccountName] = useState('Admin User');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
      newGreeting = 'Good Morning';
      newQuote = 'Start your day with energy and purpose!';
    } else if (currentHour < 18) {
      newGreeting = 'Good Afternoon';
      newQuote = 'Keep up the momentum! Great things are happening.';
    } else {
      newGreeting = 'Good Evening';
      newQuote = 'Reflect on your achievements and plan for tomorrow.';
    }
    
    setGreeting(newGreeting);
    setQuote(newQuote);
    
    // Load dashboard data
    loadDashboardData();
  }, []);

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
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => setShowSettingsModal(true)}
            >
              <Icon name="menu" size={24} color="#FFF" />
            </TouchableOpacity>

            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>{greeting}, {accountName}</Text>
            </View>

            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => {
                Alert.alert(
                  'Logout',
                  'Are you sure you want to logout?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Logout', style: 'destructive', onPress: () => navigation.navigate('Login') }
                  ]
                );
              }}
            >
              <Icon name="logout" size={22} color="#FFF" />
            </TouchableOpacity>
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
              <Text style={styles.welcomeTitle}>👋 Welcome Back!</Text>
              <Text style={styles.welcomeText}>{quote}</Text>
            </View>
            <View style={styles.welcomeIcon}>
              <Icon name="star-circle" size={36} color={waterBlueColors.primary} />
            </View>
          </LinearGradient>
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

      {/* Settings Modal */}
      <Modal
        transparent={true}
        animationType="slide"
        visible={showSettingsModal}
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View style={styles.settingsModalOverlay}>
          <TouchableOpacity 
            style={styles.settingsModalBackdrop}
            activeOpacity={1}
            onPress={() => setShowSettingsModal(false)}
          />
          <View style={styles.settingsModalContainer}>
            <View style={styles.settingsModalHeader}>
              <Text style={styles.settingsModalTitle}>⚙️ Settings</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowSettingsModal(false)}
              >
                <Icon name="close" size={22} color={waterBlueColors.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.accountInfoCard}>
              <View style={styles.accountAvatar}>
                <LinearGradient
                  colors={[waterBlueColors.primary, waterBlueColors.dark]}
                  style={styles.avatarGradient}
                >
                  <Icon name="account" size={32} color="#FFF" />
                </LinearGradient>
              </View>
              <View style={styles.accountDetails}>
                <Text style={styles.accountName}>{accountName}</Text>
                <Text style={styles.accountRole}>Administrator</Text>
                <Text style={styles.accountEmail}>admin@alaigal.com</Text>
              </View>
            </View>

            <ScrollView style={styles.settingsOptions}>
              <TouchableOpacity 
                style={styles.settingsOption}
                onPress={() => {
                  setShowSettingsModal(false);
                  navigation.navigate('Profile');
                }}
              >
                <View style={[styles.optionIcon, { backgroundColor: waterBlueColors.lightest }]}>
                  <Icon name="account-edit" size={20} color={waterBlueColors.primary} />
                </View>
                <Text style={styles.settingsOptionText}>Edit Profile</Text>
                <Icon name="chevron-right" size={18} color="#666" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.settingsOption}
                onPress={() => {
                  setShowSettingsModal(false);
                  navigation.navigate('ChangePassword');
                }}
              >
                <View style={[styles.optionIcon, { backgroundColor: waterBlueColors.lightest }]}>
                  <Icon name="lock-reset" size={20} color={waterBlueColors.primary} />
                </View>
                <Text style={styles.settingsOptionText}>Change Password</Text>
                <Icon name="chevron-right" size={18} color="#666" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.settingsOption}
                onPress={() => {
                  setShowSettingsModal(false);
                  navigation.navigate('Notifications');
                }}
              >
                <View style={[styles.optionIcon, { backgroundColor: waterBlueColors.lightest }]}>
                  <Icon name="bell" size={20} color={waterBlueColors.primary} />
                </View>
                <Text style={styles.settingsOptionText}>Notifications</Text>
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>3</Text>
                </View>
                <Icon name="chevron-right" size={18} color="#666" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.settingsOption}
                onPress={() => {
                  setShowSettingsModal(false);
                  navigation.navigate('Privacy');
                }}
              >
                <View style={[styles.optionIcon, { backgroundColor: waterBlueColors.lightest }]}>
                  <Icon name="shield-account" size={20} color={waterBlueColors.primary} />
                </View>
                <Text style={styles.settingsOptionText}>Privacy & Security</Text>
                <Icon name="chevron-right" size={18} color="#666" />
              </TouchableOpacity>
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
});

export default MemberDashboard;