// Stack-related TypeScript interfaces matching the backend API

export const StackType = {
  INFRASTRUCTURE: 'INFRASTRUCTURE',
  RESTFUL_SERVERLESS: 'RESTFUL_SERVERLESS',
  RESTFUL_API: 'RESTFUL_API',
  JAVASCRIPT_WEB_APPLICATION: 'JAVASCRIPT_WEB_APPLICATION',
  EVENT_DRIVEN_SERVERLESS: 'EVENT_DRIVEN_SERVERLESS',
  EVENT_DRIVEN_API: 'EVENT_DRIVEN_API'
} as const;
export type StackType = typeof StackType[keyof typeof StackType];

// Environment has been removed from Stack properties

export const ProgrammingLanguage = {
  QUARKUS: 'QUARKUS',
  NODE_JS: 'NODE_JS',
  REACT: 'REACT'
} as const;
export type ProgrammingLanguage = typeof ProgrammingLanguage[keyof typeof ProgrammingLanguage];

// Display names for enums
export const StackTypeDisplayNames: Record<StackType, string> = {
  [StackType.INFRASTRUCTURE]: 'Infrastructure',
  [StackType.RESTFUL_SERVERLESS]: 'RESTful Serverless',
  [StackType.RESTFUL_API]: 'RESTful API',
  [StackType.JAVASCRIPT_WEB_APPLICATION]: 'JavaScript Web Application',
  [StackType.EVENT_DRIVEN_SERVERLESS]: 'Event-driven Serverless',
  [StackType.EVENT_DRIVEN_API]: 'Event-driven API'
};

// No environment display names as stacks do not have environments

export const ProgrammingLanguageDisplayNames: Record<ProgrammingLanguage, string> = {
  [ProgrammingLanguage.QUARKUS]: 'Java',
  [ProgrammingLanguage.NODE_JS]: 'Node.js',
  [ProgrammingLanguage.REACT]: 'React'
};;

// Stack interfaces matching backend DTOs
export interface Stack {
  id: string;
  name: string;
  cloudName: string;
  routePath: string;
  description?: string;
  repositoryURL?: string;
  stackType: StackType;
  programmingLanguage?: ProgrammingLanguage;
  frameworkVersion?: string;
  isPublic?: boolean;
  createdBy: string;
  teamId?: string | null;
  stackCollectionId?: string | null;
  domainId?: string | null;
  categoryId?: string | null;
  cloudProviderId?: string | null;
  resources?: StackResource[];
  configuration?: Record<string, unknown>;
  ephemeralPrefix?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StackResource {
  id?: string;
  name: string;
  resourceTypeId: string;
  resourceTypeName?: string;
  cloudProviderId: string;
  configuration: Record<string, unknown>;
}

export interface StackCreate {
  name: string;
  cloudName: string;
  routePath: string;
  description?: string;
  repositoryURL?: string;
  stackType: StackType;
  programmingLanguage?: ProgrammingLanguage;
  frameworkVersion?: string;
  isPublic?: boolean;
  // Optional associations
  teamId?: string | null;
  stackCollectionId?: string | null;
  domainId?: string | null;
  categoryId?: string | null;
  cloudProviderId?: string | null;
  resources?: Omit<StackResource, 'id'>[];
  configuration?: Record<string, unknown>;
  ephemeralPrefix?: string;
}

// Helper functions
export function getStackTypeDisplayName(stackType: StackType): string {
  return StackTypeDisplayNames[stackType];
}

// Environment helpers removed

export function getProgrammingLanguageDisplayName(language: ProgrammingLanguage): string {
  return ProgrammingLanguageDisplayNames[language];
}

// Get supported programming languages for a stack type
export function getSupportedLanguages(stackType: StackType): ProgrammingLanguage[] {
  switch (stackType) {
    case StackType.INFRASTRUCTURE:
      return [];
    case StackType.JAVASCRIPT_WEB_APPLICATION:
      return [ProgrammingLanguage.NODE_JS];
    case StackType.RESTFUL_SERVERLESS:
    case StackType.RESTFUL_API:
    case StackType.EVENT_DRIVEN_SERVERLESS:
    case StackType.EVENT_DRIVEN_API:
      return [ProgrammingLanguage.QUARKUS, ProgrammingLanguage.NODE_JS];
    default:
      return [];
  }
}

// Get default programming language for a stack type
export function getDefaultLanguage(stackType: StackType): ProgrammingLanguage | null {
  switch (stackType) {
    case StackType.INFRASTRUCTURE:
      return null;
    case StackType.JAVASCRIPT_WEB_APPLICATION:
      return ProgrammingLanguage.REACT;
    case StackType.RESTFUL_SERVERLESS:
    case StackType.RESTFUL_API:
    case StackType.EVENT_DRIVEN_SERVERLESS:
    case StackType.EVENT_DRIVEN_API:
      return ProgrammingLanguage.QUARKUS;
    default:
      return null;
  }
}

export function getSupportedFrameworkVersions(programmingLanguage: ProgrammingLanguage | undefined): string[] {
  if (!programmingLanguage) return [];
  
  switch (programmingLanguage) {
    case ProgrammingLanguage.QUARKUS:
      return ['21'];
    case ProgrammingLanguage.NODE_JS:
      return ['22'];
    case ProgrammingLanguage.REACT:
      return ['22']; // React runs on Node.js
    default:
      return [];
  }
}

export function getDefaultFrameworkVersion(programmingLanguage: ProgrammingLanguage | undefined): string | null {
  const versions = getSupportedFrameworkVersions(programmingLanguage);
  return versions.length > 0 ? versions[0] : null;
}
