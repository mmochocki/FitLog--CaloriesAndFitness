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
      const filtered = mealHistory.filter(meal => 
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
          />
          
          {suggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              {suggestions.map((meal) => (
                <TouchableOpacity
                  key={meal.id}
                  onPress={() => handleSuggestionSelect(meal)}
                  style={styles.suggestionItem}
                >
                  <Text style={styles.suggestionText}>
                    {meal.name} ({meal.calories} kcal)
                  </Text>
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
          />
          
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          
          <View style={styles.buttonContainer}>
            <Button
              mode="outlined"
              onPress={onClose}
              style={styles.button}
            >
              Anuluj
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmit}
              style={styles.button}
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
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    margin: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
  },
  errorText: {
    color: 'red',
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    marginHorizontal: 8,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 8,
    elevation: 4,
    zIndex: 1,
    maxHeight: 200,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  suggestionText: {
    fontSize: 16,
  },
}); 