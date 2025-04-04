import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity, ScrollView, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, Chip, Searchbar, List, Portal, Modal } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeMode } from '../types';
import { getColors } from '../styles/theme';

interface Meal {
  id: string;
  name: string;
  calories: number;
  date: string;
}

interface ProductHistory {
  name: string;
  calories: number;
  lastUsed: string;
  usageCount: number;
}

interface AddMealFormProps {
  visible: boolean;
  onClose: () => void;
  onMealAdded: (meal: Meal) => void;
  mealToEdit?: Meal;
  themeMode?: ThemeMode;
}

export default function AddMealForm({ visible, onClose, onMealAdded, mealToEdit, themeMode = 'light' }: AddMealFormProps) {
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState<Meal[]>([]);
  const [mealHistory, setMealHistory] = useState<Meal[]>([]);
  
  const colors = getColors(themeMode);

  useEffect(() => {
    if (mealToEdit) {
      setName(mealToEdit.name);
      setCalories(mealToEdit.calories.toString());
    } else {
      setName('');
      setCalories('');
    }
    setError('');
    loadMealHistory();
  }, [visible, mealToEdit]);

  const loadMealHistory = async () => {
    try {
      const storedMeals = await AsyncStorage.getItem('meals');
      if (storedMeals) {
        const meals = JSON.parse(storedMeals);
        setMealHistory(meals);
      }
    } catch (error) {
      console.error('Error loading meal history:', error);
    }
  };

  const handleMealNameChange = (text: string) => {
    setName(text);
    if (text.length > 0) {
      // Tworzymy mapę unikalnych kombinacji nazwy i kaloryczności
      const uniqueMeals = new Map<string, Meal>();
      mealHistory.forEach(meal => {
        const key = `${meal.name.toLowerCase()}-${meal.calories}`;
        if (!uniqueMeals.has(key)) {
          uniqueMeals.set(key, meal);
        }
      });

      // Filtrujemy unikalne posiłki po nazwie
      const filtered = Array.from(uniqueMeals.values()).filter(meal => 
        meal.name.toLowerCase().includes(text.toLowerCase())
      );
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  const handleSuggestionSelect = (meal: Meal) => {
    setName(meal.name);
    setCalories(meal.calories.toString());
    setSuggestions([]);
  };

  const handleSubmit = async () => {
    if (!name || !calories) return;

    try {
      const newMeal: Meal = {
        id: mealToEdit?.id || Date.now().toString(),
        name,
        calories: parseInt(calories),
        date: new Date().toISOString(),
      };

      const existingMeals = await AsyncStorage.getItem('meals');
      let meals: Meal[] = [];
      
      if (existingMeals) {
        meals = JSON.parse(existingMeals);
        if (mealToEdit) {
          // Aktualizuj istniejący posiłek
          meals = meals.map(meal => 
            meal.id === mealToEdit.id ? newMeal : meal
          );
        } else {
          // Dodaj nowy posiłek
          meals.push(newMeal);
        }
      } else {
        meals = [newMeal];
      }

      await AsyncStorage.setItem('meals', JSON.stringify(meals));
      onMealAdded(newMeal);
      onClose();
    } catch (error) {
      console.error('Error saving meal:', error);
    }
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onClose}
        contentContainerStyle={styles.modalContainer}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ width: '100%', alignItems: 'center' }}
        >
          <View
            style={{ width: '100%', alignItems: 'center' }}
          >
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {mealToEdit ? 'Edytuj posiłek' : 'Dodaj nowy posiłek'}
              </Text>
              
              <View style={styles.formContainer}>
                <TextInput
                  label="Nazwa posiłku"
                  value={name}
                  onChangeText={handleMealNameChange}
                  style={styles.input}
                  mode="outlined"
                  error={!!error}
                  outlineColor={colors.border}
                  activeOutlineColor={colors.primary}
                  textColor={colors.text}
                  theme={{ 
                    colors: { 
                      background: colors.card, 
                      placeholder: colors.textSecondary, 
                      onSurfaceVariant: colors.textSecondary,
                      surface: colors.card,
                      surfaceVariant: colors.card,
                      primary: colors.primary
                    } 
                  }}
                />
                
                {suggestions.length > 0 && (
                  <View style={[styles.suggestionsContainer, { 
                    backgroundColor: colors.card,
                    borderColor: themeMode === 'dark' ? '#FFFFFF' : colors.border,
                    maxHeight: 200 // Ograniczenie maksymalnej wysokości listy sugestii
                  }]}>
                    <Text style={[styles.suggestionsTitle, { color: themeMode === 'dark' ? '#E0E0E0' : colors.textSecondary }]}>Propozycje z historii:</Text>
                    <FlatList
                      data={suggestions}
                      keyboardShouldPersistTaps="always"
                      keyExtractor={(item) => item.id}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          onPress={() => handleSuggestionSelect(item)}
                          style={[styles.suggestionItem, { borderBottomColor: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : colors.border }]}
                        >
                          <View style={styles.suggestionContent}>
                            <Text style={[styles.suggestionName, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">{item.name}</Text>
                            <View style={[styles.suggestionCalories, { backgroundColor: themeMode === 'dark' ? colors.primaryDark : colors.primaryLight }]}>
                              <Text style={[styles.caloriesText, { color: themeMode === 'dark' ? '#FFFFFF' : '#4CAF50' }]}>{item.calories}</Text>
                              <Text style={[styles.caloriesUnit, { color: themeMode === 'dark' ? '#FFFFFF' : '#666' }]}>kcal</Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      )}
                      style={styles.suggestionsList}
                      showsVerticalScrollIndicator={false}
                    />
                  </View>
                )}
                
                <TextInput
                  label="Kalorie"
                  value={calories}
                  onChangeText={setCalories}
                  keyboardType="numeric"
                  style={styles.input}
                  mode="outlined"
                  error={!!error}
                  outlineColor={colors.border}
                  activeOutlineColor={colors.primary}
                  textColor={colors.text}
                  theme={{ 
                    colors: { 
                      background: colors.card, 
                      placeholder: colors.textSecondary, 
                      onSurfaceVariant: colors.textSecondary,
                      surface: colors.card,
                      surfaceVariant: colors.card,
                      primary: colors.primary
                    } 
                  }}
                />
                
                {error ? <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text> : null}
              </View>
              
              <View style={styles.buttonContainer}>
                <Button
                  mode="outlined"
                  onPress={onClose}
                  style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
                  textColor={colors.textSecondary}
                >
                  Anuluj
                </Button>
                <Button
                  mode="contained"
                  onPress={handleSubmit}
                  style={[styles.button, styles.submitButton, { backgroundColor: colors.buttonPrimary }]}
                  textColor="#FFFFFF"
                >
                  {mealToEdit ? 'Zapisz zmiany' : 'Dodaj posiłek'}
                </Button>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    margin: 0,
  },
  modalContent: {
    borderRadius: 20,
    padding: 16,
    width: '90%',
    maxWidth: 450,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  input: {
    marginBottom: 12,
    fontSize: 16,
    height: 50,
    width: '100%',
  },
  errorText: {
    color: '#FF4444',
    marginBottom: 12,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  button: {
    flex: 1,
    marginHorizontal: 6,
    borderRadius: 10,
    paddingVertical: 5,
  },
  cancelButton: {
    borderWidth: 1,
  },
  submitButton: {
    elevation: 2,
  },
  suggestionsContainer: {
    borderRadius: 10,
    elevation: 3,
    zIndex: 1,
    maxHeight: 150,
    borderWidth: 1,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  suggestionsTitle: {
    fontSize: 13,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 8,
    fontWeight: '500',
  },
  suggestionItem: {
    padding: 8,
    borderBottomWidth: 1,
  },
  suggestionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  suggestionName: {
    fontSize: 15,
    flex: 1,
  },
  suggestionCalories: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  caloriesText: {
    fontSize: 13,
    fontWeight: 'bold',
    marginRight: 3,
  },
  caloriesUnit: {
    fontSize: 11,
  },
  suggestionsList: {
    maxHeight: 120,
  },
}); 