import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
  ImageBackground,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../apiConfig';
import Voice from '@react-native-voice/voice';
import { useLanguage } from '../service/LanguageContext';

const ReferralSlip = ({ route }) => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const selectedMember = route?.params?.selectedMember; // Get member from navigation
  const [loading, setLoading] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [allMembers, setAllMembers] = useState([]);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [savedData, setSavedData] = useState(null);
  const [currentUser, setCurrentUser] = useState({
    id: null,
    name: '',
    memberId: null
  });
  const [formData, setFormData] = useState({
    memberName: '',
    memberId: '',
    referralType: '',
    referralCategory: '', // Changed from referralStatus
    referralNumber: '',
    telephone: '',
    email: '',
    address: '',
    comments: '',
    // Status is always 'Pending' and removed from UI
  });
  const [memberSearchQuery, setMemberSearchQuery] = useState(''); // For searching members
  const [isListening, setIsListening] = useState(null); // For voice input tracking
  const [currentVoiceField, setCurrentVoiceField] = useState(null); // Track strictly which field is active

  useEffect(() => {
    loadCurrentUser();
    loadMemberNames();

    // Pre-fill member data if coming from MembersDirectory
    if (selectedMember) {
      setFormData(prev => ({
        ...prev,
        memberName: selectedMember.name,
        memberId: selectedMember.id,
        email: selectedMember.email || '',
        telephone: selectedMember.phone || '',
      }));
    }

    return () => {
      // Cleanup voice listeners on unmount
      if (Platform.OS !== 'web') {
        Voice.destroy().then(Voice.removeAllListeners);
      }
    };
  }, [selectedMember]);

  const loadCurrentUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      const userId = await AsyncStorage.getItem('userId');
      const fullName = await AsyncStorage.getItem('fullName');

      if (userData && userId) {
        const user = JSON.parse(userData);

        try {
          // Try to get member by user ID
          const memberData = await apiGet(`/api/Members/GetByUserId/${userId}`);

          if (memberData && memberData.id) {
            await AsyncStorage.setItem('memberId', memberData.id.toString());
            setCurrentUser({
              id: user.id || null,
              name: user.fullName || fullName || '',
              memberId: memberData.id
            });
            console.log('Member found via GetByUserId:', memberData.id);
          } else {
            // Fallback to name search
            await findMemberByName(user.fullName || fullName);
          }
        } catch (error) {
          console.log('GetByUserId failed, trying name search:', error);
          // Fallback to name search
          await findMemberByName(user.fullName || fullName);
        }
      } else if (fullName) {
        await findMemberByName(fullName);
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const findMemberByName = async (name) => {
    try {
      if (!name) return;

      const members = await apiGet('/api/Members/GetMemberNames');
      if (members && Array.isArray(members)) {
        const member = members.find(m =>
          m.name && m.name.trim().toLowerCase() === name.trim().toLowerCase()
        );

        if (member) {
          await AsyncStorage.setItem('memberId', member.id.toString());
          setCurrentUser({
            id: null,
            name: name,
            memberId: member.id
          });
          console.log('Found member by name:', member.id);
        }
      }
    } catch (error) {
      console.error('Error finding member by name:', error);
    }
  };

  const apiGet = async (endpoint) => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API GET Error:', error);
      throw error;
    }
  };

  const apiPost = async (endpoint, data) => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log('Server error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const responseData = await response.json();
      return responseData;
    } catch (error) {
      console.error('API POST Error:', error);
      throw error;
    }
  };

  const loadMemberNames = async () => {
    try {
      setLoadingMembers(true);
      const members = await apiGet('/api/Members/GetMemberNames');

      if (members && Array.isArray(members)) {
        const formattedMembers = members.map(member => ({
          id: member.id,
          name: member.name || t('unknown'),
          email: member.email || '',
          phone: member.phone || '',
          memberId: member.memberId || `MEM${member.id}`
        }));

        setAllMembers(formattedMembers);
      } else {
        setAllMembers([]);
      }

    } catch (error) {
      console.error('Error loading members:', error);
      Alert.alert(t('error'), t('failedToLoadMembers'));
    } finally {
      setLoadingMembers(false);
    }
  };

  const findMemberIdFromName = async () => {
    try {
      const userName = await AsyncStorage.getItem('fullName');
      if (!userName) return null;

      const members = await apiGet('/api/Members');
      if (members && Array.isArray(members)) {
        const currentMember = members.find(m => {
          if (!m.name) return false;
          return m.name.trim().toLowerCase() === userName.trim().toLowerCase();
        });

        if (currentMember) {
          console.log('Found member ID from name:', currentMember.id);
          await AsyncStorage.setItem('memberId', currentMember.id.toString());
          return currentMember.id;
        }
      }
    } catch (error) {
      console.error('Error finding member ID from name:', error);
    }
    return null;
  };

  const handleSelectMember = (member) => {
    setFormData(prev => ({
      ...prev,
      memberName: member.name,
      memberId: member.id,
      email: member.email || '',
      telephone: member.phone || '',
    }));
    setShowMemberDropdown(false);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleReferralStatus = (status) => {
    // Changed to single selection instead of multiple
    setFormData(prev => ({
      ...prev,
      referralCategory: prev.referralCategory === status ? '' : status
    }));
  };

  const validateForm = () => {
    if (!currentUser.memberId) {
      Alert.alert(
        t('loginRequired'),
        t('pleaseMakeSureLoggedIn'),
        [
          { text: t('ok') },
          {
            text: t('reLogin'),
            onPress: () => navigation.navigate('Login')
          }
        ]
      );
      return false;
    }

    if (!formData.memberName.trim()) {
      Alert.alert(t('validationError'), t('pleaseSelectMember'));
      return false;
    }
    if (!formData.referralType.trim()) {
      Alert.alert(t('validationError'), t('pleaseSelectReferralType'));
      return false;
    }
    if (!formData.referralCategory.trim()) {
      Alert.alert(t('validationError'), t('pleaseSelectReferralCategory'));
      return false;
    }
    if (!formData.referralNumber.trim()) {
      Alert.alert(t('validationError'), t('pleaseEnterReferralNumber'));
      return false;
    }
    if (!formData.telephone.trim()) {
      Alert.alert(t('validationError'), t('pleaseEnterTelephone'));
      return false;
    }

    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(formData.telephone.replace(/\D/g, ''))) {
      Alert.alert(t('validationError'), t('pleaseEnterValidPhone'));
      return false;
    }

    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        Alert.alert(t('validationError'), t('pleaseEnterValidEmail'));
        return false;
      }
    }

    return true;
  };

  const handleConfirm = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      console.log('Current user memberId:', currentUser.memberId);
      console.log('Selected memberId:', formData.memberId);

      if (!currentUser.memberId) {
        throw new Error(t('memberIdNotAvailable'));
      }

      // Status is always 'Pending' - removed from UI
      const referralData = {
        givenByMemberId: currentUser.memberId,
        givenToMemberId: parseInt(formData.memberId),
        referralType: formData.referralType,
        referralStatus: formData.referralCategory, // Changed from array to single value
        referralNumber: formData.referralNumber,
        telephone: formData.telephone,
        email: formData.email || null,
        address: formData.address || '',
        comments: formData.comments || '',
        status: 'Pending' // Always set to Pending
      };

      console.log('Sending referral data:', JSON.stringify(referralData, null, 2));

      const result = await apiPost('/api/Referrals', referralData);

      setSavedData({
        memberName: formData.memberName,
        referralType: formData.referralType,
        referralNumber: formData.referralNumber,
        telephone: formData.telephone,
        email: formData.email,
        status: 'Pending', // Always shows Pending
      });
      setShowSuccessScreen(true);

    } catch (error) {
      console.error('Error submitting referral:', error);

      let errorMessage = error.message || t('failedToSubmitReferral');

      if (error.message.includes('400')) {
        if (error.message.includes('GivenByMember is required')) {
          errorMessage = t('yourMemberInfoMissing');
        } else if (error.message.includes('not found in database')) {
          errorMessage = t('memberProfileNotFound');
        } else {
          errorMessage = t('validationErrorCheckFields');
        }
      } else if (error.message.includes('500')) {
        errorMessage = t('serverErrorTryAgain');
      }

      Alert.alert(t('submissionError'), errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatPhoneNumber = (text) => {
    const cleaned = text.replace(/\D/g, '');

    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);

    if (match) {
      const part1 = match[1];
      const part2 = match[2];
      const part3 = match[3];

      let formatted = '';
      if (part1) formatted += part1;
      if (part2) formatted += '-' + part2;
      if (part3) formatted += '-' + part3;

      return formatted;
    }

    return text;
  };

  const handlePhoneChange = (text) => {
    const formatted = formatPhoneNumber(text);
    handleInputChange('telephone', formatted);
  };

  const handleReset = () => {
    setShowSuccessScreen(false);
    setFormData({
      memberName: '',
      memberId: '',
      referralType: '',
      referralCategory: '',
      referralNumber: '',
      telephone: '',
      email: '',
      address: '',
      comments: '',
    });
    setSavedData(null);
    setMemberSearchQuery('');
  };

  // Voice input functionality
  const startRecording = async (fieldName) => {
    // For Web Platform
    if (Platform.OS === 'web') {
      Alert.alert(t('voiceInput'), t('pleaseUseMobileApp'));
      return;
    }

    try {
      // RESET EVERYTHING
      await Voice.destroy();
      Voice.removeAllListeners();

      setCurrentVoiceField(fieldName);
      setIsListening(fieldName); // UI feedback

      Voice.onSpeechStart = () => console.log('Voice started');
      Voice.onSpeechEnd = () => {
        console.log('Voice ended');
        setIsListening(null);
      };
      Voice.onSpeechError = (e) => {
        console.log('Voice Error:', e);
        setIsListening(null);
      };
      Voice.onSpeechResults = (e) => {
        console.log('Voice Results:', e.value);
        if (e.value && e.value[0]) {
          const spokenText = e.value[0];
          if (fieldName === 'telephone') {
            const phoneDigits = spokenText.replace(/\D/g, '');
            handlePhoneChange(phoneDigits);
          } else {
            handleInputChange(fieldName, spokenText);
          }
        }
      };

      await Voice.start('en-IN');
    } catch (e) {
      console.error("Start Voice Error", e);
      Alert.alert(t('error'), t('couldNotStartVoice'));
      setIsListening(null);
    }
  };

  const stopRecording = async () => {
    try {
      if (Platform.OS !== 'web') {
        await Voice.stop();
        setIsListening(null);
      }
    } catch (e) {
      console.error("Stop Voice Error", e);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#4A90E2" barStyle="light-content" />

      <LinearGradient colors={['#4A90E2', '#87CEEB']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('referral')}</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <ImageBackground
        source={require('../assets/logoicon.png')}
        style={styles.backgroundImage}
        imageStyle={styles.backgroundImageStyle}
      >
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 20}
        >
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >


            {/* Pre-selected Member Info */}
            {selectedMember && (
              <View style={styles.preSelectedMemberBanner}>
                <Icon name="information" size={20} color="#4A90E2" />
                <Text style={styles.preSelectedMemberText}>
                  {t('referralFor')}: <Text style={styles.preSelectedMemberName}>{selectedMember.name}</Text>
                </Text>
              </View>
            )}

            {/* Member Name Dropdown with Search */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('toMember')} *</Text>
              <TouchableOpacity
                style={styles.memberDropdownButton}
                onPress={() => setShowMemberDropdown(!showMemberDropdown)}
              >
                <Icon name="account" size={20} color="#4A90E2" style={styles.icon} />
                <Text style={[styles.input, { color: formData.memberName ? '#333' : '#999' }]}>
                  {formData.memberName || t('selectMember')}
                </Text>
                <Icon name={showMemberDropdown ? 'chevron-up' : 'chevron-down'} size={20} color="#4A90E2" />
              </TouchableOpacity>

              {showMemberDropdown && (
                <View style={styles.memberDropdownList}>
                  {/* Search Input */}
                  <View style={styles.searchContainer}>
                    <Icon name="magnify" size={20} color="#4A90E2" />
                    <TextInput
                      style={styles.searchInput}
                      placeholder={t('searchMembers')}
                      value={memberSearchQuery}
                      onChangeText={setMemberSearchQuery}
                      placeholderTextColor="#999"
                    />
                    {memberSearchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setMemberSearchQuery('')}>
                        <Icon name="close-circle" size={20} color="#999" />
                      </TouchableOpacity>
                    )}
                  </View>

                  <ScrollView style={styles.memberScrollView} nestedScrollEnabled={true}>
                    {loadingMembers ? (
                      <View style={styles.noMembersContainer}>
                        <ActivityIndicator size="small" color="#4A90E2" />
                        <Text style={styles.noMembersText}>{t('loadingMembers')}</Text>
                      </View>
                    ) : allMembers && allMembers.length > 0 ? (
                      allMembers
                        .filter(member =>
                          member.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                          member.phone?.includes(memberSearchQuery) ||
                          member.email?.toLowerCase().includes(memberSearchQuery.toLowerCase())
                        )
                        .map(member => (
                          <TouchableOpacity
                            key={member.id}
                            style={styles.memberDropdownItem}
                            onPress={() => {
                              handleSelectMember(member);
                              setMemberSearchQuery('');
                            }}
                          >
                            <View style={styles.memberItemContent}>
                              <Text style={styles.memberName}>{member.name}</Text>
                              <View style={styles.memberDetailsRow}>
                                <Text style={styles.memberDetail}>
                                  <Icon name="id-card" size={12} color="#999" /> {member.memberId || 'N/A'}
                                </Text>
                                <Text style={styles.memberDetail}>
                                  <Icon name="phone" size={12} color="#999" /> {member.phone || 'N/A'}
                                </Text>
                              </View>
                              {member.email && (
                                <Text style={styles.memberEmail}>
                                  <Icon name="email" size={12} color="#999" /> {member.email}
                                </Text>
                              )}
                            </View>
                            {formData.memberId === member.id && (
                              <Icon name="check" size={20} color="#4A90E2" />
                            )}
                          </TouchableOpacity>
                        ))
                    ) : (
                      <View style={styles.noMembersContainer}>
                        <Icon name="account-alert" size={24} color="#999" />
                        <Text style={styles.noMembersText}>{t('noMembersAvailable')}</Text>
                      </View>
                    )}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Referral Type Radio Buttons */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('referralType')} *</Text>
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={styles.radioButton}
                  onPress={() => handleInputChange('referralType', 'inside')}
                >
                  <Icon
                    name={formData.referralType === 'inside' ? 'radiobox-marked' : 'radiobox-blank'}
                    size={20}
                    color="#4A90E2"
                  />
                  <Text style={styles.radioLabel}>{t('inside')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.radioButton}
                  onPress={() => handleInputChange('referralType', 'outside')}
                >
                  <Icon
                    name={formData.referralType === 'outside' ? 'radiobox-marked' : 'radiobox-blank'}
                    size={20}
                    color="#4A90E2"
                  />
                  <Text style={styles.radioLabel}>{t('outside')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Referral Category Radio Buttons */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('referralCategory')} *</Text>
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={styles.radioButton}
                  onPress={() => handleInputChange('referralCategory', 'Business')}
                >
                  <Icon
                    name={formData.referralCategory === 'Business' ? 'radiobox-marked' : 'radiobox-blank'}
                    size={20}
                    color="#4A90E2"
                  />
                  <Text style={styles.radioLabel}>{t('business')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.radioButton}
                  onPress={() => handleInputChange('referralCategory', 'Personal')}
                >
                  <Icon
                    name={formData.referralCategory === 'Personal' ? 'radiobox-marked' : 'radiobox-blank'}
                    size={20}
                    color="#4A90E2"
                  />
                  <Text style={styles.radioLabel}>{t('personal')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>{t('companyName')}*</Text>
              <View style={styles.inputContainer}>
                <Icon name="account-tie" size={20} color="#4A90E2" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('enterClientOrCompanyName')}
                  value={formData.referralNumber}
                  onChangeText={(text) => handleInputChange('referralNumber', text)}
                  placeholderTextColor="#999"
                />
                <TouchableOpacity
                  onPressIn={() => startRecording('referralNumber')}
                  onPressOut={stopRecording}
                  style={styles.micButton}
                  delayPressIn={100}
                >
                  <Icon
                    name={isListening === 'referralNumber' ? "microphone" : "microphone-outline"}
                    size={22}
                    color={isListening === 'referralNumber' ? "#FF4444" : "#4A90E2"}
                  />
                  {isListening === 'referralNumber' && (
                    <Text style={{ fontSize: 10, color: '#FF4444', position: 'absolute', top: -15, width: 60, textAlign: 'center' }}>{t('recording')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Telephone Number Field */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('mobileNumber')} *</Text>
              <View style={styles.inputContainer}>
                <Icon name="phone" size={20} color="#4A90E2" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('enterTelephoneNumber')}
                  value={formData.telephone}
                  onChangeText={handlePhoneChange}
                  keyboardType="phone-pad"
                  placeholderTextColor="#999"
                  maxLength={12}
                />
                <TouchableOpacity
                  onPressIn={() => startRecording('telephone')}
                  onPressOut={stopRecording}
                  style={styles.micButton}
                  delayPressIn={100}
                >
                  <Icon
                    name={isListening === 'telephone' ? "microphone" : "microphone-outline"}
                    size={22}
                    color={isListening === 'telephone' ? "#FF4444" : "#4A90E2"}
                  />
                  {isListening === 'telephone' && (
                    <Text style={{ fontSize: 10, color: '#FF4444', position: 'absolute', top: -15, width: 60, textAlign: 'center' }}>{t('recording')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Email Field */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('email')} </Text>
              <View style={styles.inputContainer}>
                <Icon name="email" size={20} color="#4A90E2" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('enterEmailOptional')}
                  value={formData.email}
                  onChangeText={(text) => handleInputChange('email', text)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="#999"
                />
                <TouchableOpacity
                  onPressIn={() => startRecording('email')}
                  onPressOut={stopRecording}
                  style={styles.micButton}
                  delayPressIn={100}
                >
                  <Icon
                    name={isListening === 'email' ? "microphone" : "microphone-outline"}
                    size={22}
                    color={isListening === 'email' ? "#FF4444" : "#4A90E2"}
                  />
                  {isListening === 'email' && (
                    <Text style={{ fontSize: 10, color: '#FF4444', position: 'absolute', top: -15, width: 60, textAlign: 'center' }}>{t('recording')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Address */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('address')}</Text>
              <View style={[styles.inputContainer, styles.textAreaContainer]}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder={t('enterAddress')}
                  value={formData.address}
                  onChangeText={(text) => handleInputChange('address', text)}
                  multiline
                  numberOfLines={3}
                  placeholderTextColor="#999"
                />
                <TouchableOpacity
                  onPress={() => startRecording('address')}
                  style={[styles.micButton, styles.micButtonTextArea]}
                >
                  <Icon
                    name={isListening === 'address' ? "microphone" : "microphone-outline"}
                    size={22}
                    color={isListening === 'address' ? "#FF4444" : "#4A90E2"}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Comments */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('comments')}</Text>
              <View style={[styles.inputContainer, styles.textAreaContainer]}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder={t('enterComments')}
                  value={formData.comments}
                  onChangeText={(text) => handleInputChange('comments', text)}
                  multiline
                  numberOfLines={4}
                  placeholderTextColor="#999"
                />
                <TouchableOpacity
                  onPress={() => startRecording('comments')}
                  style={[styles.micButton, styles.micButtonTextArea]}
                >
                  <Icon
                    name={isListening === 'comments' ? "microphone" : "microphone-outline"}
                    size={22}
                    color={isListening === 'comments' ? "#FF4444" : "#4A90E2"}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* STATUS SECTION REMOVED - Always Pending */}

            {/* Confirm Button */}
            <TouchableOpacity
              style={[styles.confirmButton, loading && styles.confirmButtonDisabled]}
              onPress={handleConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Icon name="check-circle" size={20} color="#FFF" />
                  <Text style={styles.confirmButtonText}>{t('confirmReferral')}</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={{ height: 20 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
      {/* Success Screen */}
      {showSuccessScreen && (
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <LinearGradient
              colors={['#4A90E2', '#87CEEB']}
              style={styles.successHeader}
            >
              <Icon name="check-circle" size={60} color="#FFF" />
              <Text style={styles.successTitle}>{t('referralSubmitted')}</Text>
            </LinearGradient>

            <View style={styles.successContent}>
              <View style={styles.successDetailRow}>
                <Text style={styles.successLabel}>{t('toMember')}:</Text>
                <Text style={styles.successValue}>{savedData?.memberName}</Text>
              </View>

              <View style={styles.successDetailRow}>
                <Text style={styles.successLabel}>{t('referralFor')}:</Text>
                <Text style={styles.successValue}>{savedData?.referralNumber}</Text>
              </View>

              <View style={styles.successDetailRow}>
                <Text style={styles.successLabel}>{t('type')}:</Text>
                <Text style={styles.successValue}>
                  {savedData?.referralType === 'inside' ? t('inside') : t('outside')}
                </Text>
              </View>

              <View style={styles.successDetailRow}>
                <Text style={styles.successLabel}>{t('phone')}:</Text>
                <Text style={styles.successValue}>{savedData?.telephone}</Text>
              </View>
            </View>

            <View style={styles.successActions}>
              <TouchableOpacity
                style={styles.successButton}
                onPress={() => navigation.goBack()}
              >
                <Icon name="arrow-left" size={20} color="#FFF" />
                <Text style={styles.successButtonText}>{t('back')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.successButton, styles.successButtonPrimary]}
                onPress={handleReset}
              >
                <Icon name="plus-circle" size={20} color="#FFF" />
                <Text style={styles.successButtonText}>{t('addAnother')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  content: {
    flex: 1,
    padding: 15,
    paddingBottom: 50, // Extra padding for keyboard
  },
  backgroundImage: {
    flex: 1,
  },
  backgroundImageStyle: {
    opacity: 0.1,
  },
  currentUserSection: {
    backgroundColor: '#E8F4FD',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
  },
  currentUserText: {
    fontSize: 14,
    color: '#4A90E2',
    marginBottom: 4,
  },
  currentUserName: {
    fontWeight: '600',
  },
  currentUserId: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  currentUserWarning: {
    fontSize: 12,
    color: '#FF6B6B',
    fontStyle: 'italic',
  },
  preSelectedMemberBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F4FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
  },
  preSelectedMemberText: {
    fontSize: 14,
    color: '#4A90E2',
    marginLeft: 8,
    flex: 1,
  },
  preSelectedMemberName: {
    fontWeight: '600',
    color: '#2C5F8D',
  },
  section: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A90E2',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 12,
    minHeight: 45,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: '#333',
    paddingVertical: 12,
  },
  micButton: {
    padding: 8,
    marginLeft: 4,
  },
  micButtonTextArea: {
    position: 'absolute',
    right: 8,
    top: 8,
  },
  speechInput: {
    flex: 1,
    marginLeft: -12, // Compensate for icon margin
  },
  speechTextArea: {
    flex: 1,
    minHeight: 80,
  },
  textAreaContainer: {
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  textArea: {
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  memberDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 12,
    minHeight: 45,
  },
  memberDropdownList: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginTop: 8,
    maxHeight: 300,
    elevation: 3,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#F8F9FA',
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#333',
    marginLeft: 8,
    paddingVertical: 4,
  },
  memberScrollView: {
    maxHeight: 250,
  },
  memberDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    justifyContent: 'space-between',
  },
  memberItemContent: {
    flex: 1,
  },
  memberName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  memberEmail: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  memberDetailsRow: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 12,
  },
  memberDetail: {
    fontSize: 11,
    color: '#999',
  },
  noMembersContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noMembersText: {
    fontSize: 12,
    color: '#999',
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#87CEEB',
  },
  toggleButtonActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A90E2',
  },
  toggleButtonTextActive: {
    color: '#FFF',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#87CEEB',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  checkboxLabel: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  confirmButton: {
    backgroundColor: '#4A90E2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
    marginBottom: 15,
  },
  confirmButtonDisabled: {
    backgroundColor: '#87CEEB',
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 20,
    paddingVertical: 5,
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radioLabel: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  // Success Screen Styles
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 1000,
  },
  successCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    width: '100%',
    maxWidth: 350,
  },
  successHeader: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 12,
    textAlign: 'center',
  },
  successContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  successDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  successLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A90E2',
    flex: 1,
  },
  successValue: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  successActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  successButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#87CEEB',
    gap: 6,
  },
  successButtonPrimary: {
    backgroundColor: '#4A90E2',
  },
  successButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default ReferralSlip;