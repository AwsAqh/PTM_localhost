import React, { useEffect } from 'react';
import '../styles/notification.css';

const Notification = ({ message, type, onClose, actions }) => {
  useEffect(() => {
    if (type !== 'loading') {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [type, onClose]);

  console.log('Notification props:', { message, type, actions }); // Debug log
  return (
    <div className={`notification ${type}`}>
      <div className={`notification-content ${type}`}>
        <span className={`notification-message ${type === 'loading' ? 'loading' : ''}`}>
          {message}
        </span>
        {actions && actions.length > 0 && (
          <div className="notification-actions">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                className={`notification-button ${action.type || 'secondary'}`}
              >
                {action.label}
              </button>
            ))}
            <button onClick={onClose} className="close-button">&times;</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notification; 