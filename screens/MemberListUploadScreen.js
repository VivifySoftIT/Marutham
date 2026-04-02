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

const MemberListUploadScreen = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  
  const [loading, setLoading] = useState(false);
  const [uploadedMembers, setUploadedMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [showMemberDetail, setShowMemberDetail] = useState(false);
  const [showStats, setShowStats] = useState(false);

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

      // Process the data - handle various column name variations
      const processedMembers = jsonData.map((row, index) => ({
        id: index + 1,
        name: row['Name'] || row['name'] || row['Member Name'] || row['MEMBER NAME'] || 'Unknown',
        memberId: row['Member ID'] || row['memberId'] || row['ID'] || row['id'] || row['MEMBER ID'] || '',
        email: row['Email'] || row['email'] || row['EMAIL'] || '',
        phone: row['Phone'] || row['phone'] || row['Mobile'] || row['mobile'] || row['PHONE'] || row['MOBILE'] || '',
        address: row['Address'] || row['address'] || row['ADDRESS'] || '',
        designation: row['Designation'] || row['designation'] || row['DESIGNATION'] || '',
        business: row['Business'] || row['business'] || row['BUSINESS'] || '',
        batch: row['Batch'] || row['batch'] || row['BATCH'] || '',
        status: row['Status'] || row['status'] || row['STATUS'] || 'Active',
        joinDate: row['Join Date'] || row['joinDate'] || row['JOIN DATE'] || '',
        gender: row['Gender'] || row['gender'] || row['GENDER'] || '',
      }));

      setUploadedMembers(processedMembers);
      setFilteredMembers(processedMembers);
      
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

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredMembers(uploadedMembers);
    } else {
      const filtered = uploadedMembers.filter(member =>
        member.name.toLowerCase().includes(query.toLowerCase()) ||
        member.memberId.toLowerCase().includes(query.toLowerCase()) ||
        member.email.toLowerCase().includes(query.toLowerCase()) ||
        member.phone.includes(query)
      );
      setFilteredMembers(filtered);
    }
  };

  const handleExportToBackend = async () => {
    if (uploadedMembers.length === 0) {
      Alert.alert(t('error'), 'No members to export');
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('jwt_token');

      const payload = {
        members: uploadedMembers.map(member => ({
          name: member.name,
          memberId: member.memberId,
          email: member.email,
          phone: member.phone,
          address: member.address,
          designation: member.designation,
          business: member.business,
          batch: member.batch,
          status: member.status,
          joinDate: member.joinDate,
          gender: member.gender,
        })),
      };

      console.log('Exporting members:', payload);

      const response = await fetch(`${API_BASE_URL}/api/Members/BulkImport`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to export members');
      }

      const result = await response.json();
      console.log('Export result:', result);

      Alert.alert(t('success'), `${uploadedMembers.length} members exported successfully`);
      setUploadedMembers([]);
      setFilteredMembers([]);
      setSearchQuery('');
    } catch (error) {
      console.error('Error exporting members:', error);
      Alert.alert(t('error'), 'Failed to export members. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const MemberCard = ({ member }) => (
    <TouchableOpacity
      style={styles.memberCard}
      onPress={() => {
        setSelectedMember(member);
        setShowMemberDetail(true);
      }}
    >
      <View style={styles.memberCardHeader}>
        <View style={styles.memberAvatar}>
          <Text style={styles.avatarText}>
            {member.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.memberCardInfo}>
          <Text style={styles.memberName}>{member.name}</Text>
          <Text style={styles.memberId}>{member.memberId}</Text>
        </View>
        <Icon name="chevron-right" size={20} color="#999" />
      </View>
      <View style={styles.memberCardDetails}>
        <View style={styles.detailItem}>
          <Icon name="email" size={14} color="#C9A84C" />
          <Text style={styles.detailText}>{member.email || 'N/A'}</Text>
        </View>
        <View style={styles.detailItem}>
          <Icon name="phone" size={14} color="#C9A84C" />
          <Text style={styles.detailText}>{member.phone || 'N/A'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const StatBox = ({ label, value, icon, color }) => (
    <View style={[styles.statBox, { borderLeftColor: color }]}>
      <Icon name={icon} size={24} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1B5E35" />

      {/* Header */}
      <LinearGradient colors={['#1B5E35', '#1a1f47']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Member List Upload</Text>
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
        </View>

        {/* Members List */}
        {uploadedMembers.length > 0 && (
          <>
            {/* Stats */}
            <View style={styles.section}>
              <View style={styles.statsHeader}>
                <Text style={styles.sectionTitle}>Statistics</Text>
                <TouchableOpacity
                  style={styles.statsToggle}
                  onPress={() => setShowStats(!showStats)}
                >
                  <Icon name={showStats ? 'chevron-up' : 'chevron-down'} size={20} color="#C9A84C" />
                </TouchableOpacity>
              </View>
              {showStats && (
                <View style={styles.statsGrid}>
                  <StatBox
                    label="Total Members"
                    value={uploadedMembers.length}
                    icon="account-group"
                    color="#C9A84C"
                  />
                  <StatBox
                    label="With Email"
                    value={uploadedMembers.filter(m => m.email).length}
                    icon="email"
                    color="#27AE60"
                  />
                  <StatBox
                    label="With Phone"
                    value={uploadedMembers.filter(m => m.phone).length}
                    icon="phone"
                    color="#F39C12"
                  />
                  <StatBox
                    label="Active"
                    value={uploadedMembers.filter(m => m.status === 'Active').length}
                    icon="check-circle"
                    color="#E74C3C"
                  />
                </View>
              )}
            </View>

            {/* Search */}
            <View style={styles.section}>
              <View style={styles.searchContainer}>
                <Icon name="magnify" size={20} color="#999" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by name, ID, email, or phone"
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

            {/* Members List */}
            <View style={styles.section}>
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
                style={styles.exportButton}
                onPress={handleExportToBackend}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Icon name="cloud-upload" size={20} color="#FFF" />
                    <Text style={styles.exportButtonText}>Export to Database</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => {
                  setUploadedMembers([]);
                  setFilteredMembers([]);
                  setSearchQuery('');
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
              Upload an Excel file to get started
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Member Detail Modal */}
      <Modal
        visible={showMemberDetail}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMemberDetail(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Member Details</Text>
              <TouchableOpacity onPress={() => setShowMemberDetail(false)}>
                <Icon name="close" size={24} color="#1B5E35" />
              </TouchableOpacity>
            </View>

            {selectedMember && (
              <ScrollView style={styles.modalBody}>
                {/* Avatar */}
                <View style={styles.detailAvatar}>
                  <Text style={styles.detailAvatarText}>
                    {selectedMember.name.charAt(0).toUpperCase()}
                  </Text>
                </View>

                {/* Name */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Name</Text>
                  <Text style={styles.detailValue}>{selectedMember.name}</Text>
                </View>

                {/* Member ID */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Member ID</Text>
                  <Text style={styles.detailValue}>{selectedMember.memberId || 'N/A'}</Text>
                </View>

                {/* Email */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Email</Text>
                  <Text style={styles.detailValue}>{selectedMember.email || 'N/A'}</Text>
                </View>

                {/* Phone */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Phone</Text>
                  <Text style={styles.detailValue}>{selectedMember.phone || 'N/A'}</Text>
                </View>

                {/* Address */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Address</Text>
                  <Text style={styles.detailValue}>{selectedMember.address || 'N/A'}</Text>
                </View>

                {/* Designation */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Designation</Text>
                  <Text style={styles.detailValue}>{selectedMember.designation || 'N/A'}</Text>
                </View>

                {/* Business */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Business</Text>
                  <Text style={styles.detailValue}>{selectedMember.business || 'N/A'}</Text>
                </View>

                {/* Batch */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Batch</Text>
                  <Text style={styles.detailValue}>{selectedMember.batch || 'N/A'}</Text>
                </View>

                {/* Status */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <View style={[styles.statusBadge, { backgroundColor: selectedMember.status === 'Active' ? '#27AE60' : '#E74C3C' }]}>
                    <Text style={styles.statusBadgeText}>{selectedMember.status}</Text>
                  </View>
                </View>

                {/* Join Date */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Join Date</Text>
                  <Text style={styles.detailValue}>{selectedMember.joinDate || 'N/A'}</Text>
                </View>

                {/* Gender */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Gender</Text>
                  <Text style={styles.detailValue}>{selectedMember.gender || 'N/A'}</Text>
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
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsToggle: {
    padding: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statBox: {
    width: '48%',
    backgroundColor: 'white',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1B5E35',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
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
  memberCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  memberCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#C9A84C',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  memberCardInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1B5E35',
    marginBottom: 2,
  },
  memberId: {
    fontSize: 12,
    color: '#999',
  },
  memberCardDetails: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 10,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#666',
  },
  exportButton: {
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
  exportButtonText: {
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
  detailAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#C9A84C',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  detailAvatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: 'white',
  },
  detailSection: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 14,
    color: '#1B5E35',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default MemberListUploadScreen;

