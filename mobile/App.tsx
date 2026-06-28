import "react-native-gesture-handler";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as NavigationBar from "expo-navigation-bar";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { HomeScreen } from "./src/screens/HomeScreen";
import { BillCenterScreen } from "./src/screens/BillCenterScreen";
import { VaultScreen } from "./src/screens/VaultScreen";
import { AnalyticsScreen } from "./src/screens/AnalyticsScreen";
import { CameraScreen } from "./src/screens/CameraScreen";
import { AuthScreen } from "./src/screens/AuthScreen";
import { useFinanceStore } from "./src/store/useFinanceStore";
import { colors } from "./src/theme";

export type RootStackParamList = {
  MainTabs: undefined;
  Camera: undefined;
};

export type MainTabsParamList = {
  Home: undefined;
  Bills: undefined;
  Vault: undefined;
  Analytics: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<MainTabsParamList>();

function MainTabs() {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          height: 66,
          paddingBottom: 10,
          paddingTop: 8,
          borderTopColor: colors.border
        },
        tabBarIcon: ({ color, size }) => {
          const icon =
            route.name === "Home"
              ? "view-dashboard"
              : route.name === "Bills"
                ? "calendar-check"
                : route.name === "Vault"
                  ? "folder-lock"
                  : "chart-bar";

          return <MaterialCommunityIcons color={color} name={icon} size={size} />;
        }
      })}
    >
      <Tabs.Screen name="Home" component={HomeScreen} />
      <Tabs.Screen name="Bills" component={BillCenterScreen} />
      <Tabs.Screen name="Vault" component={VaultScreen} />
      <Tabs.Screen name="Analytics" component={AnalyticsScreen} />
    </Tabs.Navigator>
  );
}

export default function App() {
  const { authReady, restoreSession, user } = useFinanceStore();

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.background);
    void NavigationBar.setBackgroundColorAsync(colors.background);
    void NavigationBar.setButtonStyleAsync("dark");
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <View style={styles.app}>
          <StatusBar style="dark" />
          {!authReady ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.loadingText}>Opening your account</Text>
            </View>
          ) : user ? (
            <NavigationContainer>
              <Stack.Navigator>
                <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
                <Stack.Screen name="Camera" component={CameraScreen} options={{ title: "Snap & Save" }} />
              </Stack.Navigator>
            </NavigationContainer>
          ) : (
            <AuthScreen />
          )}
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: colors.background
  },
  loading: {
    alignItems: "center",
    flex: 1,
    gap: 12,
    justifyContent: "center"
  },
  loadingText: {
    color: colors.subtleText,
    fontWeight: "800"
  }
});
