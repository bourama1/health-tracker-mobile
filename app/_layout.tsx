import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import {
  PaperProvider,
  MD3LightTheme,
  MD3DarkTheme,
  adaptNavigationThemes,
  Button,
  Text,
  ActivityIndicator,
} from 'react-native-paper';
import { View, StyleSheet } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider, useAuth } from '@/src/context/AuthContext';

const { LightTheme, DarkTheme: NavDarkTheme } = adaptNavigationThemes({
  reactNavigationLight: DefaultTheme,
  reactNavigationDark: DarkTheme,
});

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, isCheckingAuth, login } = useAuth();

  const paperTheme =
    colorScheme === 'dark'
      ? { ...MD3DarkTheme, colors: MD3DarkTheme.colors }
      : { ...MD3LightTheme, colors: MD3LightTheme.colors };

  const navTheme = colorScheme === 'dark' ? NavDarkTheme : LightTheme;

  if (isCheckingAuth) {
    return (
      <View
        style={[
          { flex: 1, justifyContent: 'center', alignItems: 'center' },
          colorScheme === 'dark' && { backgroundColor: '#121212' },
        ]}
      >
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <PaperProvider theme={paperTheme}>
        <ThemeProvider value={navTheme}>
          <View
            style={[
              styles.loginContainer,
              colorScheme === 'dark' && { backgroundColor: '#121212' },
            ]}
          >
            <Text style={styles.title}>Health Tracker</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>
            <Button
              mode="contained"
              icon="google"
              onPress={login}
              style={styles.button}
            >
              Sign in with Google
            </Button>
          </View>
        </ThemeProvider>
      </PaperProvider>
    );
  }

  return (
    <PaperProvider theme={paperTheme}>
      <ThemeProvider value={navTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
      </ThemeProvider>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 30,
    opacity: 0.7,
  },
  button: {
    width: '100%',
    paddingVertical: 5,
  },
});
