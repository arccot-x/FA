import { forwardRef } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import type { TextInputProps } from "react-native";
import { useTheme } from "../../theme";
import { useI18n } from "../../i18n";

type FieldProps = TextInputProps & {
  label?: string;
  containerStyle?: object;
};

export const Field = forwardRef<TextInput, FieldProps>(({ label, containerStyle, style, ...rest }, ref) => {
  const theme = useTheme();
  const { isRTL } = useI18n();

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text style={[styles.label, { color: theme.colors.subtleText, textAlign: isRTL ? "right" : "left" }]}>{label}</Text>
      ) : null}
      <TextInput
        ref={ref}
        placeholderTextColor={theme.colors.muted}
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderRadius: theme.radii.md,
            color: theme.colors.text,
            textAlign: isRTL ? "right" : "left"
          },
          style
        ]}
        {...rest}
      />
    </View>
  );
});

Field.displayName = "Field";

const styles = StyleSheet.create({
  container: {
    gap: 6
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase"
  },
  input: {
    borderWidth: 1,
    fontSize: 17,
    fontWeight: "600",
    minHeight: 54,
    paddingHorizontal: 16
  }
});
