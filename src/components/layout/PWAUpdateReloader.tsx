"use client";

import { useEffect } from "react";

export function PWAUpdateReloader() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    let reloaded = false;
    const reloadOnce = () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    };

    const onControllerChange = () => {
      if (!navigator.serviceWorker.controller) return;
      reloadOnce();
    };

    const hadController = Boolean(navigator.serviceWorker.controller);
    if (hadController) {
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        onControllerChange
      );
    }

    const checkForUpdate = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) return;
        await registration.update();
      } catch {
        // ignore
      }
    };

    checkForUpdate();
    const onVisibility = () => {
      if (document.visibilityState === "visible") checkForUpdate();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange
      );
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}
