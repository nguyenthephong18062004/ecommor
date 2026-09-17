import React, { useState, useEffect, useRef } from 'react';
import { Avatar, Button, Input, Badge, Tooltip } from 'antd';
import {
    SendOutlined,
    MessageOutlined,
    CloseOutlined,
    SmileOutlined,
    CustomerServiceOutlined,
} from '@ant-design/icons';
import { requestCreateMessage, requestGetMessageUser } from '../../config/request';
import { useStore } from '../../hooks/userStore';

function Messger() {
    const [messages, setMessages] = useState([]);

    const { dataUser, newMessageUser } = useStore();
    const [inputValue, setInputValue] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [unreadCount, setUnreadCount] = useState('');
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (newMessageUser) {
            setMessages((prevMessages) => [...prevMessages, newMessageUser]);
        }
    }, [newMessageUser]);

    useEffect(() => {
        const fetchData = async () => {
            const data = {
                senderId: dataUser._id,
            };
            const res = await requestGetMessageUser(data);
            setMessages(res.metadata);
        };
        if (dataUser._id) fetchData();
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    useEffect(() => {
        if (isOpen) {
            setUnreadCount(0);
        }
    }, [isOpen]);

    const handleSendMessage = async () => {
        try {
            const data = {
                text: inputValue,
            };
            const res = await requestCreateMessage(data);
            setMessages([...messages, res.metadata]);
            setInputValue('');
        } catch (error) {
            console.log(error);
        }
    };

    const formatMessageText = (text) => {
        if (!text) return '';
        return text.split('\n').map((line, index) => (
            <span key={index}>
                {line}
                {index < text.split('\n').length - 1 && <br />}
            </span>
        ));
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {isOpen ? (
                <div className="w-80 sm:w-96 h-[550px] bg-white rounded-2xl shadow-2xl flex flex-col transition-all duration-500 transform animate-in slide-in-from-bottom-4 border border-gray-100">
                    {/* Header với gradient */}
                    <header className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white p-4 rounded-t-2xl flex justify-between items-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-transparent"></div>
                        <div className="flex items-center gap-3 relative z-10">
                            <div className="relative">
                                <Avatar
                                    size={40}
                                    icon={<CustomerServiceOutlined />}
                                    className="bg-white/20 border-2 border-white/30"
                                />
                                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">LuxTime Support</h3>
                                <p className="text-xs text-blue-100">Luôn sẵn sàng hỗ trợ</p>
                            </div>
                        </div>
                        <Button
                            type="text"
                            icon={<CloseOutlined className="text-white" />}
                            onClick={() => setIsOpen(false)}
                            className="hover:bg-white/20 relative z-10"
                        />
                    </header>

                    {/* Messages area với background pattern */}
                    <main className="flex-1 p-4 overflow-y-auto bg-gradient-to-b from-gray-50 to-white relative">
                        <div className="absolute inset-0 opacity-5">
                            <div
                                className="w-full h-full"
                                style={{
                                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                                }}
                            ></div>
                        </div>

                        {messages.map((msg, index) => (
                            <div
                                key={msg.id}
                                className={`flex items-end gap-3 mb-4 animate-in slide-in-from-bottom-2 ${
                                    msg.senderId === dataUser._id ? 'justify-end' : ''
                                }`}
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                <div className={`max-w-[75%] group`}>
                                    <div
                                        className={`p-3 rounded-2xl shadow-sm transition-all duration-200 hover:shadow-md ${
                                            msg.senderId === dataUser._id
                                                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-md'
                                                : 'bg-white text-gray-800 rounded-bl-md border border-gray-100'
                                        }`}
                                    >
                                        <p className="text-sm leading-relaxed">{formatMessageText(msg.text)}</p>
                                    </div>
                                    <p
                                        className={`text-xs text-gray-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${
                                            msg.senderId === dataUser._id ? 'text-right' : 'text-left'
                                        }`}
                                    >
                                        {msg.time}
                                    </p>
                                </div>
                            </div>
                        ))}

                        {/* Typing indicator */}
                        {isTyping && (
                            <div className="flex items-end gap-3 mb-4 animate-pulse">
                                <div className="bg-white p-3 rounded-2xl rounded-bl-md border border-gray-100 shadow-sm">
                                    <div className="flex gap-1">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                        <div
                                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                                            style={{ animationDelay: '0.1s' }}
                                        ></div>
                                        <div
                                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                                            style={{ animationDelay: '0.2s' }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </main>

                    {/* Footer với gradient */}
                    <footer className="p-4 bg-gradient-to-r from-gray-50 to-white border-t border-gray-100 rounded-b-2xl">
                        <div className="flex items-center ">
                            <div className="flex-1 relative">
                                <Input
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder="Nhập tin nhắn của bạn..."
                                    onPressEnter={handleSendMessage}
                                    className="rounded-full border-gray-200 hover:border-blue-400 focus:border-blue-500 transition-colors pr-12"
                                    size="large"
                                />
                                <Button
                                    type="text"
                                    icon={<SendOutlined className="text-blue-500" />}
                                    onClick={handleSendMessage}
                                    disabled={!inputValue.trim()}
                                    className="absolute right-2 top-1/2 transform -translate-y-1/2 hover:bg-blue-50"
                                />
                            </div>
                        </div>
                    </footer>
                </div>
            ) : (
                <div className="fixed bottom-5 right-5 z-50">
                    <Tooltip title="Bạn cần hỗ trợ? Nhấn để chat!" placement="left">
                        <Badge count={unreadCount} size="small" offset={[-2, 2]}>
                            <button
                                onClick={() => {
                                    setIsOpen(true);
                                    setUnreadCount(0);
                                }}
                                className="w-14 h-14 rounded-full bg-blue-500 hover:bg-blue-600 
                                   flex items-center justify-center shadow-md hover:shadow-xl 
                                   transition-all duration-300 ease-in-out group"
                            >
                                <MessageOutlined className="text-white text-xl group-hover:scale-110 transition-transform" />
                            </button>
                        </Badge>
                    </Tooltip>
                </div>
            )}
        </div>
    );
}

export default Messger;
