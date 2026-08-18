import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, User as UserIcon } from 'lucide-react';
import { useStore } from '@/store/StoreContext';
import { copilotAnswer } from '@/lib/engine';

interface Message { role: 'user' | 'ai'; content: string; }

const suggestions = [
  'Why is Order #1045 delayed?',
  'Which products need urgent replenishment?',
  'What is the biggest warehouse bottleneck?',
  'Which orders should we process first?',
  'What should the warehouse team do next?',
  'What is the warehouse health score?',
];

export function CopilotPage() {
  const { state } = useStore();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: "I'm the WarezAI Decision Copilot. I analyze live warehouse data to answer your operational questions. Ask me about order delays, replenishment needs, bottlenecks, or what actions your team should take next." }
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const ask = (question: string) => {
    if (!question.trim()) return;
    const answer = copilotAnswer(question, state);
    setMessages(prev => [...prev, { role: 'user', content: question }, { role: 'ai', content: answer }]);
    setInput('');
  };

  return (
    <div className="space-y-4 animate-fade-in max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl" style={{ background: 'var(--primary-soft)', border: '1px solid var(--primary)' }}>
          <Bot className="w-5 h-5" style={{ color: 'var(--primary)' }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>AI Decision Copilot</h1>
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>Ask questions about your warehouse operations — answers are generated from live data</p>
        </div>
      </div>

      <div className="glass-card rounded-2xl flex flex-col" style={{ height: 'calc(100vh - 220px)', minHeight: '400px' }}>
        <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0" style={{ background: msg.role === 'ai' ? 'var(--primary-soft)' : 'var(--surface-2)', border: '1px solid var(--border)' }}>
                {msg.role === 'ai' ? <Sparkles className="w-4 h-4" style={{ color: 'var(--primary)' }} /> : <UserIcon className="w-4 h-4" style={{ color: 'var(--text-2)' }} />}
              </div>
              <div className={`max-w-[80%] rounded-2xl p-3.5`} style={msg.role === 'ai' ? { background: 'var(--surface-2)', border: '1px solid var(--border)' } : { background: 'var(--primary-soft)', border: '1px solid var(--primary)' }}>
                <div className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--text)' }} dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text)">$1</strong>') }} />
              </div>
            </div>
          ))}
        </div>

        <div className="p-3" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') ask(input); }}
              placeholder="Ask about orders, inventory, bottlenecks..."
              className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
            <button
              onClick={() => ask(input)}
              disabled={!input.trim()}
              className="flex items-center justify-center w-10 h-10 rounded-xl transition-all disabled:opacity-30"
              style={{ background: 'var(--primary)', color: '#ffffff' }}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Suggested questions:</p>
        <div className="flex flex-wrap gap-2">
          {suggestions.map(s => (
            <button
              key={s}
              onClick={() => ask(s)}
              className="px-3 py-1.5 rounded-xl text-xs transition-all"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)' }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
