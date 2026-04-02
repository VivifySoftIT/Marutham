import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, BackHandler, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import axios from 'axios';
import API_BASE_URL from '../apiConfig';
import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const ResetPassword = ({ navigation, route }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetToken, setResetToken] = useState('');

  useEffect(() => {
    // Get the reset token from route params or URL
    const token = route?.params?.token;
    if (token) {
      setResetToken(token);
    } else {
      Alert.alert('Error', 'Invalid or missing reset token.', [
        { text: 'OK', onPress: () => navigation.replace('Login') }
      ]);
    }

    // Handle back button
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      navigation.replace('Login');
      return true;
    });

    return () => backHandler.remove();
  }, [route]);

  const validatePassword = (password) => {
    // Password must be at least 8 characters with uppercase, lowercase, number, and special character
    const minLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return {
      isValid: minLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar,
      minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumber,
      hasSpecialChar
    };
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      let errorMessage = 'Password must contain:\n';
      if (!validation.minLength) errorMessage += '• At least 8 characters\n';
      if (!validation.hasUpperCase) errorMessage += '• One uppercase letter\n';
      if (!validation.hasLowerCase) errorMessage += '• One lowercase letter\n';
      if (!validation.hasNumber) errorMessage += '• One number\n';
      if (!validation.hasSpecialChar) errorMessage += '• One special character\n';
      
      Alert.alert('Weak Password', errorMessage);
      return;
    }

    setIsLoading(true);

    try {
      const url = `${API_BASE_URL}/api/Auth/reset-password`;
      
      const response = await axios.post(url, {
        token: resetToken,
        newPassword: newPassword
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('Reset Password Response:', response.data);

      if (response.status === 200) {
        const successMessage = response.data.message || 'Password has been reset successfully!';
        Alert.alert('Success', successMessage, [
          {
            text: 'OK',
            onPress: () => navigation.replace('Login')
          }
        ]);
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      
      if (error.response) {
        const errorMessage = error.response.data?.message || 'Unable to reset password. The link may have expired.';
        Alert.alert('Error', errorMessage);
      } else if (error.request) {
        Alert.alert('Error', 'Network error. Please check your connection and try again.');
      } else {
        Alert.alert('Error', 'Unable to reset password. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = () => {
    if (!newPassword) return null;
    
    const validation = validatePassword(newPassword);
    const score = [
      validation.minLength,
      validation.hasUpperCase,
      validation.hasLowerCase,
      validation.hasNumber,
      validation.hasSpecialChar
    ].filter(Boolean).length;

    if (score <= 2) return { text: 'Weak', color: '#d32f2f' };
    if (score <= 4) return { text: 'Medium', color: '#f57c00' };
    return { text: 'Strong', color: '#388e3c' };
  };

  const passwordStrength = getPasswordStrength();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#C9A84C', '#2E7D4F', '#B0E0E6']}
        style={styles.background}
      >
        <View style={styles.content}>
          {/* Logo Section */}
          <View style={styles.logoSection}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../assets/logomarutham.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Reset Password Card */}
          <View style={styles.formContainer}>
            <View style={styles.headerSection}>
              <FontAwesome name="key" size={50} color="#C9A84C" />
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>
                Enter your new password below.
              </Text>
            </View>

            <View style={styles.inputWrapper}>
              <View style={styles.inputContainer}>
                <FontAwesome name="lock" size={18} color="#C9A84C" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="New Password"
                  placeholderTextColor="#999"
                  secureTextEntry={!showNewPassword}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  maxLength={50}
                />
                <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={styles.eyeIcon}>
                  <FontAwesome
                    name={showNewPassword ? "eye" : "eye-slash"}
                    size={18}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>
              {passwordStrength && (
                <View style={styles.strengthContainer}>
                  <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                    Password Strength: {passwordStrength.text}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.inputWrapper}>
              <View style={styles.inputContainer}>
                <FontAwesome name="lock" size={18} color="#C9A84C" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  placeholderTextColor="#999"
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  maxLength={50}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                  <FontAwesome
                    name={showConfirmPassword ? "eye" : "eye-slash"}
                    size={18}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.requirementsContainer}>
              <Text style={styles.requirementsTitle}>Password Requirements:</Text>
              <Text style={styles.requirementText}>• At least 8 characters</Text>
              <Text style={styles.requirementText}>• One uppercase letter</Text>
              <Text style={styles.requirementText}>• One lowercase letter</Text>
              <Text style={styles.requirementText}>• One number</Text>
              <Text style={styles.requirementText}>• One special character (!@#$%^&*)</Text>
            </View>

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleResetPassword}
              disabled={isLoading}
            >
              <LinearGradient
                colors={['#C9A84C', '#0D3B1E']}
                style={styles.buttonGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <FontAwesome name="check" size={18} color="#fff" style={styles.buttonIcon} />
                    <Text style={styles.buttonText}>Reset Password</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.replace('Login')}
            >
              <FontAwesome name="arrow-left" size={16} color="#C9A84C" style={styles.backIcon} />
              <Text style={styles.backButtonText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 25,
    paddingTop: 40,
    paddingBottom: 20,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: -80,
  },
  logoContainer: {
    backgroundColor: '#fff',
    borderRadius: 100,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  logo: {
    width: 100,
    height: 100,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 25,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginTop: 15,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  inputWrapper: {
    marginBottom: 15,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 15,
    height: 50,
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    height: '100%',
  },
  eyeIcon: {
    padding: 5,
  },
  strengthContainer: {
    marginTop: 5,
    marginLeft: 5,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '600',
  },
  requirementsContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  requirementsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  requirementText: {
    fontSize: 12,
    color: '#666',
    marginVertical: 2,
  },
  button: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 15,
    shadowColor: '#C9A84C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#C9A84C',
  },
  backIcon: {
    marginRight: 8,
  },
  backButtonText: {
    color: '#C9A84C',
    fontWeight: '600',
    fontSize: 15,
  },
});

export default ResetPassword;

