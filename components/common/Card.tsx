import React from 'react';

interface CardProps {
  title: string;
  icon: string;
  // FIX: Make children optional to resolve type errors.
  children?: React.ReactNode;
  className?: string;
}

const Card = ({ title, icon, children, className = '' }: CardProps) => {
  return (
    <div className={`bg-secondary rounded-xl shadow-lg p-6 dark:bg-[#1A1A1A] ${className}`}>
      <div className="flex items-center mb-4">
        <i className={`${icon} text-accent text-xl mr-3`}></i>
        <h3 className="text-lg font-semibold text-text-primary dark:text-[#F2F2F2]">{title}</h3>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
};

export default Card;