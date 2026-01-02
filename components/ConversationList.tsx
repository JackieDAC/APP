import React from 'react';
import { Conversation, User } from '../types';
import { Search, Plus } from 'lucide-react';

interface ConversationListProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  currentUser: User;
  onCreateGroup: () => void; // New prop
}

const ConversationList: React.FC<ConversationListProps> = ({ 
  conversations, 
  activeId, 
  onSelect, 
  onCreateGroup
}) => {
  
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 86400000 && now.getDate() === date.getDate()) {
      return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200 w-full md:w-80 lg:w-96">
      {/* Header / Search */}
      <div className="p-4 bg-white sticky top-0 z-10 border-b border-gray-100">
        <div className="flex items-center space-x-2 mb-3">
             <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input 
                    type="text" 
                    placeholder="Tìm kiếm" 
                    className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
            </div>
            <button 
                onClick={onCreateGroup}
                className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
                title="Tạo nhóm mới"
            >
                <Plus className="w-5 h-5" />
            </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.map((conv) => {
          const lastMsg = conv.messages[conv.messages.length - 1];
          const isActive = conv.id === activeId;
          
          // Display logic for group vs individual
          const displayName = conv.isGroup ? conv.groupName : conv.participant.name;
          const displayAvatar = conv.isGroup ? (conv.groupAvatar || 'https://ui-avatars.com/api/?name=Group') : conv.participant.avatar;

          return (
            <div 
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={`flex items-center p-3 cursor-pointer transition-colors hover:bg-gray-50 ${isActive ? 'bg-blue-50' : ''}`}
            >
              <div className="relative">
                <img 
                  src={displayAvatar} 
                  alt={displayName} 
                  className="w-12 h-12 rounded-full object-cover border border-gray-100"
                />
                {/* Only show online dot for direct messages */}
                {!conv.isGroup && conv.participant.isOnline && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                )}
                {/* Show group indicator */}
                {conv.isGroup && (
                   <span className="absolute bottom-0 right-0 w-4 h-4 bg-gray-200 border-2 border-white rounded-full flex items-center justify-center">
                       <span className="text-[8px] font-bold text-gray-600">G</span>
                   </span>
                )}
              </div>
              
              <div className="ml-3 flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">
                    {displayName}
                  </h3>
                  <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                    {lastMsg ? formatTime(lastMsg.timestamp) : ''}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <p className={`text-sm truncate pr-2 ${conv.unreadCount > 0 ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>
                    {lastMsg?.senderId === 'me' ? 'Bạn: ' : ''}{lastMsg?.text || 'Bắt đầu trò chuyện'}
                  </p>
                  {conv.unreadCount > 0 && (
                    <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full">
                      {conv.unreadCount > 5 ? '5+' : conv.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ConversationList;
