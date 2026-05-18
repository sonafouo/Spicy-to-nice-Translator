import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clipboard, Check, ArrowRight, Pencil, ChevronDown } from 'lucide-react';

const AUDIENCES = ["Manager", "Peer", "Direct Report", "Customer", "Executive"];
const TONES = ["Direct but polite", "Encouraging", "Highly formal", "Softened", "Urgent but professional"];

type DropdownSelectProps = {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  disabled?: boolean;
};

const DropdownSelect = ({ label, value, options, onChange, disabled = false }: DropdownSelectProps) => {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(() => Math.max(options.indexOf(value), 0));
  const rootRef = useRef<HTMLDivElement>(null);

  const selectedIndex = Math.max(options.indexOf(value), 0);

  useEffect(() => {
    if (disabled) {
      setOpen(false);
    }
  }, [disabled]);

  useEffect(() => {
    if (open) {
      setHighlightedIndex(selectedIndex);
    }
  }, [open, selectedIndex]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const selectOption = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;

    if (!open) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        setOpen(true);
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex((current) => (current + 1) % options.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((current) => (current - 1 + options.length) % options.length);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      setHighlightedIndex(0);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      setHighlightedIndex(options.length - 1);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectOption(options[highlightedIndex]);
    }
  };

  return (
    <div ref={rootRef} onKeyDown={handleKeyDown} className={`relative w-full sm:w-[290px] ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      <span className="mb-2 block text-[10px] font-mono uppercase tracking-[0.14em] text-[#888]">{label}</span>

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${value}`}
        disabled={disabled}
        className={`group flex w-full items-center justify-between rounded-[1.4rem] border px-4 py-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FF4E00]/12 ${
          open
            ? 'border-[#FF4E00]/30 bg-[#FFFDF9] shadow-[0_18px_42px_rgba(255,78,0,0.08)]'
            : 'border-[#D8D3C7] bg-[#FBFAF7] shadow-[0_1px_0_rgba(26,25,24,0.03)] hover:-translate-y-0.5 hover:border-[#C9C2B6] hover:bg-white'
        }`}
      >
        <span className="min-w-0 truncate text-[17px] leading-tight tracking-[-0.02em] text-[#1A1918]">{value}</span>

        <span
          className={`ml-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all duration-200 ${
            open
              ? 'border-[#FF4E00] bg-[#FF4E00] text-white shadow-[0_10px_18px_rgba(255,78,0,0.18)]'
              : 'border-[#E2DDD1] bg-[#FFF4EA] text-[#FF4E00] group-hover:border-[#FFD0B8]'
          }`}
        >
          <ChevronDown size={16} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.2, 0.65, 0.3, 0.9] }}
            className="absolute left-0 right-0 bottom-full z-20 mb-3"
          >
            <div
              role="listbox"
              aria-label={label}
                className="overflow-hidden rounded-[1.5rem] border border-[#E5DED3] bg-[#FEFCF8] shadow-[0_30px_80px_rgba(255,78,0,0.10)] backdrop-blur-sm"
            >
              <div className="flex items-center justify-between border-b border-[#E8E3D8] px-4 py-3">
                <span className="text-[9px] uppercase tracking-[0.18em] text-[#C2BDB2]">Choose one</span>
              </div>

              <div className="p-2">
                {options.map((option, index) => {
                  const isSelected = index === selectedIndex;
                  const isHighlighted = index === highlightedIndex;

                  return (
                    <button
                      key={option}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      onFocus={() => setHighlightedIndex(index)}
                      onClick={() => selectOption(option)}
                      className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition-all duration-150 ${
                        isSelected
                          ? 'border border-[#FFD2BC] bg-[#FFF0E6] text-[#1A1918] shadow-[0_10px_24px_rgba(255,78,0,0.10)]'
                          : isHighlighted
                            ? 'bg-[#F7F1E8] text-[#1A1918]'
                            : 'text-[#1A1918] hover:bg-[#F7F1E8]'
                      }`}
                    >
                      <span className="pr-4 text-[15px] leading-snug tracking-[-0.01em]">{option}</span>
                      {isSelected && <Check size={15} className="text-[#FF4E00]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const parseOutput = (text: string) => {
  const parts = {
    message: "",
    actionItems: [] as string[],
    summary: ""
  };

  const msgMatch = text.match(/\[DIPLOMATIC_MESSAGE\]\n([\s\S]*?)(?=\n\n\[ACTION_ITEMS\]|$)/);
  const actionMatch = text.match(/\[ACTION_ITEMS\]\n([\s\S]*?)(?=\n\n\[WHAT_CHANGED\]|$)/);
  const summaryMatch = text.match(/\[WHAT_CHANGED\]\n([\s\S]*?)$/);

  if (msgMatch) parts.message = msgMatch[1].trim();
  if (actionMatch) {
    parts.actionItems = actionMatch[1].trim().split('\n').map(item => item.replace(/^- /, '').trim()).filter(Boolean);
  }
  if (summaryMatch) parts.summary = summaryMatch[1].trim();

  // Fallback if formatting is still in progress or failed
  if (!parts.message && !parts.actionItems.length && !parts.summary) {
    parts.message = text;
  }

  return parts;
};

const getCleanText = (text: string) => {
  return text
    .replace(/\[-[\s\S]*?-\]/g, '')
    .replace(/\[-[\s\S]*$/, '')
    .replace(/\{\+([\s\S]*?)\+\}/g, '$1')
    .replace(/\{\+([\s\S]*)$/, '$1')
    .replace(/\s+/g, ' ')
    .trim();
};

const StreamWordReveal = ({ text }: { text: string }) => {
  const segments = text.split(/(\s+)/);
  return (
    <div className="inline-block relative whitespace-pre-wrap">
      {segments.map((segment, i) => {
        if (/^\s+$/.test(segment)) {
          return <span key={i}>{segment}</span>;
        }
        return (
          <motion.span
            key={i}
            initial={{ opacity: 0, filter: 'blur(8px)', y: 8 }}
            animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
            transition={{ duration: 0.5, ease: [0.2, 0.65, 0.3, 0.9] }}
            className="inline-block"
          >
            {segment}
          </motion.span>
        );
      })}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
        className="inline-block w-2.5 h-7 md:h-9 bg-[#FF4E00] align-middle mt-[-4px] ml-1 rounded-[1px]"
      />
    </div>
  );
};

export default function App() {
  const [input, setInput] = useState("");
  const [audience, setAudience] = useState(AUDIENCES[0]);
  const [tone, setTone] = useState(TONES[0]);
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "guarding" | "consulting" | "polishing" | "streaming" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);
  const [rawInput, setRawInput] = useState("");

  const abortControllerRef = useRef<AbortController | null>(null);
  const phaseTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const clearPhaseTimers = () => {
    phaseTimersRef.current.forEach(clearTimeout);
    phaseTimersRef.current = [];
  };

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    if (textareaRef.current && status === 'idle') {
      textareaRef.current.style.height = '120px';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input, status]);

  const clearFlow = () => {
    setInput("");
    setOutput("");
    setStatus("idle");
    setError("");
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (input.trim() && input.length <= 5000 && (status === "idle" || status === "success" || status === "error")) {
        handleTranslate();
      }
    }
  };

  const handleTranslate = useCallback(async () => {
    if (!input.trim()) return;

    setRawInput(input);

    // Reset state
    setError("");
    setOutput("");
    setStatus("guarding");

    // Cancel any in-flight request and clear stale phase timers before starting
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    clearPhaseTimers();

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input, audience, tone }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        let errData;
        try {
          errData = await response.json();
        } catch (e) {
          throw new Error("Server error occurred. Please try again.");
        }
        throw new Error(errData.error || "Translation failed");
      }

      // Simulated phase transitions — stored in refs so they can be cancelled
      phaseTimersRef.current.push(
        setTimeout(() => setStatus((prev) => prev === "guarding" ? "consulting" : prev), 1500),
        setTimeout(() => setStatus((prev) => (prev === "guarding" || prev === "consulting") ? "polishing" : prev), 3500)
      );

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("Stream not available");

      let fullText = "";
      // Accumulate across TCP packet boundaries — SSE events may span multiple reads
      let sseBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const events = sseBuffer.split("\n\n");
        sseBuffer = events.pop() ?? ""; // keep the incomplete trailing segment

        for (const event of events) {
          if (event.startsWith("data: ")) {
            try {
              const parsed = JSON.parse(event.slice(6));
              if (parsed.error) throw new Error(parsed.error);
              if (parsed.text) {
                fullText += parsed.text;
                setOutput(fullText);
                setStatus("streaming");
              }
            } catch (e: any) {
              if (e.message && !e.message.startsWith("JSON")) throw e;
              console.error("Failed to parse stream chunk", e);
            }
          }
        }
      }

      clearPhaseTimers();
      setStatus("success");
      const finalParsed = parseOutput(fullText);
      setInput(getCleanText(finalParsed.message));
    } catch (err: any) {
      clearPhaseTimers();
      if (err.name === 'AbortError') return;
      setError(err.message);
      setStatus("error");
    }
  }, [input, audience, tone]);

  const parsedOutput = useMemo(() => parseOutput(output), [output]);

  const handleCopy = () => {
    const cleanText = getCleanText(parsedOutput.message);
    navigator.clipboard.writeText(cleanText);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const renderTrackedChanges = (text: string) => {
    const parts = text.split(/(\[-[\s\S]*?-\]|\{\+[\s\S]*?\+\})/g);
    return parts.map((part, i) => {
      if (part.startsWith('[-') && part.endsWith('-]')) {
         return (
           <del
             key={i}
             className="relative inline-block text-[#D9534F] opacity-60 line-through decoration-2 decoration-[#D9534F] mx-1 bg-[#D9534F]/5 px-1 rounded-sm tracking-normal"
           >
             {part.slice(2, -2)}
           </del>
         );
      } else if (part.startsWith('{+') && part.endsWith('+}')) {
         return (
           <ins
             key={i}
             className="relative inline-block no-underline text-[#248232] bg-[#248232]/10 px-1.5 py-0.5 rounded shadow-sm font-semibold border-b-2 border-[#248232]/30 mx-1 tracking-normal leading-tight"
           >
             {part.slice(2, -2)}
           </ins>
         );
      }
      return <span key={i} className="text-[#1A1918]">{part}</span>;
    });
  };

  return (
    <main className="min-h-screen w-full font-sans antialiased text-[15px] selection:bg-[#FF4E00] selection:text-white bg-[#F5F4F0] text-[#1A1918] flex flex-col items-center">
      <div className="w-full max-w-3xl px-6 py-12 md:py-24 flex flex-col min-h-screen relative">

        {/* HEADER */}
        <header className="mb-12 md:mb-16">
          <h1 className="font-serif italic text-6xl md:text-[88px] tracking-tighter text-[#FF4E00] leading-[0.88] mb-4">Diplomacy.</h1>
          <div className="text-[11px] uppercase font-mono tracking-[0.14em] text-[#888]">From Raw Emotion to Professional Precision</div>
        </header>

        {/* LIVING DOCUMENT SECTION */}
        <div className="flex-1 flex flex-col relative group min-h-[200px]">
          {(status === 'idle' || status === 'success') ? (
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                if (status === 'success') {
                  // Keep it in success state so Insights remain visible below while they edit!
                }
              }}
              onKeyDown={handleKeyDown}
              maxLength={5000}
              placeholder="Start drafting your thoughts..."
              className={`w-full bg-transparent border-none resize-none outline-none font-serif text-3xl md:text-[40px] leading-[1.3] placeholder:text-[#C4C2B7] placeholder:italic transition-colors ${
                input.length >= 5000 ? 'text-red-500' : 'text-[#1A1918]'
              }`}
              style={{
                minHeight: '120px'
              }}
            />
          ) : (
            <div
              className={`w-full bg-transparent border-none outline-none font-serif text-3xl md:text-[40px] leading-[1.4] tracking-[-0.01em] transition-all pb-16 relative group/edit`}
              style={{ minHeight: '120px' }}
            >
              {status === "error" ? (
                 <div className="text-[#D9534F] font-sans text-xl h-full flex items-center">
                    {error}
                 </div>
              ) : status === "streaming" ? (
                 <StreamWordReveal text={getCleanText(parsedOutput.message)} />
              ) : (
                 <motion.div
                   className="whitespace-pre-wrap text-[#1A1918] opacity-30 origin-top-left"
                   animate={{ opacity: [0.2, 0.6, 0.2], filter: ['blur(0px)', 'blur(2px)', 'blur(0px)'] }}
                   transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                 >
                   {rawInput || input}
                 </motion.div>
              )}
            </div>
          )}

          <div className={`absolute bottom-4 right-0 flex items-center gap-4 text-[10px] font-mono tracking-widest uppercase transition-opacity ${
            input.length >= 5000 ? 'text-red-500' : 'text-[#888]'
          } ${status !== 'idle' ? 'opacity-100' : 'lg:opacity-0 lg:group-hover:opacity-100'}`}>
             {status !== 'idle' && status !== 'error' && (
              <div className="flex items-center gap-2 mr-4 pointer-events-none">
                 <motion.span
                   animate={status === 'success' ? {} : { scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                   transition={{ repeat: Infinity, duration: 1.5 }}
                   className={`w-2 h-2 rounded-full ${status === 'success' ? 'bg-[#248232]' : 'bg-[#FF4E00]'}`}
                 />
                 <span className={`transition-colors ${status === 'success' ? 'text-[#248232]' : 'text-[#FF4E00]'}`}>
                   {status === "guarding" && "Analyzing Intent"}
                   {status === "consulting" && "Restructuring Architecture"}
                   {status === "polishing" && "Applying Corporate Nuance"}
                   {status === "streaming" && "Formulating Output"}
                   {status === "success" && "Refined"}
                 </span>
              </div>
            )}

            {status === 'success' && rawInput && (
              <button
                onClick={() => {
                  setInput(rawInput);
                  setStatus('idle');
                  setTimeout(() => textareaRef.current?.focus(), 0);
                }}
                className="hover:text-[#888] transition-colors outline-none cursor-pointer flex items-center gap-1 text-[#888]"
              >
                <Pencil size={12} /> Revert to Raw
              </button>
            )}

            {status === 'idle' && input.length > 0 && (
              <button onClick={clearFlow} className="hover:text-[#FF4E00] transition-colors outline-none cursor-pointer">Clear Input</button>
            )}
            {status === 'idle' && (
              <span>{input.length} / 5000</span>
            )}
          </div>
        </div>

        {/* CONTROLS */}
        <div className="border-t border-[#E0DED4] pt-8 mt-4 flex flex-col md:flex-row gap-8 items-start md:items-end justify-between transition-opacity duration-500">
          <div className={`grid w-full gap-6 sm:grid-cols-2 md:w-auto ${status !== 'idle' && status !== 'error' && status !== 'success' ? 'opacity-30 pointer-events-none' : ''}`}>
            <DropdownSelect label="Audience" value={audience} options={AUDIENCES} onChange={setAudience} disabled={status !== 'idle' && status !== 'error' && status !== 'success'} />
            <DropdownSelect label="Target Tone" value={tone} options={TONES} onChange={setTone} disabled={status !== 'idle' && status !== 'error' && status !== 'success'} />
          </div>

          <div className={`flex flex-col items-center w-full md:w-auto group/btn relative mt-6 md:mt-0 ${status !== 'idle' && status !== 'error' && status !== 'success' ? 'opacity-30 pointer-events-none' : ''}`}>
            <button
              onClick={handleTranslate}
              disabled={(status !== "idle" && status !== "success" && status !== "error") || input.length === 0 || input.length > 5000}
              className="flex-shrink-0 w-full md:w-20 h-16 md:h-20 rounded-xl md:rounded-full border border-[#1A1918] hover:border-[#FF4E00] disabled:opacity-30 flex items-center justify-center transition-all bg-transparent hover:bg-[#FF4E00] hover:text-white disabled:hover:bg-transparent text-[#1A1918] duration-300 outline-none cursor-pointer"
              aria-label="Translate to Diplomatic Professional Tone"
            >
              <ArrowRight className="group-hover/btn:translate-x-1 transition-transform" />
            </button>
            <span className="absolute -bottom-8 whitespace-nowrap text-[9px] text-[#888] font-mono uppercase tracking-[0.14em] hidden md:block opacity-0 group-hover/btn:opacity-100 transition-opacity">
              ⌘ + Enter
            </span>
          </div>
        </div>

        {/* INSIGHTS & ACTIONS SECTION */}
        <AnimatePresence>
          {status !== "idle" && status !== "error" && (
            <motion.div
              ref={resultsRef}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-16 pt-16 border-t border-[#E0DED4] min-h-[30vh]"
            >
              <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                 <div>
                    <h2 className="font-serif text-4xl md:text-[48px] tracking-tighter text-[#1A1918] leading-[0.88] mb-4">Insights.</h2>
                    <div className="text-[11px] uppercase font-mono tracking-[0.14em] text-[#888]">Structural Analysis</div>
                 </div>

                 {output && status === "success" && (
                  <button
                    onClick={handleCopy}
                    className="flex items-center justify-center gap-2 text-[10px] w-full md:w-auto font-mono uppercase tracking-[0.14em] px-5 py-3 md:py-2.5 border border-[#1A1918] rounded-full hover:bg-[#1A1918] hover:text-[#F5F4F0] transition-colors group cursor-pointer"
                    aria-label="Copy clean refined version"
                  >
                    {copySuccess ? <Check size={14} /> : <Clipboard size={14} />}
                    {copySuccess ? "Copied" : "Copy Clean Version"}
                  </button>
                 )}
              </header>

              <div className="flex-1 relative space-y-16 pb-24">
                {/* DIFF TRACKING */}
                {status === 'success' && (
                  <div>
                     <h3 className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#888] mb-8">Diff Translation</h3>
                     <div className="font-serif text-2xl md:text-[32px] leading-[1.4] tracking-[-0.01em]">
                        {renderTrackedChanges(parsedOutput.message)}
                     </div>
                  </div>
                )}

                {/* ACTION ITEMS */}
                {(parsedOutput.actionItems.length > 0 || status === "polishing") && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <h3 className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#888] mb-8">Key Structural Shifts</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                      {parsedOutput.actionItems.map((item, i) => (
                        <div key={i} className="flex gap-5 border-t border-[#E0DED4] pt-5">
                          <span className="font-mono text-[#FF4E00] text-xs mt-1 font-bold">{(i + 1).toString().padStart(2, '0')}</span>
                          <span className="text-[15px] font-sans leading-relaxed text-[#555]">{item}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* SUMMARY PANEL */}
                {parsedOutput.summary && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="bg-[#EBE9DE] p-8 md:p-12 rounded-2xl md:mt-12 overflow-hidden relative"
                  >
                    <div className="absolute top-8 right-8 origin-top-right scale-[4] opacity-5 pointer-events-none text-[#1A1918]">
                      &#10077;
                    </div>
                    <h3 className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#1A1918] opacity-50 mb-6">Translation Logic</h3>
                    <p className="font-serif italic text-xl md:text-3xl leading-[1.3] text-[#1A1918] tracking-tight relative z-10 max-w-2xl">
                      "{parsedOutput.summary}"
                    </p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </main>
  );
}
