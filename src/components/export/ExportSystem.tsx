// components/export/ExportSystem.tsx
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Download,
  FileText,
  Settings,
  CheckCircle,
  Package,
  Loader2,
  Eye,
  File,
  Database
} from 'lucide-react';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { BusinessRule, ValidationResult, PriorityWeights, ExportConfig } from '@/types';

interface ExportSystemProps {
  data: {
    clients: any[];
    workers: any[];
    tasks: any[];
  };
  rules: BusinessRule[];
  validationResults: ValidationResult[];
  priorityWeights: PriorityWeights;
}

const ExportSystem: React.FC<ExportSystemProps> = ({
  data,
  rules,
  validationResults,
  priorityWeights
}) => {
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    includeCleanedData: true,
    includeRules: true,
    includeWeights: true,
    includeValidationReport: true,
    format: 'csv',
    packageType: 'zip'
  });

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [previewMode, setPreviewMode] = useState<'rules' | 'weights' | 'validation' | null>(null);

  // Clean data by removing rows with critical errors
  const getCleanedData = () => {
    const criticalErrors = validationResults.filter(r => r.severity === 'error');
    const errorEntityIds = new Set(criticalErrors.map(e => e.entityId).filter(Boolean));

    return {
      clients: data.clients.filter(client => !errorEntityIds.has(client.ClientID)),
      workers: data.workers.filter(worker => !errorEntityIds.has(worker.WorkerID)),
      tasks: data.tasks.filter(task => !errorEntityIds.has(task.TaskID))
    };
  };

  // Generate rules configuration
  const generateRulesConfig = () => {
    const config = {
      metadata: {
        generatedAt: new Date().toISOString(),
        totalRules: rules.length,
        activeRules: rules.filter(r => r.isActive).length,
        version: '1.0'
      },
      rules: rules.filter(r => r.isActive).map(rule => ({
        id: rule.id,
        type: rule.type,
        name: rule.name,
        description: rule.description,
        parameters: rule.parameters,
        priority: 1, // Default priority
        isActive: rule.isActive
      })),
      priorityWeights: exportConfig.includeWeights ? priorityWeights : undefined
    };

    return config;
  };

  // Generate validation report
  const generateValidationReport = () => {
    const errorsByType = validationResults.reduce((acc, result) => {
      acc[result.type] = (acc[result.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const errorsByEntity = validationResults.reduce((acc, result) => {
      acc[result.entityType] = (acc[result.entityType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      summary: {
        totalIssues: validationResults.length,
        errors: validationResults.filter(r => r.severity === 'error').length,
        warnings: validationResults.filter(r => r.severity === 'warning').length,
        infos: validationResults.filter(r => r.severity === 'info').length,
        dataQualityScore: calculateDataQualityScore()
      },
      issuesByType: errorsByType,
      issuesByEntity: errorsByEntity,
      detailedIssues: validationResults.map(result => ({
        type: result.type,
        severity: result.severity,
        message: result.message,
        entityType: result.entityType,
        entityId: result.entityId,
        field: result.field,
        suggestion: result.suggestion
      }))
    };
  };

  const calculateDataQualityScore = () => {
    const totalIssues = validationResults.length;
    const errorWeight = 3;
    const warningWeight = 1;
    
    const errors = validationResults.filter(r => r.severity === 'error').length;
    const warnings = validationResults.filter(r => r.severity === 'warning').length;
    
    const errorScore = errors * errorWeight;
    const warningScore = warnings * warningWeight;
    const totalWeight = errorScore + warningScore;
    
    if (totalWeight === 0) return 100;
    
    const baseScore = Math.max(0, 100 - totalWeight * 5);
    return Math.round(baseScore);
  };

  // Convert data to CSV
  const dataToCSV = (objArray: any[]) => {
    if (objArray.length === 0) return '';
    
    const headers = Object.keys(objArray[0]);
    const csvHeaders = headers.join(',');
    
    const csvRows = objArray.map(obj => {
      return headers.map(header => {
        const value = obj[header];
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',');
    });
    
    return [csvHeaders, ...csvRows].join('\n');
  };

  // Convert data to Excel
  const dataToExcel = (data: Record<string, any[]>) => {
    const workbook = XLSX.utils.book_new();
    
    Object.entries(data).forEach(([sheetName, sheetData]) => {
      if (sheetData.length > 0) {
        const worksheet = XLSX.utils.json_to_sheet(sheetData);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      }
    });
    
    return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  };

  // Export individual files
  const exportIndividualFiles = async () => {
    const cleanedData = getCleanedData();
    
    if (exportConfig.includeCleanedData) {
      if (exportConfig.format === 'csv') {
        // Export CSV files
        const clientsCSV = dataToCSV(cleanedData.clients);
        const workersCSV = dataToCSV(cleanedData.workers);
        const tasksCSV = dataToCSV(cleanedData.tasks);
        
        const blob1 = new Blob([clientsCSV], { type: 'text/csv' });
        const blob2 = new Blob([workersCSV], { type: 'text/csv' });
        const blob3 = new Blob([tasksCSV], { type: 'text/csv' });
        
        saveAs(blob1, 'cleaned_clients.csv');
        saveAs(blob2, 'cleaned_workers.csv');
        saveAs(blob3, 'cleaned_tasks.csv');
      } else if (exportConfig.format === 'xlsx') {
        // Export Excel file
        const excelData = dataToExcel({
          'Clients': cleanedData.clients,
          'Workers': cleanedData.workers,
          'Tasks': cleanedData.tasks
        });
        
        const blob = new Blob([excelData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, 'cleaned_data.xlsx');
      }
    }
    
    if (exportConfig.includeRules) {
      const rulesConfig = generateRulesConfig();
      const rulesBlob = new Blob([JSON.stringify(rulesConfig, null, 2)], { type: 'application/json' });
      saveAs(rulesBlob, 'rules_config.json');
    }
    
    if (exportConfig.includeValidationReport) {
      const validationReport = generateValidationReport();
      const reportBlob = new Blob([JSON.stringify(validationReport, null, 2)], { type: 'application/json' });
      saveAs(reportBlob, 'validation_report.json');
    }
  };

  // Export as ZIP package
  const exportAsPackage = async () => {
    const zip = new JSZip();
    const cleanedData = getCleanedData();
    
    // Add cleaned data files
    if (exportConfig.includeCleanedData) {
      if (exportConfig.format === 'csv') {
        zip.file('data/cleaned_clients.csv', dataToCSV(cleanedData.clients));
        zip.file('data/cleaned_workers.csv', dataToCSV(cleanedData.workers));
        zip.file('data/cleaned_tasks.csv', dataToCSV(cleanedData.tasks));
      } else if (exportConfig.format === 'xlsx') {
        const excelData = dataToExcel({
          'Clients': cleanedData.clients,
          'Workers': cleanedData.workers,
          'Tasks': cleanedData.tasks
        });
        zip.file('data/cleaned_data.xlsx', excelData);
      } else if (exportConfig.format === 'json') {
        zip.file('data/cleaned_clients.json', JSON.stringify(cleanedData.clients, null, 2));
        zip.file('data/cleaned_workers.json', JSON.stringify(cleanedData.workers, null, 2));
        zip.file('data/cleaned_tasks.json', JSON.stringify(cleanedData.tasks, null, 2));
      }
    }
    
    // Add rules configuration
    if (exportConfig.includeRules) {
      const rulesConfig = generateRulesConfig();
      zip.file('config/rules_config.json', JSON.stringify(rulesConfig, null, 2));
    }
    
    // Add validation report
    if (exportConfig.includeValidationReport) {
      const validationReport = generateValidationReport();
      zip.file('reports/validation_report.json', JSON.stringify(validationReport, null, 2));
    }
    
    // Add README
    const readme = `# Data Alchemist Export Package

Generated on: ${new Date().toISOString()}

## Contents:
${exportConfig.includeCleanedData ? `- data/: Cleaned data files (${exportConfig.format.toUpperCase()} format)` : ''}
${exportConfig.includeRules ? '- config/: Business rules configuration' : ''}
${exportConfig.includeValidationReport ? '- reports/: Data validation report' : ''}

## Data Quality Score: ${calculateDataQualityScore()}%

## Summary:
- Total records cleaned: ${cleanedData.clients.length + cleanedData.workers.length + cleanedData.tasks.length}
- Active business rules: ${rules.filter(r => r.isActive).length}
- Validation issues resolved: ${validationResults.filter(r => r.severity === 'error').length}

Ready for downstream resource allocation processing!
`;
    
    zip.file('README.md', readme);
    
    // Generate and download ZIP
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, `data_alchemist_export_${new Date().toISOString().split('T')[0]}.zip`);
  };

  // Main export function
  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);
    
    try {
      // Simulate progress
      const progressSteps = [20, 40, 60, 80, 100];
      for (const step of progressSteps) {
        await new Promise(resolve => setTimeout(resolve, 300));
        setExportProgress(step);
      }
      
      if (exportConfig.packageType === 'zip') {
        await exportAsPackage();
      } else {
        await exportIndividualFiles();
      }
      
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const getExportSummary = () => {
    const cleanedData = getCleanedData();
    const totalRecords = cleanedData.clients.length + cleanedData.workers.length + cleanedData.tasks.length;
    const originalTotal = data.clients.length + data.workers.length + data.tasks.length;
    const removedRecords = originalTotal - totalRecords;
    
    return { totalRecords, removedRecords, cleanedData };
  };

  const { totalRecords, removedRecords, cleanedData } = getExportSummary();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="w-5 h-5 text-green-500" />
          Export Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Export Summary */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{totalRecords}</div>
            <div className="text-sm text-gray-600">Clean Records</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{rules.filter(r => r.isActive).length}</div>
            <div className="text-sm text-gray-600">Active Rules</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{calculateDataQualityScore()}%</div>
            <div className="text-sm text-gray-600">Quality Score</div>
          </div>
        </div>

        {/* Configuration Options */}
        <div className="space-y-4">
          <h3 className="font-medium">What to include:</h3>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="cleaned-data"
                checked={exportConfig.includeCleanedData}
                onCheckedChange={(checked) => 
                  setExportConfig(prev => ({ ...prev, includeCleanedData: !!checked }))
                }
              />
              <label htmlFor="cleaned-data" className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                Cleaned Data Files
                <Badge variant="secondary">
                  {cleanedData.clients.length + cleanedData.workers.length + cleanedData.tasks.length} records
                </Badge>
                {removedRecords > 0 && (
                  <Badge variant="destructive">{removedRecords} removed</Badge>
                )}
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="rules"
                checked={exportConfig.includeRules}
                onCheckedChange={(checked) => 
                  setExportConfig(prev => ({ ...prev, includeRules: !!checked }))
                }
              />
              <label htmlFor="rules" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Business Rules Configuration
                <Badge variant="secondary">{rules.filter(r => r.isActive).length} rules</Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPreviewMode(previewMode === 'rules' ? null : 'rules')}
                >
                  <Eye className="w-3 h-3" />
                </Button>
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="validation"
                checked={exportConfig.includeValidationReport}
                onCheckedChange={(checked) => 
                  setExportConfig(prev => ({ ...prev, includeValidationReport: !!checked }))
                }
              />
              <label htmlFor="validation" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Validation Report
                <Badge variant="secondary">{validationResults.length} issues</Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPreviewMode(previewMode === 'validation' ? null : 'validation')}
                >
                  <Eye className="w-3 h-3" />
                </Button>
              </label>
            </div>
          </div>
        </div>

        {/* Format Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Data Format:</label>
            <Select
              value={exportConfig.format}
              onValueChange={(value: 'csv' | 'xlsx' | 'json') => 
                setExportConfig(prev => ({ ...prev, format: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV (Comma Separated)</SelectItem>
                <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Package Type:</label>
            <Select
              value={exportConfig.packageType}
              onValueChange={(value: 'zip' | 'individual') => 
                setExportConfig(prev => ({ ...prev, packageType: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zip">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    ZIP Package
                  </div>
                </SelectItem>
                <SelectItem value="individual">
                  <div className="flex items-center gap-2">
                    <File className="w-4 h-4" />
                    Individual Files
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Preview Sections */}
        {previewMode === 'rules' && (
          <div className="p-4 border rounded-lg bg-blue-50">
            <h4 className="font-medium mb-2">Rules Configuration Preview:</h4>
            <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
              {JSON.stringify(generateRulesConfig(), null, 2).substring(0, 500)}...
            </pre>
          </div>
        )}

        {previewMode === 'validation' && (
          <div className="p-4 border rounded-lg bg-yellow-50">
            <h4 className="font-medium mb-2">Validation Report Preview:</h4>
            <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
              {JSON.stringify(generateValidationReport(), null, 2).substring(0, 500)}...
            </pre>
          </div>
        )}

        {/* Export Progress */}
        {isExporting && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Preparing export...</span>
            </div>
            <Progress value={exportProgress} />
          </div>
        )}

        {/* Export Button */}
        <Button
          onClick={handleExport}
          disabled={isExporting || (!exportConfig.includeCleanedData && !exportConfig.includeRules && !exportConfig.includeValidationReport)}
          className="w-full"
          size="lg"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Export {exportConfig.packageType === 'zip' ? 'Package' : 'Files'}
            </>
          )}
        </Button>

        <div className="text-xs text-gray-500 text-center">
          {exportConfig.packageType === 'zip' 
            ? 'Complete package with README and organized folder structure'
            : 'Individual files will be downloaded separately'
          }
        </div>
      </CardContent>
    </Card>
  );
};

export default ExportSystem;