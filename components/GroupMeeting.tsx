import React, { useState } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Users, MonitorUp, MoreVertical, StopCircle } from 'lucide-react';
import { Conversation, User } from '../types';

interface GroupMeetingProps {
  conversation: Conversation;
  currentUser: User;
  onLeave: () => void;
}

const GroupMeeting: React.FC<GroupMeetingProps> = ({ conversation, currentUser, onLeave }) => {
  const participants = conversation.participants || [conversation.participant];
  const [isSharing, setIsSharing] = useState(false);

  return (
    <div className="absolute inset-0 z-40 bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="absolute top-4 left-4 z-50 bg-black/40 px-3 py-1 rounded-full text-white text-sm backdrop-blur-md">
        Meeting: {conversation.groupName || conversation.participant.name} • 00:04:23
      </div>
      
      {isSharing && (
          <div className="absolute top-4 right-4 z-50 bg-green-600 px-4 py-2 rounded-full text-white text-sm shadow-lg animate-pulse flex items-center">
             <MonitorUp className="w-4 h-4 mr-2" />
             Bạn đang chia sẻ màn hình
          </div>
      )}

      {/* Video Grid */}
      <div className="flex-1 p-4 grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto">
        {/* Current User */}
        <div className="relative bg-gray-800 rounded-xl overflow-hidden aspect-video border-2 border-green-500 shadow-lg group">
           {isSharing ? (
               <div className="w-full h-full bg-gray-900 flex items-center justify-center flex-col">
                   <MonitorUp className="w-16 h-16 text-blue-500 mb-4" />
                   <p className="text-white text-sm">Đang trình bày...</p>
               </div>
           ) : (
                <img src={currentUser.avatar} alt="Me" className="w-full h-full object-cover opacity-50" />
           )}
           <div className="absolute bottom-2 left-2 text-white text-sm font-medium flex items-center bg-black/50 px-2 rounded">
             Bạn (Tôi)
           </div>
           <div className="absolute top-2 right-2 bg-green-500 p-1 rounded-full">
             <Mic className="w-3 h-3 text-white" />
           </div>
        </div>

        {/* Other Participants */}
        {participants.map((p, idx) => (
           <div key={p.id} className="relative bg-gray-800 rounded-xl overflow-hidden aspect-video">
              <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
               <div className="absolute bottom-2 left-2 text-white text-sm font-medium bg-black/50 px-2 rounded">
                {p.name}
              </div>
              {idx % 2 === 0 ? (
                 <div className="absolute top-2 right-2 bg-white/20 p-1 rounded-full">
                    <MicOff className="w-3 h-3 text-red-500" />
                 </div>
              ) : (
                <div className="absolute top-2 right-2 bg-green-500 p-1 rounded-full">
                    <Mic className="w-3 h-3 text-white" />
                 </div>
              )}
           </div>
        ))}
        
        {/* Placeholder for "Canvas" or Shared Screen */}
        <div className="relative bg-white rounded-xl overflow-hidden aspect-video flex items-center justify-center">
            <div className="text-center">
                <p className="text-blue-600 font-bold text-lg">Canvas Shared Board</p>
                <p className="text-gray-400 text-xs">Đang chia sẻ bởi Nguyễn Văn Nam</p>
            </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="h-20 bg-gray-900 border-t border-gray-800 flex items-center justify-center space-x-4 px-4">
        <button className="p-3 rounded-full bg-gray-700 text-white hover:bg-gray-600">
            <Mic className="w-6 h-6" />
        </button>
        <button className="p-3 rounded-full bg-gray-700 text-white hover:bg-gray-600">
            <Video className="w-6 h-6" />
        </button>
        
        {/* Share Screen Button */}
        <button 
            onClick={() => setIsSharing(!isSharing)}
            className={`p-3 rounded-full transition-colors ${isSharing ? 'bg-blue-600 text-white animate-pulse' : 'bg-gray-700 text-white hover:bg-gray-600'}`}
            title="Chia sẻ màn hình"
        >
            {isSharing ? <StopCircle className="w-6 h-6" /> : <MonitorUp className="w-6 h-6" />}
        </button>

         <button className="p-3 rounded-full bg-gray-700 text-white hover:bg-gray-600 hidden md:block">
            <Users className="w-6 h-6" />
        </button>
        <button onClick={onLeave} className="p-3 rounded-full bg-red-600 text-white hover:bg-red-700 px-6 flex items-center">
            <PhoneOff className="w-6 h-6 mr-2" />
            <span className="font-bold">Kết thúc</span>
        </button>
        <button className="p-3 rounded-full bg-gray-700 text-white hover:bg-gray-600">
            <MoreVertical className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default GroupMeeting;