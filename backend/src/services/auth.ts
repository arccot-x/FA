import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { User } from "@prisma/client";
import { env } from "../lib/env";

const tokenTtl = "30d";

export function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export function signUserToken(user: Pick<User, "id" | "email">) {
  return jwt.sign({ sub: user.id, email: user.email }, env.JWT_SECRET, { expiresIn: tokenTtl });
}

export function verifyUserToken(token: string) {
  const payload = jwt.verify(token, env.JWT_SECRET);
  if (typeof payload === "string" || typeof payload.sub !== "string") {
    throw new Error("Invalid token.");
  }

  return { userId: payload.sub };
}

export function publicUser(user: User) {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}
