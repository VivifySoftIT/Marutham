import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import ApiService from '../service/api';

const AdminNotificationsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activities, setActivities] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filterType, setFilterType] = useState('all');

  useFocusEffect(
    React.useCallback(() => {
      loadActivities();
    }, [])
  );

  const loadActivities = async () => {
    try {
      setLoading(true);

      // Dummy data - TODO: Replace with API call
      const dummyActivities = [
        {
          id: '1',
          type: 'TYFCB',
          givenBy: 'John Doe',
          givenTo: 'Sarah Smith',
          amount: 5000,
          businessType: 'New',
          referralType: 'Inside',
          comment: 'Great business opportunity',
          date: '2026-01-06',
          time: '10:30 AM',
          icon: 'handshake',
        },
        {
          id: '2',
          type: 'TYFCB',
          givenBy: 'Mike Johnson',
          givenTo: 'Emma Wilson',
          amount: 3000,
          businessType: 'Repeat',
          referralType: 'Outside',
          comment: 'Excellent service',
          date: '2026-01-05',
          time: '02:15 PM',
          icon: 'handshake',
        },
        {
          id: '3',
          type: 'Referral',
          givenBy: 'Sarah Smith',
          givenTo: 'John Doe',
          referralType: 'Inside',
          status: 'Told them you would call',
          date: '2026-01-04',
          time: '11:45 AM',
          icon: 'account-arrow-right',
        },
        {
          id: '4',
          type: 'TYFCB',
          givenBy: 'Emma Wilson',
          givenTo: 'Mike Johnson',
          amount: 7000,
          businessType: 'New',
          referralType: 'Tier3+',
          comment: 'Premium business',
          date: '2026-01-03',
          time: '03:20 PM',
          icon: 'handshake',
        },
      ];

      setActivities(dummyActivities);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadActivities();
    setRefreshing(false);
  };

  const getFilteredActivities = () => {
    if (filterType === 'all') return activities;
    return activities.filter(a => a.type === filterType);
  };

  const renderActivityItem = ({ item }) => (
    <TouchableOpacity
      style={styles.activityCard}
      onPress={() => {
        setSelectedActivity(item);
        setShowDetailModal(true);
      }}
    >
      <View style={styles.activityContent}>
        <LinearGradient
          colors={['#C9A84C', '#2E7D4F']}
          style={styles.activityIcon}
        >
          <Icon name={item.icon} size={24} color="#FFF" />
        </LinearGradient>

        <View style={styles.activityInfo}>
          <Text style={styles.activityTitle}>
            {item.givenBy} → {item.givenTo}
          </Text>
          <Text style={styles.activityType}>{item.type}</Text>
          {item.amount && (
            <Text style={styles.activityAmount}>₹{item.amount.toLocaleString()}</Text>
          )}
          <Text style={styles.activityDateTime}>
            {item.date} at {item.time}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => {
            setSelectedActivity(item);
            setShowDetailModal(true);
          }}
        >
          <Icon name="eye" size={20} color="#C9A84C" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderDetailModal = () => {
    if (!selectedActivity) return null;

    return (
      <Modal
        visible={showDetailModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <StatusBar backgroundColor="#C9A84C" barStyle="light-content" />

          {/* Modal Header */}
          <LinearGradient colors={['#C9A84C', '#2E7D4F']} style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowDetailModal(false)}>
              <Icon name="close" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Activity Details</Text>
            <View style={{ width: 24 }} />
          </LinearGradient>

          {/* Modal Content */}
          <ScrollView style={styles.modalContent}>
            {/* Header Card */}
            <LinearGradient
              colors={['#C9A84C', '#2E7D4F']}
              style={styles.detailHeaderCard}
            >
              <Icon name={selectedActivity.icon} size={40} color="#FFF" />
              <Text style={styles.detailTitle}>{selectedActivity.type} Activity</Text>
              <Text style={styles.detailDate}>
                {selectedActivity.date} at {selectedActivity.time}
              </Text>
            </LinearGradient>

            {/* From Member */}
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Given By</Text>
              <View style={styles.detailCard}>
                <Icon name="account" size={20} color="#C9A84C" />
                <Text style={styles.detailValue}>{selectedActivity.givenBy}</Text>
              </View>
            </View>

            {/* To Member */}
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Given To</Text>
              <View style={styles.detailCard}>
                <Icon name="account" size={20} color="#C9A84C" />
                <Text style={styles.detailValue}>{selectedActivity.givenTo}</Text>
              </View>
            </View>

            {/* Activity Type */}
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Activity Type</Text>
              <View style={styles.detailCard}>
                <Icon name="tag" size={20} color="#C9A84C" />
                <Text style={styles.detailValue}>{selectedActivity.type}</Text>
              </View>
            </View>

            {/* TYFCB Details (if applicable) */}
            {selectedActivity.type === 'TYFCB' && (
              <>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Amount</Text>
                  <View style={styles.detailCard}>
                    <Icon name="currency-inr" size={20} color="#C9A84C" />
                    <Text style={styles.detailValue}>
                      ₹{selectedActivity.amount.toLocaleString()}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Business Type</Text>
                  <View style={styles.detailCard}>
                    <Icon name="briefcase" size={20} color="#C9A84C" />
                    <Text style={styles.detailValue}>
                      {selectedActivity.businessType}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Referral Type</Text>
                  <View style={styles.detailCard}>
                    <Icon name="link" size={20} color="#C9A84C" />
                    <Text style={styles.detailValue}>
                      {selectedActivity.referralType}
                    </Text>
                  </View>
                </View>

                {selectedActivity.comment && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Comment</Text>
                    <View style={[styles.detailCard, styles.commentCard]}>
                      <Text style={styles.commentText}>
                        {selectedActivity.comment}
                      </Text>
                    </View>
                  </View>
                )}
              </>
            )}

            {/* Referral Details (if applicable) */}
            {selectedActivity.type === 'Referral' && (
              <>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Referral Type</Text>
                  <View style={styles.detailCard}>
                    <Icon name="link" size={20} color="#C9A84C" />
                    <Text style={styles.detailValue}>
                      {selectedActivity.referralType}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <View style={styles.detailCard}>
                    <Icon name="check-circle" size={20} color="#C9A84C" />
                    <Text style={styles.detailValue}>
                      {selectedActivity.status}
                    </Text>
                  </View>
                </View>
              </>
            )}

            <View style={{ height: 30 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  const filteredActivities = getFilteredActivities();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#C9A84C" barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#C9A84C', '#2E7D4F']} style={styles.header}>
        <Text style={styles.headerTitle}>Member Activities</Text>
      </LinearGradient>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filterType === 'all' && styles.filterButtonActive]}
          onPress={() => setFilterType('all')}
        >
          <Text style={[styles.filterText, filterType === 'all' && styles.filterTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filterType === 'TYFCB' && styles.filterButtonActive]}
          onPress={() => setFilterType('TYFCB')}
        >
          <Text style={[styles.filterText, filterType === 'TYFCB' && styles.filterTextActive]}>
            TYFCB
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filterType === 'Referral' && styles.filterButtonActive]}
          onPress={() => setFilterType('Referral')}
        >
          <Text style={[styles.filterText, filterType === 'Referral' && styles.filterTextActive]}>
            Referrals
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#C9A84C" />
        </View>
      ) : filteredActivities.length > 0 ? (
        <FlatList
          data={filteredActivities}
          renderItem={renderActivityItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Icon name="inbox" size={60} color="#CCC" />
          <Text style={styles.emptyText}>No activities yet</Text>
          <Text style={styles.emptySubtext}>
            Member activities will appear here
          </Text>
        </View>
      )}

      {renderDetailModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F9FC',
  },
  header: {
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingHorizontal: 15,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
  },
  filterButtonActive: {
    backgroundColor: '#C9A84C',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  filterTextActive: {
    color: '#FFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 15,
    paddingBottom: 30,
  },
  activityCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#2E7D4F',
  },
  activityContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  activityType: {
    fontSize: 12,
    color: '#C9A84C',
    fontWeight: '600',
    marginBottom: 2,
  },
  activityAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#C9A84C',
    marginBottom: 2,
  },
  activityDateTime: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#CCC',
    marginTop: 5,
    textAlign: 'center',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F5F9FC',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  modalContent: {
    flex: 1,
    padding: 15,
  },
  detailHeaderCard: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 3,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 12,
    textAlign: 'center',
  },
  detailDate: {
    fontSize: 13,
    color: '#FFF',
    marginTop: 8,
    opacity: 0.9,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#C9A84C',
    marginBottom: 8,
  },
  detailCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    marginLeft: 10,
    fontWeight: '500',
  },
  commentCard: {
    alignItems: 'flex-start',
    minHeight: 60,
  },
  commentText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
});

export default AdminNotificationsScreen;

