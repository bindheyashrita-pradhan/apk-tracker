import { useColorScheme } from 'react-native';

export const useDarkMode = (): boolean => {
  const systemScheme = useColorScheme();
  return systemScheme === 'dark';
};