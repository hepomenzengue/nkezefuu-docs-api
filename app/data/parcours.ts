// Parcours : chaque processus est un arbre d'etapes numerotees (1, 2, 2.1, 2.1.1...).
// Une etape porte sa phrase de recit, et juste apres, si besoin, le tableau qui va avec
// (ce qui est affiche a l'ecran, ou les regles qui s'appliquent a ce moment precis). Les
// branches (2.1 / 2.2) sont les chemins possibles depuis un meme ecran ; quand deux
// branches rejoignent la meme etape, la seconde y renvoie par {{ref}} plutot que de la
// repeter. Les numeros sont calcules a l'affichage, jamais ecrits en dur.
// Les cas de test exhaustifs restent groupes en bas de page, consultes a la demande.

export type RuleRow = {
  id: string;
  // Le champ ou l'element d'ecran concerne, si la regle est rattachee a un champ precis
  field?: string;
  // La regle en mots, avec la valeur/expression technique correspondante integree
  rule: string;
  apiVariable: string;
  // Si l'app doit obligatoirement la reproduire, ou si c'est impossible a anticiper
  appControl: string;
};

export type ScreenField = {
  // Libelle vu par l'utilisateur
  label: string;
  // Variable de l'API
  apiVariable: string;
};

export type StepBlock =
  | { kind: "screen"; title: string; endpointIds: string[]; fields: ScreenField[]; note?: string }
  | { kind: "rules"; title?: string; rows: RuleRow[] }
  // Maquette visuelle (HTML/CSS) : pour un element d'interface qu'une table ne rend pas
  // lisible (ex. le bandeau de resume des comptes bancaires), plutot que du texte seul.
  | { kind: "mockup"; title?: string; html: string };

export type Step = {
  // Ancre stable pour les renvois : une autre etape ecrit {{ref}} dans son texte et
  // l'affichage y substitue le numero calcule de cette etape, en lien cliquable.
  ref?: string;
  // Phrase de recit, avec des segments `entre backticks` pour les appels et variables
  text: string;
  blocks?: StepBlock[];
  // Sous-etapes : soit la suite du chemin, soit les branches possibles depuis cet ecran
  children?: Step[];
};

export type TestCase = {
  id: string;
  constraintId?: string;
  title: string;
  given: string;
  when: string;
  then: string;
  expected?: { customstatus: number; message?: string };
};

export type TestGroup = {
  title: string;
  cases: TestCase[];
};

export type Parcours = {
  slug: string;
  title: string;
  // Regroupe les parcours proches dans la navigation (ex. "Prêts", "Comptes bancaires").
  group: string;
  userLine: string;
  steps: Step[];
  testGroups: TestGroup[];
};

// ---------------------------------------------------------------------------
// Parcours 1 : Mes prets (membre)
// ---------------------------------------------------------------------------

const mesPrets: Parcours = {
  slug: "mes-prets",
  title: "Mes prêts",
  group: "Prêts",
  userLine: "Simple membre (y compris un gestionnaire qui emprunte pour lui-même : il est alors traité identiquement).",
  steps: [
    {
      text: "Le membre ouvre \"Mes prêts\". L'app appelle `GET member-loans`, qui renvoie ses prêts avec `loan_limits`, `capacity` et `eligibility`, gardés pour la suite du parcours.",
    },
    {
      text: "L'écran liste de ses prêts s'affiche, avec le bouton \"Demander un prêt\" qui permet d'en demander un directement. Deux actions sont possibles depuis cet écran.",
      blocks: [
        {
          kind: "screen",
          title: "Écran liste",
          endpointIds: ["loans-member-list"],
          fields: [
            { label: "Référence", apiVariable: "loans[].code" },
            { label: "Statut", apiVariable: "loans[].state" },
            { label: "Montant demandé", apiVariable: "loans[].requested_loan_amount" },
            { label: "Motif", apiVariable: "loans[].requested_loan_reason" },
            { label: "Date de la demande", apiVariable: "loans[].loan_request_date" },
          ],
        },
        {
          kind: "rules",
          rows: [
            {
              id: "C3",
              field: "Bouton \"Demander un prêt\"",
              rule: 'Le membre doit être "En règle" et non "Invité" pour recevoir un prêt.',
              apiVariable: "eligibility.is_eligible (= member_status = in_order ET member_types != guest)",
              appControl: "Obligatoire : masquer le bouton si false.",
            },
          ],
        },
      ],
      children: [
        {
          ref: "form",
          text: "Il clique sur \"Demander un prêt\" : le formulaire s'affiche. Aucun appel à ce stade, tout est déjà en mémoire depuis l'ouverture de l'écran. Chaque champ est contrôlé localement avant le moindre appel.",
          blocks: [
            {
              kind: "rules",
              title: "Formulaire \"Demander un prêt\"",
              rows: [
                {
                  id: "C9",
                  field: "Motif",
                  rule: "Obligatoire, texte libre.",
                  apiVariable: "requested_loan_reason",
                  appControl: "Obligatoire : champ requis basique.",
                },
                {
                  id: "C4",
                  field: "Montant",
                  rule: "Ne peut pas être inférieur au minimum configuré.",
                  apiVariable: "requested_loan_amount >= loan_limits.min_loan_amount",
                  appControl: "Obligatoire : bloquer la saisie.",
                },
                {
                  id: "C5",
                  field: "Montant",
                  rule: "Ne peut pas dépasser la capacité d'emprunt maximum.",
                  apiVariable: "requested_loan_amount <= capacity.limit",
                  appControl: "Obligatoire : bloquer et afficher le détail (capacity.actions_sum, capacity.investments_sum, capacity.subsequent_balance).",
                },
                {
                  id: "C6",
                  field: "Taux d'intérêt",
                  rule: "Ne peut pas être inférieur au minimum configuré, pré-rempli à cette valeur.",
                  apiVariable: "interest_rate >= loan_limits.minimum_interest_rate",
                  appControl: "Obligatoire.",
                },
                {
                  id: "C7",
                  field: "Durée",
                  rule: "Ne peut pas dépasser le maximum configuré.",
                  apiVariable: "repayment_duration_months <= loan_limits.max_loan_repayment_duration_months",
                  appControl: "Obligatoire.",
                },
                {
                  id: "C8",
                  field: "Exonération",
                  rule: "Aucune, ou partielle avec une période strictement inférieure à la durée totale.",
                  apiVariable: 'deferment_type = "partial" → 0 < deferment_period < repayment_duration_months',
                  appControl: "Obligatoire : règle structurelle, aucun appel nécessaire.",
                },
              ],
            },
          ],
          children: [
            {
              text: "Il peut lancer `POST simulate-loan` pour prévisualiser l'échéancier : les mêmes contraintes sont rejouées côté serveur, rien n'est créé. Étape facultative, l'app peut aller directement à la validation.",
            },
            {
              text: "Il valide : `POST request-loan` crée le prêt. En cas de succès, le prêt apparaît dans la liste de l'étape 2 à l'état validated. En cas d'échec, le message renvoyé par le serveur est affiché tel quel et rien n'est créé.",
              blocks: [
                {
                  kind: "rules",
                  rows: [
                    {
                      id: "C14/C15",
                      field: "Validation finale",
                      rule: "Le serveur doit être correctement configuré (assurance, journaux comptables, locale) pour créer le prêt.",
                      apiVariable: "aucune variable exposée côté app",
                      appControl: "Impossible à anticiper côté app : afficher le message serveur tel quel.",
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          text: "Il clique sur une ligne de prêt : `GET member-loans/{id}` affiche le détail de ce prêt, montant emprunté, ce qui est déjà payé, ce qu'il reste à payer, la progression, l'échéancier mois par mois et les échéances d'assurance.",
          blocks: [
            {
              kind: "screen",
              title: "Détail d'un prêt",
              endpointIds: ["loans-member-detail"],
              fields: [
                { label: "Montant emprunté", apiVariable: "requested_loan_amount" },
                { label: "Total à rembourser (hors assurance)", apiVariable: "total_repayment_amount" },
                { label: "Déjà payé", apiVariable: "total_paid_amount" },
                { label: "Reste à payer (prêt + assurance)", apiVariable: "remaining_amount" },
                { label: "Progression", apiVariable: "repayment_percentage" },
                { label: "Échéancier", apiVariable: "repayment_schedule[] : date, montant, capital, intérêts, reste dû, payé" },
                { label: "Échéances d'assurance", apiVariable: "insurance_schedule[] : date, montant, payé" },
              ],
              note: "Aucune facture, aucun numéro côté membre : c'est un échéancier, pas une liste de factures.",
            },
          ],
        },
      ],
    },
  ],
  testGroups: [
    {
      title: "Accès",
      cases: [
        { id: "MP-01", constraintId: "C1", title: "Sans jeton", given: "Aucun en-tête Authorization", when: "GET member-loans", then: "Refus.", expected: { customstatus: 401, message: "Authentification requise" } },
        { id: "MP-02", constraintId: "C1", title: "Jeton expiré", given: "Jeton dont expires_in est dépassé", when: "GET member-loans", then: "Refus ; l'app doit appeler refresh puis rejouer.", expected: { customstatus: 401, message: "Token invalide ou expiré" } },
        { id: "MP-03", constraintId: "C1", title: "Compte sans fiche membre", given: "Jeton d'un utilisateur Odoo sans nkezefuu.member", when: "GET member-loans", then: "Refus.", expected: { customstatus: 404, message: "Membre introuvable" } },
      ],
    },
    {
      title: "Ouverture de l'écran",
      cases: [
        { id: "MP-04", title: "Membre sans prêt", given: "Membre en règle, aucun prêt", when: "GET member-loans", then: "loans = [], loan_limits / capacity / eligibility présents, bouton de demande visible.", expected: { customstatus: 200 } },
        { id: "MP-05", title: "Membre avec prêts", given: "Membre ayant des prêts draft et validated", when: "GET member-loans", then: "Tous ses prêts, du plus récent au plus ancien, avec borrower_id = son user_id.", expected: { customstatus: 200 } },
        { id: "MP-06", constraintId: "C3", title: "Membre défaillant", given: "member_status = defaulting", when: "GET member-loans", then: "eligibility.is_eligible = false, member_status_label = 'Défaillant' ; l'app masque le bouton.", expected: { customstatus: 200 } },
        { id: "MP-07", constraintId: "C3", title: "Membre invité", given: "member_types = guest, statut en règle", when: "GET member-loans", then: "eligibility.is_eligible = false ; l'app masque le bouton.", expected: { customstatus: 200 } },
        { id: "MP-08", constraintId: "C15", title: "Configuration absente", given: "nkezefuu.min_loan_amount non configuré", when: "GET member-loans", then: "Erreur serveur : la liste elle-même est indisponible tant que la config n'est pas posée.", expected: { customstatus: 500, message: "Une erreur est survenue: Le Montant minimum requis pour demander un prêt n'est pas configuré correctement." } },
      ],
    },
    {
      title: "Consultation d'un prêt",
      cases: [
        { id: "MP-09", title: "Prêt validé, non remboursé", given: "Prêt validated sans paiement", when: "GET member-loans/{id}", then: "total_paid_amount = 0, repayment_percentage = 0, chaque échéance paid = false, remaining_amount = total_repayment_amount + assurance restante.", expected: { customstatus: 200 } },
        { id: "MP-10", title: "Prêt partiellement remboursé", given: "Une échéance réglée en deux paiements partiels", when: "GET member-loans/{id}", then: "L'échéancier garde une entrée par mois (pas une par paiement) ; paid = true seulement si le cumul payé couvre le cumul dû.", expected: { customstatus: 200 } },
        { id: "MP-11", title: "Prêt totalement remboursé", given: "Prêt validated entièrement payé", when: "GET member-loans/{id}", then: "repayment_percentage = 100, toutes les échéances paid = true, remaining_amount = assurance restante uniquement.", expected: { customstatus: 200 } },
        { id: "MP-12", title: "Prêt en brouillon", given: "Prêt state = draft", when: "GET member-loans/{id}", then: "Totaux à 0, repayment_schedule = [].", expected: { customstatus: 200 } },
        { id: "MP-13", title: "Prêt d'un autre membre", given: "loan_id appartenant à un autre membre", when: "GET member-loans/{id}", then: "Refus : un membre ne voit que ses prêts.", expected: { customstatus: 404, message: "Prêt introuvable" } },
        { id: "MP-14", title: "Prêt avec assurance", given: "Prêt ayant des factures d'assurance postées", when: "GET member-loans/{id}", then: "insurance_schedule renseigné (date, montant, paid), total_insurance_amount > 0 ; pas de insurance_invoices ni profit.", expected: { customstatus: 200 } },
      ],
    },
    {
      title: "Formulaire : montant (C4, C5)",
      cases: [
        { id: "MP-15", constraintId: "C4", title: "Montant vide", given: "Formulaire sans montant", when: "POST simulate-loan / request-loan", then: "Refus.", expected: { customstatus: 400, message: "Montant du prêt demandé requis" } },
        { id: "MP-16", constraintId: "C4", title: "Montant nul ou négatif", given: "requested_loan_amount = 0", when: "POST request-loan", then: "Refus.", expected: { customstatus: 400, message: "Veuillez indiquer un montant positif et non nul pour le prêt demandé." } },
        { id: "MP-17", constraintId: "C4", title: "Montant sous le minimum", given: "min_loan_amount = 10000, montant = 9999", when: "POST request-loan", then: "Refus.", expected: { customstatus: 400, message: "Le montant minimum autorisé pour un prêt est de 10000.0 FCFA." } },
        { id: "MP-18", constraintId: "C4", title: "Montant égal au minimum", given: "montant = min_loan_amount", when: "POST request-loan", then: "Accepté.", expected: { customstatus: 200 } },
        { id: "MP-19", constraintId: "C5", title: "Montant sous la capacité", given: "capacity.limit = 175000, montant = 100000", when: "POST request-loan", then: "Accepté.", expected: { customstatus: 200 } },
        { id: "MP-20", constraintId: "C5", title: "Montant égal à la capacité", given: "montant = capacity.limit", when: "POST request-loan", then: "Accepté (la limite est incluse).", expected: { customstatus: 200 } },
        { id: "MP-21", constraintId: "C5", title: "Montant au-dessus de la capacité", given: "montant = capacity.limit + 1", when: "POST simulate-loan puis request-loan", then: "Refus sur les deux, même message ; l'app doit déjà avoir bloqué avec le détail de capacity.", expected: { customstatus: 400, message: "Vous ne pouvez pas obtenir ce prêt car vous ne disposez pas d'un investissement en cours suffisant dans la coopérative. Votre plafond de prêt actuel est de 175000 FCFA.\nMerci de contacter votre gestionnaire." } },
        { id: "MP-22", constraintId: "C5", title: "Capacité nulle", given: "Membre sans action, sans investissement, solde prévisionnel <= 0", when: "GET member-loans puis POST request-loan", then: "capacity.limit = 0 ; toute demande est refusée (plafond affiché : 0 FCFA).", expected: { customstatus: 400 } },
        { id: "MP-23", constraintId: "C5", title: "Gestionnaire sur Mes prêts", given: "Compte gestionnaire, montant > sa propre capacité", when: "POST request-loan", then: "Refus : sur cet écran, un gestionnaire est traité comme un membre simple.", expected: { customstatus: 400 } },
      ],
    },
    {
      title: "Formulaire : taux, durée, exonération, motif (C6 à C9)",
      cases: [
        { id: "MP-24", constraintId: "C6", title: "Taux vide", given: "Sans interest_rate", when: "POST request-loan", then: "Refus.", expected: { customstatus: 400, message: "Taux d'intérêt requis" } },
        { id: "MP-25", constraintId: "C6", title: "Taux négatif", given: "interest_rate = -1", when: "POST request-loan", then: "Refus.", expected: { customstatus: 400, message: "Veuillez indiquer un taux d'intérêt positif ou null." } },
        { id: "MP-26", constraintId: "C6", title: "Taux sous le minimum", given: "minimum_interest_rate = 5, taux = 4", when: "POST request-loan", then: "Refus.", expected: { customstatus: 400, message: "Le taux d'intérêt minimum est de 5.0%." } },
        { id: "MP-27", constraintId: "C6", title: "Taux égal au minimum", given: "taux = minimum_interest_rate", when: "POST request-loan", then: "Accepté.", expected: { customstatus: 200 } },
        { id: "MP-28", constraintId: "C7", title: "Durée vide", given: "Sans repayment_duration_months", when: "POST request-loan", then: "Refus.", expected: { customstatus: 400, message: "Durée totale de remboursement requise" } },
        { id: "MP-29", constraintId: "C7", title: "Durée nulle", given: "durée = 0", when: "POST request-loan", then: "Refus.", expected: { customstatus: 400, message: "Veuillez indiquer une durée de remboursement positive et non nulle." } },
        { id: "MP-30", constraintId: "C7", title: "Durée au-dessus du maximum", given: "max = 12, durée = 13", when: "POST request-loan", then: "Refus.", expected: { customstatus: 400, message: "La durée maximale autorisée pour un prêt est de 12 mois." } },
        { id: "MP-31", constraintId: "C7", title: "Durée égale au maximum", given: "durée = 12", when: "POST request-loan", then: "Accepté, 12 échéances.", expected: { customstatus: 200 } },
        { id: "MP-32", constraintId: "C8", title: "Exonération Non", given: "deferment_type = none, deferment_period omis", when: "POST request-loan", then: "Accepté, deferment_period = 0 dans la réponse.", expected: { customstatus: 200 } },
        { id: "MP-33", constraintId: "C8", title: "Partiel sans période", given: "deferment_type = partial, deferment_period = 0", when: "POST request-loan", then: "Refus.", expected: { customstatus: 400, message: "Veuillez indiquer une période d'exonération positive et non nulle." } },
        { id: "MP-34", constraintId: "C8", title: "Partiel, période égale à la durée", given: "durée = 3, deferment_period = 3", when: "POST request-loan", then: "Refus.", expected: { customstatus: 400, message: "La période d'exonération doit etre strictement plus petite que la durée du remboursement" } },
        { id: "MP-35", constraintId: "C8", title: "Partiel valide", given: "durée = 3, deferment_period = 1", when: "POST request-loan", then: "Accepté ; l'échéancier reflète l'exonération.", expected: { customstatus: 200 } },
        { id: "MP-36", constraintId: "C9", title: "Motif vide à la demande", given: "requested_loan_reason absent", when: "POST request-loan", then: "Refus.", expected: { customstatus: 400, message: "Motif du prêt requis" } },
        { id: "MP-37", constraintId: "C9", title: "Motif absent à la simulation", given: "Sans requested_loan_reason", when: "POST simulate-loan", then: "Accepté : le motif n'est pas requis pour simuler.", expected: { customstatus: 200 } },
      ],
    },
    {
      title: "Simulation",
      cases: [
        { id: "MP-38", title: "Simulation nominale", given: "Membre éligible, champs validés", when: "POST simulate-loan", then: "simulation.monthly_schedule a N entrées, total_capital = montant, capacity renvoyée ; rien n'est créé (member-loans inchangé).", expected: { customstatus: 200 } },
        { id: "MP-39", title: "user_id envoyé par un membre", given: "Membre simple, user_id d'un autre membre dans le corps", when: "POST simulate-loan", then: "Ignoré : la simulation porte sur le membre connecté.", expected: { customstatus: 200 } },
        { id: "MP-40", constraintId: "C3", title: "Simulation par un membre défaillant", given: "member_status = defaulting", when: "POST simulate-loan", then: "Refus, même sans montant excessif.", expected: { customstatus: 400, message: 'Vous ne pouvez pas recevoir de crédit car vous êtes un membre "Défaillant".' } },
        { id: "MP-41", constraintId: "C3", title: "Simulation par un invité", given: "member_types = guest", when: "POST simulate-loan", then: "Refus.", expected: { customstatus: 400, message: 'Vous ne pouvez pas recevoir de crédit car votre statut est "Invité".' } },
        { id: "MP-42", title: "Corps JSON invalide", given: "Corps non JSON", when: "POST simulate-loan", then: "Refus.", expected: { customstatus: 400, message: "Format JSON invalide" } },
      ],
    },
    {
      title: "Soumission",
      cases: [
        { id: "MP-43", title: "Demande nominale", given: "Membre éligible, champs validés, config complète", when: "POST request-loan", then: "loan.state = validated, loan.borrower_id = user_id du membre, repayment_schedule complet, loan_request_date = aujourd'hui ; le prêt apparaît dans member-loans.", expected: { customstatus: 200 } },
        { id: "MP-44", constraintId: "C11", title: "guarantor_ids envoyé", given: "Corps avec guarantor_ids", when: "POST request-loan", then: "Ignoré : loan sans avalistes (pas de champ guarantors dans la réponse membre).", expected: { customstatus: 200 } },
        { id: "MP-45", constraintId: "C10", title: "user_id envoyé", given: "Corps avec user_id d'un autre membre", when: "POST request-loan", then: "Ignoré : le prêt est créé pour le compte connecté.", expected: { customstatus: 200 } },
        { id: "MP-46", constraintId: "C13", title: "Date envoyée", given: "Corps avec loan_request_date", when: "POST request-loan", then: "Ignorée : loan_request_date = date du jour.", expected: { customstatus: 200 } },
        { id: "MP-47", constraintId: "C3", title: "Demande par un membre défaillant", given: "Bouton contourné (appel direct)", when: "POST request-loan", then: "Refus : le serveur ne dépend pas du masquage côté app.", expected: { customstatus: 400, message: 'Vous ne pouvez pas recevoir de crédit car vous êtes un membre "Défaillant".' } },
        { id: "MP-48", constraintId: "C14", title: "Assurance non configurée", given: "Projet d'assurance par défaut absent", when: "POST request-loan", then: "Refus, rien n'est créé.", expected: { customstatus: 400, message: "Veuillez assurer votre projet de prêt avant de procéder à la validation." } },
        { id: "MP-49", constraintId: "C15", title: "Journal non configuré", given: "Journal des prêts absent", when: "POST request-loan", then: "Refus, rien n'est créé.", expected: { customstatus: 400, message: "Le Journal des prêts n'est pas configuré dans les paramètres." } },
        { id: "MP-50", constraintId: "C15", title: "Locale absente", given: "Serveur sans fr_FR.UTF-8", when: "POST request-loan", then: "Erreur 500, rien n'est créé (transaction annulée).", expected: { customstatus: 500, message: "Une erreur est survenue: unsupported locale setting" } },
        { id: "MP-51", title: "Double soumission", given: "Deux appels identiques rapprochés", when: "POST request-loan x2", then: "Deux prêts créés si les deux passent la capacité : l'app doit désactiver le bouton pendant l'appel.", expected: { customstatus: 200 } },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Parcours 2 : Liste des prets (gestionnaire / admin)
// ---------------------------------------------------------------------------

const listeDesPrets: Parcours = {
  slug: "liste-des-prets",
  title: "Liste des prêts",
  group: "Prêts",
  userLine: "Gestionnaire ou administrateur.",
  steps: [
    {
      text: "Le gestionnaire ouvre \"Liste des prêts\". L'app appelle `GET all-loans` sans user_id, qui renvoie une ligne par emprunteur, avec `loan_limits` gardé pour la suite.",
      blocks: [
        {
          kind: "rules",
          rows: [
            {
              id: "C2",
              field: "Accès à l'écran",
              rule: "Réservé aux gestionnaires et administrateurs.",
              apiVariable: "rôle = base.group_system OU nkezefuu.group_nkezefuu_manager",
              appControl: "Obligatoire : écran proposé qu'à ce rôle (le serveur renvoie 403 sinon).",
            },
          ],
        },
      ],
    },
    {
      text: "L'écran liste des prêts s'affiche, avec le bouton qui permet de demander directement un nouveau prêt. Deux actions sont possibles depuis cet écran.",
      blocks: [
        {
          kind: "screen",
          title: "Écran principal",
          endpointIds: ["loans-all-list"],
          fields: [
            { label: "Nom", apiVariable: "borrowers[].name" },
            { label: "Reste à payer", apiVariable: "borrowers[].total_outstanding" },
            { label: "Progression", apiVariable: "borrowers[].repayment_percentage" },
            { label: "Montant en retard", apiVariable: "borrowers[].overdue_amount" },
            { label: "Couleur de statut", apiVariable: "borrowers[].status_color" },
          ],
          note: "Couleur déjà calculée côté serveur, à afficher telle quelle. Seuls les emprunteurs ayant déjà au moins un prêt apparaissent ici : un membre sans aucun prêt n'a pas de ligne, et le bouton de demande directe est le seul chemin pour lui.",
        },
      ],
      children: [
        {
          text: "Il demande directement un nouveau prêt : clic sur le bouton, sans avoir choisi de demandeur au préalable.",
          children: [
            {
              text: "Une popup de sélection du demandeur s'affiche : il saisit une recherche (`GET member-search`), choisit un membre dans la liste, puis valide. L'app retient `members[].user_id` du membre choisi.",
              blocks: [
                {
                  kind: "screen",
                  title: "Popup de sélection du demandeur",
                  endpointIds: ["loans-member-search"],
                  fields: [
                    { label: "Nom", apiVariable: "members[].name" },
                    { label: "Identifiant", apiVariable: "members[].code" },
                    { label: "Téléphone", apiVariable: "members[].phone" },
                    { label: "Pastille éligibilité", apiVariable: "members[].eligibility.is_eligible" },
                  ],
                  note: "members[].user_id sert à identifier le demandeur, jamais affiché à l'écran.",
                },
                {
                  kind: "rules",
                  rows: [
                    {
                      id: "C12",
                      field: "Recherche",
                      rule: "Exige au moins un caractère et ne renvoie que des correspondances par préfixe.",
                      apiVariable: "search >= 1 caractère, 30 résultats max",
                      appControl: "Comportement propre à l'app, pas une règle serveur dupliquée.",
                    },
                    {
                      id: "C3",
                      field: "Demandeur",
                      rule: 'Doit être "En règle" et non "Invité", sans exception de rôle.',
                      apiVariable: "eligibility.is_eligible du demandeur",
                      appControl: "Obligatoire : bloquant à la validation de la popup, pas juste une alerte.",
                    },
                  ],
                },
              ],
            },
            {
              ref: "form",
              text: "Le formulaire s'affiche avec le demandeur verrouillé. Avant de l'afficher, l'app appelle `GET all-loans?user_id=X` pour récupérer la `capacity` et l'`eligibility` de ce demandeur : ici la liste `loans[]` renvoyée n'est pas affichée, seules les deux autres servent à borner le formulaire. Les champs sont les mêmes que dans \"Mes prêts\" (motif, montant, taux, durée, exonération), avec les mêmes règles C4, C6 à C9, plus les deux ci-dessous.",
              blocks: [
                {
                  kind: "rules",
                  title: "Formulaire \"Demander un prêt pour un membre\" : ce qui change",
                  rows: [
                    {
                      id: "C10",
                      field: "Demandeur",
                      rule: "Obligatoire avant de simuler ou de soumettre, et verrouillé une fois choisi.",
                      apiVariable: "user_id requis sur simulate-loan et request-loan-for-member",
                      appControl: "Obligatoire : jamais d'appel sans demandeur choisi.",
                    },
                    {
                      id: "C5",
                      field: "Montant",
                      rule: "Ne peut pas dépasser la capacité du demandeur, sauf si le demandeur est le gestionnaire lui-même, où le plafond redevient bloquant.",
                      apiVariable: "requested_loan_amount <= capacity.limit : alerte si demandeur != compte connecté, bloquant si user_id = self",
                      appControl: "Obligatoire de distinguer les deux cas : sinon le gestionnaire croit son propre plafond contournable via cet écran.",
                    },
                  ],
                },
              ],
              children: [
                {
                  text: "Il peut ajouter des avalistes : `POST loan-guarantor-search`, avec le `user_id` du demandeur dans le corps. Étape facultative, un prêt sans avaliste est accepté.",
                  blocks: [
                    {
                      kind: "screen",
                      title: "Recherche avalistes",
                      endpointIds: ["loans-guarantor-search"],
                      fields: [
                        { label: "Nom", apiVariable: "members[].name" },
                        { label: "Identifiant", apiVariable: "members[].code" },
                        { label: "Téléphone", apiVariable: "members[].phone" },
                        { label: "Pastille éligibilité", apiVariable: "members[].eligibility.is_eligible" },
                      ],
                      note: "members[].member_id sert à ajouter un avaliste, jamais affiché à l'écran ; à ne pas confondre avec user_id, qui identifie le demandeur.",
                    },
                    {
                      kind: "rules",
                      rows: [
                        {
                          id: "C11",
                          field: "Avaliste",
                          rule: "Le demandeur ne peut pas être son propre avaliste.",
                          apiVariable: "guarantor_ids[] = des member_id, demandeur exclu",
                          appControl: "L'app doit déjà l'exclure à la recherche (loan-guarantor-search) ; le vrai verrou reste une contrainte du modèle côté serveur. Sans ce filtrage, l'utilisateur pourrait sélectionner puis se faire rejeter à la validation.",
                        },
                      ],
                    },
                  ],
                },
                {
                  text: "Il peut lancer `POST simulate-loan` pour prévisualiser, avec `user_id` obligatoire : rien n'est créé. Étape facultative.",
                },
                {
                  text: "Il valide : `POST request-loan-for-member` crée le prêt pour le demandeur, pas pour le gestionnaire. En cas de succès, `GET all-loans/{id}` affiche le prêt créé. En cas d'échec, le message du serveur est affiché tel quel et rien n'est créé. Mêmes contraintes de configuration serveur que Mes prêts (assurance, journaux, locale), non répétées ici.",
                },
              ],
            },
          ],
        },
        {
          text: "Il clique sur une ligne d'emprunteur : `GET all-loans?user_id=X` affiche la liste de tous les prêts de ce membre, avec le bouton \"Demander un prêt pour ce membre\". Même appel qu'en {{form}}, mais ici la liste `loans[]` est affichée, en plus de la `capacity` et de l'`eligibility` retenues.",
          blocks: [
            {
              kind: "screen",
              title: "Prêts du demandeur",
              endpointIds: ["loans-all-list"],
              fields: [
                { label: "Référence", apiVariable: "loans[].code" },
                { label: "Statut", apiVariable: "loans[].state" },
                { label: "Montant demandé", apiVariable: "loans[].requested_loan_amount" },
                { label: "Motif", apiVariable: "loans[].requested_loan_reason" },
                { label: "Date de la demande", apiVariable: "loans[].loan_request_date" },
              ],
              note: "Mêmes colonnes que l'écran liste de Mes prêts, mais pour le membre choisi.",
            },
          ],
          children: [
            {
              text: "Il clique sur \"Demander un prêt pour ce membre\" : on tombe sur le formulaire de {{form}}, demandeur déjà verrouillé. La popup de sélection n'est pas affichée, et l'appel `GET all-loans?user_id=X` a déjà été fait à l'étape précédente : il n'est pas rejoué.",
            },
            {
              text: "Il clique sur une ligne de prêt : `GET all-loans/{id}` affiche le détail de ce prêt. Il reprend les mêmes lignes que le détail de Mes prêts (montant, totaux, échéancier), plus le bénéfice attendu, les avalistes et les vraies factures d'assurance, avec leur numéro.",
              blocks: [
                {
                  kind: "screen",
                  title: "Détail d'un prêt (gestionnaire)",
                  endpointIds: ["loans-all-detail"],
                  fields: [
                    { label: "Bénéfice attendu", apiVariable: "profit" },
                    { label: "Avalistes", apiVariable: "guarantors[] : id, nom" },
                    { label: "Factures d'assurance", apiVariable: "insurance_invoices[] : id, name (numéro, ex. FA/2025/00128), amount_total, invoice_date_due, payment_state" },
                  ],
                },
              ],
              children: [
                {
                  text: "Depuis ce détail, le bouton \"Nouveau prêt pour ce membre\" mène au formulaire de {{form}} pour le titulaire du prêt consulté (`loan.borrower_id`), sans repasser par la popup de sélection.",
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  testGroups: [
    {
      title: "Accès et rôle",
      cases: [
        { id: "LP-01", constraintId: "C1", title: "Sans jeton", given: "Aucun en-tête Authorization", when: "GET all-loans", then: "Refus.", expected: { customstatus: 401, message: "Authentification requise" } },
        { id: "LP-02", constraintId: "C2", title: "Membre simple sur la liste", given: "Jeton d'un membre sans rôle gestionnaire", when: "GET all-loans", then: "Refus.", expected: { customstatus: 403, message: "Réservé aux gestionnaires et administrateurs" } },
        { id: "LP-03", constraintId: "C2", title: "Membre simple sur le picker", given: "Jeton d'un membre simple", when: "GET member-search?search=a", then: "Refus.", expected: { customstatus: 403, message: "Réservé aux gestionnaires et administrateurs" } },
        { id: "LP-04", constraintId: "C2", title: "Membre simple sur les avalistes", given: "Jeton d'un membre simple", when: "POST loan-guarantor-search", then: "Refus.", expected: { customstatus: 403, message: "Réservé aux gestionnaires et administrateurs" } },
        { id: "LP-05", constraintId: "C2", title: "Membre simple sur la demande pour un tiers", given: "Jeton d'un membre simple", when: "POST request-loan-for-member", then: "Refus.", expected: { customstatus: 403, message: "Réservé aux gestionnaires et administrateurs" } },
        { id: "LP-06", constraintId: "C2", title: "Administrateur Odoo sans groupe gestionnaire", given: "Jeton d'un admin (base.group_system)", when: "GET all-loans", then: "Accepté : l'un ou l'autre groupe suffit.", expected: { customstatus: 200 } },
      ],
    },
    {
      title: "Écran principal (agrégation)",
      cases: [
        { id: "LP-07", title: "Aucun prêt", given: "Base sans prêt", when: "GET all-loans", then: "borrowers = [], loan_limits présent avec avalistes_rate.", expected: { customstatus: 200 } },
        { id: "LP-08", title: "Une ligne par emprunteur", given: "Un membre avec 3 prêts, un autre avec 1", when: "GET all-loans", then: "2 lignes, loans_count 3 et 1, triées par total_outstanding décroissant.", expected: { customstatus: 200 } },
        { id: "LP-09", title: "Couleur retard", given: "Emprunteur avec une échéance dépassée non réglée", when: "GET all-loans", then: "overdue_amount > 0, status_color #DC2626, status_label retard, même si sa progression est élevée.", expected: { customstatus: 200 } },
        { id: "LP-10", title: "Couleur statut membre", given: "Emprunteur Invité ou Exclu, sans retard", when: "GET all-loans", then: "status_color #F97316, status_label statut_membre.", expected: { customstatus: 200 } },
        { id: "LP-11", title: "Couleur totalement remboursé", given: "Emprunteur en règle, tous prêts payés", when: "GET all-loans", then: "repayment_percentage 100, total_outstanding 0, status_color #23A949, status_label rembourse.", expected: { customstatus: 200 } },
        { id: "LP-12", title: "Couleur non démarré", given: "Emprunteur en règle, prêt validated sans aucun paiement, échéance non échue", when: "GET all-loans", then: "repayment_percentage 0, status_color #E9ECEF, status_label non_demarre.", expected: { customstatus: 200 } },
        { id: "LP-13", title: "Priorité retard sur statut", given: "Emprunteur défaillant (donc en retard)", when: "GET all-loans", then: "status_label retard (pas statut_membre) : le retard réel prime.", expected: { customstatus: 200 } },
        { id: "LP-14", title: "Prêts en brouillon", given: "Emprunteur n'ayant qu'un prêt draft", when: "GET all-loans", then: "Ligne présente, loans_count 1, active_loans_count 0, total_outstanding 0.", expected: { customstatus: 200 } },
        { id: "LP-15", title: "Filtre par état", given: "Prêts draft et validated", when: "GET all-loans?state=validated", then: "Seuls les emprunteurs ayant un prêt validated ; loans_count ne compte que ceux-là.", expected: { customstatus: 200 } },
        { id: "LP-16", title: "Gestionnaire emprunteur", given: "Le gestionnaire connecté a lui-même des prêts", when: "GET all-loans", then: "Il apparaît comme n'importe quel emprunteur.", expected: { customstatus: 200 } },
        { id: "LP-17", title: "Projet emprunteur", given: "Un prêt dont le demandeur est un projet", when: "GET all-loans", then: "Ligne présente, eligibility.is_eligible true, member_status false.", expected: { customstatus: 200 } },
      ],
    },
    {
      title: "Picker du demandeur (C12)",
      cases: [
        { id: "LP-18", constraintId: "C12", title: "Recherche vide", given: "search absent ou vide", when: "GET member-search", then: "members = [] (pas d'erreur).", expected: { customstatus: 200 } },
        { id: "LP-19", constraintId: "C12", title: "Un caractère", given: "search=k", when: "GET member-search?search=k", then: "Tous les membres dont le nom, le code ou le téléphone commence par k/K, 30 max.", expected: { customstatus: 200 } },
        { id: "LP-20", constraintId: "C12", title: "Préfixe, pas 'contient'", given: "Membre 'KENMOE Nelson'", when: "GET member-search?search=nel", then: "Non trouvé : 'nel' n'est pas un préfixe du nom ('KEN' l'est).", expected: { customstatus: 200 } },
        { id: "LP-21", constraintId: "C12", title: "Recherche par identifiant", given: "Membre code M0042", when: "GET member-search?search=M00", then: "Trouvé.", expected: { customstatus: 200 } },
        { id: "LP-22", constraintId: "C12", title: "Recherche par téléphone", given: "Membre téléphone +2376...", when: "GET member-search?search=%2B2376", then: "Trouvé (encoder le + en %2B dans l'URL).", expected: { customstatus: 200 } },
        { id: "LP-23", constraintId: "C12", title: "Insensible à la casse", given: "Membre 'KENMOE'", when: "GET member-search?search=ken", then: "Trouvé.", expected: { customstatus: 200 } },
        { id: "LP-24", constraintId: "C12", title: "Membre sans compte utilisateur", given: "Fiche membre sans res_users_id", when: "GET member-search", then: "Absent des résultats : il ne peut pas être demandeur.", expected: { customstatus: 200 } },
        { id: "LP-25", constraintId: "C12", title: "Plus de 30 résultats", given: "35 membres commençant par 'A'", when: "GET member-search?search=a", then: "30 résultats, les premiers par ordre alphabétique.", expected: { customstatus: 200 } },
        { id: "LP-26", constraintId: "C3", title: "Membre non éligible dans la liste", given: "Membre défaillant commençant par la lettre cherchée", when: "GET member-search", then: "Présent, eligibility.is_eligible false : l'app le grise.", expected: { customstatus: 200 } },
      ],
    },
    {
      title: "Contexte du demandeur",
      cases: [
        { id: "LP-27", constraintId: "C10", title: "Membre choisi", given: "user_id d'un membre avec prêts", when: "GET all-loans?user_id=45", then: "loans = ses prêts, capacity et eligibility à lui (pas ceux du gestionnaire), loan_limits présent.", expected: { customstatus: 200 } },
        { id: "LP-28", constraintId: "C10", title: "Membre sans prêt", given: "user_id d'un membre sans prêt", when: "GET all-loans?user_id=45", then: "loans = [], capacity et eligibility quand même renvoyés.", expected: { customstatus: 200 } },
        { id: "LP-29", constraintId: "C10", title: "user_id inexistant", given: "user_id = 999999", when: "GET all-loans?user_id=999999", then: "loans = [], capacity à 0, eligibility.is_eligible true (aucune fiche) : l'app ne doit pas laisser continuer avec un id inconnu, la simulation et la demande le refuseront.", expected: { customstatus: 200 } },
        { id: "LP-30", constraintId: "C10", title: "user_id non numérique", given: "user_id = abc", when: "GET all-loans?user_id=abc", then: "Erreur serveur.", expected: { customstatus: 500 } },
        { id: "LP-31", constraintId: "C3", title: "Demandeur non éligible", given: "user_id d'un membre défaillant", when: "GET all-loans?user_id=", then: "eligibility.is_eligible false, member_status_label 'Défaillant' : l'app bloque avant le formulaire.", expected: { customstatus: 200 } },
      ],
    },
    {
      title: "Avalistes (C11, C12)",
      cases: [
        { id: "LP-32", constraintId: "C12", title: "user_id absent", given: "Corps JSON sans user_id", when: "POST loan-guarantor-search?search=a", then: "Refus, pas de liste.", expected: { customstatus: 400, message: "Demandeur du prêt requis (user_id)" } },
        { id: "LP-33", constraintId: "C12", title: "Corps invalide", given: "Corps non JSON", when: "POST loan-guarantor-search?search=a", then: "Refus.", expected: { customstatus: 400, message: "Format JSON invalide" } },
        { id: "LP-34", constraintId: "C11", title: "Demandeur exclu", given: "user_id = 45 (KENMOE), search=ken", when: "POST loan-guarantor-search", then: "KENMOE absent des résultats, les autres 'KEN...' présents.", expected: { customstatus: 200 } },
        { id: "LP-35", constraintId: "C11", title: "Avaliste défaillant", given: "Membre défaillant commençant par la lettre cherchée", when: "POST loan-guarantor-search", then: "Présent : aucun filtre de statut sur les avalistes.", expected: { customstatus: 200 } },
        { id: "LP-36", constraintId: "C11", title: "Demandeur dans guarantor_ids", given: "guarantor_ids contient le member_id du demandeur", when: "POST request-loan-for-member", then: "Refus, rien n'est créé.", expected: { customstatus: 400, message: "Le demandeur du prêt ne peut pas être son propre avaliste." } },
        { id: "LP-37", constraintId: "C11", title: "user_id passé à la place de member_id", given: "guarantor_ids = [user_id d'un membre]", when: "POST request-loan-for-member", then: "Si un membre porte ce member_id : accepté mais lie le mauvais avaliste. Sinon : erreur serveur (500). Toujours envoyer members[].member_id." },
        { id: "LP-38", constraintId: "C11", title: "Plusieurs avalistes", given: "guarantor_ids = [12, 18]", when: "POST request-loan-for-member", then: "loan.guarantors contient les deux, dans l'ordre.", expected: { customstatus: 200 } },
        { id: "LP-39", constraintId: "C11", title: "Sans avaliste", given: "guarantor_ids absent", when: "POST request-loan-for-member", then: "Accepté, loan.guarantors = [].", expected: { customstatus: 200 } },
      ],
    },
    {
      title: "Formulaire et simulation (C4 à C10)",
      cases: [
        { id: "LP-40", constraintId: "C10", title: "Simulation sans user_id", given: "Gestionnaire, corps sans user_id", when: "POST simulate-loan", then: "Refus : pas de repli sur le gestionnaire.", expected: { customstatus: 400, message: "Demandeur du prêt requis (user_id)" } },
        { id: "LP-41", constraintId: "C10", title: "Simulation, user_id inexistant", given: "user_id = 999999", when: "POST simulate-loan", then: "Refus.", expected: { customstatus: 404, message: "Demandeur introuvable ou non éligible" } },
        { id: "LP-42", constraintId: "C5", title: "Simulation, tiers au-dessus de sa capacité", given: "user_id d'un membre, montant > sa capacity.limit", when: "POST simulate-loan", then: "Accepté : capacity renvoyée pour l'alerte, pas de blocage pour un tiers.", expected: { customstatus: 200 } },
        { id: "LP-43", constraintId: "C5", title: "Simulation, gestionnaire pour lui-même", given: "user_id = compte du gestionnaire, montant > sa capacité", when: "POST simulate-loan", then: "Refus : pour soi-même, le plafond est bloquant.", expected: { customstatus: 400 } },
        { id: "LP-44", constraintId: "C3", title: "Simulation pour un membre défaillant", given: "user_id d'un membre défaillant", when: "POST simulate-loan", then: "Refus, message 'autrui'.", expected: { customstatus: 400, message: 'Le membre <nom> ne peut pas recevoir de crédit car il est un membre "Défaillant".' } },
        { id: "LP-45", constraintId: "C3", title: "Simulation pour un projet", given: "user_id d'un projet", when: "POST simulate-loan", then: "Accepté : pas de contrainte de statut pour un projet.", expected: { customstatus: 200 } },
        { id: "LP-46", constraintId: "C4", title: "Bornes du formulaire", given: "Mêmes cas que MP-15 à MP-37", when: "POST simulate-loan / request-loan-for-member avec user_id", then: "Mêmes refus et mêmes messages : les règles C4, C6, C7, C8, C9 sont identiques pour un gestionnaire.", expected: { customstatus: 400 } },
      ],
    },
    {
      title: "Soumission pour un tiers",
      cases: [
        { id: "LP-47", title: "Demande nominale", given: "Gestionnaire, user_id d'un membre éligible, champs validés", when: "POST request-loan-for-member", then: "loan.borrower_id = user_id cible (pas le gestionnaire), state validated, profit et guarantors présents.", expected: { customstatus: 200 } },
        { id: "LP-48", constraintId: "C10", title: "Sans user_id", given: "Corps sans user_id", when: "POST request-loan-for-member", then: "Refus.", expected: { customstatus: 400, message: "Demandeur du prêt requis" } },
        { id: "LP-49", constraintId: "C10", title: "user_id inexistant", given: "user_id = 999999", when: "POST request-loan-for-member", then: "Refus.", expected: { customstatus: 404, message: "Demandeur introuvable ou non éligible" } },
        { id: "LP-50", constraintId: "C5", title: "Tiers au-dessus de sa capacité", given: "montant > capacity.limit du membre cible", when: "POST request-loan-for-member", then: "Accepté : l'app a affiché une alerte, le prêt est créé.", expected: { customstatus: 200 } },
        { id: "LP-51", constraintId: "C5", title: "Gestionnaire se choisit lui-même", given: "user_id = compte du gestionnaire, montant > sa capacité", when: "POST request-loan-for-member", then: "Refus : impossible de contourner son propre plafond par cet écran.", expected: { customstatus: 400, message: "Vous ne pouvez pas obtenir ce prêt car Vous ne disposez pas d'un investissement en cours suffisant dans la coopérative. Votre plafond de prêt actuel est de <plafond> FCFA \nMerci de contacter votre gestionnaire" } },
        { id: "LP-52", constraintId: "C5", title: "Gestionnaire se choisit lui-même, sous le plafond", given: "user_id = compte du gestionnaire, montant <= sa capacité", when: "POST request-loan-for-member", then: "Accepté : il peut emprunter pour lui-même.", expected: { customstatus: 200 } },
        { id: "LP-53", constraintId: "C3", title: "Demandeur défaillant", given: "user_id d'un membre défaillant", when: "POST request-loan-for-member", then: "Refus, sans exception de rôle.", expected: { customstatus: 400, message: 'Le membre <nom> ne peut pas recevoir de crédit car il est un membre "Défaillant".' } },
        { id: "LP-54", constraintId: "C3", title: "Demandeur invité", given: "user_id d'un membre guest", when: "POST request-loan-for-member", then: "Refus.", expected: { customstatus: 400, message: 'Le membre <nom> ne peut pas recevoir de crédit car son statut est "Invité".' } },
        { id: "LP-55", constraintId: "C3", title: "Demandeur projet", given: "user_id d'un projet", when: "POST request-loan-for-member", then: "Accepté : un projet peut emprunter.", expected: { customstatus: 200 } },
        { id: "LP-56", constraintId: "C14", title: "Assurance non configurée", given: "Projet d'assurance par défaut absent", when: "POST request-loan-for-member", then: "Refus, rien n'est créé.", expected: { customstatus: 400, message: "Veuillez assurer votre projet de prêt avant de procéder à la validation." } },
        { id: "LP-57", constraintId: "C15", title: "Locale absente", given: "Serveur sans fr_FR.UTF-8", when: "POST request-loan-for-member", then: "Erreur 500, rien n'est créé.", expected: { customstatus: 500, message: "Une erreur est survenue: unsupported locale setting" } },
      ],
    },
    {
      title: "Consultation et points d'entrée",
      cases: [
        { id: "LP-58", title: "Détail gestionnaire", given: "Prêt de n'importe quel membre", when: "GET all-loans/{id}", then: "Détail complet avec profit, guarantors, insurance_invoices.", expected: { customstatus: 200 } },
        { id: "LP-59", title: "Prêt inexistant", given: "loan_id = 999999", when: "GET all-loans/999999", then: "Refus.", expected: { customstatus: 404, message: "Prêt introuvable" } },
        { id: "LP-60", title: "Entrée par une ligne d'emprunteur", given: "Clic sur borrowers[].user_id = 45", when: "GET all-loans?user_id=45 puis formulaire", then: "Le picker n'est pas affiché ; le demandeur est verrouillé sur ce membre ; la soumission passe par request-loan-for-member.", expected: { customstatus: 200 } },
        { id: "LP-61", title: "Entrée par un prêt existant", given: "Détail d'un prêt, loan.borrower_id = 45", when: "'Nouveau prêt pour ce membre'", then: "Même comportement que LP-60 avec user_id = 45.", expected: { customstatus: 200 } },
        { id: "LP-62", title: "Mauvaise route depuis une entrée directe", given: "Demandeur connu d'avance, app appelle request-loan au lieu de request-loan-for-member", when: "POST request-loan", then: "Le prêt est créé pour le gestionnaire, pas pour le membre : erreur d'intégration à éviter.", expected: { customstatus: 200 } },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Parcours 3 : Mes comptes bancaires (gestionnaire des comptes bancaires)
// ---------------------------------------------------------------------------

const bandeauGestionnaireHtml = `
  <div style="display:flex;gap:.5rem;flex-wrap:wrap">
    <div style="flex:1;min-width:150px;padding:.75rem 1rem;border-radius:.5rem;background:var(--color-accent-soft);color:var(--color-accent-ink)">
      <div style="font-size:1.35rem;font-weight:600;line-height:1">1</div>
      <div style="font-size:.75rem;margin-top:.25rem">envoi(s) en cours (touchable → "Mes envois")</div>
    </div>
    <div style="flex:1;min-width:150px;padding:.75rem 1rem;border-radius:.5rem;background:var(--color-warn-soft);color:var(--color-warn)">
      <div style="font-size:1.35rem;font-weight:600;line-height:1">3</div>
      <div style="font-size:.75rem;margin-top:.25rem">réception(s) en attente (touchable → "Mes réceptions")</div>
    </div>
  </div>
`;

const mesComptesBancaires: Parcours = {
  slug: "mes-comptes-bancaires",
  title: "Mes comptes bancaires",
  group: "Comptes bancaires",
  userLine:
    "Gestionnaire des comptes bancaires (nkezefuu.group_nkezefuu_bank_account_manager) : rôle distinct du Gestionnaire nkezefuu, qui n'a ici aucun accès.",
  steps: [
    {
      text: "Le gestionnaire ouvre \"Mes comptes bancaires\". L'app appelle `GET member-bank-accounts`, qui renvoie uniquement les comptes dont il fait partie de manager_id, et `GET bank-transfer/pending-summary`, qui alimente un bandeau de résumé affiché en tête de ce même écran, pas sur un écran à part.",
      blocks: [
        { kind: "mockup", title: "Bandeau de résumé (haut de l'écran)", html: bandeauGestionnaireHtml },
        {
          kind: "screen",
          title: "Écran liste",
          endpointIds: ["bank-accounts-member"],
          fields: [
            { label: "Compte général", apiVariable: "bank_accounts[].general_account.account" },
            { label: "Description", apiVariable: "bank_accounts[].description" },
            { label: "Solde", apiVariable: "bank_accounts[].balance" },
          ],
        },
      ],
    },
    {
      text: "Il touche la zone \"envois\" du bandeau : `GET bank-transfer/sent` liste ses virements en brouillon ou en attente, tous comptes gérés confondus, triés du plus récent au plus ancien.",
      blocks: [
        {
          kind: "screen",
          title: "Mes envois",
          endpointIds: ["bank-transfer-sent"],
          fields: [
            { label: "Référence", apiVariable: "transfers[].name" },
            { label: "Compte émetteur", apiVariable: "transfers[].sender_account.general_account" },
            { label: "Compte destinataire", apiVariable: "transfers[].recipient_account.general_account" },
            { label: "Montant", apiVariable: "transfers[].amount" },
            { label: "Statut", apiVariable: "transfers[].state" },
          ],
          note: "Un virement complété ou rejeté sort de cette liste, il reste consultable dans \"Virements bancaires\" du compte concerné.",
        },
      ],
    },
    {
      ref: "receptions-gest",
      text: "Il touche la zone \"réceptions\" du bandeau : `GET bank-transfer/received` liste les virements en attente dont il est le destinataire désigné, tous comptes gérés confondus.",
      blocks: [
        {
          kind: "screen",
          title: "Mes réceptions",
          endpointIds: ["bank-transfer-received"],
          fields: [
            { label: "Référence", apiVariable: "transfers[].name" },
            { label: "Compte émetteur", apiVariable: "transfers[].sender_account.general_account" },
            { label: "Émetteur désigné", apiVariable: "transfers[].sender_manager.name" },
            { label: "Montant", apiVariable: "transfers[].amount" },
          ],
        },
      ],
    },
    {
      text: "Depuis la liste, il déplie un compte : deux actions apparaissent, selon ce qu'il veut faire sur ce compte précis.",
      children: [
        {
          ref: "mouvements-gest",
          text: "\"Mouvements bancaires\" : `GET bank-account/{id}/transactions` affiche tous les dépôts et retraits de ce compte, brouillons et réalisés mélangés, avec le bouton \"Nouvelle transaction\".",
          blocks: [
            {
              kind: "screen",
              title: "Mouvements bancaires",
              endpointIds: ["bank-account-transactions-list"],
              fields: [
                { label: "Type", apiVariable: "transactions[].transaction_type" },
                { label: "Bénéficiaire", apiVariable: "transactions[].beneficiary.name" },
                { label: "Montant", apiVariable: "transactions[].amount" },
                { label: "Statut", apiVariable: "transactions[].state" },
                { label: "Créé par", apiVariable: "transactions[].created_by.name" },
              ],
            },
          ],
          children: [
            {
              text: "Nouvelle transaction : il cherche le bénéficiaire (`GET bank-account/beneficiary-search`), choisit \"deposit\" ou \"withdrawal\", saisit le montant, puis \"Enregistrer\" (brouillon) ou \"Valider\" directement comme au back-office (`POST bank-account/{id}/transaction`, avec validate à true dans ce second cas).",
              blocks: [
                {
                  kind: "rules",
                  rows: [
                    { id: "B1", field: "Bénéficiaire", rule: "Uniquement un membre (pas un projet), revérifié côté serveur.", apiVariable: "partner_id", appControl: "Le champ ne propose que des membres, via beneficiary-search." },
                    {
                      id: "B2",
                      field: "Retrait",
                      rule: "Le solde réel du bénéficiaire doit couvrir le montant, vérifié seulement à la validation, pas à l'enregistrement en brouillon.",
                      apiVariable: "beneficiary.actual_balance",
                      appControl: "Impossible d'anticiper côté app : afficher l'erreur serveur telle quelle si validate échoue.",
                    },
                    {
                      id: "B3",
                      field: "Dépôt",
                      rule: "Le compte bancaire lui-même doit être assez approvisionné : un dépôt crédite le bénéficiaire DEPUIS ce compte.",
                      apiVariable: "bank_account_id.balance",
                      appControl: "Contre-intuitif : bien afficher le solde du compte, pas celui du bénéficiaire, dans le message d'erreur.",
                    },
                    { id: "B4", field: "Date", rule: "Toujours celle du serveur, jamais saisie ni envoyée par l'app.", apiVariable: "transaction_date", appControl: "Champ non éditable." },
                  ],
                },
              ],
            },
            { text: "Modifier un brouillon dont il est le créateur : `POST bank-account/transaction/{id}/update`, avec le même bouton \"Valider\" possible dans le même appel." },
            { text: "Valider un brouillon dont il est le créateur : `POST bank-account/transaction/{id}/validate`, l'écriture comptable est posée, l'état passe à completed." },
          ],
        },
        {
          ref: "virements-gest",
          text: "\"Virements bancaires\" : `GET bank-account/{id}/transfers` affiche tous les virements où ce compte est émetteur ou destinataire, avec le bouton \"Nouveau virement\" (compte émetteur déjà pré-rempli avec celui-ci).",
          blocks: [
            {
              kind: "screen",
              title: "Virements bancaires",
              endpointIds: ["bank-account-transfers-list"],
              fields: [
                { label: "Référence", apiVariable: "transfers[].name" },
                { label: "Sens", apiVariable: "transfers[].direction" },
                { label: "Montant", apiVariable: "transfers[].amount" },
                { label: "Statut", apiVariable: "transfers[].state" },
              ],
              note: "Montre aussi les virements des autres gestionnaires de ce même compte, pas seulement les siens.",
            },
          ],
          children: [
            {
              text: "Nouveau virement : il choisit le compte destinataire (`GET bank-account/recipients`), puis le gestionnaire précis à désigner comme destinataire sur ce compte (`GET bank-account/{id}/managers`), saisit le montant, puis \"Enregistrer\" ou \"Valider\" (`POST bank-transfer`).",
              blocks: [
                {
                  kind: "rules",
                  rows: [
                    {
                      id: "B5",
                      field: "Émetteur désigné",
                      rule: "Pour un gestionnaire, toujours lui-même : impossible d'émettre au nom d'un autre gestionnaire du même compte, même en l'envoyant explicitement.",
                      apiVariable: "sender_manager_id",
                      appControl: "L'app n'a pas besoin de le proposer, le serveur l'impose.",
                    },
                    { id: "B6", field: "Comptes", rule: "Le compte émetteur et le compte destinataire ne peuvent pas être identiques.", apiVariable: "sender_account_id / recipient_account_id", appControl: "Exclure le compte courant de la liste \"recipients\" côté app." },
                    { id: "B7", field: "Montant", rule: "Doit être strictement positif.", apiVariable: "amount", appControl: "Validation de saisie simple." },
                  ],
                },
              ],
            },
            { text: "Modifier un brouillon dont il est l'émetteur désigné : `POST bank-transfer/{id}/update`." },
            { text: "Soumettre un brouillon dont il est l'émetteur désigné, séparément de la création : `POST bank-transfer/{id}/submit`. Le virement passe en attente, visible du destinataire désigné." },
            { text: "Tant que le virement est en attente, il peut l'annuler s'il en est l'émetteur désigné : `POST bank-transfer/{id}/cancel`, retour en brouillon." },
            {
              text: "S'il est le destinataire désigné d'un virement en attente (visible sur le compte destinataire, ou dans {{receptions-gest}}), il le valide ou le rejette : `POST bank-transfer/{id}/approve` ou `/reject`.",
              blocks: [
                {
                  kind: "rules",
                  rows: [
                    { id: "B8", field: "Destinataire désigné", rule: "Seul lui, pas un autre gestionnaire du même compte destinataire, même s'il le gère aussi.", apiVariable: "recipient_manager_id", appControl: "Boutons Valider/Rejeter affichés seulement si can_approve/can_reject." },
                    { id: "B9", rule: "Validé ou rejeté : définitif, aucun retour possible ensuite, dans les deux cas.", field: "État", apiVariable: "state", appControl: "Prévenir avant confirmation, pas d'action \"annuler\" après coup." },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  testGroups: [
    {
      title: "Accès",
      cases: [
        { id: "BAM-01", title: "Gestionnaire nkezefuu seul", given: "Compte avec uniquement group_nkezefuu_manager", when: "GET member-bank-accounts", then: "Refus : ce rôle ne donne aucun accès ici.", expected: { customstatus: 403 } },
        { id: "BAM-02", title: "Admin système pur", given: "Compte admin sans le rôle Gestionnaire des comptes bancaires", when: "GET member-bank-accounts", then: "Refus : cet écran est réservé au gestionnaire, l'admin utilise \"Comptes bancaires\".", expected: { customstatus: 403 } },
        { id: "BAM-03", title: "Gestionnaire nominal", given: "Compte avec le rôle Gestionnaire des comptes bancaires", when: "GET member-bank-accounts", then: "Renvoie uniquement les comptes où il figure dans manager_id.", expected: { customstatus: 200 } },
      ],
    },
    {
      title: "Transactions",
      cases: [
        { id: "BAM-10", constraintId: "B1", title: "Bénéficiaire projet", given: "partner_id d'un projet", when: "POST bank-account/{id}/transaction", then: "Refus : seuls les membres sont acceptés comme bénéficiaires.", expected: { customstatus: 400, message: "Bénéficiaire invalide pour un dépôt/retrait" } },
        { id: "BAM-11", constraintId: "B2", title: "Retrait, solde insuffisant, validate true", given: "Bénéficiaire avec actual_balance < amount", when: "POST transaction avec validate: true", then: "Transaction reste en brouillon, réponse avec error en plus de transaction à jour.", expected: { customstatus: 400 } },
        { id: "BAM-12", constraintId: "B2", title: "Retrait, solde insuffisant, sans validate", given: "Même cas, validate absent", when: "POST transaction", then: "Accepté : la contrainte de solde ne joue qu'à la validation.", expected: { customstatus: 200 } },
        { id: "BAM-13", constraintId: "B3", title: "Dépôt, compte bancaire sous-approvisionné", given: "bank_account.balance < amount, validate: true", when: "POST transaction", then: "Refus à la validation, brouillon conservé.", expected: { customstatus: 400 } },
        { id: "BAM-14", title: "Modifier le brouillon d'un autre gestionnaire", given: "Transaction créée par un collègue gestionnaire du même compte", when: "POST bank-account/transaction/{id}/update", then: "Refus : seul le créateur ou l'admin peut modifier.", expected: { customstatus: 403 } },
        { id: "BAM-15", title: "Annuler une transaction réalisée", given: "Gestionnaire, transaction state completed", when: "POST bank-account/transaction/{id}/cancel", then: "Refus : réservé strictement à l'admin.", expected: { customstatus: 403, message: "Réservé à l'administrateur système" } },
      ],
    },
    {
      title: "Virements",
      cases: [
        { id: "BAM-20", constraintId: "B5", title: "Émetteur imposé au créateur", given: "Gestionnaire A crée un virement en envoyant sender_manager_id = B", when: "POST bank-transfer", then: "sender_manager_id enregistré = A, l'envoi de B est ignoré.", expected: { customstatus: 200 } },
        { id: "BAM-21", constraintId: "B6", title: "Comptes identiques", given: "sender_account_id = recipient_account_id", when: "POST bank-transfer", then: "Refus.", expected: { customstatus: 400, message: "Le Compte bancaire emetteur et le compte bancaire destinataire ne peuvent pas être identiques." } },
        { id: "BAM-22", title: "Modifier un brouillon d'un autre émetteur", given: "Gestionnaire B, virement brouillon dont sender_manager_id = A", when: "POST bank-transfer/{id}/update", then: "Refus.", expected: { customstatus: 403, message: "Seul l'administrateur système ou l'émetteur désigné peut modifier ce virement" } },
        { id: "BAM-23", title: "Annuler un virement complété", given: "state = completed", when: "POST bank-transfer/{id}/cancel", then: "Refus : seul \"en attente\" peut être annulé.", expected: { customstatus: 400, message: "Seul un virement en attente peut être annulé" } },
        { id: "BAM-24", constraintId: "B8", title: "Approbation par un gestionnaire non désigné", given: "Compte destinataire avec deux gestionnaires C et D, recipient_manager_id = C", when: "D appelle POST bank-transfer/{id}/approve", then: "Refus : gérer le compte ne suffit pas, il faut être le destinataire précisément désigné.", expected: { customstatus: 403, message: "Seul l'administrateur système ou le destinataire désigné peut valider ce virement" } },
        { id: "BAM-25", constraintId: "B9", title: "Rejeter un virement déjà rejeté", given: "state = rejected", when: "POST bank-transfer/{id}/reject", then: "Refus : définitif, aucun retour.", expected: { customstatus: 400, message: "Seul un virement en attente peut être rejeté" } },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Parcours 4 : Comptes bancaires (administrateur système)
// ---------------------------------------------------------------------------

const bandeauAdminHtml = `
  <div style="display:inline-flex;min-width:220px;padding:.75rem 1rem;border-radius:.5rem;background:var(--color-warn-soft);color:var(--color-warn)">
    <div>
      <div style="font-size:1.35rem;font-weight:600;line-height:1">7</div>
      <div style="font-size:.75rem;margin-top:.25rem">virement(s) en attente d'approbation, tous comptes</div>
    </div>
  </div>
`;

const comptesBancaires: Parcours = {
  slug: "comptes-bancaires",
  title: "Comptes bancaires",
  group: "Comptes bancaires",
  userLine: "Administrateur système (base.group_system) uniquement : ni le rôle Gestionnaire nkezefuu, ni le Gestionnaire des comptes bancaires n'y suffisent.",
  steps: [
    {
      text: "L'administrateur ouvre \"Comptes bancaires\". `GET all-bank-accounts` renvoie tous les comptes de la coopérative avec leurs gestionnaires, et `GET bank-transfer/pending-summary` alimente un bandeau de résumé en tête de ce même écran.",
      blocks: [
        { kind: "mockup", title: "Bandeau de résumé (haut de l'écran)", html: bandeauAdminHtml },
        {
          kind: "screen",
          title: "Écran liste",
          endpointIds: ["bank-accounts-all"],
          fields: [
            { label: "Compte général", apiVariable: "bank_accounts[].general_account.account" },
            { label: "Description", apiVariable: "bank_accounts[].description" },
            { label: "Solde", apiVariable: "bank_accounts[].balance" },
            { label: "Gestionnaires", apiVariable: "bank_accounts[].managers[].name" },
          ],
        },
        {
          kind: "rules",
          rows: [
            {
              id: "A0",
              rule: "Le bandeau de l'admin n'affiche qu'un seul chiffre, sans zones \"envois\"/\"réceptions\" : il n'est presque jamais lui-même acteur désigné d'un virement.",
              field: "Bandeau",
              apiVariable: "pending_count",
              appControl: "Ne pas rendre ce chiffre touchable comme chez le gestionnaire, il n'ouvre aucune liste personnelle.",
            },
          ],
        },
      ],
    },
    {
      text: "Il touche \"Nouveau compte bancaire\" : il cherche le compte comptable (`GET bank-account/eligible-accounts`), désigne un ou plusieurs gestionnaires parmi la liste globale des éligibles (`GET bank-account/managers`), saisit la description, puis crée (`POST bank-account`).",
      blocks: [
        {
          kind: "rules",
          rows: [
            { id: "A1", field: "Compte comptable", rule: "Doit être de classe 5, actif, et pas déjà rattaché à un autre compte bancaire.", apiVariable: "account_id", appControl: "Le champ ne propose que des comptes déjà filtrés par eligible-accounts." },
            { id: "A2", field: "Gestionnaire(s)", rule: "Obligatoire, doit porter le rôle Gestionnaire des comptes bancaires.", apiVariable: "manager_id", appControl: "Le champ ne propose que des membres déjà filtrés par bank-account/managers." },
          ],
        },
      ],
    },
    {
      text: "Depuis la liste, il déplie un compte : trois actions apparaissent, une de plus que côté gestionnaire.",
      children: [
        {
          text: "\"Modifier\" : `POST bank-account/{id}/update`, mise à jour partielle des mêmes champs qu'à la création (seuls les champs envoyés changent).",
        },
        {
          text: "\"Mouvements bancaires\" : mêmes écran et appels que pour un gestionnaire (`GET bank-account/{id}/transactions`, création, modification, validation), l'admin y a toujours accès même sur un compte dont il n'est pas gestionnaire.",
          blocks: [
            {
              kind: "screen",
              title: "Mouvements bancaires",
              endpointIds: ["bank-account-transactions-list", "bank-account-transaction-create", "bank-account-transaction-update", "bank-account-transaction-validate"],
              fields: [
                { label: "Type", apiVariable: "transactions[].transaction_type" },
                { label: "Bénéficiaire", apiVariable: "transactions[].beneficiary.name" },
                { label: "Montant", apiVariable: "transactions[].amount" },
                { label: "Statut", apiVariable: "transactions[].state" },
              ],
            },
          ],
          children: [
            {
              text: "Sur une transaction réalisée, il peut en plus l'annuler, seule action réservée strictement à l'admin, même pas ouverte au créateur : `POST bank-account/transaction/{id}/cancel`.",
              blocks: [
                {
                  kind: "screen",
                  title: "Annuler une transaction",
                  endpointIds: ["bank-account-transaction-cancel"],
                  fields: [{ label: "Statut après annulation", apiVariable: "transaction.state" }],
                },
              ],
            },
          ],
        },
        {
          text: "\"Virements bancaires\" : mêmes écran et appels que pour un gestionnaire (nouveau, modification, soumission, annulation, validation, rejet).",
          blocks: [
            {
              kind: "screen",
              title: "Virements bancaires",
              endpointIds: ["bank-account-transfers-list", "bank-transfer-create", "bank-transfer-update", "bank-transfer-submit", "bank-transfer-cancel", "bank-transfer-approve", "bank-transfer-reject"],
              fields: [
                { label: "Référence", apiVariable: "transfers[].name" },
                { label: "Sens", apiVariable: "transfers[].direction" },
                { label: "Montant", apiVariable: "transfers[].amount" },
                { label: "Statut", apiVariable: "transfers[].state" },
              ],
            },
            {
              kind: "rules",
              rows: [
                {
                  id: "A3",
                  field: "Créer/modifier en tant qu'émetteur",
                  rule: "Contrairement au gestionnaire (verrouillé sur lui-même), l'admin doit désigner explicitement un gestionnaire qui gère réellement le compte émetteur choisi.",
                  apiVariable: "sender_manager_id",
                  appControl: "Champ obligatoire côté app uniquement quand l'utilisateur connecté est admin.",
                },
                {
                  id: "A4",
                  field: "Soumettre / annuler / valider / rejeter",
                  rule: "L'admin agit sur n'importe quel virement, qu'il soit ou non l'émetteur ou le destinataire désigné : seul un gestionnaire est limité à l'acteur précisément désigné.",
                  apiVariable: "can_submit / can_cancel / can_approve / can_reject",
                  appControl: "Ces booléens tiennent déjà compte du rôle admin, l'app n'a pas à le recalculer.",
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  testGroups: [
    {
      title: "Accès",
      cases: [
        { id: "BAA-01", title: "Gestionnaire des comptes bancaires seul", given: "Compte avec ce rôle, sans base.group_system", when: "GET all-bank-accounts", then: "Refus : réservé strictement à l'admin.", expected: { customstatus: 403, message: "Réservé à l'administrateur système" } },
        { id: "BAA-02", title: "Admin nominal", given: "Compte base.group_system", when: "GET all-bank-accounts", then: "Renvoie tous les comptes, avec managers.", expected: { customstatus: 200 } },
      ],
    },
    {
      title: "Comptes et transactions",
      cases: [
        { id: "BAA-10", constraintId: "A1", title: "Compte comptable déjà rattaché", given: "account_id déjà utilisé par un autre compte bancaire", when: "POST bank-account", then: "Refus.", expected: { customstatus: 400, message: "Compte comptable invalide : hors classe 5, désactivé, ou déjà rattaché à un autre compte bancaire" } },
        { id: "BAA-11", constraintId: "A2", title: "Gestionnaire non éligible", given: "manager_id contient un membre sans le rôle", when: "POST bank-account", then: "Refus.", expected: { customstatus: 400 } },
        { id: "BAA-12", title: "Annuler une transaction déjà annulée", given: "Transaction state != completed", when: "POST bank-account/transaction/{id}/cancel", then: "Refus.", expected: { customstatus: 400, message: "Seule une transaction réalisée peut être annulée" } },
      ],
    },
    {
      title: "Virements",
      cases: [
        { id: "BAA-20", constraintId: "A3", title: "Admin crée sans sender_manager_id", given: "Corps sans sender_manager_id", when: "POST bank-transfer", then: "Refus : pas de repli implicite pour l'admin comme pour un gestionnaire.", expected: { customstatus: 400 } },
        { id: "BAA-21", constraintId: "A3", title: "sender_manager_id ne gère pas le compte choisi", given: "Membre valide mais absent de manager_id du compte émetteur", when: "POST bank-transfer", then: "Refus.", expected: { customstatus: 400 } },
        { id: "BAA-22", constraintId: "A4", title: "Admin approuve un virement non destiné à lui", given: "Admin, recipient_manager_id = un gestionnaire", when: "POST bank-transfer/{id}/approve", then: "Accepté : l'admin passe outre la désignation.", expected: { customstatus: 200 } },
      ],
    },
  ],
};

export const parcoursList: Parcours[] = [mesPrets, listeDesPrets, mesComptesBancaires, comptesBancaires];

export const getParcours = (slug: string) => parcoursList.find((p) => p.slug === slug);

// Nombre d'etapes de l'arbre, sous-etapes comprises.
export const countSteps = (steps: Step[]): number =>
  steps.reduce((n, s) => n + 1 + countSteps(s.children ?? []), 0);
