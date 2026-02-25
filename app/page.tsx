"use client";
import { useState } from "react";
import Head from "next/head";
import Image from "next/image";

// 1. Define all response types
type BaseResponse = {
  status?: number;
  customstatus?: number;
  error?: string;
  message?: string;
};

type AuthResponse = BaseResponse & {
  token?: string;
  user_id?: number;
  expires_in?: number;
  mobile_role?: {
    id?: number;
    code?: string;
    description?: string;
  } | null;
};

type PasswordResetResponse = BaseResponse & {
  email?: string;
  username?: string;
  remaining?: number;
  code?: string;
};

type MemberResponse = BaseResponse & {
  name?: string;
  email?: string;
  member_type?: string;
  member_type_code?: string;
  member_status?: string;
  mobile_role?: {
    id?: number;
    code?: string;
    description?: string;
  } | null;
  creation_date?: string;
  actual_balance?: number;
  amount_pending_charges?: number;
  amount_pending_recipes?: number;
  amount_actions?: number;
  investment_amounts?: {
    amount_invested?: number;
    amount_to_receive?: number;
  };
};

type TransactionResponse = BaseResponse & {
  transaction_lines?: Array<{
    formatted_date?: string;
    date?: string;
    name?: string;
    amount?: number;
    partner_name?: string;
    partner_linked_line_name?: string;
  }>;
};

type ChargesResponse = BaseResponse & {
  pending_charges?: Array<{
    id?: number;
    formatted_date?: string;
    date?: string;
    name?: string;
    amount?: number;
    can_be_manually_paid?: boolean;
    is_assurance_fees_manual_payment_readonly?: boolean;
    manual_payment?: boolean;
    is_overdue?: boolean;
    is_overdue_payment_before: boolean;
    is_overdue_payment_in_seven_days: boolean;
    is_overdue_payment_after_seven_days: boolean;
    partner_name?: string;
    partner_linked_line_name?: string;
  }>;
  manual_payment?: boolean;
};

type PaymentsResponse = BaseResponse & {
  line_id?: number;
  password?: string;
};

type EndpointResponse =
  | AuthResponse
  | PasswordResetResponse
  | MemberResponse
  | TransactionResponse
  | ChargesResponse
  | PaymentsResponse;

// 2. Define the Endpoint type
type Endpoint = {
  id: string;
  method: string;
  path: string;
  description: string;
  requestExample: string;
  responseExample: EndpointResponse | EndpointResponse[];
  category: string;
};

// 3. Define category types
type Category = {
  name: string;
  description: string;
};

type Categories = {
  authentication: Category;
  password: Category;
  member: Category;
  transactions: Category;
  charges: Category;
  recipes: Category;
  payments: Category;
  actions_investments: Category;
  actions_market: Category;
  mobile: Category;
};

export default function ApiDocumentation() {
  const [activeCategory, setActiveCategory] =
    useState<keyof Categories>("authentication");
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Categories definition
  const categories: Categories = {
    authentication: {
      name: "Authentification",
      description: "Endpoints pour la gestion des connexions et tokens",
    },
    password: {
      name: "Mot de passe",
      description: "Réinitialisation et modification de mot de passe",
    },
    member: {
      name: "Informations Membre",
      description: "Données personnelles et solde",
    },
    transactions: {
      name: "Transactions",
      description: "Historique des opérations financières",
    },
    charges: {
      name: "Charges",
      description: "Charges du membre",
    },
    recipes: {
      name: "Recettes",
      description: "Recettes du membre",
    },
    payments: {
      name: "Paiements",
      description: "Opérations de paiement",
    },
    actions_investments: {
      name: "Actions et investissements",
      description:
        "Actions et investissements du membre/en vente, Vente et achats",
    },
    actions_market: {
      name: "Marché des actions",
      description:
        "Mise en vente d'actions, Achat d'actions et d'investissements",
    },
    mobile: {
      name: "Accès Mobile",
      description: "Fonctions mobiles et rôles autorisés",
    },
  };

  // All endpoints with complete typing
  const allEndpoints: Endpoint[] = [
    // Authentication Endpoints
    {
      id: "auth-login",
      method: "POST",
      path: "/api/auth/login",
      description: "Authentifie un utilisateur et retourne un token JWT",
      requestExample: `POST /api/auth/login\nContent-Type: application/json\n\n{\n  "login": "email@exemple.com",\n  "password": "votre_mot_de_passe"\n}`,
      responseExample: [
        {
          status: 200,
          token: "eyJhbGciOi...",
          user_id: 1,
          expires_in: 900,
          mobile_role: {
            id: 2,
            code: "manager",
            description: "Responsable mobile",
          },
        } as AuthResponse,
        {
          status: 400,
          error: "Utilisateur introuvable",
        } as BaseResponse,
        {
          status: 400,
          error: "Membre introuvable",
        } as BaseResponse,
        {
          status: 401,
          error: "Mot de passe incorrect",
        } as BaseResponse,
        {
          status: 500,
          error: "Échec de la génération du token",
        } as BaseResponse,
        {
          status: 500,
          error: "Configuration role mobile indisponible",
        } as BaseResponse,
        {
          status: 403,
          error: "Role mobile introuvable",
        } as BaseResponse,
      ],
      category: "authentication",
    },
    {
      id: "auth-refresh",
      method: "POST",
      path: "/api/auth/refresh",
      description: "Rafraîchit un token JWT actif ou expiré",
      requestExample: `POST /api/auth/refresh\nContent-Type: application/json\n\n{\n  "token": "eyJhbGciOi..."\n}`,
      responseExample: [
        {
          token: "nouveau_token...",
          user_id: 1,
          expires_in: 3600,
        } as AuthResponse,
        {
          error: "Token missing",
        } as BaseResponse,
        {
          error: "Invalid token",
        } as BaseResponse,
        {
          error: "Token generation failed",
        } as BaseResponse,
      ],
      category: "authentication",
    },
    {
      id: "update-password",
      method: "POST",
      path: "/api/auth/update-password",
      description: "Met à jour le mot de passe de l'utilisateur",
      requestExample: `POST /api/auth/update-password\nAuthorization: Bearer <token>\nContent-Type: application/json\n\n{\n  "old_password": "ancien_mdp",\n  "new_password": "nouveau_mdp"\n}`,
      responseExample: [
        {
          status: 200,
          customstatus: 200,
          message: "Mot de passe mis à jour",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 401,
          error: "Authentification requise",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 401,
          error: "Token invalide ou expiré",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 400,
          error: "Les deux mots de passe sont requis",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 400,
          error: "Ancien et nouveau mot de passe identiques",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 401,
          error: "Mot de passe actuel incorrect",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 404,
          error: "Utilisateur introuvable",
        } as BaseResponse,
        {
          status: 500,
          error: "Erreur serveur",
        } as BaseResponse,
      ],
      category: "password",
    },

    // Password Reset Endpoints
    {
      id: "reset-request",
      method: "POST",
      path: "/api/auth/reset/request",
      description: "Demande de réinitialisation de mot de passe",
      requestExample: `POST /api/auth/reset/request\nContent-Type: application/json\n\n{\n  "email": "email@exemple.com"\n}`,
      responseExample: [
        {
          status: 200,
          email: "email@exemple.com",
          username: "Nom Utilisateur",
          message: "Code envoyé par email",
          remaining: 180,
        } as PasswordResetResponse,
        {
          status: 400,
          error: "Utilisateur introuvable",
        } as BaseResponse,
        {
          status: 429,
          message: "Un code a déjà été envoyé",
          remaining: 120,
          username: "Nom Utilisateur",
          email: "email@exemple.com",
        } as PasswordResetResponse,
        {
          status: 500,
          error: "Erreur lors de l'envoi du mail",
        } as BaseResponse,
      ],
      category: "password",
    },
    {
      id: "reset-verify",
      method: "POST",
      path: "/api/auth/reset/verify",
      description: "Vérifie le code de réinitialisation",
      requestExample: `POST /api/auth/reset/verify\nContent-Type: application/json\n\n{\n  "code": "123456"\n}`,
      responseExample: [
        {
          status: 200,
          code: "123456",
          email: "email@exemple.com",
          name: "Nom Utilisateur",
        } as PasswordResetResponse,
        {
          status: 400,
          error: "Utilisateur introuvable",
        } as BaseResponse,
        {
          status: 400,
          error: "Code invalide ou expiré",
        } as BaseResponse,
        {
          status: 500,
          error: "Erreur interne du serveur",
        } as BaseResponse,
      ],
      category: "password",
    },
    {
      id: "reset-confirm",
      method: "POST",
      path: "/auth/reset/confirm",
      description: "Confirme la réinitialisation du mot de passe",
      requestExample: `POST /auth/reset/confirm\nContent-Type: application/json\n\n{\n  "email": "email@exemple.com",\n  "new_password": "NouveauMDP123!",\n  "code": "123456"\n}`,
      responseExample: [
        {
          status: 200,
          message: "Mot de passe mis à jour avec succès",
        } as BaseResponse,
        {
          status: 400,
          error: "Code invalide ou expiré",
        } as BaseResponse,
        {
          status: 400,
          error: "Utilisateur introuvable",
        } as BaseResponse,
        {
          status: 500,
          error: "Erreur interne du serveur",
        } as BaseResponse,
      ],
      category: "password",
    },

    // Member Information Endpoints
    {
      id: "member-info",
      method: "GET",
      path: "/api/auth/member-info",
      description: "Récupère les informations de base du membre",
      requestExample: `GET /api/auth/member-info\nAuthorization: Bearer <token>`,
      responseExample: [
        {
          status: 200,
          customstatus: 200,
          name: "Nom du membre",
          email: "email@exemple.com",
          member_type: "Type de membre",
          member_type_code: "active_member",
          member_status: "Statut",
          mobile_role: {
            id: 2,
            code: "manager",
            description: "Responsable mobile",
          },
          creation_date: "01/01/2023",
        } as MemberResponse,
        {
          status: 200,
          customstatus: 401,
          error: "Authentification requise",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 401,
          error: "Token invalide ou expiré",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 404,
          error: "Membre introuvable",
        } as BaseResponse,
        {
          status: 500,
          customstatus: 500,
          error: "Erreur serveur",
        } as BaseResponse,
      ],
      category: "member",
    },
    {
      id: "home-member-info",
      method: "GET",
      path: "/api/auth/home-member-info",
      description: "Récupère le solde actuel du membre",
      requestExample: `GET /api/auth/home-member-info\nAuthorization: Bearer <token>`,
      responseExample: [
        {
          status: 200,
          customstatus: 200,
          name: "Nom du membre",
          actual_balance: 1500.5,
        } as MemberResponse,
        {
          status: 200,
          customstatus: 401,
          error: "Authentification requise",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 401,
          error: "Token invalide ou expiré",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 404,
          error: "Membre introuvable",
        } as BaseResponse,
        {
          status: 500,
          customstatus: 500,
          error: "Erreur serveur",
        } as BaseResponse,
      ],
      category: "member",
    },
    {
      id: "member-balances",
      method: "GET",
      path: "/api/auth/member-balances",
      description:
        "Récupère les données récentes du membre (solde, charges, recettes,actions, investissements...)",
      requestExample: `GET /api/auth/member-balances\nAuthorization: Bearer <token>`,
      responseExample: [
        {
          status: 200,
          customstatus: 200,
          actual_balance: 1500.5,
          amount_pending_charges: 200.0,
          amount_pending_recipes: 300.0,
          amount_actions: 450.0,
          investment_amounts: {
            amount_invested: 1000.0,
            amount_to_receive: 1150.0,
          },
        } as MemberResponse,
        {
          status: 200,
          customstatus: 401,
          error: "Authentification requise",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 404,
          error: "Membre introuvable",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 401,
          error: "Token invalide ou expiré",
        } as BaseResponse,
        {
          status: 500,
          customstatus: 500,
          error: "Erreur serveur",
        } as BaseResponse,
      ],
      category: "member",
    },

    // Transactions Endpoints
    {
      id: "transactions-history",
      method: "GET",
      path: "/api/auth/member-transactions-history",
      description: "Historique des transactions du membre",
      requestExample: `GET /api/auth/member-transactions-history\nAuthorization: Bearer <token>`,
      responseExample: [
        {
          status: 200,
          customstatus: 200,
          transaction_lines: [
            {
              formatted_date: "01 Jan 2023",
              date: "2023-01-01",
              name: "Libellé transaction",
              amount: 100.5,
              partner_name: "Partenaire",
              partner_linked_line_name: "",
            },
          ],
        } as TransactionResponse,
        {
          status: 200,
          customstatus: 401,
          error: "Authentification requise",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 401,
          error: "Token invalide ou expiré",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 404,
          error: "Membre introuvable",
        } as BaseResponse,

        {
          status: 500,
          customstatus: 500,
          error: "Erreur serveur",
        } as BaseResponse,
      ],
      category: "transactions",
    },

    // Charges Endpoints
    {
      id: "member-charges",
      method: "GET",
      path: "/api/auth/member-charges",
      description: "Liste des charges en attente",
      requestExample: `GET /api/auth/member-charges\nAuthorization: Bearer <token>`,
      responseExample: [
        {
          status: 200,
          customstatus: 200,
          pending_charges: [
            {
              id: 1,
              formatted_date: "01 Jan 2023",
              date: "2023-01-01",
              name: "Facture électricité",
              amount: 120.5,
              can_be_manually_paid: true,
              is_assurance_fees_manual_payment_readonly: false,
              manual_payment: true,
              is_overdue_payment_before: true,
              is_overdue_payment_in_seven_days: false,
              is_overdue_payment_after_seven_days: false,
              partner_name: "TAMO Bernard",
              partner_linked_line_name: "AMANDJA Leslie",
            },
          ],
          manual_payment: false,
        } as ChargesResponse,
        {
          status: 200,
          customstatus: 401,
          error: "Authentification requise",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 401,
          error: "Token invalide ou expiré",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 404,
          error: "Membre introuvable",
        } as BaseResponse,

        {
          status: 500,
          customstatus: 500,
          error: "Erreur serveur",
        } as BaseResponse,
      ],
      category: "charges",
    },
    {
      id: "update-payment-mode",
      method: "POST",
      path: "/api/auth/update-line-payment-mode",
      description: "Modifie le mode de paiement d'une ligne",
      requestExample: `POST /api/auth/update-line-payment-mode\nAuthorization: Bearer <token>\nContent-Type: application/json\n\n{\n  "line_id": 123\n}`,
      responseExample: [
        {
          status: 200,
          customstatus: 200,
          message: "Mode de paiement mis à jour",
        } as PaymentsResponse,
        {
          status: 200,
          customstatus: 401,
          error: "Authentification requise",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 401,
          error: "Token invalide ou expiré",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 404,
          error: "Membre introuvable",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 404,
          error: "Paiement à mettre à jour introuvable",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 400,
          error: "Paiement manuel en lecture seule",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 400,
          error: "Format JSON invalide",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 400,
          error: "Une erreur inconnue s'est produite lors de la mise à jour",
        } as BaseResponse,
      ],
      category: "charges",
    },
    {
      id: "update-all-payment-modes",
      method: "POST",
      path: "/api/auth/update-all-lines-payment-mode",
      description: "Modifie le mode de paiement pour toutes les lignes",
      requestExample: `POST /api/auth/update-all-lines-payment-mode\nAuthorization: Bearer <token>\nContent-Type: application/json\n\n{}`,
      responseExample: [
        {
          status: 200,
          customstatus: 200,
          message: "Mode de paiement mis à jour",
        } as PaymentsResponse,
        {
          status: 200,
          customstatus: 401,
          error: "Authentification requise",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 401,
          error: "Token invalide ou expiré",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 404,
          error: "Membre introuvable",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 400,
          error: "Format JSON invalide",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 400,
          error: "Une erreur inconnue s'est produite lors de la mise à jour",
        } as BaseResponse,
      ],
      category: "charges",
    },

    // Recipes Endpoints
    {
      id: "member-recipes",
      method: "GET",
      path: "/api/auth/member-recipes",
      description: "Liste des recettes en attente",
      requestExample: `GET /api/auth/member-recipes\nAuthorization: Bearer <token>`,
      responseExample: [
        {
          status: 200,
          customstatus: 200,
          pending_recipes: [
            {
              id: 1,
              formatted_date: "01 Jan 2023",
              date: "2023-01-01",
              name: "Remboursement",
              amount: 50.0,
              partner_name: "ASSONFACK ELONG Prisca",
              partner_linked_line_name: "AMANDJA Leslie",
            },
          ],
        } as ChargesResponse, // Reusing ChargesResponse as structure is similar
        {
          status: 200,
          customstatus: 401,
          error: "Authentification requise",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 401,
          error: "Token invalide ou expiré",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 404,
          error: "Membre introuvable",
        } as BaseResponse,

        {
          status: 500,
          customstatus: 500,
          error: "Erreur serveur",
        } as BaseResponse,
      ],
      category: "recipes",
    },

    // Payments Endpoints
    {
      id: "pay-line",
      method: "POST",
      path: "/api/auth/pay-line",
      description:
        "Effectue le paiement d'une charge(integration du paiement partiel en cours)",
      requestExample: `POST /api/auth/pay-line\nAuthorization: Bearer <token>\nContent-Type: application/json\n\n{\n  "line_id": 123\n}`,
      responseExample: [
        {
          status: 200,
          customstatus: 200,
          message: "Paiement effectué avec succès",
        } as PaymentsResponse,
        {
          status: 200,
          customstatus: 200,
          message: "Paiement partiel effectué avec succès",
          paid_amount: 35000,
          remaining_amount: 55000,
        } as PaymentsResponse,

        {
          status: 200,
          customstatus: 401,
          error: "Authentification requise",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 401,
          error: "Token invalide ou expiré",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 404,
          error: "Membre introuvable",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 400,
          error: "Format JSON invalide",
        } as BaseResponse,

        {
          status: 200,
          customstatus: 404,
          error: "Paiement à régler introuvable",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 400,
          error: "Solde negatif ou null",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 400,
          error: "Erreur survenue lors du paiment partiel",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 400,
          error: "Une erreur inconnue s'est produite lors du paiement",
        } as BaseResponse,
      ],
      category: "payments",
    },
    //  Actions & investments Endpoints
    {
      id: "member-actions",
      method: "GET",
      path: "/api/auth/member-actions",
      description: "Liste des Actions du membre",
      requestExample: `GET /api/auth/member-actions\nAuthorization: Bearer <token>`,
      responseExample: [
        {
          status: 200,
          customstatus: 200,
          actions: [
            {
              project_name: "Projet d'assurances",
              percentage: 0.19,
              qty: 10,
              amount: 10000.0,
              total_amount: 100000,
              for_sale: true,
              prices_list: [5000.0, 8000.0],
              qty_to_sell_max: 60,
            },
          ],
        } as ChargesResponse, // Reusing ChargesResponse as structure is similar
        {
          status: 200,
          customstatus: 401,
          error: "Authentification requise",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 401,
          error: "Token invalide ou expiré",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 404,
          error: "Membre introuvable",
        } as BaseResponse,

        {
          status: 500,
          customstatus: 500,
          error: "Erreur serveur",
        } as BaseResponse,
      ],
      category: "actions_investments",
    },
    {
      id: "member-investments",
      method: "GET",
      path: "/api/auth/member-investments",
      description: "Liste des investissements du membre",
      requestExample: `GET /api/auth/member-investments\nAuthorization: Bearer <token>`,
      responseExample: [
        {
          status: 200,
          customstatus: 200,
          investments: [
            {
              project_name: "Vente des Beignets",
              owner_parts: 5,
              unit_sale_cost: 10000.0,
              total_buy_price: 50000.0,
              total_benefit: 51000.0,
              payment_date: "2025-10-29",
            },
          ],
          already_past_investments: [
            {
              project_name: "Vente des Beignets",
              owner_parts: 5,
              unit_sale_cost: 10000.0,
              total_buy_price: 50000.0,
              total_benefit: 51000.0,
              payment_date: "2025-10-29",
            },
          ],
        } as ChargesResponse, // Reusing ChargesResponse as structure is similar
        {
          status: 200,
          customstatus: 401,
          error: "Authentification requise",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 401,
          error: "Token invalide ou expiré",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 404,
          error: "Membre introuvable",
        } as BaseResponse,

        {
          status: 500,
          customstatus: 500,
          error: "Erreur serveur",
        } as BaseResponse,
      ],
      category: "actions_investments",
    },
    //  Actions market
    {
      id: "sell-action",
      method: "POST",
      path: "/api/auth/sell-action",
      description: "Mise en vente d'une action par un membre",
      requestExample: `POST /api/auth/sell-action\nAuthorization: Bearer <token>\nContent-Type: application/json\n\n{\n  "action_id": 66,\n  "unit_sale_price": 15000,\n  "qty_to_sell": 10\n}`,
      responseExample: [
        {
          status: 200,
          customstatus: 200,
          message: "Mise en vente d'actions réalisée avec succès",
          unit_sale_price: 15000,
          qty_to_sell: 10,
        } as PaymentsResponse,
        {
          status: 200,
          customstatus: 401,
          error: "Authentification requise",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 401,
          error: "Token invalide ou expiré",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 404,
          error: "Membre introuvable",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 400,
          error: "Format JSON invalide",
        } as BaseResponse,

        {
          status: 200,
          customstatus: 400,
          error: "Action à vendre recquis",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 400,
          error: "Quantité à vendre recquise",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 400,
          error: "Quantité à vendre négative ou nulle",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 400,
          error: "Prix unitaire de vente recquis",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 400,
          error: "Prix unitaire négatif ou null",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 404,
          error: "Action à vendre introuvable",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 400,
          error: "Action déjà en vente à ce prix",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 400,
          error: "Quantité maximale à vendre dépassée",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 400,
          error: "Une erreur inconnue s'est produite lors de la mise en vente",
        } as BaseResponse,
      ],
      category: "actions_market",
    },
    {
      id: "for-sale-list",
      method: "GET",
      path: "/api/auth/for-sale-list",
      description: "Liste des Actions et investissements en vente",
      requestExample: `GET /api/auth/for-sale-list\nAuthorization: Bearer <token>`,
      responseExample: [
        {
          actual_balance: 150000.0,
          selling_list: [
            {
              selling_action_id: 40,
              is_selling_type_action: false,
              is_member_the_owner: "N/A",
              project_name: "Vente de tapioca",
              owner_name: "N/A",
              benefit_percentage: 3.0,
              investment_duration: 3,
              qty_to_sell: 5,
              qty_to_sell_max: "N/A",
              unit_sale_price: 10000.0,
              total_sale_price: 50000.0,
            },
          ],
          status: 200,
          customstatus: 200,
        } as ChargesResponse,
        {
          actual_balance: 550000.0,
          selling_list: [
            {
              selling_action_id: 52,
              is_selling_type_action: true,
              is_member_the_owner: true,
              project_name: "Projet d'assurances",
              owner_name: "YVES PREMIER LOIC",
              benefit_percentage: "N/A",
              investment_duration: "N/A",
              qty_to_sell: 5,
              qty_to_sell_max: 20,
              unit_sale_price: 10000.0,
              total_sale_price: 50000.0,
            },
          ],
          status: 200,
          customstatus: 200,
        } as ChargesResponse,
        {
          status: 200,
          customstatus: 401,
          error: "Authentification requise",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 401,
          error: "Token invalide ou expiré",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 404,
          error: "Membre introuvable",
        } as BaseResponse,

        {
          status: 500,
          customstatus: 500,
          error: "Erreur serveur",
        } as BaseResponse,
      ],
      category: "actions_market",
    },
    {
      id: "add-qty-to-sell-action",
      method: "POST",
      path: "/api/auth/add-qty-to-sell-action",
      description:
        "Mise à jour de la quantité en vente d'une action par un membre",
      requestExample: `POST /api/auth/add-qty-to-sell-action\nAuthorization: Bearer <token>\nContent-Type: application/json\n\n{\n  "selling_action_id": 66,\n  "qty_to_add": 10\n}`,
      responseExample: [
        {
          message:
            "Mise à jour de la quantité en vente d'actions réalisée avec succès",
          status: 200,
          customstatus: 200,
          qty_to_sell: 7,
        } as PaymentsResponse,
        {
          status: 200,
          customstatus: 401,
          error: "Authentification requise",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 401,
          error: "Token invalide ou expiré",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 404,
          error: "Membre introuvable",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 400,
          error: "Format JSON invalide",
        } as BaseResponse,

        {
          status: 200,
          customstatus: 400,
          error: "Action en vente recquis",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 400,
          error: "Quantité à ajouter recquise",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 400,
          error: "Quantité à ajouter négative ou nulle",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 404,
          error: "Action en vente  introuvable",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 400,
          error: "Quantité maximale à vendre dépassée",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 400,
          error: "Une erreur inconnue s'est produite lors de la mise en vente",
        } as BaseResponse,
      ],
      category: "actions_market",
    },
    {
      id: "cancel-selling-action",
      method: "POST",
      path: "/api/auth/cancel-selling-action",
      description:
        "Mise à jour de la quantité en vente d'une action par un membre",
      requestExample: `POST /api/auth/cancel-selling-action\nAuthorization: Bearer <token>\nContent-Type: application/json\n\n{\n  "selling_action_id": 66\n}`,
      responseExample: [
        {
          message: "Annulation de la vente réalisée avec succès",
          status: 200,
          customstatus: 200,
        },
        {
          status: 200,
          customstatus: 401,
          error: "Authentification requise",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 401,
          error: "Token invalide ou expiré",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 404,
          error: "Membre introuvable",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 400,
          error: "Format JSON invalide",
        } as BaseResponse,

        {
          status: 200,
          customstatus: 400,
          error: "Action en vente recquis",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 404,
          error: "Action en vente  introuvable",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 400,
          error: "Une erreur inconnue s'est produite lors de la mise en vente",
        } as BaseResponse,
      ],
      category: "actions_market",
    },
    {
      id: "reduce-qty-to-sell-action",
      method: "POST",
      path: "/api/auth/reduce-qty-to-sell-action",
      description: "Réduit la quantité d'actions actuellement en vente",
      requestExample: `POST /api/auth/reduce-qty-to-sell-action\nAuthorization: Bearer <token>\nContent-Type: application/json\n\n{\n  "selling_action_id": 66,\n  "qty_to_reduce": 2\n}`,
      responseExample: [
        {
          status: 200,
          customstatus: 200,
          message: "Réduction de la quantité en vente réalisée",
          qty_to_sell: 8,
        } as BaseResponse,
        {
          status: 200,
          customstatus: 403,
          error: "Vous n'êtes pas autorisé à modifier cette vente",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 404,
          error: "Action en vente introuvable",
        } as BaseResponse,
      ],
      category: "actions_market",
    },
    {
      id: "buy-actions-investments",
      method: "POST",
      path: "/api/auth/buy-actions-investments",
      description:
        "Achat d'actions ou de parts d'investissements par un membre",
      requestExample: `POST /api/auth/buy-actions-investments\nAuthorization: Bearer <token>\nContent-Type: application/json\n\n{ 
      "selling_action_id": 40,
      "qty_to_buy": 20}`,
      responseExample: [
        {
          message: "Achat de part d'actions réalisé avec succès",
          status: 200,
          customstatus: 200,
          project_name: "Vente des Beignets",
          qty_to_buy: 5,
        } as BaseResponse,
        {
          message: "Achat de part d'investissements réalisé avec succès",
          status: 200,
          customstatus: 200,
          project_name: "Vente des Beignets",
          qty_to_buy: 5,
        } as BaseResponse,
        {
          status: 200,
          customstatus: 401,
          error: "Authentification requise",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 401,
          error: "Token invalide ou expiré",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 404,
          error: "Membre introuvable",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 400,
          error: "Format JSON invalide",
        } as BaseResponse,

        {
          status: 200,
          customstatus: 400,
          error: "Action ou investissement  en vente recquis",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 400,
          error: "Quantité à acheter recquise",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 404,
          error: "Action ou investissement  en vente  introuvable",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 400,
          error: "Quantité à acheter  négative ou nulle",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 400,
          error: "Solde insuffisant",
        } as BaseResponse,

        {
          status: 200,
          customstatus: 400,
          error: "Nombre de parts en vente dépassé",
        } as BaseResponse,

        {
          status: 200,
          customstatus: 400,
          error: "Membre propriétaire de l'action",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 400,
          error: "Nombre d'actions en vente dépassé",
        } as BaseResponse,

        {
          status: 200,
          customstatus: 400,
          error: "Une erreur inconnue s'est produite lors de la mise en vente",
        } as BaseResponse,
      ],
      category: "actions_market",
    },
    {
      id: "mobile-functions",
      method: "GET",
      path: "/api/auth/mobile-functions",
      description: "Retourne la liste des fonctions mobiles disponibles",
      requestExample: `GET /api/auth/mobile-functions\nAuthorization: Bearer <token>`,
      responseExample: [
        {
          status: 200,
          customstatus: 200,
          mobile_functions: [
            {
              id: 1,
              code: "dashboard",
              description: "Tableau de bord",
              color_code_light: "#4f46e5",
              color_code_dark: "#312e81",
            },
          ],
        } as BaseResponse,
        {
          status: 200,
          customstatus: 401,
          error: "Token invalide ou expire",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 404,
          error: "Modeles mobile indisponibles",
        } as BaseResponse,
        {
          status: 500,
          customstatus: 500,
          error: "Erreur serveur",
        } as BaseResponse,
      ],
      category: "mobile",
    },
    {
      id: "mobile-functions-with-roles",
      method: "GET",
      path: "/api/auth/mobile-functions-with-roles",
      description: "Retourne les fonctions mobiles avec leurs rôles autorisés",
      requestExample: `GET /api/auth/mobile-functions-with-roles\nAuthorization: Bearer <token>`,
      responseExample: [
        {
          status: 200,
          customstatus: 200,
          mobile_functions: [
            {
              id: 1,
              code: "dashboard",
              description: "Tableau de bord",
              color_code_light: "#4f46e5",
              color_code_dark: "#312e81",
              allowed_roles: [
                {
                  id: 2,
                  code: "manager",
                  description: "Responsable mobile",
                },
              ],
            },
          ],
        } as BaseResponse,
        {
          status: 200,
          customstatus: 401,
          error: "Token invalide ou expire",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 404,
          error: "Modeles mobile indisponibles",
        } as BaseResponse,
        {
          status: 500,
          customstatus: 500,
          error: "Erreur serveur",
        } as BaseResponse,
      ],
      category: "mobile",
    },
    {
      id: "mobile-functions-by-user",
      method: "GET",
      path: "/api/auth/mobile-functions-by-user",
      description:
        "Retourne les fonctions mobiles du rôle de l'utilisateur connecté",
      requestExample: `GET /api/auth/mobile-functions-by-user\nAuthorization: Bearer <token>`,
      responseExample: [
        {
          status: 200,
          customstatus: 200,
          role: {
            id: 2,
            code: "manager",
            description: "Responsable mobile",
          },
          mobile_functions: [
            {
              id: 1,
              code: "dashboard",
              description: "Tableau de bord",
              color_code_light: "#4f46e5",
              color_code_dark: "#312e81",
            },
          ],
        } as BaseResponse,
        {
          status: 200,
          customstatus: 401,
          error: "Token invalide ou expire",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 404,
          error: "Modeles mobile indisponibles",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 404,
          error: "Membre introuvable",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 500,
          error: "Configuration role mobile indisponible",
        } as BaseResponse,
        {
          status: 200,
          customstatus: 404,
          error: "Role mobile introuvable",
        } as BaseResponse,
        {
          status: 500,
          customstatus: 500,
          error: "Erreur serveur",
        } as BaseResponse,
      ],
      category: "mobile",
    },
  ];
  // Filter endpoints by category and search term
  const filteredEndpoints = allEndpoints.filter(
    (ep) =>
      ep.category === activeCategory &&
      (ep.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ep.description.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const toggleEndpoint = (id: string) => {
    setExpandedEndpoint(expandedEndpoint === id ? null : id);
  };

  // Helper function to format response examples
  const formatResponse = (response: EndpointResponse) => {
    return JSON.stringify(response, null, 2);
  };

  const getUsageComment = (endpoint: Endpoint) => {
    switch (endpoint.id) {
      case "auth-login":
        return "ouvre la session mobile, verifie le compte, puis retourne le token JWT et le role mobile du membre.";
      case "auth-refresh":
        return "renouvelle un token existant en desactivant l'ancien pour prolonger la session utilisateur.";
      case "update-password":
        return "permet a l'utilisateur connecte de changer son mot de passe apres verification de l'ancien.";
      case "reset-request":
        return "demarre la procedure de mot de passe oublie en envoyant un code OTP par email.";
      case "reset-verify":
        return "valide le code OTP recu pour autoriser l'etape finale de reinitialisation.";
      case "reset-confirm":
        return "applique le nouveau mot de passe du compte a partir de l'email et du code valide.";
      case "member-info":
        return "retourne l'identite du membre, son type, son statut et son role mobile.";
      case "home-member-info":
        return "fournit les donnees d'accueil du membre avec son solde actuel.";
      case "member-balances":
        return "donne un resume financier global du membre (solde, charges, recettes, actions, investissements).";
      case "transactions-history":
        return "liste l'historique des ecritures liees au membre pour affichage des mouvements.";
      case "member-charges":
        return "retourne les charges a payer du membre avec indicateurs d'echeance et paiement manuel.";
      case "update-payment-mode":
        return "active ou desactive le mode de paiement manuel pour une charge precise.";
      case "update-all-payment-modes":
        return "bascule le mode de paiement manuel pour toutes les charges eligibles du membre.";
      case "member-recipes":
        return "retourne les recettes/entrees d'argent en attente pour le membre.";
      case "pay-line":
        return "execute le reglement d'une charge, en total ou partiel selon le solde disponible du membre.";
      case "member-actions":
        return "retourne le portefeuille d'actions du membre avec quantites, valeurs et etat de mise en vente.";
      case "member-investments":
        return "retourne les investissements en cours et deja passes avec leurs montants et dates de paiement.";
      case "sell-action":
        return "cree une offre de vente d'actions du membre avec prix unitaire et quantite.";
      case "for-sale-list":
        return "affiche le marche des actions et investissements actuellement en vente.";
      case "add-qty-to-sell-action":
        return "augmente la quantite restante d'une action deja en vente.";
      case "cancel-selling-action":
        return "annule une vente d'actions et retire l'offre du marche.";
      case "reduce-qty-to-sell-action":
        return "diminue la quantite d'actions exposee sur une vente existante.";
      case "buy-actions-investments":
        return "realise l'achat d'une offre du marche (actions ou parts d'investissement).";
      case "mobile-functions":
        return "retourne le catalogue complet des fonctionnalites mobiles disponibles dans le systeme.";
      case "mobile-functions-with-roles":
        return "retourne les fonctionnalites mobiles avec les roles autorises pour chacune.";
      case "mobile-functions-by-user":
        return "retourne le role mobile du membre connecte et les fonctionnalites qu'il peut utiliser.";
      default:
        return endpoint.description;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Documentation API NKEZEFUU</title>
        <meta name="description" content="Liste des services API NKEZEFUU" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://api-docs.nkezefuu.com" />
        <meta property="og:title" content="Documentation API NKEZEFUU" />
        <meta
          property="og:description"
          content="Liste des services API NKEZEFUU"
        />
        <meta
          property="og:image"
          content="https://api-docs.nkezefuu.com/social-preview.jpeg"
        />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://api-docs.nkezefuu.com" />
        <meta name="twitter:title" content="Documentation API NKEZEFUU" />
        <meta
          name="twitter:description"
          content="Liste des services API NKEZEFUU"
        />
        <meta
          name="twitter:image"
          content="https://api-docs.nkezefuu.com/social-preview.jpeg"
        />
      </Head>

      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            {/* Logo and title - visible on all screens */}
            <div className="flex items-center space-x-4">
              {/* Small screen logo (hidden on large screens) */}
              <div className="flex items-center justify-center h-12 w-12  rounded-lg shadow md:hidden">
                <Image
                  src="/logo.png"
                  alt="Nkezefuu Logo"
                  width={200}
                  height={200}
                  className="object-contain"
                />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">
                  Documentation API
                </h1>
                <p className="mt-1 text-sm md:text-base opacity-90">
                  Liste des endpoints(services) nkezefuu
                </p>
              </div>
            </div>

            {/* Large screen logo - hidden on small screens */}
            <div className="hidden md:flex items-center justify-center h-16 w-16 rounded-lg shadow">
              <Image
                src="/logo.png"
                alt="Nkezefuu Logo"
                width={700}
                height={700}
                className="object-contain"
              />
            </div>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        {/* Search bar */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher un endpoint..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <svg
              className="absolute right-3 top-2.5 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* Category navigation */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(Object.keys(categories) as Array<keyof Categories>).map((key) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={`px-4 py-2 rounded-md font-medium transition-all whitespace-nowrap ${
                activeCategory === key
                  ? "bg-indigo-600 text-white shadow-md"
                  : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {categories[key].name}
            </button>
          ))}
        </div>

        {/* Category description */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 rounded">
          <h2 className="text-lg font-semibold text-blue-800">
            {categories[activeCategory].name}
          </h2>
          <p className="text-blue-700">
            {categories[activeCategory].description}
          </p>
        </div>

        {/* Endpoints list */}
        <div className="space-y-4">
          {filteredEndpoints.length > 0 ? (
            filteredEndpoints.map((endpoint) => (
              <div
                key={endpoint.id}
                className="bg-white rounded-lg shadow overflow-hidden border border-gray-200 transition-all hover:shadow-md"
              >
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleEndpoint(endpoint.id)}
                >
                  <div className="flex items-center space-x-4">
                    <span
                      className={`px-3 py-1 rounded text-sm font-medium ${
                        endpoint.method === "GET"
                          ? "bg-green-100 text-green-800"
                          : endpoint.method === "POST"
                            ? "bg-blue-100 text-blue-800"
                            : endpoint.method === "PUT"
                              ? "bg-yellow-100 text-yellow-800"
                              : endpoint.method === "DELETE"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {endpoint.method}
                    </span>
                    <div>
                      <span className="font-mono text-gray-800">
                        {endpoint.path}
                      </span>
                      <p className="text-sm text-gray-500">
                        {endpoint.description}
                      </p>
                    </div>
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-500 transform transition-transform ${
                      expandedEndpoint === endpoint.id ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>

                {expandedEndpoint === endpoint.id && (
                  <div className="p-4 border-t border-gray-200 bg-gray-50 animate-fadeIn">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-medium text-gray-900 mb-2 flex items-center">
                          <svg
                            className="w-4 h-4 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                          </svg>
                          Requête
                        </h3>
                        <pre className="bg-gray-800 text-gray-100 p-4 rounded-md overflow-x-auto text-sm">
                          {endpoint.requestExample}
                        </pre>
                        <p className="mt-3 text-sm text-gray-600 italic">
                          {getUsageComment(endpoint)}
                        </p>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 mb-2 flex items-center">
                          <svg
                            className="w-4 h-4 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                            />
                          </svg>
                          Réponses
                        </h3>
                        {Array.isArray(endpoint.responseExample) ? (
                          endpoint.responseExample.map((response, index) => (
                            <div key={index} className="mb-4 last:mb-0">
                              <div className="text-sm font-medium mb-1">
                                Status: {response.status}
                                {response.customstatus &&
                                  ` (${response.customstatus})`}
                              </div>
                              <pre className="bg-gray-800 text-gray-100 p-4 rounded-md overflow-x-auto text-sm">
                                {formatResponse(response)}
                              </pre>
                            </div>
                          ))
                        ) : (
                          <pre className="bg-gray-800 text-gray-100 p-4 rounded-md overflow-x-auto text-sm">
                            {formatResponse(endpoint.responseExample)}
                          </pre>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">
                Aucun résultat trouvé
              </h3>
              <p className="mt-1 text-gray-500">Essayez avec Autrement</p>
            </div>
          )}
        </div>
      </main>
      <footer className="bg-gray-100 border-t border-gray-200 py-8 mt-12">
        <div className="container mx-auto px-4">
          {/* Logo Section */}
          <div className="bg-white p-1 rounded-lg shadow-md w-full max-w-[300px] mx-auto">
            <div className="relative w-full h-24">
              {/* Adjust height as needed */}
              <Image
                src="/social-preview.jpeg"
                alt="NKEZEFUU Logo"
                fill
                className="object-contain p-2"
                sizes="(max-width: 768px) 100vw, 300px"
              />
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center text-gray-500 text-sm">
            <p>© {new Date().getFullYear()} NKEZEFUU. Tous droits réservés</p>
          </div>
        </div>
      </footer>

      {/* Animation styles */}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
