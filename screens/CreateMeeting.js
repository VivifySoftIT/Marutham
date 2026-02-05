import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  TextInput,
  Modal,
  FlatList,
  ImageBackground,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Voice from '@react-native-voice/voice';
import ApiService from '../service/api';

// Alaigal Water Blue Colors
const waterBlueColors = {
  primary: '#4A90E2',
  secondary: '#87CEEB',
  light: '#E3F2FD',
  dark: '#2C5F8D',
  accent: '#5DADE2',
};

const CreateMeeting = () => {
  const navigation = useNavigation();

  // Meeting Details
  const [meetingCode, setMeetingCode] = useState('');
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDescription, setMeetingDescription] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [place, setPlace] = useState('');
  const [meetingDate, setMeetingDate] = useState(new Date());
  const [meetingTime, setMeetingTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Meeting Type
  const [meetingType, setMeetingType] = useState('in-person');
  const [virtualLink, setVirtualLink] = useState('');

  // Member Selection
  const [memberSelection, setMemberSelection] = useState('all');
  const [allMembers, setAllMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredMembers, setFilteredMembers] = useState([]);

  // Loading States
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [saving, setSaving] = useState(false);

  // Voice input states
  const [isListening, setIsListening] = useState(false);
  const [activeVoiceField, setActiveVoiceField] = useState(null);

  // Contact person dropdown states
  const [showContactPersonDropdown, setShowContactPersonDropdown] = useState(false);
  const [contactPersonSearchQuery, setContactPersonSearchQuery] = useState('');
  const [filteredContactPersons, setFilteredContactPersons] = useState([]);

  // Load members
  useEffect(() => {
    loadMembers();
    setupVoice();
    
    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  // Get current user's member ID with fallback logic
  const getCurrentUserMemberId = async () => {
    try {
      // First check if memberId is already in AsyncStorage
      const storedMemberId = await AsyncStorage.getItem('memberId');
      if (storedMemberId) {
        console.log('CreateMeeting - Member ID found in storage:', storedMemberId);
        return parseInt(storedMemberId);
      }

      console.log('CreateMeeting - Member ID not in storage, attempting to look up...');

      // If not, try to get it from user ID
      const userId = await AsyncStorage.getItem('userId');
      const fullName = await AsyncStorage.getItem('fullName');

      if (userId) {
        try {
          // Try to get member by user ID
          console.log('CreateMeeting - Trying GetByUserId with userId:', userId);
          const memberData = await ApiService.getMemberByUserId(userId);
          
          if (memberData && memberData.id) {
            await AsyncStorage.setItem('memberId', memberData.id.toString());
            console.log('CreateMeeting - Member found via GetByUserId:', memberData.id);
            return memberData.id;
          }
        } catch (error) {
          console.log('CreateMeeting - GetByUserId failed, trying name search:', error);
        }
      }

      // Fallback: search by name
      if (fullName) {
        try {
          console.log('CreateMeeting - Searching members by name:', fullName);
          const members = await ApiService.getMembers();
          const member = members.find(m => 
            m.name && m.name.trim().toLowerCase() === fullName.trim().toLowerCase()
          );
          
          if (member) {
            await AsyncStorage.setItem('memberId', member.id.toString());
            console.log('CreateMeeting - Member found by name:', member.id);
            return member.id;
          }
        } catch (error) {
          console.log('CreateMeeting - Name search failed:', error);
        }
      }

      console.log('CreateMeeting - Could not find member ID');
      return null;
    } catch (error) {
      console.error('CreateMeeting - Error getting member ID:', error);
      return null;
    }
  };

  const setupVoice = () => {
    Voice.onSpeechStart = onSpeechStart;
    Voice.onSpeechEnd = onSpeechEnd;
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechError = onSpeechError;
  };

  const onSpeechStart = () => {
    setIsListening(true);
  };

  const onSpeechEnd = () => {
    setIsListening(false);
  };

  const onSpeechResults = (event) => {
    if (event.value && event.value.length > 0) {
      const spokenText = event.value[0];
      
      // Update the active field with spoken text
      switch (activeVoiceField) {
        case 'meetingCode':
          setMeetingCode(spokenText);
          break;
        case 'meetingTitle':
          setMeetingTitle(spokenText);
          break;
        case 'meetingDescription':
          setMeetingDescription(spokenText);
          break;
        case 'contactPerson':
          // For voice input, search for matching members and show dropdown
          setContactPersonSearchQuery(spokenText);
          handleContactPersonSearch(spokenText);
          setShowContactPersonDropdown(true);
          break;
        case 'contactNumber':
          // Extract only numbers from spoken text
          const numbers = spokenText.replace(/\D/g, '').slice(0, 10);
          setContactNumber(numbers);
          break;
        case 'place':
          setPlace(spokenText);
          break;
        case 'virtualLink':
          setVirtualLink(spokenText);
          break;
      }
    }
  };

  const onSpeechError = (error) => {
    console.error('Speech error:', error);
    setIsListening(false);
  };

  const startVoiceInput = async (fieldName) => {
    try {
      setActiveVoiceField(fieldName);
      await Voice.start('en-US');
    } catch (error) {
      console.error('Error starting voice:', error);
      Alert.alert('Error', 'Failed to start voice input');
    }
  };

  const stopVoiceInput = async () => {
    try {
      await Voice.stop();
      setIsListening(false);
      setActiveVoiceField(null);
    } catch (error) {
      console.error('Error stopping voice:', error);
    }
  };

  const loadMembers = async () => {
    try {
      setLoadingMembers(true);
      const members = await ApiService.getMembers();
      setAllMembers(members);
      setFilteredMembers(members);
      setFilteredContactPersons(members); // Initialize contact person options
    } catch (error) {
      console.error('Error loading members:', error);
      Alert.alert('Error', 'Failed to load members');
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setMeetingDate(selectedDate);
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setMeetingTime(selectedTime);
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredMembers(allMembers);
    } else {
      const filtered = allMembers.filter(member =>
        member.name.toLowerCase().includes(query.toLowerCase()) ||
        member.phone?.includes(query) ||
        member.business?.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredMembers(filtered);
    }
  };

  const handleContactPersonSearch = (query) => {
    setContactPersonSearchQuery(query);
    
    if (query.trim() === '') {
      setFilteredContactPersons(allMembers);
    } else {
      const filtered = allMembers.filter(member =>
        member.name.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredContactPersons(filtered);
    }
  };

  const selectContactPerson = (member) => {
    setContactPerson(member.name);
    setContactPersonSearchQuery(member.name);
    setShowContactPersonDropdown(false);
    
    // Auto-fill contact number if available
    if (member.phone) {
      setContactNumber(member.phone.replace(/\D/g, '').slice(0, 10));
    }
  };

  const toggleMemberSelection = (memberId) => {
    setSelectedMembers(prev => {
      if (prev.includes(memberId)) {
        return prev.filter(id => id !== memberId);
      } else {
        return [...prev, memberId];
      }
    });
  };

  const selectAllMembers = () => {
    setSelectedMembers(allMembers.map(m => m.id));
  };

  const deselectAllMembers = () => {
    setSelectedMembers([]);
  };

  const handleCreateMeeting = async () => {
    // Validation (Meeting Code is optional - backend will auto-generate)
    if (!meetingTitle.trim()) {
      Alert.alert('Error', 'Please enter meeting title');
      return;
    }

    if (!contactPerson.trim()) {
      Alert.alert('Error', 'Please enter contact person name');
      return;
    }

    if (!contactNumber.trim()) {
      Alert.alert('Error', 'Please enter contact number');
      return;
    }

    if (contactNumber.length !== 10) {
      Alert.alert('Error', 'Contact number must be 10 digits');
      return;
    }

    if (!place.trim() && meetingType === 'in-person') {
      Alert.alert('Error', 'Please enter meeting place');
      return;
    }

    if (!virtualLink.trim() && meetingType === 'virtual') {
      Alert.alert('Error', 'Please enter virtual meeting link');
      return;
    }

    if (memberSelection === 'specific' && selectedMembers.length === 0) {
      Alert.alert('Error', 'Please select at least one member');
      return;
    }

    try {
      setSaving(true);

      // Get admin's member ID using robust lookup logic
      const adminMemberId = await getCurrentUserMemberId();
      console.log('Admin Member ID retrieved:', adminMemberId);

      if (!adminMemberId) {
        Alert.alert(
          'Error', 
          'Could not retrieve your member ID. Please ensure you are logged in correctly.',
          [
            {
              text: 'OK',
              onPress: () => {
                setSaving(false);
              }
            }
          ]
        );
        return;
      }

      // Format date as YYYY-MM-DD
      const formattedDate = meetingDate.toISOString().split('T')[0];
      
      // Format time as HH:mm:ss
      const hours = String(meetingTime.getHours()).padStart(2, '0');
      const minutes = String(meetingTime.getMinutes()).padStart(2, '0');
      const formattedTime = `${hours}:${minutes}:00`;

      // Prepare member details - pass IDs for specific members
      let memberDetailsString = '';
      if (memberSelection === 'all') {
        memberDetailsString = 'All Members';
      } else {
        // Pass member IDs as comma-separated string
        memberDetailsString = selectedMembers.join(',');
      }

      const meetingData = {
        meetingTitle: meetingTitle.trim(),
        description: meetingDescription.trim() || null,
        contactPersonName: contactPerson.trim(),
        contactPersonNum: contactNumber.trim(),
        meetingDate: formattedDate,
        time: formattedTime,
        place: meetingType === 'in-person' ? place.trim() : 'Virtual Meeting',
        meetingType: meetingType === 'in-person' ? 'In-Person' : 'Virtual',
        meetingLink: meetingType === 'virtual' ? virtualLink.trim() : null,
        memberDetails: memberDetailsString,
        createdBy: parseInt(adminMemberId),
        isActive: true,
      };

      // Only include meeting code if provided (backend will auto-generate if empty)
      if (meetingCode.trim()) {
        meetingData.meetingCode = meetingCode.trim();
      }

      console.log('Creating meeting with data:', meetingData);
      const result = await ApiService.createMeeting(meetingData);
      console.log('Meeting created successfully:', result);

      // Clear all form fields
      setMeetingCode('');
      setMeetingTitle('');
      setMeetingDescription('');
      setContactPerson('');
      setContactPersonSearchQuery('');
      setShowContactPersonDropdown(false);
      setContactNumber('');
      setPlace('');
      setVirtualLink('');
      setMeetingDate(new Date());
      setMeetingTime(new Date());
      setMemberSelection('all');
      setSelectedMembers([]);

      Alert.alert(
        'Success',
        'Meeting created successfully! Form has been cleared.',
        [
          {
            text: 'OK',
            onPress: () => {},
          },
        ]
      );
    } catch (error) {
      console.error('Error creating meeting:', error);
      Alert.alert('Error', error.message || 'Failed to create meeting. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const MemberItem = ({ member }) => {
    const isSelected = selectedMembers.includes(member.id);
    return (
      <TouchableOpacity
        style={[styles.memberItem, isSelected && styles.memberItemSelected]}
        onPress={() => toggleMemberSelection(member.id)}
      >
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{member.name}</Text>
          <Text style={styles.memberDetails}>
            {member.business} • {member.phone}
          </Text>
        </View>
        <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
          {isSelected && <Icon name="check" size={14} color="#FFF" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={waterBlueColors.primary} />

      {/* Header */}
      <LinearGradient colors={[waterBlueColors.primary, waterBlueColors.secondary]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Meeting</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <ImageBackground
        source={require('../assets/Alaigal.png')}
        style={styles.backgroundImage}
        imageStyle={styles.backgroundImageStyle}
      >
        <View style={styles.content}>
          {/* Meeting Code and Title in same row */}
          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Meeting Code (Optional)</Text>
              <View style={styles.inputContainer}>
                <Icon name="barcode" size={16} color={waterBlueColors.primary} />
                <TextInput
                  style={styles.input}
                  placeholder="Auto-generated"
                  value={meetingCode}
                  onChangeText={setMeetingCode}
                  placeholderTextColor="#999"
                />
                <TouchableOpacity
                  onPress={() => isListening && activeVoiceField === 'meetingCode' ? stopVoiceInput() : startVoiceInput('meetingCode')}
                  style={styles.voiceButton}
                >
                  <Icon 
                    name={isListening && activeVoiceField === 'meetingCode' ? "microphone" : "microphone-outline"} 
                    size={18} 
                    color={isListening && activeVoiceField === 'meetingCode' ? '#E91E63' : waterBlueColors.primary} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.halfWidth}>
              <Text style={styles.label}>Meeting Title *</Text>
              <View style={styles.inputContainer}>
                <Icon name="text" size={16} color={waterBlueColors.primary} />
                <TextInput
                  style={styles.input}
                  placeholder="Title"
                  value={meetingTitle}
                  onChangeText={setMeetingTitle}
                  placeholderTextColor="#999"
                />
                <TouchableOpacity
                  onPress={() => isListening && activeVoiceField === 'meetingTitle' ? stopVoiceInput() : startVoiceInput('meetingTitle')}
                  style={styles.voiceButton}
                >
                  <Icon 
                    name={isListening && activeVoiceField === 'meetingTitle' ? "microphone" : "microphone-outline"} 
                    size={18} 
                    color={isListening && activeVoiceField === 'meetingTitle' ? '#E91E63' : waterBlueColors.primary} 
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <View style={[styles.inputContainer, styles.textAreaContainer]}>
              <Icon name="text-box-outline" size={16} color={waterBlueColors.primary} style={styles.textAreaIcon} />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter description"
                value={meetingDescription}
                onChangeText={setMeetingDescription}
                placeholderTextColor="#999"
                multiline
                numberOfLines={2}
              />
              <TouchableOpacity
                onPress={() => isListening && activeVoiceField === 'meetingDescription' ? stopVoiceInput() : startVoiceInput('meetingDescription')}
                style={[styles.voiceButton, styles.voiceButtonTextArea]}
              >
                <Icon 
                  name={isListening && activeVoiceField === 'meetingDescription' ? "microphone" : "microphone-outline"} 
                  size={18} 
                  color={isListening && activeVoiceField === 'meetingDescription' ? '#E91E63' : waterBlueColors.primary} 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Contact Person and Number */}
          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Contact Person *</Text>
              <View style={styles.dropdownContainer}>
                <TouchableOpacity
                  style={styles.inputContainer}
                  onPress={() => setShowContactPersonDropdown(!showContactPersonDropdown)}
                >
                  <Icon name="account" size={16} color={waterBlueColors.primary} />
                  <Text style={[styles.input, { color: contactPerson ? '#333' : '#999' }]}>
                    {contactPerson || 'Select member or type name'}
                  </Text>
                  <Icon 
                    name={showContactPersonDropdown ? 'chevron-up' : 'chevron-down'} 
                    size={16} 
                    color={waterBlueColors.primary} 
                  />
                  <TouchableOpacity
                    onPress={() => isListening && activeVoiceField === 'contactPerson' ? stopVoiceInput() : startVoiceInput('contactPerson')}
                    style={styles.voiceButton}
                  >
                    <Icon 
                      name={isListening && activeVoiceField === 'contactPerson' ? "microphone" : "microphone-outline"} 
                      size={18} 
                      color={isListening && activeVoiceField === 'contactPerson' ? '#E91E63' : waterBlueColors.primary} 
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
                
                {/* Contact Person Dropdown */}
                {showContactPersonDropdown && (
                  <View style={styles.contactPersonDropdown}>
                    {/* Search Input */}
                    <View style={styles.searchContainer}>
                      <Icon name="magnify" size={16} color="#999" />
                      <TextInput
                        style={styles.searchInput}
                        placeholder="Search members..."
                        value={contactPersonSearchQuery}
                        onChangeText={handleContactPersonSearch}
                        placeholderTextColor="#999"
                      />
                      {contactPersonSearchQuery.length > 0 && (
                        <TouchableOpacity 
                          onPress={() => {
                            setContactPersonSearchQuery('');
                            setFilteredContactPersons(allMembers);
                          }}
                        >
                          <Icon name="close-circle" size={16} color="#999" />
                        </TouchableOpacity>
                      )}
                    </View>
                    
                    <ScrollView 
                      style={styles.contactPersonList}
                      nestedScrollEnabled={true}
                      showsVerticalScrollIndicator={true}
                    >
                      {filteredContactPersons.map((member, index) => (
                        <TouchableOpacity
                          key={member.id}
                          style={styles.contactPersonItem}
                          onPress={() => selectContactPerson(member)}
                        >
                          <View style={styles.contactPersonInfo}>
                            <Text style={styles.contactPersonName}>{member.name}</Text>
                            {member.phone && (
                              <Text style={styles.contactPersonPhone}>
                                <Icon name="phone" size={12} color="#666" /> {member.phone}
                              </Text>
                            )}
                          </View>
                          <Icon name="arrow-right" size={16} color={waterBlueColors.primary} />
                        </TouchableOpacity>
                      ))}
                      {filteredContactPersons.length === 0 && (
                        <View style={styles.noContactPersonsContainer}>
                          <Icon name="account-alert" size={24} color="#999" />
                          <Text style={styles.noContactPersonsText}>No matching members found</Text>
                        </View>
                      )}
                    </ScrollView>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.halfWidth}>
              <Text style={styles.label}>Contact Number *</Text>
              <View style={styles.inputContainer}>
                <Icon name="phone" size={16} color={waterBlueColors.primary} />
                <TextInput
                  style={styles.input}
                  placeholder="10 digits"
                  value={contactNumber}
                  onChangeText={(text) => setContactNumber(text.replace(/\D/g, '').slice(0, 10))}
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                  maxLength={10}
                />
                <TouchableOpacity
                  onPress={() => isListening && activeVoiceField === 'contactNumber' ? stopVoiceInput() : startVoiceInput('contactNumber')}
                  style={styles.voiceButton}
                >
                  <Icon 
                    name={isListening && activeVoiceField === 'contactNumber' ? "microphone" : "microphone-outline"} 
                    size={18} 
                    color={isListening && activeVoiceField === 'contactNumber' ? '#E91E63' : waterBlueColors.primary} 
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Date & Time */}
          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Date *</Text>
              <TouchableOpacity
                style={styles.inputContainer}
                onPress={() => setShowDatePicker(true)}
              >
                <Icon name="calendar" size={16} color={waterBlueColors.primary} />
                <Text style={styles.dateTimeText}>
                  {meetingDate.toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.halfWidth}>
              <Text style={styles.label}>Time *</Text>
              <TouchableOpacity
                style={styles.inputContainer}
                onPress={() => setShowTimePicker(true)}
              >
                <Icon name="clock-outline" size={16} color={waterBlueColors.primary} />
                <Text style={styles.dateTimeText}>
                  {meetingTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={meetingDate}
              mode="date"
              display="default"
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={meetingTime}
              mode="time"
              display="default"
              onChange={handleTimeChange}
            />
          )}

          {/* Meeting Type */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Type *</Text>
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[styles.typeButton, meetingType === 'in-person' && styles.typeButtonActive]}
                onPress={() => setMeetingType('in-person')}
              >
                <Icon name="office-building" size={18} color={meetingType === 'in-person' ? '#FFF' : waterBlueColors.primary} />
                <Text style={[styles.typeButtonText, meetingType === 'in-person' && styles.typeButtonTextActive]}>
                  In-Person
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.typeButton, meetingType === 'virtual' && styles.typeButtonActive]}
                onPress={() => setMeetingType('virtual')}
              >
                <Icon name="video" size={18} color={meetingType === 'virtual' ? '#FFF' : waterBlueColors.primary} />
                <Text style={[styles.typeButtonText, meetingType === 'virtual' && styles.typeButtonTextActive]}>
                  Virtual
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Place or Virtual Link */}
          {meetingType === 'in-person' ? (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Place *</Text>
              <View style={styles.inputContainer}>
                <Icon name="map-marker" size={16} color={waterBlueColors.primary} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter place"
                  value={place}
                  onChangeText={setPlace}
                  placeholderTextColor="#999"
                />
                <TouchableOpacity
                  onPress={() => isListening && activeVoiceField === 'place' ? stopVoiceInput() : startVoiceInput('place')}
                  style={styles.voiceButton}
                >
                  <Icon 
                    name={isListening && activeVoiceField === 'place' ? "microphone" : "microphone-outline"} 
                    size={18} 
                    color={isListening && activeVoiceField === 'place' ? '#E91E63' : waterBlueColors.primary} 
                  />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Virtual Link *</Text>
              <View style={styles.inputContainer}>
                <Icon name="link" size={16} color={waterBlueColors.primary} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter link"
                  value={virtualLink}
                  onChangeText={setVirtualLink}
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => isListening && activeVoiceField === 'virtualLink' ? stopVoiceInput() : startVoiceInput('virtualLink')}
                  style={styles.voiceButton}
                >
                  <Icon 
                    name={isListening && activeVoiceField === 'virtualLink' ? "microphone" : "microphone-outline"} 
                    size={18} 
                    color={isListening && activeVoiceField === 'virtualLink' ? '#E91E63' : waterBlueColors.primary} 
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Member Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Invite *</Text>
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[styles.typeButton, memberSelection === 'all' && styles.typeButtonActive]}
                onPress={() => setMemberSelection('all')}
              >
                <Icon name="account-group" size={16} color={memberSelection === 'all' ? '#FFF' : waterBlueColors.primary} />
                <Text style={[styles.typeButtonText, memberSelection === 'all' && styles.typeButtonTextActive]}>
                  All
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.typeButton, memberSelection === 'specific' && styles.typeButtonActive]}
                onPress={() => setMemberSelection('specific')}
              >
                <Icon name="account-multiple-check" size={16} color={memberSelection === 'specific' ? '#FFF' : waterBlueColors.primary} />
                <Text style={[styles.typeButtonText, memberSelection === 'specific' && styles.typeButtonTextActive]}>
                  Specific
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {memberSelection === 'specific' && (
            <TouchableOpacity
              style={styles.selectMembersButton}
              onPress={() => setShowMemberModal(true)}
            >
              <Icon name="account-multiple-plus" size={16} color={waterBlueColors.primary} />
              <Text style={styles.selectMembersText}>
                {selectedMembers.length > 0 ? `${selectedMembers.length} selected` : 'Select Members'}
              </Text>
              <Icon name="chevron-right" size={16} color={waterBlueColors.primary} />
            </TouchableOpacity>
          )}

          {/* Create Button */}
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateMeeting}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Icon name="calendar-check" size={16} color="#FFF" />
                <Text style={styles.createButtonText}>Create Meeting</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ImageBackground>

      {/* Member Selection Modal */}
      <Modal
        visible={showMemberModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMemberModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Members</Text>
              <TouchableOpacity onPress={() => setShowMemberModal(false)}>
                <Icon name="close" size={24} color={waterBlueColors.primary} />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
              <Icon name="magnify" size={18} color="#999" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search members..."
                value={searchQuery}
                onChangeText={handleSearch}
                placeholderTextColor="#999"
              />
              {searchQuery !== '' && (
                <TouchableOpacity onPress={() => handleSearch('')}>
                  <Icon name="close" size={18} color="#999" />
                </TouchableOpacity>
              )}
            </View>

            {/* Select All/Deselect All */}
            <View style={styles.bulkActions}>
              <TouchableOpacity style={styles.bulkActionButton} onPress={selectAllMembers}>
                <Text style={styles.bulkActionText}>Select All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.bulkActionButton} onPress={deselectAllMembers}>
                <Text style={styles.bulkActionText}>Deselect All</Text>
              </TouchableOpacity>
            </View>

            {/* Members List */}
            {loadingMembers ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={waterBlueColors.primary} />
                <Text style={styles.loadingText}>Loading members...</Text>
              </View>
            ) : (
              <FlatList
                data={filteredMembers}
                renderItem={({ item }) => <MemberItem member={item} />}
                keyExtractor={(item) => item.id.toString()}
                style={styles.membersList}
              />
            )}

            {/* Done Button */}
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => setShowMemberModal(false)}
            >
              <Text style={styles.doneButtonText}>
                Done ({selectedMembers.length} selected)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    flex: 1,
    textAlign: 'center',
  },
  backgroundImage: {
    flex: 1,
  },
  backgroundImageStyle: {
    opacity: 0.05,
    resizeMode: 'contain',
  },
  content: {
    flex: 1,
    padding: 12,
  },
  inputGroup: {
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: waterBlueColors.dark,
    marginBottom: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: waterBlueColors.secondary,
  },
  input: {
    flex: 1,
    marginLeft: 6,
    fontSize: 13,
    color: '#333',
  },
  textAreaContainer: {
    alignItems: 'flex-start',
    paddingVertical: 6,
  },
  textAreaIcon: {
    marginTop: 2,
  },
  textArea: {
    height: 50,
    textAlignVertical: 'top',
    paddingTop: 0,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  halfWidth: {
    flex: 1,
    marginHorizontal: 3,
  },
  dateTimeText: {
    marginLeft: 6,
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  typeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderRadius: 6,
    paddingVertical: 8,
    marginHorizontal: 3,
    borderWidth: 1.5,
    borderColor: waterBlueColors.secondary,
  },
  typeButtonActive: {
    backgroundColor: waterBlueColors.primary,
    borderColor: waterBlueColors.primary,
  },
  typeButtonText: {
    marginLeft: 5,
    fontSize: 12,
    fontWeight: '600',
    color: waterBlueColors.primary,
  },
  typeButtonTextActive: {
    color: '#FFF',
  },
  selectMembersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: waterBlueColors.secondary,
    marginBottom: 8,
  },
  selectMembersText: {
    flex: 1,
    marginLeft: 6,
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: waterBlueColors.primary,
    paddingVertical: 11,
    borderRadius: 8,
    marginTop: 6,
  },
  createButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#FFF',
    fontWeight: '600',
  },
  voiceButton: {
    padding: 4,
    marginLeft: 4,
  },
  voiceButtonTextArea: {
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  dropdownContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  contactPersonDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: waterBlueColors.secondary,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    maxHeight: 250,
    zIndex: 1001,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#F8F9FA',
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#333',
    marginLeft: 8,
    paddingVertical: 4,
  },
  contactPersonList: {
    maxHeight: 180,
  },
  contactPersonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  contactPersonInfo: {
    flex: 1,
  },
  contactPersonName: {
    fontSize: 13,
    fontWeight: '600',
    color: waterBlueColors.dark,
    marginBottom: 2,
  },
  contactPersonPhone: {
    fontSize: 11,
    color: '#666',
  },
  noContactPersonsContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noContactPersonsText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  clearButton: {
    padding: 4,
    marginRight: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#FFF',
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 15,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: waterBlueColors.light,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: waterBlueColors.dark,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: waterBlueColors.light,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: waterBlueColors.secondary,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 14,
    color: '#333',
  },
  bulkActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  bulkActionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginHorizontal: 4,
    backgroundColor: waterBlueColors.light,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: waterBlueColors.secondary,
  },
  bulkActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: waterBlueColors.primary,
  },
  membersList: {
    flex: 1,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: waterBlueColors.light,
  },
  memberItemSelected: {
    backgroundColor: waterBlueColors.light,
    borderColor: waterBlueColors.primary,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    color: waterBlueColors.dark,
    marginBottom: 3,
  },
  memberDetails: {
    fontSize: 12,
    color: '#666',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: waterBlueColors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  checkboxChecked: {
    backgroundColor: waterBlueColors.primary,
    borderColor: waterBlueColors.primary,
  },
  doneButton: {
    backgroundColor: waterBlueColors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  doneButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
});

export default CreateMeeting;
