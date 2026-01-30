import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../service/LanguageContext';
import * as Animatable from 'react-native-animatable';

const SettingsScreen = () => {
  const navigation = useNavigation();
  const { language, changeLanguage, t } = useLanguage();
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [userData, setUserData] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentMode, setCurrentMode] = useState('admin'); // 'admin' or 'user'

  // Water blue color theme
  const waterBlueColors = {
    primary: '#4A90E2',
    light: '#87CEEB',
    lighter: '#B3E0F2',
    lightest: '#E0F7FA',
    dark: '#357ABD',
    darker: '#1E5A96',
  };

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const username = await AsyncStorage.getItem('username');
      const fullName = await AsyncStorage.getItem('fullName');
      const email = await AsyncStorage.getItem('email');
      const phone = await AsyncStorage.getItem('phone');
      const userId = await AsyncStorage.getItem('userId');
      const role = await AsyncStorage.getItem('role');
      
      // Check if user is admin
      const adminStatus = role === 'Admin' || role === 'admin';
      setIsAdmin(adminStatus);
      
      // Load current mode from storage
      const savedMode = await AsyncStorage.getItem('userMode');
      setCurrentMode(savedMode || 'admin');
      
      setUserData({
        username,
        fullName: fullName || 'Admin User',
        email: email || 'admin@alaigal.com',
        phone: phone || '+91 9876543210',
        userId,
        role: role || 'Admin',
      });
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleLanguageChange = async (lang) => {
    setSelectedLanguage(lang);
    await changeLanguage(lang);
    setShowLanguageModal(false);
    Alert.alert('Success', `Language changed to ${lang === 'en' ? 'English' : 'Tamil'}`);
  };

  const handleModeSwitch = async (mode) => {
    try {
      await AsyncStorage.setItem('userMode', mode);
      setCurrentMode(mode);
      
      Alert.alert(
        'Mode Changed',
        `Switched to ${mode === 'user' ? 'User Mode' : 'Admin Mode'}. Please restart the app to see the changes.`,
        [
          {
            text: 'Restart Now',
            onPress: () => {
              // Navigate to appropriate dashboard based on mode
              if (mode === 'user') {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'UserDashboard' }],
                });
              } else {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'DrawerNavigator' }],
                });
              }
            }
          },
          { text: 'Later', style: 'cancel' }
        ]
      );
    } catch (error) {
      console.error('Error switching mode:', error);
      Alert.alert('Error', 'Failed to switch mode. Please try again.');
    }
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  // Settings menu items
  const settingsItems = [
    {
      id: 'my-details',
      title: 'My Details',
      subtitle: 'View and manage your account information',
      icon: 'account-circle',
      color: '#4A90E2',
      onPress: () => {
        Alert.alert(
          'My Details',
          `Name: ${userData?.fullName || 'Admin User'}\nEmail: ${userData?.email || 'admin@alaigal.com'}\nPhone: ${userData?.phone || '+91 9876543210'}\nRole: ${userData?.role || 'Admin'}`,
          [{ text: 'OK' }]
        );
      },
    },
    {
      id: 'language',
      title: 'Language',
      subtitle: `Current: ${selectedLanguage === 'en' ? 'English' : 'Tamil'}`,
      icon: 'translate',
      color: '#FF9800',
      onPress: () => setShowLanguageModal(true),
    },
    // Only show mode switcher for admin users
    ...(isAdmin ? [{
      id: 'mode-switcher',
      title: 'Interface Mode',
      subtitle: `Current: ${currentMode === 'user' ? 'User Mode' : 'Admin Mode'}`,
      icon: currentMode === 'user' ? 'account' : 'shield-crown',
      color: currentMode === 'user' ? '#2196F3' : '#E91E63',
      onPress: () => {
        Alert.alert(
          'Switch Interface Mode',
          'Choose your interface mode:',
          [
            {
              text: 'User Mode',
              onPress: () => handleModeSwitch('user'),
              style: currentMode === 'user' ? 'cancel' : 'default'
            },
            {
              text: 'Admin Mode', 
              onPress: () => handleModeSwitch('admin'),
              style: currentMode === 'admin' ? 'cancel' : 'default'
            },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      },
    }] : []),
    {
      id: 'change-password',
      title: 'Change Password',
      subtitle: 'Update your account password',
      icon: 'lock-reset',
      color: '#4CAF50',
      onPress: () => navigation.navigate('ChangePassword'),
    },
    {
      id: 'edit-profile',
      title: 'Edit Profile',
      subtitle: 'Update your profile information',
      icon: 'account-edit',
      color: '#9C27B0',
      onPress: () => navigation.navigate('Profile'),
    },
    {
      id: 'privacy-policy',
      title: 'Privacy and Policy',
      subtitle: 'Read our privacy policy and terms',
      icon: 'shield-account',
      color: '#607D8B',
      onPress: () => {
        Alert.alert(
          'Privacy and Policy',
          'Privacy Policy and Terms of Service\n\n• Your data is secure with us\n• We respect your privacy\n• Terms and conditions apply\n• Contact support for more info',
          [{ text: 'OK' }]
        );
      },
    },
  ];

  const SettingsItem = ({ item, delay = 0 }) => (
    <Animatable.View animation="fadeInUp" delay={delay} style={styles.settingsItemWrapper}>
      <TouchableOpacity style={styles.settingsItem} onPress={item.onPress} activeOpacity={0.7}>
        <View style={[styles.settingsIconContainer, { backgroundColor: item.color + '20' }]}>
          <Icon name={item.icon} size={24} color={item.color} />
        </View>
        <View style={styles.settingsContent}>
          <Text style={styles.settingsTitle}>{item.title}</Text>
          <Text style={styles.settingsSubtitle}>{item.subtitle}</Text>
        </View>
        <Icon name="chevron-right" size={20} color="#999" />
      </TouchableOpacity>
    </Animatable.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={waterBlueColors.primary} />
      
      {/* Header */}
      <LinearGradient colors={[waterBlueColors.primary, waterBlueColors.light]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <Icon name="arrow-left" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 28 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Profile Card */}
        <Animatable.View animation="fadeIn" delay={100} style={styles.profileCard}>
          <LinearGradient
            colors={[waterBlueColors.lightest, '#FFFFFF']}
            style={styles.profileGradient}
          >
            <View style={styles.profileContent}>
              <LinearGradient
                colors={[waterBlueColors.light, waterBlueColors.primary]}
                style={styles.profileAvatar}
              >
                <Icon name="account" size={32} color="#FFF" />
              </LinearGradient>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{userData?.fullName || 'Admin User'}</Text>
                <Text style={styles.profileEmail}>{userData?.email || 'admin@alaigal.com'}</Text>
                <View style={styles.profileBadge}>
                  <Icon name="shield-crown" size={14} color={waterBlueColors.primary} />
                  <Text style={styles.profileBadgeText}>Administrator</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animatable.View>

        {/* Settings Items */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Account Settings</Text>
          {settingsItems.map((item, index) => (
            <SettingsItem key={item.id} item={item} delay={200 + (index * 100)} />
          ))}
        </View>

        {/* App Info */}
        <Animatable.View animation="fadeInUp" delay={700} style={styles.appInfoSection}>
          <View style={styles.appInfo}>
            <Icon name="information" size={20} color={waterBlueColors.primary} />
            <View style={styles.appInfoContent}>
              <Text style={styles.appInfoTitle}>Alaigal Network</Text>
              <Text style={styles.appInfoText}>Version 1.0.0 • Professional Networking Platform</Text>
            </View>
          </View>
        </Animatable.View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Language Selection Modal */}
      <Modal
        transparent={true}
        animationType="slide"
        visible={showLanguageModal}
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <LinearGradient
              colors={[waterBlueColors.primary, waterBlueColors.light]}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>Select Language</Text>
              <TouchableOpacity 
                style={styles.closeModalButton}
                onPress={() => setShowLanguageModal(false)}
              >
                <Icon name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </LinearGradient>

            <View style={styles.modalContent}>
              {/* English Option */}
              <TouchableOpacity
                style={[
                  styles.languageOption,
                  selectedLanguage === 'en' && styles.languageOptionSelected,
                ]}
                onPress={() => handleLanguageChange('en')}
              >
                <View style={styles.languageContent}>
                  <Text style={styles.languageName}>English</Text>
                  <Text style={styles.languageDesc}>English Language</Text>
                </View>
                {selectedLanguage === 'en' && (
                  <Icon name="check-circle" size={24} color={waterBlueColors.primary} />
                )}
              </TouchableOpacity>

              {/* Tamil Option */}
              <TouchableOpacity
                style={[
                  styles.languageOption,
                  selectedLanguage === 'ta' && styles.languageOptionSelected,
                ]}
                onPress={() => handleLanguageChange('ta')}
              >
                <View style={styles.languageContent}>
                  <Text style={styles.languageName}>Tamil</Text>
                  <Text style={styles.languageDesc}>தமிழ் மொழி</Text>
                </View>
                {selectedLanguage === 'ta' && (
                  <Icon name="check-circle" size={24} color={waterBlueColors.primary} />
                )}
              </TouchableOpacity>
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
  header: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    elevation: 5,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  // Profile Card Styles
  profileCard: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  profileGradient: {
    padding: 20,
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    elevation: 3,
    shadowColor: '#357ABD',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#4A90E2',
    marginBottom: 8,
  },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F4FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  profileBadgeText: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '600',
    marginLeft: 4,
  },
  // Settings Section
  settingsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 16,
  },
  settingsItemWrapper: {
    marginBottom: 12,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  settingsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingsContent: {
    flex: 1,
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  settingsSubtitle: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  // App Info Section
  appInfoSection: {
    marginTop: 20,
  },
  appInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F4FD',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
  },
  appInfoContent: {
    marginLeft: 12,
    flex: 1,
  },
  appInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
    marginBottom: 4,
  },
  appInfoText: {
    fontSize: 13,
    color: '#357ABD',
    lineHeight: 18,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '60%',
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
    paddingVertical: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  closeModalButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    padding: 20,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FBFF',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  languageOptionSelected: {
    borderColor: '#4A90E2',
    backgroundColor: '#E8F4FD',
  },
  languageContent: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  languageDesc: {
    fontSize: 14,
    color: '#666',
  },
});

export default SettingsScreen;