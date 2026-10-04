import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import app from "../src/app.js";
import { pool } from "../src/db/pool.js";
import { registerSchema } from "../src/modules/auth/auth.schema.js";
import { updateProfileSchema } from "../src/modules/users/users.schema.js";

test("profil wymaga nazw, normalizuje je i odrzuca nadmiarowe pola", () => {
  const profile = updateProfileSchema.parse({ firstName: " Daniel ", lastName: " Świątek " });
  assert.deepEqual(profile, { firstName: "Daniel", lastName: "Świątek" });
  for (const firstName of ["", " ", "a".repeat(101), "Jan\nAdam"]) {
    assert.equal(updateProfileSchema.safeParse({ firstName, lastName: "Nowak" }).success, false);
  }
  assert.equal(updateProfileSchema.safeParse({ firstName: "Jan", lastName: "Nowak", userId: randomUUID() }).success, false);
  assert.equal(registerSchema.safeParse({ email: "test@example.invalid", password: "TestoweHaslo123!" }).success, false);
});

test("rejestracja, edycja własnego profilu, pełne liczniki i starsze konta", {
  skip: process.env.PROFILE_INTEGRATION !== "1",
}, async () => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const userIds = [];

  async function request(path, { method = "GET", body, token, requestId } = {}) {
    const response = await fetch(base + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(requestId ? { "Idempotency-Key": requestId } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, data: response.status === 204 ? null : await response.json() };
  }

  try {
    assert.equal((await request("/users/me")).status, 401);
    const tokens = [];
    for (const firstName of ["Daniel", "Anna"]) {
      const credentials = { email: `profile-${randomUUID()}@example.invalid`, password: "TestoweHaslo123!" };
      const registered = await request("/auth/register", {
        method: "POST", body: { ...credentials, firstName, lastName: "Testowa" },
      });
      assert.equal(registered.status, 201);
      userIds.push(registered.data.user.id);
      assert.equal(registered.data.user.firstName, firstName);
      assert.ok(registered.data.user.createdAt);
      assert.equal("skrot_hasla" in registered.data.user, false);
      const login = await request("/auth/login", { method: "POST", body: credentials });
      assert.equal(login.status, 200);
      assert.equal(login.data.user.firstName, firstName);
      tokens.push(login.data.token);
    }

    const updated = await request("/users/me", {
      method: "PATCH", token: tokens[0], body: { firstName: " Adam ", lastName: " Nowak " },
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.data.user.firstName, "Adam");
    assert.equal((await request("/auth/me", { token: tokens[0] })).data.user.lastName, "Nowak");
    assert.equal((await request("/users/me", { token: tokens[1] })).data.user.firstName, "Anna");
    assert.equal((await request("/users/me", {
      method: "PATCH", token: tokens[0],
      body: { firstName: "Jan", lastName: "Nowak", userId: userIds[1] },
    })).status, 400);
    assert.equal((await request("/users/me", {
      method: "PATCH", token: tokens[0], body: { firstName: " ", lastName: "Nowak" },
    })).status, 400);

    const requestId = randomUUID();
    assert.equal((await request("/wallet/deposits", {
      method: "POST", token: tokens[0], requestId, body: { amount: "10.00" },
    })).status, 201);
    assert.equal((await request("/wallet/deposits", {
      method: "POST", token: tokens[0], requestId, body: { amount: "10.00" },
    })).status, 200);
    assert.deepEqual((await request("/users/me", { token: tokens[0] })).data.activity,
      { depositCount: 1, exchangeCount: 0 });
    assert.deepEqual((await request("/users/me", { token: tokens[1] })).data.activity,
      { depositCount: 0, exchangeCount: 0 });

    // Istniejące konta mogą nie mieć jeszcze uzupełnionych nazw.
    await pool.query("UPDATE uzytkownicy SET imie = NULL, nazwisko = NULL WHERE id = $1", [userIds[0]]);
    const legacy = await request("/auth/me", { token: tokens[0] });
    assert.equal(legacy.status, 200);
    assert.equal(legacy.data.user.firstName, null);
    assert.equal((await request("/users/me", {
      method: "PATCH", token: tokens[0], body: { firstName: "Daniel", lastName: "Świątek" },
    })).status, 200);
  } finally {
    // Usuwamy wyłącznie konta utworzone przez ten test.
    await pool.query("DELETE FROM wplaty WHERE portfel_id IN (SELECT id FROM portfele WHERE uzytkownik_id = ANY($1::uuid[]))", [userIds]);
    await pool.query("DELETE FROM salda_walut WHERE portfel_id IN (SELECT id FROM portfele WHERE uzytkownik_id = ANY($1::uuid[]))", [userIds]);
    await pool.query("DELETE FROM portfele WHERE uzytkownik_id = ANY($1::uuid[])", [userIds]);
    await pool.query("DELETE FROM uzytkownicy WHERE id = ANY($1::uuid[])", [userIds]);
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
  }
});
