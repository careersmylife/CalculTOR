import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  children: React.ReactNode;
  // FIX: Add optional 'id' to fix type error on destructuring.
  id?: string;
}

const Select = ({ label, children, id, ...props }: SelectProps) => {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-text-secondary dark:text-[#BDBDBD] mb-1">
        {label}
      </label>
      <select
        id={id}
        className="w-full bg-primary border border-highlight rounded-lg px-4 py-3 text-text-primary focus:ring-2 focus:ring-accent focus:outline-none transition-shadow appearance-none dark:bg-[#0D0D0D] dark:border-[#4F4F4F] dark:text-[#F2F2F2]"
        {...props}
      >
        {children}
      </select>
    </div>
  );
};

export default Select;