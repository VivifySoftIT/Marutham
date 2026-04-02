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
    primary: '#C9A84C',
    light: '#2E7D4F',
    lighter: '#E8F5EC',
    lightest: '#E8F5EC',
    dark: '#0D3B1E',
    darker: '#0D3B1E',
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

  const translateRole = (role) => {
    if (!role) return t('role');
    
    const roleTranslations = {
      'Admin': t('administrator'),
      'admin': t('administrator'),
      'Administrator': t('administrator'),
      'User': t('user'),
      'user': t('user'),
      'Member': t('member'),
      'member': t('member'),
    };
    
    return roleTranslations[role] || role;
  };

  // Add translation functions for profile data
  const translateGender = (gender) => {
    if (!gender) return '';
    
    const genderTranslations = {
      'Male': t('male'),
      'Female': t('female'),
      'Other': t('other'),
    };
    
    return genderTranslations[gender] || gender;
  };

  const translateStatus = (status) => {
    if (!status) return '';
    
    const statusTranslations = {
      'Active': t('active'),
      'Inactive': t('inactive'),
      'Pending': t('pending'),
      'Approved': t('approved'),
      'Rejected': t('rejected'),
    };
    
    return statusTranslations[status] || status;
  };

  const handleLanguageChange = async (lang) => {
    setSelectedLanguage(lang);
    await changeLanguage(lang);
    setShowLanguageModal(false);
    Alert.alert(t('success'), `${t('languageChanged')} ${lang === 'en' ? t('english') : t('tamil')}`);
  };

  const handleModeSwitch = async (mode) => {
    try {
      await AsyncStorage.setItem('userMode', mode);
      setCurrentMode(mode);
      
      Alert.alert(
        t('confirmTitle'),
        `${t('switchInterfaceMode')} ${mode === 'user' ? t('userMode') : t('adminMode')}. ${t('restartAppToSeeChanges')}.`,
        [
          {
            text: t('restartNow'),
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
          { text: t('later'), style: 'cancel' }
        ]
      );
    } catch (error) {
      console.error('Error switching mode:', error);
      Alert.alert(t('error'), t('operationFailed'));
    }
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  // Settings menu items
  const settingsItems = [
    {
      id: 'my-details',
      title: t('myDetails'),
      subtitle: t('viewManageAccount'),
      icon: 'account-circle',
      color: '#C9A84C',
      onPress: () => {
        Alert.alert(
          t('myDetails'),
          `${t('name')}: ${userData?.fullName || 'Admin User'}\n${t('email')}: ${userData?.email || 'admin@alaigal.com'}\n${t('phone')}: ${userData?.phone || '+91 9876543210'}\n${t('role')}: ${translateRole(userData?.role)}`,
          [{ text: t('ok') }]
        );
      },
    },
    {
      id: 'edit-profile',
      title: t('editProfile') || 'Edit Profile',
      subtitle: t('updateProfileInfo') || 'Update your profile information',
      icon: 'account-edit',
      color: '#4CAF50',
      onPress: () => {
        navigation.navigate('Profile');
      },
    },
    {
      id: 'language',
      title: t('language'),
      subtitle: `${t('currentLanguage')}: ${selectedLanguage === 'en' ? t('english') : t('tamil')}`,
      icon: 'translate',
      color: '#FF9800',
      onPress: () => setShowLanguageModal(true),
    },
    // Only show mode switcher for admin users
    ...(isAdmin ? [{
      id: 'mode-switcher',
      title: t('interfaceMode'),
      subtitle: `${t('currentLanguage')}: ${currentMode === 'user' ? t('userMode') : t('adminMode')}`,
      icon: currentMode === 'user' ? 'account' : 'shield-crown',
      color: currentMode === 'user' ? '#2196F3' : '#E91E63',
      onPress: () => {
        Alert.alert(
          t('switchInterfaceMode'),
          t('chooseInterfaceMode'),
          [
            {
              text: t('userMode'),
              onPress: () => handleModeSwitch('user'),
              style: currentMode === 'user' ? 'cancel' : 'default'
            },
            {
              text: t('adminMode'), 
              onPress: () => handleModeSwitch('admin'),
              style: currentMode === 'admin' ? 'cancel' : 'default'
            },
            { text: t('cancel'), style: 'cancel' }
          ]
        );
      },
    }] : []),
    {
      id: 'change-password',
      title: t('changePassword'),
      subtitle: t('updatePassword'),
      icon: 'lock-reset',
      color: '#9C27B0',
      onPress: () => navigation.navigate('ChangePassword'),
    },
    {
      id: 'privacy-policy',
      title: t('privacySecurity'),
      subtitle: t('readPrivacyPolicy'),
      icon: 'shield-account',
      color: '#607D8B',
      onPress: () => {
        Alert.alert(
          t('privacySecurity'),
          t('privacyPolicyContent'),
          [{ text: t('ok') }]
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
      <StatusBar barStyle="light-content" backgroundColor={'#1B5E35'} />
      
      {/* Header */}
      <LinearGradient colors={['#1B5E35', '#2E7D4F']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <Icon name="arrow-left" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('settings')}</Text>
          <View style={{ width: 28 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Profile Card */}
        <Animatable.View animation="fadeIn" delay={100} style={styles.profileCard}>
          <LinearGradient
            colors={['#2E7D4F', '#FFFFFF']}
            style={styles.profileGradient}
          >
            <View style={styles.profileContent}>
              <LinearGradient
                colors={['#2E7D4F', '#1B5E35']}
                style={styles.profileAvatar}
              >
                <Icon name="account" size={32} color="#FFF" />
              </LinearGradient>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{userData?.fullName || 'Admin User'}</Text>
                <Text style={styles.profileEmail}>{userData?.email || 'admin@alaigal.com'}</Text>
                <View style={styles.profileBadge}>
                  <Icon name="shield-crown" size={14} color={'#1B5E35'} />
                  <Text style={styles.profileBadgeText}>{t('administrator')}</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animatable.View>

        {/* Settings Items */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>{t('accountSettings')}</Text>
          {settingsItems.map((item, index) => (
            <SettingsItem key={item.id} item={item} delay={200 + (index * 100)} />
          ))}
        </View>

        {/* App Info */}
        <Animatable.View animation="fadeInUp" delay={700} style={styles.appInfoSection}>
          <View style={styles.appInfo}>
            <Icon name="information" size={20} color={'#1B5E35'} />
            <View style={styles.appInfoContent}>
              <Text style={styles.appInfoTitle}>{t('professionalNetworking')}</Text>
              <Text style={styles.appInfoText}>{t('version')} 1.0.0 • {t('professionalNetworking')}</Text>
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
              colors={['#1B5E35', '#2E7D4F']}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>{t('language')}</Text>
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
                  <Text style={styles.languageName}>{t('english')}</Text>
                  <Text style={styles.languageDesc}>{t('englishLanguage')}</Text>
                </View>
                {selectedLanguage === 'en' && (
                  <Icon name="check-circle" size={24} color={'#1B5E35'} />
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
                  <Text style={styles.languageName}>{t('tamil')}</Text>
                  <Text style={styles.languageDesc}>{t('tamilLanguage')}</Text>
                </View>
                {selectedLanguage === 'ta' && (
                  <Icon name="check-circle" size={24} color={'#1B5E35'} />
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
    shadowColor: '#C9A84C',
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
    shadowColor: '#C9A84C',
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
    shadowColor: '#0D3B1E',
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
    color: '#C9A84C',
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
    color: '#C9A84C',
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
    borderLeftColor: '#C9A84C',
  },
  appInfoContent: {
    marginLeft: 12,
    flex: 1,
  },
  appInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#C9A84C',
    marginBottom: 4,
  },
  appInfoText: {
    fontSize: 13,
    color: '#0D3B1E',
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
    borderColor: '#C9A84C',
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
