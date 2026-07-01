import { forwardRef } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import type { TextInputProps } from "react-native";
import { useTheme } from "../../theme";
import { useI18n } from "../../i18n";

type FieldProps = TextInputProps & {
  label?: string;
  error?: string;
  containerStyle?: object;
};

const numericKeyboards = new Set(["decimal-pad", "numeric", "number-pad"]);

export const Field = forwardRef<TextInput, FieldProps>(({ label, error, containerStyle, style, accessibilityLabel, accessibilityHint, ...rest }, ref) => {
  const theme = useTheme();
  const { isRTL, t } = useI18n();
  const numericHint = rest.keyboardType && numericKeyboards.has(rest.keyboardType) ? t("common.numericFieldHint") : undefined;

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text style={[styles.label, { color: theme.colors.subtleText, textAlign: isRTL ? "right" : "left" }]}>{label}</Text>
      ) : null}
      <TextInput
        ref={ref}
        placeholderTextColor={theme.colors.muted}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={accessibilityHint ?? numericHint}
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.surface,
            borderColor: error ? theme.colors.danger : theme.colors.border,
            borderRadius: theme.radii.md,
            color: theme.colors.text,
            textAlign: isRTL ? "right" : "left"
          },
          style
        ]}
        {...rest}
      />
      {error ? <Text style={[styles.error, { color: theme.colors.danger, textAlign: isRTL ? "right" : "left" }]}>{error}</Text> : null}
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
  },
  error: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16
  }
});
