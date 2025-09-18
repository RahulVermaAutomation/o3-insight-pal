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

    // Prepare the user query for your custom API
    let userQuery = message;
    if (file) {
      userQuery = `File uploaded: ${file.name} (${file.type}, ${(file.size / 1024).toFixed(2)} KB). User request: ${message}`;
    }

    // Call your custom O3 API
    const apiUrl = `https://my-o3-agent-production-909d.up.railway.app/o3-planner?user_query=${encodeURIComponent(userQuery)}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('O3 API error:', errorData);
      throw new Error(`O3 API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.response || data.answer || data.result || JSON.stringify(data);

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