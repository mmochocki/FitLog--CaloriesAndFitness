import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, ScrollView, SafeAreaView, Animated, Easing, TouchableOpacity, Modal, Platform } from 'react-native';
import { Text, Card, ProgressBar, Button, Provider as PaperProvider, FAB, List, IconButton, Portal, TextInput, Dialog } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AddMealForm from './components/AddMealForm';
import SettingsScreen from './components/SettingsScreen';
import { Calendar } from 'react-native-calendars';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DateTimePicker from '@react-native-community/datetimepicker';
import { calculateCalories, calculateMacros } from './utils/calculations';
import { Meal, UserData } from './types';

interface DailyMeals {
  date: string;
  meals: Meal[];
  totalCalories: number;
}

const PRIMARY_COLOR = '#4CAF50';
const LIGHTER_PRIMARY_COLOR = '#66BB6A';

const App = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [currentCalories, setCurrentCalories] = useState(0);
  const [isAddMealModalVisible, setIsAddMealModalVisible] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const spinValue = useRef(new Animated.Value(0)).current;
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [dailyMealsHistory, setDailyMealsHistory] = useState<{ [key: string]: DailyMeals }>({});
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    loadUserData();
    loadMeals();
    loadDailyMealsHistory();
    checkAndResetDailyMeals();
    const interval = setInterval(checkAndResetDailyMeals, 60000); // Sprawdzaj co minutę
    return () => clearInterval(interval);
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
      // Odśwież currentCalories po zmianie danych użytkownika
      const today = new Date().toISOString().split('T')[0];
      const todayMeals = meals.filter((meal: Meal) => 
        meal.date.startsWith(today)
      );
      const totalCalories = todayMeals.reduce((sum: number, meal: Meal) => 
        sum + meal.calories, 0
      );
      setCurrentCalories(totalCalories);
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

  const checkAndResetDailyMeals = () => {
    const now = new Date();
    if (now.getHours() === 0 && now.getMinutes() === 0) {
      saveDailyMealsToHistory();
      setMeals([]);
      AsyncStorage.setItem('meals', JSON.stringify([]));
    }
  };

  const saveDailyMealsToHistory = async () => {
    if (meals.length === 0) return;

    const today = new Date().toISOString().split('T')[0];
    const totalCalories = meals.reduce((sum, meal) => sum + meal.calories, 0);
    
    const newDailyMeals: DailyMeals = {
      date: today,
      meals: [...meals],
      totalCalories
    };

    const updatedHistory = { ...dailyMealsHistory, [today]: newDailyMeals };
    setDailyMealsHistory(updatedHistory);
    await AsyncStorage.setItem('dailyMealsHistory', JSON.stringify(updatedHistory));
  };

  const loadDailyMealsHistory = async () => {
    try {
      const history = await AsyncStorage.getItem('dailyMealsHistory');
      if (history) {
        setDailyMealsHistory(JSON.parse(history));
      }
    } catch (error) {
      console.error('Error loading daily meals history:', error);
    }
  };

  const getMarkedDates = () => {
    const marked: { [key: string]: { marked: boolean; dotColor: string } } = {};
    Object.entries(dailyMealsHistory).forEach(([date, day]) => {
      marked[date] = {
        marked: true,
        dotColor: '#4CAF50'
      };
    });
    return marked;
  };

  const getSelectedDayMeals = () => {
    return dailyMealsHistory[selectedDate.toISOString().split('T')[0]];
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

  const deleteMeal = async (mealId: string) => {
    try {
      const updatedMeals = meals.filter(meal => meal.id !== mealId);
      await AsyncStorage.setItem('meals', JSON.stringify(updatedMeals));
      setMeals(updatedMeals);
      loadMeals(); // Odśwież wyświetlanie kalorii
    } catch (error) {
      console.error('Error deleting meal:', error);
    }
  };

  const handleMealUpdated = () => {
    loadMeals();
    setEditingMeal(null);
  };

  const loadCurrentDayData = async () => {
    const today = new Date().toISOString().split('T')[0];
    try {
      const data = await AsyncStorage.getItem('meals');
      if (data) {
        const allMeals = JSON.parse(data);
        const todayMeals = allMeals.filter((meal: Meal) => meal.date.startsWith(today));
        setMeals(todayMeals);
        const totalCalories = todayMeals.reduce((sum: number, meal: Meal) => sum + meal.calories, 0);
        setCurrentCalories(totalCalories);
      }
    } catch (error) {
      console.error('Error loading current day data:', error);
    }
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (date) {
      const dateString = date.toISOString().split('T')[0];
      setSelectedDate(date);
      
      // Jeśli wybrana data to dzisiejsza, wczytaj aktualne dane
      if (dateString === new Date().toISOString().split('T')[0]) {
        loadCurrentDayData();
      } else {
        // W przeciwnym razie wczytaj dane z historii
        const mealsForDate = dailyMealsHistory[dateString]?.meals || [];
        setMeals(mealsForDate);
        const totalCalories = mealsForDate.reduce((sum, meal) => sum + meal.calories, 0);
        setCurrentCalories(totalCalories);
      }
    }
  };

  const handleMealAdded = async (newMeal: Meal) => {
    try {
      const updatedMeals = [...meals, newMeal];
      await AsyncStorage.setItem('meals', JSON.stringify(updatedMeals));
      setMeals(updatedMeals);
      
      // Aktualizuj kalorie tylko jeśli jesteśmy na dzisiejszej dacie
      if (selectedDate.toDateString() === new Date().toDateString()) {
        const totalCalories = updatedMeals.reduce((sum, meal) => sum + meal.calories, 0);
        setCurrentCalories(totalCalories);
      }
      
      setIsAddMealModalVisible(false);
    } catch (error) {
      console.error('Error saving meal:', error);
    }
  };

  if (isSettingsVisible) {
    return (
      <PaperProvider>
        <SafeAreaView style={styles.safeArea}>
          <SettingsScreen 
            onUserDataUpdate={updateUserData} 
            onBack={async () => {
              // Najpierw zapisujemy ustawienia
              if (userData) {
                await updateUserData(userData);
              }
              // Następnie wracamy do strony głównej
              setIsSettingsVisible(false);
            }}
          />
          <Animated.View style={[styles.fabContainer, { transform: [{ rotate: spinAnimation }] }]}>
            <FAB
              style={[styles.fab, { backgroundColor: LIGHTER_PRIMARY_COLOR }]}
              icon="arrow-left"
              onPress={async () => {
                spin();
                // Najpierw zapisujemy ustawienia
                if (userData) {
                  await updateUserData(userData);
                }
                // Następnie wracamy do strony głównej
                setIsSettingsVisible(false);
              }}
              color="#FFFFFF"
            />
          </Animated.View>
        </SafeAreaView>
      </PaperProvider>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Dzisiejsze posiłki</Text>
                  <IconButton
                    icon="calendar"
                    size={24}
                    onPress={() => setShowDatePicker(true)}
                  />
                </View>
                {meals.length > 0 ? (
                  meals.map((meal) => (
                    <TouchableOpacity
                      key={meal.id}
                      onPress={() => {
                        setSelectedMeal(meal);
                        setMenuVisible(true);
                      }}
                      style={styles.mealItem}
                    >
                      <View style={styles.mealInfo}>
                        <Text style={styles.mealName}>{meal.name}</Text>
                        <Text style={styles.mealCalories}>{meal.calories} kcal</Text>
                      </View>
                      <IconButton
                        icon="chevron-right"
                        size={24}
                        iconColor="#666"
                      />
                    </TouchableOpacity>
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
              onMealAdded={handleMealAdded}
            />

            {editingMeal && (
              <AddMealForm
                visible={!!editingMeal}
                onClose={() => setEditingMeal(null)}
                onMealAdded={handleMealUpdated}
                mealToEdit={editingMeal}
              />
            )}

            <Portal>
              <Modal
                visible={menuVisible}
                onDismiss={() => setMenuVisible(false)}
                style={styles.modal}
                transparent={true}
              >
                <View style={styles.modalOverlay}>
                  <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>{selectedMeal?.name}</Text>
                    <View style={styles.modalActions}>
                      <TouchableOpacity
                        style={[styles.modalAction, styles.editAction]}
                        onPress={() => {
                          setMenuVisible(false);
                          setEditingMeal(selectedMeal);
                        }}
                      >
                        <IconButton
                          icon="pencil"
                          size={24}
                          iconColor="#FFFFFF"
                        />
                        <Text style={[styles.modalActionText, styles.editActionText]}>Edytuj</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.modalAction, styles.deleteAction]}
                        onPress={() => {
                          setMenuVisible(false);
                          deleteMeal(selectedMeal?.id || '');
                        }}
                      >
                        <IconButton
                          icon="trash"
                          size={24}
                          iconColor="#FFFFFF"
                        />
                        <Text style={[styles.modalActionText, styles.deleteActionText]}>Usuń</Text>
                      </TouchableOpacity>
                    </View>
                    <Button
                      mode="outlined"
                      onPress={() => setMenuVisible(false)}
                      style={styles.modalCloseButton}
                    >
                      Zamknij
                    </Button>
                  </View>
                </View>
              </Modal>
            </Portal>

            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
              />
            )}
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
    </GestureHandlerRootView>
  );
};

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
    alignItems: 'center',
    paddingVertical: 1,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  mealInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  mealName: {
    fontSize: 16,
    color: '#333333',
    marginRight: 8,
  },
  mealCalories: {
    fontSize: 14,
    color: '#666666',
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
  modal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 300,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#333333',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 16,
  },
  modalAction: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    width: '45%',
  },
  editAction: {
    backgroundColor: '#4CAF50',
  },
  deleteAction: {
    backgroundColor: '#F44336',
  },
  modalActionText: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: 'bold',
  },
  editActionText: {
    color: '#FFFFFF',
  },
  deleteActionText: {
    color: '#FFFFFF',
  },
  modalCloseButton: {
    width: '100%',
    borderColor: '#666666',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  historyContent: {
    marginTop: 20,
    width: '100%',
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  historyMealItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  historyMealName: {
    fontSize: 16,
  },
  historyMealCalories: {
    fontSize: 16,
    color: '#666',
  },
  historyTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
    color: '#4CAF50',
  },
});

export default App;
