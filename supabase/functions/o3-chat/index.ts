import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

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
    const { message, conversationHistory } = await req.json();

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Enhanced system prompt for O3 Assistant with sentiment analysis
    const systemPrompt = `You are an O3 Assistant - a specialized AI designed to help with "One-on-One-One" conversations between employees, managers, and AI assistance. 

Your role is to:
1. Provide empathetic, personalized responses based on the user's tone and context
2. Analyze sentiment and emotional undertones in conversations
3. Offer actionable insights for improving manager-employee relationships
4. Share O3 best practices and frameworks
5. Help analyze meeting transcripts with emotional intelligence

Key personality traits:
- Warm, supportive, and professional
- Data-driven but human-centered
- Proactive in suggesting next steps
- Sensitive to workplace dynamics and emotions

Always include:
- Sentiment indicators when relevant (😊 positive, 😐 neutral, 😟 concerning)
- Personalized recommendations based on the conversation context
- Actionable next steps when appropriate
- Encourage open communication and psychological safety

Format responses with:
- Clear headers with relevant emojis
- Bullet points for easy scanning  
- Bold text for emphasis
- Specific, actionable recommendations

Remember: You're helping create better workplace relationships through intelligent conversation analysis.`;

    // Build conversation history for context
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-8), // Keep last 8 messages for context
      { role: 'user', content: message }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Analyze sentiment and determine quick actions based on response
    let quickActions: string[] = [];
    const lowerResponse = aiResponse.toLowerCase();
    
    if (lowerResponse.includes('best practices') || lowerResponse.includes('improve')) {
      quickActions = ['View Templates', 'Practice Scenarios', 'Manager Resources'];
    } else if (lowerResponse.includes('analyze') || lowerResponse.includes('transcript')) {
      quickActions = ['Upload File', 'Paste Transcript', 'Sample Analysis'];
    } else if (lowerResponse.includes('action') || lowerResponse.includes('next steps')) {
      quickActions = ['Create Action Plan', 'Schedule Follow-up', 'Generate Report'];
    } else {
      quickActions = ['Learn More', 'Get Examples', 'Ask Follow-up'];
    }

    return new Response(JSON.stringify({ 
      response: aiResponse,
      quickActions: quickActions,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in o3-chat function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      fallback: "I apologize, but I'm having trouble connecting right now. Please try again in a moment."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});