import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';

const Reports = ({ navigation }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [selectedReportTab, setSelectedReportTab] = useState('attendance');

  const reportTabs = [
    { id: 'attendance', title: 'Attendance', icon: 'calendar-check' },
    { id: 'members', title: 'Members', icon: 'account-group' },
    { id: 'payment', title: 'Payment', icon: 'cash-multiple' },
  ];

  const handleDownload = (format, reportType) => {
    Alert.alert(
      'Download Report',
      `Downloading ${reportType} report as ${format.toUpperCase()}...`,
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#4A90E2" barStyle="light-content" />

      {/* Header - MembersDirectory Style */}
      <LinearGradient colors={['#4A90E2', '#87CEEB']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reports</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={() => Alert.alert('Export', 'Export all reports')}>
            <Icon name="download" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
          <View style={styles.tabContainer}>
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
          </View>
        </View>

        {/* Report Content */}
        <View style={styles.section}>
          <View style={styles.reportCard}>
            <View style={styles.reportHeader}>
              <View>
                <Text style={styles.reportTitle}>
                  {selectedReportTab === 'attendance' && 'Attendance Report'}
                  {selectedReportTab === 'members' && 'Members Report'}
                  {selectedReportTab === 'payment' && 'Payment Report'}
                </Text>
                <Text style={styles.reportSubtitle}>
                  {selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} Report
                </Text>
              </View>
              <View style={styles.reportIcon}>
                <Icon 
                  name={selectedReportTab === 'attendance' ? 'calendar-check' : selectedReportTab === 'members' ? 'account-group' : 'cash-multiple'} 
                  size={28} 
                  color="#4A90E2" 
                />
              </View>
            </View>

            {/* Report Stats */}
            <View style={styles.reportStats}>
              {selectedReportTab === 'attendance' && (
                <>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Total Members</Text>
                    <Text style={styles.statValue}>125</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Present</Text>
                    <Text style={styles.statValue}>87</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Absent</Text>
                    <Text style={styles.statValue}>38</Text>
                  </View>
                </>
              )}
              {selectedReportTab === 'members' && (
                <>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Total Members</Text>
                    <Text style={styles.statValue}>125</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Active</Text>
                    <Text style={styles.statValue}>118</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Inactive</Text>
                    <Text style={styles.statValue}>7</Text>
                  </View>
                </>
              )}
              {selectedReportTab === 'payment' && (
                <>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Total Collected</Text>
                    <Text style={styles.statValue}>₹2.45L</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Pending</Text>
                    <Text style={styles.statValue}>₹85K</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Overdue</Text>
                    <Text style={styles.statValue}>₹45K</Text>
                  </View>
                </>
              )}
            </View>

            {/* Download Buttons */}
            <View style={styles.downloadContainer}>
              <TouchableOpacity 
                style={styles.downloadButton}
                onPress={() => handleDownload('pdf', selectedReportTab)}
              >
                <Icon name="file-pdf-box" size={20} color="#FFF" />
                <Text style={styles.downloadButtonText}>Download PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.downloadButton, styles.excelButton]}
                onPress={() => handleDownload('excel', selectedReportTab)}
              >
                <Icon name="file-excel-box" size={20} color="#FFF" />
                <Text style={styles.downloadButtonText}>Download Excel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Recent Reports */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Reports</Text>
          <View style={styles.recentContainer}>
            <View style={styles.recentCard}>
              <Icon name="file-pdf-box" size={24} color="#E91E63" />
              <View style={styles.recentInfo}>
                <Text style={styles.recentName}>Attendance Report - Jan 2026</Text>
                <Text style={styles.recentDate}>Generated on Jan 6, 2026</Text>
              </View>
              <TouchableOpacity>
                <Icon name="download" size={20} color="#4A90E2" />
              </TouchableOpacity>
            </View>
            <View style={styles.recentCard}>
              <Icon name="file-excel-box" size={24} color="#4CAF50" />
              <View style={styles.recentInfo}>
                <Text style={styles.recentName}>Payment Report - Dec 2025</Text>
                <Text style={styles.recentDate}>Generated on Dec 31, 2025</Text>
              </View>
              <TouchableOpacity>
                <Icon name="download" size={20} color="#4A90E2" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

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
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
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
  tabContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#87CEEB',
    gap: 6,
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
    alignItems: 'center',
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
  recentContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#87CEEB',
    overflow: 'hidden',
  },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  recentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  recentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  recentDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
});

export default Reports;