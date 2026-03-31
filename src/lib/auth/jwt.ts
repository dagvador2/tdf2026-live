import { SignJWT, jwtVerify, errors } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function signRiderJWT(riderId: string): Promise<string> {
  return new SignJWT({ riderId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .setIssuedAt()
    .sign(secret);
}

export async function verifyRiderJWT(
  token: string
): Promise<{ riderId: string } | { error: "invalid" | "expired" }> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return { riderId: payload.riderId as string };
  } catch (e) {
    if (e instanceof errors.JWTExpired) {
      return { error: "expired" };
    }
    return { error: "invalid" };
  }
}
