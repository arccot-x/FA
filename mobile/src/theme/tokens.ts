// Design tokens for the app. Colours are defined per scheme (light/dark); spacing,
// radii, typography and shadows are scheme-independent. Everything funnels through
// the Theme object exposed by ThemeProvider so screens never import raw hex values.

export type ColorScheme = "light" | "dark";

export type Palette = {
  // Surfaces
  background: string;
  backgroundAlt: string;
  surface: string;
  surfaceAlt: string;
  card: string;
  // Brand
  primary: string;
  primaryDark: string;
  primarySoft: string; // tinted background for primary icons/chips
  onPrimary: string;
  accent: string;
  accentSoft: string;
  info: string;
  // Text
  text: string;
  subtleText: string;
  muted: string;
  // Lines / states
  border: string;
  borderStrong: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  // Misc
  overlay: string;
  shadow: string;
  // Gradients (start -> end)
  heroGradient: [string, string];
  trackBg: string; // progress ring track
};

export const lightPalette: Palette = {
  background: "#F4F6F8",
  backgroundAlt: "#EAEEF1",
  surface: "#FFFFFF",
  surfaceAlt: "#F7F9FB",
  card: "#FFFFFF",
  primary: "#0E7C66",
  primaryDark: "#075E4D",
  primarySoft: "#E2F1EC",
  onPrimary: "#FFFFFF",
  accent: "#E06A41",
  accentSoft: "#FCE9E1",
  info: "#246BFE",
  text: "#16201D",
  subtleText: "#586460",
  muted: "#8A938F",
  border: "#E3E8E6",
  borderStrong: "#CDD5D2",
  success: "#1C8C52",
  successSoft: "#E2F3E9",
  warning: "#B0710A",
  warningSoft: "#FBEFD9",
  danger: "#C2362B",
  dangerSoft: "#FBE3E1",
  overlay: "rgba(16, 26, 23, 0.45)",
  shadow: "#0B231D",
  heroGradient: ["#10876F", "#0A5F4E"],
  trackBg: "rgba(255,255,255,0.28)"
};

export const darkPalette: Palette = {
  background: "#0E1614",
  backgroundAlt: "#121E1B",
  surface: "#172420",
  surfaceAlt: "#1E2D28",
  card: "#172420",
  primary: "#3BD0A8",
  primaryDark: "#22A584",
  primarySoft: "#16332B",
  onPrimary: "#04201A",
  accent: "#F2865C",
  accentSoft: "#34211A",
  info: "#5E97FF",
  text: "#ECF3F0",
  subtleText: "#A4B0AB",
  muted: "#74807B",
  border: "#26352F",
  borderStrong: "#33453E",
  success: "#46C57E",
  successSoft: "#16301F",
  warning: "#E1A43C",
  warningSoft: "#332817",
  danger: "#F0675B",
  dangerSoft: "#3A1F1D",
  overlay: "rgba(0, 0, 0, 0.6)",
  shadow: "#000000",
  heroGradient: ["#125C4D", "#0B3A30"],
  trackBg: "rgba(255,255,255,0.16)"
};

export const palettes: Record<ColorScheme, Palette> = {
  light: lightPalette,
  dark: darkPalette
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48
} as const;

export const radii = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999
} as const;

export const typography = {
  display: { fontSize: 34, fontWeight: "800" as const, letterSpacing: -0.5 },
  title: { fontSize: 26, fontWeight: "800" as const, letterSpacing: -0.3 },
  heading: { fontSize: 19, fontWeight: "800" as const },
  body: { fontSize: 15, fontWeight: "600" as const },
  label: { fontSize: 12, fontWeight: "800" as const, letterSpacing: 0.4 },
  caption: { fontSize: 13, fontWeight: "600" as const }
} as const;

export type Elevation = "none" | "sm" | "md" | "lg";

export function shadow(color: string, level: Elevation) {
  switch (level) {
    case "sm":
      return {
        shadowColor: color,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2
      };
    case "md":
      return {
        shadowColor: color,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 14,
        elevation: 5
      };
    case "lg":
      return {
        shadowColor: color,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.18,
        shadowRadius: 24,
        elevation: 10
      };
    default:
      return {};
  }
}

export type Theme = {
  scheme: ColorScheme;
  isDark: boolean;
  colors: Palette;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
  shadow: (level: Elevation) => ReturnType<typeof shadow>;
};

export function buildTheme(scheme: ColorScheme): Theme {
  const colors = palettes[scheme];
  return {
    scheme,
    isDark: scheme === "dark",
    colors,
    spacing,
    radii,
    typography,
    shadow: (level: Elevation) => shadow(colors.shadow, level)
  };
}
