import "server-only";
import { auth } from "@/lib/auth/config";
import {
  FEATURE_BINGO_ENABLED,
  isBingoAllowedForEmail,
} from "@/features/bingo/flags";

export class BingoDisabledError extends Error {
  constructor() {
    super("Feature bingo désactivée");
    this.name = "BingoDisabledError";
  }
}

export class BingoForbiddenError extends Error {
  constructor(message = "Non autorisé") {
    super(message);
    this.name = "BingoForbiddenError";
  }
}

export function assertBingoEnabled(): void {
  if (!FEATURE_BINGO_ENABLED) throw new BingoDisabledError();
}

export async function requireBingoUser(): Promise<{
  userId: string;
  userName: string | null;
  email: string | null;
}> {
  const session = await auth();
  if (!session?.user?.id) throw new BingoForbiddenError("Non authentifié");
  const email = session.user.email ?? null;
  if (!isBingoAllowedForEmail(email)) throw new BingoForbiddenError();
  return {
    userId: session.user.id,
    userName: session.user.name ?? null,
    email,
  };
}
