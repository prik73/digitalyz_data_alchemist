'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import {
  Target,
  Sliders,
  RotateCcw,
  Save,
  TrendingUp,
  Users,
  Clock,
  DollarSign,
  Zap,
  Award,
  ArrowUpDown
} from 'lucide-react';
import type { PriorityWeights } from '@/types';

interface PriorityProfile {
  id: string;
  name: string;
  description: string;
  weights: PriorityWeights;
  icon: React.ReactNode;
}

interface PriorityWeightsSystemProps {
  onWeightsChange: (weights: PriorityWeights) => void;
  currentWeights?: PriorityWeights;
}

const PriorityWeightsSystem: React.FC<PriorityWeightsSystemProps> = ({
  onWeightsChange,
  currentWeights
}) => {
  const [weights, setWeights] = useState<PriorityWeights>(currentWeights || {
    priorityLevel: 80,
    skillMatching: 70,
    workloadBalance: 60,
    deadlineAdherence: 90,
    costOptimization: 50,
    clientSatisfaction: 85,
    resourceUtilization: 65,
    qualityScore: 75
  });

  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [comparisonMode, setComparisonMode] = useState(false);
  const [savedProfiles, setSavedProfiles] = useState<PriorityProfile[]>([]);

  // Predefined priority profiles
  const defaultProfiles: PriorityProfile[] = [
    {
      id: 'balanced',
      name: 'Balanced Approach',
      description: 'Equal emphasis on all factors',
      icon: <Target className="w-4 h-4" />,
      weights: {
        priorityLevel: 70,
        skillMatching: 70,
        workloadBalance: 70,
        deadlineAdherence: 70,
        costOptimization: 70,
        clientSatisfaction: 70,
        resourceUtilization: 70,
        qualityScore: 70
      }
    },
    {
      id: 'client-first',
      name: 'Client Satisfaction First',
      description: 'Maximize client happiness and priority',
      icon: <Users className="w-4 h-4" />,
      weights: {
        priorityLevel: 95,
        skillMatching: 80,
        workloadBalance: 40,
        deadlineAdherence: 90,
        costOptimization: 30,
        clientSatisfaction: 100,
        resourceUtilization: 50,
        qualityScore: 85
      }
    },
    {
      id: 'efficiency',
      name: 'Maximum Efficiency',
      description: 'Optimize for speed and resource utilization',
      icon: <Zap className="w-4 h-4" />,
      weights: {
        priorityLevel: 60,
        skillMatching: 90,
        workloadBalance: 85,
        deadlineAdherence: 95,
        costOptimization: 80,
        clientSatisfaction: 65,
        resourceUtilization: 100,
        qualityScore: 70
      }
    },
    {
      id: 'quality',
      name: 'Quality Focus',
      description: 'Prioritize skill matching and work quality',
      icon: <Award className="w-4 h-4" />,
      weights: {
        priorityLevel: 75,
        skillMatching: 100,
        workloadBalance: 80,
        deadlineAdherence: 70,
        costOptimization: 40,
        clientSatisfaction: 85,
        resourceUtilization: 60,
        qualityScore: 95
      }
    },
    {
      id: 'cost-effective',
      name: 'Cost Optimization',
      description: 'Minimize costs while maintaining quality',
      icon: <DollarSign className="w-4 h-4" />,
      weights: {
        priorityLevel: 65,
        skillMatching: 75,
        workloadBalance: 90,
        deadlineAdherence: 60,
        costOptimization: 100,
        clientSatisfaction: 70,
        resourceUtilization: 95,
        qualityScore: 65
      }
    }
  ];

  const criteriaDefinitions = [
    {
      key: 'priorityLevel' as keyof PriorityWeights,
      label: 'Client Priority Level',
      description: 'How much weight to give to client priority ratings (1-5)',
      icon: <Users className="w-4 h-4 text-blue-500" />,
      color: 'blue'
    },
    {
      key: 'skillMatching' as keyof PriorityWeights,
      label: 'Skill Matching',
      description: 'Importance of matching worker skills to task requirements',
      icon: <Target className="w-4 h-4 text-green-500" />,
      color: 'green'
    },
    {
      key: 'workloadBalance' as keyof PriorityWeights,
      label: 'Workload Balance',
      description: 'Distribute work evenly across workers',
      icon: <Sliders className="w-4 h-4 text-purple-500" />,
      color: 'purple'
    },
    {
      key: 'deadlineAdherence' as keyof PriorityWeights,
      label: 'Deadline Adherence',
      description: 'Meeting project deadlines and time constraints',
      icon: <Clock className="w-4 h-4 text-red-500" />,
      color: 'red'
    },
    {
      key: 'costOptimization' as keyof PriorityWeights,
      label: 'Cost Optimization',
      description: 'Minimize resource costs and maximize efficiency',
      icon: <DollarSign className="w-4 h-4 text-yellow-500" />,
      color: 'yellow'
    },
    {
      key: 'clientSatisfaction' as keyof PriorityWeights,
      label: 'Client Satisfaction',
      description: 'Overall client happiness and relationship quality',
      icon: <Award className="w-4 h-4 text-pink-500" />,
      color: 'pink'
    },
    {
      key: 'resourceUtilization' as keyof PriorityWeights,
      label: 'Resource Utilization',
      description: 'Maximum use of available worker capacity',
      icon: <TrendingUp className="w-4 h-4 text-indigo-500" />,
      color: 'indigo'
    },
    {
      key: 'qualityScore' as keyof PriorityWeights,
      label: 'Quality Score',
      description: 'Overall quality of work and deliverables',
      icon: <Target className="w-4 h-4 text-orange-500" />,
      color: 'orange'
    }
  ];

  const handleWeightChange = (key: keyof PriorityWeights, value: number[]) => {
    const newWeights = {
      ...weights,
      [key]: value[0]
    };
    setWeights(newWeights);
    onWeightsChange(newWeights);
  };

  const applyProfile = (profile: PriorityProfile) => {
    setWeights(profile.weights);
    onWeightsChange(profile.weights);
    setSelectedProfile(profile.id);
  };

  const resetToDefaults = () => {
    const defaultWeights: PriorityWeights = {
      priorityLevel: 70,
      skillMatching: 70,
      workloadBalance: 70,
      deadlineAdherence: 70,
      costOptimization: 70,
      clientSatisfaction: 70,
      resourceUtilization: 70,
      qualityScore: 70
    };
    setWeights(defaultWeights);
    onWeightsChange(defaultWeights);
    setSelectedProfile('');
  };

  const saveCurrentProfile = () => {
    const profileName = prompt('Enter a name for this priority profile:');
    if (profileName) {
      const newProfile: PriorityProfile = {
        id: `custom_${Date.now()}`,
        name: profileName,
        description: 'Custom priority configuration',
        icon: <Target className="w-4 h-4" />,
        weights: { ...weights }
      };
      setSavedProfiles(prev => [...prev, newProfile]);
    }
  };

  // Prepare data for charts
  const chartData = criteriaDefinitions.map(criteria => ({
    name: criteria.label.replace(' ', '\n'),
    value: weights[criteria.key],
    fullName: criteria.label
  }));

  const radarData = criteriaDefinitions.map(criteria => ({
    criteria: criteria.label,
    value: weights[criteria.key],
    fullMark: 100
  }));

  const getWeightColor = (weight: number) => {
    if (weight >= 80) return 'text-green-600 bg-green-100';
    if (weight >= 60) return 'text-yellow-600 bg-yellow-100';
    if (weight >= 40) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const calculateProfileMatch = (profile: PriorityProfile) => {
    const differences = Object.keys(weights).map(key => {
      const currentWeight = weights[key as keyof PriorityWeights];
      const profileWeight = profile.weights[key as keyof PriorityWeights];
      return Math.abs(currentWeight - profileWeight);
    });
    const avgDifference = differences.reduce((sum, diff) => sum + diff, 0) / differences.length;
    return Math.max(0, 100 - avgDifference);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-purple-500" />
          Priority & Weights Configuration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="sliders" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="sliders">Manual Setup</TabsTrigger>
            <TabsTrigger value="profiles">Quick Profiles</TabsTrigger>
            <TabsTrigger value="visualization">Visualization</TabsTrigger>
            <TabsTrigger value="comparison">Compare</TabsTrigger>
          </TabsList>

          {/* Manual Sliders Tab */}
          <TabsContent value="sliders" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {criteriaDefinitions.map(criteria => (
                <div key={criteria.key} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {criteria.icon}
                      <Label className="font-medium">{criteria.label}</Label>
                    </div>
                    <Badge className={getWeightColor(weights[criteria.key])}>
                      {weights[criteria.key]}%
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600">{criteria.description}</p>
                  <Slider
                    value={[weights[criteria.key]]}
                    onValueChange={(value) => handleWeightChange(criteria.key, value)}
                    max={100}
                    min={0}
                    step={5}
                    className="w-full"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-gray-600">
                Total weight distribution configured
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={resetToDefaults}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
                <Button variant="outline" onClick={saveCurrentProfile}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Profile
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Quick Profiles Tab */}
          <TabsContent value="profiles" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {defaultProfiles.map(profile => (
                <Card
                  key={profile.id}
                  className={`cursor-pointer transition-colors ${
                    selectedProfile === profile.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'hover:border-gray-300'
                  }`}
                  onClick={() => applyProfile(profile)}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      {profile.icon}
                      {profile.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-gray-600 mb-3">{profile.description}</p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Client Priority:</span>
                        <span className="font-medium">{profile.weights.priorityLevel}%</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Skill Match:</span>
                        <span className="font-medium">{profile.weights.skillMatching}%</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Deadline:</span>
                        <span className="font-medium">{profile.weights.deadlineAdherence}%</span>
                      </div>
                    </div>
                    <div className="mt-3 text-center">
                      <Badge variant="outline" className="text-xs">
                        {Math.round(calculateProfileMatch(profile))}% match
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Custom Saved Profiles */}
            {savedProfiles.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium">Your Saved Profiles</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedProfiles.map(profile => (
                    <Card
                      key={profile.id}
                      className="cursor-pointer hover:border-gray-300"
                      onClick={() => applyProfile(profile)}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">{profile.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-gray-600">{profile.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Visualization Tab */}
          <TabsContent value="visualization" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Weight Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        fontSize={10}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis fontSize={10} />
                      <Tooltip 
                        labelFormatter={(label) => chartData.find(d => d.name === label)?.fullName || label}
                      />
                      <Bar dataKey="value" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Radar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Priority Profile</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="criteria" fontSize={10} />
                      <PolarRadiusAxis 
                        angle={90} 
                        domain={[0, 100]} 
                        fontSize={8}
                      />
                      <Radar
                        name="Weights"
                        dataKey="value"
                        stroke="#8884d8"
                        fill="#8884d8"
                        fillOpacity={0.3}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Weight Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Current Configuration Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {criteriaDefinitions.map(criteria => (
                    <div key={criteria.key} className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        {criteria.icon}
                      </div>
                      <div className="text-xs font-medium">{criteria.label}</div>
                      <div className={`text-lg font-bold px-2 py-1 rounded ${getWeightColor(weights[criteria.key])}`}>
                        {weights[criteria.key]}%
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Comparison Tab */}
          <TabsContent value="comparison" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Label>Compare with profile:</Label>
                <Select onValueChange={(value) => {
                  const profile = defaultProfiles.find(p => p.id === value);
                  if (profile) {
                    setComparisonMode(true);
                  }
                }}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select profile to compare" />
                  </SelectTrigger>
                  <SelectContent>
                    {defaultProfiles.map(profile => (
                      <SelectItem key={profile.id} value={profile.id}>
                        <div className="flex items-center gap-2">
                          {profile.icon}
                          {profile.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {defaultProfiles.map(profile => (
                  <Card key={profile.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          {profile.icon}
                          {profile.name}
                        </div>
                        <Badge variant="outline">
                          {Math.round(calculateProfileMatch(profile))}% match
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {criteriaDefinitions.slice(0, 4).map(criteria => {
                          const currentValue = weights[criteria.key];
                          const profileValue = profile.weights[criteria.key];
                          const difference = profileValue - currentValue;
                          
                          return (
                            <div key={criteria.key} className="flex items-center justify-between text-xs">
                              <span>{criteria.label}:</span>
                              <div className="flex items-center gap-2">
                                <span>{profileValue}%</span>
                                {difference !== 0 && (
                                  <Badge 
                                    variant={difference > 0 ? "default" : "secondary"}
                                    className="text-xs"
                                  >
                                    <ArrowUpDown className="w-2 h-2 mr-1" />
                                    {difference > 0 ? '+' : ''}{difference}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <Button 
                        size="sm" 
                        className="w-full mt-3"
                        onClick={() => applyProfile(profile)}
                      >
                        Apply This Profile
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default PriorityWeightsSystem;