import express, { Request, Response } from 'express';
import { eq, sql } from 'drizzle-orm';
import logger from '../utils/logger';
import { db } from '@db/index';
import { formResponses } from '../db/schema/forms';
import { links } from '../schema/links';
import { authenticateMiddleware } from '../middleware/auth';
import { getUserId } from '../middleware/auth';
import { sanitizeFormData } from '../utils/form-helpers';
import { getDb } from '../utils/db-helpers';
import { z } from 'zod';
import { getClientDb } from '../utils/db-client';
import { formFieldSchema, FormField } from '../db/schema/forms';
import { ensureTablesExist } from '../utils/schema-helpers';

const router = express.Router();

/**
 * Récupère un formulaire par son ID
 */
router.get('/:formId', async (req: Request, res: Response) => {
  try {
    const { formId } = req.params;
    const slug = req.query.slug as string;
    const clientId = req.headers['x-client-id'] as string;
    
    if (!formId || (!clientId && !slug)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant de formulaire et client/slug obligatoires'
      });
    }
    
    let schemaName: string;
    let userId: number | null = null;
    
    // Déterminer le schéma à partir du slug si fourni
    if (slug && !clientId) {
      // Rechercher dans tous les schémas pour trouver le profil avec ce slug
      try {
        logger.info(`Recherche du schéma correspondant au slug ${slug}`);
        
        // Obtenir la liste des schémas clients
        const schemas = await db.execute(
          sql`SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'client_%'`
        );
        
        let profileFound = false;
        let clientSchema = '';
        let foundUserId: number | null = null;
        
        // Rechercher dans chaque schéma
        for (const row of schemas.rows) {
          const schema = row.schema_name as string;
          logger.info(`Vérification du schéma ${schema} pour le slug ${slug}`);
          
          try {
            const profileCheck = await db.execute(
              sql`SELECT user_id FROM ${sql.identifier(schema)}.link_profiles WHERE slug = ${slug} LIMIT 1`
            );
            
            if (profileCheck.rowCount && profileCheck.rowCount > 0) {
              profileFound = true;
              clientSchema = schema;
              foundUserId = Number(profileCheck.rows[0].user_id);
              logger.info(`Profil trouvé dans le schéma ${schema} pour le slug ${slug}`);
            break;
            }
          } catch (schemaError) {
            logger.warn(`Erreur lors de la vérification du schéma ${schema}:`, schemaError);
            // Continuer avec le schéma suivant
          }
        }
        
        if (!profileFound) {
          logger.warn(`Aucun profil trouvé pour le slug ${slug}`);
          return res.status(404).json({
            success: false,
            message: 'Profil non trouvé'
          });
        }
        
        userId = foundUserId;
        schemaName = clientSchema;
        logger.info(`Schéma trouvé: ${schemaName} pour le slug ${slug}, userId: ${userId}`);
      } catch (error) {
        logger.error(`Erreur lors de la recherche du schéma pour le slug ${slug}:`, error);
        return res.status(500).json({
          success: false,
          message: 'Erreur lors de la recherche du profil'
        });
      }
    } else {
      schemaName = `client_${clientId}`;
      userId = parseInt(clientId);
    }
    
    // Obtenir la DB client
    const clientDb = getClientDb(schemaName);
    
    // S'assurer que les tables existent
    await ensureTablesExist(schemaName, clientDb);
    
    // Récupérer le formulaire
    const formQuery = await clientDb.executeInSchema(
      sql`SELECT * FROM forms WHERE id = ${parseInt(formId)} LIMIT 1`
    );
    
    if (!formQuery.rowCount || formQuery.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Formulaire non trouvé'
      });
    }
    
    const form = formQuery.rows[0];
    
    // Valider les champs du formulaire
    try {
      const fields = form.fields as FormField[];
      fields.forEach(field => formFieldSchema.parse(field));
    } catch (validationError) {
      logger.warn('Validation error for form fields:', validationError);
      // Continuer même en cas d'erreur de validation
    }
    
    return res.json({
      success: true,
      data: form
    });
  } catch (error) {
    logger.error('Error fetching form:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du formulaire'
    });
  }
});

/**
 * Soumet une réponse de formulaire
 */
router.post('/:formId/submit', async (req: Request, res: Response) => {
  try {
    const { formId } = req.params;
    const formData = req.body;
    const clientId = req.headers['x-client-id'] as string;
    const slug = req.query.slug as string;
    
    if (!formId || (!clientId && !slug)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant de formulaire et client/slug obligatoires'
      });
    }
    
    let schemaName: string;
    let userId: number | null = null;
    
    // Déterminer le schéma à partir du slug si fourni
    if (slug && !clientId) {
      // Rechercher dans tous les schémas pour trouver le profil avec ce slug
      try {
        logger.info(`Recherche du schéma correspondant au slug ${slug}`);
        
        // Obtenir la liste des schémas clients
        const schemas = await db.execute(
          sql`SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'client_%'`
        );
        
        let profileFound = false;
        let clientSchema = '';
        let foundUserId: number | null = null;
        
        // Rechercher dans chaque schéma
        for (const row of schemas.rows) {
          const schema = row.schema_name as string;
          logger.info(`Vérification du schéma ${schema} pour le slug ${slug}`);
          
          try {
            const profileCheck = await db.execute(
              sql`SELECT user_id FROM ${sql.identifier(schema)}.link_profiles WHERE slug = ${slug} LIMIT 1`
            );
            
            if (profileCheck.rowCount && profileCheck.rowCount > 0) {
              profileFound = true;
              clientSchema = schema;
              foundUserId = Number(profileCheck.rows[0].user_id);
              logger.info(`Profil trouvé dans le schéma ${schema} pour le slug ${slug}`);
              break;
            }
          } catch (schemaError) {
            logger.warn(`Erreur lors de la vérification du schéma ${schema}:`, schemaError);
            // Continuer avec le schéma suivant
          }
        }
        
        if (!profileFound) {
          logger.warn(`Aucun profil trouvé pour le slug ${slug}`);
          return res.status(404).json({
            success: false,
            message: 'Profil non trouvé'
          });
        }
        
        userId = foundUserId;
        schemaName = clientSchema;
        logger.info(`Schéma trouvé: ${schemaName} pour le slug ${slug}, userId: ${userId}`);
      } catch (error) {
        logger.error(`Erreur lors de la recherche du schéma pour le slug ${slug}:`, error);
        return res.status(500).json({
          success: false,
          message: 'Erreur lors de la recherche du profil'
        });
      }
    } else {
      // Utiliser l'ID client directement
      schemaName = `client_${clientId}`;
      userId = parseInt(clientId);
    }
    
    logger.info(`Traitement de la soumission de formulaire ${formId} dans le schéma ${schemaName}`);
    
    // Obtenir la DB client avec la méthode execute correcte
    const clientDb = db;  // Utilisons l'objet db global qui possède la méthode execute
    
    // S'assurer que les tables existent
    await ensureTablesExist(schemaName, clientDb);
    
    // Variable mutable pour l'ID du formulaire
    let actualFormId = parseInt(formId);
    let actualLinkId: number | null = null;
    
    // Utiliser les méthodes SQL standard ensuite
    try {
      await clientDb.execute(sql`SET search_path TO ${sql.identifier(schemaName)}, public`);
      logger.info(`Search path défini sur ${schemaName}`);
      
      // Vérifier si le formulaire existe
      const formQuery = await clientDb.execute(
        sql`SELECT id FROM forms WHERE id = ${actualFormId} LIMIT 1`
      );
      
      if (!formQuery.rowCount || formQuery.rowCount === 0) {
        logger.warn(`Formulaire ${formId} non trouvé dans le schéma ${schemaName}, tentative de trouver une association link_forms`);
        
        // Chercher s'il existe une association dans link_forms
        const linkFormQuery = await clientDb.execute(
          sql`SELECT form_id FROM link_forms WHERE link_id = ${parseInt(formId)} LIMIT 1`
        );
        
        if (linkFormQuery.rowCount && linkFormQuery.rowCount > 0) {
          // Utiliser le formulaire associé
          const foundFormId = linkFormQuery.rows[0].form_id;
          logger.info(`Association trouvée: lien ${formId} -> formulaire ${foundFormId}`);
          
          // Vérifier que ce formulaire existe
          const actualFormQuery = await clientDb.execute(
            sql`SELECT id FROM forms WHERE id = ${foundFormId} LIMIT 1`
          );
          
          if (actualFormQuery.rowCount && actualFormQuery.rowCount > 0) {
            logger.info(`Utilisation du formulaire ${foundFormId} associé au lien ${formId}`);
            // Continuer le traitement avec foundFormId au lieu de formId
            // Garder actualLinkId comme lien pour les références externes
            actualLinkId = parseInt(formId);
            actualFormId = foundFormId as number;
          } else {
            logger.warn(`Le formulaire associé ${foundFormId} n'existe pas, tentative d'utiliser le formulaire 1`);
            // Utiliser le formulaire 1 comme fallback
            const defaultFormQuery = await clientDb.execute(
              sql`SELECT id FROM forms WHERE id = 1 LIMIT 1`
            );
            
            if (!defaultFormQuery.rowCount || defaultFormQuery.rowCount === 0) {
              logger.error(`Aucun formulaire valide trouvé (ni ${formId}, ni son association, ni le formulaire 1)`);
              await clientDb.execute(sql`SET search_path TO public`);
      return res.status(404).json({
        success: false,
        message: 'Formulaire non trouvé'
      });
    }
    
            // Utiliser le formulaire 1 par défaut
            logger.info(`Utilisation du formulaire 1 par défaut pour le lien ${formId}`);
            // Garder actualLinkId comme lien pour les références externes
            actualLinkId = parseInt(formId);
            actualFormId = 1;
          }
        } else {
          // Essayer d'utiliser le formulaire 1 comme fallback
          logger.warn(`Aucune association trouvée pour le lien ${formId}, tentative d'utiliser le formulaire 1`);
          
          const defaultFormQuery = await clientDb.execute(
            sql`SELECT id FROM forms WHERE id = 1 LIMIT 1`
          );
          
          if (!defaultFormQuery.rowCount || defaultFormQuery.rowCount === 0) {
            logger.error(`Aucun formulaire valide trouvé (ni ${formId}, ni le formulaire 1)`);
            await clientDb.execute(sql`SET search_path TO public`);
      return res.status(404).json({
        success: false,
              message: 'Formulaire non trouvé'
            });
          }
          
          // Utiliser le formulaire 1 par défaut
          logger.info(`Utilisation du formulaire 1 par défaut pour le lien ${formId}`);
          // Garder actualLinkId comme lien pour les références externes
          actualLinkId = parseInt(formId);
          actualFormId = 1;
        }
      }
      
      // Vérifier si un lien est associé à ce formulaire
      let linkId = actualLinkId;
      if (!linkId) {
        const linkQuery = await clientDb.execute(
          sql`SELECT l.id FROM links l
              JOIN link_forms lf ON l.id = lf.link_id
              WHERE lf.form_id = ${actualFormId} 
              LIMIT 1`
        );
        
        if (linkQuery.rowCount && linkQuery.rowCount > 0) {
          linkId = linkQuery.rows[0].id as number;
          logger.info(`Lien associé trouvé: ${linkId}`);
        }
      }
      
      // Nettoyer et sanitiser les données
      const safeFormData = sanitizeFormData(formData.data || formData);
      
      // Insérer la réponse
      const responseResult = await clientDb.execute(
        sql`INSERT INTO form_responses 
            (form_id, link_id, response_data, ip_address, user_agent, created_at)
            VALUES 
            (${actualFormId}, ${linkId}, ${JSON.stringify(safeFormData)}::jsonb, 
             ${req.headers['x-forwarded-for'] || req.socket.remoteAddress}, 
             ${req.headers['user-agent']}, NOW())
            RETURNING id`
      );
      
      if (!responseResult.rowCount || responseResult.rowCount === 0) {
        throw new Error("Échec de l'enregistrement de la réponse");
      }
      
      const responseId = responseResult.rows[0].id;
      logger.info(`Réponse enregistrée avec succès. ID: ${responseId}`);
      
      // Enregistrer également dans form_submissions pour compatibilité
      try {
        await clientDb.execute(
          sql`INSERT INTO form_submissions 
              (form_id, link_id, form_data, ip_address, user_agent, created_at)
              VALUES 
              (${actualFormId}, ${linkId}, ${JSON.stringify(safeFormData)}::jsonb, 
               ${req.headers['x-forwarded-for'] || req.socket.remoteAddress}, 
               ${req.headers['user-agent']}, NOW())`
        );
        logger.info(`Soumission également enregistrée dans form_submissions`);
      } catch (submissionError) {
        logger.warn(`Impossible d'enregistrer dans form_submissions:`, submissionError);
        // Ne pas interrompre le traitement en cas d'erreur ici
      }
      
      // Mettre à jour le compteur de clics/soumissions si un lien existe
      if (linkId) {
        await clientDb.execute(
          sql`UPDATE links 
              SET clicks = COALESCE(clicks, 0) + 1, updated_at = NOW() 
            WHERE id = ${linkId}`
      );
        logger.info(`Compteur de clics mis à jour pour le lien ${linkId}`);
      }
      
      await clientDb.execute(sql`SET search_path TO public`);
      logger.info('Search path rétabli à public');
      
      return res.json({
        success: true,
        responseId 
      });
    } catch (error) {
      // Réinitialiser le search_path en cas d'erreur
      logger.error('Erreur pendant le traitement SQL:', error);
      await clientDb.execute(sql`SET search_path TO public`).catch((e) => {
        logger.error('Erreur lors de la réinitialisation du search_path:', e);
      });
      throw error;
    }
  } catch (error) {
    logger.error('Error submitting form response:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la soumission du formulaire',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

/**
 * Récupère les réponses d'un formulaire
 */
router.get('/:formId/responses', authenticateMiddleware, async (req: Request, res: Response) => {
  try {
    const { formId } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non authentifié'
      });
    }
    
    // Obtenir la DB client
    const schemaName = `client_${userId}`;
    const clientDb = getClientDb(schemaName);
    
    // S'assurer que les tables existent
    await ensureTablesExist(schemaName, clientDb);
    
    console.log(`Recherche des réponses pour le formulaire ${formId} dans le schéma ${schemaName}`);
    
    // Vérifier d'abord si les réponses existent directement dans form_responses sans vérification du propriétaire
    // Ce qui permet de récupérer les réponses même si le formulaire a été créé différemment
    const directResponsesQuery = await clientDb.executeInSchema(
      sql`SELECT * FROM form_responses 
          WHERE form_id = ${parseInt(formId)} OR link_id = ${parseInt(formId)}
            ORDER BY created_at DESC`
    );
    
    if (directResponsesQuery.rowCount && directResponsesQuery.rowCount > 0) {
      console.log(`Trouvé ${directResponsesQuery.rowCount} réponses directement pour le formulaire ${formId}`);
      return res.json({
        success: true,
        data: directResponsesQuery.rows
      });
    }
    
    // Si aucune réponse directe trouvée, essayer la méthode standard avec vérification du propriétaire
    const formOwnershipQuery = await clientDb.executeInSchema(
      sql`SELECT id FROM forms WHERE id = ${parseInt(formId)} AND user_id = ${userId} LIMIT 1`
    );
    
    if (!formOwnershipQuery.rowCount || formOwnershipQuery.rowCount === 0) {
      console.log(`Aucun formulaire trouvé avec l'ID ${formId} pour l'utilisateur ${userId}, essai avec link_id`);
      
      // Essayer de trouver des réponses par link_id si form_id ne fonctionne pas
      const linkResponsesQuery = await clientDb.executeInSchema(
        sql`SELECT * FROM form_responses 
            WHERE link_id = ${parseInt(formId)} 
            ORDER BY created_at DESC`
      );
      
      if (linkResponsesQuery.rowCount && linkResponsesQuery.rowCount > 0) {
        console.log(`Trouvé ${linkResponsesQuery.rowCount} réponses via link_id ${formId}`);
        return res.json({
          success: true,
          data: linkResponsesQuery.rows
        });
      }
      
        return res.status(403).json({
          success: false,
        message: 'Accès non autorisé à ce formulaire ou aucune réponse trouvée'
      });
    }
      
      // Récupérer les réponses
    const responsesQuery = await clientDb.executeInSchema(
      sql`SELECT * FROM form_responses 
          WHERE form_id = ${parseInt(formId)} 
            ORDER BY created_at DESC`
      );
      
    const responses = responsesQuery.rows || [];
    console.log(`${responses.length} réponses trouvées pour le formulaire ${formId}`);
      
      return res.json({
        success: true,
      data: responses
      });
  } catch (error) {
    logger.error('Error fetching form responses:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des réponses'
    });
  }
});

/**
 * Supprime une réponse de formulaire
 */
router.delete('/responses/:responseId', authenticateMiddleware, async (req: Request, res: Response) => {
  try {
    const { responseId } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non authentifié'
      });
    }
    
    // Obtenir la DB client
    const schemaName = `client_${userId}`;
    const clientDb = getClientDb(schemaName);
    
    // S'assurer que les tables existent
    await ensureTablesExist(schemaName, clientDb);
    
    // Vérifier si la réponse existe et appartient à l'utilisateur
    const responseQuery = await clientDb.executeInSchema(
      sql`SELECT fr.id 
          FROM form_responses fr
          JOIN forms f ON fr.form_id = f.id
          WHERE fr.id = ${parseInt(responseId)} 
          AND f.user_id = ${userId}
            LIMIT 1`
      );
      
    if (!responseQuery.rowCount || responseQuery.rowCount === 0) {
        return res.status(403).json({
          success: false,
        message: 'Accès non autorisé à cette réponse'
      });
    }
    
    // Supprimer la réponse
    await clientDb.executeInSchema(
      sql`DELETE FROM form_responses WHERE id = ${parseInt(responseId)}`
    );
    
    return res.json({
      success: true,
      message: 'Réponse supprimée avec succès'
    });
  } catch (error) {
    logger.error('Error deleting form response:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la réponse'
    });
  }
});

/**
 * Supprime les soumissions d'un formulaire
 */
router.delete('/:formId/submissions', authenticateMiddleware, async (req: Request, res: Response) => {
  try {
    const { formId } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non authentifié'
      });
    }
    
    // Obtenir la DB client
    const schemaName = `client_${userId}`;
    const clientDb = getClientDb(schemaName);
    
    // S'assurer que les tables existent
    await ensureTablesExist(schemaName, clientDb);
    
    // Vérifier si le formulaire appartient à l'utilisateur
    const formOwnershipQuery = await clientDb.executeInSchema(
      sql`SELECT id FROM forms WHERE id = ${parseInt(formId)} AND user_id = ${userId} LIMIT 1`
    );
    
    if (!formOwnershipQuery.rowCount || formOwnershipQuery.rowCount === 0) {
      return res.status(403).json({
          success: false,
        message: 'Accès non autorisé à ce formulaire'
      });
    }
    
    // Supprimer les soumissions de form_responses
    await clientDb.executeInSchema(
      sql`DELETE FROM form_responses WHERE form_id = ${parseInt(formId)}`
    );
    
    // Supprimer également les soumissions de form_submissions
    try {
      await clientDb.executeInSchema(
        sql`DELETE FROM form_submissions WHERE form_id = ${parseInt(formId)}`
      );
      logger.info(`Soumissions supprimées de form_submissions pour le formulaire ${formId}`);
    } catch (error) {
      logger.warn(`Problème lors de la suppression des soumissions dans form_submissions:`, error);
      // Ne pas interrompre en cas d'erreur
    }
    
    return res.json({
      success: true,
      message: 'Soumissions supprimées avec succès'
    });
  } catch (error) {
    logger.error('Error deleting form submissions:', error);
    return res.status(500).json({
          success: false,
      message: 'Erreur lors de la suppression des soumissions'
    });
  }
});

/**
 * Récupère les soumissions d'un formulaire depuis form_submissions
 */
router.get('/:formId/form-submissions', authenticateMiddleware, async (req: Request, res: Response) => {
  try {
    const { formId } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non authentifié'
      });
    }
    
    // Obtenir la DB client
    const schemaName = `client_${userId}`;
    const clientDb = getClientDb(schemaName);
    
    // S'assurer que les tables existent
    await ensureTablesExist(schemaName, clientDb);
    
    // Vérifier si le formulaire appartient à l'utilisateur
    const formOwnershipQuery = await clientDb.executeInSchema(
      sql`SELECT id FROM forms WHERE id = ${parseInt(formId)} AND user_id = ${userId} LIMIT 1`
    );
    
    if (!formOwnershipQuery.rowCount || formOwnershipQuery.rowCount === 0) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à ce formulaire'
      });
    }
    
    // Récupérer les soumissions
    const submissionsQuery = await clientDb.executeInSchema(
      sql`SELECT * FROM form_submissions 
          WHERE form_id = ${parseInt(formId)} 
          ORDER BY created_at DESC`
    );
    
    const submissions = submissionsQuery.rows || [];
    
    return res.json({
      success: true,
      data: submissions
    });
  } catch (error) {
    logger.error('Error fetching form submissions:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des soumissions'
    });
  }
});

export default router; 