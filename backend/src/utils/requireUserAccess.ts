import type { Request } from "express";
import { verifyUserToken } from "../services/auth";

export function requireUserAccess(req: Request, userId: string) {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";

  if (!token) {
    throw new Error("Missing session token.");
  }

  const session = verifyUserToken(token);
  if (session.userId !== userId) {
    throw new Error("You do not have access to this account.");
  }
}
