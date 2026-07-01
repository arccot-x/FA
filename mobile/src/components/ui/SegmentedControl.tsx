import { useState } from "react";
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";
import { useTheme } from "../../theme";

type Segment<T extends string> = { value: T; label: string };

type SegmentedControlProps<T extends string> = {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({ segments, value, onChange }: SegmentedControlProps<T>) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, segments.findIndex((segment) => segment.value === value));
  const segmentWidth = width > 0 ? (width - 8) / segments.length : 0;

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: withTiming(index * segmentWidth, { duration: 200 }) }]
  }));

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  return (
    <View
      onLayout={onLayout}
      style={[styles.container, { backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radii.md, borderColor: theme.colors.border }]}
    >
      {segmentWidth > 0 ? (
        <Animated.View
          style={[
            styles.thumb,
            thumbStyle,
            { width: segmentWidth, backgroundColor: theme.colors.surface, borderRadius: theme.radii.sm, ...theme.shadow("sm") }
          ]}
        />
      ) : null}
      {segments.map((segment) => {
        const active = segment.value === value;
        return (
          <Pressable key={segment.value} accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={segment.label} style={styles.segment} onPress={() => onChange(segment.value)}>
            <Text adjustsFontSizeToFit style={[styles.label, { color: active ? theme.colors.text : theme.colors.muted }]} numberOfLines={1}>
              {segment.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderWidth: 1,
    padding: 4
  },
  thumb: {
    position: "absolute",
    top: 4,
    left: 4,
    bottom: 4
  },
  segment: {
    flex: 1,
    minHeight: 38,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4
  },
  label: {
    fontSize: 14,
    fontWeight: "800",
    maxWidth: "100%"
  }
});
