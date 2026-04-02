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
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from '../service/api';

const BulkMemberImport = () => {
  const navigation = useNavigation();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Robust function to get current user's member ID (3-tier lookup)
  const getCurrentUserMemberId = async () => {
    try {
      // First check if memberId is already in AsyncStorage
      const storedMemberId = await AsyncStorage.getItem('memberId');
      if (storedMemberId) {
        console.log('BulkMemberImport - Member ID found in storage:', storedMemberId);
        return parseInt(storedMemberId);
      }

      console.log('BulkMemberImport - Member ID not in storage, attempting to look up...');

      // If not, try to get it from user ID
      const userId = await AsyncStorage.getItem('userId');
      const fullName = await AsyncStorage.getItem('fullName');

      if (userId) {
        try {
          // Try to get member by user ID
          console.log('BulkMemberImport - Trying GetByUserId with userId:', userId);
          const memberData = await ApiService.getMemberByUserId(userId);
          if (memberData && memberData.id) {
            await AsyncStorage.setItem('memberId', memberData.id.toString());
            console.log('BulkMemberImport - Member found via GetByUserId:', memberData.id);
            return memberData.id;
          }
        } catch (error) {
          console.log('BulkMemberImport - GetByUserId failed, trying name search:', error);
        }
      }

      // Fallback: search by name
      if (fullName) {
        try {
          console.log('BulkMemberImport - Searching members by name:', fullName);
          const members = await ApiService.getMembers();
          const member = members.find(m => m.name && m.name.trim().toLowerCase() === fullName.trim().toLowerCase());
          if (member) {
            await AsyncStorage.setItem('memberId', member.id.toString());
            console.log('BulkMemberImport - Member found by name:', member.id);
            return member.id;
          }
        } catch (error) {
          console.log('BulkMemberImport - Name search failed:', error);
        }
      }

      console.log('BulkMemberImport - Could not find member ID');
      return null;
    } catch (error) {
      console.error('BulkMemberImport - Error getting member ID:', error);
      return null;
    }
  };

  // Download Excel template
  const handleDownloadTemplate = async () => {
    try {
      const templateData = [
        {
          'MEMBER': 'R. Anbalagan',
          'Contact': '9884090206',
          'Email': 'example@email.com',
          'Company Name': '4 Ankadi',
          'Type Of Business': 'Super Market',
          'Date of Birth': '1990-06-15',
          'Joining Date': '2026-01-28',
          'Gender': 'Male',
          'Address': '123, Main Street, Chennai',
        },
        {
          'MEMBER': 'J. Anbazhagan',
          'Contact': '9444043342',
          'Email': 'sample@email.com',
          'Company Name': 'First Insurance Shop',
          'Type Of Business': 'Investment Consultant',
          'Date of Birth': '1985-03-20',
          'Joining Date': '2026-01-28',
          'Gender': 'Female',
          'Address': '456, Park Road, Coimbatore',
        },
      ];

      const ws = XLSX.utils.json_to_sheet(templateData);
      ws['!cols'] = [
        { wch: 25 }, { wch: 15 }, { wch: 28 }, { wch: 28 },
        { wch: 28 }, { wch: 18 }, { wch: 18 }, { wch: 10 },
        { wch: 35 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Members Template');

      // Write as binary string then convert to base64
      const wbout = XLSX.write(wb, { type: 'binary', bookType: 'xlsx' });

      // Convert binary string to base64
      const buf = new Uint8Array(wbout.length);
      for (let i = 0; i < wbout.length; i++) {
        buf[i] = wbout.charCodeAt(i) & 0xff;
      }
      const base64 = btoa(String.fromCharCode(...buf));

      const fileUri = FileSystem.documentDirectory + 'Members_Template.xlsx';
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: 'Save Members Template',
          UTI: 'com.microsoft.excel.xlsx',
        });
      } else {
        Alert.alert('Saved', `Template saved to your device.`);
      }
    } catch (error) {
      console.error('Template download error:', error);
      Alert.alert('Error', 'Failed to generate template: ' + error.message);
    }
  };

  // Clear all imported data
  const handleClearData = () => {
    if (members.length === 0) {
      Alert.alert('Info', 'No data to clear');
      return;
    }

    Alert.alert(
      'Clear All Data',
      'Are you sure you want to clear all imported members? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            setMembers([]);
            Alert.alert('Success', 'All imported data has been cleared');
          },
        },
      ]
    );
  };

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

        // Parse date helper
        const parseDate = (val) => {
          if (!val) return null;
          const s = String(val).trim();
          if (!s) return null;
          // Handle Excel serial numbers
          if (/^\d{5}$/.test(s)) {
            const d = XLSX.SSF.parse_date_code(parseInt(s));
            return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
          }
          return s;
        };

        return {
          id: `temp_${index}`,
          sno: row['S.NO'] || row['S.No'] || index + 1,
          name: row['MEMBER'] || row['Name'] || row['Member Name'] || row['name'] || '',
          phone: String(row['Contact'] || row['Phone'] || row['Mobile'] || row['phone'] || '').trim(),
          email: row['Email'] || row['email'] || '',
          company: row['Company Name'] || row['Company_Name'] || row['company'] || row['Company'] || '',
          business: row['Type Of Business'] || row['Type Of Buissness'] || row['Business'] || row['business'] || '',
          dob: parseDate(row['Date of Birth'] || row['DOB'] || row['dob']),
          joinDate: parseDate(row['Joining Date'] || row['Join Date'] || row['joinDate']),
          gender: row['Gender'] || row['gender'] || '',
          address: row['Address'] || row['address'] || '',
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
        // Remove spaces from phone and check length
        const phoneDigits = member.phone.replace(/\s/g, '');
        if (!phoneDigits || phoneDigits.length < 10) {
          errors.push('Valid phone number required (10+ digits)');
        }
        
        return {
          ...member,
          phone: phoneDigits, // Store cleaned phone number
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
              // Get admin member ID using robust 3-tier lookup
              const adminMemberId = await getCurrentUserMemberId();
              if (!adminMemberId) {
                Alert.alert('Error', 'Admin member ID not found. Please login again.');
                setLoading(false);
                return;
              }

              console.log('BulkMemberImport - Using admin member ID:', adminMemberId);

              // Generate default email if not provided (required by backend)
              const email = member.email || `${member.phone}@alaigal.com`;

              const memberData = {
                Name: member.name,
                Phone: member.phone,
                Email: email,
                DOB: member.dob || null,
                JoinDate: member.joinDate || null,
                Gender: member.gender || null,
                Address: member.address || null,
                Business: member.business || null,
                BusinessCategory: member.company || null,
                CreatedBy: adminMemberId,
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

  // Bulk save all members using bulk API
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
            
            try {
              // Get admin member ID using robust 3-tier lookup
              const adminMemberId = await getCurrentUserMemberId();
              if (!adminMemberId) {
                Alert.alert('Error', 'Admin member ID not found. Please login again.');
                setLoading(false);
                return;
              }

              console.log('BulkMemberImport - Using admin member ID for bulk save:', adminMemberId);

              // Prepare members array for bulk API
              const membersForBulk = validMembers.map(member => {
                // Generate email from name if not provided
                let email = member.email;
                if (!email || email.trim() === '') {
                  const namePart = member.name.toLowerCase().replace(/\s+/g, '');
                  email = `${namePart}@alaigal.com`;
                }

                return {
                  Name: member.name.trim(),
                  Phone: member.phone.trim(),
                  Email: email.trim(),
                  Business: member.business ? member.business.trim() : null,
                  BusinessCategory: member.company ? member.company.trim() : null,
                  DOB: member.dob || null,
                  JoinDate: member.joinDate || null,
                  Gender: member.gender ? member.gender.trim() : null,
                  Address: member.address ? member.address.trim() : null,
                };
              });

              console.log('Sending bulk members:', JSON.stringify({ AdminMemberId: adminMemberId, Members: membersForBulk }, null, 2));

              // Call bulk create API
              const result = await ApiService.createBulkMembers({
                AdminMemberId: adminMemberId,
                Members: membersForBulk
              });

              console.log('Bulk save result:', result);

              setLoading(false);
              
              // Clear the members list after successful save
              if (result.successCount > 0) {
                setMembers([]);
              }
              
              // Show detailed results
              let message = `Successfully saved: ${result.successCount}\nFailed: ${result.failCount}`;
              
              if (result.errors && result.errors.length > 0) {
                message += '\n\nErrors:\n' + result.errors.slice(0, 5).join('\n');
                if (result.errors.length > 5) {
                  message += `\n... and ${result.errors.length - 5} more errors`;
                }
              }
              
              Alert.alert(
                'Bulk Save Complete',
                message,
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      if (result.successCount > 0) {
                        navigation.goBack();
                      }
                    },
                  },
                ]
              );
            } catch (error) {
              console.error('Bulk save error:', error);
              setLoading(false);
              Alert.alert('Error', 'Failed to save members: ' + error.message);
            }
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
          <Text style={styles.memberName}>
            {item.sno ? `${item.sno}. ` : ''}{item.name}
          </Text>
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
        {item.company && (
          <View style={styles.infoRow}>
            <Icon name="office-building" size={16} color="#666" />
            <Text style={styles.infoText}>{item.company}</Text>
          </View>
        )}
        {item.business && (
          <View style={styles.infoRow}>
            <Icon name="briefcase" size={16} color="#666" />
            <Text style={styles.infoText}>{item.business}</Text>
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
            Download the template, fill in member details, then upload it here.
          </Text>

          {/* Step 1 - Download Template */}
          <View style={styles.stepCard}>
            <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>1</Text></View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Download Template</Text>
              <Text style={styles.stepDesc}>Get the Excel file with all required columns</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.templateBtn} onPress={handleDownloadTemplate}>
            <Icon name="file-download-outline" size={20} color="#FFF" />
            <Text style={styles.templateBtnText}>Download Template</Text>
          </TouchableOpacity>

          <View style={styles.columnBox}>
            <Text style={styles.columnBoxTitle}>Template Columns:</Text>
            <Text style={styles.columnBoxText}>
              MEMBER · Contact · Email · Company Name · Type Of Business · Date of Birth · Joining Date · Gender · Address
            </Text>
          </View>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>THEN</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Step 2 - Import */}
          <View style={styles.stepCard}>
            <View style={[styles.stepBadge, { backgroundColor: '#4CAF50' }]}><Text style={styles.stepBadgeText}>2</Text></View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Fill & Upload</Text>
              <Text style={styles.stepDesc}>Fill the template with member data and import it</Text>
            </View>
          </View>
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
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={handleClearData}
            >
              <Icon name="refresh" size={24} color="#F44336" />
              <Text style={styles.refreshButtonText}>Clear</Text>
            </TouchableOpacity>
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

              <Text style={styles.label}>Company Name</Text>
              <TextInput
                style={styles.input}
                value={editingMember?.company}
                onChangeText={(text) =>
                  setEditingMember({ ...editingMember, company: text })
                }
                placeholder="Enter company name"
              />

              <Text style={styles.label}>Type Of Business</Text>
              <TextInput
                style={styles.input}
                value={editingMember?.business}
                onChangeText={(text) =>
                  setEditingMember({ ...editingMember, business: text })
                }
                placeholder="Enter business type"
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
    alignItems: 'center',
    padding: 24,
    paddingTop: 30,
  },
  instructionsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212c62',
    marginTop: 16,
    marginBottom: 6,
  },
  instructionsText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F4FF',
    borderRadius: 10,
    padding: 12,
    width: '100%',
    marginBottom: 12,
  },
  stepBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#212c62',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepBadgeText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#212c62',
  },
  stepDesc: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  templateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#212c62',
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 24,
    width: '100%',
    marginBottom: 12,
  },
  templateBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  columnBox: {
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    padding: 10,
    width: '100%',
    marginBottom: 20,
  },
  columnBoxTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#212c62',
    marginBottom: 4,
  },
  columnBoxText: {
    fontSize: 11,
    color: '#555',
    lineHeight: 18,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#DDD',
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 12,
    fontWeight: '700',
    color: '#999',
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
    alignItems: 'center',
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
  refreshButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFE5E5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F44336',
  },
  refreshButtonText: {
    fontSize: 11,
    color: '#F44336',
    fontWeight: '600',
    marginTop: 2,
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
