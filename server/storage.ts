import { db } from "./db";
import { eq } from "drizzle-orm";
import { tenants, properties } from "@shared/schema";
import type { Property, Tenant, InsertProperty, InsertTenant } from "@shared/schema";
import logger from "./utils/logger";

// Helper function to normalize dates
const normalizeDate = (date: Date | string | null | undefined): Date | null => {
  if (!date) return null;
  try {
    const normalized = new Date(date);
    if (isNaN(normalized.getTime())) {
      throw new Error("Invalid date");
    }
    normalized.setHours(12, 0, 0, 0); // Normalize to noon to avoid timezone issues
    return normalized;
  } catch (error) {
    logger.error(`Failed to normalize date: ${date}`, error);
    return null;
  }
};

export interface IStorage {
  // Properties
  getProperties(): Promise<Property[]>;
  getProperty(id: number): Promise<Property | undefined>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: number, property: Partial<Property>): Promise<Property>;
  deleteProperty(id: number): Promise<void>;

  // Tenants
  getTenants(): Promise<Tenant[]>;
  getTenant(id: number): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  updateTenant(id: number, tenant: Partial<Tenant>): Promise<Tenant>;
  deleteTenant(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getProperties(): Promise<Property[]> {
    try {
      logger.info('Fetching all properties');
      return await db.select().from(properties);
    } catch (error) {
      logger.error('Error fetching properties:', error);
      throw error;
    }
  }

  async getProperty(id: number): Promise<Property | undefined> {
    const [property] = await db.select().from(properties).where(eq(properties.id, id));
    return property;
  }

  async createProperty(property: InsertProperty): Promise<Property> {
    try {
      logger.info('Creating new property with data:', property);

      // Remove any undefined values to avoid SQL errors
      const cleanedProperty = Object.fromEntries(
        Object.entries(property).filter(([_, v]) => v !== undefined)
      ) as InsertProperty;

      const propertyData = {
        ...cleanedProperty,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      logger.info('Normalized property data:', propertyData);

      const [newProperty] = await db.insert(properties)
        .values(propertyData)
        .returning();

      return newProperty;
    } catch (error) {
      logger.error('Error creating property:', error);
      throw error;
    }
  }

  async updateProperty(id: number, property: Partial<Property>): Promise<Property> {
    try {
      logger.info(`Updating property ${id}, received data:`, property);

      const updateData: Partial<Property> = {
        ...property,
        updatedAt: new Date()
      };

      delete (updateData as any).createdAt;

      logger.info(`Processed update data:`, updateData);

      const [updatedProperty] = await db
        .update(properties)
        .set(updateData)
        .where(eq(properties.id, id))
        .returning();

      if (!updatedProperty) {
        throw new Error(`Property with ID ${id} not found`);
      }

      return updatedProperty;
    } catch (error) {
      logger.error(`Error updating property ${id}:`, error);
      throw error;
    }
  }

  async deleteProperty(id: number): Promise<void> {
    await db.delete(properties).where(eq(properties.id, id));
  }

  async createTenant(tenant: InsertTenant): Promise<Tenant> {
    try {
      logger.info('Creating new tenant with data:', tenant);

      const tenantData = {
        ...tenant,
        leaseStart: tenant.leaseStart instanceof Date ? tenant.leaseStart : new Date(tenant.leaseStart),
        leaseEnd: tenant.leaseEnd instanceof Date ? tenant.leaseEnd : new Date(tenant.leaseEnd)
      };

      logger.info('Normalized tenant data:', tenantData);

      const [newTenant] = await db.insert(tenants)
        .values(tenantData)
        .returning();

      return newTenant;
    } catch (error) {
      logger.error('Error creating tenant:', error);
      throw error;
    }
  }

  async updateTenant(id: number, tenant: Partial<Tenant>): Promise<Tenant> {
    try {
      logger.info(`Updating tenant ${id}, received data:`, tenant);

      const updateData: Partial<Tenant> = {
        ...tenant,
        leaseStart: tenant.leaseStart ? new Date(tenant.leaseStart) : undefined,
        leaseEnd: tenant.leaseEnd ? new Date(tenant.leaseEnd) : undefined
      };

      logger.info(`Processed update data:`, updateData);

      const [updatedTenant] = await db.update(tenants)
        .set(updateData)
        .where(eq(tenants.id, id))
        .returning();

      if (!updatedTenant) {
        throw new Error(`Tenant with ID ${id} not found`);
      }

      return updatedTenant;
    } catch (error) {
      logger.error(`Error updating tenant ${id}:`, error);
      throw error;
    }
  }

  async getTenants(): Promise<Tenant[]> {
    return await db.select().from(tenants);
  }

  async getTenant(id: number): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant;
  }

  async deleteTenant(id: number): Promise<void> {
    try {
      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, id));

      if (!tenant) {
        logger.warn(`No tenant found with ID: ${id}`);
        throw new Error(`Tenant with ID ${id} not found`);
      }

      logger.info(`Found tenant with ID ${id}, propertyId: ${tenant.propertyId}`);

      const [updatedProperty] = await db
        .update(properties)
        .set({
          status: 'available',
          updatedAt: new Date()
        })
        .where(eq(properties.id, tenant.propertyId))
        .returning();

      if (!updatedProperty) {
        throw new Error(`Failed to update property ${tenant.propertyId} status`);
      }

      logger.info(`Updated property status:`, updatedProperty);

      await db.delete(tenants).where(eq(tenants.id, id));
      logger.info(`Successfully deleted tenant ${id}`);

    } catch (error) {
      logger.error('Error in deleteTenant:', error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();