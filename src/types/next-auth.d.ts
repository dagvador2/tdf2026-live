import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "admin" | "rider" | "pending";
      riderId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role?: "admin" | "rider" | "pending";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    role?: "admin" | "rider" | "pending";
    riderId?: string | null;
  }
}
