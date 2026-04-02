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

const AddBatch = ({ navigation }) => {
  const [batchName, setBatchName] = useState('');
  const [timing, setTiming] = useState('');
  const [capacity, setCapacity] = useState('');
  const [trainer, setTrainer] = useState('');
  const [selectedDays, setSelectedDays] = useState([]);

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  const trainers = [
    { id: 1, name: 'John Doe', specialization: 'Cardio' },
    { id: 2, name: 'Jane Smith', specialization: 'Strength' },
    { id: 3, name: 'Mike Johnson', specialization: 'Yoga' },
  ];

  const toggleDay = (day) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleAddBatch = () => {
    if (!batchName || !timing || !capacity || selectedDays.length === 0) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    Alert.alert('Success', 'Batch created successfully!');
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Batch Form */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Batch Information</Text>
          <View style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Batch Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Morning Cardio"
                value={batchName}
                onChangeText={setBatchName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Timing *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 6:00 AM - 7:00 AM"
                value={timing}
                onChangeText={setTiming}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Capacity *</Text>
              <TextInput
                style={styles.input}
                placeholder="Maximum members"
                keyboardType="numeric"
                value={capacity}
                onChangeText={setCapacity}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Select Days *</Text>
              <View style={styles.daysContainer}>
                {days.map(day => (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayButton,
                      selectedDays.includes(day) && styles.selectedDay
                    ]}
                    onPress={() => toggleDay(day)}
                  >
                    <Text style={[
                      styles.dayText,
                      selectedDays.includes(day) && styles.selectedDayText
                    ]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Assign Trainer (Optional)</Text>
              <View style={styles.trainersList}>
                {trainers.map(t => (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.trainerCard,
                      trainer === t.name && styles.selectedTrainer
                    ]}
                    onPress={() => setTrainer(t.name)}
                  >
                    <View style={styles.trainerAvatar}>
                      <Text style={styles.trainerAvatarText}>{t.name.charAt(0)}</Text>
                    </View>
                    <View style={styles.trainerInfo}>
                      <Text style={styles.trainerName}>{t.name}</Text>
                      <Text style={styles.trainerSpec}>{t.specialization}</Text>
                    </View>
                    {trainer === t.name && (
                      <Icon name="check-circle" size={24} color="#4CAF50" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handleAddBatch}>
              <Icon name="plus-circle" size={20} color="#FFF" />
              <Text style={styles.submitButtonText}>Create Batch</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Existing Batches */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Existing Batches</Text>
          <View style={styles.batchesList}>
            {[
              { name: 'Morning Cardio', timing: '6:00 AM - 7:00 AM', members: 15, capacity: 20 },
              { name: 'Evening Strength', timing: '6:00 PM - 7:00 PM', members: 18, capacity: 20 },
            ].map((batch, index) => (
              <View key={index} style={styles.batchCard}>
                <View style={styles.batchHeader}>
                  <Icon name="account-group" size={24} color="#2196F3" />
                  <Text style={styles.batchName}>{batch.name}</Text>
                </View>
                <View style={styles.batchDetails}>
                  <View style={styles.batchRow}>
                    <Icon name="clock-outline" size={16} color="#666" />
                    <Text style={styles.batchText}>{batch.timing}</Text>
                  </View>
                  <View style={styles.batchRow}>
                    <Icon name="account-multiple" size={16} color="#666" />
                    <Text style={styles.batchText}>
                      {batch.members}/{batch.capacity} members
                    </Text>
                  </View>
                </View>
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
  section: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B5E35',
    marginBottom: 15,
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
    color: '#1B5E35',
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
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  dayButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFF',
  },
  selectedDay: {
    backgroundColor: '#1B5E35',
    borderColor: '#1B5E35',
  },
  dayText: {
    fontSize: 14,
    color: '#666',
  },
  selectedDayText: {
    color: '#FFF',
    fontWeight: '600',
  },
  trainersList: {
    gap: 10,
  },
  trainerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFF',
  },
  selectedTrainer: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  trainerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  trainerAvatarText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  trainerInfo: {
    flex: 1,
  },
  trainerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B5E35',
  },
  trainerSpec: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#1B5E35',
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
  batchesList: {
    gap: 12,
  },
  batchCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    elevation: 2,
  },
  batchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  batchName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B5E35',
    marginLeft: 10,
  },
  batchDetails: {
    gap: 8,
  },
  batchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  batchText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
});

export default AddBatch;

