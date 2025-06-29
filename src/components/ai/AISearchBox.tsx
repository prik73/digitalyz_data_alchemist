'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {Search, Sparkles, Loader2, Users, Briefcase, FileText, X, Filter, Clock} from 'lucide-react';
import type { SearchResult } from '@/types';

interface AISearchProps {
  data: {
    clients: any[];
    workers: any[];
    tasks: any[];
  };
  onResultsSelect: (results: SearchResult[]) => void;
}

export default function AISearchBox({ data, onResultsSelect }: AISearchProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'React developers available in phase 2',
    'High priority clients with incomplete tasks',
    'Python developers in GroupA',
    'Tasks requiring ML skills',
    'Workers with qualification level > 8'
  ]);

  // Smart search algorithm that interprets natural language
  const interpretAndSearch = useCallback(async (searchQuery: string) => {
    setIsSearching(true);
    
    try {
      // Simulate AI processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const results: SearchResult[] = [];
      const lowerQuery = searchQuery.toLowerCase();
      
      // Skill-based searches
      if (lowerQuery.includes('react') || lowerQuery.includes('frontend')) {
        const reactWorkers = data.workers.filter(worker => 
          worker.Skills?.toLowerCase().includes('react')
        );
        reactWorkers.forEach(worker => {
          results.push({
            entityType: 'workers',
            entityId: worker.WorkerID,
            entityData: worker,
            matchReason: 'Has React skills',
            relevanceScore: 0.9
          });
        });
        
        const reactTasks = data.tasks.filter(task => 
          task.RequiredSkills?.toLowerCase().includes('react')
        );
        reactTasks.forEach(task => {
          results.push({
            entityType: 'tasks',
            entityId: task.TaskID,
            entityData: task,
            matchReason: 'Requires React skills',
            relevanceScore: 0.8
          });
        });
      }
      
      // Python/Backend searches
      if (lowerQuery.includes('python') || lowerQuery.includes('backend')) {
        const pythonWorkers = data.workers.filter(worker => 
          worker.Skills?.toLowerCase().includes('python')
        );
        pythonWorkers.forEach(worker => {
          results.push({
            entityType: 'workers',
            entityId: worker.WorkerID,
            entityData: worker,
            matchReason: 'Has Python skills',
            relevanceScore: 0.9
          });
        });
      }
      
      // ML/AI searches
      if (lowerQuery.includes('ml') || lowerQuery.includes('machine learning') || lowerQuery.includes('ai')) {
        const mlWorkers = data.workers.filter(worker => 
          worker.Skills?.toLowerCase().includes('ml') || 
          worker.Skills?.toLowerCase().includes('tensorflow') ||
          worker.WorkerGroup?.toLowerCase().includes('datascience')
        );
        mlWorkers.forEach(worker => {
          results.push({
            entityType: 'workers',
            entityId: worker.WorkerID,
            entityData: worker,
            matchReason: 'Has ML/AI skills',
            relevanceScore: 0.95
          });
        });
        
        const mlTasks = data.tasks.filter(task => 
          task.RequiredSkills?.toLowerCase().includes('ml') ||
          task.RequiredSkills?.toLowerCase().includes('ai') ||
          task.Category?.toLowerCase().includes('ml')
        );
        mlTasks.forEach(task => {
          results.push({
            entityType: 'tasks',
            entityId: task.TaskID,
            entityData: task,
            matchReason: 'Requires ML/AI skills',
            relevanceScore: 0.9
          });
        });
      }
      
      // Phase-based searches
      const phaseMatch = lowerQuery.match(/phase\s*(\d+)/);
      if (phaseMatch) {
        const phaseNum = parseInt(phaseMatch[1]);
        
        const workersInPhase = data.workers.filter(worker => {
          try {
            const slots = JSON.parse(worker.AvailableSlots || '[]');
            return slots.includes(phaseNum);
          } catch {
            return false;
          }
        });
        
        workersInPhase.forEach(worker => {
          results.push({
            entityType: 'workers',
            entityId: worker.WorkerID,
            entityData: worker,
            matchReason: `Available in phase ${phaseNum}`,
            relevanceScore: 0.85
          });
        });
        
        const tasksInPhase = data.tasks.filter(task => {
          const preferredPhases = task.PreferredPhases || '';
          return preferredPhases.includes(phaseNum.toString());
        });
        
        tasksInPhase.forEach(task => {
          results.push({
            entityType: 'tasks',
            entityId: task.TaskID,
            entityData: task,
            matchReason: `Preferred in phase ${phaseNum}`,
            relevanceScore: 0.8
          });
        });
      }
      
      // Priority searches
      if (lowerQuery.includes('high priority') || lowerQuery.includes('priority 5') || lowerQuery.includes('priority 4')) {
        const highPriorityClients = data.clients.filter(client => 
          client.PriorityLevel >= 4
        );
        highPriorityClients.forEach(client => {
          results.push({
            entityType: 'clients',
            entityId: client.ClientID,
            entityData: client,
            matchReason: `High priority (Level ${client.PriorityLevel})`,
            relevanceScore: 0.9
          });
        });
      }
      
      // Group searches
      const groupMatch = lowerQuery.match(/group\s*([abc])/i);
      if (groupMatch) {
        const groupName = `Group${groupMatch[1].toUpperCase()}`;
        
        const clientsInGroup = data.clients.filter(client => 
          client.GroupTag === groupName
        );
        clientsInGroup.forEach(client => {
          results.push({
            entityType: 'clients',
            entityId: client.ClientID,
            entityData: client,
            matchReason: `Member of ${groupName}`,
            relevanceScore: 0.8
          });
        });
        
        const workersInGroup = data.workers.filter(worker => 
          worker.WorkerGroup === groupName.replace('Group', '')
        );
        workersInGroup.forEach(worker => {
          results.push({
            entityType: 'workers',
            entityId: worker.WorkerID,
            entityData: worker,
            matchReason: `Member of ${groupName}`,
            relevanceScore: 0.8
          });
        });
      }
      
      // Qualification level searches
      const qualMatch = lowerQuery.match(/qualification.*?(\d+)/);
      if (qualMatch || lowerQuery.includes('senior') || lowerQuery.includes('expert')) {
        const minQual = qualMatch ? parseInt(qualMatch[1]) : 8;
        const qualifiedWorkers = data.workers.filter(worker => 
          (worker.QualificationLevel || 0) >= minQual
        );
        qualifiedWorkers.forEach(worker => {
          results.push({
            entityType: 'workers',
            entityId: worker.WorkerID,
            entityData: worker,
            matchReason: `High qualification (Level ${worker.QualificationLevel})`,
            relevanceScore: 0.85
          });
        });
      }
      
      // Duration searches
      if (lowerQuery.includes('long') || lowerQuery.includes('duration > 3') || lowerQuery.includes('complex')) {
        const longTasks = data.tasks.filter(task => 
          (task.Duration || 0) > 3
        );
        longTasks.forEach(task => {
          results.push({
            entityType: 'tasks',
            entityId: task.TaskID,
            entityData: task,
            matchReason: `Long duration (${task.Duration} phases)`,
            relevanceScore: 0.8
          });
        });
      }
      
      // General text search as fallback
      if (results.length === 0) {
        const searchInEntity = (entity: any, type: 'clients' | 'workers' | 'tasks') => {
          const searchText = Object.values(entity).join(' ').toLowerCase();
          if (searchText.includes(lowerQuery)) {
            const idField = `${type.slice(0, -1).charAt(0).toUpperCase() + type.slice(1, -1)}ID`;
            results.push({
              entityType: type,
              entityId: entity[idField],
              entityData: entity,
              matchReason: 'Text match in entity data',
              relevanceScore: 0.6
            });
          }
        };
        
        data.clients.forEach(client => searchInEntity(client, 'clients'));
        data.workers.forEach(worker => searchInEntity(worker, 'workers'));
        data.tasks.forEach(task => searchInEntity(task, 'tasks'));
      }
      
      // Sort by relevance score
      results.sort((a, b) => b.relevanceScore - a.relevanceScore);
      
      setResults(results.slice(0, 20)); // Limit to top 20 results
      
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [data]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    // Add to recent searches
    setRecentSearches(prev => {
      const updated = [query, ...prev.filter(s => s !== query)];
      return updated.slice(0, 5);
    });
    
    await interpretAndSearch(query);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const clearResults = () => {
    setResults([]);
    setQuery('');
  };

  const selectResults = () => {
    onResultsSelect(results);
  };

  const getEntityIcon = (entityType: 'clients' | 'workers' | 'tasks') => {
    switch (entityType) {
      case 'clients':
        return <Users className="w-4 h-4 text-blue-500" />;
      case 'workers':
        return <Briefcase className="w-4 h-4 text-green-500" />;
      case 'tasks':
        return <FileText className="w-4 h-4 text-purple-500" />;
    }
  };

  const getEntityColor = (entityType: 'clients' | 'workers' | 'tasks') => {
    switch (entityType) {
      case 'clients':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'workers':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'tasks':
        return 'bg-purple-100 text-purple-800 border-purple-200';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-500" />
          AI Search
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Ask anything: 'React developers in phase 2'"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-10"
            />
          </div>
          <Button 
            onClick={handleSearch} 
            disabled={!query.trim() || isSearching}
            className="flex-shrink-0"
          >
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Recent Searches */}
        {results.length === 0 && !isSearching && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              Try these searches:
            </div>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((search, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setQuery(search);
                    interpretAndSearch(search);
                  }}
                  className="text-xs"
                >
                  {search}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Search Results */}
        {results.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">
                  Found {results.length} results
                </span>
                <Badge variant="secondary">
                  {results.filter(r => r.entityType === 'clients').length} clients,{' '}
                  {results.filter(r => r.entityType === 'workers').length} workers,{' '}
                  {results.filter(r => r.entityType === 'tasks').length} tasks
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={selectResults}>
                  <Filter className="w-4 h-4 mr-1" />
                  Filter View
                </Button>
                <Button size="sm" variant="outline" onClick={clearResults}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 border rounded-lg ${getEntityColor(result.entityType)}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      {getEntityIcon(result.entityType)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {result.entityData.ClientName || 
                             result.entityData.WorkerName || 
                             result.entityData.TaskName}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {result.entityId}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 mb-1">
                          {result.matchReason}
                        </p>
                        <div className="text-xs space-y-1">
                          {result.entityType === 'workers' && (
                            <div>Skills: {result.entityData.Skills}</div>
                          )}
                          {result.entityType === 'tasks' && (
                            <div>Required: {result.entityData.RequiredSkills}</div>
                          )}
                          {result.entityType === 'clients' && (
                            <div>Priority: {result.entityData.PriorityLevel}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-gray-500">
                        {Math.round(result.relevanceScore * 100)}% match
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Results */}
        {!isSearching && results.length === 0 && query && (
          <div className="text-center py-6 text-gray-500">
            <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>No results found for "{query}"</p>
            <p className="text-sm">Try a different search or check the suggestions above</p>
          </div>
        )}

        {/* Loading State */}
        {isSearching && (
          <div className="text-center py-6">
            <Loader2 className="w-8 h-8 mx-auto mb-2 text-blue-500 animate-spin" />
            <p className="text-gray-600">AI is analyzing your query...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}