export type AccountType = 'google' | 'guest' | 'admin';

export interface User {
  id: string;
  name: string;
  avatar: string;
  isOnline: boolean;
  isAi?: boolean;
  type?: AccountType; 
  expiryDate?: Date;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: Date;
  isImage?: boolean;
  fileUrl?: string; // Support file sharing
  fileName?: string;
}

export interface Integration {
  id: string;
  name: 'Canvas' | 'Figma' | 'Framer' | 'Drive';
  icon: string;
  url: string;
  isConnected: boolean;
}

export interface Conversation {
  id: string;
  isGroup?: boolean;
  groupName?: string;
  groupAvatar?: string;
  qrCode?: string; // QR Code string
  participant: User; // Representative (usually Admin for class groups)
  participants?: User[]; // List of all members
  messages: Message[];
  unreadCount: number;
  integrations?: Integration[];
  isMeetingActive?: boolean;

  // New fields for Classroom/Meeting management
  maxCapacity?: number; // Số lượng thành viên tối đa (ví dụ: 8)
  isAutoGroup?: boolean; // Có phải nhóm tự động chia phòng không?
  baseName?: string; // Tên gốc (ví dụ: "Đồ họa - Báo cáo GK")
  groupIndex?: number; // Số thứ tự nhóm (1, 2, 3...)
  masterQrCode?: string; // Mã QR chung cho cả hệ thống nhóm tự động
}
