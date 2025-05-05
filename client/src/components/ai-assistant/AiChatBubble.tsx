import React, { useEffect, useState, useRef } from 'react';
import { X, SendHorizontal, Loader2, MessageSquare, HelpCircle, Bot, Settings, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import { useAiProvider } from '@/hooks/use-ai-provider';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AiSettingsDialog from './AiSettingsDialog';

// Types pour les messages et conversations
type Message = {
  id: number;
  content: string;
  role: 'user' | 'assistant' | 'system';
  createdAt: string;
};

type Conversation = {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'closed';
  category: string;
};

type PredefinedQuery = {
  text: string;
  category: 'general' | 'maintenance' | 'legal' | 'financial';
};

// Générer un ID unique pour les messages
const generateId = () => {
  return Math.floor(Math.random() * 1000000);
};

// Préquestions populaires
const PREDEFINED_QUERIES: PredefinedQuery[] = [
  { text: "Quels sont mes droits en cas de loyers impayés ?", category: "legal" },
  { text: "Comment calculer un préavis de départ pour un locataire ?", category: "legal" },
  { text: "Comment fixer correctement le montant d'un loyer ?", category: "financial" },
  { text: "Quelle est la procédure légale pour augmenter un loyer ?", category: "legal" },
  { text: "Comment gérer une demande de travaux d'un locataire ?", category: "maintenance" },
  { text: "Quelles sont les obligations d'entretien du propriétaire ?", category: "maintenance" },
  { text: "Comment optimiser la fiscalité de mes revenus locatifs ?", category: "financial" },
  { text: "Quelles assurances sont obligatoires pour un bien en location ?", category: "legal" },
  { text: "Comment rédiger un état des lieux complet ?", category: "legal" },
  { text: "Comment calculer la rentabilité d'un investissement locatif ?", category: "financial" },
];

// Réponses prédéfinies aux questions (version 2025)
const PREDEFINED_ANSWERS: Record<string, string> = {
  "Quels sont mes droits en cas de loyers impayés ?": 
    "En tant que propriétaire bailleur, vous disposez de plusieurs droits et recours en cas de loyers impayés par votre locataire. Voici les principales étapes et options qui s'offrent à vous en 2025 :\n\n1. Rappel amiable et mise en demeure\nAvant toute procédure judiciaire, il est recommandé d'envoyer un rappel amiable, puis une mise en demeure par lettre recommandée avec accusé de réception demandant le paiement des sommes dues dans un délai raisonnable. Cela permet de constituer une preuve en cas de procédure.\n\n2. Activation des garanties\nSi vous avez souscrit une assurance loyers impayés (GLI) ou si le locataire dispose d'un cautionnaire, vous pouvez solliciter le remboursement des loyers auprès de ces entités après un certain délai (souvent un ou deux mois d'impayés selon le contrat).\n\n3. Procédure judiciaire (injonction de payer ou résiliation du bail)\nVous pouvez engager une procédure d'injonction de payer auprès du tribunal judiciaire pour récupérer les sommes dues.\nSi une clause résolutoire est prévue dans le bail (ce qui est courant), vous pouvez aussi demander la résiliation du bail et l'expulsion du locataire, à condition d'avoir respecté les formalités (commandement de payer par huissier, délai de 2 mois, etc.).\n\n4. Saisine du juge\nEn cas de contestation ou de situation complexe (locataire de bonne foi en difficulté, non-respect de la procédure, etc.), l'affaire devra être tranchée par le juge des contentieux de la protection.\n\n5. Procédure d'expulsion\nSi le juge ordonne l'expulsion, un commandement de quitter les lieux est délivré par huissier. L'expulsion effective peut intervenir à l'issue d'un nouveau délai (souvent de 2 mois), sauf en période de trêve hivernale (du 1er novembre au 31 mars, sauf exceptions).\n\nConseil : Agissez rapidement dès les premiers impayés. Une gestion proactive (dialogue, garanties, procédure bien suivie) est essentielle pour préserver vos droits tout en respectant ceux du locataire.",
  
  "Comment calculer un préavis de départ pour un locataire ?": 
    "Le calcul du préavis de départ d'un locataire dépend du type de bail et de la localisation du logement.\n\n🏠 1. Type de logement : vide ou meublé\nLogement vide : le préavis standard est de 3 mois.\n\nLogement meublé : le préavis est de 1 mois, quelle que soit la situation géographique.\n\n📍 2. Exceptions pour logement vide (préavis réduit à 1 mois)\nDans certains cas, le préavis d'un logement vide peut être réduit à 1 mois :\n\nLe logement est situé en zone tendue (zones où la demande locative est forte – la liste est définie par décret).\n\nLe locataire a perdu son emploi, a trouvé un emploi après une période de chômage, est muté, ou bénéficie du RSA ou de l'AAH.\n\nLe locataire a des raisons de santé justifiant un changement de domicile.\n\n⚠️ Le locataire doit justifier sa situation au moment de la remise du congé (par lettre recommandée, remise en main propre contre signature ou acte d'huissier).\n\n📅 3. Calcul du délai de préavis\nLe délai de préavis commence le jour de réception de la lettre de congé par le bailleur (et non le jour d'envoi).\nExemple :\n\nLettre recommandée reçue le 10 avril 2025\n\nFin de préavis :\n\nLe 10 mai 2025 (si préavis d'un mois)\n\nLe 10 juillet 2025 (si préavis de trois mois)\n\nLe locataire est redevable du loyer et des charges jusqu'à la fin effective du préavis, sauf si le logement est reloué entre-temps (avec accord du bailleur).",
  
  "Comment fixer correctement le montant d'un loyer ?": 
    "Fixer le montant d'un loyer dépend de plusieurs facteurs juridiques, économiques et géographiques. En 2025, la réglementation s'est renforcée dans certaines zones, notamment en matière d'encadrement des loyers. Voici les étapes clés à respecter pour déterminer un loyer conforme et équilibré :\n\n1. Identifier la zone géographique du bien\nCommencez par déterminer si votre logement se situe dans une zone tendue ou une zone soumise à l'encadrement des loyers (comme Paris, Lyon, Lille, Montpellier…).\n\nEn zone tendue : l'évolution du loyer est réglementée en cas de relocation ou de renouvellement du bail.\n\nEn zone encadrée (encadrement des loyers renforcé) : un loyer de référence, un loyer majoré (plafond), et un loyer minoré sont fixés par arrêté préfectoral. Le loyer demandé ne peut dépasser le loyer majoré, sauf cas exceptionnel (complément de loyer justifié).\n\n2. Analyser les caractéristiques du logement\nPrenez en compte :\n\nLa surface habitable (loi Carrez ou Boutin selon le cas)\n\nLa localisation précise (quartier, proximité des transports, commerces)\n\nLe standing de l'immeuble et les équipements (ascenseur, balcon, parking, etc.)\n\nL'état général du bien et les éventuelles rénovations récentes\n\nLa consommation énergétique (DPE) : les passoires thermiques (étiquettes F et G) sont soumises à des restrictions.\n\n3. Comparer les loyers pratiqués dans le secteur\nEffectuez une étude comparative du marché local, en consultant :\n\nLes annonces de biens similaires (sites d'annonces immobilières, agences)\n\nLes bases de données publiques (ex. : Demande de Valeur Foncière (DVF), Observatoire des Loyers)\n\nCela permet de s'aligner sur le marché tout en restant dans la légalité.\n\n4. Respecter la législation en vigueur\nEn zone encadrée : ne pas dépasser le plafond légal sauf complément de loyer justifié par des caractéristiques exceptionnelles non prises en compte dans le loyer de référence (ex : vue exceptionnelle, terrasse, matériaux haut de gamme).\n\nEn dehors des zones encadrées : la liberté est plus grande, mais un loyer excessif peut dissuader les locataires ou entraîner des négociations.\n\n5. Faire figurer le montant correctement dans le bail\nLe bail doit indiquer clairement :\n\nLe loyer de base\n\nLes charges récupérables\n\nLe complément de loyer (le cas échéant), motivé et justifié\n\nEn résumé : Fixer le loyer exige de respecter le cadre légal (notamment les plafonds), d'évaluer objectivement la valeur locative du bien et de suivre les évolutions réglementaires locales. En cas de doute, l'accompagnement par un professionnel (notaire, avocat, gestionnaire immobilier) est vivement recommandé.",
  
  "Quelle est la procédure légale pour augmenter un loyer ?": 
    "La procédure d'augmentation de loyer dépend du type de bail (vide, meublé, commercial…) et du moment dans la vie du bail. Voici les grandes étapes à suivre dans le cadre d'un bail d'habitation soumis à la loi du 6 juillet 1989 :\n\n🔹 1. Augmentation en cours de bail (révision annuelle)\nElle est possible uniquement si une clause de révision est prévue au contrat. Dans ce cas :\n\nBase de calcul : L'augmentation est plafonnée selon l'Indice de Référence des Loyers (IRL) publié par l'INSEE chaque trimestre.\n\nFormule :\nLoyer révisé = Loyer actuel x (nouvel IRL / ancien IRL)\n\nDélai : Vous avez 1 an après la date prévue dans le bail pour appliquer la révision. Passé ce délai, la révision est perdue pour l'année.\n\n⚠️ Depuis la loi Climat et Résilience, les logements classés F ou G au DPE ne peuvent plus voir leur loyer augmenté, sauf exceptions.\n\n🔹 2. Augmentation à la relocation (nouveau locataire)\nEn zone tendue : L'augmentation est encadrée par la loi (Loi ALUR). Le loyer ne peut pas excéder celui payé par l'ancien locataire, sauf en cas de travaux importants (au moins 6 mois de loyer) ou si le logement était vacant plus de 18 mois.\n\nEn zone non tendue : Le loyer peut être fixé librement, mais attention à l'abus (loyer manifestement excessif).\n\n🔹 3. Augmentation au renouvellement du bail (locataire en place)\nMotif nécessaire : Le propriétaire peut proposer une augmentation uniquement si le loyer est manifestement sous-évalué.\n\nProcédure :\n\nEnvoi d'une proposition de nouveau loyer au moins 6 mois avant la fin du bail, avec comparatifs de loyers de logements similaires (minimum 6 en zone tendue, 3 en zone non tendue).\n\nSi le locataire accepte, le nouveau loyer s'applique au renouvellement.\n\nEn cas de refus, le bailleur peut saisir la commission de conciliation, puis le juge si nécessaire.\n\n💡 Conseil : Toute augmentation doit être justifiée, raisonnable et encadrée. Une communication claire et documentée avec le locataire est essentielle pour éviter tout litige.",
  
  "Comment gérer une demande de travaux d'un locataire ?": 
    "Procédure 2025 pour gérer une demande de travaux:\n\n1. Tout signalement doit recevoir une réponse sous 15 jours (contre 21 auparavant)\n\n2. La plateforme nationale NumériTravaux permet désormais le suivi légal des demandes\n\n3. Les travaux urgents (sécurité, salubrité) doivent être effectués sous 30 jours maximum\n\n4. Le dispositif 'Action Logement Décent' permet une avance de fonds pour les propriétaires aux revenus modestes\n\n5. Si le propriétaire ne répond pas dans les délais, le locataire peut saisir la Commission Départementale via procédure simplifiée en ligne\n\n6. Les travaux d'accessibilité handicap sont devenus obligatoires sous 6 mois (sauf impossibilité technique certifiée)\n\n7. Le locataire peut désormais consigner son loyer via procédure numérique accélérée en cas d'inaction du propriétaire",
  
  "Quelles sont les obligations d'entretien du propriétaire ?": 
    "En France, le propriétaire bailleur a l'obligation légale d'assurer au locataire un logement décent, sécurisé et en bon état d'usage et de réparation tout au long de la durée du bail. Ces obligations sont encadrées principalement par la loi du 6 juillet 1989, le Code civil et les évolutions récentes de la législation.\n\n🔧 Entretien et réparations à la charge du propriétaire :\nRemise en état initial du logement :\n\nLe logement doit être propre, salubre, et respecter les critères de décence définis par décret.\n\nToutes les installations (chauffage, électricité, plomberie, etc.) doivent être conformes aux normes et fonctionnelles.\n\nRéparations majeures et grosses réparations :\n\nLes gros travaux (ex. : toiture, ravalement, remplacement chaudière, structure du bâtiment) sont à la charge exclusive du propriétaire.\n\nIl doit également entretenir les parties communes (s'il s'agit d'un logement en copropriété) dans les limites de sa quote-part.\n\nEntretien des équipements fournis :\n\nLes équipements mentionnés dans le bail (chauffe-eau, chaudière, VMC, etc.) doivent être entretenus ou remplacés en cas de vétusté, sauf si l'entretien courant est expressément à la charge du locataire.\n\nRespect des normes en vigueur :\n\nLe propriétaire est tenu de mettre à jour le logement en cas de modification de la réglementation, notamment en matière de performance énergétique, de sécurité électrique ou d'accessibilité.\n\n🛠️ Ce qui n'est pas à la charge du propriétaire :\nLes réparations locatives (ou menues réparations) sont à la charge du locataire, conformément au décret n°87-712 du 26 août 1987 (exemples : remplacement des joints, entretien courant, petites réparations dues à l'usage).\n\n⚠️ En cas de manquement :\nSi le propriétaire ne respecte pas ses obligations :\n\nLe locataire peut exiger la réalisation des travaux nécessaires ;\n\nEn cas d'urgence, il peut saisir le tribunal judiciaire pour demander une réduction de loyer ou la résiliation du bail ;\n\nDans certains cas, le locataire peut effectuer les travaux lui-même et en demander le remboursement, après mise en demeure restée sans effet.",
  
  "Comment optimiser la fiscalité de mes revenus locatifs ?": 
    "Optimiser la fiscalité de vos revenus locatifs en 2025 nécessite une analyse fine de votre situation personnelle, du type de bien loué et du régime fiscal applicable. Voici les principales stratégies à envisager :\n\n1. Choisir le régime fiscal adapté\nRégime micro-foncier (si vos revenus fonciers < 15 000 €/an) : vous bénéficiez d'un abattement forfaitaire de 30 %. C'est simple, mais rarement le plus avantageux si vous avez beaucoup de charges.\n\nRégime réel : permet de déduire l'ensemble des charges réelles (travaux, intérêts d'emprunt, taxe foncière, assurance, frais de gestion, etc.). Ce régime est souvent plus favorable en cas de charges élevées.\n\n2. Investir via le statut LMNP (Loueur Meublé Non Professionnel)\nCe statut s'applique si vous louez un bien meublé :\n\nRégime micro-BIC (recettes < 77 700 €) : abattement forfaitaire de 50 %.\n\nRégime réel : possibilité d'amortir le bien immobilier (hors terrain), le mobilier et les frais d'acquisition. Cela permet souvent de générer un revenu fiscal nul voire un déficit pendant plusieurs années.\n\nEn 2025, le régime LMNP reste très avantageux pour réduire, voire effacer, l'impôt sur les loyers.\n\n3. Créer un déficit foncier\nSi vous êtes au régime réel, vous pouvez déduire les charges excédant les loyers perçus dans la limite de 10 700 €/an du revenu global (hors intérêts d'emprunt). Ce levier est très efficace pour réduire votre impôt sur le revenu, notamment après des travaux de rénovation énergétique (souvent prioritaires depuis la loi Climat & Résilience).\n\n4. Utiliser une société (SCI, SARL de famille, etc.)\nUne SCI à l'impôt sur le revenu (IR) permet une gestion souple du patrimoine, avec une imposition transparente.\n\nUne SCI à l'impôt sur les sociétés (IS) permet l'amortissement du bien et un taux d'imposition potentiellement plus bas (15 % ou 25 %). En revanche, la taxation des plus-values à la revente est plus lourde.\n\nLa SARL de famille est aussi intéressante pour la location meublée tout en conservant une transparence fiscale.\n\n5. Tirer parti des dispositifs fiscaux en vigueur\nLoc'Avantages : réduction d'impôt en échange d'un loyer modéré.\n\nMonuments Historiques, Malraux : déduction des travaux sur des biens classés.\n\nDenormandie, Pinel+ : encore en vigueur en 2025 pour les investissements dans le neuf ou l'ancien rénové, sous conditions.\n\n6. Optimiser les frais et charges\nN'oubliez pas de bien documenter et conserver toutes les factures et justificatifs. Un oubli peut vous coûter une déduction. Pensez aussi à déléguer à un expert-comptable si vous êtes au régime réel, surtout en LMNP.\n\nConclusion : L'optimisation fiscale de vos revenus locatifs repose sur une stratégie globale qui allie régime fiscal, statut juridique, choix du type de location (nue ou meublée), et parfois montage en société. Une étude personnalisée est vivement recommandée pour maximiser les économies fiscales tout en respectant la législation en vigueur.",
  
  "Quelles assurances sont obligatoires pour un bien en location ?": 
    "En France, plusieurs assurances peuvent être obligatoires selon le type de bien loué, le statut du propriétaire et celui du locataire. Voici les principales obligations en vigueur en 2025 :\n\n1. Assurance obligatoire pour le locataire : l'assurance habitation\nLe locataire d'un logement vide ou meublé à usage de résidence principale doit obligatoirement souscrire une assurance multirisques habitation, couvrant a minima les risques locatifs (incendie, explosion, dégâts des eaux).\n📌 Le bailleur peut exiger une attestation chaque année. En cas de défaut, il peut souscrire lui-même une assurance pour le compte du locataire et en répercuter le coût.\n\n2. Assurance du propriétaire (non obligatoire mais fortement conseillée)\nLe propriétaire non occupant (PNO) n'est pas obligé par la loi de souscrire une assurance, sauf dans certaines copropriétés (voir point 3), mais une assurance PNO est vivement recommandée. Elle couvre les dommages causés au bien en l'absence de locataire ou en cas de sinistre non couvert par l'assurance du locataire.\n\n3. Assurance en copropriété : obligatoire pour tous les propriétaires\nDepuis la loi Alur, tout propriétaire (occupant ou bailleur) d'un bien en copropriété doit obligatoirement souscrire une assurance responsabilité civile, afin de couvrir les dommages causés à des tiers.\n\n4. Cas particulier : la garantie loyers impayés (GLI)\nCe n'est pas une assurance obligatoire, mais elle est fréquemment souscrite par les bailleurs. Elle couvre les impayés de loyers, les dégradations et parfois les frais de contentieux.\n📌 Attention : si vous choisissez cette garantie, vous ne pouvez pas demander de caution sauf exceptions (étudiants, apprentis…)",
  
  "Comment rédiger un état des lieux complet ?": 
    "La rédaction d'un état des lieux complet est une étape cruciale dans la gestion d'un bail d'habitation. Il permet de constater l'état réel du logement lors de l'entrée et de la sortie du locataire, et constitue un document à valeur juridique, encadré par la loi du 6 juillet 1989 et précisé par le décret n°2016-382 du 30 mars 2016.\n\nVoici les éléments essentiels à respecter pour rédiger un état des lieux complet :\n\n1. Formalisme obligatoire\nL'état des lieux doit être établi contradictoirement, en présence du bailleur (ou de son mandataire) et du locataire, à l'entrée et à la sortie du logement.\n\nIl peut être :\n\nRédigé sur papier, en deux exemplaires signés par les parties.\n\nRédigé de façon électronique, avec signature numérique et copie transmise à chaque partie.\n\n2. Mentions obligatoires\nUn état des lieux complet doit comporter les mentions suivantes :\n\nDate de l'état des lieux\n\nAdresse complète du logement\n\nNom et qualité des parties présentes\n\nRelevés des compteurs individuels (eau, gaz, électricité)\n\nDétail pièce par pièce de l'état des sols, murs, plafonds, menuiseries, équipements, etc.\n\nFonctionnement et état des éléments (robinetterie, électroménager, chauffage...)\n\nClés remises (nombre et type)\n\nSignature des deux parties\n\n💡 Conseil professionnel : Utiliser un modèle normalisé avec une grille d'évaluation (neuf, bon état, état d'usage, dégradé...) facilite la comparaison entre l'entrée et la sortie.\n\n3. Descriptif détaillé par pièce\nChaque pièce doit faire l'objet d'un inventaire minutieux :\n\nSols : nature du revêtement, tâches, rayures, usure\n\nMurs et plafonds : peinture, traces, fissures\n\nPortes et fenêtres : fonctionnement, vitrage, serrures\n\nÉquipements : état et propreté (cuisine, salle de bains, chauffage...)\n\n🛠️ Astuce : Joindre des photos datées, signées ou annexées à l'état des lieux pour renforcer la preuve.\n\n4. État des lieux de sortie\nIl doit permettre une comparaison directe avec l'état des lieux d'entrée. Toute dégradation imputable au locataire, autre qu'une usure normale, peut justifier une retenue sur le dépôt de garantie, à condition qu'elle soit précisément documentée.\n\n5. En cas de litige\nEn cas de désaccord ou d'impossibilité d'établir un état des lieux contradictoire, une constatation par huissier de justice peut être demandée. Les frais sont partagés à parts égales entre bailleur et locataire.\n\nEn résumé :\nUn bon état des lieux est précis, objectif, contradictoire et documenté. Il protège autant le bailleur que le locataire en cas de litige.",
  
  "Comment calculer la rentabilité d'un investissement locatif ?": 
    "La rentabilité d'un investissement locatif permet de mesurer le rendement financier d'un bien immobilier mis en location. Il existe plusieurs façons de la calculer, selon le niveau de précision souhaité. Voici les principales méthodes utilisées en 2025 :\n\n🔹 1. La rentabilité brute\nC'est le calcul le plus simple. Elle donne une première estimation du rendement annuel du bien, sans prendre en compte les charges ou la fiscalité.\n\nFormule :\n📌 (Loyer annuel hors charges / Prix d'achat du bien) x 100\n\nExemple :\n\nLoyer mensuel : 700 €\n\nLoyer annuel : 700 € x 12 = 8 400 €\n\nPrix d'achat (avec frais de notaire inclus) : 160 000 €\n➡️ Rentabilité brute : (8 400 / 160 000) x 100 = 5,25 %\n\n🔹 2. La rentabilité nette de charges\nElle affine le calcul en déduisant les charges non récupérables : taxe foncière, assurances, frais de gestion, etc.\n\nFormule :\n📌 (Loyer annuel – Charges non récupérables) / Prix d'achat total x 100\n\nExemple :\n\nLoyer annuel : 8 400 €\n\nCharges non récupérables : 1 400 €\n➡️ Rentabilité nette : (8 400 – 1 400) / 160 000 x 100 = 4,38 %\n\n🔹 3. La rentabilité nette-nette (ou rentabilité réelle)\nC'est la plus précise. Elle prend en compte :\n\nTous les frais : charges, vacance locative, travaux, etc.\n\nEt surtout l'imposition liée aux revenus fonciers (selon le régime réel ou micro-foncier, et votre TMI).\n\nElle varie fortement selon votre situation fiscale. Pour la calculer : ✅ Utilisez un simulateur de rentabilité locative (de nombreux sites en proposent en 2025, y compris avec l'intégration du prélèvement à la source et des régimes fiscaux type LMNP, Pinel, Denormandie, etc.).\n\n💡 Astuce de pro\nPensez aussi à intégrer :\n\nLa valeur de revente potentielle (plus-value ou moins-value),\n\nLe financement par crédit : l'effet de levier peut booster votre rentabilité si bien maîtrisé."
};

// Modèles d'IA disponibles avec info de coût en quota
const aiModels = [
  { id: 'openai-gpt-3.5', name: 'GPT-3.5 Turbo', category: 'openai', quotaCost: 1 },
  { id: 'openai-gpt-4o', name: 'GPT-4o', category: 'openai', quotaCost: 2 }
];

const AiChatBubble = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [currentTab, setCurrentTab] = useState<string>('chat');
  const [showSuggestions, setShowSuggestions] = useState<boolean>(true);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [aiSettings, setAiSettings] = useState<{
    preferredModel: string;
    quotaInfo: {
      currentUsage: number;
      limit: number;
    }
  } | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // Ne pas utiliser ces propriétés pour éviter l'erreur du linter
  // const { user } = useUser();
  // const { providerInfo, isLoading: isProviderLoading } = useAiProvider();

  // Charger les paramètres IA
  useEffect(() => {
    if (isOpen) {
      fetchAiSettings();
    }
  }, [isOpen]);

  const fetchAiSettings = async () => {
    try {
      setLoadingSettings(true);
      const response = await apiRequest('/api/user/ai-settings', { method: 'GET' });
      setAiSettings(response);
    } catch (error) {
      console.error('Erreur lors de la récupération des paramètres IA:', error);
    } finally {
      setLoadingSettings(false);
    }
  };

  // Mettre à jour le modèle préféré
  const updatePreferredModel = async (modelId: string) => {
    try {
      setLoadingSettings(true);
      const response = await apiRequest('/api/user/ai-settings', {
        method: 'POST',
        body: JSON.stringify({ preferredModel: modelId }),
      });
      
      setAiSettings(response);
      
      toast({
        title: 'Modèle mis à jour',
        description: `Votre modèle d'IA a été changé avec succès.`,
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du modèle:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le modèle.',
        variant: 'destructive',
      });
    } finally {
      setLoadingSettings(false);
    }
  };

  // Trouver le coût du modèle sélectionné
  const getSelectedModelCost = () => {
    if (!aiSettings?.preferredModel) return 1;
    const model = aiModels.find(m => m.id === aiSettings.preferredModel);
    return model?.quotaCost || 1;
  };

  // Défilement automatique vers le bas lors de nouveaux messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Message d'accueil initial
  useEffect(() => {
    if (isOpen && messages.length === 0 && !currentConversation) {
      setMessages([
        {
          id: 0,
          content: 'Bonjour, je suis votre assistant immobilier virtuel. Comment puis-je vous aider aujourd\'hui ?',
          role: 'assistant',
          createdAt: new Date().toISOString(),
        },
      ]);
    }
  }, [isOpen, messages.length, currentConversation]);

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    try {
      setIsLoading(true);
      
      // Ajouter le message de l'utilisateur localement
      const userMessage: Message = {
        id: messages.length + 1,
        content: message,
        role: 'user',
        createdAt: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, userMessage]);
      setMessage('');

      // Envoyer le message à l'API
      const payload = {
        content: message,
        conversationId: currentConversation?.id
      };

      const response = await apiRequest('/api/ai-assistant/message', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Si c'est une nouvelle conversation, mettre à jour l'ID de conversation
      if (response.conversation && !currentConversation) {
        setCurrentConversation(response.conversation);
      }

      // Ajouter la réponse de l'assistant
      if (response.message) {
        // Vérifier si le message est directement accessible ou sous la propriété assistantMessage
        const messageData = response.message.assistantMessage || response.message;
        
        const assistantMessage: Message = {
          id: messageData.id,
          content: messageData.content,
          role: messageData.role,
          createdAt: messageData.created_at || messageData.createdAt,
        };

        setMessages(prev => [...prev, assistantMessage]);
        console.log("Réponse de l'assistant ajoutée:", assistantMessage);
      } else {
        console.error("Pas de message dans la réponse:", response);
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer votre message. Veuillez réessayer.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleChat = () => {
    setIsOpen(prev => !prev);
  };
  
  // Utiliser une phrase prédéfinie
  const handleUseQuery = (query: string) => {
    setMessage(query);
    setShowSuggestions(false);
  };

  // Format des nombres
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('fr-FR').format(num);
  };

  // Zone en bas avec sélecteur de modèles et compteur de quota
  const renderModelSelector = () => {
    const quotaCost = getSelectedModelCost();
    
    return (
      <div className="mt-2 flex items-center justify-between">
        <div className="flex-1 max-w-[180px]">
          <Select
            value={aiSettings?.preferredModel || ''}
            onValueChange={updatePreferredModel}
            disabled={loadingSettings}
          >
            <SelectTrigger className="h-7 text-xs border-gray-200">
              <SelectValue placeholder="Sélectionner modèle" />
            </SelectTrigger>
            <SelectContent>
              {aiModels.map((model) => (
                <SelectItem key={model.id} value={model.id} className="text-xs">
                  {model.name} ({model.quotaCost} {model.quotaCost > 1 ? 'unités' : 'unité'})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="mt-1 text-xs text-gray-500 flex items-center">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 bg-primary rounded-full"></span>
              Coût: {quotaCost} {quotaCost > 1 ? 'unités' : 'unité'}/requête
            </span>
          </div>
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Info className="h-3 w-3" />
                <span>
                  {loadingSettings 
                    ? "Chargement..." 
                    : `${aiSettings?.quotaInfo?.currentUsage || 0}/${aiSettings?.quotaInfo?.limit || 100} requêtes`}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Nombre de requêtes utilisées sur votre quota</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Settings Dialog */}
      <AiSettingsDialog open={showSettings} onOpenChange={setShowSettings} />
      
      {/* Interface de chat ouverte */}
      {isOpen && (
        <div className="bg-white rounded-xl shadow-xl w-[450px] h-[650px] flex flex-col border border-gray-200 overflow-hidden">
          {/* En-tête */}
          <div className="bg-primary p-4 text-white flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-1.5 rounded-full">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-medium text-sm">ImmoBot - Expert Immobilier</h3>
                <div className="flex items-center gap-1.5 text-xs opacity-90">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400"></span>
                  <span>Expert en immobilier à votre service</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowSettings(true)} 
                className="h-8 w-8 text-white hover:bg-white/10 rounded-full"
                title="Paramètres avancés"
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleChat} 
                className="h-8 w-8 text-white hover:bg-white/10 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Navigation */}
          <div className="bg-white border-b border-gray-200">
            <Tabs
              defaultValue="chat"
              value={currentTab}
              onValueChange={setCurrentTab}
              className="w-full"
            >
              <TabsList className="w-full h-12 bg-transparent">
                <TabsTrigger 
                  value="chat" 
                  className="flex-1 flex items-center justify-center space-x-2 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span className="text-sm">Chat</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="questions" 
                  className="flex-1 flex items-center justify-center space-x-2 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                >
                  <HelpCircle className="h-4 w-4" />
                  <span className="text-sm">Questions</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
            
          {/* Contenu des onglets */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Onglet Chat */}
            {currentTab === 'chat' && (
              <div className="flex flex-col h-full">
                <ScrollArea className="flex-1 p-4 bg-gray-50">
                  <div className="space-y-4 pb-2">
                    {messages.map((msg, index) => (
                      <div 
                        key={index}
                        className={cn(
                          "flex flex-col max-w-[75%] rounded-lg p-3",
                          msg.role === 'user' 
                            ? 'ml-auto bg-primary text-white' 
                            : 'bg-white border border-gray-200'
                        )}
                      >
                        <div className={cn(
                          "text-xs mb-1.5",
                          msg.role === 'user' ? 'text-white/90 self-end' : 'text-gray-500 self-start'
                        )}>
                          {msg.role === 'user' ? 'Vous' : 'Assistant IA'}
                        </div>
                        
                        <div className={cn(
                          "text-sm leading-relaxed",
                          msg.role === 'user' ? 'text-white' : 'text-gray-800'
                        )}>
                          {msg.content}
                        </div>
                        
                        <div className={cn(
                          "text-[10px] mt-1.5 opacity-70", 
                          msg.role === 'user' ? 'self-start' : 'self-end'
                        )}>
                          {msg.createdAt && !isNaN(new Date(msg.createdAt).getTime()) 
                            ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
                
                {/* Questions populaires - Système de carrousel horizontal */}
                {showSuggestions && messages.length <= 2 && (
                  <div className="py-3 px-2 border-t border-gray-200 bg-white">
                    <div className="flex items-center justify-between mb-2 px-2">
                      <p className="text-sm font-medium">Questions populaires</p>
                      <div className="flex space-x-1">
                        <button 
                          className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                          onClick={() => {
                            const container = document.getElementById('questions-carousel');
                            if (container) container.scrollBy({ left: -200, behavior: 'smooth' });
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M15 18l-6-6 6-6" />
                          </svg>
                        </button>
                        <button 
                          className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                          onClick={() => {
                            const container = document.getElementById('questions-carousel');
                            if (container) container.scrollBy({ left: 200, behavior: 'smooth' });
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 18l6-6-6-6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div 
                      id="questions-carousel" 
                      className="flex overflow-x-auto pb-2 scrollbar-hide snap-x"
                      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                      {/* Styles cachés pour masquer la barre de défilement */}
                      {PREDEFINED_QUERIES.map((query, i) => (
                        <div 
                          key={i} 
                          className="flex-shrink-0 w-[280px] snap-start mr-2 first:ml-2"
                        >
                          <button 
                            className="text-left w-full p-3 bg-white border border-gray-200 rounded-md text-sm hover:bg-gray-50 transition-colors"
                            onClick={() => handleUseQuery(query.text)}
                          >
                            <div className="flex items-start">
                              <div 
                                className={cn(
                                  "w-1.5 h-1.5 rounded-full mt-1.5 mr-2 flex-shrink-0",
                                  query.category === 'legal' ? "bg-blue-500" :
                                  query.category === 'financial' ? "bg-green-500" :
                                  query.category === 'maintenance' ? "bg-orange-500" : "bg-violet-500"
                                )}
                              />
                              <span>{query.text}</span>
                            </div>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Zone de saisie */}
                <div className="p-4 bg-white border-t border-gray-200">
                  <div className="flex gap-2 items-end">
                    <div className="relative flex-1">
                      <Textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Posez votre question immobilière..."
                        className="min-h-[60px] p-3 pr-12 text-sm border border-gray-300 rounded-md resize-none"
                        disabled={isLoading}
                      />
                      <div className="absolute right-3 bottom-3">
                        <button
                          onClick={handleSendMessage}
                          disabled={!message.trim() || isLoading}
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center",
                            message.trim() && !isLoading 
                              ? "bg-primary text-white hover:bg-primary/90" 
                              : "bg-gray-200 text-gray-500 cursor-not-allowed"
                          )}
                        >
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <SendHorizontal className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  {renderModelSelector()}
                </div>
              </div>
            )}
            
            {/* Onglet Questions */}
            {currentTab === 'questions' && (
              <div className="flex flex-col h-full">
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-center">Questions fréquentes sur l'immobilier</h3>
                    <p className="text-sm text-gray-500 text-center">Sélectionnez une question pour obtenir une réponse de l'assistant.</p>
                    
                    <div className="grid gap-3 mt-6">
                      {PREDEFINED_QUERIES.map((query, i) => (
                        <div
                          key={i}
                          className="border border-gray-200 rounded-md overflow-hidden hover:shadow-sm transition-all cursor-pointer"
                          onClick={() => {
                            // Ajouter la question comme message utilisateur
                            const userMessage: Message = {
                              id: generateId(),
                              content: query.text,
                              role: 'user',
                              createdAt: new Date().toISOString(),
                            };
                            
                            // Ajouter la réponse prédéfinie comme message assistant
                            const assistantMessage: Message = {
                              id: generateId(),
                              content: PREDEFINED_ANSWERS[query.text] || "Je n'ai pas de réponse prédéfinie à cette question. Veuillez me poser une autre question.",
                              role: 'assistant',
                              createdAt: new Date().toISOString(),
                            };
                            
                            // Ajouter les deux messages à la conversation
                            setMessages(prev => [...prev, userMessage, assistantMessage]);
                            
                            // Revenir à l'onglet chat
                            setCurrentTab('chat');
                          }}
                        >
                          <div className="flex p-4">
                            <div 
                              className={cn(
                                "min-w-1 self-stretch mr-3",
                                query.category === 'legal' ? "bg-blue-500" :
                                query.category === 'financial' ? "bg-green-500" :
                                query.category === 'maintenance' ? "bg-orange-500" : "bg-violet-500"
                              )}
                            />
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <h4 className="font-medium text-sm">{query.text}</h4>
                                <Badge 
                                  className={cn(
                                    "ml-3 text-xs",
                                    query.category === 'legal' ? "bg-blue-50 text-blue-700 border-blue-200" :
                                    query.category === 'financial' ? "bg-green-50 text-green-700 border-green-200" :
                                    query.category === 'maintenance' ? "bg-orange-50 text-orange-700 border-orange-200" : 
                                    "bg-violet-50 text-violet-700 border-violet-200"
                                  )}
                                >
                                  {query.category === 'legal' ? 'Juridique' :
                                  query.category === 'financial' ? 'Financier' :
                                  query.category === 'maintenance' ? 'Entretien' : 'Général'}
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">Cliquez pour obtenir une réponse</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bouton de chat fermé */}
      {!isOpen && (
        <div className="relative">
          <Button
            onClick={toggleChat}
            className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 transition-colors"
          >
            <MessageSquare className="h-6 w-6 text-white" />
          </Button>
          
          <Badge className="absolute -top-2 -right-2 bg-blue-600 text-xs border-none font-medium">
            IA
          </Badge>
        </div>
      )}
    </div>
  );
};

export default AiChatBubble;