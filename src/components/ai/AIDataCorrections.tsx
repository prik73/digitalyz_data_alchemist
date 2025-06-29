// components/ai/AIDataCorrections.tsx
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
  Settings
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

interface CorrectionSuggestion {
  validationId: string;
  correctionType: 'auto-fix' | 'smart-suggestion' | 'manual-review';
  description: string;
  confidence: number;
  previewValue: any;
  action: string;
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [corrections, setCorrections] = useState<CorrectionSuggestion[]>([]);
  const [applyingCorrections, setApplyingCorrections] = useState<Set<string>>(new Set());
  const [appliedCorrections, setAppliedCorrections] = useState<Set<string>>(new Set());

  const generateAICorrections = async () => {
    setIsGenerating(true);
    
    try {
      const response = await fetch('/api/ai/generate-corrections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          validationResults: validationResults.filter(r => r.severity === 'error'),
          currentData: data
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setCorrections(result.corrections || []);
      
    } catch (error) {
      console.error('Error generating corrections:', error);
      alert('Failed to generate AI corrections. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const applyCorrection = async (correction: CorrectionSuggestion) => {
    const correctionId = correction.validationId;
    
    setApplyingCorrections(prev => new Set([...prev, correctionId]));
    
    try {
      const response = await fetch('/api/ai/apply-correction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          correction,
          currentData: data
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Apply the corrected data
        onDataChange(result.entityType, result.correctedData);
        
        // Mark as applied
        setAppliedCorrections(prev => new Set([...prev, correctionId]));
      } else {
        alert(`Failed to apply correction: ${result.error}`);
      }
      
    } catch (error) {
      console.error('Error applying correction:', error);
      alert('Failed to apply correction. Please try again.');
    } finally {
      setApplyingCorrections(prev => {
        const newSet = new Set(prev);
        newSet.delete(correctionId);
        return newSet;
      });
    }
  };

  const applyAllAutoFixes = async () => {
    const autoFixCorrections = corrections.filter(c => 
      c.correctionType === 'auto-fix' && 
      !appliedCorrections.has(c.validationId)
    );

    for (const correction of autoFixCorrections) {
      await applyCorrection(correction);
      // Small delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600 bg-green-100';
    if (confidence >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getCorrectionTypeIcon = (type: string) => {
    switch (type) {
      case 'auto-fix':
        return <Zap className="w-4 h-4 text-green-500" />;
      case 'smart-suggestion':
        return <Wand2 className="w-4 h-4 text-blue-500" />;
      case 'manual-review':
        return <Eye className="w-4 h-4 text-orange-500" />;
      default:
        return <Settings className="w-4 h-4 text-gray-500" />;
    }
  };

  const errorCount = validationResults.filter(r => r.severity === 'error').length;
  const autoFixCount = corrections.filter(c => c.correctionType === 'auto-fix').length;
  const appliedCount = appliedCorrections.size;

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
            <div className="text-2xl font-bold text-blue-600">{appliedCount}</div>
            <div className="text-xs text-blue-600">Fixed</div>
          </div>
        </div>

        {/* Generate Corrections Button */}
        {corrections.length === 0 && errorCount > 0 && (
          <Button 
            onClick={generateAICorrections}
            disabled={isGenerating}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                AI is analyzing errors...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                Generate AI Corrections ({errorCount} errors)
              </>
            )}
          </Button>
        )}

        {/* Progress Indicator */}
        {isGenerating && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Analyzing validation errors...</span>
              <span>AI Processing</span>
            </div>
            <Progress value={75} />
          </div>
        )}

        {/* Corrections List */}
        {corrections.length > 0 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">AI-Generated Corrections</h3>
              {autoFixCount > 0 && (
                <Button 
                  onClick={applyAllAutoFixes}
                  variant="outline"
                  size="sm"
                >
                  <Zap className="w-4 h-4 mr-1" />
                  Apply All Auto-Fixes ({autoFixCount})
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {corrections.map((correction, index) => {
                const isApplying = applyingCorrections.has(correction.validationId);
                const isApplied = appliedCorrections.has(correction.validationId);
                
                return (
                  <div
                    key={index}
                    className={`p-4 border rounded-lg ${
                      isApplied ? 'bg-green-50 border-green-200' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        {getCorrectionTypeIcon(correction.correctionType)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-sm">
                              {correction.description}
                            </span>
                            <Badge className={getConfidenceColor(correction.confidence)}>
                              {correction.confidence}% confident
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {correction.correctionType}
                            </Badge>
                          </div>
                          
                          <div className="text-xs text-gray-600 mb-2">
                            Action: {correction.action}
                          </div>
                          
                          {correction.previewValue && (
                            <div className="text-xs bg-gray-50 p-2 rounded">
                              <strong>Preview:</strong> {JSON.stringify(correction.previewValue)}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {isApplied ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-xs">Applied</span>
                          </div>
                        ) : (
                          <Button
                            onClick={() => applyCorrection(correction)}
                            disabled={isApplying}
                            size="sm"
                            variant={correction.correctionType === 'auto-fix' ? 'default' : 'outline'}
                          >
                            {isApplying ? (
                              <>
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                Applying...
                              </>
                            ) : (
                              <>
                                {correction.correctionType === 'auto-fix' ? (
                                  <Zap className="w-3 h-3 mr-1" />
                                ) : (
                                  <RefreshCw className="w-3 h-3 mr-1" />
                                )}
                                Apply Fix
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Regenerate Button */}
            <Button 
              onClick={() => {
                setCorrections([]);
                setAppliedCorrections(new Set());
                generateAICorrections();
              }}
              variant="outline"
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate AI Corrections
            </Button>
          </div>
        )}

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