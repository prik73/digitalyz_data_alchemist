// components/data-ingestion/DataGrid.tsx - FULL WIDTH VERSION
'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {AlertTriangle, Plus, Trash2, Save, X, Edit3, Search} from 'lucide-react';

interface ValidationResult {
  type: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  entityType: 'clients' | 'workers' | 'tasks';
  entityId?: string;
  field?: string;
  suggestion?: string;
}

interface DataGridProps {
  data: any[];
  entityType: 'clients' | 'workers' | 'tasks';
  validationResults: ValidationResult[];
  onDataChange: (data: any[]) => void;
}

type RowData = Record<string, string | number | boolean>;

const DataGrid: React.FC<DataGridProps> = ({
  data,
  entityType,
  validationResults,
  onDataChange
}) => {
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editingData, setEditingData] = useState<RowData>({});
  const [searchQuery, setSearchQuery] = useState('');

  // Get column definitions based on entity type
  const getColumns = () => {
    switch (entityType) {
      case 'clients':
        return [
          { key: 'ClientID', label: 'ID', type: 'text', required: true, width: '10%' },
          { key: 'ClientName', label: 'Name', type: 'text', required: true, width: '20%' },
          { key: 'PriorityLevel', label: 'Priority', type: 'number', min: 1, max: 5, required: true, width: '10%' },
          { key: 'RequestedTaskIDs', label: 'Requested Tasks', type: 'text', required: true, width: '25%' },
          { key: 'GroupTag', label: 'Group', type: 'text', width: '15%' },
          { key: 'AttributesJSON', label: 'Attributes', type: 'json', width: '20%' }
        ];
      case 'workers':
        return [
          { key: 'WorkerID', label: 'ID', type: 'text', required: true, width: '8%' },
          { key: 'WorkerName', label: 'Name', type: 'text', required: true, width: '15%' },
          { key: 'Skills', label: 'Skills', type: 'text', required: true, width: '25%' },
          { key: 'AvailableSlots', label: 'Slots', type: 'json', required: true, width: '12%' },
          { key: 'MaxLoadPerPhase', label: 'Max Load', type: 'number', min: 1, required: true, width: '10%' },
          { key: 'WorkerGroup', label: 'Group', type: 'text', width: '12%' },
          { key: 'QualificationLevel', label: 'Qual', type: 'number', min: 1, max: 10, width: '8%' }
        ];
      case 'tasks':
        return [
          { key: 'TaskID', label: 'ID', type: 'text', required: true, width: '8%' },
          { key: 'TaskName', label: 'Name', type: 'text', required: true, width: '20%' },
          { key: 'Category', label: 'Category', type: 'text', width: '12%' },
          { key: 'Duration', label: 'Duration', type: 'number', min: 1, required: true, width: '10%' },
          { key: 'RequiredSkills', label: 'Required Skills', type: 'text', required: true, width: '25%' },
          { key: 'PreferredPhases', label: 'Phases', type: 'text', width: '12%' },
          { key: 'MaxConcurrent', label: 'Max Conc', type: 'number', min: 1, width: '8%' }
        ];
      default:
        return [];
    }
  };
  const columns = getColumns();

  // Filter data based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery) return data;

    return data.filter(row =>
      Object.values(row).some(value =>
        value?.toString().toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [data, searchQuery]);

  // Get validation errors for a specific cell
  const getCellValidation = (rowIndex: number, field: string) => {
    const row = data[rowIndex];
    const idField = `${entityType.slice(0, -1).charAt(0).toUpperCase() + entityType.slice(1, -1)}ID`;
    const entityId = row?.[idField];

    return validationResults.filter(
      result => result.entityId === entityId && result.field === field
    );
  };

  // Get validation errors for a row
  const getRowValidation = (rowIndex: number) => {
    const row = data[rowIndex];
    const idField = `${entityType.slice(0, -1).charAt(0).toUpperCase() + entityType.slice(1, -1)}ID`;
    const entityId = row?.[idField];

    return validationResults.filter(result => result.entityId === entityId);
  };

  const startEditing = (rowIndex: number) => {
    setEditingRow(rowIndex);
    setEditingData({ ...data[rowIndex] });
  };

  const cancelEditing = () => {
    setEditingRow(null);
    setEditingData({});
  };

  const saveEdit = () => {
    if (editingRow === null) return;

    const newData = [...data];
    newData[editingRow] = editingData;
    onDataChange(newData);
    setEditingRow(null);
    setEditingData({});
  };

  const deleteRow = (rowIndex: number) => {
    const newData = data.filter((_, index) => index !== rowIndex);
    onDataChange(newData);
  };

  const addNewRow = () => {
    const newRow: any = {};
    columns.forEach(column => {
      if (column.type === 'number') {
        newRow[column.key] = column.min || 0;
      } else if (column.type === 'json') {
        newRow[column.key] = column.key === 'AvailableSlots' ? '[1,2,3]' : '{}';
      } else {
        newRow[column.key] = '';
      }
    });

    // Generate unique ID
    const idField = columns[0].key;
    const prefix = entityType.slice(0, 1).toUpperCase();
    const existingIds = data.map(row => row[idField]).filter(Boolean);
    let newId = 1;
    while (existingIds.includes(`${prefix}${newId}`)) {
      newId++;
    }
    newRow[idField] = `${prefix}${newId}`;

    const newData = [...data, newRow];
    onDataChange(newData);
    setEditingRow(newData.length - 1);
    setEditingData(newRow);
  };
   const handleInputChange = (field: string, value: any) => {
    setEditingData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const renderCellContent = (row: any, column: any, rowIndex: number) => {
    const cellValidations = getCellValidation(rowIndex, column.key);
    const hasError = cellValidations.some(v => v.severity === 'error');
    const hasWarning = cellValidations.some(v => v.severity === 'warning');

    if (editingRow === rowIndex) {
      // Editing mode - FULL WIDTH INPUT
      return (
        <div className="space-y-1 w-full">
          <Input
            value={
                typeof editingData[column.key] === 'boolean'
                    ? editingData[column.key] ? 'true' : 'false'
                    : (editingData[column.key] as string | number | undefined) ?? ''
                }
            onChange={(e) => handleInputChange(column.key, e.target.value)}
            type={column.type === 'number' ? 'number' : 'text'}
            min={column.min}
            max={column.max}
            className={`w-full text-xs ${hasError ? 'border-red-500' : hasWarning ? 'border-yellow-500' : ''}`}
          />
          {cellValidations.length > 0 && (
            <div className="text-xs space-y-1">
              {cellValidations.map((validation, idx) => (
                <div
                  key={idx}
                  className={`${
                    validation.severity === 'error' ? 'text-red-600' : 'text-yellow-600'
                  }`}
                >
                  {validation.message}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Display mode - TRUNCATED FOR SPACE
    let displayValue = row[column.key];
    
    // Format JSON display
    if (column.type === 'json' && displayValue) {
      try {
        displayValue = JSON.stringify(JSON.parse(displayValue));
      } catch (e) {
        // Keep original value if not valid JSON
      }
    }

    // Smart truncation based on column width
    const maxLength = column.width === '25%' ? 40 : column.width === '20%' ? 30 : column.width === '15%' ? 20 : 15;
    if (typeof displayValue === 'string' && displayValue.length > maxLength) {
      displayValue = displayValue.substring(0, maxLength) + '...';
    }

    return (
      <div className="space-y-1 w-full">
        <div
          className={`text-xs break-words ${
            hasError ? 'bg-red-50 text-red-700 border border-red-200 px-1 py-1 rounded' :
            hasWarning ? 'bg-yellow-50 text-yellow-700 border border-yellow-200 px-1 py-1 rounded' :
            ''
          }`}
          title={row[column.key]} // Show full value on hover
        >
          {displayValue || <span className="text-gray-400">—</span>}
        </div>
        {cellValidations.length > 0 && (
          <div className="flex items-center gap-1">
            <AlertTriangle className="w-2 h-2 text-red-500" />
            <span className="text-xs text-red-600">
              {cellValidations.length}
            </span>
          </div>
        )}
      </div>
    );
  };

if (!data || data.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="capitalize">{entityType}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <p>No data uploaded yet</p>
            <p className="text-sm">Upload a CSV or Excel file to get started</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="capitalize flex items-center gap-2 text-lg">
              {entityType}
              <Badge variant="secondary">{data.length} rows</Badge>
              {validationResults.length > 0 && (
                <Badge variant="destructive">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {validationResults.filter(v => v.severity === 'error').length} errors
                </Badge>
              )}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search data..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-48 text-sm"
              />
            </div>
            <Button onClick={addNewRow} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        {/* FULL-WIDTH TABLE WITH FIXED WIDTHS */}
        <div className="h-full overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-white z-10">
              <TableRow>
                {columns.map(column => (
                  <TableHead 
                    key={column.key} 
                    className="text-xs font-semibold"
                    style={{ width: column.width }}
                  >
                    {column.label}
                    {column.required && <span className="text-red-500 ml-1">*</span>}
                  </TableHead>
                ))}
                <TableHead className="w-20 text-xs font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((row, rowIndex) => {
                const originalIndex = data.indexOf(row);
                const rowValidations = getRowValidation(originalIndex);
                const hasRowErrors = rowValidations.some(v => v.severity === 'error');

                return (
                  <TableRow
                    key={originalIndex}
                    className={`${hasRowErrors ? 'bg-red-50 border-red-200' : ''} hover:bg-gray-50`}
                  >
                    {columns.map(column => (
                      <TableCell 
                        key={column.key} 
                        className="align-top p-2"
                        style={{ width: column.width }}
                      >
                        {renderCellContent(row, column, originalIndex)}
                      </TableCell>
                    ))}
                    <TableCell className="align-top p-2 w-20">
                      <div className="flex items-center gap-1">
                        {editingRow === originalIndex ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={saveEdit}
                              className="h-6 w-6 p-0"
                            >
                              <Save className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelEditing}
                              className="h-6 w-6 p-0"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEditing(originalIndex)}
                              className="h-6 w-6 p-0"
                            >
                              <Edit3 className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteRow(originalIndex)}
                              className="h-6 w-6 p-0 hover:bg-red-50 hover:border-red-300"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {searchQuery && filteredData.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No results found for "{searchQuery}"</p>
            <Button variant="outline" onClick={() => setSearchQuery('')} className="mt-2">
              Clear search
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DataGrid;