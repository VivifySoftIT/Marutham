import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
  ImageBackground,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import API_BASE_URL from '../apiConfig';
import MemberIdService from '../service/MemberIdService';
import Voice from '@react-native-voice/voice';
import { useLanguage } from '../service/LanguageContext';
import SpeechToTextInput from '../components/SpeechToTextInput';

const TYFCBSlip = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [allMembers, setAllMembers] = useState([]);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [savedData, setSavedData] = useState(null);
  const [isListening, setIsListening] = useState(null);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);

  const [formData, setFormData] = useState({
    memberName: '',
    memberId: '',
    businessVisited: '',
    amount: '',
    notes: '',
    rating: '',
  });

  useEffect(() => {
    loadMembers();
    return () => {
      // Cleanup voice listeners on unmount
      if (Platform.OS !== 'web') {
        Voice.destroy().then(Voice.removeAllListeners);
      }
    };
  }, []);

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
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      return responseData;
    } catch (error) {
      console.error('API POST Error:', error);
      throw error;
    }
  };

  const loadMembers = async () => {
    try {
      setLoadingMembers(true);
      const subCompanyId = await AsyncStorage.getItem('subCompanyId');
      const qs = subCompanyId ? `?subCompanyId=${subCompanyId}` : '';
      const members = await apiGet(`/api/Members${qs}`);
      console.log('TYFCBSlip - Total members loaded:', members?.length || 0);
      const formattedMembers = (members || []).map(member => ({
        ...member,
        name: member.name || t('unknownMember'),
        memberId: member.memberId || member.id,
        phone: member.phone || '',
        email: member.email || '',
      }));
      console.log('TYFCBSlip - Formatted members:', formattedMembers.length);
      setAllMembers(formattedMembers);
    } catch (error) {
      console.error('Error loading members:', error);
      Alert.alert(t('error'), t('failedToLoadMembersList'));
      setAllMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleSelectMember = (member) => {
    setFormData(prev => ({
      ...prev,
      memberName: member.name,
      memberId: member.id,
    }));
    setShowMemberDropdown(false);
    setMemberSearchQuery('');
  };

  const getFilteredMembers = () => {
    if (!memberSearchQuery.trim()) return allMembers; // Show all members when no search query
    return allMembers
      .filter(member =>
        member.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
        String(member.phone || '').includes(memberSearchQuery) ||
        String(member.memberId || '').includes(memberSearchQuery) ||
        member.email?.toLowerCase().includes(memberSearchQuery.toLowerCase())
      ); // Remove the slice limit to show all matching members
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.memberName.trim()) {
      Alert.alert(t('validationError'), t('pleaseSelectMember'));
      return false;
    }
    if (!formData.businessVisited.trim()) {
      Alert.alert(t('validationError'), t('pleaseEnterBusinessVisited'));
      return false;
    }
    if (formData.amount && (isNaN(formData.amount) || parseFloat(formData.amount) < 0)) {
      Alert.alert(t('validationError'), t('amountMustBeValidPositive'));
      return false;
    }
    if (formData.rating && (isNaN(formData.rating) || parseInt(formData.rating) < 1 || parseInt(formData.rating) > 5)) {
      Alert.alert(t('validationError'), t('ratingMustBeBetween1And5'));
      return false;
    }
    return true;
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

          // Handle member name field - find and auto-select matching member
          if (fieldName === 'memberName') {
            const matchedMember = allMembers.find(member =>
              member.name.toLowerCase().includes(spokenText.toLowerCase()) ||
              spokenText.toLowerCase().includes(member.name.toLowerCase())
            );

            if (matchedMember) {
              handleSelectMember(matchedMember);
              Alert.alert(t('success'), `${t('memberSelected')}: ${matchedMember.name}`);
            } else {
              setMemberSearchQuery(spokenText);
              Alert.alert(t('noMatch'), t('noMemberFoundWithThatName'));
            }
          } else {
            // For other fields, just set the value
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
        // Do NOT destroy here immediately, or we lose results processing.
        // destroy will be called on next start or unmount.
        setIsListening(null);
      }
    } catch (e) {
      console.error("Stop Voice Error", e);
    }
  };



  const handleConfirm = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      let givenByMemberId = await MemberIdService.getCurrentUserMemberId();

      if (!givenByMemberId) {
        console.log('MemberIdService failed, trying manual fallback...');
        const currentUserName = await AsyncStorage.getItem('fullName');
        if (currentUserName) {
          try {
            const members = await apiGet('/api/Members');
            const currentMember = members.find(m => m.name === currentUserName);
            if (currentMember) {
              givenByMemberId = currentMember.id;
              await MemberIdService.setMemberId(givenByMemberId);
            }
          } catch (error) {
            console.error('Manual fallback failed:', error);
          }
        }
      }

      if (!givenByMemberId) {
        Alert.alert(t('error'), t('couldNotFindMemberId'));
        setLoading(false);
        return;
      }

      const tyfcbData = {
        givenByMemberId: givenByMemberId,
        receivedByMemberId: parseInt(formData.memberId),
        businessVisited: formData.businessVisited,
        notes: formData.notes,
        rating: formData.rating ? parseInt(formData.rating) : null,
        amount: formData.amount ? parseFloat(formData.amount) : null,
        visitDate: new Date().toISOString(),
      };

      console.log('Sending TYFCB data:', tyfcbData);

      await apiPost('/api/TYFCB', tyfcbData);

      setSavedData({
        memberName: formData.memberName,
        businessVisited: formData.businessVisited,
        amount: formData.amount,
        rating: formData.rating,
        notes: formData.notes,
      });
      setShowSuccessScreen(true);
    } catch (error) {
      Alert.alert(t('error'), error.message || t('failedToSubmitTYFCBSlip'));
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };



  const renderFormContent = () => (
    <>
      {/* Member Selection with Search and Voice Input */}
      <View style={styles.section}>
        <Text style={styles.label}>{t('toMember')} *</Text>

        <TouchableOpacity
          style={styles.memberDropdownButton}
          onPress={() => setShowMemberDropdown(!showMemberDropdown)}
        >
          <Icon name="account" size={20} color="#C9A84C" style={styles.icon} />
          <Text style={[styles.input, { color: formData.memberName ? '#333' : '#999' }]}>
            {formData.memberName || t('selectMember')}
          </Text>
          <Icon name={showMemberDropdown ? 'chevron-up' : 'chevron-down'} size={20} color="#C9A84C" />
        </TouchableOpacity>

        {showMemberDropdown && (
          <View style={styles.memberDropdownList}>
            {/* Search Input */}
            <View style={styles.searchContainer}>
              <Icon name="magnify" size={20} color="#C9A84C" />
              <SpeechToTextInput
                style={styles.searchInput}
                inputStyle={{ borderBottomWidth: 0, borderWidth: 0, paddingLeft: 10 }}
                placeholder={t('searchMembers')}
                value={memberSearchQuery}
                onChangeText={setMemberSearchQuery}
                onVoiceResults={(spokenText) => {
                  const matchedMember = allMembers.find(member =>
                    member.name.toLowerCase().includes(spokenText.toLowerCase()) ||
                    spokenText.toLowerCase().includes(member.name.toLowerCase())
                  );

                  if (matchedMember) {
                    handleSelectMember(matchedMember);
                    Alert.alert(t('success'), `${t('memberSelected')}: ${matchedMember.name}`);
                  } else {
                    setMemberSearchQuery(spokenText);
                    Alert.alert(t('noMatch'), t('noMemberFoundWithThatName'));
                  }
                }}
                placeholderTextColor="#999"
              />
            </View>

            <ScrollView style={styles.memberScrollView} nestedScrollEnabled={true}>
              {loadingMembers ? (
                <View style={styles.dropdownLoadingContainer}>
                  <ActivityIndicator size="small" color="#C9A84C" />
                  <Text style={styles.dropdownLoadingText}>{t('loadingMembers')}</Text>
                </View>
              ) : getFilteredMembers().length > 0 ? (
                getFilteredMembers().map(member => (
                  <TouchableOpacity
                    key={member.id}
                    style={styles.dropdownItem}
                    onPress={() => {
                      handleSelectMember(member);
                      setMemberSearchQuery('');
                    }}
                  >
                    <View style={styles.dropdownItemAvatar}>
                      <Text style={styles.avatarText}>
                        {member.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.dropdownItemContent}>
                      <Text style={styles.dropdownItemName}>{member.name}</Text>
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
                      <Icon name="check-circle" size={20} color="#C9A84C" />
                    )}
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.dropdownLoadingContainer}>
                  <Icon name="account-alert" size={24} color="#999" />
                  <Text style={styles.dropdownLoadingText}>{t('noMembersAvailable')}</Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Business Completed */}
      <View style={styles.section}>
        <Text style={styles.label}>{t('businessVisited')} *</Text>
        <View style={styles.inputContainer}>
          <Icon name="briefcase" size={20} color="#C9A84C" style={styles.icon} />
          <SpeechToTextInput
            style={styles.input}
            inputStyle={{ borderBottomWidth: 0, borderWidth: 0 }}
            placeholder={t('enterBusinessName')}
            value={formData.businessVisited}
            onChangeText={(text) => handleInputChange('businessVisited', text)}
            placeholderTextColor="#999"
          />
        </View>
      </View>

      {/* Amount */}
      <View style={styles.section}>
        <Text style={styles.label}>{t('amount')}</Text>
        <View style={styles.inputContainer}>
          <Icon name="currency-inr" size={20} color="#C9A84C" style={styles.icon} />
          <SpeechToTextInput
            style={styles.input}
            inputStyle={{ borderBottomWidth: 0, borderWidth: 0 }}
            fieldType="amount"
            placeholder={t('enterAmountOptional')}
            value={formData.amount}
            onChangeText={(text) => handleInputChange('amount', text)}
            keyboardType="decimal-pad"
            placeholderTextColor="#999"
          />
        </View>
      </View>

      {/* Rating */}
      <View style={styles.section}>
        <Text style={styles.label}>{t('rating')}</Text>
        <View style={styles.inputContainer}>
          <Icon name="star" size={20} color="#C9A84C" style={styles.icon} />
          <SpeechToTextInput
            style={styles.input}
            inputStyle={{ borderBottomWidth: 0, borderWidth: 0 }}
            fieldType="rating"
            placeholder={t('enterRating')}
            value={formData.rating}
            onChangeText={(text) => handleInputChange('rating', text)}
            keyboardType="numeric"
            maxLength={1}
            placeholderTextColor="#999"
          />
        </View>
      </View>

      {/* Notes */}
      <View style={styles.section}>
        <Text style={styles.label}>{t('notes')}</Text>
        <View style={[styles.inputContainer, styles.textAreaContainer]}>
          <SpeechToTextInput
            style={[styles.input, styles.textArea]}
            inputStyle={{ borderBottomWidth: 0, borderWidth: 0, minHeight: 100 }}
            placeholder={t('enterAnyNotes')}
            value={formData.notes}
            onChangeText={(text) => handleInputChange('notes', text)}
            multiline
            numberOfLines={4}
            placeholderTextColor="#999"
          />
        </View>
      </View>

      {/* Confirm Button */}
      <TouchableOpacity
        style={[styles.confirmButton, (!formData.memberName || !formData.businessVisited) && styles.confirmButtonDisabled]}
        onPress={handleConfirm}
        disabled={loading || !formData.memberName || !formData.businessVisited}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <>
            <Icon name="check-circle" size={20} color="#FFF" />
            <Text style={styles.confirmButtonText}>{t('confirmThanksNote')}</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={{ height: 30 }} />
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#1B5E35" barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#1B5E35', '#2E7D4F']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('thanksNote')}</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <ImageBackground
        source={require('../assets/logomarutham.png')}
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
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {renderFormContent()}
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>

      {/* Success Screen */}
      {showSuccessScreen && (
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <LinearGradient
              colors={['#1B5E35', '#2E7D4F']}
              style={styles.successHeader}
            >
              <Icon name="check-circle" size={60} color="#FFF" />
              <Text style={styles.successTitle}>{t('thanksNoteSubmitted')}</Text>
            </LinearGradient>

            <View style={styles.successContent}>
              <View style={styles.successDetailRow}>
                <Text style={styles.successLabel}>{t('toMember')}:</Text>
                <Text style={styles.successValue}>{savedData?.memberName}</Text>
              </View>

              <View style={styles.successDetailRow}>
                <Text style={styles.successLabel}>{t('businessVisitedLabel')}</Text>
                <Text style={styles.successValue}>{savedData?.businessVisited}</Text>
              </View>

              {savedData?.amount && (
                <View style={styles.successDetailRow}>
                  <Text style={styles.successLabel}>{t('amount')}:</Text>
                  <Text style={styles.successValue}>\u20B9{savedData.amount}</Text>
                </View>
              )}

              {savedData?.rating && (
                <View style={styles.successDetailRow}>
                  <Text style={styles.successLabel}>{t('ratingLabel')}</Text>
                  <Text style={styles.successValue}>{savedData.rating} ⭐</Text>
                </View>
              )}

              {savedData?.notes && (
                <View style={styles.successDetailRow}>
                  <Text style={styles.successLabel}>{t('notesLabel')}</Text>
                  <Text style={styles.successValue}>{savedData.notes}</Text>
                </View>
              )}
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
                onPress={() => {
                  setShowSuccessScreen(false);
                  setFormData({
                    memberName: '',
                    memberId: '',
                    businessVisited: '',
                    amount: '',
                    notes: '',
                    rating: '',
                  });
                  setMemberSearchQuery('');
                }}
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
  scrollContent: {
    padding: 15,
    paddingBottom: 50, // Extra padding for keyboard
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
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#C9A84C',
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
    minHeight: 50,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    paddingVertical: 12,
  },
  textAreaContainer: {
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  textArea: {
    textAlignVertical: 'top',
    paddingTop: 12,
    minHeight: 100,
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

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 12,
    minHeight: 50,
    position: 'relative',
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    paddingVertical: 12,
    paddingLeft: 35,
    paddingRight: 80,
  },
  clearButton: {
    position: 'absolute',
    right: 50,
    padding: 8,
    zIndex: 2,
  },
  voiceButtonInline: {
    position: 'absolute',
    right: 12,
    padding: 8,
    zIndex: 2,
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
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginTop: 8,
    maxHeight: 300,
    elevation: 3,
    paddingVertical: 4,
  },
  memberScrollView: {
    maxHeight: 250,
  },
  voiceSearchButton: {
    padding: 8,
    marginLeft: 4,
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
  memberDropdown: {
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginTop: 8,
    maxHeight: 300,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    paddingVertical: 4,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 4,
    marginBottom: 3,
    borderRadius: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  dropdownItemAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#C9A84C',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dropdownItemContent: {
    flex: 1,
  },
  dropdownItemName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  dropdownItemId: {
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
  memberEmail: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  dropdownLoadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  dropdownLoadingText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  memberScrollView: {
    maxHeight: 250,
  },
  confirmButton: {
    backgroundColor: '#C9A84C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  confirmButtonDisabled: {
    backgroundColor: '#2E7D4F',
    opacity: 0.7,
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
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
    maxWidth: '90%',
    width: '100%',
    maxWidth: 400,
  },
  successHeader: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  successTitle: {
    fontSize: 22,
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
    fontSize: 14,
    fontWeight: '600',
    color: '#C9A84C',
    flex: 1,
  },
  successValue: {
    fontSize: 14,
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
    backgroundColor: '#2E7D4F',
    gap: 6,
  },
  successButtonPrimary: {
    backgroundColor: '#C9A84C',
  },
  successButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default TYFCBSlip;

