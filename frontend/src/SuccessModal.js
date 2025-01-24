import React from 'react';

const SuccessModal = ({ isOpen, message = "Purchase successful!", onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full mx-4">
        <p className="text-gray-800 font-medium mb-6">{message}</p>
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-[#67cad8] hover:bg-[#5ab5c2] text-white rounded-md font-medium transition-colors"
        >
          OK
        </button>
      </div>
    </div>
  );
};

export default SuccessModal;
