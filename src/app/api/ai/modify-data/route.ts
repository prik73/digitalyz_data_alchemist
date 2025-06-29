// src/app/api/ai/modify-data/route.ts - BETTER AI PARSING
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { command, currentData } = await request.json();
    console.log('🤖 Modify-data received command:', command);

    if (!command || !currentData) {
      return NextResponse.json({ error: 'Missing command or data' }, { status: 400 });
    }

    const systemPrompt = `You are a data modification assistant. Given a natural language command, generate a precise modification plan.

Data available:
- Clients: ClientID, ClientName, PriorityLevel (1-5), RequestedTaskIDs, GroupTag (GroupA/GroupB/GroupC), AttributesJSON
- Workers: WorkerID, WorkerName, Skills, AvailableSlots, MaxLoadPerPhase, WorkerGroup, QualificationLevel (1-10)
- Tasks: TaskID, TaskName, Category, Duration, RequiredSkills, PreferredPhases, MaxConcurrent

Return a JSON object with this EXACT structure:
{
  "action": "brief description of action",
  "entityType": "clients" | "workers" | "tasks",
  "field": "exact field name to modify",
  "condition": "condition to match records", 
  "newValue": value_to_set_or_increment
}

IMPORTANT RULES:
1. For "increase by X" or "add X" → action should say "increase" and newValue should be the INCREMENT amount
2. For "set to X" → action should say "set" and newValue should be the TARGET value
3. GroupA/GroupB/GroupC clients → condition should mention "GroupA"/"GroupB"/"GroupC"
4. React/Python developers → condition should mention the skill name
5. Use exact field names: PriorityLevel, QualificationLevel, Skills, etc.

Examples:
- "Increase priority for GroupA clients by 1" → {"action": "increase PriorityLevel by 1", "entityType": "clients", "field": "PriorityLevel", "condition": "GroupA clients", "newValue": 1}
- "Set all React developers to qualification level 8" → {"action": "set QualificationLevel to 8", "entityType": "workers", "field": "QualificationLevel", "condition": "React developers", "newValue": 8}
- "Add Python skill to backend workers" → {"action": "add Python skill", "entityType": "workers", "field": "Skills", "condition": "backend workers", "newValue": "Python"}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Command: "${command}"` }
      ],
      temperature: 0.1,
      max_tokens: 500,
    });

    const response = completion.choices[0].message.content;
    console.log('🤖 OpenAI response:', response);
    
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    let plan;
    try {
      plan = JSON.parse(response);
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      throw new Error('Invalid JSON response from OpenAI');
    }

    console.log('🤖 Parsed plan:', plan);

    // Calculate affected count and preview
    const { entityType, condition } = plan;
    const entities = currentData[entityType] || [];
    
    const affectedEntities = entities.filter((entity: any) => 
      matchesCondition(entity, condition, plan)
    );
    
    const preview = affectedEntities.slice(0, 5).map((entity: any) => {
      const idField = `${entityType.slice(0, -1).charAt(0).toUpperCase() + entityType.slice(1, -1)}ID`;
      const entityId = entity[idField] || 'Unknown';
      
      let changeDescription = '';
      if (plan.action.includes('increase')) {
        const currentValue = entity[plan.field] || 0;
        const newValue = currentValue + plan.newValue;
        changeDescription = `${plan.field}: ${currentValue} → ${newValue}`;
      } else {
        changeDescription = `${plan.field}: ${entity[plan.field] || 'empty'} → ${plan.newValue}`;
      }
      
      return {
        id: entityId,
        change: changeDescription
      };
    });

    plan.affectedCount = affectedEntities.length;
    plan.preview = preview;

    console.log('✅ Final plan with counts:', plan);
    return NextResponse.json({ plan });

  } catch (error) {
    console.error('❌ Error in modify-data API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}

function matchesCondition(entity: any, condition: string, plan: any): boolean {
  const lowerCondition = condition.toLowerCase();
  
  // Handle GROUP-based conditions for CLIENTS
  if (lowerCondition.includes('groupa')) {
    return entity.GroupTag === 'GroupA';
  }
  if (lowerCondition.includes('groupb')) {
    return entity.GroupTag === 'GroupB';
  }
  if (lowerCondition.includes('groupc')) {
    return entity.GroupTag === 'GroupC';
  }
  
  // Handle skill-based conditions for WORKERS
  if (lowerCondition.includes('react')) {
    return entity.Skills?.toLowerCase().includes('react');
  }
  if (lowerCondition.includes('python')) {
    return entity.Skills?.toLowerCase().includes('python');
  }
  if (lowerCondition.includes('backend')) {
    return entity.WorkerGroup?.toLowerCase().includes('backend');
  }
  if (lowerCondition.includes('frontend')) {
    return entity.WorkerGroup?.toLowerCase().includes('frontend');
  }
  
  // Handle task-based conditions
  if (lowerCondition.includes('api')) {
    return entity.TaskName?.toLowerCase().includes('api');
  }
  if (lowerCondition.includes('test')) {
    return entity.TaskName?.toLowerCase().includes('test');
  }
  
  // Handle qualification conditions for WORKERS
  if (lowerCondition.includes('senior')) {
    return (entity.QualificationLevel || 0) >= 8;
  }
  if (lowerCondition.includes('junior')) {
    return (entity.QualificationLevel || 0) <= 5;
  }
  
  return false;
}