import Constants from "expo-constants";

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  "http://10.0.2.2:4000/api";

export const DEMO_USER_EMAIL = "demo@frictionless.finance";

