import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Dimensions,
  Animated,
  Easing,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import ApiService from '../service/api';
import { useLanguage } from '../service/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';
import SpeechToTextInput from '../components/SpeechToTextInput';

const { width } = Dimensions.get('window');

const PaymentDetails = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useLanguage();
  const { memberId } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [memberData, setMemberData] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [paymentSummary, setPaymentSummary] = useState(null);

  // Dropdown state
  const [showMemberSearch, setShowMemberSearch] = useState(false);
  const [allMembers, setAllMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState(memberId);
  const [searchQuery, setSearchQuery] = useState('');

  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];

  useEffect(() => {
    loadInitialData();
    animateContent();
  }, []);

  const animateContent = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);

      // Load all members for search
      const members = await ApiService.getMembers();
      setAllMembers(members || []);
      setFilteredMembers(members || []);

      // Load payment data
      await loadPaymentData(memberId);

      // If memberId is provided, find and set member data
      if (memberId && members) {
        const member = members.find(m => m.id === memberId);
        if (member) {
          setMemberData(member);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert(t('error'), t('dataLoadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentData = async (targetMemberId) => {
    try {
      const payments = await ApiService.getPayments(targetMemberId);
      setPaymentHistory(payments || []);

      // Calculate summary
      if (payments && payments.length > 0) {
        const totalPaid = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
        const lastPayment = payments.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))[0];
        const nextDueDate = calculateNextDueDate(lastPayment.paymentDate);

        setPaymentSummary({
          totalPaid: totalPaid,
          totalDue: calculateTotalDue(payments),
          nextDueDate: nextDueDate,
          paymentCount: payments.length,
          lastPaymentDate: lastPayment.paymentDate
        });
      } else {
        setPaymentSummary({
          totalPaid: 0,
          totalDue: 0,
          nextDueDate: null,
          paymentCount: 0,
          lastPaymentDate: null
        });
      }
    } catch (error) {
      console.error('Error loading payments:', error);
      setPaymentHistory([]);
      setPaymentSummary({
        totalPaid: 0,
        totalDue: 0,
        nextDueDate: null,
        paymentCount: 0,
        lastPaymentDate: null
      });
    }
  };

  const calculateNextDueDate = (lastPaymentDate) => {
    if (!lastPaymentDate) return null;
    const date = new Date(lastPaymentDate);
    date.setMonth(date.getMonth() + 1);
    return date.toISOString();
  };

  const calculateTotalDue = (payments) => {
    // Implement your business logic for due calculation
    return 0;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadPaymentData(selectedMemberId);
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const selectMember = async (member) => {
    setSelectedMemberId(member.id);
    setMemberData(member);
    setShowMemberSearch(false);
    setSearchQuery('');

    setLoading(true);
    await loadPaymentData(member.id);
    setLoading(false);
    animateContent();
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text.trim() === '') {
      setFilteredMembers(allMembers);
    } else {
      const filtered = allMembers.filter(member =>
        member.name?.toLowerCase().includes(text.toLowerCase()) ||
        member.memberId?.toLowerCase().includes(text.toLowerCase()) ||
        member.phone?.includes(text) ||
        member.email?.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredMembers(filtered);
    }
  };

  const getPaymentMethodIcon = (method) => {
    if (!method) return 'cash';
    const methodLower = method.toLowerCase();
    switch (methodLower) {
      case 'cash': return 'cash';
      case 'upi':
      case 'gpay':
      case 'phonepe':
      case 'paytm': return 'cellphone';
      case 'card':
      case 'credit card':
      case 'debit card': return 'credit-card';
      case 'bank transfer':
      case 'neft':
      case 'rtgs': return 'bank-transfer';
      default: return 'cash';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    if (!amount) return '₹0';
    return `₹${parseFloat(amount).toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid': return '#10B981';
      case 'pending': return '#F59E0B';
      case 'failed': return '#EF4444';
      default: return '#10B981';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#4A90E2" barStyle="light-content" />
        <LinearGradient colors={['#4A90E2', '#87CEEB']} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('paymentDetails')}</Text>
          <View style={{ width: 24 }} />
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>{t('loadingData')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#4A90E2" barStyle="light-content" />

      {/* Enhanced Header */}
      <LinearGradient colors={['#4A90E2', '#87CEEB']} style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('paymentDetails')}</Text>
        <TouchableOpacity
          onPress={() => setShowMemberSearch(true)}
          style={styles.headerButton}
        >
          <Icon name="account-search" size={24} color="#FFF" />
        </TouchableOpacity>
      </LinearGradient>

      <Animated.ScrollView
        style={[styles.content, {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }]}
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
        {/* Member Selection Card */}
        <View style={styles.selectionCard}>
          <Text style={styles.selectionLabel}>{t('selectMember').toUpperCase()}</Text>
          <TouchableOpacity
            style={styles.selectionButton}
            onPress={() => setShowMemberSearch(true)}
            activeOpacity={0.7}
          >
            <View style={styles.selectionButtonContent}>
              <Icon name="account-circle" size={24} color="#4A90E2" />
              <View style={styles.selectionTextContainer}>
                <Text style={styles.selectionName}>
                  {memberData?.name || t('selectMember')}
                </Text>
                <Text style={styles.selectionHint}>
                  {memberData ? t('tapToChangeMember') : t('tapToSelectMember')}
                </Text>
              </View>
              <Icon name="chevron-right" size={24} color="#4A90E2" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Member Info Card - Only shown when member is selected */}
        {memberData && (
          <View style={styles.memberCard}>
            <LinearGradient
              colors={['#4A90E2', '#87CEEB']}
              style={styles.memberCardGradient}
            >
              <View style={styles.memberCardHeader}>
                <View style={styles.avatarContainer}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {memberData.name?.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                </View>
                <View style={styles.memberCardInfo}>
                  <Text style={styles.memberCardName}>{memberData.name}</Text>
                  <Text style={styles.memberCardId}>ID: {memberData.memberId || memberData.id}</Text>
                  <View style={styles.contactInfo}>
                    <View style={styles.contactItem}>
                      <Icon name="phone" size={14} color="rgba(255,255,255,0.8)" />
                      <Text style={styles.contactText}>{memberData.phone}</Text>
                    </View>
                    {memberData.email && (
                      <View style={styles.contactItem}>
                        <Icon name="email" size={14} color="rgba(255,255,255,0.8)" />
                        <Text style={styles.contactText}>{memberData.email}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
              <View style={styles.memberCardFooter}>
                <View style={styles.memberStat}>
                  <Text style={styles.statValue}>{paymentSummary?.paymentCount || 0}</Text>
                  <Text style={styles.statLabel}>{t('payments')}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.memberStat}>
                  <Text style={styles.statValue}>{formatCurrency(paymentSummary?.totalPaid || 0)}</Text>
                  <Text style={styles.statLabel}>{t('totalPaid')}</Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Payment Summary Cards */}
        <View style={styles.summaryContainer}>
          <Text style={styles.sectionTitle}>{t('paymentSummary')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.summaryScroll}
          >
            <View style={styles.summaryCard}>
              <View style={[styles.summaryIconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <Icon name="wallet" size={24} color="#10B981" />
              </View>
              <Text style={styles.summaryCardLabel}>{t('totalPaid')}</Text>
              <Text style={styles.summaryCardValue}>
                {formatCurrency(paymentSummary?.totalPaid || 0)}
              </Text>
              <Text style={styles.summaryCardSubtext}>{t('allTimePayments')}</Text>
            </View>

            <View style={styles.summaryCard}>
              <View style={[styles.summaryIconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                <Icon name="alert-circle" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.summaryCardLabel}>{t('pending')}</Text>
              <Text style={styles.summaryCardValue}>
                {formatCurrency(paymentSummary?.totalDue || 0)}
              </Text>
              <Text style={styles.summaryCardSubtext}>{t('amountDue')}</Text>
            </View>

            <View style={styles.summaryCard}>
              <View style={[styles.summaryIconContainer, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                <Icon name="calendar-clock" size={24} color="#8B5CF6" />
              </View>
              <Text style={styles.summaryCardLabel}>{t('nextDue')}</Text>
              <Text style={styles.summaryCardValue}>
                {paymentSummary?.nextDueDate ? formatDate(paymentSummary.nextDueDate) : t('notAvailable')}
              </Text>
              <Text style={styles.summaryCardSubtext}>{t('paymentDeadline')}</Text>
            </View>
          </ScrollView>
        </View>

        {/* Payment History */}
        <View style={styles.historyContainer}>
          <View style={styles.historyHeader}>
            <Text style={styles.sectionTitle}>{t('paymentHistory')}</Text>
            <View style={styles.historyStats}>
              <Text style={styles.historyCount}>
                {paymentHistory.length} {paymentHistory.length === 1 ? t('payment') : t('payments')}
              </Text>
            </View>
          </View>

          {paymentHistory.length > 0 ? (
            paymentHistory.map((payment, index) => (
              <TouchableOpacity
                key={payment.id || index}
                style={styles.paymentCard}
                activeOpacity={0.9}
                onPress={() => {
                  // Handle payment details view
                }}
              >
                <View style={styles.paymentCardContent}>
                  {/* Member Name Row */}
                  {memberData && (
                    <View style={styles.paymentMemberRow}>
                      <Icon name="account" size={16} color="#4A90E2" />
                      <Text style={styles.paymentMemberName}>{memberData.name}</Text>
                    </View>
                  )}

                  <View style={styles.paymentCardHeader}>
                    <View style={[styles.paymentIconContainer,
                    {
                      backgroundColor: index % 3 === 0 ? 'rgba(16, 185, 129, 0.1)' :
                        index % 3 === 1 ? 'rgba(139, 92, 246, 0.1)' : 'rgba(59, 130, 246, 0.1)'
                    }
                    ]}>
                      <Icon
                        name={getPaymentMethodIcon(payment.paymentMethod)}
                        size={20}
                        color={index % 3 === 0 ? '#10B981' :
                          index % 3 === 1 ? '#8B5CF6' : '#3B82F6'}
                      />
                    </View>
                    <View style={styles.paymentInfo}>
                      <Text style={styles.paymentDescription} numberOfLines={1}>
                        {payment.paymentForMonth || payment.description || t('membershipPayment')}
                      </Text>
                      <Text style={styles.paymentDate}>
                        {formatDate(payment.paymentDate || payment.createdAt)}
                      </Text>
                    </View>
                    <View style={styles.paymentAmountContainer}>
                      <Text style={styles.paymentAmount}>
                        {formatCurrency(payment.amount)}
                      </Text>
                      <View style={[styles.statusBadge,
                      { backgroundColor: `rgba(${getStatusColor('paid').replace('#', '')}, 0.1)` }
                      ]}>
                        <Text style={[styles.statusText, { color: getStatusColor('paid') }]}>
                          {t('paid')}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.paymentCardFooter}>
                    <View style={styles.paymentMethod}>
                      <Icon name={getPaymentMethodIcon(payment.paymentMethod)} size={12} color="#6B7280" />
                      <Text style={styles.paymentMethodText}>
                        {payment.paymentMethod || t('cash')}
                      </Text>
                    </View>
                    {payment.transactionId && (
                      <View style={styles.transactionId}>
                        <Icon name="receipt" size={12} color="#6B7280" />
                        <Text style={styles.transactionIdText} numberOfLines={1}>
                          {payment.transactionId}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Icon name="receipt-outline" size={64} color="#D1D5DB" />
              </View>
              <Text style={styles.emptyStateTitle}>{t('noPaymentHistory')}</Text>
              <Text style={styles.emptyStateText}>
                {memberData ?
                  `${t('noPaymentsFoundFor')} ${memberData.name}` :
                  t('selectMemberToViewHistory')
                }
              </Text>
            </View>
          )}
        </View>

        {/* Floating Action Button */}
        {memberData && (
          <TouchableOpacity
            style={styles.fab}
            onPress={() => navigation.navigate('TakePayment', { memberId: selectedMemberId })}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#4A90E2', '#87CEEB']}
              style={styles.fabGradient}
            >
              <Icon name="cash-plus" size={24} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </Animated.ScrollView>

      {/* Member Search Modal */}
      {showMemberSearch && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('selectMember')}</Text>
              <TouchableOpacity onPress={() => {
                setShowMemberSearch(false);
                setSearchQuery('');
              }}>
                <Icon name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Icon name="magnify" size={20} color="#9CA3AF" style={styles.searchIcon} />
              <SpeechToTextInput
                style={styles.searchInput}
                placeholder={t('searchByNameIdPhone')}
                value={searchQuery}
                onChangeText={handleSearch}
                autoFocus
              />
            </View>

            <ScrollView style={styles.memberList}>
              {filteredMembers.map((member) => (
                <TouchableOpacity
                  key={member.id}
                  style={styles.modalMemberItem}
                  onPress={() => selectMember(member)}
                  activeOpacity={0.7}
                >
                  <View style={styles.modalMemberAvatar}>
                    <Text style={styles.modalAvatarText}>
                      {member.name?.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.modalMemberInfo}>
                    <Text style={styles.modalMemberName}>{member.name}</Text>
                    <Text style={styles.modalMemberDetails}>
                      {member.memberId} • {member.phone}
                    </Text>
                  </View>
                  {selectedMemberId === member.id && (
                    <Icon name="check-circle" size={24} color="#4A90E2" />
                  )}
                </TouchableOpacity>
              ))}

              {filteredMembers.length === 0 && (
                <View style={styles.noResults}>
                  <Icon name="account-search" size={48} color="#D1D5DB" />
                  <Text style={styles.noResultsText}>{t('noMembersFound')}</Text>
                  <Text style={styles.noResultsSubtext}>{t('tryDifferentSearch')}</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
    gap: 10,
  },
  backButton: {
    padding: 4,
  },

  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  // Selection Card
  selectionCard: {
    marginBottom: 24,
  },
  selectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  selectionButton: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  selectionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectionTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  selectionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  selectionHint: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  // Member Card
  memberCard: {
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  memberCardGradient: {
    padding: 20,
  },
  memberCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
  },
  memberCardInfo: {
    flex: 1,
  },
  memberCardName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  memberCardId: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 12,
  },
  contactInfo: {
    gap: 8,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 8,
  },
  memberCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
  },
  memberStat: {
    flex: 1,
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 0.5,
  },
  // Summary Section
  summaryContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  summaryScroll: {
    paddingRight: 20,
  },
  summaryCard: {
    width: width * 0.7,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginRight: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  summaryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryCardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  summaryCardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  summaryCardSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  // History Section
  historyContainer: {
    marginBottom: 100,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  historyStats: {
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  historyCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A90E2',
  },
  paymentCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  paymentCardContent: {
    padding: 16,
  },
  paymentMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#4A90E2',
  },
  paymentMemberName: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
  },
  paymentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  paymentDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  paymentAmountContainer: {
    alignItems: 'flex-end',
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  paymentCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 16,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethodText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  transactionId: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIdText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
    flex: 1,
  },
  // Empty State
  emptyState: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  emptyIconContainer: {
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Modal
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    margin: 20,
    marginTop: 0,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },
  memberList: {
    paddingHorizontal: 20,
  },
  modalMemberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalMemberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  modalMemberInfo: {
    flex: 1,
  },
  modalMemberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  modalMemberDetails: {
    fontSize: 14,
    color: '#6B7280',
  },
  noResults: {
    padding: 40,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});

export default PaymentDetails;