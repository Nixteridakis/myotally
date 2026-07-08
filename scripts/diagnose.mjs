// Standalone Notion connection diagnostic. Run: node scripts/diagnose.mjs
import { readFileSync } from "node:fs";
import { Client } from "@notionhq/client";

// --- load .env.local (no framework, just parse it) ---
function loadEnv(path) {
  const env = {};
  try {
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !line.trim().startsWith("#")) {
        env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
      }
    }
  } catch {
    console.error("Could not read .env.local");
  }
  return env;
}

const env = loadEnv(".env.local");
const token = env.NOTION_TOKEN;
const exId = env.NOTION_EXERCISES_DB_ID;
const muId = env.NOTION_MUSCLES_DB_ID;

const mask = (v) => (v ? `${v.slice(0, 6)}…${v.slice(-4)} (len ${v.length})` : "(empty)");
console.log("Token:            ", mask(token));
console.log("Exercises DB id:  ", mask(exId));
console.log("Muscle Groups id: ", mask(muId));
console.log("");

if (!token) {
  console.log("❌ No NOTION_TOKEN set. Stop here and fill it in.");
  process.exit(1);
}

const notion = new Client({ auth: token });

// --- 1. Is the TOKEN itself valid? ---
try {
  const me = await notion.users.me({});
  console.log(`✅ Token is valid — integration: "${me.name ?? me.id}"`);
} catch (e) {
  console.log(`❌ Token rejected by Notion (status ${e.status}, code ${e.code}).`);
  console.log("   → The connection to Notion itself is failing. Re-copy the");
  console.log("     Internal Integration Secret from notion.so/my-integrations.");
  process.exit(1);
}

// --- 2. Can we reach each DATABASE? ---
async function probe(label, id) {
  if (!id) {
    console.log(`⚠️  ${label}: no id set.`);
    return;
  }
  try {
    const db = await notion.databases.retrieve({ database_id: id });
    const title = db.title?.map((t) => t.plain_text).join("") || "(untitled)";
    const props = Object.keys(db.properties).join(", ");
    console.log(`✅ ${label}: reachable — "${title}"`);
    console.log(`     properties: ${props}`);
  } catch (e) {
    console.log(`❌ ${label}: FAILED (status ${e.status}, code ${e.code}).`);
    if (e.code === "object_not_found") {
      console.log("     → Token works, but this database is NOT shared with the");
      console.log("       integration (or the id is wrong). In Notion: open the DB");
      console.log("       as a full page → ••• → Connections → add your integration.");
    } else if (e.code === "validation_error") {
      console.log("     → The id is malformed. Use the 32-char id from the DB URL.");
    } else {
      console.log(`     → ${e.message}`);
    }
  }
}

console.log("");
await probe("Exercises DB", exId);
await probe("Muscle Groups DB", muId);

// --- 3. What can this integration actually SEE? (source of truth for IDs) ---
console.log("\n--- Databases visible to this integration (via search) ---");
try {
  const res = await notion.search({
    filter: { property: "object", value: "database" },
    page_size: 100,
  });
  if (res.results.length === 0) {
    console.log("(none — nothing is shared with the integration yet)");
  }
  for (const db of res.results) {
    const title = db.title?.map((t) => t.plain_text).join("") || "(untitled)";
    const bareId = db.id.replace(/-/g, "");
    console.log(`• "${title}"`);
    console.log(`    id (dashed): ${db.id}`);
    console.log(`    id (bare):   ${bareId}`);
  }
} catch (e) {
  console.log(`search failed (status ${e.status}, code ${e.code}): ${e.message}`);
}

// Also list any pages, in case the "databases" are inline and show as pages.
console.log("\n--- Pages visible to this integration ---");
try {
  const res = await notion.search({
    filter: { property: "object", value: "page" },
    page_size: 100,
  });
  if (res.results.length === 0) console.log("(none)");
  for (const pg of res.results) {
    const titleProp = Object.values(pg.properties || {}).find(
      (p) => p.type === "title"
    );
    const title =
      titleProp?.title?.map((t) => t.plain_text).join("") || "(untitled)";
    console.log(`• page "${title}" — id ${pg.id.replace(/-/g, "")}`);
  }
} catch (e) {
  console.log(`search failed (status ${e.status}, code ${e.code}): ${e.message}`);
}
