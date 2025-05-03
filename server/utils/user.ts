import { db } from "../db";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";

export async function generateUniqueUsername(fullName: string): Promise<string> {
  // Nettoyer le nom et créer un nom d'utilisateur de base
  const baseName = fullName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^a-z0-9]/g, ""); // Keep only alphanumeric

  let username = baseName;
  let counter = 1;

  // Vérifier si le nom d'utilisateur existe déjà
  while (true) {
    const existingUser = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    if (!existingUser) {
      break;
    }

    // Si le nom d'utilisateur existe, ajouter un numéro
    username = `${baseName}${counter}`;
    counter++;
  }

  return username;
}

export async function createUserAccount(fullName: string, phoneNumber?: string | null) {
  const username = await generateUniqueUsername(fullName);

  // Créer un nouvel utilisateur
  const [user] = await db.insert(users).values({
    username,
    fullName,
    phoneNumber: phoneNumber || null,
    role: "tenant",
  }).returning();

  return user;
}