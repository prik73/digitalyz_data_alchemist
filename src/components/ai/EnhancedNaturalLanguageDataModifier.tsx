'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Wand2, 
  Loader2, 
  Eye,
  Play,
  AlertTriangle,
  CheckCircle2,
  History
} from 'lucide-react';
import { ChangePreviewModal } from './ChangePreviewModal';
import { ChangeTrackingSystem } from './ChangeTrackingSystem';

interface ModificationPlan {
  action: string;
  entityType: 'clients' | 'workers' | 'tasks';
  field: string;
  condition: string;
  newValue: any;
  affectedCount: number;
  preview: any[];
}

interface ChangePreview {
  entityId: string;
  entityType: 'clients' | 'workers' | 'tasks';
  field: string;
  oldValue: any;
  newValue: any;
  entityName?: string;
}

interface EnhancedNLDataModifierProps {
  data: {
    clients: any[];
    workers: any[];
    tasks: any[];
  };
  onDataChange: (entityType: 'clients' | 'workers' | 'tasks', newData: any[]) => void;
}

export default function EnhancedNaturalLanguageDataModifier({ 
  data, 
  onDataChange 
}: EnhancedNLDataModifierProps) {
  const [command, setCommand] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [modificationPlan, setModificationPlan] = useState<ModificationPlan | null>(null);
  const [changePreview, setChangePreview] = useState<ChangePreview[]>([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  // Calculate detailed change preview
  const calculateChangePreview = (plan: ModificationPlan): ChangePreview[] => {
    const { entityType, field, condition, newValue, action } = plan;
    const entities = data[entityType] || [];
    const changes: ChangePreview[] = [];

    entities.forEach((entity: any) => {
      if (matchesCondition(entity, condition)) {
        const idField = `${entityType.slice(0, -1).charAt(0).toUpperCase() + entityType.slice(1, -1)}ID`;
        const nameField = `${entityType.slice(0, -1).charAt(0).toUpperCase() + entityType.slice(1, -1)}Name`;
        
        let calculatedNewValue = newValue;
        
        // Calculate actual new value based on action type
        if (field === 'PriorityLevel' && action.includes('increase')) {
          const currentValue = entity[field] || 1;
          calculatedNewValue = Math.min(5, currentValue + newValue);
        } else if (field === 'Skills' && action.includes('add')) {
          const currentSkills = entity[field] || '';
          const skillsArray = currentSkills.split(',').map((s: string) => s.trim()).filter(Boolean);
          if (!skillsArray.includes(newValue)) {
            skillsArray.push(newValue);
            calculatedNewValue = skillsArray.join(', ');
          } else {
            calculatedNewValue = currentSkills; // No change needed
          }
        }

        // Only add to preview if value actually changes
        if (entity[field] !== calculatedNewValue) {
          changes.push({
            entityId: entity[idField],
            entityType,
            field,
            oldValue: entity[field],
            newValue: calculatedNewValue,
            entityName: entity[nameField] || entity[idField]
          });
        }
      }
    });

    return changes;
  };

  const processNaturalLanguageCommand = async () => {
    if (!command.trim()) return;
    
    setIsProcessing(true);
    
    try {
      const response = await fetch('/api/ai/modify-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: command.trim(),
          currentData: data
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.error) {
        alert(`Error: ${result.error}`);
        return;
      }

      setModificationPlan(result.plan);
      
      // Calculate detailed change preview
      const preview = calculateChangePreview(result.plan);
      setChangePreview(preview);
      
      // Show preview modal if there are changes
      if (preview.length > 0) {
        setShowPreviewModal(true);
      } else {
        alert('No matching records found for the specified criteria.');
      }
      
    } catch (error) {
      console.error('Error processing command:', error);
      alert('Failed to process command. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const applyModification = async () => {
    if (!modificationPlan) return;
    
    setIsApplying(true);
    
    try {
      const response = await fetch('/api/ai/apply-modification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: modificationPlan,
          currentData: data
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.error) {
        alert(`Error: ${result.error}`);
        return;
      }

      // Apply the changes to the data
      onDataChange(modificationPlan.entityType, result.modifiedData);
      
      // Add to change tracking
      if ((window as any).addChangeRecord) {
        (window as any).addChangeRecord({
          action: modificationPlan.action,
          entityType: modificationPlan.entityType,
          affectedIds: changePreview.map(c => c.entityId),
          changes: changePreview,
          canUndo: true
        });
      }
      
      // Close modal and reset
      setShowPreviewModal(false);
      setModificationPlan(null);
      setChangePreview([]);
      setCommand('');
      
    } catch (error) {
      console.error('Error applying modification:', error);
      alert('Failed to apply modification. Please try again.');
    } finally {
      setIsApplying(false);
    }
  };

  const handleCancel = () => {
    setShowPreviewModal(false);
    setModificationPlan(null);
    setChangePreview([]);
  };

  const handleUndo = async (changeId: string) => {
    // Implementation for undo functionality
    console.log('Undo change:', changeId);
    // You would implement the actual undo logic here
  };

  const handleViewChanges = (entityType: 'clients' | 'workers' | 'tasks', entityIds: string[]) => {
    // Switch to the appropriate tab and highlight the changed entities
    console.log('View changes for:', entityType, entityIds);
    // You would implement tab switching and highlighting here
  };

  // Helper function to match conditions (simplified)
  const matchesCondition = (entity: any, condition: string): boolean => {
    const lowerCondition = condition.toLowerCase();
    
    if (lowerCondition.includes('groupa')) return entity.GroupTag === 'GroupA';
    if (lowerCondition.includes('groupb')) return entity.GroupTag === 'GroupB';
    if (lowerCondition.includes('groupc')) return entity.GroupTag === 'GroupC';
    if (lowerCondition.includes('react')) return entity.Skills?.toLowerCase().includes('react');
    if (lowerCondition.includes('python')) return entity.Skills?.toLowerCase().includes('python');
    
    return false;
  };

  const exampleCommands = [
    "Increase priority for GroupA clients by 1",
    "Set all React developers to qualification level 8", 
    "Add Python skill to all backend workers",
    "Remove T5 from all client requests",
    "Set max load to 5 for frontend team",
    "Change duration to 2 for all API tasks"
  ];

  return (
    <div className="space-y-6">
      {/* Main Command Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-purple-500" />
            AI Data Modification with Preview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <label className="block text-sm font-medium">
              Describe what you want to change:
            </label>
            <Textarea
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="e.g., 'Increase priority for GroupA clients by 1'"
              rows={3}
              className="w-full"
            />
            
            <Button 
              onClick={processNaturalLanguageCommand}
              disabled={!command.trim() || isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  AI is analyzing your request...
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Preview Changes
                </>
              )}
            </Button>
          </div>

          {/* Example Commands */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Try these commands:</h4>
            <div className="grid grid-cols-1 gap-2">
              {exampleCommands.map((example, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => setCommand(example)}
                  className="text-left justify-start h-auto p-3"
                >
                  <span className="text-xs">{example}</span>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Tracking System */}
      <ChangeTrackingSystem 
        onUndo={handleUndo}
        onViewChanges={handleViewChanges}
      />

      {/* Change Preview Modal */}
      <ChangePreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        onConfirm={applyModification}
        onCancel={handleCancel}
        changes={changePreview}
        action={modificationPlan?.action || ''}
        isProcessing={isApplying}
      />
    </div>
  );
}

function matchesCondition(entity: any, condition: string): boolean {
  const lowerCondition = condition.toLowerCase();
  
  if (lowerCondition.includes('groupa')) return entity.GroupTag === 'GroupA';
  if (lowerCondition.includes('groupb')) return entity.GroupTag === 'GroupB';
  if (lowerCondition.includes('groupc')) return entity.GroupTag === 'GroupC';
  if (lowerCondition.includes('react')) return entity.Skills?.toLowerCase().includes('react');
  if (lowerCondition.includes('python')) return entity.Skills?.toLowerCase().includes('python');
  if (lowerCondition.includes('backend')) return entity.WorkerGroup?.toLowerCase().includes('backend');
  if (lowerCondition.includes('frontend')) return entity.WorkerGroup?.toLowerCase().includes('frontend');
  
  return false;
}