import { useState } from "react";
import {
  ActivityIndicator,
  Button,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { apiRequest } from "../services/api.js";
import { saveToken } from "../services/token-storage.js";
import AppButton from "../components/AppButton.js";
import { theme } from "../theme/theme.js";

export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
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
          <Text style={styles.label}>Adres e-mail</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Adres e-mail"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            editable={!loading}
          />

          <Text style={styles.label}>Hasło</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Hasło"
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

          {loading && <ActivityIndicator size="large" />}

          <Button
            title={loading ? "Logowanie…" : "Zaloguj się"}
            onPress={handleLogin}
            disabled={loading}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 32,
    color: "#475569",
  },
  form: {
    gap: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#94a3b8",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#0f172a",
  },
  error: {
    color: "#b91c1c",
    fontSize: 16,
  },
});