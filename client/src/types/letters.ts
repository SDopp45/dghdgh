export type LetterType = 
  | "mise_en_demeure_loyer"
  | "resiliation_bail"
  | "demande_reparation"
  | "quittance_loyer"
  | "restitution_depot_garantie"
  | "attestation_loyer"
  | "conge_bailleur"
  | "conge_locataire"
  | "demande_etat_lieux"
  | "notification_charges"
  | "notification_quittance"
  | "demande_regularisation_charges"
  | "notification_revision_loyer"
  | "demande_renouvellement_bail"
  | "notification_depart_locataire"
  | "renouvellement_bail"
  | "augmentation_loyer"
  | "notification_travaux";

export interface LetterField {
  name: string;
  label: string;
  type: "text" | "textarea" | "date" | "number" | "select";
  placeholder: string;
  required?: boolean;
  options?: string[];
}

export interface LetterTemplate {
  id?: string;
  name?: string;
  type?: string;
  title: string;
  description: string;
  fields: LetterField[];
  content: string;
  templates: {
    [key: string]: {
      title: string;
      content: string;
    };
  };
}

interface TemplateContent {
  title: string;
  content: string;
}

interface LetterTypeTemplate {
  title: string;
  description?: string;
  fields: LetterField[];
  templates: {
    [key: string]: TemplateContent;
  };
}

export type LetterTemplates = {
  [key in LetterType]: LetterTypeTemplate;
};

export const LETTER_TEMPLATES: LetterTemplates = {
  mise_en_demeure_loyer: {
    title: "Mise en demeure de paiement de loyer",
    description: "Courrier pour demander le paiement d'un loyer impayé",
    fields: [
      { name: "locataire_nom", label: "Nom du locataire", type: "text", placeholder: "Nom complet du locataire" },
      { name: "adresse", label: "Adresse du logement", type: "textarea", placeholder: "Adresse complète du logement" },
      { name: "montant_du", label: "Montant dû", type: "text", placeholder: "Montant total dû" },
      { name: "delai_paiement", label: "Délai de paiement", type: "text", placeholder: "Délai accordé pour le paiement" },
      { name: "date_limite", label: "Date limite de paiement", type: "date", placeholder: "Date limite pour le paiement" }
    ],
    templates: {
      standard: {
        title: "Standard 2025",
        content: `{civility} {locataire_nom},

Je soussigné(e), propriétaire du logement que vous occupez au {adresse} selon le contrat de bail signé le [DATE_BAIL], constate que malgré mes relances, vous n'avez toujours pas réglé le(s) loyer(s) et/ou charges suivants :

- Loyer du mois de [MOIS] : [MONTANT] €
- Charges locatives : [MONTANT_CHARGES] €

Soit un total de {montant_du} €.

Par la présente, je vous mets en demeure de régler cette somme sous {delai_paiement} jours à compter de la réception de ce courrier, soit au plus tard le {date_limite}.

À défaut de paiement dans ce délai, je serai dans l'obligation, conformément à l'article 24 de la loi n° 89-462 du 6 juillet 1989 modifiée et applicable en 2025, d'engager une procédure judiciaire à votre encontre, ce qui entraînera des frais supplémentaires à votre charge.

Je vous rappelle que vous pouvez solliciter l'aide des services sociaux de votre commune ou département pour vous accompagner dans cette situation. Vous pouvez également saisir la Commission départementale de coordination des actions de prévention des expulsions locatives (CCAPEX).

Je reste à votre disposition pour trouver une solution amiable à cette situation.

Je vous prie d'agréer, {civility}, l'expression de mes salutations distinguées.`
      },
      ferme: {
        title: "Ferme et direct 2025",
        content: `{civility} {locataire_nom},

MISE EN DEMEURE DE PAIEMENT DE LOYER
LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION

Vous occupez le logement situé {adresse} selon un contrat de bail signé le [DATE_BAIL].

Je constate que malgré plusieurs relances, vous restez débiteur de la somme de {montant_du} € correspondant aux loyers et charges impayés pour la période du [PERIODE_DEBUT] au [PERIODE_FIN].

Par la présente, je vous mets en demeure de régler l'intégralité de cette somme sous {delai_paiement} jours francs à compter de la réception de ce courrier, soit au plus tard le {date_limite}.

À défaut de règlement dans ce délai, je saisirai le tribunal judiciaire compétent pour obtenir la résiliation du bail et votre expulsion, ainsi que le paiement des sommes dues augmentées des intérêts légaux, indemnités et frais de procédure, conformément aux dispositions légales en vigueur en 2025.

Je vous informe que vous pouvez saisir le Fonds de Solidarité pour le Logement (FSL) ou la Commission départementale de coordination des actions de prévention des expulsions locatives (CCAPEX) pour obtenir une aide financière et un accompagnement social.

Cette situation peut également vous exposer à une inscription au Fichier des Incidents de remboursement des Crédits aux Particuliers (FICP).

Je vous prie d'agréer, {civility}, l'expression de mes salutations distinguées.`
      },
      premier_rappel: {
        title: "Premier rappel 2025",
        content: `{civility} {locataire_nom},

RAPPEL DE PAIEMENT DE LOYER

Je me permets de vous rappeler que votre loyer d'un montant de {montant_du} € pour le logement situé {adresse} n'a pas été réglé à ce jour.

Il est possible qu'il s'agisse d'un simple oubli ou d'un problème technique. Si tel est le cas, je vous invite à régulariser cette situation dans les plus brefs délais.

Si vous rencontrez des difficultés financières temporaires, je vous encourage à me contacter rapidement afin que nous puissions trouver ensemble une solution adaptée.

En l'absence de paiement ou de contact de votre part avant le {date_limite}, je serai malheureusement contraint(e) d'entamer les démarches prévues par la législation en vigueur pour 2025.

Je vous rappelle que vous pouvez, si nécessaire, contacter les services sociaux de votre commune qui pourront vous orienter vers des dispositifs d'aide.

Je vous prie d'agréer, {civility}, l'expression de mes salutations distinguées.`
      },
      plan_paiement: {
        title: "Proposition plan de paiement 2025",
        content: `{civility} {locataire_nom},

IMPAYÉ DE LOYER - PROPOSITION DE PLAN DE PAIEMENT

Je constate que vous n'avez pas réglé le loyer du logement situé {adresse} pour un montant total de {montant_du} €.

Conscient(e) que chacun peut traverser des périodes difficiles, je vous propose d'établir un plan de paiement échelonné pour régulariser cette situation.

La loi applicable en 2025 prévoit la possibilité d'établir un échéancier amiable avant toute procédure judiciaire. Cette solution permettrait d'éviter les frais de procédure et de préserver notre relation contractuelle.

Je vous invite à me contacter avant le {date_limite} pour convenir ensemble des modalités de cet échéancier.

En l'absence de réponse de votre part, je serai dans l'obligation de vous adresser une mise en demeure officielle, conformément à l'article 24 de la loi du 6 juillet 1989 modifiée.

Je vous rappelle que vous pouvez solliciter les services du Fonds de Solidarité pour le Logement (FSL) ou d'Action Logement si vous êtes salarié(e).

Je vous prie d'agréer, {civility}, l'expression de mes salutations distinguées.`
      },
      dernier_avis: {
        title: "Dernier avis avant procédure 2025",
        content: `{civility} {locataire_nom},

DERNIER AVIS AVANT PROCÉDURE JUDICIAIRE
LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION

Malgré mes précédentes relances, je constate que vous n'avez toujours pas réglé le montant de {montant_du} € correspondant au(x) loyer(s) impayé(s) pour le logement situé {adresse}.

Je vous accorde un dernier délai jusqu'au {date_limite} pour effectuer ce paiement intégral.

Conformément aux dispositions législatives en vigueur en 2025, passé ce délai, je me verrai dans l'obligation de :
- Saisir le tribunal judiciaire pour demander la résiliation du bail
- Solliciter une ordonnance d'expulsion
- Réclamer le paiement des sommes dues majorées des intérêts légaux et des frais de procédure

Je tiens à vous informer qu'en application de la loi ELAN et ses modifications applicables en 2025, le préfet sera automatiquement informé de votre situation par l'intermédiaire de la CCAPEX, dès l'assignation devant le tribunal.

Je vous rappelle une dernière fois que vous pouvez solliciter les aides suivantes :
- Fonds de Solidarité pour le Logement (FSL) auprès de votre département
- Aide personnalisée au logement (APL) auprès de la CAF
- Accompagnement par les services sociaux de votre commune

Je vous prie d'agréer, {civility}, l'expression de mes salutations distinguées.`
      }
    }
  },
  resiliation_bail: {
    title: "Résiliation de bail",
    description: "Lettre de résiliation de bail",
    fields: [
      { name: "locataire_nom", label: "Nom du locataire", type: "text", placeholder: "Nom complet du locataire" },
      { name: "adresse", label: "Adresse du logement", type: "textarea", placeholder: "Adresse complète du logement" },
      { name: "date_entree", label: "Date d'entrée", type: "date", placeholder: "Date d'entrée dans les lieux" },
      { name: "motif_resiliation", label: "Motif de résiliation", type: "textarea", placeholder: "Motif de la résiliation" },
      { name: "date_sortie", label: "Date de sortie", type: "date", placeholder: "Date prévue de sortie" }
    ],
    templates: {
      standard: {
        title: "Standard 2025",
        content: `{civility} {locataire_nom},

Je vous informe de ma décision de résilier le bail du logement situé {adresse}, que vous occupez depuis le {date_entree}.

Motif de la résiliation : {motif_resiliation}

Conformément aux dispositions légales en vigueur (loi n° 89-462 du 6 juillet 1989 modifiée applicable en 2025), je vous notifie par la présente ma décision de mettre fin au contrat de location à compter du {date_sortie}.

Je vous prie de bien vouloir libérer les lieux à cette date et de me restituer les clés après avoir effectué l'état des lieux de sortie.

Je vous rappelle que votre dépôt de garantie vous sera restitué dans un délai maximum d'un mois à compter de la remise des clés, déduction faite des sommes éventuellement dues au titre des loyers, charges, réparations locatives ou dégradations.

Je vous prie d'agréer, {civility}, l'expression de mes salutations distinguées.`
      },
      amiable: {
        title: "Amiable 2025",
        content: `{civility} {locataire_nom},

Je souhaite vous informer de ma décision de mettre fin au bail du logement situé {adresse}, que vous occupez depuis le {date_entree}.

Motif de la résiliation : {motif_resiliation}

Je vous propose une résiliation amiable du bail, prenant effet le {date_sortie}.

Conformément à la réglementation applicable en 2025, nous devrons procéder à un état des lieux de sortie contradictoire pour permettre la restitution de votre dépôt de garantie dans le délai légal d'un mois suivant la remise des clés.

Je reste à votre disposition pour organiser la remise des clés et l'état des lieux de sortie dans les meilleures conditions.

Je vous prie d'agréer, {civility}, l'expression de mes salutations distinguées.`
      },
      manquement_obligations: {
        title: "Manquement aux obligations 2025",
        content: `{civility} {locataire_nom},

RÉSILIATION DU BAIL POUR MANQUEMENT AUX OBLIGATIONS
LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION

Je me vois contraint(e) de résilier le bail du logement situé {adresse}, que vous occupez depuis le {date_entree}.

Motif de la résiliation : {motif_resiliation}

Je constate que malgré mes précédentes relances, vous n'avez pas remédié aux manquements suivants à vos obligations locatives :
[DÉTAIL DES MANQUEMENTS]

Ces faits constituent des infractions graves aux obligations du locataire définies par l'article 7 de la loi n° 89-462 du 6 juillet 1989 modifiée et applicable en 2025.

Par conséquent, je vous notifie par la présente ma décision de résilier le bail à compter du {date_sortie}. Cette décision est prise conformément à la clause résolutoire prévue dans votre contrat de bail.

Je vous prie de bien vouloir libérer les lieux à cette date, après avoir effectué l'état des lieux de sortie contradictoire, et de me restituer les clés.

Je vous rappelle que votre dépôt de garantie vous sera restitué dans un délai d'un mois suivant la remise des clés, déduction faite des sommes éventuellement dues et des frais de remise en état justifiés.

Je vous prie d'agréer, {civility}, l'expression de mes salutations distinguées.`
      },
      raisons_personnelles: {
        title: "Raisons personnelles 2025",
        content: `{civility} {locataire_nom},

RÉSILIATION DU BAIL POUR REPRISE PERSONNELLE
LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION

Je vous informe par la présente de ma décision de résilier le bail du logement situé {adresse}, que vous occupez depuis le {date_entree}.

Conformément à l'article 15 de la loi n° 89-462 du 6 juillet 1989 modifiée et applicable en 2025, je souhaite reprendre ce logement pour [PRÉCISER : l'habiter moi-même/y loger un membre de ma famille].

Le bénéficiaire de cette reprise sera : [NOM ET LIEN DE PARENTÉ si applicable]

Cette résiliation prendra effet à la date du {date_sortie}, soit à l'échéance du délai de préavis légal de six mois.

Je vous rappelle qu'en vertu des modifications législatives applicables en 2025, si vous êtes âgé(e) de plus de 65 ans et que vos ressources sont inférieures au seuil fixé par décret, ou si vous présentez un handicap reconnu, vous bénéficiez d'une protection spécifique. Dans ce cas, je vous invite à me le faire savoir dans les meilleurs délais.

Un état des lieux contradictoire devra être établi lors de votre départ et votre dépôt de garantie vous sera restitué dans le délai légal d'un mois, déduction faite des sommes justifiées.

Je reste à votre disposition pour tout renseignement complémentaire.

Je vous prie d'agréer, {civility}, l'expression de mes salutations distinguées.`
      },
      vente_logement: {
        title: "Vente du logement 2025",
        content: `{civility} {locataire_nom},

RÉSILIATION DU BAIL POUR VENTE DU LOGEMENT
LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION

Je vous informe par la présente de ma décision de résilier le bail du logement situé {adresse}, que vous occupez depuis le {date_entree}, en raison de ma volonté de vendre ce bien.

Conformément à l'article 15-II de la loi n° 89-462 du 6 juillet 1989 modifiée et applicable en 2025, cette résiliation prendra effet à la date du {date_sortie}, soit à l'échéance du délai de préavis légal de six mois.

Je vous rappelle que vous bénéficiez d'un droit de préemption sur ce logement. À ce titre, je vous adresserai prochainement une offre de vente précisant le prix et les conditions de la vente projetée. Vous disposerez alors d'un délai de deux mois pour accepter cette offre.

Par ailleurs, si vous êtes âgé(e) de plus de 65 ans et que vos ressources sont inférieures au seuil fixé par décret, ou si vous présentez un handicap reconnu, vous bénéficiez d'une protection spécifique selon les dispositions en vigueur en 2025. Dans ce cas, je vous invite à me le faire savoir dans les meilleurs délais.

Un état des lieux contradictoire devra être établi lors de votre départ et votre dépôt de garantie vous sera restitué dans le délai légal d'un mois, déduction faite des sommes justifiées.

Je reste à votre disposition pour tout renseignement complémentaire.

Je vous prie d'agréer, {civility}, l'expression de mes salutations distinguées.`
      }
    }
  },
  demande_reparation: {
    title: "Demande de réparation",
    description: "Lettre de demande de réparation",
    fields: [
      { name: "locataire_nom", label: "Nom du locataire", type: "text", placeholder: "Nom complet du locataire" },
      { name: "adresse", label: "Adresse du logement", type: "textarea", placeholder: "Adresse complète du logement" },
      { name: "description_panne", label: "Description de la panne", type: "textarea", placeholder: "Description détaillée de la panne" },
      { name: "urgence", label: "Niveau d'urgence", type: "select", placeholder: "Niveau d'urgence de la réparation", options: ["Urgent", "Normal", "Peu urgent"] },
      { name: "date_souhaitee", label: "Date souhaitée", type: "date", placeholder: "Date souhaitée pour l'intervention" }
    ],
    templates: {
      standard: {
        title: "Standard 2025",
        content: `{civility} {locataire_nom},

Je vous informe d'une panne/dégradation dans le logement situé {adresse} :

{description_panne}

Niveau d'urgence : {urgence}

Conformément à l'article 6 de la loi n° 89-462 du 6 juillet 1989 modifiée applicable en 2025, je vous rappelle que le propriétaire est tenu de délivrer un logement en bon état d'usage et de le maintenir en état de servir à l'usage prévu par le contrat.

Je vous serais reconnaissant de bien vouloir procéder aux réparations nécessaires dans les meilleurs délais, idéalement avant le {date_souhaitee}.

Je reste à votre disposition pour faciliter l'accès au logement et pour toute information complémentaire.

Je vous prie d'agréer, {civility}, l'expression de mes salutations distinguées.`
      },
      urgent: {
        title: "Urgent 2025",
        content: `{civility} {locataire_nom},

URGENT - DEMANDE DE RÉPARATION

Je vous signale une panne urgente dans le logement situé {adresse} :

{description_panne}

Cette situation nécessite une intervention immédiate conformément à l'article 6 de la loi n° 89-462 du 6 juillet 1989 modifiée et aux dispositions applicables en 2025.

Le décret n° 2002-120 du 30 janvier 2002 relatif aux caractéristiques du logement décent, actualisé pour 2025, impose que les équipements du logement permettent un usage normal des lieux et ne présentent pas de risques manifestes pour la sécurité physique et la santé des occupants.

En l'absence d'intervention sous 72 heures, je me verrai contraint(e) de :
- Saisir la Commission Départementale de Conciliation
- Solliciter le juge des contentieux de la protection pour obtenir une injonction de faire
- Demander une réduction de loyer proportionnelle au préjudice subi

Je reste joignable au [TÉLÉPHONE] pour organiser cette intervention en urgence.

Je vous prie d'agréer, {civility}, l'expression de mes salutations distinguées.`
      },
      travaux_energie: {
        title: "Amélioration énergétique 2025",
        content: `{civility} {locataire_nom},

DEMANDE DE TRAVAUX D'AMÉLIORATION ÉNERGÉTIQUE

Je vous informe par la présente d'un problème affectant les performances énergétiques du logement situé {adresse} :

{description_panne}

Conformément à la loi Climat et Résilience et aux dispositions applicables en 2025, je vous rappelle que les logements doivent respecter un niveau minimal de performance énergétique. Les logements classés E, F et G sont désormais considérés comme énergétiquement indécents.

Ce problème affecte directement ma consommation énergétique et génère des surcoûts importants de chauffage. Les prochaines factures risquent d'être anormalement élevées en raison de cette situation.

Je vous demande de bien vouloir procéder aux travaux nécessaires avant le {date_souhaitee} afin de remédier à cette situation.

Je vous précise qu'en l'absence d'intervention, la loi me permet de solliciter une expertise puis de saisir le tribunal compétent pour ordonner la réalisation de ces travaux sous astreinte.

Je reste à votre disposition pour échanger sur ce sujet et faciliter l'accès au logement.

Je vous prie d'agréer, {civility}, l'expression de mes salutations distinguées.`
      },
      mise_en_demeure: {
        title: "Mise en demeure 2025",
        content: `{civility} {locataire_nom},

MISE EN DEMEURE - TRAVAUX DE RÉPARATION
LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION

Malgré mes précédentes demandes restées sans réponse, je constate que les réparations suivantes n'ont toujours pas été effectuées dans le logement situé {adresse} :

{description_panne}

Par la présente, je vous mets en demeure, conformément aux articles 6 et 20-1 de la loi n° 89-462 du 6 juillet 1989 modifiée et applicable en 2025, de procéder à ces réparations impérativement avant le {date_souhaitee}.

Je tiens à vous rappeler que le non-respect de votre obligation d'entretien du logement peut constituer un manquement à vos obligations contractuelles et légales, susceptible d'engager votre responsabilité.

En l'absence d'intervention dans le délai imparti, je serai dans l'obligation d'engager les procédures suivantes :
- Saisine de la Commission Départementale de Conciliation
- Dépôt d'un dossier auprès du Pôle Habitat du Tribunal Judiciaire
- Demande de consignation des loyers jusqu'à exécution des travaux
- Sollicitation d'une expertise judiciaire pour constater l'état du logement

Je reste à votre disposition pour organiser ces travaux dans les meilleurs délais.

Je vous prie d'agréer, {civility}, l'expression de mes salutations distinguées.`
      },
      reparations_locatives: {
        title: "Réparations locatives 2025",
        content: `{civility} {locataire_nom},

DEMANDE D'AUTORISATION DE TRAVAUX LOCATIFS

Je souhaite vous informer de mon intention d'effectuer les réparations locatives suivantes dans le logement situé {adresse} :

{description_panne}

Conformément au décret n° 87-712 du 26 août 1987, actualisé et applicable en 2025, ces travaux relèvent des réparations d'entretien courant et des menues réparations qui incombent au locataire.

Cependant, considérant la nature de ces travaux, je sollicite votre autorisation expresse avant d'y procéder, conformément à l'article 7-f de la loi n° 89-462 du 6 juillet 1989 modifiée.

Je prévois de réaliser ces travaux le {date_souhaitee}. [ENTREPRISE/PERSONNE] se chargera de les effectuer.

Je vous serais reconnaissant de bien vouloir me confirmer votre accord pour la réalisation de ces travaux. En l'absence de réponse de votre part sous 15 jours, je considérerai cette autorisation comme tacitement accordée.

Je vous prie d'agréer, {civility}, l'expression de mes salutations distinguées.`
      }
    }
  },
  quittance_loyer: {
    title: "Quittance de loyer",
    description: "Quittance de loyer",
    fields: [
      { name: "locataire_nom", label: "Nom du locataire", type: "text", placeholder: "Nom complet du locataire" },
      { name: "adresse", label: "Adresse du logement", type: "textarea", placeholder: "Adresse complète du logement" },
      { name: "periode", label: "Période concernée", type: "text", placeholder: "Période du loyer (ex: Janvier 2025)" },
      { name: "montant", label: "Montant du loyer", type: "text", placeholder: "Montant du loyer" },
      { name: "charges", label: "Montant des charges", type: "text", placeholder: "Montant des charges" },
      { name: "date_paiement", label: "Date de paiement", type: "date", placeholder: "Date de paiement" }
    ],
    templates: {
      standard: {
        title: "Standard 2025",
        content: `QUITTANCE DE LOYER

Je soussigné(e), propriétaire du logement situé {adresse}, reconnais avoir reçu de {civility} {locataire_nom} la somme de {montant} € (dont {charges} € de charges) au titre du loyer de {periode}.

Paiement reçu le {date_paiement}.

Cette quittance annule tous les reçus qui auraient pu être établis précédemment pour la même période. Elle est à conserver sans limitation de durée.

Conformément à la réglementation applicable en 2025, cette quittance vaut attestation de paiement de loyer et peut être utilisée par le locataire pour faire valoir ses droits.`
      },
      detaillee: {
        title: "Détaillée 2025",
        content: `QUITTANCE DE LOYER DÉTAILLÉE

Je soussigné(e), [NOM COMPLET DU BAILLEUR], propriétaire du logement situé {adresse}, certifie avoir perçu de {civility} {locataire_nom} les sommes suivantes pour la période de location {periode} :

- Loyer de base : {montant} €
- Provisions sur charges : {charges} €
- Total versé : [TOTAL] €

Mode de paiement : [MODE DE PAIEMENT]
Date de réception du paiement : {date_paiement}

Cette quittance est délivrée pour valoir ce que de droit, conformément à l'article 21 de la loi n° 89-462 du 6 juillet 1989 modifiée et applicable en 2025.

Je rappelle que le diagnostique de performance énergétique (DPE) de ce logement est de classe [CLASSE ÉNERGÉTIQUE].`
      },
      electronique: {
        title: "Électronique 2025",
        content: `QUITTANCE DE LOYER ÉLECTRONIQUE

Conformément à l'article 21 de la loi du 6 juillet 1989 modifiée et aux dispositions applicables en 2025 sur la validité des documents électroniques,

Je soussigné(e), [NOM COMPLET DU BAILLEUR], atteste que {civility} {locataire_nom} a réglé le loyer et les charges pour le logement situé {adresse} pour la période {periode}.

Montant du loyer : {montant} €
Montant des charges : {charges} €
Total perçu : [TOTAL] €
Date de perception : {date_paiement}

Cette quittance électronique a la même valeur juridique qu'une quittance papier selon les dispositions légales en vigueur en 2025.

Un exemplaire de cette quittance est disponible dans l'espace locataire en ligne et est archivé électroniquement conformément à la réglementation.

Document généré électroniquement le [DATE GÉNÉRATION]
Identifiant unique : [IDENTIFIANT]`
      },
      trimestrielle: {
        title: "Trimestrielle 2025",
        content: `QUITTANCE DE LOYER TRIMESTRIELLE

Je soussigné(e), propriétaire du logement situé {adresse}, atteste avoir reçu de {civility} {locataire_nom} les paiements suivants pour le trimestre incluant {periode} :

[MOIS 1] : [MONTANT 1] € (dont [CHARGES 1] € de charges)
[MOIS 2] : [MONTANT 2] € (dont [CHARGES 2] € de charges)
[MOIS 3] : [MONTANT 3] € (dont [CHARGES 3] € de charges)

Total du trimestre : [TOTAL TRIMESTRE] €

Cette quittance atteste que le locataire est à jour de ses paiements pour la période mentionnée ci-dessus.

Conformément aux dispositions de l'article 21 de la loi du 6 juillet 1989 modifiée et applicable en 2025, cette quittance est transmise gratuitement au locataire.`
      },
      avec_regularisation: {
        title: "Avec régularisation 2025",
        content: `QUITTANCE DE LOYER AVEC RÉGULARISATION DES CHARGES

Je soussigné(e), propriétaire du logement situé {adresse}, reconnais avoir reçu de {civility} {locataire_nom} :

- Loyer du mois de {periode} : {montant} €
- Provision habituelle sur charges : {charges} €
- Régularisation annuelle des charges : [MONTANT RÉGULARISATION] €

Total perçu : [TOTAL] €
Date de paiement : {date_paiement}

Cette quittance inclut la régularisation des charges pour l'année [ANNÉE] conformément à l'article 23 de la loi n° 89-462 du 6 juillet 1989 modifiée et applicable en 2025. Le détail des charges a été communiqué au locataire et reste disponible sur demande.

Cette quittance vaut reçu pour solde de tout compte concernant les charges de l'année [ANNÉE].`
      }
    }
  },
  restitution_depot_garantie: {
    title: "Restitution du dépôt de garantie",
    description: "Lettre de restitution du dépôt de garantie",
    fields: [
      { name: "locataire_nom", label: "Nom du locataire", type: "text", placeholder: "Nom complet du locataire" },
      { name: "adresse", label: "Adresse du logement", type: "textarea", placeholder: "Adresse complète du logement" },
      { name: "date_sortie", label: "Date de sortie", type: "date", placeholder: "Date de sortie du logement" },
      { name: "date_remise_cles", label: "Date de remise des clés", type: "date", placeholder: "Date de remise des clés" },
      { name: "montant_depot", label: "Montant du dépôt", type: "text", placeholder: "Montant initial du dépôt de garantie" },
      { name: "retenues", label: "Retenues éventuelles", type: "textarea", placeholder: "Détail des retenues éventuelles" },
      { name: "montant_restituer", label: "Montant à restituer", type: "text", placeholder: "Montant à restituer" }
    ],
    templates: {
      standard: {
        title: "Standard 2025",
        content: `{civility} {locataire_nom},

Suite à votre départ du logement situé {adresse} le {date_sortie} et à la remise des clés le {date_remise_cles}, je vous confirme la restitution de votre dépôt de garantie.

Conformément à l'article 22 de la loi n° 89-462 du 6 juillet 1989 modifiée et applicable en 2025, je dispose d'un délai d'un mois à compter de la remise des clés pour vous restituer votre dépôt de garantie.

Montant initial du dépôt : {montant_depot} €

Retenues éventuelles : {retenues}

Montant à restituer : {montant_restituer} €

Le virement de cette somme sera effectué sur votre compte bancaire dans le délai légal d'un mois suivant la remise des clés.

Je vous prie d'agréer, {civility}, l'expression de mes salutations distinguées.`
      },
      sans_retenue: {
        title: "Sans retenue 2025",
        content: `{civility} {locataire_nom},

RESTITUTION INTÉGRALE DU DÉPÔT DE GARANTIE

Suite à votre départ du logement situé {adresse} le {date_sortie} et à la remise des clés le {date_remise_cles}, j'ai le plaisir de vous informer que l'état des lieux de sortie n'a révélé aucune dégradation imputable au locataire.

Conformément à l'article 22 de la loi n° 89-462 du 6 juillet 1989 modifiée et applicable en 2025, je vous confirme la restitution intégrale de votre dépôt de garantie.

Montant du dépôt de garantie : {montant_depot} €
Retenues : Aucune
Montant restitué : {montant_depot} €

Le virement de cette somme sera effectué sur votre compte bancaire sous 15 jours, soit avant l'expiration du délai légal d'un mois suivant la remise des clés.

Je vous souhaite une bonne installation dans votre nouveau logement.

Je vous prie d'agréer, {civility}, l'expression de mes salutations distinguées.`
      },
      avec_justificatifs: {
        title: "Avec justificatifs 2025",
        content: `{civility} {locataire_nom},

RESTITUTION PARTIELLE DU DÉPÔT DE GARANTIE AVEC JUSTIFICATIFS

Suite à votre départ du logement situé {adresse} le {date_sortie} et à la remise des clés le {date_remise_cles}, je vous informe que l'état des lieux de sortie a révélé certaines dégradations ou défauts d'entretien.

Conformément à l'article 22 de la loi n° 89-462 du 6 juillet 1989 modifiée et applicable en 2025, je vous restitue partiellement votre dépôt de garantie, avec les retenues justifiées ci-dessous :

Montant initial du dépôt de garantie : {montant_depot} €

Retenues justifiées :
{retenues}

Montant total des retenues : [MONTANT TOTAL RETENUES] €
Montant restitué : {montant_restituer} €

Vous trouverez en pièces jointes les justificatifs suivants :
- Copie de l'état des lieux d'entrée et de sortie
- Devis/factures des travaux de remise en état
- Photos des dégradations constatées

Le virement du montant restitué sera effectué sur votre compte bancaire dans le délai légal d'un mois suivant la remise des clés.

Si vous contestez ces retenues, vous pouvez solliciter la Commission Départementale de Conciliation de votre département, conformément aux dispositions légales en vigueur en 2025.

Je vous prie d'agréer, {civility}, l'expression de mes salutations distinguées.`
      },
      hors_delai: {
        title: "Dépassement délai 2025",
        content: `{civility} {locataire_nom},

RESTITUTION DU DÉPÔT DE GARANTIE AVEC MAJORATION

Suite à votre départ du logement situé {adresse} le {date_sortie} et à la remise des clés le {date_remise_cles}, je dois vous présenter mes excuses pour le retard dans la restitution de votre dépôt de garantie.

Le délai légal d'un mois prévu par l'article 22 de la loi n° 89-462 du 6 juillet 1989, modifiée et applicable en 2025, étant dépassé, je vous restitue votre dépôt majoré conformément à la loi.

Montant initial du dépôt : {montant_depot} €
Retenues éventuelles : {retenues}
Montant à restituer avant majoration : {montant_restituer} €
Majoration légale de 10% : [MONTANT MAJORATION] €
Montant total à restituer avec majoration : [TOTAL AVEC MAJORATION] €

Je vous prie de bien vouloir accepter mes excuses pour ce retard et vous confirme que le virement de la somme totale sera effectué sans délai sur votre compte bancaire.

Je vous prie d'agréer, {civility}, l'expression de mes salutations distinguées.`
      },
      avec_regularisation_charges: {
        title: "Avec régularisation charges 2025",
        content: `{civility} {locataire_nom},

RESTITUTION DU DÉPÔT DE GARANTIE AVEC RÉGULARISATION DES CHARGES

Suite à votre départ du logement situé {adresse} le {date_sortie} et à la remise des clés le {date_remise_cles}, je procède à la restitution de votre dépôt de garantie incluant la régularisation finale des charges locatives.

Conformément aux articles 22 et 23 de la loi n° 89-462 du 6 juillet 1989 modifiée et applicable en 2025, cette restitution intervient dans le délai légal d'un mois à compter de la remise des clés et comprend la régularisation définitive des charges.

Montant initial du dépôt de garantie : {montant_depot} €

Solde des charges locatives :
- Provisions versées : [PROVISIONS] €
- Charges réelles : [CHARGES RÉELLES] €
- Solde (remboursement / complément) : [SOLDE CHARGES] €

Autres retenues éventuelles :
{retenues}

Montant final restitué : {montant_restituer} €

Le virement de cette somme sera effectué sur votre compte bancaire dans le délai légal d'un mois suivant la remise des clés.

Vous trouverez en pièce jointe le décompte détaillé des charges pour la période concernée.

Je vous prie d'agréer, {civility}, l'expression de mes salutations distinguées.`
      }
    }
  },
  attestation_loyer: {
    title: "Attestation de paiement de loyer",
    description: "Attestation de paiement de loyer pour le locataire",
    fields: [
      { name: "locataire_nom", label: "Nom du locataire", type: "text", placeholder: "Nom complet du locataire" },
      { name: "adresse", label: "Adresse du logement", type: "textarea", placeholder: "Adresse complète du logement" },
      { name: "date_entree", label: "Date d'entrée", type: "date", placeholder: "Date d'entrée dans le logement" },
      { name: "montant_loyer", label: "Montant du loyer", type: "text", placeholder: "Montant du loyer hors charges" },
      { name: "charges", label: "Charges", type: "text", placeholder: "Montant des charges" },
      { name: "periode_attestation", label: "Période d'attestation", type: "text", placeholder: "Période couverte par l'attestation" }
    ],
    templates: {
      standard: {
        title: "Standard 2025",
        content: `ATTESTATION DE PAIEMENT DE LOYER

Je soussigné(e), [NOM COMPLET BAILLEUR], propriétaire du logement situé {adresse}, atteste que {civility} {locataire_nom} occupe ce logement depuis le {date_entree} en qualité de locataire.

Le montant mensuel du loyer s'élève à {montant_loyer} €, charges comprises de {charges} €.

J'atteste que {civility} {locataire_nom} est à jour du paiement de ses loyers pour la période {periode_attestation}.

Cette attestation est délivrée à la demande du locataire pour faire valoir ce que de droit, notamment auprès des organismes sociaux, administrations ou établissements financiers.`
      },
      pour_apl: {
        title: "Pour APL/AL 2025",
        content: `ATTESTATION DE LOYER POUR AIDE AU LOGEMENT

Je soussigné(e), [NOM COMPLET BAILLEUR], propriétaire du logement situé {adresse}, certifie que {civility} {locataire_nom} est locataire de ce logement depuis le {date_entree}.

Informations nécessaires pour le calcul des aides au logement (APL/AL) :

- Type de logement : [TYPE: appartement/maison]
- Surface habitable : [SURFACE] m²
- Montant mensuel du loyer hors charges : {montant_loyer} €
- Montant mensuel des charges : {charges} €
- Loyer total mensuel : [TOTAL] €

J'atteste que le logement répond aux caractéristiques de décence définies par le décret n°2002-120 du 30 janvier 2002, modifié et applicable en 2025.

J'atteste également que le locataire est à jour du paiement de ses loyers pour la période {periode_attestation}.

Cette attestation est établie pour servir et valoir ce que de droit auprès de la Caisse d'Allocations Familiales ou de la Mutualité Sociale Agricole.`
      },
      employeur: {
        title: "Pour employeur 2025",
        content: `ATTESTATION DE LOYER À DESTINATION DE L'EMPLOYEUR

Je soussigné(e), [NOM COMPLET BAILLEUR], propriétaire du logement situé {adresse}, certifie par la présente que {civility} {locataire_nom} est locataire de ce bien depuis le {date_entree}.

Le montant mensuel du loyer s'élève à {montant_loyer} € hors charges.
Le montant mensuel des charges locatives s'élève à {charges} €.
Soit un total mensuel de [TOTAL] €.

J'atteste que le locataire est à jour du paiement de ses loyers et charges pour la période {periode_attestation}.

Cette attestation est délivrée à la demande du locataire pour servir auprès de son employeur.

Je vous prie d'agréer, {civility}, l'expression de mes salutations distinguées.`
      },
      fiscale: {
        title: "Fiscale 2025",
        content: `ATTESTATION FISCALE DE PAIEMENT DES LOYERS

Je soussigné(e), [NOM COMPLET BAILLEUR], numéro fiscal [NUMÉRO FISCAL], propriétaire du logement situé {adresse}, déclare que {civility} {locataire_nom} est locataire de ce logement depuis le {date_entree}.

ATTESTATION FISCALE POUR L'ANNÉE [ANNÉE FISCALE]

Loyer mensuel hors charges : {montant_loyer} €
Charges mensuelles : {charges} €
Total mensuel : [TOTAL] €

Montant total des loyers payés pour l'année [ANNÉE FISCALE] : [MONTANT ANNUEL] €

J'atteste sur l'honneur l'exactitude des informations mentionnées ci-dessus, qui pourront être utilisées par le locataire pour ses déclarations fiscales, notamment dans le cadre des crédits ou réductions d'impôt liés au logement, conformément aux dispositions du Code Général des Impôts applicable en 2025.

Je vous prie d'agréer, {civility}, l'expression de mes salutations distinguées.`
      },
      garant: {
        title: "Pour garant 2025",
        content: `ATTESTATION DE LOYER À DESTINATION DU GARANT

Je soussigné(e), [NOM COMPLET BAILLEUR], propriétaire du logement situé {adresse}, atteste par la présente que {civility} {locataire_nom}, dont vous êtes garant selon acte de cautionnement signé le [DATE CAUTIONNEMENT], est locataire de ce logement depuis le {date_entree}.

Informations relatives au bail :
- Loyer mensuel hors charges : {montant_loyer} €
- Charges mensuelles : {charges} €
- Total mensuel : [TOTAL] €

J'atteste que le locataire est actuellement à jour du paiement de ses loyers pour la période {periode_attestation}.

Conformément aux dispositions légales applicables en 2025 et aux termes de l'engagement de cautionnement, cette attestation vous est adressée pour information sur la situation locative de la personne cautionnée.`
      }
    }
  },
  conge_bailleur: {
    title: "Congé donné par le bailleur",
    description: "Lettre de congé adressée au locataire par le bailleur",
    fields: [
      { name: "locataire_nom", label: "Nom du locataire", type: "text", placeholder: "Nom complet du locataire" },
      { name: "adresse", label: "Adresse du logement", type: "textarea", placeholder: "Adresse complète du logement" },
      { name: "date_effet", label: "Date d'effet", type: "date", placeholder: "Date d'effet du congé" },
      { name: "motif", label: "Motif du congé", type: "select", placeholder: "Sélectionner le motif du congé", options: ["Reprise pour habiter", "Vente du logement", "Motif légitime et sérieux"] },
      { name: "detail_motif", label: "Détail du motif", type: "textarea", placeholder: "Explication détaillée du motif" },
      { name: "beneficiaire_reprise", label: "Bénéficiaire de la reprise", type: "text", placeholder: "Si motif de reprise, nom du bénéficiaire" }
    ],
    templates: {
      reprise: {
        title: "Reprise pour habiter 2025",
        content: `LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION

{civility} {locataire_nom}
{adresse}

Objet : Congé pour reprise du logement

{civility},

Par la présente, je vous donne congé pour le logement que vous occupez situé {adresse}, à compter du {date_effet}, date à laquelle les locaux devront être libérés.

Conformément à l'article 15-I de la loi n° 89-462 du 6 juillet 1989 modifiée et applicable en 2025, ce congé est motivé par ma décision de reprendre le logement pour y habiter [OU pour y loger {beneficiaire_reprise}, qui a avec moi le lien de parenté suivant : (préciser)].

Je vous rappelle que ce congé vaut préavis de six mois, délai légal exigé pour les congés donnés par le bailleur.

Les éléments justificatifs de cette reprise sont les suivants :
{detail_motif}

Je vous informe également que vous bénéficiez d'un droit de préemption si vous souhaitez acheter ce logement dans les conditions prévues à l'article 15-II de la loi du 6 juillet 1989 en cas de congé pour vente ultérieur.

Pour votre information, la Commission départementale de conciliation de [DÉPARTEMENT] peut être saisie en cas de litige relatif à ce congé. Son adresse est la suivante : [ADRESSE DE LA COMMISSION].

Je reste à votre disposition pour organiser les modalités pratiques de votre départ et vous prie d'agréer, {civility}, l'expression de mes salutations distinguées.`
      },
      vente: {
        title: "Vente du logement 2025",
        content: `LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION

{civility} {locataire_nom}
{adresse}

Objet : Congé pour vente du logement

{civility},

Par la présente, je vous donne congé pour le logement que vous occupez situé {adresse}, à compter du {date_effet}, date à laquelle les locaux devront être libérés.

Conformément à l'article 15-II de la loi n° 89-462 du 6 juillet 1989 modifiée et applicable en 2025, ce congé est motivé par ma décision de vendre le logement.

Je vous rappelle que ce congé vaut préavis de six mois, délai légal exigé pour les congés donnés par le bailleur.

En votre qualité de locataire, vous bénéficiez d'un droit de préemption pour l'acquisition de ce logement. À cet effet, je vous indique que le logement est mis en vente au prix de [PRIX DE VENTE] €.

Les conditions de la vente sont les suivantes :
[DÉTAILLER LES CONDITIONS DE LA VENTE]

Si vous souhaitez acquérir ce logement, vous disposez d'un délai de deux mois à compter de la réception du présent courrier pour me faire connaître votre réponse. En cas d'acceptation de l'offre, vous disposez alors d'un délai de deux mois, porté à quatre mois si vous recourez à un prêt bancaire, pour la réalisation de la vente.

Vous trouverez ci-joint tous les documents relatifs à l'information précontractuelle obligatoire, conformément aux dispositions légales en vigueur en 2025.

Pour votre information, la Commission départementale de conciliation de [DÉPARTEMENT] peut être saisie en cas de litige relatif à ce congé ou aux conditions de vente. Son adresse est la suivante : [ADRESSE DE LA COMMISSION].

Je reste à votre disposition pour toute information complémentaire et vous prie d'agréer, {civility}, l'expression de mes salutations distinguées.`
      },
      motif_legitime: {
        title: "Motif légitime et sérieux 2025",
        content: `LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION

{civility} {locataire_nom}
{adresse}

Objet : Congé pour motif légitime et sérieux

{civility},

Par la présente, je vous donne congé pour le logement que vous occupez situé {adresse}, à compter du {date_effet}, date à laquelle les locaux devront être libérés.

Conformément à l'article 15-I de la loi n° 89-462 du 6 juillet 1989 modifiée et applicable en 2025, ce congé est fondé sur le motif légitime et sérieux suivant :

{detail_motif}

Ce motif constitue une raison réelle et sérieuse justifiant la fin du contrat de location, telle que reconnue par la jurisprudence en vigueur.

Je vous rappelle que ce congé vaut préavis de six mois, délai légal exigé pour les congés donnés par le bailleur.

Les preuves et justificatifs de ce motif sont les suivants :
[ÉNUMÉRER LES JUSTIFICATIFS]

Pour votre information, la Commission départementale de conciliation de [DÉPARTEMENT] peut être saisie en cas de litige relatif à ce congé. Son adresse est la suivante : [ADRESSE DE LA COMMISSION].

Je reste à votre disposition pour toute question relative à ce congé et vous prie d'agréer, {civility}, l'expression de mes salutations distinguées.`
      },
      travaux_lourds: {
        title: "Congé pour travaux lourds 2025",
        content: `LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION
OU LETTRE REMISE EN MAIN PROPRE CONTRE SIGNATURE
OU SIGNIFICATION PAR ACTE D'HUISSIER

{locataire_adresse}

Objet : Congé pour motif légitime et sérieux - Travaux lourds nécessitant l'évacuation des lieux

{civility} {locataire_nom},

Par la présente, je vous donne congé pour le logement que vous occupez au {adresse}, conformément aux dispositions de l'article 15 de la loi n° 89-462 du 6 juillet 1989 modifiée et applicable en 2025.

Ce congé prendra effet à la date d'échéance du bail, soit le {date_fin_bail}, ou à l'expiration d'un délai de {preavis} mois à compter de la réception de cette lettre si cette date est postérieure à la fin du bail.

Le congé est motivé par un motif légitime et sérieux consistant en la réalisation de travaux lourds qui nécessitent l'évacuation des lieux, à savoir :

[DÉTAILLER ICI LA NATURE ET L'ÉTENDUE DES TRAVAUX PRÉVUS]

Ces travaux sont d'une ampleur telle qu'ils rendent impossible le maintien des occupants dans les lieux pendant leur exécution et justifient ainsi la résiliation du bail. Conformément à l'article 14-3 de la loi du 6 juillet 1989, la durée prévisible de ces travaux est estimée à [NOMBRE DE MOIS] mois.

Vous devrez quitter les lieux à la date d'effet du congé indiquée ci-dessus.

Je vous informe que si vous êtes âgé(e) de plus de 65 ans et que vos ressources annuelles sont inférieures au plafond en vigueur pour l'attribution des logements locatifs conventionnés (art. R. 441-1 du code de la construction et de l'habitation), le présent congé n'est valide que si je vous propose un relogement correspondant à vos besoins et possibilités dans les limites géographiques prévues par la loi. Cette protection s'applique également si vous avez à votre charge une personne de plus de 65 ans vivant habituellement dans le logement et remplissant la condition de ressources précitée.

Cette protection n'est toutefois pas applicable si je suis moi-même âgé(e) de plus de 65 ans ou si mes ressources sont inférieures au plafond mentionné ci-dessus.

Veuillez agréer, {civility} {locataire_nom}, l'expression de mes salutations distinguées.

Fait à ____________________, le ____________________

Signature du bailleur`
      },
      zone_tendue: {
        title: "Congé en zone tendue 2025",
        content: `LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION
OU LETTRE REMISE EN MAIN PROPRE CONTRE SIGNATURE
OU SIGNIFICATION PAR ACTE D'HUISSIER

{locataire_adresse}

Objet : Congé pour {motif_conge} - Logement situé en zone tendue

{civility} {locataire_nom},

Par la présente, je vous donne congé pour le logement que vous occupez au {adresse}, conformément aux dispositions de l'article 15 de la loi n° 89-462 du 6 juillet 1989 modifiée et applicable en 2025.

Ce congé prendra effet à la date d'échéance du bail, soit le {date_fin_bail}, ou à l'expiration d'un délai de {preavis} mois à compter de la réception de cette lettre si cette date est postérieure à la fin du bail.

Le congé est motivé par ma décision de [REPRENDRE/VENDRE/MOTIF LÉGITIME ET SÉRIEUX] (choisir le motif applicable).

[SI VENTE] Je vous propose d'acquérir ce bien au prix de {prix_vente} €. Conformément à l'article 15-II de la loi du 6 juillet 1989, vous bénéficiez d'un droit de préemption sur ce logement. Vous disposez d'un délai de deux mois à compter de la réception de la présente notification pour me faire connaître votre acceptation ou votre refus de cette offre.

[SI REPRISE] Le logement sera occupé par {beneficiaire_reprise}, [LIEN DE PARENTÉ] (préciser le lien de parenté conformément à l'article 15-I de la loi du 6 juillet 1989).

[SI MOTIF LÉGITIME ET SÉRIEUX] Le motif légitime et sérieux consiste en : {motif_legitime}. [DÉTAILLER ICI DE FAÇON PRÉCISE ET CIRCONSTANCIÉE]

J'attire votre attention sur le fait que votre logement est situé dans une zone dite "tendue", telle que définie par le décret n° 2013-392 du 10 mai 2013 modifié, où s'applique la taxe sur les logements vacants. Dans ce contexte, je vous informe que, conformément à l'article 15 de la loi du 6 juillet 1989 applicable en 2025 :

1) Je dois justifier du caractère réel et sérieux de ma décision de [VENDRE/REPRENDRE/MOTIF LÉGITIME].
2) Si le congé est donné pour vente, le prix et les conditions de la vente doivent être conformes à l'offre contenue dans le congé.
3) Si le congé est donné pour reprise, le bénéficiaire doit effectivement occuper le logement pendant au moins deux ans à compter de l'effet du congé.

Le non-respect de ces obligations peut entraîner le versement de dommages et intérêts au locataire évincé.

Vous devrez quitter les lieux à la date d'effet du congé indiquée ci-dessus.

Je vous informe que si vous êtes âgé(e) de plus de 65 ans et que vos ressources annuelles sont inférieures au plafond en vigueur pour l'attribution des logements locatifs conventionnés, le présent congé n'est valide que si je vous propose un relogement correspondant à vos besoins et possibilités dans les limites géographiques prévues par la loi, sauf exceptions prévues par la loi.

Veuillez agréer, {civility} {locataire_nom}, l'expression de mes salutations distinguées.

Fait à ____________________, le ____________________

Signature du bailleur`
      }
    }
  },
  conge_locataire: {
    title: "Congé donné par le locataire",
    description: "Lettre de congé adressée au bailleur par le locataire",
    fields: [
      { name: "bailleur_nom", label: "Nom du bailleur", type: "text", placeholder: "Nom complet du bailleur" },
      { name: "bailleur_adresse", label: "Adresse du bailleur", type: "textarea", placeholder: "Adresse complète du bailleur" },
      { name: "adresse", label: "Adresse du logement", type: "textarea", placeholder: "Adresse complète du logement" },
      { name: "date_depart", label: "Date de départ", type: "date", placeholder: "Date prévue de départ" },
      { name: "motif", label: "Motif du congé", type: "select", placeholder: "Sélectionner le motif du congé", options: ["Sans motif particulier", "Nouvel emploi", "Perte d'emploi", "Achat immobilier", "Problèmes de santé", "Autre"] },
      { name: "detail_motif", label: "Détail du motif", type: "textarea", placeholder: "Explication détaillée du motif (optionnel)" }
    ],
    templates: {
      standard: {
        title: "Standard 2025",
        content: `[VOTRE NOM]
[VOTRE ADRESSE]

[COORDONNÉES DU BAILLEUR]
{bailleur_nom}
{bailleur_adresse}

LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION

Objet : Congé de location

Madame, Monsieur,

Par la présente, je vous informe de ma décision de résilier le bail concernant le logement situé {adresse}.

Conformément à l'article 12 de la loi n° 89-462 du 6 juillet 1989 modifiée et applicable en 2025, je respecterai le préavis légal de trois mois [OU d'un mois si vous êtes dans un cas de réduction du préavis].

En conséquence, je libérerai les lieux le {date_depart}, date à laquelle je vous remettrai les clés.

Je vous serais reconnaissant(e) de bien vouloir me contacter afin que nous puissions convenir d'une date pour l'état des lieux de sortie, qui pourrait avoir lieu le [DATE PROPOSÉE POUR L'ÉTAT DES LIEUX].

Je vous prie également de m'indiquer vos disponibilités pour organiser les visites du logement par de potentiels futurs locataires, conformément à l'article 4 de la loi précitée.

Je vous remercie de bien vouloir me faire parvenir, après mon départ et remise des clés, le solde de mon dépôt de garantie ainsi que l'arrêté des comptes, à l'adresse suivante : [VOTRE FUTURE ADRESSE].

Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.`
      },
      preavis_reduit: {
        title: "Préavis réduit 2025",
        content: `[VOTRE NOM]
[VOTRE ADRESSE]

[COORDONNÉES DU BAILLEUR]
{bailleur_nom}
{bailleur_adresse}

LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION

Objet : Congé avec préavis réduit

Madame, Monsieur,

Par la présente, je vous informe de ma décision de résilier le bail concernant le logement situé {adresse}.

Conformément à l'article 15-I de la loi n° 89-462 du 6 juillet 1989 modifiée et applicable en 2025, je bénéficie d'un préavis réduit à un mois en raison de la situation suivante :

[CHOISIR LA SITUATION APPLICABLE]
- Obtention d'un premier emploi
- Mutation professionnelle
- Perte d'emploi
- Nouvel emploi consécutif à une perte d'emploi
- État de santé justifiant un changement de domicile
- Bénéficiaire du RSA ou de l'AAH
- Attribution d'un logement social
- Logement situé en zone tendue

Vous trouverez ci-joint les justificatifs suivants : [LISTER LES JUSTIFICATIFS JOINTS]

En conséquence, je libérerai les lieux le {date_depart}, date à laquelle je vous remettrai les clés.

Je vous serais reconnaissant(e) de bien vouloir me contacter afin que nous puissions convenir d'une date pour l'état des lieux de sortie, qui pourrait avoir lieu le [DATE PROPOSÉE POUR L'ÉTAT DES LIEUX].

Je vous remercie de bien vouloir me faire parvenir, après mon départ et remise des clés, le solde de mon dépôt de garantie ainsi que l'arrêté des comptes, à l'adresse suivante : [VOTRE FUTURE ADRESSE].

Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.`
      },
      avec_motive: {
        title: "Avec motif particulier 2025",
        content: `[VOTRE NOM]
[VOTRE ADRESSE]

[COORDONNÉES DU BAILLEUR]
{bailleur_nom}
{bailleur_adresse}

LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION

Objet : Congé de location pour {motif}

Madame, Monsieur,

Par la présente, je vous informe de ma décision de résilier le bail concernant le logement situé {adresse}.

Cette décision est motivée par la raison suivante : {motif}

{detail_motif}

Conformément à l'article 12 de la loi n° 89-462 du 6 juillet 1989 modifiée et applicable en 2025, je respecterai le préavis légal de trois mois [OU d'un mois si vous êtes dans un cas de réduction du préavis, précisez alors le motif légal de réduction].

En conséquence, je libérerai les lieux le {date_depart}, date à laquelle je vous remettrai les clés.

Je vous propose de réaliser l'état des lieux de sortie le [DATE PROPOSÉE POUR L'ÉTAT DES LIEUX] ou à toute autre date qui vous conviendrait dans la semaine de mon départ.

Pendant la durée du préavis, je vous autorise à faire visiter le logement aux éventuels futurs locataires. Je vous propose les créneaux suivants : [JOURS ET HEURES DE VISITE PROPOSÉS].

Je vous remercie de bien vouloir me faire parvenir, après mon départ et remise des clés, le solde de mon dépôt de garantie ainsi que l'arrêté des comptes, à l'adresse suivante : [VOTRE FUTURE ADRESSE].

Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.`
      }
    }
  },
  demande_etat_lieux: {
    title: "Demande d'état des lieux",
    description: "Lettre de demande d'état des lieux d'entrée ou de sortie",
    fields: [
      { name: "destinataire_nom", label: "Nom du destinataire", type: "text", placeholder: "Nom du destinataire" },
      { name: "destinataire_adresse", label: "Adresse du destinataire", type: "textarea", placeholder: "Adresse complète du destinataire" },
      { name: "adresse", label: "Adresse du logement", type: "textarea", placeholder: "Adresse complète du logement" },
      { name: "type", label: "Type d'état des lieux", type: "select", placeholder: "Entrée ou sortie", options: ["Entrée", "Sortie"] },
      { name: "date_souhaitee", label: "Date souhaitée", type: "date", placeholder: "Date souhaitée pour l'état des lieux" },
      { name: "urgence", label: "Degré d'urgence", type: "select", placeholder: "Niveau d'urgence", options: ["Standard", "Urgent", "Très urgent"] }
    ],
    templates: {
      standard_2025: {
        title: "Standard 2025",
        content: `[VOS COORDONNÉES]

[COORDONNÉES DU DESTINATAIRE]
{destinataire_nom}
{destinataire_adresse}

LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION

Objet : Demande d'état des lieux de {type}

Madame, Monsieur,

En ma qualité de [LOCATAIRE/PROPRIÉTAIRE] du logement situé {adresse}, je vous contacte afin d'organiser l'état des lieux de {type}.

Conformément aux dispositions de l'article 3-2 de la loi n° 89-462 du 6 juillet 1989 modifiée et applicable en 2025, l'état des lieux doit être établi contradictoirement et à l'amiable lors de la remise et de la restitution des clés ou, à défaut, par huissier de justice.

Je vous propose d'établir cet état des lieux le {date_souhaitee} à [HEURE PROPOSÉE].

Si cette date ne vous convient pas, je vous invite à me proposer d'autres dates proches de celle-ci.

Pour information, je souhaite [UTILISER/NE PAS UTILISER] le modèle type d'état des lieux défini par le décret n° 2016-382 du 30 mars 2016, actualisé pour 2025.

Je vous rappelle que l'état des lieux doit être annexé au contrat de bail et que des exemplaires signés doivent être remis à chacune des parties.

Je vous prie de bien vouloir me confirmer votre accord sur la date proposée ou me suggérer une date alternative.

Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.`
      },
      urgent_2025: {
        title: "Urgent 2025",
        content: `[VOS COORDONNÉES]

[COORDONNÉES DU DESTINATAIRE]
{destinataire_nom}
{destinataire_adresse}

LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION

Objet : Demande urgente d'établissement d'état des lieux de {type}

Madame, Monsieur,

Je vous contacte en urgence concernant l'organisation de l'état des lieux de {type} pour le logement situé {adresse}.

Cette demande revêt un caractère urgent en raison de [PRÉCISER LA RAISON DE L'URGENCE : déménagement imminent, nouvelles contraintes professionnelles, etc.].

Conformément à l'article 3-2 de la loi n° 89-462 du 6 juillet 1989 modifiée et applicable en 2025, je sollicite l'établissement contradictoire de cet état des lieux le {date_souhaitee} à [HEURE PROPOSÉE].

En l'absence de réponse de votre part sous 48 heures, je me verrai contraint(e) de faire appel à un huissier de justice pour établir cet état des lieux, conformément aux dispositions légales.

Je tiens à rappeler que cet état des lieux est obligatoire et qu'il constitue une pièce essentielle pour éviter tout litige ultérieur. Il permet également de déterminer les responsabilités de chacun quant aux éventuelles dégradations constatées.

Je reste joignable par téléphone au [VOTRE NUMÉRO] ou par email à [VOTRE EMAIL] pour convenir rapidement d'un rendez-vous.

Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.`
      },
      entree_detaille_2025: {
        title: "Entrée détaillé 2025",
        content: `[VOS COORDONNÉES]

[COORDONNÉES DU DESTINATAIRE]
{destinataire_nom}
{destinataire_adresse}

LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION

Objet : Demande d'état des lieux d'entrée détaillé

Madame, Monsieur,

En tant que futur locataire du logement situé {adresse}, je vous contacte afin d'organiser un état des lieux d'entrée détaillé, conformément à l'article 3-2 de la loi n° 89-462 du 6 juillet 1989 modifiée et applicable en 2025.

Je souhaite que cet état des lieux soit particulièrement précis et exhaustif, incluant :
- Des photographies datées de chaque pièce et équipement
- La vérification du bon fonctionnement de tous les équipements
- Le relevé des compteurs (eau, électricité, gaz)
- La mention de l'état des revêtements de sols, murs et plafonds
- L'inventaire détaillé des équipements et mobilier (si logement meublé)

Je propose que cet état des lieux d'entrée soit réalisé le {date_souhaitee} à [HEURE PROPOSÉE].

Si vous le souhaitez, nous pouvons utiliser l'application numérique [NOM D'UNE APPLICATION] pour faciliter la réalisation de cet état des lieux et le partage immédiat du document.

Je vous invite à me confirmer votre disponibilité pour cette date ou à me proposer une alternative qui vous conviendrait mieux, dans un délai raisonnable avant la prise de possession des lieux.

Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.`
      },
      sortie_numerique_2025: {
        title: "Sortie numérique 2025",
        content: `[VOS COORDONNÉES]

[COORDONNÉES DU DESTINATAIRE]
{destinataire_nom}
{destinataire_adresse}

LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION

Objet : Proposition d'état des lieux de sortie numérique

Madame, Monsieur,

Dans le cadre de mon départ du logement situé {adresse}, je vous contacte pour organiser l'état des lieux de sortie prévu par l'article 3-2 de la loi n° 89-462 du 6 juillet 1989 modifiée et applicable en 2025.

Je vous propose de réaliser cet état des lieux le {date_souhaitee} à [HEURE PROPOSÉE].

Afin de faciliter et sécuriser cette procédure, je suggère l'utilisation d'une solution numérique pour établir cet état des lieux. Cette méthode présente plusieurs avantages :
- Gain de temps lors de la réalisation
- Documentation photographique précise et datée
- Signature électronique certifiée
- Archivage sécurisé et partage instantané du document
- Comparaison facilitée avec l'état des lieux d'entrée

Je vous propose d'utiliser l'application [NOM DE L'APPLICATION], disponible gratuitement sur smartphone et tablette. Je me charge de créer le dossier numérique et de vous inviter par email avant notre rendez-vous.

Je vous rappelle que le dépôt de garantie devra m'être restitué dans un délai d'un mois à compter de la remise des clés, déduction faite, le cas échéant, des sommes justifiées dues au titre des loyers, charges ou réparations locatives.

Je vous prie de bien vouloir me confirmer votre accord sur la date et le mode de réalisation de cet état des lieux.

Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.`
      },
      demande_huissier_2025: {
        title: "Demande avec huissier 2025",
        content: `[VOS COORDONNÉES]

[COORDONNÉES DU DESTINATAIRE]
{destinataire_nom}
{destinataire_adresse}

LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION

Objet : Information de recours à un huissier pour l'état des lieux de {type}

Madame, Monsieur,

Suite à [nos échanges précédents/mon courrier du (DATE) resté sans réponse], je vous informe par la présente que j'ai décidé de faire appel à un huissier de justice pour établir l'état des lieux de {type} du logement situé {adresse}.

Conformément à l'article 3-2 de la loi n° 89-462 du 6 juillet 1989 modifiée et applicable en 2025, en l'absence d'état des lieux établi contradictoirement et à l'amiable, il peut être établi par un huissier de justice, à l'initiative de la partie la plus diligente, à frais partagés par moitié entre le bailleur et le locataire.

J'ai donc mandaté Maître [NOM DE L'HUISSIER], huissier de justice à [VILLE], qui interviendra le {date_souhaitee} à [HEURE].

Je vous invite à être présent lors de cette intervention. En cas d'impossibilité, vous pouvez vous faire représenter par une personne de votre choix munie d'une procuration.

Je vous rappelle que les frais d'huissier seront partagés entre nous, conformément à la loi. L'huissier vous adressera directement sa facture pour votre part.

Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.`
      }
    }
  },
  notification_charges: {
    title: "Notification des charges",
    description: "Notification de régularisation des charges locatives",
    fields: [
      { name: "locataire_nom", label: "Nom du locataire", type: "text", placeholder: "Nom complet du locataire", required: true },
      { name: "adresse", label: "Adresse du logement", type: "textarea", placeholder: "Adresse complète du logement", required: true },
      { name: "periode", label: "Période concernée", type: "text", placeholder: "Exemple: Année 2024 ou Du 01/01/2024 au 31/12/2024", required: true },
      { name: "montant_provision", label: "Montant total des provisions versées", type: "number", placeholder: "Montant total des provisions versées sur la période", required: true },
      { name: "montant_reel", label: "Montant réel des charges", type: "number", placeholder: "Montant réel des charges sur la période", required: true },
      { name: "solde", label: "Solde de régularisation", type: "number", placeholder: "Différence entre provisions et charges réelles", required: true },
      { name: "delai_paiement", label: "Délai de paiement", type: "text", placeholder: "Exemple: 15 jours ou 1 mois", required: true }
    ],
    templates: {
      standard_2025: {
        title: "Standard 2025",
        content: `LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION

[COORDONNÉES DU LOCATAIRE]
{locataire_nom}
{adresse}

Objet : Notification de régularisation des charges locatives pour la période {periode}

{civility},

Conformément aux dispositions de l'article 23 de la loi n° 89-462 du 6 juillet 1989 et au décret n° 87-713 du 26 août 1987 applicables en 2025, je vous adresse la régularisation des charges locatives concernant votre logement situé {adresse} pour la période {periode}.

Récapitulatif de la régularisation :
- Montant total des provisions pour charges versées : {montant_provision} €
- Montant réel des charges récupérables : {montant_reel} €
- Solde de régularisation : {solde} €

Vous trouverez ci-joint le décompte détaillé par poste de charge, ainsi que les justificatifs correspondants.

[CHOISIR LA FORMULE APPROPRIÉE EN FONCTION DU SOLDE]

[Si le solde est en faveur du bailleur (charges réelles > provisions)]
Je vous prie de bien vouloir me faire parvenir la somme de {solde} € dans un délai de {delai_paiement} à compter de la réception de la présente notification. Ce paiement peut être effectué par [PRÉCISER LES MODALITÉS DE PAIEMENT].

[Si le solde est en faveur du locataire (provisions > charges réelles)]
Le trop-perçu de {solde} € sera [CHOISIR : déduit de votre prochain loyer / remboursé par virement bancaire sur votre compte / remboursé par chèque].

Conformément à l'article 23 de la loi du 6 juillet 1989, je tiens à votre disposition l'ensemble des pièces justificatives des charges pendant six mois à compter de l'envoi de cette régularisation. Vous pouvez les consulter à [PRÉCISER L'ADRESSE ET LES HORAIRES].

Je vous prie d'agréer, {civility}, l'expression de mes salutations distinguées.`
      },
      detail_2025: {
        title: "Détaillé 2025",
        content: `LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION

[COORDONNÉES DU LOCATAIRE]
{locataire_nom}
{adresse}

Objet : Notification détaillée de régularisation des charges locatives - Période {periode}

{civility},

Conformément aux dispositions de l'article 23 de la loi n° 89-462 du 6 juillet 1989 et au décret n° 87-713 du 26 août 1987 applicables en 2025, je vous adresse la régularisation des charges locatives concernant votre logement situé {adresse} pour la période {periode}.

DÉCOMPTE DÉTAILLÉ DES CHARGES :

1. Provisions pour charges versées :
   - Montant mensuel des provisions : [MONTANT] €
   - Nombre de mois sur la période : [NOMBRE]
   - Total des provisions versées : {montant_provision} €

2. Charges réelles récupérables :
   - Eau froide : [MONTANT] €
   - Eau chaude : [MONTANT] €
   - Chauffage collectif : [MONTANT] €
   - Électricité des parties communes : [MONTANT] €
   - Entretien des parties communes : [MONTANT] €
   - Ascenseur : [MONTANT] €
   - Interphone/Gardiennage : [MONTANT] €
   - Taxe d'enlèvement des ordures ménagères : [MONTANT] €
   - Entretien des espaces verts : [MONTANT] €
   - Autres charges récupérables : [MONTANT] €
   - Total des charges réelles : {montant_reel} €

3. Récapitulatif de la régularisation :
   - Montant total des provisions versées : {montant_provision} €
   - Montant réel des charges récupérables : {montant_reel} €
   - Solde de régularisation : {solde} €

[CHOISIR LA FORMULE APPROPRIÉE EN FONCTION DU SOLDE]

[Si le solde est en faveur du bailleur (charges réelles > provisions)]
Je vous prie de bien vouloir me faire parvenir la somme de {solde} € dans un délai de {delai_paiement} à compter de la réception de la présente notification. Ce paiement peut être effectué par [PRÉCISER LES MODALITÉS DE PAIEMENT].

[Si le solde est en faveur du locataire (provisions > charges réelles)]
Le trop-perçu de {solde} € sera [CHOISIR : déduit de votre prochain loyer / remboursé par virement bancaire sur votre compte / remboursé par chèque] dans un délai de [DÉLAI].

Conformément à l'article 23 de la loi du 6 juillet 1989, les pièces justificatives des charges (factures, contrats, etc.) sont tenues à votre disposition pendant une durée de six mois à compter de l'envoi de cette régularisation. Vous pouvez consulter ces documents à [PRÉCISER L'ADRESSE ET LES HORAIRES].

Pour toute question concernant cette régularisation, vous pouvez me contacter au [NUMÉRO DE TÉLÉPHONE] ou par email à [ADRESSE EMAIL].

Je vous prie d'agréer, {civility}, l'expression de mes salutations distinguées.`
      },
      rappel_2025: {
        title: "Rappel de justificatifs 2025",
        content: `LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION

[COORDONNÉES DU LOCATAIRE]
{locataire_nom}
{adresse}

Objet : Rappel concernant la mise à disposition des justificatifs de charges

Référence : Régularisation des charges pour la période {periode}

{civility},

Par courrier en date du [DATE DU COURRIER INITIAL], je vous ai adressé la régularisation des charges locatives concernant votre logement situé {adresse} pour la période {periode}.

Pour rappel, cette régularisation fait apparaître un solde de {solde} € [PRÉCISER : en votre faveur / en ma faveur].

Conformément à l'article 23 de la loi n° 89-462 du 6 juillet 1989, je souhaite vous rappeler que l'ensemble des pièces justificatives des charges (factures, contrats de maintenance, etc.) est tenu à votre disposition pour consultation pendant une durée de six mois à compter de l'envoi de la régularisation, soit jusqu'au [DATE LIMITE].

Vous pouvez consulter ces documents :
- Lieu : [ADRESSE]
- Jours et horaires : [PRÉCISER]
- Sur rendez-vous : [PRÉCISER LES MODALITÉS]

Je reste à votre disposition pour convenir d'un rendez-vous à votre convenance ou pour vous apporter toute précision complémentaire concernant cette régularisation.

En cas de difficulté, je vous invite à me contacter par téléphone au [NUMÉRO DE TÉLÉPHONE] ou par email à [ADRESSE EMAIL].

Je vous prie d'agréer, {civility}, l'expression de mes salutations distinguées.`
      }
    }
  },
  notification_quittance: {
    title: "Notification de quittance",
    description: "Notification d'émission de quittance de loyer",
    fields: [
      { name: "locataire_nom", label: "Nom du locataire", type: "text", placeholder: "Nom complet du locataire", required: true },
      { name: "adresse", label: "Adresse du logement", type: "textarea", placeholder: "Adresse complète du logement", required: true },
      { name: "periode", label: "Période concernée", type: "text", placeholder: "Exemple: Janvier 2025 ou 01/2025", required: true },
      { name: "montant_loyer", label: "Montant du loyer", type: "number", placeholder: "Montant du loyer hors charges", required: true },
      { name: "montant_charges", label: "Montant des charges", type: "number", placeholder: "Montant des charges locatives", required: true },
      { name: "montant_total", label: "Montant total", type: "number", placeholder: "Montant total (loyer + charges)", required: true },
      { name: "date_paiement", label: "Date de paiement", type: "date", placeholder: "Date à laquelle le paiement a été reçu", required: true }
    ],
    templates: {
      standard_2025: {
        title: "Standard 2025",
        content: `[COORDONNÉES DU BAILLEUR]
[Nom, Prénom]
[Adresse]
[Téléphone]
[Email]

QUITTANCE DE LOYER
Période : {periode}

Je soussigné(e) [NOM ET PRÉNOM DU BAILLEUR], propriétaire du logement situé {adresse}, déclare avoir reçu de {locataire_nom}, locataire dudit logement, la somme de {montant_total} € (en lettres : [MONTANT EN LETTRES]) correspondant au paiement du loyer et des charges pour la période de {periode}.

Détail des sommes versées :
- Loyer : {montant_loyer} €
- Provision sur charges : {montant_charges} €
- Total : {montant_total} €

Cette somme a été versée le {date_paiement} par [MODE DE PAIEMENT].

La présente quittance annule tous les reçus qui auraient pu être établis à titre provisoire pour les sommes ci-dessus.`
      },
      numerique_2025: {
        title: "Numérique 2025",
        content: `NOTIFICATION D'ÉMISSION DE QUITTANCE DE LOYER
PÉRIODE : {periode}

[COORDONNÉES DU BAILLEUR]
[Nom, Prénom]
[Adresse]
[Téléphone]
[Email]

À l'attention de :
{locataire_nom}
{adresse}

{civility},

Je vous informe que la quittance de loyer pour la période de {periode} concernant votre logement situé {adresse} est désormais disponible.

Cette quittance atteste le paiement de la somme totale de {montant_total} € reçue le {date_paiement}, correspondant à :
- Loyer : {montant_loyer} €
- Provision sur charges : {montant_charges} €

Conformément à l'article 21 de la loi n° 89-462 du 6 juillet 1989, et aux dispositions relatives à la dématérialisation des documents applicables en 2025, cette quittance :

[CHOISIR UNE DES OPTIONS SUIVANTES]

[Option 1 - Espace en ligne]
- Est accessible dans votre espace locataire en ligne à l'adresse suivante : [URL DE L'ESPACE LOCATAIRE]
- Peut être téléchargée en format PDF à partir de votre espace personnel
- Est archivée dans cet espace et restera accessible pendant une durée de [DURÉE DE CONSERVATION]

[Option 2 - Email]
- Est jointe à ce message au format PDF
- Devra être conservée par vos soins, ce document pouvant vous être demandé dans le cadre de démarches administratives

[Option 3 - Papier]
- Est jointe à ce courrier
- Vous est transmise en version papier conformément à votre demande du [DATE DE LA DEMANDE]

Pour toute question concernant cette quittance ou pour modifier vos préférences concernant les modalités de réception des quittances, n'hésitez pas à me contacter aux coordonnées indiquées ci-dessus.

Je vous prie d'agréer, {civility}, l'expression de mes salutations distinguées.`
      },
      recapitulatif_2025: {
        title: "Récapitulatif annuel 2025",
        content: `RÉCAPITULATIF ANNUEL DES QUITTANCES DE LOYER
ANNÉE 2025

[COORDONNÉES DU BAILLEUR]
[Nom, Prénom]
[Adresse]
[Téléphone]
[Email]

Locataire : {locataire_nom}
Adresse du logement : {adresse}

{civility},

Veuillez trouver ci-dessous le récapitulatif des loyers et charges acquittés pour l'année 2025 concernant le logement que vous occupez à l'adresse mentionnée ci-dessus.

DÉTAIL DES PAIEMENTS MENSUELS :

Janvier 2025 :
- Loyer : [MONTANT] €
- Charges : [MONTANT] €
- Total : [MONTANT] €
- Date de paiement : [DATE]

Février 2025 :
- Loyer : [MONTANT] €
- Charges : [MONTANT] €
- Total : [MONTANT] €
- Date de paiement : [DATE]

[POURSUIVRE AVEC LES AUTRES MOIS...]

RÉCAPITULATIF ANNUEL :
- Montant total des loyers versés : [MONTANT] €
- Montant total des provisions pour charges : [MONTANT] €
- Montant total versé : [MONTANT] €

Ce document récapitulatif vous est délivré conformément à l'article 21 de la loi n° 89-462 du 6 juillet 1989 et peut être utilisé pour vos démarches administratives, notamment fiscales.`
      }
    }
  },
  demande_regularisation_charges: {
    title: "Demande de régularisation des charges",
    description: "Lettre de demande de régularisation des charges locatives",
    fields: [
      { name: "bailleur_nom", label: "Nom du bailleur", type: "text", placeholder: "Nom complet du bailleur", required: true },
      { name: "adresse", label: "Adresse du logement", type: "textarea", placeholder: "Adresse complète du logement", required: true },
      { name: "periode", label: "Période concernée", type: "text", placeholder: "Exemple: Année 2024 ou Du 01/01/2024 au 31/12/2024", required: true },
      { name: "delai_reponse", label: "Délai de réponse", type: "text", placeholder: "Exemple: 15 jours ou 1 mois", required: true }
    ],
    templates: {
      standard_2025: {
        title: "Standard 2025",
        content: `LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION

[COORDONNÉES DU BAILLEUR]
{bailleur_nom}
[Adresse du bailleur]

Objet : Demande de régularisation des charges locatives pour la période {periode}

{civility},

Locataire du logement situé {adresse} depuis le [DATE D'ENTRÉE], je vous adresse ce courrier concernant la régularisation des charges locatives pour la période {periode}.

Conformément à l'article 23 de la loi n° 89-462 du 6 juillet 1989 applicable en 2025, le bailleur est tenu de procéder à la régularisation des charges au moins une fois par an. Or, à ce jour, je n'ai pas reçu le décompte de régularisation des charges pour la période mentionnée.

Par conséquent, je vous prie de bien vouloir m'adresser, dans un délai de {delai_reponse} à compter de la réception de la présente, le décompte détaillé des charges récupérables ainsi que les justificatifs correspondants.

Je vous rappelle que, selon les dispositions légales, le locataire dispose d'un délai de six mois pour consulter les pièces justificatives à partir de l'envoi du décompte de régularisation.

Dans l'attente de votre réponse, je vous prie d'agréer, {civility}, l'expression de mes salutations distinguées.`
      },
      avec_justificatifs_2025: {
        title: "Avec demande de justificatifs 2025",
        content: `LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION

[COORDONNÉES DU BAILLEUR]
{bailleur_nom}
[Adresse du bailleur]

Objet : Demande de régularisation des charges et accès aux justificatifs pour la période {periode}

{civility},

Locataire du logement situé {adresse} depuis le [DATE D'ENTRÉE], je vous adresse ce courrier concernant la régularisation des charges locatives pour la période {periode}.

Conformément à l'article 23 de la loi n° 89-462 du 6 juillet 1989 applicable en 2025, le bailleur est tenu de procéder à la régularisation des charges au moins une fois par an, en communiquant au locataire un décompte par nature de charges ainsi que, dans les immeubles collectifs, le mode de répartition entre les locataires.

À ce jour, je n'ai toujours pas reçu :
- Le décompte détaillé de régularisation des charges pour la période {periode}
- La répartition entre les locataires (pour les immeubles collectifs)
- L'accès aux pièces justificatives correspondantes

Par conséquent, je vous demande de bien vouloir :
1. M'adresser dans un délai de {delai_reponse} le décompte détaillé des charges récupérables
2. Me communiquer les modalités d'accès aux pièces justificatives (factures, contrats d'entretien, etc.)
3. M'indiquer, le cas échéant, les dates et horaires auxquels je pourrai consulter ces documents

Je vous rappelle que, selon la jurisprudence établie, l'absence de justificatifs ou l'impossibilité pour le locataire d'y accéder peut entraîner l'annulation des charges réclamées.

Dans l'attente de votre réponse, je vous prie d'agréer, {civility}, l'expression de mes salutations distinguées.`
      },
      contestation_2025: {
        title: "Contestation de charges 2025",
        content: `LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION

[COORDONNÉES DU BAILLEUR]
{bailleur_nom}
[Adresse du bailleur]

Objet : Contestation de la régularisation des charges de la période {periode}

Référence : Votre décompte de régularisation en date du [DATE DU DÉCOMPTE]

{civility},

Locataire du logement situé {adresse}, j'ai reçu en date du [DATE DE RÉCEPTION] votre décompte de régularisation des charges pour la période {periode}.

Après examen attentif de ce décompte et des pièces justificatives que j'ai pu consulter le [DATE DE CONSULTATION], je me vois contraint de contester cette régularisation pour les raisons suivantes :

[CHOISIR ET DÉVELOPPER LES MOTIFS DE CONTESTATION APPROPRIÉS]

1. Des charges non récupérables ont été indûment imputées :
   - [PRÉCISER LES CHARGES CONTESTÉES ET LES MONTANTS]
   - [PRÉCISER LA BASE LÉGALE DE LA CONTESTATION]

2. Les justificatifs fournis sont incomplets ou insuffisants :
   - [PRÉCISER LES POSTES CONCERNÉS]
   - [PRÉCISER LES DOCUMENTS MANQUANTS]

3. La répartition des charges entre locataires n'est pas conforme aux critères légaux :
   - [PRÉCISER LES ANOMALIES CONSTATÉES]
   - [RAPPELER LES CRITÈRES LÉGAUX APPLICABLES]

4. Erreurs de calcul constatées :
   - [DÉTAILLER LES ERREURS]

Conformément à l'article 23 de la loi n° 89-462 du 6 juillet 1989 et à la jurisprudence applicable en 2025, je vous demande de procéder à une nouvelle régularisation en tenant compte des éléments contestés ci-dessus, et ce dans un délai de {delai_reponse}.

Dans l'attente de votre réponse, je vous prie d'agréer, {civility}, l'expression de mes salutations distinguées.`
      }
    }
  },
  notification_revision_loyer: {
    title: "Notification de révision de loyer",
    description: "Notification d'une révision de loyer basée sur l'IRL",
    fields: [
      { name: "locataire_nom", label: "Nom du locataire", type: "text", placeholder: "Nom complet du locataire", required: true },
      { name: "adresse", label: "Adresse du logement", type: "textarea", placeholder: "Adresse complète du logement", required: true },
      { name: "date_signature", label: "Date de signature du bail", type: "date", placeholder: "Date de signature du bail initial", required: true },
      { name: "date_revision", label: "Date de révision", type: "date", placeholder: "Date à laquelle le nouveau loyer s'appliquera", required: true },
      { name: "loyer_actuel", label: "Loyer actuel", type: "number", placeholder: "Montant du loyer actuel hors charges", required: true },
      { name: "trimestre_irl", label: "Trimestre de référence IRL", type: "select", options: ["1er trimestre", "2ème trimestre", "3ème trimestre", "4ème trimestre"], placeholder: "Trimestre de référence de l'IRL", required: true },
      { name: "annee_irl", label: "Année de référence IRL", type: "text", placeholder: "Année de référence de l'IRL", required: true },
      { name: "valeur_irl", label: "Valeur de l'IRL", type: "number", placeholder: "Valeur de l'indice de référence des loyers", required: true },
      { name: "nouveau_loyer", label: "Nouveau loyer", type: "number", placeholder: "Montant du nouveau loyer après révision", required: true }
    ],
    templates: {
      standard_2025: {
        title: "Standard 2025",
        content: `LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION

[COORDONNÉES DU LOCATAIRE]
{locataire_nom}
{adresse}

Objet : Notification de révision annuelle de loyer

{civility},

Je vous informe par la présente que, conformément aux dispositions de l'article 17-1 de la loi n° 89-462 du 6 juillet 1989 et aux clauses du contrat de bail que nous avons signé le {date_signature}, je procède à la révision annuelle du loyer de votre logement situé {adresse}.

Cette révision est basée sur l'Indice de Référence des Loyers (IRL) publié par l'INSEE selon les modalités suivantes :

- Loyer actuel : {loyer_actuel} €
- Indice de référence des loyers du {trimestre_irl} {annee_irl} : {valeur_irl}
- Indice de référence des loyers précédent applicable : [VALEUR DE L'INDICE PRÉCÉDENT]
- Variation de l'indice : [POURCENTAGE DE VARIATION] %

Le calcul de révision est le suivant :
{loyer_actuel} € × {valeur_irl} / [VALEUR DE L'INDICE PRÉCÉDENT] = {nouveau_loyer} €

En conséquence, votre nouveau loyer mensuel sera de {nouveau_loyer} € à compter du {date_revision}.

Je vous rappelle que cette révision est strictement encadrée par la loi et qu'elle respecte le plafonnement à la variation de l'IRL.

Votre prochain loyer à payer, à échéance du [DATE DU PROCHAIN LOYER], sera donc de {nouveau_loyer} € hors charges.

Pour toute question concernant cette révision, je reste à votre disposition.

Je vous prie d'agréer, {civility}, l'expression de mes salutations distinguées.`
      },
      detaille_2025: {
        title: "Détaillé avec explication 2025",
        content: `LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION

[COORDONNÉES DU LOCATAIRE]
{locataire_nom}
{adresse}

Objet : Notification détaillée de révision de loyer - Application de l'IRL

{civility},

En ma qualité de bailleur du logement que vous occupez situé {adresse}, je vous informe par la présente de la révision annuelle de votre loyer, conformément :
- À l'article 17-1 de la loi n° 89-462 du 6 juillet 1989 modifiée
- À la clause de révision stipulée dans votre contrat de bail signé le {date_signature}

INFORMATIONS RELATIVES À CETTE RÉVISION :

1. Base légale :
   La révision annuelle du loyer est encadrée par la loi et ne peut excéder la variation de l'Indice de Référence des Loyers (IRL) publié par l'INSEE. Cet indice correspond à la moyenne, sur les douze derniers mois, de l'évolution des prix à la consommation hors tabac et hors loyers.

2. Indices applicables :
   - Dernier indice publié à la date de signature du bail : [VALEUR] ({trimestre_irl} [ANNÉE])
   - Indice actuel applicable ({trimestre_irl} {annee_irl}) : {valeur_irl}
   - Taux de variation entre ces deux indices : [POURCENTAGE] %

3. Calcul détaillé :
   - Loyer actuel : {loyer_actuel} €
   - Formule de calcul : Loyer actuel × (Indice actuel / Indice précédent)
   - Calcul : {loyer_actuel} € × {valeur_irl} / [VALEUR DE L'INDICE PRÉCÉDENT] = {nouveau_loyer} €

4. Application :
   - Nouveau montant du loyer mensuel : {nouveau_loyer} €
   - Date d'application : {date_revision}
   - Montant total mensuel à payer (loyer + provisions pour charges) : [MONTANT TOTAL] €

J'attire votre attention sur le fait que cette révision :
- Est conforme à la réglementation en vigueur en 2025
- N'est pas une augmentation contractuelle mais une simple actualisation du loyer suivant l'évolution du coût de la vie
- S'applique automatiquement sans qu'il soit nécessaire de conclure un avenant au bail

Pour toute question concernant cette révision ou pour obtenir des précisions sur le calcul, je reste à votre disposition aux coordonnées indiquées en tête de ce courrier.

Je vous prie d'agréer, {civility}, l'expression de mes salutations distinguées.`
      },
      gel_irl_2025: {
        title: "Gel partiel IRL 2025",
        content: `LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION

[COORDONNÉES DU LOCATAIRE]
{locataire_nom}
{adresse}

Objet : Notification de révision de loyer avec application du plafonnement 2025

{civility},

En ma qualité de bailleur du logement que vous occupez situé {adresse}, je vous informe par la présente de la révision annuelle de votre loyer.

Conformément aux dispositions de l'article 17-1 de la loi n° 89-462 du 6 juillet 1989 et aux mesures de plafonnement applicables en 2025 [PRÉCISER LA RÉFÉRENCE LÉGALE], j'ai le devoir de vous informer des éléments suivants :

1. Données de référence :
   - Loyer actuel : {loyer_actuel} €
   - Indice de référence des loyers (IRL) du {trimestre_irl} {annee_irl} : {valeur_irl}
   - Plafond légal de variation applicable : [POURCENTAGE DU PLAFOND] %

2. Application du dispositif de plafonnement :
   Bien que la variation de l'IRL s'établisse à [POURCENTAGE DE L'IRL] %, le plafonnement applicable limite l'augmentation à [POURCENTAGE DU PLAFOND] % maximum.

3. Calcul du nouveau loyer :
   {loyer_actuel} € × (1 + [POURCENTAGE RETENU]/100) = {nouveau_loyer} €

En conséquence, votre nouveau loyer mensuel hors charges sera de {nouveau_loyer} € à compter du {date_revision}.

Je vous rappelle que cette révision est effectuée dans le strict respect des dispositions légales en vigueur et que le plafonnement appliqué vise à protéger le pouvoir d'achat des locataires dans le contexte économique actuel.

Pour toute question concernant cette révision, je reste à votre disposition.

Je vous prie d'agréer, {civility}, l'expression de mes salutations distinguées.`
      }
    }
  },
  demande_renouvellement_bail: {
    title: "Demande de renouvellement de bail",
    description: "Lettre de demande de renouvellement du contrat de location",
    fields: [
      { name: "bailleur_nom", label: "Nom du bailleur", type: "text", placeholder: "Nom complet du bailleur", required: true },
      { name: "adresse", label: "Adresse du logement", type: "textarea", placeholder: "Adresse complète du logement", required: true },
      { name: "date_fin_bail", label: "Date de fin du bail", type: "date", placeholder: "Date d'expiration du bail actuel", required: true },
      { name: "date_entree", label: "Date d'entrée dans les lieux", type: "date", placeholder: "Date d'entrée dans le logement", required: true },
      { name: "duree_bail", label: "Durée souhaitée du bail", type: "select", options: ["3 ans", "6 ans", "Autre"], placeholder: "Durée du nouveau bail", required: true },
      { name: "delai_reponse", label: "Délai de réponse", type: "text", placeholder: "Exemple: 15 jours ou 1 mois", required: true }
    ],
    templates: {
      standard_2025: {
        title: "Standard 2025",
        content: `LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION

[COORDONNÉES DU BAILLEUR]
{bailleur_nom}
[Adresse du bailleur]

Objet : Demande de renouvellement du contrat de bail arrivant à échéance le {date_fin_bail}

{civility},

Locataire du logement situé {adresse} depuis le {date_entree}, je vous adresse la présente en vue du renouvellement de mon contrat de bail qui arrive à échéance le {date_fin_bail}.

Conformément aux dispositions de la loi n° 89-462 du 6 juillet 1989 applicable en 2025, je souhaite vous faire part de mon intention de poursuivre la location de ce logement pour une nouvelle période de {duree_bail}.

Ce logement correspondant parfaitement à mes besoins, je souhaite donc continuer à y résider aux conditions actuelles du bail, sauf mention expresse contraire dans votre réponse.

Je vous serais reconnaissant(e) de bien vouloir me confirmer votre accord pour ce renouvellement, idéalement par écrit, dans un délai de {delai_reponse}, afin que nous puissions organiser la signature du nouveau contrat dans les meilleures conditions.

Dans l'attente de votre réponse, je vous prie d'agréer, {civility}, l'expression de mes salutations distinguées.`
      },
      proposition_amelioration_2025: {
        title: "Avec proposition d'amélioration 2025",
        content: `LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION

[COORDONNÉES DU BAILLEUR]
{bailleur_nom}
[Adresse du bailleur]

Objet : Demande de renouvellement de bail avec propositions d'améliorations

{civility},

Locataire du logement situé {adresse} depuis le {date_entree}, je me permets de vous contacter concernant mon bail d'habitation qui arrive à échéance le {date_fin_bail}.

Par la présente, je souhaite vous faire part de mon intention de renouveler ce contrat pour une nouvelle période de {duree_bail}.

Durant ces années d'occupation, j'ai pris grand soin du logement et j'ai pu constater certains points qui mériteraient d'être améliorés pour optimiser son confort et sa performance énergétique. Je me permets donc de vous soumettre les propositions suivantes à l'occasion de ce renouvellement :

[CHOISIR ET DÉVELOPPER LES PROPOSITIONS PERTINENTES]

1. Travaux d'amélioration énergétique :
   - [DÉTAILLER : isolation, changement de fenêtres, système de chauffage, etc.]
   - Ces améliorations permettraient de réduire la consommation énergétique et s'inscrivent dans le cadre des objectifs de rénovation énergétique fixés par la loi.

2. Remise en état :
   - [DÉTAILLER : peinture, revêtements, équipements sanitaires, etc.]
   - Ces éléments présentent une usure normale après plusieurs années d'occupation.

3. Modernisation d'équipements :
   - [DÉTAILLER : cuisine, salle de bain, équipements électriques, etc.]
   - Ces mises à jour valoriseraient votre bien immobilier.

Je suis naturellement ouvert(e) à discuter de la répartition des coûts et des modalités pratiques de réalisation de ces travaux, en tenant compte du cadre légal applicable en 2025.

Je vous propose d'organiser une visite du logement à votre convenance pour constater ensemble ces points et échanger sur ces propositions.

Je vous remercie de bien vouloir me faire part de votre position concernant ce renouvellement et ces propositions dans un délai de {delai_reponse}.

Dans l'attente de votre réponse, je vous prie d'agréer, {civility}, l'expression de mes salutations distinguées.`
      },
      negociation_loyer_2025: {
        title: "Négociation de loyer 2025",
        content: `LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION

[COORDONNÉES DU BAILLEUR]
{bailleur_nom}
[Adresse du bailleur]

Objet : Demande de renouvellement de bail avec réexamen du loyer

{civility},

Locataire du logement situé {adresse} depuis le {date_entree}, je vous informe par la présente de mon souhait de renouveler mon contrat de bail qui arrive à échéance le {date_fin_bail}.

Conformément aux dispositions de l'article 17-2 de la loi n° 89-462 du 6 juillet 1989 modifiée applicable en 2025, je me permets de vous proposer un réexamen du montant du loyer à l'occasion de ce renouvellement.

En effet, après une étude attentive des loyers pratiqués dans le quartier pour des logements comparables, j'ai constaté que le loyer actuel de [MONTANT ACTUEL] € se situe au-dessus du loyer de référence pour des biens similaires, qui s'établit entre [FOURCHETTE BASSE] € et [FOURCHETTE HAUTE] € selon [SOURCE DE L'INFORMATION : observatoire des loyers, annonces, etc.].

À l'appui de cette demande, je vous communique les éléments suivants :
- Exemples de loyers pratiqués dans le voisinage pour des logements comparables : [DÉTAILS ET SOURCES]
- Caractéristiques prises en compte dans cette comparaison : superficie, étage, état du logement, prestations, etc.

Par conséquent, je vous propose de fixer le loyer du logement à [MONTANT PROPOSÉ] € mensuel hors charges à compter du renouvellement du bail.

Cette demande s'appuie sur les dispositions légales visant à assurer une fixation des loyers en cohérence avec le marché locatif local, tout en préservant l'équilibre de nos relations contractuelles.

Je vous serais reconnaissant(e) de bien vouloir me faire part de votre position sur cette proposition dans un délai de {delai_reponse}, afin que nous puissions engager, le cas échéant, une discussion constructive sur ce sujet.

Dans l'attente de votre réponse, je vous prie d'agréer, {civility}, l'expression de mes salutations distinguées.`
      }
    }
  },
  notification_depart_locataire: {
    title: "Notification de départ du locataire",
    description: "Notification par le bailleur du départ du locataire",
    fields: [
      { name: "locataire_nom", label: "Nom du locataire", type: "text", placeholder: "Nom complet du locataire", required: true },
      { name: "adresse", label: "Adresse du logement", type: "textarea", placeholder: "Adresse complète du logement", required: true },
      { name: "date_reception_conge", label: "Date de réception du congé", type: "date", placeholder: "Date de réception de la lettre de congé", required: true },
      { name: "date_fin_bail", label: "Date de fin de bail", type: "date", placeholder: "Date effective de fin du bail", required: true },
      { name: "date_etat_lieux", label: "Date proposée pour l'état des lieux", type: "date", placeholder: "Date proposée pour l'état des lieux de sortie", required: true },
      { name: "heure_etat_lieux", label: "Heure proposée", type: "text", placeholder: "Heure proposée pour l'état des lieux", required: true }
    ],
    templates: {
      standard_2025: {
        title: "Standard 2025",
        content: `LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION

[COORDONNÉES DU LOCATAIRE]
{locataire_nom}
{adresse}

Objet : Confirmation de réception de votre congé et modalités de sortie

{civility},

Je vous confirme avoir bien reçu votre lettre de congé en date du {date_reception_conge} pour le logement que vous occupez actuellement situé {adresse}.

Conformément aux dispositions légales et aux termes de votre préavis, la date effective de fin de bail est fixée au {date_fin_bail}.

Pour organiser votre départ dans les meilleures conditions, je vous propose de procéder à l'état des lieux de sortie le {date_etat_lieux} à {heure_etat_lieux}. Pourriez-vous me confirmer vos disponibilités pour cette date ou, le cas échéant, me proposer un autre moment qui vous conviendrait mieux dans les jours précédant ou suivant immédiatement la fin du bail ?

Je vous rappelle que l'état des lieux de sortie doit être réalisé en votre présence et qu'il sera comparé à l'état des lieux d'entrée. Le logement devra être entièrement vidé de vos effets personnels, propre et en bon état d'entretien.

Lors de cet état des lieux, je vous demanderai de me remettre l'ensemble des clés en votre possession (appartement, boîte aux lettres, cave, etc.).

Voici également quelques points à vérifier avant votre départ :
- Résiliation de vos contrats d'électricité, de gaz, d'eau et d'internet
- Changement d'adresse auprès des différents organismes (La Poste, etc.)
- Nettoyage complet du logement
- Réparation des éventuelles dégradations

Concernant votre dépôt de garantie, je vous informe qu'il vous sera restitué dans un délai d'un mois à compter de la remise des clés, déduction faite, le cas échéant, des sommes justifiées dues au titre des loyers, charges, réparations locatives ou dégradations.

Pour faciliter ce remboursement, je vous invite à me communiquer votre nouvelle adresse ainsi que vos coordonnées bancaires (RIB).

Pour toute question relative à votre départ, n'hésitez pas à me contacter aux coordonnées suivantes : [COORDONNÉES DU BAILLEUR].

Je vous prie d'agréer, {civility}, l'expression de mes salutations distinguées.`
      },
      rappel_obligations_2025: {
        title: "Rappel des obligations 2025",
        content: `LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION

[COORDONNÉES DU LOCATAIRE]
{locataire_nom}
{adresse}

Objet : Accusé de réception de congé et rappel des obligations de fin de bail

{civility},

Suite à votre congé reçu le {date_reception_conge} concernant le logement situé {adresse}, je vous confirme que votre bail prendra fin le {date_fin_bail}.

Afin que cette transition se déroule dans les meilleures conditions, je tiens à vous rappeler vos obligations lors de la restitution du logement, conformément aux dispositions légales et au contrat de bail :

1. État du logement à la restitution :
   • Le logement doit être restitué propre et en bon état d'usage
   • Les réparations locatives sont à votre charge (décret n° 87-712 du 26 août 1987)
   • Toute dégradation constatée et non imputable à la vétusté pourra être déduite du dépôt de garantie

2. Démarches administratives à effectuer :
   • Résiliation des contrats de fourniture d'énergie (électricité, gaz)
   • Résiliation du contrat d'eau
   • Transfert ou résiliation de vos contrats d'assurance et d'abonnements
   • Changement d'adresse auprès des services postaux et administratifs

3. État des lieux de sortie :
   Je vous propose de réaliser l'état des lieux de sortie le {date_etat_lieux} à {heure_etat_lieux}.
   Merci de me confirmer votre disponibilité ou de me proposer une autre date proche de la fin du bail.

4. Documents et éléments à remettre lors de l'état des lieux :
   • L'ensemble des clés (appartement, boîte aux lettres, garage, cave, etc.)
   • Les télécommandes éventuelles (portail, garage, etc.)
   • Votre nouvelle adresse pour l'envoi de tout courrier ultérieur
   • Un RIB pour la restitution du dépôt de garantie

5. Régularisation financière :
   • Les charges locatives feront l'objet d'une régularisation au plus tard dans le mois suivant la fin du bail
   • Le dépôt de garantie vous sera restitué dans le délai légal d'un mois, déduction faite des sommes éventuellement dues

Je vous remercie de bien vouloir respecter ces obligations afin que la fin de notre relation contractuelle se déroule dans les meilleures conditions.

Pour toute question, vous pouvez me contacter au [NUMÉRO DE TÉLÉPHONE] ou par email à [ADRESSE EMAIL].

Je vous prie d'agréer, {civility}, l'expression de mes salutations distinguées.`
      },
      fin_anticipee_2025: {
        title: "Fin anticipée 2025",
        content: `LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION

[COORDONNÉES DU LOCATAIRE]
{locataire_nom}
{adresse}

Objet : Acceptation de votre demande de départ anticipé

{civility},

Je fais suite à votre courrier du {date_reception_conge} par lequel vous m'informez de votre souhait de quitter le logement situé {adresse} avant la fin de votre préavis légal.

Bien que le délai de préavis applicable à votre situation soit de [DURÉE DU PRÉAVIS LÉGAL] conformément à l'article 15 de la loi n° 89-462 du 6 juillet 1989, j'accepte exceptionnellement votre proposition de libérer les lieux de manière anticipée le {date_fin_bail}.

Cet accord est conditionné au respect des points suivants :
- Le logement devra être rendu en bon état d'usage et de propreté
- Toutes les obligations du locataire devront être respectées jusqu'à la date de départ
- Le loyer et les charges seront dus jusqu'à la date effective de sortie

Je vous propose de procéder à l'état des lieux de sortie le {date_etat_lieux} à {heure_etat_lieux}. Merci de me confirmer votre disponibilité pour cette date.

[OPTION - SI UN NOUVEAU LOCATAIRE EST DÉJÀ TROUVÉ]
Par ailleurs, je vous informe qu'un nouveau locataire occupera le logement à compter du [DATE D'ENTRÉE DU NOUVEAU LOCATAIRE]. Je vous remercie de faciliter, dans la mesure du possible, les éventuelles visites qui pourraient être nécessaires pour assurer cette transition.

[OPTION - SI UN NOUVEAU LOCATAIRE N'EST PAS ENCORE TROUVÉ]
Afin de trouver rapidement un nouveau locataire et conformément à l'article 4 de la loi du 6 juillet 1989, je vous rappelle que vous devez me permettre de faire visiter le logement, en votre présence, à des jours et heures convenus ensemble, à raison de deux heures par jour pendant les jours ouvrables.

Pour la bonne organisation de la fin de bail, je vous invite à me communiquer dès que possible :
- Votre nouvelle adresse
- Un RIB pour la restitution du dépôt de garantie
- Vos disponibilités pour les éventuelles visites du logement par des candidats locataires

Je vous remercie pour votre compréhension et votre coopération.

Je vous prie d'agréer, {civility}, l'expression de mes salutations distinguées.`
      }
    }
  },
  renouvellement_bail: {
    title: "Renouvellement de bail",
    description: "Proposition de renouvellement du contrat de location",
    fields: [
      { name: "locataire_nom", label: "Nom du locataire", type: "text", placeholder: "Nom complet du locataire", required: true },
      { name: "adresse", label: "Adresse du logement", type: "textarea", placeholder: "Adresse complète du logement", required: true },
      { name: "date_fin_bail", label: "Date de fin du bail actuel", type: "date", placeholder: "Date de fin du bail en cours", required: true },
      { name: "date_debut_nouveau", label: "Date de début du nouveau bail", type: "date", placeholder: "Date de début du nouveau bail", required: true },
      { name: "duree_bail", label: "Durée du nouveau bail", type: "select", options: ["3 ans", "6 ans", "9 ans"], placeholder: "Durée du nouveau bail", required: true },
      { name: "loyer_actuel", label: "Loyer actuel", type: "number", placeholder: "Montant du loyer actuel", required: true },
      { name: "nouveau_loyer", label: "Nouveau loyer proposé", type: "number", placeholder: "Montant du nouveau loyer proposé", required: false },
      { name: "delai_reponse", label: "Délai de réponse", type: "text", placeholder: "Délai de réponse souhaité", required: true }
    ],
    templates: {
      standard_2025: {
        title: "Standard 2025",
        content: `LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION

[COORDONNÉES DU LOCATAIRE]
{locataire_nom}
{adresse}

Objet : Proposition de renouvellement de bail

{civility},

Votre contrat de location pour le logement situé {adresse} arrivant à échéance le {date_fin_bail}, j'ai le plaisir de vous proposer son renouvellement conformément aux dispositions de la loi n° 89-462 du 6 juillet 1989 modifiée et applicable en 2025.

Je vous propose de renouveler votre bail pour une durée de {duree_bail} à compter du {date_debut_nouveau}, aux conditions suivantes :

- Durée du bail : {duree_bail}
- Loyer mensuel hors charges : {loyer_actuel} € [OU {nouveau_loyer} € si un nouveau montant est proposé]
- Provisions pour charges : [MONTANT] € par mois
- Dépôt de garantie : [MONTANT] € (inchangé)
- Clause de révision annuelle : selon l'Indice de Référence des Loyers (IRL)

[SI LE LOYER EST MODIFIÉ]
Cette proposition de modification du loyer est fondée sur les éléments suivants :
- Loyers habituellement pratiqués dans le voisinage pour des logements comparables
- Améliorations apportées au logement depuis la conclusion du bail initial
- [AUTRES JUSTIFICATIONS]

Conformément à l'article 17-2 de la loi du 6 juillet 1989, vous disposez d'un délai de réflexion de {delai_reponse} à compter de la réception de cette proposition pour me faire connaître votre réponse.

En l'absence de réponse dans ce délai, vous serez réputé(e) avoir accepté cette proposition de renouvellement.

Si vous acceptez cette proposition, un nouveau contrat vous sera soumis pour signature prochainement.

Je reste à votre disposition pour toute question relative à cette proposition de renouvellement et vous prie d'agréer, {civility}, l'expression de mes salutations distinguées.

Fait à ____________________, le ____________________

Signature`
      },
      memes_conditions_2025: {
        title: "Mêmes conditions 2025",
        content: `LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION

[COORDONNÉES DU LOCATAIRE]
{locataire_nom}
{adresse}

Objet : Proposition de renouvellement de bail aux mêmes conditions

{civility},

J'ai le plaisir de vous informer que votre contrat de location pour le logement situé {adresse}, qui arrive à échéance le {date_fin_bail}, peut être renouvelé aux mêmes conditions financières et contractuelles.

Conformément aux dispositions de la loi n° 89-462 du 6 juillet 1989 modifiée et applicable en 2025, je vous propose donc de renouveler votre bail pour une nouvelle période de {duree_bail} à compter du {date_debut_nouveau}.

Les conditions financières resteront inchangées :
- Loyer mensuel hors charges : {loyer_actuel} €
- Provisions pour charges : [MONTANT] € par mois

Le loyer continuera d'être révisé annuellement selon l'évolution de l'Indice de Référence des Loyers (IRL), conformément à la clause de révision prévue dans le bail initial.

Je vous invite à me faire connaître votre décision dans un délai de {delai_reponse}. En l'absence de réponse de votre part, et conformément à l'article 10 de la loi du 6 juillet 1989, le bail sera tacitement reconduit aux conditions actuelles.

Si vous souhaitez renouveler expressément votre bail, je vous propose de signer un avenant au contrat initial afin d'actualiser certaines clauses conformément aux évolutions législatives récentes.

Je vous prie d'agréer, {civility}, l'expression de mes salutations distinguées.`
      },
      avec_travaux_2025: {
        title: "Avec travaux 2025",
        content: `LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION

[COORDONNÉES DU LOCATAIRE]
{locataire_nom}
{adresse}

Objet : Proposition de renouvellement de bail avec réalisation de travaux

{civility},

Dans le cadre du renouvellement de votre contrat de location pour le logement situé {adresse}, arrivant à échéance le {date_fin_bail}, je vous propose un renouvellement pour une durée de {duree_bail} à compter du {date_debut_nouveau}.

À cette occasion, je souhaite vous informer de mon intention de réaliser les travaux d'amélioration suivants dans le logement :
[DESCRIPTION DÉTAILLÉE DES TRAVAUX PRÉVUS]

Ces travaux présentent les avantages suivants pour votre confort et la qualité du logement :
- Amélioration de la performance énergétique
- Modernisation des équipements
- [AUTRES AVANTAGES]

Le calendrier prévisionnel de ces travaux est le suivant :
- Date de début : [DATE]
- Durée estimée : [DURÉE]
- Impact sur l'occupation : [PRÉCISER]

Je vous confirme que ces travaux seront réalisés en minimisant les désagréments pour vous, et en respectant les conditions d'accès au logement prévues par la loi.

Le loyer actuel de {loyer_actuel} € sera maintenu [OU : porté à {nouveau_loyer} € compte tenu de l'amélioration significative apportée au logement].

Je vous invite à me faire connaître votre décision concernant cette proposition de renouvellement avec travaux dans un délai de {delai_reponse}.

Je reste à votre disposition pour échanger sur les modalités pratiques de ces travaux et vous prie d'agréer, {civility}, l'expression de mes salutations distinguées.`
      }
    }
  },
  augmentation_loyer: {
    title: "Augmentation de loyer",
    description: "Proposition d'augmentation de loyer lors du renouvellement",
    fields: [
      { name: "locataire_nom", label: "Nom du locataire", type: "text", placeholder: "Nom complet du locataire", required: true },
      { name: "adresse", label: "Adresse du logement", type: "textarea", placeholder: "Adresse complète du logement", required: true },
      { name: "date_fin_bail", label: "Date de fin du bail actuel", type: "date", placeholder: "Date d'échéance du bail actuel", required: true },
      { name: "loyer_actuel", label: "Loyer actuel", type: "number", placeholder: "Montant du loyer actuel", required: true },
      { name: "nouveau_loyer", label: "Nouveau loyer proposé", type: "number", placeholder: "Montant du nouveau loyer proposé", required: true },
      { name: "loyer_reference", label: "Loyer de référence", type: "number", placeholder: "Montant du loyer de référence", required: true },
      { name: "justification", label: "Justification", type: "textarea", placeholder: "Justification détaillée de l'augmentation", required: true },
      { name: "date_application", label: "Date d'application", type: "date", placeholder: "Date d'application du nouveau loyer", required: true },
      { name: "delai_reponse", label: "Délai de réponse", type: "text", placeholder: "Délai accordé pour la réponse", required: true }
    ],
    templates: {
      standard_2025: {
        title: "Standard 2025",
        content: `LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION

[COORDONNÉES DU LOCATAIRE]
{locataire_nom}
{adresse}

Objet : Proposition d'augmentation de loyer lors du renouvellement du bail

{civility},

Votre contrat de location pour le logement situé {adresse} arrivant à échéance le {date_fin_bail}, je vous informe, conformément à l'article 17-2 de la loi n° 89-462 du 6 juillet 1989 modifiée et applicable en 2025, que je souhaite procéder à une réévaluation du montant de votre loyer lors de son renouvellement.

En effet, le loyer actuel de {loyer_actuel} € est manifestement sous-évalué par rapport aux loyers habituellement constatés dans le voisinage pour des logements comparables, qui s'établissent en moyenne à {loyer_reference} €.

Je vous propose donc de fixer le nouveau loyer mensuel à {nouveau_loyer} €, soit une augmentation de [POURCENTAGE] %, à compter du {date_application}.

Cette proposition est justifiée par les éléments suivants :
{justification}

En application de l'article 17-2 de la loi du 6 juillet 1989, cette augmentation sera appliquée progressivement au cours du bail renouvelé :
- 1/2 de l'augmentation à la date de renouvellement
- 1/2 de l'augmentation un an après la date de renouvellement

Conformément à la loi, vous disposez d'un délai de {delai_reponse} à compter de la réception de cette proposition pour me faire connaître votre réponse.

En l'absence d'accord entre nous, le contrat de location sera renouvelé aux conditions antérieures de loyer. Néanmoins, je conserverai la possibilité de saisir la commission départementale de conciliation et, le cas échéant, le juge du tribunal judiciaire.

Je reste à votre disposition pour échanger sur cette proposition et vous prie d'agréer, {civility}, l'expression de mes salutations distinguées.`
      },
      progressive_2025: {
        title: "Progressive 2025",
        content: `LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION

[COORDONNÉES DU LOCATAIRE]
{locataire_nom}
{adresse}

Objet : Proposition d'augmentation progressive de loyer

{civility},

Votre contrat de location pour le logement situé {adresse} arrivant à son terme le {date_fin_bail}, j'ai l'honneur de vous proposer son renouvellement avec une révision du montant du loyer.

Le loyer actuel de {loyer_actuel} € est significativement inférieur aux loyers pratiqués dans le voisinage pour des logements comparables, qui se situent en moyenne à {loyer_reference} €.

Conscient de l'impact qu'une augmentation substantielle pourrait avoir sur votre budget, je vous propose une revalorisation graduelle et modérée du loyer, conforme aux dispositions de l'article 17-2 de la loi n° 89-462 du 6 juillet 1989 modifiée et applicable en 2025.

Le loyer cible est fixé à {nouveau_loyer} €, ce qui représente une augmentation totale de [MONTANT] € ([POURCENTAGE] %).

Afin d'étaler cette augmentation, je vous propose le calendrier suivant :
- À la date de renouvellement ({date_application}) : {loyer_actuel} € + [1ER PALIER] € = [MONTANT] €
- 6 mois après : [MONTANT PRÉCÉDENT] € + [2ÈME PALIER] € = [MONTANT] €
- 12 mois après : [MONTANT PRÉCÉDENT] € + [3ÈME PALIER] € = {nouveau_loyer} €

Cette proposition est justifiée par les éléments suivants :
{justification}

Vous disposez d'un délai de {delai_reponse} à compter de la réception de ce courrier pour me faire part de votre accord ou de vos observations.

Je reste ouvert à la discussion sur les modalités de cette revalorisation et vous prie d'agréer, {civility}, l'expression de mes salutations distinguées.`
      },
      zone_tendue_2025: {
        title: "Zone tendue 2025",
        content: `LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION

[COORDONNÉES DU LOCATAIRE]
{locataire_nom}
{adresse}

Objet : Proposition d'augmentation de loyer en zone tendue

{civility},

Dans le cadre du renouvellement de votre contrat de location pour le logement situé {adresse}, qui arrive à échéance le {date_fin_bail}, je souhaite vous proposer une réévaluation du montant de votre loyer.

Ce logement étant situé dans une zone tendue définie par le décret n° 2013-392 du 10 mai 2013 modifié et applicable en 2025, je tiens à vous informer que cette proposition est encadrée par les dispositions spécifiques de l'article 17-2 de la loi n° 89-462 du 6 juillet 1989.

Le loyer actuel de {loyer_actuel} € est manifestement sous-évalué par rapport au loyer de référence médian qui s'établit à {loyer_reference} € pour ce type de bien dans le secteur, selon l'observatoire local des loyers.

Je vous propose donc de fixer le nouveau loyer à {nouveau_loyer} €, ce qui représente une augmentation de [POURCENTAGE] %.

Conformément à la réglementation applicable en zone tendue, cette augmentation :
- Est justifiée par le niveau des loyers pratiqués dans le voisinage
- Est inférieure à 50% de la différence entre le loyer de marché et le loyer actuel
- Sera appliquée progressivement, par moitié à chaque date anniversaire du contrat

Cette proposition est justifiée par les éléments suivants :
{justification}

À l'appui de cette demande, je vous communique des références de loyers pratiqués dans le voisinage pour des logements comparables :
- Référence 1 : [DÉTAILS DU LOGEMENT COMPARABLE] - Loyer : [MONTANT] €
- Référence 2 : [DÉTAILS DU LOGEMENT COMPARABLE] - Loyer : [MONTANT] €
- Référence 3 : [DÉTAILS DU LOGEMENT COMPARABLE] - Loyer : [MONTANT] €

Vous disposez d'un délai de {delai_reponse} à compter de la réception de cette proposition pour me faire connaître votre réponse.

En l'absence d'accord, je vous rappelle que nous pourrons saisir la commission départementale de conciliation avant de recourir éventuellement au juge.

Je reste à votre disposition pour échanger sur cette proposition et vous prie d'agréer, {civility}, l'expression de mes salutations distinguées.`
      }
    }
  },
  notification_travaux: {
    title: "Notification de travaux",
    description: "Information du locataire sur des travaux prévus",
    fields: [
      { name: "locataire_nom", label: "Nom du locataire", type: "text", placeholder: "Nom complet du locataire", required: true },
      { name: "adresse", label: "Adresse du logement", type: "textarea", placeholder: "Adresse complète du logement", required: true },
      { name: "nature_travaux", label: "Nature des travaux", type: "textarea", placeholder: "Description détaillée des travaux prévus", required: true },
      { name: "date_debut", label: "Date de début", type: "date", placeholder: "Date de début des travaux", required: true },
      { name: "duree_estimee", label: "Durée estimée", type: "text", placeholder: "Durée estimée des travaux", required: true },
      { name: "entreprise", label: "Entreprise", type: "text", placeholder: "Nom de l'entreprise réalisant les travaux", required: true },
      { name: "impact_usage", label: "Impact sur l'usage du logement", type: "textarea", placeholder: "Description de l'impact des travaux sur l'usage du logement", required: true }
    ],
    templates: {
      standard_2025: {
        title: "Standard 2025",
        content: `LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION

[COORDONNÉES DU LOCATAIRE]
{locataire_nom}
{adresse}

Objet : Notification de travaux dans votre logement

{civility},

Par la présente, je vous informe de mon intention de réaliser des travaux dans le logement que vous occupez, situé {adresse}.

Nature des travaux :
{nature_travaux}

Ces travaux seront réalisés par l'entreprise {entreprise} et devraient débuter le {date_debut} pour une durée estimée de {duree_estimee}.

Impact sur l'usage de votre logement :
{impact_usage}

Conformément à l'article 7-e de la loi n° 89-462 du 6 juillet 1989 modifiée et applicable en 2025, je vous rappelle que vous êtes tenu de permettre l'accès à votre logement pour la réalisation de ces travaux.

Un représentant de l'entreprise prendra contact avec vous dans les prochains jours pour organiser les modalités pratiques d'intervention.

Je m'engage à ce que ces travaux soient réalisés dans les règles de l'art, en limitant au maximum les désagréments pour votre confort quotidien.

[SI APPLICABLE] En raison de la gêne occasionnée par ces travaux, une réduction de loyer de [MONTANT] € vous sera accordée pour la période concernée.

Pour toute question relative à ces travaux, vous pouvez me contacter au [NUMÉRO DE TÉLÉPHONE] ou par email à [ADRESSE EMAIL].

Je vous prie d'agréer, {civility}, l'expression de mes salutations distinguées.`
      },
      urgents_2025: {
        title: "Travaux urgents 2025",
        content: `LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION

[COORDONNÉES DU LOCATAIRE]
{locataire_nom}
{adresse}

Objet : Notification de travaux urgents dans votre logement

{civility},

Je vous informe par la présente de la nécessité de réaliser en urgence des travaux dans le logement que vous occupez situé {adresse}.

Nature et justification de l'urgence :
{nature_travaux}

Ces travaux revêtent un caractère urgent car ils concernent la sécurité/salubrité du logement et ne peuvent être différés sans risque.

Les interventions seront réalisées par l'entreprise {entreprise} et débuteront le {date_debut} pour une durée estimée de {duree_estimee}.

Impact sur l'usage de votre logement :
{impact_usage}

Compte tenu de l'urgence de la situation, je vous remercie de permettre l'accès à votre logement conformément à l'article 7-e de la loi n° 89-462 du 6 juillet 1989 modifiée et applicable en 2025.

L'entreprise [OU MON REPRÉSENTANT] prendra contact avec vous dans les plus brefs délais pour organiser l'intervention. En cas d'impossibilité de votre part, je vous invite à proposer rapidement des créneaux alternatifs.

[SI APPLICABLE] Si ces travaux devaient occasionner une gêne significative, une compensation sous forme de réduction de loyer pourrait être envisagée proportionnellement à cette gêne.

Pour toute urgence ou question relative à ces travaux, vous pouvez me joindre à tout moment au [NUMÉRO DE TÉLÉPHONE MOBILE].

Je vous remercie de votre compréhension et vous prie d'agréer, {civility}, l'expression de mes salutations distinguées.`
      },
      amelioration_2025: {
        title: "Amélioration du logement 2025",
        content: `LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION

[COORDONNÉES DU LOCATAIRE]
{locataire_nom}
{adresse}

Objet : Travaux d'amélioration prévus dans votre logement

{civility},

Dans une démarche d'amélioration de la qualité de votre logement situé {adresse}, je vous informe de mon intention de réaliser des travaux d'amélioration.

Nature et objectif des travaux :
{nature_travaux}

Ces travaux visent à améliorer votre confort, réduire les consommations énergétiques et valoriser le logement, conformément aux objectifs de la réglementation environnementale en vigueur en 2025.

Détails pratiques :
- Entreprise chargée des travaux : {entreprise}
- Date de début prévue : {date_debut}
- Durée estimée : {duree_estimee}
- Horaires d'intervention : [PRÉCISER LES HORAIRES]

Impact sur l'usage de votre logement :
{impact_usage}

Conformément à l'article 7-e de la loi n° 89-462 du 6 juillet 1989, vous êtes tenu de permettre l'accès à votre logement pour la réalisation de ces travaux d'amélioration.

Ces améliorations n'entraîneront pas d'augmentation de loyer pendant la durée de votre bail en cours. Lors du renouvellement du bail, une réévaluation pourra être envisagée conformément à l'article 17-2 de la loi du 6 juillet 1989, en tenant compte de l'amélioration apportée au logement.

Un représentant de l'entreprise prendra contact avec vous prochainement pour convenir ensemble d'un calendrier d'intervention qui perturbera le moins possible votre quotidien.

Je vous remercie par avance pour votre coopération et vous prie d'agréer, {civility}, l'expression de mes salutations distinguées.`
      },
      parties_communes_2025: {
        title: "Parties communes 2025",
        content: `LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION
OU AFFICHAGE DANS LES PARTIES COMMUNES

[COORDONNÉES DU LOCATAIRE]
{locataire_nom}
{adresse}

Objet : Information sur des travaux dans les parties communes de l'immeuble

{civility},

Je vous informe par la présente que des travaux vont être réalisés dans les parties communes de l'immeuble situé {adresse}.

Nature des travaux :
{nature_travaux}

Ces travaux seront réalisés par l'entreprise {entreprise} et débuteront le {date_debut} pour une durée estimée de {duree_estimee}.

Impact sur l'usage des parties communes :
{impact_usage}

Conséquences pratiques pendant la durée des travaux :
- Accès à l'immeuble : [PRÉCISIONS]
- Stationnement : [PRÉCISIONS]
- Horaires de travail : [HORAIRES]
- Nuisances sonores éventuelles : [PRÉCISIONS]
- Mesures de sécurité à respecter : [DÉTAILS]

Conformément à la réglementation applicable en 2025, ces travaux d'amélioration des parties communes ont été décidés [PAR LE PROPRIÉTAIRE/LORS DE L'ASSEMBLÉE GÉNÉRALE DES COPROPRIÉTAIRES en date du (DATE)].

Je m'efforcerai de limiter au maximum les désagréments occasionnés et je vous remercie par avance de votre compréhension.

Pour toute question relative à ces travaux, vous pouvez contacter [NOM DU CONTACT] au [NUMÉRO DE TÉLÉPHONE] ou par email à [ADRESSE EMAIL].

Je vous prie d'agréer, {civility}, l'expression de mes salutations distinguées.`
      }
    }
  }
};

export interface MiseEnDemeureFields {
  locataire_nom: string;
  locataire_adresse: string;
  montant_loyer: string;
  date_echeance: string;
  delai_paiement: string;
}

export interface ResiliationBailFields {
  locataire_nom: string;
  locataire_adresse: string;
  date_effet: string;
  motif: string;
}

export type LetterFields = {
  mise_en_demeure_loyer: MiseEnDemeureFields;
  resiliation_bail: ResiliationBailFields;
}; 