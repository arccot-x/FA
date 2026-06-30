import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import express from "express";
import { Prisma } from "@prisma/client";
import type { Router } from "express";
import type { signUserToken as SignUserToken } from "../services/auth";

process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://user:pass@localhost:5432/test";
process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-secret";

let createUsersRouter: (data: {
  user: {
    upsert: never;
    delete: never;
    update: never;
  };
}) => Router;
let signUserToken: typeof SignUserToken;

type FakeUser = {
  id: string;
  email: string;
  name: string;
  phoneNumber: string | null;
  avatarUrl: string | null;
  householdRole: string | null;
  passwordHash: string | null;
  defaultMonthlyIncome: number;
  paydayDay: number;
  variableIncomeEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function makeUser(overrides: Partial<FakeUser> = {}): FakeUser {
  return {
    id: "user-1",
    email: "old@example.com",
    name: "Old Name",
    phoneNumber: null,
    avatarUrl: null,
    householdRole: null,
    passwordHash: "secret",
    defaultMonthlyIncome: 0,
    paydayDay: 1,
    variableIncomeEnabled: false,
    createdAt: new Date("2026-06-30T00:00:00.000Z"),
    updatedAt: new Date("2026-06-30T00:00:00.000Z"),
    ...overrides
  };
}

async function startTestServer(update: (args: { where: { id: string }; data: Partial<FakeUser> }) => Promise<FakeUser>) {
  const app = express();
  app.use(express.json());
  app.use(
    "/users",
    createUsersRouter({
      user: {
        upsert: (async () => makeUser()) as never,
        delete: (async () => makeUser()) as never,
        update: update as never
      }
    })
  );
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(400).json({ error: error instanceof Error ? error.message : "Unexpected server error" });
  });

  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Could not start test server.");
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  };
}

describe("users routes", () => {
  let server: Awaited<ReturnType<typeof startTestServer>>;

  after(async () => {
    if (server) await server.close();
  });

  before(async () => {
    ({ createUsersRouter } = await import("./users"));
    ({ signUserToken } = await import("../services/auth"));
    server = await startTestServer(async ({ where, data }) => makeUser({ id: where.id, ...data }));
  });

  it("updates profile fields for the authenticated user without returning passwordHash", async () => {
    const token = signUserToken({ id: "user-1", email: "old@example.com" });
    const response = await fetch(`${server.url}/users/user-1`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: "New Name",
        email: "NEW@EXAMPLE.COM",
        phoneNumber: "+1 555 0100",
        avatarUrl: "https://example.com/avatar.png",
        householdRole: "Owner"
      })
    });

    assert.equal(response.status, 200);
    const body = await response.json() as Record<string, unknown>;
    assert.equal(body.name, "New Name");
    assert.equal(body.email, "new@example.com");
    assert.equal(body.phoneNumber, "+1 555 0100");
    assert.equal(body.avatarUrl, "https://example.com/avatar.png");
    assert.equal(body.householdRole, "Owner");
    assert.equal("passwordHash" in body, false);
  });

  it("rejects profile updates for another user", async () => {
    const token = signUserToken({ id: "user-1", email: "old@example.com" });
    const response = await fetch(`${server.url}/users/user-2`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: "Nope", email: "nope@example.com" })
    });

    assert.equal(response.status, 400);
    const body = await response.json() as { error?: string };
    assert.match(body.error ?? "", /do not have access/i);
  });

  it("returns a friendly duplicate email error", async () => {
    const duplicateServer = await startTestServer(async () => {
      throw new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "5.22.0"
      });
    });

    try {
      const token = signUserToken({ id: "user-1", email: "old@example.com" });
      const response = await fetch(`${duplicateServer.url}/users/user-1`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: "New Name", email: "taken@example.com" })
      });

      assert.equal(response.status, 400);
      const body = await response.json() as { error?: string };
      assert.equal(body.error, "That email is already used by another account.");
    } finally {
      await duplicateServer.close();
    }
  });
});
