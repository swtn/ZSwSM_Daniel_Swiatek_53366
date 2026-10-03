import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import DepositForm from "../components/DepositForm.js";
import AppButton from "../components/AppButton.js";
import { apiRequest, ApiError } from "../services/api.js";
import { theme } from "../theme/theme.js";
import ExchangePreviewForm from "../components/ExchangePreviewForm.js";

export default function WalletScreen({ session }) {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [depositBusy, setDepositBusy] = useState(false);
  const [depositModalVisible, setDepositModalVisible] = useState(false);
  const [exchangeModalVisible, setExchangeModalVisible] = useState(false);
  const [exchangeBusy, setExchangeBusy] = useState(false);

  const loadWallet = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await apiRequest("/wallet", {
        token: session.token,
      });

      setWallet(result.wallet);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setWallet(null);
        setError("Sesja wygasła. Przejdź do Konta i wyloguj się.");
      } else {
        setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  }, [session.token]);

  useFocusEffect(
    useCallback(() => {
      loadWallet();
    }, [loadWallet])
  );

  function closeDeposit() {
    if (!depositBusy) {
      setDepositModalVisible(false);
    }
  }

  function closeExchange() {
    if (!exchangeBusy) {
      setExchangeModalVisible(false);
    }
  }

  return (
    <SafeAreaView
      style={styles.screen}
      edges={["top", "left", "right"]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadWallet}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        <View style={styles.heading}>
          <View>
            <Text style={styles.eyebrow}>TWÓJ KANTOR</Text>
            <Text style={styles.title}>Portfel</Text>
          </View>

          <View style={styles.headingIcon}>
            <Ionicons
              name="wallet-outline"
              size={26}
              color={theme.colors.primary}
            />
          </View>
        </View>

        <Text style={styles.subtitle}>
          Dostępne środki w Twoich walutach
        </Text>

        {error !== "" && (
          <View style={styles.errorCard}>
            <Text style={styles.error} accessibilityRole="alert">
              {error}
            </Text>

            {wallet && (
              <Text style={styles.subtitle}>
                Widoczne są ostatnio pobrane salda.
              </Text>
            )}

            <AppButton
              title="Spróbuj ponownie"
              variant="secondary"
              onPress={loadWallet}
              disabled={loading}
            />
          </View>
        )}

        {loading && !wallet && <ActivityIndicator size="large" />}

        {wallet?.balances.map((balance) => {
          const primary = balance.currency === "PLN";

          return (
            <View
              key={balance.currency}
              style={[styles.balanceCard, primary && styles.primaryCard]}
            >
              <View style={styles.currencyInfo}>
                <Text style={[styles.currency, primary && styles.lightText]}>
                  {balance.currency}
                </Text>
                <Text style={[styles.currencyName, primary && styles.primaryMuted]}>
                  {balance.name}
                </Text>
              </View>
              <Text style={[styles.amount, primary && styles.lightText]}>
                {balance.amount.replace(".", ",")}
              </Text>
            </View>
          );
        })}

        <AppButton
          title="Wymień walutę"
          onPress={() => setExchangeModalVisible(true)}
        />

        <AppButton
          title="Zasil portfel"
          variant="secondary"
          onPress={() => setDepositModalVisible(true)}
        />

      </ScrollView>

      {exchangeModalVisible && (
  <Modal
    visible
    animationType="slide"
    onRequestClose={closeExchange}
  >
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.modalContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Text style={styles.title}>Wymiana walut</Text>

          <ExchangePreviewForm
            session={session}
            onExchanged={loadWallet}
            onBusyChange={setExchangeBusy}
          />

          <AppButton
            title="Zamknij"
            variant="secondary"
            onPress={closeExchange}
            disabled={exchangeBusy}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>
)}

      {depositModalVisible && (
        <Modal
          visible
          animationType="slide"
          onRequestClose={closeDeposit}
        >
          <SafeAreaView style={styles.screen}>
            <KeyboardAvoidingView
              style={styles.modalContainer}
              behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
              <ScrollView
                contentContainerStyle={styles.modalContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
              >
                <Text style={styles.title}>Zasil portfel</Text>
                <Text style={styles.subtitle}>
                  Dodaj wirtualne środki w PLN.
                </Text>

                <DepositForm
                  session={session}
                  disabled={false}
                  onDeposited={loadWallet}
                  onBusyChange={setDepositBusy}
                />

                <AppButton
                  title="Zamknij"
                  variant="secondary"
                  onPress={closeDeposit}
                  disabled={depositBusy}
                />
              </ScrollView>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Modal>
      )}
    </SafeAreaView>
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
    paddingBottom: 16,
  },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    color: theme.colors.muted,
    marginBottom: 6,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: theme.colors.text,
  },
  headingIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: theme.colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.muted,
    lineHeight: 21,
  },
  balanceCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  currencyInfo: {
    flex: 1,
  },
  primaryCard: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  currency: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
  },
  currencyName: {
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: 4,
  },
  amount: {
    fontSize: 25,
    fontWeight: "700",
    color: theme.colors.text,
    flexShrink: 1,
  },
  lightText: {
    color: "#FFFFFF",
  },
  primaryMuted: {
    color: "#DBEAFE",
  },
  errorCard: {
    backgroundColor: theme.colors.surface,
    padding: 20,
    borderRadius: theme.radius.card,
    gap: 12,
  },
  error: {
    color: theme.colors.danger,
    fontSize: 15,
  },
  modalContainer: {
    flex: 1,
  },
  modalContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: theme.spacing.screen,
    gap: theme.spacing.gap,
    paddingBottom: 40,
  },
});
