import { Router } from "express";
import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import logger from "../utils/logger";

const router = Router();

export default router;