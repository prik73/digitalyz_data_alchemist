// components/ai/NaturalLanguageDataModifier.tsx
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {Wand2, Loader2, CheckCircle, AlertTriangle, Eye,Play} from 'lucide-react';

interface NLDataModifierProps {
  data: {
    clients: any[];
    workers: any[];
    tasks: any[];
  };
  onDataChange: (entityType: 'clients' | 'workers' | 'tasks', newData: any[]) => void;
}

interface ModificationPlan {
  action: string;
  entityType: 'clients' | 'workers' | 'tasks';
  field: string;
  condition: string;
  newValue: any;
  affectedCount: number;
  preview: any[];
}

export default function NaturalLanguageDataModifier({ data, onDataChange }: NLDataModifierProps) {
  const [command, setCommand] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [modificationPlan, setModificationPlan] = useState<ModificationPlan | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const processNaturalLanguageCommand = async () => {
    if (!command.trim()) return;
    
    setIsProcessing(true);
    
    try {
      const response = await fetch('/api/ai/modify-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
        headers: {
          'Content-Type': 'application/json',
        },
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
      
      setModificationPlan(null);
      setCommand('');
      
    } catch (error) {
      console.error('Error applying modification:', error);
      alert('Failed to apply modification. Please try again.');
    } finally {
      setIsApplying(false);
    }
  };

  const cancelModification = () => {
    setModificationPlan(null);
  };

  const exampleCommands = [
    "Set all React developers to qualification level 8",
    "Increase priority for GroupA clients by 1", 
    "Add Python skill to all backend workers",
    "Remove T5 from all client requests",
    "Set max load to 5 for frontend team",
    "Change duration to 2 for all API tasks"
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-purple-500" />
          AI Data Modification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {!modificationPlan ? (
          <>
            {/* Command Input */}
            <div className="space-y-3">
              <label className="block text-sm font-medium">
                Describe what you want to change:
              </label>
              <Textarea
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="e.g., 'Set all React developers to qualification level 8'"
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
                    <Wand2 className="w-4 h-4 mr-2" />
                    Generate Modification Plan
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
          </>
        ) : (
          /* Modification Plan Review */
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-700">Modification Plan</span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div><strong>Action:</strong> {modificationPlan.action}</div>
                <div><strong>Target:</strong> {modificationPlan.entityType}</div>
                <div><strong>Field:</strong> {modificationPlan.field}</div>
                <div><strong>Condition:</strong> {modificationPlan.condition}</div>
                <div><strong>New Value:</strong> {JSON.stringify(modificationPlan.newValue)}</div>
                <div className="flex items-center gap-2">
                  <strong>Affected Records:</strong> 
                  <Badge variant={modificationPlan.affectedCount > 0 ? "default" : "secondary"}>
                    {modificationPlan.affectedCount}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Preview */}
            {modificationPlan.preview.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Preview of Changes:</h4>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {modificationPlan.preview.slice(0, 5).map((item, index) => (
                    <div key={index} className="p-2 bg-gray-50 rounded text-xs">
                      <strong>{item.id}:</strong> {item.change}
                    </div>
                  ))}
                  {modificationPlan.preview.length > 5 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{modificationPlan.preview.length - 5} more changes
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={applyModification}
                disabled={isApplying || modificationPlan.affectedCount === 0}
                className="flex-1"
              >
                {isApplying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Applying Changes...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Apply Changes ({modificationPlan.affectedCount})
                  </>
                )}
              </Button>
              
              <Button
                onClick={cancelModification}
                variant="outline"
                disabled={isApplying}
              >
                Cancel
              </Button>
            </div>

            {modificationPlan.affectedCount === 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm text-yellow-700">
                    No records match the specified criteria
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}