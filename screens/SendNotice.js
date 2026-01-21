import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

const SendNotice = () => {
  const navigation = useNavigation();
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');
  const [priority, setPriority] = useState('normal');
  const [sendTo, setSendTo] = useState('all');

  const priorities = [
    { id: 'low', label: 'Low', color: '#4CAF50', icon: 'arrow-down' },
    { id: 'normal', label: 'Normal', color: '#2196F3', icon: 'minus' },
    { id: 'high', label: 'High', color: '#FF9800', icon: 'arrow-up' },
    { id: 'urgent', label: 'Urgent', color: '#F44336', icon: 'alert' },
  ];

  const noticeTemplates = [
    { id: 1, title: 'Gym Closure', icon: 'door-closed', color: '#F44336' },
    { id: 2, title: 'New Timings', icon: 'clock-outline', color: '#2196F3' },
    { id: 3, title: 'Maintenance', icon: 'tools', color: '#FF9800' },
    { id: 4, title: 'Event Announcement', icon: 'calendar-star', color: '#9C27B0' },
  ];

  const handleSendNotice = () => {
    if (!noticeTitle.trim() || !noticeContent.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    Alert.alert('Success', 'Notice sent successfully!');
    setNoticeTitle('');
    setNoticeContent('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#4A90E2" barStyle="light-content" />
      
      {/* Header - PaymentDetails Style */}
      <LinearGradient colors={['#4A90E2', '#87CEEB']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Send Notice</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        {/* Notice Templates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Templates</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {noticeTemplates.map(template => (
              <TouchableOpacity
                key={template.id}
                style={styles.templateCard}
                onPress={() => Alert.alert('Template', `Load ${template.title} template`)}
              >
                <View style={[styles.templateIcon, { backgroundColor: template.color }]}>
                  <Icon name={template.icon} size={24} color="#FFF" />
                </View>
                <Text style={styles.templateTitle}>{template.title}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Notice Form */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notice Details</Text>
          <View style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Notice Title</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter notice title"
                value={noticeTitle}
                onChangeText={setNoticeTitle}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Priority</Text>
              <View style={styles.priorityContainer}>
                {priorities.map(p => (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.priorityButton,
                      priority === p.id && { backgroundColor: p.color }
                    ]}
                    onPress={() => setPriority(p.id)}
                  >
                    <Icon 
                      name={p.icon} 
                      size={16} 
                      color={priority === p.id ? '#FFF' : '#666'} 
                    />
                    <Text style={[
                      styles.priorityText,
                      priority === p.id && styles.activePriorityText
                    ]}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Send To</Text>
              <View style={styles.sendToContainer}>
                {['all', 'active', 'pending'].map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.sendToButton,
                      sendTo === type && styles.activeSendTo
                    ]}
                    onPress={() => setSendTo(type)}
                  >
                    <Text style={[
                      styles.sendToText,
                      sendTo === type && styles.activeSendToText
                    ]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)} Members
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Notice Content</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Enter notice content..."
                multiline
                numberOfLines={6}
                value={noticeContent}
                onChangeText={setNoticeContent}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity style={styles.sendButton} onPress={handleSendNotice}>
              <Icon name="send" size={20} color="#FFF" />
              <Text style={styles.sendButtonText}>Send Notice</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Preview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preview</Text>
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <Icon name="bell-ring" size={24} color="#FF9800" />
              <Text style={styles.previewTitle}>{noticeTitle || 'Notice Title'}</Text>
            </View>
            <Text style={styles.previewContent}>
              {noticeContent || 'Notice content will appear here...'}
            </Text>
            <View style={styles.previewFooter}>
              <View style={[styles.previewPriority, { backgroundColor: priorities.find(p => p.id === priority)?.color }]}>
                <Text style={styles.previewPriorityText}>
                  {priorities.find(p => p.id === priority)?.label}
                </Text>
              </View>
              <Text style={styles.previewDate}>{new Date().toLocaleDateString()}</Text>
            </View>
          </View>
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
    color: '#4A90E2',
    marginBottom: 15,
  },
  templateCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    marginRight: 12,
    width: 120,
    alignItems: 'center',
    elevation: 2,
  },
  templateIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  templateTitle: {
    fontSize: 12,
    color: '#212c62',
    textAlign: 'center',
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212c62',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 14,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 14,
    minHeight: 120,
  },
  priorityContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  priorityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFF',
  },
  priorityText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  activePriorityText: {
    color: '#FFF',
    fontWeight: '600',
  },
  sendToContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  sendToButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFF',
    alignItems: 'center',
  },
  activeSendTo: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  sendToText: {
    fontSize: 14,
    color: '#666',
  },
  activeSendToText: {
    color: '#FFF',
    fontWeight: '600',
  },
  sendButton: {
    flexDirection: 'row',
    backgroundColor: '#4A90E2',
    borderRadius: 10,
    paddingVertical: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  sendButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
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
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212c62',
    marginLeft: 10,
  },
  previewContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  previewFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  previewPriority: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  previewPriorityText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  previewDate: {
    fontSize: 12,
    color: '#666',
  },
});

export default SendNotice;
