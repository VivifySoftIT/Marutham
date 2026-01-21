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
  Dimensions,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const { width } = Dimensions.get('window');

const Reports = ({ navigation }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [selectedReportTab, setSelectedReportTab] = useState('attendance');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);
  const [activeMemberTab, setActiveMemberTab] = useState('present'); // 'present' or 'absent' or 'all'
  const [activePaymentTab, setActivePaymentTab] = useState('paid'); // 'paid' or 'all'

  const reportTabs = [
    { id: 'attendance', title: 'Attendance', icon: 'calendar-check', endpoint: 'attendance' },
    { id: 'tyfcb', title: 'TYFCB', icon: 'handshake', endpoint: 'tyfcb' },
    { id: 'meeting', title: '1:1 Meeting', icon: 'account-multiple', endpoint: 'meeting' },
    { id: 'visitor', title: 'Visitor', icon: 'account-plus', endpoint: 'visitor' },
    { id: 'payment', title: 'Payment', icon: 'cash-multiple', endpoint: 'payment' },
    { id: 'referral', title: 'Referral', icon: 'share-variant', endpoint: 'referral' },
  ];

  useEffect(() => {
    fetchReportData();
  }, [selectedPeriod, selectedReportTab]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      setError(null);

      let apiUrl = '';

      // Use the correct endpoint based on report type
      if (selectedReportTab === 'attendance') {
        apiUrl = `https://www.vivifysoft.in/AlaigalBE/api/Inventory/reports/attendance?period=${selectedPeriod}`;
      } else {
        // For other reports, use a generic endpoint (you'll need to create these on backend)
        apiUrl = `https://www.vivifysoft.in/AlaigalBE/api/Inventory/reports/${selectedReportTab}?period=${selectedPeriod}`;
      }

      console.log('Fetching report:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
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
      Alert.alert('Error', 'Failed to load report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReportData();
    setRefreshing(false);
  };

  const downloadReport = async (format) => {
    try {
      if (!reportData) {
        Alert.alert('Error', 'No data to download');
        return;
      }

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${selectedReportTab}_report_${timestamp}.${format}`;
      const filepath = `${FileSystem.documentDirectory}${filename}`;

      let content = '';

      if (format === 'pdf') {
        content = generatePDFContent();
      } else if (format === 'excel') {
        content = generateExcelContent();
      }

      await FileSystem.writeAsStringAsync(filepath, content);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filepath, {
          mimeType: format === 'pdf' ? 'application/pdf' : 'application/vnd.ms-excel',
          dialogTitle: `Share ${selectedReportTab} Report`,
        });
      } else {
        Alert.alert('Success', `Report saved to: ${filepath}`);
      }
    } catch (err) {
      console.error('Download error:', err);
      Alert.alert('Error', 'Failed to download report');
    }
  };

  const generatePDFContent = () => {
    const tab = reportTabs.find(t => t.id === selectedReportTab);
    let content = `${tab.title} Report - ${selectedPeriod.toUpperCase()}\n`;
    content += `Generated: ${new Date().toLocaleString()}\n\n`;
    content += JSON.stringify(reportData, null, 2);
    return content;
  };

  const generateExcelContent = () => {
    const tab = reportTabs.find(t => t.id === selectedReportTab);
    let content = `${tab.title} Report - ${selectedPeriod.toUpperCase()}\n`;
    content += `Generated: ${new Date().toLocaleString()}\n\n`;
    content += JSON.stringify(reportData, null, 2);
    return content;
  };

  const getReportStats = () => {
    if (!reportData) return null;

    switch (selectedReportTab) {
      case 'attendance':
        return {
          stat1: { 
            label: 'Total Members', 
            value: reportData.attendance?.totalMembers || 0 
          },
          stat2: { 
            label: 'Present', 
            value: reportData.attendance?.presentCount || 0 
          },
          stat3: { 
            label: 'Absent', 
            value: reportData.attendance?.absentCount || 0 
          },
        };
      case 'payment':
        return {
          stat1: { 
            label: 'Total Collected', 
            value: `₹${reportData.payments?.totalAmountCollected || 0}` 
          },
          stat2: { 
            label: 'Paid Members', 
            value: reportData.payments?.totalPaidMembers || 0 
          },
          stat3: { 
            label: 'Total Members', 
            value: reportData.members?.allMembers?.length || 0 
          },
        };
      default:
        return {
          stat1: { label: 'Total', value: 0 },
          stat2: { label: 'Active', value: 0 },
          stat3: { label: 'Inactive', value: 0 },
        };
    }
  };

  const renderMemberItem = (member) => (
    <View style={styles.memberCard}>
      <View style={styles.memberHeader}>
        <Text style={styles.memberName}>{member.name}</Text>
        <Text style={styles.memberPhone}>{member.phone}</Text>
      </View>
      <View style={styles.memberStats}>
        <View style={styles.statBadge}>
          <Icon name="account-group" size={14} color="#4A90E2" />
          <Text style={styles.statBadgeText}>{member.visitorsBrought || 0}</Text>
        </View>
        <View style={styles.statBadge}>
          <Icon name="handshake" size={14} color="#4CAF50" />
          <Text style={styles.statBadgeText}>
            {member.tyfcbGiven || 0}/{member.tyfcbReceived || 0}
          </Text>
        </View>
        <View style={styles.statBadge}>
          <Icon name="share-variant" size={14} color="#FF9800" />
          <Text style={styles.statBadgeText}>
            {member.referralsGiven || 0}/{member.referralsReceived || 0}
          </Text>
        </View>
        {selectedReportTab === 'attendance' && member.lastVisitDate && (
          <View style={styles.statBadge}>
            <Icon name="calendar-clock" size={14} color="#E91E63" />
            <Text style={styles.statBadgeText}>
              {new Date(member.lastVisitDate).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>
      {selectedReportTab === 'payment' && member.paymentsThisMonth > 0 && (
        <View style={styles.paymentInfo}>
          <Icon name="cash-check" size={16} color="#4CAF50" />
          <Text style={styles.paymentText}>
            ₹{member.totalAmountPaidThisMonth || 0} ({member.paymentsThisMonth || 0} payments)
          </Text>
        </View>
      )}
    </View>
  );

  const getCurrentMembersList = () => {
    if (!reportData) return [];

    switch (selectedReportTab) {
      case 'attendance':
        if (activeMemberTab === 'present') {
          return reportData.attendance?.presentMembers || [];
        } else if (activeMemberTab === 'absent') {
          return reportData.attendance?.absentMembers || [];
        } else {
          return reportData.members?.allMembers || [];
        }
      case 'payment':
        if (activePaymentTab === 'paid') {
          return reportData.payments?.paidMembers || [];
        } else {
          return reportData.members?.allMembers || [];
        }
      default:
        return reportData.members?.allMembers || [];
    }
  };

  const stats = getReportStats();
  const currentTab = reportTabs.find(t => t.id === selectedReportTab);
  const membersList = getCurrentMembersList();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#4A90E2" barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#4A90E2', '#87CEEB']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reports</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Icon name="refresh" size={24} color="#FFF" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#4A90E2"
            colors={['#4A90E2']}
          />
        }
      >
        {/* Period Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Period</Text>
          <View style={styles.periodContainer}>
            {['daily', 'weekly', 'monthly', 'yearly'].map(period => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.periodButton,
                  selectedPeriod === period && styles.activePeriod
                ]}
                onPress={() => setSelectedPeriod(period)}
              >
                <Text style={[
                  styles.periodText,
                  selectedPeriod === period && styles.activePeriodText
                ]}>
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Report Tabs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Report Type</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.tabScroll}
          >
            {reportTabs.map(tab => (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tab,
                  selectedReportTab === tab.id && styles.activeTab
                ]}
                onPress={() => setSelectedReportTab(tab.id)}
              >
                <Icon 
                  name={tab.icon} 
                  size={18} 
                  color={selectedReportTab === tab.id ? '#FFF' : '#4A90E2'} 
                />
                <Text style={[
                  styles.tabText,
                  selectedReportTab === tab.id && styles.activeTabText
                ]}>
                  {tab.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Loading State */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={styles.loadingText}>Loading report...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Icon name="alert-circle" size={48} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={fetchReportData}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : reportData ? (
          <>
            {/* Report Card */}
            <View style={styles.section}>
              <View style={styles.reportCard}>
                <View style={styles.reportHeader}>
                  <View>
                    <Text style={styles.reportTitle}>{currentTab.title} Report</Text>
                    <Text style={styles.reportSubtitle}>
                      {selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} Report
                    </Text>
                    {reportData.attendance?.period && (
                      <Text style={styles.periodRange}>
                        {new Date(reportData.attendance.startDate).toLocaleDateString()} - 
                        {new Date(reportData.attendance.endDate).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                  <View style={styles.reportIcon}>
                    <Icon 
                      name={currentTab.icon} 
                      size={28} 
                      color="#4A90E2" 
                    />
                  </View>
                </View>

                {/* Report Stats */}
                {stats && (
                  <View style={styles.reportStats}>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>{stats.stat1.label}</Text>
                      <Text style={styles.statValue}>{stats.stat1.value}</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>{stats.stat2.label}</Text>
                      <Text style={styles.statValue}>{stats.stat2.value}</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>{stats.stat3.label}</Text>
                      <Text style={styles.statValue}>{stats.stat3.value}</Text>
                    </View>
                  </View>
                )}

                {/* Download Buttons */}
                <View style={styles.downloadContainer}>
                  <TouchableOpacity 
                    style={styles.downloadButton}
                    onPress={() => downloadReport('pdf')}
                  >
                    <Icon name="file-pdf-box" size={20} color="#FFF" />
                    <Text style={styles.downloadButtonText}>PDF</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.downloadButton, styles.excelButton]}
                    onPress={() => downloadReport('excel')}
                  >
                    <Icon name="file-excel-box" size={20} color="#FFF" />
                    <Text style={styles.downloadButtonText}>Excel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Member Filter Tabs */}
            {selectedReportTab === 'attendance' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Attendance Details</Text>
                <View style={styles.filterTabs}>
                  <TouchableOpacity
                    style={[
                      styles.filterTab,
                      activeMemberTab === 'all' && styles.activeFilterTab
                    ]}
                    onPress={() => setActiveMemberTab('all')}
                  >
                    <Text style={[
                      styles.filterTabText,
                      activeMemberTab === 'all' && styles.activeFilterTabText
                    ]}>
                      All ({reportData.members?.allMembers?.length || 0})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.filterTab,
                      activeMemberTab === 'present' && styles.activeFilterTab
                    ]}
                    onPress={() => setActiveMemberTab('present')}
                  >
                    <Text style={[
                      styles.filterTabText,
                      activeMemberTab === 'present' && styles.activeFilterTabText
                    ]}>
                      Present ({reportData.attendance?.presentCount || 0})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.filterTab,
                      activeMemberTab === 'absent' && styles.activeFilterTab
                    ]}
                    onPress={() => setActiveMemberTab('absent')}
                  >
                    <Text style={[
                      styles.filterTabText,
                      activeMemberTab === 'absent' && styles.activeFilterTabText
                    ]}>
                      Absent ({reportData.attendance?.absentCount || 0})
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Payment Filter Tabs */}
            {selectedReportTab === 'payment' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Payment Details</Text>
                <View style={styles.filterTabs}>
                  <TouchableOpacity
                    style={[
                      styles.filterTab,
                      activePaymentTab === 'all' && styles.activeFilterTab
                    ]}
                    onPress={() => setActivePaymentTab('all')}
                  >
                    <Text style={[
                      styles.filterTabText,
                      activePaymentTab === 'all' && styles.activeFilterTabText
                    ]}>
                      All ({reportData.members?.allMembers?.length || 0})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.filterTab,
                      activePaymentTab === 'paid' && styles.activeFilterTab
                    ]}
                    onPress={() => setActivePaymentTab('paid')}
                  >
                    <Text style={[
                      styles.filterTabText,
                      activePaymentTab === 'paid' && styles.activeFilterTabText
                    ]}>
                      Paid ({reportData.payments?.totalPaidMembers || 0})
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Members List */}
            <View style={styles.section}>
              <View style={styles.membersHeader}>
                <Text style={styles.sectionTitle}>
                  {selectedReportTab === 'attendance' 
                    ? activeMemberTab === 'present' ? 'Present Members' 
                      : activeMemberTab === 'absent' ? 'Absent Members' 
                      : 'All Members'
                    : selectedReportTab === 'payment'
                    ? activePaymentTab === 'paid' ? 'Paid Members' : 'All Members'
                    : 'Members'}
                </Text>
                <Text style={styles.memberCount}>
                  {membersList.length} members
                </Text>
              </View>
              
              {membersList.length > 0 ? (
                <FlatList
                  data={membersList}
                  renderItem={({ item }) => renderMemberItem(item)}
                  keyExtractor={(item) => item.id.toString()}
                  scrollEnabled={false}
                  style={styles.membersList}
                />
              ) : (
                <View style={styles.emptyContainer}>
                  <Icon name="account-off" size={48} color="#CCC" />
                  <Text style={styles.emptyText}>No members found</Text>
                </View>
              )}
            </View>
          </>
        ) : (
          <View style={styles.noDataContainer}>
            <Icon name="clipboard-text-outline" size={48} color="#CCC" />
            <Text style={styles.noDataText}>No report data available</Text>
            <Text style={styles.noDataSubtext}>
              Select a period and report type to generate report
            </Text>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
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
    textAlign: 'center',
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginBottom: 12,
  },
  periodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#FFF',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#87CEEB',
  },
  activePeriod: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  periodText: {
    fontSize: 13,
    color: '#4A90E2',
    fontWeight: '500',
  },
  activePeriodText: {
    color: '#FFF',
    fontWeight: '600',
  },
  tabScroll: {
    marginHorizontal: -15,
    paddingHorizontal: 15,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#87CEEB',
    gap: 6,
    marginRight: 8,
  },
  activeTab: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  tabText: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#FFF',
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#4A90E2',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  reportCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#87CEEB',
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  reportSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  periodRange: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  reportIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 15,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  downloadContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  downloadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E91E63',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  excelButton: {
    backgroundColor: '#4CAF50',
  },
  downloadButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 4,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeFilterTab: {
    backgroundColor: '#4A90E2',
  },
  filterTabText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  activeFilterTabText: {
    color: '#FFF',
    fontWeight: '600',
  },
  membersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  memberCount: {
    fontSize: 12,
    color: '#999',
  },
  membersList: {
    maxHeight: 400,
  },
  memberCard: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  memberPhone: {
    fontSize: 12,
    color: '#666',
  },
  memberStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F9FC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statBadgeText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 6,
  },
  paymentText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#999',
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  noDataText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  noDataSubtext: {
    marginTop: 4,
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});

export default Reports;