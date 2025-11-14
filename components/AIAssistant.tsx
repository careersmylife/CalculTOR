
import React, { useState, useRef, useEffect } from 'react';
import { getAIResponse } from '../services/geminiService';
import { CALCULATOR_MODULES } from '../constants';
import type { CalculatorModuleKey, GroundingMetadata } from '../types';

interface Message {
  sender: 'user' | 'ai';
  text: string;
  groundingMetadata?: GroundingMetadata | null;
}

interface AIAssistantProps {
    activeModule: CalculatorModuleKey;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ activeModule }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);
  
  useEffect(() => {
    setMessages([]);
  }, [activeModule]);

  const handleSend = async () => {
    if (input.trim() === '' || isLoading) return;

    const userMessage: Message = { sender: 'user', text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const moduleName = CALCULATOR_MODULES[activeModule].name;
    const { text: aiText, groundingMetadata } = await getAIResponse(input, moduleName);

    const aiMessage: Message = { sender: 'ai', text: aiText, groundingMetadata };
    setMessages((prev) => [...prev, aiMessage]);
    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-accent rounded-full text-white flex items-center justify-center shadow-lg text-2xl z-50 hover:bg-blue-500 transition-transform transform hover:scale-110"
        aria-label="Toggle AI Assistant"
      >
        <i className={`fas ${isOpen ? 'fa-times' : 'fa-robot'}`}></i>
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 w-80 h-96 bg-secondary dark:bg-[#1A1A1A] shadow-2xl rounded-lg flex flex-col z-40">
          <header className="p-3 bg-highlight dark:bg-[#4F4F4F] rounded-t-lg flex items-center">
            <i className="fas fa-robot text-accent mr-2"></i>
            <h3 className="font-semibold text-text-primary dark:text-[#F2F2F2]">AI Assistant</h3>
          </header>
          <div className="flex-1 p-3 overflow-y-auto">
            <div className="space-y-3">
              <div className="p-2 bg-primary dark:bg-[#0D0D0D] rounded-lg text-sm text-text-secondary dark:text-[#BDBDBD]">
                Ask me about "{CALCULATOR_MODULES[activeModule].name}"
              </div>
              {messages.map((msg, index) => (
                <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-2 rounded-lg max-w-xs text-sm ${msg.sender === 'user' ? 'bg-accent text-white' : 'bg-highlight text-text-primary dark:bg-[#4F4F4F] dark:text-[#F2F2F2]'}`}>
                    <div dangerouslySetInnerHTML={{__html: msg.text.replace(/\n/g, '<br />')}} />
                    {msg.sender === 'ai' && msg.groundingMetadata?.groundingChunks?.length > 0 && (
                        <div className="mt-2 border-t border-gray-300 dark:border-gray-500 pt-1">
                            <p className="text-xs font-semibold mb-1">Sources:</p>
                            <ul className="list-disc list-inside text-xs">
                                {msg.groundingMetadata.groundingChunks.map((chunk, i) => (
                                    chunk.web && <li key={i}><a href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="text-blue-500 dark:text-blue-400 hover:underline">{chunk.web.title}</a></li>
                                ))}
                            </ul>
                        </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                 <div className="flex justify-start">
                    <div className="p-2 rounded-lg bg-highlight text-text-primary dark:bg-[#4F4F4F] dark:text-[#F2F2F2] text-sm">
                        <i className="fas fa-spinner fa-spin"></i>
                    </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
          <div className="p-2 border-t border-highlight dark:border-[#4F4F4F] flex">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question..."
              className="flex-1 bg-primary border border-highlight rounded-l-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent dark:bg-[#0D0D0D] dark:border-[#4F4F4F] dark:text-[#F2F2F2]"
              disabled={isLoading}
            />
            <button onClick={handleSend} className="bg-accent text-white px-4 py-2 rounded-r-lg" disabled={isLoading}>
              <i className="fas fa-paper-plane"></i>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AIAssistant;
