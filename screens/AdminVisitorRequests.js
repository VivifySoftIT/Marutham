import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, StatusBar, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../apiConfig';

const AdminVisitorRequests = () => {
  const navigation = useNavigation();
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const getToken = async () =>
    (await AsyncStorage.getItem('jwt_token')) ||
    (await AsyncStorage.getItem('token')) ||
    (await AsyncStorage.getItem('authToken'));

  const loadRequests = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/api/Inventory/visitors/pending-members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setVisitors(Array.isArray(data) ? data : []);
    } catch (e) {
      Alert.alert('Error', 'Failed to load visitor requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { loadRequests(); }, []));

  const handleAction = async (id, action) => {
    const label = action === 'approve' ? 'Approve' : 'Reject';
    Alert.alert(`${label} Request`, `Are you sure you want to ${label.toLowerCase()} this visitor as a member?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: label,
        style: action === 'reject' ? 'destructive' : 'default',
        onPress: async () => {
          try {
            const token = await getToken();
            const res = await fetch(`${API_BASE_URL}/api/Inventory/visitors/${id}/${action}`, {
              method: 'PUT',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            });
            if (res.ok) {
              Alert.alert('Success', `Visitor ${action === 'approve' ? 'approved as member' : 'request rejected'}.`);
              loadRequests();
            } else {
              const err = await res.json();
              Alert.alert('Error', err.message || 'Action failed');
            }
          } catch (e) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(item.visitorName || item.firstName || '?').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.visitorName || `${item.firstName} ${item.lastName}`}</Text>
          <Text style={styles.sub}>Brought by: {item.broughtByMemberName}</Text>
          <Text style={styles.sub}>Visit: {new Date(item.visitDate).toLocaleDateString()}</Text>
        </View>
      </View>

      <View style={styles.details}>
        {item.mobileNumber || item.visitorPhone ? (
          <View style={styles.detailRow}>
            <Icon name="phone" size={14} color="#4A90E2" />
            <Text style={styles.detailText}>{item.mobileNumber || item.visitorPhone}</Text>
          </View>
        ) : null}
        {item.visitorEmail ? (
          <View style={styles.detailRow}>
            <Icon name="email" size={14} color="#4A90E2" />
            <Text style={styles.detailText}>{item.visitorEmail}</Text>
          </View>
        ) : null}
        {item.visitorBusiness || item.company ? (
          <View style={styles.detailRow}>
            <Icon name="briefcase" size={14} color="#4A90E2" />
            <Text style={styles.detailText}>{item.visitorBusiness || item.company}</Text>
          </View>
        ) : null}
        {item.notes ? (
          <View style={styles.detailRow}>
            <Icon name="note-text" size={14} color="#999" />
            <Text style={styles.detailText}>{item.notes}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btn, styles.approveBtn]}
          onPress={() => handleAction(item.id, 'approve')}
        >
          <Icon name="check" size={16} color="#FFF" />
          <Text style={styles.btnText}>Approve</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.rejectBtn]}
          onPress={() => handleAction(item.id, 'reject')}
        >
          <Icon name="close" size={16} color="#FFF" />
          <Text style={styles.btnText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#4A90E2" barStyle="light-content" />
      <LinearGradient colors={['#4A90E2', '#87CEEB']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Visitor Member Requests</Text>
        <TouchableOpacity onPress={loadRequests}>
          <Icon name="refresh" size={22} color="#FFF" />
        </TouchableOpacity>
      </LinearGradient>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4A90E2" />
        </View>
      ) : (
        <FlatList
          data={visitors}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadRequests(); }} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Icon name="account-check" size={60} color="#CCC" />
              <Text style={styles.emptyText}>No pending visitor requests</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

export default AdminVisitorRequests;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F9FC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 12, height: 56 },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: '#FFF' },
  list: { padding: 14, paddingBottom: 30 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15, color: '#999', marginTop: 12 },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 3, borderLeftWidth: 4, borderLeftColor: '#4A90E2' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#4A90E2', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  name: { fontSize: 15, fontWeight: '700', color: '#212c62' },
  sub: { fontSize: 12, color: '#666', marginTop: 2 },
  details: { backgroundColor: '#F8FBFF', borderRadius: 8, padding: 10, marginBottom: 12, gap: 6 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 13, color: '#444', flex: 1 },
  actions: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, gap: 6 },
  approveBtn: { backgroundColor: '#4CAF50' },
  rejectBtn: { backgroundColor: '#F44336' },
  btnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
});
