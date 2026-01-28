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
import SpeechToTextInput from '../components/SpeechToTextInput';
import MemberIdService from '../service/MemberIdService';
import * as Speech from 'expo-speech';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as XLSX from 'xlsx';

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
  const [searchType, setSearchType] = useState('name');

  // Voice search states
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [lastSpokenName, setLastSpokenName] = useState('');
  const [uploading, setUploading] = useState(false);



  // Function to find and mark member as present
  const findAndMarkMember = (spokenText) => {
    console.log('Finding member for voice search:', spokenText);

    const cleanedText = spokenText
      .replace(/^(search for|find|show me|look for|mark|attendance for|mark attendance for)\s+/i, '')
      .replace(/\s+attendance$/i, '')
      .trim()
      .toLowerCase();

    console.log('Cleaned search text:', cleanedText);

    if (!cleanedText) {
      Alert.alert('No Name Provided', 'Please speak a member name clearly.');
      return;
    }

    // Find matching members
    const matchingMembers = members.filter(member => {
      const memberName = member.name.toLowerCase();

      // Exact match
      if (memberName === cleanedText) {
        return true;
      }

      // Contains match
      if (memberName.includes(cleanedText)) {
        return true;
      }

      // First name match
      const memberFirstName = memberName.split(' ')[0];
      const spokenFirstName = cleanedText.split(' ')[0];
      if (memberFirstName === spokenFirstName) {
        return true;
      }

      return false;
    });

    if (matchingMembers.length === 0) {
      Alert.alert(
        'No Match Found',
        `No member found matching "${spokenText}".\n\nPlease try speaking the full name clearly or type manually.`,
        [
          { text: 'Try Again', onPress: () => setTimeout(startVoiceSearch, 500) },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      return;
    }

    if (matchingMembers.length === 1) {
      const member = matchingMembers[0];
      setAttendanceData(prev => ({
        ...prev,
        [member.id]: true,
      }));

      Alert.alert(
        'Marked Present!',
        `Successfully marked "${member.name}" as present.`,
        [{ text: 'OK' }]
      );

      setSearchQuery('');
      setLastSpokenName(member.name);
    } else {
      Alert.alert(
        'Multiple Matches Found',
        `Found ${matchingMembers.length} members matching "${spokenText}".\n\nSelect one to mark as present:`,
        [
          ...matchingMembers.slice(0, 5).map((member, index) => ({
            text: `${member.name} (${member.business || 'N/A'})`,
            onPress: () => {
              setAttendanceData(prev => ({
                ...prev,
                [member.id]: true,
              }));
              setSearchQuery('');
              setLastSpokenName(member.name);
              Alert.alert('Marked Present!', `Successfully marked "${member.name}" as present.`);
            }
          })),
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    }
  };

  // Voice search functionality
  const startVoiceSearch = async () => {
    // For Web Platform
    if (Platform.OS === 'web' && 'webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-IN';
      recognition.maxAlternatives = 5;

      recognition.onstart = () => {
        console.log('Voice recognition started');
        setIsListening(true);

        Alert.alert(
          'Listening...',
          'Please speak the member name clearly',
          [],
          { cancelable: false }
        );
      };

      recognition.onresult = (event) => {
        const results = event.results[event.results.length - 1];
        const spokenText = results[0].transcript.trim();

        console.log('Voice recognition raw result:', spokenText);
        console.log('Is final:', results.isFinal);
        console.log('Confidence:', results[0].confidence);

        if (results.isFinal) {
          console.log('Final result accepted:', spokenText);

          setSearchQuery(spokenText);
          setIsListening(false);
          findAndMarkMember(spokenText);
        }
      };

      recognition.onerror = (event) => {
        console.error('Voice recognition error:', event.error);
        setIsListening(false);

        let errorMessage = 'Could not recognize speech';
        if (event.error === 'no-speech') {
          errorMessage = 'No speech detected. Please speak clearly.';
        } else if (event.error === 'audio-capture') {
          errorMessage = 'Microphone not found.';
        } else if (event.error === 'not-allowed') {
          errorMessage = 'Microphone permission denied.';
        }

        Alert.alert('Voice Error', errorMessage, [
          { text: 'OK' },
          { text: 'Try Again', onPress: () => setTimeout(startVoiceSearch, 500) }
        ]);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      try {
        recognition.start();
      } catch (error) {
        console.error('Error starting recognition:', error);
        setIsListening(false);
        Alert.alert('Error', 'Could not start voice recognition. Please check microphone permissions.');
      }
    }
    // Mobile - Voice not available without native rebuild
    else {
      setIsListening(false);
      Alert.alert(
        'Voice Search - Web Only',
        'Voice search is currently available on web browser only.\n\nOn mobile, please type the member name in the search box.',
        [{ text: 'OK' }]
      );
    }
  };

  // Function to automatically mark all matching members as present
  const markAllMatching = (searchText) => {
    if (!searchText.trim()) return;

    const query = searchText.toLowerCase();
    const matchingMembers = members.filter(member =>
      member.name.toLowerCase().includes(query) ||
      member.business?.toLowerCase().includes(query) ||
      member.employeeId?.toLowerCase().includes(query)
    );

    if (matchingMembers.length === 0) {
      Alert.alert('No Matches', `No members found matching "${searchText}"`);
      return;
    }

    const updatedAttendance = { ...attendanceData };
    let newlyMarked = 0;

    matchingMembers.forEach(member => {
      if (!updatedAttendance[member.id]) {
        updatedAttendance[member.id] = true;
        newlyMarked++;
      }
    });

    setAttendanceData(updatedAttendance);

    Alert.alert(
      'Batch Mark Complete',
      `Marked ${newlyMarked} member(s) as present.\nTotal present: ${Object.values(updatedAttendance).filter(status => status).length}`
    );
  };

  // Load members from API
  const loadMembers = async () => {
    try {
      setLoading(true);
      console.log('Loading members for attendance...');

      const data = await ApiService.getMembers();

      console.log('Members loaded:', data?.length || 0);

      if (Array.isArray(data)) {
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

  const handleExcelUpload = async () => {
    try {
      setUploading(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        setUploading(false);
        return;
      }

      const file = result.assets[0];
      const fileUri = file.uri;

      const fileContent = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const workbook = XLSX.read(fileContent, { type: 'base64' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        Alert.alert('Empty File', 'The Excel file contains no data.');
        setUploading(false);
        return;
      }

      const adminMemberId = await MemberIdService.getCurrentUserMemberId();
      if (!adminMemberId) {
        Alert.alert('Error', 'Unable to verify admin identity. Please re-login.');
        setUploading(false);
        return;
      }

      // Map to the format expected by the API
      const attendances = jsonData.map(row => {
        // Find member by name to get ID (though API now handles names, let's provide what we can)
        const memberName = row.MemberName || row.name || row['Member Name'];
        const member = members.find(m => m.name.toLowerCase() === memberName?.toString().toLowerCase());

        return {
          MemberId: member ? member.id : 0,
          MemberName: memberName?.toString() || '',
          AttendanceDate: selectedDate.toISOString(),
          Notes: row.Notes || row.notes || 'Bulk Uploaded',
          Batch: row.Batch || row.batch || '',
          AdminMemberId: adminMemberId
        };
      }).filter(a => a.MemberName);

      if (attendances.length === 0) {
        Alert.alert('Error', 'No valid member names found in the Excel file.');
        setUploading(false);
        return;
      }

      const bulkRequest = {
        AdminMemberId: adminMemberId,
        Attendances: attendances
      };

      const apiResult = await ApiService.createBulkAttendance(bulkRequest);

      Alert.alert(
        'Bulk Upload Complete',
        `Successfully processed: ${apiResult.successCount}\nFailed: ${apiResult.failCount}`,
        [
          {
            text: 'OK',
            onPress: () => {
              loadMembers();
            }
          }
        ]
      );

    } catch (error) {
      console.error('Excel Upload Error:', error);
      Alert.alert('Upload Failed', error.message || 'An error occurred during file upload');
    } finally {
      setUploading(false);
    }
  };

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
      const adminMemberId = await MemberIdService.getCurrentUserMemberId();

      if (!adminMemberId) {
        Alert.alert('Error', 'Unable to verify admin identity. Please re-login.');
        setSaving(false);
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      for (const memberId of presentMembers) {
        try {
          console.log('Saving attendance for member ID:', memberId);

          const requestData = {
            MemberId: memberId,
            AdminMemberId: adminMemberId,
            Notes: `Marked via Attendance Screen on ${new Date().toLocaleString()}`,
            CreatedBy: adminMemberId.toString()
          };

          const result = await ApiService.createAttendance(requestData);
          console.log('Attendance saved successfully:', result);
          successCount++;

        } catch (error) {
          console.error('Error saving attendance for member:', memberId, error);

          if (error.response?.data?.includes('already exists') ||
            error.message?.includes('already exists') ||
            error.response?.status === 409) {
            console.log('Attendance already recorded for today');
            successCount++;
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
              setLastSpokenName('');
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

  // Quick action buttons
  const quickMarkButtons = [
    {
      title: 'Mark All Present',
      icon: 'check-all',
      color: '#4CAF50',
      onPress: () => {
        const updatedAttendance = {};
        members.forEach(member => {
          updatedAttendance[member.id] = true;
        });
        setAttendanceData(updatedAttendance);
        Alert.alert('All Marked', `Marked all ${members.length} members as present.`);
      }
    },
    {
      title: 'Clear All',
      icon: 'close-box-multiple',
      color: '#F44336',
      onPress: () => {
        setAttendanceData({});
        setLastSpokenName('');
        Alert.alert('Cleared', 'Cleared all attendance marks.');
      }
    },
    {
      title: 'Mark by Voice',
      icon: 'microphone',
      color: '#FF9800',
      onPress: startVoiceSearch
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#4A90E2" barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#4A90E2', '#87CEEB']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mark Attendance</Text>
        <TouchableOpacity onPress={handleExcelUpload} style={{ marginRight: 15 }} disabled={uploading}>
          {uploading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Icon name="file-excel" size={24} color="#FFF" />
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={loadMembers}>
          <Icon name="refresh" size={24} color="#FFF" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quick Actions */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
          </View>
          <View style={styles.quickActionsContainer}>
            {quickMarkButtons.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.quickActionButton, { borderLeftColor: action.color }]}
                onPress={action.onPress}
              >
                <Icon name={action.icon} size={20} color={action.color} />
                <Text style={styles.quickActionText}>{action.title}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {lastSpokenName && (
            <View style={styles.lastMarkedContainer}>
              <Icon name="check-circle" size={16} color="#4CAF50" />
              <Text style={styles.lastMarkedText}>
                Last marked via voice: <Text style={styles.lastMarkedName}>{lastSpokenName}</Text>
              </Text>
            </View>
          )}
        </View>

        {/* Date Selection */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('selectDate') || 'Select Date'}</Text>
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
            <Text style={styles.sectionTitle}>{t('search') || 'Search'} {t('members') || 'Members'}</Text>
            {searchQuery && (
              <TouchableOpacity
                style={styles.markAllButton}
                onPress={() => markAllMatching(searchQuery)}
              >
                <Icon name="check-all" size={16} color="#4CAF50" />
                <Text style={styles.markAllText}>Mark All Matching</Text>
              </TouchableOpacity>
            )}
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
                  {t(type) || type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.searchContainer}>
            <Icon name="magnify" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={`Search by ${searchType}...`}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <Icon name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.voiceButtonInline,
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
          </View>

          {isListening ? (
            <View style={styles.listeningIndicator}>
              <Icon name="microphone" size={16} color="#FF6B6B" />
              <Text style={styles.listeningText}>
                Listening... Speak the member name clearly
              </Text>
            </View>
          ) : (
            <View style={styles.voiceHintContainer}>
              <Icon name="information" size={14} color="#4A90E2" />
              <Text style={styles.voiceHint}>
                Tap microphone icon to search by voice and auto-mark present
              </Text>
            </View>
          )}
        </View>

        {/* Statistics Cards */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Attendance Summary</Text>
            <Text style={styles.summaryDate}>{selectedDate.toDateString()}</Text>
          </View>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <View style={[styles.summaryIcon, { backgroundColor: '#E3F2FD' }]}>
                <Icon name="account-group" size={24} color="#4A90E2" />
              </View>
              <View style={styles.summaryText}>
                <Text style={styles.summaryNumber}>{members.length}</Text>
                <Text style={styles.summaryLabel}>Total Members</Text>
              </View>
            </View>

            <View style={styles.summaryItem}>
              <View style={[styles.summaryIcon, { backgroundColor: '#E8F5E9' }]}>
                <Icon name="check-circle" size={24} color="#4CAF50" />
              </View>
              <View style={styles.summaryText}>
                <Text style={[styles.summaryNumber, { color: '#4CAF50' }]}>{presentCount}</Text>
                <Text style={styles.summaryLabel}>Present</Text>
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
                <Text style={styles.summaryLabel}>Absent</Text>
              </View>
            </View>
          </View>

          {searchQuery && (
            <View style={styles.searchResultsInfo}>
              <Icon name="information" size={16} color="#666" />
              <Text style={styles.searchResultsText}>
                Showing {filteredMembers.length} of {members.length} members
                {filteredMembers.length > 0 && ` • ${filteredMembers.filter(m => attendanceData[m.id]).length} marked present`}
              </Text>
            </View>
          )}
        </View>

        {/* Members List */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Members List</Text>
            <Text style={styles.memberCount}>{filteredMembers.length} members</Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4A90E2" />
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : filteredMembers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="account-multiple-off" size={60} color="#ccc" />
              <Text style={styles.emptyText}>No Members Found</Text>
              <Text style={styles.emptySubtext}>
                {members.length === 0 ? 'Failed to load members' :
                  searchQuery ? 'No members match your search' : 'No members available'}
              </Text>
              {members.length === 0 ? (
                <TouchableOpacity style={styles.retryButton} onPress={loadMembers}>
                  <Icon name="refresh" size={16} color="#FFF" />
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
              ) : searchQuery ? (
                <TouchableOpacity style={styles.retryButton} onPress={() => setSearchQuery('')}>
                  <Icon name="close" size={16} color="#FFF" />
                  <Text style={styles.retryButtonText}>Cancel Search</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            filteredMembers.map(member => (
              <View
                key={member.id}
                style={[
                  styles.memberCard,
                  {
                    borderLeftColor: attendanceData[member.id] ? '#4CAF50' : '#4A90E2',
                    borderColor: attendanceData[member.id] ? '#E8F5E9' : '#E8F1FF'
                  }
                ]}
              >
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
                    {attendanceData[member.id] ? 'Present' : 'Mark Attendance'}
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
                  <Text style={styles.saveButtonText}>Saving...</Text>
                </View>
              ) : (
                <>
                  <Icon name="content-save" size={24} color="white" />
                  <View style={styles.saveButtonContent}>
                    <Text style={styles.saveButtonText}>Save Attendance</Text>
                    <Text style={styles.saveButtonSubtext}>
                      {presentCount} member(s) marked as present
                    </Text>
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
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginHorizontal: 4,
    backgroundColor: '#F8FBFF',
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2C3E50',
    marginLeft: 6,
  },
  lastMarkedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  lastMarkedText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
  },
  lastMarkedName: {
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#E8F5E9',
    borderRadius: 6,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
    marginLeft: 4,
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
    position: 'relative',
    marginBottom: 15,
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    top: '50%',
    transform: [{ translateY: -10 }],
    zIndex: 1,
  },
  searchInput: {
    paddingLeft: 40,
    paddingRight: 80,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
    backgroundColor: '#F8FBFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E3F2FD',
  },
  clearButton: {
    position: 'absolute',
    right: 45,
    top: '50%',
    transform: [{ translateY: -10 }],
    zIndex: 1,
  },
  voiceButtonInline: {
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: [{ translateY: -10 }],
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    zIndex: 1,
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
  listeningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#FFE5E5',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  listeningText: {
    fontSize: 12,
    color: '#FF6B6B',
    marginLeft: 6,
    fontWeight: '600',
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
    borderLeftWidth: 4,
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