import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';
import { requestChatbot } from '../../config/request';

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { text: 'Xin chĂ o! TĂ´i lĂ  trá»£ lĂ½ bĂ¡n hĂ ng. TĂ´i cĂ³ thá»ƒ giĂºp gĂ¬ cho báº¡n?', sender: 'bot', timestamp: new Date() },
    ]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (inputMessage.trim() && !isLoading) {
            const userMessage = inputMessage.trim();
            setMessages((prev) => [...prev, { text: userMessage, sender: 'user', timestamp: new Date() }]);
            setInputMessage('');
            setIsLoading(true);

            try {
                const res = await requestChatbot({ question: userMessage });
                setMessages((prev) => [...prev, { text: res, sender: 'bot', timestamp: new Date() }]);
            } catch (error) {
                setMessages((prev) => [
                    ...prev,
                    {
                        text: 'Không kết nối được trợ lý AI. Bạn kiểm tra backend đã chạy chưa nhé.',
                        sender: 'bot',
                        timestamp: new Date(),
                    },
                ]);
            } finally {
                setIsLoading(false);
            }
        }
    };

    const TypingIndicator = () => (
        <div className="flex space-x-1 items-center">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <span className="ml-2 text-gray-500 text-sm">Äang nháº­p...</span>
        </div>
    );

    return (
        <>
            {/* Chat Button */}
            <button
                onClick={() => setIsOpen(true)}
                className={`fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-110 transition-all duration-300 z-50 flex items-center justify-center group ${
                    isOpen ? 'scale-0' : 'scale-100'
                }`}
                aria-label="Má»Ÿ chat"
            >
                <MessageCircle size={24} className="group-hover:animate-pulse" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-ping"></div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full"></div>
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-6 right-6 w-96 h-[32rem] bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 flex flex-col overflow-hidden transform animate-in slide-in-from-bottom-4 duration-300">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 flex items-center justify-between text-white">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                <Bot size={20} />
                            </div>
                            <div>
                                <h2 className="font-semibold text-lg">Há»— trá»£ khĂ¡ch hĂ ng</h2>
                                <p className="text-xs text-blue-100">Trá»±c tuyáº¿n</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="w-8 h-8 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors duration-200"
                            aria-label="ÄĂ³ng chat"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                        {messages.map((message, index) => (
                            <div
                                key={index}
                                className={`flex ${
                                    message.sender === 'user' ? 'justify-end' : 'justify-start'
                                } animate-in slide-in-from-bottom-2 duration-300`}
                                style={{ animationDelay: `${index * 0.1}s` }}
                            >
                                <div
                                    className={`flex items-end space-x-2 max-w-[80%] ${
                                        message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                                    }`}
                                >
                                    <div
                                        className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                                            message.sender === 'user'
                                                ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                                                : 'bg-gradient-to-r from-blue-500 to-purple-600'
                                        }`}
                                    >
                                        {message.sender === 'user' ? <User size={16} /> : <Bot size={16} />}
                                    </div>
                                    <div
                                        className={`px-4 py-3 rounded-2xl shadow-sm ${
                                            message.sender === 'user'
                                                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-br-sm'
                                                : 'bg-white text-gray-800 rounded-bl-sm border border-gray-200'
                                        }`}
                                    >
                                        <p className="text-sm leading-relaxed">{message.text}</p>
                                        <p
                                            className={`text-xs mt-1 ${
                                                message.sender === 'user' ? 'text-green-100' : 'text-gray-500'
                                            }`}
                                        >
                                            {message.timestamp.toLocaleTimeString('vi-VN', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Loading indicator */}
                        {isLoading && (
                            <div className="flex justify-start animate-in slide-in-from-bottom-2 duration-300">
                                <div className="flex items-end space-x-2 max-w-[80%]">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white">
                                        <Bot size={16} />
                                    </div>
                                    <div className="px-4 py-3 bg-white rounded-2xl rounded-bl-sm shadow-sm border border-gray-200">
                                        <TypingIndicator />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Form */}
                    <div className="p-4 bg-white border-t border-gray-200">
                        <div className="flex space-x-3">
                            <input
                                type="text"
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                placeholder="Nháº­p tin nháº¯n cá»§a báº¡n..."
                                className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                                disabled={isLoading}
                                onKeyPress={(e) => e.key === 'Enter' && handleSubmit(e)}
                            />
                            <button
                                onClick={handleSubmit}
                                disabled={isLoading || !inputMessage.trim()}
                                className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-full flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
                            >
                                <Send size={18} className={isLoading ? 'animate-pulse' : ''} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Chatbot;

