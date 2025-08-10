import React from 'react';

/**
 * Scroll Area Component - Simple scrollable container
 */
export const ScrollArea = ({ children, className = '', ...props }) => {
  return (
    <div 
      className={`overflow-auto ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default ScrollArea;