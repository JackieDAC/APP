import { Conversation, User } from '../types';

const GUEST_DATA_KEY = 'dalo_guest_data';
const GUEST_INFO_KEY = 'dalo_guest_info';

// Thời gian dùng thử: 7 ngày (tính bằng mili giây)
const TRIAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export const initGuestUser = (): User => {
  // Kiểm tra xem đã có user khách cũ chưa
  const storedInfo = localStorage.getItem(GUEST_INFO_KEY);
  
  if (storedInfo) {
    const parsed = JSON.parse(storedInfo);
    return {
      ...parsed,
      expiryDate: new Date(parsed.expiryDate)
    };
  }

  // Tạo user khách mới
  const expiryDate = new Date(Date.now() + TRIAL_DURATION_MS);
  const newUser: User = {
    id: 'guest_' + Date.now(),
    name: 'Khách Ghé Thăm',
    avatar: 'https://ui-avatars.com/api/?name=Khách&background=random',
    isOnline: true,
    type: 'guest',
    expiryDate: expiryDate
  };

  localStorage.setItem(GUEST_INFO_KEY, JSON.stringify(newUser));
  return newUser;
};

export const checkGuestExpiration = (user: User): { isExpired: boolean; daysLeft: number } => {
  if (user.type !== 'guest' || !user.expiryDate) return { isExpired: false, daysLeft: 999 };

  const now = new Date();
  const expiry = new Date(user.expiryDate);
  const timeLeft = expiry.getTime() - now.getTime();
  const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));

  return {
    isExpired: timeLeft <= 0,
    daysLeft: daysLeft
  };
};

export const saveGuestData = (conversations: Conversation[]) => {
  localStorage.setItem(GUEST_DATA_KEY, JSON.stringify(conversations));
};

export const loadGuestData = (): Conversation[] | null => {
  const data = localStorage.getItem(GUEST_DATA_KEY);
  if (!data) return null;
  
  try {
    const parsed = JSON.parse(data);
    return parsed.map((c: any) => ({
      ...c,
      messages: c.messages.map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp)
      }))
    }));
  } catch (e) {
    console.error("Lỗi đọc dữ liệu khách", e);
    return null;
  }
};

export const clearGuestData = () => {
  localStorage.removeItem(GUEST_DATA_KEY);
  localStorage.removeItem(GUEST_INFO_KEY);
};
