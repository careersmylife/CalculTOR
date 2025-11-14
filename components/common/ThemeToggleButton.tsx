import React from 'react';

interface ThemeToggleButtonProps {
  theme: 'light' | 'dark';
  onToggle: () => void;
}

const ThemeToggleButton = ({ theme, onToggle }: ThemeToggleButtonProps) => {
  return (
    <button
      onClick={onToggle}
      className="p-2 rounded-full text-text-secondary dark:text-[#BDBDBD] hover:bg-highlight dark:hover:bg-[#4F4F4F] focus:outline-none focus:ring-2 focus:ring-accent"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <i className="fas fa-moon text-lg"></i>
      ) : (
        <i className="fas fa-sun text-lg text-yellow-400"></i>
      )}
    </button>
  );
};

export default ThemeToggleButton;
