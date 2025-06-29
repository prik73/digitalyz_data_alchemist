// lib/validation/validationEngine.ts
import type { ValidationResult, BusinessRule } from '@/types';

export class ValidationEngine {
  private validationResults: ValidationResult[] = [];

  validateData(
    data: { clients?: any[], workers?: any[], tasks?: any[] }, 
    rules: BusinessRule[] = []
  ): ValidationResult[] {
    this.validationResults = [];

    // Basic data validations
    if (data.clients) {
      this.validateRequiredColumns(data.clients, 'clients');
      this.validateUniqueIds(data.clients, 'clients');
      this.validatePriorityLevels(data.clients);
      this.validateAttributesJSON(data.clients);
    }

    if (data.workers) {
      this.validateRequiredColumns(data.workers, 'workers');
      this.validateUniqueIds(data.workers, 'workers');
      this.validateAvailableSlots(data.workers);
      this.validateOverloadedWorkers(data.workers);
    }

    if (data.tasks) {
      this.validateRequiredColumns(data.tasks, 'tasks');
      this.validateUniqueIds(data.tasks, 'tasks');
      this.validateTaskDuration(data.tasks);
    }

    // Cross-entity validations
    if (data.clients && data.tasks) {
      this.validateTaskReferences(data.clients, data.tasks);
    }

    if (data.workers && data.tasks) {
      this.validateSkillCoverage(data.workers, data.tasks);
      this.validateMaxConcurrency(data.workers, data.tasks);
      this.validatePhaseSlotSaturation(data.workers, data.tasks);
    }

    // Rule-based validations
    this.validateCircularCoRunGroups(rules);
    this.validateRuleConflicts(rules, data.tasks || []);

    return this.validationResults;
  }

  private addValidationResult(result: Omit<ValidationResult, 'id'>) {
    this.validationResults.push(result);
  }

  // Validation 1: Missing required columns
  private validateRequiredColumns(entities: any[], entityType: 'clients' | 'workers' | 'tasks') {
    if (!entities || entities.length === 0) return;

    const requiredColumns: Record<string, string[]> = {
      clients: ['ClientID', 'ClientName', 'PriorityLevel', 'RequestedTaskIDs'],
      workers: ['WorkerID', 'WorkerName', 'Skills', 'AvailableSlots', 'MaxLoadPerPhase'],
      tasks: ['TaskID', 'TaskName', 'Duration', 'RequiredSkills']
    };

    const required = requiredColumns[entityType];
    const actualColumns = Object.keys(entities[0] || {});
    const missing = required.filter(col => !actualColumns.includes(col));

    if (missing.length > 0) {
      this.addValidationResult({
        type: 'missing_columns',
        severity: 'error',
        message: `Missing required columns: ${missing.join(', ')}`,
        entityType,
        suggestion: `Add the missing columns to your ${entityType} data`
      });
    }
  }

  // Validation 2: Duplicate IDs
  private validateUniqueIds(entities: any[], entityType: 'clients' | 'workers' | 'tasks') {
    if (!entities || entities.length === 0) return;

    const idField = `${entityType.slice(0, -1).charAt(0).toUpperCase() + entityType.slice(1, -1)}ID`;
    const ids = entities.map(entity => entity[idField]).filter(Boolean);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);

    if (duplicates.length > 0) {
      const uniqueDuplicates = [...new Set(duplicates)];
      uniqueDuplicates.forEach(dupId => {
        this.addValidationResult({
          type: 'duplicate_id',
          severity: 'error',
          message: `Duplicate ID found: ${dupId}`,
          entityType,
          entityId: dupId,
          suggestion: 'Ensure all IDs are unique'
        });
      });
    }
  }

  // Validation 3: Priority level range (1-5)
  private validatePriorityLevels(clients: any[]) {
    if (!clients) return;

    clients.forEach(client => {
      const priority = client.PriorityLevel;
      if (priority && (priority < 1 || priority > 5)) {
        this.addValidationResult({
          type: 'invalid_priority',
          severity: 'error',
          message: `Priority level must be between 1-5, found: ${priority}`,
          entityType: 'clients',
          entityId: client.ClientID,
          field: 'PriorityLevel',
          suggestion: 'Set priority level to a value between 1 and 5'
        });
      }
    });
  }

  // Validation 4: Malformed JSON in AttributesJSON
  private validateAttributesJSON(clients: any[]) {
    if (!clients) return;

    clients.forEach(client => {
      const attrs = client.AttributesJSON;
      if (attrs && typeof attrs === 'string') {
        if (attrs.trim().startsWith('{') || attrs.trim().startsWith('[')) {
          try {
            JSON.parse(attrs);
          } catch (e) {
            this.addValidationResult({
              type: 'invalid_json',
              severity: 'error',
              message: 'Invalid JSON format in AttributesJSON',
              entityType: 'clients',
              entityId: client.ClientID,
              field: 'AttributesJSON',
              suggestion: 'Fix JSON syntax or convert to valid JSON format'
            });
          }
        } else {
          this.addValidationResult({
            type: 'non_json_attributes',
            severity: 'warning',
            message: 'AttributesJSON contains text instead of JSON',
            entityType: 'clients',
            entityId: client.ClientID,
            field: 'AttributesJSON',
            suggestion: 'Consider converting to JSON format for better structure'
          });
        }
      }
    });
  }

  // Validation 5: Malformed AvailableSlots
  private validateAvailableSlots(workers: any[]) {
    if (!workers) return;

    workers.forEach(worker => {
      const slots = worker.AvailableSlots;
      if (slots) {
        try {
          const parsed = JSON.parse(slots);
          if (!Array.isArray(parsed)) {
            this.addValidationResult({
              type: 'invalid_slots_format',
              severity: 'error',
              message: 'AvailableSlots must be an array',
              entityType: 'workers',
              entityId: worker.WorkerID,
              field: 'AvailableSlots',
              suggestion: 'Use array format like [1,2,3]'
            });
          } else if (parsed.some(slot => typeof slot !== 'number' || slot < 1)) {
            this.addValidationResult({
              type: 'invalid_slot_values',
              severity: 'error',
              message: 'AvailableSlots must contain positive numbers',
              entityType: 'workers',
              entityId: worker.WorkerID,
              field: 'AvailableSlots',
              suggestion: 'Use positive phase numbers like [1,2,3]'
            });
          }
        } catch (e) {
          this.addValidationResult({
            type: 'unparseable_slots',
            severity: 'error',
            message: 'AvailableSlots contains invalid JSON',
            entityType: 'workers',
            entityId: worker.WorkerID,
            field: 'AvailableSlots',
            suggestion: 'Use valid JSON array format like [1,2,3]'
          });
        }
      }
    });
  }

  // Validation 6: Task duration validation
  private validateTaskDuration(tasks: any[]) {
    if (!tasks) return;

    tasks.forEach(task => {
      const duration = task.Duration;
      if (duration && (typeof duration !== 'number' || duration < 1)) {
        this.addValidationResult({
          type: 'invalid_duration',
          severity: 'error',
          message: `Task duration must be >= 1, found: ${duration}`,
          entityType: 'tasks',
          entityId: task.TaskID,
          field: 'Duration',
          suggestion: 'Set duration to a positive number'
        });
      }
    });
  }

  // Validation 7: Cross-reference validation (RequestedTaskIDs exist)
  private validateTaskReferences(clients: any[], tasks: any[]) {
    if (!clients || !tasks) return;

    const taskIds = new Set(tasks.map(task => task.TaskID));

    clients.forEach(client => {
      const requestedTasks = client.RequestedTaskIDs;
      if (requestedTasks && typeof requestedTasks === 'string') {
        const taskIdList = requestedTasks.split(',').map(id => id.trim());
        const missingTasks = taskIdList.filter(taskId => taskId && !taskIds.has(taskId));

        if (missingTasks.length > 0) {
          this.addValidationResult({
            type: 'missing_task_references',
            severity: 'error',
            message: `Referenced tasks don't exist: ${missingTasks.join(', ')}`,
            entityType: 'clients',
            entityId: client.ClientID,
            field: 'RequestedTaskIDs',
            suggestion: 'Remove invalid task references or add the missing tasks'
          });
        }
      }
    });
  }

  // Validation 8: Overloaded workers
  private validateOverloadedWorkers(workers: any[]) {
    if (!workers) return;

    workers.forEach(worker => {
      try {
        const availableSlots = JSON.parse(worker.AvailableSlots || '[]');
        const maxLoad = worker.MaxLoadPerPhase || 0;
        
        if (Array.isArray(availableSlots) && availableSlots.length < maxLoad) {
          this.addValidationResult({
            type: 'overloaded_worker',
            severity: 'error',
            message: `Worker has ${availableSlots.length} available slots but max load is ${maxLoad}`,
            entityType: 'workers',
            entityId: worker.WorkerID,
            field: 'MaxLoadPerPhase',
            suggestion: `Reduce MaxLoadPerPhase to ${availableSlots.length} or add more available slots`
          });
        }
      } catch (e) {
        // Already handled by validateAvailableSlots
      }
    });
  }

  // Validation 9: Skill-coverage matrix
  private validateSkillCoverage(workers: any[], tasks: any[]) {
    if (!workers || !tasks) return;

    const allWorkerSkills = new Set<string>();
    workers.forEach(worker => {
      if (worker.Skills) {
        const skills = worker.Skills.split(',').map((s: string) => s.trim().toLowerCase());
        skills.forEach((skill: string) => allWorkerSkills.add(skill));
      }
    });

    tasks.forEach(task => {
      if (task.RequiredSkills) {
        const requiredSkills = task.RequiredSkills.split(',').map((s: string) => s.trim().toLowerCase());
        const missingSkills = requiredSkills.filter((skill: string) => !allWorkerSkills.has(skill));
        
        if (missingSkills.length > 0) {
          this.addValidationResult({
            type: 'missing_skill_coverage',
            severity: 'error',
            message: `No workers have required skills: ${missingSkills.join(', ')}`,
            entityType: 'tasks',
            entityId: task.TaskID,
            field: 'RequiredSkills',
            suggestion: `Hire workers with skills: ${missingSkills.join(', ')} or modify task requirements`
          });
        }
      }
    });
  }

  // Validation 10: Max-concurrency feasibility
  private validateMaxConcurrency(workers: any[], tasks: any[]) {
    if (!workers || !tasks) return;

    tasks.forEach(task => {
      if (task.MaxConcurrent && task.RequiredSkills) {
        const requiredSkills = task.RequiredSkills.split(',').map((s: string) => s.trim().toLowerCase());
        
        const qualifiedWorkers = workers.filter(worker => {
          if (!worker.Skills) return false;
          const workerSkills = worker.Skills.split(',').map((s: string) => s.trim().toLowerCase());
          return requiredSkills.every((reqSkill:string) => workerSkills.includes(reqSkill));
        });

        if (task.MaxConcurrent > qualifiedWorkers.length) {
          this.addValidationResult({
            type: 'max_concurrency_infeasible',
            severity: 'error',
            message: `Task requires ${task.MaxConcurrent} concurrent workers but only ${qualifiedWorkers.length} are qualified`,
            entityType: 'tasks',
            entityId: task.TaskID,
            field: 'MaxConcurrent',
            suggestion: `Reduce MaxConcurrent to ${qualifiedWorkers.length} or hire more qualified workers`
          });
        }
      }
    });
  }

  // Validation 11: Phase-slot saturation
  private validatePhaseSlotSaturation(workers: any[], tasks: any[]) {
    if (!workers || !tasks) return;

    const phaseCapacity: Record<number, number> = {};
    
    workers.forEach(worker => {
      try {
        const availableSlots = JSON.parse(worker.AvailableSlots || '[]');
        const maxLoad = worker.MaxLoadPerPhase || 0;
        
        if (Array.isArray(availableSlots)) {
          availableSlots.forEach((phase: number) => {
            phaseCapacity[phase] = (phaseCapacity[phase] || 0) + maxLoad;
          });
        }
      } catch (e) {
        // Skip invalid slots
      }
    });

    const phaseDemand: Record<number, number> = {};
    
    tasks.forEach(task => {
      const duration = task.Duration || 1;
      const preferredPhases = task.PreferredPhases || '';
      
      let phases: number[] = [];
      
      if (preferredPhases.includes('[') && preferredPhases.includes(']')) {
        try {
          phases = JSON.parse(preferredPhases);
        } catch (e) {
          // Skip malformed phase data
        }
      } else if (preferredPhases.includes('-')) {
        const parts = preferredPhases.split('-').map((p: string) => parseInt(p.trim()));
        const [start, end] = parts;
        if (!isNaN(start) && !isNaN(end)) {
          phases = Array.from({length: end - start + 1}, (_, i) => start + i);
        }
      }
      
      if (phases.length === 0) {
        phases = [1];
      }
      
      phases.forEach((phase: number) => {
        phaseDemand[phase] = (phaseDemand[phase] || 0) + duration;
      });
    });

    Object.keys(phaseDemand).forEach(phaseStr => {
      const phase = parseInt(phaseStr);
      const demand = phaseDemand[phase];
      const capacity = phaseCapacity[phase] || 0;
      
      if (demand > capacity) {
        this.addValidationResult({
          type: 'phase_slot_saturation',
          severity: 'error',
          message: `Phase ${phase} is overloaded: ${demand} task duration units vs ${capacity} worker capacity`,
          entityType: 'tasks',
          field: 'PreferredPhases',
          suggestion: `Redistribute tasks from phase ${phase} or increase worker capacity`
        });
      }
    });
  }

  // Validation 12: Circular co-run groups detection
  private validateCircularCoRunGroups(rules: BusinessRule[]) {
    if (!rules) return;

    const coRunRules = rules.filter(rule => rule.type === 'coRun' && rule.isActive);
    if (coRunRules.length === 0) return;

    const graph: Record<string, Set<string>> = {};
    
    coRunRules.forEach(rule => {
      const taskIds = rule.parameters?.taskIds || [];
      
      taskIds.forEach((taskId1: string) => {
        if (!graph[taskId1]) graph[taskId1] = new Set();
        
        taskIds.forEach((taskId2: string) => {
          if (taskId1 !== taskId2) {
            graph[taskId1].add(taskId2);
          }
        });
      });
    });

    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    const hasCycle = (node: string, path: string[]): boolean => {
      if (recursionStack.has(node)) {
        const cycleStart = path.indexOf(node);
        const cycle = path.slice(cycleStart).concat([node]);
        
        this.addValidationResult({
          type: 'circular_corun_group',
          severity: 'error',
          message: `Circular co-run dependency detected: ${cycle.join(' → ')}`,
          entityType: 'tasks',
          suggestion: `Remove conflicting co-run rules to break the cycle`
        });
        return true;
      }
      
      if (visited.has(node)) return false;
      
      visited.add(node);
      recursionStack.add(node);
      
      const neighbors = graph[node] || new Set();
      for (const neighbor of neighbors) {
        if (hasCycle(neighbor, [...path, node])) {
          return true;
        }
      }
      
      recursionStack.delete(node);
      return false;
    };

    Object.keys(graph).forEach(taskId => {
      if (!visited.has(taskId)) {
        hasCycle(taskId, []);
      }
    });
  }

  // Validation 13: Conflicting rules vs. phase-window constraints
  private validateRuleConflicts(rules: BusinessRule[], tasks: any[]) {
    if (!rules || !tasks) return;

    const coRunRules = rules.filter(rule => rule.type === 'coRun' && rule.isActive);
    const phaseWindowRules = rules.filter(rule => rule.type === 'phaseWindow' && rule.isActive);
    
    if (coRunRules.length === 0 || phaseWindowRules.length === 0) return;

    coRunRules.forEach(coRunRule => {
      const coRunTasks = coRunRule.parameters?.taskIds || [];
      
      const taskPhaseConstraints: Record<string, number[]> = {};
      
      coRunTasks.forEach((taskId: string) => {
        const phaseWindowRule = phaseWindowRules.find(rule => 
          rule.parameters?.taskId === taskId
        );
        
        if (phaseWindowRule) {
          taskPhaseConstraints[taskId] = phaseWindowRule.parameters?.allowedPhases || [];
        } else {
          const task = tasks.find(t => t.TaskID === taskId);
          if (task?.PreferredPhases) {
            let phases: number[] = [];
            const preferredPhases = task.PreferredPhases;
            
            if (preferredPhases.includes('[') && preferredPhases.includes(']')) {
              try {
                phases = JSON.parse(preferredPhases);
              } catch (e) {
                phases = [1, 2, 3, 4, 5];
              }
            } else if (preferredPhases.includes('-')) {
              const parts = preferredPhases.split('-').map((p: string) => parseInt(p.trim()));
              const [start, end] = parts;
              if (!isNaN(start) && !isNaN(end)) {
                phases = Array.from({length: end - start + 1}, (_, i) => start + i);
              }
            } else {
              phases = [1, 2, 3, 4, 5];
            }
            
            taskPhaseConstraints[taskId] = phases;
          } else {
            taskPhaseConstraints[taskId] = [1, 2, 3, 4, 5];
          }
        }
      });

      const taskIds = Object.keys(taskPhaseConstraints);
      if (taskIds.length > 1) {
        let commonPhases = taskPhaseConstraints[taskIds[0]] || [];
        
        for (let i = 1; i < taskIds.length; i++) {
          const otherPhases = taskPhaseConstraints[taskIds[i]] || [];
          commonPhases = commonPhases.filter(phase => otherPhases.includes(phase));
        }
        
        if (commonPhases.length === 0) {
          this.addValidationResult({
            type: 'conflicting_rules',
            severity: 'error',
            message: `Co-run rule for tasks [${coRunTasks.join(', ')}] conflicts with phase-window constraints - no common phases available`,
            entityType: 'tasks',
            suggestion: `Modify phase-window rules or remove co-run constraint for conflicting tasks`
          });
        }
      }
    });
  }
}