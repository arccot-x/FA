import { createClient } from "@supabase/supabase-js";
import { DocumentMimeGroup } from "@prisma/client";
import { env } from "../lib/env";

const supabase =
  env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

export function mimeGroupFor(mimeType: string): DocumentMimeGroup {
  if (mimeType.startsWith("image/")) {
    return DocumentMimeGroup.IMAGE;
  }

  if (mimeType === "application/pdf") {
    return DocumentMimeGroup.PDF;
  }

  return DocumentMimeGroup.OTHER;
}

export async function uploadBuffer(params: {
  userId: string;
  folder: "receipts" | "vault";
  file: Express.Multer.File;
}) {
  if (!supabase) {
    throw new Error("Supabase storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }

  const safeName = params.file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${params.userId}/${params.folder}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage
    .from(env.SUPABASE_STORAGE_BUCKET)
    .upload(storagePath, params.file.buffer, {
      contentType: params.file.mimetype,
      upsert: false
    });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(env.SUPABASE_STORAGE_BUCKET).getPublicUrl(storagePath);

  return {
    storagePath,
    url: data.publicUrl,
    mimeGroup: mimeGroupFor(params.file.mimetype)
  };
}

