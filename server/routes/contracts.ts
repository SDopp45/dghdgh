import express from 'express';
import { db } from '../db';
import { contracts, contractParties, users, properties } from '../../shared/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import logger from '../utils/logger';

const router = express.Router();

// Récupérer tous les contrats
router.get('/', async (req, res) => {
  try {
    // Récupérer l'ID de l'utilisateur depuis la requête
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifié" });
    }
    
    // Définition du schéma client
    const clientSchema = `client_${userId}`;
    
    // Configuration du schéma client pour cette requête
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
    
    const { tenantId } = req.query;
    let result;

    if (tenantId) {
      // Récupérer d'abord les IDs des contrats où ce locataire est une partie
      const contractPartiesResult = await db
        .select({ contractId: contractParties.contractId })
        .from(contractParties)
        .where(
          and(
            eq(contractParties.partyId, parseInt(tenantId as string)),
            eq(contractParties.partyType, 'tenant')
          )
        );

      const contractIds = contractPartiesResult.map(item => item.contractId);

      if (contractIds.length === 0) {
        // Réinitialiser le search_path avant de quitter
        await db.execute(sql`SET search_path TO public`);
        // Aucun contrat trouvé pour ce locataire
        return res.json({
          data: [],
          meta: { total: 0 }
        });
      }

      // Récupérer les contrats avec ces IDs
      result = await db
        .select()
        .from(contracts)
        .where(inArray(contracts.id, contractIds));
    } else {
      // Récupérer tous les contrats
      result = await db.select().from(contracts);
    }

    // Pour chaque contrat, récupérer les parties concernées
    const contractsWithParties = await Promise.all(
      result.map(async (contract) => {
        const contractPartyRecords = await db
          .select()
          .from(contractParties)
          .where(eq(contractParties.contractId, contract.id));

        // Récupérer les informations complètes des parties
        const parties = await Promise.all(
          contractPartyRecords.map(async (partyRecord) => {
            let partyDetails = { id: partyRecord.partyId, type: partyRecord.partyType, name: "Inconnu" };
            
            // Tenter de récupérer les détails de l'utilisateur
            if (partyRecord.partyType === 'tenant' || partyRecord.partyType === 'owner') {
              const userRecord = await db
                .select()
                .from(users)
                .where(eq(users.id, partyRecord.partyId))
                .limit(1);
              
              if (userRecord && userRecord.length > 0) {
                partyDetails.name = userRecord[0].fullName || userRecord[0].username || "Sans nom";
              }
            }
            
            return partyDetails;
          })
        );

        // Récupérer les détails de la propriété si applicable
        let propertyName = undefined;
        if (contract.propertyId) {
          const propertyRecord = await db
            .select()
            .from(properties)
            .where(eq(properties.id, contract.propertyId))
            .limit(1);
          
          if (propertyRecord && propertyRecord.length > 0) {
            propertyName = propertyRecord[0].name;
          }
        }

        return {
          ...contract,
          parties,
          propertyName
        };
      })
    );
    
    // Réinitialiser le search_path après utilisation
    await db.execute(sql`SET search_path TO public`);

    return res.json({
      data: contractsWithParties,
      meta: { total: contractsWithParties.length }
    });
  } catch (error) {
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`).catch(() => {});
    
    logger.error('Error fetching contracts:', error);
    res.status(500).json({ 
      error: "Erreur lors de la récupération des contrats",
      details: error instanceof Error ? error.message : "Erreur inconnue"
    });
  }
});

// Récupérer un contrat spécifique
router.get('/:id', async (req, res) => {
  try {
    // Récupérer l'ID de l'utilisateur depuis la requête
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifié" });
    }
    
    // Définition du schéma client
    const clientSchema = `client_${userId}`;
    
    // Configuration du schéma client pour cette requête
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
    
    const { id } = req.params;
    
    const contract = await db
      .select()
      .from(contracts)
      .where(eq(contracts.id, parseInt(id)))
      .limit(1);

    if (!contract || contract.length === 0) {
      // Réinitialiser le search_path avant de quitter
      await db.execute(sql`SET search_path TO public`);
      return res.status(404).json({ error: 'Contrat non trouvé' });
    }

    // Récupérer les parties concernées
    const contractPartyRecords = await db
      .select()
      .from(contractParties)
      .where(eq(contractParties.contractId, parseInt(id)));

    // Récupérer les informations complètes des parties
    const parties = await Promise.all(
      contractPartyRecords.map(async (partyRecord) => {
        let partyDetails = { id: partyRecord.partyId, type: partyRecord.partyType, name: "Inconnu" };
        
        // Tenter de récupérer les détails de l'utilisateur
        if (partyRecord.partyType === 'tenant' || partyRecord.partyType === 'owner') {
          const userRecord = await db
            .select()
            .from(users)
            .where(eq(users.id, partyRecord.partyId))
            .limit(1);
          
          if (userRecord && userRecord.length > 0) {
            partyDetails.name = userRecord[0].fullName || userRecord[0].username || "Sans nom";
          }
        }
        
        return partyDetails;
      })
    );

    // Récupérer les détails de la propriété si applicable
    let propertyName = undefined;
    if (contract[0].propertyId) {
      const propertyRecord = await db
        .select()
        .from(properties)
        .where(eq(properties.id, contract[0].propertyId))
        .limit(1);
      
      if (propertyRecord && propertyRecord.length > 0) {
        propertyName = propertyRecord[0].name;
      }
    }
    
    // Réinitialiser le search_path après utilisation
    await db.execute(sql`SET search_path TO public`);

    return res.json({
      data: {
        ...contract[0],
        parties,
        propertyName
      }
    });
  } catch (error) {
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`).catch(() => {});
    
    logger.error('Error fetching contract details:', error);
    res.status(500).json({ 
      error: "Erreur lors de la récupération des détails du contrat",
      details: error instanceof Error ? error.message : "Erreur inconnue"
    });
  }
});

// Créer un nouveau contrat
router.post('/', async (req, res) => {
  try {
    // Récupérer l'ID de l'utilisateur depuis la requête
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifié" });
    }
    
    // Définition du schéma client
    const clientSchema = `client_${userId}`;
    
    // Configuration du schéma client pour cette requête
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
    
    const { 
      name, 
      type, 
      status, 
      startDate, 
      endDate, 
      propertyId, 
      documentId, 
      signatureRequired, 
      automatedRenewal,
      renewalDate,
      notificationDate,
      parties 
    } = req.body;

    // Validation de base
    if (!name || !type || !startDate || !parties || !Array.isArray(parties) || parties.length === 0) {
      // Réinitialiser le search_path avant de quitter
      await db.execute(sql`SET search_path TO public`);
      return res.status(400).json({ error: 'Données invalides. Veuillez vérifier les champs obligatoires.' });
    }

    // Insérer le contrat
    const [newContract] = await db
      .insert(contracts)
      .values({
        name,
        type,
        status: status || 'draft',
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        propertyId,
        documentId,
        signatureRequired: signatureRequired !== undefined ? signatureRequired : true,
        automatedRenewal: automatedRenewal || false,
        renewalDate: renewalDate ? new Date(renewalDate) : undefined,
        notificationDate: notificationDate ? new Date(notificationDate) : undefined,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    // Insérer les parties concernées
    if (parties && parties.length > 0) {
      await Promise.all(
        parties.map(party => 
          db.insert(contractParties).values({
            contractId: newContract.id,
            partyId: party.id,
            partyType: party.type,
            createdAt: new Date()
          })
        )
      );
    }

    // Récupérer les parties pour le retour
    const partiesData = await Promise.all(
      parties.map(async (party) => {
        let partyDetails = { id: party.id, type: party.type, name: "Inconnu" };
        
        // Tenter de récupérer les détails de l'utilisateur
        if (party.type === 'tenant' || party.type === 'owner') {
          const userRecord = await db
            .select()
            .from(users)
            .where(eq(users.id, party.id))
            .limit(1);
          
          if (userRecord && userRecord.length > 0) {
            partyDetails.name = userRecord[0].fullName || userRecord[0].username || "Sans nom";
          }
        }
        
        return partyDetails;
      })
    );
    
    // Réinitialiser le search_path après utilisation
    await db.execute(sql`SET search_path TO public`);

    return res.status(201).json({
      data: {
        ...newContract,
        parties: partiesData
      }
    });
  } catch (error) {
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`).catch(() => {});
    
    logger.error('Error creating contract:', error);
    res.status(500).json({ 
      error: "Erreur lors de la création du contrat",
      details: error instanceof Error ? error.message : "Erreur inconnue"
    });
  }
});

// Mettre à jour un contrat
router.put('/:id', async (req, res) => {
  try {
    // Récupérer l'ID de l'utilisateur depuis la requête
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifié" });
    }
    
    // Définition du schéma client
    const clientSchema = `client_${userId}`;
    
    // Configuration du schéma client pour cette requête
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
    
    const { id } = req.params;
    const { 
      name, 
      type, 
      status, 
      startDate, 
      endDate, 
      propertyId, 
      documentId, 
      signatureRequired, 
      automatedRenewal,
      renewalDate,
      notificationDate,
      parties 
    } = req.body;

    // Vérifier si le contrat existe
    const existingContract = await db
      .select()
      .from(contracts)
      .where(eq(contracts.id, parseInt(id)))
      .limit(1);

    if (!existingContract || existingContract.length === 0) {
      // Réinitialiser le search_path avant de quitter
      await db.execute(sql`SET search_path TO public`);
      return res.status(404).json({ error: 'Contrat non trouvé' });
    }

    // Construire l'objet de mise à jour
    const updateData: {
      name?: string;
      type?: string;
      status?: string;
      startDate?: Date;
      endDate?: Date | null;
      propertyId?: number;
      documentId?: number;
      signatureRequired?: boolean;
      automatedRenewal?: boolean;
      renewalDate?: Date | null;
      notificationDate?: Date | null;
      updatedAt: Date;
    } = { updatedAt: new Date() };
    
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (status !== undefined) updateData.status = status;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (propertyId !== undefined) updateData.propertyId = propertyId;
    if (documentId !== undefined) updateData.documentId = documentId;
    if (signatureRequired !== undefined) updateData.signatureRequired = signatureRequired;
    if (automatedRenewal !== undefined) updateData.automatedRenewal = automatedRenewal;
    if (renewalDate !== undefined) updateData.renewalDate = renewalDate ? new Date(renewalDate) : null;
    if (notificationDate !== undefined) updateData.notificationDate = notificationDate ? new Date(notificationDate) : null;
    
    // Mettre à jour le contrat
    const [updatedContract] = await db
      .update(contracts)
      .set(updateData)
      .where(eq(contracts.id, parseInt(id)))
      .returning();

    // Si des parties sont fournies, mettre à jour les parties
    if (parties && Array.isArray(parties)) {
      // Supprimer les parties existantes
      await db
        .delete(contractParties)
        .where(eq(contractParties.contractId, parseInt(id)));

      // Ajouter les nouvelles parties
      if (parties.length > 0) {
        await Promise.all(
          parties.map(party => 
            db.insert(contractParties).values({
              contractId: parseInt(id),
              partyId: party.id,
              partyType: party.type,
              createdAt: new Date()
            })
          )
        );
      }
    }

    // Récupérer les parties mises à jour
    const updatedParties = await db
      .select()
      .from(contractParties)
      .where(eq(contractParties.contractId, parseInt(id)));

    const partiesData = await Promise.all(
      updatedParties.map(async (party) => {
        let partyDetails = { id: party.partyId, type: party.partyType, name: "Inconnu" };
        
        // Tenter de récupérer les détails de l'utilisateur
        if (party.partyType === 'tenant' || party.partyType === 'owner') {
          const userRecord = await db
            .select()
            .from(users)
            .where(eq(users.id, party.partyId))
            .limit(1);
          
          if (userRecord && userRecord.length > 0) {
            partyDetails.name = userRecord[0].fullName || userRecord[0].username || "Sans nom";
          }
        }
        
        return partyDetails;
      })
    );
    
    // Réinitialiser le search_path après utilisation
    await db.execute(sql`SET search_path TO public`);

    return res.json({
      data: {
        ...updatedContract,
        parties: partiesData
      }
    });
  } catch (error) {
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`).catch(() => {});
    
    logger.error('Error updating contract:', error);
    res.status(500).json({ 
      error: "Erreur lors de la mise à jour du contrat",
      details: error instanceof Error ? error.message : "Erreur inconnue"
    });
  }
});

// Supprimer un contrat
router.delete('/:id', async (req, res) => {
  try {
    // Récupérer l'ID de l'utilisateur depuis la requête
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non authentifié" });
    }
    
    // Définition du schéma client
    const clientSchema = `client_${userId}`;
    
    // Configuration du schéma client pour cette requête
    await db.execute(sql`SET search_path TO ${sql.identifier(clientSchema)}, public`);
    
    const { id } = req.params;

    // Vérifier si le contrat existe
    const existingContract = await db
      .select()
      .from(contracts)
      .where(eq(contracts.id, parseInt(id)))
      .limit(1);

    if (!existingContract || existingContract.length === 0) {
      // Réinitialiser le search_path avant de quitter
      await db.execute(sql`SET search_path TO public`);
      return res.status(404).json({ error: 'Contrat non trouvé' });
    }

    // Supprimer d'abord les parties liées
    await db
      .delete(contractParties)
      .where(eq(contractParties.contractId, parseInt(id)));

    // Supprimer le contrat
    await db
      .delete(contracts)
      .where(eq(contracts.id, parseInt(id)));
      
    // Réinitialiser le search_path après utilisation
    await db.execute(sql`SET search_path TO public`);

    return res.json({
      success: true,
      message: 'Contrat supprimé avec succès'
    });
  } catch (error) {
    // Réinitialiser le search_path en cas d'erreur
    await db.execute(sql`SET search_path TO public`).catch(() => {});
    
    logger.error('Error deleting contract:', error);
    res.status(500).json({ 
      error: "Erreur lors de la suppression du contrat",
      details: error instanceof Error ? error.message : "Erreur inconnue"
    });
  }
});

export default router; 