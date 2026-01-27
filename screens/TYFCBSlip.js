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
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import API_BASE_URL from '../apiConfig';

import MemberIdService from '../service/MemberIdService';

const TYFCBSlip = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [allMembers, setAllMembers] = useState([]);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [savedData, setSavedData] = useState(null);
  const [formData, setFormData] = useState({
    memberName: '',
    memberId: '',
    businessVisited: '',
    amount: '',
    notes: '',
    rating: '',
    // Status field completely removed
  });

  useEffect(() => {
    loadMembers();
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
      const members = await apiGet('/api/Members');
      setAllMembers(members || []);
    } catch (error) {
      console.error('Error loading members:', error);
      Alert.alert('Error', 'Failed to load members list');
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
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.memberName.trim()) {
      Alert.alert('Validation Error', 'Please select a member');
      return false;
    }
    if (!formData.businessVisited.trim()) {
      Alert.alert('Validation Error', 'Please enter business visited');
      return false;
    }
    if (formData.amount && (isNaN(formData.amount) || parseFloat(formData.amount) < 0)) {
      Alert.alert('Validation Error', 'Amount must be a valid positive number');
      return false;
    }
    return true;
  };

  const handleConfirm = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      let givenByMemberId = await MemberIdService.getCurrentUserMemberId();

      // Fallback: If service returns null, try manual lookup (original logic)
      if (!givenByMemberId) {
        console.log('MemberIdService failed, trying manual fallback...');
        const currentUserName = await AsyncStorage.getItem('fullName');
        if (currentUserName) {
          try {
            const members = await apiGet('/api/Members');
            const currentMember = members.find(m => m.name === currentUserName);
            if (currentMember) {
              givenByMemberId = currentMember.id;
              // Update service for next time
              await MemberIdService.setMemberId(givenByMemberId);
            }
          } catch (error) {
            console.error('Manual fallback failed:', error);
          }
        }
      }

      if (!givenByMemberId) {
        Alert.alert('Error', 'Could not find your member ID. Please try again.');
        setLoading(false);
        return;
      }

      // Create TYFCB record WITHOUT status field
      const tyfcbData = {
        givenByMemberId: givenByMemberId,
        receivedByMemberId: parseInt(formData.memberId),
        businessVisited: formData.businessVisited,
        notes: formData.notes,
        rating: formData.rating ? parseInt(formData.rating) : null,
        amount: formData.amount ? parseFloat(formData.amount) : null,
        visitDate: new Date().toISOString(),
        // Status field removed from data
      };

      console.log('Sending TYFCB data:', tyfcbData);

      await apiPost('/api/TYFCB', tyfcbData);

      setSavedData({
        memberName: formData.memberName,
        businessVisited: formData.businessVisited,
        amount: formData.amount,
        rating: formData.rating,
        notes: formData.notes,
        // No status in saved data
      });
      setShowSuccessScreen(true);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to submit TYFCB slip');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#4A90E2" barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#4A90E2', '#87CEEB']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thanks Note</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <ImageBackground
        source={require('../assets/logoicon.png')}
        style={styles.backgroundImage}
        imageStyle={styles.backgroundImageStyle}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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

          {/* Business Visited */}
          <View style={styles.section}>
            <Text style={styles.label}>Business Visited *</Text>
            <View style={styles.inputContainer}>
              <Icon name="briefcase" size={20} color="#4A90E2" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Enter business name"
                value={formData.businessVisited}
                onChangeText={(text) => handleInputChange('businessVisited', text)}
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* Amount */}
          <View style={styles.section}>
            <Text style={styles.label}>Amount</Text>
            <View style={styles.inputContainer}>
              <Icon name="currency-usd" size={20} color="#4A90E2" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Enter amount (optional)"
                value={formData.amount}
                onChangeText={(text) => handleInputChange('amount', text)}
                keyboardType="decimal-pad"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* Rating */}
          <View style={styles.section}>
            <Text style={styles.label}>Rating (1-5 stars)</Text>
            <View style={styles.inputContainer}>
              <Icon name="star" size={20} color="#4A90E2" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Enter rating (1-5)"
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
            <Text style={styles.label}>Notes</Text>
            <View style={[styles.inputContainer, styles.textAreaContainer]}>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter any notes"
                value={formData.notes}
                onChangeText={(text) => handleInputChange('notes', text)}
                multiline
                numberOfLines={4}
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* STATUS SECTION COMPLETELY REMOVED */}

          {/* Confirm Button */}
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Icon name="check-circle" size={20} color="#FFF" />
                <Text style={styles.confirmButtonText}>Confirm Thanks Note</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 30 }} />
        </ScrollView>
      </ImageBackground>

      {/* Success Screen - Updated to remove status display */}
      {showSuccessScreen && (
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <LinearGradient
              colors={['#4A90E2', '#87CEEB']}
              style={styles.successHeader}
            >
              <Icon name="check-circle" size={60} color="#FFF" />
              <Text style={styles.successTitle}>Thanks Note Submitted!</Text>
            </LinearGradient>

            <View style={styles.successContent}>
              <View style={styles.successDetailRow}>
                <Text style={styles.successLabel}>To Member:</Text>
                <Text style={styles.successValue}>{savedData?.memberName}</Text>
              </View>

              <View style={styles.successDetailRow}>
                <Text style={styles.successLabel}>Business Visited:</Text>
                <Text style={styles.successValue}>{savedData?.businessVisited}</Text>
              </View>

              {savedData?.amount && (
                <View style={styles.successDetailRow}>
                  <Text style={styles.successLabel}>Amount:</Text>
                  <Text style={styles.successValue}>₹{savedData.amount}</Text>
                </View>
              )}

              {savedData?.rating && (
                <View style={styles.successDetailRow}>
                  <Text style={styles.successLabel}>Rating:</Text>
                  <Text style={styles.successValue}>{savedData.rating} ⭐</Text>
                </View>
              )}

              {savedData?.notes && (
                <View style={styles.successDetailRow}>
                  <Text style={styles.successLabel}>Notes:</Text>
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
                <Text style={styles.successButtonText}>Back</Text>
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
                    // Status removed
                  });
                }}
              >
                <Icon name="plus-circle" size={20} color="#FFF" />
                <Text style={styles.successButtonText}>Add Another</Text>
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
    marginTop: 8,
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
    color: '#4A90E2',
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
    backgroundColor: '#87CEEB',
    gap: 6,
  },
  successButtonPrimary: {
    backgroundColor: '#4A90E2',
  },
  successButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default TYFCBSlip;