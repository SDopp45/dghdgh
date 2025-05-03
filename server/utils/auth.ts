import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from 'nanoid';

export async function generateUniqueUsername(fullName: string): Promise<string> {
  // Convert full name to lowercase and remove special characters
  const baseName = fullName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

  // Try with base name first
  const baseUsername = baseName.slice(0, 20);
  const existingUser = await db.query.users.findFirst({
    where: eq(users.username, baseUsername),
  });

  if (!existingUser) {
    return baseUsername;
  }

  // If username exists, add a unique suffix
  const uniqueSuffix = nanoid(6);
  return `${baseUsername.slice(0, 14)}${uniqueSuffix}`;
}
