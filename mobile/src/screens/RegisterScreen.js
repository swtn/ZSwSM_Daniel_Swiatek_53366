import { Text, localizedAlert } from "../i18n/LanguageProvider.js";
import { t } from "../i18n/translations.js";
import { useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import AppButton from "../components/AppButton.js";
import { apiRequest } from "../services/api.js";
import { useTheme, useThemedStyles } from "../theme/ThemeProvider.js";

export default function RegisterScreen({ onRegistered, onBack }) {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);

  async function handleRegister() {
    if (submitting.current) {
      return;
    }

    setError("");
    Keyboard.dismiss();

    const normalizedEmail = email.trim().toLowerCase();

    if (!firstName.trim() || !lastName.trim() || !normalizedEmail || !password || !confirmation) {
      setError("Uzupełnij wszystkie pola.");
      return;
    }

    if (password.length < 12 || password.length > 128) {
      setError("Hasło musi mieć od 12 do 128 znaków.");
      return;
    }

    if (password !== confirmation) {
      setError("Podane hasła nie są takie same.");
      return;
    }

    submitting.current = true;
    setLoading(true);

    try {
      const result = await apiRequest("/auth/register", {
        method: "POST",
        body: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: normalizedEmail,
          password,
        },
      });

      setPassword("");
      setConfirmation("");

      localizedAlert(
        "Konto utworzone",
        "Możesz teraz zalogować się na swoje konto.",
        [
          {
            text: "Przejdź do logowania",
            onPress: () => onRegistered(result.user.email),
          },
        ],
        { cancelable: false }
      );
    } catch (error) {
      const details = error.details
        ?.map((item) => item.message)
        .filter(Boolean);

      setError(
        details?.length
          ? details.join("\n")
          : error.message
      );

      submitting.current = false;
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
        <Text style={styles.title}>Utwórz konto</Text>
        <Text style={styles.subtitle}>
          Twój portfel walutowy w jednym miejscu.
        </Text>

        <View style={styles.form}>
          <Text style={styles.label}>Imię</Text>
          <TextInput
            placeholderTextColor={theme.colors.muted}
            selectionColor={theme.colors.primary}
            keyboardAppearance={theme.dark ? "dark" : "light"}
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
            placeholder={t("Twoje imię")}
            autoComplete="given-name"
            autoCapitalize="words"
            maxLength={100}
            editable={!loading}
          />
          <Text style={styles.label}>Nazwisko</Text>
          <TextInput
            placeholderTextColor={theme.colors.muted}
            selectionColor={theme.colors.primary}
            keyboardAppearance={theme.dark ? "dark" : "light"}
            style={styles.input}
            value={lastName}
            onChangeText={setLastName}
            placeholder={t("Twoje nazwisko")}
            autoComplete="family-name"
            autoCapitalize="words"
            maxLength={100}
            editable={!loading}
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
            maxLength={254}
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
            placeholder={t("Minimum 12 znaków")}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            maxLength={128}
            editable={!loading}
          />

          <Text style={styles.label}>Powtórz hasło</Text>
          <TextInput
            placeholderTextColor={theme.colors.muted}
            selectionColor={theme.colors.primary}
            keyboardAppearance={theme.dark ? "dark" : "light"}
            style={styles.input}
            value={confirmation}
            onChangeText={setConfirmation}
            placeholder={t("Wpisz hasło ponownie")}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            maxLength={128}
            editable={!loading}
            onSubmitEditing={handleRegister}
          />

          {error !== "" && (
            <Text style={styles.error} accessibilityRole="alert">
              {error}
            </Text>
          )}

          <AppButton
            title="Utwórz konto"
            onPress={handleRegister}
            loading={loading}
          />

          <AppButton
            title="Wróć do logowania"
            variant="secondary"
            onPress={onBack}
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
    paddingTop: 56,
    paddingBottom: 40,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.muted,
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 28,
  },
  form: {
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.input,
    padding: 14,
    fontSize: 16,
    color: theme.colors.text,
  },
  error: {
    color: theme.colors.danger,
    fontSize: 14,
    lineHeight: 21,
  },
});
