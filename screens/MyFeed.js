import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, FlatList, ActivityIndicator, RefreshControl, Alert, ImageBackground, Modal, ScrollView } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../apiConfig';

const MyFeed = ({ route }) => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(route?.params?.tab || 'all');
  const [referralTab, setReferralTab] = useState(route?.params?.referralTab || 'my');
  const [feedData, setFeedData] = useState([]);
  const [updatingItemId, setUpdatingItemId] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailModalType, setDetailModalType] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      loadFeedData();
    }, [activeTab, referralTab])
  );

  // Get current user's member ID
  const getCurrentUserMemberId = async () => {
    try {
      const storedMemberId = await AsyncStorage.getItem('memberId');
      if (storedMemberId) {
        return parseInt(storedMemberId);
      }

      const userId = await AsyncStorage.getItem('userId');
      const fullName = await AsyncStorage.getItem('fullName');

      if (userId) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/Members/GetByUserId/${userId}`);
          if (response.ok) {
            const memberData = await response.json();
            if (memberData && memberData.id) {
              await AsyncStorage.setItem('memberId', memberData.id.toString());
              return memberData.id;
            }
          }
        } catch (error) {
          console.log('GetByUserId failed:', error);
        }
      }

      if (fullName) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/Members`);
          if (response.ok) {
            const members = await response.json();
            const member = members.find(m => 
              m.name && m.name.trim().toLowerCase() === fullName.trim().toLowerCase()
            );
            
            if (member) {
              await AsyncStorage.setItem('memberId', member.id.toString());
              return member.id;
            }
          }
        } catch (error) {
          console.log('Name search failed:', error);
        }
      }

      return null;
    } catch (error) {
      console.error('Error getting member ID:', error);
      return null;
    }
  };

  const loadFeedData = async () => {
    try {
      setLoading(true);
      
      const memberId = await getCurrentUserMemberId();
      if (!memberId) {
        Alert.alert('Error', 'Could not find your member ID. Please try logging in again.');
        setLoading(false);
        return;
      }

      let endpoint = `/api/Feed/member/${memberId}`;
      
      if (activeTab === 'referral') {
        endpoint = `/api/Feed/member/${memberId}/referrals`;
      } else if (activeTab === 'tyfcb') {
        endpoint = `/api/Feed/member/${memberId}/tyfcb`;
      } else if (activeTab === 'one_to_one') {
        endpoint = `/api/Feed/member/${memberId}/meetings`;
      }

      console.log('Fetching feed from:', `${API_BASE_URL}${endpoint}`);
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('API Response:', data);
      
      if (Array.isArray(data)) {
        setFeedData(data);
      } else if (data && Array.isArray(data.result)) {
        setFeedData(data.result);
      } else if (data && typeof data === 'object') {
        setFeedData([data]);
      } else {
        setFeedData([]);
      }
    } catch (error) {
      console.error('Error loading feed:', error);
      Alert.alert('Error', 'Failed to load feed data. Please try again.');
      setFeedData([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFeedData();
    setRefreshing(false);
  };

  const updateReferralStatus = async (referralId, status) => {
    try {
      setUpdatingItemId(referralId);
      
      const token = await AsyncStorage.getItem('jwt_token') || 
                    await AsyncStorage.getItem('token') || 
                    await AsyncStorage.getItem('authToken');

      if (!token) {
        Alert.alert('Error', 'Authentication token not found. Please login again.');
        navigation.navigate('Login');
        return;
      }

      console.log('Updating referral status:', { referralId, status });
      
      const response = await fetch(`${API_BASE_URL}/api/Referrals/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          Id: referralId,
          Status: status
        }),
      });

      const responseText = await response.text();
      console.log('Status update response:', responseText);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: `;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage += errorData.error || errorData.message || responseText;
        } catch (e) {
          errorMessage += responseText || 'Unknown error occurred';
        }
        throw new Error(errorMessage);
      }

      const result = responseText ? JSON.parse(responseText) : {};
      
      setFeedData(prevData => 
        prevData.map(item => 
          item.id === referralId 
            ? { ...item, status: status, updatedDate: new Date().toISOString() }
            : item
        )
      );

      Alert.alert('Success', `Referral ${status.toLowerCase()} successfully!`);
      setShowDetailModal(false);
      
    } catch (error) {
      console.error('Error updating referral status:', error);
      Alert.alert('Error', error.message || 'Failed to update referral status');
    } finally {
      setUpdatingItemId(null);
    }
  };

  const updateTYFCBStatus = async (tyfcbId, status) => {
    try {
      setUpdatingItemId(tyfcbId);
      
      const token = await AsyncStorage.getItem('jwt_token') || 
                    await AsyncStorage.getItem('token') || 
                    await AsyncStorage.getItem('authToken');

      if (!token) {
        Alert.alert('Error', 'Authentication token not found. Please login again.');
        navigation.navigate('Login');
        return;
      }

      console.log('Updating TYFCB status:', { tyfcbId, status });
      
      // Assuming you have a similar endpoint for TYFCB
      const response = await fetch(`${API_BASE_URL}/api/TYFCB/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          Id: tyfcbId,
          Status: status
        }),
      });

      if (response.ok) {
        setFeedData(prevData => 
          prevData.map(item => 
            item.id === tyfcbId 
              ? { ...item, status: status, updatedDate: new Date().toISOString() }
              : item
          )
        );

        Alert.alert('Success', `TYFCB ${status.toLowerCase()} successfully!`);
        setShowDetailModal(false);
      } else {
        Alert.alert('Info', 'TYFCB status updated locally. Please check backend implementation.');
        setFeedData(prevData => 
          prevData.map(item => 
            item.id === tyfcbId 
              ? { ...item, status: status, updatedDate: new Date().toISOString() }
              : item
          )
        );
        setShowDetailModal(false);
      }
      
    } catch (error) {
      console.error('Error updating TYFCB status:', error);
      Alert.alert('Error', error.message || 'Failed to update TYFCB status');
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleItemPress = (item) => {
    // Only show detail modal for received items that are pending
    const isReceivableItem = 
      (item.type === 'referral_received' && referralTab === 'my') ||
      (item.type === 'tyfcb_received' && activeTab === 'tyfcb');
    
    const isPending = !item.status || item.status === 'Pending' || item.status === 'pending';

    if (isReceivableItem && isPending) {
      setSelectedItem(item);
      setDetailModalType(item.type === 'referral_received' ? 'referral' : 'tyfcb');
      setShowDetailModal(true);
    } else {
      // For other items, just show a read-only detail view
      setSelectedItem(item);
      setDetailModalType('view');
      setShowDetailModal(true);
    }
  };

  const confirmStatusUpdate = () => {
    if (!selectedItem) return;
    
    if (detailModalType === 'referral') {
      updateReferralStatus(selectedItem.id, 'Confirmed');
    } else if (detailModalType === 'tyfcb') {
      updateTYFCBStatus(selectedItem.id, 'Confirmed');
    }
  };

  const rejectStatusUpdate = () => {
    if (!selectedItem) return;
    
    if (detailModalType === 'referral') {
      updateReferralStatus(selectedItem.id, 'Rejected');
    } else if (detailModalType === 'tyfcb') {
      updateTYFCBStatus(selectedItem.id, 'Rejected');
    }
  };

  const getFilteredData = () => {
    if (activeTab === 'referral') {
      if (referralTab === 'give') {
        return feedData.filter(item => item.type === 'referral_given');
      } else {
        return feedData.filter(item => item.type === 'referral_received');
      }
    }
    return feedData;
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  };

  const renderFeedItem = ({ item }) => {
    let iconName = 'information';
    let iconColor = '#4A90E2';
    
    switch(item.type) {
      case 'referral_given':
        iconName = 'account-arrow-right';
        iconColor = '#4CAF50';
        break;
      case 'referral_received':
        iconName = 'account-arrow-left';
        iconColor = '#2196F3';
        break;
      case 'tyfcb_given':
        iconName = 'handshake';
        iconColor = '#FF9800';
        break;
      case 'tyfcb_received':
        iconName = 'hand-heart';
        iconColor = '#E91E63';
        break;
      case 'one_to_one':
        iconName = 'calendar-account';
        iconColor = '#3F51B5';
        break;
      default:
        iconName = item.icon || 'information';
        iconColor = item.color || '#4A90E2';
    }

    let statusColor = '#FF9800';
    if (item.status === 'Confirmed' || item.status === 'Completed' || item.status === 'Approved') {
      statusColor = '#4CAF50';
    } else if (item.status === 'Rejected' || item.status === 'Cancelled') {
      statusColor = '#F44336';
    }

    // Check if this item is clickable
    const isClickable = true; // All items are now clickable

    return (
      <TouchableOpacity 
        style={styles.feedCard} 
        onPress={() => handleItemPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
          <Icon name={iconName} size={28} color={iconColor} />
        </View>
        <View style={styles.feedContent}>
          <View style={styles.feedHeader}>
            <Text style={styles.feedTitle}>{item.title || 'Activity'}</Text>
            {item.status && (
              <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            )}
          </View>
          <Text style={styles.feedDescription}>{item.description || 'No description available'}</Text>
          {item.memberName && (
            <Text style={styles.memberName}>Member: {item.memberName}</Text>
          )}
          <Text style={styles.feedDate}>
            {formatDate(item.date || new Date().toISOString())}
            {item.amount > 0 && ` • Amount: $${item.amount}`}
          </Text>

          {/* Show click hint for receivable items */}
          {((item.type === 'referral_received' && referralTab === 'my') ||
            (item.type === 'tyfcb_received' && activeTab === 'tyfcb')) &&
           (!item.status || item.status === 'Pending' || item.status === 'pending') && (
            <View style={styles.clickHint}>
              <Icon name="hand-pointing-right" size={14} color="#4A90E2" />
              <Text style={styles.clickHintText}>Tap to view and take action</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const filteredData = getFilteredData();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#4A90E2" barStyle="light-content" />
      <LinearGradient colors={['#4A90E2', '#87CEEB']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Activity Log</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'all' && styles.tabButtonActive]} 
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'all' && styles.tabButtonTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'referral' && styles.tabButtonActive]} 
          onPress={() => setActiveTab('referral')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'referral' && styles.tabButtonTextActive]}>Referrals</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'tyfcb' && styles.tabButtonActive]} 
          onPress={() => setActiveTab('tyfcb')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'tyfcb' && styles.tabButtonTextActive]}>TYFCB</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'one_to_one' && styles.tabButtonActive]} 
          onPress={() => setActiveTab('one_to_one')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'one_to_one' && styles.tabButtonTextActive]}>Meetings</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'referral' && (
        <View style={styles.referralToggle}>
          <TouchableOpacity 
            style={[styles.toggleButton, referralTab === 'give' && styles.toggleButtonActive]} 
            onPress={() => setReferralTab('give')}
          >
            <Icon name="account-arrow-right" size={18} color={referralTab === 'give' ? '#FFF' : '#4A90E2'} />
            <Text style={[styles.toggleText, referralTab === 'give' && styles.toggleTextActive]}>Given</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toggleButton, referralTab === 'my' && styles.toggleButtonActive]} 
            onPress={() => setReferralTab('my')}
          >
            <Icon name="account-arrow-left" size={18} color={referralTab === 'my' ? '#FFF' : '#4A90E2'} />
            <Text style={[styles.toggleText, referralTab === 'my' && styles.toggleTextActive]}>Received</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
        </View>
      ) : filteredData.length > 0 ? (
        <ImageBackground
          source={require('../assets/logoicon.png')}
          style={styles.backgroundImage}
          imageStyle={styles.backgroundImageStyle}
        >
          <FlatList 
            data={filteredData} 
            renderItem={renderFeedItem} 
            keyExtractor={(item, index) => `${item.type}-${item.id}-${index}`}
            contentContainerStyle={styles.feedList} 
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh}
                colors={['#4A90E2']}
                tintColor="#4A90E2"
              />
            } 
          />
        </ImageBackground>
      ) : (
        <ImageBackground
          source={require('../assets/logoicon.png')}
          style={styles.backgroundImage}
          imageStyle={styles.backgroundImageStyle}
        >
          <View style={styles.emptyContainer}>
            <Icon name="inbox" size={60} color="#CCC" />
            <Text style={styles.emptyText}>
              No activities yet
            </Text>
            <Text style={styles.emptySubtext}>
              Your activities will appear here
            </Text>
            {!loading && (
              <TouchableOpacity 
                style={styles.refreshButton}
                onPress={loadFeedData}
              >
                <Icon name="refresh" size={20} color="#4A90E2" />
                <Text style={styles.refreshButtonText}>Refresh</Text>
              </TouchableOpacity>
            )}
          </View>
        </ImageBackground>
      )}

      {/* Detail Modal */}
      <Modal
        transparent={true}
        animationType="slide"
        visible={showDetailModal}
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {detailModalType === 'referral' ? 'Referral Details' : 
                 detailModalType === 'tyfcb' ? 'TYFCB Details' : 'Activity Details'}
              </Text>
              <TouchableOpacity 
                onPress={() => setShowDetailModal(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              {selectedItem && (
                <>
                  {/* Icon and Title */}
                  <View style={styles.detailHeader}>
                    <View style={[styles.detailIconContainer, { 
                      backgroundColor: selectedItem.type === 'referral_received' ? '#2196F320' : 
                                      selectedItem.type === 'tyfcb_received' ? '#E91E6320' : '#4A90E220' 
                    }]}>
                      <Icon 
                        name={selectedItem.type === 'referral_received' ? 'account-arrow-left' : 
                              selectedItem.type === 'tyfcb_received' ? 'hand-heart' : 'information'} 
                        size={32} 
                        color={selectedItem.type === 'referral_received' ? '#2196F3' : 
                               selectedItem.type === 'tyfcb_received' ? '#E91E63' : '#4A90E2'} 
                      />
                    </View>
                    <Text style={styles.detailTitle}>{selectedItem.title || 'Activity'}</Text>
                  </View>

                  {/* Status Badge */}
                  {selectedItem.status && (
                    <View style={[styles.detailStatusBadge, { 
                      backgroundColor: selectedItem.status === 'Confirmed' ? '#4CAF50' : 
                                      selectedItem.status === 'Rejected' ? '#F44336' : '#FF9800'
                    }]}>
                      <Text style={styles.detailStatusText}>
                        Status: {selectedItem.status}
                      </Text>
                    </View>
                  )}

                  {/* Details Grid */}
                  <View style={styles.detailsGrid}>
                    <View style={styles.detailItem}>
                      <Icon name="calendar" size={20} color="#666" />
                      <Text style={styles.detailLabel}>Date</Text>
                      <Text style={styles.detailValue}>
                        {formatDate(selectedItem.date || new Date().toISOString())}
                      </Text>
                    </View>

                    {selectedItem.memberName && (
                      <View style={styles.detailItem}>
                        <Icon name="account" size={20} color="#666" />
                        <Text style={styles.detailLabel}>Member</Text>
                        <Text style={styles.detailValue}>{selectedItem.memberName}</Text>
                      </View>
                    )}

                    {selectedItem.amount > 0 && (
                      <View style={styles.detailItem}>
                        <Icon name="currency-usd" size={20} color="#666" />
                        <Text style={styles.detailLabel}>Amount</Text>
                        <Text style={[styles.detailValue, { color: '#4CAF50', fontWeight: 'bold' }]}>
                          ${selectedItem.amount}
                        </Text>
                      </View>
                    )}

                    {selectedItem.type && (
                      <View style={styles.detailItem}>
                        <Icon name="shape" size={20} color="#666" />
                        <Text style={styles.detailLabel}>Type</Text>
                        <Text style={styles.detailValue}>
                          {selectedItem.type === 'referral_received' ? 'Referral Received' : 
                           selectedItem.type === 'referral_given' ? 'Referral Given' :
                           selectedItem.type === 'tyfcb_received' ? 'TYFCB Received' :
                           selectedItem.type === 'tyfcb_given' ? 'TYFCB Given' : 'Activity'}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Description */}
                  <View style={styles.descriptionContainer}>
                    <Text style={styles.descriptionLabel}>Description</Text>
                    <Text style={styles.descriptionText}>
                      {selectedItem.description || 'No description available'}
                    </Text>
                  </View>

                  {/* Additional Notes if available */}
                  {selectedItem.notes && (
                    <View style={styles.notesContainer}>
                      <Text style={styles.notesLabel}>Notes</Text>
                      <Text style={styles.notesText}>{selectedItem.notes}</Text>
                    </View>
                  )}

                  {/* Action Buttons (only for pending received items) */}
                  {((selectedItem.type === 'referral_received' && referralTab === 'my') ||
                    (selectedItem.type === 'tyfcb_received' && activeTab === 'tyfcb')) &&
                   (!selectedItem.status || selectedItem.status === 'Pending' || selectedItem.status === 'pending') ? (
                    <View style={styles.actionButtonsContainer}>
                      <Text style={styles.actionTitle}>Take Action</Text>
                      <View style={styles.actionButtons}>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.confirmActionButton]}
                          onPress={confirmStatusUpdate}
                          disabled={updatingItemId === selectedItem.id}
                        >
                          {updatingItemId === selectedItem.id ? (
                            <ActivityIndicator size="small" color="#FFF" />
                          ) : (
                            <>
                              <Icon name="check-circle" size={20} color="#FFF" />
                              <Text style={styles.actionButtonText}>Confirm</Text>
                            </>
                          )}
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={[styles.actionButton, styles.rejectActionButton]}
                          onPress={rejectStatusUpdate}
                          disabled={updatingItemId === selectedItem.id}
                        >
                          {updatingItemId === selectedItem.id ? (
                            <ActivityIndicator size="small" color="#FFF" />
                          ) : (
                            <>
                              <Icon name="close-circle" size={20} color="#FFF" />
                              <Text style={styles.actionButtonText}>Reject</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.readOnlyMessage}>
                      <Icon name="information" size={24} color="#666" />
                      <Text style={styles.readOnlyText}>
                        This item has already been processed.
                      </Text>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    paddingVertical: 15 
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#FFF' 
  },
  tabBar: { 
    flexDirection: 'row', 
    backgroundColor: '#FFF', 
    borderBottomWidth: 1, 
    borderBottomColor: '#E0E0E0', 
    paddingHorizontal: 10, 
    paddingVertical: 8 
  },
  tabButton: { 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    marginHorizontal: 2, 
    borderRadius: 20, 
    backgroundColor: '#F0F0F0',
    flex: 1,
    alignItems: 'center'
  },
  tabButtonActive: { 
    backgroundColor: '#4A90E2' 
  },
  tabButtonText: { 
    fontSize: 12, 
    fontWeight: '600', 
    color: '#666' 
  },
  tabButtonTextActive: { 
    color: '#FFF' 
  },
  referralToggle: { 
    flexDirection: 'row', 
    backgroundColor: '#FFF', 
    paddingHorizontal: 15, 
    paddingVertical: 10, 
    gap: 10, 
    borderBottomWidth: 1, 
    borderBottomColor: '#E0E0E0' 
  },
  toggleButton: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 8, 
    borderRadius: 8, 
    backgroundColor: '#F0F0F0', 
    gap: 6 
  },
  toggleButtonActive: { 
    backgroundColor: '#4A90E2' 
  },
  toggleText: { 
    fontSize: 12, 
    fontWeight: '600', 
    color: '#666' 
  },
  toggleTextActive: { 
    color: '#FFF' 
  },
  backgroundImage: { 
    flex: 1 
  },
  backgroundImageStyle: { 
    opacity: 0.1,
    resizeMode: 'contain'
  },
  feedList: { 
    padding: 15, 
    paddingBottom: 30 
  },
  feedCard: { 
    flexDirection: 'row', 
    backgroundColor: '#FFF', 
    borderRadius: 12, 
    padding: 15, 
    marginBottom: 12, 
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  iconContainer: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 15 
  },
  feedContent: { 
    flex: 1 
  },
  feedHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginBottom: 6 
  },
  feedTitle: { 
    fontSize: 15, 
    fontWeight: 'bold', 
    color: '#333', 
    flex: 1 
  },
  statusBadge: { 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 12, 
    marginLeft: 10 
  },
  statusText: { 
    fontSize: 11, 
    fontWeight: '600', 
    color: '#FFF' 
  },
  feedDescription: { 
    fontSize: 13, 
    color: '#666', 
    marginBottom: 4, 
    lineHeight: 18 
  },
  memberName: { 
    fontSize: 12, 
    color: '#4A90E2', 
    fontWeight: '500', 
    marginBottom: 4 
  },
  feedDate: { 
    fontSize: 12, 
    color: '#999',
    marginBottom: 8
  },
  clickHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    alignSelf: 'flex-start'
  },
  clickHintText: {
    fontSize: 11,
    color: '#4A90E2',
    fontWeight: '500',
    marginLeft: 6
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  emptyContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    padding: 20
  },
  emptyText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#666', 
    marginTop: 15,
    textAlign: 'center'
  },
  emptySubtext: { 
    fontSize: 14, 
    color: '#999', 
    marginTop: 5,
    textAlign: 'center'
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4A90E2',
    gap: 8
  },
  refreshButtonText: {
    color: '#4A90E2',
    fontWeight: '600',
    fontSize: 14
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333'
  },
  closeButton: {
    padding: 4
  },
  modalContent: {
    padding: 20
  },
  // Detail Modal Styles
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20
  },
  detailIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    flex: 1
  },
  detailStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 20
  },
  detailStatusText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    gap: 15
  },
  detailItem: {
    width: '48%',
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center'
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    marginBottom: 4
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center'
  },
  descriptionContainer: {
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8
  },
  descriptionText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20
  },
  notesContainer: {
    backgroundColor: '#FFF8E1',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800'
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9800',
    marginBottom: 8
  },
  notesText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20
  },
  actionButtonsContainer: {
    marginTop: 20
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center'
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 15
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 10
  },
  confirmActionButton: {
    backgroundColor: '#4CAF50'
  },
  rejectActionButton: {
    backgroundColor: '#F44336'
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600'
  },
  readOnlyMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    marginTop: 20,
    gap: 10
  },
  readOnlyText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500'
  }
});

export default MyFeed;