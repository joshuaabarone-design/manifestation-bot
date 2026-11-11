import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";
import { isNative } from "./platform";

/**
 * Small secrets (auth tokens, the offline-cache key) live in the iOS Keychain on device.
 * On the web nothing is stored here: the web app keeps using httpOnly cookie sessions.
 */
export async function secureGet(key: string): Promise<string | null> {
  if (!isNative) return null;
  try {
    const { value } = await SecureStoragePlugin.get({ key });
    return value ?? null;
  } catch {
    return null; // missing key throws
  }
}

export async function secureSet(key: string, value: string): Promise<void> {
  if (!isNative) return;
  await SecureStoragePlugin.set({ key, value });
}

export async function secureRemove(key: string): Promise<void> {
  if (!isNative) return;
  try {
    await SecureStoragePlugin.remove({ key });
  } catch {
    /* not present */
  }
}
