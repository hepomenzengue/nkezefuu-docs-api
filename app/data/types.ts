// Types partages par la documentation API NKEZEFUU.
// Chaque endpoint est decrit de facon structuree (parametres, champs de reponse,
// erreurs, regles metier) plutot que par de simples exemples JSON.

export type CategoryKey =
  | "signup"
  | "authentication"
  | "password"
  | "member"
  | "transactions"
  | "charges"
  | "recipes"
  | "payments"
  | "loans"
  | "actions_investments"
  | "actions_market"
  | "mobile"
  | "referenced_members"
  | "project_treasury"
  | "bank_accounts";

// Qui peut appeler l'endpoint.
// public              : aucun jeton
// member              : tout membre authentifie (jeton Bearer)
// manager             : Gestionnaire nkezefuu ou Administrateur uniquement
// all                 : tout membre, avec un comportement qui depend du role
// admin               : administrateur systeme (base.group_system) uniquement.
//                        Reserve aux comptes bancaires : ni le role Gestionnaire nkezefuu
//                        ni le role Gestionnaire des comptes bancaires n'y suffisent.
// bank_account_manager: administrateur systeme, ou Gestionnaire des comptes bancaires
//                        (role distinct du Gestionnaire nkezefuu, qui n'a lui aucun acces
//                        a ce perimetre). Les nuances plus fines (compte precis gere,
//                        emetteur/destinataire designe, createur...) sont dans "notes".
export type Access = "public" | "member" | "manager" | "all" | "admin" | "bank_account_manager";

export type ParamIn = "path" | "query" | "body";

export type ParamDoc = {
  name: string;
  in: ParamIn;
  type: string;
  required: boolean;
  description: string;
  example?: string;
};

export type FieldDoc = {
  // Notation pointee pour l'imbrique : loan.repayment_schedule[].capital
  name: string;
  type: string;
  description: string;
};

export type ErrorDoc = {
  // Code HTTP reel de la reponse
  status: number;
  // Code applicatif renvoye dans le corps (absent sur les vieux endpoints JSON-RPC)
  customstatus?: number;
  message: string;
  // Dans quelle situation cette erreur est renvoyee
  when: string;
};

export type SuccessExample = {
  label?: string;
  body: Record<string, unknown>;
};

export type Endpoint = {
  id: string;
  method: "GET" | "POST";
  path: string;
  summary: string;
  category: CategoryKey;
  access: Access;
  // "jsonrpc" : route Odoo type='json', la reponse est enveloppee dans { jsonrpc, id, result }
  envelope?: "jsonrpc";
  params: ParamDoc[];
  requestExample: string;
  success: SuccessExample[];
  responseFields: FieldDoc[];
  errors: ErrorDoc[];
  // Regles metier a connaitre cote mobile
  notes?: string[];
  // Quand et pourquoi l'appeler dans le parcours utilisateur
  usage?: string;
};



export type Category = {
  name: string;
  description: string;
};

export type Categories = Record<CategoryKey, Category>;
