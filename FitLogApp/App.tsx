import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, ScrollView, SafeAreaView, Animated, Easing, TouchableOpacity, Modal, Platform, Alert, useColorScheme } from 'react-native';
import { Text, Card, ProgressBar as RNProgressBar, Button, Provider as PaperProvider, FAB, List, IconButton, Portal, TextInput, Dialog } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AddMealForm from './components/AddMealForm';
import SettingsScreen from './components/SettingsScreen';
import { Calendar } from 'react-native-calendars';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { calculateCalories, calculateMacros } from './utils/calculations';
import { Meal, UserData, ThemeMode } from './types';
import { getTheme, getColors, LIGHT_COLORS, DARK_COLORS } from './styles/theme';

interface DailyMeals {
  date: string;
  meals: Meal[];
  totalCalories: number;
}

const PRIMARY_COLOR = '#4CAF50';
const LIGHTER_PRIMARY_COLOR = '#66BB6A';

const AnimatedProgressBar = ({ progress, color, style, themeMode }: { progress: Animated.Value, color: string, style?: any, themeMode: ThemeMode }) => {
  const colors = getColors(themeMode);
  
  const backgroundColor = progress.interpolate({
    inputRange: [0, 1, 1.35],
    outputRange: [themeMode === 'dark' ? '#333333' : colors.border, themeMode === 'dark' ? '#333333' : colors.border, colors.warning]
  });

  const fillColor = progress.interpolate({
    inputRange: [0, 1, 1.35],
    outputRange: [colors.primary, colors.primary, colors.danger]
  });

  return (
    <View style={[styles.progressBarContainer, style]}>
      <Animated.View style={[styles.progressBarBackground, { backgroundColor }]}>
        <Animated.View 
          style={[
            styles.progressBarFill, 
            { 
              backgroundColor: fillColor,
              transform: [{ scaleX: progress }],
              width: '100%'
            }
          ]} 
        />
      </Animated.View>
    </View>
  );
};

const App = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [currentCalories, setCurrentCalories] = useState(0);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [isAddMealModalVisible, setIsAddMealModalVisible] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const spinValue = useRef(new Animated.Value(0)).current;
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const progressInterpolation = progressAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1]
  });
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [dailyMealsHistory, setDailyMealsHistory] = useState<{ [key: string]: DailyMeals }>({});
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const deviceTheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');

  useEffect(() => {
    loadUserData();
    loadDailyMealsHistory();
    const today = new Date().toISOString().split('T')[0];
    loadSelectedDateData(today);
    checkAndResetDailyMeals();
    const interval = setInterval(checkAndResetDailyMeals, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadUserData = async () => {
    try {
      const data = await AsyncStorage.getItem('userData');
      if (data) {
        const parsedData = JSON.parse(data);
        setUserData(parsedData);
        // Ustaw tryb ciemny jeśli jest zapisany w danych użytkownika
        if (parsedData.darkMode !== undefined) {
          setThemeMode(parsedData.darkMode ? 'dark' : 'light');
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const updateUserData = async (newData: UserData) => {
    try {
      await AsyncStorage.setItem('userData', JSON.stringify(newData));
      setUserData(newData);
      // Zaktualizuj tryb ciemny jeśli się zmienił
      if (newData.darkMode !== undefined) {
        setThemeMode(newData.darkMode ? 'dark' : 'light');
      }
      
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

  const animateProgress = (newValue: number) => {
    const dailyLimit = userData?.dailyCalories || 2000;
    const targetProgress = newValue / dailyLimit;
    
    progressAnimation.setValue(0);
    
    Animated.sequence([
      Animated.delay(500),
      Animated.timing(progressAnimation, {
        toValue: targetProgress,
        duration: 1000,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true
      })
    ]).start(() => {
      setCurrentProgress(targetProgress);
    });
  };

  const handleMealAdded = async (newMeal: Meal) => {
    try {
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
      
      const dailyLimit = userData?.dailyCalories || 2000;
      const progress = totalCalories / dailyLimit;
      
      Animated.sequence([
        Animated.delay(500),
        Animated.timing(progressAnimation, {
          toValue: progress,
          duration: 1000,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true
        })
      ]).start(() => {
        setCurrentProgress(progress);
      });
      
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
      
      const dailyLimit = userData?.dailyCalories || 2000;
      const progress = totalCalories / dailyLimit;
      
      Animated.sequence([
        Animated.delay(500),
        Animated.timing(progressAnimation, {
          toValue: progress,
          duration: 1000,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true
        })
      ]).start(() => {
        setCurrentProgress(progress);
      });
      
      await AsyncStorage.setItem('dailyMealsHistory', JSON.stringify(updatedHistory));
      setMenuVisible(false);
    } catch (error) {
      console.error('Error deleting meal:', error);
    }
  };

  const handleMealUpdated = async (updatedMeal: Meal) => {
    try {
      const dateString = selectedDate.toISOString().split('T')[0];
      const updatedMeals = meals.map(meal => 
        meal.id === updatedMeal.id ? updatedMeal : meal
      );
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
      
      const dailyLimit = userData?.dailyCalories || 2000;
      const progress = totalCalories / dailyLimit;
      
      Animated.sequence([
        Animated.delay(500),
        Animated.timing(progressAnimation, {
          toValue: progress,
          duration: 1000,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true
        })
      ]).start(() => {
        setCurrentProgress(progress);
      });
      
      await AsyncStorage.setItem('dailyMealsHistory', JSON.stringify(updatedHistory));
      setEditingMeal(null);
    } catch (error) {
      console.error('Error updating meal:', error);
    }
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
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.calendarHeader}>
              <Text style={[styles.calendarTitle, { color: colors.text }]}>
                {formatDate(selectedDate)}
              </Text>
              <IconButton
                icon="close"
                size={24}
                onPress={() => setShowCalendarModal(false)}
                iconColor={colors.textSecondary}
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
                calendarBackground: colors.card,
                textSectionTitleColor: colors.textSecondary,
                selectedDayBackgroundColor: colors.primary,
                selectedDayTextColor: '#ffffff',
                todayTextColor: colors.primary,
                dayTextColor: colors.text,
                textDisabledColor: themeMode === 'dark' ? '#666666' : '#d9e1e8',
                dotColor: colors.primary,
                selectedDotColor: '#ffffff',
                arrowColor: colors.primary,
                monthTextColor: colors.primary,
                indicatorColor: colors.primary,
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
                },
                'stylesheet.day.basic': {
                  today: {
                    backgroundColor: themeMode === 'dark' ? 'rgba(129, 199, 132, 0.2)' : 'rgba(76, 175, 80, 0.1)',
                    borderRadius: 16
                  },
                  todayText: {
                    fontWeight: 'bold',
                  },
                  selected: {
                    backgroundColor: colors.primary,
                    borderRadius: 16
                  },
                  selectedText: {
                    color: '#ffffff'
                  }
                }
              }}
              firstDay={1}
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

  const getProgressBarColor = () => {
    const dailyLimit = userData?.dailyCalories || 2000;
    const percentage = (currentCalories / dailyLimit) * 100;
    
    if (percentage > 135) {
      return '#FF4444'; // Czerwony - przekroczenie o więcej niż 35%
    } else if (percentage > 100) {
      return '#FFE0B2'; // Pomarańczowy - przekroczenie o 0-35%
    }
    return '#4CAF50'; // Zielony - w normie
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
          const dailyLimit = userData?.dailyCalories || 2000;
          const progress = selectedDayData.totalCalories / dailyLimit;
          
          Animated.sequence([
            Animated.delay(500),
            Animated.timing(progressAnimation, {
              toValue: progress,
              duration: 1000,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true
            })
          ]).start(() => {
            setCurrentProgress(progress);
          });
        } else {
          setMeals([]);
          setCurrentCalories(0);
          Animated.sequence([
            Animated.delay(500),
            Animated.timing(progressAnimation, {
              toValue: 0,
              duration: 1000,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true
            })
          ]).start(() => {
            setCurrentProgress(0);
          });
        }
      }
    } catch (error) {
      console.error('Error loading selected date data:', error);
    }
  };

  // Pobierz kolory dla aktualnego motywu
  const colors = getColors(themeMode);
  const theme = getTheme(themeMode);

  if (isSettingsVisible) {
    return (
      <PaperProvider theme={theme}>
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
          <SettingsScreen 
            onUserDataUpdate={updateUserData} 
            onBack={async () => {
              if (userData) {
                await updateUserData(userData);
              }
              setIsSettingsVisible(false);
            }}
            themeMode={themeMode}
          />
          <View style={styles.settingsButtons}>
            <Button
              mode="contained"
              onPress={clearMealHistory}
              style={[styles.button, { backgroundColor: themeMode === 'dark' ? colors.buttonDanger : colors.danger }]}
              textColor="#FFFFFF"
            >
              Wyczyść historię posiłków
            </Button>
          </View>
          <Animated.View style={[styles.fabContainer, { transform: [{ rotate: spinAnimation }] }]}>
            <FAB
              style={[styles.fab, { backgroundColor: colors.accent }]}
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
          <View style={styles.themeToggleFabContainer}>
            <FAB
              style={[styles.fab, { backgroundColor: themeMode === 'dark' ? '#FFD54F' : '#333333' }]}
              icon={themeMode === 'dark' ? 'white-balance-sunny' : 'moon-waning-crescent'}
              onPress={async () => {
                const newThemeMode = themeMode === 'dark' ? 'light' : 'dark';
                setThemeMode(newThemeMode);
                if (userData) {
                  const updatedData = {
                    ...userData,
                    darkMode: newThemeMode === 'dark'
                  };
                  await updateUserData(updatedData);
                }
              }}
              color={themeMode === 'dark' ? '#333333' : '#FFFFFF'}
            />
          </View>
        </SafeAreaView>
      </PaperProvider>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={theme}>
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
          <ScrollView 
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
          >
            <Card style={[styles.card, { backgroundColor: colors.card }]}>
              <Card.Content>
                <Text style={[styles.title, { color: colors.text }]}>Spożycie kalorii</Text>
                <View style={styles.caloriesContainer}>
                  <View style={styles.caloriesTextContainer}>
                    <Text style={[styles.currentCalories, { color: colors.text }]}>{getSelectedDayCalories()}</Text>
                    <Text style={[styles.caloriesSeparator, { color: colors.textSecondary }]}>/</Text>
                    <Text style={[styles.dailyCalories, { color: colors.textSecondary }]}>{userData?.dailyCalories || 2000}</Text>
                    <Text style={[styles.caloriesUnit, { color: colors.textSecondary }]}>kcal</Text>
                  </View>
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBarBackground}>
                      <AnimatedProgressBar
                        progress={progressAnimation}
                        color={(() => {
                          const dailyLimit = userData?.dailyCalories || 2000;
                          const percentage = (getSelectedDayCalories() / dailyLimit) * 100;
                          
                          if (percentage > 135) {
                            return colors.danger;
                          } else if (percentage > 100) {
                            return colors.warning;
                          }
                          return colors.primary;
                        })()}
                        style={styles.progressBar}
                        themeMode={themeMode}
                      />
                    </View>
                    <View style={styles.progressLabelContainer}>
                      <Text style={[
                        styles.progressLabel, 
                        getSelectedDayCalories() > (userData?.dailyCalories || 2000) && styles.overLimitText,
                        { 
                          color: '#FFFFFF',
                          textShadowColor: 'rgba(0, 0, 0, 0.5)',
                          textShadowOffset: { width: 1, height: 1 },
                          textShadowRadius: 2
                        }
                      ]}>
                        {Math.round((getSelectedDayCalories() / (userData?.dailyCalories || 2000)) * 100)}%
                      </Text>
                    </View>
                  </View>
                </View>
              </Card.Content>
            </Card>

            <Card style={[styles.card, { backgroundColor: colors.card }]}>
              <List.Accordion
                title="Twoje dane"
                titleStyle={[styles.title, { color: colors.text }]}
                style={[styles.accordion, { backgroundColor: colors.card }]}
              >
                <List.Item
                  title="Waga"
                  description={`${userData?.weight || 0} kg`}
                  left={props => <List.Icon {...props} icon="scale" />}
                  titleStyle={{ color: colors.text }}
                  descriptionStyle={{ color: colors.textSecondary }}
                />
                <List.Item
                  title="Wzrost"
                  description={`${userData?.height || 0} cm`}
                  left={props => <List.Icon {...props} icon="human-male-height" />}
                  titleStyle={{ color: colors.text }}
                  descriptionStyle={{ color: colors.textSecondary }}
                />
                <List.Item
                  title="Dzienne zapotrzebowanie"
                  description={`${userData?.dailyCalories || 0} kcal`}
                  left={props => <List.Icon {...props} icon="food" />}
                  titleStyle={{ color: colors.text }}
                  descriptionStyle={{ color: colors.textSecondary }}
                />
              </List.Accordion>
            </Card>

            <Card style={[styles.card, { backgroundColor: colors.card }]}>
              <Card.Content>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>{formatDayTitle(selectedDate)}</Text>
                  <IconButton
                    icon="calendar"
                    size={24}
                    onPress={() => setShowCalendarModal(true)}
                    iconColor={colors.primary}
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
                      style={[styles.mealItem, { borderBottomColor: colors.border }]}
                    >
                      <View style={styles.mealInfo}>
                        <Text style={[styles.mealName, { color: colors.text }]}>{meal.name}</Text>
                        <Text style={[styles.mealCalories, { color: colors.textSecondary }]}>{meal.calories} kcal</Text>
                      </View>
                      <IconButton
                        icon="chevron-right"
                        size={24}
                        iconColor={colors.textSecondary}
                      />
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={{ color: colors.textSecondary }}>Brak posiłków na wybrany dzień</Text>
                )}
              </Card.Content>
            </Card>

            <Button
              mode="contained"
              onPress={() => setIsAddMealModalVisible(true)}
              style={[styles.button, { backgroundColor: themeMode === 'dark' ? colors.buttonPrimary : colors.primary }]}
              textColor="#FFFFFF"
            >
              Dodaj posiłek
            </Button>

            <AddMealForm
              visible={isAddMealModalVisible}
              onClose={() => setIsAddMealModalVisible(false)}
              onMealAdded={handleMealAdded}
              themeMode={themeMode}
            />

            {editingMeal && (
              <AddMealForm
                visible={!!editingMeal}
                onClose={() => setEditingMeal(null)}
                onMealAdded={handleMealUpdated}
                mealToEdit={editingMeal}
                themeMode={themeMode}
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
                  <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>{selectedMeal?.name}</Text>
                    <View style={styles.modalActions}>
                      <TouchableOpacity
                        style={[styles.modalAction, styles.editAction, { backgroundColor: themeMode === 'dark' ? colors.buttonPrimary : colors.primary }]}
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
                        style={[styles.modalAction, styles.deleteAction, { backgroundColor: themeMode === 'dark' ? colors.buttonDanger : colors.danger }]}
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
                      textColor={colors.text}
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
              style={[styles.fab, { backgroundColor: colors.accent }]}
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
  themeToggleFabContainer: {
    position: 'absolute',
    left: 0,
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
  progressBarContainer: {
    height: 24,
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#E0E0E0',
  },
  progressBarBackground: {
    height: '100%',
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
    borderRadius: 12,
  },
});

export default App;
