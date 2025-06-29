'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, CheckCircle, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

interface UploadedFile {
  name: string;
  type: 'clients' | 'workers' | 'tasks' | 'unknown';
  size: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  data?: {
    clients?: any[];
    workers?: any[];
    tasks?: any[];
  };
  error?: string;
  progress?: number;
}

interface FileUploaderProps {
  onDataParsed: (data: {
    clients?: any[];
    workers?: any[];
    tasks?: any[];
  }) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onDataParsed }) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Smart file type detection based on sheet names and content
  const detectEntityTypes = (sheetsData: {[key: string]: any[]}): {[key: string]: any[]} => {
    const result: {[key: string]: any[]} = {};
    
    Object.entries(sheetsData).forEach(([sheetName, data]) => {
      if (!data.length) return;
      
      const lowerSheetName = sheetName.toLowerCase();
      const headers = Object.keys(data[0]).map(h => h.toLowerCase());
      
      // Detect by sheet name first (more reliable for Excel files)
      if (lowerSheetName.includes('client')) {
        result.clients = mapColumns(data, 'clients');
        console.log(`✅ Detected CLIENTS from sheet "${sheetName}": ${data.length} records`);
      } else if (lowerSheetName.includes('worker')) {
        result.workers = mapColumns(data, 'workers');
        console.log(`✅ Detected WORKERS from sheet "${sheetName}": ${data.length} records`);
      } else if (lowerSheetName.includes('task')) {
        result.tasks = mapColumns(data, 'tasks');
        console.log(`✅ Detected TASKS from sheet "${sheetName}": ${data.length} records`);
      } else {
        // Fallback to content-based detection
        if (headers.some(h => h.includes('client') || h.includes('priority') || h.includes('requested'))) {
          result.clients = mapColumns(data, 'clients');
          console.log(`✅ Detected CLIENTS from content in sheet "${sheetName}": ${data.length} records`);
        } else if (headers.some(h => h.includes('worker') || h.includes('skill') || h.includes('available'))) {
          result.workers = mapColumns(data, 'workers');
          console.log(`✅ Detected WORKERS from content in sheet "${sheetName}": ${data.length} records`);
        } else if (headers.some(h => h.includes('task') || h.includes('duration') || h.includes('category'))) {
          result.tasks = mapColumns(data, 'tasks');
          console.log(`✅ Detected TASKS from content in sheet "${sheetName}": ${data.length} records`);
        } else {
          console.log(`⚠️ Could not determine entity type for sheet "${sheetName}"`);
        }
      }
    });
    
    return result;
  };
   // AI-powered column mapping
  const mapColumns = (data: any[], fileType: string) => {
    if (!data.length) return data;

    const columnMappings: Record<string, Record<string, string>> = {
      clients: {
        'client_id': 'ClientID',
        'clientid': 'ClientID',
        'client_name': 'ClientName',
        'clientname': 'ClientName',
        'priority': 'PriorityLevel',
        'priority_level': 'PriorityLevel',
        'requested_tasks': 'RequestedTaskIDs',
        'requestedtaskids': 'RequestedTaskIDs',
        'group': 'GroupTag',
        'group_tag': 'GroupTag',
        'attributes': 'AttributesJSON',
        'attributesjson': 'AttributesJSON'
      },
      workers: {
        'worker_id': 'WorkerID',
        'workerid': 'WorkerID',
        'worker_name': 'WorkerName',
        'workername': 'WorkerName',
        'available_slots': 'AvailableSlots',
        'availableslots': 'AvailableSlots',
        'max_load': 'MaxLoadPerPhase',
        'maxloadperphase': 'MaxLoadPerPhase',
        'worker_group': 'WorkerGroup',
        'workergroup': 'WorkerGroup',
        'qualification': 'QualificationLevel',
        'qualificationlevel': 'QualificationLevel'
      },
      tasks: {
        'task_id': 'TaskID',
        'taskid': 'TaskID',
        'task_name': 'TaskName',
        'taskname': 'TaskName',
        'required_skills': 'RequiredSkills',
        'requiredskills': 'RequiredSkills',
        'preferred_phases': 'PreferredPhases',
        'preferredphases': 'PreferredPhases',
        'max_concurrent': 'MaxConcurrent',
        'maxconcurrent': 'MaxConcurrent'
      }
    };

    const mappings = columnMappings[fileType];
    if (!mappings) return data;

    return data.map(row => {
      const mappedRow: any = {};
      Object.keys(row).forEach(key => {
        const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
        const mappedKey = mappings[normalizedKey] || key;
        mappedRow[mappedKey] = row[key];
      });
      return mappedRow;
    });
  };
  const parseFile = async (file: File): Promise<{[key: string]: any[]}> => {
    return new Promise((resolve, reject) => {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();

      if (fileExtension === 'csv') {
        // Parse CSV
        Papa.parse(file, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          delimitersToGuess: [',', '\t', '|', ';'],
          complete: (results) => {
            if (results.errors.length > 0) {
              reject(new Error(`CSV parsing error: ${results.errors[0].message}`));
            } else {
              // For CSV, return single sheet data
              resolve({ 'Sheet1': results.data });
            }
          },
          error: (error) => reject(error)
        });
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        // Parse Excel - Handle multiple sheets
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            
            console.log('Excel sheets found:', workbook.SheetNames);
            
            // Parse all sheets
            const allSheetsData: {[key: string]: any[]} = {};
            
            workbook.SheetNames.forEach(sheetName => {
              const worksheet = workbook.Sheets[sheetName];
              const jsonData = XLSX.utils.sheet_to_json(worksheet);
              allSheetsData[sheetName] = jsonData;
              console.log(`Sheet "${sheetName}" has ${jsonData.length} rows`);
            });
            
            resolve(allSheetsData);
          } catch (error) {
            console.error('Excel parsing error:', error);
            reject(error);
          }
        };
        reader.onerror = () => reject(new Error('File reading failed'));
        reader.readAsArrayBuffer(file);
      } else {
        reject(new Error('Unsupported file format. Please upload CSV or Excel files.'));
      }
    });
  };
   const processFile = async (file: File, index: number) => {
    const fileEntry: UploadedFile = {
      name: file.name,
      type: 'unknown',
      size: file.size,
      status: 'uploading',
      progress: 0
    };

    setUploadedFiles(prev => {
      const newFiles = [...prev];
      newFiles[index] = fileEntry;
      return newFiles;
    });

    try {
      // Simulate upload progress
      for (let progress = 0; progress <= 100; progress += 20) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setUploadedFiles(prev => {
          const newFiles = [...prev];
          newFiles[index] = { ...newFiles[index], progress, status: 'uploading' };
          return newFiles;
        });
      }

      // Update to processing
      setUploadedFiles(prev => {
        const newFiles = [...prev];
        newFiles[index] = { ...newFiles[index], status: 'processing', progress: 100 };
        return newFiles;
      });

      // Parse the file (now returns multiple sheets for Excel)
      const sheetsData = await parseFile(file);
      console.log('Parsed sheets:', Object.keys(sheetsData));
      
      // Detect entity types from all sheets
      const detectedData = detectEntityTypes(sheetsData);
      console.log('Detected entities:', Object.keys(detectedData));

      // Calculate total records
      const totalRecords = Object.values(detectedData).reduce((sum, data) => sum + data.length, 0);
      
      // Determine primary entity type for file badge
      let primaryType: 'clients' | 'workers' | 'tasks' | 'unknown' = 'unknown';
      if (detectedData.clients && detectedData.clients.length > 0) primaryType = 'clients';
      else if (detectedData.workers && detectedData.workers.length > 0) primaryType = 'workers';
      else if (detectedData.tasks && detectedData.tasks.length > 0) primaryType = 'tasks';
       // Update with completed status
      setUploadedFiles(prev => {
        const newFiles = [...prev];
        newFiles[index] = {
          ...newFiles[index],
          status: 'completed',
          type: primaryType,
          data: detectedData // Store all detected data
        };
        return newFiles;
      });

      // Trigger callback with parsed data
      onDataParsed(detectedData);

    } catch (error) {
      console.error('File processing error:', error);
      setUploadedFiles(prev => {
        const newFiles = [...prev];
        newFiles[index] = {
          ...newFiles[index],
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
        return newFiles;
      });
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsProcessing(true);

    // Process files one by one
    for (let i = 0; i < acceptedFiles.length; i++) {
      await processFile(acceptedFiles[i], uploadedFiles.length + i);
    }

    setIsProcessing(false);
  }, [uploadedFiles.length]);

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: true
  });

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <FileText className="w-4 h-4 text-blue-500" />;
    }
  };

  const getTypeColor = (type: UploadedFile['type']) => {
    switch (type) {
      case 'clients':
        return 'bg-blue-100 text-blue-800';
      case 'workers':
        return 'bg-green-100 text-green-800';
      case 'tasks':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Data Ingestion
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Drop Zone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium text-gray-600 mb-2">
            Drop your CSV or Excel files here
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Upload clients.csv, workers.csv, and tasks.csv (or .xlsx files)
          </p>
          <Button variant="outline">
            Browse Files
          </Button>
        </div>

        {/* File List */}
        {uploadedFiles.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium text-gray-700">Uploaded Files</h3>
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3 flex-1">
                  {getStatusIcon(file.status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{file.name}</span>
                      <Badge className={getTypeColor(file.type)}>
                        {file.type}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500">
                      {(file.size / 1024).toFixed(1)} KB
                      {file.data && (
                        <div className="mt-1">
                          {file.data.clients && <span className="mr-2">📊 {file.data.clients.length} clients</span>}
                          {file.data.workers && <span className="mr-2">👥 {file.data.workers.length} workers</span>}
                          {file.data.tasks && <span className="mr-2">📋 {file.data.tasks.length} tasks</span>}
                        </div>
                      )}
                    </div>
                    {file.status === 'uploading' && file.progress !== undefined && (
                      <Progress value={file.progress} className="mt-2" />
                    )}
                    {file.error && (
                      <p className="text-xs text-red-500 mt-1">{file.error}</p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
          {/* Status Summary */}
        {uploadedFiles.length > 0 && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {uploadedFiles.reduce((total, file) => 
                    total + (file.data?.clients?.length || 0), 0
                  )}
                </div>
                <div className="text-sm text-gray-600">Clients</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {uploadedFiles.reduce((total, file) => 
                    total + (file.data?.workers?.length || 0), 0
                  )}
                </div>
                <div className="text-sm text-gray-600">Workers</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {uploadedFiles.reduce((total, file) => 
                    total + (file.data?.tasks?.length || 0), 0
                  )}
                </div>
                <div className="text-sm text-gray-600">Tasks</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FileUploader;