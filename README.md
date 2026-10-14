# nkezefuu-docs-api

Site `apps-docs.nkezefuu.com` : documentation de l'API mobile NKEZEFUU (Services,
Parcours) et recette de l'application.

Le site ne contient aucune donnée. Tout est lu à chaque visite dans l'API du module
Odoo `nkezefuu_recette` (dépôt `nkezefuu-management`, instance
`management.nkezefuu.com`), sous `/api/recette/...`. Chaque page demande une
connexion : sans session, l'écran de connexion remplace la page demandée.

Pour corriger un service ou un parcours, on modifie les fichiers JSON du module
(`nkezefuu_recette/data/documentation/`), puis on met le module à jour : le site
affiche la correction sans être reconstruit.

## En local

```bash
npm run dev
```

Le site choisit l'API d'après l'adresse sur laquelle il est ouvert : sur `localhost`,
il appelle l'Odoo local (`http://localhost:8169`) ; en ligne, `https://management.nkezefuu.com`.
Il n'y a rien à configurer. Pour viser exceptionnellement une autre adresse, définir
`NEXT_PUBLIC_API_URL` au lancement (`.env.local`), puis relancer le serveur.

## Organisation

| Fichier | Rôle |
|---|---|
| `app/lib/api.ts` | appels à l'API, session, renouvellement du jeton sur 401, cache des lectures |
| `app/lib/types.ts` | forme des réponses de l'API |
| `app/components/AuthGate.tsx` | écran de connexion et accès à l'utilisateur connecté |
| `app/page.tsx` | Services |
| `app/parcours/page.tsx` | liste des parcours, et un parcours avec `?code=mes-prets` |
| `app/recette/page.tsx` | tableau de bord de la recette d'une version, et la recette d'un parcours avec `?code=mes-prets`, dans la version `?version=<id>` (par défaut celle en recette) |
| `app/components/recette/` | indicateurs, recette d'un parcours, fiche d'un cas (panneau latéral), boutons de statut communs à la ligne et à la fiche |
| `app/profil/page.tsx` | Mon profil et changement de mot de passe |
| `app/lib/recette.ts` | libellés et couleurs des statuts, rôles |

Les boutons d'action d'un cas suivent les `permissions` que l'API renvoie pour le
profil connecté : le site ne recalcule pas les règles de la recette.

La version de l'application n'est jamais saisie sur le site : elle vient d'Odoo.
Une version publiée s'affiche en lecture seule ; seul le signalement d'une
régression reste possible depuis ses cas conformes.

Un parcours s'ouvre par `/parcours/?code=<code>`, et sa recette par
`/recette/?code=<code>`, et non `/parcours/<code>/` : le site est généré à l'avance et
ne connaît pas la liste des parcours, qui vient d'Odoo.

## Déploiement

Chaque push sur `master` construit le site statique (`out/`) et le copie sur le
serveur par rsync.
