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
  Image,
  ActivityIndicator,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from '../service/api';
import API_BASE_URL from '../apiConfig';

const MemberDetails = () => {
  const navigation = useNavigation();
  const route = useRoute();
  
  const passedMember = route.params?.memberData || route.params?.member;
  const memberId = route.params?.memberId || passedMember?.id;
  
  const [memberData, setMemberData] = useState(passedMember || null);
  const [businesses, setBusinesses] = useState([]);
  const [photoUri, setPhotoUri] = useState(null);
  const [photoError, setPhotoError] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const role = await AsyncStorage.getItem('role') || await AsyncStorage.getItem('user_role');
        setUserRole(role);
      } catch (e) {}

      if (memberId) {
        try {
          const data = await ApiService.getMemberWithBusinessDetails(memberId);
          if (data) {
            setMemberData(data);
            // Parse businesses exactly like Profile.js does
            if (data.businesses && Array.isArray(data.businesses)) {
              setBusinesses(data.businesses.map(b => ({
                id: b.id,
                name: b.businessName,
                description: b.businessDescription || '',
                images: (b.imagePaths || []).map(img =>
                  img.startsWith('http') ? img : `${API_BASE_URL}${img}`
                ),
              })));
            } else if (data.business) {
              // fallback: old comma-separated format
              const names = data.business.split(',').map(n => n.trim()).filter(Boolean);
              const imgs = data.businessImages
                ? data.businessImages.split(',').map(i => i.trim()).filter(Boolean)
                    .map(i => i.startsWith('http') ? i : `${API_BASE_URL}${i}`)
                : [];
              setBusinesses(names.map((name, idx) => ({
                name,
                description: '',
                images: idx === 0 ? imgs : [],
              })));
            }
            // Profile image
            if (data.profileImage) {
              setPhotoUri(data.profileImage.startsWith('http')
                ? data.profileImage
                : `${API_BASE_URL}${data.profileImage}`);
            } else {
              setPhotoUri(ApiService.getMemberPhotoUrl(memberId));
            }
          }
        } catch (e) {
          console.warn('Could not fetch member details:', e.message);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    init();
  }, [memberId]);

  const isAdmin = userRole === 'Admin';

  const handleEditMember = () => {
    navigation.navigate('NewMember', { member: memberData, isEditing: true });
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
          onPress: async () => {
            try {
              await ApiService.deleteMember(memberId);
              Alert.alert('Success', 'Member deleted successfully');
              navigation.goBack();
            } catch (e) {
              Alert.alert('Error', 'Failed to delete member');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#4A90E2', '#87CEEB']} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Member Details</Text>
          <View style={{ width: 24 }} />
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Loading member details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!memberData) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#4A90E2', '#87CEEB']} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Member Details</Text>
          <View style={{ width: 24 }} />
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <Icon name="account-off" size={60} color="#CCC" />
          <Text style={styles.loadingText}>Member not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const businessName = memberData.business || memberData.businessName || memberData.Business || memberData.BusinessName;
  const businessCategory = memberData.businessCategory || memberData.BusinessCategory;
  const businessImage = memberData.businessImage || memberData.BusinessImage || memberData.businessPhoto || memberData.BusinessPhoto;
  const businessImageUri = businessImage
    ? (businessImage.startsWith('http') ? businessImage : `https://www.vivifysoft.in/AlaigalBE/${businessImage}`)
    : null;

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
          <View style={styles.avatarWrapper}>
            {photoUri && !photoError ? (
              <Image
                source={{ uri: photoUri }}
                style={styles.avatarImage}
                resizeMode="cover"
                onError={() => setPhotoError(true)}
              />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {memberData.name?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.memberName}>{memberData.name || 'Unknown'}</Text>
          <Text style={styles.memberId}>
            ID: {memberData.memberId || memberData.id || 'N/A'}
          </Text>
          <View style={[
            styles.statusBadge,
            { backgroundColor: memberData.status === 'Active' || memberData.isActive ? '#E8F5E9' : '#FFF3E0' }
          ]}>
            <Text style={[
              styles.statusText,
              { color: memberData.status === 'Active' || memberData.isActive ? '#4CAF50' : '#FF9800' }
            ]}>
              {memberData.status || (memberData.isActive ? 'Active' : 'Inactive')}
            </Text>
          </View>
        </View>

        {/* Business Details — same structure as Profile.js */}
        {businesses.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Business Details</Text>
            {businesses.map((biz, idx) => (
              <View key={idx} style={styles.businessCard}>
                <View style={styles.businessCardHeader}>
                  <Icon name="briefcase" size={18} color="#4A90E2" />
                  <Text style={styles.businessCardName}>{biz.name}</Text>
                </View>
                {biz.description ? (
                  <Text style={styles.businessCardDesc}>{biz.description}</Text>
                ) : null}
                {biz.images && biz.images.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bizImagesScroll}>
                    {biz.images.map((img, imgIdx) => (
                      <TouchableOpacity key={imgIdx} onPress={() => setFullScreenImage(img)}>
                        <Image source={{ uri: img }} style={styles.bizThumb} resizeMode="cover" />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Icon name="phone" size={20} color="#4A90E2" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>
                  {memberData.phone || memberData.mobile || memberData.telephone || 'Not provided'}
                </Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Icon name="email" size={20} color="#4A90E2" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>
                  {memberData.email || 'Not provided'}
                </Text>
              </View>
            </View>
            {(memberData.address || memberData.Address) && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Icon name="map-marker" size={20} color="#4A90E2" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Address</Text>
                    <Text style={styles.infoValue}>
                      {memberData.address || memberData.Address}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Membership Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Membership Information</Text>
          <View style={styles.infoCard}>
            {(memberData.joinDate || memberData.JoinDate) && (
              <>
                <View style={styles.infoRow}>
                  <Icon name="calendar" size={20} color="#4A90E2" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Join Date</Text>
                    <Text style={styles.infoValue}>
                      {new Date(memberData.joinDate || memberData.JoinDate).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <View style={styles.divider} />
              </>
            )}
            {(memberData.dob || memberData.DOB) && (
              <>
                <View style={styles.infoRow}>
                  <Icon name="cake" size={20} color="#4A90E2" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Date of Birth</Text>
                    <Text style={styles.infoValue}>
                      {new Date(memberData.dob || memberData.DOB).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <View style={styles.divider} />
              </>
            )}
            {memberData.gender && (
              <>
                <View style={styles.infoRow}>
                  <Icon name="gender-male-female" size={20} color="#4A90E2" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Gender</Text>
                    <Text style={styles.infoValue}>{memberData.gender}</Text>
                  </View>
                </View>
                <View style={styles.divider} />
              </>
            )}
            {(memberData.subCompanyId || memberData.SubCompanyId) && (
              <View style={styles.infoRow}>
                <Icon name="office-building" size={20} color="#4A90E2" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Sub Company ID</Text>
                  <Text style={styles.infoValue}>
                    {memberData.subCompanyId || memberData.SubCompanyId}
                  </Text>
                </View>
              </View>
            )}
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

      {/* Full screen image viewer */}
      <Modal visible={!!fullScreenImage} transparent animationType="fade" onRequestClose={() => setFullScreenImage(null)}>
        <View style={styles.fullScreenOverlay}>
          <TouchableOpacity style={styles.fullScreenClose} onPress={() => setFullScreenImage(null)}>
            <Icon name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          {fullScreenImage && (
            <Image source={{ uri: fullScreenImage }} style={styles.fullScreenImg} resizeMode="contain" />
          )}
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
  avatarWrapper: {
    width: 90,
    height: 90,
    borderRadius: 45,
    overflow: 'hidden',
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: '#666',
    marginTop: 8,
  },
  businessImageContainer: {
    width: '100%',
    height: 160,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 12,
  },
  businessImage: {
    width: '100%',
    height: '100%',
  },
  // Business card styles
  businessCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
  },
  businessCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  businessCardName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#212c62',
    flex: 1,
  },
  businessCardDesc: {
    fontSize: 13,
    color: '#555',
    marginBottom: 10,
    lineHeight: 18,
  },
  bizImagesScroll: {
    marginTop: 4,
  },
  bizThumb: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 8,
  },
  // Full screen image viewer
  fullScreenOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenClose: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  fullScreenImg: {
    width: '100%',
    height: '80%',
  },
});

export default MemberDetails;
