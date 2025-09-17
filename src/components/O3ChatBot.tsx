import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, HelpCircle, Settings, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ChatMessage } from './ChatMessage';
import { ChatHeader } from './ChatHeader';

interface Message {
  id: string;
  type: 'ai' | 'user';
  content: string;
  timestamp: Date;
  isAnalysis?: boolean;
  quickActions?: string[];
}

export const O3ChatBot = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize with welcome message
  useEffect(() => {
    const welcomeMessage: Message = {
      id: '1',
      type: 'ai',
      content: `Hello! I'm your O3 Assistant. 👋

I can help you with:
• Understanding what O3 is and how it works
• Analyzing meeting recordings or transcripts
• Providing insights and next action items
• Suggesting improvements for manager-employee interactions

What would you like to know or analyze today?`,
      timestamp: new Date(),
      quickActions: ['What is O3?', 'Upload Transcript', 'Get Best Practices']
    };
    setMessages([welcomeMessage]);
  }, []);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = generateAIResponse(inputValue);
      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 2000);
  };

  const generateAIResponse = (userInput: string): Message => {
    const input = userInput.toLowerCase();

    if (input.includes('what is o3') || input.includes('o3 is')) {
      return {
        id: Date.now().toString(),
        type: 'ai',
        content: `📋 **About O3**

O3 stands for "One-on-One-One" - a structured conversation framework between employee, manager, and the AI assistant to enhance communication and identify actionable insights.

**Key benefits include:**
• Improved manager-employee communication
• Early identification of concerns
• Data-driven conversation insights
• Structured follow-up actions
• Enhanced employee engagement
• Better manager coaching capabilities

The framework creates a safe space for open dialogue while providing intelligent analysis to help both parties understand conversation dynamics and next steps.`,
        timestamp: new Date(),
        quickActions: ['Learn More', 'See Examples', 'Get Started Guide']
      };
    }

    if (input.includes('best practices') || input.includes('how to improve')) {
      return {
        id: Date.now().toString(),
        type: 'ai',
        content: `💡 **O3 Best Practices**

**For Managers:**
• Create psychological safety - ensure open, judgment-free dialogue
• Ask open-ended questions about challenges and goals
• Listen actively and acknowledge concerns
• Follow through on commitments made during conversations

**For Employees:**
• Come prepared with specific topics or concerns
• Be honest about challenges and successes
• Ask for specific feedback and support
• Suggest solutions, not just problems

**Conversation Starters:**
• "What's been energizing you lately?"
• "What obstacles are slowing you down?"
• "How can I better support you?"
• "What would you like to learn or improve?"`,
        timestamp: new Date(),
        quickActions: ['View Templates', 'Practice Scenarios', 'Manager Resources']
      };
    }

    if (input.includes('upload') || input.includes('transcript') || input.includes('analyze')) {
      return {
        id: Date.now().toString(),
        type: 'ai',
        content: `📎 **Ready to Analyze**

I'm ready to analyze your meeting transcript or recording! I can help identify:

• Key discussion themes and topics
• Emotional indicators and sentiment
• Areas of concern or success
• Communication patterns
• Actionable next steps and recommendations

**Supported formats:**
• Audio: MP3, WAV, M4A (up to 50MB)
• Text: TXT, DOCX, PDF transcripts
• Copy & paste: Raw transcript text

Simply upload your file or paste your transcript text, and I'll provide detailed insights and recommendations.`,
        timestamp: new Date(),
        quickActions: ['Upload File', 'Paste Transcript', 'Sample Analysis']
      };
    }

    // Default response
    return {
      id: Date.now().toString(),
      type: 'ai',
      content: `I'd be happy to help! Could you provide more context about:

• What specific aspect of O3 you'd like to know about?
• Which meeting or interaction you'd like me to analyze?
• What kind of insights you're looking for?

I'm here to assist with O3 concepts, meeting analysis, and providing actionable guidance for better employee-manager interactions.`,
      timestamp: new Date(),
      quickActions: ['O3 Information', 'Meeting Analysis', 'Best Practices']
    };
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 50MB.",
        variant: "destructive"
      });
      return;
    }

    // Validate file type
    const allowedTypes = ['audio/mp3', 'audio/wav', 'audio/mpeg', 'text/plain', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Unsupported file type",
        description: "Please upload MP3, WAV, TXT, DOCX, or PDF files.",
        variant: "destructive"
      });
      return;
    }

    // Simulate file processing
    setIsLoading(true);
    setUploadProgress(0);

    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setTimeout(() => {
            const analysisResult: Message = {
              id: Date.now().toString(),
              type: 'ai',
              content: `🔍 **Meeting Analysis Complete**

**File Processed:** ${file.name}

**Key Themes Identified:**
• Career development concerns (mentioned 3 times)
• Workload management issues  
• Positive feedback on team collaboration
• Communication style preferences discussed

**Sentiment Analysis:**
Overall tone: Neutral to Positive (7/10)
- Moments of concern around workload (timestamps: 5:23, 12:45)
- Enthusiastic response to collaboration praise (timestamp: 18:30)
- Constructive tone throughout discussion

**⚡ Recommended Actions:**
1. Schedule career development discussion within 2 weeks
2. Review current project allocation and priorities
3. Acknowledge team collaboration strengths in writing
4. Set up monthly check-ins on workload balance

Would you like me to elaborate on any of these points or generate a detailed action plan?`,
              timestamp: new Date(),
              isAnalysis: true,
              quickActions: ['Generate Report', 'Create Action Plan', 'Schedule Follow-up', 'Export Summary']
            };
            setMessages(prev => [...prev, analysisResult]);
            setIsLoading(false);
            setUploadProgress(0);
          }, 1000);
          return 100;
        }
        return prev + 20;
      });
    }, 300);

    toast({
      title: "File uploaded successfully",
      description: "Processing your file for analysis..."
    });
  };

  const handleQuickAction = (action: string) => {
    setInputValue(action);
    handleSendMessage();
  };

  const clearChat = () => {
    const welcomeMessage: Message = {
      id: Date.now().toString(),
      type: 'ai',
      content: `Hello! I'm your O3 Assistant. 👋

I can help you with:
• Understanding what O3 is and how it works
• Analyzing meeting recordings or transcripts
• Providing insights and next action items
• Suggesting improvements for manager-employee interactions

What would you like to know or analyze today?`,
      timestamp: new Date(),
      quickActions: ['What is O3?', 'Upload Transcript', 'Get Best Practices']
    };
    setMessages([welcomeMessage]);
    toast({
      title: "Chat cleared",
      description: "Starting fresh conversation."
    });
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <ChatHeader onClear={clearChat} />
      
      {/* Main Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <ChatMessage 
            key={message.id} 
            message={message} 
            onQuickAction={handleQuickAction}
          />
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="message-ai max-w-[70%] p-4 rounded-2xl shadow-sm animate-fade-in">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-primary rounded-full animate-typing"></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-typing" style={{ animationDelay: '0.3s' }}></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-typing" style={{ animationDelay: '0.6s' }}></div>
                </div>
                <span className="text-sm text-ai-message-foreground/70">
                  {uploadProgress > 0 ? `Processing file... ${uploadProgress}%` : 'O3 Assistant is analyzing...'}
                </span>
              </div>
              {uploadProgress > 0 && (
                <div className="mt-2">
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Section */}
      <div className="p-4 border-t border-border bg-card">
        <div className="flex items-center space-x-2 max-w-4xl mx-auto">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept=".mp3,.wav,.txt,.docx,.pdf"
          />
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 hover:bg-muted"
            title="Upload file"
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          <div className="flex-1 relative">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask about O3, share transcript, or get insights..."
              className="pr-20 rounded-full border-2 focus:border-ring"
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-muted"
                title="Voice input"
              >
                <Mic className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="shrink-0 rounded-full bg-primary hover:bg-primary/90"
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};