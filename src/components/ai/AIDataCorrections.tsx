'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Wand2, 
  Loader2, 
  CheckCircle, 
  AlertTriangle,
  Zap,
  RefreshCw,
  Eye,
  Settings,
  Wrench
} from 'lucide-react';

interface ValidationResult {
  type: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  entityType: 'clients' | 'workers' | 'tasks';
  entityId?: string;
  field?: string;
  suggestion?: string;
}

interface AIDataCorrectionsProps {
  validationResults: ValidationResult[];
  data: {
    clients: any[];
    workers: any[];
    tasks: any[];
  };
  onDataChange: (entityType: 'clients' | 'workers' | 'tasks', newData: any[]) => void;
}

export default function AIDataCorrections({ 
  validationResults, 
  data, 
  onDataChange 
}: AIDataCorrectionsProps) {
  const [isFixing, setIsFixing] = useState(false);
  const [fixedErrors, setFixedErrors] = useState<Set<string>>(new Set());

  // 🔥 DIRECT AUTO-FIX (No API needed - calculate corrections locally)
  const handleSingleFix = (validation: ValidationResult) => {
    const { entityType, entityId, field, type } = validation;
    
    setIsFixing(true);
    
    try {
      const entities = [...data[entityType]];
      const idField = `${entityType.slice(0, -1).charAt(0).toUpperCase() + entityType.slice(1, -1)}ID`;
      const entityIndex = entities.findIndex(entity => entity[idField] === entityId);
      
      if (entityIndex === -1) {
        throw new Error('Entity not found');
      }

      const entity = { ...entities[entityIndex] };
      let correctionApplied = false;

      // 🔧 REAL CORRECTION LOGIC (No more "corrected_value"!)
      switch (type) {
        case 'invalid_priority':
          const priority = entity[field!];
          entity[field!] = Math.min(5, Math.max(1, priority || 3));
          correctionApplied = true;
          break;

        case 'invalid_duration':
          entity[field!] = Math.max(1, entity[field!] || 1);
          correctionApplied = true;
          break;

        case 'unparseable_slots':
        case 'invalid_slots_format':
          entity[field!] = '[1,2,3]';
          correctionApplied = true;
          break;

        case 'invalid_json':
          entity[field!] = '{}';
          correctionApplied = true;
          break;

        case 'overloaded_worker':
        case 'worker_overload':
          // 🔥 FIX THE "corrected_value" BUG HERE!
          try {
            const slots = JSON.parse(entity.AvailableSlots || '[1,2,3]');
            const availableSlotCount = Array.isArray(slots) ? slots.length : 3;
            entity.MaxLoadPerPhase = Math.min(entity.MaxLoadPerPhase || 5, availableSlotCount);
            correctionApplied = true;
          } catch {
            entity.AvailableSlots = '[1,2,3]';
            entity.MaxLoadPerPhase = 3;
            correctionApplied = true;
          }
          break;

        case 'duplicate_id':
          // Generate new unique ID
          const prefix = entityType.charAt(0).toUpperCase();
          const existingIds = entities.map(e => e[idField]).filter(Boolean);
          let counter = 1;
          while (existingIds.includes(`${prefix}${counter}`)) {
            counter++;
          }
          entity[idField] = `${prefix}${counter}`;
          correctionApplied = true;
          break;

        case 'missing_task_references':
          if (field === 'RequestedTaskIDs') {
            const validTaskIds = new Set(data.tasks.map(t => t.TaskID));
            const currentRefs = (entity[field] || '').split(',').map((id: string) => id.trim());
            const validRefs = currentRefs.filter((id: string) => validTaskIds.has(id));
            entity[field] = validRefs.join(', ');
            correctionApplied = true;
          }
          break;

        default:
          console.warn('No correction available for:', type);
          break;
      }

      if (correctionApplied) {
        entities[entityIndex] = entity;
        onDataChange(entityType, entities);
        setFixedErrors(prev => new Set([...prev, `${entityType}-${entityId}-${field}`]));
        console.log(`✅ Fixed ${type} for ${entityId}: ${field} = ${entity[field!]}`);
      }

    } catch (error) {
      console.error('❌ Error fixing validation:', error);
      alert('Failed to apply fix. Please try manual correction.');
    } finally {
      setIsFixing(false);
    }
  };

  // Bulk fix all auto-fixable errors
  const handleBulkFix = async () => {
    setIsFixing(true);
    
    const autoFixableErrors = validationResults.filter(r => 
      r.severity === 'error' && isAutoFixable(r.type)
    );

    for (const error of autoFixableErrors) {
      handleSingleFix(error);
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
    }
    
    setIsFixing(false);
  };

  // Check if error type can be auto-fixed
  const isAutoFixable = (type: string): boolean => {
    const autoFixableTypes = [
      'invalid_priority',
      'invalid_duration', 
      'unparseable_slots',
      'invalid_slots_format',
      'invalid_json',
      'overloaded_worker',
      'worker_overload',
      'duplicate_id',
      'missing_task_references'
    ];
    return autoFixableTypes.includes(type);
  };

  const errorCount = validationResults.filter(r => r.severity === 'error').length;
  const autoFixCount = validationResults.filter(r => r.severity === 'error' && isAutoFixable(r.type)).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-blue-500" />
          AI Data Corrections
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{errorCount}</div>
            <div className="text-xs text-red-600">Errors Found</div>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{autoFixCount}</div>
            <div className="text-xs text-green-600">Auto-Fixable</div>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{fixedErrors.size}</div>
            <div className="text-xs text-blue-600">Fixed</div>
          </div>
        </div>

        {/* Bulk Fix Button */}
        {autoFixCount > 0 && (
          <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-sm text-blue-800">
                  🚀 Instant Fix Available!
                </h4>
                <p className="text-xs text-blue-700 mt-1">
                  {autoFixCount} errors can be automatically corrected
                </p>
              </div>
              <Button
                onClick={handleBulkFix}
                disabled={isFixing}
                className="bg-green-600 hover:bg-green-700"
                size="sm"
              >
                {isFixing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Fixing...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Fix All ({autoFixCount})
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Individual Error Fixes */}
        {validationResults.filter(r => r.severity === 'error').slice(0, 10).map((error, index) => {
          const fixId = `${error.entityType}-${error.entityId}-${error.field}`;
          const isFixed = fixedErrors.has(fixId);
          const canAutoFix = isAutoFixable(error.type);

          return (
            <div
              key={index}
              className={`p-3 border rounded-lg ${
                isFixed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs capitalize">
                      {error.entityType}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {error.entityId}
                    </Badge>
                    {error.field && (
                      <Badge variant="outline" className="text-xs">
                        {error.field}
                      </Badge>
                    )}
                    {isFixed && (
                      <Badge className="text-xs bg-green-100 text-green-800">
                        Fixed ✓
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-red-700 mb-1">{error.message}</p>
                  {error.suggestion && !isFixed && (
                    <p className="text-xs text-gray-600">💡 {error.suggestion}</p>
                  )}
                </div>
                
                {canAutoFix && !isFixed && (
                  <Button
                    size="sm"
                    onClick={() => handleSingleFix(error)}
                    disabled={isFixing}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Wrench className="w-3 h-3 mr-1" />
                    Fix Now
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {/* No Errors State */}
        {errorCount === 0 && (
          <div className="text-center py-6">
            <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
            <h3 className="font-medium text-green-700 mb-1">No Errors to Fix!</h3>
            <p className="text-sm text-gray-600">
              Your data looks clean. AI corrections are not needed.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}