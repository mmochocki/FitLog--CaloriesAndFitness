import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, Card, ProgressBar, Button, Provider as PaperProvider } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserData {
  dailyCalories: number;
  weight: number;
  height: number;
}

interface Meal {
  id: string;
  name: string;
  calories: number;
  date: string;
}

export default function App() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [currentCalories, setCurrentCalories] = useState(0);

  useEffect(() => {
    loadUserData();
    loadMeals();
  }, []);

  const loadUserData = async () => {
    try {
      const data = await AsyncStorage.getItem('userData');
      if (data) {
        setUserData(JSON.parse(data));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadMeals = async () => {
    try {
      const data = await AsyncStorage.getItem('meals');
      if (data) {
        const parsedMeals = JSON.parse(data);
        setMeals(parsedMeals);
        const today = new Date().toISOString().split('T')[0];
        const todayMeals = parsedMeals.filter((meal: Meal) => 
          meal.date.startsWith(today)
        );
        const totalCalories = todayMeals.reduce((sum: number, meal: Meal) => 
          sum + meal.calories, 0
        );
        setCurrentCalories(totalCalories);
      }
    } catch (error) {
      console.error('Error loading meals:', error);
    }
  };

  const progressPercentage = userData ? currentCalories / userData.dailyCalories : 0;
  const isOverLimit = progressPercentage > 1;

  return (
    <PaperProvider>
      <ScrollView style={styles.container}>
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.title}>Dzienne spożycie kalorii</Text>
            <ProgressBar
              progress={progressPercentage}
              color={isOverLimit ? '#FF4444' : '#4CAF50'}
              style={styles.progressBar}
            />
            <Text style={styles.caloriesText}>
              {currentCalories} / {userData?.dailyCalories || 2000} kcal
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.title}>Twoje dane</Text>
            {userData ? (
              <>
                <Text>Waga: {userData.weight} kg</Text>
                <Text>Wzrost: {userData.height} cm</Text>
                <Text>Dzienne zapotrzebowanie: {userData.dailyCalories} kcal</Text>
              </>
            ) : (
              <Text>Brak danych użytkownika</Text>
            )}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.title}>Dzisiejsze posiłki</Text>
            {meals.length > 0 ? (
              meals.map((meal) => (
                <View key={meal.id} style={styles.mealItem}>
                  <Text>{meal.name}</Text>
                  <Text>{meal.calories} kcal</Text>
                </View>
              ))
            ) : (
              <Text>Brak posiłków na dziś</Text>
            )}
          </Card.Content>
        </Card>

        <Button
          mode="contained"
          onPress={() => {}}
          style={styles.button}
        >
          Dodaj posiłek
        </Button>
      </ScrollView>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 16,
  },
  card: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333333',
  },
  progressBar: {
    height: 20,
    borderRadius: 10,
    marginVertical: 8,
  },
  caloriesText: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 8,
    color: '#666666',
  },
  mealItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  button: {
    marginTop: 16,
    backgroundColor: '#4CAF50',
  },
});
