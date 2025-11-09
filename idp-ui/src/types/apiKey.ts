// API Key related TypeScript interfaces matching the backend API

export type ApiKeyType = 'USER' | 'SYSTEM';

export type ApiKeyStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'REVOKED';

export interface ApiKeyResponse {
  id: string;
  keyName: string;
  keyPrefix: string;
  keyType: ApiKeyType;
  userEmail?: string;
  createdByEmail: string;
  createdAt: string;
  expiresAt?: string;
  lastUsedAt?: string;
  isActive: boolean;
  isExpiringSoon: boolean;
  status: ApiKeyStatus;
}

export interface ApiKeyCreated extends ApiKeyResponse {
  apiKey: string; // Only included on creation/rotation
}

export interface ApiKeyCreate {
  keyName: string;
  expirationDays?: number;
  keyType?: ApiKeyType;
}

export interface ApiKeyAuditLog {
  id: string;
  userEmail: string;
  action: string;
  timestamp: string;
  keyPrefix: string;
  sourceIp?: string;
}

// Display name mappings
export const ApiKeyTypeDisplayNames: Record<ApiKeyType, string> = {
  USER: 'User',
  SYSTEM: 'System'
};

export const ApiKeyStatusDisplayNames: Record<ApiKeyStatus, string> = {
  ACTIVE: 'Active',
  EXPIRING_SOON: 'Expiring Soon',
  EXPIRED: 'Expired',
  REVOKED: 'Revoked'
};

// Helper functions
export function getApiKeyTypeDisplayName(type: ApiKeyType): string {
  return ApiKeyTypeDisplayNames[type];
}

export function getApiKeyStatusDisplayName(status: ApiKeyStatus): string {
  return ApiKeyStatusDisplayNames[status];
}

export function getApiKeyStatusClass(status: ApiKeyStatus): string {
  return status.toLowerCase().replace('_', '-');
}
