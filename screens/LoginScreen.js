import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Image,
  TouchableOpacity,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ActivityIndicator,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import ApiService from '../service/api';
import MemberIdService from '../service/MemberIdService';
import { FontAwesome } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from "expo-constants";
import { useLanguage } from '../service/LanguageContext';

const { width, height } = Dimensions.get('window');

const LoginScreen = ({ navigation, notificationScreen }) => {
  const { t } = useLanguage();
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    checkBiometricAvailability();
    loadSavedCredentials();

    const backAction = () => {
      setErrorMessage('');
      BackHandler.exitApp();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, []);

  const loadSavedCredentials = async () => {
    try {
      const savedUsername = await AsyncStorage.getItem('username');
      if (savedUsername) {
        setEmployeeNumber(savedUsername);
        setRememberMe(true);
      }
    } catch (error) {
      console.error('Error loading saved credentials:', error);
    }
  };

  const checkBiometricAvailability = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setIsBiometricAvailable(compatible && enrolled);
    } catch (error) {
      console.error('Error checking biometric availability:', error);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access Alaigal',
        fallbackLabel: 'Use passcode',
        disableDeviceFallback: false,
      });

      if (result.success) {
        const savedUsername = await AsyncStorage.getItem('username');
        const savedPassword = await AsyncStorage.getItem('password');

        if (savedUsername && savedPassword) {
          await handleLogin(savedUsername, savedPassword);
        } else {
          setErrorMessage('No saved credentials found. Please log in manually.');
        }
      }
    } catch (error) {
      console.error('Biometric login error:', error);
      setErrorMessage('Authentication failed. Please try again.');
    }
  };

  const handleLogin = async (username = employeeNumber, passwordInput = password) => {
    if (!username.trim() || !passwordInput.trim()) {
      setErrorMessage('Please enter your Username and Password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      console.log('Attempting login with:', username);

      const response = await ApiService.login(username, passwordInput);

      console.log('Login response:', response);

      if (response.token && response.user) {
        // Save credentials if remember me is checked
        if (rememberMe) {
          await AsyncStorage.setItem('username', username);
          await AsyncStorage.setItem('password', passwordInput);
        } else {
          await AsyncStorage.removeItem('username');
          await AsyncStorage.removeItem('password');
        }

        // Store all user data
        await AsyncStorage.setItem('token', response.token);
        await AsyncStorage.setItem('userData', JSON.stringify(response.user));
        await AsyncStorage.setItem('fullName', response.user.fullName || '');
        await AsyncStorage.setItem('email', response.user.email || '');
        await AsyncStorage.setItem('phone', response.user.phone || '');
        await AsyncStorage.setItem('role', response.user.role || 'User');
        await AsyncStorage.setItem('username', response.user.username || '');
        await AsyncStorage.setItem('userId', response.user.id?.toString() || '');

        // CRITICAL: Store MemberId if available using MemberIdService
        if (response.user.memberId) {
          await MemberIdService.setMemberId(response.user.memberId);
          console.log('Member ID saved from response:', response.user.memberId);
        } else {
          console.log('No memberId in response. Will try to find it later if needed.');
          // Don't try to find member ID here - do it when needed
          // This prevents 405 errors during login
        }

        console.log('Login successful. User data:', response.user);
        console.log('User role:', response.user.role);

        // Clear any error message
        setErrorMessage('');

        // Navigate based on role
        setTimeout(() => {
          if (response.user.role === 'User') {
            console.log('Navigating to UserDashboard');
            navigation.reset({
              index: 0,
              routes: [{ name: 'UserDashboard' }],
            });
          } else {
            console.log('Navigating to DrawerNavigator (Admin)');
            navigation.reset({
              index: 0,
              routes: [{ name: 'DrawerNavigator' }],
            });
          }
        }, 100);

      } else {
        setErrorMessage('Invalid credentials. Please try again.');
      }
    } catch (error) {
      console.error('Login error:', error);

      // Show user-friendly error message for any login failure
      setErrorMessage('Invalid username and password');
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#4A90E2', '#87CEEB', '#B0E0E6']}
        style={styles.background}
      >
        <View style={styles.content}>
          {/* Logo Section with White Background */}
          <View style={styles.logoSection}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../assets/logoicon.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Compact Login Form */}
          <View style={styles.loginCard}>
            <Text style={styles.loginTitle}>Alaigal Members Sign In</Text>

            <View style={styles.inputWrapper}>
              <View style={styles.inputContainer}>
                <FontAwesome name="user" size={20} color="#4A90E2" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Username or email"
                  placeholderTextColor="#999"
                  value={employeeNumber}
                  onChangeText={setEmployeeNumber}
                  autoCapitalize="none"
                  autoComplete="username"
                  keyboardType="email-address"
                  maxLength={50}
                />
              </View>
            </View>

            <View style={styles.inputWrapper}>
              <View style={styles.inputContainer}>
                <FontAwesome name="lock" size={20} color="#4A90E2" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#999"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  maxLength={20}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                  <FontAwesome
                    name={showPassword ? "eye" : "eye-slash"}
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.rememberForgotContainer}>
              <TouchableOpacity
                style={styles.rememberMeContainer}
                onPress={() => setRememberMe(!rememberMe)}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && <FontAwesome name="check" size={12} color="#fff" />}
                </View>
                <Text style={styles.rememberMeText}>Remember me</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            {errorMessage ? (
              <View style={styles.errorContainer}>
                <FontAwesome name="exclamation-triangle" size={18} color="#d32f2f" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={() => handleLogin()}
              disabled={isLoading}
            >
              <LinearGradient
                colors={['#4A90E2', '#357ABD']}
                style={styles.buttonGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <FontAwesome name="sign-in" size={20} color="#fff" style={styles.loginIcon} />
                    <Text style={styles.loginButtonText}> Login</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {isBiometricAvailable && (
              <>
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity
                  style={styles.biometricButton}
                  onPress={handleBiometricLogin}
                  disabled={isLoading}
                >
                  <LinearGradient
                    colors={['#f5f5f5', '#e0e0e0']}
                    style={styles.biometricGradient}
                  >
                    <View style={styles.fingerprintContainer}>
                      <MaterialCommunityIcons
                        name="fingerprint"
                        size={30}
                        color="#4A90E2"
                      />
                    </View>
                    <Text style={styles.biometricButtonText}>Use Fingerprint</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Bottom Section */}
          <View style={styles.bottomSection}>
            <View style={styles.footerNote}>
              <Text style={styles.footerText}>
                Having trouble logging in?{' '}
                <Text
                  style={styles.contactSupportText}
                  onPress={() => {
                    // You can add contact support functionality here
                    Alert.alert('Contact Support', 'Please email support@alaigal.com');
                  }}
                >
                  Contact Support
                </Text>
              </Text>
            </View>

            <Text style={styles.versionText}>
              v{Constants.expoConfig?.version || '1.0.0'}
            </Text>
            <Text style={styles.copyrightText}>© 2026 VivifyTechnocrats</Text>
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
    justifyContent: 'space-between',
    paddingHorizontal: 25,
    paddingTop: 40,
    paddingBottom: 20,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 0,
  },
  logoContainer: {
    backgroundColor: '#fff',
    borderRadius: 100,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 2,
  },
  logo: {
    width: 100,
    height: 100,
  },
  loginCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 20,
  },
  loginTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#4A90E2',
    marginBottom: 20,
    textAlign: 'center',
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
  rememberForgotContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#4A90E2',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4A90E2',
  },
  rememberMeText: {
    fontSize: 13,
    color: '#555',
  },
  forgotPasswordText: {
    fontSize: 13,
    color: '#4A90E2',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  loginButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 15,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  loginIcon: {
    marginRight: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 15,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    marginHorizontal: 15,
    color: '#666',
    fontSize: 13,
    fontWeight: '600',
  },
  biometricButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  biometricGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  fingerprintContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: '#4A90E2',
  },
  biometricButtonText: {
    color: '#4A90E2',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomSection: {
    alignItems: 'center',
  },
  footerNote: {
    marginBottom: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 10,
    borderRadius: 8,
  },
  footerText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 16,
  },
  contactSupportText: {
    color: '#fff',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  versionText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 5,
  },
  copyrightText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
  },
});

export default LoginScreen;