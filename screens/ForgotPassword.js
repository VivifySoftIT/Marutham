import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, BackHandler, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../apiConfig';
import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const ForgotPassword = ({ navigation }) => {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetToken, setResetToken] = useState('');

  const handleSendOTP = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }

    // Email format validation
    const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!emailPattern.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }

    setIsLoading(true);

    try {
      // Send POST request to the C# backend forgot-password endpoint
      const url = `${API_BASE_URL}/api/Auth/forgot-password`;
      
      const response = await axios.post(url, {
        email: email
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('API Response:', response.data);

      if (response.status === 200) {
        const successMessage = 'A verification code has been sent to your email.';
        Alert.alert('Success', successMessage);
        setStep(2); // Move to OTP verification step
      }
    } catch (error) {
      console.error('Error sending OTP:', error);
      
      if (error.response) {
        const errorMessage = error.response.data?.message || 'Unable to send verification code. Please try again later.';
        Alert.alert('Error', errorMessage);
      } else if (error.request) {
        Alert.alert('Error', 'Network error. Please check your connection and try again.');
      } else {
        Alert.alert('Error', 'Unable to send verification code. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp) {
      Alert.alert('Error', 'Please enter the verification code.');
      return;
    }

    if (otp.length !== 6) {
      Alert.alert('Error', 'Verification code must be 6 digits.');
      return;
    }

    setIsLoading(true);

    try {
      // Verify OTP with backend
      const url = `${API_BASE_URL}/api/Auth/verify-otp`;
      
      const response = await axios.post(url, {
        email: email,
        otp: otp
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('OTP Verification Response:', response.data);

      if (response.status === 200 && response.data.token) {
        setResetToken(response.data.token);
        Alert.alert('Success', 'Code verified! Please enter your new password.');
        setStep(3); // Move to password reset step
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      
      if (error.response) {
        const errorMessage = error.response.data?.message || 'Invalid or expired verification code.';
        Alert.alert('Error', errorMessage);
      } else {
        Alert.alert('Error', 'Unable to verify code. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const validatePassword = (password) => {
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
        const errorMessage = error.response.data?.message || 'Unable to reset password. Please try again.';
        Alert.alert('Error', errorMessage);
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

  // Handle back button press on Android
  React.useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step > 1) {
        setStep(step - 1);
        return true;
      }
      navigation.replace('Login');
      return true;
    });

    return () => backHandler.remove();
  }, [step]);

  // Render different steps
  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <>
            <View style={styles.headerSection}>
              <FontAwesome name="lock" size={50} color="#C9A84C" />
              <Text style={styles.title}>Forgot Password?</Text>
              <Text style={styles.subtitle}>
                Enter your email address and we'll send you a verification code.
              </Text>
            </View>

            <View style={styles.inputWrapper}>
              <View style={styles.inputContainer}>
                <FontAwesome name="envelope" size={18} color="#C9A84C" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email address"
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleSendOTP}
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
                    <FontAwesome name="paper-plane" size={18} color="#fff" style={styles.buttonIcon} />
                    <Text style={styles.buttonText}>Send Verification Code</Text>
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
          </>
        );

      case 2:
        return (
          <>
            <View style={styles.headerSection}>
              <FontAwesome name="shield" size={50} color="#C9A84C" />
              <Text style={styles.title}>Enter Verification Code</Text>
              <Text style={styles.subtitle}>
                We've sent a 6-digit code to {email}
              </Text>
            </View>

            <View style={styles.inputWrapper}>
              <View style={styles.inputContainer}>
                <FontAwesome name="key" size={18} color="#C9A84C" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter 6-digit code"
                  placeholderTextColor="#999"
                  keyboardType="number-pad"
                  value={otp}
                  onChangeText={setOtp}
                  maxLength={6}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleVerifyOTP}
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
                    <Text style={styles.buttonText}>Verify Code</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setStep(1)}
            >
              <FontAwesome name="arrow-left" size={16} color="#C9A84C" style={styles.backIcon} />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resendButton}
              onPress={handleSendOTP}
              disabled={isLoading}
            >
              <Text style={styles.resendText}>Didn't receive code? Resend</Text>
            </TouchableOpacity>
          </>
        );

      case 3:
        return (
          <>
            <View style={styles.headerSection}>
              <FontAwesome name="key" size={40} color="#C9A84C" />
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>
                Enter your new password below.
              </Text>
            </View>

            <View style={styles.inputWrapper}>
              <View style={styles.inputContainer}>
                <FontAwesome name="lock" size={16} color="#C9A84C" style={styles.icon} />
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
                    size={16}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputWrapper}>
              <View style={styles.inputContainer}>
                <FontAwesome name="lock" size={16} color="#C9A84C" style={styles.icon} />
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
                    size={16}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>
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
                    <FontAwesome name="check" size={16} color="#fff" style={styles.buttonIcon} />
                    <Text style={styles.buttonText}>Reset Password</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </>
        );

      default:
        return null;
    }
  };

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

          {/* Step Indicator */}
          <View style={styles.stepIndicator}>
            <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]} />
            <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
            <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]} />
            <View style={[styles.stepLine, step >= 3 && styles.stepLineActive]} />
            <View style={[styles.stepDot, step >= 3 && styles.stepDotActive]} />
          </View>

          {/* Form Container */}
          <View style={styles.formContainer}>
            {renderStepContent()}
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
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 20,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 10,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  inputWrapper: {
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 12,
    height: 46,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    height: '100%',
  },
  button: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
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
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  buttonIcon: {
    marginRight: 6,
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
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
    opacity: 0.5,
  },
  stepDotActive: {
    backgroundColor: '#fff',
    opacity: 1,
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#fff',
    opacity: 0.5,
    marginHorizontal: 5,
  },
  stepLineActive: {
    backgroundColor: '#fff',
    opacity: 1,
  },
  resendButton: {
    alignItems: 'center',
    marginTop: 10,
  },
  resendText: {
    color: '#C9A84C',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
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
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  requirementsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  requirementText: {
    fontSize: 11,
    color: '#666',
    marginVertical: 1,
  },
  eyeIcon: {
    padding: 5,
  },
});

export default ForgotPassword;

