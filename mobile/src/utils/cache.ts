import * as FileSystem from "expo-file-system";

// File-backed cache for the last successful data load, so the app opens instantly
// and still shows the latest known numbers when the network/back end is unavailable.
// (SecureStore can't hold this much data; documentDirectory persists across launches.)

const dir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? "";

function fileFor(key: string) {
  return `${dir}cache-${key}.json`;
}

export async function saveCache(key: string, data: unknown): Promise<void> {
  if (!dir) return;
  try {
    await FileSystem.writeAsStringAsync(fileFor(key), JSON.stringify(data));
  } catch {
    // best-effort
  }
}

export async function loadCache<T>(key: string): Promise<T | null> {
  if (!dir) return null;
  try {
    const info = await FileSystem.getInfoAsync(fileFor(key));
    if (!info.exists) return null;
    const raw = await FileSystem.readAsStringAsync(fileFor(key));
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function clearCache(key: string): Promise<void> {
  if (!dir) return;
  try {
    await FileSystem.deleteAsync(fileFor(key), { idempotent: true });
  } catch {
    // ignore
  }
}
