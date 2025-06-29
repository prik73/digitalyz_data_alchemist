// src/app/api/ai/analyze-patterns/route.ts - REAL LLM VERSION
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { data, currentRules } = await request.json();
    console.log('🔍 Analyze-patterns called with:', {
      clients: data.clients?.length || 0,
      workers: data.workers?.length || 0,
      tasks: data.tasks?.length || 0
    });

    // Quick validation
    if (!data.clients || !data.workers || !data.tasks) {
      return NextResponse.json({ suggestions: [] });
    }

    // 🚀 REAL DATA ANALYSIS WITH LLM
    const realSuggestions = await analyzeWithLLM(data, currentRules || []);
    
    console.log('✅ LLM returned suggestions:', realSuggestions.length);
    return NextResponse.json({ suggestions: realSuggestions });

  } catch (error) {
    console.error('❌ Error in analyze-patterns:', error);
    
    // Fallback to simple pattern analysis if LLM fails
    const fallbackSuggestions = analyzeLocalPatterns(data);
    console.log('🔄 Using fallback analysis:', fallbackSuggestions.length);
    
    return NextResponse.json({ 
      suggestions: fallbackSuggestions,
      usedFallback: true 
    });
  }
}

async function analyzeWithLLM(data: any, currentRules: any[]) {
  // Prepare data summary for LLM
  const dataSummary = {
    clientCount: data.clients.length,
    workerCount: data.workers.length,
    taskCount: data.tasks.length,
    
    // Client patterns
    clientGroups: getClientGroupDistribution(data.clients),
    priorityDistribution: getPriorityDistribution(data.clients),
    taskRequestPatterns: getTaskRequestPatterns(data.clients),
    
    // Worker patterns  
    workerGroups: getWorkerGroupDistribution(data.workers),
    skillDistribution: getSkillDistribution(data.workers),
    workloadPatterns: getWorkloadPatterns(data.workers),
    
    // Task patterns
    taskCategories: getTaskCategories(data.tasks),
    durationPatterns: getDurationPatterns(data.tasks),
    skillRequirements: getSkillRequirements(data.tasks),
    
    // Existing rules to avoid duplicates
    existingRuleTypes: currentRules.map(r => r.type)
  };

  const systemPrompt = `You are an expert business rule analyst. Analyze the provided data patterns and suggest 2-4 intelligent business rules.

AVAILABLE RULE TYPES:
1. "coRun" - Tasks that should run together (when they're frequently requested together)
2. "loadLimit" - Maximum workload per worker group (when groups are overloaded)  
3. "phaseWindow" - Restrict tasks to specific phases (for long-duration or conflicting tasks)
4. "slotRestriction" - Common slot requirements (when groups need coordination)

LOOK FOR THESE PATTERNS:
- Task pairs/groups requested together by multiple clients → coRun rule
- Worker groups with high average loads → loadLimit rule
- Tasks with long durations (>3 phases) → phaseWindow rule  
- Groups that need coordination → slotRestriction rule

Return a JSON array of suggestions:
[
  {
    "type": "coRun",
    "title": "Co-run Tasks T1 & T2",
    "description": "These tasks are requested together by 8 clients",
    "reasoning": "T1 and T2 appear together in 73% of client requests (22 out of 30 clients)",
    "confidence": 88,
    "impact": "high",
    "parameters": {"taskIds": ["T1", "T2"]},
    "affectedEntities": ["T1", "T2"],
    "pattern": "frequent_co_requests"
  }
]

Focus on the most impactful patterns. Use actual data values in reasoning. Confidence should be 60-95 based on pattern strength.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { 
          role: "user", 
          content: `Analyze this data for business rule recommendations:\n\n${JSON.stringify(dataSummary, null, 2)}`
        }
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    const response = completion.choices[0].message.content;
    console.log('🤖 LLM raw response:', response?.substring(0, 200) + '...');
    
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    // Parse LLM response
    let suggestions;
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      } else {
        suggestions = JSON.parse(response);
      }
    } catch (parseError) {
      console.error('❌ Failed to parse LLM response:', parseError);
      throw new Error('Invalid JSON from LLM');
    }

    // Validate and enhance suggestions
    const validSuggestions = suggestions
      .filter((s: any) => s.type && s.title && s.description)
      .slice(0, 4) // Limit to 4 suggestions
      .map((suggestion: any, index: number) => ({
        id: `llm_suggestion_${Date.now()}_${index}`,
        type: suggestion.type,
        title: suggestion.title,
        description: suggestion.description,
        reasoning: suggestion.reasoning || 'AI detected pattern in data',
        confidence: Math.min(95, Math.max(60, suggestion.confidence || 75)),
        impact: suggestion.impact || 'medium',
        parameters: suggestion.parameters || {},
        affectedEntities: suggestion.affectedEntities || [],
        pattern: suggestion.pattern || 'ai_detected'
      }));

    console.log('✅ Processed LLM suggestions:', validSuggestions.length);
    return validSuggestions;

  } catch (llmError) {
    console.error('❌ LLM analysis failed:', llmError);
    throw llmError;
  }
}

// Helper functions to analyze real data patterns
function getClientGroupDistribution(clients: any[]) {
  const groups: Record<string, number> = {};
  clients.forEach(client => {
    const group = client.GroupTag || 'Other';
    groups[group] = (groups[group] || 0) + 1;
  });
  return groups;
}

function getPriorityDistribution(clients: any[]) {
  const priorities: Record<number, number> = {};
  clients.forEach(client => {
    const priority = client.PriorityLevel || 1;
    priorities[priority] = (priorities[priority] || 0) + 1;
  });
  return priorities;
}

function getTaskRequestPatterns(clients: any[]) {
  const taskPairs: Record<string, number> = {};
  const singleTasks: Record<string, number> = {};
  
  clients.forEach(client => {
    if (client.RequestedTaskIDs) {
      const tasks = client.RequestedTaskIDs.split(',').map((id: string) => id.trim()).filter(Boolean);
      
      // Count individual tasks
      tasks.forEach(taskId => {
        singleTasks[taskId] = (singleTasks[taskId] || 0) + 1;
      });
      
      // Count task pairs
      if (tasks.length >= 2) {
        for (let i = 0; i < tasks.length; i++) {
          for (let j = i + 1; j < tasks.length; j++) {
            const pair = [tasks[i], tasks[j]].sort().join('-');
            taskPairs[pair] = (taskPairs[pair] || 0) + 1;
          }
        }
      }
    }
  });
  
  return { 
    frequentPairs: Object.entries(taskPairs)
      .filter(([, count]) => count >= 2)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5),
    popularTasks: Object.entries(singleTasks)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
  };
}

function getWorkerGroupDistribution(workers: any[]) {
  const groups: Record<string, {count: number, avgLoad: number, totalLoad: number}> = {};
  
  workers.forEach(worker => {
    const group = worker.WorkerGroup || 'Other';
    const load = worker.MaxLoadPerPhase || 0;
    
    if (!groups[group]) {
      groups[group] = { count: 0, avgLoad: 0, totalLoad: 0 };
    }
    
    groups[group].count++;
    groups[group].totalLoad += load;
    groups[group].avgLoad = groups[group].totalLoad / groups[group].count;
  });
  
  return groups;
}

function getSkillDistribution(workers: any[]) {
  const skills: Record<string, number> = {};
  
  workers.forEach(worker => {
    if (worker.Skills) {
      const skillList = worker.Skills.split(',').map((s: string) => s.trim().toLowerCase());
      skillList.forEach(skill => {
        skills[skill] = (skills[skill] || 0) + 1;
      });
    }
  });
  
  return Object.entries(skills)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);
}

function getWorkloadPatterns(workers: any[]) {
  const loads = workers.map(w => w.MaxLoadPerPhase || 0).filter(l => l > 0);
  const avgLoad = loads.reduce((sum, load) => sum + load, 0) / loads.length;
  const maxLoad = Math.max(...loads);
  const overloadedCount = loads.filter(load => load > avgLoad * 1.5).length;
  
  return { avgLoad, maxLoad, overloadedCount, totalWorkers: workers.length };
}

function getTaskCategories(tasks: any[]) {
  const categories: Record<string, number> = {};
  const durations: number[] = [];
  
  tasks.forEach(task => {
    const category = task.Category || 'Other';
    categories[category] = (categories[category] || 0) + 1;
    
    if (task.Duration) {
      durations.push(task.Duration);
    }
  });
  
  return { categories, durations };
}

function getDurationPatterns(tasks: any[]) {
  const durations = tasks.map(t => t.Duration || 1);
  const avgDuration = durations.reduce((sum, dur) => sum + dur, 0) / durations.length;
  const longTasks = tasks.filter(t => (t.Duration || 1) > 3);
  
  return { avgDuration, longTaskCount: longTasks.length, longTasks: longTasks.slice(0, 5) };
}

function getSkillRequirements(tasks: any[]) {
  const skillDemand: Record<string, number> = {};
  
  tasks.forEach(task => {
    if (task.RequiredSkills) {
      const skills = task.RequiredSkills.split(',').map((s: string) => s.trim().toLowerCase());
      skills.forEach(skill => {
        skillDemand[skill] = (skillDemand[skill] || 0) + 1;
      });
    }
  });
  
  return Object.entries(skillDemand)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);
}

// Fallback local analysis if LLM fails
function analyzeLocalPatterns(data: any) {
  const suggestions = [];
  
  // Simple co-run detection
  const taskPairs = getTaskRequestPatterns(data.clients).frequentPairs;
  if (taskPairs.length > 0) {
    const [pairKey, frequency] = taskPairs[0];
    const [task1, task2] = pairKey.split('-');
    
    suggestions.push({
      id: `local_corun_${Date.now()}`,
      type: "coRun",
      title: `Co-run Tasks ${task1} & ${task2}`,
      description: `These tasks are requested together by ${frequency} clients`,
      reasoning: `Found ${frequency} clients requesting both tasks together`,
      confidence: Math.min(90, 50 + frequency * 10),
      impact: frequency >= 3 ? "high" : "medium",
      parameters: { taskIds: [task1, task2] },
      affectedEntities: [task1, task2],
      pattern: "frequent_co_requests"
    });
  }
  
  // Simple load limit detection
  const workerGroups = getWorkerGroupDistribution(data.workers);
  const overloadedGroup = Object.entries(workerGroups)
    .find(([, stats]) => stats.avgLoad > 4);
    
  if (overloadedGroup) {
    const [groupName, stats] = overloadedGroup;
    suggestions.push({
      id: `local_load_${Date.now()}`,
      type: "loadLimit",
      title: `Load Limit for ${groupName}`,
      description: `${groupName} workers have high average workload`,
      reasoning: `Average load is ${stats.avgLoad.toFixed(1)}, consider limiting to ${Math.floor(stats.avgLoad * 0.8)}`,
      confidence: 75,
      impact: "medium",
      parameters: { 
        workerGroup: groupName, 
        maxSlotsPerPhase: Math.floor(stats.avgLoad * 0.8) 
      },
      affectedEntities: [`${stats.count} workers`],
      pattern: "workload_imbalance"
    });
  }
  
  return suggestions.slice(0, 3);
}