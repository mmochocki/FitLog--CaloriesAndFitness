import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, ScrollView, SafeAreaView, Animated, Easing, TouchableOpacity, Modal, Platform, Alert } from 'react-native';
import { Text, Card, ProgressBar, Button, Provider as PaperProvider, FAB, List, IconButton, Portal, TextInput, Dialog } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AddMealForm from './components/AddMealForm';
import SettingsScreen from './components/SettingsScreen';
import { Calendar } from 'react-native-calendars';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
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
  const [showCalendarModal, setShowCalendarModal] = useState(false);

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

  const getDayColor = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    const dayData = dailyMealsHistory[dateString];
    if (!dayData) return 'transparent'; // Brak tła dla dat bez posiłków

    const dailyLimit = userData?.dailyCalories || 2000;
    const percentage = (dayData.totalCalories / dailyLimit) * 100;
    
    if (percentage > 135) {
      return '#FF4444'; // Ciemniejszy czerwony - przekroczenie o 35% lub więcej
    } else if (percentage > 100) {
      return '#FFE0B2'; // Pastelowy pomarańczowy - przekroczenie o 0-35%
    }
    return '#C8E6C9'; // Pastelowy zielony - w normie
  };

  const getDotColor = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    const dayData = dailyMealsHistory[dateString];
    if (!dayData) return '#4CAF50'; // Domyślny kolor dla dni bez danych

    const dailyLimit = userData?.dailyCalories || 2000;
    const percentage = (dayData.totalCalories / dailyLimit) * 100;
    
    if (percentage > 135) {
      return '#FF4444'; // Ciemniejszy czerwony - przekroczenie o 35% lub więcej
    } else if (percentage > 100) {
      return '#FFE0B2'; // Pastelowy pomarańczowy - przekroczenie o 0-35%
    }
    return '#C8E6C9'; // Pastelowy zielony - w normie
  };

  const getMarkedDates = () => {
    const marked: { [key: string]: { marked: boolean; dotColor: string; customStyles: { container: { backgroundColor: string; borderRadius: number } } } } = {};
    Object.entries(dailyMealsHistory).forEach(([date, day]) => {
      const dateObj = new Date(date);
      marked[date] = {
        marked: day.meals.length > 0,
        dotColor: getDotColor(dateObj),
        customStyles: {
          container: {
            backgroundColor: getDayColor(dateObj),
            borderRadius: 20
          }
        }
      };
    });
    return marked;
  };

  const getSelectedDayMeals = () => {
    return dailyMealsHistory[selectedDate.toISOString().split('T')[0]];
  };

  const getSelectedDayCalories = () => {
    const dateString = selectedDate.toISOString().split('T')[0];
    const dayData = dailyMealsHistory[dateString];
    return dayData ? dayData.totalCalories : 0;
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

  const loadCurrentDayData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const history = await AsyncStorage.getItem('dailyMealsHistory');
      if (history) {
        const parsedHistory = JSON.parse(history);
        const todayData = parsedHistory[today];
        
        if (todayData) {
          setMeals(todayData.meals);
          setCurrentCalories(todayData.totalCalories);
        } else {
          setMeals([]);
          setCurrentCalories(0);
        }
      }
    } catch (error) {
      console.error('Error loading current day data:', error);
    }
  };

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (date) {
      const dateString = date.toISOString().split('T')[0];
      setSelectedDate(date);
      loadSelectedDateData(dateString);
    }
  };

  const loadSelectedDateData = async (date: string) => {
    try {
      const history = await AsyncStorage.getItem('dailyMealsHistory');
      if (history) {
        const parsedHistory = JSON.parse(history);
        const selectedDayData = parsedHistory[date];
        
        if (selectedDayData) {
          setMeals(selectedDayData.meals);
          setCurrentCalories(selectedDayData.totalCalories);
        } else {
          // Jeśli nie ma danych dla wybranej daty, tworzymy nowy wpis
          const newDayData = {
            date: date,
            meals: [],
            totalCalories: 0
          };
          const updatedHistory = {
            ...parsedHistory,
            [date]: newDayData
          };
          setDailyMealsHistory(updatedHistory);
          setMeals([]);
          setCurrentCalories(0);
          await AsyncStorage.setItem('dailyMealsHistory', JSON.stringify(updatedHistory));
        }
      } else {
        // Jeśli nie ma historii, tworzymy nową
        const newHistory = {
          [date]: {
            date: date,
            meals: [],
            totalCalories: 0
          }
        };
        setDailyMealsHistory(newHistory);
        setMeals([]);
        setCurrentCalories(0);
        await AsyncStorage.setItem('dailyMealsHistory', JSON.stringify(newHistory));
      }
    } catch (error) {
      console.error('Error loading selected date data:', error);
    }
  };

  const handleMealAdded = async (newMeal: Meal) => {
    try {      
      if (!newMeal || typeof newMeal.calories !== 'number') {
        console.error('Nieprawidłowe dane posiłku:', newMeal);
        return;
      }

      const dateString = selectedDate.toISOString().split('T')[0];
      const currentDayData = dailyMealsHistory[dateString] || {
        date: dateString,
        meals: [],
        totalCalories: 0
      };

      const updatedMeals = [...currentDayData.meals, newMeal];
      const totalCalories = updatedMeals.reduce((sum, meal) => sum + meal.calories, 0);

      const updatedDayData = {
        ...currentDayData,
        meals: updatedMeals,
        totalCalories
      };

      const updatedHistory = {
        ...dailyMealsHistory,
        [dateString]: updatedDayData
      };

      setDailyMealsHistory(updatedHistory);
      setMeals(updatedMeals);
      setCurrentCalories(totalCalories);

      await AsyncStorage.setItem('dailyMealsHistory', JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('Błąd podczas dodawania posiłku:', error);
    }
  };

  const deleteMeal = async (mealId: string) => {
    try {
      const dateString = selectedDate.toISOString().split('T')[0];
      const updatedMeals = meals.filter(meal => meal.id !== mealId);
      const totalCalories = updatedMeals.reduce((sum, meal) => sum + meal.calories, 0);
      
      const updatedHistory = {
        ...dailyMealsHistory,
        [dateString]: {
          date: dateString,
          meals: updatedMeals,
          totalCalories
        }
      };
      
      setDailyMealsHistory(updatedHistory);
      setMeals(updatedMeals);
      setCurrentCalories(totalCalories);
      
      await AsyncStorage.setItem('dailyMealsHistory', JSON.stringify(updatedHistory));
      setMenuVisible(false);
    } catch (error) {
      console.error('Error deleting meal:', error);
    }
  };

  const handleMealUpdated = () => {
    loadMeals();
    setEditingMeal(null);
  };

  const renderCalendarModal = () => (
    <Portal>
      <Modal
        visible={showCalendarModal}
        onDismiss={() => setShowCalendarModal(false)}
        style={styles.modal}
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>
                {formatDate(selectedDate)}
              </Text>
              <IconButton
                icon="close"
                size={24}
                onPress={() => setShowCalendarModal(false)}
              />
            </View>
            <Calendar
              current={selectedDate.toISOString().split('T')[0]}
              onDayPress={(day: { dateString: string }) => {
                const newDate = new Date(day.dateString);
                setSelectedDate(newDate);
                loadSelectedDateData(day.dateString);
                setShowCalendarModal(false);
              }}
              markedDates={{
                ...getMarkedDates(),
                [selectedDate.toISOString().split('T')[0]]: {
                  selected: true,
                  marked: dailyMealsHistory[selectedDate.toISOString().split('T')[0]]?.meals.length > 0,
                  dotColor: getDotColor(selectedDate),
                  customStyles: {
                    container: {
                      backgroundColor: getDayColor(selectedDate),
                      borderRadius: 20
                    }
                  }
                }
              }}
              theme={{
                calendarBackground: '#ffffff',
                textSectionTitleColor: '#b6c1cd',
                selectedDayBackgroundColor: '#4CAF50',
                selectedDayTextColor: '#ffffff',
                todayTextColor: '#4CAF50',
                dayTextColor: '#2d4150',
                textDisabledColor: '#d9e1e8',
                dotColor: '#4CAF50',
                selectedDotColor: '#ffffff',
                arrowColor: '#4CAF50',
                monthTextColor: '#4CAF50',
                indicatorColor: '#4CAF50',
                textDayFontFamily: 'monospace',
                textMonthFontFamily: 'monospace',
                textDayHeaderFontFamily: 'monospace',
                textDayFontSize: 16,
                textMonthFontSize: 16,
                textDayHeaderFontSize: 16,
                'stylesheet.calendar.main': {
                  dayContainer: {
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 4,
                  },
                  day: {
                    width: 32,
                    height: 32,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 16,
                  },
                }
              }}
            />
          </View>
        </View>
      </Modal>
    </Portal>
  );

  const formatDate = (date: Date) => {
    const months = [
      'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
      'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
    ];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const formatDayTitle = (date: Date) => {
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return 'Dzisiejsze posiłki';
    }
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `Posiłki z dnia ${day}.${month}.${year}`;
  };

  const clearMealHistory = async () => {
    try {
      await AsyncStorage.removeItem('dailyMealsHistory');
      setDailyMealsHistory({});
      setMeals([]);
      setCurrentCalories(0);
      Alert.alert(
        'Sukces',
        'Historia posiłków została wyczyszczona',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Błąd podczas czyszczenia historii:', error);
      Alert.alert(
        'Błąd',
        'Wystąpił błąd podczas czyszczenia historii',
        [{ text: 'OK' }]
      );
    }
  };

  if (isSettingsVisible) {
    return (
      <PaperProvider>
        <SafeAreaView style={styles.safeArea}>
          <SettingsScreen 
            onUserDataUpdate={updateUserData} 
            onBack={async () => {
              if (userData) {
                await updateUserData(userData);
              }
              setIsSettingsVisible(false);
            }}
          />
          <View style={styles.settingsButtons}>
            <Button
              mode="contained"
              onPress={clearMealHistory}
              style={[styles.button, { backgroundColor: '#FF4444' }]}
            >
              Wyczyść historię posiłków
            </Button>
          </View>
          <Animated.View style={[styles.fabContainer, { transform: [{ rotate: spinAnimation }] }]}>
            <FAB
              style={[styles.fab, { backgroundColor: LIGHTER_PRIMARY_COLOR }]}
              icon="arrow-left"
              onPress={async () => {
                spin();
                if (userData) {
                  await updateUserData(userData);
                }
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
                <Text style={styles.title}>Spożycie kalorii</Text>
                <View style={styles.caloriesContainer}>
                  <View style={styles.caloriesTextContainer}>
                    <Text style={styles.currentCalories}>{getSelectedDayCalories()}</Text>
                    <Text style={styles.caloriesSeparator}>/</Text>
                    <Text style={styles.dailyCalories}>{userData?.dailyCalories || 2000}</Text>
                    <Text style={styles.caloriesUnit}>kcal</Text>
                  </View>
                  <View style={styles.progressContainer}>
                    <ProgressBar
                      progress={getSelectedDayCalories() / (userData?.dailyCalories || 2000)}
                      color={getSelectedDayCalories() > (userData?.dailyCalories || 2000) ? '#FF4444' : '#4CAF50'}
                      style={styles.progressBar}
                    />
                    <View style={styles.progressLabelContainer}>
                      <Text style={[styles.progressLabel, getSelectedDayCalories() > (userData?.dailyCalories || 2000) && styles.overLimitText]}>
                        {Math.round((getSelectedDayCalories() / (userData?.dailyCalories || 2000)) * 100)}%
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
                  <Text style={styles.cardTitle}>{formatDayTitle(selectedDate)}</Text>
                  <IconButton
                    icon="calendar"
                    size={24}
                    onPress={() => setShowCalendarModal(true)}
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
                  <Text>Brak posiłków na wybrany dzień</Text>
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
                          icon="delete"
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
          {renderCalendarModal()}
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
    width: '90%',
    maxWidth: 400,
    elevation: 5,
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
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  settingsButtons: {
    padding: 16,
    marginTop: 16,
  },
});

export default App;
