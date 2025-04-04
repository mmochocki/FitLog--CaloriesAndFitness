import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Modal, FlatList, TouchableOpacity } from 'react-native';
import { TextInput, Button, Text, Chip, Searchbar, List, Portal } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
}

export default function AddMealForm({ visible, onClose, onMealAdded, mealToEdit }: AddMealFormProps) {
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState<Meal[]>([]);
  const [mealHistory, setMealHistory] = useState<Meal[]>([]);

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
        style={styles.modal}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            {mealToEdit ? 'Edytuj posiłek' : 'Dodaj nowy posiłek'}
          </Text>
          
          <TextInput
            label="Nazwa posiłku"
            value={name}
            onChangeText={handleMealNameChange}
            style={styles.input}
            mode="outlined"
            error={!!error}
            outlineColor="#E0E0E0"
            activeOutlineColor="#4CAF50"
          />
          
          {suggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsTitle}>Propozycje z historii:</Text>
              {suggestions.map((meal) => (
                <TouchableOpacity
                  key={meal.id}
                  onPress={() => handleSuggestionSelect(meal)}
                  style={styles.suggestionItem}
                >
                  <View style={styles.suggestionContent}>
                    <Text style={styles.suggestionName}>{meal.name}</Text>
                    <View style={styles.suggestionCalories}>
                      <Text style={styles.caloriesText}>{meal.calories}</Text>
                      <Text style={styles.caloriesUnit}>kcal</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
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
            outlineColor="#E0E0E0"
            activeOutlineColor="#4CAF50"
          />
          
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          
          <View style={styles.buttonContainer}>
            <Button
              mode="outlined"
              onPress={onClose}
              style={[styles.button, styles.cancelButton]}
              textColor="#666"
            >
              Anuluj
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmit}
              style={[styles.button, styles.submitButton]}
              buttonColor="#4CAF50"
            >
              {mealToEdit ? 'Zapisz zmiany' : 'Dodaj posiłek'}
            </Button>
          </View>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    margin: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
    color: '#333',
  },
  input: {
    marginBottom: 20,
    backgroundColor: 'white',
  },
  errorText: {
    color: '#FF4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  button: {
    flex: 1,
    marginHorizontal: 8,
    borderRadius: 8,
  },
  cancelButton: {
    borderColor: '#E0E0E0',
  },
  submitButton: {
    elevation: 2,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    elevation: 4,
    zIndex: 1,
    maxHeight: 300,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  suggestionsTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  suggestionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  suggestionName: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  suggestionCalories: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  caloriesText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginRight: 4,
  },
  caloriesUnit: {
    fontSize: 12,
    color: '#666',
  },
}); 