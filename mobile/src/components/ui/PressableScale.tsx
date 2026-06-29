import type { ReactNode } from "react";
import { Pressable } from "react-native";
import type { PressableProps, StyleProp, ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type PressableScaleProps = PressableProps & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  hapticStyle?: never;
};

export function PressableScale({ children, style, scaleTo = 0.96, onPressIn, onPressOut, ...rest }: PressableScaleProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      style={[style, animatedStyle]}
      onPressIn={(event) => {
        scale.value = withTiming(scaleTo, { duration: 90 });
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.value = withTiming(1, { duration: 130 });
        onPressOut?.(event);
      }}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
