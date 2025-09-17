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
    const { message, conversationHistory, file } = await req.json();
    
    console.log('Received request:', { message, hasFile: !!file });

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Enhanced system prompt for friendly O3 Assistant with file analysis capabilities
    const systemPrompt = `You are a warm and friendly O3 Assistant - a specialized AI designed to help with "One-on-One" conversations between employees, managers, and provide insightful analysis. 

Your personality is:
- Genuinely caring and supportive 😊
- Professional yet approachable
- Encouraging and positive in tone
- Clear and well-organized in communication

Your capabilities include:
1. Analyzing uploaded files (transcripts, documents, recordings) based on specific user requests
2. Providing sentiment analysis and emotional insights
3. Offering actionable recommendations for workplace relationships
4. Sharing O3 best practices and frameworks
5. Creating personalized action plans

When analyzing files:
- Always address the user's specific request first
- Use clear, friendly language with bullet points for readability
- Provide specific insights based on what they asked for
- Include both positive highlights and areas for improvement
- Suggest concrete next steps with realistic timelines
- Use emojis sparingly but appropriately for warmth

Format your responses with:
- **Clear headers** with relevant emojis when appropriate
- **Bullet points** for key information
- **Bold text** for emphasis on important points
- Organized sections that are easy to scan
- A warm, encouraging tone throughout

Remember: You're here to help create better workplace relationships through thoughtful analysis and genuine care for people's professional growth.`;

    // Build conversation history for context
    const messages = [
      { role: 'system', content: systemPrompt }
    ];
    
    // Add recent conversation history for context
    if (conversationHistory && conversationHistory.length > 0) {
      messages.push(...conversationHistory.slice(-8)); // Keep last 8 messages
    }

    // Handle file analysis if file is provided
    let userContent = message;
    if (file) {
      // Create a descriptive file context for the AI
      const fileInfo = `

📎 **File Details:**
- **Name:** ${file.name}
- **Type:** ${file.type}
- **Size:** ${(file.size / 1024).toFixed(2)} KB

I've uploaded this file and would like you to help me with the following request: "${message}"

Please provide a friendly, thorough analysis based on my specific request. Use bullet points and clear formatting to make your response easy to understand and actionable.

[Note: In this demo, I'm providing file metadata. In production, you would implement proper file parsing based on the file type for detailed content analysis.]`;
      
      userContent = fileInfo;
    }

    messages.push({ role: 'user', content: userContent });

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
        max_tokens: 1200,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Generate contextual quick actions based on the type of interaction
    let quickActions: string[] = [];
    
    if (file) {
      // File-specific actions
      quickActions = [
        'Create Action Plan',
        'Generate Summary Report', 
        'Extract Key Insights',
        'Provide Next Steps'
      ];
    } else {
      // General conversation actions
      const lowerResponse = aiResponse.toLowerCase();
      const lowerMessage = message.toLowerCase();
      
      if (lowerMessage.includes('o3') || lowerMessage.includes('one-on-one')) {
        quickActions = ['Best Practices', 'Meeting Templates', 'Conversation Tips'];
      } else if (lowerMessage.includes('analyze') || lowerMessage.includes('help')) {
        quickActions = ['Upload File', 'Ask Follow-up', 'Get Examples'];
      } else if (lowerResponse.includes('action') || lowerResponse.includes('next steps')) {
        quickActions = ['Create Plan', 'Schedule Meeting', 'Get Resources'];
      } else {
        quickActions = ['Tell Me More', 'Give Examples', 'Upload File'];
      }
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
    
    // Provide a friendly fallback response
    const fallbackResponse = `I'm so sorry, but I'm having a little trouble right now! 😅 

Don't worry though - I'm here to help you with:
• **O3 conversations** and best practices
• **Meeting analysis** and insights  
• **Manager-employee** communication strategies
• **File analysis** and content review

Could you please try your request again? I'd love to help you out! 💪`;

    return new Response(JSON.stringify({
      response: fallbackResponse,
      quickActions: ['Try Again', 'O3 Best Practices', 'Upload File', 'Ask Question'],
      timestamp: new Date().toISOString()
    }), {
      status: 200, // Return 200 to show the friendly error message
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});