import { Text, LanguageProvider, useLanguage } from "./src/i18n/LanguageProvider.js";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import LoginScreen from "./src/screens/LoginScreen.js";
import { apiRequest, ApiError } from "./src/services/api.js";
import {
  getToken,
  removeToken,
} from "./src/services/token-storage.js";
import MainTabs from "./src/navigation/MainTabs.js";
import RegisterScreen from "./src/screens/RegisterScreen.js";
import AppButton from "./src/components/AppButton.js";
import { ThemeProvider, useTheme, useThemedStyles } from "./src/theme/ThemeProvider.js";

export default function App() {
  return <LanguageProvider><ThemeProvider><AppContent /></ThemeProvider></LanguageProvider>;
}

function AppContent() {
  useLanguage();
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [startupError, setStartupError] = useState("");
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [showRegistration, setShowRegistration] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  useEffect(() => {
    restoreSession();
  }, []);

  async function restoreSession() {
    setCheckingSession(true);
    setStartupError("");

    try {
      const token = await getToken();

      if (!token) {
        setSession(null);
        return;
      }

      try {
        const result = await apiRequest("/auth/me", { token });

        setSession({
          user: result.user,
          token,
        });
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          await removeToken();
          setSession(null);
          return;
        }

        throw error;
      }
    } catch (error) {
      setStartupError(error.message);
    } finally {
      setCheckingSession(false);
    }
  }

  async function handleLogout() {
    if (logoutLoading || !session) {
      return;
    }

    setLogoutLoading(true);
    setLogoutError("");

    try {
      try {
        await apiRequest("/auth/logout", {
          method: "POST",
          token: session.token,
        });
      } catch (error) {
        // Nieważna sesja również pozwala zakończyć logowanie lokalnie.
        if (!(error instanceof ApiError && error.status === 401)) {
          throw error;
        }
      }

      await removeToken();
      setSession(null);
    } catch (error) {
      setLogoutError(error.message);
    } finally {
      setLogoutLoading(false);
    }
  }

  let content;

  if (checkingSession) {
    content = (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ color: theme.colors.text }}>Sprawdzanie sesji…</Text>
      </View>
    );
  } else if (startupError) {
    content = (
      <View style={styles.container}>
        <Text style={styles.title}>Nie można sprawdzić sesji</Text>
        <Text style={styles.error}>{startupError}</Text>
        <AppButton
          title="Spróbuj ponownie"
          onPress={restoreSession}
        />
      </View>
    );
  } else if (session) {
    content = (
      <MainTabs
        session={session}
        onSignedOut={async () => { await removeToken(); setSession(null); }}
        onUserUpdated={(user) => {
          setSession((current) => current && current.user.id === user.id
            ? { ...current, user }
            : current);
        }}
        onLogout={handleLogout}
        logoutLoading={logoutLoading}
        logoutError={logoutError}
      />
    );
  } else if (showRegistration) {
  content = (
    <RegisterScreen
      onBack={() => setShowRegistration(false)}
      onRegistered={(email) => {
        setRegisteredEmail(email);
        setShowRegistration(false);
      }}
    />
  );
  } else {
    content = (
      <LoginScreen
        initialEmail={registeredEmail}
        onRegister={() => setShowRegistration(true)}
        onLogin={(newSession) => {
          setLogoutError("");
          setSession(newSession);
        }}
      />
    );
  }

  return (
    <>
      <StatusBar style={theme.dark ? "light" : "dark"} />
      {content}
    </>
  );
}

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: theme.colors.background,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.colors.text,
    textAlign: "center",
  },
  email: {
    fontSize: 16,
  },
  error: {
    color: theme.colors.danger,
    fontSize: 16,
    textAlign: "center",
  },
});
