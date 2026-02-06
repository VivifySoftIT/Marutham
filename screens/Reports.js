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
  Modal,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as XLSX from 'xlsx';
import ApiService from '../service/api';
import MemberIdService from '../service/MemberIdService';
import { useLanguage } from '../service/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';

const { width } = Dimensions.get('window');

// Graph View Component
const GraphView = ({ reportType, data, stats }) => {
  const { t } = useLanguage();

  if (!data || data.length === 0) {
    return (
      <View style={styles.graphContainer}>
        <Text style={styles.graphEmptyText}>{t('noDataAvailableForGraph')}</Text>
      </View>
    );
  }

  // Prepare data for different report types
  const getGraphData = () => {
    switch (reportType) {
      case 'attendance':
        const presentCount = data.filter(d => d.status === 'Present').length;
        const absentCount = data.filter(d => d.status === 'Absent').length;
        return {
          labels: [t('present'), t('absent')],
          values: [presentCount, absentCount],
          colors: ['#4CAF50', '#F44336'],
        };

      case 'tyfcb':
        const tyfcbByMonth = {};
        data.forEach(item => {
          const month = new Date(item.visitDate).toLocaleDateString('en-US', { month: 'short' });
          tyfcbByMonth[month] = (tyfcbByMonth[month] || 0) + 1;
        });
        return {
          labels: Object.keys(tyfcbByMonth),
          values: Object.values(tyfcbByMonth),
          colors: ['#4A90E2', '#87CEEB', '#5DADE2', '#2C5F8D'],
        };

      case 'payment':
        const paidCount = data.filter(d => d.status === 'Paid' || d.status === 'Completed').length;
        const pendingCount = data.length - paidCount;
        return {
          labels: [t('paid'), t('pending')],
          values: [paidCount, pendingCount],
          colors: ['#4CAF50', '#FF9800'],
        };

      case 'meeting':
        const completedCount = data.filter(d => d.status === 'Completed').length;
        const pendingMeetings = data.length - completedCount;
        return {
          labels: [t('completed'), t('pending')],
          values: [completedCount, pendingMeetings],
          colors: ['#4CAF50', '#FF9800'],
        };

      case 'referral':
        const confirmedCount = data.filter(d => d.status === 'Confirmed' || d.status === 'Confirm').length;
        const pendingReferrals = data.filter(d => d.status === 'Pending').length;
        const rejectedCount = data.filter(d => d.status === 'Rejected' || d.status === 'Reject').length;
        return {
          labels: [t('confirmed'), t('pending'), t('rejected')],
          values: [confirmedCount, pendingReferrals, rejectedCount],
          colors: ['#4CAF50', '#FF9800', '#F44336'],
        };

      case 'visitor':
        const becameMemberCount = data.filter(d => d.becameMember).length;
        const stillVisitor = data.length - becameMemberCount;
        return {
          labels: [t('becameMembers'), t('stillVisitors')],
          values: [becameMemberCount, stillVisitor],
          colors: ['#4CAF50', '#4A90E2'],
        };

      default:
        return {
          labels: [t('total')],
          values: [data.length],
          colors: ['#4A90E2'],
        };
    }
  };

  const graphData = getGraphData();
  const maxValue = Math.max(...graphData.values);

  return (
    <View style={styles.graphContainer}>
      <View style={styles.graphContent}>
        <Text style={styles.graphTitle}>
          {t(reportType === 'tyfcb' ? 'thanksNote' :
            reportType === 'meeting' ? 'oneToOneMeeting' :
              reportType === 'alaigalmeeting' ? 'alaigalMeeting' :
                reportType)} {t('reportGraph')}
        </Text>

        {/* Simple Bar Chart */}
        <View style={styles.barChartContainer}>
          {graphData.labels.map((label, index) => {
            const value = graphData.values[index];
            const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;

            return (
              <View key={index} style={styles.barChartItem}>
                <View style={styles.barChartLabelContainer}>
                  <Text style={styles.barChartLabel}>{label}</Text>
                  <Text style={styles.barChartValue}>{value}</Text>
                </View>
                <View style={styles.barChartBarContainer}>
                  <View
                    style={[
                      styles.barChartBar,
                      {
                        width: `${percentage}%`,
                        backgroundColor: graphData.colors[index % graphData.colors.length]
                      }
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>

        {/* Summary Stats */}
        <View style={styles.graphSummary}>
          <View style={styles.graphSummaryItem}>
            <Icon name="chart-line" size={24} color="#4A90E2" />
            <Text style={styles.graphSummaryLabel}>{t('totalRecords')}</Text>
            <Text style={styles.graphSummaryValue}>{data.length}</Text>
          </View>

          {stats && (
            <>
              {stats.stat2 && (
                <View style={styles.graphSummaryItem}>
                  <Icon name="check-circle" size={24} color="#4CAF50" />
                  <Text style={styles.graphSummaryLabel}>{stats.stat2.label}</Text>
                  <Text style={styles.graphSummaryValue}>{stats.stat2.value}</Text>
                </View>
              )}

              {stats.stat3 && (
                <View style={styles.graphSummaryItem}>
                  <Icon name="alert-circle" size={24} color="#FF9800" />
                  <Text style={styles.graphSummaryLabel}>{stats.stat3.label}</Text>
                  <Text style={styles.graphSummaryValue}>{stats.stat3.value}</Text>
                </View>
              )}
            </>
          )}
        </View>
      </View>
    </View>
  );
};

const Reports = ({ navigation }) => {
  const { t } = useLanguage();
  const [selectedPeriod, setSelectedPeriod] = useState('daily');
  const [selectedReportTab, setSelectedReportTab] = useState('attendance');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);
  const [activeMemberTab, setActiveMemberTab] = useState('present');
  const [activePaymentTab, setActivePaymentTab] = useState('paid');
  const [selectedMemberForReport, setSelectedMemberForReport] = useState(null);
  const [showMemberListModal, setShowMemberListModal] = useState(false);
  const [allMembers, setAllMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredMembers, setFilteredMembers] = useState([]);

  // View mode state - 'list' or 'graph'
  const [viewMode, setViewMode] = useState('list');

  // Date picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [datePickerMode, setDatePickerMode] = useState('from'); // 'from' or 'to'

  // Member ID state
  const [currentMemberId, setCurrentMemberId] = useState(null);

  const reportTabs = [
    { id: 'attendance', title: t('attendance'), icon: 'calendar-check', endpoint: 'attendance' },
    { id: 'tyfcb', title: t('thanksNote'), icon: 'handshake', endpoint: 'tyfcb' },
    { id: 'meeting', title: t('oneToOneMeeting'), icon: 'account-multiple', endpoint: 'meeting' },
    { id: 'alaigalmeeting', title: t('alaigalMeeting'), icon: 'calendar-account', endpoint: 'alaigalmeeting' },
    { id: 'visitor', title: t('visitor'), icon: 'account-plus', endpoint: 'visitor' },
    { id: 'payment', title: t('payment'), icon: 'cash-multiple', endpoint: 'payment' },
    { id: 'referral', title: t('referral'), icon: 'share-variant', endpoint: 'referral' },
  ];

  useEffect(() => {
    loadCurrentMemberId();
    loadAllMembers();
  }, []);

  useEffect(() => {
    if (currentMemberId) {
      fetchReportData();
    }
  }, [selectedPeriod, selectedReportTab, currentMemberId, selectedMemberForReport]);

  // Get current user's member ID using MemberIdService
  const loadCurrentMemberId = async () => {
    try {
      const memberId = await MemberIdService.getCurrentUserMemberId();
      if (memberId) {
        console.log('Reports - Member ID loaded:', memberId);
        setCurrentMemberId(memberId);
      } else {
        console.log('Reports - Could not load member ID');
      }
    } catch (error) {
      console.error('Reports - Error loading member ID:', error);
    }
  };

  // Load all members for selection
  const loadAllMembers = async () => {
    try {
      const members = await ApiService.getMembers();
      setAllMembers(members);
      setFilteredMembers(members);
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  // Handle member search
  const handleMemberSearch = (query) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredMembers(allMembers);
    } else {
      const filtered = allMembers.filter(member =>
        member.name?.toLowerCase().includes(query.toLowerCase()) ||
        member.phone?.includes(query) ||
        member.business?.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredMembers(filtered);
    }
  };

  // Handle member selection for report
  const handleMemberSelect = (member) => {
    setSelectedMemberForReport(member);
    setShowMemberListModal(false);
    setSearchQuery('');
    setFilteredMembers(allMembers);
  };

  // Clear member selection
  const clearMemberSelection = () => {
    setSelectedMemberForReport(null);
  };

  const fetchReportData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!currentMemberId) {
        console.log('Reports - No member ID available, skipping fetch');
        setLoading(false);
        return;
      }

      // For attendance report, use the new API
      if (selectedReportTab === 'attendance') {
        let attendanceData;

        if (selectedPeriod === 'custom') {
          // Use custom date range
          const formattedFromDate = fromDate.toISOString().split('T')[0];
          const formattedToDate = toDate.toISOString().split('T')[0];
          console.log('Reports - Fetching attendance with custom dates:', formattedFromDate, formattedToDate, 'Admin Member ID:', currentMemberId);
          attendanceData = await ApiService.getAttendanceWithFilters(formattedFromDate, formattedToDate, null, null, currentMemberId);
        } else {
          // Use period (daily, weekly, monthly, yearly)
          console.log('Reports - Fetching attendance with period:', selectedPeriod, 'Admin Member ID:', currentMemberId);
          attendanceData = await ApiService.getAttendanceWithFilters(null, null, selectedPeriod, null, currentMemberId);
        }

        console.log('Attendance data received:', attendanceData);
        setReportData(attendanceData);
      } else if (selectedReportTab === 'tyfcb') {
        // For ThanksNote report, use the new API with member selection
        let tyfcbData;

        if (selectedPeriod === 'custom') {
          const formattedFromDate = fromDate.toISOString().split('T')[0];
          const formattedToDate = toDate.toISOString().split('T')[0];
          console.log('Reports - Fetching ThanksNote with custom dates:', formattedFromDate, formattedToDate, 'Admin Member ID:', currentMemberId, 'Selected Member ID:', selectedMemberForReport?.id);
          tyfcbData = await ApiService.getTYFCBReport(
            formattedFromDate,
            formattedToDate,
            null,
            selectedMemberForReport?.id || null,
            currentMemberId
          );
        } else {
          console.log('Reports - Fetching ThanksNote with period:', selectedPeriod, 'Admin Member ID:', currentMemberId, 'Selected Member ID:', selectedMemberForReport?.id);
          tyfcbData = await ApiService.getTYFCBReport(
            null,
            null,
            selectedPeriod,
            selectedMemberForReport?.id || null,
            currentMemberId
          );
        }

        console.log('ThanksNote data received:', tyfcbData);
        setReportData(tyfcbData);
      } else if (selectedReportTab === 'meeting') {
        // For One-to-One Meeting report, use the new API with member selection
        let meetingData;

        if (selectedPeriod === 'custom') {
          const formattedFromDate = fromDate.toISOString().split('T')[0];
          const formattedToDate = toDate.toISOString().split('T')[0];
          console.log('Reports - Fetching One-to-One Meeting with custom dates:', formattedFromDate, formattedToDate, 'Admin Member ID:', currentMemberId, 'Selected Member ID:', selectedMemberForReport?.id);
          meetingData = await ApiService.getOneToOneMeetingReport(
            formattedFromDate,
            formattedToDate,
            null,
            selectedMemberForReport?.id || null,
            currentMemberId
          );
        } else {
          console.log('Reports - Fetching One-to-One Meeting with period:', selectedPeriod, 'Admin Member ID:', currentMemberId, 'Selected Member ID:', selectedMemberForReport?.id);
          meetingData = await ApiService.getOneToOneMeetingReport(
            null,
            null,
            selectedPeriod,
            selectedMemberForReport?.id || null,
            currentMemberId
          );
        }

        console.log('One-to-One Meeting data received:', meetingData);
        setReportData(meetingData);
      } else if (selectedReportTab === 'referral') {
        // For Referral report, use the new API with member selection
        let referralData;

        if (selectedPeriod === 'custom') {
          const formattedFromDate = fromDate.toISOString().split('T')[0];
          const formattedToDate = toDate.toISOString().split('T')[0];
          console.log('Reports - Fetching Referral with custom dates:', formattedFromDate, formattedToDate, 'Admin Member ID:', currentMemberId, 'Selected Member ID:', selectedMemberForReport?.id);
          referralData = await ApiService.getReferralReport(
            formattedFromDate,
            formattedToDate,
            null,
            selectedMemberForReport?.id || null,
            currentMemberId
          );
        } else {
          console.log('Reports - Fetching Referral with period:', selectedPeriod, 'Admin Member ID:', currentMemberId, 'Selected Member ID:', selectedMemberForReport?.id);
          referralData = await ApiService.getReferralReport(
            null,
            null,
            selectedPeriod,
            selectedMemberForReport?.id || null,
            currentMemberId
          );
        }

        console.log('Referral data received:', referralData);
        setReportData(referralData);
      } else if (selectedReportTab === 'visitor') {
        // For Visitor report, use the new API with member selection
        let visitorData;

        if (selectedPeriod === 'custom') {
          const formattedFromDate = fromDate.toISOString().split('T')[0];
          const formattedToDate = toDate.toISOString().split('T')[0];
          console.log('Reports - Fetching Visitor with custom dates:', formattedFromDate, formattedToDate, 'Admin Member ID:', currentMemberId, 'Selected Member ID:', selectedMemberForReport?.id);
          visitorData = await ApiService.getVisitorReport(
            formattedFromDate,
            formattedToDate,
            null,
            selectedMemberForReport?.id || null,
            currentMemberId
          );
        } else {
          console.log('Reports - Fetching Visitor with period:', selectedPeriod, 'Admin Member ID:', currentMemberId, 'Selected Member ID:', selectedMemberForReport?.id);
          visitorData = await ApiService.getVisitorReport(
            null,
            null,
            selectedPeriod,
            selectedMemberForReport?.id || null,
            currentMemberId
          );
        }

        console.log('Visitor data received:', visitorData);
        setReportData(visitorData);
      } else if (selectedReportTab === 'payment') {
        // For Payment report, use the new API with member selection
        let paymentData;

        if (selectedPeriod === 'custom') {
          const formattedFromDate = fromDate.toISOString().split('T')[0];
          const formattedToDate = toDate.toISOString().split('T')[0];
          console.log('Reports - Fetching Payment with custom dates:', formattedFromDate, formattedToDate, 'Admin Member ID:', currentMemberId, 'Selected Member ID:', selectedMemberForReport?.id);
          paymentData = await ApiService.getPaymentReport(
            formattedFromDate,
            formattedToDate,
            null,
            selectedMemberForReport?.id || null,
            currentMemberId
          );
        } else {
          console.log('Reports - Fetching Payment with period:', selectedPeriod, 'Admin Member ID:', currentMemberId, 'Selected Member ID:', selectedMemberForReport?.id);
          paymentData = await ApiService.getPaymentReport(
            null,
            null,
            selectedPeriod,
            selectedMemberForReport?.id || null,
            currentMemberId
          );
        }

        console.log('Payment data received:', paymentData);
        setReportData(paymentData);
      } else if (selectedReportTab === 'alaigalmeeting') {
        // For Alaigal Meeting report, use the new API with member selection
        let alaigalMeetingData;

        if (selectedPeriod === 'custom') {
          const formattedFromDate = fromDate.toISOString().split('T')[0];
          const formattedToDate = toDate.toISOString().split('T')[0];
          console.log('Reports - Fetching Alaigal Meeting with custom dates:', formattedFromDate, formattedToDate, 'Admin Member ID:', currentMemberId, 'Selected Member ID:', selectedMemberForReport?.id);
          alaigalMeetingData = await ApiService.getAlaigalMeetingReport(
            formattedFromDate,
            formattedToDate,
            null,
            selectedMemberForReport?.id || null,
            currentMemberId
          );
        } else {
          console.log('Reports - Fetching Alaigal Meeting with period:', selectedPeriod, 'Admin Member ID:', currentMemberId, 'Selected Member ID:', selectedMemberForReport?.id);
          alaigalMeetingData = await ApiService.getAlaigalMeetingReport(
            null,
            null,
            selectedPeriod,
            selectedMemberForReport?.id || null,
            currentMemberId
          );
        }

        console.log('Alaigal Meeting data received:', alaigalMeetingData);
        setReportData(alaigalMeetingData);
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
      setError(t('failedToLoadReport') || 'Failed to load report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReportData();
    setRefreshing(false);
  };

  // Period selection options
  const periodOptions = [
    { id: 'daily', title: t('daily') },
    { id: 'weekly', title: t('weekly') },
    { id: 'monthly', title: t('monthly') },
    { id: 'yearly', title: t('yearly') },
    { id: 'custom', title: t('custom') },
  ];

  // Handle custom date selection
  const handleCustomDateSelect = () => {
    setShowCustomDateModal(true);
  };

  const applyCustomDateRange = () => {
    setSelectedPeriod('custom');
    setShowCustomDateModal(false);
  };

  // Generate PDF report
  // Download report function
  const downloadReport = async (format) => {
    try {
      if (!reportData || !reportData.data || reportData.data.length === 0) {
        Alert.alert(t('error'), t('noDataToDownload'));
        return;
      }

      const timestamp = new Date().toISOString().split('T')[0];
      const reportDataArray = reportData.data;

      if (format === 'pdf') {
        await generatePDF(reportDataArray, timestamp);
      } else if (format === 'excel') {
        await generateExcel(reportDataArray, timestamp);
      }
    } catch (err) {
      console.error('Download error:', err);
      Alert.alert(t('error'), t('failedToDownloadReport') + ': ' + err.message);
    }
  };

  const generatePDF = async (reportData, timestamp) => {
    try {
      let htmlContent = '';
      const currentTab = reportTabs.find(t => t.id === selectedReportTab);

      // Generate different content based on report type
      switch (selectedReportTab) {
        case 'attendance':
          htmlContent = generateAttendancePDFContent(reportData, currentTab.title);
          break;
        case 'tyfcb':
          htmlContent = generateTYFCBPDFContent(reportData, currentTab.title);
          break;
        case 'meeting':
          htmlContent = generateMeetingPDFContent(reportData, currentTab.title);
          break;
        case 'referral':
          htmlContent = generateReferralPDFContent(reportData, currentTab.title);
          break;
        case 'payment':
          htmlContent = generatePaymentPDFContent(reportData, currentTab.title);
          break;
        case 'alaigalmeeting':
          htmlContent = generateAlaigalMeetingPDFContent(reportData, currentTab.title);
          break;
        case 'visitor':
          htmlContent = generateVisitorPDFContent(reportData, currentTab.title);
          break;
        default:
          htmlContent = generateAttendancePDFContent(reportData, currentTab.title);
      }

      // Log HTML content for debugging
      console.log('Generated HTML preview (first 500 chars):', htmlContent.substring(0, 500));

      if (!htmlContent) {
        throw new Error('Generated HTML content is empty');
      }

      // Generate PDF
      const { uri } = await Print.printToFileAsync({ html: htmlContent });

      // Share the PDF
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Share ${currentTab.title} Report`,
          UTI: 'com.adobe.pdf',
        });
        Alert.alert(t('success'), `${currentTab.title} ${t('pdfReportGeneratedSuccessfully')}`);
      } else {
        Alert.alert(t('success'), `${t('pdfSavedTo')}: ${uri}`);
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      throw error;
    }
  };

  // Generate Attendance PDF Content
  const generateAttendancePDFContent = (data, title) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${title} ${t('report')}</title>
        <style>
          body { font-family: sans-serif; padding: 20px; }
          h1 { color: #4A90E2; text-align: center; margin-bottom: 10px; }
          .report-info { text-align: center; color: #666; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #4A90E2; color: white; padding: 12px; text-align: left; font-weight: bold; }
          td { padding: 10px; border-bottom: 1px solid #ddd; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .status-present { color: #4CAF50; font-weight: bold; }
          .status-absent { color: #F44336; font-weight: bold; }
          .footer { margin-top: 30px; text-align: center; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>${title} ${t('report')}</h1>
        <div class="report-info">
          <p><strong>${t('period')}:</strong> ${selectedPeriod.toUpperCase()}</p>
          <p><strong>${t('dateRange')}:</strong> ${new Date(reportData.fromDate).toLocaleDateString()} - ${new Date(reportData.toDate).toLocaleDateString()}</p>
          <p><strong>${t('totalRecords')}:</strong> ${reportData.totalRecords}</p>
          <p><strong>${t('generated')}:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>${t('serialNumber')}</th>
              <th>${t('memberName')}</th>
              <th>${t('date')}</th>
              <th>${t('checkInTime')}</th>
              <th>${t('checkOutTime')}</th>
              <th>${t('status')}</th>
              <th>${t('batch')}</th>
              <th>${t('notes')}</th>
            </tr>
          </thead>
          <tbody>
            ${data.map((item, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${item.memberName || t('unknown')}</td>
                <td>${new Date(item.attendanceDate).toLocaleDateString()}</td>
                <td>${item.checkInTime || '-'}</td>
                <td>${item.checkOutTime || '-'}</td>
                <td class="status-${item.status?.toLowerCase()}">${item.status || '-'}</td>
                <td>${item.batch || '-'}</td>
                <td>${item.notes || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <p>Alaigal Member Management System</p>
          <p>${t('report')} ${t('generated')} ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;
  };

  // Generate ThanksNote PDF Content
  const generateTYFCBPDFContent = (data, title) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${title} ${t('report')}</title>
        <style>
          body { font-family: sans-serif; padding: 20px; }
          h1 { color: #4A90E2; text-align: center; margin-bottom: 10px; }
          .report-info { text-align: center; color: #666; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #4A90E2; color: white; padding: 12px; text-align: left; font-weight: bold; }
          td { padding: 10px; border-bottom: 1px solid #ddd; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .status-completed { color: #4CAF50; font-weight: bold; }
          .status-pending { color: #FF9800; font-weight: bold; }
          .footer { margin-top: 30px; text-align: center; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>${title} ${t('report')}</h1>
        <div class="report-info">
          <p><strong>${t('period')}:</strong> ${selectedPeriod.toUpperCase()}</p>
          <p><strong>${t('dateRange')}:</strong> ${new Date(reportData.fromDate).toLocaleDateString()} - ${new Date(reportData.toDate).toLocaleDateString()}</p>
          <p><strong>${t('totalRecords')}:</strong> ${reportData.totalRecords}</p>
          <p><strong>${t('generated')}:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>${t('serialNumber')}</th>
              <th>${t('givenBy')}</th>
              <th>${t('receivedBy')}</th>
              <th>${t('visitDate')}</th>
              <th>${t('amount')}</th>
              <th>${t('rating')}</th>
              <th>${t('businessVisited')}</th>
              <th>${t('status')}</th>
              <th>${t('notes')}</th>
            </tr>
          </thead>
          <tbody>
            ${data.map((item, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${item.givenByMemberName || t('unknown')}</td>
                <td>${item.receivedByMemberName || t('unknown')}</td>
                <td>${new Date(item.visitDate).toLocaleDateString()}</td>
                <td>₹${item.amount || 0}</td>
                <td>${item.rating || '-'}/5</td>
                <td>${item.businessVisited || '-'}</td>
                <td class="status-${item.status?.toLowerCase()}">${item.status || t('pending')}</td>
                <td>${item.notes || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <p>Alaigal Member Management System</p>
          <p>${t('report')} ${t('generated')} ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;
  };

  // Generate Meeting PDF Content
  const generateMeetingPDFContent = (data, title) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${title} Report</title>
        <style>
          body { font-family: sans-serif; padding: 20px; }
          h1 { color: #4A90E2; text-align: center; margin-bottom: 10px; }
          .report-info { text-align: center; color: #666; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #4A90E2; color: white; padding: 12px; text-align: left; font-weight: bold; }
          td { padding: 10px; border-bottom: 1px solid #ddd; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .status-completed { color: #4CAF50; font-weight: bold; }
          .status-pending { color: #FF9800; font-weight: bold; }
          .footer { margin-top: 30px; text-align: center; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>${title} Report</h1>
        <div class="report-info">
          <p><strong>Period:</strong> ${selectedPeriod.toUpperCase()}</p>
          <p><strong>Date Range:</strong> ${new Date(reportData.fromDate).toLocaleDateString()} - ${new Date(reportData.toDate).toLocaleDateString()}</p>
          <p><strong>Total Records:</strong> ${reportData.totalRecords}</p>
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>${t('serialNumber')}</th>
              <th>${t('member1Name')}</th>
              <th>${t('member2Name')}</th>
              <th>${t('meetingDate')}</th>
              <th>${t('location')}</th>
              <th>${t('duration')}</th>
              <th>${t('topic')}</th>
              <th>${t('status')}</th>
              <th>${t('notes')}</th>
            </tr>
          </thead>
          <tbody>
            ${data.map((item, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${item.member1Name || t('unknown')}</td>
                <td>${item.member2Name || t('unknown')}</td>
                <td>${new Date(item.meetingDate).toLocaleDateString()}</td>
                <td>${item.location || '-'}</td>
                <td>${item.duration || '-'} min</td>
                <td>${item.topic || '-'}</td>
                <td class="status-${item.status?.toLowerCase()}">${item.status || t('completed')}</td>
                <td>${item.notes || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <p>Alaigal Member Management System</p>
          <p>Report generated on ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;
  };

  // Generate Referral PDF Content
  const generateReferralPDFContent = (data, title) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${title} Report</title>
        <style>
          body { font-family: sans-serif; padding: 20px; }
          h1 { color: #4A90E2; text-align: center; margin-bottom: 10px; }
          .report-info { text-align: center; color: #666; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #4A90E2; color: white; padding: 12px; text-align: left; font-weight: bold; }
          td { padding: 10px; border-bottom: 1px solid #ddd; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .status-confirmed { color: #4CAF50; font-weight: bold; }
          .status-pending { color: #FF9800; font-weight: bold; }
          .status-rejected { color: #F44336; font-weight: bold; }
          .footer { margin-top: 30px; text-align: center; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>${title} Report</h1>
        <div class="report-info">
          <p><strong>Period:</strong> ${selectedPeriod.toUpperCase()}</p>
          <p><strong>Date Range:</strong> ${new Date(reportData.fromDate).toLocaleDateString()} - ${new Date(reportData.toDate).toLocaleDateString()}</p>
          <p><strong>Total Records:</strong> ${reportData.totalRecords}</p>
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>${t('serialNumber')}</th>
              <th>${t('givenBy')}</th>
              <th>${t('receivedBy')}</th>
              <th>${t('clientName')}</th>
              <th>${t('clientPhone')}</th>
              <th>${t('businessType')}</th>
              <th>${t('revenue')}</th>
              <th>${t('status')}</th>
              <th>${t('date')}</th>
            </tr>
          </thead>
          <tbody>
            ${data.map((item, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${item.givenByMemberName || t('unknown')}</td>
                <td>${item.receivedByMemberName || t('unknown')}</td>
                <td>${item.clientName || '-'}</td>
                <td>${item.clientPhone || '-'}</td>
                <td>${item.businessType || '-'}</td>
                <td>₹${item.revenue || 0}</td>
                <td class="status-${item.status?.toLowerCase()}">${item.status || t('pending')}</td>
                <td>${new Date(item.referralDate).toLocaleDateString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <p>Alaigal Member Management System</p>
          <p>Report generated on ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;
  };

  // Generate Payment PDF Content
  const generatePaymentPDFContent = (data, title) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${title} Report</title>
        <style>
          body { font-family: sans-serif; padding: 20px; }
          h1 { color: #4A90E2; text-align: center; margin-bottom: 10px; }
          .report-info { text-align: center; color: #666; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #4A90E2; color: white; padding: 12px; text-align: left; font-weight: bold; }
          td { padding: 10px; border-bottom: 1px solid #ddd; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .status-paid { color: #4CAF50; font-weight: bold; }
          .status-completed { color: #4CAF50; font-weight: bold; }
          .status-pending { color: #FF9800; font-weight: bold; }
          .status-failed { color: #F44336; font-weight: bold; }
          .footer { margin-top: 30px; text-align: center; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>${title} Report</h1>
        <div class="report-info">
          <p><strong>Period:</strong> ${selectedPeriod.toUpperCase()}</p>
          <p><strong>Date Range:</strong> ${new Date(reportData.fromDate).toLocaleDateString()} - ${new Date(reportData.toDate).toLocaleDateString()}</p>
          <p><strong>Total Records:</strong> ${reportData.totalRecords}</p>
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>${t('serialNumber')}</th>
              <th>${t('memberName')}</th>
              <th>${t('amount')}</th>
              <th>${t('paymentDate')}</th>
              <th>${t('paymentFor')}</th>
              <th>${t('paymentMethod')}</th>
              <th>${t('receiptNo')}</th>
              <th>${t('status')}</th>
              <th>${t('transactionId')}</th>
            </tr>
          </thead>
          <tbody>
            ${data.map((item, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${item.memberName || t('unknown')}</td>
                <td>₹${item.amount || 0}</td>
                <td>${new Date(item.paymentDate).toLocaleDateString()}</td>
                <td>${item.paymentForMonth || '-'}</td>
                <td>${item.paymentMethod || '-'}</td>
                <td>${item.receiptNumber || '-'}</td>
                <td class="status-${item.status?.toLowerCase()}">${item.status || t('paid')}</td>
                <td>${item.transactionId || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <p>Alaigal Member Management System</p>
          <p>Report generated on ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;
  };

  // Generate Alaigal Meeting PDF Content
  const generateAlaigalMeetingPDFContent = (data, title) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${title} Report</title>
        <style>
          body { font-family: sans-serif; padding: 20px; }
          h1 { color: #4A90E2; text-align: center; margin-bottom: 10px; }
          .report-info { text-align: center; color: #666; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #4A90E2; color: white; padding: 12px; text-align: left; font-weight: bold; }
          td { padding: 10px; border-bottom: 1px solid #ddd; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .footer { margin-top: 30px; text-align: center; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>${title} Report</h1>
        <div class="report-info">
          <p><strong>Period:</strong> ${selectedPeriod.toUpperCase()}</p>
          <p><strong>Date Range:</strong> ${new Date(reportData.fromDate).toLocaleDateString()} - ${new Date(reportData.toDate).toLocaleDateString()}</p>
          <p><strong>Total Records:</strong> ${reportData.totalRecords}</p>
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>${t('serialNumber')}</th>
              <th>${t('meetingTitle')}</th>
              <th>${t('meetingCode')}</th>
              <th>${t('date')}</th>
              <th>${t('time')}</th>
              <th>${t('type')}</th>
              <th>${t('place')}</th>
              <th>${t('contactPerson')}</th>
              <th>${t('contactNumber')}</th>
            </tr>
          </thead>
          <tbody>
            ${data.map((item, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${item.meetingTitle || item.meetingCode || 'Untitled'}</td>
                <td>${item.meetingCode || '-'}</td>
                <td>${new Date(item.meetingDate).toLocaleDateString()}</td>
                <td>${item.time || '-'}</td>
                <td>${item.meetingType || 'In-Person'}</td>
                <td>${item.place || '-'}</td>
                <td>${item.contactPersonName || '-'}</td>
                <td>${item.contactPersonNum || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <p>Alaigal Member Management System</p>
          <p>Report generated on ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;
  };

  // Generate Visitor PDF Content
  const generateVisitorPDFContent = (data, title) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${title} Report</title>
        <style>
          body { font-family: sans-serif; padding: 20px; }
          h1 { color: #4A90E2; text-align: center; margin-bottom: 10px; }
          .report-info { text-align: center; color: #666; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #4A90E2; color: white; padding: 12px; text-align: left; font-weight: bold; }
          td { padding: 10px; border-bottom: 1px solid #ddd; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .status-member { color: #4CAF50; font-weight: bold; }
          .status-visitor { color: #FF9800; font-weight: bold; }
          .footer { margin-top: 30px; text-align: center; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>${title} Report</h1>
        <div class="report-info">
          <p><strong>Period:</strong> ${selectedPeriod.toUpperCase()}</p>
          <p><strong>Date Range:</strong> ${new Date(reportData.fromDate).toLocaleDateString()} - ${new Date(reportData.toDate).toLocaleDateString()}</p>
          <p><strong>Total Records:</strong> ${reportData.totalRecords}</p>
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>${t('serialNumber')}</th>
              <th>${t('visitorName')}</th>
              <th>${t('phone')}</th>
              <th>${t('business')}</th>
              <th>${t('city')}</th>
              <th>${t('broughtBy')}</th>
              <th>${t('visitDate')}</th>
              <th>${t('status')}</th>
              <th>${t('company')}</th>
            </tr>
          </thead>
          <tbody>
            ${data.map((item, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${item.visitorName || t('unknown')}</td>
                <td>${item.visitorPhone || '-'}</td>
                <td>${item.visitorBusiness || '-'}</td>
                <td>${item.visitorCity || '-'}</td>
                <td>${item.broughtByMemberName || t('unknown')}</td>
                <td>${new Date(item.visitDate).toLocaleDateString()}</td>
                <td class="status-${item.becameMember ? 'member' : 'visitor'}">${item.becameMember ? 'Member' : 'Visitor'}</td>
                <td>${item.company || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <p>Alaigal Member Management System</p>
          <p>Report generated on ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;
  };

  const generateExcel = async (reportData, timestamp) => {
    try {
      const currentTab = reportTabs.find(t => t.id === selectedReportTab);
      let excelData = [];
      let columnWidths = [];
      let sheetName = '';
      let filename = '';

      // Generate different Excel content based on report type
      switch (selectedReportTab) {
        case 'attendance':
          excelData = generateAttendanceExcelData(reportData);
          columnWidths = [
            { wch: 6 },  // S.No
            { wch: 20 }, // Member Name
            { wch: 12 }, // Date
            { wch: 15 }, // Check-In Time
            { wch: 15 }, // Check-Out Time
            { wch: 10 }, // Status
            { wch: 10 }, // Batch
            { wch: 30 }, // Notes
          ];
          sheetName = 'Attendance Report';
          filename = `attendance_report_${timestamp}.xlsx`;
          break;

        case 'tyfcb':
          excelData = generateTYFCBExcelData(reportData);
          columnWidths = [
            { wch: 6 },  // S.No
            { wch: 20 }, // Given By
            { wch: 20 }, // Received By
            { wch: 12 }, // Visit Date
            { wch: 12 }, // Amount
            { wch: 8 },  // Rating
            { wch: 20 }, // Business Visited
            { wch: 12 }, // Status
            { wch: 30 }, // Notes
          ];
          sheetName = 'ThanksNote Report';
          filename = `thanksnote_report_${timestamp}.xlsx`;
          break;

        case 'meeting':
          excelData = generateMeetingExcelData(reportData);
          columnWidths = [
            { wch: 6 },  // S.No
            { wch: 20 }, // Member 1
            { wch: 20 }, // Member 2
            { wch: 12 }, // Meeting Date
            { wch: 15 }, // Location
            { wch: 10 }, // Duration
            { wch: 20 }, // Topic
            { wch: 12 }, // Status
            { wch: 30 }, // Notes
          ];
          sheetName = '1:1 Meeting Report';
          filename = `meeting_report_${timestamp}.xlsx`;
          break;

        case 'referral':
          excelData = generateReferralExcelData(reportData);
          columnWidths = [
            { wch: 6 },  // S.No
            { wch: 20 }, // Given By
            { wch: 20 }, // Received By
            { wch: 20 }, // Client Name
            { wch: 15 }, // Client Phone
            { wch: 20 }, // Business Type
            { wch: 12 }, // Revenue
            { wch: 12 }, // Status
            { wch: 12 }, // Date
          ];
          sheetName = 'Referral Report';
          filename = `referral_report_${timestamp}.xlsx`;
          break;

        case 'payment':
          excelData = generatePaymentExcelData(reportData);
          columnWidths = [
            { wch: 6 },  // S.No
            { wch: 20 }, // Member Name
            { wch: 12 }, // Amount
            { wch: 12 }, // Payment Date
            { wch: 15 }, // Payment For
            { wch: 15 }, // Payment Method
            { wch: 15 }, // Receipt No
            { wch: 12 }, // Status
            { wch: 20 }, // Transaction ID
          ];
          sheetName = 'Payment Report';
          filename = `payment_report_${timestamp}.xlsx`;
          break;

        case 'alaigalmeeting':
          excelData = generateAlaigalMeetingExcelData(reportData);
          columnWidths = [
            { wch: 6 },  // S.No
            { wch: 25 }, // Meeting Title
            { wch: 15 }, // Meeting Code
            { wch: 12 }, // Date
            { wch: 10 }, // Time
            { wch: 12 }, // Type
            { wch: 20 }, // Place
            { wch: 20 }, // Contact Person
            { wch: 15 }, // Contact Number
          ];
          sheetName = 'Alaigal Meeting Report';
          filename = `alaigal_meeting_report_${timestamp}.xlsx`;
          break;

        case 'visitor':
          excelData = generateVisitorExcelData(reportData);
          columnWidths = [
            { wch: 6 },  // S.No
            { wch: 20 }, // Visitor Name
            { wch: 15 }, // Phone
            { wch: 20 }, // Business
            { wch: 15 }, // City
            { wch: 20 }, // Brought By
            { wch: 12 }, // Visit Date
            { wch: 12 }, // Status
            { wch: 20 }, // Company
          ];
          sheetName = 'Visitor Report';
          filename = `visitor_report_${timestamp}.xlsx`;
          break;

        default:
          // Fallback to attendance format
          excelData = generateAttendanceExcelData(reportData);
          columnWidths = [
            { wch: 6 }, { wch: 20 }, { wch: 12 }, { wch: 15 },
            { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 30 }
          ];
          sheetName = 'Report';
          filename = `report_${timestamp}.xlsx`;
      }

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Set column widths
      ws['!cols'] = columnWidths;

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName);

      // Generate Excel file
      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const filepath = `${FileSystem.documentDirectory}${filename}`;

      // Write file
      await FileSystem.writeAsStringAsync(filepath, wbout, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Share the Excel file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filepath, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: `Share ${currentTab.title} Report`,
        });
        Alert.alert(t('success'), `${currentTab.title} ${t('excelReportGeneratedSuccessfully')}`);
      } else {
        Alert.alert(t('success'), `${t('excelFileSavedTo')}: ${filepath}`);
      }
    } catch (error) {
      console.error('Excel generation error:', error);
      throw error;
    }
  };

  // Generate Attendance Excel Data
  const generateAttendanceExcelData = (data) => {
    return data.map((item, index) => ({
      [t('serialNumber')]: index + 1,
      [t('memberName')]: item.memberName || t('unknown'),
      [t('date')]: new Date(item.attendanceDate).toLocaleDateString(),
      [t('checkInTime')]: item.checkInTime || '-',
      [t('checkOutTime')]: item.checkOutTime || '-',
      [t('status')]: item.status || '-',
      [t('batch')]: item.batch || '-',
      [t('notes')]: item.notes || '-',
    }));
  };

  // Generate ThanksNote Excel Data
  const generateTYFCBExcelData = (data) => {
    return data.map((item, index) => ({
      [t('serialNumber')]: index + 1,
      [t('givenBy')]: item.givenByMemberName || t('unknown'),
      [t('receivedBy')]: item.receivedByMemberName || t('unknown'),
      [t('visitDate')]: new Date(item.visitDate).toLocaleDateString(),
      [t('amount')]: `₹${item.amount || 0}`,
      [t('rating')]: `${item.rating || '-'}/5`,
      [t('businessVisited')]: item.businessVisited || '-',
      [t('status')]: item.status || t('pending'),
      [t('notes')]: item.notes || '-',
    }));
  };

  // Generate Meeting Excel Data
  const generateMeetingExcelData = (data) => {
    return data.map((item, index) => ({
      [t('serialNumber')]: index + 1,
      [t('member1Name')]: item.member1Name || t('unknown'),
      [t('member2Name')]: item.member2Name || t('unknown'),
      [t('meetingDate')]: new Date(item.meetingDate).toLocaleDateString(),
      [t('location')]: item.location || '-',
      [t('duration')]: item.duration ? `${item.duration} min` : '-',
      [t('topic')]: item.topic || '-',
      [t('status')]: item.status || t('completed'),
      [t('notes')]: item.notes || '-',
    }));
  };

  // Generate Referral Excel Data
  const generateReferralExcelData = (data) => {
    return data.map((item, index) => ({
      [t('serialNumber')]: index + 1,
      [t('givenBy')]: item.givenByMemberName || t('unknown'),
      [t('receivedBy')]: item.receivedByMemberName || t('unknown'),
      [t('clientName')]: item.clientName || '-',
      [t('clientPhone')]: item.clientPhone || '-',
      [t('businessType')]: item.businessType || '-',
      [t('revenue')]: `₹${item.revenue || 0}`,
      [t('status')]: item.status || t('pending'),
      [t('date')]: new Date(item.referralDate).toLocaleDateString(),
    }));
  };

  // Generate Payment Excel Data
  const generatePaymentExcelData = (data) => {
    return data.map((item, index) => ({
      [t('serialNumber')]: index + 1,
      [t('memberName')]: item.memberName || t('unknown'),
      [t('amount')]: `₹${item.amount || 0}`,
      [t('paymentDate')]: new Date(item.paymentDate).toLocaleDateString(),
      [t('paymentFor')]: item.paymentForMonth || '-',
      [t('paymentMethod')]: item.paymentMethod || '-',
      [t('receiptNo')]: item.receiptNumber || '-',
      [t('status')]: item.status || t('paid'),
      [t('transactionId')]: item.transactionId || '-',
    }));
  };

  // Generate Alaigal Meeting Excel Data
  const generateAlaigalMeetingExcelData = (data) => {
    return data.map((item, index) => ({
      [t('serialNumber')]: index + 1,
      [t('meetingTitle')]: item.meetingTitle || item.meetingCode || 'Untitled',
      [t('meetingCode')]: item.meetingCode || '-',
      [t('date')]: new Date(item.meetingDate).toLocaleDateString(),
      [t('time')]: item.time || '-',
      [t('type')]: item.meetingType || 'In-Person',
      [t('place')]: item.place || '-',
      [t('contactPerson')]: item.contactPersonName || '-',
      [t('contactNumber')]: item.contactPersonNum || '-',
    }));
  };

  // Generate Visitor Excel Data
  const generateVisitorExcelData = (data) => {
    return data.map((item, index) => ({
      [t('serialNumber')]: index + 1,
      [t('visitorName')]: item.visitorName || t('unknown'),
      [t('phone')]: item.visitorPhone || '-',
      [t('business')]: item.visitorBusiness || '-',
      [t('city')]: item.visitorCity || '-',
      [t('broughtBy')]: item.broughtByMemberName || t('unknown'),
      [t('visitDate')]: new Date(item.visitDate).toLocaleDateString(),
      [t('status')]: item.becameMember ? 'Member' : 'Visitor',
      [t('company')]: item.company || '-',
    }));
  };

  const getReportStats = () => {
    if (!reportData) return null;

    switch (selectedReportTab) {
      case 'attendance':
        // Handle the new API response structure
        const attendanceData = reportData.data || [];
        const totalRecords = reportData.totalRecords || attendanceData.length;
        const presentCount = attendanceData.filter(a => a.status === 'Present').length;
        const absentCount = attendanceData.filter(a => a.status === 'Absent').length;

        return {
          stat1: {
            label: t('totalRecords'),
            value: totalRecords
          },
          stat2: {
            label: t('present'),
            value: presentCount
          },
          stat3: {
            label: t('absent'),
            value: absentCount
          },
        };
      case 'tyfcb':
        const tyfcbData = reportData.data || [];
        const totalTYFCB = reportData.totalRecords || tyfcbData.length;
        const tyfcbTotalAmount = tyfcbData.reduce((sum, t) => sum + (t.amount || 0), 0);
        const pendingCount = tyfcbData.filter(t => t.status === 'Pending').length;

        return {
          stat1: {
            label: t('totalRecords'),
            value: totalTYFCB
          },
          stat2: {
            label: t('totalAmount'),
            value: `₹${tyfcbTotalAmount.toFixed(2)}`
          },
          stat3: {
            label: t('pending'),
            value: pendingCount
          },
        };
      case 'meeting':
        const meetingData = reportData.data || [];
        const totalMeetings = reportData.totalRecords || meetingData.length;
        const completedCount = meetingData.filter(m => m.status === 'Completed').length;
        const pendingMeetings = meetingData.filter(m => m.status === 'Pending' || m.status === 'Scheduled').length;

        return {
          stat1: {
            label: t('totalMeetings'),
            value: totalMeetings
          },
          stat2: {
            label: t('completed'),
            value: completedCount
          },
          stat3: {
            label: t('pending'),
            value: pendingMeetings
          },
        };
      case 'referral':
        const referralData = reportData.data || [];
        const totalReferrals = reportData.totalRecords || referralData.length;
        const confirmedCount = referralData.filter(r => r.status === 'Confirmed').length;
        const totalRevenue = referralData.reduce((sum, r) => sum + (r.revenue || 0), 0);

        return {
          stat1: {
            label: t('totalReferrals'),
            value: totalReferrals
          },
          stat2: {
            label: t('confirmed'),
            value: confirmedCount
          },
          stat3: {
            label: t('revenue'),
            value: `₹${totalRevenue.toFixed(2)}`
          },
        };
      case 'payment':
        const paymentData = reportData.data || [];
        const totalPayments = reportData.totalRecords || paymentData.length;
        const paymentTotalAmount = reportData.totalAmount || paymentData.reduce((sum, p) => sum + (p.amount || 0), 0);
        const paidCount = paymentData.filter(p => p.status === 'Paid' || p.status === 'Completed').length;

        return {
          stat1: {
            label: t('totalPayments'),
            value: totalPayments
          },
          stat2: {
            label: t('totalAmount'),
            value: `₹${paymentTotalAmount.toFixed(2)}`
          },
          stat3: {
            label: t('paid'),
            value: paidCount
          },
        };
      case 'alaigalmeeting':
        const alaigalMeetingData = reportData.data || [];
        const totalAlaigalMeetings = reportData.totalRecords || alaigalMeetingData.length;
        const inPersonCount = alaigalMeetingData.filter(m => m.meetingType === 'In-Person').length;
        const virtualCount = alaigalMeetingData.filter(m => m.meetingType === 'Virtual').length;

        return {
          stat1: {
            label: t('totalMeetings'),
            value: totalAlaigalMeetings
          },
          stat2: {
            label: t('inPerson'),
            value: inPersonCount
          },
          stat3: {
            label: t('virtual'),
            value: virtualCount
          },
        };
      case 'visitor':
        const visitorData = reportData.data || [];
        const totalVisitors = reportData.totalRecords || visitorData.length;
        const becameMemberCount = visitorData.filter(v => v.becameMember === true).length;
        const pendingVisitors = visitorData.filter(v => !v.becameMember).length;

        return {
          stat1: {
            label: t('totalVisitors'),
            value: totalVisitors
          },
          stat2: {
            label: t('becameMembers'),
            value: becameMemberCount
          },
          stat3: {
            label: t('pending'),
            value: pendingVisitors
          },
        };
      default:
        return {
          stat1: { label: t('total'), value: 0 },
          stat2: { label: t('active'), value: 0 },
          stat3: { label: t('inactive'), value: 0 },
        };
    }
  };

  const renderMemberItem = (attendance) => (
    <View style={styles.memberCard}>
      <View style={styles.memberHeader}>
        <Text style={styles.memberName}>{attendance.memberName || t('unknown')}</Text>
        <View style={[
          styles.statusBadge,
          attendance.status === 'Present' && styles.statusPresent,
          attendance.status === 'Absent' && styles.statusAbsent,
        ]}>
          <Text style={styles.statusText}>{attendance.status}</Text>
        </View>
      </View>
      <View style={styles.memberStats}>
        <View style={styles.statBadge}>
          <Icon name="calendar" size={14} color="#4A90E2" />
          <Text style={styles.statBadgeText}>
            {new Date(attendance.attendanceDate).toLocaleDateString()}
          </Text>
        </View>
        {attendance.checkInTime && (
          <View style={styles.statBadge}>
            <Icon name="clock-in" size={14} color="#4CAF50" />
            <Text style={styles.statBadgeText}>
              {attendance.checkInTime}
            </Text>
          </View>
        )}
        {attendance.checkOutTime && (
          <View style={styles.statBadge}>
            <Icon name="clock-out" size={14} color="#FF9800" />
            <Text style={styles.statBadgeText}>
              {attendance.checkOutTime}
            </Text>
          </View>
        )}
        {attendance.batch && (
          <View style={styles.statBadge}>
            <Icon name="tag" size={14} color="#9C27B0" />
            <Text style={styles.statBadgeText}>{attendance.batch}</Text>
          </View>
        )}
      </View>
      {attendance.notes && (
        <View style={styles.notesContainer}>
          <Icon name="note-text" size={14} color="#666" />
          <Text style={styles.notesText}>{attendance.notes}</Text>
        </View>
      )}
    </View>
  );

  const handleTYFCBStatusUpdate = async (tyfcbId, status) => {
    try {
      Alert.alert(
        `${status === 'Confirm' ? t('confirmThanksNote') : t('rejectThanksNote')}`,
        `${status === 'Confirm' ? t('areYouSureConfirm') : t('areYouSureReject')} ${t('thanksNoteRecord')}?`,
        [
          { text: t('cancel'), style: 'cancel' },
          {
            text: status === 'Confirm' ? t('confirm') : t('reject'),
            style: status === 'Reject' ? 'destructive' : 'default',
            onPress: async () => {
              try {
                setLoading(true);
                await ApiService.updateTYFCBStatus(tyfcbId, status);
                Alert.alert(t('success'), `${t('thanksNote')} ${status === 'Confirm' ? t('confirmedSuccessfully') : t('rejectedSuccessfully')}`);
                // Reload the report data
                await fetchReportData();
              } catch (error) {
                console.error(`Error ${status.toLowerCase()}ing ThanksNote:`, error);
                Alert.alert(t('error'), `${status === 'Confirm' ? t('failedToConfirm') : t('failedToReject')} ${t('thanksNote')}`);
              } finally {
                setLoading(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error in handleTYFCBStatusUpdate:', error);
    }
  };

  const handleReferralStatusUpdate = async (referralId, status) => {
    try {
      Alert.alert(
        `${status === 'Confirm' ? t('confirmReferral') : t('rejectReferral')}`,
        `${status === 'Confirm' ? t('areYouSureConfirm') : t('areYouSureReject')} ${t('referralRecord')}?`,
        [
          { text: t('cancel'), style: 'cancel' },
          {
            text: status === 'Confirm' ? t('confirm') : t('reject'),
            style: status === 'Reject' ? 'destructive' : 'default',
            onPress: async () => {
              try {
                setLoading(true);
                await ApiService.updateReferralStatus(referralId, status);
                Alert.alert(t('success'), `${t('referral')} ${status === 'Confirm' ? t('confirmedSuccessfully') : t('rejectedSuccessfully')}`);
                // Reload the report data
                await fetchReportData();
              } catch (error) {
                console.error(`Error ${status.toLowerCase()}ing referral:`, error);
                Alert.alert(t('error'), `${status === 'Confirm' ? t('failedToConfirm') : t('failedToReject')} ${t('referral')}`);
              } finally {
                setLoading(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error in handleReferralStatusUpdate:', error);
    }
  };

  const renderTYFCBItem = (tyfcb) => (
    <View style={styles.memberCard}>
      <View style={styles.memberHeader}>
        <View>
          <Text style={styles.memberName}>{tyfcb.givenByMemberName || t('unknown')}</Text>
          <Text style={styles.memberSubtext}>→ {tyfcb.receivedByMemberName || t('unknown')}</Text>
        </View>
        <View style={[
          styles.statusBadge,
          tyfcb.status === 'Pending' && styles.statusPending,
          tyfcb.status === 'Completed' && styles.statusCompleted,
          tyfcb.status === 'Confirm' && styles.statusConfirmed,
          tyfcb.status === 'Reject' && styles.statusRejected,
        ]}>
          <Text style={styles.statusText}>{tyfcb.status || 'Pending'}</Text>
        </View>
      </View>
      <View style={styles.memberStats}>
        <View style={styles.statBadge}>
          <Icon name="calendar" size={14} color="#4A90E2" />
          <Text style={styles.statBadgeText}>
            {new Date(tyfcb.visitDate).toLocaleDateString()}
          </Text>
        </View>
        {tyfcb.amount && (
          <View style={styles.statBadge}>
            <Icon name="currency-inr" size={14} color="#4CAF50" />
            <Text style={styles.statBadgeText}>₹{tyfcb.amount}</Text>
          </View>
        )}
        {tyfcb.rating && (
          <View style={styles.statBadge}>
            <Icon name="star" size={14} color="#FF9800" />
            <Text style={styles.statBadgeText}>{tyfcb.rating}/5</Text>
          </View>
        )}
        {tyfcb.businessVisited && (
          <View style={styles.statBadge}>
            <Icon name="briefcase" size={14} color="#9C27B0" />
            <Text style={styles.statBadgeText}>{tyfcb.businessVisited}</Text>
          </View>
        )}
      </View>
      {tyfcb.notes && (
        <View style={styles.notesContainer}>
          <Icon name="note-text" size={14} color="#666" />
          <Text style={styles.notesText}>{tyfcb.notes}</Text>
        </View>
      )}
    </View>
  );

  const renderOneToOneMeetingItem = (meeting) => (
    <View style={styles.memberCard}>
      <View style={styles.memberHeader}>
        <View>
          <Text style={styles.memberName}>{meeting.member1Name || t('unknown')}</Text>
          <Text style={styles.memberSubtext}>↔ {meeting.member2Name || t('unknown')}</Text>
        </View>
        <View style={[
          styles.statusBadge,
          meeting.status === 'Pending' && styles.statusPending,
          meeting.status === 'Scheduled' && styles.statusPending,
          meeting.status === 'Completed' && styles.statusCompleted,
        ]}>
          <Text style={styles.statusText}>{meeting.status || 'Completed'}</Text>
        </View>
      </View>
      <View style={styles.memberStats}>
        <View style={styles.statBadge}>
          <Icon name="calendar" size={14} color="#4A90E2" />
          <Text style={styles.statBadgeText}>
            {new Date(meeting.meetingDate).toLocaleDateString()}
          </Text>
        </View>
        {meeting.location && (
          <View style={styles.statBadge}>
            <Icon name="map-marker" size={14} color="#4CAF50" />
            <Text style={styles.statBadgeText}>{meeting.location}</Text>
          </View>
        )}
        {meeting.duration && (
          <View style={styles.statBadge}>
            <Icon name="clock-outline" size={14} color="#FF9800" />
            <Text style={styles.statBadgeText}>{meeting.duration} min</Text>
          </View>
        )}
        {meeting.topic && (
          <View style={styles.statBadge}>
            <Icon name="comment-text" size={14} color="#9C27B0" />
            <Text style={styles.statBadgeText}>{meeting.topic}</Text>
          </View>
        )}
      </View>
      {meeting.notes && (
        <View style={styles.notesContainer}>
          <Icon name="note-text" size={14} color="#666" />
          <Text style={styles.notesText}>{meeting.notes}</Text>
        </View>
      )}
      {meeting.metWith && (
        <View style={styles.notesContainer}>
          <Icon name="account-check" size={14} color="#666" />
          <Text style={styles.notesText}>{t('metWith')}: {meeting.metWith}</Text>
        </View>
      )}
    </View>
  );

  const renderReferralItem = (referral) => (
    <View style={styles.memberCard}>
      <View style={styles.memberHeader}>
        <View>
          <Text style={styles.memberName}>{referral.givenByMemberName || t('unknown')}</Text>
          <Text style={styles.memberSubtext}>→ {referral.receivedByMemberName || t('unknown')}</Text>
        </View>
        <View style={[
          styles.statusBadge,
          referral.status === 'Pending' && styles.statusPending,
          referral.status === 'Confirmed' && styles.statusCompleted,
          referral.status === 'Confirm' && styles.statusConfirmed,
          referral.status === 'Rejected' && styles.statusAbsent,
          referral.status === 'Reject' && styles.statusRejected,
        ]}>
          <Text style={styles.statusText}>{referral.status || 'Pending'}</Text>
        </View>
      </View>
      <View style={styles.memberStats}>
        <View style={styles.statBadge}>
          <Icon name="calendar" size={14} color="#4A90E2" />
          <Text style={styles.statBadgeText}>
            {new Date(referral.referralDate).toLocaleDateString()}
          </Text>
        </View>
        {referral.clientName && (
          <View style={styles.statBadge}>
            <Icon name="account" size={14} color="#4CAF50" />
            <Text style={styles.statBadgeText}>{referral.clientName}</Text>
          </View>
        )}
        {referral.clientPhone && (
          <View style={styles.statBadge}>
            <Icon name="phone" size={14} color="#FF9800" />
            <Text style={styles.statBadgeText}>{referral.clientPhone}</Text>
          </View>
        )}
        {referral.businessType && (
          <View style={styles.statBadge}>
            <Icon name="briefcase" size={14} color="#9C27B0" />
            <Text style={styles.statBadgeText}>{referral.businessType}</Text>
          </View>
        )}
        {referral.revenue && (
          <View style={styles.statBadge}>
            <Icon name="currency-inr" size={14} color="#4CAF50" />
            <Text style={styles.statBadgeText}>₹{referral.revenue}</Text>
          </View>
        )}
      </View>
      {referral.clientEmail && (
        <View style={styles.notesContainer}>
          <Icon name="email" size={14} color="#666" />
          <Text style={styles.notesText}>{referral.clientEmail}</Text>
        </View>
      )}
      {referral.notes && (
        <View style={styles.notesContainer}>
          <Icon name="note-text" size={14} color="#666" />
          <Text style={styles.notesText}>{referral.notes}</Text>
        </View>
      )}
    </View>
  );

  const renderPaymentItem = (payment) => (
    <View style={styles.memberCard}>
      <View style={styles.memberHeader}>
        <View>
          <Text style={styles.memberName}>{payment.memberName || t('unknown')}</Text>
          <Text style={styles.memberSubtext}>{payment.paymentForMonth || t('na')}</Text>
        </View>
        <View style={[
          styles.statusBadge,
          payment.status === 'Pending' && styles.statusPending,
          payment.status === 'Paid' && styles.statusCompleted,
          payment.status === 'Completed' && styles.statusCompleted,
          payment.status === 'Failed' && styles.statusAbsent,
        ]}>
          <Text style={styles.statusText}>{payment.status || 'Paid'}</Text>
        </View>
      </View>
      <View style={styles.memberStats}>
        <View style={styles.statBadge}>
          <Icon name="calendar" size={14} color="#4A90E2" />
          <Text style={styles.statBadgeText}>
            {new Date(payment.paymentDate).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.statBadge}>
          <Icon name="currency-inr" size={14} color="#4CAF50" />
          <Text style={styles.statBadgeText}>₹{payment.amount}</Text>
        </View>
        {payment.paymentMethod && (
          <View style={styles.statBadge}>
            <Icon name="credit-card" size={14} color="#FF9800" />
            <Text style={styles.statBadgeText}>{payment.paymentMethod}</Text>
          </View>
        )}
        {payment.receiptNumber && (
          <View style={styles.statBadge}>
            <Icon name="receipt" size={14} color="#9C27B0" />
            <Text style={styles.statBadgeText}>{payment.receiptNumber}</Text>
          </View>
        )}
      </View>
      {payment.transactionId && (
        <View style={styles.notesContainer}>
          <Icon name="barcode" size={14} color="#666" />
          <Text style={styles.notesText}>{t('txn')}: {payment.transactionId}</Text>
        </View>
      )}
      {payment.notes && (
        <View style={styles.notesContainer}>
          <Icon name="note-text" size={14} color="#666" />
          <Text style={styles.notesText}>{payment.notes}</Text>
        </View>
      )}
    </View>
  );

  const renderAlaigalMeetingItem = (meeting) => (
    <View style={styles.memberCard}>
      <View style={styles.memberHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.memberName}>{meeting.meetingTitle || meeting.meetingCode || t('untitled')}</Text>
          <Text style={styles.memberSubtext}>{meeting.meetingType || t('inPerson')}</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{meeting.meetingCode || t('na')}</Text>
        </View>
      </View>
      <View style={styles.memberStats}>
        <View style={styles.statBadge}>
          <Icon name="calendar" size={14} color="#4A90E2" />
          <Text style={styles.statBadgeText}>
            {new Date(meeting.meetingDate).toLocaleDateString()}
          </Text>
        </View>
        {meeting.time && (
          <View style={styles.statBadge}>
            <Icon name="clock-outline" size={14} color="#4CAF50" />
            <Text style={styles.statBadgeText}>{meeting.time}</Text>
          </View>
        )}
        {meeting.place && (
          <View style={styles.statBadge}>
            <Icon name="map-marker" size={14} color="#FF9800" />
            <Text style={styles.statBadgeText}>{meeting.place}</Text>
          </View>
        )}
        {meeting.contactPersonName && (
          <View style={styles.statBadge}>
            <Icon name="account" size={14} color="#9C27B0" />
            <Text style={styles.statBadgeText}>{meeting.contactPersonName}</Text>
          </View>
        )}
      </View>
      {meeting.contactPersonNum && (
        <View style={styles.notesContainer}>
          <Icon name="phone" size={14} color="#666" />
          <Text style={styles.notesText}>{t('contact')}: {meeting.contactPersonNum}</Text>
        </View>
      )}
      {meeting.memberDetails && (
        <View style={styles.notesContainer}>
          <Icon name="account-group" size={14} color="#666" />
          <Text style={styles.notesText}>{t('members')}: {meeting.memberDetails}</Text>
        </View>
      )}
      {meeting.description && (
        <View style={styles.notesContainer}>
          <Icon name="note-text" size={14} color="#666" />
          <Text style={styles.notesText}>{meeting.description}</Text>
        </View>
      )}
      {meeting.meetingLink && (
        <View style={styles.notesContainer}>
          <Icon name="link" size={14} color="#666" />
          <Text style={styles.notesText}>{meeting.meetingLink}</Text>
        </View>
      )}
    </View>
  );

  const renderVisitorItem = (visitor) => (
    <View style={styles.memberCard}>
      <View style={styles.memberHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.memberName}>{visitor.visitorName || t('unknownVisitor')}</Text>
          <Text style={styles.memberSubtext}>{t('broughtBy')}: {visitor.broughtByMemberName || t('unknown')}</Text>
        </View>
        <View style={[
          styles.statusBadge,
          visitor.becameMember ? styles.statusCompleted : styles.statusPending,
        ]}>
          <Text style={styles.statusText}>{visitor.becameMember ? t('member') : t('visitor')}</Text>
        </View>
      </View>
      <View style={styles.memberStats}>
        <View style={styles.statBadge}>
          <Icon name="calendar" size={14} color="#4A90E2" />
          <Text style={styles.statBadgeText}>
            {new Date(visitor.visitDate).toLocaleDateString()}
          </Text>
        </View>
        {visitor.visitorPhone && (
          <View style={styles.statBadge}>
            <Icon name="phone" size={14} color="#4CAF50" />
            <Text style={styles.statBadgeText}>{visitor.visitorPhone}</Text>
          </View>
        )}
        {visitor.visitorBusiness && (
          <View style={styles.statBadge}>
            <Icon name="briefcase" size={14} color="#FF9800" />
            <Text style={styles.statBadgeText}>{visitor.visitorBusiness}</Text>
          </View>
        )}
        {visitor.visitorCity && (
          <View style={styles.statBadge}>
            <Icon name="map-marker" size={14} color="#9C27B0" />
            <Text style={styles.statBadgeText}>{visitor.visitorCity}</Text>
          </View>
        )}
      </View>
      {visitor.visitorEmail && (
        <View style={styles.notesContainer}>
          <Icon name="email" size={14} color="#666" />
          <Text style={styles.notesText}>{visitor.visitorEmail}</Text>
        </View>
      )}
      {visitor.company && (
        <View style={styles.notesContainer}>
          <Icon name="office-building" size={14} color="#666" />
          <Text style={styles.notesText}>{t('company')}: {visitor.company}</Text>
        </View>
      )}
      {visitor.visitorAddress && (
        <View style={styles.notesContainer}>
          <Icon name="home" size={14} color="#666" />
          <Text style={styles.notesText}>{visitor.visitorAddress}</Text>
        </View>
      )}
      {visitor.notes && (
        <View style={styles.notesContainer}>
          <Icon name="note-text" size={14} color="#666" />
          <Text style={styles.notesText}>{visitor.notes}</Text>
        </View>
      )}
    </View>
  );

  const getCurrentMembersList = () => {
    if (!reportData) return [];

    switch (selectedReportTab) {
      case 'attendance':
        const attendanceData = reportData.data || [];
        if (activeMemberTab === 'present') {
          return attendanceData.filter(a => a.status === 'Present');
        } else if (activeMemberTab === 'absent') {
          return attendanceData.filter(a => a.status === 'Absent');
        } else {
          return attendanceData;
        }
      case 'tyfcb':
        return reportData.data || [];
      case 'meeting':
        return reportData.data || [];
      case 'referral':
        return reportData.data || [];
      case 'payment':
        return reportData.data || [];
      case 'alaigalmeeting':
        return reportData.data || [];
      case 'visitor':
        return reportData.data || [];
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
        <Text style={styles.headerTitle}>{t('reports')}</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Icon name="refresh" size={24} color="#FFF" />
        </TouchableOpacity>
      </LinearGradient>

      <FlatList
        data={[{ key: 'main-content' }]}
        renderItem={() => (
          <View>
            {/* Period Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('selectPeriod')}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.periodScroll}
                contentContainerStyle={{ paddingRight: 20 }}
              >
                {['daily', 'weekly', 'monthly', 'yearly', 'custom'].map((period, index) => (
                  <TouchableOpacity
                    key={period}
                    style={[
                      styles.periodButton,
                      selectedPeriod === period && styles.activePeriod,
                      index === 4 && { marginRight: 20 } // Add extra margin to last button
                    ]}
                    onPress={() => {
                      if (period === 'custom') {
                        setShowCustomDateModal(true);
                      }
                      setSelectedPeriod(period);
                    }}
                  >
                    <Text style={[
                      styles.periodText,
                      selectedPeriod === period && styles.activePeriodText
                    ]}>
                      {t(period)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {selectedPeriod === 'custom' && (
                <View style={styles.customDateDisplay}>
                  <Text style={styles.customDateText}>
                    {fromDate.toLocaleDateString()} - {toDate.toLocaleDateString()}
                  </Text>
                </View>
              )}
            </View>

            {/* Report Tabs */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('reportType')}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.tabScroll}
                contentContainerStyle={{ paddingRight: 20 }} // Ensure content has proper padding
              >
                {reportTabs.map((tab, index) => (
                  <TouchableOpacity
                    key={tab.id}
                    style={[
                      styles.tab,
                      selectedReportTab === tab.id && styles.activeTab,
                      index === reportTabs.length - 1 && { marginRight: 20 } // Add extra margin to last tab
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
                <Text style={styles.loadingText}>{t('loadingReport')}</Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Icon name="alert-circle" size={48} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={fetchReportData}
                >
                  <Text style={styles.retryButtonText}>{t('retry')}</Text>
                </TouchableOpacity>
              </View>
            ) : reportData ? (
              <>
                {/* Report Card */}
                <View style={styles.section}>
                  <View style={styles.reportCard}>
                    <View style={styles.reportHeader}>
                      <View style={styles.reportTextContainer}>
                        <Text style={styles.reportTitle}>{currentTab.title} {t('report')}</Text>
                        <Text style={styles.reportSubtitle}>
                          {t(selectedPeriod)} {t('report')}
                        </Text>
                        {reportData.fromDate && reportData.toDate && (
                          <Text style={styles.periodRange}>
                            {new Date(reportData.fromDate).toLocaleDateString()} - {new Date(reportData.toDate).toLocaleDateString()}
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
                        <Text style={styles.downloadButtonText}>{t('pdf')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.downloadButton, styles.excelButton]}
                        onPress={() => downloadReport('excel')}
                      >
                        <Icon name="file-excel-box" size={20} color="#FFF" />
                        <Text style={styles.downloadButtonText}>{t('excel')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Member Filter Tabs */}
                {selectedReportTab === 'attendance' && reportData && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('attendanceDetails')}</Text>
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
                          {t('all')} ({reportData.totalRecords || 0})
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
                          {t('present')} ({(reportData.data || []).filter(a => a.status === 'Present').length})
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
                          {t('absent')} ({(reportData.data || []).filter(a => a.status === 'Absent').length})
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Payment Member Selection */}
                {selectedReportTab === 'payment' && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('filterByMember')}</Text>
                    <TouchableOpacity
                      style={styles.memberSelectButton}
                      onPress={() => setShowMemberListModal(true)}
                    >
                      <Icon name="account-search" size={18} color="#4A90E2" />
                      <Text style={styles.memberSelectText}>
                        {selectedMemberForReport
                          ? selectedMemberForReport.name
                          : t('allMembersFilter')}
                      </Text>
                      <Icon name="chevron-right" size={18} color="#4A90E2" />
                    </TouchableOpacity>
                    {selectedMemberForReport && (
                      <TouchableOpacity
                        style={styles.clearFilterButton}
                        onPress={clearMemberSelection}
                      >
                        <Icon name="close-circle" size={16} color="#EF4444" />
                        <Text style={styles.clearFilterText}>{t('clearFilter')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* TYFCB Member Selection */}
                {selectedReportTab === 'tyfcb' && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('filterByMember')}</Text>
                    <TouchableOpacity
                      style={styles.memberSelectButton}
                      onPress={() => setShowMemberListModal(true)}
                    >
                      <Icon name="account-search" size={18} color="#4A90E2" />
                      <Text style={styles.memberSelectText}>
                        {selectedMemberForReport
                          ? selectedMemberForReport.name
                          : t('allMembersFilter')}
                      </Text>
                      <Icon name="chevron-right" size={18} color="#4A90E2" />
                    </TouchableOpacity>
                    {selectedMemberForReport && (
                      <TouchableOpacity
                        style={styles.clearFilterButton}
                        onPress={clearMemberSelection}
                      >
                        <Icon name="close-circle" size={16} color="#EF4444" />
                        <Text style={styles.clearFilterText}>{t('clearFilter')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* One-to-One Meeting Member Selection */}
                {selectedReportTab === 'meeting' && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('filterByMember')}</Text>
                    <TouchableOpacity
                      style={styles.memberSelectButton}
                      onPress={() => setShowMemberListModal(true)}
                    >
                      <Icon name="account-search" size={18} color="#4A90E2" />
                      <Text style={styles.memberSelectText}>
                        {selectedMemberForReport
                          ? selectedMemberForReport.name
                          : t('allMembersFilter')}
                      </Text>
                      <Icon name="chevron-right" size={18} color="#4A90E2" />
                    </TouchableOpacity>
                    {selectedMemberForReport && (
                      <TouchableOpacity
                        style={styles.clearFilterButton}
                        onPress={clearMemberSelection}
                      >
                        <Icon name="close-circle" size={16} color="#EF4444" />
                        <Text style={styles.clearFilterText}>{t('clearFilter')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Referral Member Selection */}
                {selectedReportTab === 'referral' && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('filterByMember')}</Text>
                    <TouchableOpacity
                      style={styles.memberSelectButton}
                      onPress={() => setShowMemberListModal(true)}
                    >
                      <Icon name="account-search" size={18} color="#4A90E2" />
                      <Text style={styles.memberSelectText}>
                        {selectedMemberForReport
                          ? selectedMemberForReport.name
                          : t('allMembersFilter')}
                      </Text>
                      <Icon name="chevron-right" size={18} color="#4A90E2" />
                    </TouchableOpacity>
                    {selectedMemberForReport && (
                      <TouchableOpacity
                        style={styles.clearFilterButton}
                        onPress={clearMemberSelection}
                      >
                        <Icon name="close-circle" size={16} color="#EF4444" />
                        <Text style={styles.clearFilterText}>{t('clearFilter')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Alaigal Meeting Member Selection */}
                {selectedReportTab === 'alaigalmeeting' && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('filterByMember')}</Text>
                    <TouchableOpacity
                      style={styles.memberSelectButton}
                      onPress={() => setShowMemberListModal(true)}
                    >
                      <Icon name="account-search" size={18} color="#4A90E2" />
                      <Text style={styles.memberSelectText}>
                        {selectedMemberForReport
                          ? selectedMemberForReport.name
                          : t('allMembersFilter')}
                      </Text>
                      <Icon name="chevron-right" size={18} color="#4A90E2" />
                    </TouchableOpacity>
                    {selectedMemberForReport && (
                      <TouchableOpacity
                        style={styles.clearFilterButton}
                        onPress={clearMemberSelection}
                      >
                        <Icon name="close-circle" size={16} color="#EF4444" />
                        <Text style={styles.clearFilterText}>{t('clearFilter')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Visitor Member Selection */}
                {selectedReportTab === 'visitor' && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('filterByMember')}</Text>
                    <TouchableOpacity
                      style={styles.memberSelectButton}
                      onPress={() => setShowMemberListModal(true)}
                    >
                      <Icon name="account-search" size={18} color="#4A90E2" />
                      <Text style={styles.memberSelectText}>
                        {selectedMemberForReport
                          ? selectedMemberForReport.name
                          : t('allMembersFilter')}
                      </Text>
                      <Icon name="chevron-right" size={18} color="#4A90E2" />
                    </TouchableOpacity>
                    {selectedMemberForReport && (
                      <TouchableOpacity
                        style={styles.clearFilterButton}
                        onPress={clearMemberSelection}
                      >
                        <Icon name="close-circle" size={16} color="#EF4444" />
                        <Text style={styles.clearFilterText}>{t('clearFilter')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Members List */}
                <View style={styles.section}>
                  <View style={styles.membersHeader}>
                    <View style={styles.membersHeaderLeft}>
                      <Text style={styles.sectionTitle}>
                        {selectedReportTab === 'attendance'
                          ? activeMemberTab === 'present' ? t('presentRecords')
                            : activeMemberTab === 'absent' ? t('absentRecords')
                              : t('allRecords')
                          : selectedReportTab === 'payment'
                            ? activePaymentTab === 'paid' ? t('paidMembers') : t('allMembers')
                            : t('records')}
                      </Text>
                      <Text style={styles.memberCount}>
                        {membersList.length} {t('recordsCount')}
                      </Text>
                    </View>

                    {/* View Toggle Button */}
                    <View style={styles.viewToggleContainer}>
                      <TouchableOpacity
                        style={[
                          styles.viewToggleButton,
                          viewMode === 'list' && styles.viewToggleButtonActive
                        ]}
                        onPress={() => setViewMode('list')}
                      >
                        <Icon
                          name="format-list-bulleted"
                          size={18}
                          color={viewMode === 'list' ? '#FFF' : '#4A90E2'}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.viewToggleButton,
                          viewMode === 'graph' && styles.viewToggleButtonActive
                        ]}
                        onPress={() => setViewMode('graph')}
                      >
                        <Icon
                          name="chart-bar"
                          size={18}
                          color={viewMode === 'graph' ? '#FFF' : '#4A90E2'}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {membersList.length > 0 ? (
                    viewMode === 'list' ? (
                      <ScrollView
                        style={styles.recordsList}
                        contentContainerStyle={styles.recordsListContent}
                        showsVerticalScrollIndicator={true}
                        nestedScrollEnabled={true}
                      >
                        {membersList.map((item, index) => {
                          let renderedItem;
                          if (selectedReportTab === 'tyfcb') {
                            renderedItem = renderTYFCBItem(item);
                          } else if (selectedReportTab === 'meeting') {
                            renderedItem = renderOneToOneMeetingItem(item);
                          } else if (selectedReportTab === 'referral') {
                            renderedItem = renderReferralItem(item);
                          } else if (selectedReportTab === 'payment') {
                            renderedItem = renderPaymentItem(item);
                          } else if (selectedReportTab === 'alaigalmeeting') {
                            renderedItem = renderAlaigalMeetingItem(item);
                          } else if (selectedReportTab === 'visitor') {
                            renderedItem = renderVisitorItem(item);
                          } else {
                            renderedItem = renderMemberItem(item);
                          }

                          return (
                            <View key={item.id?.toString() || index.toString()}>
                              {renderedItem}
                            </View>
                          );
                        })}
                      </ScrollView>
                    ) : (
                      <GraphView
                        reportType={selectedReportTab}
                        data={membersList}
                        stats={stats}
                      />
                    )
                  ) : (
                    <View style={styles.emptyContainer}>
                      <Icon name="clipboard-text-off" size={48} color="#CCC" />
                      <Text style={styles.emptyText}>{t('noRecordsFound')}</Text>
                    </View>
                  )}
                </View>
              </>
            ) : (
              <View style={styles.noDataContainer}>
                <Icon name="clipboard-text-outline" size={48} color="#CCC" />
                <Text style={styles.noDataText}>{t('noReportDataAvailable')}</Text>
                <Text style={styles.noDataSubtext}>
                  {t('selectPeriodAndReportType')}
                </Text>
              </View>
            )}

            <View style={{ height: 20 }} />
          </View>
        )}
        keyExtractor={(item) => item.key}
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
      />

      {/* Custom Date Range Modal */}
      <Modal
        visible={showCustomDateModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCustomDateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('selectDateRange')}</Text>
              <TouchableOpacity onPress={() => setShowCustomDateModal(false)}>
                <Icon name="close" size={24} color="#4A90E2" />
              </TouchableOpacity>
            </View>

            <View style={styles.dateInputGroup}>
              <Text style={styles.dateLabel}>{t('fromDate')}</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => {
                  setDatePickerMode('from');
                  setShowDatePicker(true);
                }}
              >
                <Icon name="calendar" size={18} color="#4A90E2" />
                <Text style={styles.dateInputText}>{fromDate.toLocaleDateString()}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dateInputGroup}>
              <Text style={styles.dateLabel}>{t('toDate')}</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => {
                  setDatePickerMode('to');
                  setShowDatePicker(true);
                }}
              >
                <Icon name="calendar" size={18} color="#4A90E2" />
                <Text style={styles.dateInputText}>{toDate.toLocaleDateString()}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => {
                setShowCustomDateModal(false);
                if (currentMemberId) {
                  fetchReportData();
                }
              }}
            >
              <Text style={styles.applyButtonText}>{t('apply')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={datePickerMode === 'from' ? fromDate : toDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              if (datePickerMode === 'from') {
                setFromDate(selectedDate);
              } else {
                setToDate(selectedDate);
              }
            }
          }}
          maximumDate={new Date()}
        />
      )}

      {/* Member Selection Modal for TYFCB */}
      <Modal
        visible={showMemberListModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMemberListModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('selectMember')}</Text>
              <TouchableOpacity onPress={() => setShowMemberListModal(false)}>
                <Icon name="close" size={24} color="#4A90E2" />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
              <Icon name="magnify" size={18} color="#999" />
              <TextInput
                style={styles.searchInput}
                placeholder={t('searchMembers')}
                value={searchQuery}
                onChangeText={handleMemberSearch}
                placeholderTextColor="#999"
              />
              {searchQuery !== '' && (
                <TouchableOpacity onPress={() => handleMemberSearch('')}>
                  <Icon name="close" size={18} color="#999" />
                </TouchableOpacity>
              )}
            </View>

            {/* Members List */}
            <ScrollView style={styles.memberSelectList}>
              {filteredMembers.map((item) => (
                <TouchableOpacity
                  key={item.id.toString()}
                  style={[
                    styles.memberSelectItem,
                    selectedMemberForReport?.id === item.id && styles.memberSelectItemActive
                  ]}
                  onPress={() => handleMemberSelect(item)}
                >
                  <View style={styles.memberSelectInfo}>
                    <Text style={styles.memberSelectName}>{item.name}</Text>
                    <Text style={styles.memberSelectDetails}>
                      {item.business} • {item.phone}
                    </Text>
                  </View>
                  {selectedMemberForReport?.id === item.id && (
                    <Icon name="check-circle" size={20} color="#4A90E2" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  periodScroll: {
    marginHorizontal: -15,
    paddingHorizontal: 15,
  },
  periodButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FFF',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#87CEEB',
    marginRight: 8,
    minWidth: 80,
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
    paddingRight: 30, // Add extra padding to the right to prevent cutoff
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
    alignItems: 'center',
    marginBottom: 15,
  },
  reportTextContainer: {
    flex: 1,
    marginRight: 15,
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
    minHeight: 80,
    alignItems: 'flex-start',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 4,
    minHeight: 60,
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
    textAlign: 'center',
    lineHeight: 14,
    flexWrap: 'wrap',
    maxWidth: '100%',
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
  membersHeaderLeft: {
    flex: 1,
  },
  viewToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F9FC',
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  viewToggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginHorizontal: 2,
  },
  viewToggleButtonActive: {
    backgroundColor: '#4A90E2',
  },
  memberCount: {
    fontSize: 12,
    color: '#999',
  },
  membersList: {
    maxHeight: 600,
  },
  membersListContainer: {
    paddingBottom: 10,
  },
  recordsList: {
    maxHeight: 400, // Fixed height for records scrolling container
    backgroundColor: '#F5F9FC',
    borderRadius: 8,
    marginTop: 10,
  },
  recordsListContent: {
    paddingBottom: 10,
  },
  membersListContent: {
    paddingBottom: 10,
  },
  graphContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    marginTop: 10,
  },
  graphContent: {
    paddingBottom: 20,
  },
  graphTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
    marginBottom: 20,
    textAlign: 'center',
  },
  graphEmptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 40,
  },
  barChartContainer: {
    marginBottom: 20,
  },
  barChartItem: {
    marginBottom: 15,
  },
  barChartLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  barChartLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  barChartValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  barChartBarContainer: {
    height: 30,
    backgroundColor: '#F5F9FC',
    borderRadius: 6,
    overflow: 'hidden',
  },
  barChartBar: {
    height: '100%',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  graphSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  graphSummaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  graphSummaryLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 6,
    textAlign: 'center',
  },
  graphSummaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginTop: 4,
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
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#E0E0E0',
  },
  statusPresent: {
    backgroundColor: '#E8F5E9',
  },
  statusAbsent: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 6,
  },
  notesText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
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
  customDateDisplay: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    alignItems: 'center',
  },
  customDateText: {
    fontSize: 13,
    color: '#4A90E2',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#FFF',
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 15,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#4A90E2',
    marginRight: 10,
  },
  dateInputGroup: {
    marginBottom: 15,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F9FC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#87CEEB',
    gap: 10,
  },
  dateInputText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  applyButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  applyButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  memberSelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#87CEEB',
  },
  memberSelectText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  clearFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingVertical: 8,
  },
  clearFilterText: {
    marginLeft: 4,
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#87CEEB',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 14,
    color: '#333',
  },
  memberSelectList: {
    flex: 1,
  },
  memberSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  memberSelectItemActive: {
    backgroundColor: '#E3F2FD',
    borderColor: '#4A90E2',
    borderWidth: 2,
  },
  memberSelectInfo: {
    flex: 1,
  },
  memberSelectName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C5F8D',
    marginBottom: 4,
  },
  memberSelectDetails: {
    fontSize: 12,
    color: '#666',
  },
  memberSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statusPending: {
    backgroundColor: '#FFF3E0',
  },
  statusCompleted: {
    backgroundColor: '#E8F5E9',
  },
  statusConfirmed: {
    backgroundColor: '#E8F5E9',
  },
  statusRejected: {
    backgroundColor: '#FFEBEE',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
});


export default Reports;