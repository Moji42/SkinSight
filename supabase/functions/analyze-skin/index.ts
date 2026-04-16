// Edge runtime imports are handled automatically by Deno

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl } = await req.json();
    console.log('Received analysis request');

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'Image URL is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const systemPrompt = `You are a helpful AI assistant designed to analyze images of common skin irritations for educational purposes only. You are NOT a medical professional and cannot provide medical diagnoses.

Your response MUST be in the following strict JSON format:
{
  "visualDescription": "Detailed description of what you observe in the image",
  "possibilities": ["possibility 1", "possibility 2", "possibility 3"],
  "concernLevel": "Low" or "Medium",
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"],
  "disclaimer": "Standard medical disclaimer text"
}

Guidelines:
- Base your analysis ONLY on visual characteristics
- List 2-3 general possibilities (e.g., "insect bite", "minor scrape", "mild burn")
- concernLevel should be "Low" for minor issues or "Medium" for anything that might need attention
- Provide 3-5 common, non-medical first-aid or comfort suggestions
- NEVER suggest specific medications or prescription treatments
- ALWAYS include a strong disclaimer that this is not medical advice

Remember: You provide educational information only. For any serious concerns, users should consult a healthcare provider.`;

    console.log('Calling Lovable AI Gateway with vision model');
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this skin condition image. Provide your response in the exact JSON format specified.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { 
            status: 429, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI service credits exhausted. Please add credits to continue.' }),
          { 
            status: 402, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Failed to analyze image' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const data = await response.json();
    console.log('Received response from AI Gateway');
    
    const content = data.choices[0].message.content;
    
    // Try to parse the JSON response
    let analysisResult;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      analysisResult = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      // Fallback response if JSON parsing fails
      analysisResult = {
        visualDescription: content,
        possibilities: ["Unable to determine specific condition", "Please consult a healthcare provider"],
        concernLevel: "Medium",
        suggestions: [
          "Keep the area clean and dry",
          "Avoid scratching or touching the affected area",
          "Monitor for any changes or worsening symptoms",
          "Consult a healthcare provider if concerned"
        ],
        disclaimer: "This is not medical advice. This tool provides general educational information only. Always consult a qualified healthcare professional for proper diagnosis and treatment."
      };
    }

    return new Response(
      JSON.stringify(analysisResult),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in analyze-skin function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
