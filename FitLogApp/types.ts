export interface UserData {
  dailyCalories: number;
  weight: number;
  height: number;
  age: number;
  gender: 'male' | 'female';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  manualCalories: boolean;
}

export interface Meal {
  id: string;
  name: string;
  calories: number;
  date: string;
} 