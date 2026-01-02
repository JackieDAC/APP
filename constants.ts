import { Conversation, User } from './types';

export const CURRENT_USER: User = {
  id: 'me',
  name: 'Bạn',
  avatar: 'https://picsum.photos/200/200?random=99',
  isOnline: true,
};

export const AI_USER: User = {
  id: 'dalo_ai',
  name: 'Trợ lý AI DALO',
  avatar: 'https://picsum.photos/200/200?random=100', // Robot-like placeholder
  isOnline: true,
  isAi: true,
};

const USER_A: User = {
  id: 'u1',
  name: 'Nguyễn Văn Nam',
  avatar: 'https://picsum.photos/200/200?random=1',
  isOnline: true,
};

const USER_B: User = {
  id: 'u2',
  name: 'Trần Thị Hạnh',
  avatar: 'https://picsum.photos/200/200?random=2',
  isOnline: false,
};

const USER_C: User = {
  id: 'u3',
  name: 'Nhóm Công Việc',
  avatar: 'https://picsum.photos/200/200?random=3',
  isOnline: true,
};

export const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 'c_ai',
    participant: AI_USER,
    messages: [
      {
        id: 'm_ai_1',
        senderId: 'dalo_ai',
        text: 'Xin chào! Tôi là trợ lý ảo DALO. Tôi có thể giúp gì cho bạn hôm nay?',
        timestamp: new Date(Date.now() - 1000 * 60 * 60),
      },
    ],
    unreadCount: 0,
  },
  {
    id: 'c1',
    participant: USER_A,
    messages: [
      {
        id: 'm1',
        senderId: 'u1',
        text: 'Alo, tối nay đi cà phê không bạn ơi?',
        timestamp: new Date(Date.now() - 1000 * 60 * 5),
      },
    ],
    unreadCount: 1,
  },
  {
    id: 'c2',
    participant: USER_B,
    messages: [
      {
        id: 'm2',
        senderId: 'me',
        text: 'Chị gửi em báo cáo chưa ạ?',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
      },
      {
        id: 'm3',
        senderId: 'u2',
        text: 'Chị gửi mail rồi nhé, check giúp chị.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 23),
      },
    ],
    unreadCount: 0,
  },
  {
    id: 'c3',
    participant: USER_C,
    messages: [
      {
        id: 'm4',
        senderId: 'u3',
        text: 'Mọi người nhớ deadline thứ 6 nhé.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48),
      },
    ],
    unreadCount: 5,
  },
];
