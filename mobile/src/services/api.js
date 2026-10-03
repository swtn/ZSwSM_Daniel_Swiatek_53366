const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(message, status, details = [], code = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
    this.code = code;
  }
}

export async function apiRequest(
  path,
  {
    method = "GET",
    body,
    token,
    requestId,
  } = {}
) {
  if (!API_URL) {
    throw new Error("Brak adresu API w konfiguracji.");
  }

  const headers = {
    Accept: "application/json",
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (requestId) {
    headers["Idempotency-Key"] = requestId;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await response.text();
    let data = null;

    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        throw new ApiError(
          "Serwer zwrócił nieprawidłową odpowiedź.",
          response.status
        );
      }
    }

    if (!response.ok) {
      throw new ApiError(
        data?.error ?? "Nie udało się wykonać operacji.",
        response.status,
        data?.details ?? [],
        data?.code ?? null
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error.name === "AbortError") {
      throw new Error(
        "Przekroczono czas oczekiwania. Sprawdź połączenie."
      );
    }

    throw new Error(
      "Nie można połączyć się z serwerem. Sprawdź połączenie."
    );
  } finally {
    clearTimeout(timeout);
  }
}