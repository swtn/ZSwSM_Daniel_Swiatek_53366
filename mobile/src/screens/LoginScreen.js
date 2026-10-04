import { Text } from "../i18n/LanguageProvider.js";
import { t } from "../i18n/translations.js";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { apiRequest } from "../services/api.js";
import { saveToken } from "../services/token-storage.js";
import AppButton from "../components/AppButton.js";
import { useTheme, useThemedStyles } from "../theme/ThemeProvider.js";

export default function LoginScreen({
  onLogin,
  onRegister,
  initialEmail = ""
}) {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    if (loading) {
      return;
    }

    setError("");

    if (!email.trim() || !password) {
      setError("Podaj adres e-mail i hasło.");
      return;
    }

    setLoading(true);

    try {
      const result = await apiRequest("/auth/login", {
        method: "POST",
        body: {
          email: email.trim().toLowerCase(),
          password,
        },
      });

      await saveToken(result.token);
      setPassword("");
      onLogin({
        user: result.user,
        token: result.token,
      });
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text style={styles.title}>Kantor walutowy</Text>
        <Text style={styles.subtitle}>Zaloguj się na swoje konto</Text>

        <View style={styles.form}>
          <AppButton
            title="Nie masz konta? Zarejestruj się"
            variant="secondary"
            onPress={onRegister}
            disabled={loading}
          />
          <Text style={styles.label}>Adres e-mail</Text>
          <TextInput
            placeholderTextColor={theme.colors.muted}
            selectionColor={theme.colors.primary}
            keyboardAppearance={theme.dark ? "dark" : "light"}
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder={t("Adres e-mail")}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            editable={!loading}
          />

          <Text style={styles.label}>Hasło</Text>
          <TextInput
            placeholderTextColor={theme.colors.muted}
            selectionColor={theme.colors.primary}
            keyboardAppearance={theme.dark ? "dark" : "light"}
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder={t("Hasło")}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="current-password"
            editable={!loading}
            onSubmitEditing={handleLogin}
          />

          {error !== "" && (
            <Text style={styles.error} accessibilityRole="alert">
              {error}
            </Text>
          )}

          {loading && <ActivityIndicator size="large" color={theme.colors.primary} />}

          <AppButton
            title={loading ? "Logowanie…" : "Zaloguj się"}
            onPress={handleLogin}
            disabled={loading}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 32,
    color: theme.colors.muted,
  },
  form: {
    gap: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text,
  },
  error: {
    color: theme.colors.danger,
    fontSize: 16,
  },
});
