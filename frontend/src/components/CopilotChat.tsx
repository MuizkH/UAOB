import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, HelpCircle, FileText, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';

interface Citation {
  id: number;
  documentName: string;
  pageNumber: number;
  textSnippet: string;
  confidence: number;
  tags: string[];
}

interface Message {
  role: 'user' | 'assistant';
  text: string;
  citations?: Citation[];
  method?: 'vector' | 'keyword';
}

const SAMPLE_QUESTIONS = [
  "What is the procedure for high vibration on Centrifugal Pump P-101?",
  "What is the low water level emergency protocol for steam boiler BLR-22?",
  "According to OISD-189, where should gas detectors be placed?",
  "What are the inspection requirements for pressure vessels under the Factory Act?"
];

export default function CopilotChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: "Affirmative. System operations initialized. I am your Industrial Operations Copilot. Ask me questions about OEM manuals, emergency shutdown procedures (SOPs), or compliance requirements (OISD/Factory Act/PESO)."
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSubmit = async (textToSend: string) => {
    if (!textToSend.trim()) return;
    setInput('');
    setLoading(true);
    setSelectedCitation(null);

    // Append user message
    setMessages(prev => [...prev, { role: 'user', text: textToSend }]);

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: textToSend })
      });
      const data = await res.json();
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        text: data.answer,
        citations: data.citations,
        method: data.method
      }]);
    } catch (error: any) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        text: `Error connecting to operations engine: ${error.message}. Please verify the backend is running.`
      }]);
    } finally {
      setLoading(false);
    }
  };

  const renderAnswerWithCitations = (message: Message) => {
    const answerText = message.text;
    const citations = message.citations || [];
    
    if (citations.length === 0) {
      return <div className="whitespace-pre-line leading-relaxed text-slate-300 select-text">{answerText}</div>;
    }

    const parts = [];
    const regex = /\[(\d+)\]/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(answerText)) !== null) {
      const textBefore = answerText.slice(lastIndex, match.index);
      if (textBefore) {
        parts.push(<span key={`text-${lastIndex}`}>{textBefore}</span>);
      }

      const citationIndex = parseInt(match[1], 10);
      const citation = citations.find(c => c.id === citationIndex);

      if (citation) {
        parts.push(
          <button
            key={`cite-${match.index}`}
            onClick={() => setSelectedCitation(citation)}
            className={`inline-flex items-center justify-center h-4 w-4 mx-0.5 text-[10px] font-mono font-bold rounded-full transition-all cursor-pointer ${
              selectedCitation && selectedCitation.id === citation.id
                ? 'bg-industrial-accent-blue text-white shadow-glow'
                : 'bg-industrial-accent-blue/20 text-industrial-accent-blue hover:bg-industrial-accent-blue hover:text-white border border-industrial-accent-blue/30'
            }`}
          >
            {citationIndex}
          </button>
        );
      } else {
        parts.push(<span key={`plain-${match.index}`}>{match[0]}</span>);
      }

      lastIndex = regex.lastIndex;
    }

    const textAfter = answerText.slice(lastIndex);
    if (textAfter) {
      parts.push(<span key={`text-end`}>{textAfter}</span>);
    }

    return (
      <div className="whitespace-pre-line leading-relaxed text-slate-300 font-sans select-text">
        {parts.length > 0 ? parts : answerText}
      </div>
    );
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full bg-slate-900/10 border-r border-industrial-border-dark">
        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg, i) => (
            <div 
              key={i} 
              className={`flex gap-4 p-4 rounded-xl border border-transparent transition-all max-w-[85%] ${
                msg.role === 'user' 
                  ? 'ml-auto bg-slate-800/60 border-slate-700/50 text-slate-100 flex-row-reverse' 
                  : 'mr-auto bg-slate-950/60 border-industrial-border-dark/60 text-slate-200'
              }`}
            >
              {/* Avatar Icon */}
              <div className={`h-8 w-8 rounded-lg shrink-0 flex items-center justify-center border ${
                msg.role === 'user'
                  ? 'bg-slate-700 border-slate-600 text-slate-300'
                  : 'bg-industrial-accent-blue/10 border-industrial-accent-blue/30 text-industrial-accent-blue'
              }`}>
                {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>

              {/* Message Content */}
              <div className="flex-1 space-y-3 overflow-x-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
                    {msg.role === 'user' ? 'Operator' : 'AI Copilot Engine'}
                  </span>
                  {msg.role === 'assistant' && msg.method && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                      Search Mode: {msg.method === 'vector' ? 'Atlas Vector Search' : 'Keyword Fallback'}
                    </span>
                  )}
                </div>

                <div className="prose prose-invert prose-sm max-w-none text-left">
                  {renderAnswerWithCitations(msg)}
                </div>

                {/* Inline Citations quick overview */}
                {msg.role === 'assistant' && msg.citations && msg.citations.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80 mt-2 flex flex-wrap gap-2 items-center">
                    <span className="text-[10px] text-slate-500 font-mono">Retrieved Sources:</span>
                    {msg.citations.map((cite) => (
                      <button
                        key={cite.id}
                        onClick={() => setSelectedCitation(cite)}
                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono border transition-all ${
                          selectedCitation && selectedCitation.id === cite.id
                            ? 'bg-industrial-accent-blue/20 text-industrial-accent-blue border-industrial-accent-blue'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-300'
                        }`}
                      >
                        <FileText className="h-3 w-3" />
                        <span>[{cite.id}] {cite.documentName.slice(0, 16)}... (Pg. {cite.pageNumber})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Loading Skeleton */}
          {loading && (
            <div className="flex gap-4 p-4 rounded-xl bg-slate-950/60 border border-industrial-border-dark/60 max-w-[80%] mr-auto animate-pulse">
              <div className="h-8 w-8 rounded-lg bg-slate-800 border border-slate-700 shrink-0 flex items-center justify-center text-slate-600">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex-1 space-y-3">
                <div className="h-3 w-28 bg-slate-800 rounded"></div>
                <div className="space-y-2">
                  <div className="h-3.5 bg-slate-800 rounded w-full"></div>
                  <div className="h-3.5 bg-slate-800 rounded w-[92%]"></div>
                  <div className="h-3.5 bg-slate-800 rounded w-[80%]"></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Box Area */}
        <div className="p-4 bg-slate-950/30 border-t border-industrial-border-dark flex flex-col gap-3">
          {/* Quick recommendations */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
              <HelpCircle className="h-3 w-3" /> Technical Prompts:
            </span>
            {SAMPLE_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSubmit(q)}
                disabled={loading}
                className="text-[10px] bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-300 font-mono py-1 px-2.5 rounded-lg transition-all text-left truncate max-w-xs cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(input);
            }} 
            className="flex gap-3 relative"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              placeholder="Ask Copilot about plant procedures, valve positions, OISD standards..."
              className="flex-1 bg-slate-900 border border-industrial-border-dark focus:border-industrial-accent-blue/80 rounded-xl px-4 py-3 text-sm focus:outline-none text-slate-100 placeholder-slate-500 font-sans"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-4 py-3 bg-industrial-accent-blue hover:bg-blue-600 disabled:bg-slate-800 disabled:text-slate-600 border border-industrial-accent-blue/30 rounded-xl text-white transition-all flex items-center justify-center cursor-pointer shadow-glow-hover"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Citation Inspector Side Drawer */}
      {selectedCitation && (
        <div className="w-80 bg-industrial-bg-darker flex flex-col h-full border-l border-industrial-border-dark overflow-y-auto fade-in">
          {/* Title */}
          <div className="p-4 border-b border-industrial-border-dark flex items-center justify-between">
            <h3 className="text-xs font-bold font-mono tracking-wider text-slate-300 uppercase flex items-center gap-2">
              <FileText className="h-4 w-4 text-industrial-accent-blue" />
              Source Inspector
            </h3>
            <button 
              onClick={() => setSelectedCitation(null)}
              className="text-[10px] text-slate-500 font-mono hover:text-slate-300 border border-slate-800 rounded px-1.5 py-0.5"
            >
              Close
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Confidence Score Indicator */}
            <div className="bg-slate-900/60 rounded-xl p-4 border border-industrial-border-dark">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1.5">
                <span>Search Score Alignment:</span>
                <span className={`font-bold font-mono ${
                  selectedCitation.confidence >= 80 ? 'text-industrial-accent-green' : 'text-industrial-accent-amber'
                }`}>
                  {selectedCitation.confidence}%
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    selectedCitation.confidence >= 80 ? 'bg-industrial-accent-green' : 'bg-industrial-accent-amber'
                  }`}
                  style={{ width: `${selectedCitation.confidence}%` }}
                ></div>
              </div>
            </div>

            {/* Document details */}
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-1">Source Document</label>
                <div className="text-sm font-semibold text-slate-200 select-all font-mono leading-tight">
                  {selectedCitation.documentName}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-1">Page Reference</label>
                <div className="text-sm font-semibold font-mono text-slate-300">
                  Page {selectedCitation.pageNumber} of document
                </div>
              </div>

              {selectedCitation.tags && selectedCitation.tags.length > 0 && (
                <div>
                  <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-1">Extracted Tags</label>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedCitation.tags.map((t, idx) => (
                      <span key={idx} className="bg-slate-900 border border-slate-800 text-[10px] text-slate-300 font-mono px-2 py-0.5 rounded">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="h-px bg-industrial-border-dark"></div>

            {/* Text snippet */}
            <div>
              <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-2">Grounding Content Excerpt</label>
              <div className="bg-slate-900/40 border border-industrial-border-dark p-4 rounded-xl text-xs text-slate-400 font-medium select-text leading-relaxed whitespace-pre-line font-mono">
                "{selectedCitation.textSnippet}"
              </div>
            </div>
            
            <div className="rounded-xl border border-industrial-accent-blue/15 bg-industrial-accent-blue/5 p-3 flex gap-2">
              <CheckCircle2 className="h-4 w-4 text-industrial-accent-blue shrink-0 mt-0.5" />
              <p className="text-[10px] text-slate-400 leading-normal font-sans">
                This excerpt was dynamically mapped to the knowledge graph and vector corpus to verify grounded LLM responses.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
