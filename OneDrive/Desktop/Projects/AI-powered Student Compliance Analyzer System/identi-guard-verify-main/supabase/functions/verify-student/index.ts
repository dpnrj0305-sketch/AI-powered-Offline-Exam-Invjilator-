import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, gender, useAugmentation } = await req.json();
    console.log('Verification request received:', { gender, useAugmentation, imageLength: imageBase64?.length });

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Image data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    console.log('LOVABLE_API_KEY present:', !!LOVABLE_API_KEY);
    
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // System prompt for compliance verification
    const systemPrompt = `You are an expert image analysis system for student compliance verification. Analyze the uploaded student photo and provide confidence scores (0-100) for:

1. ID CARD DETECTION (0-100):
   - Look for a rectangular object on the student's chest/upper body area
   - Typical ID card aspect ratio: 1.3 to 2.2 (width/height)
   - Usually white or light-colored background with visible text, photo, or barcode
   - Score 90-100: Clear, visible ID card properly positioned
   - Score 50-70: Possible ID card present but unclear or partially visible
   - Score 0-40: No ID card detected or not visible

2. DRESS CODE COMPLIANCE (0-100):
   - Check for blue and white colors indicating school uniform
   - Look for proper uniform attire (not casual clothing)
   - Score 85-100: Clear blue/white school uniform visible and properly worn
   - Score 40-60: Some uniform elements present but incomplete or unclear
   - Score 0-30: Non-compliant clothing or no uniform visible

3. HAIRSTYLE COMPLIANCE (0-100):
   - For boys: Short, neat hair (above collar, not touching ears)
   - For girls: Various acceptable styles allowed (neat, tidy, not obstructing face)
   - Score 85-100: Fully compliant hairstyle, neat and appropriate
   - Score 40-60: Borderline acceptable, slightly longer or less neat
   - Score 0-30: Non-compliant (too long/messy for boys, unkempt for girls)

Gender: ${gender}
Image preprocessing: ${useAugmentation ? 'Applied (rotation, brightness, contrast corrections)' : 'None'}

Analyze the image carefully and provide objective scores based on what you observe.`;

    // Call Lovable AI with vision capabilities and structured output
    console.log('Calling AI Gateway...');
    
    const requestBody = {
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: systemPrompt + '\n\nPlease analyze this student photo and provide compliance scores.'
            },
            {
              type: 'image_url',
              image_url: {
                url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'report_compliance_scores',
            description: 'Report student compliance verification scores',
            parameters: {
              type: 'object',
              properties: {
                idCard: {
                  type: 'number',
                  minimum: 0,
                  maximum: 100,
                  description: 'ID card detection confidence score (0-100)'
                },
                dressCode: {
                  type: 'number',
                  minimum: 0,
                  maximum: 100,
                  description: 'Dress code compliance score (0-100)'
                },
                hairstyle: {
                  type: 'number',
                  minimum: 0,
                  maximum: 100,
                  description: 'Hairstyle compliance score (0-100)'
                },
                reasoning: {
                  type: 'string',
                  description: 'Brief explanation of the scores'
                }
              },
              required: ['idCard', 'dressCode', 'hairstyle'],
              additionalProperties: false
            }
          }
        }
      ],
      tool_choice: {
        type: 'function',
        function: { name: 'report_compliance_scores' }
      }
    };

    console.log('Request body prepared, image size:', imageBase64.length);

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('AI Gateway response status:', aiResponse.status);

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error details:', {
        status: aiResponse.status,
        statusText: aiResponse.statusText,
        error: errorText
      });
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: `AI analysis failed: ${errorText}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    console.log('AI response received:', JSON.stringify(aiData, null, 2));

    // Extract scores from tool call response
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'report_compliance_scores') {
      console.error('Unexpected AI response format:', aiData);
      return new Response(
        JSON.stringify({ error: 'Invalid AI response format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const scores = JSON.parse(toolCall.function.arguments);
    console.log('Extracted scores:', scores);

    return new Response(
      JSON.stringify({
        idCard: Math.round(scores.idCard),
        dressCode: Math.round(scores.dressCode),
        hairstyle: Math.round(scores.hairstyle),
        reasoning: scores.reasoning
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in verify-student function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
