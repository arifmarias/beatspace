import React from 'react';

const LoadingSpinner = ({ message = "Loading...", size = "large", showMessage = true }) => {
  const sizeClasses = {
    small: "w-8 h-8",
    medium: "w-12 h-12", 
    large: "w-16 h-16",
    xlarge: "w-24 h-24"
  };

  const messageSizes = {
    small: "text-sm",
    medium: "text-base",
    large: "text-lg",
    xlarge: "text-xl"
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="flex flex-col items-center space-y-4">
        {/* Animated BeatSpace Logo */}
        <div className={`relative ${sizeClasses[size]}`}>
          <img 
            src="https://customer-assets.emergentagent.com/job_campaign-nexus-4/artifacts/tui73r6o_BeatSpace%20Icon%20Only.png"
            alt="BeatSpace Logo" 
            className={`${sizeClasses[size]} animate-pulse`}
          />
          
          {/* Spinning circle around logo */}
          <div className={`absolute inset-0 ${sizeClasses[size]} border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin`}></div>
          
          {/* Pulsing outer ring */}
          <div className={`absolute inset-0 ${sizeClasses[size]} border-2 border-purple-300 rounded-full animate-ping opacity-20`}></div>
        </div>
        
        {/* Loading Message */}
        {showMessage && (
          <div className="text-center space-y-2">
            <p className={`font-semibold text-gray-700 ${messageSizes[size]}`}>
              {message}
            </p>
            <div className="flex justify-center space-x-1">
              <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Full screen overlay loading
export const FullScreenLoading = ({ message = "Loading BeatSpace..." }) => {
  return <LoadingSpinner message={message} size="xlarge" />;
};

// Dashboard loading
export const DashboardLoading = ({ type = "dashboard" }) => {
  const messages = {
    dashboard: "Loading Dashboard...",
    buyer: "Loading Buyer Dashboard...", 
    admin: "Loading Admin Dashboard...",
    seller: "Loading Seller Dashboard...",
    marketplace: "Loading Marketplace...",
    campaigns: "Loading Campaigns...",
    assets: "Loading Assets..."
  };
  
  return <LoadingSpinner message={messages[type] || messages.dashboard} size="large" />;
};

// Inline loading (smaller, for components)
export const InlineLoading = ({ message = "Loading..." }) => {
  return (
    <div className="flex items-center justify-center p-4">
      <LoadingSpinner message={message} size="medium" />
    </div>
  );
};

// Button loading (for form submissions)
export const ButtonLoading = () => {
  return (
    <div className="flex items-center space-x-2">
      <div className="w-4 h-4 relative">
        <img 
          src="https://customer-assets.emergentagent.com/job_campaign-nexus-4/artifacts/tui73r6o_BeatSpace%20Icon%20Only.png"
          alt="Loading" 
          className="w-4 h-4 animate-spin"
        />
      </div>
      <span>Processing...</span>
    </div>
  );
};

export default LoadingSpinner;