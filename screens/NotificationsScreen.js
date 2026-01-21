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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import ApiService from '../service/api';

const NotificationsScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadNotifications();
    }, [])
  );

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const currentUser = await AsyncStorage.getItem('fullName');

      // Dummy data - TODO: Replace with API call
      const dummyNotifications = [
        {
          id: '1',
          fromMember: 'John Doe',
          toMember: currentUser,
          type: 'TYFCB',
          title: 'Thank You From John Doe',
          description: 'John Doe gave you a TYFCB for New business (₹5000)',
          amount: 5000,
          businessType: 'New',
          referralType: 'Inside',
          comment: 'Great business opportunity',
          date: '2026-01-06',
          status: 'Unread',
          icon: 'handshake',
        },
        {
          id: '2',
          fromMember: 'Sarah Smith',
          toMember: currentUser,
          type: 'TYFCB',
          title: 'Thank You From Sarah Smith',
          description: 'Sarah Smith gave you a TYFCB for Repeat business (₹3000)',
          amount: 3000,
          businessType: 'Repeat',
          referralType: 'Outside',
          comment: 'Excellent service',
          date: '2026-01-05',
          status: 'Read',
          icon: 'handshake',
        },
        {
          id: '3',
          fromMember: 'Mike Johnson',
          toMember: currentUser,
          type: 'Meeting',
          title: 'New Meeting Scheduled',
          description: 'Admin scheduled a meeting: "Monthly Networking Event"',
          date: '2026-01-04',
          status: 'Unread',
          icon: 'calendar-check',
        },
      ];

      setNotifications(dummyNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      // TODO: Call API to mark as read
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, status: 'Read' } : n
        )
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      // TODO: Call API to delete notification
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setShowDetailModal(false);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const renderNotificationItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.notificationCard,
        item.status === 'Unread' && styles.unreadCard,
      ]}
      onPress={() => {
        setSelectedNotification(item);
        setShowDetailModal(true);
        handleMarkAsRead(item.id);
      }}
    >
      <View style={styles.notificationContent}>
        <View style={styles.iconContainer}>
          <LinearGradient
            colors={['#4A90E2', '#87CEEB']}
            style={styles.iconGradient}
          >
            <Icon name={item.icon} size={24} color="#FFF" />
          </LinearGradient>
        </View>

        <View style={styles.textContent}>
          <Text style={styles.notificationTitle}>{item.title}</Text>
          <Text style={styles.notificationDescription} numberOfLines={2}>
            {item.description}
          </Text>
          <Text style={styles.notificationDate}>{item.date}</Text>
        </View>

        <View style={styles.actionContainer}>
          {item.status === 'Unread' && (
            <View style={styles.unreadBadge} />
          )}
          <TouchableOpacity
            onPress={() => {
              setSelectedNotification(item);
              setShowDetailModal(true);
            }}
          >
            <Icon name="eye" size={20} color="#4A90E2" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderDetailModal = () => {
    if (!selectedNotification) return null;

    return (
      <Modal
        visible={showDetailModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <StatusBar backgroundColor="#4A90E2" barStyle="light-content" />

          {/* Modal Header */}
          <LinearGradient colors={['#4A90E2', '#87CEEB']} style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowDetailModal(false)}>
              <Icon name="close" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Message Details</Text>
            <View style={{ width: 24 }} />
          </LinearGradient>

          {/* Modal Content */}
          <ScrollView style={styles.modalContent}>
            {/* Header Card */}
            <LinearGradient
              colors={['#4A90E2', '#87CEEB']}
              style={styles.detailHeaderCard}
            >
              <Icon name={selectedNotification.icon} size={40} color="#FFF" />
              <Text style={styles.detailTitle}>{selectedNotification.title}</Text>
              <Text style={styles.detailDate}>{selectedNotification.date}</Text>
            </LinearGradient>

            {/* From Member */}
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>From Member</Text>
              <View style={styles.detailCard}>
                <Icon name="account" size={20} color="#4A90E2" />
                <Text style={styles.detailValue}>{selectedNotification.fromMember}</Text>
              </View>
            </View>

            {/* Message Type */}
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Message Type</Text>
              <View style={styles.detailCard}>
                <Icon name="tag" size={20} color="#4A90E2" />
                <Text style={styles.detailValue}>{selectedNotification.type}</Text>
              </View>
            </View>

            {/* TYFCB Details (if applicable) */}
            {selectedNotification.type === 'TYFCB' && (
              <>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Amount</Text>
                  <View style={styles.detailCard}>
                    <Icon name="currency-inr" size={20} color="#4A90E2" />
                    <Text style={styles.detailValue}>
                      ₹{selectedNotification.amount.toLocaleString()}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Business Type</Text>
                  <View style={styles.detailCard}>
                    <Icon name="briefcase" size={20} color="#4A90E2" />
                    <Text style={styles.detailValue}>
                      {selectedNotification.businessType}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Referral Type</Text>
                  <View style={styles.detailCard}>
                    <Icon name="link" size={20} color="#4A90E2" />
                    <Text style={styles.detailValue}>
                      {selectedNotification.referralType}
                    </Text>
                  </View>
                </View>

                {selectedNotification.comment && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Comment</Text>
                    <View style={[styles.detailCard, styles.commentCard]}>
                      <Text style={styles.commentText}>
                        {selectedNotification.comment}
                      </Text>
                    </View>
                  </View>
                )}
              </>
            )}

            {/* Description */}
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Description</Text>
              <View style={[styles.detailCard, styles.commentCard]}>
                <Text style={styles.commentText}>
                  {selectedNotification.description}
                </Text>
              </View>
            </View>

            {/* Delete Button */}
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDelete(selectedNotification.id)}
            >
              <Icon name="trash-can" size={20} color="#FFF" />
              <Text style={styles.deleteButtonText}>Delete Message</Text>
            </TouchableOpacity>

            <View style={{ height: 30 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#4A90E2" barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#4A90E2', '#87CEEB']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
        </View>
      ) : notifications.length > 0 ? (
        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Icon name="bell-off" size={60} color="#CCC" />
          <Text style={styles.emptyText}>No notifications yet</Text>
          <Text style={styles.emptySubtext}>
            You'll see messages here when members give you TYFCB or when meetings are scheduled
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
  notificationCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#87CEEB',
  },
  unreadCard: {
    backgroundColor: '#E3F2FD',
    borderLeftColor: '#4A90E2',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 12,
  },
  iconGradient: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginBottom: 4,
  },
  notificationDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
    lineHeight: 18,
  },
  notificationDate: {
    fontSize: 12,
    color: '#999',
  },
  actionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  unreadBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4A90E2',
    marginBottom: 8,
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
    paddingHorizontal: 20,
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
    color: '#4A90E2',
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
  deleteButton: {
    backgroundColor: '#FF6B6B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  deleteButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default NotificationsScreen;
