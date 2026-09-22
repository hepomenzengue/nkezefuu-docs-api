import type { Categories, Endpoint } from "./types";
import { signupEndpoints } from "./signup";
import { authEndpoints } from "./auth";
import { memberEndpoints } from "./member";
import { loanEndpoints } from "./loans";
import { actionEndpoints } from "./actions";
import { mobileEndpoints } from "./mobile";

export type { Access, Categories, Category, CategoryKey, Endpoint, ErrorDoc, FieldDoc, ParamDoc } from "./types";

export const categories: Categories = {
  signup: {
    name: "Inscription",
    description: "Vérification d'email et création de compte membre",
  },
  authentication: {
    name: "Authentification",
    description: "Connexion et renouvellement du jeton JWT",
  },
  password: {
    name: "Mot de passe",
    description: "Réinitialisation (mot de passe oublie) et modification",
  },
  member: {
    name: "Informations Membre",
    description: "Identite, solde et gestion du compte",
  },
  transactions: {
    name: "Transactions",
    description: "Historique des opérations financieres",
  },
  charges: {
    name: "Charges à payer",
    description: "Échéances du membre, modes de paiement et suivi des dettes",
  },
  recipes: {
    name: "Recettes",
    description: "Entrées d'argent en attente",
  },
  payments: {
    name: "Paiements",
    description: "Reglement des charges et paiements avalises",
  },
  loans: {
    name: "Prêts",
    description: "Mes prêts (membre), liste des prêts (gestionnaire/admin), simulation, demande, recherche de membres et d'avalistes",
  },
  actions_investments: {
    name: "Actions et investissements",
    description: "Portefeuille du membre : actions detenues et investissements",
  },
  actions_market: {
    name: "Marché des actions",
    description: "Mise en vente, modification et annulation d'offres, achat d'actions et de parts d'investissement",
  },
  mobile: {
    name: "Accès Mobile",
    description: "Cartes du tableau de bord et roles mobiles",
  },
  referenced_members: {
    name: "Membres référencés",
    description: "Membres regroupes par référent",
  },
  project_treasury: {
    name: "Prévision Trésorerie",
    description: "Previsions de trésorerie des projets",
  },
};

export const allEndpoints: Endpoint[] = [
  ...signupEndpoints,
  ...authEndpoints,
  ...memberEndpoints,
  ...loanEndpoints,
  ...actionEndpoints,
  ...mobileEndpoints,
];
