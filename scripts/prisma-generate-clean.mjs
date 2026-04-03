/**
 * Deletes node_modules/.prisma then runs prisma generate.
 * Helps when Windows EPERM blocks renaming query_engine-windows.dll.node
 * (stop dev servers first if the error persists).
 */
import { existsSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const prismaDir = join(root, "node_modules", ".prisma");

if (existsSync(prismaDir)) {
  rmSync(prismaDir, { recursive: true, force: true });
  console.log("Removed node_modules/.prisma");
}

const result = spawnSync("npx", ["prisma", "generate"], {
  cwd: root,
  stdio: "inherit",
  shell: true,
});

process.exit(result.status ?? 1);
