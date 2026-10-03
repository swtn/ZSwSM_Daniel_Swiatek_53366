import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Button,
  StyleSheet,
  Text,
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

export default function App() {
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [startupError, setStartupError] = useState("");
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [logoutError, setLogoutError] = useState("");

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
        <ActivityIndicator size="large" />
        <Text>Sprawdzanie sesji…</Text>
      </View>
    );
  } else if (startupError) {
    content = (
      <View style={styles.container}>
        <Text style={styles.title}>Nie można sprawdzić sesji</Text>
        <Text style={styles.error}>{startupError}</Text>
        <Button
          title="Spróbuj ponownie"
          onPress={restoreSession}
        />
      </View>
    );
  } else if (session) {
    content = (
      <MainTabs
        session={session}
        onLogout={handleLogout}
        logoutLoading={logoutLoading}
        logoutError={logoutError}
      />
    );
  } else {
    content = (
      <LoginScreen
        onLogin={(newSession) => {
          setLogoutError("");
          setSession(newSession);
        }}
      />
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      {content}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#ffffff",
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
  },
  email: {
    fontSize: 16,
  },
  error: {
    color: "#b91c1c",
    fontSize: 16,
    textAlign: "center",
  },
});