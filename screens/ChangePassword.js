import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  ImageBackground,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import ApiService from '../service/api';
import { useLanguage } from '../service/LanguageContext';

const ChangePassword = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.currentPassword.trim()) {
      Alert.alert(t('validationError'), t('currentPasswordRequired'));
      return false;
    }

    if (!formData.newPassword.trim()) {
      Alert.alert(t('validationError'), t('newPasswordRequired'));
      return false;
    }

    if (formData.newPassword.length < 6) {
      Alert.alert(t('validationError'), t('passwordTooShort'));
      return false;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      Alert.alert(t('validationError'), t('passwordsDoNotMatch'));
      return false;
    }

    if (formData.currentPassword === formData.newPassword) {
      Alert.alert(t('validationError'), t('newPasswordMustBeDifferent'));
      return false;
    }

    return true;
  };

  const handleChangePassword = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Get username from storage
      const username = await AsyncStorage.getItem('username');
      
      if (!username) {
        Alert.alert(t('error'), t('userSessionNotFound'));
        navigation.navigate('Login');
        return;
      }

      // Call change password API
      await ApiService.changePasswordByUsername(
        username,
        formData.currentPassword,
        formData.newPassword
      );

      Alert.alert(
        t('success'),
        t('passwordChangedSuccessfully'),
        [
          {
            text: t('ok'),
            onPress: async () => {
              // Logout and redirect to login
              await ApiService.logout();
              await AsyncStorage.clear();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert(t('error'), error.message || t('failedToChangePassword'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#1B5E35" barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#1B5E35', '#2E7D4F']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('changePassword')}</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <ImageBackground
        source={require('../assets/logomarutham.png')}
        style={styles.backgroundImage}
        imageStyle={styles.backgroundImageStyle}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Icon name="information" size={20} color="#2196F3" />
          <Text style={styles.infoText}>
            {t('defaultPasswordInfo')}
          </Text>
        </View>

        {/* Current Password */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('currentPassword')} *</Text>
          <View style={styles.inputContainer}>
            <Icon name="lock" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t('enterCurrentPassword')}
              value={formData.currentPassword}
              onChangeText={(text) => handleInputChange('currentPassword', text)}
              secureTextEntry={!showCurrentPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowCurrentPassword(!showCurrentPassword)}
              style={styles.eyeIcon}
            >
              <Icon
                name={showCurrentPassword ? 'eye-off' : 'eye'}
                size={20}
                color="#666"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* New Password */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('newPassword')} *</Text>
          <View style={styles.inputContainer}>
            <Icon name="lock-plus" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t('enterNewPasswordMin6')}
              value={formData.newPassword}
              onChangeText={(text) => handleInputChange('newPassword', text)}
              secureTextEntry={!showNewPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowNewPassword(!showNewPassword)}
              style={styles.eyeIcon}
            >
              <Icon
                name={showNewPassword ? 'eye-off' : 'eye'}
                size={20}
                color="#666"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Confirm Password */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('confirmPassword')} *</Text>
          <View style={styles.inputContainer}>
            <Icon name="lock-check" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t('reEnterNewPassword')}
              value={formData.confirmPassword}
              onChangeText={(text) => handleInputChange('confirmPassword', text)}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.eyeIcon}
            >
              <Icon
                name={showConfirmPassword ? 'eye-off' : 'eye'}
                size={20}
                color="#666"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Password Requirements */}
        <View style={styles.requirementsCard}>
          <Text style={styles.requirementsTitle}>{t('passwordRequirements')}:</Text>
          <View style={styles.requirementRow}>
            <Icon
              name={formData.newPassword.length >= 6 ? 'check-circle' : 'circle-outline'}
              size={16}
              color={formData.newPassword.length >= 6 ? '#4CAF50' : '#999'}
            />
            <Text style={styles.requirementText}>{t('atLeast6Characters')}</Text>
          </View>
          <View style={styles.requirementRow}>
            <Icon
              name={
                formData.newPassword && formData.newPassword === formData.confirmPassword
                  ? 'check-circle'
                  : 'circle-outline'
              }
              size={16}
              color={
                formData.newPassword && formData.newPassword === formData.confirmPassword
                  ? '#4CAF50'
                  : '#999'
              }
            />
            <Text style={styles.requirementText}>{t('passwordsMatch')}</Text>
          </View>
          <View style={styles.requirementRow}>
            <Icon
              name={
                formData.currentPassword &&
                formData.newPassword &&
                formData.currentPassword !== formData.newPassword
                  ? 'check-circle'
                  : 'circle-outline'
              }
              size={16}
              color={
                formData.currentPassword &&
                formData.newPassword &&
                formData.currentPassword !== formData.newPassword
                  ? '#4CAF50'
                  : '#999'
              }
            />
            <Text style={styles.requirementText}>{t('differentFromCurrentPassword')}</Text>
          </View>
        </View>

        {/* Change Password Button */}
        <TouchableOpacity
          style={styles.changeButton}
          onPress={handleChangePassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Icon name="lock-reset" size={20} color="#FFF" />
              <Text style={styles.changeButtonText}>{t('changePassword')}</Text>
            </>
          )}
        </TouchableOpacity>
        </ScrollView>
      </ImageBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F9FC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  backgroundImage: {
    flex: 1,
  },
  backgroundImageStyle: {
    opacity: 0.1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1976D2',
    marginLeft: 10,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1B5E35',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 15,
    minHeight: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    paddingVertical: 12,
  },
  eyeIcon: {
    padding: 5,
  },
  requirementsCard: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1B5E35',
    marginBottom: 10,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
  },
  changeButton: {
    backgroundColor: '#157eefff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 12,
    marginTop: 10,
  },
  changeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default ChangePassword;


