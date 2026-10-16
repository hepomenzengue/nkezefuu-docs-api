// Types des reponses de l'API nkezefuu_recette (/api/recette/...).

export type Role = "tester" | "acceptance_admin" | "mobile_developer";

export type User = {
  id: number;
  name: string;
  login: string;
  roles: Role[];
};

export type Session = {
  token: string;
  refreshToken: string;
  user: User;
};

// Code technique et libelle francais, tel que renvoye par l'API
export type Coded = { code: string; label: string };

// ---------------------------------------------------------------------------
// Services (GET /docs/services)
// ---------------------------------------------------------------------------

export type ParamDoc = {
  name: string;
  in: "path" | "query" | "body";
  type: string;
  required: boolean;
  description: string;
  example?: string;
};

export type FieldDoc = { name: string; type: string; description: string };

export type ErrorDoc = {
  status: number;
  customstatus?: number;
  message: string;
  when: string;
};

export type SuccessExample = { label?: string; body: Record<string, unknown> };

export type Service = {
  code: string;
  category: string;
  method: "GET" | "POST";
  path: string;
  summary: string;
  access: Coded;
  envelope: "jsonrpc" | null;
  usage: string;
  notes: string[];
  params: ParamDoc[];
  request_example: string;
  success_examples: SuccessExample[];
  response_fields: FieldDoc[];
  errors: ErrorDoc[];
};

export type ServiceCategory = {
  code: string;
  name: string;
  description: string;
  services: Service[];
};

// ---------------------------------------------------------------------------
// Parcours (GET /docs/journeys, /docs/journeys/{code})
// ---------------------------------------------------------------------------

export type RuleRow = {
  id: string;
  field?: string;
  rule: string;
  apiVariable: string;
  appControl: string;
};

export type ScreenField = { label: string; apiVariable: string };

export type StepBlock =
  | { kind: "screen"; title: string; endpointIds: string[]; fields: ScreenField[]; note?: string }
  | { kind: "rules"; title?: string; rows: RuleRow[] }
  | { kind: "mockup"; title?: string; html: string };

export type JourneyStep = {
  key: string;
  number: string;
  title: string;
  text: string;
  blocks: StepBlock[];
  steps: JourneyStep[];
};

export type ApiTestCase = {
  code: string;
  constraint: string | null;
  title: string;
  given: string;
  when: string;
  then: string;
  expected: { customstatus: number; message?: string } | null;
};

export type ApiTestGroup = { title: string; cases: ApiTestCase[] };

export type JourneySummary = {
  code: string;
  name: string;
  group: string;
  audience: string;
  step_count: number;
};

export type Journey = JourneySummary & {
  steps: JourneyStep[];
  api_tests: ApiTestGroup[];
};

// ---------------------------------------------------------------------------
// Recette (GET /versions, /journeys, /journeys/{code}, /cases/{id})
// ---------------------------------------------------------------------------

export type Counters = {
  total: number;
  not_tested: number;
  passed: number;
  passed_with_reserve: number;
  failed: number;
  regression: number;
  blocked: number;
  not_implemented: number;
  postponed: number;
  awaiting_tester: number;
  awaiting_developer: number;
};

export type AcceptanceVersion = {
  id: number;
  number: string;
  type: Coded;
  state: Coded;
  opened_at: string | null;
  published_at: string | null;
  published_by: UserRef;
  blocking_count: number;
  can_publish: boolean;
};

export type AcceptanceJourney = {
  code: string;
  name: string;
  group: string;
  prefix: string;
  counters: Counters;
};

export type CasePermissions = {
  allowed_results: string[];
  allowed_fix_statuses: string[];
  can_comment: boolean;
  can_edit: boolean;
  can_archive: boolean;
  can_restore: boolean;
  can_report_regression: boolean;
};

export type UserRef = { id: number; name: string } | null;

export type Capture = { id: number; name: string; mimetype: string };

export type HistoryEntry = {
  id: number;
  iteration: number;
  type: Coded;
  status: Coded | null;
  text: string;
  author: UserRef;
  date: string | null;
  captures: Capture[];
};

export type AcceptanceCase = {
  id: number;
  reference: string;
  number: number;
  version: { id: number; number: string; state: Coded };
  journey: { code: string; name: string };
  step: { id: number; key: string; number: string | null; title: string };
  screen: string;
  user_profile: string;
  action: string;
  expected_result: string;
  active: boolean;
  origin: CaseLink | null;
  followups: CaseLink[];
  result: Coded;
  observed_result: string;
  capture_count: number;
  tested_by: UserRef;
  tested_at: string | null;
  fix_status: Coded | null;
  reply: string;
  replied_by: UserRef;
  replied_at: string | null;
  iteration: number;
  awaiting: Coded;
  permissions: CasePermissions;
  history?: HistoryEntry[];
};

// Cas lie : regression ou reprise d'un report, d'une version a l'autre.
export type CaseLink = { id: number; reference: string; version: string; kind: Coded };

export type AcceptanceStep = {
  id: number;
  key: string;
  number: string;
  title: string;
  cases: AcceptanceCase[];
};
