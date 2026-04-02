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
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import Voice from '@react-native-voice/voice';
import SpeechToTextInput from '../components/SpeechToTextInput';

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



  // Function to find member by voice (without auto-marking)
  const findMemberByVoice = (spokenText) => {
    console.log('Finding member for voice search:', spokenText);

    const cleanedText = spokenText
      .replace(/^(search for|find|show me|look for|mark|attendance for|mark attendance for)\s+/i, '')
      .replace(/\s+attendance$/i, '')
      .trim()
      .toLowerCase();

    console.log('Cleaned search text:', cleanedText);

    if (!cleanedText) {
      Alert.alert(t('error'), t('voiceErrorMessage') || 'Please speak a member name clearly.');
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
        t('noMatchFound'),
        `${t('noMemberFoundMessage')} "${spokenText}".\n\n${t('tryDifferentSearchTerm')}`,
        [{ text: t('ok'), style: 'cancel' }]
      );
      return;
    }

    if (matchingMembers.length === 1) {
      const member = matchingMembers[0];
      // Just set the search query to show the member, don't auto-mark
      setSearchQuery(member.name);
      setShowMemberDropdown(false);
      setLastSpokenName(member.name);
      
      // Scroll to show the member (they can manually click Present/Late)
      Alert.alert(
        t('memberFound') || 'Member Found',
        `${member.name}\n\n${t('clickPresentOrLate') || 'Click Present or Late to mark attendance'}`,
        [{ text: t('ok') }]
      );
    } else {
      // Multiple matches - show them in search results
      setSearchQuery(cleanedText);
      setShowMemberDropdown(true);
      
      Alert.alert(
        t('multipleMatchesFound') || 'Multiple Matches Found',
        `${t('found')} ${matchingMembers.length} ${t('membersCount')} "${spokenText}".\n\n${t('selectFromList') || 'Select from the list below'}`,
        [{ text: t('ok') }]
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
      Alert.alert(t('noMatches'), `${t('noMemberFoundMessage')} "${searchText}"`);
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
      t('batchMarkComplete'),
      t('batchMarkedMsg').replace('{count}', newlyMarked.toString()).replace('{total}', Object.values(updatedAttendance).filter(status => status).length.toString())
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

  // Handle member selection from dropdown (don't auto-mark)
  const handleSelectMember = (member) => {
    setSelectedMember(member);
    setShowMemberDropdown(false);
    setSearchQuery(member.name);
    
    // Show alert to remind user to mark attendance
    Alert.alert(
      t('memberSelected') || 'Member Selected',
      `${member.name}\n\n${t('clickPresentOrLate') || 'Click Present or Late button to mark attendance'}`,
      [{ text: t('ok') }]
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
    return () => {
      // Cleanup voice listeners on unmount
      if (Platform.OS !== 'web') {
        Voice.destroy().then(Voice.removeAllListeners);
      }
    };
  }, []);

  const handleExcelIconPress = () => {
    Alert.alert(
      'Excel Options',
      'What would you like to do?',
      [
        {
          text: 'Download Template',
          onPress: handleDownloadTemplate,
        },
        {
          text: 'Import Excel',
          onPress: handleExcelUpload,
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleDownloadTemplate = async () => {
    try {
      // Format today's date as column header e.g. "18-Jan-25"
      const dateHeader = selectedDate.toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: '2-digit'
      }).replace(/ /g, '-');

      // Build rows: one per member
      const templateData = members.length > 0
        ? members.map(m => ({
            'Member Name': m.name,
            [dateHeader]: '',   // blank — user fills Present / Late
          }))
        : [
            { 'Member Name': 'Anbalagan R',  [dateHeader]: 'Present' },
            { 'Member Name': 'Anbazhagan J', [dateHeader]: 'Present' },
            { 'Member Name': 'Sample Member',[dateHeader]: '' },
          ];

      const ws = XLSX.utils.json_to_sheet(templateData);
      ws['!cols'] = [{ wch: 30 }, { wch: 15 }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance');

      // binary → base64
      const wbout = XLSX.write(wb, { type: 'binary', bookType: 'xlsx' });
      const buf = new Uint8Array(wbout.length);
      for (let i = 0; i < wbout.length; i++) buf[i] = wbout.charCodeAt(i) & 0xff;
      const base64 = btoa(String.fromCharCode(...buf));

      const fileUri = FileSystem.documentDirectory + 'Attendance_Template.xlsx';
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: 'Save Attendance Template',
          UTI: 'com.microsoft.excel.xlsx',
        });
      } else {
        Alert.alert('Saved', 'Template saved to your device.');
      }
    } catch (error) {
      console.error('Attendance template error:', error);
      Alert.alert('Error', 'Failed to generate template: ' + error.message);
    }
  };

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
        Alert.alert(t('emptyFile'), t('noResults'));
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
        t('uploadComplete'),
        `${t('processed')}: ${apiResult.successCount}\n${t('failed')}: ${apiResult.failCount}`,
        [
          {
            text: t('ok'),
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
      Alert.alert(t('noChanges'), t('selectMemberToViewHistory') || 'Please mark attendance for at least one member');
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
        t('attendanceResult') || 'Attendance Result',
        `${t('successfullyRecorded') || 'Successfully recorded'}: ${successCount} ${t('membersCount')}\n${t('failed') || 'Failed'}: ${errorCount} ${t('membersCount')}`,
        [
          {
            text: t('ok'),
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
      Alert.alert(t('error'), `${t('failedToSaveAttendance') || 'Failed to save attendance'}: ${error.message || t('pleaseTryAgain')}`);
    } finally {
      setSaving(false);
    }
  };

  const presentCount = Object.values(attendanceData).filter(status => status).length; // Count both Present and Late

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#1B5E35" barStyle="light-content" />

      {/* Header - Fixed */}
      <LinearGradient colors={['#1B5E35', '#2E7D4F']} style={styles.header}>
        {/* Left Container */}
        <View style={styles.headerLeftContainer}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Icon name="arrow-left" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Center: Title */}
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>{t('markAttendance')}</Text>
        </View>

        {/* Right Container */}
        <View style={styles.headerRightContainer}>
          <TouchableOpacity
            onPress={handleExcelIconPress}
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
            <Icon name="refresh" size={25} color="#FFF" />
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
              <Icon name="calendar-edit" size={20} color="#C9A84C" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.dateSelector}
            onPress={() => setShowDatePicker(true)}
          >
            <Icon name="calendar" size={20} color="#C9A84C" />
            <Text style={styles.dateText}>
              {selectedDate.toDateString()}
            </Text>
            <Icon name="chevron-down" size={18} color="#C9A84C" />
          </TouchableOpacity>

          <Text style={styles.dateNote}>
            {t('attendanceNote')}
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
              <SpeechToTextInput
                style={styles.searchInput}
                inputStyle={{ borderBottomWidth: 0, borderWidth: 0, paddingLeft: 0 }} // Match existing style
                placeholder={t('searchMember')}
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  setShowMemberDropdown(text.length > 0);
                }}
                onVoiceResults={findMemberByVoice}
                placeholderTextColor="#999"
              />
            </View>

            {isListening ? (
              <View style={styles.listeningIndicator}>
                <Icon name="microphone" size={16} color="#FF6B6B" />
                <Text style={styles.listeningText}>
                  {t('listeningForName') || 'Listening for member name...'}
                </Text>
              </View>
            ) : (
              <View style={styles.voiceHintContainer}>
                <Icon name="information" size={14} color="#C9A84C" />
                <Text style={styles.voiceHint}>
                  {t('speakMemberName') || 'Speak member name to search'}
                </Text>
              </View>
            )}

            {/* Member Dropdown */}
            {showMemberDropdown && searchQuery.length > 0 && (
              <View style={styles.memberDropdown}>
                {loading ? (
                  <View style={styles.noMembersContainer}>
                    <ActivityIndicator size="small" color="#C9A84C" />
                    <Text style={styles.noMembersText}>{t('loadingMembers')}</Text>
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
                      <Icon name="chevron-right" size={20} color="#C9A84C" />
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.noMembersContainer}>
                    <Icon name="account-alert" size={24} color="#999" />
                    <Text style={styles.noMembersText}>{t('noResults')}</Text>
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
              <Text style={styles.sectionTitle}>{t('members')}</Text>
              <Text style={styles.memberCount}>{displayMembers.length} {t('membersCount')}</Text>
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
                    <Text style={styles.saveButtonSmallText}>{t('save')}</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#C9A84C" />
              <Text style={styles.loadingText}>{t('loading')}</Text>
            </View>
          ) : displayMembers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="account-multiple-off" size={60} color="#ccc" />
              <Text style={styles.emptyText}>{t('noResults')}</Text>
              <Text style={styles.emptySubtext}>
                {members.length === 0 ? t('failedToLoadMembers') : t('noMemberMatch')}
              </Text>
            </View>
          ) : (
            displayMembers.map(member => (
              <View
                key={member.id}
                style={[
                  styles.memberCard,
                  {
                    borderLeftColor: attendanceData[member.id] ? '#4CAF50' : '#C9A84C',
                    borderColor: attendanceData[member.id] ? '#E8F5E9' : '#E8F1FF'
                  }
                ]}
              >
                <View style={styles.memberHeader}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.avatarText}>
                      {member.name.charAt(0)}
                    </Text>
                  </View>
                  <View style={styles.memberDetails}>
                    <Text style={styles.memberName}>{member.name}</Text>
                    <Text style={styles.memberId}>{t('id') || 'ID'}: {member.employeeId}</Text>
                  </View>
                </View>

                {/* Business Information */}
                <View style={styles.businessContainer}>
                  <Icon name="office-building" size={16} color="#C9A84C" />
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
                      {t('present')}
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
                      {t('late')}
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
                  <Text style={styles.selectedMemberId}>{t('id') || 'ID'}: {selectedMember.employeeId}</Text>
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
    </SafeAreaView >
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
    paddingHorizontal: 12,
    height: 64, // Reduced from implicit tall height
  },
  headerLeftContainer: {
    width: 80, // Slightly narrower
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  headerButton: {
    padding: 8,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    lineHeight: 28, // Better for Tamil
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 80, // Match left container
  },
  content: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 15,
  },
  sectionCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#C9A84C',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#C9A84C',
  },
  searchSaveRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  searchCardInRow: {
    flex: 1,
    marginBottom: 0,
  },
  saveButtonInRow: {
    backgroundColor: '#C9A84C',
    borderRadius: 12,
    padding: 15,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#C9A84C',
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
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E3F2FD',
  },
  dateText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#C9A84C',
    fontWeight: '500',
  },
  dateNote: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 6,
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
    marginBottom: 10,
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
    paddingVertical: 10,
    fontSize: 14,
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
    marginTop: 6,
    paddingHorizontal: 4,
  },
  voiceHint: {
    fontSize: 11,
    color: '#C9A84C',
    marginLeft: 6,
    fontStyle: 'italic',
  },
  memberDropdown: {
    marginTop: 8,
    backgroundColor: '#F8FBFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E3F2FD',
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E3F2FD',
  },
  dropdownItemAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#C9A84C',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  dropdownItemAvatarText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  dropdownItemContent: {
    flex: 1,
  },
  dropdownItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 2,
  },
  dropdownItemBusiness: {
    fontSize: 11,
    color: '#666',
  },
  dropdownMoreText: {
    fontSize: 12,
    color: '#C9A84C',
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
    borderColor: '#C9A84C',
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
    backgroundColor: '#C9A84C',
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
    color: '#C9A84C',
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
    backgroundColor: '#C9A84C',
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
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8F1FF',
    paddingTop: 12,
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
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: '#FFE5E5',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  listeningText: {
    fontSize: 11,
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
    backgroundColor: '#C9A84C',
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
    color: '#C9A84C',
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
    color: '#C9A84C',
  },
  retryButton: {
    backgroundColor: '#C9A84C',
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
    backgroundColor: '#C9A84C',
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

