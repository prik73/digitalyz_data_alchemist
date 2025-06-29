// components/validation/EnhancedValidationSummary.tsx
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {AlertTriangle,CheckCircle,Info,ChevronDown,ChevronUp,Loader2,FileText,Users,Briefcase,Lightbulb,Zap,Wrench,CheckCheck} from 'lucide-react';

interface ValidationResult {
  type: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  entityType: 'clients' | 'workers' | 'tasks';
  entityId?: string;
  field?: string;
  suggestion?: string;
}

interface ValidationSummaryProps {
  validationResults: ValidationResult[];
  isValidating: boolean;
  data: {
    clients: any[];
    workers: any[];
    tasks: any[];
  };
  onDataChange: (entityType: 'clients' | 'workers' | 'tasks', newData: any[]) => void;
}

export default function ValidationSummary({
  validationResults,
  isValidating,
  data,
  onDataChange
}: ValidationSummaryProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(['errors']);
  const [fixingErrors, setFixingErrors] = useState<Set<string>>(new Set());
  const [fixedErrors, setFixedErrors] = useState<Set<string>>(new Set());

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  // Auto-fix individual validation errors
const handleAutoFix = async (validation: ValidationResult, index: number) => {
  const fixId = `${validation.entityType}-${validation.entityId}-${validation.field}-${index}`;
  setFixingErrors(prev => new Set([...prev, fixId]));

  try {
    // Create a simple correction object
    const correction = {
      entityType: validation.entityType,
      entityId: validation.entityId,
      field: validation.field,
      newValue: getAutoFixValue(validation), // Helper function below
      action: validation.type
    };

    const response = await fetch('/api/ai/apply-correction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      onDataChange(validation.entityType, result.correctedData);
      setFixedErrors(prev => new Set([...prev, fixId]));
      console.log(`✅ Auto-fixed ${validation.type} for ${validation.entityId}`);
    }
    
  } catch (error) {
    console.error('Error auto-fixing:', error);
    alert('Failed to apply auto-fix. Please try again.');
  } finally {
    setFixingErrors(prev => {
      const newSet = new Set(prev);
      newSet.delete(fixId);
      return newSet;
    });
  }
};

// Helper function to determine fix value
function getAutoFixValue(validation: ValidationResult): any {
  switch (validation.type) {
    case 'invalid_priority':
      return 3; // Default valid priority
    case 'invalid_duration':
      return 1; // Minimum valid duration
    case 'unparseable_slots':
    case 'invalid_slots_format':
      return '[1,2,3]'; // Default slots
    case 'invalid_json':
      return '{}'; // Empty JSON object
    case 'overloaded_worker':
      return 3; // Reasonable max load
    default:
      return 'fixed_value';
  }
}

  // Bulk fix all auto-fixable errors
  const handleBulkAutoFix = async () => {
    const autoFixableErrors = validationResults.filter(r => 
      r.severity === 'error' && isAutoFixable(r)
    );

    for (let i = 0; i < autoFixableErrors.length; i++) {
      await handleAutoFix(autoFixableErrors[i], i);
      // Small delay to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  };

  // Check if a validation error can be auto-fixed
  const isAutoFixable = (validation: ValidationResult): boolean => {
    const autoFixableTypes = [
      'worker_overload',
      'out_of_range', 
      'malformed_list',
      'broken_json',
      'duplicate_id',
      'unknown_reference'
    ];
    return autoFixableTypes.includes(validation.type);
  };

  const getIcon = (entityType: 'clients' | 'workers' | 'tasks') => {
    switch (entityType) {
      case 'clients':
        return <Users className="w-4 h-4" />;
      case 'workers':
        return <Briefcase className="w-4 h-4" />;
      case 'tasks':
        return <FileText className="w-4 h-4" />;
    }
  };

  const getSeverityIcon = (severity: 'error' | 'warning' | 'info') => {
    switch (severity) {
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'info':
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: 'error' | 'warning' | 'info') => {
    switch (severity) {
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'info':
        return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  // Group validation results by severity
  const groupedResults = {
    error: validationResults.filter(r => r.severity === 'error'),
    warning: validationResults.filter(r => r.severity === 'warning'),
    info: validationResults.filter(r => r.severity === 'info')
  };

  // Calculate data quality score
  const calculateQualityScore = () => {
    const totalIssues = validationResults.length;
    const errorWeight = 3;
    const warningWeight = 1;
    
    const errorScore = groupedResults.error.length * errorWeight;
    const warningScore = groupedResults.warning.length * warningWeight;
    const totalWeight = errorScore + warningScore;
    
    if (totalWeight === 0) return 100;
    
    const baseScore = Math.max(0, 100 - totalWeight * 5);
    return Math.round(baseScore);
  };

  const qualityScore = calculateQualityScore();
  const autoFixableCount = groupedResults.error.filter(isAutoFixable).length;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const renderValidationItem = (result: ValidationResult, index: number) => {
    const fixId = `${result.entityType}-${result.entityId}-${result.field}-${index}`;
    const isFixing = fixingErrors.has(fixId);
    const isFixed = fixedErrors.has(fixId);
    const canAutoFix = isAutoFixable(result);

    return (
      <div
        key={index}
        className={`p-3 rounded-lg border ${getSeverityColor(result.severity)} ${
          isFixed ? 'opacity-50 bg-green-50' : ''
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {isFixed ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              getSeverityIcon(result.severity)
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {getIcon(result.entityType)}
              <span className="font-medium text-sm capitalize">
                {result.entityType}
              </span>
              {result.entityId && (
                <Badge variant="outline" className="text-xs">
                  {result.entityId}
                </Badge>
              )}
              {result.field && (
                <Badge variant="secondary" className="text-xs">
                  {result.field}
                </Badge>
              )}
              {isFixed && (
                <Badge className="text-xs bg-green-100 text-green-800">
                  Fixed
                </Badge>
              )}
            </div>
            <p className="text-sm mb-2">{result.message}</p>
            {result.suggestion && !isFixed && (
              <div className="flex items-start gap-2 mt-2 p-2 bg-white bg-opacity-50 rounded border">
                <Lightbulb className="w-3 h-3 mt-0.5 text-blue-500 flex-shrink-0" />
                <p className="text-xs text-gray-600 flex-1">{result.suggestion}</p>
                {canAutoFix && (
                  <Button
                    size="sm"
                    onClick={() => handleAutoFix(result, index)}
                    disabled={isFixing}
                    className="h-6 px-2 text-xs bg-blue-600 hover:bg-blue-700"
                  >
                    {isFixing ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Fixing...
                      </>
                    ) : (
                      <>
                        <Wrench className="w-3 h-3 mr-1" />
                        Auto-Fix
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (isValidating) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Validating Data...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={75} />
            <p className="text-sm text-gray-600">
              Running validation checks on your data...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Data Quality</span>
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-bold ${getScoreColor(qualityScore)}`}>
              {qualityScore}%
            </span>
            {qualityScore >= 80 ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {groupedResults.error.length}
            </div>
            <div className="text-xs text-red-600">Errors</div>
          </div>
          <div className="p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">
              {groupedResults.warning.length}
            </div>
            <div className="text-xs text-yellow-600">Warnings</div>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {groupedResults.info.length}
            </div>
            <div className="text-xs text-blue-600">Info</div>
          </div>
        </div>

        {/* Bulk Auto-Fix Button */}
        {autoFixableCount > 0 && (
          <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-sm text-blue-800">
                  🤖 AI Auto-Fix Available
                </h4>
                <p className="text-xs text-blue-700 mt-1">
                  {autoFixableCount} errors can be automatically fixed
                </p>
              </div>
              <Button
                onClick={handleBulkAutoFix}
                className="bg-blue-600 hover:bg-blue-700"
                size="sm"
              >
                <Zap className="w-4 h-4 mr-2" />
                Fix All ({autoFixableCount})
              </Button>
            </div>
          </div>
        )}

        {/* No Issues State */}
        {validationResults.length === 0 && (
          <div className="text-center py-6">
            <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
            <h3 className="font-medium text-green-700 mb-1">Perfect Data Quality!</h3>
            <p className="text-sm text-gray-600">
              No validation issues found in your data.
            </p>
          </div>
        )}

        {/* Error Section */}
        {groupedResults.error.length > 0 && (
          <Collapsible
            open={expandedSections.includes('errors')}
            onOpenChange={() => toggleSection('errors')}
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-0 h-auto"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="font-medium text-red-700">
                    Errors ({groupedResults.error.length})
                  </span>
                  {autoFixableCount > 0 && (
                    <Badge className="bg-blue-100 text-blue-800 text-xs">
                      {autoFixableCount} auto-fixable
                    </Badge>
                  )}
                </div>
                {expandedSections.includes('errors') ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 mt-3">
              {groupedResults.error.map((result, index) =>
                renderValidationItem(result, index)
              )}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Warning Section */}
        {groupedResults.warning.length > 0 && (
          <Collapsible
            open={expandedSections.includes('warnings')}
            onOpenChange={() => toggleSection('warnings')}
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-0 h-auto"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  <span className="font-medium text-yellow-700">
                    Warnings ({groupedResults.warning.length})
                  </span>
                </div>
                {expandedSections.includes('warnings') ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 mt-3">
              {groupedResults.warning.map((result, index) =>
                renderValidationItem(result, index)
              )}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Info Section */}
        {groupedResults.info.length > 0 && (
          <Collapsible
            open={expandedSections.includes('info')}
            onOpenChange={() => toggleSection('info')}
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-0 h-auto"
              >
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-500" />
                  <span className="font-medium text-blue-700">
                    Info ({groupedResults.info.length})
                  </span>
                </div>
                {expandedSections.includes('info') ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 mt-3">
              {groupedResults.info.map((result, index) =>
                renderValidationItem(result, index)
              )}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Quality Improvement Tips */}
        {validationResults.length > 0 && (
          <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <CheckCheck className="w-4 h-4 text-green-600" />
              <span className="font-medium text-green-700 text-sm">
                Quick Fixes Available
              </span>
            </div>
            <ul className="text-xs text-green-600 space-y-1">
              <li>• Click "Auto-Fix" buttons next to errors for instant fixes</li>
              <li>• Use "Fix All" to resolve multiple issues at once</li>
              <li>• Data quality score will improve as errors are fixed</li>
              <li>• Manual edits are available in the data grid tabs</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}