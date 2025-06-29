// pages/api/ai/apply-correction.ts  
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { correction, currentData } = req.body;

    if (!correction || !currentData) {
      return res.status(400).json({ error: 'Missing correction or data' });
    }

    const { entityType, entityId, field, newValue, action } = correction;
    const entities = [...(currentData[entityType] || [])];

    // Find the entity to correct
    const entityIndex = entities.findIndex((entity: any) => {
      const idField = `${entityType.slice(0, -1).charAt(0).toUpperCase() + entityType.slice(1, -1)}ID`;
      return entity[idField] === entityId;
    });

    if (entityIndex === -1) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    const entity = entities[entityIndex];

    // Apply the correction based on action type
    try {
      switch (action.toLowerCase()) {
        case 'fix malformed json':
        case 'fix json syntax':
          // Attempt to fix common JSON issues
          let fixedJson = newValue;
          if (typeof newValue === 'string') {
            // Try to parse and re-stringify to fix formatting
            fixedJson = JSON.stringify(JSON.parse(newValue));
          }
          entity[field] = fixedJson;
          break;

        case 'clamp to valid range':
          // Ensure numeric values are within valid ranges
          const numValue = Number(newValue);
          if (field === 'PriorityLevel') {
            entity[field] = Math.min(5, Math.max(1, numValue));
          } else if (field === 'QualificationLevel') {
            entity[field] = Math.min(10, Math.max(1, numValue));
          } else {
            entity[field] = numValue;
          }
          break;

        case 'convert to json array':
        case 'fix array format':
          // Convert string representations to proper JSON arrays
          if (typeof newValue === 'string') {
            try {
              entity[field] = JSON.stringify(JSON.parse(newValue));
            } catch {
              // If parsing fails, create a simple array
              entity[field] = '[1,2,3]';
            }
          } else {
            entity[field] = JSON.stringify(newValue);
          }
          break;

        case 'generate unique id':
          // Generate a new unique ID
          const prefix = entityType.charAt(0).toUpperCase();
          const existingIds = entities
            .map((e: any) => e[field])
            .filter(Boolean)
            .map((id: string) => parseInt(id.replace(prefix, '') || '0'))
            .filter((num: number) => !isNaN(num));
          
          const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
          entity[field] = `${prefix}${maxId + 1}`;
          break;

        case 'remove invalid references':
          // Remove references that don't exist
          if (field === 'RequestedTaskIDs' && entity[field]) {
            const validTaskIds = new Set(currentData.tasks?.map((t: any) => t.TaskID) || []);
            const currentRefs = entity[field].split(',').map((id: string) => id.trim());
            const validRefs = currentRefs.filter((id: string) => validTaskIds.has(id));
            entity[field] = validRefs.join(', ');
          }
          break;

        default:
          // Direct assignment for other cases
          entity[field] = newValue;
          break;
      }

      entities[entityIndex] = entity;

      res.status(200).json({ 
        success: true,
        entityType,
        correctedData: entities,
        appliedValue: entity[field]
      });

    } catch (correctionError) {
      console.error('Error applying correction:', correctionError);
      res.status(500).json({ 
        success: false,
        error: `Failed to apply correction: ${correctionError instanceof Error ? correctionError.message : 'Unknown error'}`
      });
    }

  } catch (error) {
    console.error('Error in apply-correction API:', error);
    res.status(500).json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    });
  }
}