import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, StatusBar, ActivityIndicator, Alert, RefreshControl,
  Modal, ScrollView, TextInput,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../apiConfig';
import SpeechToTextInput from '../components/SpeechToTextInput';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const AdminPayments = () => {
  const navigation = useNavigation();
  const [payments, setPayments] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    selectedMember: null,
    amount: '',
    paymentMethod: 'Cash',
    transactionId: '',
    paymentForMonth: '',
    notes: '',
  });

  const getToken = async () =>
    (await AsyncStorage.getItem('jwt_token')) ||
    (await AsyncStorage.getItem('token')) ||
    (await AsyncStorage.getItem('authToken'));

  const loadPayments = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/api/Payments/pending-confirmation`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setPayments(Array.isArray(data) ? data : []);
    } catch (e) {
      Alert.alert('Error', 'Failed to load payments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadMembers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/Members`);
      const data = await res.json();
      setMembers(Array.isArray(data) ? data : []);
    } catch (_) {}
  };

  useFocusEffect(useCallback(() => {
    loadPayments();
    loadMembers();
  }, []));

  const handleConfirm = async (id) => {
    Alert.alert('Confirm Payment', 'Confirm this payment? Member will be able to download their receipt.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          try {
            const token = await getToken();
            const res = await fetch(`${API_BASE_URL}/api/Payments/${id}/confirm`, {
              method: 'PUT',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            });
            if (res.ok) {
              Alert.alert('Success', 'Payment confirmed. Member can now download their receipt.');
              loadPayments();
            } else {
              Alert.alert('Error', 'Failed to confirm payment');
            }
          } catch (e) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  const filteredMembers = members.filter(m =>
    !memberSearch.trim() ||
    (m.name || m.Name || '').toLowerCase().includes(memberSearch.toLowerCase()) ||
    (m.phone || m.Phone || '').includes(memberSearch)
  );

  const handleAddPayment = async () => {
    if (!form.selectedMember) { Alert.alert('Error', 'Please select a member'); return; }
    if (!form.amount || isNaN(form.amount) || parseFloat(form.amount) <= 0) { Alert.alert('Error', 'Enter a valid amount'); return; }
    if (!form.paymentForMonth.trim()) { Alert.alert('Error', 'Enter payment month (e.g. Jan)'); return; }

    const monthValid = MONTHS.some(m => m.toLowerCase() === form.paymentForMonth.trim().toLowerCase());
    if (!monthValid) { Alert.alert('Error', 'Enter a valid month abbreviation (Jan-Dec)'); return; }

    setSubmitting(true);
    try {
      const token = await getToken();
      const adminId = await AsyncStorage.getItem('memberId');
      const payload = {
        MemberId: form.selectedMember.id || form.selectedMember.Id,
        Amount: parseFloat(form.amount),
        PaymentType: 'Monthly',
        PaymentMethod: form.paymentMethod || 'Cash',
        TransactionId: form.transactionId || null,
        PaymentForMonth: form.paymentForMonth.trim(),
        PaymentDate: new Date().toISOString().split('T')[0],
        Status: 'AdminConfirmed',
        Notes: form.notes || null,
        CreatedBy: adminId ? adminId.toString() : 'Admin',
      };

      const res = await fetch(`${API_BASE_URL}/api/Inventory/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        Alert.alert('Success', 'Payment added and confirmed.');
        setShowAddModal(false);
        setForm({ selectedMember: null, amount: '', paymentMethod: 'Cash', transactionId: '', paymentForMonth: '', notes: '' });
        loadPayments();
      } else {
        const err = await res.json();
        Alert.alert('Error', err.message || 'Failed to add payment');
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderPayment = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(item.memberName || '?').charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.memberName}>{item.memberName}</Text>
          <Text style={styles.sub}>Month: {item.paymentForMonth} • ?{item.amount}</Text>
          <Text style={styles.sub}>Method: {item.paymentMethod}</Text>
          {item.transactionId ? <Text style={styles.sub}>TxnID: {item.transactionId}</Text> : null}
          {item.receiptNumber ? <Text style={styles.sub}>Receipt: {item.receiptNumber}</Text> : null}
          <Text style={styles.sub}>Date: {item.paymentDate ? new Date(item.paymentDate).toLocaleDateString() : 'N/A'}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'AdminConfirmed' ? '#E8F5E9' : '#FFF3E0' }]}>
          <Text style={[styles.statusText, { color: item.status === 'AdminConfirmed' ? '#4CAF50' : '#FF9800' }]}>
            {item.status === 'AdminConfirmed' ? 'Confirmed' : 'Pending'}
          </Text>
        </View>
      </View>
      {item.status !== 'AdminConfirmed' && (
        <TouchableOpacity style={styles.confirmBtn} onPress={() => handleConfirm(item.id)}>
          <Icon name="check-circle" size={16} color="#FFF" />
          <Text style={styles.confirmBtnText}>Confirm Payment</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#1B5E35" barStyle="light-content" />
      <LinearGradient colors={['#1B5E35', '#2E7D4F']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payments</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)}>
          <Icon name="plus-circle" size={24} color="#FFF" />
        </TouchableOpacity>
      </LinearGradient>

      {loading && !refreshing ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#C9A84C" /></View>
      ) : (
        <FlatList
          data={payments}
          keyExtractor={item => item.id.toString()}
          renderItem={renderPayment}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadPayments(); }} />}
          ListHeaderComponent={
            <Text style={styles.sectionLabel}>Pending Confirmation ({payments.filter(p => p.status !== 'AdminConfirmed').length})</Text>
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Icon name="cash-check" size={60} color="#CCC" />
              <Text style={styles.emptyText}>No payments pending confirmation</Text>
            </View>
          }
        />
      )}

      {/* Add Payment Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <LinearGradient colors={['#1B5E35', '#2E7D4F']} style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Payment</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Icon name="close" size={22} color="#FFF" />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
              {/* Member selector */}
              <Text style={styles.label}>Member *</Text>
              <TouchableOpacity
                style={styles.dropdownBtn}
                onPress={() => setShowMemberDropdown(!showMemberDropdown)}
              >
                <Icon name="account" size={18} color="#C9A84C" />
                <Text style={[styles.dropdownText, !form.selectedMember && { color: '#999' }]}>
                  {form.selectedMember ? (form.selectedMember.name || form.selectedMember.Name) : 'Select member...'}
                </Text>
                <Icon name={showMemberDropdown ? 'chevron-up' : 'chevron-down'} size={18} color="#666" />
              </TouchableOpacity>

              {showMemberDropdown && (
                <View style={styles.dropdown}>
                  <View style={styles.searchRow}>
                    <Icon name="magnify" size={18} color="#999" />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search member..."
                      value={memberSearch}
                      onChangeText={setMemberSearch}
                      autoFocus
                    />
                    {memberSearch ? (
                      <TouchableOpacity onPress={() => setMemberSearch('')}>
                        <Icon name="close-circle" size={16} color="#999" />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                    {filteredMembers.map(m => (
                      <TouchableOpacity
                        key={(m.id || m.Id).toString()}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setForm(prev => ({ ...prev, selectedMember: m }));
                          setShowMemberDropdown(false);
                          setMemberSearch('');
                        }}
                      >
                        <Text style={styles.dropdownItemName}>{m.name || m.Name}</Text>
                        <Text style={styles.dropdownItemSub}>{m.phone || m.Phone}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <Text style={styles.label}>Amount (?) *</Text>
              <SpeechToTextInput
                placeholder="e.g. 5000"
                value={form.amount}
                onChangeText={v => setForm(p => ({ ...p, amount: v.replace(/[^0-9.]/g, '') }))}
                keyboardType="numeric"
                placeholderTextColor="#999"
              />

              <Text style={styles.label}>Payment Method *</Text>
              <SpeechToTextInput
                placeholder="Cash / UPI / Card / Bank"
                value={form.paymentMethod}
                onChangeText={v => setForm(p => ({ ...p, paymentMethod: v }))}
                placeholderTextColor="#999"
              />

              <Text style={styles.label}>Transaction ID</Text>
              <SpeechToTextInput
                placeholder="e.g. TXN123456"
                value={form.transactionId}
                onChangeText={v => setForm(p => ({ ...p, transactionId: v }))}
                placeholderTextColor="#999"
              />

              <Text style={styles.label}>Payment Month *</Text>
              <SpeechToTextInput
                placeholder="e.g. Jan, Feb, Mar"
                value={form.paymentForMonth}
                onChangeText={v => setForm(p => ({ ...p, paymentForMonth: v }))}
                placeholderTextColor="#999"
              />

              <Text style={styles.label}>Notes</Text>
              <SpeechToTextInput
                placeholder="Optional notes..."
                value={form.notes}
                onChangeText={v => setForm(p => ({ ...p, notes: v }))}
                multiline
                numberOfLines={2}
                placeholderTextColor="#999"
              />

              <TouchableOpacity
                style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
                onPress={handleAddPayment}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Icon name="check-circle" size={20} color="#FFF" />
                    <Text style={styles.submitBtnText}>Add & Confirm Payment</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default AdminPayments;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F9FC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 12, height: 56 },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: '#FFF' },
  list: { padding: 14, paddingBottom: 30 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 10 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15, color: '#999', marginTop: 12 },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 3 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#C9A84C', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  memberName: { fontSize: 15, fontWeight: '700', color: '#1B5E35' },
  sub: { fontSize: 12, color: '#666', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start' },
  statusText: { fontSize: 11, fontWeight: '700' },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4CAF50', paddingVertical: 10, borderRadius: 8, gap: 6 },
  confirmBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalTitle: { fontSize: 17, fontWeight: 'bold', color: '#FFF' },
  modalContent: { padding: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginTop: 12, marginBottom: 4 },
  dropdownBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FBFF', borderRadius: 8, borderWidth: 1, borderColor: '#E0E0E0', paddingHorizontal: 12, paddingVertical: 12, gap: 8 },
  dropdownText: { flex: 1, fontSize: 14, color: '#333' },
  dropdown: { backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: '#E0E0E0', marginTop: 4, elevation: 4 },
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#333', paddingVertical: 2 },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  dropdownItemName: { fontSize: 14, fontWeight: '600', color: '#1B5E35' },
  dropdownItemSub: { fontSize: 12, color: '#666', marginTop: 2 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4CAF50', paddingVertical: 14, borderRadius: 10, marginTop: 20, marginBottom: 30, gap: 8 },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});


