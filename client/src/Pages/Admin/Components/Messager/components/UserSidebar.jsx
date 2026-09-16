import React from 'react';
import { Avatar, Badge, Input, List, Typography } from 'antd';
import { SearchOutlined, UserOutlined } from '@ant-design/icons';

import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';

dayjs.extend(relativeTime);
dayjs.locale('vi');

const { Text } = Typography;

function UserSidebar({ listUserMessage, selectedUser, onSelectUser, searchTerm, onSearchChange }) {
    const filteredUsers = listUserMessage.filter((user) =>
        user.fullName.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    return (
        <div className="h-[90vh] flex flex-col bg-white border-r border-gray-200 p-4">
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Tin nhắn</h3>
                <Input
                    placeholder="Tìm kiếm người dùng..."
                    prefix={<SearchOutlined className="text-gray-400" />}
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="rounded-lg"
                />
            </div>

            {/* User List */}
            <div className="flex-1 overflow-y-auto">
                <List
                    dataSource={filteredUsers}
                    renderItem={(user) => (
                        <List.Item
                            className={`cursor-pointer transition-all duration-200 hover:bg-gray-50 px-4 py-3 border-none ${
                                selectedUser?.id === user.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                            }`}
                            onClick={() => onSelectUser(user)}
                        >
                            <div className="flex items-center gap-3 w-full p-1">
                                <div className="relative">
                                    <Avatar
                                        size={40}
                                        src={user.avatar}
                                        icon={<UserOutlined />}
                                        className="flex-shrink-0"
                                    />
                                    {user.isOnline && (
                                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <Text strong className="text-gray-800 truncate">
                                            {user.fullName}
                                        </Text>
                                        {user.unreadMessage > 0 && <Badge count={user.unreadMessage} size="small" />}
                                    </div>
                                    <div className="flex items-center justify-between mt-1">
                                        <Text type="secondary" className="text-xs">
                                            Tin nhắn đến : {user.latestMessage}
                                        </Text>
                                        <Text className="text-gray-400 text-xs">{dayjs(user.latestAt).fromNow()}</Text>
                                    </div>
                                </div>
                            </div>
                        </List.Item>
                    )}
                />
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200">
                <Text className="text-gray-500 text-sm">{filteredUsers.length} người dùng</Text>
            </div>
        </div>
    );
}

export default UserSidebar;
