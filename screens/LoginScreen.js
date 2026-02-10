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
import ApiService from '../service/api';
import MemberIdService from '../service/MemberIdService';
import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from "expo-constants";
import { useLanguage } from '../service/LanguageContext';

const { width, height } = Dimensions.get('window');

const LoginScreen = ({ navigation, notificationScreen }) => {
  const { t } = useLanguage();
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    checkExistingSession();
    loadSavedCredentials();

    const backAction = () => {
      setErrorMessage('');
      BackHandler.exitApp();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, []);

  // Check if user is already logged in
  const checkExistingSession = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userData = await AsyncStorage.getItem('userData');
      
      if (token && userData) {
        const user = JSON.parse(userData);
        console.log('Existing session found, auto-navigating...');
        
        // Check saved mode preference for admin users
        const savedMode = await AsyncStorage.getItem('userMode');
        
        // Auto-navigate based on role and mode preference
        setTimeout(() => {
          if (user.role === 'User') {
            navigation.reset({
              index: 0,
              routes: [{ name: 'UserDashboard' }],
            });
          } else if (user.role === 'Admin' || user.role === 'admin') {
            // Admin user - check saved mode preference
            if (savedMode === 'user') {
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
          } else {
            navigation.reset({
              index: 0,
              routes: [{ name: 'DrawerNavigator' }],
            });
          }
        }, 100);
      }
    } catch (error) {
      console.error('Error checking existing session:', error);
    }
  };

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

  const handleLogin = async (username = employeeNumber, passwordInput = password) => {
    if (!username.trim() || !passwordInput.trim()) {
      setErrorMessage('Please enter your Username and Password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      console.log('Attempting login with:', username);

      // Explicitly clear any previous member ID session data
      await MemberIdService.clearMemberId();

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
        await AsyncStorage.setItem('jwt_token', response.token); // Also store as jwt_token for compatibility
        await AsyncStorage.setItem('userData', JSON.stringify(response.user));
        await AsyncStorage.setItem('fullName', response.user.fullName || '');
        await AsyncStorage.setItem('email', response.user.email || '');
        await AsyncStorage.setItem('phone', response.user.phone || '');
        await AsyncStorage.setItem('role', response.user.role || 'User');
        await AsyncStorage.setItem('username', response.user.username || '');
        await AsyncStorage.setItem('userId', response.user.id?.toString() || '');

        // CRITICAL: Store or Resolve MemberId
        if (response.user.memberId) {
          await MemberIdService.setMemberId(response.user.memberId);
          console.log('Member ID saved from response:', response.user.memberId);
        } else {
          console.log('No memberId in response. Resolving immediately...');
          // Force resolution now using the just-saved userId/fullName
          const resolvedId = await MemberIdService.getCurrentUserMemberId();
          if (resolvedId) {
            console.log('Member ID resolved and saved:', resolvedId);
            // Verify it matches what we expect? No, just trust the service logic which uses userId
          } else {
            console.warn('Could not resolve Member ID during login.');
          }
        }

        console.log('Login successful. User data:', response.user);
        console.log('User role:', response.user.role);

        // Clear any error message
        setErrorMessage('');

        // Navigate based on role and saved mode
        setTimeout(async () => {
          // Check if admin has a saved mode preference
          const savedMode = await AsyncStorage.getItem('userMode');
          
          if (response.user.role === 'User') {
            console.log('Navigating to UserDashboard');
            navigation.reset({
              index: 0,
              routes: [{ name: 'UserDashboard' }],
            });
          } else if (response.user.role === 'Admin' || response.user.role === 'admin') {
            // Admin user - check saved mode preference
            if (savedMode === 'user') {
              console.log('Admin navigating to UserDashboard (User Mode)');
              navigation.reset({
                index: 0,
                routes: [{ name: 'UserDashboard' }],
              });
            } else {
              console.log('Admin navigating to DrawerNavigator (Admin Mode)');
              navigation.reset({
                index: 0,
                routes: [{ name: 'DrawerNavigator' }],
              });
            }
          } else {
            console.log('Navigating to DrawerNavigator (Default)');
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

      // Determine user-friendly error message
      let userMessage = t('invalidUsernamePassword') || 'Invalid username or password';
      
      // Check for specific error types
      if (error.message) {
        const errorMsg = error.message.toLowerCase();
        
        // Suppress push notification errors - don't show to user
        if (errorMsg.includes('push notification') || 
            errorMsg.includes('expo push token') ||
            errorMsg.includes('notification')) {
          console.log('Push notification error suppressed:', error.message);
          // Don't set error message for push notification issues
          return;
        }
        
        // Handle authentication errors
        if (errorMsg.includes('invalid') || 
            errorMsg.includes('incorrect') || 
            errorMsg.includes('wrong') ||
            errorMsg.includes('unauthorized') ||
            errorMsg.includes('401')) {
          userMessage = t('invalidPassword') || 'Invalid password';
        } else if (errorMsg.includes('not found') || 
                   errorMsg.includes('user does not exist')) {
          userMessage = t('userNotFound') || 'User not found';
        } else if (errorMsg.includes('network') || 
                   errorMsg.includes('connection')) {
          userMessage = t('networkError') || 'Network error. Please check your connection';
        }
      }
      
      // Show simplified error message
      setErrorMessage(userMessage);
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
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 20,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  loginTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4A90E2',
    marginBottom: 16,
    textAlign: 'center',
  },
  inputWrapper: {
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
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
  eyeIcon: {
    padding: 5,
  },
  rememberForgotContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 2,
    borderColor: '#4A90E2',
    marginRight: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4A90E2',
  },
  rememberMeText: {
    fontSize: 12,
    color: '#555',
  },
  forgotPasswordText: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  loginButton: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  loginIcon: {
    marginRight: 6,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
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