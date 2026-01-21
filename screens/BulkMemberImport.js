import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as XLSX from 'xlsx';
import ApiService from '../service/api';

const BulkMemberImport = () => {
  const navigation = useNavigation();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Pick Excel file
  const pickExcelFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ],
        copyToCacheDirectory: true,
      });

      console.log('Document picker result:', result);

      // Check if file was selected (newer expo-document-picker versions)
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        console.log('File selected:', file.uri);
        parseExcelFile(file.uri);
      } 
      // Fallback for older versions
      else if (result.type === 'success' && result.uri) {
        console.log('File selected (legacy):', result.uri);
        parseExcelFile(result.uri);
      } else {
        console.log('File selection cancelled');
      }
    } catch (error) {
      console.error('File picker error:', error);
      Alert.alert('Error', 'Failed to pick file: ' + error.message);
    }
  };

  // Parse Excel file
  const parseExcelFile = async (uri) => {
    setLoading(true);
    console.log('Starting to parse Excel file:', uri);
    
    try {
      const response = await fetch(uri);
      console.log('Fetch response status:', response.status);
      
      const arrayBuffer = await response.arrayBuffer();
      console.log('Array buffer size:', arrayBuffer.byteLength);
      
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      console.log('Workbook sheets:', workbook.SheetNames);
      
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      console.log('Extracted rows:', jsonData.length);
      console.log('First row sample:', jsonData[0]);

      if (jsonData.length === 0) {
        Alert.alert('Empty File', 'The Excel file has no data rows.');
        setLoading(false);
        return;
      }

      // Map Excel data to member format
      const mappedMembers = jsonData.map((row, index) => {
        console.log(`Processing row ${index}:`, row);
        
        return {
          id: `temp_${index}`,
          name: row['Name'] || row['Member Name'] || row['name'] || '',
          phone: String(row['Phone'] || row['Mobile'] || row['phone'] || ''),
          email: row['Email'] || row['email'] || '',
          joinDate: row['Join Date'] || row['Joining Date'] || row['joinDate'] || new Date().toISOString(),
          address: row['Address'] || row['address'] || '',
          batch: row['Batch'] || row['batch'] || '',
          business: row['Business'] || row['business'] || '',
          status: 'Active',
          feesStatus: 'Unpaid',
          memberId: `MEM${String(Date.now() + index).slice(-6)}`,
          isValid: true,
          errors: [],
        };
      });

      console.log('Mapped members:', mappedMembers.length);

      // Validate members
      const validatedMembers = mappedMembers.map(member => {
        const errors = [];
        if (!member.name || member.name.trim() === '') {
          errors.push('Name is required');
        }
        if (!member.phone || member.phone.length < 10) {
          errors.push('Valid phone number required');
        }
        
        return {
          ...member,
          isValid: errors.length === 0,
          errors,
        };
      });

      console.log('Validated members:', validatedMembers.length);
      console.log('Valid count:', validatedMembers.filter(m => m.isValid).length);
      console.log('Invalid count:', validatedMembers.filter(m => !m.isValid).length);

      setMembers(validatedMembers);
      
      Alert.alert(
        'Import Successful',
        `Imported ${validatedMembers.length} members.\n${validatedMembers.filter(m => m.isValid).length} valid, ${validatedMembers.filter(m => !m.isValid).length} have errors.`
      );
    } catch (error) {
      console.error('Parse error:', error);
      Alert.alert('Error', 'Failed to parse Excel file: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Edit member
  const handleEditMember = (member) => {
    setEditingMember({ ...member });
    setShowEditModal(true);
  };

  // Save edited member
  const handleSaveEdit = () => {
    // Re-validate after edit
    const errors = [];
    if (!editingMember.name || editingMember.name.trim() === '') {
      errors.push('Name is required');
    }
    if (!editingMember.phone || editingMember.phone.length < 10) {
      errors.push('Valid phone number required');
    }
    
    const updatedMember = {
      ...editingMember,
      isValid: errors.length === 0,
      errors,
    };

    const updatedMembers = members.map(m =>
      m.id === updatedMember.id ? updatedMember : m
    );
    setMembers(updatedMembers);
    setShowEditModal(false);
    setEditingMember(null);
  };

  // Save single member to database
  const handleSaveSingleMember = async (member) => {
    if (!member.isValid) {
      Alert.alert('Validation Error', 'Please fix errors before saving:\n' + member.errors.join('\n'));
      return;
    }

    Alert.alert(
      'Save Member',
      `Save ${member.name} to database?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async () => {
            setLoading(true);
            try {
              const memberData = {
                name: member.name,
                memberId: member.memberId,
                phone: member.phone,
                email: member.email,
                joinDate: member.joinDate,
                status: member.status,
                feesStatus: member.feesStatus,
                address: member.address,
                batch: member.batch,
                business: member.business,
                createdBy: 'Admin',
              };

              await ApiService.createMember(memberData);
              
              // Remove saved member from list
              setMembers(members.filter(m => m.id !== member.id));
              
              Alert.alert('Success', `${member.name} saved successfully!`);
            } catch (error) {
              console.error('Failed to save member:', error);
              Alert.alert('Error', 'Failed to save member: ' + error.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Delete member from list
  const handleDeleteMember = (id) => {
    Alert.alert(
      'Delete Member',
      'Remove this member from import list?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => setMembers(members.filter(m => m.id !== id)),
        },
      ]
    );
  };

  // Bulk save all members
  const handleBulkSave = async () => {
    const validMembers = members.filter(m => m.isValid);
    
    if (validMembers.length === 0) {
      Alert.alert('Error', 'No valid members to save');
      return;
    }

    Alert.alert(
      'Confirm Bulk Save',
      `Save ${validMembers.length} members to database?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save All',
          onPress: async () => {
            setLoading(true);
            let successCount = 0;
            let failCount = 0;

            for (const member of validMembers) {
              try {
                const memberData = {
                  name: member.name,
                  memberId: member.memberId,
                  phone: member.phone,
                  email: member.email,
                  joinDate: member.joinDate,
                  status: member.status,
                  feesStatus: member.feesStatus,
                  address: member.address,
                  batch: member.batch,
                  business: member.business,
                  createdBy: 'Admin',
                };

                await ApiService.createMember(memberData);
                successCount++;
              } catch (error) {
                failCount++;
                console.error('Failed to save member:', member.name, error);
              }
            }

            setLoading(false);
            Alert.alert(
              'Bulk Save Complete',
              `Successfully saved: ${successCount}\nFailed: ${failCount}`,
              [
                {
                  text: 'OK',
                  onPress: () => {
                    if (successCount > 0) {
                      navigation.goBack();
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  // Render member card
  const renderMemberCard = ({ item }) => (
    <View style={[styles.memberCard, !item.isValid && styles.invalidCard]}>
      <View style={styles.cardHeader}>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{item.name}</Text>
          <Text style={styles.memberId}>ID: {item.memberId}</Text>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => handleEditMember(item)}
          >
            <Icon name="pencil" size={20} color="#FF9800" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => handleDeleteMember(item.id)}
          >
            <Icon name="delete" size={20} color="#F44336" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Icon name="phone" size={16} color="#666" />
          <Text style={styles.infoText}>{item.phone}</Text>
        </View>
        {item.email && (
          <View style={styles.infoRow}>
            <Icon name="email" size={16} color="#666" />
            <Text style={styles.infoText}>{item.email}</Text>
          </View>
        )}
        {item.batch && (
          <View style={styles.infoRow}>
            <Icon name="clock" size={16} color="#666" />
            <Text style={styles.infoText}>Batch: {item.batch}</Text>
          </View>
        )}
      </View>

      {!item.isValid && (
        <View style={styles.errorContainer}>
          {item.errors.map((error, index) => (
            <Text key={index} style={styles.errorText}>• {error}</Text>
          ))}
        </View>
      )}

      {/* Individual Save Button */}
      <TouchableOpacity
        style={[styles.saveSingleButton, !item.isValid && styles.saveSingleButtonDisabled]}
        onPress={() => handleSaveSingleMember(item)}
        disabled={!item.isValid}
      >
        <Icon name="content-save" size={16} color={item.isValid ? "#FFF" : "#999"} />
        <Text style={[styles.saveSingleButtonText, !item.isValid && styles.saveSingleButtonTextDisabled]}>
          {item.isValid ? 'Save This Member' : 'Fix Errors to Save'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#212c62" barStyle="light-content" />

      {/* Header */}
      {/* <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bulk Import Members</Text>
        <View style={{ width: 24 }} />
      </View> */}

      {/* Instructions */}
      {members.length === 0 && !loading && (
        <View style={styles.instructionsContainer}>
          <Icon name="file-excel" size={60} color="#4CAF50" />
          <Text style={styles.instructionsTitle}>Import Members from Excel</Text>
          <Text style={styles.instructionsText}>
            Upload an Excel file with columns:{'\n'}
            Name, Phone, Email, Address, Batch, Business
          </Text>
        </View>
      )}

      {/* Loading Indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#212c62" />
          <Text style={styles.loadingText}>Processing Excel file...</Text>
        </View>
      )}

      {/* Member List */}
      {members.length > 0 && (
        <>
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{members.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#4CAF50' }]}>
                {members.filter(m => m.isValid).length}
              </Text>
              <Text style={styles.statLabel}>Valid</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#F44336' }]}>
                {members.filter(m => !m.isValid).length}
              </Text>
              <Text style={styles.statLabel}>Errors</Text>
            </View>
          </View>

          <FlatList
            data={members}
            renderItem={renderMemberCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
          />
        </>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.importButton}
          onPress={pickExcelFile}
          disabled={loading}
        >
          <Icon name="file-upload" size={20} color="#FFF" />
          <Text style={styles.buttonText}>
            {members.length > 0 ? 'Import Another File' : 'Import Excel File'}
          </Text>
        </TouchableOpacity>

        {members.length > 0 && (
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleBulkSave}
            disabled={loading || members.filter(m => m.isValid).length === 0}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Icon name="content-save-all" size={20} color="#FFF" />
                <Text style={styles.buttonText}>
                  Save All ({members.filter(m => m.isValid).length})
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Member</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                value={editingMember?.name}
                onChangeText={(text) =>
                  setEditingMember({ ...editingMember, name: text })
                }
                placeholder="Enter name"
              />

              <Text style={styles.label}>Phone *</Text>
              <TextInput
                style={styles.input}
                value={editingMember?.phone}
                onChangeText={(text) =>
                  setEditingMember({ ...editingMember, phone: text })
                }
                placeholder="Enter phone"
                keyboardType="phone-pad"
                maxLength={10}
              />

              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={editingMember?.email}
                onChangeText={(text) =>
                  setEditingMember({ ...editingMember, email: text })
                }
                placeholder="Enter email"
                keyboardType="email-address"
              />

              <Text style={styles.label}>Address</Text>
              <TextInput
                style={styles.input}
                value={editingMember?.address}
                onChangeText={(text) =>
                  setEditingMember({ ...editingMember, address: text })
                }
                placeholder="Enter address"
              />

              <Text style={styles.label}>Batch</Text>
              <TextInput
                style={styles.input}
                value={editingMember?.batch}
                onChangeText={(text) =>
                  setEditingMember({ ...editingMember, batch: text })
                }
                placeholder="Enter batch"
              />

              <Text style={styles.label}>Business</Text>
              <TextInput
                style={styles.input}
                value={editingMember?.business}
                onChangeText={(text) =>
                  setEditingMember({ ...editingMember, business: text })
                }
                placeholder="Enter business"
              />
            </ScrollView>

            <TouchableOpacity style={styles.saveEditButton} onPress={handleSaveEdit}>
              <Text style={styles.saveEditButtonText}>Save Changes</Text>
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
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#212c62',
    paddingTop: 10,
    paddingHorizontal: 15,
    paddingBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  instructionsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  instructionsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212c62',
    marginTop: 20,
    marginBottom: 10,
  },
  instructionsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#212c62',
    fontWeight: '600',
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 15,
    justifyContent: 'space-around',
    elevation: 2,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212c62',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  listContent: {
    padding: 15,
  },
  memberCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    elevation: 2,
  },
  invalidCard: {
    borderWidth: 2,
    borderColor: '#F44336',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212c62',
  },
  memberId: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
  },
  iconButton: {
    padding: 8,
    marginLeft: 8,
  },
  cardBody: {
    marginTop: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginBottom: 2,
  },
  saveSingleButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  saveSingleButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  saveSingleButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  saveSingleButtonTextDisabled: {
    color: '#999',
  },
  actionButtons: {
    padding: 15,
    backgroundColor: '#FFF',
    elevation: 4,
  },
  importButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  saveButton: {
    backgroundColor: '#212c62',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 12,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212c62',
  },
  modalBody: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212c62',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  saveEditButton: {
    backgroundColor: '#212c62',
    padding: 15,
    margin: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveEditButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default BulkMemberImport;
