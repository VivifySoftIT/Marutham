import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../service/LanguageContext';
import API_BASE_URL from '../apiConfig';

const AttendanceReportScreen = ({ navigation }) => {
  const { t } = useLanguage();
  
  const [selectedPeriod, setSelectedPeriod] = useState('Daily');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);
  const [showMemberDetail, setShowMemberDetail] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [activeMemberTab, setActiveMemberTab] = useState('present');

  const periods = ['Daily', 'Weekly', 'Monthly', 'Yearly'];

  useEffect(() => {
    fetchReportData();
  }, [selectedPeriod]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await AsyncStorage.getItem('jwt_token');
      const apiUrl = `${API_BASE_URL}/api/Inventory/reports/attendance?period=${selectedPeriod}`;

      console.log('Fetching attendance report:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Report data received:', data);
      setReportData(data);
    } catch (err) {
      console.error('Error fetching report:', err);
      setError(err.message);
      Alert.alert(t('error'), 'Failed to load attendance report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReportData();
    setRefreshing(false);
  };

  const StatCard = ({ label, value, icon, color }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
        <Icon name={icon} size={24} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
    </View>
  );

  const MemberCard = ({ member, isPresentTab }) => (
    <TouchableOpacity
      style={styles.memberCard}
      onPress={() => {
        setSelectedMember(member);
        setShowMemberDetail(true);
      }}
    >
      <View style={styles.memberCardHeader}>
        <View style={[styles.memberAvatar, { backgroundColor: isPresentTab ? '#27AE60' : '#E74C3C' }]}>
          <Text style={styles.avatarText}>{member.Name?.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.memberCardInfo}>
          <Text style={styles.memberName}>{member.Name}</Text>
          <Text style={styles.memberPhone}>{member.Phone}</Text>
        </View>
        <Icon name="chevron-right" size={20} color="#999" />
      </View>

      <View style={styles.memberStats}>
        <View style={styles.statBadge}>
          <Icon name="account-multiple" size={14} color="#C9A84C" />
          <Text style={styles.statBadgeText}>{member.VisitorsBrought || 0}</Text>
        </View>
        <View style={styles.statBadge}>
          <Icon name="handshake" size={14} color="#F39C12" />
          <Text style={styles.statBadgeText}>{member.TyfcbGiven || 0}</Text>
        </View>
        <View style={styles.statBadge}>
          <Icon name="share-variant" size={14} color="#9B59B6" />
          <Text style={styles.statBadgeText}>{member.ReferralsGiven || 0}</Text>
        </View>
        <View style={styles.statBadge}>
          <Icon name="cash-multiple" size={14} color="#27AE60" />
          <Text style={styles.statBadgeText}>\u20B9{member.TotalAmountPaidThisMonth || 0}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderAttendanceTab = () => {
    if (!reportData?.Attendance) return null;

    const { PresentMembers = [], AbsentMembers = [] } = reportData.Attendance;
    const membersToShow = activeMemberTab === 'present' ? PresentMembers : AbsentMembers;

    return (
      <View style={styles.tabContent}>
        {/* Stats */}
        <View style={styles.statsGrid}>
          <StatCard
            label="Total Members"
            value={reportData.Attendance.TotalMembers || 0}
            icon="account-group"
            color="#C9A84C"
          />
          <StatCard
            label="Present"
            value={reportData.Attendance.PresentCount || 0}
            icon="check-circle"
            color="#27AE60"
          />
          <StatCard
            label="Absent"
            value={reportData.Attendance.AbsentCount || 0}
            icon="close-circle"
            color="#E74C3C"
          />
          <StatCard
            label="Attendance %"
            value={`${reportData.Attendance.TotalMembers > 0 ? Math.round((reportData.Attendance.PresentCount / reportData.Attendance.TotalMembers) * 100) : 0}%`}
            icon="percent"
            color="#F39C12"
          />
        </View>

        {/* Member Tabs */}
        <View style={styles.memberTabs}>
          <TouchableOpacity
            style={[styles.memberTab, activeMemberTab === 'present' && styles.memberTabActive]}
            onPress={() => setActiveMemberTab('present')}
          >
            <Icon name="check-circle" size={18} color={activeMemberTab === 'present' ? '#27AE60' : '#999'} />
            <Text style={[styles.memberTabText, activeMemberTab === 'present' && styles.memberTabTextActive]}>
              Present ({PresentMembers.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.memberTab, activeMemberTab === 'absent' && styles.memberTabActive]}
            onPress={() => setActiveMemberTab('absent')}
          >
            <Icon name="close-circle" size={18} color={activeMemberTab === 'absent' ? '#E74C3C' : '#999'} />
            <Text style={[styles.memberTabText, activeMemberTab === 'absent' && styles.memberTabTextActive]}>
              Absent ({AbsentMembers.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Members List */}
        <FlatList
          data={membersToShow}
          renderItem={({ item }) => <MemberCard member={item} isPresentTab={activeMemberTab === 'present'} />}
          keyExtractor={(item) => item.Id.toString()}
          scrollEnabled={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Icon name="inbox" size={48} color="#CCC" />
              <Text style={styles.emptyStateText}>No members</Text>
            </View>
          }
        />
      </View>
    );
  };

  const renderPaymentTab = () => {
    if (!reportData?.Payments) return null;

    const { PaidMembers = [], TotalAmountCollected = 0, TotalPaidMembers = 0 } = reportData.Payments;

    return (
      <View style={styles.tabContent}>
        {/* Payment Stats */}
        <View style={styles.statsGrid}>
          <StatCard
            label="Total Paid Members"
            value={TotalPaidMembers}
            icon="account-check"
            color="#27AE60"
          />
          <StatCard
            label="Total Amount"
            value={`\u20B9${TotalAmountCollected.toLocaleString()}`}
            icon="cash-multiple"
            color="#F39C12"
          />
          <StatCard
            label="Avg Payment"
            value={`\u20B9${TotalPaidMembers > 0 ? Math.round(TotalAmountCollected / TotalPaidMembers) : 0}`}
            icon="calculator"
            color="#C9A84C"
          />
        </View>

        {/* Paid Members List */}
        <Text style={styles.sectionTitle}>Paid Members ({PaidMembers.length})</Text>
        <FlatList
          data={PaidMembers}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.paymentCard}
              onPress={() => {
                setSelectedMember(item);
                setShowMemberDetail(true);
              }}
            >
              <View style={styles.paymentCardHeader}>
                <View style={styles.paymentAvatar}>
                  <Text style={styles.avatarText}>{item.Name?.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.paymentCardInfo}>
                  <Text style={styles.memberName}>{item.Name}</Text>
                  <Text style={styles.memberPhone}>{item.Phone}</Text>
                </View>
                <View style={styles.paymentAmount}>
                  <Text style={styles.paymentAmountText}>\u20B9{item.TotalAmountPaidThisMonth}</Text>
                  <Text style={styles.paymentCountText}>{item.PaymentsThisMonth} payments</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.Id.toString()}
          scrollEnabled={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Icon name="inbox" size={48} color="#CCC" />
              <Text style={styles.emptyStateText}>No payments this month</Text>
            </View>
          }
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1B5E35" />

      {/* Header */}
      <LinearGradient colors={['#1B5E35', '#2E7D4F']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Attendance Report</Text>
          <TouchableOpacity onPress={onRefresh}>
            <Icon name="refresh" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Period Selection */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.periodScroll}
        contentContainerStyle={styles.periodContent}
      >
        {periods.map((period) => (
          <TouchableOpacity
            key={period}
            style={[styles.periodButton, selectedPeriod === period && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod(period)}
          >
            <Text style={[styles.periodButtonText, selectedPeriod === period && styles.periodButtonTextActive]}>
              {period}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#C9A84C" />
          <Text style={styles.loadingText}>Loading report...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={48} color="#E74C3C" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchReportData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {renderAttendanceTab()}
          {renderPaymentTab()}
        </ScrollView>
      )}

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
                <View style={styles.detailAvatar}>
                  <Text style={styles.detailAvatarText}>
                    {selectedMember.Name?.charAt(0).toUpperCase()}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Name</Text>
                  <Text style={styles.detailValue}>{selectedMember.Name}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Phone</Text>
                  <Text style={styles.detailValue}>{selectedMember.Phone}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Email</Text>
                  <Text style={styles.detailValue}>{selectedMember.Email || 'N/A'}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Visitors Brought</Text>
                  <Text style={styles.detailValue}>{selectedMember.VisitorsBrought || 0}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>TYFCB Given</Text>
                  <Text style={styles.detailValue}>{selectedMember.TyfcbGiven || 0}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>TYFCB Received</Text>
                  <Text style={styles.detailValue}>{selectedMember.TyfcbReceived || 0}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Referrals Given</Text>
                  <Text style={styles.detailValue}>{selectedMember.ReferralsGiven || 0}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Referrals Received</Text>
                  <Text style={styles.detailValue}>{selectedMember.ReferralsReceived || 0}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Payments This Month</Text>
                  <Text style={styles.detailValue}>{selectedMember.PaymentsThisMonth || 0}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Total Amount Paid</Text>
                  <Text style={styles.detailValue}>\u20B9{selectedMember.TotalAmountPaidThisMonth || 0}</Text>
                </View>

                {selectedMember.LastVisitDate && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Last Visit</Text>
                    <Text style={styles.detailValue}>
                      {new Date(selectedMember.LastVisitDate).toLocaleDateString()}
                    </Text>
                  </View>
                )}
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
  periodScroll: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  periodContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    marginRight: 10,
  },
  periodButtonActive: {
    backgroundColor: '#C9A84C',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  periodButtonTextActive: {
    color: 'white',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#E74C3C',
    marginTop: 12,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#C9A84C',
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  tabContent: {
    marginBottom: 20,
  },
  statsGrid: {
    marginBottom: 20,
  },
  statCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statIcon: {
    width: 50,
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1B5E35',
  },
  memberTabs: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  memberTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  memberTabActive: {
    backgroundColor: '#F0F7FF',
  },
  memberTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
    marginLeft: 6,
  },
  memberTabTextActive: {
    color: '#C9A84C',
  },
  memberCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
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
  memberPhone: {
    fontSize: 12,
    color: '#999',
  },
  memberStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 10,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statBadgeText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#1B5E35',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B5E35',
    marginBottom: 12,
    marginTop: 20,
  },
  paymentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  paymentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#27AE60',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentCardInfo: {
    flex: 1,
  },
  paymentAmount: {
    alignItems: 'flex-end',
  },
  paymentAmountText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#27AE60',
  },
  paymentCountText: {
    fontSize: 11,
    color: '#999',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
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
});

export default AttendanceReportScreen;


