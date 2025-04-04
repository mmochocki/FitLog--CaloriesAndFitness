import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, SafeAreaView } from 'react-native';
import { Text, Card, ProgressBar, Button, Provider as PaperProvider, FAB, List } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AddMealForm from './components/AddMealForm';
import SettingsScreen from './components/SettingsScreen';

interface UserData {
  dailyCalories: number;
  weight: number;
  height: number;
  age: number;
  gender: 'male' | 'female';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  manualCalories: boolean;
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
  const [isAddMealModalVisible, setIsAddMealModalVisible] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);

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

  const updateUserData = async (newData: UserData) => {
    try {
      await AsyncStorage.setItem('userData', JSON.stringify(newData));
      setUserData(newData);
    } catch (error) {
      console.error('Error updating user data:', error);
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

  if (isSettingsVisible) {
    return (
      <PaperProvider>
        <SafeAreaView style={styles.safeArea}>
          <SettingsScreen onUserDataUpdate={updateUserData} />
          <FAB
            style={styles.fab}
            icon="arrow-left"
            onPress={() => setIsSettingsVisible(false)}
          />
        </SafeAreaView>
      </PaperProvider>
    );
  }

  return (
    <PaperProvider>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
        >
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
            <List.Accordion
              title="Twoje dane"
              titleStyle={styles.title}
              style={styles.accordion}
            >
              <List.Item
                title="Waga"
                description={`${userData?.weight || 0} kg`}
                left={props => <List.Icon {...props} icon="scale" />}
              />
              <List.Item
                title="Wzrost"
                description={`${userData?.height || 0} cm`}
                left={props => <List.Icon {...props} icon="human-male-height" />}
              />
              <List.Item
                title="Dzienne zapotrzebowanie"
                description={`${userData?.dailyCalories || 0} kcal`}
                left={props => <List.Icon {...props} icon="food" />}
              />
            </List.Accordion>
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
            onPress={() => setIsAddMealModalVisible(true)}
            style={styles.button}
          >
            Dodaj posiłek
          </Button>

          <AddMealForm
            visible={isAddMealModalVisible}
            onClose={() => setIsAddMealModalVisible(false)}
            onMealAdded={loadMeals}
          />
        </ScrollView>
        <FAB
          style={styles.fab}
          icon="cog"
          onPress={() => setIsSettingsVisible(true)}
        />
      </SafeAreaView>
    </PaperProvider>
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
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#4CAF50',
  },
  accordion: {
    backgroundColor: '#FFFFFF',
  },
});
