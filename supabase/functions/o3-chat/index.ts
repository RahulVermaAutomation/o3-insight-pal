import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { message, conversationHistory, file } = await req.json();
    
    console.log('Received request:', { message, hasFile: !!file });

    // Enhanced system prompt for O3-only conversations
    const systemPrompt = `You are an O3 Assistant - a specialized AI designed EXCLUSIVELY to help with "One-on-One" conversations between employees and managers. 

**STRICT FOCUS: You ONLY discuss O3-related topics including:**
- One-on-one meeting best practices and frameworks
- Manager-employee conversation strategies
- Meeting preparation and structure
- Goal setting and performance discussions
- Feedback delivery and receiving
- Career development conversations
- Relationship building between managers and employees
- O3 meeting analysis and improvement

**IMPORTANT RESTRICTIONS:**
- If a user asks about ANY topic unrelated to O3 meetings, politely redirect them back to O3 topics
- Do NOT analyze files unless they are specifically related to O3 meetings, transcripts, or manager-employee interactions
- Do NOT provide general business advice, technical analysis, or other non-O3 content

**Your personality is:**
- Warm, supportive, and encouraging 😊
- Professional yet approachable
- Focused exclusively on O3 success
- Committed to improving manager-employee relationships

**When users ask non-O3 questions:**
Politely say: "I'm specifically designed to help with O3 (One-on-One) meetings and manager-employee conversations. I'd love to help you with O3 topics like meeting best practices, conversation frameworks, or analyzing your one-on-one interactions instead! What O3 challenge can I assist you with today?"

**Response Format:**
- Use clear, friendly language with bullet points for readability
- Include practical O3 tips and actionable advice
- Suggest concrete next steps for better one-on-ones
- Use emojis sparingly but appropriately for warmth

Remember: Your sole purpose is to make O3 meetings more effective and strengthen manager-employee relationships.`;

    // Build conversation history for context
    let contextualQuery = systemPrompt + '\n\n';
    
    // Add recent conversation history for context
    if (conversationHistory && conversationHistory.length > 0) {
      contextualQuery += 'Previous conversation context:\n';
      conversationHistory.slice(-4).forEach((msg: any) => {
        contextualQuery += `${msg.role}: ${msg.content}\n`;
      });
      contextualQuery += '\n';
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

    // Build final query for local API
    const finalQuery = contextualQuery + 'Current user request: ' + userContent;

    const response = await fetch('http://127.0.0.1:8000/o3-planner', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_query: finalQuery
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Local API error:', errorText);
      throw new Error(`Local API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.response;

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