export interface RoleDefinition {
  id?: string;
  name: string;
  description: string;
  permissions: string[];
  composite?: boolean;
  childRoles?: string[];
  attributes?: { [key: string]: string };
  containerId?: string;
  clientRole?: boolean;
}

export interface Permission {
  resource: string;
  action: string;
  scope?: string;
}

export interface UserRoleAssignment {
  userId: string;
  roles: string[];
  effectivePermissions: string[];
  assignedAt: Date;
  assignedBy?: string;
}

export interface RoleHierarchy {
  role: string;
  parent?: string;
  children: string[];
  level: number;
}

// Permissions prédéfinies du système
export const SYSTEM_PERMISSIONS = {
  // Gestion des utilisateurs
  USERS_READ: 'users:read',
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',
  USERS_MANAGE: 'users:manage',

  // Gestion des rôles
  ROLES_READ: 'roles:read',
  ROLES_CREATE: 'roles:create',
  ROLES_UPDATE: 'roles:update',
  ROLES_DELETE: 'roles:delete',
  ROLES_ASSIGN: 'roles:assign',

  // Gestion des permissions
  PERMISSIONS_READ: 'permissions:read',
  PERMISSIONS_CREATE: 'permissions:create',
  PERMISSIONS_UPDATE: 'permissions:update',
  PERMISSIONS_DELETE: 'permissions:delete',
  PERMISSIONS_ASSIGN: 'permissions:assign',
  PERMISSIONS_MANAGE: 'permissions:manage',

  // Administration système
  SYSTEM_CONFIG: 'system:config',
  SYSTEM_LOGS: 'system:logs',
  SYSTEM_MONITORING: 'system:monitoring',

  // Documents (exemple d'extension)
  DOCUMENTS_READ: 'documents:read',
  DOCUMENTS_CREATE: 'documents:create',
  DOCUMENTS_UPDATE: 'documents:update',
  DOCUMENTS_DELETE: 'documents:delete',
  DOCUMENTS_APPROVE: 'documents:approve',

  // Services (exemple d'extension)
  SERVICES_READ: 'services:read',
  SERVICES_MANAGE: 'services:manage',
} as const;

// Rôles prédéfinis du système
export const SYSTEM_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  USER: 'user',
  GUEST: 'guest',
} as const;