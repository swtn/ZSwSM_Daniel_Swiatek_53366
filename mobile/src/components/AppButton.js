import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
} from "react-native";
import { theme } from "../theme/theme.js";

export default function AppButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = "primary",
}) {
  const blocked = disabled || loading;
  const secondary = variant === "secondary";

  const foreground = secondary
    ? theme.colors.primary
    : theme.colors.surface;

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

const styles = StyleSheet.create({
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