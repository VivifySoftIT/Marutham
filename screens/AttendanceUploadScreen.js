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
  FlatList,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import XLSX from 'xlsx';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../service/LanguageContext';
import API_BASE_URL from '../apiConfig';

const AttendanceUploadScreen = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadedMembers, setUploadedMembers] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setSelectedDate(selectedDate);
    }
  };

  const handleFileUpload = async () => {
    try {
      setLoading(true);
      
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
      });

      if (result.canceled) {
        setLoading(false);
        return;
      }

      const file = result.assets[0];
      console.log('Selected file:', file);

      // Read file content
      const fileContent = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Parse Excel file
      const workbook = XLSX.read(fileContent, { type: 'base64' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      console.log('Parsed Excel data:', jsonData);

      // Process the data
      const processedMembers = jsonData.map((row, index) => ({
        id: index + 1,
        name: row['Name'] || row['name'] || row['Member Name'] || 'Unknown',
        memberId: row['Member ID'] || row['memberId'] || row['ID'] || '',
        email: row['Email'] || row['email'] || '',
        phone: row['Phone'] || row['phone'] || row['Mobile'] || '',
        present: false,
      }));

      setUploadedMembers(processedMembers);
      setAttendanceData({});
      
      Alert.alert(
        t('success'),
        `${processedMembers.length} members loaded from Excel file`
      );
    } catch (error) {
      console.error('Error uploading file:', error);
      Alert.alert(t('error'), 'Failed to upload Excel file. Please try again.');
    } finally {
      setLoading(false);
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
      Alert.alert(t('error'), t('selectMembers'));
      return;
    }

    try {
      setSaving(true);
      const token = await AsyncStorage.getItem('jwt_token');

      const payload = {
        attendanceDate: selectedDate.toISOString().split('T')[0],
        presentMemberIds: presentMembers,
        totalMembers: uploadedMembers.length,
      };

      console.log('Saving attendance:', payload);

      const response = await fetch(`${API_BASE_URL}/api/Attendance/BulkMarkAttendance`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to save attendance');
      }

      const result = await response.json();
      console.log('Attendance saved:', result);

      Alert.alert(t('success'), t('attendanceUpdated'));
      setUploadedMembers([]);
      setAttendanceData({});
    } catch (error) {
      console.error('Error saving attendance:', error);
      Alert.alert(t('error'), 'Failed to save attendance. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const MemberItem = ({ member }) => {
    const isPresent = attendanceData[member.id];
    return (
      <TouchableOpacity
        style={[
          styles.memberItem,
          isPresent && styles.memberItemPresent,
        ]}
        onPress={() => toggleAttendance(member.id)}
      >
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{member.name}</Text>
          <Text style={styles.memberDetails}>
            {member.memberId} • {member.phone}
          </Text>
        </View>
        <View style={[
          styles.checkbox,
          isPresent && styles.checkboxChecked,
        ]}>
          {isPresent && (
            <Icon name="check" size={16} color="#FFF" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1B5E35" />

      {/* Header */}
      <LinearGradient colors={['#1B5E35', '#2E7D4F']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('attendance')}</Text>
          <View style={{ width: 24 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Date Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('selectDate')}</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Icon name="calendar" size={20} color="#C9A84C" />
            <Text style={styles.dateButtonText}>
              {selectedDate.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}

        {/* Upload Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('uploadExcel')}</Text>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={handleFileUpload}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Icon name="file-excel" size={24} color="#FFF" />
                <Text style={styles.uploadButtonText}>Choose Excel File</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Members List */}
        {uploadedMembers.length > 0 && (
          <View style={styles.section}>
            <View style={styles.listHeader}>
              <Text style={styles.sectionTitle}>
                {t('memberName')} ({uploadedMembers.length})
              </Text>
              <TouchableOpacity
                style={styles.previewButton}
                onPress={() => setShowPreview(true)}
              >
                <Icon name="eye" size={18} color="#C9A84C" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={uploadedMembers}
              renderItem={({ item }) => <MemberItem member={item} />}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
            />

            {/* Summary */}
            <View style={styles.summary}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Members:</Text>
                <Text style={styles.summaryValue}>{uploadedMembers.length}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Marked Present:</Text>
                <Text style={styles.summaryValue}>
                  {Object.values(attendanceData).filter(Boolean).length}
                </Text>
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveAttendance}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Icon name="check-circle" size={20} color="#FFF" />
                  <Text style={styles.saveButtonText}>{t('saveAttendance')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {uploadedMembers.length === 0 && (
          <View style={styles.emptyState}>
            <Icon name="file-document-outline" size={64} color="#CCC" />
            <Text style={styles.emptyStateText}>No members uploaded yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Upload an Excel file to get started
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Preview Modal */}
      <Modal
        visible={showPreview}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPreview(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Members Preview</Text>
              <TouchableOpacity onPress={() => setShowPreview(false)}>
                <Icon name="close" size={24} color="#1B5E35" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={uploadedMembers}
              renderItem={({ item }) => (
                <View style={styles.previewItem}>
                  <Text style={styles.previewName}>{item.name}</Text>
                  <Text style={styles.previewDetails}>{item.memberId}</Text>
                </View>
              )}
              keyExtractor={(item) => item.id.toString()}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B5E35',
    marginBottom: 12,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  dateButtonText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#1B5E35',
    fontWeight: '500',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C9A84C',
    paddingVertical: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#C9A84C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  uploadButtonText: {
    marginLeft: 12,
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  previewButton: {
    padding: 8,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  memberItemPresent: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1B5E35',
    marginBottom: 4,
  },
  memberDetails: {
    fontSize: 12,
    color: '#999',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#DDD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F0F7FF',
    paddingVertical: 16,
    borderRadius: 12,
    marginVertical: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#C9A84C',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#C9A84C',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#27AE60',
    paddingVertical: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#27AE60',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    marginBottom: 20,
  },
  saveButtonText: {
    marginLeft: 10,
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B5E35',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: 'white',
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1B5E35',
  },
  previewItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  previewName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1B5E35',
    marginBottom: 4,
  },
  previewDetails: {
    fontSize: 12,
    color: '#999',
  },
});

export default AttendanceUploadScreen;


