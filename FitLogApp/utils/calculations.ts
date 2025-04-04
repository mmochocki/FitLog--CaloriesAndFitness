import { UserData } from '../types';

export const calculateCalories = (userData: UserData): number => {
  if (userData.manualCalories) {
    return userData.dailyCalories;
  }

  // Wzór Mifflina-St Jeora
  let bmr = 10 * userData.weight + 6.25 * userData.height - 5 * userData.age;
  bmr = userData.gender === 'male' ? bmr + 5 : bmr - 161;

  // Mnożniki dla poziomów aktywności
  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };

  return Math.round(bmr * activityMultipliers[userData.activityLevel]);
};

export const calculateMacros = (calories: number) => {
  // Standardowy podział makroskładników: 50% węglowodany, 30% tłuszcze, 20% białka
  return {
    carbs: Math.round((calories * 0.5) / 4), // 4 kcal/g dla węglowodanów
    protein: Math.round((calories * 0.2) / 4), // 4 kcal/g dla białka
    fat: Math.round((calories * 0.3) / 9), // 9 kcal/g dla tłuszczu
  };
}; 