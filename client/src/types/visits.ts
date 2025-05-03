import { z } from "zod";

export interface Visit {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  datetime: string;
  visitType: "physical" | "virtual" | "video";
  status: "pending" | "completed" | "cancelled" | "no_show";
  archived: boolean;
  propertyId?: number;
  property?: {
    id: number;
    name: string;
    address: string;
  };
  manualAddress?: string;
  message?: string;
  rating?: number;
  feedback?: string;
  // Nouveaux champs
  agentId?: number;
  agent?: {
    id: number;
    fullName: string;
    email: string;
  };
  source: "website" | "agency" | "partner" | "manual";
  documents: string[];
  reminderSent: boolean;
}

export const visitSchema = z.object({
  id: z.number(),
  firstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  lastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Email invalide"),
  phone: z.string().min(10, "Numéro de téléphone invalide"),
  datetime: z.string(),
  visitType: z.enum(["physical", "virtual", "video"]),
  status: z.enum(["pending", "completed", "cancelled", "no_show"]),
  archived: z.boolean(),
  propertyId: z.number().optional(),
  property: z.object({
    id: z.number(),
    name: z.string(),
    address: z.string()
  }).optional(),
  manualAddress: z.string().optional(),
  message: z.string().optional(),
  rating: z.number().optional(),
  feedback: z.string().optional(),
  // Nouveaux champs
  agentId: z.number().optional(),
  agent: z.object({
    id: z.number(),
    fullName: z.string(),
    email: z.string()
  }).optional(),
  source: z.enum(["website", "agency", "partner", "manual"]).default("manual"),
  documents: z.array(z.string()).default([]),
  reminderSent: z.boolean().default(false)
});