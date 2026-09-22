import type { ErrorDoc, FieldDoc } from "./types";

// Erreurs communes a tous les endpoints proteges par jeton Bearer.
export const authErrors: ErrorDoc[] = [
  {
    status: 200,
    customstatus: 401,
    message: "Authentification requise",
    when: "En-tete Authorization absent, ou sans le préfixe 'Bearer '.",
  },
  {
    status: 200,
    customstatus: 401,
    message: "Token invalide ou expiré",
    when: "Jeton illisible, altéré ou expire. Le renouveler via /api/auth/refresh puis rejouer l'appel.",
  },
];

export const memberNotFound: ErrorDoc = {
  status: 200,
  customstatus: 404,
  message: "Membre introuvable",
  when: "Le compte utilisateur du jeton n'est rattaché à aucune fiche membre nkezefuu.",
};

export const managerOnly: ErrorDoc = {
  status: 200,
  customstatus: 403,
  message: "Réservé aux gestionnaires et administrateurs",
  when: "Le compte n'appartient ni au groupe Gestionnaire nkezefuu ni au groupe Administrateur Odoo.",
};

export const invalidJson: ErrorDoc = {
  status: 200,
  customstatus: 400,
  message: "Format JSON invalide",
  when: "Corps de requête absent ou JSON mal formé (vérifier Content-Type: application/json).",
};

export const serverError: ErrorDoc = {
  status: 500,
  customstatus: 500,
  message: "Erreur serveur",
  when: "Exception inattendue côté serveur : voir les logs Odoo.",
};

// Variante des routes Prets : le message de l'exception est renvoye tel quel.
export const loanServerError: ErrorDoc = {
  status: 500,
  customstatus: 500,
  message: "Une erreur est survenue: <detail>",
  when: "Exception non métier (ex. paramètre non numérique, configuration absente sur une route de liste). Le détail suit le préfixe.",
};

// Champs presents dans toutes les reponses.
export const statusFields: FieldDoc[] = [
  {
    name: "status",
    type: "number",
    description:
      "Code HTTP de la réponse. Presque toujours 200, y compris pour une erreur métier : c'est customstatus qui porte le résultat réel.",
  },
  {
    name: "customstatus",
    type: "number",
    description:
      "Code applicatif à tester côté mobile : 200 succès, 400 requête invalide, 401 authentification, 403 accès refusé, 404 introuvable, 500 erreur serveur.",
  },
  {
    name: "error",
    type: "string",
    description: "Message d'erreur lisible par l'utilisateur, présent uniquement si customstatus n'est pas 200.",
  },
];

// Structure commune des reponses d'eligibilite d'un membre (prets).
export const eligibilityFields = (prefix: string): FieldDoc[] => [
  {
    name: `${prefix}.is_eligible`,
    type: "boolean",
    description:
      "true si le membre peut recevoir un prêt : statut 'En règle' (in_order) et type différent de 'Invite' (guest). Un projet (pas de fiche membre) est toujours éligible.",
  },
  {
    name: `${prefix}.member_status`,
    type: "string",
    description: "Code du statut : in_order, defaulting, excluded, suspended, withdrawn. false pour un projet.",
  },
  {
    name: `${prefix}.member_status_label`,
    type: "string",
    description: "Libellé du statut (En règle, Défaillant, Exclu, Suspendu, retrait).",
  },
  {
    name: `${prefix}.member_types`,
    type: "string",
    description: "Code du type de membre (cooperator, associate, guest...).",
  },
];

// Structure commune de la capacite d'emprunt.
export const capacityFields = (prefix: string): FieldDoc[] => [
  {
    name: `${prefix}.actions_sum`,
    type: "number",
    description: "Valeur des actions disponibles et actives du demandeur.",
  },
  {
    name: `${prefix}.investments_sum`,
    type: "number",
    description: "Montant des parts d'investissement du demandeur dont la date de paiement est passée.",
  },
  {
    name: `${prefix}.subsequent_balance`,
    type: "number",
    description: "Solde prévisionnel du demandeur (écritures postées à échéance future).",
  },
  {
    name: `${prefix}.limit`,
    type: "number",
    description:
      "Plafond d'emprunt = somme des trois composantes, arrondie à l'entier inférieur. C'est cette valeur que le mobile compare au montant saisi.",
  },
];

// Resume d'un pret (liste et en-tete du detail).
export const loanSummaryFields = (prefix: string): FieldDoc[] => [
  { name: `${prefix}.id`, type: "number", description: "Identifiant technique du prêt." },
  { name: `${prefix}.code`, type: "string", description: "Référence lisible (ex. Prêt0119)." },
  {
    name: `${prefix}.state`,
    type: "string",
    description: "draft (brouillon, pas encore décaissé) ou validated (valide : échéancier et totaux disponibles).",
  },
  { name: `${prefix}.borrower`, type: "string", description: "Nom du demandeur (membre ou projet)." },
  {
    name: `${prefix}.borrower_id`,
    type: "number",
    description: "res.users id du demandeur. À réutiliser tel quel comme user_id sur all-loans ou request-loan-for-member.",
  },
  { name: `${prefix}.requested_loan_reason`, type: "string", description: "Motif saisi à la demande." },
  {
    name: `${prefix}.requested_loan_amount`,
    type: "number",
    description: "Capital emprunté, hors intérêts.",
  },
  { name: `${prefix}.interest_rate`, type: "number", description: "Taux d'intérêt mensuel en %." },
  {
    name: `${prefix}.repayment_duration_months`,
    type: "number",
    description: "Durée totale de remboursement, en mois.",
  },
  {
    name: `${prefix}.deferment_type`,
    type: "string",
    description: "none (pas d'exonération) ou partial (exonération partielle).",
  },
  {
    name: `${prefix}.deferment_period`,
    type: "number",
    description: "Nombre de mois d'exonération, 0 si deferment_type = none.",
  },
  {
    name: `${prefix}.loan_request_date`,
    type: "string (YYYY-MM-DD)",
    description: "Date de la demande, toujours imposée par le serveur (jour de la soumission).",
  },
];

// Detail d'un pret, partie commune membre / gestionnaire.
export const loanDetailFields = (prefix: string): FieldDoc[] => [
  ...loanSummaryFields(prefix),
  {
    name: `${prefix}.total_repayment_amount`,
    type: "number",
    description: "Somme de toutes les échéances (capital + intérêts), payées ou non. 0 tant que le prêt n'est pas validated.",
  },
  {
    name: `${prefix}.total_paid_amount`,
    type: "number",
    description: "Somme des échéances déjà réglées (lignes passées du compte d'attente au compte du membre).",
  },
  {
    name: `${prefix}.total_insurance_amount`,
    type: "number",
    description: "Somme des factures d'assurance postées liées au prêt.",
  },
  {
    name: `${prefix}.total_insurance_paid_amount`,
    type: "number",
    description: "Part déjà payée de ces factures d'assurance.",
  },
  {
    name: `${prefix}.remaining_amount`,
    type: "number",
    description: "Reste réellement à payer = (remboursement - payé) + (assurance - assurance payée).",
  },
  {
    name: `${prefix}.repayment_percentage`,
    type: "number (0-100)",
    description: "Progression du remboursement, capital + intérêts uniquement (hors assurance). Même formule que le badge du back-office.",
  },
  {
    name: `${prefix}.repayment_schedule[]`,
    type: "array",
    description:
      "Échéancier prévisionnel, une entrée par mois. Rejoue le calcul d'origine du prêt (mêmes paramètres, jamais modifiés après validation). Vide tant que state != validated.",
  },
  {
    name: `${prefix}.repayment_schedule[].date_maturity`,
    type: "string (YYYY-MM-DD)",
    description: "Date d'échéance prévue (pas la date du paiement effectif).",
  },
  {
    name: `${prefix}.repayment_schedule[].amount`,
    type: "number",
    description: "Montant total de l'échéance (capital + intérêts).",
  },
  { name: `${prefix}.repayment_schedule[].capital`, type: "number", description: "Part de capital de l'échéance." },
  { name: `${prefix}.repayment_schedule[].interest`, type: "number", description: "Part d'intérêts de l'échéance." },
  {
    name: `${prefix}.repayment_schedule[].remaining_amount`,
    type: "number",
    description: "Capital restant du après cette échéance (solde du tableau d'amortissement).",
  },
  {
    name: `${prefix}.repayment_schedule[].paid`,
    type: "boolean",
    description:
      "true si le cumul réellement paye couvre le cumul du jusqu'a cette échéance incluse. Reste cohérent même si une échéance a été réglée en plusieurs fois.",
  },
];

export const insuranceScheduleFields = (prefix: string): FieldDoc[] => [
  {
    name: `${prefix}.insurance_schedule[]`,
    type: "array",
    description: "Échéances d'assurance (une par facture d'assurance postée), sans les identifiants de facture.",
  },
  {
    name: `${prefix}.insurance_schedule[].date_maturity`,
    type: "string (YYYY-MM-DD)",
    description: "Date d'échéance de la facture d'assurance.",
  },
  { name: `${prefix}.insurance_schedule[].amount`, type: "number", description: "Montant de la facture." },
  {
    name: `${prefix}.insurance_schedule[].paid`,
    type: "boolean",
    description: "Calcule à partir des lignes de reglement réellement liées (fiable), pas du payment_state natif d'Odoo.",
  },
];

export const managerLoanExtraFields = (prefix: string): FieldDoc[] => [
  {
    name: `${prefix}.profit`,
    type: "number",
    description: "Bénéfice attendu = (total_repayment_amount - capital) + total_insurance_amount. Même formule que le back-office.",
  },
  { name: `${prefix}.guarantors[]`, type: "array", description: "Avalistes du prêt." },
  {
    name: `${prefix}.guarantors[].id`,
    type: "number",
    description: "member_id de l'avaliste (identifiant nkezefuu.member, pas res.users).",
  },
  { name: `${prefix}.guarantors[].name`, type: "string", description: "Nom de l'avaliste." },
  {
    name: `${prefix}.insurance_invoices[]`,
    type: "array",
    description: "Toutes les factures d'assurance liées (postées ou non).",
  },
  { name: `${prefix}.insurance_invoices[].id`, type: "number", description: "Identifiant de la facture." },
  { name: `${prefix}.insurance_invoices[].name`, type: "string", description: "Numéro de facture (ex. FA/2025/00128)." },
  { name: `${prefix}.insurance_invoices[].amount_total`, type: "number", description: "Montant TTC." },
  {
    name: `${prefix}.insurance_invoices[].invoice_date_due`,
    type: "string (YYYY-MM-DD)",
    description: "Date d'échéance de la facture.",
  },
  {
    name: `${prefix}.insurance_invoices[].payment_state`,
    type: "string",
    description:
      "payment_state natif Odoo (not_paid, partial, paid...). Attention : sur ce circuit il n'est pas toujours a jour ; préférer total_insurance_paid_amount pour un montant fiable.",
  },
];
