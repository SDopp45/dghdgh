const express = require('express');
const { db } = require('../db');
const { contracts, contractParties } = require('../../shared/schema');
const { eq, and, inArray } = require('drizzle-orm');
const { handleApiError } = require('../utils/error-handler');
const router = express.Router();

// Récupérer tous les contrats
router.get('/', async (req, res) => {
  try {
    const { tenantId } = req.query;
    let result;

    if (tenantId) {
      // Récupérer d'abord les IDs des contrats où ce locataire est une partie
      const contractPartiesResult = await db
        .select({ contractId: contractParties.contractId })
        .from(contractParties)
        .where(
          and(
            eq(contractParties.partyId, parseInt(tenantId)),
            eq(contractParties.partyType, 'tenant')
          )
        );

      const contractIds = contractPartiesResult.map(item => item.contractId);

      if (contractIds.length === 0) {
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
        const parties = await db
          .select()
          .from(contractParties)
          .where(eq(contractParties.contractId, contract.id));

        return {
          ...contract,
          parties
        };
      })
    );

    return res.json({
      data: contractsWithParties,
      meta: { total: contractsWithParties.length }
    });
  } catch (error) {
    handleApiError(res, error);
  }
});

// Récupérer un contrat spécifique
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const contract = await db
      .select()
      .from(contracts)
      .where(eq(contracts.id, parseInt(id)))
      .limit(1);

    if (!contract || contract.length === 0) {
      return res.status(404).json({ error: 'Contrat non trouvé' });
    }

    // Récupérer les parties concernées
    const parties = await db
      .select()
      .from(contractParties)
      .where(eq(contractParties.contractId, parseInt(id)));

    return res.json({
      data: {
        ...contract[0],
        parties
      }
    });
  } catch (error) {
    handleApiError(res, error);
  }
});

// Créer un nouveau contrat
router.post('/', async (req, res) => {
  try {
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
      return res.status(400).json({ error: 'Données invalides. Veuillez vérifier les champs obligatoires.' });
    }

    // Insérer le contrat
    const [newContract] = await db
      .insert(contracts)
      .values({
        name,
        type,
        status: status || 'draft',
        startDate,
        endDate: endDate || null,
        propertyId,
        documentId,
        signatureRequired: signatureRequired !== undefined ? signatureRequired : true,
        automatedRenewal: automatedRenewal || false,
        renewalDate,
        notificationDate,
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

    // Récupérer le contrat avec les parties pour le retourner
    const partiesData = await db
      .select()
      .from(contractParties)
      .where(eq(contractParties.contractId, newContract.id));

    return res.status(201).json({
      data: {
        ...newContract,
        parties: partiesData
      }
    });
  } catch (error) {
    handleApiError(res, error);
  }
});

// Mettre à jour un contrat
router.put('/:id', async (req, res) => {
  try {
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
      return res.status(404).json({ error: 'Contrat non trouvé' });
    }

    // Mettre à jour le contrat
    const [updatedContract] = await db
      .update(contracts)
      .set({
        name: name !== undefined ? name : existingContract[0].name,
        type: type !== undefined ? type : existingContract[0].type,
        status: status !== undefined ? status : existingContract[0].status,
        startDate: startDate !== undefined ? startDate : existingContract[0].startDate,
        endDate: endDate !== undefined ? endDate : existingContract[0].endDate,
        propertyId: propertyId !== undefined ? propertyId : existingContract[0].propertyId,
        documentId: documentId !== undefined ? documentId : existingContract[0].documentId,
        signatureRequired: signatureRequired !== undefined ? signatureRequired : existingContract[0].signatureRequired,
        automatedRenewal: automatedRenewal !== undefined ? automatedRenewal : existingContract[0].automatedRenewal,
        renewalDate: renewalDate !== undefined ? renewalDate : existingContract[0].renewalDate,
        notificationDate: notificationDate !== undefined ? notificationDate : existingContract[0].notificationDate,
        updatedAt: new Date()
      })
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

    return res.json({
      data: {
        ...updatedContract,
        parties: updatedParties
      }
    });
  } catch (error) {
    handleApiError(res, error);
  }
});

// Supprimer un contrat
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier si le contrat existe
    const existingContract = await db
      .select()
      .from(contracts)
      .where(eq(contracts.id, parseInt(id)))
      .limit(1);

    if (!existingContract || existingContract.length === 0) {
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

    return res.json({
      success: true,
      message: 'Contrat supprimé avec succès'
    });
  } catch (error) {
    handleApiError(res, error);
  }
});

module.exports = router; 