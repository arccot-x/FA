import { useEffect, useState } from "react";
import { Text } from "react-native";
import type { StyleProp, TextStyle } from "react-native";
import { Easing, runOnJS, useSharedValue, withTiming } from "react-native-reanimated";
import { useAnimatedReaction } from "react-native-reanimated";

type AnimatedNumberProps = {
  value: number;
  format: (value: number) => string;
  style?: StyleProp<TextStyle>;
  duration?: number;
  numberOfLines?: number;
  adjustsFontSizeToFit?: boolean;
};

/**
 * Counts up/down to `value`, formatting each frame with `format`.
 * Keeps the heavy formatting on the JS thread via runOnJS.
 */
export function AnimatedNumber({ value, format, style, duration = 700, numberOfLines, adjustsFontSizeToFit }: AnimatedNumberProps) {
  const progress = useSharedValue(value);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    progress.value = withTiming(value, { duration, easing: Easing.out(Easing.cubic) });
  }, [value, duration, progress]);

  useAnimatedReaction(
    () => progress.value,
    (current) => {
      runOnJS(setDisplay)(current);
    },
    [value]
  );

  return (
    <Text style={style} numberOfLines={numberOfLines} adjustsFontSizeToFit={adjustsFontSizeToFit}>
      {format(display)}
    </Text>
  );
}
