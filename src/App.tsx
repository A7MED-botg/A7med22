/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Plus, 
  MessageSquare, 
  Menu, 
  X, 
  Paperclip, 
  User, 
  Bot,
  Trash2,
  ChevronRight,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getGeminiResponse } from './services/gemini';
import { Message, ChatSession } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ name: string, type: string, data: string } | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load sessions from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('a7med_ai_sessions');
    if (saved) {
      const parsed = JSON.parse(saved);
      setSessions(parsed);
      if (parsed.length > 0) {
        setCurrentSessionId(parsed[0].id);
      } else {
        createNewSession();
      }
    } else {
      createNewSession();
    }
  }, []);

  // Save sessions to localStorage
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('a7med_ai_sessions', JSON.stringify(sessions));
    }
  }, [sessions]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions, currentSessionId]);

  const currentSession = sessions.find(s => s.id === currentSessionId);

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'محادثة جديدة',
      messages: [],
      updatedAt: Date.now(),
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setIsSidebarOpen(false);
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);
    if (currentSessionId === id) {
      if (updated.length > 0) {
        setCurrentSessionId(updated[0].id);
      } else {
        createNewSession();
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        const data = base64.split(',')[1];
        setSelectedFile({
          name: file.name,
          type: file.type,
          data: data
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedFile) || isLoading || !currentSessionId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
      file: selectedFile ? {
        name: selectedFile.name,
        type: selectedFile.type,
        size: 0 // Not strictly needed for UI
      } : undefined
    };

    // Update session with user message
    const updatedSessions = sessions.map(s => {
      if (s.id === currentSessionId) {
        const newMessages = [...s.messages, userMessage];
        return {
          ...s,
          messages: newMessages,
          title: s.messages.length === 0 ? (input.slice(0, 30) || 'ملف مرفق') : s.title,
          updatedAt: Date.now()
        };
      }
      return s;
    });

    setSessions(updatedSessions);
    setInput('');
    const fileToUpload = selectedFile;
    setSelectedFile(null);
    setIsLoading(true);

    // Prepare history for Gemini
    const history = currentSession?.messages.map(m => ({
      role: m.role,
      parts: [{ text: m.content }]
    })) || [];

    const responseText = await getGeminiResponse(
      input, 
      history, 
      fileToUpload ? { mimeType: fileToUpload.type, data: fileToUpload.data } : undefined
    );

    const botMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      content: responseText || 'معليش يا حبيب، الشبكة كعبة شوية.',
      timestamp: Date.now(),
    };

    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        return {
          ...s,
          messages: [...s.messages, botMessage],
          updatedAt: Date.now()
        };
      }
      return s;
    }));

    setIsLoading(false);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#fcfbf7] text-[#1a1a1a] font-sans">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-[#5A5A40]/10 flex flex-col transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0",
          !isSidebarOpen && "-translate-x-full"
        )}
      >
        <div className="p-4 border-b border-[#5A5A40]/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#5A5A40] flex items-center justify-center text-white font-bold">A</div>
            <span className="font-bold text-lg">A7MED AI</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          <button
            onClick={createNewSession}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#5A5A40] text-white rounded-2xl hover:bg-[#4a4a34] transition-colors font-medium shadow-sm"
          >
            <Plus size={18} />
            <span>محادثة جديدة</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <History size={14} />
            <span>المحادثات السابقة</span>
          </div>
          {sessions.map(session => (
            <button
              key={session.id}
              onClick={() => {
                setCurrentSessionId(session.id);
                setIsSidebarOpen(false);
              }}
              className={cn(
                "w-full text-right px-3 py-3 rounded-xl flex items-center justify-between group transition-all",
                currentSessionId === session.id 
                  ? "bg-[#5A5A40]/10 text-[#5A5A40] font-medium" 
                  : "hover:bg-gray-50 text-gray-600"
              )}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <MessageSquare size={16} className={currentSessionId === session.id ? "text-[#5A5A40]" : "text-gray-400"} />
                <span className="truncate text-sm">{session.title}</span>
              </div>
              <Trash2 
                size={14} 
                className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" 
                onClick={(e) => deleteSession(session.id, e)}
              />
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-[#5A5A40]/10 text-center">
          <p className="text-xs text-gray-400">تم التصميم بواسطة A7MED</p>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative w-full overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-[#5A5A40]/10 bg-white/80 backdrop-blur-md flex items-center justify-between px-4 sticky top-0 z-30">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-full lg:hidden"
          >
            <Menu size={20} />
          </button>
          
          <div className="flex flex-col items-center">
            <h1 className="font-bold text-[#5A5A40]">A7MED AI</h1>
            <span className="text-[10px] text-green-500 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              متصل الآن
            </span>
          </div>

          <div className="w-10 h-10 rounded-full bg-[#f5f5f0] border border-[#5A5A40]/10 flex items-center justify-center text-[#5A5A40]">
            <User size={20} />
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-32">
          {currentSession?.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-60 px-8">
              <div className="w-20 h-20 bg-[#5A5A40]/10 rounded-3xl flex items-center justify-center text-[#5A5A40] mb-2">
                <Bot size={40} />
              </div>
              <h2 className="text-xl font-bold text-[#5A5A40]">حبابك يا زول!</h2>
              <p className="text-sm max-w-xs">
                أنا أحمد، مساعدك السوداني الوفي. اتفضل اسألني عن أي حاجة أو ارفع لي ملف أشرحو ليك.
              </p>
              <div className="grid grid-cols-1 gap-2 w-full max-w-xs pt-4">
                <button 
                  onClick={() => setInput("كيف حالك يا أحمد؟")}
                  className="text-xs p-3 bg-white border border-[#5A5A40]/10 rounded-xl hover:border-[#5A5A40]/30 transition-all text-right"
                >
                  "كيف حالك يا أحمد؟"
                </button>
                <button 
                  onClick={() => setInput("ممكن تشرح لي ملف؟")}
                  className="text-xs p-3 bg-white border border-[#5A5A40]/10 rounded-xl hover:border-[#5A5A40]/30 transition-all text-right"
                >
                  "ممكن تشرح لي ملف؟"
                </button>
              </div>
            </div>
          ) : (
            currentSession?.messages.map((message) => (
              <div 
                key={message.id} 
                className={cn(
                  "flex w-full",
                  message.role === 'user' ? "justify-end" : "justify-start"
                )}
              >
                <div className={cn(
                  "max-w-[85%] flex flex-col gap-1",
                  message.role === 'user' ? "items-end" : "items-start"
                )}>
                  <div className={cn(
                    "px-4 py-3 rounded-2xl shadow-sm",
                    message.role === 'user' 
                      ? "bg-[#5A5A40] text-white rounded-tr-none" 
                      : "bg-white border border-[#5A5A40]/10 text-[#1a1a1a] rounded-tl-none"
                  )}>
                    {message.file && (
                      <div className="mb-2 p-2 bg-black/10 rounded-lg flex items-center gap-2 text-xs">
                        <Paperclip size={14} />
                        <span className="truncate max-w-[150px]">{message.file.name}</span>
                      </div>
                    )}
                    <div className="markdown-body text-right" dir="rtl">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400 px-1">
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-[#5A5A40]/10 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-[#5A5A40] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-[#5A5A40] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-[#5A5A40] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#fcfbf7] via-[#fcfbf7] to-transparent">
          <div className="max-w-3xl mx-auto relative">
            {selectedFile && (
              <div className="absolute bottom-full left-0 mb-2 p-2 bg-white border border-[#5A5A40]/10 rounded-xl flex items-center gap-2 shadow-lg animate-in slide-in-from-bottom-2">
                <div className="w-8 h-8 bg-[#5A5A40]/10 rounded-lg flex items-center justify-center text-[#5A5A40]">
                  <Paperclip size={16} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium truncate max-w-[150px]">{selectedFile.name}</span>
                  <span className="text-[10px] text-gray-400">جاهز للرفع</span>
                </div>
                <button 
                  onClick={() => setSelectedFile(null)}
                  className="p-1 hover:bg-gray-100 rounded-full text-gray-400"
                >
                  <X size={14} />
                </button>
              </div>
            )}
            
            <div className="bg-white border border-[#5A5A40]/20 rounded-3xl shadow-xl flex items-end p-2 focus-within:border-[#5A5A40]/40 transition-all">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-3 text-gray-400 hover:text-[#5A5A40] transition-colors"
              >
                <Paperclip size={20} />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
              />
              
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="اتكلم مع أحمد..."
                className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-3 px-2 text-sm max-h-32 text-right"
                dir="rtl"
                rows={1}
              />
              
              <button
                onClick={handleSend}
                disabled={(!input.trim() && !selectedFile) || isLoading}
                className={cn(
                  "p-3 rounded-2xl transition-all",
                  (!input.trim() && !selectedFile) || isLoading
                    ? "text-gray-300"
                    : "bg-[#5A5A40] text-white shadow-md hover:bg-[#4a4a34] active:scale-95"
                )}
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
