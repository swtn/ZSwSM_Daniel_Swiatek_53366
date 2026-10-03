import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "kantor.session.token";

export async function saveToken(token) {
  if (
    typeof token !== "string" ||
    !/^[a-f0-9]{64}$/.test(token)
  ) {
    throw new Error("Nieprawidłowy token sesji.");
  }

  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function removeToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}