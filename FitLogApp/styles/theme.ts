import { DefaultTheme, MD3DarkTheme } from 'react-native-paper';
import { ThemeMode } from '../types';

export const LIGHT_COLORS = {
  primary: '#4CAF50',
  primaryLight: '#A5D6A7',
  primaryDark: '#2E7D32',
  accent: '#66BB6A',
  background: '#F5F5F5',
  card: '#FFFFFF',
  text: '#333333',
  textSecondary: '#666666',
  border: '#E0E0E0',
  danger: '#FF4444',
  warning: '#FFE0B2',
  success: '#C8E6C9',
  buttonPrimary: '#2E7D32',
  buttonDanger: '#D32F2F',
};

export const DARK_COLORS = {
  primary: '#81C784',
  primaryLight: '#A5D6A7',
  primaryDark: '#2E7D32',
  accent: '#4CAF50',
  background: '#121212',
  card: '#1E1E1E',
  text: '#FFFFFF',
  textSecondary: '#CCCCCC',
  border: '#333333',
  danger: '#F48FB1',
  warning: '#FFD54F',
  success: '#81C784',
  buttonPrimary: '#2E7D32',
  buttonDanger: '#C2185B',
};

export const LightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: LIGHT_COLORS.primary,
    accent: LIGHT_COLORS.accent,
    background: LIGHT_COLORS.background,
    surface: LIGHT_COLORS.card,
    text: LIGHT_COLORS.text,
    disabled: LIGHT_COLORS.textSecondary,
    placeholder: LIGHT_COLORS.textSecondary,
    backdrop: 'rgba(0, 0, 0, 0.5)',
    notification: LIGHT_COLORS.primary,
  },
};

export const DarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: DARK_COLORS.primary,
    accent: DARK_COLORS.accent,
    background: DARK_COLORS.background,
    surface: DARK_COLORS.card,
    text: DARK_COLORS.text,
    disabled: DARK_COLORS.textSecondary,
    placeholder: DARK_COLORS.textSecondary,
    backdrop: 'rgba(0, 0, 0, 0.7)',
    notification: DARK_COLORS.primary,
  },
};

export const getTheme = (mode: ThemeMode) => {
  return mode === 'dark' ? DarkTheme : LightTheme;
};

export const getColors = (mode: ThemeMode) => {
  return mode === 'dark' ? DARK_COLORS : LIGHT_COLORS;
}; 