import React, { useState, useEffect } from 'react';
import { MessageCircle, Users, Cloud, LogOut, Loader2, User as UserIcon, ShieldAlert, Key } from 'lucide-react';
import ConversationList from './components/ConversationList';
import ChatWindow from './components/ChatWindow';
import AdminDashboard from './components/AdminDashboard';
import CreateGroupModal from './components/CreateGroupModal'; 
import GroupMeeting from './components/GroupMeeting'; 
import { Conversation, Message, User } from './types';
import { INITIAL_CONVERSATIONS, CURRENT_USER as MOCK_USER } from './constants';
import { sendMessageToGemini } from './services/geminiService';
import { initGoogleAuth, signInWithGoogle, getUserProfile, loadDataFromDrive, saveDataToDrive } from './services/googleService';
import { initGuestUser, loadGuestData, saveGuestData, checkGuestExpiration, clearGuestData } from './services/guestService';

const ADMIN_EMAIL = 'nguyenduydac@gmail.com';
const ADMIN_PASS = 'nguyenduydac@gmail.com';

const FOUNDER_USER: User = {
    id: 'admin_founder',
    name: 'Nguyen Duy Dac (Founder)',
    avatar: 'https://ui-avatars.com/api/?name=Founder&background=0D8ABC&color=fff',
    isOnline: true,
    type: 'admin'
};

const App: React.FC = () => {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User>(MOCK_USER);
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);
  
  // Admin Login State
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminEmailInput, setAdminEmailInput] = useState('');
  const [adminPassInput, setAdminPassInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Guest State
  const [guestExpired, setGuestExpired] = useState(false);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);

  // App State
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [aiTyping, setAiTyping] = useState<boolean>(false);
  const [view, setView] = useState<'chats' | 'contacts'>('chats');
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  
  // New States for Group & Meeting
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null);
  // Special State for Joint Meeting (Temporary object)
  const [jointMeetingConversation, setJointMeetingConversation] = useState<Conversation | null>(null);

  // Khởi tạo Google Auth
  useEffect(() => {
    initGoogleAuth(async (token) => {
      setIsLoadingDrive(true);
      const profile = await getUserProfile(token);
      if (profile) {
        setCurrentUser({
          id: profile.id,
          name: profile.name,
          avatar: profile.picture,
          isOnline: true,
          type: 'google'
        });
        setIsAuthenticated(true);
        
        const driveData = await loadDataFromDrive();
        if (driveData) {
           setConversations(driveData);
        } else {
           saveDataToDrive(INITIAL_CONVERSATIONS);
        }
      }
      setIsLoadingDrive(false);
    });
  }, []);

  // Xử lý Guest Expiration
  useEffect(() => {
    if (isAuthenticated && currentUser.type === 'guest') {
        const { isExpired, daysLeft } = checkGuestExpiration(currentUser);
        setDaysLeft(daysLeft);
        if (isExpired) {
            setGuestExpired(true);
        }
    }
  }, [isAuthenticated, currentUser]);

  const saveAppData = (data: Conversation[]) => {
      if (currentUser.type === 'google') {
          saveDataToDrive(data);
      } else if (currentUser.type === 'guest') {
          saveGuestData(data);
      }
  };

  useEffect(() => {
    if (isAuthenticated && !isLoadingDrive && !guestExpired && currentUser.type !== 'admin') {
       const timer = setTimeout(() => {
         saveAppData(conversations);
       }, 2000);
       return () => clearTimeout(timer);
    }
  }, [conversations, isAuthenticated, isLoadingDrive, guestExpired, currentUser]);

  const activeConversation = conversations.find(c => c.id === activeChatId);

  // --- Handlers ---

  const handleSendMessage = async (text: string) => {
    // If admin is sending from dashboard monitoring view, handle differently or same?
    // This handler works if activeChatId is set. For Admin passing ID directly, we use handleAdminSendMessage.
    if (!activeChatId) return;
    performSendMessage(activeChatId, text);
  };

  const handleAdminSendMessage = (convId: string, text: string) => {
      performSendMessage(convId, text);
  };

  const performSendMessage = async (chatId: string, text: string) => {
      const sender = currentUser;
      const newMessage: Message = {
        id: Date.now().toString(),
        senderId: sender.id,
        text: text,
        timestamp: new Date(),
      };
  
      setConversations(prev => prev.map(conv => {
        if (conv.id === chatId) {
          return {
            ...conv,
            messages: [...conv.messages, newMessage]
          };
        }
        return conv;
      }));
  
      const currentConv = conversations.find(c => c.id === chatId);
      if (currentConv && currentConv.participant.isAi) {
        setAiTyping(true);
        try {
          const aiResponseText = await sendMessageToGemini(text, currentConv.messages);
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            senderId: currentConv.participant.id,
            text: aiResponseText,
            timestamp: new Date(),
          };
          setConversations(prev => prev.map(conv => {
              if (conv.id === chatId) {
                  return { ...conv, messages: [...conv.messages, aiMessage] };
              }
              return conv;
          }));
        } catch (e) {
          console.error("AI Error", e);
        } finally {
          setAiTyping(false);
        }
      }
  };

  // User creates basic group
  const handleCreateGroup = (name: string) => {
      const newGroupId = `group_${Date.now()}`;
      const newGroup: Conversation = {
          id: newGroupId,
          isGroup: true,
          groupName: name,
          groupAvatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=200`,
          qrCode: `${newGroupId}_manual`,
          participant: currentUser, 
          participants: [currentUser],
          messages: [{
              id: 'sys_1',
              senderId: 'system',
              text: 'Nhóm đã được tạo.',
              timestamp: new Date()
          }],
          unreadCount: 0,
          maxCapacity: 50
      };
      setConversations(prev => [newGroup, ...prev]);
      setActiveChatId(newGroupId);
  };

  // ADMIN Creates Classroom/Room
  const handleCreateClassroom = (name: string, capacity: number, isAuto: boolean) => {
      const baseId = `class_${Date.now()}`;
      
      const newGroup: Conversation = {
          id: isAuto ? `${baseId}_1` : baseId,
          isGroup: true,
          groupName: isAuto ? `${name} - 1` : name,
          baseName: isAuto ? name : undefined,
          groupIndex: isAuto ? 1 : undefined,
          isAutoGroup: isAuto,
          groupAvatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff`,
          
          qrCode: isAuto ? `${baseId}_1` : baseId,
          masterQrCode: isAuto ? baseId : undefined, 

          participant: FOUNDER_USER, 
          participants: [FOUNDER_USER], 
          maxCapacity: capacity,
          messages: [{
              id: 'sys_start',
              senderId: 'system',
              text: `Phòng "${isAuto ? `${name} - 1` : name}" đã được khởi tạo bởi Admin. Sức chứa: ${capacity}.`,
              timestamp: new Date()
          }],
          unreadCount: 0,
          integrations: [
            { id: 'int_1', name: 'Canvas', icon: 'canvas', url: '', isConnected: true },
            { id: 'int_2', name: 'Drive', icon: 'drive', url: '', isConnected: true }
          ]
      };

      setConversations(prev => [newGroup, ...prev]);
  };

  const handleStartJointMeeting = (targetConversations: Conversation[]) => {
      // 1. Gather all participants from selected conversations
      const allParticipantsMap = new Map<string, User>();
      
      // Always add current user (Admin)
      allParticipantsMap.set(currentUser.id, currentUser);

      targetConversations.forEach(conv => {
          conv.participants?.forEach(p => {
              allParticipantsMap.set(p.id, p);
          });
      });

      const allParticipants = Array.from(allParticipantsMap.values());
      const baseName = targetConversations[0].isAutoGroup ? targetConversations[0].baseName : targetConversations[0].groupName;

      // 2. Create a temporary conversation object for the meeting
      const jointMeeting: Conversation = {
          id: 'joint_meeting_temp',
          isGroup: true,
          groupName: `HỌP CHUNG: ${baseName}`,
          participant: currentUser,
          participants: allParticipants,
          messages: [],
          unreadCount: 0
      };

      setJointMeetingConversation(jointMeeting);
      setActiveMeetingId('joint_meeting_temp');
  };

  // SIMULATE JOIN LOGIC (Core Feature)
  const handleUserJoinViaQr = (qrString: string) => {
      // 1. Giả lập một user mới
      const newUser: User = {
          id: `student_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          name: `Học viên ${Math.floor(Math.random() * 900) + 100}`,
          avatar: `https://ui-avatars.com/api/?name=HV&background=random`,
          isOnline: true,
          type: 'guest'
      };

      setConversations(prev => {
          const newState = [...prev];
          
          // Logic cho Auto-Scale: Tìm tất cả nhóm có masterQrCode === qrString
          const autoGroups = newState.filter(c => c.isAutoGroup && c.masterQrCode === qrString);
          
          if (autoGroups.length > 0) {
              autoGroups.sort((a, b) => (a.groupIndex || 0) - (b.groupIndex || 0));
              let lastGroup = autoGroups[autoGroups.length - 1];
              
              if ((lastGroup.participants?.length || 0) < (lastGroup.maxCapacity || 8)) {
                  // Add to current
                  lastGroup.participants = [...(lastGroup.participants || []), newUser];
                  lastGroup.messages.push({
                      id: `sys_join_${Date.now()}`,
                      senderId: 'system',
                      text: `${newUser.name} đã tham gia lớp học.`,
                      timestamp: new Date()
                  });
              } else {
                  // Create new
                  const nextIndex = (lastGroup.groupIndex || 1) + 1;
                  const newSubGroup: Conversation = {
                      ...lastGroup, 
                      id: `${lastGroup.masterQrCode}_${nextIndex}`,
                      groupName: `${lastGroup.baseName} - ${nextIndex}`,
                      groupIndex: nextIndex,
                      qrCode: `${lastGroup.masterQrCode}_${nextIndex}`,
                      participants: [FOUNDER_USER, newUser], 
                      messages: [{
                        id: 'sys_new_room',
                        senderId: 'system',
                        text: `Phòng "${lastGroup.baseName} - ${nextIndex}" được tự động tạo do phòng trước đã đầy.`,
                        timestamp: new Date()
                      }]
                  };
                  return [newSubGroup, ...newState]; 
              }
              return newState;
          }

          // Logic Manual
          const targetGroup = newState.find(c => c.qrCode === qrString);
          if (targetGroup) {
               if ((targetGroup.participants?.length || 0) < (targetGroup.maxCapacity || 8)) {
                   targetGroup.participants = [...(targetGroup.participants || []), newUser];
                   targetGroup.messages.push({
                      id: `sys_join_${Date.now()}`,
                      senderId: 'system',
                      text: `${newUser.name} đã tham gia.`,
                      timestamp: new Date()
                  });
               } else {
                   alert(`Phòng "${targetGroup.groupName}" đã đầy! Không thể tham gia.`);
               }
               return newState;
          }

          return newState;
      });
  };

  const handleSelectChat = (id: string) => {
    setActiveChatId(id);
    setIsMobileChatOpen(true);
    setConversations(prev => prev.map(conv => 
      conv.id === id ? { ...conv, unreadCount: 0 } : conv
    ));
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(MOCK_USER);
    setConversations(INITIAL_CONVERSATIONS);
    setActiveChatId(null);
    setGuestExpired(false);
    setShowAdminLogin(false);
    setLoginError('');
  };

  const handleGuestLogin = () => {
      const guestUser = initGuestUser();
      const { isExpired } = checkGuestExpiration(guestUser);
      
      setCurrentUser(guestUser);
      setIsAuthenticated(true);

      if (isExpired) {
          setGuestExpired(true);
      } else {
          const savedData = loadGuestData();
          if (savedData) {
              setConversations(savedData);
          } else {
              setConversations(INITIAL_CONVERSATIONS);
          }
      }
  };

  const handleAdminLoginSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (adminEmailInput === ADMIN_EMAIL && adminPassInput === ADMIN_PASS) {
          setCurrentUser(FOUNDER_USER);
          setIsAuthenticated(true);
          setLoginError('');
      } else {
          setLoginError('Email hoặc mật khẩu không đúng.');
      }
  };

  // --- Render Views ---

  // Determine which conversation to show in Meeting Overlay
  // If activeMeetingId matches the temp joint meeting, use that object.
  // Otherwise find in regular conversations.
  const meetingConversation = activeMeetingId === 'joint_meeting_temp' 
        ? jointMeetingConversation 
        : conversations.find(c => c.id === activeMeetingId);


  if (isAuthenticated && currentUser.type === 'admin') {
      return (
        <div className="relative">
             <AdminDashboard 
                onLogout={handleLogout} 
                conversations={conversations}
                onCreateClassroom={handleCreateClassroom}
                onSimulateJoin={handleUserJoinViaQr}
                currentUser={currentUser}
                onAdminSendMessage={handleAdminSendMessage}
                onStartJointMeeting={handleStartJointMeeting}
            />
            {activeMeetingId && meetingConversation && (
                <GroupMeeting 
                    conversation={meetingConversation} 
                    currentUser={currentUser} 
                    onLeave={() => {
                        setActiveMeetingId(null);
                        setJointMeetingConversation(null);
                    }} 
                />
            )}
        </div>
      );
  }

  if (isAuthenticated && currentUser.type === 'guest' && guestExpired) {
      return (
          <div className="flex h-screen bg-gray-100 items-center justify-center p-4">
              <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center border-t-4 border-red-500">
                  <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Tài khoản tạm đã hết hạn</h2>
                  <p className="text-gray-600 mb-6 text-sm">
                      Thời gian dùng thử 7 ngày đã kết thúc.
                  </p>
                  <div className="flex flex-col space-y-3">
                       <button onClick={handleLogout} className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-lg">
                          Thoát
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen bg-blue-50 items-center justify-center p-4 relative">
        {showAdminLogin && (
            <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm relative">
                    <button onClick={() => setShowAdminLogin(false)} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">✕</button>
                    <div className="flex items-center space-x-2 mb-4">
                        <Key className="w-5 h-5 text-blue-600" />
                        <h2 className="text-lg font-bold text-gray-800">Đăng nhập Người sáng lập</h2>
                    </div>
                    <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
                        <input type="email" value={adminEmailInput} onChange={(e) => setAdminEmailInput(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Email" />
                        <input type="password" value={adminPassInput} onChange={(e) => setAdminPassInput(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Password" />
                        {loginError && <p className="text-red-500 text-xs">{loginError}</p>}
                        <button type="submit" className="w-full bg-blue-800 text-white py-2 rounded-lg text-sm font-semibold hover:bg-blue-900">Truy cập</button>
                    </form>
                </div>
            </div>
        )}

        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
          <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <span className="font-bold text-white text-xl">Z@YDO</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Đăng nhập Z@YDO</h1>
          <div className="space-y-3">
              {isLoadingDrive ? (
                <div className="flex justify-center items-center text-blue-600 space-x-2 py-3">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Loading...</span>
                </div>
              ) : (
                <button onClick={signInWithGoogle} className="w-full flex items-center justify-center space-x-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-3 px-4 rounded-lg shadow-sm">
                   <span>Dùng tài khoản Google</span>
                </button>
              )}
              <button onClick={handleGuestLogin} className="w-full flex items-center justify-center space-x-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg">
                <UserIcon className="w-5 h-5 text-gray-500" />
                <span>Dùng thử (Khách)</span>
              </button>
          </div>
          <div className="mt-8 pt-4 border-t border-gray-100">
             <button onClick={() => setShowAdminLogin(true)} className="text-xs text-blue-600 hover:underline font-medium">Đăng nhập Quản trị viên</button>
          </div>
        </div>
      </div>
    );
  }

  // --- Main App ---
  return (
    <div className="flex h-screen bg-white relative">
      
      {/* Modals & Overlays */}
      {showCreateGroup && (
        <CreateGroupModal 
            onClose={() => setShowCreateGroup(false)} 
            onCreate={handleCreateGroup} 
        />
      )}

      {activeMeetingId && activeConversation && (
        <GroupMeeting 
            conversation={activeConversation} 
            currentUser={currentUser} 
            onLeave={() => setActiveMeetingId(null)} 
        />
      )}

      {/* 1. Main Sidebar */}
      <div className="w-16 bg-[#0068ff] flex flex-col items-center py-6 space-y-8 flex-shrink-0 z-30">
        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center mb-4 cursor-pointer text-center leading-tight shadow-md">
            <span className="font-bold text-blue-600 text-[10px]">Z@YDO</span>
        </div>
        <button onClick={() => setView('chats')} className={`p-2 rounded-xl transition-colors ${view === 'chats' ? 'bg-blue-800 text-white' : 'text-blue-200 hover:text-white'}`}>
          <MessageCircle className="w-6 h-6" />
        </button>
        <button onClick={() => setView('contacts')} className={`p-2 rounded-xl transition-colors ${view === 'contacts' ? 'bg-blue-800 text-white' : 'text-blue-200 hover:text-white'}`}>
          <Users className="w-6 h-6" />
        </button>
        {currentUser.type === 'google' && <button className="text-blue-200 hover:text-white p-2"><Cloud className="w-6 h-6" /></button>}
        {currentUser.type === 'guest' && (
             <div className="flex flex-col items-center">
                 <button className="text-yellow-300 p-2"><ShieldAlert className="w-6 h-6" /></button>
                 <span className="text-[10px] text-white font-bold">{daysLeft} ngày</span>
             </div>
        )}
        <div className="flex-1"></div>
        <button onClick={handleLogout} className="text-blue-200 hover:text-white p-2"><LogOut className="w-6 h-6" /></button>
        <div className="mb-4"><img src={currentUser.avatar} alt="Me" className="w-8 h-8 rounded-full border-2 border-blue-300" /></div>
      </div>

      {/* 2. Secondary Sidebar */}
      <div className={`flex-col w-full md:w-80 lg:w-96 border-r border-gray-200 bg-white ${isMobileChatOpen ? 'hidden md:flex' : 'flex'}`}>
         {view === 'chats' ? (
           <ConversationList 
             conversations={conversations} 
             activeId={activeChatId} 
             onSelect={handleSelectChat}
             currentUser={currentUser}
             onCreateGroup={() => setShowCreateGroup(true)}
           />
         ) : (
           <div className="flex flex-col h-full">
              <div className="p-4 border-b border-gray-100"><h2 className="font-bold text-gray-800">Danh bạ</h2></div>
              <div className="p-10 text-center text-gray-400 text-sm"><Users className="w-12 h-12 mx-auto mb-2 opacity-20" /><p>Danh sách bạn bè trống.</p></div>
           </div>
         )}
      </div>

      {/* 3. Chat Area */}
      <div className={`flex-1 bg-[#e2ecf7] relative ${isMobileChatOpen ? 'flex' : 'hidden md:flex'}`}>
        {activeConversation ? (
          <ChatWindow 
            conversation={activeConversation}
            currentUser={currentUser}
            onSendMessage={handleSendMessage}
            onBack={() => setIsMobileChatOpen(false)}
            isTyping={aiTyping}
            onStartMeeting={() => setActiveMeetingId(activeConversation.id)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center w-full h-full text-center p-4">
            <div className="w-48 h-48 mb-6 relative">
                <div className="absolute inset-0 bg-blue-100 rounded-full opacity-50 blur-2xl"></div>
                <div className="relative text-blue-600 font-bold text-4xl flex items-center justify-center h-full">Z@YDO</div>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Xin chào, {currentUser.name}</h1>
            {currentUser.type === 'guest' && <div className="mt-4 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg max-w-md text-sm">Tài khoản Khách: Dữ liệu sẽ tự động xóa sau {daysLeft} ngày nữa.</div>}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;