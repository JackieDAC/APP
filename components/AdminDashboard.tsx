import React, { useState, useMemo, useEffect } from 'react';
import { Shield, Server, Users, Activity, Lock, Database, Plus, Play, UserPlus, QrCode, Monitor, MessageSquare, Mic, Maximize2, ArrowLeft, Grid, HardDrive, RefreshCw, FolderPlus, CheckCircle, BrainCircuit, Sparkles, FileText, Table } from 'lucide-react';
import { Conversation, User, Message } from '../types';
import ChatWindow from './ChatWindow'; 
import { getDriveStorageQuota, ensureGroupFolder, DriveStorageInfo } from '../services/googleService';
import { sendMessageToGemini } from '../services/geminiService';

interface AdminDashboardProps {
  onLogout: () => void;
  conversations: Conversation[];
  onCreateClassroom: (name: string, capacity: number, isAuto: boolean) => void;
  onSimulateJoin: (qrCode: string) => void;
  currentUser: User; 
  onAdminSendMessage: (convId: string, text: string) => void;
  onStartJointMeeting: (conversations: Conversation[]) => void; 
}

// Mock AI Chat Interface for Founder
const FounderAiChat: React.FC<{ mode: 'notebook' | 'gemini'; onClose: () => void }> = ({ mode, onClose }) => {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Array<{role: 'user' | 'ai', text: string}>>([
        { 
            role: 'ai', 
            text: mode === 'notebook' 
                ? "Chào Founder! Tôi là NotebookLM Assistant. Hãy tải lên tài liệu hoặc dán nội dung, tôi sẽ phân tích chuyên sâu cho bạn." 
                : "Xin chào! Tôi là Gemini Pro Enterprise. Tôi có thể giúp gì cho chiến lược phát triển Z@YDO hôm nay?" 
        }
    ]);
    const [isLoading, setIsLoading] = useState(false);

    const handleSend = async () => {
        if (!input.trim()) return;
        const userMsg = input;
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setInput('');
        setIsLoading(true);

        try {
            // Prefix prompt to simulate specific persona
            const prefix = mode === 'notebook' 
                ? "[ROLE: NotebookLM Research Analyst. Analyze input deeply, focus on facts, sources, and summaries.] " 
                : "[ROLE: Gemini Pro Strategic Advisor. Provide creative, strategic, and high-level tech advice.] ";
            
            // Reusing existing service but simulating separate contexts
            const response = await sendMessageToGemini(prefix + userMsg, []);
            setMessages(prev => [...prev, { role: 'ai', text: response }]);
        } catch (e) {
            setMessages(prev => [...prev, { role: 'ai', text: "Lỗi kết nối AI Service." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-900 border-l border-gray-700">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800">
                <div className="flex items-center space-x-2">
                    {mode === 'notebook' ? <FileText className="w-5 h-5 text-green-400"/> : <Sparkles className="w-5 h-5 text-blue-400"/>}
                    <h3 className="font-bold text-white">{mode === 'notebook' ? 'NotebookLM (Docs Analysis)' : 'Gemini Pro (Strategic)'}</h3>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-white"><ArrowLeft className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-lg text-sm ${m.role === 'user' ? 'bg-blue-700 text-white' : 'bg-gray-800 text-gray-200 border border-gray-700'}`}>
                            {m.text}
                        </div>
                    </div>
                ))}
                {isLoading && <div className="text-gray-500 text-xs italic p-2">AI đang suy nghĩ...</div>}
            </div>
            <div className="p-4 border-t border-gray-700 bg-gray-800">
                <div className="flex space-x-2">
                    <input 
                        className="flex-1 bg-gray-700 border-none rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500"
                        placeholder={mode === 'notebook' ? "Dán nội dung tài liệu..." : "Hỏi về chiến lược..."}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    />
                    <button onClick={handleSend} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold">Gửi</button>
                </div>
            </div>
        </div>
    )
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  onLogout, 
  conversations, 
  onCreateClassroom,
  onSimulateJoin,
  currentUser,
  onAdminSendMessage,
  onStartJointMeeting
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'classrooms' | 'storage' | 'ai-tools' | 'sheets'>('overview');
  const [selectedBaseName, setSelectedBaseName] = useState<string | null>(null);
  const [monitoringChatId, setMonitoringChatId] = useState<string | null>(null);
  const [selectedAiTool, setSelectedAiTool] = useState<'notebook' | 'gemini' | null>(null);
  
  // Storage State
  const [driveInfo, setDriveInfo] = useState<DriveStorageInfo | null>(null);
  const [isLoadingQuota, setIsLoadingQuota] = useState(false);
  const [folderSyncStatus, setFolderSyncStatus] = useState<Record<string, string>>({}); 

  // Form State
  const [className, setClassName] = useState('');
  const [capacity, setCapacity] = useState(8);
  const [isAutoMode, setIsAutoMode] = useState(false);

  // Data Sheet Logic
  const allFiles = useMemo(() => {
    const files: Array<{
        id: string;
        fileName: string;
        groupName: string;
        sheetRef: string; // The "Sheet Name" -> GROUP - TIME
        uploader: string;
        timestamp: Date;
    }> = [];

    conversations.filter(c => c.isGroup).forEach(conv => {
        conv.messages.forEach(msg => {
            if (msg.text.startsWith('[FILE]')) {
                const date = new Date(msg.timestamp);
                const timeStr = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                // SHEET NAME convention: [GROUP] - [TIME]
                const sheetName = `${conv.groupName || 'Unknown'} - ${timeStr}`;
                
                files.push({
                    id: msg.id,
                    fileName: msg.text.replace('[FILE]', '').trim(),
                    groupName: conv.groupName || 'Unknown Group',
                    sheetRef: sheetName,
                    uploader: conv.participants?.find(p => p.id === msg.senderId)?.name || 'Unknown User',
                    timestamp: date
                });
            }
        });
    });
    // Sort by newest
    return files.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [conversations]);


  // Group Logic
  const classroomClusters = useMemo(() => {
    const clusters: Record<string, Conversation[]> = {};
    conversations.filter(c => c.isGroup).forEach(conv => {
        const key = conv.isAutoGroup ? (conv.baseName || conv.groupName || 'Unknown') : (conv.groupName || conv.id);
        if (!clusters[key]) {
            clusters[key] = [];
        }
        clusters[key].push(conv);
    });
    Object.keys(clusters).forEach(key => {
        clusters[key].sort((a, b) => (a.groupIndex || 0) - (b.groupIndex || 0));
    });
    return clusters;
  }, [conversations]);

  useEffect(() => {
      if (activeTab === 'storage') {
          loadQuota();
      }
  }, [activeTab]);

  const loadQuota = async () => {
      setIsLoadingQuota(true);
      const info = await getDriveStorageQuota();
      setDriveInfo(info);
      setIsLoadingQuota(false);
  };

  const handleSyncFolders = async () => {
      const allGroups = conversations.filter(c => c.isGroup);
      for (const group of allGroups) {
          const groupName = group.groupName || 'Unnamed Group';
          setFolderSyncStatus(prev => ({ ...prev, [group.id]: 'syncing' }));
          const folderId = await ensureGroupFolder(groupName);
          if (folderId) {
             setFolderSyncStatus(prev => ({ ...prev, [group.id]: folderId }));
          } else {
             setFolderSyncStatus(prev => ({ ...prev, [group.id]: 'error' }));
          }
      }
      loadQuota();
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (className.trim()) {
      onCreateClassroom(className, capacity, isAutoMode);
      setClassName('');
      alert(`Đã khởi tạo hệ thống phòng: ${className}`);
    }
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Views Logic
  const activeCluster = selectedBaseName ? classroomClusters[selectedBaseName] : [];

  // Render "Command Center" for a specific class
  if (selectedBaseName && activeCluster) {
      const activeMonitoringChat = conversations.find(c => c.id === monitoringChatId);

      return (
        <div className="flex h-screen bg-gray-900 text-white overflow-hidden flex-col">
            <div className="bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between shadow-md z-10">
                <div className="flex items-center space-x-4">
                    <button onClick={() => { setSelectedBaseName(null); setMonitoringChatId(null); }} className="p-2 hover:bg-gray-700 rounded-full">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold flex items-center">
                            <Monitor className="w-5 h-5 mr-2 text-blue-500" />
                            Trung tâm điều khiển: {selectedBaseName}
                        </h2>
                        <p className="text-xs text-gray-400">
                            {activeCluster.length} phòng con đang hoạt động • Tổng {activeCluster.reduce((acc, c) => acc + (c.participants?.length || 0), 0)} thành viên
                        </p>
                    </div>
                </div>
                <div className="flex space-x-3">
                    <button 
                        onClick={() => onStartJointMeeting(activeCluster)}
                        className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold shadow-lg animate-pulse"
                    >
                        <Mic className="w-5 h-5" />
                        <span>HỌP GHÉP TOÀN BỘ ({activeCluster.reduce((acc, c) => acc + (c.participants?.length || 0), 0)})</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                <div className={`${monitoringChatId ? 'w-1/3 hidden md:flex' : 'w-full'} flex-col border-r border-gray-700 bg-gray-900/50`}>
                     <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800/50">
                        <h3 className="font-bold text-gray-300 flex items-center"><Grid className="w-4 h-4 mr-2"/> Danh sách phòng</h3>
                     </div>
                     <div className="p-4 grid grid-cols-1 gap-4 overflow-y-auto custom-scrollbar pb-20">
                        {activeCluster.map((room) => (
                            <div 
                                key={room.id} 
                                onClick={() => setMonitoringChatId(room.id)}
                                className={`bg-gray-800 p-4 rounded-xl border cursor-pointer transition-all hover:shadow-lg group relative
                                    ${monitoringChatId === room.id ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-700 hover:border-gray-500'}
                                `}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-white truncate pr-2">{room.groupName}</h4>
                                    <span className={`text-[10px] px-2 py-0.5 rounded ${room.isAutoGroup ? 'bg-purple-900 text-purple-200' : 'bg-blue-900 text-blue-200'}`}>
                                        {room.isAutoGroup ? `#${room.groupIndex}` : 'Manual'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm text-gray-400 mb-3">
                                    <div className="flex items-center">
                                        <Users className="w-4 h-4 mr-1" />
                                        <span className={(room.participants?.length || 0) >= (room.maxCapacity || 8) ? 'text-red-400' : 'text-green-400'}>
                                            {room.participants?.length} / {room.maxCapacity}
                                        </span>
                                    </div>
                                    <div className="flex items-center">
                                        <MessageSquare className="w-4 h-4 mr-1" />
                                        <span>{room.messages.length} msg</span>
                                    </div>
                                </div>
                                <div className="bg-gray-900/50 p-2 rounded text-xs text-gray-500 italic truncate border border-gray-700/50">
                                    {room.messages[room.messages.length - 1]?.text || "Chưa có tin nhắn"}
                                </div>
                                <div className="absolute inset-0 bg-black/60 items-center justify-center hidden group-hover:flex rounded-xl backdrop-blur-[1px]">
                                    <span className="text-white font-bold flex items-center"><Maximize2 className="w-5 h-5 mr-2"/> Truy cập</span>
                                </div>
                            </div>
                        ))}
                     </div>
                </div>

                {monitoringChatId && activeMonitoringChat ? (
                    <div className="flex-1 flex flex-col bg-[#e2ecf7] relative">
                         <ChatWindow 
                            conversation={activeMonitoringChat}
                            currentUser={currentUser}
                            onSendMessage={(text) => onAdminSendMessage(activeMonitoringChat.id, text)}
                            onBack={() => setMonitoringChatId(null)}
                            onStartMeeting={() => onStartJointMeeting([activeMonitoringChat])} 
                         />
                         <div className="absolute top-0 left-0 right-0 h-1 bg-red-500 z-50"></div>
                         <div className="absolute top-1 right-1/2 transform translate-x-1/2 bg-red-500 text-white text-[10px] px-2 rounded-b shadow-md z-50 font-bold uppercase tracking-wider">
                             Chế độ Giám sát Admin
                         </div>
                    </div>
                ) : (
                    <div className="hidden md:flex flex-1 items-center justify-center bg-gray-900 text-gray-600 flex-col">
                        <Activity className="w-24 h-24 mb-4 opacity-20" />
                        <p>Chọn một phòng bên trái để giám sát và trò chuyện.</p>
                    </div>
                )}
            </div>
        </div>
      );
  }

  // DEFAULT DASHBOARD
  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
      {/* Sidebar Admin */}
      <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col flex-shrink-0">
        <div className="p-6 flex items-center space-x-3 border-b border-gray-700">
          <Shield className="w-8 h-8 text-yellow-500" />
          <div>
            <h1 className="font-bold text-lg">Z@YDO ADMIN</h1>
            <span className="text-xs text-gray-400">Founder Access</span>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <div 
            onClick={() => setActiveTab('overview')}
            className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${activeTab === 'overview' ? 'bg-blue-900/50 text-blue-400' : 'hover:bg-gray-700 text-gray-400'}`}
          >
            <Server className="w-5 h-5" />
            <span>Dashboard</span>
          </div>
          <div 
            onClick={() => setActiveTab('classrooms')}
            className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${activeTab === 'classrooms' ? 'bg-blue-900/50 text-blue-400' : 'hover:bg-gray-700 text-gray-400'}`}
          >
            <Monitor className="w-5 h-5" />
            <span>Quản lý Phòng Học</span>
          </div>
          <div 
            onClick={() => setActiveTab('storage')}
            className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${activeTab === 'storage' ? 'bg-blue-900/50 text-blue-400' : 'hover:bg-gray-700 text-gray-400'}`}
          >
            <HardDrive className="w-5 h-5" />
            <span>Quản lý Dung lượng</span>
          </div>
           <div 
            onClick={() => setActiveTab('sheets')}
            className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${activeTab === 'sheets' ? 'bg-blue-900/50 text-blue-400' : 'hover:bg-gray-700 text-gray-400'}`}
          >
            <Table className="w-5 h-5" />
            <span>Data Sheets</span>
          </div>
          <div 
            onClick={() => setActiveTab('ai-tools')}
            className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${activeTab === 'ai-tools' ? 'bg-blue-900/50 text-blue-400' : 'hover:bg-gray-700 text-gray-400'}`}
          >
            <BrainCircuit className="w-5 h-5" />
            <span>AI Studio (Founder)</span>
          </div>
        </nav>

        <div className="p-4 border-t border-gray-700">
          <button 
            onClick={onLogout}
            className="w-full py-2 bg-red-600 hover:bg-red-700 rounded text-sm font-medium transition-colors"
          >
            Đăng xuất
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8 bg-gray-900">
        
        {activeTab === 'overview' && (
          <>
            <header className="mb-8">
              <h2 className="text-3xl font-bold mb-2">Trung tâm điều khiển</h2>
              <p className="text-gray-400">Chào mừng Người sáng lập (Nguyen Duy Dac).</p>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                    <div className="flex justify-between items-start">
                    <div>
                        <p className="text-gray-400 text-sm">Tổng số Phòng</p>
                        <h3 className="text-2xl font-bold mt-1 text-green-400">{conversations.filter(c => c.isGroup).length}</h3>
                    </div>
                    <Users className="w-6 h-6 text-green-500" />
                    </div>
                </div>
                 <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                    <div className="flex justify-between items-start">
                    <div>
                        <p className="text-gray-400 text-sm">Cụm Lớp Học</p>
                        <h3 className="text-2xl font-bold mt-1 text-blue-400">{Object.keys(classroomClusters).length}</h3>
                    </div>
                    <Server className="w-6 h-6 text-blue-500" />
                    </div>
                </div>
                <div 
                    onClick={() => setActiveTab('storage')}
                    className="bg-gray-800 p-6 rounded-xl border border-gray-700 cursor-pointer hover:bg-gray-750"
                >
                    <div className="flex justify-between items-start">
                    <div>
                        <p className="text-gray-400 text-sm">File Uploads (Data Sheets)</p>
                        <h3 className="text-2xl font-bold mt-1 text-yellow-400">{allFiles.length}</h3>
                    </div>
                    <Table className="w-6 h-6 text-yellow-500" />
                    </div>
                </div>
            </div>
          </>
        )}

        {/* --- CLASSROOMS TAB --- */}
        {activeTab === 'classrooms' && (
          <div className="space-y-8">
             <header>
              <h2 className="text-3xl font-bold mb-2">Hệ thống Lớp học & Phòng họp</h2>
              <p className="text-gray-400">Tạo và quản lý các cụm phòng học tự động hoặc thủ công.</p>
            </header>

            {/* Create Form */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 shadow-lg">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                    <Plus className="w-5 h-5 mr-2 text-blue-500" />
                    Thiết lập Hệ thống Phòng mới
                </h3>
                <form onSubmit={handleCreateSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Tên Lớp / Chủ đề</label>
                        <input 
                            type="text" 
                            required
                            value={className}
                            onChange={(e) => setClassName(e.target.value)}
                            placeholder="VD: Đồ họa - Báo cáo GK"
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Sỉ số / Phòng</label>
                        <input 
                            type="number" 
                            min="1"
                            max="1000"
                            value={capacity}
                            onChange={(e) => setCapacity(parseInt(e.target.value))}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-400 mb-2">Chế độ phân phối</label>
                        <div className="flex space-x-4">
                            <label className={`flex items-center p-4 rounded-lg border cursor-pointer flex-1 transition-all ${!isAutoMode ? 'bg-blue-900/30 border-blue-500' : 'bg-gray-700 border-gray-600'}`}>
                                <input 
                                    type="radio" 
                                    name="mode" 
                                    checked={!isAutoMode} 
                                    onChange={() => setIsAutoMode(false)}
                                    className="hidden" 
                                />
                                <div className="mr-3 p-2 bg-blue-500/20 rounded-full text-blue-400"><Lock className="w-5 h-5" /></div>
                                <div>
                                    <div className="font-bold text-white">Thủ công (Single Room)</div>
                                    <div className="text-xs text-gray-400">1 Phòng duy nhất.</div>
                                </div>
                            </label>

                            <label className={`flex items-center p-4 rounded-lg border cursor-pointer flex-1 transition-all ${isAutoMode ? 'bg-purple-900/30 border-purple-500' : 'bg-gray-700 border-gray-600'}`}>
                                <input 
                                    type="radio" 
                                    name="mode" 
                                    checked={isAutoMode} 
                                    onChange={() => setIsAutoMode(true)}
                                    className="hidden" 
                                />
                                <div className="mr-3 p-2 bg-purple-500/20 rounded-full text-purple-400"><Server className="w-5 h-5" /></div>
                                <div>
                                    <div className="font-bold text-white">Tự động (Auto-Scale)</div>
                                    <div className="text-xs text-gray-400">Hệ thống tự tạo phòng mới khi phòng cũ đầy.</div>
                                </div>
                            </label>
                        </div>
                    </div>
                    <div className="md:col-span-2 flex justify-end">
                        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg flex items-center shadow-lg">
                            <Play className="w-4 h-4 mr-2" />
                            Triển khai
                        </button>
                    </div>
                </form>
            </div>

            {/* List Clusters */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white">Danh sách Lớp học đang hoạt động</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-700 text-gray-400 text-xs uppercase">
                            <tr>
                                <th className="px-6 py-3">Tên Cụm / Lớp</th>
                                <th className="px-6 py-3">Số lượng Phòng</th>
                                <th className="px-6 py-3">Tổng thành viên</th>
                                <th className="px-6 py-3">Loại</th>
                                <th className="px-6 py-3 text-right">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {Object.keys(classroomClusters).length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">Chưa có lớp học nào.</td>
                                </tr>
                            )}
                            {Object.entries(classroomClusters).map(([key, value]) => {
                                const list = value as Conversation[];
                                const totalMembers = list.reduce((acc, c) => acc + (c.participants?.length || 0), 0);
                                const isAuto = list[0].isAutoGroup;
                                return (
                                    <tr key={key} className="hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4 text-white font-bold text-lg">{key}</td>
                                        <td className="px-6 py-4 text-gray-300">
                                            <span className="bg-gray-700 px-2 py-1 rounded text-sm">{list.length} phòng</span>
                                        </td>
                                        <td className="px-6 py-4 text-blue-400 font-mono">{totalMembers}</td>
                                        <td className="px-6 py-4">
                                             <span className={`text-[10px] px-2 py-0.5 rounded border ${isAuto ? 'bg-purple-900/50 text-purple-300 border-purple-700' : 'bg-blue-900/50 text-blue-300 border-blue-700'}`}>
                                                {isAuto ? 'Auto-Scale' : 'Manual'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right flex justify-end space-x-2">
                                             <button 
                                                onClick={() => onSimulateJoin(isAuto ? (list[0].masterQrCode || '') : (list[0].qrCode || ''))}
                                                className="text-xs bg-gray-600 hover:bg-gray-500 text-white px-3 py-2 rounded flex items-center"
                                                title="Test: Thêm học viên ảo"
                                            >
                                                <UserPlus className="w-3 h-3 mr-1" /> Test
                                            </button>

                                            <button 
                                                onClick={() => setSelectedBaseName(key)}
                                                className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded flex items-center font-bold shadow-md"
                                            >
                                                <Monitor className="w-3 h-3 mr-1" />
                                                Quản lý
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
          </div>
        )}

        {/* --- STORAGE TAB --- */}
        {activeTab === 'storage' && (
            <div className="space-y-8">
                <header className="flex justify-between items-end">
                    <div>
                        <h2 className="text-3xl font-bold mb-2 flex items-center">
                            <HardDrive className="w-8 h-8 mr-3 text-yellow-500" />
                            Quản lý Dung lượng & Sao lưu
                        </h2>
                        <p className="text-gray-400">Tất cả dữ liệu upload (video, ảnh, file) sẽ được sao lưu về Google Drive của Admin.</p>
                    </div>
                    <button 
                        onClick={handleSyncFolders}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold shadow-lg flex items-center space-x-2 transition-all hover:scale-105"
                    >
                        <RefreshCw className="w-5 h-5 animate-pulse" />
                        <span>Kích hoạt/Đồng bộ Thư mục</span>
                    </button>
                </header>

                {/* Quota Card */}
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 shadow-lg">
                    <h3 className="text-lg font-bold text-white mb-6">Trạng thái Google Drive (Admin)</h3>
                    {isLoadingQuota ? (
                        <div className="text-gray-400 animate-pulse">Đang tải dữ liệu dung lượng...</div>
                    ) : driveInfo ? (
                        <div className="space-y-6">
                            <div className="relative pt-1">
                                <div className="flex mb-2 items-center justify-between">
                                    <div>
                                        <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-200 bg-blue-900">
                                            Đã sử dụng
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs font-semibold inline-block text-blue-200">
                                            {formatBytes(driveInfo.usage)} / {formatBytes(driveInfo.limit)}
                                        </span>
                                    </div>
                                </div>
                                <div className="overflow-hidden h-4 mb-4 text-xs flex rounded bg-gray-700">
                                    <div 
                                        style={{ width: `${(driveInfo.usage / driveInfo.limit) * 100}%` }} 
                                        className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                                            (driveInfo.usage / driveInfo.limit) > 0.8 ? 'bg-red-500' : 'bg-blue-500'
                                        }`}
                                    ></div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="bg-gray-700/50 p-4 rounded-lg">
                                    <p className="text-gray-400">Dữ liệu trong Drive</p>
                                    <p className="text-xl font-bold text-white">{formatBytes(driveInfo.usageInDrive)}</p>
                                </div>
                                <div className="bg-gray-700/50 p-4 rounded-lg">
                                    <p className="text-gray-400">Thùng rác</p>
                                    <p className="text-xl font-bold text-white">{formatBytes(driveInfo.usageInTrash)}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-red-400">Không thể lấy thông tin dung lượng. Vui lòng kiểm tra kết nối Google API.</p>
                    )}
                </div>

                {/* Folders List */}
                <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-700 bg-gray-800">
                        <h3 className="font-bold text-white">Trạng thái Thư mục Sao lưu (Theo Nhóm)</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                             <thead className="bg-gray-700 text-gray-400 text-xs uppercase">
                                <tr>
                                    <th className="px-6 py-3">Tên Nhóm</th>
                                    <th className="px-6 py-3">Tên Thư mục Backup (Dự kiến)</th>
                                    <th className="px-6 py-3">Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {conversations.filter(c => c.isGroup).map((group) => (
                                    <tr key={group.id} className="hover:bg-gray-700/50">
                                        <td className="px-6 py-4 font-medium text-white">{group.groupName}</td>
                                        <td className="px-6 py-4 font-mono text-yellow-400 text-sm">
                                            {group.groupName}-data upload
                                        </td>
                                        <td className="px-6 py-4">
                                            {folderSyncStatus[group.id] === 'syncing' ? (
                                                <span className="text-blue-400 flex items-center text-sm">
                                                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Đang kiểm tra...
                                                </span>
                                            ) : folderSyncStatus[group.id] && folderSyncStatus[group.id] !== 'error' ? (
                                                <div className="flex items-center text-green-400 text-sm bg-green-900/20 px-3 py-1 rounded w-fit">
                                                    <CheckCircle className="w-4 h-4 mr-2" />
                                                    Đã kết nối
                                                    <span className="ml-2 text-[10px] text-gray-500 opacity-60">ID: {folderSyncStatus[group.id].substring(0,6)}...</span>
                                                </div>
                                            ) : folderSyncStatus[group.id] === 'error' ? (
                                                <span className="text-red-400 text-sm">Lỗi kết nối</span>
                                            ) : (
                                                <span className="text-gray-500 text-sm flex items-center">
                                                    <FolderPlus className="w-3 h-3 mr-1" /> Chưa đồng bộ
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}

        {/* --- AI TOOLS TAB (NotebookLM / Gemini) --- */}
        {activeTab === 'ai-tools' && (
            <div className="h-full flex flex-col">
                <header className="mb-8">
                    <h2 className="text-3xl font-bold mb-2 flex items-center">
                        <BrainCircuit className="w-8 h-8 mr-3 text-purple-500" />
                        AI Studio (Founder Access)
                    </h2>
                    <p className="text-gray-400">Công cụ phân tích dữ liệu và chiến lược dành riêng cho Quản trị viên.</p>
                </header>

                <div className="flex-1 flex overflow-hidden bg-gray-800 rounded-xl border border-gray-700 relative">
                    {/* Left Selection Panel */}
                    <div className={`${selectedAiTool ? 'hidden md:flex w-64' : 'w-full'} flex-col border-r border-gray-700 p-4 space-y-4 transition-all`}>
                        <div 
                            onClick={() => setSelectedAiTool('notebook')}
                            className={`p-6 rounded-xl cursor-pointer border transition-all hover:scale-105 ${selectedAiTool === 'notebook' ? 'bg-green-900/50 border-green-500' : 'bg-gray-700 border-gray-600 hover:border-gray-500'}`}
                        >
                            <FileText className="w-10 h-10 text-green-400 mb-4" />
                            <h3 className="font-bold text-white text-lg">NotebookLM</h3>
                            <p className="text-gray-400 text-sm mt-2">Phân tích tài liệu chuyên sâu. Tóm tắt, trích xuất dữ liệu từ các file upload.</p>
                        </div>

                        <div 
                            onClick={() => setSelectedAiTool('gemini')}
                            className={`p-6 rounded-xl cursor-pointer border transition-all hover:scale-105 ${selectedAiTool === 'gemini' ? 'bg-blue-900/50 border-blue-500' : 'bg-gray-700 border-gray-600 hover:border-gray-500'}`}
                        >
                            <Sparkles className="w-10 h-10 text-blue-400 mb-4" />
                            <h3 className="font-bold text-white text-lg">Gemini Pro</h3>
                            <p className="text-gray-400 text-sm mt-2">Trợ lý chiến lược tổng quát. Hỏi đáp thông minh và lập kế hoạch.</p>
                        </div>
                    </div>

                    {/* Right Chat Panel */}
                    <div className="flex-1 bg-gray-900">
                        {selectedAiTool ? (
                            <FounderAiChat mode={selectedAiTool} onClose={() => setSelectedAiTool(null)} />
                        ) : (
                            <div className="h-full flex items-center justify-center flex-col text-gray-500">
                                <BrainCircuit className="w-20 h-20 mb-4 opacity-20" />
                                <p>Chọn một công cụ AI để bắt đầu làm việc.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* --- SHEETS TAB --- */}
        {activeTab === 'sheets' && (
             <div className="space-y-6">
                 <header>
                    <h2 className="text-3xl font-bold mb-2 flex items-center">
                        <Table className="w-8 h-8 mr-3 text-green-500" />
                        Data Sheets (Theo dõi File)
                    </h2>
                    <p className="text-gray-400">Danh sách toàn bộ file đã được tải lên trong hệ thống. Tự động cập nhật.</p>
                </header>

                <div className="bg-white rounded-xl overflow-hidden shadow-xl text-black">
                     <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-green-600 text-white text-sm uppercase">
                                <tr>
                                    <th className="px-6 py-4 border-r border-green-500">File Name</th>
                                    <th className="px-6 py-4 border-r border-green-500">Người Gửi (Uploader)</th>
                                    <th className="px-6 py-4 border-r border-green-500">SHEET REF (Nhóm - Giờ)</th>
                                    <th className="px-6 py-4">Thời gian</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {allFiles.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500">Chưa có dữ liệu file nào được ghi nhận.</td>
                                    </tr>
                                )}
                                {allFiles.map((file) => (
                                    <tr key={file.id} className="hover:bg-green-50">
                                        <td className="px-6 py-3 font-semibold text-gray-800 border-r border-gray-100 flex items-center">
                                            <FileText className="w-4 h-4 mr-2 text-blue-600" />
                                            {file.fileName}
                                        </td>
                                        <td className="px-6 py-3 text-gray-700 border-r border-gray-100">{file.uploader}</td>
                                        <td className="px-6 py-3 text-gray-800 font-mono text-sm border-r border-gray-100 bg-gray-50">
                                            {file.sheetRef}
                                        </td>
                                        <td className="px-6 py-3 text-gray-500 text-sm">
                                            {file.timestamp.toLocaleDateString('vi-VN')} {file.timestamp.toLocaleTimeString('vi-VN')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                     </div>
                </div>
             </div>
        )}

      </div>
    </div>
  );
};

export default AdminDashboard;