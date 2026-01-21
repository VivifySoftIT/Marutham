import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const FeesManagement = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [showReferralStats, setShowReferralStats] = useState(false);
  const [customAmount, setCustomAmount] = useState('');

  // Sample fees data with referral info
  const feesData = [
    { id: 1, name: 'Rajesh Kumar', amount: 5000, dueDate: '2024-02-15', status: 'paid', plan: 'Monthly', referredBy: 'John Doe', referralCount: 5 },
    { id: 2, name: 'Priya Sharma', amount: 4500, dueDate: '2024-02-20', status: 'pending', plan: 'Monthly', referredBy: null, referralCount: 2 },
    { id: 3, name: 'Amit Singh', amount: 6000, dueDate: '2024-02-10', status: 'overdue', plan: 'Quarterly', referredBy: 'Rajesh Kumar', referralCount: 0 },
    { id: 4, name: 'Sneha Patel', amount: 5500, dueDate: '2024-02-25', status: 'paid', plan: 'Monthly', referredBy: null, referralCount: 8 },
    { id: 5, name: 'Vikram Reddy', amount: 7000, dueDate: '2024-02-05', status: 'overdue', plan: 'Half-Yearly', referredBy: 'Priya Sharma', referralCount: 3 },
  ];

  // Referral statistics
  const referralStats = {
    thisWeek: feesData.reduce((sum, m) => sum + (m.referralCount > 0 ? 1 : 0), 0),
    thisMonth: feesData.reduce((sum, m) => sum + m.referralCount, 0),
    topReferrers: feesData
      .filter(m => m.referralCount > 0)
      .sort((a, b) => b.referralCount - a.referralCount)
      .slice(0, 5),
  };

  const filteredData = feesData.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = selectedTab === 'all' || item.status === selectedTab;
    return matchesSearch && matchesTab;
  });

  const stats = {
    total: feesData.reduce((sum, item) => sum + item.amount, 0),
    collected: feesData.filter(i => i.status === 'paid').reduce((sum, item) => sum + item.amount, 0),
    pending: feesData.filter(i => i.status === 'pending').reduce((sum, item) => sum + item.amount, 0),
    overdue: feesData.filter(i => i.status === 'overdue').reduce((sum, item) => sum + item.amount, 0),
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return '#4CAF50';
      case 'pending': return '#FF9800';
      case 'overdue': return '#F44336';
      default: return '#666';
    }
  };

  const handleCollectPayment = (member) => {
    setSelectedMember(member);
    setShowPlanModal(true);
  };

  const handleApplyPlan = () => {
    if (!selectedMember) return;
    
    const amount = customAmount || getPlanAmount(selectedPlan);
    
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    
    // Send thank you message if member was referred
    if (selectedMember.referredBy) {
      sendReferralThankYouMessage(selectedMember.referredBy, selectedMember.name);
    }
    
    Alert.alert(
      'Success',
      `${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)} plan (₹${amount}) applied for ${selectedMember.name}!`,
      [{ text: 'OK', onPress: () => {
        setShowPlanModal(false);
        setSelectedMember(null);
        setCustomAmount('');
      }}]
    );
  };

  const getPlanAmount = (plan) => {
    const amounts = {
      monthly: '5000',
      quarterly: '14000',
      'half-yearly': '27000',
      annual: '50000',
    };
    return amounts[plan] || '5000';
  };

  const sendReferralThankYouMessage = (referrerName, newMemberName) => {
    const message = `Dear ${referrerName},\n\nThank you for referring ${newMemberName} to our gym! 🎉\n\nWe truly appreciate your support in helping us grow our community. As a token of our gratitude, you'll receive special benefits.\n\nYour referrals this month: ${referralStats.thisMonth}\n\nKeep up the great work!\n\nBest regards,\nGym Management Team`;
    
    // In real app, this would call SMS/Email API
    console.log('Sending message:', message);
    Alert.alert('Message Sent', `Thank you message sent to ${referrerName}`);
  };

  return (
    <View style={styles.container}>
      {/* Referral Stats Button */}
      <TouchableOpacity 
        style={styles.referralStatsButton}
        onPress={() => setShowReferralStats(true)}
      >
        <Icon name="account-multiple-plus" size={20} color="#FFF" />
        <Text style={styles.referralStatsButtonText}>Referral Stats</Text>
      </TouchableOpacity>

      {/* Stats Cards */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.statsContainer}
      >
        <View style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}>
          <Icon name="cash-multiple" size={20} color="#2196F3" />
          <Text style={styles.statAmount}>₹{stats.total.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        
        <View style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
          <Icon name="check-circle" size={20} color="#4CAF50" />
          <Text style={styles.statAmount}>₹{stats.collected.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Collected</Text>
        </View>
        
        <View style={[styles.statCard, { backgroundColor: '#FFF3E0' }]}>
          <Icon name="clock-alert" size={20} color="#FF9800" />
          <Text style={styles.statAmount}>₹{stats.pending.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        
        <View style={[styles.statCard, { backgroundColor: '#FFEBEE' }]}>
          <Icon name="alert-circle" size={20} color="#F44336" />
          <Text style={styles.statAmount}>₹{stats.overdue.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Overdue</Text>
        </View>
      </ScrollView>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search members..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        {['all', 'paid', 'pending', 'overdue'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, selectedTab === tab && styles.activeTab]}
            onPress={() => setSelectedTab(tab)}
          >
            <Text style={[styles.tabText, selectedTab === tab && styles.activeTabText]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Fees List */}
      <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
        {filteredData.map(item => (
          <View key={item.id} style={styles.feeCard}>
            <View style={styles.feeHeader}>
              <View style={styles.memberInfo}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
                </View>
                <View style={styles.memberDetails}>
                  <Text style={styles.memberName}>{item.name}</Text>
                  <Text style={styles.planText}>{item.plan} Plan</Text>
                </View>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                  {item.status.toUpperCase()}
                </Text>
              </View>
            </View>
            
            <View style={styles.feeDetails}>
              <View style={styles.feeRow}>
                <Icon name="currency-inr" size={18} color="#666" />
                <Text style={styles.feeLabel}>Amount:</Text>
                <Text style={styles.feeValue}>₹{item.amount.toLocaleString()}</Text>
              </View>
              <View style={styles.feeRow}>
                <Icon name="calendar" size={18} color="#666" />
                <Text style={styles.feeLabel}>Due Date:</Text>
                <Text style={styles.feeValue}>{item.dueDate}</Text>
              </View>
            </View>

            {item.status !== 'paid' && (
              <TouchableOpacity
                style={styles.collectButton}
                onPress={() => handleCollectPayment(item)}
              >
                <Icon name="cash-plus" size={18} color="#FFF" />
                <Text style={styles.collectButtonText}>Select Plan & Collect</Text>
              </TouchableOpacity>
            )}

            {item.referredBy && (
              <View style={styles.referralBadge}>
                <Icon name="account-arrow-right" size={14} color="#9C27B0" />
                <Text style={styles.referralText}>Referred by: {item.referredBy}</Text>
              </View>
            )}

            {item.referrerBadge && item.referralCount > 0 && (
              <View style={styles.referrerBadge}>
                <Icon name="star" size={14} color="#FF9800" />
                <Text style={styles.referrerText}>Referred {item.referralCount} members</Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Plan Selection Modal */}
      <Modal
        visible={showPlanModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPlanModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.planModalContainer}>
            <View style={styles.planModalHeader}>
              <Text style={styles.planModalTitle}>Select Membership Plan</Text>
              <TouchableOpacity onPress={() => setShowPlanModal(false)}>
                <Icon name="close" size={24} color="#212c62" />
              </TouchableOpacity>
            </View>

            {selectedMember && (
              <View style={styles.memberInfoCard}>
                <Icon name="account" size={24} color="#2196F3" />
                <Text style={styles.memberInfoText}>{selectedMember.name}</Text>
              </View>
            )}

            <View style={styles.planOptions}>
              {['monthly', 'quarterly', 'half-yearly', 'annual'].map(plan => (
                <TouchableOpacity
                  key={plan}
                  style={[
                    styles.planOption,
                    selectedPlan === plan && styles.selectedPlanOption
                  ]}
                  onPress={() => {
                    setSelectedPlan(plan);
                    setCustomAmount(getPlanAmount(plan));
                  }}
                >
                  <Icon 
                    name={selectedPlan === plan ? 'radiobox-marked' : 'radiobox-blank'} 
                    size={24} 
                    color={selectedPlan === plan ? '#4CAF50' : '#666'} 
                  />
                  <View style={styles.planDetails}>
                    <Text style={styles.planName}>
                      {plan.charAt(0).toUpperCase() + plan.slice(1).replace('-', ' ')}
                    </Text>
                    <Text style={styles.planPrice}>
                      ₹{getPlanAmount(plan)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom Amount Input */}
            <View style={styles.customAmountContainer}>
              <Text style={styles.customAmountLabel}>Custom Amount (Optional)</Text>
              <View style={styles.amountInputContainer}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="Enter custom amount"
                  keyboardType="numeric"
                  value={customAmount}
                  onChangeText={setCustomAmount}
                />
              </View>
            </View>

            <TouchableOpacity style={styles.applyPlanButton} onPress={handleApplyPlan}>
              <Icon name="check-circle" size={20} color="#FFF" />
              <Text style={styles.applyPlanButtonText}>Apply Plan & Collect Payment</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Referral Stats Modal */}
      <Modal
        visible={showReferralStats}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowReferralStats(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.referralModalContainer}>
            <View style={styles.referralModalHeader}>
              <Text style={styles.referralModalTitle}>Referral Statistics</Text>
              <TouchableOpacity onPress={() => setShowReferralStats(false)}>
                <Icon name="close" size={24} color="#212c62" />
              </TouchableOpacity>
            </View>

            <View style={styles.referralStatsCards}>
              <View style={styles.referralStatCard}>
                <Icon name="calendar-week" size={32} color="#2196F3" />
                <Text style={styles.referralStatNumber}>{referralStats.thisWeek}</Text>
                <Text style={styles.referralStatLabel}>This Week</Text>
              </View>
              <View style={styles.referralStatCard}>
                <Icon name="calendar-month" size={32} color="#4CAF50" />
                <Text style={styles.referralStatNumber}>{referralStats.thisMonth}</Text>
                <Text style={styles.referralStatLabel}>This Month</Text>
              </View>
            </View>

            <Text style={styles.topReferrersTitle}>Top Referrers</Text>
            <ScrollView style={styles.topReferrersList}>
              {referralStats.topReferrers.map((member, index) => (
                <View key={member.id} style={styles.topReferrerCard}>
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>#{index + 1}</Text>
                  </View>
                  <View style={styles.topReferrerInfo}>
                    <Text style={styles.topReferrerName}>{member.name}</Text>
                    <Text style={styles.topReferrerCount}>
                      {member.referralCount} referrals
                    </Text>
                  </View>
                  <Icon name="trophy" size={24} color="#FF9800" />
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => Alert.alert('Add Fee Plan', 'Create new fee plan')}
      >
        <Icon name="plus" size={24} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  statsContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 90,
  },
  statCard: {
    borderRadius: 10,
    padding: 12,
    marginRight: 10,
    width: 110,
    alignItems: 'center',
  },
  statAmount: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#212c62',
    marginTop: 6,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 10,
    paddingHorizontal: 15,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#FFF',
    marginRight: 10,
  },
  activeTab: {
    backgroundColor: '#212c62',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  activeTabText: {
    color: '#FFF',
    fontWeight: '600',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 15,
  },
  feeCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    elevation: 2,
  },
  feeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212c62',
  },
  planText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  feeDetails: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  feeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  feeLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  feeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212c62',
  },
  collectButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  collectButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#212c62',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
  referralStatsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#9C27B0',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    margin: 15,
    justifyContent: 'center',
    elevation: 3,
  },
  referralStatsButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  referralBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E5F5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 8,
  },
  referralText: {
    fontSize: 12,
    color: '#9C27B0',
    marginLeft: 6,
    fontWeight: '500',
  },
  referrerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 8,
  },
  referrerText: {
    fontSize: 12,
    color: '#FF9800',
    marginLeft: 6,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  planModalContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  planModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  planModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212c62',
  },
  memberInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  memberInfoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212c62',
    marginLeft: 10,
  },
  planOptions: {
    marginBottom: 20,
  },
  planOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 12,
    backgroundColor: '#FFF',
  },
  selectedPlanOption: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  planDetails: {
    marginLeft: 12,
    flex: 1,
  },
  planName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212c62',
  },
  planPrice: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  applyPlanButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    paddingVertical: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyPlanButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  referralModalContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  referralModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  referralModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212c62',
  },
  referralStatsCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  referralStatCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  referralStatNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212c62',
    marginVertical: 8,
  },
  referralStatLabel: {
    fontSize: 12,
    color: '#666',
  },
  topReferrersTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212c62',
    marginBottom: 12,
  },
  topReferrersList: {
    maxHeight: 300,
  },
  topReferrerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#212c62',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  topReferrerInfo: {
    flex: 1,
  },
  topReferrerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212c62',
  },
  topReferrerCount: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  customAmountContainer: {
    marginBottom: 15,
  },
  customAmountLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212c62',
    marginBottom: 8,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8F9FA',
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212c62',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#212c62',
  },
});

export default FeesManagement;
