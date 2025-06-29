'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  AlertTriangle,
  CheckCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Loader2,
  FileText,
  Users,
  Briefcase,
  Lightbulb
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

interface ValidationSummaryProps {
  validationResults: ValidationResult[];
  isValidating: boolean;
}

const ValidationSummary: React.FC<ValidationSummaryProps> = ({
  validationResults,
  isValidating
}) => {
  const [expandedSections, setExpandedSections] = useState<string[]>(['errors']);

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
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
    
    // Scale down based on total issues (more issues = lower score)
    const baseScore = Math.max(0, 100 - totalWeight * 5);
    return Math.round(baseScore);
  };
  const qualityScore = calculateQualityScore();

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const renderValidationItem = (result: ValidationResult, index: number) => (
    <div
      key={index}
      className={`p-3 rounded-lg border ${getSeverityColor(result.severity)}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getSeverityIcon(result.severity)}
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
          </div>
          <p className="text-sm mb-2">{result.message}</p>
          {result.suggestion && (
            <div className="flex items-start gap-2 mt-2 p-2 bg-white bg-opacity-50 rounded border">
              <Lightbulb className="w-3 h-3 mt-0.5 text-blue-500 flex-shrink-0" />
              <p className="text-xs text-gray-600">{result.suggestion}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

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
        {/* No Issues State */}
        {validationResults.length === 0 && (
          <div className="text-center py-6">
            <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
            <h3 className="font-medium text-green-700 mb-1">All Good!</h3>
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
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-700 text-sm">
                Data Quality Tips
              </span>
            </div>
            <ul className="text-xs text-blue-600 space-y-1">
              <li>• Fix errors first as they prevent proper data processing</li>
              <li>• Address warnings to improve data reliability</li>
              <li>• Use the inline editor to make quick corrections</li>
              <li>• Check suggestions for automated fixes</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ValidationSummary;