import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { publicUser } from "../services/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { requireUserAccess } from "../utils/requireUserAccess";

type UsersDataSource = {
  user: {
    upsert: typeof prisma.user.upsert;
    delete: typeof prisma.user.delete;
    update: typeof prisma.user.update;
  };
};

const updateProfileSchema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email().transform((value) => value.toLowerCase().trim()),
  phoneNumber: z.string().max(40).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  householdRole: z.string().max(80).nullable().optional()
});

export function createUsersRouter(data: UsersDataSource = prisma) {
  const router = Router();

  router.delete(
    "/:userId",
    asyncHandler(async (req, res) => {
      requireUserAccess(req, req.params.userId);
      // All owned rows (bills, transactions, income, vault, attachments) cascade-delete.
      await data.user.delete({ where: { id: req.params.userId } });
      res.status(204).send();
    })
  );

  router.patch(
    "/:userId",
    asyncHandler(async (req, res) => {
      requireUserAccess(req, req.params.userId);
      const input = updateProfileSchema.parse(req.body);
      let user;
      try {
        user = await data.user.update({
          where: { id: req.params.userId },
          data: input
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          throw new Error("That email is already used by another account.");
        }
        throw error;
      }

      res.json(publicUser(user));
    })
  );

  return router;
}

export const usersRouter = createUsersRouter();

