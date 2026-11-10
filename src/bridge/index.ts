export type WebToNativeMessage =
  | { type: "ready" }
  | { type: "theme:changed"; mode: "dark" | "light" }
  | { type: "file:save"; path: string; content: string }
  | { type: "file:read"; path: string }
  | { type: "file:pick_import" }
  | { type: "file:export"; filename: string; content: string }
  | { type: "file:export_zip"; filename: string; base64: string }
  | { type: "open_url"; url: string }
  | { type: "keyboard:dismiss" }
  | { type: "haptic:trigger"; style: "light" | "medium" | "heavy" | "success" | "error" };

export type NativeToWebMessage =
  | { type: "file:loaded"; path: string; content: string }
  | { type: "file:list_updated"; files: { id: string; name: string; path: string; modifiedAt: number }[] }
  | { type: "file:error"; message: string }
  | { type: "set_theme"; mode: "dark" | "light" }
  | { type: "keyboard:status"; isOpen: boolean; height: number };

export function sendToNative(message: WebToNativeMessage) {
  const payload = JSON.stringify(message);
  if (typeof window !== "undefined") {
    // Android React Native WebView
    if ((window as any).ReactNativeWebView?.postMessage) {
      (window as any).ReactNativeWebView.postMessage(payload);
    }
    // Web iframe parent
    else if (window.parent && window.parent !== window) {
      window.parent.postMessage(payload, "*");
    }
  }
}

export function subscribeToNative(callback: (msg: NativeToWebMessage) => void) {
  const handler = (event: MessageEvent) => {
    try {
      const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      if (data && typeof data.type === "string") {
        callback(data as NativeToWebMessage);
      }
    } catch {
      // not JSON bridge message
    }
  };

  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
}

