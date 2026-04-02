import { useState } from 'react';
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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import XLSX from 'xlsx';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../service/LanguageContext';
import API_BASE_URL from '../apiConfig';

const MemberFormScreen = ({ navigation }) => {
  const { t } = useLanguage();
  
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMembers, setSelectedMembers] = useState(new Set());
  const [showForm, setShowForm] = useState(false);
  const [currentMember, setCurrentMember] = useState(null);
  const [saving, setSaving] = useState(false);
  const [fileName, setFileName] = useState('');

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
      console.log('Selected file:', file.name);
      setFileName(file.name);

      const fileContent = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const workbook = XLSX.read(fileContent, { type: 'base64' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      console.log('Total rows:', jsonData.length);
      console.log('First row:', jsonData[0]);

      if (!jsonData || jsonData.length === 0) {
        Alert.alert(t('error'), 'No data found in Excel file');
        setLoading(false);
        return;
      }

      // Filter out empty rows and process data
      const processedMembers = jsonData
        .filter(row => {
          // Skip rows that are completely empty or just have __EMPTY
          const hasData = Object.keys(row).some(key => 
            key !== '__EMPTY' && row[key] && row[key].toString().trim() !== ''
          );
          return hasData;
        })
        .map((row, index) => ({
          id: index + 1,
          sno: row['S.NO'] || row['S.No'] || row['sno'] || index + 1,
          name: (row['MEMBER'] || row['Member'] || row['Name'] || '').toString().trim(),
          contact: (row['Contact'] || row['contact'] || row['Phone'] || '').toString().trim(),
          company: (row['Company  Name'] || row['Company Name'] || row['company'] || '').toString().trim(),
          business: (row['Type Of Buissness'] || row['Type Of Business'] || row['business'] || '').toString().trim(),
          originalData: row,
        }))
        .filter(member => {
          // Only keep rows with required fields: name, contact, and business
          const hasName = member.name && member.name.length > 0;
          const hasContact = member.contact && member.contact.length > 0;
          const hasBusiness = member.business && member.business.length > 0;
          return hasName && hasContact && hasBusiness;
        });

      console.log('Processed members:', processedMembers.length);
      console.log('First processed member:', processedMembers[0]);
      
      // Log validation details
      const invalidMembers = jsonData.filter(row => {
        const name = (row['MEMBER'] || row['Member'] || row['Name'] || '').toString().trim();
        const contact = (row['Contact'] || row['contact'] || row['Phone'] || '').toString().trim();
        const business = (row['Type Of Buissness'] || row['Type Of Business'] || row['business'] || '').toString().trim();
        return !(name && contact && business);
      });
      console.log('Invalid members count:', invalidMembers.length);
      console.log('Sample invalid member:', invalidMembers[0]);
      
      if (processedMembers.length === 0) {
        Alert.alert(t('error'), `No valid members found.\n\nValid: ${processedMembers.length}\nInvalid: ${invalidMembers.length}\n\nMake sure all rows have Name, Contact, and Business Type.`);
        setLoading(false);
        return;
      }

      setMembers(processedMembers);
      setFilteredMembers(processedMembers);
      setSelectedMembers(new Set());

      Alert.alert(
        t('success'),
        `✅ Loaded ${processedMembers.length} members\n\nColumns found:\n• S.NO\n• MEMBER (Name)\n• Contact\n• Company Name\n• Type Of Business`
      );
    } catch (error) {
      console.error('Error:', error);
      Alert.alert(t('error'), `Failed to upload: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredMembers(members);
    } else {
      const filtered = members.filter(member =>
        member.name.toLowerCase().includes(query.toLowerCase()) ||
        member.contact.toString().includes(query) ||
        member.company.toLowerCase().includes(query.toLowerCase()) ||
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

  const handleSaveMembers = async () => {
    if (selectedMembers.size === 0) {
      Alert.alert(t('error'), 'Please select at least one member');
      return;
    }

    try {
      setSaving(true);
      const token = await AsyncStorage.getItem('jwt_token');

      const membersToSave = members
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

      Alert.alert(t('success'), `✅ ${membersToSave.length} members saved successfully`);
      setMembers([]);
      setFilteredMembers([]);
      setSelectedMembers(new Set());
      setFileName('');
    } catch (error) {
      console.error('Error saving:', error);
      Alert.alert(t('error'), `Failed to save: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const MemberCard = ({ member }) => {
    const isSelected = selectedMembers.has(member.id);
    
    return (
      <TouchableOpacity
        style={[styles.memberCard, isSelected && styles.memberCardSelected]}
        onPress={() => toggleMemberSelection(member.id)}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
            {isSelected && <Icon name="check" size={16} color="#FFF" />}
          </View>

          <View style={styles.cardContent}>
            <View style={styles.row}>
              <Text style={styles.label}>S.NO:</Text>
              <Text style={styles.value}>{member.sno}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Name:</Text>
              <Text style={styles.value}>{member.name}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Contact:</Text>
              <Text style={styles.value}>{member.contact}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Company:</Text>
              <Text style={styles.value}>{member.company || 'N/A'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Business:</Text>
              <Text style={styles.value}>{member.business}</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => {
              setCurrentMember(member);
              setShowForm(true);
            }}
          >
            <Icon name="pencil" size={20} color="#C9A84C" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1B5E35" />

      <LinearGradient colors={['#1B5E35', '#1a1f47']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Member Form</Text>
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
          {fileName && (
            <Text style={styles.fileNameText}>File: {fileName}</Text>
          )}
          <Text style={styles.uploadHint}>
            Required columns: S.NO, MEMBER, Contact, Company Name, Type Of Business
          </Text>
        </View>

        {members.length > 0 && (
          <>
            {/* Stats */}
            <View style={styles.section}>
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{members.length}</Text>
                  <Text style={styles.statLabel}>Total</Text>
                </View>
                <View style={[styles.statItem, { borderLeftWidth: 1, borderLeftColor: '#E0E0E0' }]}>
                  <Text style={[styles.statValue, { color: '#27AE60' }]}>{selectedMembers.size}</Text>
                  <Text style={styles.statLabel}>Selected</Text>
                </View>
                <View style={[styles.statItem, { borderLeftWidth: 1, borderLeftColor: '#E0E0E0' }]}>
                  <Text style={[styles.statValue, { color: '#F39C12' }]}>{filteredMembers.length}</Text>
                  <Text style={styles.statLabel}>Filtered</Text>
                </View>
              </View>
            </View>

            {/* Search */}
            <View style={styles.section}>
              <View style={styles.searchContainer}>
                <Icon name="magnify" size={20} color="#999" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by name, contact, company, or business..."
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
            </View>

            {/* Members List */}
            <View style={styles.section}>
              <View style={styles.listHeader}>
                <Text style={styles.sectionTitle}>Members ({filteredMembers.length})</Text>
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
                renderItem={({ item }) => <MemberCard member={item} />}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={false}
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.section}>
              <TouchableOpacity
                style={[styles.saveButton, selectedMembers.size === 0 && styles.saveButtonDisabled]}
                onPress={handleSaveMembers}
                disabled={saving || selectedMembers.size === 0}
              >
                {saving ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Icon name="check-circle" size={20} color="#FFF" />
                    <Text style={styles.saveButtonText}>
                      Save {selectedMembers.size > 0 ? `(${selectedMembers.size})` : ''}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => {
                  setMembers([]);
                  setFilteredMembers([]);
                  setSelectedMembers(new Set());
                  setFileName('');
                  setSearchQuery('');
                }}
              >
                <Icon name="trash-can" size={20} color="#E74C3C" />
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {members.length === 0 && fileName && (
          <View style={styles.emptyState}>
            <Icon name="alert-circle" size={64} color="#E74C3C" />
            <Text style={styles.emptyStateText}>No valid members found</Text>
            <Text style={styles.emptyStateSubtext}>
              Make sure your Excel file has all required columns with data
            </Text>
          </View>
        )}

        {members.length === 0 && !fileName && (
          <View style={styles.emptyState}>
            <Icon name="file-document-outline" size={64} color="#CCC" />
            <Text style={styles.emptyStateText}>No file uploaded</Text>
            <Text style={styles.emptyStateSubtext}>
              Upload an Excel file to view and save members
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Edit Form Modal */}
      <Modal
        visible={showForm}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Member</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <Icon name="close" size={24} color="#1B5E35" />
              </TouchableOpacity>
            </View>

            {currentMember && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>S.NO</Text>
                  <Text style={styles.formValue}>{currentMember.sno}</Text>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Name *</Text>
                  <Text style={styles.formValue}>{currentMember.name}</Text>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Contact *</Text>
                  <Text style={styles.formValue}>{currentMember.contact}</Text>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Company Name</Text>
                  <Text style={styles.formValue}>{currentMember.company || 'N/A'}</Text>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Type Of Business *</Text>
                  <Text style={styles.formValue}>{currentMember.business}</Text>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>All Data</Text>
                  <Text style={styles.formValue}>
                    {JSON.stringify(currentMember.originalData, null, 2)}
                  </Text>
                </View>
              </ScrollView>
            )}
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
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B5E35',
    marginBottom: 12,
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
  fileNameText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
  uploadHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
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
    color: '#C9A84C',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 14,
    color: '#333',
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
    color: '#C9A84C',
    fontWeight: '600',
  },
  memberCard: {
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
  memberCardSelected: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#DDD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  cardContent: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 6,
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    width: 80,
  },
  value: {
    fontSize: 13,
    color: '#1B5E35',
    fontWeight: '500',
    flex: 1,
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
    color: '#1B5E35',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
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
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1B5E35',
  },
  modalBody: {
    flex: 1,
  },
  formGroup: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  formLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
    fontWeight: '600',
  },
  formValue: {
    fontSize: 14,
    color: '#1B5E35',
    fontWeight: '500',
  },
});

export default MemberFormScreen;

