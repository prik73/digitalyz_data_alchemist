'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CheckCircle, 
  X, 
  ArrowRight, 
  Undo2, 
  AlertTriangle,
  Users,
  Briefcase,
  FileText
} from 'lucide-react';

interface ChangePreview {
  entityId: string;
  entityType: 'clients' | 'workers' | 'tasks';
  field: string;
  oldValue: any;
  newValue: any;
  entityName?: string;
}

interface ChangePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  changes: ChangePreview[];
  action: string;
  isProcessing?: boolean;
}

export function ChangePreviewModal({
  isOpen,
  onClose,
  onConfirm,
  onCancel,
  changes,
  action,
  isProcessing = false
}: ChangePreviewModalProps) {
  const [showAllChanges, setShowAllChanges] = useState(false);
  
  const groupedChanges = changes.reduce((acc, change) => {
    if (!acc[change.entityType]) {
      acc[change.entityType] = [];
    }
    acc[change.entityType].push(change);
    return acc;
  }, {} as Record<string, ChangePreview[]>);

  const displayedChanges = showAllChanges ? changes : changes.slice(0, 10);

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'clients': return <Users className="w-4 h-4 text-blue-500" />;
      case 'workers': return <Briefcase className="w-4 h-4 text-green-500" />;
      case 'tasks': return <FileText className="w-4 h-4 text-purple-500" />;
      default: return null;
    }
  };

  const formatValue = (value: any) => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'object') return JSON.stringify(value);
    if (typeof value === 'string' && value.length > 50) {
      return value.substring(0, 50) + '...';
    }
    return value.toString();
  };

  const getChangeColor = (oldVal: any, newVal: any) => {
    if (typeof oldVal === 'number' && typeof newVal === 'number') {
      return newVal > oldVal ? 'text-green-600' : newVal < oldVal ? 'text-red-600' : 'text-gray-600';
    }
    return 'text-blue-600';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Confirm Changes
          </DialogTitle>
          <div className="text-sm text-gray-600">
            Action: <span className="font-medium">{action}</span>
          </div>
        </DialogHeader>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 my-4">
          {Object.entries(groupedChanges).map(([entityType, entityChanges]) => (
            <div key={entityType} className="flex items-center gap-2 p-3 bg-gray-50 rounded">
              {getEntityIcon(entityType)}
              <div>
                <div className="font-medium text-sm capitalize">{entityType}</div>
                <div className="text-xs text-gray-600">{entityChanges.length} changes</div>
              </div>
            </div>
          ))}
        </div>

        {/* Changes Table */}
        <ScrollArea className="max-h-96 border rounded">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Type</TableHead>
                <TableHead className="w-24">ID</TableHead>
                <TableHead className="w-32">Name</TableHead>
                <TableHead className="w-24">Field</TableHead>
                <TableHead className="w-32">Before</TableHead>
                <TableHead className="w-8"></TableHead>
                <TableHead className="w-32">After</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedChanges.map((change, index) => (
                <TableRow key={index} className="hover:bg-gray-50">
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {getEntityIcon(change.entityType)}
                      <Badge variant="outline" className="text-xs">
                        {change.entityType.slice(0, 1).toUpperCase()}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {change.entityId}
                  </TableCell>
                  <TableCell className="text-xs">
                    {change.entityName || '—'}
                  </TableCell>
                  <TableCell className="text-xs font-medium">
                    {change.field}
                  </TableCell>
                  <TableCell>
                    <div className="text-xs bg-red-50 px-2 py-1 rounded border">
                      {formatValue(change.oldValue)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <ArrowRight className="w-3 h-3 text-gray-400" />
                  </TableCell>
                  <TableCell>
                    <div className={`text-xs bg-green-50 px-2 py-1 rounded border ${
                      getChangeColor(change.oldValue, change.newValue)
                    }`}>
                      {formatValue(change.newValue)}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>

        {/* Show More Button */}
        {changes.length > 10 && !showAllChanges && (
          <div className="text-center">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowAllChanges(true)}
            >
              Show All {changes.length} Changes
            </Button>
          </div>
        )}

        {/* Warning if too many changes */}
        {changes.length > 50 && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">Large Change Set</span>
            </div>
            <p className="text-xs text-yellow-700 mt-1">
              This will modify {changes.length} records. Please review carefully before proceeding.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={onCancel}
            disabled={isProcessing}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button 
            onClick={onConfirm}
            disabled={isProcessing || changes.length === 0}
            className="bg-green-600 hover:bg-green-700"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Applying...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Apply {changes.length} Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Usage in NaturalLanguageDataModifier:
// const [previewChanges, setPreviewChanges] = useState<ChangePreview[]>([]);
// const [showPreview, setShowPreview] = useState(false);

// // Instead of applying immediately, calculate and show preview:
// const handlePreviewChanges = (plan: ModificationPlan) => {
//   const changes = calculateChanges(plan, currentData);
//   setPreviewChanges(changes);
//   setShowPreview(true);
// };

// const handleConfirmChanges = async () => {
//   // Apply the actual changes
//   await applyModification();
//   setShowPreview(false);
//   // Show success notification
// };