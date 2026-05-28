"use client";

import { useState, useEffect, useRef } from "react";
import { Sparkles, Send, Bot, User as UserIcon } from "lucide-react";
import { chatWithAI } from "@/lib/api";

interface AIChatProps {
  username?: string;
}

export default function AIChat({ username }: AIChatProps) {
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  const sendMessage = async () => {
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: text }]);
    setChatLoading(true);
    try {
      const res = await chatWithAI(username || "unknown", text);

      if (!res.ok) throw new Error("AI error");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader available");

      setChatLoading(false);
      setChatMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      const decoder = new TextDecoder();
      let assistantContent = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.error) throw new Error(data.error);
            const content = data.message?.content || "";
            assistantContent += content;

            setChatMessages((prev) => {
              const newMessages = [...prev];
              newMessages[newMessages.length - 1] = {
                role: "assistant",
                content: assistantContent,
              };
              return newMessages;
            });
          } catch (e) {
          }
        }
      }
    } catch (err) {
      setChatLoading(false);
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Eroare de conexiune. Încearcă din nou." },
      ]);
    }
  };

  return (
    <>
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center z-50 group"
        >
          <Sparkles className="w-6 h-6 group-hover:scale-110 transition-transform" />
        </button>
      )}

      {chatOpen && (
        <div className="fixed bottom-6 right-6 w-[420px] max-h-[600px] bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col z-50 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">Asistent AI</p>
                <p className="text-blue-200 text-xs font-medium">Analizez statisticile tale</p>
              </div>
            </div>
            <button onClick={() => setChatOpen(false)} className="text-white/70 hover:text-white transition-colors text-xl font-bold leading-none px-1">✕</button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-[300px] max-h-[420px]">
            {chatMessages.length === 0 && !chatLoading && (
              <div className="text-center py-10 space-y-3">
                <Bot className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Întreabă-mă orice despre statisticile tale!</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {["Ce capitol ar trebui să exersez?", "Fă-mi un plan de studiu", "Cum pot să îmi îmbunătățesc media?"].map((q) => (
                    <button key={q} onClick={() => { setChatInput(q); }} className="text-xs font-bold px-3 py-1.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm font-medium whitespace-pre-wrap ${msg.role === "user" ? "bg-[#0066ff] text-white rounded-br-md" : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-md border border-slate-200 dark:border-slate-700"}`}>
                  {msg.content}
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                    <UserIcon className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                  </div>
                )}
              </div>
            ))}
            {chatLoading && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 px-4 py-3 rounded-2xl rounded-bl-md border border-slate-200 dark:border-slate-700">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/50 shrink-0">
            <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Scrie un mesaj..."
                className="flex-1 px-4 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || chatLoading}
                className="w-10 h-10 bg-[#0066ff] hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-colors shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
