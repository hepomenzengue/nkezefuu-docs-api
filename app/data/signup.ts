import type { Endpoint, ErrorDoc } from "./types";
import { invalidJson, serverError, statusFields } from "./common";

const smtpNotConfigured: ErrorDoc = {
  status: 200,
  customstatus: 503,
  message:
    "Le serveur d'envoi d'email n'est pas configuré. Veuillez configurer un serveur SMTP avec un FROM Filter dans Paramètres → Technique → Serveurs d'emails sortants.",
  when: "Aucun serveur d'emails sortants utilisable côté Odoo : l'inscription ne peut pas envoyer le code.",
};

export const signupEndpoints: Endpoint[] = [
  {
    id: "signup-request-code",
    method: "POST",
    path: "/api/signup/request-code",
    summary: "Envoie par email un code de vérification pour démarrer l'inscription",
    category: "signup",
    access: "public",
    envelope: "jsonrpc",
    params: [
      {
        name: "email",
        in: "body",
        type: "string",
        required: true,
        description: "Adresse email du futur membre. Normalisee (espaces retirés, minuscules) avant traitement.",
        example: "email@exemple.com",
      },
    ],
    requestExample: `POST /api/signup/request-code\nContent-Type: application/json\n\n{\n  "email": "email@exemple.com"\n}`,
    success: [
      {
        body: { status: 200, message: "Code envoyé par email", email: "email@exemple.com", remaining: 180 },
      },
      {
        label: "Code déjà envoyé récemment (status 429 dans result)",
        body: { status: 429, message: "Un code a déjà été envoyé", remaining: 120, email: "email@exemple.com" },
      },
    ],
    responseFields: [
      { name: "status", type: "number", description: "Code applicatif dans result.status : 200 envoyé, 429 un code est encore valide." },
      { name: "message", type: "string", description: "Message à afficher." },
      { name: "email", type: "string", description: "Email normalise auquel le code a été envoyé." },
      {
        name: "remaining",
        type: "number",
        description: "Secondes restantes avant de pouvoir redemander un code (et durée de validite du code envoyé).",
      },
    ],
    errors: [
      { status: 200, customstatus: 400, message: "L'email est requis", when: "email absent ou vide." },
      {
        status: 200,
        customstatus: 400,
        message: "Un compte existe déjà avec cet email",
        when: "Un utilisateur Odoo existe déjà avec ce login : passer par la connexion ou le mot de passe oublie.",
      },
      smtpNotConfigured,
      { status: 200, customstatus: 500, message: "Erreur interne du serveur", when: "Exception inattendue." },
    ],
    notes: [
      "Route Odoo type json : la réponse est enveloppée dans { jsonrpc, id, result }. Les champs ci-dessus sont dans result, il n'y a pas de customstatus.",
      "Tant que remaining > 0 après un envoi, un nouvel appel renvoie status 429 sans renvoyer d'email : afficher un compte a rebours.",
    ],
    usage: "Premier écran d'inscription : saisie de l'email.",
  },
  {
    id: "signup-verify-code",
    method: "POST",
    path: "/api/signup/verify-code",
    summary: "Valide le code reçu par email avant la création du compte",
    category: "signup",
    access: "public",
    envelope: "jsonrpc",
    params: [
      { name: "email", in: "body", type: "string", required: true, description: "Email utilise à l'étape précédente.", example: "email@exemple.com" },
      { name: "code", in: "body", type: "string", required: true, description: "Code a 6 chiffres reçu par email.", example: "123456" },
    ],
    requestExample: `POST /api/signup/verify-code\nContent-Type: application/json\n\n{\n  "email": "email@exemple.com",\n  "code": "123456"\n}`,
    success: [{ body: { status: 200, message: "Email vérifié", email: "email@exemple.com" } }],
    responseFields: [
      { name: "status", type: "number", description: "200 si le code est valide." },
      { name: "message", type: "string", description: "Message à afficher." },
      { name: "email", type: "string", description: "Email verifie, a reutiliser tel quel pour create-member." },
    ],
    errors: [
      { status: 200, customstatus: 400, message: "L'email et le code sont requis", when: "Un des deux champs manque." },
      { status: 200, customstatus: 400, message: "Code invalide", when: "Le code ne correspond pas a celui envoyé pour cet email." },
      { status: 200, customstatus: 400, message: "Code expiré", when: "Le délai de validite est dépasse : redemander un code." },
      { status: 200, customstatus: 500, message: "Erreur interne du serveur", when: "Exception inattendue." },
    ],
    notes: ["Route Odoo type json : réponse enveloppée dans result, pas de customstatus."],
    usage: "Deuxième écran d'inscription : saisie du code reçu.",
  },
  {
    id: "create-member",
    method: "POST",
    path: "/api/create-member",
    summary: "Crée la fiche membre et le compte utilisateur associe, une fois l'email vérifie",
    category: "signup",
    access: "public",
    params: [
      { name: "member_name", in: "body", type: "string", required: true, description: "Nom complet du membre.", example: "NOM PRENOM" },
      { name: "email", in: "body", type: "string", required: true, description: "Email vérifie à l'étape précédente (devient le login).", example: "membre@exemple.com" },
      { name: "password", in: "body", type: "string", required: true, description: "Mot de passe, 8 caractères minimum.", example: "MotDePasse123" },
      {
        name: "adhesion_year",
        in: "body",
        type: "number",
        required: true,
        description: "Année d'adhésion, doit être egale à l'année configuree côté Odoo. Alias acceptés : annee_adhesion, membership_year.",
        example: "2026",
      },
    ],
    requestExample: `POST /api/create-member\nContent-Type: application/json\n\n{\n  "member_name": "NOM PRENOM",\n  "email": "membre@exemple.com",\n  "password": "MotDePasse123",\n  "adhesion_year": 2026\n}`,
    success: [
      {
        body: {
          message: "Membre créé avec succès",
          member_id: 145,
          member_code: "NKZ-2026-0145",
          member_type_code: "guest",
          member_status_code: "defaulting",
          status: 200,
          customstatus: 200,
        },
      },
    ],
    responseFields: [
      { name: "message", type: "string", description: "Message à afficher." },
      { name: "member_id", type: "number", description: "Identifiant de la fiche membre créée." },
      { name: "member_code", type: "string", description: "Identifiant lisible attribue au membre." },
      {
        name: "member_type_code",
        type: "string",
        description: "Type initial du membre : guest (Invite) à l'inscription, jusqu'a régularisation par la coopérative.",
      },
      {
        name: "member_status_code",
        type: "string",
        description: "Statut initial : defaulting tant que les cotisations d'adhésion ne sont pas réglées.",
      },
      ...statusFields,
    ],
    errors: [
      invalidJson,
      { status: 200, customstatus: 400, message: "Paramètre(s) manquant(s): <liste>", when: "Un ou plusieurs champs obligatoires absents ; la liste est dans le message." },
      { status: 200, customstatus: 400, message: "L'année d'adhésion doit être un entier.", when: "adhesion_year non numérique." },
      { status: 200, customstatus: 400, message: "L'année d'adhésion configurée est invalide.", when: "Le paramètre Odoo de l'année d'adhésion est mal renseigné (erreur de configuration)." },
      {
        status: 200,
        customstatus: 400,
        message: "L'année d'adhésion ne correspond pas au paramétrage en vigueur.",
        when: "adhesion_year diffère de l'année configuree. La réponse contient expected_adhesion_year et received_adhesion_year.",
      },
      { status: 200, customstatus: 400, message: "Le mot de passe est invalide.", when: "password absent ou non textuel." },
      { status: 200, customstatus: 400, message: "Le mot de passe doit contenir au moins 8 caractères.", when: "password trop court." },
      { status: 200, customstatus: 400, message: "Email non vérifié. Vérifiez d'abord le code reçu.", when: "signup/verify-code n'a pas été valide pour cet email." },
      { status: 200, customstatus: 400, message: "Le code de vérification est expiré. Demandez un nouveau code.", when: "Trop de temps entre la vérification et la création." },
      { status: 200, customstatus: 400, message: "Le rôle mobile par défaut de l'API n'est pas configuré.", when: "Configuration Odoo : aucun role mobile par défaut pour les inscriptions." },
      { status: 200, customstatus: 400, message: "Le rôle mobile par défaut de l'API est invalide.", when: "Configuration Odoo : la valeur du paramètre n'est pas un identifiant." },
      { status: 200, customstatus: 400, message: "Le rôle mobile par défaut configuré est introuvable.", when: "Configuration Odoo : le role référence n'existe plus." },
      { status: 200, customstatus: 400, message: "Le compte utilisateur lié au membre n'a pas pu être créé.", when: "Échec de création du res.users (ex. login déjà pris)." },
      serverError,
    ],
    notes: [
      "Le membre est créé en type Invite et statut Défaillant : il ne pourra ni vendre d'actions ni obtenir de prêt tant que la coopérative ne l'a pas régularisé.",
      "Après succès, enchainer sur /api/auth/login avec l'email et le mot de passe.",
    ],
    usage: "Dernier écran d'inscription : création effective du compte.",
  },
];
