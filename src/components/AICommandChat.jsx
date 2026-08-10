import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, RotateCcw, AlertCircle } from "lucide-react";
import * as aiAssistantService from "../services/aiAssistantService.js";

/**
 * Full-pane conversational interface for the Biomedical AI Center.
 * Deliberately has no suggested/predefined question chips — the AI should
 * feel like an open-ended colleague you can just talk to, not a menu of
 * canned prompts.
 */
export default function AICommandChat({ equipment, contextEquipment }) {
  const [messages, setMessages] = useState(() => aiAssistantService.getHistory());
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isThinking]);

  async function send(text) {
    const trimmed = text.trim();
    if (!trimmed || isThinking) return;

    const userMsg = { role: "user", text: trimmed, timestamp: new Date().toISOString() };
    const next = [...messages, userMsg];
    setMessages(next);
    aiAssistantService.saveHistory(next);
    setInput("");
    setError(null);
    setIsThinking(true);

    try {
      const { text: replyText } = await aiAssistantService.ask({ message: trimmed, equipment, contextEquipment });
      const assistantMsg = { role: "assistant", text: replyText, timestamp: new Date().toISOString() };
      const withReply = [...next, assistantMsg];
      setMessages(withReply);
      aiAssistantService.saveHistory(withReply);
    } catch (err) {
      setError(err.message || "The assistant couldn't process that question. Please try again.");
    } finally {
      setIsThinking(false);
    }
  }

  function clearConversation() {
    setMessages([]);
    aiAssistantService.clearHistory();
    setError(null);
  }

  return (
    <div className="flex flex-col rounded-xl border border-border bg-surface shadow-card overflow-hidden" style={{ height: "min(72vh, 720px)" }}>
      <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-divider shrink-0" style={{ background: "linear-gradient(135deg, #123B67, #1B4C82)" }}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
            <Bot size={18} color="#B9CFFF" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white">Biomedical AI Assistant</div>
            <div className="text-[11px] text-[#B9CFFF] truncate">
              {contextEquipment ? `In context: ${contextEquipment.name}` : "Ask about any equipment, an error code, or clinical engineering practice"}
            </div>
          </div>
        </div>
        <button onClick={clearConversation} title="Clear conversation" className="h-8 w-8 rounded-lg flex items-center justify-center text-[#B9CFFF] hover:text-white hover:bg-white/10 transition-colors shrink-0">
          <RotateCcw size={15} />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 flex flex-col gap-3">
        {messages.length === 0 && (
          <div className="text-center py-10">
            <Sparkles size={26} color="#2F7DE1" className="mx-auto mb-3" />
            <p className="text-sm text-ink font-medium">I'm here — talk to me like a colleague</p>
            <p className="text-xs text-muted mt-1.5 max-w-sm mx-auto leading-relaxed">
              Ask about a device's risk score, why maintenance is overdue, an alarm or error code you're seeing,
              or a general biomedical engineering question — calibration, electrical safety, repair workflow,
              anything in scope.
            </p>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && (
              <div className="h-6 w-6 rounded-full bg-accent-soft flex items-center justify-center shrink-0 mt-0.5">
                <Bot size={12} color="#2F7DE1" />
              </div>
            )}
            <div
              className={`max-w-[85%] sm:max-w-[75%] rounded-xl px-3.5 py-2.5 text-sm whitespace-pre-line leading-relaxed ${
                m.role === "user" ? "bg-accent text-white" : "bg-accent-soft text-ink"
              }`}
            >
              {m.text}
            </div>
            {m.role === "user" && (
              <div className="h-6 w-6 rounded-full bg-navy flex items-center justify-center shrink-0 mt-0.5">
                <User size={12} color="#FFFFFF" />
              </div>
            )}
          </div>
        ))}

        {isThinking && (
          <div className="flex gap-2 justify-start">
            <div className="h-6 w-6 rounded-full bg-accent-soft flex items-center justify-center shrink-0 mt-0.5">
              <Bot size={12} color="#2F7DE1" />
            </div>
            <div className="bg-accent-soft rounded-xl px-4 py-3 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-[#D9364B0D] border border-[#D9364B]/30 px-3 py-2.5">
            <AlertCircle size={14} color="#D9364B" className="shrink-0 mt-0.5" />
            <div className="text-xs text-[#D9364B] flex-1">
              {error}
              <button onClick={() => send(messages[messages.length - 1]?.text || "")} className="block font-semibold underline mt-1">
                Try again
              </button>
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); send(input); }}
        className="flex items-center gap-2 px-4 sm:px-5 py-3 border-t border-divider shrink-0"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me anything biomedical engineering…"
          disabled={isThinking}
          className="flex-1 text-sm border border-border rounded-lg px-3 py-2.5 outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={isThinking || !input.trim()}
          className="h-10 w-10 shrink-0 rounded-lg bg-accent text-white flex items-center justify-center disabled:opacity-50 hover:opacity-90 transition-opacity"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
