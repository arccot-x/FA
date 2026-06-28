import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireUserAccess } from "../utils/requireUserAccess";

export const vaultRouter = Router();

vaultRouter.get(
  "/:userId",
  asyncHandler(async (req, res) => {
    requireUserAccess(req, req.params.userId);
    const documents = await prisma.vaultDocument.findMany({
      where: { userId: req.params.userId },
      include: { attachments: true },
      orderBy: { createdAt: "desc" }
    });

    res.json(documents);
  })
);
