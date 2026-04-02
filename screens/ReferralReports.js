import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const ReferralReports = ({ navigation }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedFormat, setSelectedFormat] = useState('pdf');

  // Sample referral data
  const referralData = {
    totalReferrals: 45,
    thisMonth: 12,
    thisWeek: 3,
    topReferrers: [
      { id: 1, name: 'Rajesh Kumar', count: 8, revenue: 40000, joinDate: '2023-01-15' },
      { id: 2, name: 'Sneha Patel', count: 6, revenue: 30000, joinDate: '2023-02-20' },
      { id: 3, name: 'Vikram Reddy', count: 5, revenue: 25000, joinDate: '2023-03-10' },
      { id: 4, name: 'Priya Sharma', count: 4, revenue: 20000, joinDate: '2023-04-05' },
      { id: 5, name: 'Amit Singh', count: 3, revenue: 15000, joinDate: '2023-05-12' },
    ],
    recentReferrals: [
      { id: 1, referrer: 'Rajesh Kumar', newMember: 'Arjun Mehta', date: '2024-02-01', status: 'Active' },
      { id: 2, referrer: 'Sneha Patel', newMember: 'Kavya Reddy', date: '2024-01-28', status: 'Active' },
      { id: 3, referrer: 'Vikram Reddy', newMember: 'Rohan Sharma', date: '2024-01-25', status: 'Pending' },
      { id: 4, referrer: 'Priya Sharma', newMember: 'Neha Gupta', date: '2024-01-22', status: 'Active' },
    ],
    monthlyTrend: [
      { month: 'Jan', count: 8 },
      { month: 'Feb', count: 12 },
      { month: 'Mar', count: 10 },
      { month: 'Apr', count: 15 },
    ],
  };

  const periods = [
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'quarter', label: 'This Quarter' },
    { id: 'year', label: 'This Year' },
  ];

  const formats = [
    { id: 'pdf', label: 'PDF', icon: 'file-pdf-box', color: '#F44336' },
    { id: 'excel', label: 'Excel', icon: 'file-excel-box', color: '#4CAF50' },
    { id: 'csv', label: 'CSV', icon: 'file-delimited', color: '#2196F3' },
  ];

  const handleDownload = () => {
    Alert.alert(
      'Download Report',
      `Downloading ${selectedPeriod} referral report in ${selectedFormat.toUpperCase()} format...`,
      [{ text: 'OK', onPress: () => console.log('Download started') }]
    );
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Referral Report - ${selectedPeriod}\n\nTotal Referrals: ${referralData.totalReferrals}\nThis Month: ${referralData.thisMonth}\nTop Referrer: ${referralData.topReferrers[0].name} (${referralData.topReferrers[0].count} referrals)`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleViewDetails = (referrer) => {
    Alert.alert(
      referrer.name,
      `Total Referrals: ${referrer.count}\nRevenue Generated: \u20B9${referrer.revenue.toLocaleString()}\nMember Since: ${referrer.joinDate}`,
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={[styles.summaryCard, { backgroundColor: '#E3F2FD' }]}>
            <Icon name="account-multiple-plus" size={28} color="#2196F3" />
            <Text style={styles.summaryNumber}>{referralData.totalReferrals}</Text>
            <Text style={styles.summaryLabel}>Total Referrals</Text>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: '#E8F5E9' }]}>
            <Icon name="calendar-month" size={28} color="#4CAF50" />
            <Text style={styles.summaryNumber}>{referralData.thisMonth}</Text>
            <Text style={styles.summaryLabel}>This Month</Text>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: '#FFF3E0' }]}>
            <Icon name="calendar-week" size={28} color="#FF9800" />
            <Text style={styles.summaryNumber}>{referralData.thisWeek}</Text>
            <Text style={styles.summaryLabel}>This Week</Text>
          </View>
        </View>

        {/* Period Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Period</Text>
          <View style={styles.periodContainer}>
            {periods.map(period => (
              <TouchableOpacity
                key={period.id}
                style={[
                  styles.periodButton,
                  selectedPeriod === period.id && styles.activePeriod
                ]}
                onPress={() => setSelectedPeriod(period.id)}
              >
                <Text style={[
                  styles.periodText,
                  selectedPeriod === period.id && styles.activePeriodText
                ]}>
                  {period.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Format Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Download Format</Text>
          <View style={styles.formatContainer}>
            {formats.map(format => (
              <TouchableOpacity
                key={format.id}
                style={[
                  styles.formatButton,
                  selectedFormat === format.id && styles.activeFormat
                ]}
                onPress={() => setSelectedFormat(format.id)}
              >
                <Icon 
                  name={format.icon} 
                  size={24} 
                  color={selectedFormat === format.id ? '#FFF' : format.color} 
                />
                <Text style={[
                  styles.formatText,
                  selectedFormat === format.id && styles.activeFormatText
                ]}>
                  {format.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.downloadButton} onPress={handleDownload}>
            <Icon name="download" size={20} color="#FFF" />
            <Text style={styles.downloadButtonText}>Download Report</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Icon name="share-variant" size={20} color="#2196F3" />
          </TouchableOpacity>
        </View>

        {/* Top Referrers */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Referrers</Text>
          <View style={styles.topReferrersContainer}>
            {referralData.topReferrers.map((referrer, index) => (
              <TouchableOpacity
                key={referrer.id}
                style={styles.referrerCard}
                onPress={() => handleViewDetails(referrer)}
              >
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>#{index + 1}</Text>
                </View>
                <View style={styles.referrerInfo}>
                  <Text style={styles.referrerName}>{referrer.name}</Text>
                  <View style={styles.referrerStats}>
                    <View style={styles.statItem}>
                      <Icon name="account-multiple" size={14} color="#666" />
                      <Text style={styles.statText}>{referrer.count} referrals</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Icon name="currency-inr" size={14} color="#666" />
                      <Text style={styles.statText}>\u20B9{(referrer.revenue / 1000).toFixed(0)}K</Text>
                    </View>
                  </View>
                </View>
                <Icon name="trophy" size={24} color={index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32'} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Referrals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Referrals</Text>
          <View style={styles.recentContainer}>
            {referralData.recentReferrals.map(referral => (
              <View key={referral.id} style={styles.recentCard}>
                <View style={styles.recentHeader}>
                  <Icon name="account-arrow-right" size={20} color="#2196F3" />
                  <Text style={styles.recentReferrer}>{referral.referrer}</Text>
                </View>
                <View style={styles.recentDetails}>
                  <Text style={styles.recentLabel}>Referred:</Text>
                  <Text style={styles.recentValue}>{referral.newMember}</Text>
                </View>
                <View style={styles.recentDetails}>
                  <Text style={styles.recentLabel}>Date:</Text>
                  <Text style={styles.recentValue}>{referral.date}</Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: referral.status === 'Active' ? '#E8F5E9' : '#FFF3E0' }
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: referral.status === 'Active' ? '#4CAF50' : '#FF9800' }
                  ]}>
                    {referral.status}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Monthly Trend */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Monthly Trend</Text>
          <View style={styles.trendContainer}>
            {referralData.monthlyTrend.map((item, index) => (
              <View key={index} style={styles.trendItem}>
                <View style={[styles.trendBar, { height: item.count * 10 }]}>
                  <Text style={styles.trendCount}>{item.count}</Text>
                </View>
                <Text style={styles.trendMonth}>{item.month}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: 15,
    justifyContent: 'space-between',
  },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginHorizontal: 4,
    elevation: 2,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1B5E35',
    marginVertical: 8,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B5E35',
    marginBottom: 12,
  },
  periodContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  periodButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#FFF',
    alignItems: 'center',
    elevation: 1,
  },
  activePeriod: {
    backgroundColor: '#1B5E35',
  },
  periodText: {
    fontSize: 13,
    color: '#666',
  },
  activePeriodText: {
    color: '#FFF',
    fontWeight: '600',
  },
  formatContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  formatButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FFF',
    elevation: 1,
  },
  activeFormat: {
    backgroundColor: '#1B5E35',
  },
  formatText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
  },
  activeFormatText: {
    color: '#FFF',
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    gap: 10,
  },
  downloadButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  downloadButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  shareButton: {
    width: 50,
    backgroundColor: '#FFF',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  topReferrersContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 10,
    elevation: 2,
  },
  referrerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1B5E35',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  referrerInfo: {
    flex: 1,
  },
  referrerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1B5E35',
    marginBottom: 4,
  },
  referrerStats: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  recentContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 10,
    elevation: 2,
  },
  recentCard: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  recentReferrer: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1B5E35',
    marginLeft: 8,
  },
  recentDetails: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  recentLabel: {
    fontSize: 12,
    color: '#666',
    width: 70,
  },
  recentValue: {
    fontSize: 12,
    color: '#1B5E35',
    fontWeight: '500',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  trendContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 200,
    elevation: 2,
  },
  trendItem: {
    alignItems: 'center',
  },
  trendBar: {
    width: 50,
    backgroundColor: '#2196F3',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 30,
  },
  trendCount: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  trendMonth: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
});

export default ReferralReports;

