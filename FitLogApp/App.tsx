import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, ScrollView, SafeAreaView, Animated, Easing } from 'react-native';
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

const PRIMARY_COLOR = '#4CAF50';
const LIGHTER_PRIMARY_COLOR = '#66BB6A';

export default function App() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [currentCalories, setCurrentCalories] = useState(0);
  const [isAddMealModalVisible, setIsAddMealModalVisible] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const spinValue = useRef(new Animated.Value(0)).current;

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

  const spin = () => {
    Animated.timing(spinValue, {
      toValue: 1,
      duration: 1000,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start(() => {
      spinValue.setValue(0);
    });
  };

  const spinAnimation = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (isSettingsVisible) {
    return (
      <PaperProvider>
        <SafeAreaView style={styles.safeArea}>
          <SettingsScreen onUserDataUpdate={updateUserData} />
          <Animated.View style={[styles.fabContainer, { transform: [{ rotate: spinAnimation }] }]}>
            <FAB
              style={[styles.fab, { backgroundColor: LIGHTER_PRIMARY_COLOR }]}
              icon="arrow-left"
              onPress={() => setIsSettingsVisible(false)}
              color="#FFFFFF"
            />
          </Animated.View>
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
              <View style={styles.caloriesContainer}>
                <View style={styles.caloriesTextContainer}>
                  <Text style={styles.currentCalories}>{currentCalories}</Text>
                  <Text style={styles.caloriesSeparator}>/</Text>
                  <Text style={styles.dailyCalories}>{userData?.dailyCalories || 2000}</Text>
                  <Text style={styles.caloriesUnit}>kcal</Text>
                </View>
                <View style={styles.progressContainer}>
                  <ProgressBar
                    progress={progressPercentage}
                    color={isOverLimit ? '#FF4444' : '#4CAF50'}
                    style={styles.progressBar}
                  />
                  <View style={styles.progressLabelContainer}>
                    <Text style={[styles.progressLabel, isOverLimit && styles.overLimitText]}>
                      {Math.round(progressPercentage * 100)}%
                    </Text>
                  </View>
                </View>
              </View>
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
            style={[styles.button, { backgroundColor: PRIMARY_COLOR }]}
          >
            Dodaj posiłek
          </Button>

          <AddMealForm
            visible={isAddMealModalVisible}
            onClose={() => setIsAddMealModalVisible(false)}
            onMealAdded={loadMeals}
          />
        </ScrollView>
        <Animated.View style={[styles.fabContainer, { transform: [{ rotate: spinAnimation }] }]}>
          <FAB
            style={[styles.fab, { backgroundColor: LIGHTER_PRIMARY_COLOR }]}
            icon="cog"
            onPress={() => {
              spin();
              setIsSettingsVisible(true);
            }}
            color="#FFFFFF"
          />
        </Animated.View>
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
  caloriesContainer: {
    marginTop: 8,
  },
  caloriesTextContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 16,
  },
  currentCalories: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333333',
  },
  caloriesSeparator: {
    fontSize: 24,
    marginHorizontal: 8,
    color: '#666666',
  },
  dailyCalories: {
    fontSize: 24,
    color: '#666666',
  },
  caloriesUnit: {
    fontSize: 16,
    marginLeft: 4,
    color: '#666666',
  },
  progressContainer: {
    position: 'relative',
    height: 24,
    marginBottom: 8,
  },
  progressBar: {
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E0E0E0',
  },
  progressLabelContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  overLimitText: {
    color: '#FFFFFF',
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
  },
  fabContainer: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    margin: 16,
  },
  fab: {
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  accordion: {
    backgroundColor: '#FFFFFF',
  },
});
