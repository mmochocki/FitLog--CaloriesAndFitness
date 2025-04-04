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
  onMealAdded: () => void;
  mealToEdit?: Meal;
}

export default function AddMealForm({ visible, onClose, onMealAdded, mealToEdit }: AddMealFormProps) {
  const [name, setName] = useState('');
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

  useEffect(() => {
    if (mealToEdit) {
      setName(mealToEdit.name);
      setCalories(mealToEdit.calories.toString());
    } else {
      setName('');
      setCalories('');
    }
  }, [mealToEdit]);

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
    setName(product.name);
    setCalories(product.calories.toString());
    setSearchQuery('');
  };

  const handleMealNameChange = (text: string) => {
    setName(text);
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
    setName(product.name);
    setCalories(product.calories.toString());
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
      onMealAdded();
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
        contentContainerStyle={styles.modal}
      >
        <Text style={styles.title}>
          {mealToEdit ? 'Edytuj posiłek' : 'Dodaj nowy posiłek'}
        </Text>
        <TextInput
          label="Nazwa posiłku"
          value={name}
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
            {mealToEdit ? 'Zapisz zmiany' : 'Dodaj posiłek'}
          </Button>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  button: {
    flex: 1,
    marginHorizontal: 4,
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