import { useCallback, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  DefaultTheme,
  NavigationContainer,
  useFocusEffect,
} from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import WalletScreen from "../screens/WalletScreen.js";
import RatesPanel from "../components/RatesPanel.js";
import AppButton from "../components/AppButton.js";
import { apiRequest } from "../services/api.js";
import { theme } from "../theme/theme.js";

const Tab = createBottomTabNavigator();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: theme.colors.primary,
    background: theme.colors.background,
    card: theme.colors.surface,
    text: theme.colors.text,
    border: theme.colors.border,
  },
};

function Screen({ children }) {
  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      {children}
    </SafeAreaView>
  );
}

function RatesScreen({ token }) {
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Kursy walut</Text>
        <Text style={styles.subtitle}>Kupno i sprzedaż według NBP</Text>
        <RatesPanel token={token} />
      </ScrollView>
    </Screen>
  );
}

function HistoryScreen({ token }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadHistory() {
        setLoading(true);
        setError("");

        try {
          const [deposits, exchanges] = await Promise.all([
            apiRequest("/wallet/deposits", { token }),
            apiRequest("/exchange/history", { token }),
          ]);

          const combined = [
            ...deposits.deposits.map((item) => ({
              ...item,
              type: "deposit",
            })),
            ...exchanges.exchanges.map((item) => ({
              ...item,
              type: "exchange",
            })),
          ].sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          );

          if (active) {
            setItems(combined);
          }
        } catch (error) {
          if (active) {
            setError(error.message);
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      }

      loadHistory();

      return () => {
        active = false;
      };
    }, [token, reload])
  );

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => setReload((value) => value + 1)}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        <Text style={styles.title}>Historia</Text>
        <Text style={styles.subtitle}>Ostatnie wpłaty i wymiany</Text>

        {error !== "" && (
          <View style={styles.card}>
            <Text style={styles.error}>{error}</Text>
            <AppButton
              title="Spróbuj ponownie"
              variant="secondary"
              onPress={() => setReload((value) => value + 1)}
              disabled={loading}
            />
          </View>
        )}

        {error !== "" && items.length > 0 && (
          <Text style={styles.subtitle}>
            Widoczne są ostatnio pobrane dane.
          </Text>
        )}

        {!loading && !error && items.length === 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Brak operacji</Text>
            <Text style={styles.subtitle}>
              Twoje wpłaty i wymiany pojawią się tutaj.
            </Text>
          </View>
        )}

        {items.map((item) => (
          <View key={`${item.type}-${item.id}`} style={styles.card}>
            <Text style={styles.cardTitle}>
              {item.type === "deposit"
                ? "Zasilenie portfela"
                : `${item.fromCurrency} → ${item.toCurrency}`}
            </Text>

            <Text style={styles.value}>
              {item.type === "deposit"
                ? `+${item.amount.replace(".", ",")} PLN`
                : `${item.sourceAmount.replace(".", ",")} ${item.fromCurrency}
→ ${item.targetAmount.replace(".", ",")} ${item.toCurrency}`}
            </Text>

            {item.type === "exchange" && (
              <Text style={styles.subtitle}>
                Kurs: {item.exchangeRate.replace(".", ",")} PLN
                {"\n"}Tabela: {item.tableNumber}
              </Text>
            )}

            <Text style={styles.date}>
              {new Date(item.createdAt).toLocaleString("pl-PL")}
            </Text>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

function AccountScreen({ session, onLogout, logoutLoading, logoutError }) {
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Konto</Text>
        <Text style={styles.subtitle}>Twoje dane i sesja</Text>

        <View style={styles.card}>
          <Ionicons
            name="person-circle-outline"
            size={48}
            color={theme.colors.primary}
          />
          <Text style={styles.cardTitle}>Adres e-mail</Text>
          <Text style={styles.value}>{session.user.email}</Text>
        </View>

        {logoutError !== "" && (
          <Text style={styles.error}>{logoutError}</Text>
        )}

        <AppButton
          title="Wyloguj się"
          onPress={onLogout}
          loading={logoutLoading}
          variant="secondary"
        />
      </ScrollView>
    </Screen>
  );
}

export default function MainTabs(props) {
  const { session } = props;

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navigationTheme}>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarActiveTintColor: theme.colors.primary,
            tabBarInactiveTintColor: theme.colors.muted,
            tabBarHideOnKeyboard: true,
            tabBarStyle: {
              backgroundColor: theme.colors.surface,
              borderTopColor: theme.colors.border,
              paddingTop: 0,
            },
            tabBarItemStyle: {
              paddingTop: 0,
            },
            tabBarIconStyle: {
              marginTop: -4,
            },
            tabBarLabelStyle: {
              fontSize: 10,
              lineHeight: 12,
              fontWeight: "600",
              marginTop: -4,
            },
            tabBarIcon: ({ focused, color }) => {
              const icons = {
                Portfel: focused ? "wallet" : "wallet-outline",
                Kursy: focused ? "trending-up" : "trending-up-outline",
                Historia: focused ? "time" : "time-outline",
                Konto: focused ? "person" : "person-outline",
              };

              return (
                <Ionicons
                  name={icons[route.name]}
                  color={color}
                  size={22}
                />
              );
            },
          })}
        >
          <Tab.Screen name="Portfel">
            {() => <WalletScreen {...props} />}
          </Tab.Screen>

          <Tab.Screen name="Kursy">
            {() => <RatesScreen token={session.token} />}
          </Tab.Screen>

          <Tab.Screen name="Historia">
            {() => <HistoryScreen token={session.token} />}
          </Tab.Screen>

          <Tab.Screen name="Konto">
            {() => <AccountScreen {...props} />}
          </Tab.Screen>
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flexGrow: 1,
    padding: theme.spacing.screen,
    gap: 12,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.muted,
    lineHeight: 21,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: theme.colors.text,
  },
  value: {
    fontSize: 20,
    fontWeight: "600",
    color: theme.colors.text,
  },
  date: {
    fontSize: 12,
    color: theme.colors.muted,
  },
  error: {
    color: theme.colors.danger,
    fontSize: 15,
  },
});
