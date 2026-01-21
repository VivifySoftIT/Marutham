import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const TakePayment = ({ navigation }) => {
  const [selectedMember, setSelectedMember] = useState(null);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [searchQuery, setSearchQuery] = useState('');

  const members = [
    { id: 1, name: 'Rajesh Kumar', phone: '9876543210', dueAmount: 5000 },
    { id: 2, name: 'Priya Sharma', phone: '9876543211', dueAmount: 4500 },
    { id: 3, name: 'Amit Singh', phone: '9876543212', dueAmount: 6000 },
  ];

  const paymentMethods = [
    { id: 'cash', label: 'Cash', icon: 'cash' },
    { id: 'card', label: 'Card', icon: 'credit-card' },
    { id: 'upi', label: 'UPI', icon: 'cellphone' },
    { id: 'bank', label: 'Bank Transfer', icon: 'bank' },
  ];

  const handlePayment = () => {
    if (!selectedMember) {
      Alert.alert('Error', 'Please select a member');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    Alert.alert('Success', `Payment of ₹${amount} received from ${selectedMember.name}`);
    setSelectedMember(null);
    setAmount('');
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Search Member */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Member</Text>
          <View style={styles.searchContainer}>
            <Icon name="magnify" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search member..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          
          <View style={styles.membersList}>
            {members.map(member => (
              <TouchableOpacity
                key={member.id}
                style={[
                  styles.memberCard,
                  selectedMember?.id === member.id && styles.selectedMember
                ]}
                onPress={() => {
                  setSelectedMember(member);
                  setAmount(member.dueAmount.toString());
                }}
              >
                <View style={styles.memberAvatar}>
                  <Text style={styles.avatarText}>{member.name.charAt(0)}</Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <Text style={styles.memberPhone}>{member.phone}</Text>
                </View>
                <View style={styles.dueAmount}>
                  <Text style={styles.dueLabel}>Due</Text>
                  <Text style={styles.dueValue}>₹{member.dueAmount}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Payment Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Details</Text>
          <View style={styles.paymentCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Amount</Text>
              <View style={styles.amountInput}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Payment Method</Text>
              <View style={styles.methodsContainer}>
                {paymentMethods.map(method => (
                  <TouchableOpacity
                    key={method.id}
                    style={[
                      styles.methodButton,
                      paymentMethod === method.id && styles.activeMethod
                    ]}
                    onPress={() => setPaymentMethod(method.id)}
                  >
                    <Icon 
                      name={method.icon} 
                      size={20} 
                      color={paymentMethod === method.id ? '#FFF' : '#666'} 
                    />
                    <Text style={[
                      styles.methodText,
                      paymentMethod === method.id && styles.activeMethodText
                    ]}>
                      {method.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handlePayment}>
              <Icon name="check-circle" size={20} color="#FFF" />
              <Text style={styles.submitButtonText}>Confirm Payment</Text>
            </TouchableOpacity>
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
  section: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212c62',
    marginBottom: 15,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 10,
    fontSize: 14,
  },
  membersList: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 10,
    elevation: 2,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  selectedMember: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  memberAvatar: {
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
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212c62',
  },
  memberPhone: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  dueAmount: {
    alignItems: 'flex-end',
  },
  dueLabel: {
    fontSize: 11,
    color: '#666',
  },
  dueValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F44336',
  },
  paymentCard: {
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
  amountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 15,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212c62',
    marginRight: 5,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '600',
    color: '#212c62',
  },
  methodsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  methodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFF',
  },
  activeMethod: {
    backgroundColor: '#212c62',
    borderColor: '#212c62',
  },
  methodText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  activeMethodText: {
    color: '#FFF',
    fontWeight: '600',
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    paddingVertical: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

export default TakePayment;
