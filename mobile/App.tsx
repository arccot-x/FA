import "react-native-gesture-handler";
import { DarkTheme, DefaultTheme, NavigationContainer } from "@react-navigation/native";
import type { Theme as NavTheme } from "@react-navigation/native";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as NavigationBar from "expo-navigation-bar";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { HomeScreen } from "./src/screens/HomeScreen";
import { BillCenterScreen } from "./src/screens/BillCenterScreen";
import { VaultScreen } from "./src/screens/VaultScreen";
import { AnalyticsScreen } from "./src/screens/AnalyticsScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { CameraScreen } from "./src/screens/CameraScreen";
import { AuthScreen } from "./src/screens/AuthScreen";
import { AppTabBar } from "./src/components/AppTabBar";
import { useFinanceStore } from "./src/store/useFinanceStore";
import { ThemeProvider, useTheme, useThemeContext } from "./src/theme";
import { I18nProvider, useI18n } from "./src/i18n";
import { CurrencyProvider } from "./src/utils/CurrencyProvider";
import { BudgetProvider } from "./src/utils/BudgetProvider";
import { RemindersProvider } from "./src/utils/RemindersProvider";

export type RootStackParamList = {
  MainTabs: undefined;
  Camera: undefined;
};

export type MainTabsParamList = {
  Home: undefined;
  Bills: undefined;
  Vault: undefined;
  Analytics: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createMaterialTopTabNavigator<MainTabsParamList>();

function MainTabs() {
  return (
    <Tabs.Navigator
      tabBarPosition="bottom"
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{ swipeEnabled: true, lazy: false }}
    >
      <Tabs.Screen name="Home" component={HomeScreen} />
      <Tabs.Screen name="Bills" component={BillCenterScreen} />
      <Tabs.Screen name="Vault" component={VaultScreen} />
      <Tabs.Screen name="Analytics" component={AnalyticsScreen} />
      <Tabs.Screen name="Settings" component={SettingsScreen} />
    </Tabs.Navigator>
  );
}

function Root() {
  const theme = useTheme();
  const { ready: themeReady } = useThemeContext();
  const { t, ready: i18nReady } = useI18n();
  const { authReady, restoreSession, user } = useFinanceStore();

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(theme.colors.background);
    if (Platform.OS === "android") {
      void NavigationBar.setBackgroundColorAsync(theme.colors.surface);
      void NavigationBar.setButtonStyleAsync(theme.isDark ? "light" : "dark");
    }
  }, [theme]);

  const navTheme: NavTheme = {
    ...(theme.isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme.isDark ? DarkTheme : DefaultTheme).colors,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.text,
      border: theme.colors.border,
      primary: theme.colors.primary
    }
  };

  const ready = themeReady && i18nReady && authReady;

  return (
    <View style={[styles.app, { backgroundColor: theme.colors.background }]}>
      <StatusBar style={theme.isDark ? "light" : "dark"} />
      {!ready ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.subtleText }]}>{t("loadingAccount")}</Text>
        </View>
      ) : user ? (
        <NavigationContainer theme={navTheme}>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="Camera" component={CameraScreen} options={{ presentation: "fullScreenModal" }} />
          </Stack.Navigator>
        </NavigationContainer>
      ) : (
        <AuthScreen />
      )}
    </View>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <ThemeProvider>
          <I18nProvider>
            <CurrencyProvider>
              <BudgetProvider>
                <RemindersProvider>
                  <Root />
                </RemindersProvider>
              </BudgetProvider>
            </CurrencyProvider>
          </I18nProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  app: { flex: 1 },
  loading: {
    alignItems: "center",
    flex: 1,
    gap: 12,
    justifyContent: "center"
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "800"
  }
});
