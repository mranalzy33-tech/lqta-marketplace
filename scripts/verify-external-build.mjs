import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "dist", "public");
if (!existsSync(root)) throw new Error("Missing dist/public. Run pnpm build first.");

function readAll(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = join(dir, entry.name);
    return entry.isDirectory() ? readAll(file) : [file];
  });
}

const forbidden = [/SUPABASE_SERVICE_ROLE_KEY/i, /SUPABASE_ACCESS_TOKEN/i, /JWT_SECRET/i];
const matches = [];
for (const file of readAll(root)) {
  if (!statSync(file).isFile()) continue;
  const body = readFileSync(file, "utf8");
  for (const expression of forbidden) if (expression.test(body)) matches.push(`${file}: ${expression}`);
}
if (matches.length) throw new Error(`External build includes forbidden platform references:\n${matches.join("\n")}`);
console.log("External build verification passed: no server secrets found in the client bundle.");
