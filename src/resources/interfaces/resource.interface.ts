export interface ResourceDefinition {
  id: string;
  name: string;
  description: string;
  actions: string[];
  category?: string;
  defaultScope?: string;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResourcePermissionMapping {
  resourceName: string;
  permissions: string[];
  createdAt: Date;
}

// Actions communes pour les ressources
export const COMMON_ACTIONS = {
  READ: 'read',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  MANAGE: 'manage',
  APPROVE: 'approve',
  PUBLISH: 'publish',
  ARCHIVE: 'archive',
} as const;

// Catégories de ressources prédéfinies
export const RESOURCE_CATEGORIES = {
  SYSTEM: 'system',
  BUSINESS: 'business',
  ADMINISTRATION: 'administration',
  FINANCE: 'finance',
  HR: 'hr',
  CUSTOM: 'custom',
} as const;

// Portées communes
export const COMMON_SCOPES = {
  OWN: 'own',
  ALL: 'all',
  DEPARTMENT: 'department',
  TEAM: 'team',
} as const;