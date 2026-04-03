import { Bot } from "lucide-react";

/**
 * Typing Indicator Component
 * Shows animated 3 dots like real chat apps (WhatsApp, Telegram, etc.)
 */
export function TypingIndicator() {
  return (
    <div className="flex gap-3 mb-4">
      {/* Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
        <Bot className="w-4 h-4 text-white" />
      </div>

      {/* Typing bubble */}
      <div className="glass border border-white/10 rounded-lg px-4 py-3 shadow-md">
        <div className="flex items-center gap-1">
          <span className="typing-dot"></span>
          <span className="typing-dot" style={{ animationDelay: '0.2s' }}></span>
          <span className="typing-dot" style={{ animationDelay: '0.4s' }}></span>
        </div>
      </div>

      {/* CSS for typing animation */}
      <style>{`
        .typing-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #94a3b8;
          animation: typingAnimation 1.4s infinite ease-in-out;
        }

        @keyframes typingAnimation {
          0%, 60%, 100% {
            transform: translateY(0);
            opacity: 0.7;
          }
          30% {
            transform: translateY(-10px);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
