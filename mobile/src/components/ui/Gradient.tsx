import { useId, useState } from "react";
import { StyleSheet, View } from "react-native";
import type { LayoutChangeEvent, StyleProp, ViewStyle } from "react-native";
import type { ReactNode } from "react";
import Svg, { Defs, LinearGradient, Rect, Stop, Circle } from "react-native-svg";

type GradientProps = {
  colors: [string, string];
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
  children?: ReactNode;
  decoration?: boolean; // subtle translucent circles for depth
};

/**
 * Linear-gradient surface backed by react-native-svg (no extra native dependency).
 * Measures its own box and draws the SVG at exact pixel size so the fill always
 * covers the whole card (percentage sizing under-renders on some devices).
 */
export function Gradient({ colors, style, borderRadius = 0, children, decoration = true }: GradientProps) {
  const rawId = useId();
  const gradientId = `grad-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const [size, setSize] = useState({ width: 0, height: 0 });

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width !== size.width || height !== size.height) {
      setSize({ width, height });
    }
  };

  return (
    <View onLayout={onLayout} style={[{ borderRadius, overflow: "hidden", backgroundColor: colors[0] }, style]}>
      {size.width > 0 ? (
        <Svg style={StyleSheet.absoluteFill} width={size.width} height={size.height}>
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2={size.width} y2={size.height} gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor={colors[0]} />
              <Stop offset="1" stopColor={colors[1]} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width={size.width} height={size.height} fill={`url(#${gradientId})`} />
          {decoration ? (
            <>
              <Circle cx={size.width * 0.86} cy={size.height * 0.12} r={size.height * 0.42} fill="rgba(255,255,255,0.08)" />
              <Circle cx={size.width * 0.7} cy={size.height * 1.05} r={size.height * 0.7} fill="rgba(255,255,255,0.06)" />
            </>
          ) : null}
        </Svg>
      ) : null}
      {children}
    </View>
  );
}
