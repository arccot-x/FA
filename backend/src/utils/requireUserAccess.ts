import type { Request } from "express";
import { verifyUserToken } from "../services/auth";

/** Returns the authenticated user id from the Bearer token, or throws. */
export function getAuthUserId(req: Request): string {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";

  if (!token) {
    throw new Error("Missing session token.");
  }

  return verifyUserToken(token).userId;
}

export function requireUserAccess(req: Request, userId: string) {
  if (getAuthUserId(req) !== userId) {
    throw new Error("You do not have access to this account.");
  }
}
