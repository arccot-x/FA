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

vaultRouter.delete(
  "/:userId/:documentId",
  asyncHandler(async (req, res) => {
    requireUserAccess(req, req.params.userId);
    await prisma.vaultDocument.delete({
      where: { id: req.params.documentId, userId: req.params.userId }
    });

    res.status(204).send();
  })
);
