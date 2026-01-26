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
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../apiConfig';
import SpeechToTextInput from '../components/SpeechToTextInput';

const OneToOneSlip = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [allMembers, setAllMembers] = useState([]);
  const [formData, setFormData] = useState({
    memberName: '',
    memberId: '',
    metWith: '',
    location: '',
    date: new Date(),
    topic: '',
  });

  useEffect(() => {
    loadMembers();
  }, []);

  // API Helper Functions
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

  const handleDateChange = (event, selectedDate) => {
    if (selectedDate) {
      setFormData(prev => ({ ...prev, date: selectedDate }));
    }
    setShowDatePicker(false);
  };

  const validateForm = () => {
    if (!formData.memberName.trim()) {
      Alert.alert('Validation Error', 'Please select a member');
      return false;
    }
    if (!formData.metWith.trim()) {
      Alert.alert('Validation Error', 'Please enter who you met with');
      return false;
    }
    if (!formData.location.trim()) {
      Alert.alert('Validation Error', 'Please enter location');
      return false;
    }
    if (!formData.topic.trim()) {
      Alert.alert('Validation Error', 'Please enter topic');
      return false;
    }
    return true;
  };

  const handleConfirm = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const currentUserName = await AsyncStorage.getItem('fullName');
      
      // Get the logged-in user's member ID from database
      let givenByMemberId = null;
      try {
        const members = await apiGet('/api/Members');
        const currentMember = members.find(m => m.name === currentUserName);
        if (currentMember) {
          givenByMemberId = currentMember.id;
        }
      } catch (error) {
        console.error('Error fetching current user member ID:', error);
      }

      if (!givenByMemberId) {
        Alert.alert('Error', 'Could not find your member ID. Please try again.');
        setLoading(false);
        return;
      }

      // Create OneToOne meeting record
      const meetingData = {
        member1Id: givenByMemberId,
        member2Id: parseInt(formData.memberId),
        metWith: formData.metWith,
        location: formData.location,
        meetingDate: formData.date.toISOString(),
        topic: formData.topic,
        status: 'Completed',
      };

      console.log('Sending OneToOne meeting data:', meetingData);
      
      // Send to OneToOneMeeting API
      await apiPost('/api/OneToOneMeeting', meetingData);
      
      Alert.alert(
        'Success',
        'One-to-One meeting slip submitted successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to submit meeting slip');
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
        <Text style={styles.headerTitle}>One-to-One Meeting</Text>
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
            <Text style={styles.label}>Member *</Text>
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

          {/* Met With */}
          <View style={styles.section}>
            <Text style={styles.label}>Met With *</Text>
            <View style={styles.inputContainer}>
              <Icon name="account" size={20} color="#4A90E2" style={styles.icon} />
              <SpeechToTextInput
                style={styles.speechInput}
                placeholder="Enter person name"
                value={formData.metWith}
                onChangeText={(text) => handleInputChange('metWith', text)}
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* Location */}
          <View style={styles.section}>
            <Text style={styles.label}>Location *</Text>
            <View style={styles.inputContainer}>
              <Icon name="map-marker" size={20} color="#4A90E2" style={styles.icon} />
              <SpeechToTextInput
                style={styles.speechInput}
                placeholder="Enter location"
                value={formData.location}
                onChangeText={(text) => handleInputChange('location', text)}
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* Date */}
          <View style={styles.section}>
            <Text style={styles.label}>Date *</Text>
            <TouchableOpacity
              style={styles.inputContainer}
              onPress={() => setShowDatePicker(true)}
            >
              <Icon name="calendar" size={20} color="#4A90E2" style={styles.icon} />
              <Text style={styles.dateText}>
                {formData.date.toLocaleDateString()}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={formData.date}
                mode="date"
                display="default"
                onChange={handleDateChange}
              />
            )}
          </View>

          {/* Topic */}
          <View style={styles.section}>
            <Text style={styles.label}>Topic *</Text>
            <View style={[styles.inputContainer, styles.textAreaContainer]}>
              <SpeechToTextInput
                style={styles.speechTextArea}
                placeholder="Enter meeting topic"
                value={formData.topic}
                onChangeText={(text) => handleInputChange('topic', text)}
                multiline
                numberOfLines={4}
                placeholderTextColor="#999"
              />
            </View>
          </View>

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
                <Text style={styles.confirmButtonText}>Confirm Meeting</Text>
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
  dateText: {
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
});

export default OneToOneSlip;
