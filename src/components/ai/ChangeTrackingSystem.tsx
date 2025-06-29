'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Undo2, 
  CheckCircle, 
  Eye, 
  Clock,
  ArrowRight,
  Users,
  Briefcase,
  FileText,
  X
} from 'lucide-react';

interface ChangeRecord {
  id: string;
  timestamp: number;
  action: string;
  entityType: 'clients' | 'workers' | 'tasks';
  affectedIds: string[];
  changes: Array<{
    entityId: string;
    field: string;
    oldValue: any;
    newValue: any;
    entityName?: string;
  }>;
  canUndo: boolean;
}

interface ChangeTrackingSystemProps {
  onUndo: (changeId: string) => void;
  onViewChanges: (entityType: 'clients' | 'workers' | 'tasks', entityIds: string[]) => void;
}

export function ChangeTrackingSystem({ onUndo, onViewChanges }: ChangeTrackingSystemProps) {
  const [recentChanges, setRecentChanges] = useState<ChangeRecord[]>([]);
  const [highlightedEntities, setHighlightedEntities] = useState<{
    [entityType: string]: Set<string>
  }>({
    clients: new Set(),
    workers: new Set(),
    tasks: new Set()
  });

  // Add a new change record
  const addChangeRecord = (changeRecord: Omit<ChangeRecord, 'id' | 'timestamp'>) => {
    const newRecord: ChangeRecord = {
      ...changeRecord,
      id: Date.now().toString(),
      timestamp: Date.now()
    };

    setRecentChanges(prev => [newRecord, ...prev.slice(0, 9)]); // Keep last 10 changes
    
    // Highlight the affected entities
    setHighlightedEntities(prev => ({
      ...prev,
      [changeRecord.entityType]: new Set([
        ...prev[changeRecord.entityType],
        ...changeRecord.affectedIds
      ])
    }));

    // Auto-remove highlights after 10 seconds
    setTimeout(() => {
      setHighlightedEntities(prev => ({
        ...prev,
        [changeRecord.entityType]: new Set()
      }));
    }, 10000);
  };

  const handleUndo = (changeId: string) => {
    const change = recentChanges.find(c => c.id === changeId);
    if (change) {
      onUndo(changeId);
      setRecentChanges(prev => prev.map(c => 
        c.id === changeId ? { ...c, canUndo: false } : c
      ));
    }
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'clients': return <Users className="w-3 h-3 text-blue-500" />;
      case 'workers': return <Briefcase className="w-3 h-3 text-green-500" />;
      case 'tasks': return <FileText className="w-3 h-3 text-purple-500" />;
      default: return null;
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  // Export the addChangeRecord function for external use
  useEffect(() => {
    (window as any).addChangeRecord = addChangeRecord;
    return () => {
      delete (window as any).addChangeRecord;
    };
  }, []);

  if (recentChanges.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4" />
            Recent Changes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-gray-500 text-center py-4">
            No recent changes to track
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Recent Changes
          </div>
          <Badge variant="secondary" className="text-xs">
            {recentChanges.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-80">
          <div className="space-y-3">
            {recentChanges.map((change) => (
              <div key={change.id} className="p-3 border rounded-lg bg-gradient-to-r from-green-50 to-transparent">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getEntityIcon(change.entityType)}
                    <div>
                      <div className="font-medium text-xs">{change.action}</div>
                      <div className="text-xs text-gray-500">
                        {formatTimeAgo(change.timestamp)}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onViewChanges(change.entityType, change.affectedIds)}
                      className="h-6 px-2 text-xs"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View
                    </Button>
                    {change.canUndo && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUndo(change.id)}
                        className="h-6 px-2 text-xs text-orange-600 hover:text-orange-700"
                      >
                        <Undo2 className="w-3 h-3 mr-1" />
                        Undo
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="text-xs">
                      {change.entityType}
                    </Badge>
                    <span className="text-gray-600">
                      Modified {change.affectedIds.length} records
                    </span>
                  </div>

                  {/* Show first few changes as preview */}
                  {change.changes.slice(0, 3).map((item, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs bg-white p-2 rounded border">
                      <span className="font-mono text-blue-600">{item.entityId}</span>
                      <span className="text-gray-500">{item.field}:</span>
                      <span className="bg-red-50 px-1 rounded">{String(item.oldValue).slice(0, 20)}</span>
                      <ArrowRight className="w-3 h-3 text-gray-400" />
                      <span className="bg-green-50 px-1 rounded font-medium">{String(item.newValue).slice(0, 20)}</span>
                    </div>
                  ))}

                  {change.changes.length > 3 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{change.changes.length - 3} more changes
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// Enhanced DataGrid with Change Highlighting
// Add this to your DataGrid component:

// interface HighlightedDataGridProps extends DataGridProps {
//   highlightedIds?: Set<string>;
//   recentChanges?: Array<{entityId: string, field: string, timestamp: number}>;
// }

// // In DataGrid render:
// const isHighlighted = highlightedIds?.has(row[idField]);
// const recentFieldChanges = recentChanges?.filter(c => c.entityId === row[idField]);

// // Add these classes to table rows:
// className={`${
//   isHighlighted ? 'bg-green-100 border-green-300 animate-pulse' : ''
//   hasRowErrors ? 'bg-red-50 border-red-200' : ''
// } hover:bg-gray-50 transition-colors`}

// // Add field-level highlighting:
// const hasRecentChange = recentFieldChanges?.some(c => 
//   c.field === column.key && Date.now() - c.timestamp < 5000
// );

// className={`${
//   hasRecentChange ? 'bg-yellow-100 border-yellow-300' : ''
//   hasError ? 'border-red-500' : hasWarning ? 'border-yellow-500' : ''
// }`}