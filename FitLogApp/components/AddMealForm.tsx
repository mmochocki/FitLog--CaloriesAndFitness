import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Modal, FlatList, TouchableOpacity } from 'react-native';
import { TextInput, Button, Text, Chip, Searchbar, List } from 'react-native-paper';
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

interface ProductHistory {
  name: string;
  calories: number;
  lastUsed: string;
  usageCount: number;
}

export default function AddMealForm({ visible, onClose, onMealAdded }: AddMealFormProps) {
  const [mealName, setMealName] = useState('');
  const [calories, setCalories] = useState('');
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [productHistory, setProductHistory] = useState<ProductHistory[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<ProductHistory[]>([]);
  const [suggestions, setSuggestions] = useState<ProductHistory[]>([]);

  useEffect(() => {
    loadProductHistory();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = productHistory.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredHistory(filtered);
    } else {
      setFilteredHistory(productHistory);
    }
  }, [searchQuery, productHistory]);

  const loadProductHistory = async () => {
    try {
      const history = await AsyncStorage.getItem('productHistory');
      if (history) {
        const parsedHistory = JSON.parse(history);
        // Sortuj historię według częstotliwości użycia i daty ostatniego użycia
        const sortedHistory = parsedHistory.sort((a: ProductHistory, b: ProductHistory) => {
          if (b.usageCount !== a.usageCount) {
            return b.usageCount - a.usageCount;
          }
          return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
        });
        setProductHistory(sortedHistory);
        setFilteredHistory(sortedHistory);
      }
    } catch (error) {
      console.error('Error loading product history:', error);
    }
  };

  const updateProductHistory = async (productName: string, productCalories: number) => {
    try {
      const history = [...productHistory];
      const existingProduct = history.find(p => p.name.toLowerCase() === productName.toLowerCase());
      
      if (existingProduct) {
        existingProduct.usageCount += 1;
        existingProduct.lastUsed = new Date().toISOString();
      } else {
        history.push({
          name: productName,
          calories: productCalories,
          lastUsed: new Date().toISOString(),
          usageCount: 1
        });
      }

      await AsyncStorage.setItem('productHistory', JSON.stringify(history));
      setProductHistory(history);
    } catch (error) {
      console.error('Error updating product history:', error);
    }
  };

  const handleProductSelect = (product: ProductHistory) => {
    setMealName(product.name);
    setCalories(product.calories.toString());
    setSearchQuery('');
  };

  const handleMealNameChange = (text: string) => {
    setMealName(text);
    if (text.length > 0) {
      const filtered = productHistory.filter(product =>
        product.name.toLowerCase().includes(text.toLowerCase())
      );
      setSuggestions(filtered.slice(0, 5)); // Pokazujemy tylko 5 pierwszych sugestii
    } else {
      setSuggestions([]);
    }
  };

  const handleSuggestionSelect = (product: ProductHistory) => {
    setMealName(product.name);
    setCalories(product.calories.toString());
    setSuggestions([]);
  };

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

      // Aktualizuj historię produktów
      await updateProductHistory(mealName.trim(), Number(calories));

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
          
          <View style={styles.inputContainer}>
            <TextInput
              label="Nazwa posiłku"
              value={mealName}
              onChangeText={handleMealNameChange}
              style={styles.input}
              mode="outlined"
            />
            {suggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                {suggestions.map((product) => (
                  <TouchableOpacity
                    key={product.name}
                    onPress={() => handleSuggestionSelect(product)}
                    style={styles.suggestionItem}
                  >
                    <Text style={styles.suggestionText}>
                      {product.name} ({product.calories} kcal)
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

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
    maxHeight: '80%',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  searchBar: {
    marginBottom: 16,
  },
  historyContainer: {
    marginBottom: 16,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  historyChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 16,
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
  suggestionsContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 4,
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