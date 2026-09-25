import type { Endpoint, ErrorDoc, FieldDoc, ParamDoc } from "./types";
import { authErrors, invalidJson, statusFields } from "./common";

// ---------------------------------------------------------------------------
// Blocs reutilises : deux roles seulement sur tout ce perimetre, admin systeme
// et Gestionnaire des comptes bancaires (role distinct du Gestionnaire nkezefuu,
// qui n'a ici aucun acces, contrairement au reste de l'API). Les nuances plus
// fines (compte precis gere, emetteur/destinataire designe, createur d'une
// transaction) sont dans les notes de chaque endpoint, pas dans "access".
// ---------------------------------------------------------------------------

const bankServerError: ErrorDoc = {
  status: 500,
  customstatus: 500,
  message: "Une erreur est survenue: <detail>",
  when: "Exception non métier. Le détail suit le préfixe.",
};

const adminOnly: ErrorDoc = {
  status: 200,
  customstatus: 403,
  message: "Réservé à l'administrateur système",
  when: "Le compte connecté n'a pas le groupe base.group_system. Même le Gestionnaire des comptes bancaires est refusé ici.",
};

const bankManagerOnly: ErrorDoc = {
  status: 200,
  customstatus: 403,
  message: "Réservé à l'administrateur système et aux gestionnaires des comptes bancaires",
  when: "Ni admin système, ni Gestionnaire des comptes bancaires (nkezefuu.group_nkezefuu_bank_account_manager). Le rôle Gestionnaire nkezefuu seul ne suffit pas.",
};

const memberBankAccountsOnly: ErrorDoc = {
  status: 200,
  customstatus: 403,
  message: "Réservé aux gestionnaires des comptes bancaires",
  when: "Seul le rôle Gestionnaire des comptes bancaires donne accès à cet écran : contrairement au reste de l'API, l'admin système lui-même n'a rien à y faire (il utilise \"Comptes bancaires\").",
};

const accountManagerOnly: ErrorDoc = {
  status: 200,
  customstatus: 403,
  message: "Réservé à l'administrateur système et aux gestionnaires de ce compte",
  when: "Ni admin système, ni Gestionnaire des comptes bancaires précisément dans manager_id de ce compte-là (être gestionnaire d'un autre compte ne suffit pas).",
};

const bankAccountNotFound: ErrorDoc = {
  status: 200,
  customstatus: 404,
  message: "Compte bancaire introuvable",
  when: "account_id ne correspond à aucun nkezefuu.bank.account.",
};

const invalidJsonBank = invalidJson;

// Compte bancaire tel que renvoye par les listes/creation/mise a jour.
const bankAccountFields = (prefix: string, withManagers: boolean): FieldDoc[] => {
  const fields: FieldDoc[] = [
    { name: `${prefix}.id`, type: "number", description: "Identifiant du compte bancaire (à réutiliser comme account_id dans les autres routes)." },
    { name: `${prefix}.general_account.id`, type: "number", description: "Identifiant du compte comptable général (account.account) rattaché." },
    {
      name: `${prefix}.general_account.account`,
      type: "string",
      description: "display_name natif Odoo du compte comptable (\"code name\", ex. \"512100 Banque BICEC\"), à afficher tel quel, jamais reconstruit côté mobile.",
    },
    { name: `${prefix}.description`, type: "string", description: "Libellé du compte bancaire, saisi à la création." },
    { name: `${prefix}.balance`, type: "number", description: "Solde actuel du compte, calculé à partir des écritures comptables postées." },
  ];
  if (withManagers) {
    fields.push(
      { name: `${prefix}.managers[]`, type: "array", description: "Gestionnaires de ce compte." },
      { name: `${prefix}.managers[].id`, type: "number", description: "res.users id du gestionnaire." },
      { name: `${prefix}.managers[].name`, type: "string", description: "Nom du gestionnaire." },
    );
  }
  return fields;
};

const sampleGeneralAccount = (id: number, account: string) => ({ id, account });

// ---------------------------------------------------------------------------
// Comptes bancaires : deux ecrans, comme member-loans / all-loans
// ---------------------------------------------------------------------------

const listAllBankAccounts: Endpoint = {
  id: "bank-accounts-all",
  method: "GET",
  path: "/api/auth/all-bank-accounts",
  summary: "\"Comptes bancaires\" (admin) : tous les comptes de la coopérative, avec leurs gestionnaires",
  category: "bank_accounts",
  access: "admin",
  params: [],
  requestExample: `GET /api/auth/all-bank-accounts\nAuthorization: Bearer <token>`,
  success: [
    {
      body: {
        bank_accounts: [
          {
            id: 7,
            general_account: sampleGeneralAccount(1148, "521102 BANQUE KP"),
            description: "Compte principal",
            balance: 27194350.0,
            managers: [{ id: 12, name: "EPOME NZENGUE Hervé" }],
          },
        ],
        status: 200,
        customstatus: 200,
      },
    },
  ],
  responseFields: [{ name: "bank_accounts[]", type: "array", description: "Tous les comptes bancaires, sans exception." }, ...bankAccountFields("bank_accounts[]", true), ...statusFields],
  errors: [...authErrors, adminOnly, bankServerError],
  notes: [
    "Réservé strictement à l'admin système : ni le rôle Gestionnaire nkezefuu, ni le Gestionnaire des comptes bancaires n'y donnent accès, contrairement au pattern habituel du reste de l'API.",
    "Chaque compte renvoie ses gestionnaires, utile ici puisque l'admin ne les connaît pas d'office (contrairement au gestionnaire, qui se sait concerné).",
  ],
  usage: "Écran \"Comptes bancaires\" (admin) : point d'entrée, tous les comptes.",
};

const listMemberBankAccounts: Endpoint = {
  id: "bank-accounts-member",
  method: "GET",
  path: "/api/auth/member-bank-accounts",
  summary: "\"Mes comptes bancaires\" (gestionnaire) : uniquement les comptes qu'il gère",
  category: "bank_accounts",
  access: "bank_account_manager",
  params: [],
  requestExample: `GET /api/auth/member-bank-accounts\nAuthorization: Bearer <token>`,
  success: [
    {
      body: {
        bank_accounts: [
          {
            id: 7,
            general_account: sampleGeneralAccount(1148, "521102 BANQUE KP"),
            description: "Compte principal",
            balance: 27194350.0,
          },
        ],
        status: 200,
        customstatus: 200,
      },
    },
  ],
  responseFields: [
    { name: "bank_accounts[]", type: "array", description: "Uniquement les comptes dont l'utilisateur connecté fait partie de manager_id." },
    ...bankAccountFields("bank_accounts[]", false),
    ...statusFields,
  ],
  errors: [...authErrors, memberBankAccountsOnly, bankServerError],
  notes: [
    "Contrairement au reste de l'écran, l'admin système n'a PAS accès ici (403), même s'il porte aussi le rôle Gestionnaire des comptes bancaires il verrait quand même ses comptes, mais un admin pur n'a rien à y faire : il utilise \"Comptes bancaires\".",
    "Pas de champ managers : le gestionnaire sait déjà qu'il en fait partie.",
  ],
  usage: "Écran \"Mes comptes bancaires\" (gestionnaire) : point d'entrée.",
};

// ---------------------------------------------------------------------------
// Listes de reference pour les formulaires (creation/mise a jour d'un compte)
// ---------------------------------------------------------------------------

const eligibleAccountsSearch: Endpoint = {
  id: "bank-account-eligible-accounts",
  method: "GET",
  path: "/api/auth/bank-account/eligible-accounts",
  summary: "Recherche de comptes comptables disponibles pour créer/modifier un compte bancaire",
  category: "bank_accounts",
  access: "admin",
  params: [
    {
      name: "search",
      in: "query",
      type: "string",
      required: true,
      description: "1 caractère minimum. Préfixe sur le code ou le nom du compte comptable. Vide ou absent : liste vide, pas d'erreur.",
      example: "512",
    },
  ],
  requestExample: `GET /api/auth/bank-account/eligible-accounts?search=512\nAuthorization: Bearer <token>`,
  success: [
    {
      body: {
        accounts: [sampleGeneralAccount(1150, "512200 Banque société générale")],
        status: 200,
        customstatus: 200,
      },
    },
  ],
  responseFields: [
    { name: "accounts[]", type: "array", description: "Comptes comptables classe 5, non dépréciés, pas déjà rattachés à un compte bancaire existant. 30 résultats max." },
    { name: "accounts[].id", type: "number", description: "À réutiliser tel quel comme account_id à la création/mise à jour." },
    { name: "accounts[].account", type: "string", description: "display_name natif (\"code name\")." },
  ],
  errors: [...authErrors, adminOnly, bankServerError],
  notes: [
    "Même pattern que member-search : le plan comptable peut être long, jamais de liste complète envoyée d'un coup.",
    "Un compte déjà rattaché à un autre compte bancaire n'apparaît jamais, même en cherchant son code exact.",
  ],
  usage: "Champ \"Compte comptable\" du formulaire de création/mise à jour d'un compte bancaire (admin).",
};

const bankAccountManagersList: Endpoint = {
  id: "bank-account-managers-eligible",
  method: "GET",
  path: "/api/auth/bank-account/managers",
  summary: "Tous les membres portant le rôle Gestionnaire des comptes bancaires, éligibles à la création d'un compte",
  category: "bank_accounts",
  access: "admin",
  params: [],
  requestExample: `GET /api/auth/bank-account/managers\nAuthorization: Bearer <token>`,
  success: [{ body: { managers: [{ id: 12, name: "EPOME NZENGUE Hervé" }], status: 200, customstatus: 200 } }],
  responseFields: [
    { name: "managers[]", type: "array", description: "Tous les membres ayant le rôle Gestionnaire des comptes bancaires. Pas de recherche : liste complète, ce rôle est peu nombreux." },
    { name: "managers[].id", type: "number", description: "res.users id, à réutiliser dans manager_id." },
    { name: "managers[].name", type: "string", description: "Nom du gestionnaire." },
  ],
  errors: [...authErrors, adminOnly, bankServerError],
  notes: [
    "Différent de bank-account/{id}/managers : ici c'est la liste globale des gestionnaires éligibles pour créer un compte, pas les gestionnaires d'un compte déjà existant.",
  ],
  usage: "Champ \"Gestionnaire(s)\" du formulaire de création/mise à jour d'un compte bancaire (admin).",
};

// ---------------------------------------------------------------------------
// Creation / mise a jour d'un compte bancaire
// ---------------------------------------------------------------------------

const createBankAccountParams: ParamDoc[] = [
  { name: "account_id", in: "body", type: "number", required: true, description: "id renvoyé par bank-account/eligible-accounts.", example: "1150" },
  { name: "description", in: "body", type: "string", required: true, description: "Libellé du compte bancaire.", example: "Compte principal" },
  {
    name: "manager_id",
    in: "body",
    type: "number[]",
    required: true,
    description: "Liste des ids de bank-account/managers. Au moins un, même pour un seul gestionnaire : toujours un tableau.",
    example: "[12]",
  },
];

const createBankAccount: Endpoint = {
  id: "bank-account-create",
  method: "POST",
  path: "/api/auth/bank-account",
  summary: "Crée un compte bancaire",
  category: "bank_accounts",
  access: "admin",
  params: createBankAccountParams,
  requestExample: `POST /api/auth/bank-account\nAuthorization: Bearer <token>\nContent-Type: application/json\n\n{\n  "account_id": 1150,\n  "description": "Compte principal",\n  "manager_id": [12]\n}`,
  success: [
    {
      body: {
        bank_account: { id: 8, general_account: sampleGeneralAccount(1150, "512200 Banque société générale"), description: "Compte principal", balance: 0.0, managers: [{ id: 12, name: "EPOME NZENGUE Hervé" }] },
        message: "Compte bancaire créé avec succès",
        status: 200,
        customstatus: 200,
      },
    },
  ],
  responseFields: [{ name: "bank_account", type: "object", description: "Le compte créé, complet." }, ...bankAccountFields("bank_account", true), { name: "message", type: "string", description: "Message de confirmation lisible." }, ...statusFields],
  errors: [
    ...authErrors,
    adminOnly,
    invalidJsonBank,
    { status: 200, customstatus: 400, message: "Paramètre(s) manquant(s): <liste>", when: "account_id, description ou manager_id absent du corps." },
    { status: 200, customstatus: 400, message: "Description requise", when: "description vide ou uniquement des espaces." },
    {
      status: 200,
      customstatus: 400,
      message: "Compte comptable invalide : hors classe 5, désactivé, ou déjà rattaché à un autre compte bancaire",
      when: "account_id ne respecte pas le domaine de eligible-accounts, revérifié côté serveur (jamais confiance dans un id envoyé par le client).",
    },
    { status: 200, customstatus: 400, message: "Le gestionnaire est obligatoire", when: "manager_id absent, vide, ou n'est pas un tableau." },
    {
      status: 200,
      customstatus: 400,
      message: "Gestionnaire(s) invalide(s) (pas le rôle Gestionnaire des comptes bancaires) : <ids>",
      when: "Un des id de manager_id ne porte pas le rôle Gestionnaire des comptes bancaires, revérifié côté serveur.",
    },
    bankServerError,
  ],
  notes: ["Réponse conforme à la règle générale de l'API mobile : l'objet complet est renvoyé, jamais juste un id, pour que l'écran (qui reste sur place après création) puisse se recharger sans appel supplémentaire."],
  usage: "Bouton \"Nouveau compte bancaire\" sur l'écran \"Comptes bancaires\" (admin).",
};

const updateBankAccount: Endpoint = {
  id: "bank-account-update",
  method: "POST",
  path: "/api/auth/bank-account/{account_id}/update",
  summary: "Met à jour un compte bancaire existant",
  category: "bank_accounts",
  access: "admin",
  params: [
    { name: "account_id", in: "path", type: "number", required: true, description: "id du compte bancaire à modifier.", example: "8" },
    { ...createBankAccountParams[0], required: false },
    { ...createBankAccountParams[1], required: false },
    { ...createBankAccountParams[2], required: false },
  ],
  requestExample: `POST /api/auth/bank-account/8/update\nAuthorization: Bearer <token>\nContent-Type: application/json\n\n{\n  "description": "Compte principal (siège)"\n}`,
  success: [
    {
      body: {
        bank_account: { id: 8, general_account: sampleGeneralAccount(1150, "512200 Banque société générale"), description: "Compte principal (siège)", balance: 0.0, managers: [{ id: 12, name: "EPOME NZENGUE Hervé" }] },
        message: "Compte bancaire mis à jour avec succès",
        status: 200,
        customstatus: 200,
      },
    },
  ],
  responseFields: [{ name: "bank_account", type: "object", description: "Le compte après modification, complet." }, ...bankAccountFields("bank_account", true), { name: "message", type: "string", description: "Message de confirmation lisible." }, ...statusFields],
  errors: [
    ...authErrors,
    adminOnly,
    bankAccountNotFound,
    invalidJsonBank,
    { status: 200, customstatus: 400, message: "Aucun champ à mettre à jour", when: "Corps JSON valide mais sans aucun des trois champs reconnus." },
    { status: 200, customstatus: 400, message: "Description requise", when: "description envoyé mais vide." },
    { status: 200, customstatus: 400, message: "Compte comptable invalide : hors classe 5, désactivé, ou déjà rattaché à un autre compte bancaire", when: "account_id envoyé et différent de l'actuel, revérifié contre le domaine." },
    { status: 200, customstatus: 400, message: "Le gestionnaire est obligatoire", when: "manager_id envoyé mais vide." },
    bankServerError,
  ],
  notes: [
    "Seuls les champs présents dans le corps sont modifiés (mise à jour partielle).",
    "Si account_id envoyé est identique à l'actuel, aucune revérification (sinon le compte se bloquerait lui-même, déjà \"utilisé\" par lui-même).",
  ],
  usage: "Action \"Modifier\" sur un compte, depuis \"Comptes bancaires\" (admin).",
};

// ---------------------------------------------------------------------------
// Depots / retraits (nkezefuu.bank.account.transaction)
// ---------------------------------------------------------------------------

const transactionFields = (prefix: string): FieldDoc[] => [
  { name: `${prefix}.id`, type: "number", description: "Identifiant de la transaction." },
  { name: `${prefix}.transaction_type`, type: "string", description: "deposit ou withdrawal." },
  { name: `${prefix}.amount`, type: "number", description: "Montant de l'opération." },
  { name: `${prefix}.beneficiary.id`, type: "number", description: "partner_id du bénéficiaire (membre)." },
  { name: `${prefix}.beneficiary.name`, type: "string", description: "Nom du bénéficiaire." },
  { name: `${prefix}.description`, type: "string", description: "Libellé libre, saisi ou repris de la configuration." },
  { name: `${prefix}.transaction_date`, type: "string (YYYY-MM-DD)", description: "Toujours imposée par le serveur, jamais envoyée par le client." },
  { name: `${prefix}.state`, type: "string", description: "draft (brouillon) ou completed (réalisée)." },
  { name: `${prefix}.created_by.id`, type: "number", description: "create_uid : qui a initié cette transaction." },
  { name: `${prefix}.created_by.name`, type: "string", description: "Nom du créateur." },
  { name: `${prefix}.can_edit`, type: "boolean", description: "true si l'appelant peut modifier ce brouillon (admin, ou lui-même s'il en est le créateur)." },
  { name: `${prefix}.can_validate`, type: "boolean", description: "Même règle que can_edit." },
  { name: `${prefix}.can_cancel`, type: "boolean", description: "true uniquement pour l'admin système, sur une transaction réalisée." },
];

const beneficiarySearch: Endpoint = {
  id: "bank-account-beneficiary-search",
  method: "GET",
  path: "/api/auth/bank-account/beneficiary-search",
  summary: "Recherche du bénéficiaire (membre) d'un dépôt/retrait",
  category: "bank_accounts",
  access: "bank_account_manager",
  params: [
    { name: "search", in: "query", type: "string", required: true, description: "1 caractère minimum. Préfixe sur le nom, l'identifiant ou le téléphone.", example: "ken" },
  ],
  requestExample: `GET /api/auth/bank-account/beneficiary-search?search=ken\nAuthorization: Bearer <token>`,
  success: [{ body: { beneficiaries: [{ id: 245, name: "KENMOE Nelson" }], status: 200, customstatus: 200 } }],
  responseFields: [
    { name: "beneficiaries[]", type: "array", description: "Membres uniquement (pas les projets), 30 résultats max." },
    { name: "beneficiaries[].id", type: "number", description: "partner_id du membre, à réutiliser tel quel comme partner_id dans la création/mise à jour d'une transaction." },
    { name: "beneficiaries[].name", type: "string", description: "Nom du membre." },
  ],
  errors: [...authErrors, bankManagerOnly, bankServerError],
  notes: [
    "Ne réutilise volontairement pas member-search : cette route renvoie un partner_id (celui attendu par la transaction), pas un member_id/user_id.",
    "Choix délibéré de limiter aux membres : un projet ne peut pas être bénéficiaire d'un dépôt/retrait côté mobile, même si le modèle l'autoriserait en théorie.",
    "Recherche générale, non liée à un compte bancaire précis.",
  ],
  usage: "Champ \"Bénéficiaire\" du formulaire \"Nouvelle transaction\".",
};

const listAccountTransactions: Endpoint = {
  id: "bank-account-transactions-list",
  method: "GET",
  path: "/api/auth/bank-account/{account_id}/transactions",
  summary: "\"Mouvements bancaires\" d'un compte : tous les dépôts/retraits, tous états",
  category: "bank_accounts",
  access: "bank_account_manager",
  params: [{ name: "account_id", in: "path", type: "number", required: true, description: "id du compte bancaire.", example: "7" }],
  requestExample: `GET /api/auth/bank-account/7/transactions\nAuthorization: Bearer <token>`,
  success: [
    {
      body: {
        transactions: [
          {
            id: 34,
            transaction_type: "deposit",
            amount: 50000.0,
            beneficiary: { id: 245, name: "KENMOE Nelson" },
            description: "Dépôt guichet",
            transaction_date: "2026-09-25",
            state: "draft",
            created_by: { id: 12, name: "EPOME NZENGUE Hervé" },
            can_edit: true,
            can_validate: true,
            can_cancel: false,
          },
        ],
        status: 200,
        customstatus: 200,
      },
    },
  ],
  responseFields: [{ name: "transactions[]", type: "array", description: "Brouillons et transactions réalisées mélangés, triés du plus récent au plus ancien." }, ...transactionFields("transactions[]"), ...statusFields],
  errors: [...authErrors, bankAccountNotFound, accountManagerOnly, bankServerError],
  notes: [
    "can_edit/can_validate/can_cancel sont déjà calculés par ligne selon qui regarde : pas besoin de comparer soi-même created_by à l'utilisateur connecté.",
    "L'historique comptable détaillé (écritures postées) reste réservé au back-office, pas exposé ici.",
  ],
  usage: "Action \"Mouvements bancaires\", depuis un compte déplié sur \"Comptes bancaires\"/\"Mes comptes bancaires\".",
};

const createTransaction: Endpoint = {
  id: "bank-account-transaction-create",
  method: "POST",
  path: "/api/auth/bank-account/{account_id}/transaction",
  summary: "Enregistre un dépôt/retrait sur un compte, en brouillon ou validé directement",
  category: "bank_accounts",
  access: "bank_account_manager",
  params: [
    { name: "account_id", in: "path", type: "number", required: true, description: "Compte sur lequel opérer.", example: "7" },
    { name: "transaction_type", in: "body", type: "string", required: true, description: "\"deposit\" ou \"withdrawal\".", example: "deposit" },
    { name: "partner_id", in: "body", type: "number", required: true, description: "id renvoyé par beneficiary-search.", example: "245" },
    { name: "amount", in: "body", type: "number", required: true, description: "Montant, positif.", example: "50000" },
    { name: "description", in: "body", type: "string", required: false, description: "Texte libre." },
    {
      name: "validate",
      in: "body",
      type: "boolean",
      required: false,
      description: "true : crée ET confirme en un seul appel (écriture comptable posée immédiatement). Absent/false : reste en brouillon.",
      example: "true",
    },
  ],
  requestExample: `POST /api/auth/bank-account/7/transaction\nAuthorization: Bearer <token>\nContent-Type: application/json\n\n{\n  "transaction_type": "deposit",\n  "partner_id": 245,\n  "amount": 50000,\n  "description": "Dépôt guichet",\n  "validate": true\n}`,
  success: [
    {
      label: "validate absent : reste en brouillon",
      body: {
        transaction: { id: 34, transaction_type: "deposit", amount: 50000.0, beneficiary: { id: 245, name: "KENMOE Nelson" }, description: "Dépôt guichet", transaction_date: "2026-09-25", state: "draft", created_by: { id: 12, name: "EPOME NZENGUE Hervé" }, can_edit: true, can_validate: true, can_cancel: false },
        message: "Transaction enregistrée en brouillon",
        status: 200,
        customstatus: 200,
      },
    },
    {
      label: "validate: true, confirmation réussie",
      body: {
        transaction: { id: 34, transaction_type: "deposit", amount: 50000.0, beneficiary: { id: 245, name: "KENMOE Nelson" }, description: "Dépôt guichet", transaction_date: "2026-09-25", state: "completed", created_by: { id: 12, name: "EPOME NZENGUE Hervé" }, can_edit: false, can_validate: false, can_cancel: false },
        message: "Transaction créée et validée avec succès",
        status: 200,
        customstatus: 200,
      },
    },
  ],
  responseFields: [{ name: "transaction", type: "object", description: "La transaction, complète." }, ...transactionFields("transaction"), { name: "message", type: "string", description: "Message de confirmation lisible." }, ...statusFields],
  errors: [
    ...authErrors,
    bankAccountNotFound,
    accountManagerOnly,
    invalidJsonBank,
    { status: 200, customstatus: 400, message: "Paramètre(s) manquant(s): <liste>", when: "transaction_type, partner_id ou amount absent." },
    { status: 200, customstatus: 400, message: "transaction_type doit être 'deposit' ou 'withdrawal'", when: "Toute autre valeur." },
    { status: 200, customstatus: 400, message: "Bénéficiaire invalide pour un dépôt/retrait", when: "partner_id ne correspond pas à un membre valide, revérifié côté serveur (jamais confiance dans le client)." },
    {
      status: 200,
      customstatus: 400,
      message: "Le <Membre|Projet> <nom> (Solde: <montant> FCFA)\\nne dispose pas de fonds suffisants pour effectuer un retrait de <montant> FCFA.",
      when: "Retrait : le solde réel du bénéficiaire ne couvre pas le montant. Ne survient qu'à la validation (validate: true), pas à la simple création en brouillon.",
    },
    {
      status: 200,
      customstatus: 400,
      message: "Le <compte> (Solde: <montant> FCFA)\\nne dispose pas de fonds suffisants pour effectuer un dépôt de <montant> FCFA.",
      when: "Dépôt : le compte bancaire lui-même n'est pas assez approvisionné pour créditer le bénéficiaire. Un dépôt crédite le bénéficiaire DEPUIS le compte bancaire, d'où cette contrainte à contre-sens de l'intuition habituelle.",
    },
    { status: 200, customstatus: 400, message: "le Journal pour retraits n'est pas ou est mal configuré dans les paramètres", when: "Retrait, config manquante." },
    { status: 200, customstatus: 400, message: "le Journal des recharges de comptes bancaires n'est pas ou est mal configuré dans les paramètres", when: "Dépôt, config manquante." },
    {
      status: 200,
      customstatus: 400,
      message: "Vous ne pouvez pas retirer l'argent de votre compte car vous êtes \"<statut>\".",
      when: "Retrait pour un membre au statut autre que \"En règle\", lui-même connecté.",
    },
    bankServerError,
  ],
  notes: [
    "Si la création réussit mais que la confirmation échoue (solde insuffisant, config manquante...), la transaction reste enregistrée en brouillon : la réponse contient quand même \"transaction\" à jour, avec \"error\" en plus, pas juste un message d'échec sec.",
    "La date est toujours imposée par le serveur (aujourd'hui), jamais envoyée par le mobile.",
    "manager_id n'est jamais à envoyer : c'est un reflet calculé des gestionnaires du compte, pas \"qui a initié\" (c'est create_uid/created_by qui joue ce rôle).",
  ],
  usage: "Bouton \"Nouvelle transaction\" sur l'écran \"Mouvements bancaires\" d'un compte.",
};

const updateTransaction: Endpoint = {
  id: "bank-account-transaction-update",
  method: "POST",
  path: "/api/auth/bank-account/transaction/{transaction_id}/update",
  summary: "Modifie un brouillon de dépôt/retrait existant, éventuellement en le validant dans le même appel",
  category: "bank_accounts",
  access: "bank_account_manager",
  params: [
    { name: "transaction_id", in: "path", type: "number", required: true, description: "id de la transaction.", example: "34" },
    { name: "transaction_type", in: "body", type: "string", required: false, description: "\"deposit\" ou \"withdrawal\"." },
    { name: "partner_id", in: "body", type: "number", required: false, description: "id renvoyé par beneficiary-search." },
    { name: "amount", in: "body", type: "number", required: false, description: "Nouveau montant." },
    { name: "description", in: "body", type: "string", required: false, description: "Nouveau libellé." },
    { name: "validate", in: "body", type: "boolean", required: false, description: "true : modifie ET confirme en un seul appel." },
  ],
  requestExample: `POST /api/auth/bank-account/transaction/34/update\nAuthorization: Bearer <token>\nContent-Type: application/json\n\n{\n  "amount": 55000\n}`,
  success: [
    {
      body: {
        transaction: { id: 34, transaction_type: "deposit", amount: 55000.0, beneficiary: { id: 245, name: "KENMOE Nelson" }, description: "Dépôt guichet", transaction_date: "2026-09-25", state: "draft", created_by: { id: 12, name: "EPOME NZENGUE Hervé" }, can_edit: true, can_validate: true, can_cancel: false },
        message: "Brouillon mis à jour",
        status: 200,
        customstatus: 200,
      },
    },
  ],
  responseFields: [{ name: "transaction", type: "object", description: "La transaction, complète." }, ...transactionFields("transaction"), { name: "message", type: "string", description: "Message de confirmation lisible." }, ...statusFields],
  errors: [
    ...authErrors,
    { status: 200, customstatus: 404, message: "Transaction introuvable", when: "transaction_id inconnu." },
    {
      status: 200,
      customstatus: 403,
      message: "Seul l'administrateur système ou le créateur de cette transaction peut la modifier",
      when: "Un autre gestionnaire du même compte, même s'il gère ce compte, ne peut pas modifier le brouillon de quelqu'un d'autre : lecture seule pour lui.",
    },
    { status: 200, customstatus: 400, message: "Seule une transaction en brouillon peut être modifiée", when: "state != draft." },
    invalidJsonBank,
    { status: 200, customstatus: 400, message: "transaction_type doit être 'deposit' ou 'withdrawal'", when: "Valeur envoyée invalide." },
    { status: 200, customstatus: 400, message: "Bénéficiaire invalide pour un dépôt/retrait", when: "partner_id envoyé invalide." },
    { status: 200, customstatus: 400, message: "Aucun champ à mettre à jour", when: "Corps JSON valide mais vide de champs reconnus." },
    { status: 200, customstatus: 400, message: "ne dispose pas de fonds suffisants...", when: "Avec validate: true, mêmes contraintes de solvabilité qu'à la création." },
    bankServerError,
  ],
  notes: ["Seuls les champs présents dans le corps sont modifiés (mise à jour partielle)."],
  usage: "Modifier un brouillon depuis \"Mouvements bancaires\" (créateur uniquement).",
};

const validateTransaction: Endpoint = {
  id: "bank-account-transaction-validate",
  method: "POST",
  path: "/api/auth/bank-account/transaction/{transaction_id}/validate",
  summary: "Brouillon → réalisé : pose l'écriture comptable",
  category: "bank_accounts",
  access: "bank_account_manager",
  params: [{ name: "transaction_id", in: "path", type: "number", required: true, description: "id de la transaction.", example: "34" }],
  requestExample: `POST /api/auth/bank-account/transaction/34/validate\nAuthorization: Bearer <token>`,
  success: [
    {
      body: {
        transaction: { id: 34, transaction_type: "deposit", amount: 55000.0, beneficiary: { id: 245, name: "KENMOE Nelson" }, description: "Dépôt guichet", transaction_date: "2026-09-25", state: "completed", created_by: { id: 12, name: "EPOME NZENGUE Hervé" }, can_edit: false, can_validate: false, can_cancel: false },
        message: "Transaction validée avec succès",
        status: 200,
        customstatus: 200,
      },
    },
  ],
  responseFields: [{ name: "transaction", type: "object", description: "La transaction, complète." }, ...transactionFields("transaction"), { name: "message", type: "string", description: "Message de confirmation lisible." }, ...statusFields],
  errors: [
    ...authErrors,
    { status: 200, customstatus: 404, message: "Transaction introuvable", when: "" },
    { status: 200, customstatus: 403, message: "Seul l'administrateur système ou le créateur de cette transaction peut la valider", when: "L'admin peut valider n'importe laquelle ; un gestionnaire uniquement la sienne." },
    { status: 200, customstatus: 400, message: "Seule une transaction en brouillon peut être validée", when: "state != draft." },
    { status: 200, customstatus: 400, message: "ne dispose pas de fonds suffisants...", when: "Contrainte de solvabilité (compte bancaire pour un dépôt, bénéficiaire pour un retrait)." },
    bankServerError,
  ],
  notes: ["L'admin peut valider n'importe quelle transaction, même créée par un gestionnaire ; un gestionnaire ne peut valider que la sienne."],
  usage: "Bouton \"Valider\" sur une ligne en brouillon, depuis \"Mouvements bancaires\".",
};

const cancelTransaction: Endpoint = {
  id: "bank-account-transaction-cancel",
  method: "POST",
  path: "/api/auth/bank-account/transaction/{transaction_id}/cancel",
  summary: "Réalisé → brouillon : supprime l'écriture comptable posée",
  category: "bank_accounts",
  access: "admin",
  params: [{ name: "transaction_id", in: "path", type: "number", required: true, description: "id de la transaction.", example: "34" }],
  requestExample: `POST /api/auth/bank-account/transaction/34/cancel\nAuthorization: Bearer <token>`,
  success: [
    {
      body: {
        transaction: { id: 34, transaction_type: "deposit", amount: 55000.0, beneficiary: { id: 245, name: "KENMOE Nelson" }, description: "Dépôt guichet", transaction_date: "2026-09-25", state: "draft", created_by: { id: 12, name: "EPOME NZENGUE Hervé" }, can_edit: true, can_validate: true, can_cancel: false },
        message: "Transaction annulée, revenue en brouillon",
        status: 200,
        customstatus: 200,
      },
    },
  ],
  responseFields: [{ name: "transaction", type: "object", description: "La transaction, complète." }, ...transactionFields("transaction"), { name: "message", type: "string", description: "Message de confirmation lisible." }, ...statusFields],
  errors: [
    ...authErrors,
    adminOnly,
    { status: 200, customstatus: 404, message: "Transaction introuvable", when: "" },
    { status: 200, customstatus: 400, message: "Seule une transaction réalisée peut être annulée", when: "state != completed." },
    bankServerError,
  ],
  notes: ["Admin seul, sans exception, même pas le créateur de la transaction : reproduit exactement la restriction déjà en place côté back-office."],
  usage: "Bouton \"Annuler\" sur une ligne réalisée, depuis \"Mouvements bancaires\" (admin uniquement).",
};

// ---------------------------------------------------------------------------
// Virements bancaires (nkezefuu.bank.transfer)
// ---------------------------------------------------------------------------

const transferFields = (prefix: string, withDirection: boolean): FieldDoc[] => {
  const fields: FieldDoc[] = [
    { name: `${prefix}.id`, type: "number", description: "Identifiant du virement." },
    { name: `${prefix}.name`, type: "string", description: "Référence lisible, calculée (vide/\"Nouveau Virement\" tant que draft)." },
    { name: `${prefix}.sender_account.id`, type: "number", description: "id du compte bancaire émetteur." },
    { name: `${prefix}.sender_account.general_account`, type: "string", description: "display_name du compte comptable émetteur." },
    { name: `${prefix}.sender_manager.id`, type: "number", description: "Émetteur désigné : seul lui (ou l'admin) peut modifier/soumettre/annuler ce virement." },
    { name: `${prefix}.sender_manager.name`, type: "string", description: "Nom de l'émetteur désigné." },
    { name: `${prefix}.recipient_account.id`, type: "number", description: "id du compte bancaire destinataire." },
    { name: `${prefix}.recipient_account.general_account`, type: "string", description: "display_name du compte comptable destinataire." },
    { name: `${prefix}.recipient_manager.id`, type: "number", description: "Destinataire désigné : seul lui (ou l'admin) peut valider/rejeter ce virement." },
    { name: `${prefix}.recipient_manager.name`, type: "string", description: "Nom du destinataire désigné." },
    { name: `${prefix}.amount`, type: "number", description: "Montant du virement." },
    { name: `${prefix}.transfer_date`, type: "string (YYYY-MM-DD)", description: "Toujours imposée par le serveur." },
    { name: `${prefix}.description`, type: "string", description: "Libellé libre." },
    { name: `${prefix}.state`, type: "string", description: "draft, pending, completed ou rejected. completed et rejected sont définitifs, aucun retour possible." },
    { name: `${prefix}.can_edit`, type: "boolean", description: "true si l'appelant peut modifier ce brouillon." },
    { name: `${prefix}.can_submit`, type: "boolean", description: "true si l'appelant peut soumettre ce brouillon." },
    { name: `${prefix}.can_cancel`, type: "boolean", description: "true si l'appelant peut annuler ce virement en attente." },
    { name: `${prefix}.can_approve`, type: "boolean", description: "true si l'appelant peut valider ce virement en attente." },
    { name: `${prefix}.can_reject`, type: "boolean", description: "true si l'appelant peut rejeter ce virement en attente." },
  ];
  if (withDirection) {
    fields.push({
      name: `${prefix}.direction`,
      type: "string",
      description: "\"sent\" ou \"received\", par rapport au compte demandé dans l'URL. Évite d'avoir à comparer sender/recipient soi-même.",
    });
  }
  return fields;
};

const sampleTransfer = (overrides: Record<string, unknown> = {}) => ({
  id: 51,
  name: "Hervé(521102)→Sarah(521101)/100000 FCFA/2026-09-25",
  sender_account: sampleGeneralAccount(7, "521102 BANQUE KP"),
  sender_manager: { id: 12, name: "EPOME NZENGUE Hervé" },
  recipient_account: sampleGeneralAccount(9, "521101 Afriland First Bank"),
  recipient_manager: { id: 18, name: "NGONO Sarah" },
  amount: 100000.0,
  transfer_date: "2026-09-25",
  description: "Réapprovisionnement",
  state: "draft",
  can_edit: true,
  can_submit: true,
  can_cancel: false,
  can_approve: false,
  can_reject: false,
  ...overrides,
});

const recipientAccounts: Endpoint = {
  id: "bank-account-recipients",
  method: "GET",
  path: "/api/auth/bank-account/recipients",
  summary: "Tous les comptes bancaires, pour choisir un destinataire de virement",
  category: "bank_accounts",
  access: "bank_account_manager",
  params: [],
  requestExample: `GET /api/auth/bank-account/recipients\nAuthorization: Bearer <token>`,
  success: [{ body: { bank_accounts: [{ id: 9, general_account: sampleGeneralAccount(1146, "521101 Afriland First Bank"), description: "Compte secondaire", balance: -4546034.0 }], status: 200, customstatus: 200 } }],
  responseFields: [{ name: "bank_accounts[]", type: "array", description: "Tous les comptes de la coopérative, sans restriction : n'importe lequel peut être destinataire, contrairement à l'émetteur." }, ...bankAccountFields("bank_accounts[]", false), ...statusFields],
  errors: [...authErrors, bankManagerOnly, bankServerError],
  notes: ["Différent de all-bank-accounts (réservée admin) et de member-bank-accounts (scopée à soi) : ici, ouvert à tout gestionnaire, uniquement pour choisir une destination."],
  usage: "Étape 1 du formulaire \"Nouveau virement\" : choisir le compte destinataire.",
};

const singleAccountManagers: Endpoint = {
  id: "bank-account-single-managers",
  method: "GET",
  path: "/api/auth/bank-account/{account_id}/managers",
  summary: "Gestionnaires d'un compte bancaire précis, pour désigner le destinataire d'un virement",
  category: "bank_accounts",
  access: "bank_account_manager",
  params: [{ name: "account_id", in: "path", type: "number", required: true, description: "Compte destinataire déjà choisi.", example: "9" }],
  requestExample: `GET /api/auth/bank-account/9/managers\nAuthorization: Bearer <token>`,
  success: [{ body: { managers: [{ id: 18, name: "NGONO Sarah" }], status: 200, customstatus: 200 } }],
  responseFields: [
    { name: "managers[]", type: "array", description: "Gestionnaires de CE compte précis (pas la liste globale)." },
    { name: "managers[].id", type: "number", description: "res.users id, à réutiliser comme recipient_manager_id." },
    { name: "managers[].name", type: "string", description: "Nom du gestionnaire." },
  ],
  errors: [...authErrors, bankManagerOnly, bankAccountNotFound, bankServerError],
  notes: ["Différent de bank-account/managers (liste globale des gestionnaires éligibles, pour créer un compte) : ici, uniquement ceux de ce compte-là."],
  usage: "Étape 2 du formulaire \"Nouveau virement\" : une fois le compte destinataire choisi, désigner qui en est le destinataire précis.",
};

const listAccountTransfers: Endpoint = {
  id: "bank-account-transfers-list",
  method: "GET",
  path: "/api/auth/bank-account/{account_id}/transfers",
  summary: "\"Virements bancaires\" d'un compte : tous les virements où il est émetteur ou destinataire",
  category: "bank_accounts",
  access: "bank_account_manager",
  params: [{ name: "account_id", in: "path", type: "number", required: true, description: "id du compte bancaire.", example: "7" }],
  requestExample: `GET /api/auth/bank-account/7/transfers\nAuthorization: Bearer <token>`,
  success: [{ body: { transfers: [sampleTransfer({ direction: "sent" })], status: 200, customstatus: 200 } }],
  responseFields: [{ name: "transfers[]", type: "array", description: "Tous états mélangés, triés du plus récent au plus ancien." }, ...transferFields("transfers[]", true), ...statusFields],
  errors: [...authErrors, bankAccountNotFound, accountManagerOnly, bankServerError],
  notes: [
    "direction indique le sens par rapport à ce compte précis : \"sent\" si ce compte est sender_account, \"received\" sinon.",
    "Contrairement aux vues personnelles (sent/received), montre aussi les virements des AUTRES gestionnaires de ce même compte.",
  ],
  usage: "Action \"Virements bancaires\", depuis un compte déplié sur \"Comptes bancaires\"/\"Mes comptes bancaires\".",
};

const createTransferParams: ParamDoc[] = [
  { name: "sender_account_id", in: "body", type: "number", required: true, description: "Compte émetteur, doit être géré par l'appelant (sauf admin).", example: "7" },
  { name: "recipient_account_id", in: "body", type: "number", required: true, description: "id renvoyé par bank-account/recipients.", example: "9" },
  { name: "recipient_manager_id", in: "body", type: "number", required: true, description: "id renvoyé par bank-account/{id}/managers du compte destinataire choisi.", example: "18" },
  { name: "amount", in: "body", type: "number", required: true, description: "Montant du virement, positif.", example: "100000" },
  { name: "description", in: "body", type: "string", required: false, description: "Nouveau libellé." },
  { name: "validate", in: "body", type: "boolean", required: false, description: "true : crée ET soumet (brouillon → en attente) en un seul appel." },
  {
    name: "sender_manager_id",
    in: "body",
    type: "number",
    required: false,
    description: "Obligatoire uniquement pour un admin (le modèle ne le verrouille pas automatiquement pour lui comme pour un gestionnaire) : doit gérer le compte émetteur choisi.",
    example: "12",
  },
];

const createTransfer: Endpoint = {
  id: "bank-transfer-create",
  method: "POST",
  path: "/api/auth/bank-transfer",
  summary: "Crée un virement bancaire, en brouillon ou soumis directement",
  category: "bank_accounts",
  access: "bank_account_manager",
  params: createTransferParams,
  requestExample: `POST /api/auth/bank-transfer\nAuthorization: Bearer <token>\nContent-Type: application/json\n\n{\n  "sender_account_id": 7,\n  "recipient_account_id": 9,\n  "recipient_manager_id": 18,\n  "amount": 100000,\n  "description": "Réapprovisionnement",\n  "validate": true\n}`,
  success: [
    { label: "validate absent : reste en brouillon", body: { transfer: sampleTransfer(), message: "Virement enregistré en brouillon", status: 200, customstatus: 200 } },
    {
      label: "validate: true, soumission réussie",
      body: { transfer: sampleTransfer({ state: "pending", can_edit: false, can_submit: false, can_cancel: true }), message: "Virement créé et soumis avec succès", status: 200, customstatus: 200 },
    },
  ],
  responseFields: [{ name: "transfer", type: "object", description: "Le virement, complet." }, ...transferFields("transfer", false), { name: "message", type: "string", description: "Message de confirmation lisible." }, ...statusFields],
  errors: [
    ...authErrors,
    invalidJsonBank,
    { status: 200, customstatus: 400, message: "Paramètre(s) manquant(s): <liste>", when: "sender_account_id, recipient_account_id, recipient_manager_id ou amount absent." },
    { status: 200, customstatus: 404, message: "Compte émetteur introuvable", when: "" },
    accountManagerOnly,
    { status: 200, customstatus: 404, message: "Compte destinataire introuvable", when: "" },
    { status: 200, customstatus: 400, message: "Le destinataire choisi ne gère pas ce compte", when: "recipient_manager_id n'est pas dans manager_id du compte destinataire, revérifié côté serveur." },
    { status: 200, customstatus: 400, message: "sender_manager_id requis et doit gérer le compte émetteur", when: "Appelant admin sans sender_manager_id valide fourni." },
    { status: 200, customstatus: 400, message: "Le Compte bancaire emetteur et le compte bancaire destinataire ne peuvent pas être identiques.", when: "Contrainte du modèle, toujours active." },
    { status: 200, customstatus: 400, message: "Le montant du virement doit être supérieur à zéro.", when: "amount <= 0." },
    { status: 200, customstatus: 400, message: "Le journal des virements n'est pas encore configuré.", when: "Config nkezefuu.transfer_journal_id absente." },
    { status: 200, customstatus: 400, message: "Le préfixe de la pièce comptable des virements n'est pas encore configuré.", when: "Config nkezefuu.prefix_transfer_move absente." },
    bankServerError,
  ],
  notes: [
    "Pour un gestionnaire (pas admin), sender_manager_id est automatiquement lui-même côté serveur, même si un autre id est envoyé : impossible d'émettre au nom de quelqu'un d'autre.",
    "Pour un admin, sender_manager_id doit être fourni explicitement et doit gérer le compte émetteur choisi.",
    "Si la création réussit mais que la soumission échoue, le virement reste en brouillon, réponse avec \"error\" en plus de \"transfer\" à jour.",
    "La date est toujours imposée par le serveur.",
  ],
  usage: "Bouton \"Nouveau virement\" sur l'écran \"Virements bancaires\" d'un compte (émetteur pré-rempli).",
};

const updateTransfer: Endpoint = {
  id: "bank-transfer-update",
  method: "POST",
  path: "/api/auth/bank-transfer/{transfer_id}/update",
  summary: "Modifie un virement en brouillon, éventuellement en le soumettant dans le même appel",
  category: "bank_accounts",
  access: "bank_account_manager",
  params: [
    { name: "transfer_id", in: "path", type: "number", required: true, description: "id du virement.", example: "51" },
    { ...createTransferParams[0], required: false },
    { ...createTransferParams[1], required: false },
    { ...createTransferParams[2], required: false },
    { ...createTransferParams[3], required: false },
    { ...createTransferParams[4], required: false },
    { ...createTransferParams[5], required: false },
    { ...createTransferParams[6], required: false },
  ],
  requestExample: `POST /api/auth/bank-transfer/51/update\nAuthorization: Bearer <token>\nContent-Type: application/json\n\n{\n  "amount": 120000\n}`,
  success: [{ body: { transfer: sampleTransfer({ amount: 120000.0 }), message: "Brouillon mis à jour", status: 200, customstatus: 200 } }],
  responseFields: [{ name: "transfer", type: "object", description: "Le virement, complet." }, ...transferFields("transfer", false), { name: "message", type: "string", description: "Message de confirmation lisible." }, ...statusFields],
  errors: [
    ...authErrors,
    { status: 200, customstatus: 404, message: "Virement introuvable", when: "" },
    {
      status: 200,
      customstatus: 403,
      message: "Seul l'administrateur système ou l'émetteur désigné peut modifier ce virement",
      when: "Un autre gestionnaire du même compte émetteur ne peut pas modifier le brouillon de quelqu'un d'autre.",
    },
    { status: 200, customstatus: 400, message: "Seul un virement en brouillon peut être modifié", when: "state != draft." },
    invalidJsonBank,
    { status: 200, customstatus: 404, message: "Compte émetteur introuvable", when: "sender_account_id envoyé invalide." },
    accountManagerOnly,
    { status: 200, customstatus: 404, message: "Compte destinataire introuvable", when: "" },
    { status: 200, customstatus: 400, message: "Le destinataire choisi ne gère pas ce compte", when: "" },
    { status: 200, customstatus: 400, message: "Aucun champ à mettre à jour", when: "" },
    bankServerError,
  ],
  notes: ["Seuls les champs présents dans le corps sont modifiés."],
  usage: "Modifier un brouillon depuis \"Virements bancaires\" (émetteur désigné uniquement).",
};

const submitTransfer: Endpoint = {
  id: "bank-transfer-submit",
  method: "POST",
  path: "/api/auth/bank-transfer/{transfer_id}/submit",
  summary: "Brouillon → en attente",
  category: "bank_accounts",
  access: "bank_account_manager",
  params: [{ name: "transfer_id", in: "path", type: "number", required: true, description: "id du virement.", example: "51" }],
  requestExample: `POST /api/auth/bank-transfer/51/submit\nAuthorization: Bearer <token>`,
  success: [{ body: { transfer: sampleTransfer({ state: "pending", can_edit: false, can_submit: false, can_cancel: true }), message: "Virement soumis, en attente de validation", status: 200, customstatus: 200 } }],
  responseFields: [{ name: "transfer", type: "object", description: "Le virement, complet." }, ...transferFields("transfer", false), { name: "message", type: "string", description: "Message de confirmation lisible." }, ...statusFields],
  errors: [
    ...authErrors,
    { status: 200, customstatus: 404, message: "Virement introuvable", when: "" },
    { status: 200, customstatus: 403, message: "Seul l'administrateur système ou l'émetteur désigné peut soumettre ce virement", when: "" },
    { status: 200, customstatus: 400, message: "Seul un virement en brouillon peut être soumis", when: "state != draft." },
    bankServerError,
  ],
  usage: "Alternative à \"validate: true\" sur create/update : soumettre séparément un brouillon déjà enregistré.",
};

const cancelTransfer: Endpoint = {
  id: "bank-transfer-cancel",
  method: "POST",
  path: "/api/auth/bank-transfer/{transfer_id}/cancel",
  summary: "En attente → brouillon",
  category: "bank_accounts",
  access: "bank_account_manager",
  params: [{ name: "transfer_id", in: "path", type: "number", required: true, description: "id du virement.", example: "51" }],
  requestExample: `POST /api/auth/bank-transfer/51/cancel\nAuthorization: Bearer <token>`,
  success: [{ body: { transfer: sampleTransfer({ state: "draft" }), message: "Virement annulé, revenu en brouillon", status: 200, customstatus: 200 } }],
  responseFields: [{ name: "transfer", type: "object", description: "Le virement, complet." }, ...transferFields("transfer", false), { name: "message", type: "string", description: "Message de confirmation lisible." }, ...statusFields],
  errors: [
    ...authErrors,
    { status: 200, customstatus: 404, message: "Virement introuvable", when: "" },
    { status: 200, customstatus: 403, message: "Seul l'administrateur système ou l'émetteur désigné peut annuler ce virement", when: "" },
    { status: 200, customstatus: 400, message: "Seul un virement en attente peut être annulé", when: "state != pending." },
    bankServerError,
  ],
  notes: ["Uniquement depuis \"en attente\" : un virement complété ou rejeté est définitif, aucune annulation possible dans les deux cas."],
  usage: "Bouton \"Annuler\" sur un virement en attente, émetteur désigné uniquement.",
};

const approveTransfer: Endpoint = {
  id: "bank-transfer-approve",
  method: "POST",
  path: "/api/auth/bank-transfer/{transfer_id}/approve",
  summary: "En attente → complété : pose l'écriture comptable, définitif",
  category: "bank_accounts",
  access: "bank_account_manager",
  params: [{ name: "transfer_id", in: "path", type: "number", required: true, description: "id du virement.", example: "51" }],
  requestExample: `POST /api/auth/bank-transfer/51/approve\nAuthorization: Bearer <token>`,
  success: [{ body: { transfer: sampleTransfer({ state: "completed", can_edit: false, can_submit: false, can_cancel: false }), message: "Virement validé avec succès", status: 200, customstatus: 200 } }],
  responseFields: [{ name: "transfer", type: "object", description: "Le virement, complet." }, ...transferFields("transfer", false), { name: "message", type: "string", description: "Message de confirmation lisible." }, ...statusFields],
  errors: [
    ...authErrors,
    { status: 200, customstatus: 404, message: "Virement introuvable", when: "" },
    {
      status: 200,
      customstatus: 403,
      message: "Seul l'administrateur système ou le destinataire désigné peut valider ce virement",
      when: "Un autre gestionnaire du compte destinataire, même s'il le gère, ne peut pas valider à la place de la personne précisément désignée.",
    },
    { status: 200, customstatus: 400, message: "Seul un virement en attente peut être validé", when: "state != pending." },
    { status: 200, customstatus: 400, message: "Le journal des virements n'est pas encore configuré.", when: "Config revérifiée à l'approbation, pas seulement à la création." },
    { status: 200, customstatus: 400, message: "Le préfixe de la pièce comptable des virements n'est pas encore configuré.", when: "" },
    bankServerError,
  ],
  notes: ["Définitif : aucun retour possible une fois complété, même pour l'admin."],
  usage: "Bouton \"Valider\" sur un virement en attente, destinataire désigné uniquement.",
};

const rejectTransfer: Endpoint = {
  id: "bank-transfer-reject",
  method: "POST",
  path: "/api/auth/bank-transfer/{transfer_id}/reject",
  summary: "En attente → rejeté, définitif",
  category: "bank_accounts",
  access: "bank_account_manager",
  params: [{ name: "transfer_id", in: "path", type: "number", required: true, description: "id du virement.", example: "51" }],
  requestExample: `POST /api/auth/bank-transfer/51/reject\nAuthorization: Bearer <token>`,
  success: [{ body: { transfer: sampleTransfer({ state: "rejected", can_edit: false, can_submit: false, can_cancel: false }), message: "Virement rejeté", status: 200, customstatus: 200 } }],
  responseFields: [{ name: "transfer", type: "object", description: "Le virement, complet." }, ...transferFields("transfer", false), { name: "message", type: "string", description: "Message de confirmation lisible." }, ...statusFields],
  errors: [
    ...authErrors,
    { status: 200, customstatus: 404, message: "Virement introuvable", when: "" },
    { status: 200, customstatus: 403, message: "Seul l'administrateur système ou le destinataire désigné peut rejeter ce virement", when: "" },
    { status: 200, customstatus: 400, message: "Seul un virement en attente peut être rejeté", when: "state != pending." },
    bankServerError,
  ],
  notes: ["Définitif : aucun moyen de rétablir un virement rejeté, il faut en recréer un nouveau."],
  usage: "Bouton \"Rejeter\" sur un virement en attente, destinataire désigné uniquement.",
};

const mySentTransfers: Endpoint = {
  id: "bank-transfer-sent",
  method: "GET",
  path: "/api/auth/bank-transfer/sent",
  summary: "\"Mes envois\" : virements où l'utilisateur connecté est l'émetteur désigné, tous comptes confondus",
  category: "bank_accounts",
  access: "bank_account_manager",
  params: [],
  requestExample: `GET /api/auth/bank-transfer/sent\nAuthorization: Bearer <token>`,
  success: [{ body: { transfers: [sampleTransfer()], status: 200, customstatus: 200 } }],
  responseFields: [{ name: "transfers[]", type: "array", description: "État brouillon ou en attente uniquement." }, ...transferFields("transfers[]", false), ...statusFields],
  errors: [...authErrors, bankManagerOnly, bankServerError],
  notes: [
    "Pas un écran séparé : raccourci intégré au bandeau de résumé de \"Comptes bancaires\"/\"Mes comptes bancaires\", pas un point d'entrée à part.",
    "Ne montre que brouillon + en attente, pas l'historique complet (déjà consultable compte par compte via bank-account/{id}/transfers). Une fois complété ou rejeté, un virement sort de cette liste.",
    "Généralement vide pour un admin système, qui n'est presque jamais l'émetteur désigné d'un virement.",
  ],
  usage: "Bandeau de résumé sur \"Comptes bancaires\"/\"Mes comptes bancaires\" : zone \"envois\", ouverte au tap.",
};

const myReceivedTransfers: Endpoint = {
  id: "bank-transfer-received",
  method: "GET",
  path: "/api/auth/bank-transfer/received",
  summary: "\"Mes réceptions\" : virements où l'utilisateur connecté est le destinataire désigné, tous comptes confondus",
  category: "bank_accounts",
  access: "bank_account_manager",
  params: [],
  requestExample: `GET /api/auth/bank-transfer/received\nAuthorization: Bearer <token>`,
  success: [{ body: { transfers: [sampleTransfer({ state: "pending", can_edit: false, can_submit: false, can_cancel: false, can_approve: true, can_reject: true })], status: 200, customstatus: 200 } }],
  responseFields: [{ name: "transfers[]", type: "array", description: "État en attente uniquement." }, ...transferFields("transfers[]", false), ...statusFields],
  errors: [...authErrors, bankManagerOnly, bankServerError],
  notes: ["Que \"en attente\" : pas d'équivalent \"brouillon\" côté destinataire, et complété/rejeté sont déjà définitifs, sans action possible."],
  usage: "Bandeau de résumé : zone \"réceptions\", ouverte au tap.",
};

const pendingSummary: Endpoint = {
  id: "bank-transfer-pending-summary",
  method: "GET",
  path: "/api/auth/bank-transfer/pending-summary",
  summary: "Résumé léger (juste des nombres) pour le bandeau de \"Comptes bancaires\"/\"Mes comptes bancaires\"",
  category: "bank_accounts",
  access: "bank_account_manager",
  params: [],
  requestExample: `GET /api/auth/bank-transfer/pending-summary\nAuthorization: Bearer <token>`,
  success: [
    { label: "Gestionnaire", body: { sent_count: 1, received_count: 3, status: 200, customstatus: 200 } },
    { label: "Admin", body: { pending_count: 7, status: 200, customstatus: 200 } },
  ],
  responseFields: [
    { name: "sent_count", type: "number", description: "Gestionnaire uniquement : ses virements en brouillon + en attente." },
    { name: "received_count", type: "number", description: "Gestionnaire uniquement : ses virements reçus en attente." },
    { name: "pending_count", type: "number", description: "Admin uniquement : tous les virements en attente, tous comptes, sans distinction d'émetteur/destinataire." },
    ...statusFields,
  ],
  errors: [...authErrors, bankManagerOnly, bankServerError],
  notes: [
    "La forme de la réponse dépend du profil : un gestionnaire ne reçoit jamais pending_count, un admin ne reçoit jamais sent_count/received_count.",
    "Jamais la liste complète ici, uniquement des nombres : les listes ne sont chargées que si l'utilisateur tape sur le bandeau (bank-transfer/sent, /received, ou bank-account/{id}/transfers pour l'admin).",
    "Pas de compteur de brouillons pour l'admin : un brouillon appartient à celui qui le finalise, l'admin n'a rien à y faire tant qu'il n'est pas soumis.",
  ],
  usage: "Appelée à l'ouverture de \"Comptes bancaires\"/\"Mes comptes bancaires\", pour alimenter le bandeau de résumé sans charger les listes complètes.",
};

export const bankAccountEndpoints: Endpoint[] = [
  listAllBankAccounts,
  listMemberBankAccounts,
  eligibleAccountsSearch,
  bankAccountManagersList,
  createBankAccount,
  updateBankAccount,
  beneficiarySearch,
  listAccountTransactions,
  createTransaction,
  updateTransaction,
  validateTransaction,
  cancelTransaction,
  recipientAccounts,
  singleAccountManagers,
  listAccountTransfers,
  createTransfer,
  updateTransfer,
  submitTransfer,
  cancelTransfer,
  approveTransfer,
  rejectTransfer,
  mySentTransfers,
  myReceivedTransfers,
  pendingSummary,
];
