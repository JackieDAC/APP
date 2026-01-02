import React, { useState } from 'react';
import { X, Users, QrCode } from 'lucide-react';

interface CreateGroupModalProps {
  onClose: () => void;
  onCreate: (name: string) => void;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ onClose, onCreate }) => {
  const [groupName, setGroupName] = useState('');

  const handleCreate = () => {
    if (groupName.trim()) {
      onCreate(groupName);
      onClose();
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-gray-800 text-lg flex items-center">
            <Users className="w-5 h-5 mr-2 text-blue-600" />
            Tạo nhóm mới
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tên nhóm</label>
            <input 
              type="text" 
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Nhập tên nhóm của bạn..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-base"
              autoFocus
            />
          </div>

          <div className="bg-blue-50 p-4 rounded-xl flex items-start space-x-3">
             <div className="bg-white p-2 rounded-lg text-blue-600 shadow-sm">
                 <QrCode className="w-6 h-6" />
             </div>
             <div>
                 <h4 className="font-semibold text-blue-900 text-sm">Kết nối bằng QR Code</h4>
                 <p className="text-blue-700 text-xs mt-1 leading-relaxed">
                    Bạn không cần thêm thành viên ngay lúc này. Sau khi tạo, hãy chia sẻ mã QR của nhóm để mời mọi người tham gia.
                 </p>
             </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-lg mr-2 transition-colors"
          >
            Hủy
          </button>
          <button 
            onClick={handleCreate}
            disabled={!groupName.trim()}
            className={`px-6 py-2 rounded-lg font-bold text-white transition-all shadow-md ${
              groupName.trim() 
                ? 'bg-blue-600 hover:bg-blue-700 transform hover:scale-105' 
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            Tạo nhóm
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupModal;