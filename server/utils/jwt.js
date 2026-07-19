import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

function signPart(value) {
  return createHmac("sha256", env.jwtSecret).update(value).digest("base64url");
}

export function signJwt(payload) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const body = {
    ...payload,
    iat: now,
    exp: now + env.jwtExpiresInSeconds,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(body))}`;
  return `${unsigned}.${signPart(unsigned)}`;
}

export function verifyJwt(token) {
  const [header, payload, signature] = String(token).split(".");
  if (!header || !payload || !signature) throw new Error("Invalid token");

  const unsigned = `${header}.${payload}`;
  const expected = signPart(unsigned);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    throw new Error("Invalid token signature");
  }

  const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) throw new Error("Token expired");
  return decoded;
}
