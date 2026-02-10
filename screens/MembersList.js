import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import ApiService from '../service/api';
import { useLanguage } from '../service/LanguageContext';
import SpeechToTextInput from '../components/SpeechToTextInput';

const MemberList = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0, unpaid: 0 });
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState([]);

  // Load members from API
  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    setLoading(true);
    try {
      // Call the GetMembersWithPayment endpoint
      const response = await fetch('https://www.vivifysoft.in/AlaigalBE/api/Inventory/members-with-payment');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      console.log('MembersList - API Response:', data);
      
      // Map the API response to match the component's expected format
      // Handle both uppercase and lowercase keys from API
      const membersArray = data.Members || data.members || [];
      const mappedMembers = membersArray.map(member => ({
        id: member.Id || member.id,
        name: member.Name || member.name,
        memberId: (member.Id || member.id).toString(),
        phone: member.Phone || member.phone,
        email: member.Email || member.email,
        joinDate: member.Joined || member.joined,
        status: (member.IsActive || member.isActive) ? t('active') : t('inactive'),
        feesStatus: member.FeesStatus || member.feesStatus,
        amount: member.Amount || member.amount,
        batch: 'N/A',
        address: 'N/A',
      }));
      
      console.log('MembersList - Mapped Members:', mappedMembers);
      
      setMembers(mappedMembers);
      setFilteredMembers(mappedMembers);
      
      // Update stats from API response (handle both cases)
      setStats({
        total: data.TotalMembers || data.totalMembers,
        active: data.ActiveMembers || data.activeMembers,
        pending: data.PendingPayments || data.pendingPayments,
        unpaid: data.UnpaidPayments || data.unpaidPayments,
      });
      
      console.log('MembersList - Stats Updated:', {
        total: data.TotalMembers || data.totalMembers,
        active: data.ActiveMembers || data.activeMembers,
        pending: data.PendingPayments || data.pendingPayments,
        unpaid: data.UnpaidPayments || data.unpaidPayments,
      });
    } catch (error) {
      console.error('MembersList - Error loading members:', error);
      Alert.alert(t('error'), t('failedToLoadMembers') + ': ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle search with voice support and dropdown
  const handleSearch = async (query = searchQuery) => {
    if (!query.trim()) {
      setFilteredMembers(members);
      return;
    }

    setLoading(true);
    try {
      const results = await ApiService.searchMembers(query);
      setFilteredMembers(results);
      
      if (results.length === 0) {
        Alert.alert(
          t('noResults'),
          t('noMembersFoundMessage'),
          [{ text: t('ok'), onPress: () => setSearchQuery('') }]
        );
      }
    } catch (error) {
      Alert.alert(t('error'), t('searchFailed') + ': ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle search input change with dropdown
  const handleSearchInputChange = (text) => {
    setSearchQuery(text);
    
    if (text.trim() === '') {
      // Show all members when search is empty
      setSearchSuggestions(members);
    } else {
      // Filter members based on search query
      const filtered = members.filter(member =>
        member.name.toLowerCase().includes(text.toLowerCase()) ||
        member.memberId?.toLowerCase().includes(text.toLowerCase()) ||
        member.phone?.includes(text) ||
        member.email?.toLowerCase().includes(text.toLowerCase())
      );
      setSearchSuggestions(filtered);
    }
  };

  // Handle search focus - show all members
  const handleSearchFocus = () => {
    setSearchSuggestions(members);
    setShowSearchDropdown(true);
  };

  // Handle selecting a member from dropdown
  const handleSelectMember = (member) => {
    setSearchQuery(member.name);
    setShowSearchDropdown(false);
    setFilteredMembers([member]);
  };

  // Handle voice search results
  const handleVoiceSearch = (spokenText) => {
    setSearchQuery(spokenText);
    handleSearchInputChange(spokenText);
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery('');
    setFilteredMembers(members);
    setShowSearchDropdown(false);
    setSearchSuggestions([]);
  };


  // Render member card
  const renderMemberCard = ({ item }) => (
    <View style={styles.memberCard}>
      {/* Member Header with Avatar */}
      <View style={styles.memberHeader}>
        <LinearGradient 
          colors={['#4A90E2', '#357ABD']} 
          style={styles.memberAvatar}
        >
          <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
        </LinearGradient>
        
        <View style={styles.memberBasicInfo}>
          <Text style={styles.memberName}>{item.name}</Text>
          <Text style={styles.memberId}>ID: {item.memberId || 'N/A'}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, { 
              backgroundColor: item.status === t('active') ? '#E8F5E9' : '#FFEBEE' 
            }]}>
              <Icon 
                name={item.status === t('active') ? 'check-circle' : 'alert-circle'} 
                size={12} 
                color={item.status === t('active') ? '#4CAF50' : '#F44336'} 
              />
              <Text style={[styles.statusText, { 
                color: item.status === t('active') ? '#4CAF50' : '#F44336' 
              }]}>
                {item.status}
              </Text>
            </View>
            <View style={[styles.feesStatusBadge, { 
              backgroundColor: item.feesStatus === 'Paid' ? '#E8F5E9' : '#FFF3E0' 
            }]}>
              <Icon 
                name={item.feesStatus === 'Paid' ? 'check' : 'clock'} 
                size={12} 
                color={item.feesStatus === 'Paid' ? '#4CAF50' : '#FF9800'} 
              />
              <Text style={[styles.feesStatusText, { 
                color: item.feesStatus === 'Paid' ? '#4CAF50' : '#FF9800' 
              }]}>
                {item.feesStatus === 'Paid' ? t('paid') : item.feesStatus}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Contact Info */}
      <View style={styles.contactSection}>
        <View style={styles.contactItem}>
          <Icon name="phone" size={14} color="#4A90E2" />
          <Text style={styles.contactText}>{item.phone}</Text>
        </View>
        {item.email && (
          <View style={styles.contactItem}>
            <Icon name="email" size={14} color="#4A90E2" />
            <Text style={styles.contactText} numberOfLines={1}>{item.email}</Text>
          </View>
        )}
      </View>

      {/* Details Grid */}
      <View style={styles.detailsGrid}>
        <View style={styles.detailBox}>
          <Icon name="calendar" size={16} color="#4A90E2" />
          <Text style={styles.detailLabel}>{t('joinDate')}</Text>
          <Text style={styles.detailValue}>{item.joinDate || t('notAvailable')}</Text>
        </View>
        
        <View style={styles.detailBox}>
          <Icon name="cash" size={16} color="#4A90E2" />
          <Text style={styles.detailLabel}>{t('amount')}</Text>
          <Text style={styles.detailValue}>₹{item.amount || '0'}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.viewButton]}
          onPress={() => navigation.navigate('MemberDetails', { memberId: item.id })}
        >
          <Icon name="eye" size={16} color="#2196F3" />
          <Text style={[styles.actionButtonText, { color: '#2196F3' }]}>{t('view')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton]}
          onPress={() => navigation.navigate('NewMember', { member: item, isEditing: true })}
        >
          <Icon name="pencil" size={16} color="#FF9800" />
          <Text style={[styles.actionButtonText, { color: '#FF9800' }]}>{t('edit')}</Text>
        </TouchableOpacity>
        
        {/* <TouchableOpacity 
          style={[styles.actionButton, styles.paymentButton]}
          onPress={() => navigation.navigate('PaymentDetails', { memberId: item.id })}
        >
          <Icon name="cash-plus" size={16} color="#4CAF50" />
          <Text style={[styles.actionButtonText, { color: '#4CAF50' }]}>{t('payment')}</Text>
        </TouchableOpacity> */}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#4A90E2" barStyle="light-content" />
      
      {/* Header - MembersDirectory Style */}
      <LinearGradient colors={['#4A90E2', '#87CEEB']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('membersList')}</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            onPress={() => navigation.navigate('NewMember')}
          >
            <Icon name="plus" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Search Section with Voice and Dropdown */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <View style={styles.searchInputContainer}>
            <Icon name="magnify" size={20} color="#999" style={styles.searchIcon} />
            <SpeechToTextInput
              style={styles.voiceSearchWrapper}
              inputStyle={styles.searchInput}
              placeholder={t('searchByNameIdPhoneEmail')}
              value={searchQuery}
              onChangeText={handleSearchInputChange}
              onFocus={handleSearchFocus}
              onSubmitEditing={() => handleSearch()}
              onVoiceResults={handleVoiceSearch}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={handleClearSearch} style={styles.clearSearchButton}>
                <Icon name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>
          
          {/* Search Dropdown */}
          {showSearchDropdown && searchSuggestions.length > 0 && (
            <View style={styles.searchDropdown}>
              <ScrollView 
                style={styles.searchDropdownList}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled={true}
              >
                {searchSuggestions.slice(0, 10).map((member) => (
                  <TouchableOpacity
                    key={member.id}
                    style={styles.searchDropdownItem}
                    onPress={() => handleSelectMember(member)}
                  >
                    <View style={styles.searchDropdownItemContent}>
                      <LinearGradient 
                        colors={['#4A90E2', '#357ABD']} 
                        style={styles.searchDropdownAvatar}
                      >
                        <Text style={styles.searchDropdownAvatarText}>
                          {member.name.charAt(0).toUpperCase()}
                        </Text>
                      </LinearGradient>
                      <View style={styles.searchDropdownInfo}>
                        <Text style={styles.searchDropdownName}>{member.name}</Text>
                        <Text style={styles.searchDropdownDetails}>
                          {member.phone} • ID: {member.memberId}
                        </Text>
                      </View>
                    </View>
                    <Icon name="chevron-right" size={16} color="#4A90E2" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity 
                style={styles.closeDropdownButton}
                onPress={() => setShowSearchDropdown(false)}
              >
                <Text style={styles.closeDropdownText}>{t('close')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        <TouchableOpacity style={styles.searchButton} onPress={() => handleSearch()}>
          <Icon name="magnify" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Stats Cards - Height reduced */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.statsContainer}
        contentContainerStyle={styles.statsContent}
      >
        <View style={[styles.statCard, styles.totalCard]}>
          <Icon name="account-group" size={22} color="#2196F3" />
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>{t('totalMembers')}</Text>
        </View>
        
        <View style={[styles.statCard, styles.activeCard]}>
          <Icon name="account-check" size={22} color="#4CAF50" />
          <Text style={styles.statNumber}>{stats.active}</Text>
          <Text style={styles.statLabel}>{t('active')}</Text>
        </View>
        
        <View style={[styles.statCard, styles.pendingCard]}>
          <Icon name="clock-alert" size={22} color="#FF9800" />
          <Text style={styles.statNumber}>{stats.pending}</Text>
          <Text style={styles.statLabel}>{t('pending')}</Text>
        </View>
        
        <View style={[styles.statCard, styles.unpaidCard]}>
          <Icon name="alert-circle" size={22} color="#F44336" />
          <Text style={styles.statNumber}>{stats.unpaid}</Text>
          <Text style={styles.statLabel}>{t('unpaid')}</Text>
        </View>
      </ScrollView>

      {/* Members List */}
      <View style={styles.membersListContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#212c62" />
            <Text style={styles.loadingText}>{t('loadingMembers')}</Text>
          </View>
        ) : (
          <>
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>
                {filteredMembers.length} {t('membersFound')}
              </Text>
              <TouchableOpacity 
                style={styles.filterButton}
                onPress={() => Alert.alert(t('filter'), t('filterComingSoon'))}
              >
                <Icon name="filter-variant" size={20} color="#212c62" />
                <Text style={styles.filterButtonText}>{t('filter')}</Text>
              </TouchableOpacity>
            </View>

            {filteredMembers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Icon name="account-off" size={60} color="#CCC" />
                <Text style={styles.emptyText}>{t('noMembersFound')}</Text>
                <Text style={styles.emptySubtext}>
                  {searchQuery ? t('tryDifferentSearchTerm') : t('addNewMembersToStart')}
                </Text>
                <TouchableOpacity 
                  style={styles.addMemberButton}
                  onPress={() => navigation.navigate('NewMember')}
                >
                  <Icon name="account-plus" size={20} color="#FFF" />
                  <Text style={styles.addMemberButtonText}>{t('addNewMember')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={filteredMembers}
                renderItem={renderMemberCard}
                keyExtractor={(item) => item.id.toString()}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
              />
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  // Header - MembersDirectory Style
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
  // Search
  searchContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#FFF',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    position: 'relative',
  },
  searchIcon: {
    marginRight: 8,
    
  },
  voiceSearchWrapper: {
    flex: 1,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingRight: 45,
    fontSize: 15,
    color: '#333',
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  clearSearchButton: {
    position: 'absolute',
    right: 45,
    padding: 4,
  },
  searchButton: {
    backgroundColor: '#212c62',
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Search Dropdown
  searchInputWrapper: {
    flex: 1,
    position: 'relative',
    zIndex: 1000,
  },
  searchDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 10,
    backgroundColor: '#FFF',
    borderRadius: 8,
    marginTop: 4,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    maxHeight: 350,
    zIndex: 1001,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  searchDropdownList: {
    maxHeight: 300,
  },
  searchDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  searchDropdownItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  searchDropdownAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  searchDropdownAvatarText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  searchDropdownInfo: {
    flex: 1,
  },
  searchDropdownName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212c62',
    marginBottom: 2,
  },
  searchDropdownDetails: {
    fontSize: 11,
    color: '#666',
  },
  closeDropdownButton: {
    paddingVertical: 10,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
    backgroundColor: '#F8F9FA',
  },
  closeDropdownText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A90E2',
  },
  // Stats - Height reduced
  statsContainer: {
    paddingHorizontal: 12,
    marginTop: 8,
    marginBottom: 4,
    maxHeight: 90,
  },
  statsContent: {
    paddingRight: 8,
  },
  statCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 10,
    marginRight: 8,
    width: 125,
    height: 75,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 1.5,
  },
  totalCard: {
    borderTopWidth: 2,
    borderTopColor: '#2196F3',
  },
  activeCard: {
    borderTopWidth: 2,
    borderTopColor: '#4CAF50',
  },
  pendingCard: {
    borderTopWidth: 2,
    borderTopColor: '#FF9800',
  },
  unpaidCard: {
    borderTopWidth: 2,
    borderTopColor: '#F44336',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212c62',
    marginVertical: 2,
  },
  statLabel: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    marginTop: 1,
  },
  // Members List
  membersListContainer: {
    flex: 1,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 10,
    marginTop: 10,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 15,
    color: '#666',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    marginTop: 0,
    paddingVertical: 4,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212c62',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F4FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterButtonText: {
    fontSize: 13,
    color: '#212c62',
    fontWeight: '500',
    marginLeft: 5,
  },
  listContent: {
    paddingBottom: 10,
  },
  // Member Card - Improved styling
  memberCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  memberAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    elevation: 2,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  memberBasicInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212c62',
    marginBottom: 2,
  },
  memberId: {
    fontSize: 12,
    color: '#999',
    marginBottom: 6,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  feesStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  feesStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Contact Section
  contactSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    gap: 6,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactText: {
    fontSize: 13,
    color: '#475569',
    flex: 1,
  },
  // Details Grid
  detailsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  detailBox: {
    flex: 1,
    backgroundColor: '#F0F7FF',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0EEFF',
  },
  detailLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#212c62',
  },
  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  viewButton: {
    backgroundColor: '#E3F2FD',
  },
  editButton: {
    backgroundColor: '#FFF3E0',
  },
  paymentButton: {
    backgroundColor: '#E8F5E9',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#FFF',
    borderRadius: 10,
    marginTop: 10,
    elevation: 1,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 18,
  },
  addMemberButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#212c62',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    marginTop: 15,
  },
  addMemberButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default MemberList;