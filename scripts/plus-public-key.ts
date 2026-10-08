// Prints the Fiala Plus public key for the signing secret in PLUS_SIGNING_SECRET,
// so the build can embed it (VITE_PLUS_PUBLIC_KEY). Prints nothing without one.
import { publicKeyFor } from "../src/lib/plusToken.ts";

const secret = process.env.PLUS_SIGNING_SECRET ?? "";
if (secret.length >= 32) console.log(publicKeyFor(secret));
else if (secret) console.error("[plus] PLUS_SIGNING_SECRET is too short (use 32+ characters); Plus unlock disabled in this build.");
