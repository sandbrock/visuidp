// Admin-related TypeScript interfaces matching the backend API

export interface CloudProvider {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CloudProviderCreate {
  name: string;
  displayName: string;
  description?: string;
  enabled?: boolean;
}

export interface CloudProviderUpdate {
  name?: string;
  displayName?: string;
  description?: string;
  enabled?: boolean;
}

export type ResourceCategory = 'SHARED' | 'NON_SHARED' | 'BOTH';

export interface ResourceType {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  category: ResourceCategory;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceTypeCreate {
  name: string;
  displayName: string;
  description?: string;
  category: ResourceCategory;
  enabled?: boolean;
}

export interface ResourceTypeUpdate {
  name?: string;
  displayName?: string;
  description?: string;
  category?: ResourceCategory;
  enabled?: boolean;
}

export type ModuleLocationType = 'GIT' | 'FILE_SYSTEM' | 'REGISTRY';

export interface ResourceTypeCloudMapping {
  id: string;
  resourceTypeId: string;
  resourceTypeName: string;
  cloudProviderId: string;
  cloudProviderName: string;
  terraformModuleLocation: string;
  moduleLocationType: ModuleLocationType;
  enabled: boolean;
  isComplete: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceTypeCloudMappingCreate {
  resourceTypeId: string;
  cloudProviderId: string;
  terraformModuleLocation: string;
  moduleLocationType: ModuleLocationType;
  enabled: boolean;
}

export interface ResourceTypeCloudMappingUpdate {
  terraformModuleLocation?: string;
  moduleLocationType?: ModuleLocationType;
  enabled?: boolean;
}

export type PropertyDataType = 'STRING' | 'NUMBER' | 'BOOLEAN' | 'LIST';

// Validation rules interface matching backend DTO structure
export interface ValidationRules {
  min?: number;
  max?: number;
  pattern?: string;
  allowedValues?: Array<{ value: string; label: string }>;
  minLength?: number;
  maxLength?: number;
}

// Property schema interface matching backend DTO structure
export interface PropertySchema {
  id: string;
  mappingId: string;
  propertyName: string;
  displayName: string;
  description?: string;
  dataType: PropertyDataType;
  required: boolean;
  defaultValue?: unknown;
  validationRules?: ValidationRules;
  displayOrder?: number;
}

// API response interface for property schema endpoints
export interface PropertySchemaResponse {
  resourceTypeId: string;
  resourceTypeName: string;
  cloudProviderId: string;
  cloudProviderName: string;
  properties: PropertySchema[];
}

export interface PropertySchemaCreate {
  mappingId: string;
  propertyName: string;
  displayName: string;
  description?: string;
  dataType: PropertyDataType;
  required: boolean;
  defaultValue?: unknown;
  validationRules?: ValidationRules;
  displayOrder?: number;
}

export interface PropertySchemaUpdate {
  propertyName?: string;
  displayName?: string;
  description?: string;
  dataType?: PropertyDataType;
  required?: boolean;
  defaultValue?: unknown;
  validationRules?: ValidationRules;
  displayOrder?: number;
}

export interface AdminDashboard {
  cloudProviders: CloudProvider[];
  resourceTypes: ResourceType[];
  mappings: ResourceTypeCloudMapping[];
  statistics: Record<string, number>;
}

export interface AdminAuditLog {
  id: string;
  userEmail: string;
  action: string;
  entityType: string;
  entityId?: string;
  changes?: Record<string, unknown>;
  timestamp: string;
}

// Helper types for API responses
export interface PropertySchemaMap {
  [propertyName: string]: PropertySchema;
}

// Display name mappings
export const ResourceCategoryDisplayNames: Record<ResourceCategory, string> = {
  SHARED: 'Shared (Blueprints)',
  NON_SHARED: 'Non-Shared (Stacks)',
  BOTH: 'Both'
};

export const PropertyDataTypeDisplayNames: Record<PropertyDataType, string> = {
  STRING: 'Text',
  NUMBER: 'Number',
  BOOLEAN: 'Boolean',
  LIST: 'List'
};

export const ModuleLocationTypeDisplayNames: Record<ModuleLocationType, string> = {
  GIT: 'Git Repository',
  FILE_SYSTEM: 'File System',
  REGISTRY: 'Terraform Registry'
};

// Helper functions
export function getResourceCategoryDisplayName(category: ResourceCategory): string {
  return ResourceCategoryDisplayNames[category];
}

export function getPropertyDataTypeDisplayName(dataType: PropertyDataType): string {
  return PropertyDataTypeDisplayNames[dataType];
}

export function getModuleLocationTypeDisplayName(locationType: ModuleLocationType): string {
  return ModuleLocationTypeDisplayNames[locationType];
}

// Helper function to check if validation rules contain allowed values (for LIST types)
export function hasAllowedValues(rules: ValidationRules | undefined): boolean {
  return !!(rules && rules.allowedValues && rules.allowedValues.length > 0);
}
