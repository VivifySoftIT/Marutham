import React, { useState } from 'react';
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
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';

const Messages = ({ navigation }) => {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attachment, setAttachment] = useState(null);

  const [formData, setFormData] = useState({
    toEmail: '',
    toMemberName: '',
    subject: '',
    content: '',
    recipientType: 'all', // all, unpaid, birthday
  });

  const allMembers = [
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Sarah Smith', email: 'sarah@example.com' },
    { id: 3, name: 'Mike Johnson', email: 'mike@example.com' },
    { id: 4, name: 'Emma Wilson', email: 'emma@example.com' },
    { id: 5, name: 'David Lee', email: 'david@example.com' },
  ];

  const messageTemplates = [
    {
      id: 1,
      title: 'Payment Reminder',
      icon: 'cash-clock',
      color: '#FF9800',
      description: 'Send payment reminder to unpaid members',
      defaultSubject: 'Payment Reminder - Alaigal Membership',
      defaultContent: 'Dear Member,\n\nThis is a friendly reminder that your membership payment is due.\n\nPlease make the payment at your earliest convenience.\n\nThank you,\nAlaigal Team',
      recipientType: 'unpaid'
    },
    {
      id: 2,
      title: 'Welcome Message',
      icon: 'hand-wave',
      color: '#4CAF50',
      description: 'Welcome new members',
      defaultSubject: 'Welcome to Alaigal!',
      defaultContent: 'Dear Member,\n\nWelcome to Alaigal! We are excited to have you as part of our community.\n\nFeel free to connect with other members and grow your business together.\n\nBest regards,\nAlaigal Team',
      recipientType: 'all'
    },
    {
      id: 3,
      title: 'Birthday Wish',
      icon: 'cake-variant',
      color: '#E91E63',
      description: 'Send birthday wishes to members',
      defaultSubject: 'Happy Birthday! 🎉',
      defaultContent: 'Dear Member,\n\nWishing you a wonderful birthday filled with joy and success!\n\nMay this year bring you great opportunities and prosperity.\n\nHappy Birthday!\nAlaigal Team',
      recipientType: 'birthday'
    },
    {
      id: 4,
      title: 'Event Notification',
      icon: 'calendar-star',
      color: '#2196F3',
      description: 'Notify members about upcoming events',
      defaultSubject: 'Upcoming Event - Alaigal Networking',
      defaultContent: 'Dear Member,\n\nWe are excited to invite you to our upcoming networking event!\n\nEvent Details:\nDate: [Date]\nTime: [Time]\nLocation: [Location]\n\nLooking forward to seeing you there!\n\nAlaigal Team',
      recipientType: 'all'
    },
    {
      id: 5,
      title: 'Custom Message',
      icon: 'email-outline',
      color: '#9C27B0',
      description: 'Send custom message to members',
      defaultSubject: '',
      defaultContent: '',
      recipientType: 'all'
    },
  ];

  const unpaidMembers = [
    { id: 1, name: 'John Doe', email: 'john@example.com', amount: 5000 },
    { id: 2, name: 'Sarah Smith', email: 'sarah@example.com', amount: 5000 },
    { id: 3, name: 'Mike Johnson', email: 'mike@example.com', amount: 5000 },
  ];

  const birthdayMembers = [
    { id: 1, name: 'Emma Wilson', email: 'emma@example.com', date: '2026-01-15' },
    { id: 2, name: 'David Lee', email: 'david@example.com', date: '2026-01-20' },
  ];

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
    setFormData({
      toEmail: '',
      toMemberName: '',
      subject: template.defaultSubject,
      content: template.defaultContent,
      recipientType: template.recipientType,
    });
    setShowTemplateModal(false);
    setShowComposeModal(true);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSelectMember = (member) => {
    setFormData(prev => ({
      ...prev,
      toMemberName: member.name,
      toEmail: member.email,
    }));
    setShowMemberDropdown(false);
  };

  const handlePickAttachment = async () => {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles],
      });
      setAttachment(result);
      Alert.alert('Success', `File attached: ${result.name}`);
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        console.log('User cancelled file picker');
      } else {
        Alert.alert('Error', 'Failed to pick file');
      }
    }
  };

  const validateForm = () => {
    if (!selectedTemplate) {
      Alert.alert('Error', 'Please select a template');
      return false;
    }
    if (!formData.toEmail.trim() && selectedTemplate.recipientType === 'all') {
      Alert.alert('Error', 'Please enter recipient email');
      return false;
    }
    if (!formData.subject.trim()) {
      Alert.alert('Error', 'Please enter subject');
      return false;
    }
    if (!formData.content.trim()) {
      Alert.alert('Error', 'Please enter message content');
      return false;
    }
    return true;
  };

  const handleSendMessage = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Determine recipients based on template type
      let recipients = [];
      
      if (selectedTemplate.recipientType === 'unpaid') {
        recipients = unpaidMembers.map(m => m.email);
      } else if (selectedTemplate.recipientType === 'birthday') {
        recipients = birthdayMembers.map(m => m.email);
      } else {
        recipients = [formData.toEmail];
      }

      // TODO: Call API to send message
      console.log('Sending message:', {
        template: selectedTemplate.title,
        recipients,
        subject: formData.subject,
        content: formData.content,
        attachment: attachment?.name,
      });

      Alert.alert(
        'Success',
        `Message sent to ${recipients.length} recipient(s)!`,
        [
          {
            text: 'OK',
            onPress: () => {
              setShowComposeModal(false);
              setSelectedTemplate(null);
              setFormData({ toEmail: '', subject: '', content: '', recipientType: 'all' });
              setAttachment(null);
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const renderTemplateCard = ({ item }) => (
    <TouchableOpacity
      style={styles.templateCard}
      onPress={() => handleSelectTemplate(item)}
    >
      <LinearGradient
        colors={[item.color + '20', item.color + '10']}
        style={styles.templateGradient}
      >
        <View style={[styles.templateIcon, { backgroundColor: item.color }]}>
          <Icon name={item.icon} size={28} color="#FFF" />
        </View>
        <Text style={styles.templateTitle}>{item.title}</Text>
        <Text style={styles.templateDescription}>{item.description}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderComposeModal = () => {
    if (!selectedTemplate) return null;

    const getRecipientInfo = () => {
      if (selectedTemplate.recipientType === 'unpaid') {
        return `${unpaidMembers.length} unpaid members`;
      } else if (selectedTemplate.recipientType === 'birthday') {
        return `${birthdayMembers.length} birthday members`;
      }
      return 'Custom recipient';
    };

    return (
      <Modal
        visible={showComposeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowComposeModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <StatusBar backgroundColor="#4A90E2" barStyle="light-content" />

          {/* Modal Header */}
          <LinearGradient colors={['#4A90E2', '#87CEEB']} style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowComposeModal(false)}>
              <Icon name="close" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Compose Message</Text>
            <View style={{ width: 24 }} />
          </LinearGradient>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Template Info */}
            <View style={styles.templateInfoCard}>
              <View style={[styles.templateIcon, { backgroundColor: selectedTemplate.color }]}>
                <Icon name={selectedTemplate.icon} size={24} color="#FFF" />
              </View>
              <View style={styles.templateInfoText}>
                <Text style={styles.templateInfoTitle}>{selectedTemplate.title}</Text>
                <Text style={styles.templateInfoSubtitle}>
                  Recipients: {getRecipientInfo()}
                </Text>
              </View>
            </View>

            {/* Recipient Email (if custom) */}
            {selectedTemplate.recipientType === 'all' && (
              <View style={styles.section}>
                <Text style={styles.label}>To Member *</Text>
                <TouchableOpacity
                  style={styles.memberDropdownButton}
                  onPress={() => setShowMemberDropdown(!showMemberDropdown)}
                >
                  <Icon name="account" size={20} color="#4A90E2" style={styles.icon} />
                  <Text style={[styles.input, { color: formData.toMemberName ? '#333' : '#999' }]}>
                    {formData.toMemberName || 'Select member'}
                  </Text>
                  <Icon name={showMemberDropdown ? 'chevron-up' : 'chevron-down'} size={20} color="#4A90E2" />
                </TouchableOpacity>

                {showMemberDropdown && (
                  <View style={styles.memberDropdownList}>
                    {allMembers.map(member => (
                      <TouchableOpacity
                        key={member.id}
                        style={styles.memberDropdownItem}
                        onPress={() => handleSelectMember(member)}
                      >
                        <View style={styles.memberItemContent}>
                          <Text style={styles.memberName}>{member.name}</Text>
                          <Text style={styles.memberEmail}>{member.email}</Text>
                        </View>
                        {formData.toMemberName === member.name && (
                          <Icon name="check" size={20} color="#4A90E2" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Subject */}
            <View style={styles.section}>
              <Text style={styles.label}>Subject *</Text>
              <View style={styles.inputContainer}>
                <Icon name="format-title" size={20} color="#4A90E2" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter subject"
                  value={formData.subject}
                  onChangeText={(text) => handleInputChange('subject', text)}
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            {/* Content */}
            <View style={styles.section}>
              <Text style={styles.label}>Message Content *</Text>
              <View style={[styles.inputContainer, styles.textAreaContainer]}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Enter message content"
                  value={formData.content}
                  onChangeText={(text) => handleInputChange('content', text)}
                  multiline
                  numberOfLines={8}
                  placeholderTextColor="#999"
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Attachment */}
            <View style={styles.section}>
              <Text style={styles.label}>Attachment (Optional)</Text>
              <TouchableOpacity
                style={styles.attachmentButton}
                onPress={handlePickAttachment}
              >
                <Icon name="paperclip" size={20} color="#4A90E2" />
                <Text style={styles.attachmentButtonText}>
                  {attachment ? `Attached: ${attachment.name}` : 'Attach File'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Preview */}
            <View style={styles.section}>
              <Text style={styles.label}>Preview</Text>
              <View style={styles.previewCard}>
                <Text style={styles.previewSubject}>{formData.subject}</Text>
                <Text style={styles.previewContent}>{formData.content}</Text>
              </View>
            </View>

            {/* Send Button */}
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSendMessage}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Icon name="send" size={20} color="#FFF" />
                  <Text style={styles.sendButtonText}>Send Message</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={{ height: 30 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#4A90E2" barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#4A90E2', '#87CEEB']} style={styles.header}>
        <Text style={styles.headerTitle}>Send Messages</Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Icon name="information" size={20} color="#4A90E2" />
          <Text style={styles.infoText}>
            Select a template to send messages to members. Payment Reminder automatically sends to unpaid members.
          </Text>
        </View>

        {/* Message Templates */}
        <Text style={styles.sectionTitle}>Message Templates</Text>
        <FlatList
          data={messageTemplates}
          renderItem={renderTemplateCard}
          keyExtractor={item => item.id.toString()}
          scrollEnabled={false}
          numColumns={2}
          columnWrapperStyle={styles.templateGrid}
        />

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Icon name="account-alert" size={24} color="#FF9800" />
            <Text style={styles.statLabel}>Unpaid Members</Text>
            <Text style={styles.statValue}>{unpaidMembers.length}</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="cake-variant" size={24} color="#E91E63" />
            <Text style={styles.statLabel}>Birthdays This Month</Text>
            <Text style={styles.statValue}>{birthdayMembers.length}</Text>
          </View>
        </View>

        {/* Recent Messages */}
        <Text style={styles.sectionTitle}>Recent Messages</Text>
        <View style={styles.recentMessagesContainer}>
          <View style={styles.messageItem}>
            <Icon name="check-circle" size={20} color="#4CAF50" />
            <View style={styles.messageItemText}>
              <Text style={styles.messageItemTitle}>Payment Reminder</Text>
              <Text style={styles.messageItemDate}>Sent to 3 members • Jan 6, 2026</Text>
            </View>
          </View>
          <View style={styles.messageItem}>
            <Icon name="check-circle" size={20} color="#4CAF50" />
            <View style={styles.messageItemText}>
              <Text style={styles.messageItemTitle}>Welcome Message</Text>
              <Text style={styles.messageItemDate}>Sent to 1 member • Jan 5, 2026</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Template Selection Modal */}
      <Modal
        visible={showTemplateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTemplateModal(false)}
      >
        <View style={styles.templateModalOverlay}>
          <View style={styles.templateModalContent}>
            <Text style={styles.templateModalTitle}>Select Template</Text>
            <FlatList
              data={messageTemplates}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.templateOption}
                  onPress={() => handleSelectTemplate(item)}
                >
                  <Icon name={item.icon} size={24} color={item.color} />
                  <View style={styles.templateOptionText}>
                    <Text style={styles.templateOptionTitle}>{item.title}</Text>
                    <Text style={styles.templateOptionDesc}>{item.description}</Text>
                  </View>
                  <Icon name="chevron-right" size={24} color="#999" />
                </TouchableOpacity>
              )}
              keyExtractor={item => item.id.toString()}
              scrollEnabled={false}
            />
            <TouchableOpacity
              style={styles.templateModalClose}
              onPress={() => setShowTemplateModal(false)}
            >
              <Text style={styles.templateModalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {renderComposeModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F9FC',
  },
  header: {
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1976D2',
    marginLeft: 10,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginBottom: 12,
    marginTop: 10,
  },
  templateGrid: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  templateCard: {
    width: '48%',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
  },
  templateGradient: {
    padding: 15,
    alignItems: 'center',
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
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  templateDescription: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 20,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    elevation: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginTop: 4,
  },
  recentMessagesContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 10,
    elevation: 2,
  },
  messageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  messageItemText: {
    flex: 1,
    marginLeft: 12,
  },
  messageItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  messageItemDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F5F9FC',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  modalContent: {
    flex: 1,
    padding: 15,
  },
  templateInfoCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    alignItems: 'center',
    elevation: 2,
  },
  templateInfoText: {
    flex: 1,
    marginLeft: 12,
  },
  templateInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  templateInfoSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 12,
    minHeight: 50,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    paddingVertical: 12,
  },
  textAreaContainer: {
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  textArea: {
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  attachmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  attachmentButtonText: {
    fontSize: 14,
    color: '#4A90E2',
    marginLeft: 10,
    fontWeight: '500',
  },
  previewCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 12,
  },
  previewSubject: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  previewContent: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
  sendButton: {
    backgroundColor: '#4A90E2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  sendButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  // Template Modal
  templateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  templateModalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 15,
    paddingTop: 20,
    maxHeight: '80%',
  },
  templateModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  templateOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  templateOptionText: {
    flex: 1,
    marginLeft: 12,
  },
  templateOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  templateOptionDesc: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  templateModalClose: {
    paddingVertical: 15,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    marginTop: 10,
  },
  templateModalCloseText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
  },
  memberDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 12,
    minHeight: 50,
  },
  memberDropdownList: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginTop: 8,
    maxHeight: 250,
    elevation: 3,
  },
  memberDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    justifyContent: 'space-between',
  },
  memberItemContent: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  memberEmail: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
});

export default Messages;
