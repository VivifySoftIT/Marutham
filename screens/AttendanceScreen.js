import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import ApiService from '../service/api';
import { useLanguage } from '../service/LanguageContext';
import * as Speech from 'expo-speech';

const MemberAttendanceScreen = () => {
  const navigation = useNavigation();
  const { t, language } = useLanguage();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [attendanceData, setAttendanceData] = useState({});
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('name'); // 'name', 'business', 'id'
  
  // Voice search states
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);

  // Voice search functionality using Web Speech API (for web) or simple text-to-speech feedback
  const startVoiceSearch = () => {
    if (Platform.OS === 'web' && 'webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = language === 'ta' ? 'ta-IN' : 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const spokenText = event.results[0][0].transcript;
        setSearchQuery(spokenText);
        handleVoiceSearchResult(spokenText);
      };

      recognition.onerror = () => {
        setIsListening(false);
        Alert.alert(t('voiceError'), t('voiceErrorMessage'));
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } else {
      // For mobile, show a simple input dialog
      Alert.prompt(
        t('voiceSearch'),
        t('speakMemberName'),
        [
          {
            text: t('cancel'),
            style: 'cancel',
          },
          {
            text: t('search'),
            onPress: (text) => {
              if (text) {
                setSearchQuery(text);
                handleVoiceSearchResult(text);
              }
            },
          },
        ],
        'plain-text',
        '',
        'default'
      );
    }
  };

  const handleVoiceSearchResult = (spokenText) => {
    // Auto-search for the member and mark attendance if found
    const foundMember = members.find(member => 
      member.name.toLowerCase().includes(spokenText.toLowerCase())
    );
    
    if (foundMember) {
      setAttendanceData(prev => ({
        ...prev,
        [foundMember.id]: true,
      }));
      
      // Provide audio feedback
      Speech.speak(
        `${t('markedPresent')}: ${foundMember.name}`,
        {
          language: language === 'ta' ? 'ta' : 'en',
          pitch: 1.0,
          rate: 0.8,
        }
      );
      
      Alert.alert(
        t('success'),
        `${t('markedPresent')}: ${foundMember.name}`,
        [{ text: t('ok') }]
      );
    } else {
      Speech.speak(
        `${t('noMemberFound')}: ${spokenText}`,
        {
          language: language === 'ta' ? 'ta' : 'en',
          pitch: 1.0,
          rate: 0.8,
        }
      );
      
      Alert.alert(
        t('noMemberFound'),
        `${t('noMemberFoundMessage')}: "${spokenText}"`,
        [{ text: t('ok') }]
      );
    }
  };

  // Load members from API
  const loadMembers = async () => {
    try {
      setLoading(true);
      console.log('Loading members for attendance...');
      
      const data = await ApiService.getMembers();
      
      console.log('Members loaded:', data.length);
      
      if (Array.isArray(data)) {
        // Map API data to our format with business field
        const mappedMembers = data.map(member => ({
          id: member.id,
          memberId: member.memberId || member.id,
          name: member.name || 'Unknown Member',
          employeeId: member.memberId || member.id || 'N/A',
          business: member.business || member.businessName || member.company || 'General',
          address: member.address || '',
          batch: member.batch || '',
          email: member.email || '',
          phone: member.phone || member.mobile || member.telephone || '',
          status: member.status || 'Active',
          profilePhoto: member.profilePhoto || null,
        }));
        
        setMembers(mappedMembers);
        console.log('Mapped members:', mappedMembers.slice(0, 3)); // Log first 3 members for debugging
      } else {
        console.log('Invalid members data:', data);
        setMembers([]);
      }
    } catch (error) {
      console.error('Error loading members:', error);
      Alert.alert('Error', 'Failed to load members. Please try again.');
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setSelectedDate(selectedDate);
      setAttendanceData({});
    }
  };

  const toggleAttendance = (memberId) => {
    setAttendanceData(prev => ({
      ...prev,
      [memberId]: !prev[memberId],
    }));
  };

  const handleSaveAttendance = async () => {
    const presentMembers = Object.entries(attendanceData)
      .filter(([_, isPresent]) => isPresent)
      .map(([memberId]) => parseInt(memberId));

    if (presentMembers.length === 0) {
      Alert.alert('No Changes', 'Please mark attendance for at least one member');
      return;
    }

    setSaving(true);
    try {
      let successCount = 0;
      let errorCount = 0;
      
      for (const memberId of presentMembers) {
        try {
          console.log('Saving attendance for member ID:', memberId);
          
          // Prepare the request data according to your backend
          const requestData = {
            MemberId: memberId,
            Notes: `Marked via Attendance Screen on ${new Date().toLocaleString()}`,
            CreatedBy: 'Admin' // You can get this from user context
          };

          console.log('Request data:', requestData);
          
          // Call the API service
          const result = await ApiService.createAttendance(requestData);
          console.log('Attendance saved successfully:', result);
          successCount++;
          
        } catch (error) {
          console.error('Error saving attendance for member:', memberId, error);
          
          // Check if it's a duplicate attendance error
          if (error.response?.data?.includes('already exists') || 
              error.message?.includes('already exists') ||
              error.response?.status === 409) {
            console.log('Attendance already recorded for today');
            successCount++; // Count as success since attendance is already recorded
          } else {
            errorCount++;
          }
        }
      }

      Alert.alert(
        'Attendance Result',
        `Successfully recorded: ${successCount} members\nFailed: ${errorCount} members`,
        [
          { 
            text: 'OK', 
            onPress: () => {
              setAttendanceData({});
              // Reload members to refresh any status changes
              loadMembers();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in handleSaveAttendance:', error);
      Alert.alert('Error', `Failed to save attendance: ${error.message || 'Please try again'}`);
    } finally {
      setSaving(false);
    }
  };

  // Filter members based on search query and search type
  const filteredMembers = members.filter(member => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    
    switch (searchType) {
      case 'name':
        return member.name.toLowerCase().includes(query);
      case 'business':
        return member.business?.toLowerCase().includes(query);
      case 'id':
        return member.employeeId?.toLowerCase().includes(query);
      case 'phone':
        return member.phone?.includes(query);
      default:
        return member.name.toLowerCase().includes(query);
    }
  });

  const presentCount = Object.values(attendanceData).filter(status => status === true).length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#4A90E2" barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#4A90E2', '#87CEEB']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('markAttendance')}</Text>
        
        {/* Refresh button */}
        <TouchableOpacity onPress={loadMembers}>
          <Icon name="refresh" size={24} color="#FFF" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Date Selection Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('selectDate')}</Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={styles.dateButton}
            >
              <Icon name="calendar-edit" size={20} color="#4A90E2" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.dateSelector}
            onPress={() => setShowDatePicker(true)}
          >
            <Icon name="calendar" size={20} color="#4A90E2" />
            <Text style={styles.dateText}>
              {selectedDate.toDateString()}
            </Text>
            <Icon name="chevron-down" size={18} color="#4A90E2" />
          </TouchableOpacity>
          
          <Text style={styles.dateNote}>
            Note: Attendance will be recorded for today's date automatically by the system
          </Text>
          
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              onChange={handleDateChange}
              maximumDate={new Date()}
            />
          )}
        </View>

        {/* Search Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('search')} {t('members')}</Text>
          </View>
          
          {/* Search Type Tabs */}
          <View style={styles.searchTypeContainer}>
            {['name', 'business', 'id', 'phone'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.searchTypeButton,
                  searchType === type && styles.searchTypeButtonActive
                ]}
                onPress={() => setSearchType(type)}
              >
                <Text style={[
                  styles.searchTypeText,
                  searchType === type && styles.searchTypeTextActive
                ]}>
                  {t(type)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <View style={styles.searchContainer}>
            <Icon name="magnify" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={`${t('searchBy')} ${t(searchType)}...`}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            )}
            
            {/* Voice Search Button */}
            {voiceSupported && (
              <TouchableOpacity
                style={[
                  styles.voiceButton,
                  isListening && styles.voiceButtonActive
                ]}
                onPress={startVoiceSearch}
              >
                <Icon 
                  name={isListening ? "microphone" : "microphone-outline"} 
                  size={20} 
                  color={isListening ? "#FF6B6B" : "#4A90E2"} 
                />
              </TouchableOpacity>
            )}
          </View>
          
          {searchQuery && searchType === 'business' && (
            <Text style={styles.searchHint}>
              {t('searchBy')} {t('business')}: "{searchQuery}"
            </Text>
          )}
          
          {/* Voice Search Hint */}
          <View style={styles.voiceHintContainer}>
            <Icon name="information" size={14} color="#4A90E2" />
            <Text style={styles.voiceHint}>
              {t('tapToSpeak')} - {t('speakMemberName')}
            </Text>
          </View>
        </View>

        {/* Statistics Cards */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('attendance')} {t('summary')}</Text>
            <Text style={styles.summaryDate}>{selectedDate.toDateString()}</Text>
          </View>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <View style={[styles.summaryIcon, { backgroundColor: '#E3F2FD' }]}>
                <Icon name="account-group" size={24} color="#4A90E2" />
              </View>
              <View style={styles.summaryText}>
                <Text style={styles.summaryNumber}>{members.length}</Text>
                <Text style={styles.summaryLabel}>{t('totalMembers')}</Text>
              </View>
            </View>
            
            <View style={styles.summaryItem}>
              <View style={[styles.summaryIcon, { backgroundColor: '#E8F5E9' }]}>
                <Icon name="check-circle" size={24} color="#4CAF50" />
              </View>
              <View style={styles.summaryText}>
                <Text style={[styles.summaryNumber, { color: '#4CAF50' }]}>{presentCount}</Text>
                <Text style={styles.summaryLabel}>{t('present')}</Text>
              </View>
            </View>
            
            <View style={styles.summaryItem}>
              <View style={[styles.summaryIcon, { backgroundColor: '#FFEBEE' }]}>
                <Icon name="close-circle" size={24} color="#F44336" />
              </View>
              <View style={styles.summaryText}>
                <Text style={[styles.summaryNumber, { color: '#F44336' }]}>
                  {members.length - presentCount}
                </Text>
                <Text style={styles.summaryLabel}>{t('absent')}</Text>
              </View>
            </View>
          </View>
          
          {searchQuery && (
            <View style={styles.searchResultsInfo}>
              <Icon name="information" size={16} color="#666" />
              <Text style={styles.searchResultsText}>
                Showing {filteredMembers.length} of {members.length} members
              </Text>
            </View>
          )}
        </View>

        {/* Members List */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('membersList')}</Text>
            <Text style={styles.memberCount}>{filteredMembers.length} members</Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4A90E2" />
              <Text style={styles.loadingText}>{t('loading')}</Text>
            </View>
          ) : filteredMembers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="account-multiple-off" size={60} color="#ccc" />
              <Text style={styles.emptyText}>{t('noMemberFound')}</Text>
              <Text style={styles.emptySubtext}>
                {members.length === 0 ? 'Failed to load members' : 
                 searchQuery ? 'No members match your search' : 'No members available'}
              </Text>
              {members.length === 0 ? (
                <TouchableOpacity style={styles.retryButton} onPress={loadMembers}>
                  <Icon name="refresh" size={16} color="#FFF" />
                  <Text style={styles.retryButtonText}>{t('tryAgain')}</Text>
                </TouchableOpacity>
              ) : searchQuery ? (
                <TouchableOpacity style={styles.retryButton} onPress={() => setSearchQuery('')}>
                  <Icon name="close" size={16} color="#FFF" />
                  <Text style={styles.retryButtonText}>{t('cancel')} {t('search')}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            filteredMembers.map(member => (
              <View key={member.id} style={styles.memberCard}>
                <View style={styles.memberInfo}>
                  <View style={styles.memberHeader}>
                    <View style={styles.memberAvatar}>
                      <Text style={styles.avatarText}>
                        {member.name.charAt(0)}
                      </Text>
                    </View>
                    <View style={styles.memberDetails}>
                      <Text style={styles.memberName}>{member.name}</Text>
                      <Text style={styles.memberId}>ID: {member.employeeId}</Text>
                    </View>
                  </View>
                  
                  {/* Business Information */}
                  <View style={styles.businessContainer}>
                    <Icon name="office-building" size={16} color="#4A90E2" />
                    <Text style={styles.businessText} numberOfLines={1}>
                      {member.business}
                    </Text>
                  </View>
                  
                  {/* Additional Info */}
                  <View style={styles.extraInfoContainer}>
                    <View style={styles.extraInfoItem}>
                      <Icon name="phone" size={14} color="#666" />
                      <Text style={styles.extraInfoText}>{member.phone}</Text>
                    </View>
                    {member.batch && (
                      <View style={styles.extraInfoItem}>
                        <Icon name="clock" size={14} color="#666" />
                        <Text style={styles.extraInfoText}>{member.batch}</Text>
                      </View>
                    )}
                  </View>
                </View>
                
                <TouchableOpacity
                  style={[
                    styles.attendanceButton,
                    attendanceData[member.id] ? styles.presentButton : styles.absentButton,
                  ]}
                  onPress={() => toggleAttendance(member.id)}
                >
                  <Icon
                    name={attendanceData[member.id] ? 'check-circle' : 'circle-outline'}
                    size={24}
                    color={attendanceData[member.id] ? '#4CAF50' : '#666'}
                  />
                  <Text style={styles.attendanceText}>
                    {attendanceData[member.id] ? t('present') : t('markAttendance')}
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Save Button Section */}
        {presentCount > 0 && (
          <View style={styles.sectionCard}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveAttendance}
              disabled={saving}
            >
              {saving ? (
                <View style={styles.savingContainer}>
                  <ActivityIndicator size="small" color="white" />
                  <Text style={styles.saveButtonText}>{t('saving')}...</Text>
                </View>
              ) : (
                <>
                  <Icon name="content-save" size={24} color="white" />
                  <View style={styles.saveButtonContent}>
                    <Text style={styles.saveButtonText}>{t('saveAttendance')}</Text>

                  </View>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
        
        <View style={{ height: 20 }} />
      </ScrollView>
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
    height: 56,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 15,
  },
  sectionCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  dateButton: {
    padding: 5,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E3F2FD',
  },
  dateText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: '500',
  },
  dateNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
  searchTypeContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  searchTypeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 2,
    borderRadius: 8,
    backgroundColor: '#F5F9FC',
    alignItems: 'center',
  },
  searchTypeButtonActive: {
    backgroundColor: '#4A90E2',
  },
  searchTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  searchTypeTextActive: {
    color: '#FFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F9FC',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  voiceButton: {
    marginLeft: 8,
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
  },
  voiceButtonActive: {
    backgroundColor: '#FFE5E5',
  },
  voiceHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  voiceHint: {
    fontSize: 12,
    color: '#4A90E2',
    marginLeft: 6,
    fontStyle: 'italic',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
  },
  searchHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  summaryDate: {
    fontSize: 12,
    color: '#666',
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  summaryText: {
    flex: 1,
  },
  summaryNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
  },
  searchResultsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  searchResultsText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
  },
  memberCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  memberCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FBFF',
    padding: 12,
    marginBottom: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8F1FF',
  },
  memberInfo: {
    flex: 1,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 2,
  },
  memberId: {
    fontSize: 12,
    color: '#666',
  },
  businessContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  businessText: {
    fontSize: 13,
    color: '#4A90E2',
    fontWeight: '500',
    marginLeft: 6,
    flex: 1,
  },
  extraInfoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  extraInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 4,
  },
  extraInfoText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  attendanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 80,
    justifyContent: 'center',
  },
  presentButton: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  absentButton: {
    borderColor: '#ddd',
    backgroundColor: 'white',
  },
  attendanceText: {
    marginLeft: 4,
    fontSize: 13,
    fontWeight: '600',
  },
  presentText: {
    color: '#4CAF50',
  },
  absentText: {
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  emptySubtext: {
    marginTop: 5,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#4A90E2',
  },
  retryButton: {
    backgroundColor: '#4A90E2',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    marginTop: 15,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: '#4A90E2',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveButtonContent: {
    marginLeft: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  saveButtonSubtext: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    marginTop: 2,
  },
});

export default MemberAttendanceScreen;