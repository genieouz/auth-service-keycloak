export interface PermissionDefinition {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  scope?: string;
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPermissionAssignment {
  userId: string;
  permissions: string[];
  assignedAt: Date;
  assignedBy?: string;
}

export interface RolePermissionMapping {
  roleName: string;
  permissions: string[];
  updatedAt: Date;
  updatedBy?: string;
}

// Permissions système étendues
export const EXTENDED_SYSTEM_PERMISSIONS = {
  // Gestion des utilisateurs
  USERS_READ: 'users:read',
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',
  USERS_MANAGE: 'users:manage',
  USERS_IMPERSONATE: 'users:impersonate',

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

  // Administration système
  SYSTEM_CONFIG: 'system:config',
  SYSTEM_LOGS: 'system:logs',
  SYSTEM_MONITORING: 'system:monitoring',
  SYSTEM_BACKUP: 'system:backup',
  SYSTEM_MAINTENANCE: 'system:maintenance',

  // Documents
  DOCUMENTS_READ: 'documents:read',
  DOCUMENTS_READ_OWN: 'documents:read:own',
  DOCUMENTS_CREATE: 'documents:create',
  DOCUMENTS_UPDATE: 'documents:update',
  DOCUMENTS_UPDATE_OWN: 'documents:update:own',
  DOCUMENTS_DELETE: 'documents:delete',
  DOCUMENTS_DELETE_OWN: 'documents:delete:own',
  DOCUMENTS_APPROVE: 'documents:approve',
  DOCUMENTS_PUBLISH: 'documents:publish',

  // Services
  SERVICES_READ: 'services:read',
  SERVICES_CREATE: 'services:create',
  SERVICES_UPDATE: 'services:update',
  SERVICES_DELETE: 'services:delete',
  SERVICES_MANAGE: 'services:manage',
  SERVICES_CONFIGURE: 'services:configure',

  // Notifications
  NOTIFICATIONS_READ: 'notifications:read',
  NOTIFICATIONS_SEND: 'notifications:send',
  NOTIFICATIONS_MANAGE: 'notifications:manage',

  // Rapports et analytics
  REPORTS_READ: 'reports:read',
  REPORTS_CREATE: 'reports:create',
  REPORTS_EXPORT: 'reports:export',
  ANALYTICS_READ: 'analytics:read',
  ANALYTICS_MANAGE: 'analytics:manage',
} as const;

export type SystemPermission = typeof EXTENDED_SYSTEM_PERMISSIONS[keyof typeof EXTENDED_SYSTEM_PERMISSIONS];