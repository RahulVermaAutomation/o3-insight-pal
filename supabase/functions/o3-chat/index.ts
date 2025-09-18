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
    
    console.log('Received request:', { message, hasFile: !!file, historyLength: conversationHistory?.length || 0 });

    // Limit conversation history to last 6 messages (3 exchanges) for better performance
    const recentHistory = conversationHistory?.slice(-6) || [];
    
    // Prepare the user query with context for your custom API
    let userQuery = message;
    
    // Add recent conversation context if available
    if (recentHistory.length > 0) {
      const contextSummary = recentHistory
        .filter(msg => msg.role === 'user')
        .slice(-2) // Only last 2 user messages for context
        .map(msg => msg.content)
        .join('; ');
      
      if (contextSummary) {
        userQuery = `Context from recent conversation: ${contextSummary}. Current question: ${message}`;
      }
    }
    
    if (file) {
      userQuery = `File uploaded: ${file.name} (${file.type}, ${(file.size / 1024).toFixed(2)} KB). User request: ${message}`;
    }

    // Call your custom O3 API
    const apiUrl = `https://my-o3-agent-production-909d.up.railway.app/o3-planner?user_query=${encodeURIComponent(userQuery)}`;
    
    console.log('Calling API URL:', apiUrl);
    
    // Add timeout and better error handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      console.log('API Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('O3 API error details:', {
          status: response.status,
          statusText: response.statusText,
          errorData: errorData,
          url: apiUrl
        });
        
        // Return a graceful error instead of throwing
        return new Response(JSON.stringify({
          response: `I apologize, but I'm having trouble connecting to my knowledge base right now (API returned ${response.status} error). This might be a temporary issue with the external service. Please try again in a moment, or feel free to ask me something else!`,
          quickActions: ['Try Again', 'Ask Different Question', 'Contact Support'],
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const data = await response.json();
      
      // Continue with the response processing
      let aiResponse = data.response || data.answer || data.result || JSON.stringify(data);
      
      // Parse and format the response if it's a JSON array
      try {
        if (typeof aiResponse === 'string' && aiResponse.startsWith('[')) {
          const parsedArray = JSON.parse(aiResponse);
          if (Array.isArray(parsedArray)) {
            let formattedResponse = "Here's what I found about O3:\n\n";
            
            // Sort by relevancy score (highest first)
            const sortedItems = parsedArray.sort((a, b) => 
              parseInt(b.relevency_score || '0') - parseInt(a.relevency_score || '0')
            );
            
            sortedItems.forEach((item, index) => {
              formattedResponse += `**${item.Summary || 'Key Point'}**\n`;
              formattedResponse += `   ${item.explanation || 'No description available'}\n`;
              
              if (item.relevency_score) {
                formattedResponse += `   *Relevance: ${item.relevency_score}/10*\n`;
              }
              
              if (index < sortedItems.length - 1) {
                formattedResponse += '\n';
              }
            });
            
            aiResponse = formattedResponse;
          }
        }
      } catch (parseError) {
        console.log('Could not parse response as JSON array, using original response');
        // Keep the original response if parsing fails
      }

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
      
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error('Fetch error or timeout:', fetchError);
      
      // Handle timeout or network errors
      return new Response(JSON.stringify({
        response: `I'm experiencing connection issues with my knowledge base right now. This might be due to network problems or the service taking too long to respond. Please try again in a moment!`,
        quickActions: ['Try Again', 'Ask Different Question', 'Contact Support'],
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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