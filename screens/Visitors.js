import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import API_BASE_URL from '../apiConfig';
import SpeechToTextInput from '../components/SpeechToTextInput';
import { useLanguage } from '../service/LanguageContext';

const Visitors = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [memberId, setMemberId] = useState(null);
  const [authToken, setAuthToken] = useState(null);

  const [formData, setFormData] = useState({
    FirstName: '',
    LastName: '',
    Phone: '',
    Email: '',
    Business: '',
    VisitDate: new Date(),
    BecameMember: false,
    Notes: '',
  });

  const getCurrentUserMemberId = async () => {
    try {
      const storedMemberId = await AsyncStorage.getItem('memberId');
      if (storedMemberId) {
        const id = parseInt(storedMemberId);
        setMemberId(id);
        return id;
      }
      const userId = await AsyncStorage.getItem('userId');
      const fullName = await AsyncStorage.getItem('fullName');
      if (userId) {
        try {
          const res = await fetch(`${API_BASE_URL}/api/Members/GetByUserId/${userId}`);
          if (res.ok) {
            const data = await res.json();
            if (data && data.id) {
              const id = parseInt(data.id);
              await AsyncStorage.setItem('memberId', id.toString());
              setMemberId(id);
              return id;
            }
          }
        } catch (_) {}
      }
      if (fullName) {
        try {
          const res = await fetch(`${API_BASE_URL}/api/Members`);
          if (res.ok) {
            const members = await res.json();
            const match = members.find(
              m => m.name && m.name.trim().toLowerCase() === fullName.trim().toLowerCase()
            );
            if (match) {
              const id = parseInt(match.id);
              await AsyncStorage.setItem('memberId', id.toString());
              setMemberId(id);
              return id;
            }
          }
        } catch (_) {}
      }
      Alert.alert(t('memberIdRequired'), t('unableToIdentifyMemberAccount'), [
        { text: t('ok'), onPress: () => navigation.goBack() },
      ]);
      return null;
    } catch (error) {
      console.error('Error getting member ID:', error);
      return null;
    }
  };

  const getAuthToken = async () => {
    try {
      const token =
        (await AsyncStorage.getItem('jwt_token')) ||
        (await AsyncStorage.getItem('token')) ||
        (await AsyncStorage.getItem('authToken'));
      if (token) setAuthToken(token);
      return token || null;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  };

  useEffect(() => {
    const init = async () => {
      await getCurrentUserMemberId();
      await getAuthToken();
    };
    init();
  }, []);

  const handleChange = (field, value) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) handleChange('VisitDate', selectedDate);
  };

  const validateForm = () => {
    if (!formData.FirstName.trim()) {
      Alert.alert(t('missingInformation'), t('firstNameRequired'));
      return false;
    }
    if (!formData.LastName.trim()) {
      Alert.alert(t('missingInformation'), t('lastNameRequired'));
      return false;
    }
    if (!formData.Phone.trim()) {
      Alert.alert(t('missingInformation'), t('phoneNumberRequired'));
      return false;
    }
    if (!/^\d{10}$/.test(formData.Phone.trim())) {
      Alert.alert(t('invalidPhoneNumber'), t('pleaseEnterValid10DigitPhone'));
      return false;
    }
    if (formData.Email && !/\S+@\S+\.\S+/.test(formData.Email)) {
      Alert.alert(t('invalidEmail'), t('pleaseEnterValidEmail'));
      return false;
    }
    if (!memberId) {
      Alert.alert(t('memberIdRequired'), t('unableToIdentifyMemberAccount'));
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const payload = {
      BroughtByMemberId: memberId,
      FirstName: formData.FirstName.trim(),
      LastName: formData.LastName.trim(),
      VisitorName: (formData.FirstName + ' ' + formData.LastName).trim(),
      VisitorPhone: formData.Phone.trim(),
      MobileNumber: formData.Phone.trim(),
      VisitorEmail: formData.Email.trim(),
      VisitorBusiness: formData.Business.trim(),
      Company: formData.Business.trim(),
      VisitDate: formData.VisitDate.toISOString().split('T')[0],
      BecameMember: formData.BecameMember,
      Notes: formData.Notes.trim(),
    };

    setLoading(true);
    try {
      if (!authToken) throw new Error('Authentication token not available');

      const response = await fetch(`${API_BASE_URL}/api/Inventory/visitors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      let data = {};
      try { data = JSON.parse(text); } catch (_) {}

      if (response.ok && (data.statusCode === 200 || data.visitorId)) {
        setShowSuccessModal(true);
        setTimeout(() => {
          resetForm();
          setShowSuccessModal(false);
        }, 2000);
      } else {
        Alert.alert(
          t('submissionError'),
          data.statusDesc || data.message || t('failedToSubmitVisitorInfo')
        );
      }
    } catch (error) {
      if (error.message.includes('401') || error.message.includes('403')) {
        Alert.alert(t('sessionExpired'), t('sessionExpiredLoginAgain'), [
          {
            text: t('login'),
            onPress: () =>
              navigation.reset({ index: 0, routes: [{ name: 'Login' }] }),
          },
        ]);
      } else if (
        error.message.includes('Network') ||
        error.message.includes('fetch')
      ) {
        Alert.alert(t('networkError'), t('cannotConnectToServer'));
      } else {
        Alert.alert(
          t('submissionFailed'),
          error.message || t('unexpectedErrorOccurred')
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      FirstName: '',
      LastName: '',
      Phone: '',
      Email: '',
      Business: '',
      VisitDate: new Date(),
      BecameMember: false,
      Notes: '',
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#4A90E2" barStyle="light-content" />

      <LinearGradient colors={['#4A90E2', '#87CEEB']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('registerVisitor')}</Text>
        <TouchableOpacity
          onPress={async () => {
            await getCurrentUserMemberId();
            await getAuthToken();
          }}
        >
          <Icon name="refresh" size={20} color="#FFF" />
        </TouchableOpacity>
      </LinearGradient>

      <ImageBackground
        source={require('../assets/logoicon.png')}
        style={styles.bg}
        imageStyle={styles.bgImage}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {memberId ? (
              <View style={styles.memberBanner}>
                <Icon name="check-circle" size={16} color="#4CAF50" />
                <Text style={styles.memberBannerText}>
                  {t('visitorRegisteredUnderAccount').replace('{{memberId}}', memberId)}
                </Text>
              </View>
            ) : null}

            {/* Visitor Info Card */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{t('visitorInformation')}</Text>

              <Text style={styles.label}>{t('firstName')} *</Text>
              <SpeechToTextInput
                placeholder={t('enterFirstName')}
                value={formData.FirstName}
                onChangeText={text => handleChange('FirstName', text)}
                placeholderTextColor="#999"
              />

              <Text style={styles.label}>{t('lastName')} *</Text>
              <SpeechToTextInput
                placeholder={t('enterLastName')}
                value={formData.LastName}
                onChangeText={text => handleChange('LastName', text)}
                placeholderTextColor="#999"
              />

              <Text style={styles.label}>{t('phoneNumber')} *</Text>
              <SpeechToTextInput
                placeholder={t('enterPhoneNumber')}
                value={formData.Phone}
                onChangeText={text => handleChange('Phone', text.replace(/[^0-9]/g, '').slice(0, 10))}
                keyboardType="phone-pad"
                maxLength={10}
                placeholderTextColor="#999"
              />

              <Text style={styles.label}>{t('visitorEmail')}</Text>
              <SpeechToTextInput
                placeholder={t('enterVisitorEmail')}
                value={formData.Email}
                onChangeText={text => handleChange('Email', text)}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#999"
              />

              <Text style={styles.label}>{t('businessCompany')}</Text>
              <SpeechToTextInput
                placeholder={t('enterBusinessOrCompany')}
                value={formData.Business}
                onChangeText={text => handleChange('Business', text)}
                placeholderTextColor="#999"
              />
            </View>

            {/* Visit Details Card */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{t('visitDetails')}</Text>

              <Text style={styles.label}>{t('visitDate')}</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowDatePicker(true)}
              >
                <Icon name="calendar" size={20} color="#4A90E2" style={{ marginRight: 8 }} />
                <Text style={styles.dateText}>
                  {formData.VisitDate.toDateString()}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={formData.VisitDate}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                />
              )}

              <Text style={styles.label}>{t('notes')}</Text>
              <SpeechToTextInput
                placeholder={t('enterAdditionalNotes')}
                value={formData.Notes}
                onChangeText={text => handleChange('Notes', text)}
                multiline
                numberOfLines={3}
                placeholderTextColor="#999"
              />

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => handleChange('BecameMember', !formData.BecameMember)}
              >
                <View style={[styles.checkbox, formData.BecameMember && styles.checkboxActive]}>
                  {formData.BecameMember ? <Icon name="check" size={14} color="#FFF" /> : null}
                </View>
                <Text style={styles.checkboxLabel}>{t('visitorBecameMember')}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.submitBtn,
                (loading || !memberId || !authToken) && styles.submitBtnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={loading || !memberId || !authToken}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {!memberId
                    ? t('noMemberId')
                    : !authToken
                    ? t('noToken')
                    : t('submitVisitor')}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>

      <Modal transparent animationType="fade" visible={showSuccessModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Icon name="check-circle" size={60} color="#4CAF50" />
            <Text style={styles.modalTitle}>
              {formData.BecameMember
                ? t('memberRequestSubmitted')
                : t('visitorRegisteredSuccessfully')}
            </Text>
            <Text style={styles.modalMsg}>
              {formData.BecameMember
                ? t('memberRequestSubmittedDesc')
                : t('visitorInfoSavedToSystem')}
            </Text>
            <TouchableOpacity
              style={styles.modalBtn}
              onPress={() => {
                setShowSuccessModal(false);
                resetForm();
              }}
            >
              <Text style={styles.modalBtnText}>{t('continue')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default Visitors;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F9FC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    height: 56,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
  bg: { flex: 1 },
  bgImage: { opacity: 0.07 },
  scrollContent: { padding: 15, paddingBottom: 30 },
  memberBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F4FD',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
  },
  memberBannerText: {
    fontSize: 13,
    color: '#2C5AA0',
    fontWeight: '500',
    marginLeft: 8,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 15,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4A90E2',
    marginBottom: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginBottom: 4,
    marginTop: 10,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FBFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 10,
    height: 45,
  },
  dateText: { fontSize: 14, color: '#333' },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#87CEEB',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: { backgroundColor: '#4A90E2', borderColor: '#4A90E2' },
  checkboxLabel: { fontSize: 14, color: '#333', fontWeight: '500' },
  submitBtn: {
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 4,
  },
  submitBtnDisabled: { backgroundColor: '#A5D6A7' },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 25,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMsg: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 20,
  },
  modalBtn: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 25,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
});
