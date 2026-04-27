/// <reference lib="webworker" />
// Custom service worker code merged by next-pwa via `customWorkerSrc: "worker"`.
// Adds Web Push handlers on top of the Workbox-built sw.js.

declare const self: ServiceWorkerGlobalScope;

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  type?: string;
}

self.addEventListener("push", (event: PushEvent) => {
  if (!event.data) return;

  let payload: PushPayload;
  try {
    payload = event.data.json() as PushPayload;
  } catch {
    payload = { title: "TDF 2026", body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: payload.url || "/" },
      tag: payload.type ?? "tdf-notif",
      vibrate: [200, 100, 200],
    } as NotificationOptions),
  );
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const targetUrl = (event.notification.data?.url as string) || "/";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // Reuse an existing window if one is already pointed at our origin
      for (const client of allClients) {
        try {
          const u = new URL(client.url);
          if (u.origin === self.location.origin) {
            await client.focus();
            if ("navigate" in client) {
              await (client as WindowClient).navigate(targetUrl);
            }
            return;
          }
        } catch {
          // ignore
        }
      }
      await self.clients.openWindow(targetUrl);
    })(),
  );
});

export {};
