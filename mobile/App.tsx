import "react-native-gesture-handler";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { HomeScreen } from "./src/screens/HomeScreen";
import { BillCenterScreen } from "./src/screens/BillCenterScreen";
import { VaultScreen } from "./src/screens/VaultScreen";
import { AnalyticsScreen } from "./src/screens/AnalyticsScreen";
import { CameraScreen } from "./src/screens/CameraScreen";
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
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="dark" />
          <Stack.Navigator>
            <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen name="Camera" component={CameraScreen} options={{ title: "Snap & Save" }} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

