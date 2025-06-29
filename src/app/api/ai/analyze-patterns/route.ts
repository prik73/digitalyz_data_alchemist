import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});


interface Suggestion {
pattern: string;
confidence?: number;
// add more fields if needed
}
interface Client {
  RequestedTaskIDs: string;
}

interface Task {
  TaskID: string;
}

interface Phase {
  id: string;
}

interface Action {
  type: "coRun";
}


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

    // 🚀 TRY LLM FIRST, FALLBACK IF FAILS
    try {
      const llmSuggestions = await analyzeWithLLM(data, currentRules || []);
      console.log('✅ LLM analysis successful:', llmSuggestions.length);
      return NextResponse.json({ suggestions: llmSuggestions });
    } catch (llmError) {
      console.log('🔄 LLM failed, using fallback analysis');
      const fallbackSuggestions = analyzeLocalPatterns(data);
      console.log('✅ Fallback analysis:', fallbackSuggestions.length);
      return NextResponse.json({ 
        suggestions: fallbackSuggestions,
        usedFallback: true 
      });
    }

  } catch (error) {
    console.error('❌ Complete API failure:', error);
    return NextResponse.json({ 
      error: 'Analysis failed', 
      suggestions: [] 
    }, { status: 500 });
  }
}

async function analyzeWithLLM(data: any, currentRules: any[]) {
  // Prepare SIMPLE data summary for LLM
  const taskRequestPatterns = getTaskRequestPatterns(data.clients);
  const workerGroupStats = getWorkerGroupDistribution(data.workers);
  
  const dataSummary = {
    totalClients: data.clients.length,
    totalWorkers: data.workers.length,
    totalTasks: data.tasks.length,
    
    // Most frequent task pairs
    frequentTaskPairs: taskRequestPatterns.frequentPairs.slice(0, 3),
    
    // Worker group loads
    workerGroupLoads: Object.entries(workerGroupStats)
      .map(([group, stats]) => ({
        group,
        avgLoad: Math.round(stats.avgLoad * 10) / 10,
        workerCount: stats.count
      }))
      .filter(g => g.avgLoad > 3),
    
    // Existing rule types to avoid duplicates
    existingRules: currentRules.map(r => r.type)
  };

  // 🔥 ULTRA-SPECIFIC PROMPT FOR JSON ONLY
  const systemPrompt = `You are a business rule generator. Return ONLY a JSON array, no other text.

Analyze the data and return 1-3 rule suggestions in this EXACT format:

[
  {
    "type": "coRun",
    "title": "Co-run Tasks T1 & T2", 
    "description": "These tasks are requested together frequently",
    "reasoning": "Found in X client requests",
    "confidence": 85,
    "impact": "high",
    "parameters": {"taskIds": ["T1", "T2"]},
    "affectedEntities": ["T1", "T2"],
    "pattern": "frequent_co_requests"
  }
]

RULES:
- ONLY return the JSON array, no explanation text
- Use "coRun" for task pairs requested together
- Use "loadLimit" for overloaded worker groups (avgLoad > 4)
- confidence: 60-95 number
- impact: "high", "medium", or "low"
- Max 3 suggestions

Data to analyze: ${JSON.stringify(dataSummary)}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You must respond with only valid JSON. No explanations." },
        { role: "user", content: systemPrompt }
      ],
      temperature: 0.1,
      max_tokens: 800,
    });

    const response = completion.choices[0].message.content?.trim();
    console.log('🤖 LLM raw response (first 100 chars):', response?.substring(0, 100));
    
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    // 🔧 BETTER JSON EXTRACTION
    let cleanResponse = response;
    
    // Remove any text before the JSON array
    const jsonStart = cleanResponse.indexOf('[');
    const jsonEnd = cleanResponse.lastIndexOf(']');
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      cleanResponse = cleanResponse.substring(jsonStart, jsonEnd + 1);
    }
    
    // Remove markdown code blocks if present
    cleanResponse = cleanResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    console.log('🔧 Cleaned response:', cleanResponse);


    let suggestions: Suggestion[];
    try {
    suggestions = JSON.parse(cleanResponse) as Suggestion[];
    } catch (parseError: unknown) {
    console.error('❌ JSON parse failed, response was:', cleanResponse);
    throw new Error(`Invalid JSON: ${String(parseError)}`);
    }
    // Validate it's an array
    if (!Array.isArray(suggestions)) {
      throw new Error('Response is not an array');
    }

    // Validate and enhance suggestions
    const validSuggestions = suggestions
      .filter((s: any) => s.type && s.title && s.description)
      .slice(0, 3) // Limit to 3
      .map((suggestion: any, index: number) => ({
        id: `llm_${Date.now()}_${index}`,
        type: suggestion.type,
        title: suggestion.title,
        description: suggestion.description,
        reasoning: suggestion.reasoning || 'AI detected pattern',
        confidence: Math.min(95, Math.max(60, suggestion.confidence || 75)),
        impact: suggestion.impact || 'medium',
        parameters: suggestion.parameters || {},
        affectedEntities: suggestion.affectedEntities || [],
        pattern: suggestion.pattern || 'ai_detected'
      }));

    console.log('✅ Valid LLM suggestions:', validSuggestions.length);
    return validSuggestions;

  } catch (error) {
    console.error('❌ LLM error:', error);
    throw error;
  }
}

// HELPER FUNCTIONS
function getTaskRequestPatterns(clients: any[]) {
  const taskPairs: Record<string, number> = {};
  
  clients.forEach(client => {
    if (client.RequestedTaskIDs) {
      const tasks = (client as Client).RequestedTaskIDs.split(',').map((id: string) => id.trim()).filter(Boolean);
      
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
      .slice(0, 5)
      .map(([pair, count]) => ({
        tasks: pair.split('-'),
        frequency: count
      }))
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

// FALLBACK LOCAL ANALYSIS
function analyzeLocalPatterns(data: any) {
  const suggestions = [];
  
  // 1. Find frequent task pairs
  const taskPairs = getTaskRequestPatterns(data.clients).frequentPairs;
  if (taskPairs.length > 0) {
    const topPair = taskPairs[0];
    suggestions.push({
      id: `local_corun_${Date.now()}`,
      type: "coRun",
      title: `Co-run Tasks ${topPair.tasks.join(' & ')}`,
      description: `These tasks are requested together by ${topPair.frequency} clients`,
      reasoning: `Found ${topPair.frequency} clients requesting both tasks`,
      confidence: Math.min(90, 60 + topPair.frequency * 10),
      impact: topPair.frequency >= 3 ? "high" : "medium",
      parameters: { taskIds: topPair.tasks },
      affectedEntities: topPair.tasks,
      pattern: "frequent_co_requests"
    });
  }
  
  // 2. Find overloaded worker groups
  const workerGroups = getWorkerGroupDistribution(data.workers);
  const overloadedGroups = Object.entries(workerGroups)
    .filter(([, stats]) => stats.avgLoad > 4)
    .sort(([, a], [, b]) => b.avgLoad - a.avgLoad);
    
  if (overloadedGroups.length > 0) {
    const [groupName, stats] = overloadedGroups[0];
    suggestions.push({
      id: `local_load_${Date.now()}`,
      type: "loadLimit",
      title: `Load Limit for ${groupName}`,
      description: `${groupName} workers have high average workload`,
      reasoning: `Average load is ${stats.avgLoad.toFixed(1)}, consider limiting to ${Math.floor(stats.avgLoad * 0.8)}`,
      confidence: 80,
      impact: "high",
      parameters: { 
        workerGroup: groupName, 
        maxSlotsPerPhase: Math.floor(stats.avgLoad * 0.8) 
      },
      affectedEntities: [`${stats.count} workers`],
      pattern: "workload_imbalance"
    });
  }
  
  // 3. Phase window for long tasks
  const longTasks = data.tasks.filter((t: any) => (t.Duration || 1) > 3).slice(0, 2);
  if (longTasks.length > 0) {
    const task = longTasks[0];
    suggestions.push({
      id: `local_phase_${Date.now()}`,
      type: "phaseWindow",
      title: `Phase Window for ${task.TaskID}`,
      description: `Long duration task should be phase-restricted`,
      reasoning: `Task duration is ${task.Duration} phases, restrict to early phases`,
      confidence: 70,
      impact: "medium",
      parameters: {
        taskId: task.TaskID,
        allowedPhases: [1, 2, 3]
      },
      affectedEntities: [task.TaskID],
      pattern: "duration_optimization"
    });
  }
  
  return suggestions.slice(0, 3);
}