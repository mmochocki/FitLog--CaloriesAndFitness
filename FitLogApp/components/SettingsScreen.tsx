import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, SafeAreaView } from 'react-native';
import { TextInput, Button, Text, Card, Divider } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserData {
  weight: number;
  height: number;
  dailyCalories: number;
  age: number;
  gender: 'male' | 'female';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
}

const activityLevels = [
  { value: 'sedentary', label: 'Siedzący tryb życia (brak aktywności)' },
  { value: 'light', label: 'Lekka aktywność (1-3 razy w tygodniu)' },
  { value: 'moderate', label: 'Umiarkowana aktywność (3-5 razy w tygodniu)' },
  { value: 'active', label: 'Aktywny tryb życia (6-7 razy w tygodniu)' },
  { value: 'very_active', label: 'Bardzo aktywny tryb życia (codziennie)' },
];

export default function SettingsScreen() {
  const [userData, setUserData] = useState<UserData>({
    weight: 0,
    height: 0,
    dailyCalories: 2000,
    age: 30,
    gender: 'male',
    activityLevel: 'moderate',
  });
  const [bmi, setBmi] = useState<number | null>(null);
  const [bmiCategory, setBmiCategory] = useState<string>('');
  const [calculatedCalories, setCalculatedCalories] = useState<number>(0);

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (userData.height > 0 && userData.weight > 0) {
      calculateBmi();
    }
  }, [userData.height, userData.weight]);

  useEffect(() => {
    if (userData.height > 0 && userData.weight > 0 && userData.age > 0) {
      const newCalories = calculateCalories();
      setCalculatedCalories(newCalories);
      setUserData(prev => ({ ...prev, dailyCalories: newCalories }));
    }
  }, [userData.height, userData.weight, userData.age, userData.gender, userData.activityLevel]);

  const loadUserData = async () => {
    try {
      const data = await AsyncStorage.getItem('userData');
      if (data) {
        const parsedData = JSON.parse(data);
        setUserData(parsedData);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const saveUserData = async () => {
    try {
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  };

  const calculateBmi = () => {
    const heightInMeters = userData.height / 100;
    const bmiValue = userData.weight / (heightInMeters * heightInMeters);
    setBmi(bmiValue);

    if (bmiValue < 18.5) {
      setBmiCategory('Niedowaga');
    } else if (bmiValue < 25) {
      setBmiCategory('Normalna waga');
    } else if (bmiValue < 30) {
      setBmiCategory('Nadwaga');
    } else {
      setBmiCategory('Otyłość');
    }
  };

  const calculateCalories = () => {
    // Wzór Harrisa-Benedicta
    let bmr;
    if (userData.gender === 'male') {
      bmr = 66.5 + (13.75 * userData.weight) + (5.003 * userData.height) - (6.755 * userData.age);
    } else {
      bmr = 655.1 + (9.563 * userData.weight) + (1.850 * userData.height) - (4.676 * userData.age);
    }

    // Mnożnik aktywności
    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };

    return Math.round(bmr * activityMultipliers[userData.activityLevel]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.title}>Twoje dane</Text>
            
            <TextInput
              label="Waga (kg)"
              value={userData.weight.toString()}
              onChangeText={(text) => setUserData({ ...userData, weight: Number(text) || 0 })}
              keyboardType="numeric"
              style={styles.input}
              mode="outlined"
            />

            <TextInput
              label="Wzrost (cm)"
              value={userData.height.toString()}
              onChangeText={(text) => setUserData({ ...userData, height: Number(text) || 0 })}
              keyboardType="numeric"
              style={styles.input}
              mode="outlined"
            />

            <TextInput
              label="Wiek"
              value={userData.age.toString()}
              onChangeText={(text) => setUserData({ ...userData, age: Number(text) || 0 })}
              keyboardType="numeric"
              style={styles.input}
              mode="outlined"
            />

            <Text style={styles.sectionTitle}>Płeć</Text>
            <View style={styles.genderContainer}>
              <Button
                mode={userData.gender === 'male' ? 'contained' : 'outlined'}
                onPress={() => setUserData({ ...userData, gender: 'male' })}
                style={styles.genderButton}
              >
                Mężczyzna
              </Button>
              <Button
                mode={userData.gender === 'female' ? 'contained' : 'outlined'}
                onPress={() => setUserData({ ...userData, gender: 'female' })}
                style={styles.genderButton}
              >
                Kobieta
              </Button>
            </View>

            <Text style={styles.sectionTitle}>Poziom aktywności</Text>
            {activityLevels.map((level) => (
              <Button
                key={level.value}
                mode={userData.activityLevel === level.value ? 'contained' : 'outlined'}
                onPress={() => setUserData({ ...userData, activityLevel: level.value as UserData['activityLevel'] })}
                style={styles.activityButton}
              >
                {level.label}
              </Button>
            ))}

            <Divider style={styles.divider} />

            {bmi !== null && (
              <View style={styles.resultContainer}>
                <Text style={styles.resultTitle}>Twoje BMI</Text>
                <Text style={styles.resultValue}>{bmi.toFixed(1)}</Text>
                <Text style={styles.resultCategory}>{bmiCategory}</Text>
              </View>
            )}

            <View style={styles.resultContainer}>
              <Text style={styles.resultTitle}>Dzienne zapotrzebowanie kaloryczne</Text>
              <Text style={styles.resultValue}>{calculatedCalories} kcal</Text>
            </View>

            <Button
              mode="contained"
              onPress={saveUserData}
              style={styles.saveButton}
            >
              Zapisz ustawienia
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    marginBottom: 8,
  },
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  genderButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  activityButton: {
    marginBottom: 8,
  },
  divider: {
    marginVertical: 16,
  },
  resultContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 16,
    color: '#666666',
  },
  resultValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginVertical: 4,
  },
  resultCategory: {
    fontSize: 16,
    color: '#666666',
  },
  saveButton: {
    marginTop: 16,
    backgroundColor: '#4CAF50',
  },
}); 