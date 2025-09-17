import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, HelpCircle, Settings, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ChatMessage } from './ChatMessage';
import { ChatHeader } from './ChatHeader';
import { supabase } from '@/integrations/supabase/client';

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
    const currentInput = inputValue;
    const currentFile = uploadedFile;
    setInputValue('');
    setIsLoading(true);

    try {
      // Build conversation history for context
      const conversationHistory = messages.map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      // Prepare request body
      let requestBody: any = { 
        message: currentInput,
        conversationHistory: conversationHistory
      };

      // If there's an uploaded file, include it in the request
      if (currentFile) {
        // Convert file to base64 for transmission
        const fileContent = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(currentFile);
        });

        requestBody.file = {
          name: currentFile.name,
          type: currentFile.type,
          size: currentFile.size,
          content: fileContent
        };

        // Clear the uploaded file after sending
        setUploadedFile(null);
      }

      const { data, error } = await supabase.functions.invoke('o3-chat', {
        body: requestBody
      });

      if (error) {
        throw new Error(error.message);
      }

      const aiResponse: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content: data.response,
        timestamp: new Date(),
        quickActions: data.quickActions || []
      };

      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Error calling O3 chat:', error);
      
      // Fallback response
      const fallbackResponse: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content: `I apologize, but I'm having trouble connecting right now. Please try again in a moment. 

In the meantime, I can help you with:
• O3 conversation frameworks and best practices
• Meeting analysis techniques
• Manager-employee communication strategies

Would you like to try your question again?`,
        timestamp: new Date(),
        quickActions: ['Try Again', 'O3 Information', 'Best Practices']
      };
      
      setMessages(prev => [...prev, fallbackResponse]);
      
      toast({
        title: "Connection Error",
        description: "Unable to connect to AI service. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (action: string) => {
    setInputValue(action);
    setTimeout(() => handleSendMessage(), 100);
  };

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

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

    // Store the uploaded file and show confirmation message
    setUploadedFile(file);
    
    const fileUploadMessage: Message = {
      id: Date.now().toString(),
      type: 'ai',
      content: `📎 **File Uploaded Successfully!**

I've received your file: **${file.name}**

I'm here to help you with whatever you need! Please let me know what you'd like me to do with this file:

• **Analyze** the content and provide insights
• **Summarize** the key points  
• **Extract** specific information
• **Create** action items or recommendations
• **Generate** a report or summary
• Or anything else you have in mind!

Just type your request and I'll take care of it for you. 😊`,
      timestamp: new Date(),
      quickActions: ['Analyze Content', 'Create Summary', 'Extract Key Points', 'Generate Action Items']
    };

    setMessages(prev => [...prev, fileUploadMessage]);

    toast({
      title: "File uploaded successfully",
      description: "Tell me what you'd like me to do with it!"
    });
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
              placeholder="Ask about O3, upload a file, or tell me what you'd like to analyze..."
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