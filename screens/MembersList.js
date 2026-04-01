import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StatusBar,
  PermissionsAndroid,
  Platform,
  Animated,
  Keyboard,
  Modal,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Voice from '@react-native-voice/voice';
import ApiService from '../service/api';
import { useLanguage } from '../service/LanguageContext';
import API_BASE_URL from '../apiConfig';

const MemberCard = ({ item, navigation, t }) => {
  const [imgError, setImgError] = useState(false);
  return (
    <TouchableOpacity
      style={styles.memberCard}
      onPress={() => navigation.navigate('MemberDetails', { memberId: item.id })}
      activeOpacity={0.85}
    >
      {/* Member Header with Avatar */}
      <View style={styles.memberHeader}>
        <View style={styles.memberAvatarWrapper}>
          {item.photoUrl && !imgError ? (
            <Image
              source={{ uri: item.photoUrl }}
              style={styles.memberAvatarImage}
              resizeMode="cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <LinearGradient
              colors={['#4A90E2', '#357ABD']}
              style={styles.memberAvatar}
            >
              <Text style={styles.avatarText}>{item.name?.charAt(0)?.toUpperCase() || '?'}</Text>
            </LinearGradient>
          )}
        </View>

        <View style={styles.memberBasicInfo}>
          <Text style={styles.memberName}>{item.name}</Text>
          <Text style={styles.memberId}>ID: {item.memberId || 'N/A'}</Text>
          {item.business ? (
            <Text style={styles.businessName} numberOfLines={1}>
              <Icon name="briefcase-outline" size={12} color="#4A90E2" /> {item.business}
            </Text>
          ) : null}
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, {
              backgroundColor: item.isActive ? '#E8F5E9' : '#FFEBEE'
            }]}>
              <Icon
                name={item.isActive ? 'check-circle' : 'alert-circle'}
                size={12}
                color={item.isActive ? '#4CAF50' : '#F44336'}
              />
              <Text style={[styles.statusText, { color: item.isActive ? '#4CAF50' : '#F44336' }]}>
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
                {item.feesStatus === 'Paid' ? t('paid') : (item.feesStatus || 'Unpaid')}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Contact Info */}
      <View style={styles.contactSection}>
        {item.phone ? (
          <View style={styles.contactItem}>
            <Icon name="phone" size={14} color="#4A90E2" />
            <Text style={styles.contactText}>{item.phone}</Text>
          </View>
        ) : null}
        {item.email ? (
          <View style={styles.contactItem}>
            <Icon name="email" size={14} color="#4A90E2" />
            <Text style={styles.contactText} numberOfLines={1}>{item.email}</Text>
          </View>
        ) : null}
        {item.businessCategory ? (
          <View style={styles.contactItem}>
            <Icon name="tag-outline" size={14} color="#4A90E2" />
            <Text style={styles.contactText} numberOfLines={1}>{item.businessCategory}</Text>
          </View>
        ) : null}
      </View>

      {/* Business image preview strip */}
      {item.firstBizImage ? (
        <View style={styles.bizPreviewContainer}>
          <Image source={{ uri: item.firstBizImage }} style={styles.bizPreviewImage} resizeMode="cover" />
          {item.businesses?.length > 1 && (
            <View style={styles.bizMoreBadge}>
              <Text style={styles.bizMoreText}>+{item.businesses.length - 1}</Text>
            </View>
          )}
        </View>
      ) : null}

      {/* Details Grid */}
      <View style={styles.detailsGrid}>
        <View style={styles.detailBox}>
          <Icon name="calendar" size={16} color="#4A90E2" />
          <Text style={styles.detailLabel}>{t('joinDate')}</Text>
          <Text style={styles.detailValue}>
            {item.joinDate ? new Date(item.joinDate).toLocaleDateString() : t('notAvailable')}
          </Text>
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
          <Text style={styles.actionBtnText}>{t('view')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => navigation.navigate('NewMember', { member: item, isEditing: true })}
        >
          <Icon name="pencil" size={16} color="#FF9800" />
          <Text style={[styles.actionBtnText, { color: '#FF9800' }]}>{t('edit')}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const MemberList = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0, unpaid: 0 });
  
  // Voice search states
  const [isListening, setIsListening] = useState(false);
  const [voiceResults, setVoiceResults] = useState([]);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [partialResult, setPartialResult] = useState('');
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Load members from API
  useEffect(() => {
    loadMembers();
    initVoice();
    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const initVoice = async () => {
    Voice.onSpeechStart = () => {
      console.log('Voice: Speech started');
      setIsListening(true);
      startPulseAnimation();
    };
    
    Voice.onSpeechEnd = () => {
      console.log('Voice: Speech ended');
      setIsListening(false);
      stopPulseAnimation();
    };
    
    Voice.onSpeechResults = (event) => {
      console.log('Voice: Results', event.value);
      if (event.value && event.value.length > 0) {
        const result = event.value[0];
        setSearchQuery(result);
        handleVoiceSearch(result);
        setVoiceResults(event.value);
      }
      setShowVoiceModal(false);
    };
    
    Voice.onSpeechPartialResults = (event) => {
      console.log('Voice: Partial', event.value);
      if (event.value && event.value.length > 0) {
        setPartialResult(event.value[0]);
      }
    };
    
    Voice.onSpeechError = (event) => {
      console.log('Voice: Error', event);
      setIsListening(false);
      stopPulseAnimation();
      Alert.alert(t('voiceError'), event.error?.message || t('voiceRecognitionFailed'));
    };
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  };

  const loadMembers = async () => {
    setLoading(true);
    try {
      // Use /api/Members which returns full member data including business details
      const data = await ApiService.getMembersWithDetails();
      const membersArray = Array.isArray(data) ? data : (data.Members || data.members || []);

      const mappedMembers = membersArray.map(member => {
        const id = member.Id || member.id;

        // Parse businesses exactly like Profile.js
        let businesses = [];
        if (member.businesses && Array.isArray(member.businesses)) {
          businesses = member.businesses.map(b => ({
            id: b.id,
            name: b.businessName,
            description: b.businessDescription || '',
            images: (b.imagePaths || []).map(img =>
              img.startsWith('http') ? img : `${API_BASE_URL}${img}`
            ),
          }));
        } else if (member.business || member.Business) {
          const bizName = member.business || member.Business;
          const imgs = (member.businessImages || member.BusinessImages || '')
            .split(',').map(i => i.trim()).filter(Boolean)
            .map(i => i.startsWith('http') ? i : `${API_BASE_URL}${i}`);
          businesses = [{ name: bizName, description: '', images: imgs }];
        }

        // First business image for card preview
        const firstBizImage = businesses.find(b => b.images?.length > 0)?.images[0] || null;

        // Profile image
        let photoUrl = null;
        if (member.profileImage) {
          photoUrl = member.profileImage.startsWith('http')
            ? member.profileImage
            : `${API_BASE_URL}${member.profileImage}`;
        } else {
          photoUrl = ApiService.getMemberPhotoUrl(id);
        }

        return {
          id,
          name: member.Name || member.name || '',
          memberId: id?.toString(),
          phone: member.Phone || member.phone || member.Mobile || member.mobile,
          email: member.Email || member.email,
          joinDate: member.JoinDate || member.joinDate || member.Joined || member.joined,
          isActive: member.IsActive ?? member.isActive ?? true,
          status: (member.IsActive ?? member.isActive ?? true) ? t('active') : t('inactive'),
          feesStatus: member.FeesStatus || member.feesStatus,
          amount: member.Amount || member.amount || 0,
          address: member.Address || member.address,
          business: businesses[0]?.name || member.Business || member.business || member.BusinessName || member.businessName,
          businessCategory: member.BusinessCategory || member.businessCategory,
          businesses,
          firstBizImage,
          photoUrl,
        };
      });

      setMembers(mappedMembers);
      setFilteredMembers(mappedMembers);

      // Compute stats from the array
      const active = mappedMembers.filter(m => m.isActive).length;
      const unpaid = mappedMembers.filter(m => m.feesStatus && m.feesStatus !== 'Paid').length;
      setStats({
        total: mappedMembers.length,
        active,
        pending: 0,
        unpaid,
      });
    } catch (error) {
      console.error('MembersList - Error loading members:', error);
      Alert.alert(t('error'), t('failedToLoadMembers') + ': ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle search as user types (real-time filtering)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredMembers(members);
      return;
    }

    const timer = setTimeout(() => {
      performLocalSearch();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, members]);

  // Local search function
  const performLocalSearch = () => {
    const query = searchQuery.toLowerCase().trim();
    
    if (!query) {
      setFilteredMembers(members);
      return;
    }

    const filtered = members.filter(member => {
      return (
        member.name?.toLowerCase().includes(query) ||
        member.memberId?.toLowerCase().includes(query) ||
        member.phone?.includes(query) ||
        member.email?.toLowerCase().includes(query) ||
        member.feesStatus?.toLowerCase().includes(query) ||
        member.status?.toLowerCase().includes(query)
      );
    });

    setFilteredMembers(filtered);
  };

  // Handle search button press (for API search if needed)
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setFilteredMembers(members);
      return;
    }

    // First try local search
    performLocalSearch();
    
    // If no results locally, try API search (optional)
    if (filteredMembers.length === 0) {
      try {
        setLoading(true);
        // Call your API search endpoint if available
        const results = await ApiService.searchMembers(searchQuery);
        if (results && results.length > 0) {
          setFilteredMembers(results);
        } else {
          Alert.alert(
            t('noResults'),
            t('noMembersFoundMessage'),
            [{ text: t('ok'), onPress: () => setSearchQuery('') }]
          );
        }
      } catch (error) {
        console.error('API search failed:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle voice search
  const handleVoiceSearch = (voiceText) => {
    setSearchQuery(voiceText);
    // Auto-search after voice input
    setTimeout(() => {
      performLocalSearch();
    }, 500);
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery('');
    setFilteredMembers(members);
    Keyboard.dismiss();
  };

  // Start voice recognition
  const startVoiceRecognition = async () => {
    try {
      // Request microphone permission on Android
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: t('microphonePermissionTitle'),
            message: t('microphonePermissionMessage'),
            buttonNeutral: t('askMeLater'),
            buttonNegative: t('cancel'),
            buttonPositive: t('ok'),
          }
        );
        
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert(t('permissionDenied'), t('microphonePermissionDenied'));
          return;
        }
      }

      setVoiceResults([]);
      setPartialResult('');
      setShowVoiceModal(true);
      
      const result = await Voice.start('en-US');
      console.log('Voice started:', result);
    } catch (error) {
      console.error('Voice start error:', error);
      Alert.alert(t('error'), t('voiceStartFailed'));
    }
  };

  // Stop voice recognition
  const stopVoiceRecognition = async () => {
    try {
      await Voice.stop();
      setIsListening(false);
      stopPulseAnimation();
      setShowVoiceModal(false);
    } catch (error) {
      console.error('Voice stop error:', error);
    }
  };

  // Render member card
  const renderMemberCard = ({ item }) => (
    <MemberCard item={item} navigation={navigation} t={t} />
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

      {/* Search Section with Voice */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Icon name="magnify" size={20} color="#4A90E2" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('searchByNameIdPhoneEmail')}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={handleClearSearch}>
              <Icon name="close-circle" size={20} color="#4A90E2" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={startVoiceRecognition}>
              <Icon name="microphone" size={20} color="#212c62" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Icon name="magnify" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
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

      {/* Voice Recognition Modal */}
      <Modal
        visible={showVoiceModal}
        transparent={true}
        animationType="fade"
        onRequestClose={stopVoiceRecognition}
      >
        <View style={styles.voiceModalOverlay}>
          <View style={styles.voiceModalContent}>
            <Animated.View style={[
              styles.voiceCircle,
              { transform: [{ scale: pulseAnim }] }
            ]}>
              <Icon 
                name={isListening ? "microphone" : "microphone-off"} 
                size={60} 
                color="#FFF" 
              />
            </Animated.View>
            
            <Text style={styles.voiceModalTitle}>
              {isListening ? t('speakNow') : t('listening')}
            </Text>
            
            {partialResult ? (
              <Text style={styles.partialResultText}>"{partialResult}"</Text>
            ) : (
              <Text style={styles.voiceModalSubtitle}>
                {t('speakMemberNameOrID')}
              </Text>
            )}
            
            <View style={styles.voiceResultsContainer}>
              {voiceResults.map((result, index) => (
                <Text key={index} style={styles.voiceResultItem}>
                  {result}
                </Text>
              ))}
            </View>
            
            <TouchableOpacity 
              style={[styles.voiceButton, styles.stopVoiceButton]}
              onPress={stopVoiceRecognition}
            >
              <Icon name="stop" size={20} color="#FFF" />
              <Text style={styles.voiceButtonText}>{t('stop')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
                {searchQuery ? `${filteredMembers.length} ${t('matchesFound')}` : `${filteredMembers.length} ${t('totalMembers')}`}
              </Text>
              {searchQuery && (
                <TouchableOpacity 
                  style={styles.clearSearchButton}
                  onPress={handleClearSearch}
                >
                  <Icon name="close" size={16} color="#666" />
                  <Text style={styles.clearSearchText}>{t('clear')}</Text>
                </TouchableOpacity>
              )}
            </View>

            {filteredMembers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Icon name="account-off" size={60} color="#CCC" />
                <Text style={styles.emptyText}>
                  {searchQuery ? t('noMatchingMembers') : t('noMembersFound')}
                </Text>
                <Text style={styles.emptySubtext}>
                  {searchQuery ? t('tryDifferentSearchTerm') : t('addNewMembersToStart')}
                </Text>
                {searchQuery && (
                  <TouchableOpacity 
                    style={styles.voiceSearchButton}
                    onPress={startVoiceRecognition}
                  >
                    <Icon name="microphone" size={18} color="#FFF" />
                    <Text style={styles.voiceSearchButtonText}>{t('tryVoiceSearch')}</Text>
                  </TouchableOpacity>
                )}
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
  // Header
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
  // Search Section
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
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    color: '#333',
  },
  searchButton: {
    backgroundColor: '#212c62',
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Stats
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
  clearSearchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F4FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  clearSearchText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 10,
  },
  // Member Card
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
  memberAvatarWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  memberAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
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
    marginBottom: 4,
  },
  businessName: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '500',
    marginBottom: 4,
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
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2196F3',
  },
  // Business image preview in card
  bizPreviewContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
    height: 110,
    position: 'relative',
  },
  bizPreviewImage: {
    width: '100%',
    height: 110,
    borderRadius: 8,
  },
  bizMoreBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  bizMoreText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  // Voice Modal
  voiceModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceModalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 25,
    width: '85%',
    alignItems: 'center',
    elevation: 10,
  },
  voiceCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 5,
  },
  voiceModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212c62',
    marginBottom: 10,
  },
  voiceModalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
  },
  partialResultText: {
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: '600',
    marginBottom: 15,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  voiceResultsContainer: {
    maxHeight: 100,
    width: '100%',
    marginBottom: 15,
  },
  voiceResultItem: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    marginVertical: 2,
    backgroundColor: '#F5F5F5',
    padding: 5,
    borderRadius: 5,
  },
  voiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    minWidth: 120,
  },
  stopVoiceButton: {
    backgroundColor: '#FF5252',
  },
  voiceButtonText: {
    color: '#FFF',
    fontSize: 16,
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
  voiceSearchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#212c62',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    marginTop: 15,
    gap: 8,
  },
  voiceSearchButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default MemberList;