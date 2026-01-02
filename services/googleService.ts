import { Conversation } from '../types';

// Client ID của bạn lấy từ Google Cloud Console
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID_HERE'; 
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/drive.metadata.readonly';

let tokenClient: any;
let accessToken: string | null = null;
const BACKUP_FILE_NAME = 'dalo_app_data_v1.json';

export interface GoogleUserProfile {
  id: string;
  name: string;
  picture: string;
}

export interface DriveStorageInfo {
  limit: number;
  usage: number;
  usageInDrive: number;
  usageInTrash: number;
}

/**
 * Khởi tạo Google Token Client
 */
export const initGoogleAuth = (callback: (token: string) => void) => {
  if ((window as any).google) {
    tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (tokenResponse: any) => {
        accessToken = tokenResponse.access_token;
        callback(tokenResponse.access_token);
      },
    });
  }
};

/**
 * Kích hoạt popup đăng nhập
 */
export const signInWithGoogle = () => {
  if (tokenClient) {
    tokenClient.requestAccessToken();
  } else {
    alert("Google API chưa tải xong. Vui lòng đợi hoặc tải lại trang.");
  }
};

/**
 * Lấy thông tin profile người dùng
 */
export const getUserProfile = async (token: string): Promise<GoogleUserProfile | null> => {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    return {
      id: data.id,
      name: data.name,
      picture: data.picture,
    };
  } catch (e) {
    console.error("Lỗi lấy thông tin user:", e);
    return null;
  }
};

/**
 * Tìm file backup trên Drive
 */
const findBackupFile = async () => {
  if (!accessToken) return null;
  const q = `name = '${BACKUP_FILE_NAME}' and trashed = false`;
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await response.json();
  return data.files && data.files.length > 0 ? data.files[0] : null;
};

/**
 * Tải dữ liệu từ Drive
 */
export const loadDataFromDrive = async (): Promise<Conversation[] | null> => {
  if (!accessToken) return null;
  
  try {
    const file = await findBackupFile();
    if (!file) return null; // Chưa có backup

    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    const data = await response.json();
    // Chuyển string date về Date object
    return data.map((c: any) => ({
      ...c,
      messages: c.messages.map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp)
      }))
    }));

  } catch (error) {
    console.error("Lỗi tải từ Drive:", error);
    return null;
  }
};

/**
 * Lưu dữ liệu lên Drive (Tạo mới hoặc Ghi đè)
 */
export const saveDataToDrive = async (conversations: Conversation[]) => {
  if (!accessToken) return;

  try {
    const file = await findBackupFile();
    const fileContent = JSON.stringify(conversations);
    const blob = new Blob([fileContent], { type: 'application/json' });

    if (file) {
      // Update file hiện có
      await fetch(`https://www.googleapis.com/upload/drive/v3/files/${file.id}?uploadType=media`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: blob,
      });
      console.log("Đã cập nhật dữ liệu lên Drive");
    } else {
      // Tạo file mới
      const metadata = {
        name: BACKUP_FILE_NAME,
        mimeType: 'application/json',
      };
      
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', blob);

      await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: form,
      });
      console.log("Đã tạo file backup mới trên Drive");
    }
  } catch (error) {
    console.error("Lỗi lưu lên Drive:", error);
  }
};

/**
 * NEW: Lấy thông tin dung lượng Drive
 */
export const getDriveStorageQuota = async (): Promise<DriveStorageInfo | null> => {
    if (!accessToken) return null;
    try {
        const response = await fetch('https://www.googleapis.com/drive/v3/about?fields=storageQuota', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await response.json();
        if (data.storageQuota) {
            return {
                limit: parseInt(data.storageQuota.limit),
                usage: parseInt(data.storageQuota.usage),
                usageInDrive: parseInt(data.storageQuota.usageInDrive),
                usageInTrash: parseInt(data.storageQuota.usageInTrash),
            };
        }
        return null;
    } catch (e) {
        console.error("Lỗi lấy quota drive:", e);
        return null;
    }
};

/**
 * NEW: Tìm hoặc tạo thư mục Backup cho Nhóm
 * Tên thư mục: "[GROUP_NAME]-data upload"
 */
export const ensureGroupFolder = async (groupName: string): Promise<string | null> => {
    if (!accessToken) return null;
    const folderName = `${groupName}-data upload`;

    try {
        // 1. Tìm xem folder đã tồn tại chưa
        const q = `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName}' and trashed = false`;
        const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}`, {
             headers: { Authorization: `Bearer ${accessToken}` },
        });
        const searchData = await searchRes.json();

        if (searchData.files && searchData.files.length > 0) {
            return searchData.files[0].id;
        }

        // 2. Nếu chưa có, tạo mới
        const metadata = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
        };
        
        const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: { 
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(metadata)
        });
        
        const createData = await createRes.json();
        return createData.id;

    } catch (e) {
        console.error(`Lỗi tạo folder ${folderName}:`, e);
        return null;
    }
};