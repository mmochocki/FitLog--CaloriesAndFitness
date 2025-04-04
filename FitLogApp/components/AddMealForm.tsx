import React, { useState } from 'react';
import { StyleSheet, View, Modal } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AddMealFormProps {
  visible: boolean;
  onClose: () => void;
  onMealAdded: () => void;
}

interface Meal {
  id: string;
  name: string;
  calories: number;
  date: string;
}

export default function AddMealForm({ visible, onClose, onMealAdded }: AddMealFormProps) {
  const [mealName, setMealName] = useState('');
  const [calories, setCalories] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!mealName.trim()) {
      setError('Nazwa posiłku jest wymagana');
      return;
    }

    if (!calories.trim() || isNaN(Number(calories)) || Number(calories) <= 0) {
      setError('Podaj prawidłową liczbę kalorii');
      return;
    }

    try {
      const newMeal: Meal = {
        id: Date.now().toString(),
        name: mealName.trim(),
        calories: Number(calories),
        date: new Date().toISOString(),
      };

      const existingMeals = await AsyncStorage.getItem('meals');
      const meals = existingMeals ? JSON.parse(existingMeals) : [];
      meals.push(newMeal);
      await AsyncStorage.setItem('meals', JSON.stringify(meals));

      setMealName('');
      setCalories('');
      setError('');
      onMealAdded();
      onClose();
    } catch (error) {
      console.error('Error saving meal:', error);
      setError('Wystąpił błąd podczas zapisywania posiłku');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>Dodaj nowy posiłek</Text>
          
          <TextInput
            label="Nazwa posiłku"
            value={mealName}
            onChangeText={setMealName}
            style={styles.input}
            mode="outlined"
          />

          <TextInput
            label="Kalorie"
            value={calories}
            onChangeText={setCalories}
            keyboardType="numeric"
            style={styles.input}
            mode="outlined"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

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
              Dodaj
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '90%',
    maxWidth: 400,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
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
  error: {
    color: 'red',
    marginBottom: 16,
    textAlign: 'center',
  },
}); 