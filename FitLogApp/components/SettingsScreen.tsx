import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, SafeAreaView } from 'react-native';
import { TextInput, Button, Text, Card, Divider, Switch, List } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserData {
  weight: number;
  height: number;
  dailyCalories: number;
  age: number;
  gender: 'male' | 'female';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  manualCalories: boolean;
}

interface SettingsScreenProps {
  onUserDataUpdate: (data: UserData) => Promise<void>;
  onBack: () => void;
}

const activityLevels = [
  { value: 'sedentary', label: 'Siedzący tryb życia (brak aktywności)' },
  { value: 'light', label: 'Lekka aktywność (1-3 razy w tygodniu)' },
  { value: 'moderate', label: 'Umiarkowana aktywność (3-5 razy w tygodniu)' },
  { value: 'active', label: 'Aktywny tryb życia (6-7 razy w tygodniu)' },
  { value: 'very_active', label: 'Bardzo aktywny tryb życia (codziennie)' },
];

export default function SettingsScreen({ onUserDataUpdate, onBack }: SettingsScreenProps) {
  const [userData, setUserData] = useState<UserData>({
    weight: 0,
    height: 0,
    dailyCalories: 2000,
    age: 30,
    gender: 'male',
    activityLevel: 'moderate',
    manualCalories: false,
  });
  const [bmi, setBmi] = useState<number | null>(null);
  const [bmiCategory, setBmiCategory] = useState<string>('');
  const [calculatedCalories, setCalculatedCalories] = useState<number>(0);
  const [expanded, setExpanded] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (userData.height > 0 && userData.weight > 0) {
      calculateBmi();
    }
  }, [userData.height, userData.weight]);

  useEffect(() => {
    if (userData.height > 0 && userData.weight > 0 && userData.age > 0 && !userData.manualCalories) {
      const newCalories = calculateCalories();
      setCalculatedCalories(newCalories);
      setUserData(prev => ({ ...prev, dailyCalories: newCalories }));
    }
  }, [userData.height, userData.weight, userData.age, userData.gender, userData.activityLevel, userData.manualCalories]);

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
      await onUserDataUpdate(userData);
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
      }, 2000);
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

  const handleBack = async () => {
    try {
      await saveUserData();
      onBack();
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <List.Accordion
          title="Twoje dane"
          titleStyle={styles.title}
          style={styles.accordion}
          expanded={expanded}
          onPress={() => setExpanded(!expanded)}
        >
          <View style={styles.accordionContent}>
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
          </View>
        </List.Accordion>

        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.manualCaloriesContainer}>
              <Text style={styles.sectionTitle}>Ręczne ustawienie kalorii</Text>
              <View style={styles.switchContainer}>
                <Text>Włącz ręczne ustawienie</Text>
                <Switch
                  value={userData.manualCalories}
                  onValueChange={(value) => {
                    setUserData({ ...userData, manualCalories: value });
                    if (!value) {
                      const newCalories = calculateCalories();
                      setCalculatedCalories(newCalories);
                      setUserData(prev => ({ ...prev, dailyCalories: newCalories }));
                    }
                  }}
                />
              </View>
            </View>

            {userData.manualCalories ? (
              <TextInput
                label="Dzienne zapotrzebowanie kaloryczne"
                value={userData.dailyCalories.toString()}
                onChangeText={(text) => setUserData({ ...userData, dailyCalories: Number(text) || 0 })}
                keyboardType="numeric"
                style={styles.input}
                mode="outlined"
              />
            ) : (
              <View style={styles.resultContainer}>
                <Text style={styles.resultTitle}>Dzienne zapotrzebowanie kaloryczne</Text>
                <Text style={styles.resultValue}>{calculatedCalories} kcal</Text>
              </View>
            )}

            <Divider style={styles.divider} />

            {bmi !== null && (
              <View style={styles.resultContainer}>
                <Text style={styles.resultTitle}>Twoje BMI</Text>
                <Text style={styles.resultValue}>{bmi.toFixed(1)}</Text>
                <Text style={styles.resultCategory}>{bmiCategory}</Text>
              </View>
            )}
          </Card.Content>
        </Card>

        <Button
          mode="contained"
          onPress={saveUserData}
          style={[styles.saveButton, isSaved && styles.savedButton]}
          icon={isSaved ? "check" : undefined}
        >
          {isSaved ? "Zapisano" : "Zapisz ustawienia"}
        </Button>
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
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
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
    marginBottom: 32,
    backgroundColor: '#4CAF50',
  },
  savedButton: {
    backgroundColor: '#9E9E9E',
  },
  manualCaloriesContainer: {
    marginTop: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  accordion: {
    marginBottom: 16,
  },
  accordionContent: {
    padding: 16,
  },
}); 