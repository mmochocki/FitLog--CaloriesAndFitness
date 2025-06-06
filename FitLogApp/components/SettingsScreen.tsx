import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { TextInput, Button, Text, Card, Divider, Switch, List } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserData, ThemeMode } from '../types';
import { LIGHT_COLORS, DARK_COLORS, getColors } from '../styles/theme';

type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

const activityLevels: Record<ActivityLevel, string> = {
  sedentary: 'Siedzący tryb życia',
  light: 'Lekka aktywność',
  moderate: 'Umiarkowana aktywność',
  active: 'Aktywny tryb życia',
  very_active: 'Bardzo aktywny tryb życia'
};

interface SettingsScreenProps {
  onUserDataUpdate: (data: UserData) => void;
  onBack: () => void;
  themeMode?: ThemeMode;
}

export default function SettingsScreen({ onUserDataUpdate, onBack, themeMode = 'light' }: SettingsScreenProps) {
  const [userData, setUserData] = useState<UserData>({
    weight: 70,
    height: 175,
    age: 30,
    gender: 'male',
    activityLevel: 'moderate',
    dailyCalories: 2000,
    manualCalories: false,
    darkMode: false,
  });
  const [bmi, setBmi] = useState<number | null>(null);
  const [bmiCategory, setBmiCategory] = useState<string>('');
  const [calculatedCalories, setCalculatedCalories] = useState<number>(0);
  const [expanded, setExpanded] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const colors = getColors(themeMode);

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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <List.Accordion
          title="Twoje dane"
          titleStyle={[styles.title, { color: colors.text }]}
          style={[styles.accordion, { backgroundColor: colors.card }]}
          expanded={expanded}
          onPress={() => setExpanded(!expanded)}
        >
          <View style={styles.accordionContent}>
            <TextInput
              label="Waga (kg)"
              value={userData.weight.toString()}
              onChangeText={(text) => setUserData({ ...userData, weight: Number(text) || 0 })}
              keyboardType="numeric"
              style={[styles.input, { backgroundColor: colors.card }]}
              mode="outlined"
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
              textColor={colors.text}
            />

            <TextInput
              label="Wzrost (cm)"
              value={userData.height.toString()}
              onChangeText={(text) => setUserData({ ...userData, height: Number(text) || 0 })}
              keyboardType="numeric"
              style={[styles.input, { backgroundColor: colors.card }]}
              mode="outlined"
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
              textColor={colors.text}
            />

            <TextInput
              label="Wiek"
              value={userData.age.toString()}
              onChangeText={(text) => setUserData({ ...userData, age: Number(text) || 0 })}
              keyboardType="numeric"
              style={[styles.input, { backgroundColor: colors.card }]}
              mode="outlined"
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
              textColor={colors.text}
            />

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Płeć</Text>
            <View style={styles.genderContainer}>
              <TouchableOpacity
                style={[
                  styles.genderButton,
                  { borderColor: colors.border },
                  userData.gender === 'male' && [styles.genderButtonActive, { backgroundColor: colors.primary }]
                ]}
                onPress={() => setUserData({ ...userData, gender: 'male' })}
              >
                <Text style={[
                  styles.genderText,
                  { color: userData.gender === 'male' ? '#FFFFFF' : colors.textSecondary }
                ]}>Mężczyzna</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.genderButton,
                  { borderColor: colors.border },
                  userData.gender === 'female' && [styles.genderButtonActive, { backgroundColor: colors.primary }]
                ]}
                onPress={() => setUserData({ ...userData, gender: 'female' })}
              >
                <Text style={[
                  styles.genderText,
                  { color: userData.gender === 'female' ? '#FFFFFF' : colors.textSecondary }
                ]}>Kobieta</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Poziom aktywności</Text>
            <View style={styles.activityContainer}>
              {Object.entries(activityLevels).map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.activityButton,
                    { borderColor: colors.border },
                    userData.activityLevel === key && [styles.activityButtonActive, { backgroundColor: colors.primary }]
                  ]}
                  onPress={() => setUserData({ ...userData, activityLevel: key as ActivityLevel })}
                >
                  <Text style={[
                    styles.activityText,
                    { color: userData.activityLevel === key ? '#FFFFFF' : colors.textSecondary }
                  ]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.manualCaloriesContainer}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Dzienne zapotrzebowanie kaloryczne</Text>
              <View style={styles.manualCaloriesToggle}>
                <Text style={[styles.manualCaloriesLabel, { color: colors.text }]}>Ręczne ustawienie</Text>
                <Switch
                  value={userData.manualCalories}
                  onValueChange={(value) => setUserData({ ...userData, manualCalories: value })}
                  color={colors.primary}
                />
              </View>
              {userData.manualCalories && (
                <TextInput
                  label="Dzienne zapotrzebowanie (kcal)"
                  value={userData.dailyCalories.toString()}
                  onChangeText={(text) => setUserData({ ...userData, dailyCalories: Number(text) || 0 })}
                  keyboardType="numeric"
                  style={[styles.input, { backgroundColor: colors.card }]}
                  mode="outlined"
                  outlineColor={colors.border}
                  activeOutlineColor={colors.primary}
                  textColor={colors.text}
                />
              )}
            </View>
          </View>
        </List.Accordion>

        <View style={styles.sectionSpacer} />

        <Card style={[styles.card, { backgroundColor: colors.card }]}>
          <Card.Content>
            <View style={styles.manualCaloriesContainer}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Ręczne ustawienie kalorii</Text>
              <View style={styles.switchContainer}>
                <Text style={{ color: colors.text }}>Włącz ręczne ustawienie</Text>
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
                  color={colors.primary}
                />
              </View>
            </View>

            {userData.manualCalories ? (
              <TextInput
                label="Dzienne zapotrzebowanie kaloryczne"
                value={userData.dailyCalories.toString()}
                onChangeText={(text) => setUserData({ ...userData, dailyCalories: Number(text) || 0 })}
                keyboardType="numeric"
                style={[styles.input, { backgroundColor: colors.card }]}
                mode="outlined"
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                textColor={colors.text}
              />
            ) : (
              <View style={styles.resultContainer}>
                <Text style={[styles.resultTitle, { color: colors.textSecondary }]}>Dzienne zapotrzebowanie kaloryczne</Text>
                <Text style={[styles.resultValue, { color: colors.primary }]}>{calculatedCalories} kcal</Text>
              </View>
            )}

            <Divider style={[styles.divider, { backgroundColor: colors.border }]} />

            {bmi !== null && (
              <View style={styles.resultContainer}>
                <Text style={[styles.resultTitle, { color: colors.textSecondary }]}>Twoje BMI</Text>
                <Text style={[styles.resultValue, { color: colors.primary }]}>{bmi.toFixed(1)}</Text>
                <Text style={[styles.resultCategory, { color: colors.textSecondary }]}>{bmiCategory}</Text>
              </View>
            )}
          </Card.Content>
        </Card>

        <View style={styles.sectionSpacer} />

        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={handleBack}
            style={[styles.button, { backgroundColor: isSaved ? colors.textSecondary : colors.buttonPrimary }]}
            icon={isSaved ? "check" : undefined}
            textColor="#FFFFFF"
          >
            {isSaved ? "Zapisano" : "Zapisz ustawienia"}
          </Button>
        </View>
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
    paddingVertical: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    marginTop: 8,
  },
  input: {
    marginBottom: 20,
    backgroundColor: 'white',
  },
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  genderButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginHorizontal: 4,
    alignItems: 'center',
  },
  genderButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  genderText: {
    fontSize: 16,
    color: '#666',
  },
  genderTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  activityContainer: {
    marginBottom: 20,
  },
  activityButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 8,
  },
  activityButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  activityText: {
    fontSize: 16,
    color: '#666',
  },
  activityTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  manualCaloriesContainer: {
    marginBottom: 20,
  },
  manualCaloriesToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  manualCaloriesLabel: {
    fontSize: 16,
    color: '#333',
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
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  accordion: {
    backgroundColor: 'white',
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  accordionContent: {
    padding: 16,
  },
  sectionSpacer: {
    height: 24,
  },
  themeContainer: {
    marginBottom: 20,
  },
  themeToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  themeLabel: {
    fontSize: 16,
    color: '#333',
  },
  themePreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  themePreviewBox: {
    width: '48%',
    height: 100,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  lightThemeBox: {
    backgroundColor: LIGHT_COLORS.card,
    borderWidth: 1,
    borderColor: LIGHT_COLORS.border,
  },
  darkThemeBox: {
    backgroundColor: DARK_COLORS.card,
    borderWidth: 1,
    borderColor: DARK_COLORS.border,
  },
  themePreviewText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: LIGHT_COLORS.text,
  },
  darkThemeText: {
    color: DARK_COLORS.text,
  },
  buttonContainer: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 6,
  },
}); 