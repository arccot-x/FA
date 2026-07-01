import { createClient } from "@supabase/supabase-js";
import { DocumentMimeGroup } from "@prisma/client";
import { env } from "../lib/env";

const supabase =
  env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

// Only these are ever stored: receipts/vault docs are photos or PDFs, never HTML,
// SVG, or scripts that could execute if a stored file were opened directly.
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/gif", "application/pdf"]);

export function mimeGroupFor(mimeType: string): DocumentMimeGroup {
  if (mimeType.startsWith("image/")) {
    return DocumentMimeGroup.IMAGE;
  }

  if (mimeType === "application/pdf") {
    return DocumentMimeGroup.PDF;
  }

  return DocumentMimeGroup.OTHER;
}

// Detects the file's real type from its bytes rather than trusting the
// client-supplied Content-Type, which is trivial to spoof.
async function detectAndValidateMimeType(file: Express.Multer.File): Promise<string> {
  const { fileTypeFromBuffer } = await import("file-type");
  const detected = await fileTypeFromBuffer(file.buffer);
  const mimeType = detected?.mime ?? file.mimetype;
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error("Only image (JPEG, PNG, WEBP, HEIC, GIF) and PDF files are allowed.");
  }
  return mimeType;
}

export async function uploadBuffer(params: {
  userId: string;
  folder: "receipts" | "vault";
  file: Express.Multer.File;
}) {
  if (!supabase) {
    throw new Error("Supabase storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }

  const mimeType = await detectAndValidateMimeType(params.file);
  const safeName = params.file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${params.userId}/${params.folder}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage
    .from(env.SUPABASE_STORAGE_BUCKET)
    .upload(storagePath, params.file.buffer, {
      contentType: mimeType,
      upsert: false
    });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(env.SUPABASE_STORAGE_BUCKET).getPublicUrl(storagePath);

  return {
    storagePath,
    url: data.publicUrl,
    mimeGroup: mimeGroupFor(mimeType),
    mimeType
  };
}

