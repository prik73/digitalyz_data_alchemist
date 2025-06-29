// components/rules/RuleBuilder.tsx
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Trash2,
  Save,
  Zap,
  Users,
  Briefcase,
  FileText,
  Settings,
  AlertTriangle,
  CheckCircle,
  Sparkles
} from 'lucide-react';
import type { BusinessRule } from '@/types';

interface RuleBuilderProps {
  data: {
    clients: any[];
    workers: any[];
    tasks: any[];
  };
  rules: BusinessRule[];
  onRulesChange: (rules: BusinessRule[]) => void;
}

export default function RuleBuilder({ data, rules, onRulesChange }: RuleBuilderProps) {
  const [activeTab, setActiveTab] = useState('create');
  const [selectedRuleType, setSelectedRuleType] = useState<string>('');
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('');
  const [isProcessingNL, setIsProcessingNL] = useState(false);
  
  // Form states for different rule types
  const [coRunForm, setCoRunForm] = useState({
    name: '',
    taskIds: [] as string[],
    description: ''
  });
  
  const [loadLimitForm, setLoadLimitForm] = useState({
    name: '',
    workerGroup: '',
    maxSlotsPerPhase: 3,
    description: ''
  });
  
  const [phaseWindowForm, setPhaseWindowForm] = useState({
    name: '',
    taskId: '',
    allowedPhases: [] as number[],
    description: ''
  });

  const [slotRestrictionForm, setSlotRestrictionForm] = useState({
    name: '',
    clientGroup: '',
    workerGroup: '',
    minCommonSlots: 2,
    description: ''
  });

  const [patternMatchForm, setPatternMatchForm] = useState({
    name: '',
    regex: '',
    ruleTemplate: 'priority',
    parameters: '',
    description: ''
  });

  const [precedenceForm, setPrecedenceForm] = useState({
    name: '',
    globalRule: '',
    specificRule: '',
    priority: 1,
    description: ''
  });

  const ruleTypes = [
    {
      id: 'coRun',
      name: 'Co-Run Tasks',
      description: 'Tasks that must run together',
      icon: <FileText className="w-4 h-4" />,
      example: 'Tasks T1 and T2 must run in the same phase'
    },
    {
      id: 'loadLimit',
      name: 'Load Limit',
      description: 'Maximum workload per worker group',
      icon: <Briefcase className="w-4 h-4" />,
      example: 'Frontend team max 5 tasks per phase'
    },
    {
      id: 'phaseWindow',
      name: 'Phase Window',
      description: 'Restrict tasks to specific phases',
      icon: <Settings className="w-4 h-4" />,
      example: 'Task T5 can only run in phases 1-3'
    },
    {
      id: 'slotRestriction',
      name: 'Slot Restriction',
      description: 'Common slot requirements for groups',
      icon: <Users className="w-4 h-4" />,
      example: 'GroupA clients need min 2 common slots'
    },
    {
      id: 'patternMatch',
      name: 'Pattern Match',
      description: 'Regex-based rule templates',
      icon: <Zap className="w-4 h-4" />,
      example: 'Tasks matching /^API.*/ get high priority'
    },
    {
      id: 'precedence',
      name: 'Precedence Override',
      description: 'Global vs specific rule priority',
      icon: <AlertTriangle className="w-4 h-4" />,
      example: 'Client-specific rules override global rules'
    }
  ];

  // Generate unique ID for new rules
  const generateRuleId = () => {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Natural Language Rule Processing
  const processNaturalLanguage = async (input: string) => {
    setIsProcessingNL(true);
    
    try {
      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const lowerInput = input.toLowerCase();
      let detectedRule: BusinessRule | null = null;
      
      // Detect Co-Run patterns
      if (lowerInput.includes('together') || lowerInput.includes('same time') || lowerInput.includes('co-run')) {
        const taskMatches = input.match(/T\d+/g);
        if (taskMatches && taskMatches.length >= 2) {
          detectedRule = {
            id: generateRuleId(),
            type: 'coRun',
            name: `Co-run: ${taskMatches.join(', ')}`,
            description: `Tasks ${taskMatches.join(', ')} must run together`,
            parameters: {
              taskIds: taskMatches
            },
            isActive: true,
            createdAt: new Date()
          };
        }
      }
      
      // Detect Load Limit patterns
      else if (lowerInput.includes('max') && (lowerInput.includes('tasks') || lowerInput.includes('load'))) {
        const numberMatch = input.match(/(\d+)/);
        const groupMatch = input.match(/(frontend|backend|design|qa|groupa|groupb|groupc)/i);
        
        if (numberMatch && groupMatch) {
          detectedRule = {
            id: generateRuleId(),
            type: 'loadLimit',
            name: `Load limit: ${groupMatch[1]} max ${numberMatch[1]}`,
            description: `${groupMatch[1]} team maximum ${numberMatch[1]} tasks per phase`,
            parameters: {
              workerGroup: groupMatch[1],
              maxSlotsPerPhase: parseInt(numberMatch[1])
            },
            isActive: true,
            createdAt: new Date()
          };
        }
      }
      
      // Detect Phase Window patterns
      else if (lowerInput.includes('phase') && (lowerInput.includes('only') || lowerInput.includes('restrict'))) {
        const taskMatch = input.match(/T\d+/);
        const phaseMatch = input.match(/phase[s]?\s*(\d+(?:\s*[-–]\s*\d+)?|\d+(?:\s*,\s*\d+)*)/i);
        
        if (taskMatch && phaseMatch) {
          let phases: number[] = [];
          const phaseStr = phaseMatch[1];
          
          if (phaseStr.includes('-')) {
            const [start, end] = phaseStr.split('-').map(s => parseInt(s.trim()));
            phases = Array.from({length: end - start + 1}, (_, i) => start + i);
          } else {
            phases = phaseStr.split(',').map(s => parseInt(s.trim()));
          }
          
          detectedRule = {
            id: generateRuleId(),
            type: 'phaseWindow',
            name: `Phase window: ${taskMatch[0]} in phases ${phases.join(', ')}`,
            description: `Task ${taskMatch[0]} restricted to phases ${phases.join(', ')}`,
            parameters: {
              taskId: taskMatch[0],
              allowedPhases: phases
            },
            isActive: true,
            createdAt: new Date()
          };
        }
      }

      // Detect Slot Restriction patterns
      else if (lowerInput.includes('common slots') || lowerInput.includes('min') && lowerInput.includes('slots')) {
        const numberMatch = input.match(/(\d+)/);
        const groupMatch = input.match(/(groupa|groupb|groupc)/i);
        
        if (numberMatch && groupMatch) {
          detectedRule = {
            id: generateRuleId(),
            type: 'slotRestriction',
            name: `Slot restriction: ${groupMatch[1]} min ${numberMatch[1]} slots`,
            description: `${groupMatch[1]} requires minimum ${numberMatch[1]} common slots`,
            parameters: {
              clientGroup: groupMatch[1],
              workerGroup: groupMatch[1],
              minCommonSlots: parseInt(numberMatch[1])
            },
            isActive: true,
            createdAt: new Date()
          };
        }
      }

      // Detect Pattern Match rules
      else if (lowerInput.includes('matching') || lowerInput.includes('pattern') || lowerInput.includes('/')) {
        const regexMatch = input.match(/\/(.+?)\//);
        const priorityMatch = lowerInput.includes('priority') ? 'priority' : 'default';
        
        if (regexMatch) {
          detectedRule = {
            id: generateRuleId(),
            type: 'patternMatch',
            name: `Pattern match: ${regexMatch[1]}`,
            description: `Tasks matching pattern ${regexMatch[0]} get special handling`,
            parameters: {
              regex: regexMatch[1],
              ruleTemplate: priorityMatch,
              parameters: lowerInput.includes('high') ? 'high' : 'normal'
            },
            isActive: true,
            createdAt: new Date()
          };
        }
      }
      
      if (detectedRule) {
        const updatedRules = [...rules, detectedRule];
        onRulesChange(updatedRules);
        setNaturalLanguageInput('');
        setActiveTab('manage');
      } else {
        alert('Could not interpret the rule. Please try rephrasing or use the form-based builder.');
      }
      
    } catch (error) {
      console.error('Error processing natural language:', error);
    } finally {
      setIsProcessingNL(false);
    }
  };

  // Form-based rule creation functions
  const createCoRunRule = () => {
    if (coRunForm.taskIds.length < 2) {
      alert('Please select at least 2 tasks for co-run rule');
      return;
    }
    
    const newRule: BusinessRule = {
      id: generateRuleId(),
      type: 'coRun',
      name: coRunForm.name || `Co-run: ${coRunForm.taskIds.join(', ')}`,
      description: coRunForm.description || `Tasks ${coRunForm.taskIds.join(', ')} must run together`,
      parameters: {
        taskIds: coRunForm.taskIds
      },
      isActive: true,
      createdAt: new Date()
    };
    
    onRulesChange([...rules, newRule]);
    setCoRunForm({ name: '', taskIds: [], description: '' });
  };

  const createLoadLimitRule = () => {
    if (!loadLimitForm.workerGroup) {
      alert('Please select a worker group');
      return;
    }
    
    const newRule: BusinessRule = {
      id: generateRuleId(),
      type: 'loadLimit',
      name: loadLimitForm.name || `Load limit: ${loadLimitForm.workerGroup}`,
      description: loadLimitForm.description || `${loadLimitForm.workerGroup} max ${loadLimitForm.maxSlotsPerPhase} tasks per phase`,
      parameters: {
        workerGroup: loadLimitForm.workerGroup,
        maxSlotsPerPhase: loadLimitForm.maxSlotsPerPhase
      },
      isActive: true,
      createdAt: new Date()
    };
    
    onRulesChange([...rules, newRule]);
    setLoadLimitForm({ name: '', workerGroup: '', maxSlotsPerPhase: 3, description: '' });
  };

  const createPhaseWindowRule = () => {
    if (!phaseWindowForm.taskId || phaseWindowForm.allowedPhases.length === 0) {
      alert('Please select a task and at least one phase');
      return;
    }
    
    const newRule: BusinessRule = {
      id: generateRuleId(),
      type: 'phaseWindow',
      name: phaseWindowForm.name || `Phase window: ${phaseWindowForm.taskId}`,
      description: phaseWindowForm.description || `Task ${phaseWindowForm.taskId} restricted to phases ${phaseWindowForm.allowedPhases.join(', ')}`,
      parameters: {
        taskId: phaseWindowForm.taskId,
        allowedPhases: phaseWindowForm.allowedPhases
      },
      isActive: true,
      createdAt: new Date()
    };
    
    onRulesChange([...rules, newRule]);
    setPhaseWindowForm({ name: '', taskId: '', allowedPhases: [], description: '' });
  };

  const createSlotRestrictionRule = () => {
    if (!slotRestrictionForm.clientGroup || !slotRestrictionForm.workerGroup) {
      alert('Please select both client and worker groups');
      return;
    }
    
    const newRule: BusinessRule = {
      id: generateRuleId(),
      type: 'slotRestriction',
      name: slotRestrictionForm.name || `Slot restriction: ${slotRestrictionForm.clientGroup}`,
      description: slotRestrictionForm.description || `${slotRestrictionForm.clientGroup} requires ${slotRestrictionForm.minCommonSlots} common slots with ${slotRestrictionForm.workerGroup}`,
      parameters: {
        clientGroup: slotRestrictionForm.clientGroup,
        workerGroup: slotRestrictionForm.workerGroup,
        minCommonSlots: slotRestrictionForm.minCommonSlots
      },
      isActive: true,
      createdAt: new Date()
    };
    
    onRulesChange([...rules, newRule]);
    setSlotRestrictionForm({ name: '', clientGroup: '', workerGroup: '', minCommonSlots: 2, description: '' });
  };

  const createPatternMatchRule = () => {
    if (!patternMatchForm.regex || !patternMatchForm.ruleTemplate) {
      alert('Please provide both regex pattern and rule template');
      return;
    }
    
    const newRule: BusinessRule = {
      id: generateRuleId(),
      type: 'patternMatch',
      name: patternMatchForm.name || `Pattern: ${patternMatchForm.regex}`,
      description: patternMatchForm.description || `Tasks matching /${patternMatchForm.regex}/ get ${patternMatchForm.ruleTemplate} treatment`,
      parameters: {
        regex: patternMatchForm.regex,
        ruleTemplate: patternMatchForm.ruleTemplate,
        parameters: patternMatchForm.parameters
      },
      isActive: true,
      createdAt: new Date()
    };
    
    onRulesChange([...rules, newRule]);
    setPatternMatchForm({ name: '', regex: '', ruleTemplate: 'priority', parameters: '', description: '' });
  };

  const createPrecedenceRule = () => {
    if (!precedenceForm.globalRule || !precedenceForm.specificRule) {
      alert('Please define both global and specific rules');
      return;
    }
    
    const newRule: BusinessRule = {
      id: generateRuleId(),
      type: 'precedence',
      name: precedenceForm.name || `Precedence: ${precedenceForm.specificRule} over ${precedenceForm.globalRule}`,
      description: precedenceForm.description || `${precedenceForm.specificRule} overrides ${precedenceForm.globalRule} with priority ${precedenceForm.priority}`,
      parameters: {
        globalRule: precedenceForm.globalRule,
        specificRule: precedenceForm.specificRule,
        priority: precedenceForm.priority
      },
      isActive: true,
      createdAt: new Date()
    };
    
    onRulesChange([...rules, newRule]);
    setPrecedenceForm({ name: '', globalRule: '', specificRule: '', priority: 1, description: '' });
  };

  const toggleRule = (ruleId: string) => {
    const updatedRules = rules.map(rule =>
      rule.id === ruleId ? { ...rule, isActive: !rule.isActive } : rule
    );
    onRulesChange(updatedRules);
  };

  const deleteRule = (ruleId: string) => {
    const updatedRules = rules.filter(rule => rule.id !== ruleId);
    onRulesChange(updatedRules);
  };

  const getRuleIcon = (type: string) => {
    const ruleType = ruleTypes.find(rt => rt.id === type);
    return ruleType?.icon || <Settings className="w-4 h-4" />;
  };

  // Get unique values for dropdowns
  const workerGroups = [...new Set(data.workers.map(w => w.WorkerGroup).filter(Boolean))];
  const clientGroups = [...new Set(data.clients.map(c => c.GroupTag).filter(Boolean))];
  const taskIds = data.tasks.map(t => t.TaskID).filter(Boolean);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          Business Rules Engine
          <Badge variant="secondary">{rules.length} rules</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="create">Create Rules</TabsTrigger>
            <TabsTrigger value="natural">AI Assistant</TabsTrigger>
            <TabsTrigger value="manage">Manage Rules</TabsTrigger>
          </TabsList>

          {/* Create Rules Tab */}
          <TabsContent value="create" className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {ruleTypes.map(ruleType => (
                <div
                  key={ruleType.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedRuleType === ruleType.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedRuleType(ruleType.id)}
                >
                  <div className="flex items-center gap-3 mb-2">
                    {ruleType.icon}
                    <h3 className="font-medium">{ruleType.name}</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{ruleType.description}</p>
                  <p className="text-xs text-blue-600">{ruleType.example}</p>
                </div>
              ))}
            </div>

            {/* Co-Run Rule Form */}
            {selectedRuleType === 'coRun' && (
              <div className="space-y-4 p-4 border rounded-lg">
                <h3 className="font-medium flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Create Co-Run Rule
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <Label>Rule Name (optional)</Label>
                    <Input
                      value={coRunForm.name}
                      onChange={(e) => setCoRunForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter rule name"
                    />
                  </div>
                  
                  <div>
                    <Label>Select Tasks (minimum 2)</Label>
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {taskIds.slice(0, 12).map(taskId => (
                        <label key={taskId} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={coRunForm.taskIds.includes(taskId)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setCoRunForm(prev => ({ 
                                  ...prev, 
                                  taskIds: [...prev.taskIds, taskId] 
                                }));
                              } else {
                                setCoRunForm(prev => ({ 
                                  ...prev, 
                                  taskIds: prev.taskIds.filter(id => id !== taskId) 
                                }));
                              }
                            }}
                          />
                          <span className="text-sm">{taskId}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <Label>Description (optional)</Label>
                    <Textarea
                      value={coRunForm.description}
                      onChange={(e) => setCoRunForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe why these tasks must run together"
                    />
                  </div>
                  
                  <Button onClick={createCoRunRule} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Co-Run Rule
                  </Button>
                </div>
              </div>
            )}

            {/* Load Limit Rule Form */}
            {selectedRuleType === 'loadLimit' && (
              <div className="space-y-4 p-4 border rounded-lg">
                <h3 className="font-medium flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Create Load Limit Rule
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <Label>Rule Name (optional)</Label>
                    <Input
                      value={loadLimitForm.name}
                      onChange={(e) => setLoadLimitForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter rule name"
                    />
                  </div>
                  
                  <div>
                    <Label>Worker Group</Label>
                    <Select
                      value={loadLimitForm.workerGroup}
                      onValueChange={(value) => setLoadLimitForm(prev => ({ ...prev, workerGroup: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select worker group" />
                      </SelectTrigger>
                      <SelectContent>
                        {workerGroups.map(group => (
                          <SelectItem key={group} value={group}>{group}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Max Tasks Per Phase</Label>
                    <Input
                      type="number"
                      value={loadLimitForm.maxSlotsPerPhase}
                      onChange={(e) => setLoadLimitForm(prev => ({ 
                        ...prev, 
                        maxSlotsPerPhase: parseInt(e.target.value) || 1 
                      }))}
                      min="1"
                      max="10"
                    />
                  </div>
                  
                  <div>
                    <Label>Description (optional)</Label>
                    <Textarea
                      value={loadLimitForm.description}
                      onChange={(e) => setLoadLimitForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe the load limit reasoning"
                    />
                  </div>
                  
                  <Button onClick={createLoadLimitRule} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Load Limit Rule
                  </Button>
                </div>
              </div>
            )}

            {/* Phase Window Rule Form */}
            {selectedRuleType === 'phaseWindow' && (
              <div className="space-y-4 p-4 border rounded-lg">
                <h3 className="font-medium flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Create Phase Window Rule
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <Label>Rule Name (optional)</Label>
                    <Input
                      value={phaseWindowForm.name}
                      onChange={(e) => setPhaseWindowForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter rule name"
                    />
                  </div>
                  
                  <div>
                    <Label>Task</Label>
                    <Select
                      value={phaseWindowForm.taskId}
                      onValueChange={(value) => setPhaseWindowForm(prev => ({ ...prev, taskId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select task" />
                      </SelectTrigger>
                      <SelectContent>
                        {taskIds.map(taskId => (
                          <SelectItem key={taskId} value={taskId}>{taskId}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Allowed Phases</Label>
                    <div className="grid grid-cols-5 gap-2 mt-2">
                      {[1, 2, 3, 4, 5].map(phase => (
                        <label key={phase} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={phaseWindowForm.allowedPhases.includes(phase)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setPhaseWindowForm(prev => ({ 
                                  ...prev, 
                                  allowedPhases: [...prev.allowedPhases, phase].sort() 
                                }));
                              } else {
                                setPhaseWindowForm(prev => ({ 
                                  ...prev, 
                                  allowedPhases: prev.allowedPhases.filter(p => p !== phase) 
                                }));
                              }
                            }}
                          />
                          <span className="text-sm">Phase {phase}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <Label>Description (optional)</Label>
                    <Textarea
                      value={phaseWindowForm.description}
                      onChange={(e) => setPhaseWindowForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe why this task is restricted to these phases"
                    />
                  </div>
                  
                  <Button onClick={createPhaseWindowRule} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Phase Window Rule
                  </Button>
                </div>
              </div>
            )}

            {/* Slot Restriction Rule Form */}
            {selectedRuleType === 'slotRestriction' && (
              <div className="space-y-4 p-4 border rounded-lg">
                <h3 className="font-medium flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Create Slot Restriction Rule
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <Label>Rule Name (optional)</Label>
                    <Input
                      value={slotRestrictionForm.name}
                      onChange={(e) => setSlotRestrictionForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter rule name"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Client Group</Label>
                      <Select
                        value={slotRestrictionForm.clientGroup}
                        onValueChange={(value) => setSlotRestrictionForm(prev => ({ ...prev, clientGroup: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select client group" />
                        </SelectTrigger>
                        <SelectContent>
                          {clientGroups.map(group => (
                            <SelectItem key={group} value={group}>{group}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Worker Group</Label>
                      <Select
                        value={slotRestrictionForm.workerGroup}
                        onValueChange={(value) => setSlotRestrictionForm(prev => ({ ...prev, workerGroup: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select worker group" />
                        </SelectTrigger>
                        <SelectContent>
                          {workerGroups.map(group => (
                            <SelectItem key={group} value={group}>{group}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label>Minimum Common Slots</Label>
                    <Input
                      type="number"
                      value={slotRestrictionForm.minCommonSlots}
                      onChange={(e) => setSlotRestrictionForm(prev => ({ 
                        ...prev, 
                        minCommonSlots: parseInt(e.target.value) || 1 
                      }))}
                      min="1"
                      max="5"
                    />
                  </div>
                  
                  <div>
                    <Label>Description (optional)</Label>
                    <Textarea
                      value={slotRestrictionForm.description}
                      onChange={(e) => setSlotRestrictionForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe the slot restriction requirement"
                    />
                  </div>
                  
                  <Button onClick={createSlotRestrictionRule} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Slot Restriction Rule
                  </Button>
                </div>
              </div>
            )}

            {/* Pattern Match Rule Form */}
            {selectedRuleType === 'patternMatch' && (
              <div className="space-y-4 p-4 border rounded-lg">
                <h3 className="font-medium flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Create Pattern Match Rule
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <Label>Rule Name (optional)</Label>
                    <Input
                      value={patternMatchForm.name}
                      onChange={(e) => setPatternMatchForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter rule name"
                    />
                  </div>
                  
                  <div>
                    <Label>Regex Pattern</Label>
                    <Input
                      value={patternMatchForm.regex}
                      onChange={(e) => setPatternMatchForm(prev => ({ ...prev, regex: e.target.value }))}
                      placeholder="^API.*|.*Test$"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Rule Template</Label>
                      <Select
                        value={patternMatchForm.ruleTemplate}
                        onValueChange={(value) => setPatternMatchForm(prev => ({ ...prev, ruleTemplate: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="priority">Priority Assignment</SelectItem>
                          <SelectItem value="phase">Phase Restriction</SelectItem>
                          <SelectItem value="worker">Worker Assignment</SelectItem>
                          <SelectItem value="load">Load Adjustment</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Parameters</Label>
                      <Input
                        value={patternMatchForm.parameters}
                        onChange={(e) => setPatternMatchForm(prev => ({ ...prev, parameters: e.target.value }))}
                        placeholder="high, low, 1-3, etc."
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label>Description (optional)</Label>
                    <Textarea
                      value={patternMatchForm.description}
                      onChange={(e) => setPatternMatchForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe how the pattern matching should work"
                    />
                  </div>
                  
                  <Button onClick={createPatternMatchRule} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Pattern Match Rule
                  </Button>
                </div>
              </div>
            )}

            {/* Precedence Rule Form */}
            {selectedRuleType === 'precedence' && (
              <div className="space-y-4 p-4 border rounded-lg">
                <h3 className="font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Create Precedence Override Rule
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <Label>Rule Name (optional)</Label>
                    <Input
                      value={precedenceForm.name}
                      onChange={(e) => setPrecedenceForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter rule name"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Global Rule</Label>
                      <Input
                        value={precedenceForm.globalRule}
                        onChange={(e) => setPrecedenceForm(prev => ({ ...prev, globalRule: e.target.value }))}
                        placeholder="All workers max 3 tasks"
                      />
                    </div>
                    
                    <div>
                      <Label>Specific Rule</Label>
                      <Input
                        value={precedenceForm.specificRule}
                        onChange={(e) => setPrecedenceForm(prev => ({ ...prev, specificRule: e.target.value }))}
                        placeholder="Senior workers max 5 tasks"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label>Priority Level (1-10)</Label>
                    <Input
                      type="number"
                      value={precedenceForm.priority}
                      onChange={(e) => setPrecedenceForm(prev => ({ 
                        ...prev, 
                        priority: parseInt(e.target.value) || 1 
                      }))}
                      min="1"
                      max="10"
                    />
                  </div>
                  
                  <div>
                    <Label>Description (optional)</Label>
                    <Textarea
                      value={precedenceForm.description}
                      onChange={(e) => setPrecedenceForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe when the specific rule should override the global rule"
                    />
                  </div>
                  
                  <Button onClick={createPrecedenceRule} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Precedence Rule
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Natural Language Tab */}
          <TabsContent value="natural" className="space-y-6">
            <div className="space-y-4">
              <div className="text-center">
                <Sparkles className="w-12 h-12 mx-auto mb-3 text-blue-500" />
                <h3 className="font-medium mb-2">AI Rule Assistant</h3>
                <p className="text-sm text-gray-600">
                  Describe your business rule in plain English and let AI create it for you
                </p>
              </div>
              
              <div className="space-y-3">
                <Label>Describe your rule in natural language:</Label>
                <Textarea
                  value={naturalLanguageInput}
                  onChange={(e) => setNaturalLanguageInput(e.target.value)}
                  placeholder="Examples:
• T1 and T2 must run together
• Frontend team max 5 tasks per phase  
• T5 can only run in phases 1-3
• GroupA needs min 2 common slots
• Tasks matching /^API.*/ get high priority
• Senior workers override global load limits"
                  rows={6}
                />
                
                <Button 
                  onClick={() => processNaturalLanguage(naturalLanguageInput)}
                  disabled={!naturalLanguageInput.trim() || isProcessingNL}
                  className="w-full"
                >
                  {isProcessingNL ? (
                    <>
                      <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
                      Processing with AI...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Create Rule with AI
                    </>
                  )}
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">Co-Run & Phase Examples:</h4>
                  <ul className="text-xs space-y-1 text-gray-600">
                    <li>• "T1 and T2 must run together"</li>
                    <li>• "T5 can only run in phases 1-3"</li>
                  </ul>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">Load & Pattern Examples:</h4>
                  <ul className="text-xs space-y-1 text-gray-600">
                    <li>• "Frontend team max 5 tasks per phase"</li>
                    <li>• "Tasks matching /API.*/ get high priority"</li>
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Manage Rules Tab */}
          <TabsContent value="manage" className="space-y-4">
            {rules.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Settings className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No business rules created yet</p>
                <p className="text-sm">Create your first rule using the tabs above</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rules.map(rule => (
                  <div
                    key={rule.id}
                    className={`p-4 border rounded-lg ${
                      rule.isActive ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        {getRuleIcon(rule.type)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{rule.name}</h4>
                            <Badge variant={rule.isActive ? "default" : "secondary"}>
                              {rule.isActive ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
                              {rule.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                            <Badge variant="outline">{rule.type}</Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{rule.description}</p>
                          <div className="text-xs text-gray-500">
                            Created: {rule.createdAt.toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleRule(rule.id)}
                        >
                          {rule.isActive ? 'Disable' : 'Enable'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteRule(rule.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}