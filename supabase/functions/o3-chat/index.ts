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
    
  // Prepare a compact user query for the external API
  const latestMessage = (message || '').trim();
  const recentUserMsgs = (recentHistory || [])
    .filter((msg: any) => msg.role === 'user')
    .map((msg: any) => (msg.content || '').trim());
  const prevUserMsg = recentUserMsgs.slice(-2, -1)[0] || '';

  let userQuery = prevUserMsg
    ? `Context: ${prevUserMsg.slice(0, 300)}\nQuestion: ${latestMessage}`
    : latestMessage;

  if (file) {
    userQuery = `File uploaded: ${file.name} (${file.type}, ${(file.size / 1024).toFixed(2)} KB). User request: ${latestMessage}`;
  }

  const MAX_QUERY_LEN = 1400;
  if (userQuery.length > MAX_QUERY_LEN) {
    userQuery = userQuery.slice(0, MAX_QUERY_LEN) + '…';
  }

    // Prepare and call O3 API with GET using only the user's message
    const apiBase = 'https://my-o3-agent-production-909d.up.railway.app/o3-planner';
    const requestUrl = `${apiBase}?user_query=${encodeURIComponent(latestMessage)}`;
    console.log('Calling O3 API URL:', requestUrl);

    // Add timeout and better error handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    try {
      const response = await fetch(requestUrl, {
        method: 'GET',
        headers: {
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
          errorData,
          url: requestUrl,
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
      
      console.log('Raw API response data:', JSON.stringify(data, null, 2));
      
      // Continue with the response processing
      let aiResponse = data.response || data.answer || data.result || data.message || data.content || JSON.stringify(data);
      
      console.log('Extracted AI response:', typeof aiResponse, aiResponse);
      
      // Parse and format the response if it's a JSON array
      try {
        if (typeof aiResponse === 'string' && aiResponse.startsWith('[')) {
          const parsedArray = JSON.parse(aiResponse);
          console.log('Parsed array:', parsedArray);
          
          if (Array.isArray(parsedArray) && parsedArray.length > 0) {
            // Check if array has meaningful content - support multiple response formats
            const hasValidContent = parsedArray.some(item => 
              (item.Summary && item.Summary !== 'Key Point') || 
              (item.explanation && item.explanation !== 'No description available') ||
              (item.topic && item.highlight) || // Support the actual API format
              (item.title && item.content)
            );
            
            if (hasValidContent) {
              let formattedResponse = "Here's your O3 summary analysis:\n\n";
              
              // Sort by satisfaction score if available, otherwise by relevancy score
              const sortedItems = parsedArray.sort((a, b) => {
                if (a.satisfaction_score && b.satisfaction_score) {
                  return parseInt(b.satisfaction_score || '0') - parseInt(a.satisfaction_score || '0');
                }
                return parseInt(b.relevency_score || '0') - parseInt(a.relevency_score || '0');
              });
              
              sortedItems.forEach((item, index) => {
                // Handle different response formats
                let title, content, score, actionInfo;
                
                if (item.topic && item.highlight) {
                  // Handle the actual API format with topic/highlight structure
                  title = item.topic;
                  content = item.highlight;
                  score = item.satisfaction_score;
                  actionInfo = item.action && item.actor ? 
                    `${item.action} (${item.actor})` : 
                    item.action || null;
                } else {
                  // Handle generic format
                  title = item.Summary || item.title || item.heading || 'Key Point';
                  content = item.explanation || item.content || item.description || 'No description available';
                  score = item.relevency_score;
                  actionInfo = null;
                }
                
                formattedResponse += `**${title}**\n`;
                formattedResponse += `   ${content}\n`;
                
                if (score) {
                  const scoreLabel = item.satisfaction_score ? 'Satisfaction' : 'Relevance';
                  formattedResponse += `   *${scoreLabel}: ${score}/10*\n`;
                }
                
                if (actionInfo) {
                  formattedResponse += `   *Action: ${actionInfo}*\n`;
                }
                
                if (index < sortedItems.length - 1) {
                  formattedResponse += '\n';
                }
              });
              
              aiResponse = formattedResponse;
            } else {
              console.log('Array contains no valid content, using original response');
              // If the array doesn't have valid content, use the raw response
              aiResponse = typeof data === 'string' ? data : JSON.stringify(data);
            }
          }
        } else if (typeof aiResponse === 'object') {
          // If the response is an object, try to extract meaningful content
          aiResponse = JSON.stringify(aiResponse, null, 2);
        }
      } catch (parseError) {
        console.log('Could not parse response as JSON array, error:', parseError.message);
        console.log('Using original response as fallback');
        // Keep the original response if parsing fails
        aiResponse = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
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