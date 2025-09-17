import { Button } from '@/components/ui/button';
import { HelpCircle, Settings, RotateCcw } from 'lucide-react';

interface ChatHeaderProps {
  onClear: () => void;
}

export const ChatHeader = ({ onClear }: ChatHeaderProps) => {
  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">🎯</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">O3 Assistant</h1>
            <p className="text-sm text-muted-foreground">Smart Meeting Analysis & Insights</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-muted"
            title="Help"
          >
            <HelpCircle className="h-5 w-5" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-muted"
            title="Settings"
          >
            <Settings className="h-5 w-5" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onClear}
            className="hover:bg-muted"
            title="Clear Chat"
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};