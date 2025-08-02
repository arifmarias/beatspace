import React, { createContext, useContext, useState } from 'react';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';

// Notification Context
const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

// Notification Provider Component
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = (message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    const notification = { id, message, type, duration };
    
    setNotifications(prev => [...prev, notification]);
    
    if (duration > 0) {
      setTimeout(() => removeNotification(id), duration);
    }
    
    return id;
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  // Enhanced notification methods
  const notify = {
    success: (message, duration = 4000) => addNotification(message, 'success', duration),
    error: (message, duration = 6000) => addNotification(message, 'error', duration),
    warning: (message, duration = 5000) => addNotification(message, 'warning', duration),
    info: (message, duration = 4000) => addNotification(message, 'info', duration),
  };

  return (
    <NotificationContext.Provider value={{ notify, removeNotification }}>
      {children}
      <NotificationContainer notifications={notifications} removeNotification={removeNotification} />
    </NotificationContext.Provider>
  );
};

// Notification Container Component
const NotificationContainer = ({ notifications, removeNotification }) => {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="flex flex-col items-center space-y-4 pointer-events-auto max-w-md w-full mx-4">
        {notifications.map(notification => (
          <NotificationItem 
            key={notification.id} 
            notification={notification} 
            onRemove={removeNotification} 
          />
        ))}
      </div>
    </div>
  );
};

// Individual Notification Component
const NotificationItem = ({ notification, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  React.useEffect(() => {
    // Animate in
    setTimeout(() => setIsVisible(true), 10);
  }, []);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => onRemove(notification.id), 300);
  };

  const getNotificationStyle = () => {
    switch (notification.type) {
      case 'success':
        return {
          bg: 'bg-gradient-to-r from-green-500 to-green-600',
          border: 'border-green-300',
          text: 'text-white',
          shadow: 'shadow-green-200'
        };
      case 'error':
        return {
          bg: 'bg-gradient-to-r from-red-500 to-red-600',
          border: 'border-red-300',
          text: 'text-white',
          shadow: 'shadow-red-200'
        };
      case 'warning':
        return {
          bg: 'bg-gradient-to-r from-yellow-500 to-orange-500',
          border: 'border-yellow-300',
          text: 'text-white',
          shadow: 'shadow-yellow-200'
        };
      default:
        return {
          bg: 'bg-gradient-to-r from-blue-500 to-blue-600',
          border: 'border-blue-300',
          text: 'text-white',
          shadow: 'shadow-blue-200'
        };
    }
  };

  const getIcon = () => {
    const iconClass = "w-6 h-6 text-white";
    switch (notification.type) {
      case 'success':
        return <CheckCircle className={iconClass} />;
      case 'error':
        return <AlertCircle className={iconClass} />;
      case 'warning':
        return <AlertTriangle className={iconClass} />;
      default:
        return <Info className={iconClass} />;
    }
  };

  const styles = getNotificationStyle();

  return (
    <div 
      className={`
        transform transition-all duration-300 ease-out w-full
        ${isVisible && !isLeaving ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-2 opacity-0 scale-95'}
        ${styles.bg} ${styles.border} ${styles.text}
        rounded-xl shadow-lg border backdrop-blur-sm
        ${styles.shadow} shadow-xl
      `}
    >
      <div className="p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-5 text-white">
              {notification.message}
            </p>
          </div>
          <div className="flex-shrink-0">
            <button
              onClick={handleClose}
              className="inline-flex text-white/80 hover:text-white focus:outline-none focus:text-white transition ease-in-out duration-200 rounded-full p-1 hover:bg-white/20"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationProvider;