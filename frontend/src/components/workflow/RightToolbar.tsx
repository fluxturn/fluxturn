import { Plus, Bot, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";

interface RightToolbarProps {
  onAddNode?: () => void;
  onLayout?: () => void;
  onAIPrompt?: () => void;
  onAddNote?: () => void;
  className?: string;
}

export function RightToolbar({ onAddNode, onLayout, onAIPrompt, onAddNote, className }: RightToolbarProps) {
  return (
    <div className={cn("fixed right-4 top-[140px] flex flex-col gap-2 z-10", className)}>
      {/* Add Node Button */}
      <button
        onClick={onAddNode}
        className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 rounded-lg border border-cyan-400/50 transition-colors shadow-lg"
        title="Add node"
      >
        <Plus className="w-5 h-5 text-white" />
      </button>

      {/* AI Workflow Builder Button */}
      <button
        onClick={onAIPrompt}
        className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-lg border border-purple-400/50 transition-colors shadow-lg"
        title="AI Workflow Builder"
      >
        <Bot className="w-5 h-5 text-white" />
      </button>

      {/* Add Note Button */}
      <button
        onClick={onAddNote}
        className="w-12 h-12 flex items-center justify-center glass hover:bg-white/10 rounded-lg border border-white/10 transition-colors shadow-lg"
        title="Add note"
      >
        <StickyNote className="w-5 h-5 text-gray-300" />
      </button>
    </div>
  );
}
