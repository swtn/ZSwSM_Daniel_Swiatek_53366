import { Text } from "../i18n/LanguageProvider.js";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  } from "react-native";
import { useTheme, useThemedStyles } from "../theme/ThemeProvider.js";

export default function AppButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = "primary",
}) {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const blocked = disabled || loading;
  const secondary = variant === "secondary";

  const foreground = secondary
    ? theme.colors.primary
    : theme.colors.onPrimary;

  return (
    <Pressable
      onPress={onPress}
      disabled={blocked}
      accessibilityRole="button"
      accessibilityState={{
        disabled: blocked,
        busy: loading,
      }}
      style={({ pressed }) => [
        styles.button,
        secondary ? styles.secondary : styles.primary,
        blocked && styles.disabled,
        pressed && !blocked && styles.pressed,
      ]}
    >
      {loading && (
        <ActivityIndicator color={foreground} size="small" />
      )}

      <Text style={[styles.label, { color: foreground }]}>
        {title}
      </Text>
    </Pressable>
  );
}

const createStyles = (theme) => StyleSheet.create({
  button: {
    minHeight: 52,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: theme.radius.button,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  primary: {
    backgroundColor: theme.colors.primary,
  },
  secondary: {
    backgroundColor: theme.colors.primaryLight,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.8,
  },
});