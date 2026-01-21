import React, { useState } from 'react';
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
  TextInput,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import XLSX from 'xlsx';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../service/LanguageContext';
import API_BASE_URL from '../apiConfig';

const { width } = Dimensions.get('window');

const NewMemberUploadScreen = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  
  const [loading, setLoading] = useState(false);
  const [uploadedMembers, setUploadedMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMembers, setSelectedMembers] = useState(new Set());
  const [validationErrors, setValidationErrors] = useState({});
  const [showValidation, setShowValidation] = useState(false);
  const [saving, setSaving] = useState(false);

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

      const fileContent = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const workbook = XLSX.read(fileContent, { type: 'base64' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      console.log('Parsed Excel data:', jsonData);

      const processedMembers = jsonData.map((row, index) => ({
        id: index + 1,
        name: row['MEMBER'] || row['Member'] || row['Name'] || row['name'] || '',
        contact: row['Contact'] || row['contact'] || row['Phone'] || row['phone'] || row['Mobile'] || '',
        company: row['Company Name'] || row['company'] || row['Company'] || '',
        business: row['Type Of Buisness'] || row['Type Of Business'] || row['business'] || row['Business'] || '',
        sno: row['S.NO'] || row['S.No'] || row['sno'] || index + 1,
      }));

      setUploadedMembers(processedMembers);
      setFilteredMembers(processedMembers);
      setSelectedMembers(new Set());
      setValidationErrors({});
      
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

  const validateMember = (member) => {
    const errors = {};
    
    if (!member.name || member.name.trim() === '') {
      errors.name = 'Name is required';
    }
    
    if (!member.contact || member.contact.toString().trim() === '') {
      errors.contact = 'Contact number is required';
    } else if (!/^\d{10}$/.test(member.contact.toString().replace(/\D/g, ''))) {
      errors.contact = 'Contact must be 10 digits';
    }
    
    if (!member.business || member.business.trim() === '') {
      errors.business = 'Business type is required';
    }
    
    return errors;
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredMembers(uploadedMembers);
    } else {
      const filtered = uploadedMembers.filter(member =>
        member.name.toLowerCase().includes(query.toLowerCase()) ||
        member.contact.toString().includes(query) ||
        member.business.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredMembers(filtered);
    }
  };

  const toggleMemberSelection = (memberId) => {
    const newSelected = new Set(selectedMembers);
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId);
    } else {
      newSelected.add(memberId);
    }
    setSelectedMembers(newSelected);
  };

  const validateSelectedMembers = () => {
    const errors = {};
    let hasErrors = false;

    selectedMembers.forEach(memberId => {
      const member = uploadedMembers.find(m => m.id === memberId);
      if (member) {
        const memberErrors = validateMember(member);
        if (Object.keys(memberErrors).length > 0) {
          errors[memberId] = memberErrors;
          hasErrors = true;
        }
      }
    });

    setValidationErrors(errors);
    return !hasErrors;
  };

  const handleSaveMembers = async () => {
    if (selectedMembers.size === 0) {
      Alert.alert(t('error'), 'Please select at least one member');
      return;
    }

    if (!validateSelectedMembers()) {
      setShowValidation(true);
      Alert.alert(t('error'), 'Please fix validation errors before saving');
      return;
    }

    try {
      setSaving(true);
      const token = await AsyncStorage.getItem('jwt_token');

      const membersToSave = uploadedMembers
        .filter(m => selectedMembers.has(m.id))
        .map(member => ({
          name: member.name.trim(),
          contact: member.contact.toString().trim(),
          company: member.company.trim(),
          business: member.business.trim(),
        }));

      console.log('Saving members:', membersToSave);

      const response = await fetch(`${API_BASE_URL}/api/Members/BulkCreate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ members: membersToSave }),
      });

      if (!response.ok) {
        throw new Error('Failed to save members');
      }

      const result = await response.json();
      console.log('Save result:', result);

      Alert.alert(t('success'), `${membersToSave.length} members saved successfully`);
      setUploadedMembers([]);
      setFilteredMembers([]);
      setSelectedMembers(new Set());
      setSearchQuery('');
      setValidationErrors({});
    } catch (error) {
      console.error('Error saving members:', error);
      Alert.alert(t('error'), 'Failed to save members. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const MemberRow = ({ member }) => {
    const isSelected = selectedMembers.has(member.id);
    const hasErrors = validationErrors[member.id];
    
    return (
      <TouchableOpacity
        style={[
          styles.memberRow,
          isSelected && styles.memberRowSelected,
          hasErrors && styles.memberRowError,
        ]}
        onPress={() => toggleMemberSelection(member.id)}
      >
        <View style={styles.checkboxContainer}>
          <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
            {isSelected && <Icon name="check" size={16} color="#FFF" />}
          </View>
        </View>

        <View style={styles.memberInfo}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Name:</Text>
            <Text style={[styles.value, !member.name && styles.errorText]}>
              {member.name || '⚠️ Missing'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Contact:</Text>
            <Text style={[styles.value, !member.contact && styles.errorText]}>
              {member.contact || '⚠️ Missing'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Business:</Text>
            <Text style={[styles.value, !member.business && styles.errorText]}>
              {member.business || '⚠️ Missing'}
            </Text>
          </View>
          {member.company && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Company:</Text>
              <Text style={styles.value}>{member.company}</Text>
            </View>
          )}
        </View>

        {hasErrors && (
          <View style={styles.errorIcon}>
            <Icon name="alert-circle" size={20} color="#E74C3C" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const getStats = () => {
    const selected = selectedMembers.size;
    const withErrors = Object.keys(validationErrors).length;
    const valid = selected - withErrors;

    return { selected, valid, withErrors };
  };

  const stats = getStats();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#212c62" />

      <LinearGradient colors={['#212c62', '#1a1f47']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add New Members</Text>
          <View style={{ width: 24 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Upload Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upload Excel File</Text>
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
          <Text style={styles.uploadHint}>
            Required columns: Name, Contact, Business Type
          </Text>
        </View>

        {uploadedMembers.length > 0 && (
          <>
            {/* Search */}
            <View style={styles.section}>
              <View style={styles.searchContainer}>
                <Icon name="magnify" size={20} color="#999" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by name, contact, or business"
                  value={searchQuery}
                  onChangeText={handleSearch}
                  placeholderTextColor="#CCC"
                />
                {searchQuery !== '' && (
                  <TouchableOpacity onPress={() => handleSearch('')}>
                    <Icon name="close" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.resultCount}>
                Showing {filteredMembers.length} of {uploadedMembers.length} members
              </Text>
            </View>

            {/* Stats */}
            <View style={styles.section}>
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.selected}</Text>
                  <Text style={styles.statLabel}>Selected</Text>
                </View>
                <View style={[styles.statItem, { borderLeftWidth: 1, borderLeftColor: '#E0E0E0' }]}>
                  <Text style={[styles.statValue, { color: '#27AE60' }]}>{stats.valid}</Text>
                  <Text style={styles.statLabel}>Valid</Text>
                </View>
                <View style={[styles.statItem, { borderLeftWidth: 1, borderLeftColor: '#E0E0E0' }]}>
                  <Text style={[styles.statValue, { color: '#E74C3C' }]}>{stats.withErrors}</Text>
                  <Text style={styles.statLabel}>Errors</Text>
                </View>
              </View>
            </View>

            {/* Members List */}
            <View style={styles.section}>
              <View style={styles.listHeader}>
                <Text style={styles.sectionTitle}>Members</Text>
                <TouchableOpacity
                  style={styles.selectAllButton}
                  onPress={() => {
                    if (selectedMembers.size === filteredMembers.length) {
                      setSelectedMembers(new Set());
                    } else {
                      const allIds = new Set(filteredMembers.map(m => m.id));
                      setSelectedMembers(allIds);
                    }
                  }}
                >
                  <Text style={styles.selectAllText}>
                    {selectedMembers.size === filteredMembers.length ? 'Deselect All' : 'Select All'}
                  </Text>
                </TouchableOpacity>
              </View>

              <FlatList
                data={filteredMembers}
                renderItem={({ item }) => <MemberRow member={item} />}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={false}
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.section}>
              <TouchableOpacity
                style={[styles.saveButton, stats.selected === 0 && styles.saveButtonDisabled]}
                onPress={handleSaveMembers}
                disabled={saving || stats.selected === 0}
              >
                {saving ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Icon name="check-circle" size={20} color="#FFF" />
                    <Text style={styles.saveButtonText}>
                      Save {stats.selected > 0 ? `(${stats.selected})` : ''}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => {
                  setUploadedMembers([]);
                  setFilteredMembers([]);
                  setSelectedMembers(new Set());
                  setSearchQuery('');
                  setValidationErrors({});
                }}
              >
                <Icon name="trash-can" size={20} color="#E74C3C" />
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {uploadedMembers.length === 0 && (
          <View style={styles.emptyState}>
            <Icon name="file-document-outline" size={64} color="#CCC" />
            <Text style={styles.emptyStateText}>No members uploaded yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Upload an Excel file to add new members
            </Text>
          </View>
        )}
      </ScrollView>
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
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212c62',
    marginBottom: 12,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90E2',
    paddingVertical: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#4A90E2',
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
  uploadHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 14,
    color: '#333',
  },
  resultCount: {
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4A90E2',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E3F2FD',
    borderRadius: 6,
  },
  selectAllText: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '600',
  },
  memberRow: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  memberRowSelected: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  memberRowError: {
    backgroundColor: '#FFEBEE',
    borderColor: '#E74C3C',
  },
  checkboxContainer: {
    justifyContent: 'center',
    marginRight: 12,
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
  memberInfo: {
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 6,
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    width: 70,
  },
  value: {
    fontSize: 13,
    color: '#212c62',
    fontWeight: '500',
    flex: 1,
  },
  errorText: {
    color: '#E74C3C',
    fontWeight: '600',
  },
  errorIcon: {
    justifyContent: 'center',
    marginLeft: 8,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#27AE60',
    paddingVertical: 14,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#27AE60',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    marginBottom: 10,
  },
  saveButtonDisabled: {
    backgroundColor: '#CCC',
    elevation: 0,
  },
  saveButtonText: {
    marginLeft: 10,
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE5E5',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E74C3C',
    marginBottom: 20,
  },
  clearButtonText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#E74C3C',
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
    color: '#212c62',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
});

export default NewMemberUploadScreen;
