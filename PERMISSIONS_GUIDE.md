# Guide des Permissions et Contrôle d'Accès

## 📋 Vue d'ensemble

Ce système implémente un contrôle d'accès basé sur les rôles (RBAC - Role-Based Access Control) pour gérer les permissions des utilisateurs sur le frontend et le backend.

## 🎭 Rôles Utilisateurs

### 1. **ADMIN (Administrateur)**
- Accès complet à toutes les fonctionnalités
- Peut gérer tous les utilisateurs
- Peut créer, modifier et supprimer projets, tâches, étapes
- Accès aux rapports et statistiques
- Badge: 🟣 Violet

### 2. **PROJECT_MANAGER (Chef de Projet)**
- Peut créer et gérer des projets
- Peut créer et assigner des tâches
- Peut gérer les étapes des projets
- Peut voir les utilisateurs (lecture seule)
- Accès aux rapports
- Badge: 🔵 Bleu

### 3. **EMPLOYEE (Employé)**
- Peut voir les projets (lecture seule)
- Peut voir et mettre à jour les tâches assignées
- Peut mettre à jour le statut des étapes
- Peut uploader des documents
- Accès aux logs d'activité
- Badge: 🟢 Vert

### 4. **VIEWER (Observateur)**
- Accès lecture seule uniquement
- Peut voir projets, tâches, étapes, documents
- Aucune permission de modification
- Badge: ⚪ Gris

## 🔐 Matrice des Permissions

| Resource | ADMIN | PROJECT_MANAGER | EMPLOYEE | VIEWER |
|----------|-------|-----------------|----------|--------|
| **Projets** |
| Créer | ✅ | ✅ | ❌ | ❌ |
| Lire | ✅ | ✅ | ✅ | ✅ |
| Modifier | ✅ | ✅ | ❌ | ❌ |
| Supprimer | ✅ | ✅ | ❌ | ❌ |
| **Tâches** |
| Créer | ✅ | ✅ | ❌ | ❌ |
| Lire | ✅ | ✅ | ✅ | ✅ |
| Modifier | ✅ | ✅ | ✅* | ❌ |
| Supprimer | ✅ | ✅ | ❌ | ❌ |
| **Étapes** |
| Créer | ✅ | ✅ | ❌ | ❌ |
| Lire | ✅ | ✅ | ✅ | ✅ |
| Modifier | ✅ | ✅ | ✅* | ❌ |
| Supprimer | ✅ | ✅ | ❌ | ❌ |
| **Utilisateurs** |
| Créer | ✅ | ❌ | ❌ | ❌ |
| Lire | ✅ | ✅ | ❌ | ❌ |
| Modifier | ✅ | ❌ | ❌ | ❌ |
| Supprimer | ✅ | ❌ | ❌ | ❌ |
| **Documents** |
| Créer | ✅ | ✅ | ✅ | ❌ |
| Lire | ✅ | ✅ | ✅ | ✅ |
| Modifier | ✅ | ✅ | ❌ | ❌ |
| Supprimer | ✅ | ✅ | ❌ | ❌ |
| **Rapports** |
| Accès | ✅ | ✅ | ❌ | ❌ |

*Les employés peuvent seulement modifier leurs propres tâches assignées et les étapes de leurs projets

## 🛣️ Routes et Accès

### Routes accessibles par rôle

| Route | ADMIN | PROJECT_MANAGER | EMPLOYEE | VIEWER |
|-------|-------|-----------------|----------|--------|
| `/dashboard` | ✅ | ✅ | ✅ | ✅ |
| `/dashboard/projects` | ✅ | ✅ | ✅ | ✅ |
| `/dashboard/tasks` | ✅ | ✅ | ✅ | ✅ |
| `/dashboard/stages` | ✅ | ✅ | ✅ | ❌ |
| `/dashboard/users` | ✅ | ✅ | ❌ | ❌ |
| `/dashboard/activity-logs` | ✅ | ✅ | ✅ | ❌ |
| `/dashboard/reports` | ✅ | ✅ | ❌ | ❌ |
| `/dashboard/settings` | ✅ | ✅ | ✅ | ✅ |

## 💻 Implémentation Frontend

### 1. Vérification des permissions

```typescript
import { hasPermission, canAccessRoute } from '@/lib/permissions';

// Vérifier si l'utilisateur peut créer un projet
const canCreate = hasPermission(user.role, 'projects', 'create');

// Vérifier si l'utilisateur peut accéder à une route
const hasAccess = canAccessRoute(user.role, '/dashboard/users');
```

### 2. Protéger une route

```tsx
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function UsersPage() {
  return (
    <ProtectedRoute requiredRole="manager">
      {/* Contenu de la page */}
    </ProtectedRoute>
  );
}
```

### 3. Affichage conditionnel dans l'UI

```tsx
import { canCreateProject } from '@/lib/permissions';

function ProjectsList() {
  const { user } = useAuth();

  return (
    <div>
      {canCreateProject(user.role) && (
        <button onClick={handleCreate}>
          Créer un projet
        </button>
      )}
    </div>
  );
}
```

### 4. Navigation dynamique

Le layout du dashboard filtre automatiquement les items de navigation selon les permissions de l'utilisateur:

```tsx
const accessibleNavItems = navItems.filter((item) =>
  canAccessRoute(user?.role, item.href)
);
```

## 🔧 Implémentation Backend

### 1. Vérification dans les routes API

```typescript
import { verifyAuth } from '@/lib/verifyAuth';
import { requirePermission } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  // Vérifier l'authentification
  const user = await verifyAuth(request);
  if (!user) {
    return corsResponse({ error: 'Unauthorized' }, request, { status: 401 });
  }

  // Vérifier les permissions
  const userRole = mapDbRoleToUserRole(user.role);
  const perm = requirePermission(userRole, 'projects', 'read');

  if (!perm.allowed) {
    return corsResponse({ error: perm.error }, request, { status: 403 });
  }

  // Logique de la route...
}
```

### 2. Vérification spécifique (manager de projet)

```typescript
import { canManageProject } from '@/lib/permissions';

// Vérifier si l'utilisateur peut gérer ce projet spécifique
if (!canManageProject(userRole, userId, project.manager_id)) {
  return corsResponse(
    { error: 'Vous ne pouvez gérer que vos propres projets' },
    request,
    { status: 403 }
  );
}
```

## 🎨 Composants UI

### Badge de rôle

```tsx
import { getRoleLabel, getRoleBadgeClass } from '@/lib/permissions';

function UserCard({ user }) {
  return (
    <span className={getRoleBadgeClass(user.role)}>
      {getRoleLabel(user.role)}
    </span>
  );
}
```

## 🔄 Workflow d'authentification et permissions

```
1. Utilisateur se connecte
   ↓
2. Backend génère JWT avec user.role
   ↓
3. Token et user stockés dans localStorage
   ↓
4. Chaque requête API envoie le token dans Authorization header
   ↓
5. Backend vérifie le token et les permissions
   ↓
6. Frontend vérifie les permissions pour l'UI
   ↓
7. Navigation filtrée selon le rôle
```

## 📝 Exemples d'utilisation

### Exemple 1: Page accessible seulement aux admins

```tsx
'use client';

import { useAuth } from '@/hooks/useAuth';
import { isAdmin } from '@/lib/permissions';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !isAdmin(user.role)) {
      router.push('/dashboard');
    }
  }, [user, router]);

  if (!user || !isAdmin(user.role)) {
    return null;
  }

  return <div>Contenu admin</div>;
}
```

### Exemple 2: Bouton conditionnel

```tsx
import { canDelete } from '@/lib/permissions';

function ProjectCard({ project, user }) {
  return (
    <div>
      <h3>{project.title}</h3>

      {canDelete(user.role, 'projects') && (
        <button onClick={() => handleDelete(project.id)}>
          Supprimer
        </button>
      )}
    </div>
  );
}
```

### Exemple 3: Modifier ses propres tâches seulement

```tsx
import { canEditTask } from '@/lib/permissions';

function TaskItem({ task, user }) {
  const canEdit = canEditTask(
    user.role,
    user.id,
    task.assigned_to_id,
    task.project.manager_id
  );

  return (
    <div>
      <h4>{task.title}</h4>

      {canEdit && (
        <button onClick={handleEdit}>Modifier</button>
      )}
    </div>
  );
}
```

## 🚨 Erreurs communes

### 1. Permission denied (403)
```json
{
  "error": "Permission denied: user cannot delete projects"
}
```
**Solution:** Vérifier que l'utilisateur a le bon rôle

### 2. Unauthorized (401)
```json
{
  "error": "Unauthorized"
}
```
**Solution:** Vérifier que le token JWT est valide et présent dans le header

### 3. Route bloquée
L'utilisateur est redirigé vers /dashboard
**Solution:** Vérifier que la route est dans `routeAccessList` avec le bon rôle

## 🔒 Sécurité

### Bonnes pratiques

1. **Vérifier les permissions côté backend ET frontend**
   - Frontend: Pour l'UX
   - Backend: Pour la sécurité

2. **Ne jamais faire confiance au client**
   - Toujours valider les permissions sur le serveur

3. **Utiliser le principe du moindre privilège**
   - Donner le minimum de permissions nécessaires

4. **Logs d'activité**
   - Toutes les actions sont enregistrées dans `activity_logs`

5. **Tokens JWT**
   - Expiration après 30 jours
   - Vérification à chaque requête

## 📚 Fichiers importants

### Frontend
- `lib/permissions.ts` - Définitions des permissions
- `components/ProtectedRoute.tsx` - Composant de protection des routes
- `hooks/useAuth.ts` - Hook d'authentification
- `app/dashboard/layout.tsx` - Layout avec navigation filtrée

### Backend
- `lib/permissions.ts` - Système RBAC
- `lib/verifyAuth.ts` - Vérification JWT
- `app/api/auth/login/route.ts` - Génération du token
- Toutes les routes API - Vérification des permissions

## 🛠️ Maintenance

### Ajouter un nouveau rôle

1. **Backend** (`api-backend/lib/permissions.ts`):
```typescript
// Ajouter le rôle
export type UserRole = 'admin' | 'manager' | 'user' | 'NOUVEAU_ROLE';

// Définir ses permissions
const rolePermissions: Record<UserRole, Permission[]> = {
  // ...
  NOUVEAU_ROLE: [
    { resource: 'projects', action: 'read' },
    // ...
  ],
};
```

2. **Frontend** (`web-frontend/lib/permissions.ts`):
```typescript
// Ajouter le mapper
export function mapRole(dbRole: string): UserRole {
  switch (normalized) {
    case 'NOUVEAU_ROLE':
      return 'nouveau';
    // ...
  }
}

// Ajouter aux routes
const routeAccessList: RouteAccess[] = [
  { path: '/dashboard', allowedRoles: ['admin', 'manager', 'user', 'nouveau'] },
  // ...
];
```

### Ajouter une nouvelle route protégée

Dans `web-frontend/lib/permissions.ts`:

```typescript
const routeAccessList: RouteAccess[] = [
  // ...
  {
    path: '/dashboard/nouvelle-page',
    allowedRoles: ['admin', 'manager'], // Rôles autorisés
  },
];
```

## 📞 Support

Pour toute question sur les permissions:
1. Vérifier ce guide
2. Consulter les fichiers de permissions
3. Vérifier les logs d'erreur

---

**Version:** 1.0
**Dernière mise à jour:** 2025-01-17
