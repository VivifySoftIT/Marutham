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
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

const GenerateReport = () => {
  const navigation = useNavigation();
  const [selectedReport, setSelectedReport] = useState(null);
  const [dateRange, setDateRange] = useState('month');
  const [format, setFormat] = useState('pdf');

  const reportTypes = [
    { id: 'attendance', title: 'Attendance', icon: 'calendar-check', color: '#2196F3' },
    { id: 'payment', title: 'Payment', icon: 'cash-multiple', color: '#4CAF50' },
    { id: 'revenue', title: 'Revenue', icon: 'chart-line', color: '#9C27B0' },
    { id: 'member', title: 'Member Stats', icon: 'account-group', color: '#FF9800' },
  ];

  const dateRanges = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'year', label: 'This Year' },
  ];

  const formats = [
    { id: 'pdf', label: 'PDF', icon: 'file-pdf-box' },
    { id: 'excel', label: 'Excel', icon: 'file-excel-box' },
    { id: 'csv', label: 'CSV', icon: 'file-delimited' },
  ];

  const handleGenerate = () => {
    if (!selectedReport) {
      Alert.alert('Error', 'Please select a report type');
      return;
    }
    Alert.alert('Success', `${selectedReport.title} report generated successfully!`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#C9A84C" barStyle="light-content" />
      
      {/* Header - PaymentDetails Style */}
      <LinearGradient colors={['#C9A84C', '#2E7D4F']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Generate Report</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        {/* Report Type Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Report Type</Text>
          <View style={styles.reportGrid}>
            {reportTypes.map(report => (
              <TouchableOpacity
                key={report.id}
                style={[
                  styles.reportCard,
                  selectedReport?.id === report.id && styles.selectedReport
                ]}
                onPress={() => setSelectedReport(report)}
              >
                <View style={[styles.reportIcon, { backgroundColor: report.color }]}>
                  <Icon name={report.icon} size={28} color="#FFF" />
                </View>
                <Text style={styles.reportTitle}>{report.title}</Text>
                {selectedReport?.id === report.id && (
                  <Icon name="check-circle" size={20} color="#4CAF50" style={styles.checkIcon} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Date Range Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Date Range</Text>
          <View style={styles.dateRangeContainer}>
            {dateRanges.map(range => (
              <TouchableOpacity
                key={range.id}
                style={[
                  styles.dateRangeButton,
                  dateRange === range.id && styles.activeDateRange
                ]}
                onPress={() => setDateRange(range.id)}
              >
                <Text style={[
                  styles.dateRangeText,
                  dateRange === range.id && styles.activeDateRangeText
                ]}>
                  {range.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Format Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Format</Text>
          <View style={styles.formatContainer}>
            {formats.map(fmt => (
              <TouchableOpacity
                key={fmt.id}
                style={[
                  styles.formatButton,
                  format === fmt.id && styles.activeFormat
                ]}
                onPress={() => setFormat(fmt.id)}
              >
                <Icon 
                  name={fmt.icon} 
                  size={24} 
                  color={format === fmt.id ? '#FFF' : '#666'} 
                />
                <Text style={[
                  styles.formatText,
                  format === fmt.id && styles.activeFormatText
                ]}>
                  {fmt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Preview Section */}
        {selectedReport && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Report Preview</Text>
            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <Icon name={selectedReport.icon} size={24} color={selectedReport.color} />
                <Text style={styles.previewTitle}>{selectedReport.title}</Text>
              </View>
              <View style={styles.previewDetails}>
                <View style={styles.previewRow}>
                  <Icon name="calendar-range" size={18} color="#666" />
                  <Text style={styles.previewText}>
                    Period: {dateRanges.find(r => r.id === dateRange)?.label}
                  </Text>
                </View>
                <View style={styles.previewRow}>
                  <Icon name="file-document" size={18} color="#666" />
                  <Text style={styles.previewText}>
                    Format: {formats.find(f => f.id === format)?.label}
                  </Text>
                </View>
                <View style={styles.previewRow}>
                  <Icon name="clock-outline" size={18} color="#666" />
                  <Text style={styles.previewText}>
                    Generated: {new Date().toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Generate Button */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={[styles.generateButton, !selectedReport && styles.disabledButton]}
            onPress={handleGenerate}
            disabled={!selectedReport}
          >
            <Icon name="file-download" size={24} color="#FFF" />
            <Text style={styles.generateButtonText}>Generate Report</Text>
          </TouchableOpacity>
        </View>
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
  },
  section: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#C9A84C',
    marginBottom: 15,
  },
  reportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  reportCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    width: '48%',
    marginBottom: 12,
    alignItems: 'center',
    elevation: 2,
    position: 'relative',
  },
  selectedReport: {
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  reportIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  reportTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1B5E35',
    textAlign: 'center',
  },
  checkIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  dateRangeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  dateRangeButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFF',
    alignItems: 'center',
  },
  activeDateRange: {
    backgroundColor: '#C9A84C',
    borderColor: '#C9A84C',
  },
  dateRangeText: {
    fontSize: 14,
    color: '#666',
  },
  activeDateRangeText: {
    color: '#FFF',
    fontWeight: '600',
  },
  formatContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  formatButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFF',
  },
  activeFormat: {
    backgroundColor: '#C9A84C',
    borderColor: '#C9A84C',
  },
  formatText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  activeFormatText: {
    color: '#FFF',
    fontWeight: '600',
  },
  previewCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    elevation: 2,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B5E35',
    marginLeft: 10,
  },
  previewDetails: {
    gap: 12,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
  },
  generateButton: {
    flexDirection: 'row',
    backgroundColor: '#C9A84C',
    borderRadius: 10,
    paddingVertical: 15,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  disabledButton: {
    backgroundColor: '#BDBDBD',
  },
  generateButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

export default GenerateReport;

