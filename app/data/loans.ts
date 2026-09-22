import type { Endpoint, ErrorDoc, FieldDoc, ParamDoc } from "./types";
import {
  authErrors,
  capacityFields,
  eligibilityFields,
  insuranceScheduleFields,
  invalidJson,
  loanDetailFields,
  loanServerError,
  loanSummaryFields,
  managerLoanExtraFields,
  managerOnly,
  memberNotFound,
  serverError,
  statusFields,
} from "./common";

// ---------------------------------------------------------------------------
// Blocs reutilises
// ---------------------------------------------------------------------------

const loanLimitsFields: FieldDoc[] = [
  {
    name: "loan_limits.min_loan_amount",
    type: "number",
    description: "Montant minimum d'un prêt (paramètre nkezefuu.min_loan_amount). À imposer comme minimum du champ montant.",
  },
  {
    name: "loan_limits.max_loan_repayment_duration_months",
    type: "number",
    description: "Durée maximale en mois (paramètre nkezefuu.max_loan_repayment_duration_months, 12 par défaut).",
  },
  {
    name: "loan_limits.minimum_interest_rate",
    type: "number",
    description: "Taux d'intérêt minimum en % (paramètre nkezefuu.minimum_interest_rate).",
  },
];

const loanFormBodyParams: ParamDoc[] = [
  {
    name: "requested_loan_amount",
    in: "body",
    type: "number",
    required: true,
    description: "Capital demande, en FCFA. >= loan_limits.min_loan_amount.",
    example: "50000",
  },
  {
    name: "interest_rate",
    in: "body",
    type: "number",
    required: true,
    description: "Taux d'intérêt mensuel en %. >= loan_limits.minimum_interest_rate.",
    example: "10",
  },
  {
    name: "repayment_duration_months",
    in: "body",
    type: "number",
    required: true,
    description: "Durée totale en mois. <= loan_limits.max_loan_repayment_duration_months.",
    example: "3",
  },
  {
    name: "deferment_type",
    in: "body",
    type: "string",
    required: false,
    description: "none (défaut) ou partial. Si partial, deferment_period est obligatoire.",
    example: "none",
  },
  {
    name: "deferment_period",
    in: "body",
    type: "number",
    required: false,
    description: "Mois d'exonération, strictement inférieur a repayment_duration_months. 0 par défaut.",
    example: "0",
  },
];

// _validate_loan_request : memes regles pour la simulation et les deux routes de demande.
const loanFormValidationErrors: ErrorDoc[] = [
  {
    status: 200,
    customstatus: 400,
    message: "Veuillez indiquer un montant positif et non nul pour le prêt demandé.",
    when: "requested_loan_amount <= 0.",
  },
  {
    status: 200,
    customstatus: 400,
    message: "Le montant minimum autorisé pour un prêt est de <min> FCFA.",
    when: "requested_loan_amount < loan_limits.min_loan_amount.",
  },
  {
    status: 200,
    customstatus: 400,
    message: "Veuillez indiquer un taux d'intérêt positif ou null.",
    when: "interest_rate < 0.",
  },
  {
    status: 200,
    customstatus: 400,
    message: "Le taux d'intérêt minimum est de <taux>%.",
    when: "interest_rate < loan_limits.minimum_interest_rate.",
  },
  {
    status: 200,
    customstatus: 400,
    message: "Veuillez indiquer une durée de remboursement positive et non nulle.",
    when: "repayment_duration_months <= 0.",
  },
  {
    status: 200,
    customstatus: 400,
    message: "La durée maximale autorisée pour un prêt est de <max> mois.",
    when: "repayment_duration_months > loan_limits.max_loan_repayment_duration_months.",
  },
  {
    status: 200,
    customstatus: 400,
    message: "Veuillez indiquer une période d'exonération positive et non nulle.",
    when: "deferment_type != none et deferment_period <= 0.",
  },
  {
    status: 200,
    customstatus: 400,
    message: "La période d'exonération doit etre strictement plus petite que la durée du remboursement",
    when: "deferment_period >= repayment_duration_months.",
  },
];

const requiredFieldErrors: ErrorDoc[] = [
  { status: 200, customstatus: 400, message: "Montant du prêt demandé requis", when: "requested_loan_amount absent ou vide." },
  { status: 200, customstatus: 400, message: "Taux d'intérêt requis", when: "interest_rate absent ou vide." },
  { status: 200, customstatus: 400, message: "Durée totale de remboursement requise", when: "repayment_duration_months absent ou vide." },
];

const eligibilityErrors: ErrorDoc[] = [
  {
    status: 200,
    customstatus: 400,
    message: 'Vous ne pouvez pas recevoir de crédit car vous êtes un membre "<statut>".',
    when: "Le demandeur est le compte connecté et son statut n'est pas 'En règle' (Défaillant, Exclu, Suspendu, retrait).",
  },
  {
    status: 200,
    customstatus: 400,
    message: 'Le membre <nom> ne peut pas recevoir de crédit car il est un membre "<statut>".',
    when: "Même règle, quand la demande est faite pour un autre membre.",
  },
  {
    status: 200,
    customstatus: 400,
    message: 'Vous ne pouvez pas recevoir de crédit car votre statut est "Invité".',
    when: "Le demandeur est le compte connecté et est de type Invite (guest).",
  },
  {
    status: 200,
    customstatus: 400,
    message: 'Le membre <nom> ne peut pas recevoir de crédit car son statut est "Invité".',
    when: "Même règle, quand la demande est faite pour un autre membre.",
  },
];

const selfCapacityError: ErrorDoc = {
  status: 200,
  customstatus: 400,
  message:
    "Vous ne pouvez pas obtenir ce prêt car vous ne disposez pas d'un investissement en cours suffisant dans la coopérative. Votre plafond de prêt actuel est de <plafond> FCFA.\nMerci de contacter votre gestionnaire.",
  when: "Demande pour soi-même et requested_loan_amount > capacity.limit. Blocage dur, quel que soit le role.",
};

// A la creation reelle uniquement (get_the_loan).
const loanCreationErrors: ErrorDoc[] = [
  {
    status: 200,
    customstatus: 400,
    message: "Veuillez assurer votre projet de prêt avant de procéder à la validation.",
    when: "Aucun projet d'assurance par défaut configure (nkezefuu.default_insurance_project).",
  },
  {
    status: 200,
    customstatus: 400,
    message: "Veuillez indiquer un taux d'assurances strictement positif.",
    when: "Le taux d'assurance par défaut configure est <= 0.",
  },
  {
    status: 200,
    customstatus: 400,
    message: "<Element> n'est pas configuré dans les paramètres.",
    when: "Famille d'erreurs de configuration : journal des prêts, journal de remboursement, journal d'achat des actions, produit des intérêts, projet banque, type de projet Prêt, compte d'attente, coût initial de l'action.",
  },
  {
    status: 500,
    customstatus: 500,
    message: "Une erreur est survenue: unsupported locale setting",
    when: "Bug connu : la locale fr_FR.UTF-8 n'est pas générée sur le serveur (la validation formate des dates en français).",
  },
];

const memberSearchResultFields: FieldDoc[] = [
  { name: "members[]", type: "array", description: "Résultats, 30 maximum, triés par nom. Vide si search fait moins d'un caractère." },
  {
    name: "members[].user_id",
    type: "number",
    description: "res.users id : la valeur à envoyer comme user_id (demandeur) sur all-loans, simulate-loan et request-loan-for-member.",
  },
  {
    name: "members[].member_id",
    type: "number",
    description: "nkezefuu.member id : la valeur à envoyer dans guarantor_ids (avalistes). Ne pas confondre avec user_id.",
  },
  { name: "members[].name", type: "string", description: "Nom complet." },
  { name: "members[].code", type: "string", description: "Identifiant membre (ex. M0042), utile pour distinguer les homonymes." },
  { name: "members[].phone", type: "string", description: "Téléphone, utile pour distinguer les homonymes." },
  ...eligibilityFields("members[].eligibility"),
];

const sampleCapacity = {
  actions_sum: 100000.0,
  investments_sum: 50000.0,
  subsequent_balance: 25000.0,
  limit: 175000,
};

const sampleEligibility = {
  is_eligible: true,
  member_status: "in_order",
  member_status_label: "En règle",
  member_types: "cooperator",
};

const sampleLoanSummary = {
  id: 964,
  code: "Prêt0119",
  state: "validated",
  borrower: "DJIENA FANKAM Léonel",
  borrower_id: 53,
  requested_loan_reason: "Besoin argent",
  requested_loan_amount: 50000.0,
  interest_rate: 10.0,
  repayment_duration_months: 1,
  deferment_type: "none",
  deferment_period: 0,
  loan_request_date: "2025-09-18",
};

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export const loanEndpoints: Endpoint[] = [
  {
    id: "loans-member-list",
    method: "GET",
    path: "/api/auth/member-loans",
    summary: "Mes prêts : liste des prêts du membre connecté, avec ce qu'il faut pour valider le formulaire localement",
    category: "loans",
    access: "member",
    params: [],
    requestExample: `GET /api/auth/member-loans\nAuthorization: Bearer <token>`,
    success: [
      {
        body: {
          loans: [sampleLoanSummary],
          loan_limits: {
            min_loan_amount: 10000.0,
            max_loan_repayment_duration_months: 12,
            minimum_interest_rate: 5.0,
          },
          capacity: sampleCapacity,
          eligibility: sampleEligibility,
          status: 200,
          customstatus: 200,
        },
      },
    ],
    responseFields: [
      { name: "loans[]", type: "array", description: "Prêts du membre connecté, du plus recent au plus ancien." },
      ...loanSummaryFields("loans[]"),
      ...loanLimitsFields,
      ...capacityFields("capacity"),
      ...eligibilityFields("eligibility"),
      ...statusFields,
    ],
    errors: [...authErrors, memberNotFound, loanServerError],
    notes: [
      "À appeler à l'ouverture de l'écran 'Mes prêts'. Stocker loan_limits, capacity et eligibility : ils servent à valider le formulaire avant même d'envoyer request-loan.",
      "Si eligibility.is_eligible est false, ne pas proposer le bouton 'Demander un prêt' (la demande serait refusée par le serveur).",
      "Pour un membre, capacity.limit est un plafond dur : un montant supérieur sera refusé par request-loan.",
      "Pas d'avalistes_rate ici : un membre simple ne voit jamais les avalistes.",
    ],
    usage: "Écran 'Mes prêts' : liste + données de pre-validation du formulaire.",
  },
  {
    id: "loans-member-detail",
    method: "GET",
    path: "/api/auth/member-loans/{loan_id}",
    summary: "Détail d'un prêt du membre connecté : totaux, échéancier détaillé, échéances d'assurance",
    category: "loans",
    access: "member",
    params: [
      {
        name: "loan_id",
        in: "path",
        type: "number",
        required: true,
        description: "Identifiant du prêt (loans[].id). Doit appartenir au membre connecté, sinon 404.",
        example: "964",
      },
    ],
    requestExample: `GET /api/auth/member-loans/964\nAuthorization: Bearer <token>`,
    success: [
      {
        body: {
          loan: {
            ...sampleLoanSummary,
            total_repayment_amount: 55000.0,
            total_paid_amount: 55000.0,
            total_insurance_amount: 5000.0,
            total_insurance_paid_amount: 0,
            remaining_amount: 5000.0,
            repayment_percentage: 100,
            repayment_schedule: [
              {
                date_maturity: "2025-10-18",
                amount: 55000.0,
                capital: 50000,
                interest: 5000.0,
                remaining_amount: 0,
                paid: true,
              },
            ],
            insurance_schedule: [
              { date_maturity: "2025-10-18", amount: 5000.0, paid: false },
            ],
          },
          status: 200,
          customstatus: 200,
        },
      },
    ],
    responseFields: [
      ...loanDetailFields("loan"),
      ...insuranceScheduleFields("loan"),
      ...statusFields,
    ],
    errors: [
      ...authErrors,
      memberNotFound,
      {
        status: 200,
        customstatus: 404,
        message: "Prêt introuvable",
        when: "loan_id inexistant, ou prêt appartenant à un autre membre.",
      },
      loanServerError,
    ],
    notes: [
      "repayment_schedule reproduit le plan d'origine : les dates sont les échéances prevues, pas les dates de paiement.",
      "Sur un prêt validated, l'échéancier est déjà connu : le bouton 'Simuler' n'à plus de raison d'apparaître.",
      "Pas de profit, guarantors ni insurance_invoices ici : ces champs sont réservés à la vue gestionnaire (all-loans/{loan_id}).",
    ],
    usage: "Écran de détail d'un prêt dans 'Mes prêts'.",
  },
  {
    id: "loans-all-list",
    method: "GET",
    path: "/api/auth/all-loans",
    summary: "Liste des prêts (gestionnaire) : une ligne par emprunteur, ou les prêts d'un membre précis avec ?user_id=",
    category: "loans",
    access: "manager",
    params: [
      {
        name: "user_id",
        in: "query",
        type: "number",
        required: false,
        description:
          "res.users id d'un membre (members[].user_id du picker, ou borrowers[].user_id). Présent : renvoie ses prêts + sa capacité + son éligibilité. Absent : renvoie la liste agrégée par emprunteur.",
        example: "45",
      },
      {
        name: "state",
        in: "query",
        type: "string",
        required: false,
        description: "Filtre les prêts par état (draft ou validated) avant agrégation ou listage.",
        example: "validated",
      },
    ],
    requestExample: `GET /api/auth/all-loans\nAuthorization: Bearer <token>\n\nou (prêts d'un membre précis, après sélection dans le picker)\n\nGET /api/auth/all-loans?user_id=45\nAuthorization: Bearer <token>`,
    success: [
      {
        label: "Sans user_id : agrégation par emprunteur",
        body: {
          borrowers: [
            {
              user_id: 45,
              name: "KENMOE Nelson",
              loans_count: 2,
              active_loans_count: 1,
              total_outstanding: 45000.0,
              repayment_percentage: 20,
              overdue_amount: 0.0,
              eligibility: sampleEligibility,
              status_color: "#FF9A76",
              status_label: "remboursement_demarre",
            },
            {
              user_id: 61,
              name: "NGONO Sarah",
              loans_count: 1,
              active_loans_count: 1,
              total_outstanding: 32000.0,
              repayment_percentage: 40,
              overdue_amount: 16000.0,
              eligibility: {
                is_eligible: false,
                member_status: "defaulting",
                member_status_label: "Défaillant",
                member_types: "cooperator",
              },
              status_color: "#DC2626",
              status_label: "retard",
            },
          ],
          loan_limits: {
            min_loan_amount: 10000.0,
            max_loan_repayment_duration_months: 12,
            minimum_interest_rate: 5.0,
            avalistes_rate: 2.0,
          },
          status: 200,
          customstatus: 200,
        },
      },
      {
        label: "Avec ?user_id=45 : prêts du membre sélectionné",
        body: {
          loans: [
            {
              ...sampleLoanSummary,
              id: 973,
              code: "Prêt0128",
              borrower: "KENMOE Nelson",
              borrower_id: 45,
              requested_loan_reason: "Prêt",
              requested_loan_amount: 15000.0,
              loan_request_date: "2025-10-20",
            },
          ],
          loan_limits: {
            min_loan_amount: 10000.0,
            max_loan_repayment_duration_months: 12,
            minimum_interest_rate: 5.0,
            avalistes_rate: 2.0,
          },
          capacity: sampleCapacity,
          eligibility: sampleEligibility,
          status: 200,
          customstatus: 200,
        },
      },
    ],
    responseFields: [
      {
        name: "borrowers[]",
        type: "array",
        description: "Sans user_id uniquement. Une ligne par demandeur ayant au moins un prêt, triée par total_outstanding décroissant.",
      },
      { name: "borrowers[].user_id", type: "number", description: "res.users id du demandeur, à passer en ?user_id= au clic sur la ligne." },
      { name: "borrowers[].name", type: "string", description: "Nom du demandeur." },
      { name: "borrowers[].loans_count", type: "number", description: "Nombre total de prêts (tous états)." },
      { name: "borrowers[].active_loans_count", type: "number", description: "Nombre de prêts validated." },
      {
        name: "borrowers[].total_outstanding",
        type: "number",
        description: "Reste à payer sur ses prêts validated (capital + intérêts, hors assurance).",
      },
      {
        name: "borrowers[].repayment_percentage",
        type: "number (0-100)",
        description: "Progression globale : total payé / total du sur tous ses prêts validated.",
      },
      {
        name: "borrowers[].overdue_amount",
        type: "number",
        description: "Montant des échéances en retard (date dépassée, non réglées), même détection que l'écran des échéances en attente.",
      },
      ...eligibilityFields("borrowers[].eligibility"),
      {
        name: "borrowers[].status_color",
        type: "string (hex)",
        description:
          "Couleur à afficher telle quelle. Priorité : retard réel (#DC2626) > statut membre bloquant (#F97316) > progression : 100% #23A949, >=75% #577AFA, >=50% #06D6A0, >=25% #FFC107, >0% #FF9A76, 0% #E9ECEF.",
      },
      {
        name: "borrowers[].status_label",
        type: "string",
        description: "Code du statut correspondant à la couleur : retard, statut_membre, rembourse, presque_rembourse, a_moitie_rembourse, remboursement_partiel, remboursement_demarre, non_demarre.",
      },
      { name: "loans[]", type: "array", description: "Avec user_id uniquement. Prêts du membre sélectionné." },
      ...loanSummaryFields("loans[]"),
      ...loanLimitsFields,
      {
        name: "loan_limits.avalistes_rate",
        type: "number | false",
        description: "Taux des avalistes par défaut (paramètre nkezefuu.avalistes_rate). Gestionnaire uniquement. false si non configure.",
      },
      ...capacityFields("capacity"),
      ...eligibilityFields("eligibility"),
      ...statusFields,
    ],
    errors: [...authErrors, memberNotFound, managerOnly, loanServerError],
    notes: [
      "Écran principal 'Liste des prêts' : appeler sans user_id, afficher une ligne par emprunteur avec la pastille status_color.",
      "Clic sur une ligne, ou membre choisi dans le picker member-search : rappeler avec ?user_id=X pour obtenir ses prêts, sa capacité et son éligibilité (étape 2 du formulaire).",
      "Un gestionnaire qui à lui-même des prêts apparaît normalement dans borrowers.",
      "user_id est un filtre de liste, donc en query string (pas dans le chemin : /all-loans/<id> est déjà le détail d'un prêt).",
    ],
    usage: "Écran 'Liste des prêts' (vue agrégée) puis prêts d'un membre donné.",
  },
  {
    id: "loans-all-detail",
    method: "GET",
    path: "/api/auth/all-loans/{loan_id}",
    summary: "Détail complet d'un prêt (gestionnaire) : ajouté bénéfice, avalistes et factures d'assurance",
    category: "loans",
    access: "manager",
    params: [
      {
        name: "loan_id",
        in: "path",
        type: "number",
        required: true,
        description: "Identifiant du prêt, quel que soit son demandeur.",
        example: "973",
      },
    ],
    requestExample: `GET /api/auth/all-loans/973\nAuthorization: Bearer <token>`,
    success: [
      {
        body: {
          loan: {
            ...sampleLoanSummary,
            id: 973,
            code: "Prêt0128",
            borrower: "KENMOE Nelson",
            borrower_id: 45,
            requested_loan_reason: "Prêt",
            requested_loan_amount: 15000.0,
            loan_request_date: "2025-10-20",
            total_repayment_amount: 16500.0,
            total_paid_amount: 16500.0,
            total_insurance_amount: 1500.0,
            total_insurance_paid_amount: 0,
            remaining_amount: 1500.0,
            repayment_percentage: 100,
            repayment_schedule: [
              {
                date_maturity: "2025-11-20",
                amount: 16500.0,
                capital: 15000,
                interest: 1500.0,
                remaining_amount: 0,
                paid: true,
              },
            ],
            profit: 3000.0,
            guarantors: [{ id: 12, name: "DJIENA FANKAM Léonel" }],
            insurance_invoices: [
              {
                id: 3120,
                name: "FA/2025/00128",
                amount_total: 1500.0,
                invoice_date_due: "2025-11-20",
                payment_state: "not_paid",
              },
            ],
          },
          status: 200,
          customstatus: 200,
        },
      },
    ],
    responseFields: [
      ...loanDetailFields("loan"),
      ...managerLoanExtraFields("loan"),
      ...statusFields,
    ],
    errors: [
      ...authErrors,
      memberNotFound,
      managerOnly,
      { status: 200, customstatus: 404, message: "Prêt introuvable", when: "loan_id inexistant." },
      loanServerError,
    ],
    notes: [
      "Depuis cet écran, le bouton 'Creer un nouveau prêt pour ce membre' peut enchainer directement sur le formulaire : loan.borrower_id est le user_id à réutiliser, sans repasser par le picker.",
      "Même dans ce cas, la soumission passe par request-loan-for-member (pas request-loan) : le demandeur reste un tiers du point de vue du serveur.",
    ],
    usage: "Détail d'un prêt depuis 'Liste des prêts'.",
  },
  {
    id: "loans-simulate",
    method: "POST",
    path: "/api/auth/simulate-loan",
    summary: "Simulation de l'échéancier sans rien creer, avec les mêmes blocages qu'à la soumission",
    category: "loans",
    access: "all",
    params: [
      ...loanFormBodyParams,
      {
        name: "user_id",
        in: "body",
        type: "number",
        required: true,
        description:
          "Obligatoire pour un gestionnaire/admin : res.users id du demandeur (membre ou projet existant). Ignoré pour un membre simple, toujours lui-même.",
        example: "45",
      },
    ],
    requestExample: `POST /api/auth/simulate-loan\nAuthorization: Bearer <token>\nContent-Type: application/json\n\n{\n  "requested_loan_amount": 50000,\n  "interest_rate": 10,\n  "repayment_duration_months": 3,\n  "deferment_type": "none",\n  "deferment_period": 0\n}\n\nou (gestionnaire/admin, user_id obligatoire)\n\n{\n  "requested_loan_amount": 50000,\n  "interest_rate": 10,\n  "repayment_duration_months": 3,\n  "deferment_type": "none",\n  "deferment_period": 0,\n  "user_id": 45\n}`,
    success: [
      {
        body: {
          simulation: {
            monthly_schedule: [
              { month: 1, payment_date: "2026-10-22", payment_amount: 21668.0, capital_payment: 16668, interest_payment: 5000.0, remaining_balance: 33332.0 },
              { month: 2, payment_date: "2026-11-22", payment_amount: 19999.2, capital_payment: 16666, interest_payment: 3333.2, remaining_balance: 16666.0 },
              { month: 3, payment_date: "2026-12-22", payment_amount: 18332.6, capital_payment: 16666, interest_payment: 1666.6, remaining_balance: 0 },
            ],
            total_amount: 59999.8,
            total_interest: 9999.8,
            total_capital: 50000,
            end_date: "2026-12-22",
          },
          capacity: sampleCapacity,
          status: 200,
          customstatus: 200,
        },
      },
    ],
    responseFields: [
      { name: "simulation.monthly_schedule[]", type: "array", description: "Une entrée par mois, dans l'ordre." },
      { name: "simulation.monthly_schedule[].month", type: "number", description: "Numéro du mois (1 = première échéance)." },
      {
        name: "simulation.monthly_schedule[].payment_date",
        type: "string (YYYY-MM-DD)",
        description: "Date d'échéance : même jour du mois que la date de demande (aujourd'hui), mois suivant.",
      },
      { name: "simulation.monthly_schedule[].payment_amount", type: "number", description: "Mensualite (capital + intérêts)." },
      { name: "simulation.monthly_schedule[].capital_payment", type: "number", description: "Part de capital." },
      { name: "simulation.monthly_schedule[].interest_payment", type: "number", description: "Part d'intérêts, calculée sur le capital restant." },
      { name: "simulation.monthly_schedule[].remaining_balance", type: "number", description: "Capital restant après l'échéance." },
      { name: "simulation.total_amount", type: "number", description: "Somme des mensualites." },
      { name: "simulation.total_interest", type: "number", description: "Somme des intérêts." },
      { name: "simulation.total_capital", type: "number", description: "Somme du capital (= montant demande)." },
      { name: "simulation.end_date", type: "string (YYYY-MM-DD)", description: "Date de la dernière échéance." },
      ...capacityFields("capacity"),
      ...statusFields,
    ],
    errors: [
      ...authErrors,
      memberNotFound,
      invalidJson,
      ...requiredFieldErrors,
      {
        status: 200,
        customstatus: 400,
        message: "Demandeur du prêt requis (user_id)",
        when: "Gestionnaire/admin sans user_id. Un oubli ne retombe jamais silencieusement sur le gestionnaire lui-même.",
      },
      {
        status: 200,
        customstatus: 404,
        message: "Demandeur introuvable ou non éligible",
        when: "user_id ne correspond à aucun membre ni projet.",
      },
      ...eligibilityErrors,
      selfCapacityError,
      ...loanFormValidationErrors,
      {
        status: 200,
        customstatus: 400,
        message: "Le Montant minimum requis pour demander un prêt n'est pas configuré correctement.",
        when: "Paramètre nkezefuu.min_loan_amount absent ou <= 0.",
      },
      {
        status: 200,
        customstatus: 400,
        message: "Le Taux d'intérêt minimum de remboursement du prêt n'est pas configuré.",
        when: "Paramètre nkezefuu.minimum_interest_rate absent.",
      },
      loanServerError,
    ],
    notes: [
      "Ne crée rien en base : le calcul se fait sur un enregistrement en mémoire.",
      "Même algorithme que la création réelle : ce que montré la simulation est exactement ce que produira request-loan / request-loan-for-member.",
      "Éligibilité : bloquante pour tout le monde, sans exception de role.",
      "Capacité : bloquante uniquement si le demandeur est le compte connecté. Pour un gestionnaire simulant pour un tiers, capacity est informatif (afficher une alerte si le montant dépasse capacity.limit, sans bloquer).",
      "Bouton 'Simuler' à afficher uniquement sur le formulaire de demande, jamais sur le détail d'un prêt déjà validé.",
    ],
    usage: "Bouton 'Simuler' du formulaire de demande, avant soumission.",
  },
  {
    id: "loans-request",
    method: "POST",
    path: "/api/auth/request-loan",
    summary: "Demande de prêt pour soi-même (écran Mes prêts) : crée et valide en une requête",
    category: "loans",
    access: "all",
    params: [
      {
        name: "requested_loan_reason",
        in: "body",
        type: "string",
        required: true,
        description: "Motif du prêt, texte libre.",
        example: "Besoin urgent",
      },
      ...loanFormBodyParams,
    ],
    requestExample: `POST /api/auth/request-loan\nAuthorization: Bearer <token>\nContent-Type: application/json\n\n{\n  "requested_loan_amount": 50000,\n  "requested_loan_reason": "Besoin urgent",\n  "interest_rate": 10,\n  "repayment_duration_months": 3,\n  "deferment_type": "none",\n  "deferment_period": 0\n}`,
    success: [
      {
        body: {
          loan: {
            ...sampleLoanSummary,
            id: 990,
            code: "Prêt0145",
            requested_loan_reason: "Besoin urgent",
            repayment_duration_months: 3,
            loan_request_date: "2026-09-22",
            total_repayment_amount: 59999.8,
            total_paid_amount: 0,
            total_insurance_amount: 0,
            total_insurance_paid_amount: 0,
            remaining_amount: 59999.8,
            repayment_percentage: 0,
            repayment_schedule: [
              { date_maturity: "2026-10-22", amount: 21668.0, capital: 16668, interest: 5000.0, remaining_amount: 33332.0, paid: false },
              { date_maturity: "2026-11-22", amount: 19999.2, capital: 16666, interest: 3333.2, remaining_amount: 16666.0, paid: false },
              { date_maturity: "2026-12-22", amount: 18332.6, capital: 16666, interest: 1666.6, remaining_amount: 0, paid: false },
            ],
            insurance_schedule: [],
          },
          status: 200,
          customstatus: 200,
        },
      },
    ],
    responseFields: [
      { name: "loan", type: "object", description: "Le prêt créé, déjà validated, au même format que member-loans/{loan_id}." },
      ...loanDetailFields("loan"),
      ...insuranceScheduleFields("loan"),
      ...statusFields,
    ],
    errors: [
      ...authErrors,
      memberNotFound,
      invalidJson,
      ...requiredFieldErrors,
      { status: 200, customstatus: 400, message: "Motif du prêt requis", when: "requested_loan_reason absent ou vide." },
      selfCapacityError,
      ...eligibilityErrors.filter((e) => e.message.startsWith("Vous")),
      ...loanFormValidationErrors,
      ...loanCreationErrors,
      loanServerError,
    ],
    notes: [
      "Le demandeur est toujours le compte connecté : user_id est ignoré s'il est envoyé.",
      "guarantor_ids est ignoré : jamais d'avalistes sur une demande pour soi-même.",
      "Plafond de capacité bloquant, y compris pour un gestionnaire/admin qui passe par cet écran (choix deliberer de se comporter comme un membre simple).",
      "Création + validation dans une seule transaction : en cas d'erreur, rien n'est enregistré.",
      "La date de demande n'est pas un champ du formulaire : le serveur impose la date du jour.",
    ],
    usage: "Bouton 'Valider' du formulaire de demande, écran 'Mes prêts'.",
  },
  {
    id: "loans-request-for-member",
    method: "POST",
    path: "/api/auth/request-loan-for-member",
    summary: "Demande de prêt pour un membre ou projet choisi (gestionnaire), avalistes possibles",
    category: "loans",
    access: "manager",
    params: [
      {
        name: "user_id",
        in: "body",
        type: "number",
        required: true,
        description: "res.users id du demandeur : members[].user_id du picker, ou loan.borrower_id depuis un prêt existant. Membre ou projet.",
        example: "45",
      },
      {
        name: "requested_loan_reason",
        in: "body",
        type: "string",
        required: true,
        description: "Motif du prêt, texte libre.",
        example: "Besoin urgent",
      },
      ...loanFormBodyParams,
      {
        name: "guarantor_ids",
        in: "body",
        type: "number[]",
        required: false,
        description:
          "Avalistes : liste de member_id (nkezefuu.member, PAS user_id), obtenus via loan-guarantor-search. Le demandeur ne peut pas y figurer.",
        example: "[12, 18]",
      },
    ],
    requestExample: `POST /api/auth/request-loan-for-member\nAuthorization: Bearer <token>\nContent-Type: application/json\n\n{\n  "user_id": 45,\n  "requested_loan_amount": 50000,\n  "requested_loan_reason": "Besoin urgent",\n  "interest_rate": 10,\n  "repayment_duration_months": 3,\n  "deferment_type": "none",\n  "deferment_period": 0,\n  "guarantor_ids": [12, 18]\n}`,
    success: [
      {
        body: {
          loan: {
            ...sampleLoanSummary,
            id: 991,
            code: "Prêt0146",
            borrower: "KENMOE Nelson",
            borrower_id: 45,
            requested_loan_reason: "Besoin urgent",
            repayment_duration_months: 3,
            loan_request_date: "2026-09-22",
            total_repayment_amount: 59999.8,
            total_paid_amount: 0,
            total_insurance_amount: 0,
            total_insurance_paid_amount: 0,
            remaining_amount: 59999.8,
            repayment_percentage: 0,
            repayment_schedule: [
              { date_maturity: "2026-10-22", amount: 21668.0, capital: 16668, interest: 5000.0, remaining_amount: 33332.0, paid: false },
            ],
            profit: 9999.8,
            guarantors: [
              { id: 12, name: "DJIENA FANKAM Léonel" },
              { id: 18, name: "NGONO Sarah" },
            ],
            insurance_invoices: [],
          },
          status: 200,
          customstatus: 200,
        },
      },
    ],
    responseFields: [
      { name: "loan", type: "object", description: "Le prêt créé, déjà validated, au même format que all-loans/{loan_id}." },
      ...loanDetailFields("loan"),
      ...managerLoanExtraFields("loan"),
      ...statusFields,
    ],
    errors: [
      ...authErrors,
      memberNotFound,
      managerOnly,
      invalidJson,
      ...requiredFieldErrors,
      { status: 200, customstatus: 400, message: "Motif du prêt requis", when: "requested_loan_reason absent ou vide." },
      { status: 200, customstatus: 400, message: "Demandeur du prêt requis", when: "user_id absent." },
      {
        status: 200,
        customstatus: 404,
        message: "Demandeur introuvable ou non éligible",
        when: "user_id ne correspond à aucun membre ni projet.",
      },
      ...eligibilityErrors.filter((e) => e.message.startsWith("Le membre")),
      {
        status: 200,
        customstatus: 400,
        message: "Le demandeur du prêt ne peut pas être son propre avaliste.",
        when: "guarantor_ids contient le member_id du demandeur. Contrôle par une contrainte du modele, quel que soit ce que renvoie la recherche.",
      },
      {
        status: 200,
        customstatus: 400,
        message:
          "Vous ne pouvez pas obtenir ce prêt car Vous ne disposez pas d'un investissement en cours suffisant dans la coopérative. Votre plafond de prêt actuel est de <plafond> FCFA \nMerci de contacter votre gestionnaire",
        when: "user_id est le compte connecté et le montant dépasse sa capacité : le plafond redevient bloquant, quel que soit le role (message issu du modele).",
      },
      ...loanFormValidationErrors,
      ...loanCreationErrors,
      loanServerError,
    ],
    notes: [
      "Capacité du demandeur : simple alerte à afficher côté mobile (comparer au capacity.limit reçu via all-loans?user_id=), sauf si le demandeur est le compte connecté (blocage).",
      "Éligibilité (statut/invite) : bloquante, sans exception de role.",
      "guarantor_ids attend des member_id (members[].member_id), pas des user_id. Erreur classique à éviter.",
      "Un projet peut être demandeur : dans ce cas, aucune contrainte de statut/invite ne s'applique.",
    ],
    usage: "Bouton 'Valider' du formulaire de demande, écran 'Liste des prêts'.",
  },
  {
    id: "loans-member-search",
    method: "GET",
    path: "/api/auth/member-search",
    summary: "Picker du demandeur (gestionnaire) : recherche de membres par préfixe",
    category: "loans",
    access: "manager",
    params: [
      {
        name: "search",
        in: "query",
        type: "string",
        required: true,
        description:
          "Texte tapé. Recherche par préfixe (commence par), insensible à la casse, sur le nom, l'identifiant (code) ou le téléphone. Moins d'un caractère : liste vide.",
        example: "ken",
      },
    ],
    requestExample: `GET /api/auth/member-search?search=ken\nAuthorization: Bearer <token>`,
    success: [
      {
        body: {
          members: [
            {
              user_id: 45,
              member_id: 12,
              name: "KENMOE Nelson",
              code: "M0042",
              phone: "+237690000000",
              eligibility: sampleEligibility,
            },
          ],
          status: 200,
          customstatus: 200,
        },
      },
      { label: "Aucun résultat, ou search vide", body: { members: [], status: 200, customstatus: 200 } },
    ],
    responseFields: [...memberSearchResultFields, ...statusFields],
    errors: [...authErrors, managerOnly, serverError],
    notes: [
      "Seuls les membres ayant un compte utilisateur (res_users_id) sont renvoyés : les autres ne peuvent pas être demandeurs.",
      "30 résultats maximum : inviter l'utilisateur à affiner s'il ne trouve pas.",
      "Déclencher la recherche sur un bouton 'Valider' plutot qu'à chaque frappe (pas de debounce à gérer).",
      "eligibility permet de griser dans la liste les membres qui ne pourront pas obtenir de prêt, avant même de les sélectionner.",
    ],
    usage: "Étape 1 du formulaire gestionnaire : choisir le demandeur.",
  },
  {
    id: "loans-guarantor-search",
    method: "POST",
    path: "/api/auth/loan-guarantor-search",
    summary: "Picker des avalistes (gestionnaire) : même recherche, en excluant le demandeur",
    category: "loans",
    access: "manager",
    params: [
      {
        name: "search",
        in: "query",
        type: "string",
        required: true,
        description: "Texte tape, mêmes règles que member-search (préfixe, 1 caractère minimum).",
        example: "fan",
      },
      {
        name: "user_id",
        in: "body",
        type: "number",
        required: true,
        description:
          "res.users id du demandeur déjà choisi, exclu des résultats (un membre ne peut pas se garantir lui-même). Dans le corps JSON, obligatoire : refus explicite plutot qu'une liste non filtree.",
        example: "45",
      },
    ],
    requestExample: `POST /api/auth/loan-guarantor-search?search=fan\nAuthorization: Bearer <token>\nContent-Type: application/json\n\n{\n  "user_id": 45\n}`,
    success: [
      {
        body: {
          members: [
            {
              user_id: 53,
              member_id: 7,
              name: "DJIENA FANKAM Léonel",
              code: "M0007",
              phone: "+237691111111",
              eligibility: sampleEligibility,
            },
          ],
          status: 200,
          customstatus: 200,
        },
      },
    ],
    responseFields: [...memberSearchResultFields, ...statusFields],
    errors: [
      ...authErrors,
      managerOnly,
      invalidJson,
      { status: 200, customstatus: 400, message: "Demandeur du prêt requis (user_id)", when: "user_id absent du corps JSON." },
      serverError,
    ],
    notes: [
      "N'importe quel membre peut être avaliste, quel que soit son statut : la seule exclusion est le demandeur lui-même (même règle que le formulaire back-office).",
      "Utiliser members[].member_id pour remplir guarantor_ids de request-loan-for-member.",
      "Même si la liste n'etait pas filtree, le serveur refuserait à la création un prêt ou le demandeur est son propre avaliste.",
    ],
    usage: "Champ 'Avalistes' du formulaire gestionnaire, une fois le demandeur choisi.",
  },
];
