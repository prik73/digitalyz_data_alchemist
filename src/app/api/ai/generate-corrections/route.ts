// src/app/api/ai/generate-corrections/route.ts - WITH DEBUG LOGGING
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('🔍 Generate-corrections received:', {
      hasValidationResults: !!body.validationResults,
      validationResultsLength: body.validationResults?.length || 0,
      hasCurrentData: !!body.currentData,
      currentDataKeys: body.currentData ? Object.keys(body.currentData) : []
    });

    const { validationResults, currentData } = body;

    // More detailed validation
    if (!validationResults) {
      console.log('❌ Missing validationResults');
      return NextResponse.json({ error: 'Missing validationResults' }, { status: 400 });
    }

    if (!currentData) {
      console.log('❌ Missing currentData');
      return NextResponse.json({ error: 'Missing currentData' }, { status: 400 });
    }

    if (!Array.isArray(validationResults)) {
      console.log('❌ ValidationResults is not an array:', typeof validationResults);
      return NextResponse.json({ error: 'ValidationResults must be an array' }, { status: 400 });
    }

    if (validationResults.length === 0) {
      console.log('✅ No validation errors to correct');
      return NextResponse.json({ corrections: [] });
    }

    console.log('🔍 Processing', validationResults.length, 'validation errors');

    // Simple mock corrections for now to test the flow
    const mockCorrections = validationResults.slice(0, 3).map((result: any, index: number) => ({
      validationId: `correction_${index}_${Date.now()}`,
      correctionType: "auto-fix",
      description: `Fix ${result.type}: ${result.message}`,
      confidence: 85,
      action: "auto correction",
      entityType: result.entityType,
      entityId: result.entityId || "unknown",
      field: result.field || "unknown",
      newValue: "corrected_value"
    }));

    console.log('✅ Generated', mockCorrections.length, 'mock corrections');
    return NextResponse.json({ corrections: mockCorrections });

    // TODO: Uncomment this when basic flow works
    /*
    const systemPrompt = `Generate correction suggestions for data validation errors.

Return a JSON array of corrections:
[
  {
    "validationId": "unique_id",
    "correctionType": "auto-fix",
    "description": "Fix malformed JSON",
    "confidence": 95,
    "action": "fix json syntax",
    "entityType": "clients",
    "entityId": "C1",
    "field": "AttributesJSON",
    "newValue": "{}"
  }
]`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Errors: ${JSON.stringify(validationResults.slice(0, 3))}` }
      ],
      temperature: 0.1,
      max_tokens: 1000,
    });

    const response = completion.choices[0].message.content;
    
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    let corrections;
    try {
      corrections = JSON.parse(response);
    } catch (parseError) {
      corrections = [];
    }

    if (!Array.isArray(corrections)) {
      corrections = [];
    }

    return NextResponse.json({ corrections });
    */

  } catch (error) {
    console.error('❌ Error in generate-corrections API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}