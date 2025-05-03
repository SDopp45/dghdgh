import express from "express";
import { z } from "zod";
import { db } from "@db";
import { tenants, properties, transactions } from "@db/schema";
import { and, eq, lt, gte, sql } from "drizzle-orm";
import { addDays, isAfter, isBefore, startOfDay } from "date-fns";
import logger from "../utils/logger";

const router = express.Router();

// Schema for alert preferences
const alertPreferencesSchema = z.object({
  leaseEndingDays: z.number().min(1).max(90),
  paymentDelayDays: z.number().min(1).max(30),
  enableLeaseAlerts: z.boolean(),
  enablePaymentAlerts: z.boolean(),
  leaseAlertPriority: z.string(),
  paymentAlertPriority: z.string(),
  emailNotifications: z.boolean(),
  customLeaseMessage: z.string(),
  customPaymentMessage: z.string(),
  alertFrequency: z.string(),
});

// Save alert preferences
router.post("/preferences", async (req, res) => {
  try {
    const preferences = alertPreferencesSchema.parse(req.body);

    // Store preferences in user session for now
    req.session.alertPreferences = preferences;
    res.json({ success: true });

    logger.info("Alert preferences updated", { preferences });
  } catch (error) {
    logger.error("Error updating alert preferences:", error);
    res.status(400).json({ error: "Invalid alert preferences" });
  }
});

// Get active alerts
router.get("/active", async (req, res) => {
  try {
    const activeAlerts: any[] = [];
    const today = startOfDay(new Date());

    // Get user preferences or use defaults
    const preferences = req.session.alertPreferences || {
      leaseEndingDays: 30,
      paymentDelayDays: 5,
      enableLeaseAlerts: true,
      enablePaymentAlerts: true,
    };

    if (preferences.enableLeaseAlerts) {
      // Check for lease endings
      const leasesEnding = await db.query.tenants.findMany({
        where: and(
          eq(tenants.active, true),
          lt(
            tenants.leaseEnd,
            sql`${addDays(today, preferences.leaseEndingDays).toISOString()}::timestamp`
          )
        ),
        with: {
          property: true,
          user: true,
        },
      });

      // Add lease ending alerts
      leasesEnding.forEach((tenant) => {
        if (!tenant.property || !tenant.user) return;

        const daysRemaining = Math.ceil(
          (new Date(tenant.leaseEnd).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        activeAlerts.push({
          id: `lease-${tenant.id}`,
          type: "lease",
          priority: preferences.leaseAlertPriority || "medium",
          property: {
            id: tenant.property.id,
            name: tenant.property.name,
          },
          tenant: {
            id: tenant.id,
            name: tenant.user.fullName,
          },
          dueDate: tenant.leaseEnd,
          daysRemaining,
          message: preferences.customLeaseMessage || "Le bail se termine bientôt",
        });
      });
    }

    if (preferences.enablePaymentAlerts) {
      // Check for late payments using SQL timestamp comparison
      const latePayments = await db.query.transactions.findMany({
        where: and(
          eq(transactions.type, "income"),
          eq(transactions.category, "rent"),
          eq(transactions.status, "pending"),
          lt(
            transactions.date,
            sql`${today.toISOString()}::timestamp`
          )
        ),
        with: {
          property: true,
          tenant: {
            with: {
              user: true,
            },
          },
        },
      });

      // Add payment delay alerts
      latePayments.forEach((payment) => {
        if (!payment.property || !payment.tenant?.user) return;

        const daysLate = Math.floor(
          (today.getTime() - new Date(payment.date).getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysLate >= preferences.paymentDelayDays) {
          activeAlerts.push({
            id: `payment-${payment.id}`,
            type: "payment",
            priority: preferences.paymentAlertPriority || "high",
            property: {
              id: payment.property.id,
              name: payment.property.name,
            },
            tenant: {
              id: payment.tenant.id,
              name: payment.tenant.user.fullName,
            },
            dueDate: payment.date,
            daysLate,
            amount: payment.amount,
            message: preferences.customPaymentMessage || "Un retard de paiement a été détecté",
          });
        }
      });
    }

    res.json(activeAlerts);
  } catch (error) {
    logger.error("Error fetching active alerts:", error);
    res.status(500).json({ error: "Error fetching alerts" });
  }
});

export default router;