import React, { useState, useEffect, useRef } from 'react';
import { Conversation, Message, User } from '../types';
import { Send, Image as ImageIcon, Smile, MoreHorizontal, Phone, Video, ArrowLeft, Paperclip, QrCode, FileText, Monitor, PenTool, Layout, HardDrive, X } from 'lucide-react';

interface ChatWindowProps {
  conversation: Conversation;
  currentUser: User;
  onSendMessage: (text: string) => void;
  onBack: () => void;
  isTyping?: boolean;
  onStartMeeting: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ 
  conversation, 
  currentUser, 
  onSendMessage, 
  onBack,
  isTyping,
  onStartMeeting
}) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showQr, setShowQr] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation.messages, isTyping]);

  const handleSend = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue);
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Determine display info
  const displayName = conversation.isGroup ? conversation.groupName : conversation.participant.name;
  const displayAvatar = conversation.isGroup ? (conversation.groupAvatar || 'https://ui-avatars.com/api/?name=Group') : conversation.participant.avatar;

  return (
    <div className="flex flex-col h-full bg-[#e2ecf7] relative">
      
      {/* QR Code Modal Overlay */}
      {showQr && conversation.isGroup && (
          <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center backdrop-blur-sm p-4">
              <div className="bg-white p-6 rounded-2xl shadow-2xl text-center relative max-w-sm w-full">
                  <button onClick={() => setShowQr(false)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600">
                      <X className="w-6 h-6" />
                  </button>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{displayName}</h3>
                  <p className="text-sm text-gray-500 mb-4">Quét mã để tham gia nhóm</p>
                  <div className="bg-white p-2 inline-block border-2 border-blue-500 rounded-lg">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(conversation.qrCode || 'DALO_GROUP')}`} 
                        alt="QR Code" 
                        className="w-48 h-48"
                      />
                  </div>
                  <p className="mt-4 text-xs font-mono bg-gray-100 p-2 rounded truncate text-gray-600">
                      Mã nhóm: {conversation.qrCode || 'DALO-GRP-UNKNOWN'}
                  </p>
              </div>
          </div>
      )}

      {/* Chat Header */}
      <div className="flex flex-col bg-white border-b border-gray-200 shadow-sm z-20">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center">
            <button onClick={onBack} className="mr-3 md:hidden text-gray-600 hover:text-blue-600">
                <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="relative">
                <img 
                src={displayAvatar} 
                alt={displayName} 
                className="w-10 h-10 rounded-full object-cover"
                />
                {!conversation.isGroup && conversation.participant.isOnline && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></span>
                )}
            </div>
            <div className="ml-3">
                <h2 className="text-base font-bold text-gray-900 flex items-center">
                    {displayName}
                    {conversation.isGroup && (
                        <span className="ml-2 px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded border border-gray-200">
                            {conversation.participants?.length || 2} members
                        </span>
                    )}
                </h2>
                <p className="text-xs text-gray-500">
                {conversation.isGroup 
                    ? 'Nhóm hoạt động' 
                    : (conversation.participant.isOnline ? 'Vừa mới truy cập' : 'Truy cập 5 giờ trước')}
                </p>
            </div>
            </div>
            
            <div className="flex items-center space-x-3 text-gray-500">
             {/* Group specific buttons */}
             {conversation.isGroup && (
                 <>
                    <button 
                        onClick={() => setShowQr(true)}
                        className="p-2 hover:bg-gray-100 rounded-full text-blue-600" title="Mã QR Nhóm"
                    >
                        <QrCode className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={onStartMeeting}
                        className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 shadow-sm transition-all"
                    >
                        <Video className="w-4 h-4" />
                        <span className="text-xs font-bold hidden sm:inline">Meeting</span>
                    </button>
                 </>
             )}
            {!conversation.isGroup && (
                 <>
                    <button className="hover:text-blue-600"><Phone className="w-5 h-5" /></button>
                    <button className="hover:text-blue-600"><Video className="w-5 h-5" /></button>
                 </>
            )}
            <button className="hover:text-blue-600"><MoreHorizontal className="w-5 h-5" /></button>
            </div>
        </div>

        {/* Integration Bar (Only for Groups) */}
        {conversation.isGroup && (
            <div className="px-4 py-2 bg-gray-50 flex space-x-4 overflow-x-auto border-t border-gray-100 scrollbar-hide">
                <div className="flex items-center space-x-1 px-2 py-1 bg-white border border-gray-200 rounded-lg cursor-pointer hover:border-blue-400">
                     <PenTool className="w-3 h-3 text-orange-500" />
                     <span className="text-xs font-medium text-gray-700">Canvas</span>
                </div>
                <div className="flex items-center space-x-1 px-2 py-1 bg-white border border-gray-200 rounded-lg cursor-pointer hover:border-blue-400">
                     <Layout className="w-3 h-3 text-purple-500" />
                     <span className="text-xs font-medium text-gray-700">Figma</span>
                </div>
                 <div className="flex items-center space-x-1 px-2 py-1 bg-white border border-gray-200 rounded-lg cursor-pointer hover:border-blue-400">
                     <Monitor className="w-3 h-3 text-black" />
                     <span className="text-xs font-medium text-gray-700">Framer</span>
                </div>
                 <div className="flex items-center space-x-1 px-2 py-1 bg-white border border-gray-200 rounded-lg cursor-pointer hover:border-blue-400">
                     <HardDrive className="w-3 h-3 text-green-600" />
                     <span className="text-xs font-medium text-gray-700">Drive</span>
                </div>
            </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {conversation.participant.isAi && conversation.messages.length === 1 && (
            <div className="text-center text-xs text-gray-500 my-4 bg-white/50 p-2 rounded-lg mx-auto w-fit">
              Hệ thống mã hóa đầu cuối. Trò chuyện ngay với AI thông minh của DALO.
            </div>
        )}

        {conversation.messages.map((msg) => {
          const isMe = msg.senderId === currentUser.id;
          return (
            <div 
              key={msg.id} 
              className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              {!isMe && (
                 <img 
                 src={displayAvatar} 
                 alt="avatar" 
                 className="w-8 h-8 rounded-full mr-2 self-end mb-1"
               />
              )}
              <div 
                className={`max-w-[75%] px-4 py-2 rounded-xl text-sm leading-relaxed shadow-sm break-words
                  ${isMe 
                    ? 'bg-[#E5EFFF] text-gray-900 rounded-br-none border border-[#c7dffa]' 
                    : 'bg-white text-gray-900 rounded-bl-none border border-gray-100'
                  }`}
              >
                {/* Check if it's a file share (simulated) */}
                {msg.text.startsWith('[FILE]') ? (
                    <div className="flex items-center space-x-2">
                        <div className="p-2 bg-gray-100 rounded-lg">
                            <FileText className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                            <p className="font-medium truncate max-w-[150px]">{msg.text.replace('[FILE]', '').trim()}</p>
                            <p className="text-[10px] text-gray-500">Nhấp để xem tài liệu</p>
                        </div>
                    </div>
                ) : msg.text}
                
                <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-blue-400' : 'text-gray-400'}`}>
                  {msg.timestamp.toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
            </div>
          );
        })}
        
        {isTyping && (
           <div className="flex justify-start">
              <img 
                 src={displayAvatar} 
                 alt="avatar" 
                 className="w-8 h-8 rounded-full mr-2 self-end mb-1"
               />
              <div className="bg-white px-4 py-3 rounded-xl rounded-bl-none shadow-sm border border-gray-100">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white p-3 border-t border-gray-200">
        <div className="flex items-center space-x-2">
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full">
                <ImageIcon className="w-6 h-6" />
            </button>
            <button 
                onClick={() => onSendMessage('[FILE] Document_Share.pdf')}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full hidden sm:block" title="Gửi tài liệu"
            >
                <Paperclip className="w-5 h-5" />
            </button>
            
            <div className="flex-1 relative">
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Nhập tin nhắn tới ${displayName}...`}
                    className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border-none rounded-full focus:ring-1 focus:ring-blue-300 focus:bg-white transition-all text-sm"
                />
                 <button className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <Smile className="w-5 h-5" />
                </button>
            </div>

            <button 
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className={`p-3 rounded-full transition-all ${
                    inputValue.trim() 
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
            >
                <Send className="w-5 h-5" />
            </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
