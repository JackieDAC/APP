import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { Message } from '../types';

let chatSession: Chat | null = null;

// Initialize the Gemini client
const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY is missing via process.env.API_KEY");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Sends a message to the Gemini AI and returns the response text.
 * Maintains a chat session in memory.
 */
export const sendMessageToGemini = async (
  userMessage: string, 
  history: Message[]
): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "Lỗi: Chưa cấu hình API Key.";

  try {
    // Initialize chat session if it doesn't exist
    if (!chatSession) {
      chatSession = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
          systemInstruction: "Bạn là Trợ lý ảo thông minh của ứng dụng nhắn tin DALO (lấy cảm hứng từ Zalo). Bạn hãy trả lời ngắn gọn, thân thiện, lịch sự và hữu ích bằng tiếng Việt. Nếu người dùng hỏi về DALO, hãy nói đây là ứng dụng nhắn tin ưu việt.",
        },
      });
    }

    // Send the message
    const response: GenerateContentResponse = await chatSession.sendMessage({ 
      message: userMessage 
    });

    return response.text || "Xin lỗi, tôi không thể trả lời ngay lúc này.";

  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Đã xảy ra lỗi kết nối với máy chủ AI.";
  }
};
