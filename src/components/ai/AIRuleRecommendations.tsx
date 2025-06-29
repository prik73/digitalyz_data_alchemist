// components/ai/AIRuleRecommendations.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Sparkles,
  Loader2,
  CheckCircle,
  X,
  Lightbulb,
  TrendingUp,
  Users,
  Briefcase,
  FileText,
  Zap,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Settings
} from 'lucide-react';
import type { BusinessRule } from '@/types';

interface RuleSuggestion {
  id: string;
  type: 'coRun' | 'loadLimit' | 'phaseWindow' | 'slotRestriction';
  title: string;
  description: string;
  reasoning: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  parameters: Record<string, any>;
  affectedEntities: string[];
  pattern: string;
}

interface AIRuleRecommendationsProps {
  data: {
    clients: any[];
    workers: any[];
    tasks: any[];
  };
  currentRules: BusinessRule[];
  onRuleAccept: (rule: BusinessRule) => void;
  onAnalysisComplete?: (suggestions: RuleSuggestion[]) => void;
}

export default function AIRuleRecommendations({
  data,
  currentRules,
  onRuleAccept,
  onAnalysisComplete
}: AIRuleRecommendationsProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<RuleSuggestion[]>([]);
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<Set<string>>(new Set());
  const [rejectedSuggestions, setRejectedSuggestions] = useState<Set<string>>(new Set());
  const [analysisProgress, setAnalysisProgress] = useState(0);

  // Auto-analyze when data changes significantly
  useEffect(() => {
    const totalRecords = data.clients.length + data.workers.length + data.tasks.length;
    if (totalRecords > 5 && suggestions.length === 0) {
      // Auto-trigger analysis for substantial datasets
      setTimeout(() => {
        handleAnalyzePatterns();
      }, 2000);
    }
  }, [data, suggestions.length]);

  const handleAnalyzePatterns = async () => {
    if (isAnalyzing) return;
    
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    
    try {
      // Simulate analysis steps with progress
      const progressSteps = [10, 30, 50, 70, 90, 100];
      for (const step of progressSteps) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setAnalysisProgress(step);
      }

      const response = await fetch('/api/ai/analyze-patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data,
          currentRules: currentRules.map(r => r.type) // Just types to avoid duplicates
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setSuggestions(result.suggestions || []);
      
      if (onAnalysisComplete) {
        onAnalysisComplete(result.suggestions || []);
      }

    } catch (error) {
      console.error('Error analyzing patterns:', error);
      // Fallback to local pattern analysis
      const localSuggestions = analyzeLocalPatterns();
      setSuggestions(localSuggestions);
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(0);
    }
  };

  // Fallback local pattern analysis
  const analyzeLocalPatterns = (): RuleSuggestion[] => {
    const suggestions: RuleSuggestion[] = [];

    // Pattern 1: Frequently co-requested tasks
    if (data.clients.length > 0 && data.tasks.length > 1) {
      const taskPairs = findFrequentTaskPairs();
      if (taskPairs.length > 0) {
        taskPairs.forEach((pair, index) => {
          suggestions.push({
            id: `corun_${index}`,
            type: 'coRun',
            title: `Co-run Tasks ${pair.tasks.join(' & ')}`,
            description: `These tasks are requested together by ${pair.frequency} clients`,
            reasoning: `${pair.frequency} out of ${data.clients.length} clients request these tasks together`,
            confidence: Math.min(95, 60 + (pair.frequency / data.clients.length) * 35),
            impact: pair.frequency >= 3 ? 'high' : 'medium',
            parameters: { taskIds: pair.tasks },
            affectedEntities: pair.tasks,
            pattern: 'frequent_co_requests'
          });
        });
      }
    }

    // Pattern 2: Overloaded worker groups
    if (data.workers.length > 0) {
      const overloadedGroups = findOverloadedGroups();
      overloadedGroups.forEach((group, index) => {
        suggestions.push({
          id: `loadlimit_${index}`,
          type: 'loadLimit',
          title: `Load Limit for ${group.name}`,
          description: `${group.name} workers are handling high workloads`,
          reasoning: `Average load is ${group.avgLoad.toFixed(1)}, consider limiting to ${group.suggestedLimit}`,
          confidence: 80,
          impact: 'high',
          parameters: {
            workerGroup: group.name,
            maxSlotsPerPhase: group.suggestedLimit
          },
          affectedEntities: group.workers,
          pattern: 'workload_imbalance'
        });
      });
    }

    // Pattern 3: Phase window optimization
    if (data.tasks.length > 0) {
      const phaseConflicts = findPhaseConflicts();
      phaseConflicts.forEach((conflict, index) => {
        suggestions.push({
          id: `phasewindow_${index}`,
          type: 'phaseWindow',
          title: `Phase Restriction for ${conflict.taskId}`,
          description: `This task could benefit from phase restrictions`,
          reasoning: conflict.reasoning,
          confidence: 70,
          impact: 'medium',
          parameters: {
            taskId: conflict.taskId,
            allowedPhases: conflict.suggestedPhases
          },
          affectedEntities: [conflict.taskId],
          pattern: 'phase_optimization'
        });
      });
    }

    return suggestions.slice(0, 6); // Limit to top 6 suggestions
  };

  const findFrequentTaskPairs = () => {
    const taskPairCounts: Record<string, { tasks: string[], frequency: number }> = {};
    
    data.clients.forEach(client => {
      if (client.RequestedTaskIDs) {
        const tasks = client.RequestedTaskIDs.split(',').map((id: string) => id.trim());
        if (tasks.length >= 2) {
          // Check all pairs
          for (let i = 0; i < tasks.length; i++) {
            for (let j = i + 1; j < tasks.length; j++) {
              const pair = [tasks[i], tasks[j]].sort().join('-');
              if (!taskPairCounts[pair]) {
                taskPairCounts[pair] = { tasks: [tasks[i], tasks[j]], frequency: 0 };
              }
              taskPairCounts[pair].frequency++;
            }
          }
        }
      }
    });

    return Object.values(taskPairCounts)
      .filter(pair => pair.frequency >= 2)
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 3);
  };

  const findOverloadedGroups = () => {
    const groupStats: Record<string, { workers: string[], totalLoad: number, count: number }> = {};
    
    data.workers.forEach(worker => {
      const group = worker.WorkerGroup || 'Other';
      if (!groupStats[group]) {
        groupStats[group] = { workers: [], totalLoad: 0, count: 0 };
      }
      groupStats[group].workers.push(worker.WorkerID);
      groupStats[group].totalLoad += worker.MaxLoadPerPhase || 0;
      groupStats[group].count++;
    });

    return Object.entries(groupStats)
      .map(([groupName, stats]) => ({
        name: groupName,
        workers: stats.workers,
        avgLoad: stats.totalLoad / stats.count,
        suggestedLimit: Math.max(1, Math.floor((stats.totalLoad / stats.count) * 0.8))
      }))
      .filter(group => group.avgLoad > 4)
      .slice(0, 2);
  };

  const findPhaseConflicts = () => {
    return data.tasks
      .filter(task => task.Duration > 3)
      .slice(0, 2)
      .map(task => ({
        taskId: task.TaskID,
        reasoning: `Long duration task (${task.Duration} phases) should be restricted to optimize scheduling`,
        suggestedPhases: [1, 2, 3]
      }));
  };

  const handleAcceptSuggestion = async (suggestion: RuleSuggestion) => {
    const newRule: BusinessRule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: suggestion.type,
      name: suggestion.title,
      description: suggestion.description,
      parameters: suggestion.parameters,
      isActive: true,
      createdAt: new Date()
    };

    onRuleAccept(newRule);
    setAcceptedSuggestions(prev => new Set([...prev, suggestion.id]));
  };

  const handleRejectSuggestion = (suggestionId: string) => {
    setRejectedSuggestions(prev => new Set([...prev, suggestionId]));
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPatternIcon = (pattern: string) => {
    switch (pattern) {
      case 'frequent_co_requests': return <FileText className="w-4 h-4 text-purple-500" />;
      case 'workload_imbalance': return <Briefcase className="w-4 h-4 text-orange-500" />;
      case 'phase_optimization': return <Settings className="w-4 h-4 text-blue-500" />;
      default: return <Lightbulb className="w-4 h-4 text-yellow-500" />;
    }
  };

  const activeSuggestions = suggestions.filter(s => 
    !acceptedSuggestions.has(s.id) && !rejectedSuggestions.has(s.id)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-500" />
          AI Rule Recommendations
          {activeSuggestions.length > 0 && (
            <Badge variant="secondary">{activeSuggestions.length} suggestions</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Analysis Button */}
        {!isAnalyzing && suggestions.length === 0 && (
          <div className="text-center py-6">
            <Lightbulb className="w-12 h-12 mx-auto mb-3 text-yellow-500" />
            <h3 className="font-medium mb-2">Discover Hidden Patterns</h3>
            <p className="text-sm text-gray-600 mb-4">
              Let AI analyze your data to suggest optimal business rules
            </p>
            <Button onClick={handleAnalyzePatterns} className="bg-blue-600 hover:bg-blue-700">
              <TrendingUp className="w-4 h-4 mr-2" />
              Analyze Data Patterns
            </Button>
          </div>
        )}

        {/* Analysis Progress */}
        {isAnalyzing && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              <span className="text-sm font-medium">AI is analyzing your data patterns...</span>
            </div>
            <Progress value={analysisProgress} />
            <div className="text-xs text-gray-600 text-center">
              {analysisProgress < 30 && "Examining task relationships..."}
              {analysisProgress >= 30 && analysisProgress < 60 && "Analyzing workload patterns..."}
              {analysisProgress >= 60 && analysisProgress < 90 && "Detecting optimization opportunities..."}
              {analysisProgress >= 90 && "Generating recommendations..."}
            </div>
          </div>
        )}

        {/* Suggestions List */}
        {activeSuggestions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Smart Recommendations</h3>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleAnalyzePatterns}
                disabled={isAnalyzing}
              >
                <TrendingUp className="w-3 h-3 mr-1" />
                Re-analyze
              </Button>
            </div>

            {activeSuggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-transparent"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    {getPatternIcon(suggestion.pattern)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm">{suggestion.title}</h4>
                        <Badge className={`text-xs ${getImpactColor(suggestion.impact)}`}>
                          {suggestion.impact} impact
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {Math.round(suggestion.confidence)}% confident
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{suggestion.description}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Lightbulb className="w-3 h-3" />
                        <span>{suggestion.reasoning}</span>
                      </div>
                      {suggestion.affectedEntities.length > 0 && (
                        <div className="mt-2 flex items-center gap-1">
                          <span className="text-xs text-gray-500">Affects:</span>
                          {suggestion.affectedEntities.slice(0, 3).map(entity => (
                            <Badge key={entity} variant="outline" className="text-xs">
                              {entity}
                            </Badge>
                          ))}
                          {suggestion.affectedEntities.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{suggestion.affectedEntities.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleAcceptSuggestion(suggestion)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <ThumbsUp className="w-3 h-3 mr-1" />
                    Accept Rule
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRejectSuggestion(suggestion.id)}
                  >
                    <ThumbsDown className="w-3 h-3 mr-1" />
                    Dismiss
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary Stats */}
        {suggestions.length > 0 && (
          <div className="grid grid-cols-3 gap-3 text-center pt-4 border-t">
            <div className="p-2">
              <div className="text-lg font-bold text-green-600">{acceptedSuggestions.size}</div>
              <div className="text-xs text-gray-600">Accepted</div>
            </div>
            <div className="p-2">
              <div className="text-lg font-bold text-blue-600">{activeSuggestions.length}</div>
              <div className="text-xs text-gray-600">Pending</div>
            </div>
            <div className="p-2">
              <div className="text-lg font-bold text-gray-600">{rejectedSuggestions.size}</div>
              <div className="text-xs text-gray-600">Dismissed</div>
            </div>
          </div>
        )}

        {/* No Suggestions State */}
        {!isAnalyzing && suggestions.length > 0 && activeSuggestions.length === 0 && (
          <div className="text-center py-6 bg-green-50 rounded-lg">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
            <h3 className="font-medium text-green-700 mb-1">All Set!</h3>
            <p className="text-sm text-gray-600">
              You've reviewed all AI recommendations for this dataset.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

