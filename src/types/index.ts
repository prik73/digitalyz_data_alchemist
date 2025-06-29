export interface Client {
  ClientID: string;
  ClientName: string;
  PriorityLevel: number; // 1-5
  RequestedTaskIDs: string; // comma-separated
  GroupTag?: string;
  AttributesJSON?: string;
}

export interface Worker {
  WorkerID: string;
  WorkerName: string;
  Skills: string; // comma-separated
  AvailableSlots: string; // JSON array like "[1,2,3]"
  MaxLoadPerPhase: number;
  WorkerGroup?: string;
  QualificationLevel?: number;
}

export interface Task {
  TaskID: string;
  TaskName: string;
  Category?: string;
  Duration: number; // >= 1
  RequiredSkills: string; // comma-separated
  PreferredPhases?: string; // range like "1-3" or array like "[1,2,3]"
  MaxConcurrent?: number;
}

export interface ValidationResult {
  type: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  entityType: 'clients' | 'workers' | 'tasks';
  entityId?: string;
  field?: string;
  suggestion?: string;
}

export interface BusinessRule {
  id: string;
  type: 'coRun' | 'slotRestriction' | 'loadLimit' | 'phaseWindow' | 'patternMatch' | 'precedence';
  name: string;
  description: string;
  parameters: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
}

export interface SearchResult {
  entityType: 'clients' | 'workers' | 'tasks';
  entityId: string;
  entityData: any;
  matchReason: string;
  relevanceScore: number;
}

export interface PriorityWeights {
  priorityLevel: number;
  skillMatching: number;
  workloadBalance: number;
  deadlineAdherence: number;
  costOptimization: number;
  clientSatisfaction: number;
  resourceUtilization: number;
  qualityScore: number;
}

export interface DataState {
  clients: any[];
  workers: any[];
  tasks: any[];
  validationResults: ValidationResult[];
  businessRules: BusinessRule[];
  searchResults: SearchResult[];
  priorityWeights: PriorityWeights;
  filteredView: boolean;
  isValidating: boolean;
}

export interface ExportConfig {
  includeCleanedData: boolean;
  includeRules: boolean;
  includeWeights: boolean;
  includeValidationReport: boolean;
  format: 'csv' | 'xlsx' | 'json';
  packageType: 'zip' | 'individual';
}