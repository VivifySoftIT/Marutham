import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  StatusBar, 
  FlatList, 
  TextInput, 
  ActivityIndicator, 
  RefreshControl, 
  Alert
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';

// Your API URL
const API_URL = 'https://www.vivifysoft.in/AlaigalBE';

const MembersDirectory = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [members, setMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);

  // Load members from API
  const loadMembers = async () => {
    try {
      setLoading(true);
      
      console.log('Calling API:', `${API_URL}/api/Members`);
      
      const response = await fetch(`${API_URL}/api/Members`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Members data sample (first 2):', data.slice(0, 2));
        console.log('Full keys of first member:', data[0] ? Object.keys(data[0]) : 'No data');
        
        // Check if data is array
        if (Array.isArray(data)) {
          setMembers(data);
          setFilteredMembers(data);
        } else {
          console.log('Response is not an array:', data);
          setMembers([]);
          setFilteredMembers([]);
        }
      } else {
        console.error('API Error:', response.status);
        Alert.alert('Error', `Server returned error: ${response.status}`);
        setMembers([]);
        setFilteredMembers([]);
      }
    } catch (error) {
      console.error('Network error:', error.message);
      Alert.alert('Connection Error', 'Cannot connect to server. Please check your internet.');
      setMembers([]);
      setFilteredMembers([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter members based on search text - including business name
  useEffect(() => {
    if (searchText.trim() === '') {
      setFilteredMembers(members);
    } else {
      const searchLower = searchText.toLowerCase();
      const filtered = members.filter(m => {
        // Check all possible fields
        return (
          (m.name && m.name.toLowerCase().includes(searchLower)) || 
          (m.business && m.business.toLowerCase().includes(searchLower)) ||
          (m.businessName && m.businessName.toLowerCase().includes(searchLower)) ||
          (m.company && m.company.toLowerCase().includes(searchLower)) ||
          (m.phone && m.phone.includes(searchText)) ||
          (m.mobile && m.mobile.includes(searchText)) ||
          (m.telephone && m.telephone.includes(searchText)) ||
          (m.email && m.email.toLowerCase().includes(searchLower)) ||
          (m.memberId && m.memberId.toString().toLowerCase().includes(searchLower)) ||
          (m.id && m.id.toString().toLowerCase().includes(searchLower))
        );
      });
      setFilteredMembers(filtered);
    }
  }, [searchText, members]);

  useFocusEffect(
    useCallback(() => {
      console.log('Screen focused, loading members...');
      loadMembers();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMembers();
    setRefreshing(false);
  };

  // Handle member press - Navigate to MemberDetails screen
  const handleMemberPress = (member) => {
    console.log('Navigating to MemberDetails with member:', {
      id: member.id,
      name: member.name,
      business: member.business || member.businessName || member.company
    });
    navigation.navigate('MemberDetails', { 
      memberData: member,
      memberId: member.id 
    });
  };

  // If you want to give referral (optional button)
  const handleGiveReferral = (member, e) => {
    e?.stopPropagation(); // Prevent navigating to details
    console.log('Give referral to:', member.name);
    Alert.alert('Give Referral', `Would give referral to ${member.name}`);
  };

  // Format phone number for display
  const formatPhone = (phone) => {
    if (!phone) return 'No Phone';
    return phone;
  };

  // Get business name from member
  const getBusinessName = (member) => {
    return member.business || member.businessName || member.company || 'No Business';
  };

  // Get member ID for display
  const getMemberId = (member) => {
    return member.memberId || member.id || 'N/A';
  };

  // Get status text and color
  const getStatusInfo = (member) => {
    const status = member.status || member.memberStatus;
    if (!status) return { text: 'Unknown', color: '#666', bg: '#F5F5F5' };
    
    switch(status.toString().toLowerCase()) {
      case 'active':
      case '1':
        return { text: 'Active', color: '#2E7D32', bg: '#E8F5E9' };
      case 'inactive':
      case '0':
        return { text: 'Inactive', color: '#D32F2F', bg: '#FFEBEE' };
      case 'pending':
        return { text: 'Pending', color: '#FF9800', bg: '#FFF3E0' };
      default:
        return { text: status, color: '#666', bg: '#F5F5F5' };
    }
  };

  const renderMemberItem = ({ item }) => {
    const businessName = getBusinessName(item);
    const memberId = getMemberId(item);
    const statusInfo = getStatusInfo(item);
    
    return (
      <TouchableOpacity 
        style={styles.memberCard} 
        onPress={() => handleMemberPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.memberHeader}>
          <View style={styles.memberAvatar}>
            <Text style={styles.avatarText}>
              {item.name ? item.name.charAt(0).toUpperCase() : '?'}
            </Text>
          </View>
          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>{item.name || 'No Name'}</Text>
            <Text style={styles.memberBusiness}>{businessName}</Text>
            <Text style={styles.memberId}>Member ID: {memberId}</Text>
            <Text style={styles.memberPhone}>📞 {formatPhone(item.phone || item.mobile || item.telephone)}</Text>
            <Text style={styles.memberEmail}>✉️ {item.email || 'No Email'}</Text>
          </View>
          <View style={styles.rightSection}>
            <TouchableOpacity 
              style={styles.referralButton}
              onPress={(e) => handleGiveReferral(item, e)}
            >
              <Icon name="account-arrow-right" size={18} color="#4A90E2" />
            </TouchableOpacity>
            <Icon name="chevron-right" size={24} color="#999" />
          </View>
        </View>
      
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="account-group" size={80} color="#4A90E2" />
      <Text style={styles.emptyStateTitle}>No Members Found</Text>
      <Text style={styles.emptyStateText}>
        {loading ? 'Loading from server...' : 'Could not load members.'}
      </Text>
      <TouchableOpacity 
        style={styles.retryButton}
        onPress={loadMembers}
      >
        <Icon name="refresh" size={16} color="#FFF" />
        <Text style={styles.retryButtonText}> Retry</Text>
      </TouchableOpacity>
    </View>
  );

  // Debug button to see API response structure
  const debugAPIResponse = () => {
    if (members.length > 0) {
      console.log('First member structure:', Object.keys(members[0]));
      Alert.alert(
        'Debug Info',
        `Total members: ${members.length}\nFirst member fields:\n${Object.keys(members[0]).join(', ')}`
      );
    } else {
      Alert.alert('Debug Info', 'No members loaded yet');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#4A90E2" barStyle="light-content" />
      <LinearGradient colors={['#4A90E2', '#87CEEB']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Members Directory</Text>
        <View style={styles.headerButtons}>
          {/* Debug button - only for development */}
          {__DEV__ && (
            <TouchableOpacity onPress={debugAPIResponse} style={styles.debugButton}>
              <Icon name="bug" size={18} color="#FFF" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={loadMembers}>
            <Icon name="refresh" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
      
      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, business, phone, email..."
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor="#999"
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Icon name="close-circle" size={18} color="#999" />
          </TouchableOpacity>
        )}
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Loading members...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredMembers}
          renderItem={renderMemberItem}
          keyExtractor={item => item.id ? item.id.toString() : Math.random().toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={['#4A90E2']}
            />
          }
          ListEmptyComponent={renderEmptyState}
          ListHeaderComponent={
            members.length > 0 && (
              <View style={styles.listHeader}>
                <Text style={styles.listHeaderText}>
                  Total Members: {members.length}
                  {searchText ? ` (Filtered: ${filteredMembers.length})` : ''}
                </Text>
                <Text style={styles.searchHint}>
                  Search by: Name, Business, Phone, Email, or Member ID
                </Text>
              </View>
            )
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F9FC' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 15, 
    paddingVertical: 15,
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#FFF',
    textAlign: 'center',
    flex: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  debugButton: {
    marginRight: 15,
    padding: 4,
  },
  searchContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFF', 
    marginHorizontal: 15, 
    marginVertical: 10, 
    borderRadius: 10, 
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1, 
    borderColor: '#E0E0E0',
  },
  searchIcon: { marginRight: 8 },
  searchInput: { 
    flex: 1, 
    fontSize: 14, 
    color: '#333', 
    paddingVertical: 4,
    paddingRight: 10,
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#F5F9FC',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  listContent: { 
    padding: 15,
    flexGrow: 1,
  },
  listHeader: {
    paddingBottom: 10,
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  listHeaderText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 2,
  },
  searchHint: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  memberCard: { 
    backgroundColor: '#FFF', 
    borderRadius: 10, 
    padding: 15, 
    marginBottom: 10,
    elevation: 2,
  },
  memberHeader: { 
    flexDirection: 'row', 
    alignItems: 'center',
  },
  memberAvatar: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    backgroundColor: '#4A90E2', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  memberInfo: { flex: 1 },
  memberName: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#333',
  },
  memberBusiness: { 
    fontSize: 14, 
    color: '#666',
    marginTop: 2,
  },
  memberId: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '500',
    marginTop: 2,
  },
  memberPhone: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  memberEmail: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  referralButton: {
    padding: 6,
    marginRight: 8,
    borderRadius: 4,
    backgroundColor: '#F0F7FF',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  statItem: {
    alignItems: 'center',
    minWidth: 60,
  },
  statText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 2,
  },
  statLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  memberStatus: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 15,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4A90E2',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});

export default MembersDirectory;