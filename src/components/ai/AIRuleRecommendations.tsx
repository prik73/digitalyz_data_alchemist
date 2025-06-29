// components/ai/AIRuleRecommendations.tsx - FINAL COMPLETE VERSION
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
  Settings,
  RefreshCw,
  Database
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
  onDataChange: (entityType: 'clients' | 'workers' | 'tasks', newData: any[]) => void;
  onAnalysisComplete?: (suggestions: RuleSuggestion[]) => void;
}

export default function AIRuleRecommendations({
  data,
  currentRules,
  onRuleAccept,
  onDataChange,
  onAnalysisComplete
}: AIRuleRecommendationsProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<RuleSuggestion[]>([]);
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<Set<string>>(new Set());
  const [rejectedSuggestions, setRejectedSuggestions] = useState<Set<string>>(new Set());
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [usedFallback, setUsedFallback] = useState(false);

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
    setUsedFallback(false);
    
    try {
      // Simulate analysis steps with progress
      const progressSteps = [10, 30, 50, 70, 90, 100];
      for (const step of progressSteps) {
        await new Promise(resolve => setTimeout(resolve, 400));
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
      setUsedFallback(result.usedFallback || false);
      
      if (onAnalysisComplete) {
        onAnalysisComplete(result.suggestions || []);
      }

      console.log('✅ AI Analysis complete:', result.suggestions?.length || 0, 'suggestions');

    } catch (error) {
      console.error('Error analyzing patterns:', error);
      // If API fails completely, use local fallback
      const localSuggestions = analyzeLocalPatterns();
      setSuggestions(localSuggestions);
      setUsedFallback(true);
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(0);
    }
  };

  // 🔥 APPLY RULES TO ACTUAL DATA when accepted
  const handleAcceptSuggestion = async (suggestion: RuleSuggestion) => {
    try {
      // 1. Create the business rule object
      const newRule: BusinessRule = {
        id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: suggestion.type,
        name: suggestion.title,
        description: suggestion.description,
        parameters: suggestion.parameters,
        isActive: true,
        createdAt: new Date()
      };

      // 2. Add rule to rules collection
      onRuleAccept(newRule);

      // 🔥 3. APPLY RULE TO ACTUAL DATA (This was missing!)
      applyRuleToData(suggestion);
      
      // 4. Mark as accepted
      setAcceptedSuggestions(prev => new Set([...prev, suggestion.id]));

      console.log('✅ Rule accepted and applied:', suggestion.title);

    } catch (error) {
      console.error('Error accepting suggestion:', error);
      alert('Failed to apply rule. Please try again.');
    }
  };

  // 🔥 CORE FUNCTION: Apply rules to modify actual data
  const applyRuleToData = (suggestion: RuleSuggestion) => {
    switch (suggestion.type) {
      case 'coRun':
        // Add co-run metadata to tasks
        const taskIds = suggestion.parameters.taskIds || [];
        if (taskIds.length >= 2) {
          const updatedTasks = data.tasks.map(task => {
            if (taskIds.includes(task.TaskID)) {
              return {
                ...task,
                CoRunGroup: taskIds.join(','),
                RuleApplied: suggestion.title,
                LastModified: new Date().toISOString()
              };
            }
            return task;
          });
          onDataChange('tasks', updatedTasks);
          console.log(`✅ Applied co-run rule to tasks: ${taskIds.join(', ')}`);
        }
        break;

      case 'loadLimit':
        // Reduce MaxLoadPerPhase for affected workers
        const workerGroup = suggestion.parameters.workerGroup;
        const maxLoad = suggestion.parameters.maxSlotsPerPhase;
        
        const updatedWorkers = data.workers.map(worker => {
          if (worker.WorkerGroup === workerGroup && (worker.MaxLoadPerPhase || 0) > maxLoad) {
            console.log(`🔧 Reducing ${worker.WorkerID} load from ${worker.MaxLoadPerPhase} to ${maxLoad}`);
            return {
              ...worker,
              MaxLoadPerPhase: maxLoad,
              RuleApplied: suggestion.title,
              PreviousMaxLoad: worker.MaxLoadPerPhase, // Keep history
              LastModified: new Date().toISOString()
            };
          }
          return worker;
        });
        
        onDataChange('workers', updatedWorkers);
        console.log(`✅ Applied load limit to ${workerGroup}: max ${maxLoad} tasks/phase`);
        break;

      case 'phaseWindow':
        // Add phase restrictions to tasks
        const taskId = suggestion.parameters.taskId;
        const allowedPhases = suggestion.parameters.allowedPhases;
        
        const updatedTasksPhase = data.tasks.map(task => {
          if (task.TaskID === taskId) {
            console.log(`🔧 Restricting ${taskId} to phases: ${allowedPhases.join(',')}`);
            return {
              ...task,
              PreferredPhases: JSON.stringify(allowedPhases),
              RuleApplied: suggestion.title,
              PreviousPhases: task.PreferredPhases, // Keep history
              LastModified: new Date().toISOString()
            };
          }
          return task;
        });
        
        onDataChange('tasks', updatedTasksPhase);
        console.log(`✅ Applied phase window to ${taskId}: phases ${allowedPhases.join(',')}`);
        break;

      case 'slotRestriction':
        // Add slot restriction metadata to clients
        const clientGroup = suggestion.parameters.clientGroup;
        const minSlots = suggestion.parameters.minCommonSlots;
        
        const updatedClients = data.clients.map(client => {
          if (client.GroupTag === clientGroup) {
            return {
              ...client,
              MinCommonSlots: minSlots,
              RuleApplied: suggestion.title,
              LastModified: new Date().toISOString()
            };
          }
          return client;
        });
        
        onDataChange('clients', updatedClients);
        console.log(`✅ Applied slot restriction to ${clientGroup}: min ${minSlots} slots`);
        break;

      default:
        console.warn('Unknown rule type:', suggestion.type);
    }
  };

  const handleRejectSuggestion = (suggestionId: string) => {
    setRejectedSuggestions(prev => new Set([...prev, suggestionId]));
    console.log('❌ Suggestion rejected:', suggestionId);
  };

  // Local pattern analysis fallback
  const analyzeLocalPatterns = (): RuleSuggestion[] => {
    const suggestions: RuleSuggestion[] = [];

    // 1. Frequent task pairs (co-run opportunities)
    const taskPairs = findFrequentTaskPairs();
    if (taskPairs.length > 0) {
      taskPairs.forEach((pair, index) => {
        suggestions.push({
          id: `local_corun_${index}`,
          type: 'coRun',
          title: `Co-run Tasks ${pair.tasks.join(' & ')}`,
          description: `These tasks are requested together by ${pair.frequency} clients`,
          reasoning: `${pair.frequency} out of ${data.clients.length} clients (${Math.round(pair.frequency/data.clients.length*100)}%) request these tasks together`,
          confidence: Math.min(95, 60 + (pair.frequency / data.clients.length) * 35),
          impact: pair.frequency >= 3 ? 'high' : 'medium',
          parameters: { taskIds: pair.tasks },
          affectedEntities: pair.tasks,
          pattern: 'frequent_co_requests'
        });
      });
    }

    // 2. Overloaded worker groups (load limit opportunities)
    const overloadedGroups = findOverloadedGroups();
    overloadedGroups.forEach((group, index) => {
      suggestions.push({
        id: `local_load_${index}`,
        type: 'loadLimit',
        title: `Load Limit for ${group.name}`,
        description: `${group.name} workers are handling high workloads`,
        reasoning: `Average load is ${group.avgLoad.toFixed(1)}, suggested limit: ${group.suggestedLimit}`,
        confidence: 85,
        impact: group.avgLoad > 6 ? 'high' : 'medium',
        parameters: {
          workerGroup: group.name,
          maxSlotsPerPhase: group.suggestedLimit
        },
        affectedEntities: group.workers,
        pattern: 'workload_imbalance'
      });
    });

    // 3. Long-duration tasks (phase window opportunities)
    const longTasks = data.tasks.filter(task => (task.Duration || 1) > 3).slice(0, 2);
    longTasks.forEach((task, index) => {
      suggestions.push({
        id: `local_phase_${index}`,
        type: 'phaseWindow',
        title: `Phase Window for ${task.TaskID}`,
        description: `Long-duration task should be phase-restricted`,
        reasoning: `Task duration is ${task.Duration} phases, recommend restricting to early phases`,
        confidence: 75,
        impact: 'medium',
        parameters: {
          taskId: task.TaskID,
          allowedPhases: [1, 2, 3]
        },
        affectedEntities: [task.TaskID],
        pattern: 'duration_optimization'
      });
    });

    return suggestions.slice(0, 4); // Limit to top 4 suggestions
  };

  const findFrequentTaskPairs = () => {
    const taskPairCounts: Record<string, { tasks: string[], frequency: number }> = {};
    
    data.clients.forEach(client => {
      if (client.RequestedTaskIDs) {
        const tasks = client.RequestedTaskIDs.split(',').map((id: string) => id.trim()).filter(Boolean);
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
      case 'duration_optimization': 
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
          {usedFallback && (
            <Badge variant="outline" className="text-xs text-orange-600">
              Local Analysis
            </Badge>
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
                <RefreshCw className="w-3 h-3 mr-1" />
                Re-analyze
              </Button>
            </div>

            {activeSuggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-transparent hover:from-blue-100 transition-colors"
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
                      <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                        <Lightbulb className="w-3 h-3" />
                        <span>{suggestion.reasoning}</span>
                      </div>
                      {suggestion.affectedEntities.length > 0 && (
                        <div className="flex items-center gap-1 mb-2">
                          <Database className="w-3 h-3 text-gray-500" />
                          <span className="text-xs text-gray-500">Will modify:</span>
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
                    Accept & Apply Rule
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
              <div className="text-xs text-gray-600">Accepted & Applied</div>
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

        {/* All Reviewed State */}
        {!isAnalyzing && suggestions.length > 0 && activeSuggestions.length === 0 && (
          <div className="text-center py-6 bg-green-50 rounded-lg">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
            <h3 className="font-medium text-green-700 mb-1">All Recommendations Reviewed!</h3>
            <p className="text-sm text-gray-600 mb-3">
              You've processed all AI suggestions for this dataset.
            </p>
            <p className="text-xs text-blue-600">
              💡 Accepted rules have been applied to your data and will be included in exports.
            </p>
          </div>
        )}

        {/* Applied Rules Notice */}
        {acceptedSuggestions.size > 0 && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">
                {acceptedSuggestions.size} rule{acceptedSuggestions.size > 1 ? 's' : ''} applied to your data
              </span>
            </div>
            <p className="text-xs text-green-700 mt-1">
              Check the affected data tabs to see changes. All modifications will be included in your exports.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}