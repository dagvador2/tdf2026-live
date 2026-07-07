/**
 * Détection du statut live de la chaîne Twitch via l'API Helix.
 * Token applicatif (client_credentials) et statut mis en cache en mémoire
 * pour ne pas frapper l'API Twitch à chaque visiteur.
 */

const STATUS_CACHE_MS = 60_000;

interface TwitchStatus {
  configured: boolean;
  live: boolean;
  title: string | null;
  startedAt: string | null;
}

let cachedToken: { token: string; expiresAt: number } | null = null;
let cachedStatus: { status: TwitchStatus; fetchedAt: number } | null = null;

async function getAppAccessToken(
  clientId: string,
  clientSecret: string
): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
    }),
    cache: "no-store",
  });

  if (!res.ok) return null;

  const data: { access_token: string; expires_in: number } = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

export async function getTwitchLiveStatus(): Promise<TwitchStatus> {
  const channel = process.env.NEXT_PUBLIC_TWITCH_CHANNEL;
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!channel || !clientId || !clientSecret) {
    return { configured: false, live: false, title: null, startedAt: null };
  }

  if (cachedStatus && Date.now() - cachedStatus.fetchedAt < STATUS_CACHE_MS) {
    return cachedStatus.status;
  }

  try {
    const token = await getAppAccessToken(clientId, clientSecret);
    if (!token) {
      return { configured: true, live: false, title: null, startedAt: null };
    }

    const res = await fetch(
      `https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(channel)}`,
      {
        headers: {
          "Client-ID": clientId,
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      return { configured: true, live: false, title: null, startedAt: null };
    }

    const data: {
      data: Array<{ title: string; started_at: string }>;
    } = await res.json();

    const stream = data.data[0];
    const status: TwitchStatus = {
      configured: true,
      live: !!stream,
      title: stream?.title ?? null,
      startedAt: stream?.started_at ?? null,
    };

    cachedStatus = { status, fetchedAt: Date.now() };
    return status;
  } catch {
    return { configured: true, live: false, title: null, startedAt: null };
  }
}
