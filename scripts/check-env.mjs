// Checks local settings before `bun run dev`: which values are missing and what
// stops working without each. Values already in the shell win over .env files.
import { existsSync } from "node:fs";

for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) process.loadEnvFile(file);
}

const checks = [
  {
    names: ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"],
    required: true,
    breaks: "Everything — sign-in, every screen, and scrapers sending catches.",
  },
  {
    names: ["AI_GATEWAY_API_KEY|VERCEL_OIDC_TOKEN"],
    required: false,
    breaks: "“Suggest values” on the Fix it screen. (Not needed on Vercel.)",
  },
  {
    names: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "TOKEN_ENCRYPTION_KEY"],
    required: false,
    breaks: "“Connect Google Sheets” on Approved data.",
  },
];

const isSet = (name) => name.split("|").some((option) => Boolean(process.env[option]));

let problems = false;
for (const check of checks) {
  const missing = check.names.filter((name) => !isSet(name));
  const mark = missing.length === 0 ? "ok  " : check.required ? "MISS" : "off ";
  console.log(`${mark} ${check.names.join(", ").replaceAll("|", " or ")}`);
  if (missing.length > 0) {
    console.log(`     Without it: ${check.breaks}`);
    if (check.required) problems = true;
  }
}

const secret = process.env["TOKEN_ENCRYPTION_KEY"];
if (secret && Buffer.from(secret, "base64").length !== 32) {
  console.log("BAD  TOKEN_ENCRYPTION_KEY must be 32 bytes in base64: openssl rand -base64 32");
  problems = true;
}

const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 22 || (major === 22 && minor < 19)) {
  console.log(
    `BAD  Node ${process.versions.node}: Catchbox needs Node 22.19 or later (24 LTS recommended).`,
  );
  problems = true;
}

if (problems) {
  console.log("\nFix the lines marked MISS or BAD, then run this again. See README → Running it.");
  process.exit(1);
}
console.log("\nReady. Lines marked off are optional features that stay switched off.");
