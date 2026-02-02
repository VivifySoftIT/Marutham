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
import MemberIdService from '../service/MemberIdService';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as XLSX from 'xlsx';
import Voice from '@react-native-voice/voice';

const MemberAttendanceScreen = () => {
  const navigation = useNavigation();
  const { t, language } = useLanguage();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [attendanceData, setAttendanceData] = useState({}); // { memberId: 'Present' | 'Late' | null }
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Voice search states
  const [isListening, setIsListening] = useState(false);
  const [lastSpokenName, setLastSpokenName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);



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
  const startVoiceRecording = async () => {
    // For Web Platform
    if (Platform.OS === 'web' && 'webkitSpeechRecognition' in window) {
      Alert.alert('Web Voice', 'Please use mobile app for better voice experience.');
    }
    // For Mobile Platform
    else if (Platform.OS !== 'web' && Voice !== null) {
      try {
        // CLEANUP FIRST
        try {
          await Voice.destroy();
          Voice.removeAllListeners();
        } catch (e) {
          console.log("Cleanup error:", e);
        }

        setIsListening(true); // UI Feedback

        Voice.onSpeechStart = () => console.log('Voice started');
        Voice.onSpeechEnd = () => {
          console.log("Voice ended");
          setIsListening(false);
        }
        Voice.onSpeechResults = (event) => {
          console.log('Voice results:', event.value);
          if (event.value && event.value.length > 0) {
            const spokenText = event.value[0];
            setSearchQuery(spokenText);
            findAndMarkMember(spokenText);
          }
        };
        Voice.onSpeechError = (event) => {
          console.error('Voice error:', event.error);
          setIsListening(false);
        };

        await Voice.start('en-IN');
      } catch (error) {
        console.error('Error starting mobile voice:', error);
        setIsListening(false);
        Alert.alert('Error', 'Voice recognition error. Please try again.');
      }
    }
  };

  const stopVoiceRecording = async () => {
    try {
      if (Platform.OS !== 'web') {
        await Voice.stop();
        // Don't disable isListening immediately here, let onSpeechEnd handle it 
        // or let results come in first. But for UI feedback we often want it off.
        // We'll let the listeners handle state.
      }
    } catch (e) {
      console.error("Stop error", e);
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

  // Filter members based on search query
  const filteredMembers = members.filter(member => {
    if (!searchQuery.trim()) return false;
    const query = searchQuery.toLowerCase();
    return (
      member.name.toLowerCase().includes(query) ||
      member.business?.toLowerCase().includes(query) ||
      (member.employeeId && member.employeeId.toString().toLowerCase().includes(query)) ||
      (member.phone && member.phone.toString().includes(query))
    );
  });

  // Display all members by default, or filtered members when searching
  const displayMembers = searchQuery.trim() ? filteredMembers : members;

  // Handle member selection from dropdown
  const handleSelectMember = (member) => {
    setAttendanceData(prev => ({
      ...prev,
      [member.id]: true,
    }));
    setSelectedMember(member);
    setShowMemberDropdown(false);
    setSearchQuery('');
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
    return () => {
      // Cleanup voice listeners on unmount
      if (Platform.OS !== 'web') {
        Voice.destroy().then(Voice.removeAllListeners);
      }
    };
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

  const toggleAttendance = (memberId, status) => {
    setAttendanceData(prev => ({
      ...prev,
      [memberId]: prev[memberId] === status ? null : status,
    }));
  };

  const handleSaveAttendance = async () => {
    const markedMembers = Object.entries(attendanceData)
      .filter(([_, status]) => status) // Only get members with Present or Late status
      .map(([memberId, status]) => ({ memberId: parseInt(memberId), status }));

    if (markedMembers.length === 0) {
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

      for (const { memberId, status } of markedMembers) {
        try {
          console.log('Saving attendance for member ID:', memberId, 'Status:', status);

          const requestData = {
            MemberId: memberId,
            AdminMemberId: adminMemberId,
            Notes: `${status} - Marked via Attendance Screen on ${new Date().toLocaleString()}`,
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

  const presentCount = Object.values(attendanceData).filter(status => status).length; // Count both Present and Late

return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#4A90E2" barStyle="light-content" />

      {/* Header - Fixed */}
      <LinearGradient colors={['#4A90E2', '#87CEEB']} style={styles.header}>
        {/* Left: Back Button */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>

        {/* Center: Title */}
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Mark Attendance</Text>
        </View>

        {/* Right: Excel and Refresh Buttons */}
        <View style={styles.headerRightContainer}>
          <TouchableOpacity 
            onPress={handleExcelUpload} 
            style={styles.headerButton}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Icon name="file-excel" size={25} color="#FFF" />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity onPress={loadMembers} style={styles.headerButton}>
            <Icon name="refresh" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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

        {/* Search Card and Save Button Row */}
        <View style={styles.searchSaveRow}>
          {/* Search Card */}
          <View style={[styles.sectionCard, styles.searchCardInRow]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('search') || 'Search'} {t('members') || 'Members'}</Text>
            </View>

            <View style={styles.searchContainer}>
              <Icon name="magnify" size={20} color="#666" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search member..."
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  setShowMemberDropdown(text.length > 0);
                }}
                placeholderTextColor="#999"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => {
                  setSearchQuery('');
                  setShowMemberDropdown(false);
                }} style={styles.clearButton}>
                  <Icon name="close-circle" size={20} color="#666" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.voiceButtonInline,
                  isListening && styles.voiceButtonActive
                ]}
                onPressIn={startVoiceRecording}
                onPressOut={stopVoiceRecording}
                delayPressIn={100}
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
                  Recording... Release to search
                </Text>
              </View>
            ) : (
              <View style={styles.voiceHintContainer}>
                <Icon name="information" size={14} color="#4A90E2" />
                <Text style={styles.voiceHint}>
                  Hold microphone to search
                </Text>
              </View>
            )}

            {/* Member Dropdown */}
            {showMemberDropdown && searchQuery.length > 0 && (
              <View style={styles.memberDropdown}>
                {loading ? (
                  <View style={styles.noMembersContainer}>
                    <ActivityIndicator size="small" color="#4A90E2" />
                    <Text style={styles.noMembersText}>Loading members...</Text>
                  </View>
                ) : filteredMembers && filteredMembers.length > 0 ? (
                  filteredMembers.slice(0, 5).map(member => (
                    <TouchableOpacity
                      key={member.id}
                      style={styles.dropdownItem}
                      onPress={() => handleSelectMember(member)}
                    >
                      <View style={styles.dropdownItemAvatar}>
                        <Text style={styles.dropdownItemAvatarText}>
                          {member.name.charAt(0)}
                        </Text>
                      </View>
                      <View style={styles.dropdownItemContent}>
                        <Text style={styles.dropdownItemName}>{member.name}</Text>
                        <Text style={styles.dropdownItemBusiness}>
                          {member.employeeId || 'N/A'}
                        </Text>
                      </View>
                      <Icon name="chevron-right" size={20} color="#4A90E2" />
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.noMembersContainer}>
                    <Icon name="account-alert" size={24} color="#999" />
                    <Text style={styles.noMembersText}>No members found</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Members List */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.memberHeaderLeft}>
              <Text style={styles.sectionTitle}>Members</Text>
              <Text style={styles.memberCount}>{displayMembers.length} members</Text>
            </View>
            {presentCount > 0 && (
              <TouchableOpacity
                style={styles.saveButtonSmall}
                onPress={handleSaveAttendance}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Icon name="content-save" size={16} color="white" />
                    <Text style={styles.saveButtonSmallText}>Save</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4A90E2" />
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : displayMembers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="account-multiple-off" size={60} color="#ccc" />
              <Text style={styles.emptyText}>No Members Found</Text>
              <Text style={styles.emptySubtext}>
                {members.length === 0 ? 'Failed to load members' : 'No members match your search'}
              </Text>
            </View>
          ) : (
            displayMembers.map(member => (
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

                <View style={styles.attendanceButtonGroup}>
                  <TouchableOpacity
                    style={[
                      styles.attendanceButton,
                      attendanceData[member.id] === 'Present' ? styles.presentButton : styles.absentButton,
                    ]}
                    onPress={() => toggleAttendance(member.id, 'Present')}
                  >
                    <Icon
                      name={attendanceData[member.id] === 'Present' ? 'check-circle' : 'circle-outline'}
                      size={20}
                      color={attendanceData[member.id] === 'Present' ? '#4CAF50' : '#666'}
                    />
                    <Text style={[
                      styles.attendanceText,
                      attendanceData[member.id] === 'Present' && styles.attendanceTextActive
                    ]}>
                      Present
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.attendanceButton,
                      attendanceData[member.id] === 'Late' ? styles.lateButton : styles.absentButton,
                    ]}
                    onPress={() => toggleAttendance(member.id, 'Late')}
                  >
                    <Icon
                      name={attendanceData[member.id] === 'Late' ? 'clock-check' : 'clock-outline'}
                      size={20}
                      color={attendanceData[member.id] === 'Late' ? '#FF9800' : '#666'}
                    />
                    <Text style={[
                      styles.attendanceText,
                      attendanceData[member.id] === 'Late' && styles.attendanceTextActive
                    ]}>
                      Late
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Selected Member Display */}
        {selectedMember && (
          <View style={styles.sectionCard}>
            <View style={styles.selectedMemberCard}>
              <View style={styles.selectedMemberInfo}>
                <View style={styles.selectedMemberAvatar}>
                  <Text style={styles.selectedMemberAvatarText}>
                    {selectedMember.name.charAt(0)}
                  </Text>
                </View>
                <View style={styles.selectedMemberDetails}>
                  <Text style={styles.selectedMemberName}>{selectedMember.name}</Text>
                  <Text style={styles.selectedMemberBusiness}>{selectedMember.business}</Text>
                  <Text style={styles.selectedMemberId}>ID: {selectedMember.employeeId}</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedMember(null)}
                style={styles.selectedMemberRemove}
              >
                <Icon name="close" size={20} color="#666" />
              </TouchableOpacity>
            </View>
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
    paddingHorizontal: 12,
    paddingVertical: 12,
    height: 56,
  },
  headerButton: {
    padding: 8,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: 100, // Ensure enough space for both icons
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
  searchSaveRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  searchCardInRow: {
    flex: 1,
    marginBottom: 0,
  },
  saveButtonInRow: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    padding: 15,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    minWidth: 70,
  },
  saveButtonInRowText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 6,
    textAlign: 'center',
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
  searchContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    top: '50%',
    transform: [{ translateY: -12 }],
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
    transform: [{ translateY: -12 }],
    zIndex: 1,
  },
  voiceButtonInline: {
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: [{ translateY: -12 }],
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
  memberDropdown: {
    marginTop: 12,
    backgroundColor: '#F8FBFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E3F2FD',
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E3F2FD',
  },
  dropdownItemAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  dropdownItemAvatarText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  dropdownItemContent: {
    flex: 1,
  },
  dropdownItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 2,
  },
  dropdownItemBusiness: {
    fontSize: 12,
    color: '#666',
  },
  dropdownMoreText: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 8,
    textAlign: 'center',
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  noResultsText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  noMembersContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  noMembersText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  selectedMemberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#4A90E2',
  },
  selectedMemberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedMemberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  selectedMemberAvatarText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  selectedMemberDetails: {
    flex: 1,
  },
  selectedMemberName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 2,
  },
  selectedMemberBusiness: {
    fontSize: 12,
    color: '#4A90E2',
    marginBottom: 2,
  },
  selectedMemberId: {
    fontSize: 11,
    color: '#666',
  },
  selectedMemberRemove: {
    padding: 8,
  },
  memberHeaderLeft: {
    flex: 1,
  },
  saveButtonSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A90E2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  saveButtonSmallText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  attendanceButtonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  lateButton: {
    borderColor: '#FF9800',
    backgroundColor: '#FFF3E0',
  },
  attendanceTextActive: {
    fontWeight: '700',
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