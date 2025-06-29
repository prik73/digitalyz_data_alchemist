// app/page.tsx - FULL-WIDTH FUNCTIONAL DESIGN
'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, FileText, Users, Briefcase, Sparkles, Zap, Download, Target, Wand2 } from 'lucide-react';

// Import components
import FileUploader from '@/components/data-ingestion/FileUploader';
import DataGrid from '@/components/data-ingestion/DataGrid';
import ValidationSummary from '@/components/validation/ValidationSummary';
import AISearchBox from '@/components/ai/AISearchBox';
import NaturalLanguageDataModifier from '@/components/ai/NaturalLanguageDataModifier';
import AIDataCorrections from '@/components/ai/AIDataCorrections';
import RuleBuilder from '@/components/rules/RuleBuilder';
import ExportSystem from '@/components/export/ExportSystem';
import PriorityWeightsSystem from '@/components/prioritization/PriorityWeightsSystem';

// Import types and validation engine
import type { ValidationResult, BusinessRule, SearchResult, PriorityWeights, DataState } from '@/types';
import { ValidationEngine } from '@/lib/validation/validationEngine';

export default function DataAlchemistDashboard() {
  const [dataState, setDataState] = useState<DataState>({
    clients: [],
    workers: [],
    tasks: [],
    validationResults: [],
    businessRules: [],
    searchResults: [],
    priorityWeights: {
      priorityLevel: 80,
      skillMatching: 70,
      workloadBalance: 60,
      deadlineAdherence: 90,
      costOptimization: 50,
      clientSatisfaction: 85,
      resourceUtilization: 65,
      qualityScore: 75
    },
    filteredView: false,
    isValidating: false
  });

  // Initialize validation engine
  const validationEngine = new ValidationEngine();

  const handleDataParsed = (data: { clients?: any[], workers?: any[], tasks?: any[] }) => {
    setDataState(prev => ({ ...prev, isValidating: true }));

    // Run validation using the modular engine
    const validationResults = validationEngine.validateData(data, dataState.businessRules);

    setDataState(prev => ({
      ...prev,
      clients: data.clients || prev.clients,
      workers: data.workers || prev.workers,
      tasks: data.tasks || prev.tasks,
      validationResults,
      isValidating: false
    }));
  };

  const handleDataChange = (entityType: 'clients' | 'workers' | 'tasks', newData: any[]) => {
    console.log(`🔄 Data changed for ${entityType}:`, newData.length, 'records');
    
    const updatedData = {
      clients: entityType === 'clients' ? newData : dataState.clients,
      workers: entityType === 'workers' ? newData : dataState.workers,
      tasks: entityType === 'tasks' ? newData : dataState.tasks
    };

    const validationResults = validationEngine.validateData(updatedData, dataState.businessRules);

    setDataState(prev => ({
      ...prev,
      [entityType]: newData,
      validationResults
    }));
  };

  const handleRulesChange = (rules: BusinessRule[]) => {
    const validationResults = validationEngine.validateData({
      clients: dataState.clients,
      workers: dataState.workers,
      tasks: dataState.tasks
    }, rules);

    setDataState(prev => ({
      ...prev,
      businessRules: rules,
      validationResults
    }));
  };

  const handleSearchResults = (results: SearchResult[]) => {
    setDataState(prev => ({
      ...prev,
      searchResults: results,
      filteredView: results.length > 0
    }));
  };

  const handleWeightsChange = (weights: PriorityWeights) => {
    setDataState(prev => ({
      ...prev,
      priorityWeights: weights
    }));
  };

  const clearSearchFilter = () => {
    setDataState(prev => ({
      ...prev,
      searchResults: [],
      filteredView: false
    }));
  };

  // Get filtered data based on search results
  const getFilteredData = () => {
    if (!dataState.filteredView || dataState.searchResults.length === 0) {
      return dataState;
    }

    const filteredClients = dataState.clients.filter(client =>
      dataState.searchResults.some(result =>
        result.entityType === 'clients' && result.entityId === client.ClientID
      )
    );

    const filteredWorkers = dataState.workers.filter(worker =>
      dataState.searchResults.some(result =>
        result.entityType === 'workers' && result.entityId === worker.WorkerID
      )
    );

    const filteredTasks = dataState.tasks.filter(task =>
      dataState.searchResults.some(result =>
        result.entityType === 'tasks' && result.entityId === task.TaskID
      )
    );

    return {
      ...dataState,
      clients: filteredClients,
      workers: filteredWorkers,
      tasks: filteredTasks
    };
  };

  const displayData = getFilteredData();

  const getValidationSummary = () => {
    const errors = dataState.validationResults.filter(r => r.severity === 'error').length;
    const warnings = dataState.validationResults.filter(r => r.severity === 'warning').length;
    const infos = dataState.validationResults.filter(r => r.severity === 'info').length;

    return { errors, warnings, infos };
  };

  const { errors, warnings, infos } = getValidationSummary();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* FULL-WIDTH HEADER */}
      <div className="bg-white border-b">
        <div className="w-full px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🧪 Data Alchemist</h1>
              <p className="text-gray-600">Transform your messy data into gold with AI</p>
            </div>
            <div className="flex items-center gap-4">
              {dataState.filteredView && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  AI Filtered ({dataState.searchResults.length})
                </Badge>
              )}
              <Badge variant={errors > 0 ? "destructive" : warnings > 0 ? "default" : "secondary"}>
                {errors > 0 ? (
                  <AlertTriangle className="w-4 h-4 mr-1" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-1" />
                )}
                {errors > 0 ? `${errors} errors` : warnings > 0 ? `${warnings} warnings` : 'All good!'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* FULL-WIDTH MAIN CONTENT - NO MAX-WIDTH! */}
      <div className="w-full h-[calc(100vh-100px)] flex">
        {/* LEFT SIDEBAR - FIXED WIDTH */}
        <div className="w-80 bg-white border-r p-4 overflow-y-auto space-y-4">
          <FileUploader onDataParsed={handleDataParsed} />
          
          {(dataState.clients.length > 0 || dataState.workers.length > 0 || dataState.tasks.length > 0) && (
            <AISearchBox
              data={{
                clients: dataState.clients,
                workers: dataState.workers,
                tasks: dataState.tasks
              }}
              onResultsSelect={handleSearchResults}
            />
          )}
          
          <ValidationSummary
            validationResults={dataState.validationResults}
            isValidating={dataState.isValidating}
          />

          {/* AI Data Corrections */}
          {dataState.validationResults.filter(r => r.severity === 'error').length > 0 && (
            <AIDataCorrections
              validationResults={dataState.validationResults}
              data={{
                clients: dataState.clients,
                workers: dataState.workers,
                tasks: dataState.tasks
              }}
              onDataChange={handleDataChange}
            />
          )}
        </div>

        {/* RIGHT CONTENT - FULL REMAINING WIDTH */}
        <div className="flex-1 p-4 overflow-hidden">
          <Tabs defaultValue="data" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-8 mb-4">
              <TabsTrigger value="data" className="flex items-center gap-1 text-xs">
                <FileText className="w-3 h-3" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="clients" className="flex items-center gap-1 text-xs">
                <Users className="w-3 h-3" />
                Clients ({displayData.clients.length})
              </TabsTrigger>
              <TabsTrigger value="workers" className="flex items-center gap-1 text-xs">
                <Briefcase className="w-3 h-3" />
                Workers ({displayData.workers.length})
              </TabsTrigger>
              <TabsTrigger value="tasks" className="flex items-center gap-1 text-xs">
                <FileText className="w-3 h-3" />
                Tasks ({displayData.tasks.length})
              </TabsTrigger>
              <TabsTrigger value="rules" className="flex items-center gap-1 text-xs">
                <Zap className="w-3 h-3" />
                Rules ({dataState.businessRules.length})
              </TabsTrigger>
              <TabsTrigger value="ai-modify" className="flex items-center gap-1 text-xs">
                <Wand2 className="w-3 h-3" />
                AI Modify
              </TabsTrigger>
              <TabsTrigger value="priority" className="flex items-center gap-1 text-xs">
                <Target className="w-3 h-3" />
                Weights
              </TabsTrigger>
              <TabsTrigger value="export" className="flex items-center gap-1 text-xs">
                <Download className="w-3 h-3" />
                Export
              </TabsTrigger>
            </TabsList>

            {/* FULL-HEIGHT TAB CONTENT */}
            <div className="flex-1 overflow-hidden">
              {/* Data Overview Tab */}
              <TabsContent value="data" className="h-full overflow-y-auto space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Users className="w-4 h-4 text-blue-500" />
                        Clients
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">
                        {displayData.clients.length}
                      </div>
                      <div className="text-xs text-gray-600">
                        {dataState.filteredView ? 'Filtered' : 'Total'} records
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Briefcase className="w-4 h-4 text-green-500" />
                        Workers
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {displayData.workers.length}
                      </div>
                      <div className="text-xs text-gray-600">
                        {dataState.filteredView ? 'Filtered' : 'Total'} records
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <FileText className="w-4 h-4 text-purple-500" />
                        Tasks
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-purple-600">
                        {dataState.tasks.length}
                      </div>
                      <div className="text-xs text-gray-600">
                        Total records
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Zap className="w-4 h-4 text-yellow-500" />
                        Validation
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">
                        {errors}
                      </div>
                      <div className="text-xs text-gray-600">
                        Critical errors
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {dataState.filteredView && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-blue-500" />
                          AI Search Results
                        </div>
                        <button
                          onClick={clearSearchFilter}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Clear Filter
                        </button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        {dataState.searchResults.slice(0, 8).map((result, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">{result.entityType}</Badge>
                              <span className="font-medium text-sm">{result.entityId}</span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {Math.round(result.relevanceScore * 100)}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* FULL-WIDTH DATA GRIDS */}
              <TabsContent value="clients" className="h-full">
                <DataGrid
                  data={displayData.clients}
                  entityType="clients"
                  validationResults={dataState.validationResults.filter(r => r.entityType === 'clients')}
                  onDataChange={(newData) => handleDataChange('clients', newData)}
                />
              </TabsContent>

              <TabsContent value="workers" className="h-full">
                <DataGrid
                  data={displayData.workers}
                  entityType="workers"
                  validationResults={dataState.validationResults.filter(r => r.entityType === 'workers')}
                  onDataChange={(newData) => handleDataChange('workers', newData)}
                />
              </TabsContent>

              <TabsContent value="tasks" className="h-full">
                <DataGrid
                  data={displayData.tasks}
                  entityType="tasks"
                  validationResults={dataState.validationResults.filter(r => r.entityType === 'tasks')}
                  onDataChange={(newData) => handleDataChange('tasks', newData)}
                />
              </TabsContent>

              <TabsContent value="rules" className="h-full overflow-y-auto">
                <RuleBuilder
                  data={{
                    clients: dataState.clients,
                    workers: dataState.workers,
                    tasks: dataState.tasks
                  }}
                  rules={dataState.businessRules}
                  onRulesChange={handleRulesChange}
                />
              </TabsContent>

              {/* AI DATA MODIFICATION TAB */}
              <TabsContent value="ai-modify" className="h-full overflow-y-auto">
                <NaturalLanguageDataModifier
                  data={{
                    clients: dataState.clients,
                    workers: dataState.workers,
                    tasks: dataState.tasks
                  }}
                  onDataChange={handleDataChange}
                />
              </TabsContent>

              <TabsContent value="priority" className="h-full overflow-y-auto">
                <PriorityWeightsSystem
                  currentWeights={dataState.priorityWeights}
                  onWeightsChange={handleWeightsChange}
                />
              </TabsContent>

              <TabsContent value="export" className="h-full overflow-y-auto">
                <ExportSystem
                  data={{
                    clients: dataState.clients,
                    workers: dataState.workers,
                    tasks: dataState.tasks
                  }}
                  rules={dataState.businessRules}
                  validationResults={dataState.validationResults}
                  priorityWeights={dataState.priorityWeights}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}