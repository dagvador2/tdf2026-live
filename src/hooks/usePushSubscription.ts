"use client";

import { useCallback, useEffect, useState } from "react";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) view[i] = rawData.charCodeAt(i);
  return buffer;
}

export type PushStatus = {
  supported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  loading: boolean;
  error: string | null;
};

export function usePushSubscription() {
  const [state, setState] = useState<PushStatus>({
    supported: false,
    permission: "default",
    isSubscribed: false,
    loading: true,
    error: null,
  });

  const refresh = useCallback(async () => {
    if (typeof window === "undefined") return;
    const supported =
      "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
    if (!supported) {
      setState({
        supported: false,
        permission: "default",
        isSubscribed: false,
        loading: false,
        error: null,
      });
      return;
    }
    const permission = Notification.permission;
    let isSubscribed = false;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      isSubscribed = !!sub;
    } catch {
      // SW not registered yet
    }
    setState({ supported: true, permission, isSubscribed, loading: false, error: null });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const subscribe = useCallback(async () => {
    if (!VAPID_PUBLIC_KEY) {
      setState((s) => ({ ...s, error: "Cle VAPID publique manquante" }));
      return false;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState((s) => ({ ...s, permission, loading: false, error: "Permission refusee" }));
        return false;
      }
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }
      const json = sub.toJSON();
      const res = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
          userAgent: navigator.userAgent,
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        setState((s) => ({ ...s, loading: false, error: text || "Erreur serveur" }));
        return false;
      }
      setState({
        supported: true,
        permission,
        isSubscribed: true,
        loading: false,
        error: null,
      });
      return true;
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: (e as Error).message }));
      return false;
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/notifications/unsubscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState((s) => ({ ...s, isSubscribed: false, loading: false }));
      return true;
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: (e as Error).message }));
      return false;
    }
  }, []);

  return { ...state, subscribe, unsubscribe, refresh };
}
