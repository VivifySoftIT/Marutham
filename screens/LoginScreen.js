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
import theme from '../styles/theme';

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
        await AsyncStorage.setItem('jwt_token', response.token);
        await AsyncStorage.setItem('userData', JSON.stringify(response.user));
        await AsyncStorage.setItem('fullName', response.user.fullName || '');
        await AsyncStorage.setItem('email', response.user.email || '');
        await AsyncStorage.setItem('phone', response.user.phone || '');
        await AsyncStorage.setItem('role', response.user.role || 'User');
        await AsyncStorage.setItem('username', response.user.username || '');
        await AsyncStorage.setItem('userId', response.user.id?.toString() || '');

        // Store subCompanyId for scoped member queries
        if (response.user.subCompanyId) {
          await AsyncStorage.setItem('subCompanyId', response.user.subCompanyId.toString());
        } else {
          await AsyncStorage.removeItem('subCompanyId');
        }

        // Store subCompanyName for display across screens
        if (response.user.subCompanyName) {
          await AsyncStorage.setItem('subCompanyName', response.user.subCompanyName);
        } else {
          await AsyncStorage.removeItem('subCompanyName');
        }

        // CRITICAL: Store or Resolve MemberId
        if (response.user.memberId) {
          await MemberIdService.setMemberId(response.user.memberId);
          console.log('Member ID saved from response:', response.user.memberId);
        } else {
          console.log('No memberId in response. Resolving immediately...');
          const resolvedId = await MemberIdService.getCurrentUserMemberId();
          if (resolvedId) {
            console.log('Member ID resolved and saved:', resolvedId);
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
          const savedMode = await AsyncStorage.getItem('userMode');
          
          if (response.user.role === 'User') {
            console.log('Navigating to UserDashboard');
            navigation.reset({
              index: 0,
              routes: [{ name: 'UserDashboard' }],
            });
          } else if (response.user.role === 'Admin' || response.user.role === 'admin') {
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

      let userMessage = t('invalidUsernamePassword') || 'Invalid username or password';
      
      if (error.message) {
        const errorMsg = error.message.toLowerCase();
        
        if (errorMsg.includes('push notification') || 
            errorMsg.includes('expo push token') ||
            errorMsg.includes('notification')) {
          console.log('Push notification error suppressed:', error.message);
          return;
        }
        
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
        colors={theme.gradientLogin}
        style={styles.background}
      >
        <View style={styles.content}>
          {/* Login Card with overlapping circle */}
          <View style={styles.cardWrapper}>
            {/* Circle overlapping top of card */}
            <View style={styles.logoCircle}>
              <Image
                source={require('../assets/logomarutham.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            {/* Login Card */}
            <View style={styles.loginCard}>
              <Text style={styles.welcomeText}>Welcome to</Text>
              <Text style={styles.loginTitle} numberOfLines={1} adjustsFontSizeToFit>Marutham Members Sign In</Text>

            <View style={styles.inputWrapper}>
              <View style={styles.inputContainer}>
                <FontAwesome name="user" size={20} color={theme.gold} style={styles.icon} />
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
                <FontAwesome name="lock" size={20} color={theme.gold} style={styles.icon} />
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
                colors={theme.gradientHeader}
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
            </View>{/* end loginCard */}
          </View>{/* end cardWrapper */}

          {/* Bottom Section */}
          <View style={styles.bottomSection}>
            <View style={styles.footerNote}>
              <Text style={styles.footerText}>
                Having trouble logging in?{' '}
                <Text
                  style={styles.contactSupportText}
                  onPress={() => {
                    Alert.alert('Contact Support', 'Please email support@marutham.com');
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
  container: { flex: 1 },
  background: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: 'space-evenly',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
  },
  cardWrapper: { alignItems: 'center', maxWidth: 440, width: '100%', alignSelf: 'center' },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.white,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    marginBottom: -60,
    shadowColor: theme.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: theme.gold,
  },
  logo: { width: 140, height: 140 },
  welcomeText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.textLight,
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: 4,
    marginTop: 10,
  },
  loginCard: {
    backgroundColor: theme.white,
    borderRadius: 28,
    paddingTop: 68,
    paddingHorizontal: 28,
    paddingBottom: 28,
    shadowColor: theme.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
    marginBottom: 10,
    width: '100%',
    zIndex: 1,
  },
  loginTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.textDark,
    marginBottom: 28,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  inputWrapper: { marginBottom: 18 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.primaryLightest,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: theme.border,
    paddingHorizontal: 18,
    height: 56,
  },
  icon: { marginRight: 14 },
  input: { flex: 1, fontSize: 16, color: theme.textDark, height: '100%', fontWeight: '500' },
  eyeIcon: { padding: 8 },
  rememberForgotContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 6,
  },
  rememberMeContainer: { flexDirection: 'row', alignItems: 'center' },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: theme.primary,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: theme.primary },
  rememberMeText: { fontSize: 14, color: theme.textMid, fontWeight: '600' },
  forgotPasswordText: { fontSize: 14, color: theme.primary, fontWeight: '700', textDecorationLine: 'underline' },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    padding: 14,
    borderRadius: 14,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: '#ef5350',
  },
  errorText: { color: '#c62828', fontSize: 14, marginLeft: 12, flex: 1, fontWeight: '600' },
  loginButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 0,
    shadowColor: theme.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  loginButtonDisabled: { opacity: 0.6 },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 28,
  },
  loginIcon: { marginRight: 10 },
  loginButtonText: { color: theme.white, fontSize: 17, fontWeight: '800', letterSpacing: 0.8 },
  bottomSection: { alignItems: 'center', marginTop: 10, paddingTop: 20 },
  footerNote: {
    marginBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  footerText: { fontSize: 13, color: 'rgba(255,255,255,0.95)', textAlign: 'center', lineHeight: 20, fontWeight: '500' },
  contactSupportText: { color: theme.goldLight, fontWeight: '800', textDecorationLine: 'underline' },
  versionText: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 8, fontWeight: '600' },
  copyrightText: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
});

export default LoginScreen;