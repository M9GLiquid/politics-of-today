import { rmSync } from "node:fs";
import { resolve } from "node:path";

const dir = resolve(process.cwd(), ".next");
try {
  rmSync(dir, { recursive: true, force: true });
  process.stdout.write(`Removed ${dir}\n`);
} catch {
  // ignore
}
