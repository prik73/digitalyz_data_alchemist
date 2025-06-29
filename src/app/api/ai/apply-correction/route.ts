// src/app/api/ai/apply-correction/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { correction, currentData } = await request.json();

    if (!correction || !currentData) {
      return NextResponse.json({ error: 'Missing correction or data' }, { status: 400 });
    }

    const { entityType, entityId, field, newValue } = correction;
    const entities = [...(currentData[entityType] || [])];

    const entityIndex = entities.findIndex((entity: any) => {
      const idField = `${entityType.slice(0, -1).charAt(0).toUpperCase() + entityType.slice(1, -1)}ID`;
      return entity[idField] === entityId;
    });

    if (entityIndex === -1) {
      return NextResponse.json({ error: 'Entity not found' }, { status: 404 });
    }

    // Apply the fix
    entities[entityIndex][field] = newValue;

    return NextResponse.json({ 
      success: true,
      entityType,
      correctedData: entities
    });

  } catch (error) {
    console.error('Error applying correction:', error);
    return NextResponse.json({ error: 'Failed to apply correction' }, { status: 500 });
  }
}