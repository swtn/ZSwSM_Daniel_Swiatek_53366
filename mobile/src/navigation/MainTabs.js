import { Text, useLanguage } from "../i18n/LanguageProvider.js";
import { t } from "../i18n/translations.js";
import {
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  DefaultTheme,
  DarkTheme,
  NavigationContainer,
} from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import WalletScreen from "../screens/WalletScreen.js";
import AccountScreen from "../screens/AccountScreen.js";
import HistoryScreen from "../screens/HistoryScreen.js";
import HistoricalRatesScreen from "../screens/HistoricalRatesScreen.js";
import RatesPanel from "../components/RatesPanel.js";
import { useTheme, useThemedStyles } from "../theme/ThemeProvider.js";

const Tab = createBottomTabNavigator();

function createNavigationTheme(theme) {
  const base = theme.dark ? DarkTheme : DefaultTheme;
  return {
    ...base,
    dark: theme.dark,
    colors: {
      ...base.colors,
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.text,
      border: theme.colors.border,
    },
  };
}

function Screen({ children }) {
  const styles = useThemedStyles(createStyles);
  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      {children}
    </SafeAreaView>
  );
}

function RatesScreen({ token }) {
  const styles = useThemedStyles(createStyles);
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

export default function MainTabs(props) {
  useLanguage();
  const { theme } = useTheme();
  const navigationTheme = createNavigationTheme(theme);
  const { session } = props;

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navigationTheme}>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarLabel: t(route.name),
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
                Archiwum: focused ? "calendar" : "calendar-outline",
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

          <Tab.Screen name="Archiwum">
            {() => <HistoricalRatesScreen token={session.token} />}
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

const createStyles = (theme) => StyleSheet.create({
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
