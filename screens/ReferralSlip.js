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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../apiConfig';

const ReferralSlip = () => {
  const navigation = useNavigation();
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
    referralStatus: [],
    referralNumber: '',
    telephone: '',
    email: '',
    address: '',
    comments: '',
    // Status is always 'Pending' and removed from UI
  });

  useEffect(() => {
    loadCurrentUser();
    loadMemberNames();
  }, []);

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
          name: member.name || 'Unknown',
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
      Alert.alert('Error', 'Failed to load members. Please try again.');
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
    setFormData(prev => {
      const newStatus = prev.referralStatus.includes(status)
        ? prev.referralStatus.filter(s => s !== status)
        : [...prev.referralStatus, status];
      return { ...prev, referralStatus: newStatus };
    });
  };

  const validateForm = () => {
    if (!currentUser.memberId) {
      Alert.alert(
        'Login Required',
        'Please make sure you are properly logged in as a member.',
        [
          { text: 'OK' },
          { 
            text: 'Re-login', 
            onPress: () => navigation.navigate('Login')
          }
        ]
      );
      return false;
    }

    if (!formData.memberName.trim()) {
      Alert.alert('Validation Error', 'Please select a member');
      return false;
    }
    if (!formData.referralType.trim()) {
      Alert.alert('Validation Error', 'Please select referral type');
      return false;
    }
    if (formData.referralStatus.length === 0) {
      Alert.alert('Validation Error', 'Please select at least one referral status');
      return false;
    }
    if (!formData.referralNumber.trim()) {
      Alert.alert('Validation Error', 'Please enter referral number');
      return false;
    }
    if (!formData.telephone.trim()) {
      Alert.alert('Validation Error', 'Please enter telephone number');
      return false;
    }
    
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(formData.telephone.replace(/\D/g, ''))) {
      Alert.alert('Validation Error', 'Please enter a valid 10-digit telephone number');
      return false;
    }
    
    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        Alert.alert('Validation Error', 'Please enter a valid email address');
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
        throw new Error('Your member ID is not available. Please re-login.');
      }

      // Status is always 'Pending' - removed from UI
      const referralData = {
        givenByMemberId: currentUser.memberId,
        givenToMemberId: parseInt(formData.memberId),
        referralType: formData.referralType,
        referralStatus: formData.referralStatus.join(','),
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
      
      let errorMessage = error.message || 'Failed to submit referral';
      
      if (error.message.includes('400')) {
        if (error.message.includes('GivenByMember is required')) {
          errorMessage = 'Your member information is missing. Please ensure you are registered as a member.';
        } else if (error.message.includes('not found in database')) {
          errorMessage = 'Your member profile was not found. Please contact administrator.';
        } else {
          errorMessage = 'Validation error. Please check all required fields.';
        }
      } else if (error.message.includes('500')) {
        errorMessage = 'Server error. Please try again later.';
      }
      
      Alert.alert('Submission Error', errorMessage);
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#4A90E2" barStyle="light-content" />

      <LinearGradient colors={['#4A90E2', '#87CEEB']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Referral Slip</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <ImageBackground
        source={require('../assets/logoicon.png')}
        style={styles.backgroundImage}
        imageStyle={styles.backgroundImageStyle}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Current User Info */}
          <View style={styles.currentUserSection}>
            <Text style={styles.currentUserText}>
              Logged in as: <Text style={styles.currentUserName}>{currentUser.name || 'Not logged in'}</Text>
            </Text>
            {currentUser.memberId ? (
              <Text style={styles.currentUserId}>Your Member ID: {currentUser.memberId}</Text>
            ) : (
              <Text style={styles.currentUserWarning}>Member ID not found. Please re-login.</Text>
            )}
          </View>

          {/* Member Name Dropdown */}
          <View style={styles.section}>
            <Text style={styles.label}>To Member *</Text>
            <TouchableOpacity
              style={styles.memberDropdownButton}
              onPress={() => setShowMemberDropdown(!showMemberDropdown)}
            >
              <Icon name="account" size={20} color="#4A90E2" style={styles.icon} />
              <Text style={[styles.input, { color: formData.memberName ? '#333' : '#999' }]}>
                {formData.memberName || 'Select member'}
              </Text>
              <Icon name={showMemberDropdown ? 'chevron-up' : 'chevron-down'} size={20} color="#4A90E2" />
            </TouchableOpacity>

            {showMemberDropdown && (
              <ScrollView style={styles.memberDropdownList} nestedScrollEnabled={true}>
                {loadingMembers ? (
                  <View style={styles.noMembersContainer}>
                    <ActivityIndicator size="small" color="#4A90E2" />
                    <Text style={styles.noMembersText}>Loading members...</Text>
                  </View>
                ) : allMembers && allMembers.length > 0 ? (
                  allMembers.map(member => (
                    <TouchableOpacity
                      key={member.id}
                      style={styles.memberDropdownItem}
                      onPress={() => handleSelectMember(member)}
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
                    <Text style={styles.noMembersText}>No members available</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>

          {/* Referral Type Toggle */}
          <View style={styles.section}>
            <Text style={styles.label}>Referral Type *</Text>
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  formData.referralType === 'inside' && styles.toggleButtonActive,
                ]}
                onPress={() => handleInputChange('referralType', 'inside')}
              >
                <Text
                  style={[
                    styles.toggleButtonText,
                    formData.referralType === 'inside' && styles.toggleButtonTextActive,
                  ]}
                >
                  Inside
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  formData.referralType === 'outside' && styles.toggleButtonActive,
                ]}
                onPress={() => handleInputChange('referralType', 'outside')}
              >
                <Text
                  style={[
                    styles.toggleButtonText,
                    formData.referralType === 'outside' && styles.toggleButtonTextActive,
                  ]}
                >
                  Outside
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Referral Status Checkboxes */}
          <View style={styles.section}>
            <Text style={styles.label}>Referral Status *</Text>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => toggleReferralStatus('told_call')}
            >
              <View style={[styles.checkbox, formData.referralStatus.includes('told_call') && styles.checkboxActive]}>
                {formData.referralStatus.includes('told_call') && (
                  <Icon name="check" size={16} color="#FFF" />
                )}
              </View>
              <Text style={styles.checkboxLabel}>Told them you would call</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => toggleReferralStatus('given_card')}
            >
              <View style={[styles.checkbox, formData.referralStatus.includes('given_card') && styles.checkboxActive]}>
                {formData.referralStatus.includes('given_card') && (
                  <Icon name="check" size={16} color="#FFF" />
                )}
              </View>
              <Text style={styles.checkboxLabel}>Given your card</Text>
            </TouchableOpacity>
          </View>

          {/* Referral Number */}
          <View style={styles.section}>
            <Text style={styles.label}>Referral Number/Name *</Text>
            <View style={styles.inputContainer}>
              <Icon name="numeric" size={20} color="#4A90E2" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Enter referral number or client name"
                value={formData.referralNumber}
                onChangeText={(text) => handleInputChange('referralNumber', text)}
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* Telephone Number Field */}
          <View style={styles.section}>
            <Text style={styles.label}>Telephone Number *</Text>
            <View style={styles.inputContainer}>
              <Icon name="phone" size={20} color="#4A90E2" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Enter telephone number (e.g., 123-456-7890)"
                value={formData.telephone}
                onChangeText={handlePhoneChange}
                keyboardType="phone-pad"
                placeholderTextColor="#999"
                maxLength={12}
              />
            </View>
          </View>

          {/* Email Field */}
          <View style={styles.section}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputContainer}>
              <Icon name="email" size={20} color="#4A90E2" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Enter email address (optional)"
                value={formData.email}
                onChangeText={(text) => handleInputChange('email', text)}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* Address */}
          <View style={styles.section}>
            <Text style={styles.label}>Address</Text>
            <View style={[styles.inputContainer, styles.textAreaContainer]}>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter address"
                value={formData.address}
                onChangeText={(text) => handleInputChange('address', text)}
                multiline
                numberOfLines={3}
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* Comments */}
          <View style={styles.section}>
            <Text style={styles.label}>Comments</Text>
            <View style={[styles.inputContainer, styles.textAreaContainer]}>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter any comments"
                value={formData.comments}
                onChangeText={(text) => handleInputChange('comments', text)}
                multiline
                numberOfLines={4}
                placeholderTextColor="#999"
              />
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
                <Text style={styles.confirmButtonText}>Confirm Referral Slip</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 30 }} />
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
  content: {
    flex: 1,
    padding: 15,
  },
  backgroundImage: {
    flex: 1,
  },
  backgroundImageStyle: {
    opacity: 0.1,
  },
  currentUserSection: {
    backgroundColor: '#E8F4FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
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
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
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
  },
  memberDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 12,
    minHeight: 50,
  },
  memberDropdownList: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginTop: 8,
    maxHeight: 250,
    elevation: 3,
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
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  memberEmail: {
    fontSize: 12,
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
    fontSize: 14,
    color: '#999',
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#87CEEB',
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  toggleButtonText: {
    fontSize: 14,
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
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  confirmButton: {
    backgroundColor: '#4A90E2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  confirmButtonDisabled: {
    backgroundColor: '#87CEEB',
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default ReferralSlip;