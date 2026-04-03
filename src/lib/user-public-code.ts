import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";

/** Human-readable unique tag, e.g. P-x7k2m9q1a — many users may share the same display name. */
export async function allocateUniqueUserPublicCode(): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt++) {
    let code = "P-";
    const buf = randomBytes(10);
    for (let i = 0; i < 10; i++) {
      code += ALPHABET[buf[i]! % ALPHABET.length];
    }
    const taken = await prisma.user.findUnique({
      where: { publicCode: code },
      select: { id: true },
    });
    if (!taken) return code;
  }
  throw new Error("Could not allocate a unique player code.");
}
