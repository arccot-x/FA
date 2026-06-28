import { AttachmentOwnerType, ExpenseCategory, TransactionSource, TransactionStatus, VaultCategory } from "@prisma/client";
import { Router } from "express";
import type { RequestHandler } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { uploadBuffer } from "../services/storage";
import { asyncHandler } from "../utils/asyncHandler";

export const uploadsRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });
const singleFileUpload = upload.single("file") as unknown as RequestHandler;

const transactionUploadSchema = z.object({
  transactionId: z.string().optional(),
  amount: z.coerce.number().nonnegative().optional(),
  category: z.nativeEnum(ExpenseCategory).optional(),
  merchant: z.string().optional(),
  notes: z.string().optional(),
  pending: z.coerce.boolean().default(false)
});

uploadsRouter.post(
  "/transaction/:userId",
  singleFileUpload,
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new Error("A file field named 'file' is required.");
    }

    const input = transactionUploadSchema.parse(req.body);
    const stored = await uploadBuffer({ userId: req.params.userId, folder: "receipts", file: req.file });

    const transaction = input.transactionId
      ? await prisma.transaction.update({
          where: { id: input.transactionId, userId: req.params.userId },
          data: {},
          include: { attachments: true }
        })
      : await prisma.transaction.create({
          data: {
            userId: req.params.userId,
            amount: input.amount,
            category: input.category,
            merchant: input.merchant,
            notes: input.notes,
            source: TransactionSource.SNAP_SAVE,
            status:
              input.pending || input.amount === undefined || input.category === undefined
                ? TransactionStatus.PENDING_DETAILS
                : TransactionStatus.CLEARED
          },
          include: { attachments: true }
        });

    const attachment = await prisma.attachment.create({
      data: {
        userId: req.params.userId,
        ownerType: AttachmentOwnerType.TRANSACTION,
        transactionId: transaction.id,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        mimeGroup: stored.mimeGroup,
        fileSize: req.file.size,
        url: stored.url,
        storagePath: stored.storagePath
      }
    });

    res.status(201).json({ transaction: { ...transaction, attachments: [...transaction.attachments, attachment] }, attachment });
  })
);

const vaultUploadSchema = z.object({
  title: z.string().min(1),
  category: z.nativeEnum(VaultCategory).default(VaultCategory.OTHER),
  notes: z.string().optional(),
  issuedAt: z.coerce.date().optional()
});

uploadsRouter.post(
  "/vault/:userId",
  singleFileUpload,
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new Error("A file field named 'file' is required.");
    }

    const input = vaultUploadSchema.parse(req.body);
    const stored = await uploadBuffer({ userId: req.params.userId, folder: "vault", file: req.file });

    const document = await prisma.vaultDocument.create({
      data: {
        userId: req.params.userId,
        title: input.title,
        category: input.category,
        notes: input.notes,
        issuedAt: input.issuedAt,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        mimeGroup: stored.mimeGroup,
        fileSize: req.file.size,
        url: stored.url,
        storagePath: stored.storagePath
      }
    });

    const attachment = await prisma.attachment.create({
      data: {
        userId: req.params.userId,
        ownerType: AttachmentOwnerType.VAULT_DOCUMENT,
        vaultDocumentId: document.id,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        mimeGroup: stored.mimeGroup,
        fileSize: req.file.size,
        url: stored.url,
        storagePath: stored.storagePath
      }
    });

    res.status(201).json({ document, attachment });
  })
);
