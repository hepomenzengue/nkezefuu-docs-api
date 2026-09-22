import type { Endpoint, ErrorDoc, FieldDoc } from "./types";
import { serverError, statusFields } from "./common";

// Ces trois routes verifient le jeton mais ne renvoient qu'un seul message d'authentification.
const tokenError: ErrorDoc = {
  status: 200,
  customstatus: 401,
  message: "Token invalide ou expire",
  when: "En-tete Authorization absent, jeton illisible ou expire.",
};

const modelsUnavailable: ErrorDoc = {
  status: 200,
  customstatus: 404,
  message: "Modeles mobile indisponibles",
  when: "Les modeles nkezefuu.mobile.function / nkezefuu.mobile.role ne sont pas installes (module non à jour).",
};

const functionFields = (prefix: string): FieldDoc[] => [
  { name: `${prefix}.id`, type: "number", description: "Identifiant de la fonction (carte)." },
  { name: `${prefix}.code`, type: "string", description: "Code court de la carte (01, 02, ... 13)." },
  { name: `${prefix}.description`, type: "string", description: "Titre de la carte à afficher." },
  { name: `${prefix}.color_code_light`, type: "string (hex)", description: "Couleur de la carte en mode clair." },
  { name: `${prefix}.color_code_dark`, type: "string (hex)", description: "Couleur de la carte en mode sombre." },
];

const referencedMemberFields = (prefix: string): FieldDoc[] => [
  { name: `${prefix}.name`, type: "string", description: "Nom du membre référence." },
  { name: `${prefix}.actual_balance`, type: "number", description: "Son solde réel." },
  { name: `${prefix}.type`, type: "string", description: "Libellé de son type de membre." },
  { name: `${prefix}.status`, type: "string", description: "Libellé de son statut (En règle, Défaillant...)." },
  {
    name: `${prefix}.status_color`,
    type: "string (hex)",
    description: "Couleur du statut : vert #16A34A pour in_order, rouge #DC2626 pour defaulting, gris clair sinon.",
  },
];

export const mobileEndpoints: Endpoint[] = [
  {
    id: "mobile-functions",
    method: "GET",
    path: "/api/auth/mobile-functions",
    summary: "Catalogue de toutes les cartes de tableau de bord existantes",
    category: "mobile",
    access: "member",
    params: [],
    requestExample: `GET /api/auth/mobile-functions\nAuthorization: Bearer <token>`,
    success: [
      {
        body: {
          mobile_functions: [{ id: 23, code: "01", description: "Historique", color_code_light: "#000000", color_code_dark: "#ffffff" }],
          status: 200,
          customstatus: 200,
        },
      },
    ],
    responseFields: [
      { name: "mobile_functions[]", type: "array", description: "Toutes les cartes, quel que soit le role." },
      ...functionFields("mobile_functions[]"),
      ...statusFields,
    ],
    errors: [tokenError, modelsUnavailable, serverError],
    usage: "Administration / debug : voir toutes les cartes définies.",
  },
  {
    id: "mobile-functions-with-roles",
    method: "GET",
    path: "/api/auth/mobile-functions-with-roles",
    summary: "Catalogue des cartes avec les roles qui y ont accès",
    category: "mobile",
    access: "member",
    params: [],
    requestExample: `GET /api/auth/mobile-functions-with-roles\nAuthorization: Bearer <token>`,
    success: [
      {
        body: {
          mobile_functions: [
            {
              id: 23,
              code: "01",
              description: "Historique",
              color_code_light: "#000000",
              color_code_dark: "#ffffff",
              allowed_roles: [{ id: 2, code: "manager", description: "Responsable mobile" }],
            },
          ],
          status: 200,
          customstatus: 200,
        },
      },
    ],
    responseFields: [
      { name: "mobile_functions[]", type: "array", description: "Toutes les cartes." },
      ...functionFields("mobile_functions[]"),
      { name: "mobile_functions[].allowed_roles[]", type: "array", description: "Roles mobiles auxquels la carte est affectee." },
      { name: "mobile_functions[].allowed_roles[].id", type: "number", description: "Identifiant du role." },
      { name: "mobile_functions[].allowed_roles[].code", type: "string", description: "Code du role." },
      { name: "mobile_functions[].allowed_roles[].description", type: "string", description: "Libellé du role." },
      ...statusFields,
    ],
    errors: [tokenError, modelsUnavailable, serverError],
    usage: "Administration / debug : vérifier l'affectation des cartes aux roles.",
  },
  {
    id: "mobile-functions-by-user",
    method: "GET",
    path: "/api/auth/mobile-functions-by-user",
    summary: "Tableau de bord : les cartes du role du membre connecté, avec leur valeur calculée",
    category: "mobile",
    access: "member",
    params: [],
    requestExample: `GET /api/auth/mobile-functions-by-user\nAuthorization: Bearer <token>`,
    success: [
      {
        body: {
          role: { id: 2, code: "manager", description: "Responsable mobile" },
          mobile_functions: [
            { id: 23, code: "01", description: "Historique", color_code_light: "#000000", color_code_dark: "#ffffff", total: 546630.0 },
            { id: 25, code: "03", description: "A payer", color_code_light: "#000000", color_code_dark: "#ffffff", total: 0.0 },
            { id: 34, code: "12", description: "Mes Prêts", color_code_light: "#000000", color_code_dark: "#ffffff", total: 45000.0 },
            { id: 35, code: "13", description: "Liste des Prêts", color_code_light: "#000000", color_code_dark: "#ffffff", total: 1250000.0 },
          ],
          status: 200,
          customstatus: 200,
        },
      },
    ],
    responseFields: [
      { name: "role", type: "object", description: "Role mobile du membre (id, code, description)." },
      { name: "mobile_functions[]", type: "array", description: "Cartes affectees à ce role, dans l'ordre de création." },
      ...functionFields("mobile_functions[]"),
      {
        name: "mobile_functions[].total",
        type: "number",
        description:
          "Valeur à afficher sur la carte, calculée pour le membre connecté. Historique : solde réel. A recevoir / A payer : recettes / charges en attente. Actions : valeur des actions. Marché : total en vente. Investissements : montant investi. Suivi des Dettes : échéances dépassées (tous membres). Paiements Avalisés : montant garanti. Référencement : nombre de référents. Prévision de trésorerie : total prévisionnel des projets. Mes Référencés : nombre de membres références. Mes Prêts : reste a rembourser sur ses prêts. Liste des Prêts : reste a rembourser, tous emprunteurs.",
      },
      ...statusFields,
    ],
    errors: [
      tokenError,
      modelsUnavailable,
      { status: 200, customstatus: 404, message: "Membre introuvable", when: "Le compte du jeton n'a pas de fiche membre." },
      { status: 200, customstatus: 500, message: "Configuration role mobile indisponible", when: "Le champ mobile_role_id n'existe pas sur le membre (module non à jour)." },
      { status: 200, customstatus: 404, message: "Role mobile introuvable", when: "Aucun role affecte au membre : aucune carte à afficher." },
      serverError,
    ],
    notes: [
      "Chaque carte ouvre l'écran correspondant : Mes Prêts → member-loans, Liste des Prêts → all-loans, À payer → member-charges, etc.",
      "Les cartes 'Mes Prêts' (12) et 'Liste des Prêts' (13) n'apparaissent que si elles ont été rattachées au role dans Paramètres > Rôles Mobiles.",
      "Le calcul des totaux est fait à chaque appel : pas de cache côté serveur.",
    ],
    usage: "Écran d'accueil : construction du tableau de bord.",
  },
  {
    id: "referenced-members-list",
    method: "GET",
    path: "/api/auth/referenced-members-list",
    summary: "Tous les membres références, regroupes par référent",
    category: "referenced_members",
    access: "member",
    params: [],
    requestExample: `GET /api/auth/referenced-members-list\nAuthorization: Bearer <token>`,
    success: [
      {
        body: {
          total_referencers_count: 1,
          members: [
            {
              id: 5,
              name: "Referent Exemple",
              referenced_members: [{ name: "Membre A", actual_balance: 25000, type: "Coopérateur", status: "En règle", status_color: "#16A34A" }],
              referenced_members_count: 1,
            },
          ],
          count: 1,
          status: 200,
          customstatus: 200,
        },
      },
    ],
    responseFields: [
      { name: "total_referencers_count", type: "number", description: "Nombre de référents distincts." },
      { name: "members[]", type: "array", description: "Un élément par référent." },
      { name: "members[].id", type: "number", description: "member_id du référent." },
      { name: "members[].name", type: "string", description: "Nom du référent." },
      { name: "members[].referenced_members[]", type: "array", description: "Membres qu'il a références (hors invites)." },
      ...referencedMemberFields("members[].referenced_members[]"),
      { name: "members[].referenced_members_count", type: "number", description: "Nombre de membres références par ce référent." },
      { name: "count", type: "number", description: "Nombre de référents renvoyés." },
      ...statusFields,
    ],
    errors: [tokenError, serverError],
    usage: "Carte 'Référencement' du tableau de bord.",
  },
  {
    id: "member-referenced-members-list",
    method: "GET",
    path: "/api/auth/member-referenced-members-list",
    summary: "Membres références par le membre connecté",
    category: "referenced_members",
    access: "member",
    params: [],
    requestExample: `GET /api/auth/member-referenced-members-list\nAuthorization: Bearer <token>`,
    success: [
      {
        body: {
          referenced_members: [{ name: "TEMKENG ZAMBOU Arielle", actual_balance: 408825.0, type: "Coopérateur", status: "Défaillant", status_color: "#DC2626" }],
          referenced_members_count: 1,
          status: 200,
          customstatus: 200,
        },
      },
    ],
    responseFields: [
      { name: "referenced_members[]", type: "array", description: "Membres dont le membre connecté est le référent (hors invites)." },
      ...referencedMemberFields("referenced_members[]"),
      { name: "referenced_members_count", type: "number", description: "Nombre de membres références." },
      ...statusFields,
    ],
    errors: [tokenError, { status: 200, customstatus: 404, message: "Membre introuvable", when: "Le compte du jeton n'a pas de fiche membre." }, serverError],
    usage: "Carte 'Mes Référencés' du tableau de bord.",
  },
  {
    id: "project-treasury-forecast-list",
    method: "GET",
    path: "/api/auth/project-treasury-forecast-list",
    summary: "Prévision de trésorerie de chaque projet à fin du mois prochain",
    category: "project_treasury",
    access: "member",
    params: [],
    requestExample: `GET /api/auth/project-treasury-forecast-list\nAuthorization: Bearer <token>`,
    success: [
      {
        body: {
          projects: [
            { project_code: "PRJ-001", project_description: "Projet Assurance", actual_balance: 2500000, charges_to_pay_end_next_month: 400000, treasury_forecast: 2100000 },
          ],
          count: 1,
          status: 200,
          customstatus: 200,
        },
      },
    ],
    responseFields: [
      { name: "projects[]", type: "array", description: "Un élément par projet." },
      { name: "projects[].project_code", type: "string", description: "Code du projet." },
      { name: "projects[].project_description", type: "string", description: "Nom du projet." },
      { name: "projects[].actual_balance", type: "number", description: "Solde réel du projet (écritures postées, échéance passée)." },
      { name: "projects[].charges_to_pay_end_next_month", type: "number", description: "Charges en attente du projet jusqu'à là fin du mois prochain." },
      { name: "projects[].treasury_forecast", type: "number", description: "actual_balance - charges_to_pay_end_next_month : ce dont le projet disposerà fin du mois prochain." },
      { name: "count", type: "number", description: "Nombre de projets." },
      ...statusFields,
    ],
    errors: [tokenError, serverError],
    usage: "Carte 'Prévision de trésorerie' du tableau de bord.",
  },
];
