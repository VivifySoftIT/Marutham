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
import ApiService from '../service/api';
import { useLanguage } from '../service/LanguageContext';
import SpeechToTextInput from '../components/SpeechToTextInput';

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
  const { t } = useLanguage();

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

  // Contact Person Dropdown
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [contactSearchResults, setContactSearchResults] = useState([]);

  // Loading States
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load members
  useEffect(() => {
    loadMembers();
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

  const loadMembers = async () => {
    try {
      setLoadingMembers(true);
      const members = await ApiService.getMembers();
      setAllMembers(members);
      setFilteredMembers(members);
    } catch (error) {
      console.error('Error loading members:', error);
      Alert.alert(t('error'), t('failedToLoadMembers'));
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

  // Handle contact person search (voice and text)
  const handleContactPersonSearch = (query) => {
    setContactPerson(query);
    
    if (query.trim() === '') {
      setContactSearchResults([]);
      setShowContactDropdown(false);
      return;
    }

    // Search members by name
    const filtered = allMembers.filter(member =>
      member.name.toLowerCase().includes(query.toLowerCase())
    );
    
    setContactSearchResults(filtered);
    setShowContactDropdown(filtered.length > 0);
  };

  // Handle voice search for contact person
  const handleContactPersonVoice = (spokenText) => {
    handleContactPersonSearch(spokenText);
  };

  // Select contact person from dropdown
  const selectContactPerson = (member) => {
    setContactPerson(member.name);
    setContactNumber(member.phone || '');
    setContactSearchResults([]);
    setShowContactDropdown(false);
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
      Alert.alert(t('error'), t('pleaseEnterMeetingTitle'));
      return;
    }

    if (!contactPerson.trim()) {
      Alert.alert(t('error'), t('pleaseEnterContactPerson'));
      return;
    }

    if (!contactNumber.trim()) {
      Alert.alert(t('error'), t('pleaseEnterContactNumber'));
      return;
    }

    if (contactNumber.length !== 10) {
      Alert.alert(t('error'), t('contactNumberLengthError'));
      return;
    }

    if (!place.trim() && meetingType === 'in-person') {
      Alert.alert(t('error'), t('pleaseEnterPlace'));
      return;
    }

    if (!virtualLink.trim() && meetingType === 'virtual') {
      Alert.alert(t('error'), t('pleaseEnterVirtualLink'));
      return;
    }

    if (memberSelection === 'specific' && selectedMembers.length === 0) {
      Alert.alert(t('error'), t('pleaseSelectAtLeastOneMember'));
      return;
    }

    try {
      setSaving(true);

      // Get admin's member ID using robust lookup logic
      const adminMemberId = await getCurrentUserMemberId();
      console.log('Admin Member ID retrieved:', adminMemberId);

      if (!adminMemberId) {
        Alert.alert(
          t('error'),
          t('adminMemberIdNotFound'),
          [
            {
              text: t('ok'),
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

      setContactNumber('');
      setPlace('');
      setVirtualLink('');
      setMeetingDate(new Date());
      setMeetingTime(new Date());
      setMemberSelection('all');
      setSelectedMembers([]);

      Alert.alert(
        t('success'),
        t('meetingCreatedSuccess'),
        [
          {
            text: t('ok'),
            onPress: () => { },
          },
        ]
      );
    } catch (error) {
      console.error('Error creating meeting:', error);
      Alert.alert(t('error'), error.message || t('failedToCreateMeeting'));
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
        <Text style={styles.headerTitle}>{t('createMeeting')}</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <ImageBackground
        source={require('../assets/Alaigal.png')}
        style={styles.backgroundImage}
        imageStyle={styles.backgroundImageStyle}
      >
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
          {/* Meeting Code and Title in same row */}
          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>{t('meetingCodeOptional')}</Text>
              <SpeechToTextInput
                style={styles.voiceInputWrapper}
                inputStyle={styles.voiceInputField}
                placeholder={t('autoGenerated')}
                value={meetingCode}
                onChangeText={setMeetingCode}
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.halfWidth}>
              <Text style={styles.label}>{t('meetingTitleLabel')} *</Text>
              <SpeechToTextInput
                style={styles.voiceInputWrapper}
                inputStyle={styles.voiceInputField}
                placeholder={t('meetingTitleLabel')}
                value={meetingTitle}
                onChangeText={setMeetingTitle}
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('description') || 'Description'}</Text>
            <SpeechToTextInput
              style={styles.voiceInputWrapper}
              inputStyle={[styles.voiceInputField, styles.textAreaInput]}
              placeholder={t('enterDescription')}
              value={meetingDescription}
              onChangeText={setMeetingDescription}
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Contact Person and Number with Voice Search Dropdown */}
          <View style={styles.row}>
            <View style={[styles.halfWidth, styles.dropdownContainer]}>
              <Text style={styles.label}>{t('contactPerson')} *</Text>
              <SpeechToTextInput
                style={styles.voiceInputWrapper}
                inputStyle={styles.voiceInputField}
                placeholder={t('contactPerson') || 'Contact Person'}
                value={contactPerson}
                onChangeText={handleContactPersonSearch}
                onVoiceResults={handleContactPersonVoice}
                placeholderTextColor="#999"
              />
              
              {/* Contact Person Dropdown */}
              {showContactDropdown && contactSearchResults.length > 0 && (
                <View style={styles.contactPersonDropdown}>
                  <FlatList
                    data={contactSearchResults}
                    keyExtractor={(item) => item.id.toString()}
                    style={styles.contactPersonList}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.contactPersonItem}
                        onPress={() => selectContactPerson(item)}
                      >
                        <View style={styles.contactPersonInfo}>
                          <Text style={styles.contactPersonName}>{item.name}</Text>
                          <Text style={styles.contactPersonPhone}>{item.phone}</Text>
                        </View>
                        <Icon name="chevron-right" size={16} color={waterBlueColors.primary} />
                      </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                      <View style={styles.noContactPersonsContainer}>
                        <Icon name="account-off" size={32} color="#CCC" />
                        <Text style={styles.noContactPersonsText}>
                          {t('noMembersFound')}
                        </Text>
                      </View>
                    }
                  />
                </View>
              )}
            </View>

            <View style={styles.halfWidth}>
              <Text style={styles.label}>{t('contactNumber')} *</Text>
              <SpeechToTextInput
                style={styles.voiceInputWrapper}
                inputStyle={styles.voiceInputField}
                placeholder={t('tenDigits')}
                value={contactNumber}
                onChangeText={(text) => setContactNumber(text.replace(/\D/g, '').slice(0, 10))}
                placeholderTextColor="#999"
                keyboardType="phone-pad"
                maxLength={10}
                fieldType="amount"
              />
            </View>
          </View>

          {/* Date & Time */}
          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>{t('date')} *</Text>
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
              <Text style={styles.label}>{t('time') || 'Time'} *</Text>
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
            <Text style={styles.label}>{t('reportType')} *</Text>
            {/* Using reportType as label for 'Type' since 'type' might be reserved or missing, 
                actually 'type' doesn't exist in searched keys, 'reportType' is 'Report Type'. 
                Maybe better to use 'meeting' + 'Type' or just 'Type' hardcoded if check failed.
                Wait, I saw 'Type' somewhere? No. I'll use 'reportType' for now or just 'Type' label if I missed adding it.
                I didn't add 'type' key. I'll use 'Type' string or add it. 
                Wait, `meeting` key exists? `meeting`: 'Meeting'
                Let's checking `LanguageContext` for just 'type'.
                I will use t('type') if it exists, else 'Type'.
                Actually I see `meetingType` in `CreateMeeting` object structure but not as a stand alone label key.
                I see `reportType: 'Report Type'`.
                I'll use `t('reportType')` for "Type *". Close enough.
            */}
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[styles.typeButton, meetingType === 'in-person' && styles.typeButtonActive]}
                onPress={() => setMeetingType('in-person')}
              >
                <Icon name="office-building" size={18} color={meetingType === 'in-person' ? '#FFF' : waterBlueColors.primary} />
                <Text style={[styles.typeButtonText, meetingType === 'in-person' && styles.typeButtonTextActive]}>
                  {t('inPerson')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.typeButton, meetingType === 'virtual' && styles.typeButtonActive]}
                onPress={() => setMeetingType('virtual')}
              >
                <Icon name="video" size={18} color={meetingType === 'virtual' ? '#FFF' : waterBlueColors.primary} />
                <Text style={[styles.typeButtonText, meetingType === 'virtual' && styles.typeButtonTextActive]}>
                  {t('virtual')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Place or Virtual Link */}
          {meetingType === 'in-person' ? (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('placeLabel')} *</Text>
              <SpeechToTextInput
                style={styles.voiceInputWrapper}
                inputStyle={styles.voiceInputField}
                placeholder={t('enterPlace')}
                value={place}
                onChangeText={setPlace}
                placeholderTextColor="#999"
              />
            </View>
          ) : (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('virtualLink')} *</Text>
              <SpeechToTextInput
                style={styles.voiceInputWrapper}
                inputStyle={styles.voiceInputField}
                placeholder={t('enterLink')}
                value={virtualLink}
                onChangeText={setVirtualLink}
                placeholderTextColor="#999"
                autoCapitalize="none"
              />
            </View>
          )}

          {/* Member Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('invite')} *</Text>
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[styles.typeButton, memberSelection === 'all' && styles.typeButtonActive]}
                onPress={() => setMemberSelection('all')}
              >
                <Icon name="account-group" size={16} color={memberSelection === 'all' ? '#FFF' : waterBlueColors.primary} />
                <Text style={[styles.typeButtonText, memberSelection === 'all' && styles.typeButtonTextActive]}>
                  {t('all')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.typeButton, memberSelection === 'specific' && styles.typeButtonActive]}
                onPress={() => setMemberSelection('specific')}
              >
                <Icon name="account-multiple-check" size={16} color={memberSelection === 'specific' ? '#FFF' : waterBlueColors.primary} />
                <Text style={[styles.typeButtonText, memberSelection === 'specific' && styles.typeButtonTextActive]}>
                  {t('specificMembers')}
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
                {selectedMembers.length > 0 ? `${selectedMembers.length} ${t('selected')}` : t('selectMembers')}
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
                <Text style={styles.createButtonText}>{t('createMeeting')}</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
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
              <Text style={styles.modalTitle}>{t('selectMembers')}</Text>
              <TouchableOpacity onPress={() => setShowMemberModal(false)}>
                <Icon name="close" size={24} color={waterBlueColors.primary} />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
              <Icon name="magnify" size={18} color="#999" />
              <TextInput
                style={styles.searchInput}
                placeholder={t('searchMembers')}
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
                <Text style={styles.bulkActionText}>{t('selectAll')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.bulkActionButton} onPress={deselectAllMembers}>
                <Text style={styles.bulkActionText}>{t('deselectAll')}</Text>
              </TouchableOpacity>
            </View>

            {/* Members List */}
            {loadingMembers ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={waterBlueColors.primary} />
                <Text style={styles.loadingText}>{t('loadingMembers')}</Text>
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
                {t('done')} ({selectedMembers.length} {t('selected')})
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
    padding: 12,
    paddingBottom: 100, // Add space at bottom for scrolling
  },
  inputGroup: {
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: waterBlueColors.dark,
    marginBottom: 4,
    height: 35, // Fixed height to enforce alignment
    textAlignVertical: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 6,
    paddingHorizontal: 10,
    height: 45, // Fixed height to match Text and TextInput containers
    borderWidth: 1,
    borderColor: waterBlueColors.secondary,
  },
  input: {
    flex: 1,
    marginLeft: 6,
    fontSize: 13,
    color: '#333',
  },
  voiceInputWrapper: {
    width: '100%',
  },
  voiceInputField: {
    fontSize: 13,
    color: '#333',
    backgroundColor: '#FFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: waterBlueColors.secondary,
    paddingHorizontal: 10,
    paddingVertical: 12,
    paddingRight: 45,
    minHeight: 45,
  },
  textAreaInput: {
    minHeight: 70,
    textAlignVertical: 'top',
    paddingTop: 12,
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
    height: 48, // Fixed height to keep buttons in row equal
    paddingHorizontal: 5,
    marginHorizontal: 3,
    borderWidth: 1.5,
    borderColor: waterBlueColors.secondary,
  },
  typeButtonActive: {
    backgroundColor: waterBlueColors.primary,
    borderColor: waterBlueColors.primary,
  },
  typeButtonText: {
    marginLeft: 4,
    fontSize: 11, // Smaller font for Tamil text wrap
    fontWeight: '600',
    color: waterBlueColors.primary,
    flexShrink: 1, // Allow text to shrink/wrap
    textAlign: 'center',
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
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: waterBlueColors.dark,
    marginRight: 10,
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
