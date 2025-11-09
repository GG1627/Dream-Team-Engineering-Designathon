'use client';

import { useState, useRef, useEffect } from 'react';
import { IoChatbubbleEllipsesOutline, IoClose, IoSendOutline } from 'react-icons/io5';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export default function ChatBox() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hey I'm Katie, your AI assistant. How can I help you today?",
      sender: 'assistant',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat is expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    // Add user message immediately
    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    setError(null);

    try {
      // Call RAG API
      const response = await fetch(`${BACKEND_URL}/rag/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: userMessage.text,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Add assistant response
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.answer || "I'm sorry, I couldn't process your question.",
        sender: 'assistant',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.message || 'Failed to send message. Please try again.');
      
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm sorry, I encountered an error. Please make sure the backend server is running and try again.",
        sender: 'assistant',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="fixed bottom-44 right-4 z-50">
      {/* Collapsed Chat Box */}
      {!isExpanded && (
        <div 
          className="bg-white rounded-xl shadow-lg border border-[#E2E8F0] p-4 max-w-[200px] cursor-pointer hover:shadow-xl transition-all duration-200"
          onClick={() => setIsExpanded(true)}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0F172A] flex items-center justify-center text-white font-semibold flex-shrink-0">
              K
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-[#0F172A] font-inter mb-1">Katie</p>
              <p className="text-sm text-[#64748B] font-inter">
                Hey I'm Katie, your AI assistant
              </p>
            </div>
            <button 
              className="text-[#64748B] hover:text-[#0F172A] transition-colors flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(true);
              }}
            >
              <IoChatbubbleEllipsesOutline className="text-xl" />
            </button>
          </div>
        </div>
      )}

      {/* Expanded Chat Box */}
      {isExpanded && (
        <div className="bg-white rounded-xl shadow-2xl border border-[#E2E8F0] w-96 h-[500px] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#0F172A] flex items-center justify-center text-white font-semibold">
                K
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0F172A] font-inter">Katie</p>
                <p className="text-xs text-[#64748B] font-inter">AI Assistant</p>
              </div>
            </div>
            <button 
              onClick={() => setIsExpanded(false)}
              className="text-[#64748B] hover:text-[#0F172A] transition-colors p-1 hover:bg-[#F8FAFC] rounded-lg"
            >
              <IoClose className="text-xl" />
            </button>
          </div>

          {/* Chat Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start gap-3 ${
                  message.sender === 'user' ? 'flex-row-reverse' : ''
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-[#0F172A] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                  {message.sender === 'user' ? 'U' : 'K'}
                </div>
                <div
                  className={`rounded-lg p-3 max-w-[80%] ${
                    message.sender === 'user'
                      ? 'bg-[#0F172A] text-white rounded-tr-none'
                      : 'bg-[#F8FAFC] text-[#0F172A] rounded-tl-none'
                  }`}
                >
                  <p className="text-sm font-inter whitespace-pre-wrap">{message.text}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#0F172A] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                  K
                </div>
                <div className="bg-[#F8FAFC] rounded-lg rounded-tl-none p-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-[#64748B] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-[#64748B] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-[#64748B] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-[#E2E8F0]">
            {error && (
              <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-600 font-inter">{error}</p>
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                placeholder="Type a message..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:border-transparent text-sm font-inter"
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !inputText.trim()}
                className="p-2 bg-[#0F172A] text-white rounded-lg hover:bg-[#1E293B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <IoSendOutline className="text-lg" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

