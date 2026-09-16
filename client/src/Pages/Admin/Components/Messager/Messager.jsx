import React, { useState, useEffect } from 'react';
import ChatWindow from './components/ChatWindow';
import UserSidebar from './components/UserSidebar';
import {
    requestCreateMessage,
    requestGetAllMessage,
    requestGetMessage,
    requestReadMessage,
} from '../../../../config/request';
import { useStore } from '../../../../hooks/userStore';

const Messager = () => {
    const [selectedUser, setSelectedUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [messages, setMessages] = useState([]);
    const [listUserMessage, setListUserMessage] = useState([]);
    const { dataUser, newMessageAdmin } = useStore();

    const fetchData = async () => {
        const res = await requestGetAllMessage();
        setListUserMessage(res.metadata);
    };

    const handleSelectUser = async (user) => {
        setSelectedUser(user);
        const data = {
            receiverId: user.senderId,
            senderId: dataUser._id,
        };
        await requestReadMessage(data);
        fetchData();
    };

    useEffect(() => {
        fetchData();
    }, [newMessageAdmin]);

    useEffect(() => {
        const fetchMessage = async () => {
            // Chỉ fetch tin nhắn khi có người dùng được chọn
            if (selectedUser && selectedUser.senderId) {
                const data = {
                    receiverId: selectedUser.senderId,
                    senderId: dataUser._id,
                };

                try {
                    const res = await requestGetMessage(data);
                    setMessages(res.metadata);
                } catch (error) {
                    console.error('Failed to fetch messages:', error);
                    setMessages([]); // Xóa tin nhắn cũ nếu có lỗi
                }
            } else {
                setMessages([]); // Xóa tin nhắn khi không có ai được chọn
            }
        };

        fetchMessage();
    }, [selectedUser, dataUser]);

    return (
        <div className="h-full w-full flex font-sans antialiased ">
            {/* Sidebar */}
            <div className="w-1/4 max-w-sm h-full flex-shrink-0">
                <UserSidebar
                    listUserMessage={listUserMessage}
                    selectedUser={selectedUser}
                    onSelectUser={handleSelectUser}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                />
            </div>

            {/* Main Chat Window */}
            <div className="flex-1 h-full">
                {selectedUser ? (
                    <ChatWindow selectedUser={selectedUser} messages={messages} setMessages={setMessages} />
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        Chọn một cuộc trò chuyện để bắt đầu
                    </div>
                )}
            </div>
        </div>
    );
};

export default Messager;
