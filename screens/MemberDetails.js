import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MemberDetails = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { member } = route.params || {};

  const [memberData] = useState(member || {
    id: 1,
    name: 'John Doe',
    memberId: 'ALG-001',
    phone: '9876543210',
    email: 'john@example.com',
    joinDate: '2026-01-06',
    status: 'Active',
    business: 'IT Solutions',
    address: '123 Main Street, City',
    batch: 'Morning',
    feesStatus: 'Paid',
  });

  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const role = await AsyncStorage.getItem('user_role');
        setUserRole(role);
      } catch (error) {
        console.error('Error checking user role:', error);
      }
    };
    checkUserRole();
  }, []);

  const isAdmin = userRole === 'Admin';

  const handleEditMember = () => {
    Alert.alert('Edit Member', 'Edit functionality coming soon');
  };

  const handleDeleteMember = () => {
    Alert.alert(
      'Delete Member',
      'Are you sure you want to delete this member?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Success', 'Member deleted successfully');
            navigation.goBack();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#4A90E2" barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#4A90E2', '#87CEEB']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Member Details</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Member Avatar Card */}
        <View style={styles.avatarCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{memberData.name?.charAt(0)}</Text>
          </View>
          <Text style={styles.memberName}>{memberData.name}</Text>
          <Text style={styles.memberId}>{memberData.memberId}</Text>
          <View style={[styles.statusBadge, { backgroundColor: memberData.status === 'Active' ? '#E8F5E9' : '#FFF3E0' }]}>
            <Text style={[styles.statusText, { color: memberData.status === 'Active' ? '#4CAF50' : '#FF9800' }]}>
              {memberData.status}
            </Text>
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Icon name="phone" size={20} color="#4A90E2" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{memberData.phone}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Icon name="email" size={20} color="#4A90E2" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{memberData.email}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Icon name="map-marker" size={20} color="#4A90E2" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={styles.infoValue}>{memberData.address}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Membership Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Membership Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Icon name="calendar" size={20} color="#4A90E2" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Join Date</Text>
                <Text style={styles.infoValue}>{memberData.joinDate}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Icon name="clock" size={20} color="#4A90E2" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Batch</Text>
                <Text style={styles.infoValue}>{memberData.batch}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Icon name="briefcase" size={20} color="#4A90E2" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Business</Text>
                <Text style={styles.infoValue}>{memberData.business}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Icon name="credit-card" size={20} color="#4A90E2" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Fees Status</Text>
                <Text style={[styles.infoValue, { color: memberData.feesStatus === 'Paid' ? '#4CAF50' : '#FF9800' }]}>
                  {memberData.feesStatus}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons - Only for Admin */}
        {isAdmin && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.editButton} onPress={handleEditMember}>
              <Icon name="pencil" size={18} color="#FFF" />
              <Text style={styles.buttonText}>Edit Member</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteMember}>
              <Icon name="trash-can" size={18} color="#FFF" />
              <Text style={styles.buttonText}>Delete Member</Text>
            </TouchableOpacity>
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
  },
  content: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  avatarCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 15,
    elevation: 2,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
  },
  memberName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  memberId: {
    fontSize: 14,
    color: '#999',
    marginBottom: 10,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginBottom: 10,
  },
  infoCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    elevation: 1,
    borderLeftWidth: 4,
    borderLeftColor: '#87CEEB',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
  },
  editButton: {
    backgroundColor: '#4A90E2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  deleteButton: {
    backgroundColor: '#FF6B6B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default MemberDetails;
