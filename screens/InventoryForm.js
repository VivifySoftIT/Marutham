import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  ScrollView,
  BackHandler,
  Modal,
  Pressable,
  Image,
  FlatList
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import axios from 'axios';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Animatable from 'react-native-animatable';
import API_BASE_URL from '../apiConfig';
import { useRoute } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Linking } from "react-native";

const InventoryForm = ({ navigation }) => {
  const [greeting, setGreeting] = useState('');
  const [emoji, setEmoji] = useState('');
  const [quote, setQuote] = useState('');
  const route = useRoute();
  const { attendanceStatus = 'Not Checked In', attendanceResult = false, attendanceMessage = '' } = route.params || {};
  const [status, setStatus] = useState(attendanceStatus);
  const [incidentData, setIncidentData] = useState([]);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [employeeDetails, setEmployeeDetails] = useState({ name: '', designation: '' });
  const [summaryData, setSummaryData] = useState({
    attendanceStatus: 'Not Available',
    trainingStatus: 'Not Started',
    score: 0,
    visit: 0,
  });
  const [isFetching, setIsFetching] = useState(false);
  const [displayInfo, setDisplayInfo] = useState([]);
  const [checkedItems, setCheckedItems] = useState({});
  const [showMonthFilter, setShowMonthFilter] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('All'); // 'All' or 'Jan', 'Feb', etc.

  // ✅ DUMMY MEMBERS DATA (NO API)
  const membersData = [
    {
      id: 1,
      name: "Rahul Sharma",
      mobile: "9876543210",
      joiningDate: "15 Jan 2025",
      attendance: "Present",
      feesStatus: "Paid",
      lastPayment: "01 Jun 2025",
    },
    {
      id: 2,
      name: "Priya Patel",
      mobile: "8765432109",
      joiningDate: "22 Mar 2025",
      attendance: "Absent",
      feesStatus: "Unpaid",
      lastPayment: "N/A",
    },
    {
      id: 3,
      name: "Amit Verma",
      mobile: "7654321098",
      joiningDate: "10 May 2025",
      attendance: "Present",
      feesStatus: "Paid",
      lastPayment: "28 May 2025",
    },
    {
      id: 4,
      name: "Sneha Gupta",
      mobile: "9988776655",
      joiningDate: "03 Apr 2025",
      attendance: "On Leave",
      feesStatus: "Partial",
      lastPayment: "15 May 2025",
    },
    {
      id: 5,
      name: "Vikram Singh",
      mobile: "8877665544",
      joiningDate: "12 Jan 2025",
      attendance: "Present",
      feesStatus: "Unpaid",
      lastPayment: "N/A",
    },
    {
      id: 6,
      name: "Anjali Mehta",
      mobile: "7766554433",
      joiningDate: "30 Jun 2025",
      attendance: "Absent",
      feesStatus: "Paid",
      lastPayment: "10 Jun 2025",
    },
  ];

  // Fetch near miss incident data
  const fetchNearMissData = async () => {
    try {
      const token = await AsyncStorage.getItem('jwt_token');
      if (!token) return;

      const response = await axios.get(`${API_BASE_URL}/api/Safety/GetNearMissPopupMessages`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 200 && Array.isArray(response.data?.result)) {
        const mappedData = response.data.result.map(item => ({
          id: item.id,
          typeOfHazardName: item.typeOfHazardName || '',
          remarks: item.remarks || '',
          attachment: item.attachment || '',
          actionDesc: item.actionDesc || '',
          date: item.date || ''
        }));
        setIncidentData(mappedData);
        if (mappedData.length > 0) setShowIncidentModal(true);
      }
    } catch (error) {
      console.error("Error fetching near miss data:", error);
    }
  };



  const handleOpenAttachment = async (fileUrl) => {
    if (!fileUrl) return;
    const isImage = fileUrl.match(/\.(jpeg|jpg|png|gif)$/i);
    if (isImage) {
      setSelectedAttachment(fileUrl);
    } else {
      try {
        await Linking.openURL(fileUrl);
      } catch (err) {
        Alert.alert("Error", "Cannot open this file type.");
      }
    }
  };

  useEffect(() => {
    const currentHour = new Date().getHours();
    if (currentHour < 12) {
      setGreeting('Good Morning');
      setEmoji('☀️');
      setQuote('Have a good day with full of productivity and good vibes!');
    } else if (currentHour < 18) {
      setGreeting('Good Afternoon');
      setEmoji('🌤️');
      setQuote('Keep going strong! The day is yours to conquer.');
    } else {
      setGreeting('Good Evening');
      setEmoji('🌙');
      setQuote('Unwind and reflect on a productive day.');
    }
    fetchDashboardData();
    fetchNearMissData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const backAction = () => {
        Alert.alert("Logout", "Are you sure you want to Exit?", [
          { text: "Cancel", onPress: () => null, style: "cancel" },
          {
            text: "OK",
            onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Login' }] }),
          },
        ]);
        return true;
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', backAction);
      return () => subscription.remove();
    }, [navigation])
  );

  const fetchDashboardData = async () => {
    try {
      setIsFetching(true);
      const API_TOKEN = await AsyncStorage.getItem('jwt_token');
      if (!API_TOKEN) {
        Alert.alert('Error', 'Token not found! Please log in again.');
        return;
      }

      const dashboardResponse = await axios.get(`${API_BASE_URL}/api/Dashboard/GetDashboardInfo`, {
        headers: { Authorization: `Bearer ${API_TOKEN}` },
      });

      if (dashboardResponse.status === 200 && dashboardResponse.data?.result) {
        const {
          name,
          designation,
          attendanceStatus,
          trainingStatus,
          displayInfo,
          score,
          visit,
        } = dashboardResponse.data.result;

        setEmployeeDetails({ name: name || '', designation: designation || '' });
        setSummaryData({
          attendanceStatus: attendanceStatus || 'Not Available',
          trainingStatus: trainingStatus || 'Not Started',
          score: score || 0,
          visit: visit || 0,
        });
        setDisplayInfo(displayInfo || []);
      }
    } catch (error) {
      console.error('Fetch Error:', error);
      Alert.alert('Error', 'An error occurred while fetching data.');
    } finally {
      setIsFetching(false);
    }
  };

  // ✅ CALCULATE MEMBER STATS
  const memberStats = useMemo(() => {
    const total = membersData.length;
    const present = membersData.filter(m => m.attendance === 'Present').length;
    const unpaid = membersData.filter(m => m.feesStatus === 'Unpaid').length;
    return { total, present, unpaid };
  }, [membersData]);

  // ✅ FILTER MEMBERS BY MONTH
  const filteredMembers = useMemo(() => {
    if (selectedMonth === 'All') return membersData;
    
    return membersData.filter(member => {
      const dateParts = member.joiningDate.split(' ');
      const monthName = dateParts[1]; // e.g., "Jan", "Feb"
      return monthName === selectedMonth;
    });
  }, [membersData, selectedMonth]);

  // ✅ MONTH OPTIONS
  const monthOptions = ['All', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Render a single member card
  const renderMember = ({ item }) => (
    <View style={styles.memberCard}>
      <View style={styles.memberHeader}>
        <Text style={styles.memberName}>{item.name}</Text>
        <Text style={[
          styles.statusBadge,
          { 
            backgroundColor: 
              item.attendance === 'Present' ? '#dcfce7' : 
              item.attendance === 'Absent' ? '#fee2e2' : '#ffedd5',
            color: 
              item.attendance === 'Present' ? '#16a34a' : 
              item.attendance === 'Absent' ? '#dc2626' : '#ea580c'
          }
        ]}>
          {item.attendance}
        </Text>
      </View>

      <View style={styles.memberRow}>
        <Icon name="phone" size={14} color="#64748b" />
        <Text style={styles.memberDetail}>{item.mobile}</Text>
      </View>

      <View style={styles.memberRow}>
        <MaterialCommunityIcons name="calendar" size={14} color="#64748b" />
        <Text style={styles.memberDetail}>Joined: {item.joiningDate}</Text>
      </View>

      <View style={styles.memberRow}>
        <MaterialCommunityIcons name="cash" size={14} color="#64748b" />
        <Text style={styles.memberDetail}>
          Fees: <Text style={{ fontWeight: '600', color: 
            item.feesStatus === 'Paid' ? '#16a34a' : 
            item.feesStatus === 'Unpaid' ? '#dc2626' : '#ea580c' }}>
            {item.feesStatus}
          </Text>
        </Text>
      </View>

      <View style={styles.memberRow}>
        <MaterialCommunityIcons name="receipt" size={14} color="#64748b" />
        <Text style={styles.memberDetail}>Last Payment: {item.lastPayment}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {isFetching ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#0077b6" />
          <Text style={styles.loaderText}>Fetching your dashboard...</Text>
        </View>
      ) : (
        <Animatable.View animation="fadeIn" duration={800}>
          <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
            {/* Greeting Card */}
            <View style={styles.greetingCard}>
              <Text style={styles.greetingText}>{greeting}</Text>
              <Text style={styles.employeeGreeting}>"{employeeDetails.name}"</Text>
              <Text style={styles.emoji}>{emoji}</Text>
              <Text style={styles.quote}>{quote}</Text>
            </View>

            {/* ✅ NEW SUMMARY SECTION */}
            <View style={styles.summarySection}>
              <View style={styles.summaryRow}>
                {/* Total Members */}
                <View style={styles.summaryCard}>
                  <MaterialCommunityIcons name="account-group" size={24} color="#4f46e5" />
                  <Text style={styles.summaryLabel}>Total Members</Text>
                  <Text style={styles.summaryValue}>{memberStats.total}</Text>
                </View>

                {/* Present Today */}
                <View style={styles.summaryCard}>
                  <MaterialCommunityIcons name="account-check" size={24} color="#10b981" />
                  <Text style={styles.summaryLabel}>Present Today</Text>
                  <Text style={styles.summaryValue}>{memberStats.present}</Text>
                </View>

                {/* Unpaid Fees */}
                <View style={styles.summaryCard}>
                  <MaterialCommunityIcons name="cash-off" size={24} color="#ef4444" />
                  <Text style={styles.summaryLabel}>Unpaid Fees</Text>
                  <Text style={styles.summaryValue}>{memberStats.unpaid}</Text>
                </View>
              </View>
            </View>

            {/* Filter Header */}
            <View style={styles.filterHeader}>
              <Text style={styles.sectionTitle}>Members Overview</Text>
              <TouchableOpacity 
                style={styles.filterButton}
                onPress={() => setShowMonthFilter(true)}
              >
                <Text style={styles.filterButtonText}>
                  {selectedMonth === 'All' ? 'All Months' : selectedMonth}
                </Text>
                <MaterialCommunityIcons name="calendar-month" size={18} color="#1B5E35" />
              </TouchableOpacity>
            </View>

            {/* Members List */}
            <View style={styles.membersListContainer}>
              <FlatList
                data={filteredMembers}
                renderItem={renderMember}
                keyExtractor={(item) => item.id.toString()}
                showsVerticalScrollIndicator={false}
              />
            </View>

            {/* Dot Pagination */}
            {filteredMembers.length > 0 && (
              <View style={styles.dotContainer}>
                {filteredMembers.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.dot,
                      { backgroundColor: index === 0 ? '#1B5E35' : '#cbd5e1' }
                    ]}
                  />
                ))}
              </View>
            )}

          </ScrollView>

          {/* Month Filter Modal */}
          <Modal
            animationType="fade"
            transparent={true}
            visible={showMonthFilter}
            onRequestClose={() => setShowMonthFilter(false)}
          >
            <Pressable 
              style={styles.modalOverlay} 
              onPress={() => setShowMonthFilter(false)}
            >
              <View style={styles.filterModal}>
                <Text style={styles.filterModalTitle}>Select Month</Text>
                <FlatList
                  data={monthOptions}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.monthOption}
                      onPress={() => {
                        setSelectedMonth(item);
                        setShowMonthFilter(false);
                      }}
                    >
                      <Text style={[
                        styles.monthOptionText,
                        { color: selectedMonth === item ? '#1B5E35' : '#475569' }
                      ]}>
                        {item}
                      </Text>
                    </TouchableOpacity>
                  )}
                  keyExtractor={(item) => item}
                />
              </View>
            </Pressable>
          </Modal>

        
        </Animatable.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  employeeGreeting: { color: 'rgb(221, 213, 213)' },
  greetingCard: { backgroundColor: '#1B5E35', padding: 20, alignItems: 'center', marginBottom: 20 },
  greetingText: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  emoji: { fontSize: 40, marginVertical: 10 },
  quote: { fontSize: 16, color: '#e0f2fe', textAlign: 'center' },
  
  // ✅ NEW SUMMARY STYLES
  summarySection: { paddingHorizontal: 16, marginBottom: 20 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryLabel: { fontSize: 12, color: '#64748b', marginTop: 6 },
  summaryValue: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginTop: 4 },

  // Filter Header
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  filterButtonText: {
    fontSize: 14,
    color: '#1B5E35',
    fontWeight: '500',
    marginRight: 6,
  },

  // Members List
  membersListContainer: {
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  memberCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '500',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  memberDetail: {
    fontSize: 14,
    color: '#475569',
    marginLeft: 8,
  },

  // Dot Pagination
  dotContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },

  // Filter Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterModal: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 15,
    paddingVertical: 15,
    maxHeight: 300,
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    color: '#1e293b',
  },
  monthOption: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  monthOptionText: {
    fontSize: 16,
    textAlign: 'center',
  },

  // Existing Modal Styles (unchanged)
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalViewLarge: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%',
    maxHeight: '80%'
  },
  modalScrollViewContent: { paddingBottom: 20 },
  incidentCard: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 15,
    width: '100%'
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
    width: '100%'
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#d9534f' },
  incidentDate: { fontSize: 14, color: '#666', marginBottom: 10 },
  modalText: { fontSize: 16, marginBottom: 10, color: '#333' },
  viewAttachmentButton: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#0284c7',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  attachmentButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  modalButton: {
    borderRadius: 5,
    padding: 10,
    paddingHorizontal: 20,
    elevation: 2,
    backgroundColor: "#1B5E35",
    width: '100%',
    alignItems: 'center',
    marginTop: 15,
  },
  textStyle: { color: "white", fontWeight: "bold", textAlign: "center" },
  attachmentModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: { width: '90%', height: '80%', borderRadius: 10 },
  closeButton: { position: 'absolute', top: 80, right: 20, zIndex: 10 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderText: { fontSize: 16, marginTop: 10, color: '#6c757d' },
});

export default InventoryForm;
