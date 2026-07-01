// Minimal ambient declaration for the fields we use from the "file-type" package.
// It's ESM-only, so we load it via dynamic import() at runtime (works fine under
// CommonJS), but this project's `moduleResolution: "Node"` can't resolve its
// package.json `exports` map for type-checking purposes.
declare module "file-type" {
  export function fileTypeFromBuffer(buffer: Uint8Array | ArrayBuffer): Promise<{ ext: string; mime: string } | undefined>;
}
