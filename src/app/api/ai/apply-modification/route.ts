// src/app/api/ai/apply-modification/route.ts - FIXED GROUPA LOGIC
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { plan, currentData } = await request.json();
    console.log('🔧 Apply-modification received plan:', plan);

    if (!plan || !currentData) {
      return NextResponse.json({ error: 'Missing plan or data' }, { status: 400 });
    }

    const { entityType, field, condition, newValue, action } = plan;
    const entities = [...(currentData[entityType] || [])];
    
    console.log(`🔧 Processing ${entities.length} ${entityType} entities`);
    console.log(`🔧 Looking for condition: "${condition}"`);
    console.log(`🔧 Field to modify: "${field}"`);
    console.log(`🔧 New value: "${newValue}"`);
    console.log(`🔧 Action: "${action}"`);

    let modifiedCount = 0;

    // Apply the modification with proper condition matching
    entities.forEach((entity: any, index: number) => {
      const matches = matchesCondition(entity, condition, plan);
      console.log(`🔧 Entity ${index} (${entity.ClientID || entity.WorkerID || entity.TaskID}): matches=${matches}`, {
        GroupTag: entity.GroupTag,
        condition: condition
      });

      if (matches) {
        const oldValue = entity[field];
        
        if (field === 'PriorityLevel' && (action.includes('increase') || action.includes('Increase'))) {
          // Handle increment operations - add the newValue to current value
          const currentPriority = entity[field] || 1;
          const incrementBy = typeof newValue === 'number' ? newValue : parseInt(newValue) || 1;
          entity[field] = Math.min(5, currentPriority + incrementBy);
          console.log(`✅ Increased priority: ${oldValue} + ${incrementBy} = ${entity[field]}`);
        } else if (field === 'Skills' && action.includes('add')) {
          // Handle skill addition
          const currentSkills = entity[field] || '';
          const skillsArray = currentSkills.split(',').map((s: string) => s.trim()).filter(Boolean);
          if (!skillsArray.includes(newValue)) {
            skillsArray.push(newValue);
            entity[field] = skillsArray.join(', ');
            console.log(`✅ Added skill: ${newValue} to ${entity.WorkerID}`);
          }
        } else {
          // Direct assignment
          entity[field] = newValue;
          console.log(`✅ Set ${field}: ${oldValue} → ${newValue}`);
        }
        
        modifiedCount++;
      }
    });

    console.log(`✅ Modified ${modifiedCount} out of ${entities.length} entities`);
    return NextResponse.json({ modifiedData: entities });

  } catch (error) {
    console.error('❌ Error in apply-modification API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}

function matchesCondition(entity: any, condition: string, plan: any): boolean {
  const lowerCondition = condition.toLowerCase();
  console.log(`🔍 Matching condition "${lowerCondition}" against entity:`, {
    ClientID: entity.ClientID,
    GroupTag: entity.GroupTag,
    WorkerID: entity.WorkerID,
    WorkerGroup: entity.WorkerGroup,
    Skills: entity.Skills,
    TaskID: entity.TaskID,
    TaskName: entity.TaskName
  });
  
  // Handle GROUP-based conditions for CLIENTS
  if (lowerCondition.includes('groupa')) {
    const matches = entity.GroupTag === 'GroupA';
    console.log(`🔍 GroupA check: entity.GroupTag="${entity.GroupTag}" === "GroupA" = ${matches}`);
    return matches;
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
  
  console.log(`⚠️ No matching condition found for: "${lowerCondition}"`);
  return false;
}