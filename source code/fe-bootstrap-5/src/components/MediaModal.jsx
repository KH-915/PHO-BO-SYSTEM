import React from 'react';

export default function MediaModal({ mediaUrl, mediaType, onClose }) {
  if (!mediaUrl) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" 
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        zIndex: 9999,
        cursor: 'pointer'
      }}
      onClick={handleBackdropClick}
    >
      {/* Close Button */}
      <button
        className="btn btn-light position-absolute top-0 end-0 m-3"
        style={{ zIndex: 10000 }}
        onClick={onClose}
      >
        <i className="bi bi-x-lg text-black"></i> Đóng
      </button>

      {/* Media Content */}
      <div 
        className="position-relative"
        style={{
          maxWidth: '75vw',
          maxHeight: '75vh',
          cursor: 'default'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {mediaType?.startsWith('image/') ? (
          <img 
            src={mediaUrl} 
            alt="zoomed" 
            className="img-fluid"
            style={{
              maxWidth: '75vw',
              maxHeight: '75vh',
              objectFit: 'contain'
            }}
          />
        ) : mediaType?.startsWith('video/') ? (
          <video 
            src={mediaUrl} 
            controls 
            autoPlay
            style={{
              maxWidth: '75vw',
              maxHeight: '75vh',
              objectFit: 'contain'
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
