import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, icon, children }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 transition-opacity"
      onClick={onClose}
    >
      <div 
        className="bg-secondary dark:bg-[#1A1A1A] rounded-xl shadow-lg w-full max-w-md m-4 transform transition-transform animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-highlight dark:border-[#4F4F4F]">
          <div className="flex items-center">
            {icon && <i className={`${icon} text-accent text-xl mr-3`}></i>}
            <h3 className="text-lg font-semibold text-text-primary dark:text-[#F2F2F2]">{title}</h3>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary dark:text-[#BDBDBD] dark:hover:text-[#F2F2F2]">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
       <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default Modal;
