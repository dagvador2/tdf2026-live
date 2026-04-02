"use client";

import { useEffect } from "react";

export function RiderTokenPersist({ token }: { token: string }) {
  useEffect(() => {
    localStorage.setItem("riderToken", token);
  }, [token]);

  return null;
}
