import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface Message {
  id: string;
  type: 'ai' | 'user';
  content: string;
  timestamp: Date;
  isAnalysis?: boolean;
  quickActions?: string[];
}

interface ChatMessageProps {
  message: Message;
  onQuickAction: (action: string) => void;
}

export const ChatMessage = ({ message, onQuickAction }: ChatMessageProps) => {
  const formatContent = (content: string) => {
    // Split by lines and format different elements
    const lines = content.split('\n');
    return lines.map((line, index) => {
      // Handle headers (lines starting with **)
      if (line.trim().startsWith('**') && line.trim().endsWith('**')) {
        const text = line.replace(/\*\*/g, '');
        return (
          <h3 key={index} className="font-semibold text-lg mb-2 mt-4 first:mt-0">
            {text}
          </h3>
        );
      }

      // Handle bullet points (lines starting with •)
      if (line.trim().startsWith('•')) {
        return (
          <div key={index} className="flex items-start space-x-2 mb-1">
            <span className="text-primary mt-1">•</span>
            <span>{line.replace('•', '').trim()}</span>
          </div>
        );
      }

      // Handle numbered lists
      if (/^\d+\./.test(line.trim())) {
        return (
          <div key={index} className="flex items-start space-x-2 mb-1">
            <span className="text-primary font-medium">{line.match(/^\d+\./)?.[0]}</span>
            <span>{line.replace(/^\d+\./, '').trim()}</span>
          </div>
        );
      }

      // Handle emoji headers (lines starting with emoji)
      if (/^[🎯📋📍🔍💡📎⚡✅🤔❌🔄].+\*\*$/.test(line)) {
        const cleanText = line.replace(/\*\*/g, '');
        return (
          <div key={index} className="flex items-center space-x-2 font-semibold text-lg mb-3 mt-4 first:mt-0">
            <span className="text-2xl">{cleanText.match(/^[🎯📋📍🔍💡📎⚡✅🤔❌🔄]/)?.[0]}</span>
            <span>{cleanText.replace(/^[🎯📋📍🔍💡📎⚡✅🤔❌🔄]/, '').trim()}</span>
          </div>
        );
      }

      // Regular lines
      if (line.trim()) {
        return (
          <p key={index} className="mb-2">
            {line}
          </p>
        );
      }

      return <div key={index} className="h-2" />;
    });
  };

  return (
    <div className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      <div className={`max-w-[70%] ${message.type === 'ai' ? 'message-ai' : 'message-user'} p-4 rounded-2xl shadow-sm`}>
        <div className="space-y-1">
          {formatContent(message.content)}
        </div>
        
        <div className={`text-xs mt-3 ${message.type === 'ai' ? 'text-ai-message-foreground/60' : 'text-secondary-foreground/60'}`}>
          {format(message.timestamp, 'HH:mm')}
        </div>

        {/* Quick Actions */}
        {message.quickActions && message.quickActions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-ai-message-foreground/10">
            {message.quickActions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => onQuickAction(action)}
                className="text-xs bg-card hover:bg-muted border-ai-message-foreground/20 text-ai-message-foreground hover:text-foreground rounded-full px-3 py-1 h-auto"
              >
                {action}
              </Button>
            ))}
          </div>
        )}

        {/* Analysis Badge */}
        {message.isAnalysis && (
          <div className="mt-3 pt-3 border-t border-ai-message-foreground/10">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
              🔍 Analysis Complete
            </span>
          </div>
        )}
      </div>
    </div>
  );
};