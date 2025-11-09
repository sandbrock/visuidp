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

// Validation rule types for different data types
export interface StringValidationRules {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  enum?: string[];
}

export interface NumberValidationRules {
  min?: number;
  max?: number;
  integer?: boolean;
}

export interface ListValidationRules {
  minItems?: number;
  maxItems?: number;
  itemType?: 'string' | 'number' | 'boolean';
}

export type ValidationRules = StringValidationRules | NumberValidationRules | ListValidationRules | Record<string, unknown>;

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

// Type guards for validation rules
export function isStringValidationRules(rules: ValidationRules | undefined): rules is StringValidationRules {
  if (!rules) return false;
  return 'minLength' in rules || 'maxLength' in rules || 'pattern' in rules || 'enum' in rules;
}

export function isNumberValidationRules(rules: ValidationRules | undefined): rules is NumberValidationRules {
  if (!rules) return false;
  return 'min' in rules || 'max' in rules || 'integer' in rules;
}

export function isListValidationRules(rules: ValidationRules | undefined): rules is ListValidationRules {
  if (!rules) return false;
  return 'minItems' in rules || 'maxItems' in rules || 'itemType' in rules;
}
