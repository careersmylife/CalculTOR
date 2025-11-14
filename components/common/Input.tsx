
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  unit?: string;
}

const Input: React.FC<InputProps> = ({ label, unit, id, ...props }) => {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-text-secondary dark:text-[#BDBDBD] mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          className="w-full bg-primary border border-highlight rounded-lg px-4 py-3 text-text-primary focus:ring-2 focus:ring-accent focus:outline-none transition-shadow appearance-none dark:bg-[#0D0D0D] dark:border-[#4F4F4F] dark:text-[#F2F2F2]"
          {...props}
        />
        {unit && (
          <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-text-secondary text-sm dark:text-[#BDBDBD]">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
};

export default Input;
