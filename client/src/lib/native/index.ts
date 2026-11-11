import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { Share } from "@capacitor/share";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { App } from "@capacitor/app";
import { Network } from "@capacitor/network";
import { isNative } from "../platform";

export { isNative };

/** Light haptic feedback on save/complete. No-op on the web. */
export function haptic(kind: "success" | "light" | "warning" = "light"): void {
  if (!isNative) return;
  const p =
    kind === "light"
      ? Haptics.impact({ style: ImpactStyle.Light })
      : Haptics.notification({ type: kind === "success" ? NotificationType.Success : NotificationType.Warning });
  p.catch(() => undefined);
}

/**
 * Share an affirmation. iOS uses the native share sheet; the web uses the Web Share API when
 * available, else copies to the clipboard. Returns "copied" when it fell back to the clipboard.
 */
export async function shareText(text: string, title = "My affirmation"): Promise<"shared" | "copied" | "cancelled"> {
  try {
    if (isNative) {
      await Share.share({ title, text, dialogTitle: "Share affirmation" });
      return "shared";
    }
    if (typeof navigator !== "undefined" && "share" in navigator) {
      await navigator.share({ title, text });
      return "shared";
    }
  } catch (err: any) {
    if (err?.name === "AbortError" || /cancel/i.test(String(err?.message))) return "cancelled";
  }
  await navigator.clipboard.writeText(text);
  return "copied";
}

let initialised = false;

/** Native shell setup: status bar, splash, and reconnect hooks. Safe to call on the web. */
export async function initNative(hooks: { onOnline?: () => void; onResume?: () => void } = {}): Promise<void> {
  if (!isNative || initialised) return;
  initialised = true;
  document.documentElement.classList.add("native-ios");
  try {
    await StatusBar.setStyle({ style: Style.Dark }); // light text on the dark theme
    await StatusBar.setOverlaysWebView({ overlay: true }); // content uses safe-area insets
  } catch {
    /* not fatal */
  }
  Network.addListener("networkStatusChange", (status) => {
    if (status.connected) hooks.onOnline?.();
  });
  App.addListener("resume", () => hooks.onResume?.());
}

export async function hideSplash(): Promise<void> {
  if (!isNative) return;
  try {
    await SplashScreen.hide({ fadeOutDuration: 250 });
  } catch {
    /* not fatal */
  }
}
