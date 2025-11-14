import React from 'react';

// FIX: Refactor to a type alias with an intersection to properly inherit all button attributes like onClick, disabled, etc.
type ButtonProps = {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
} & React.ComponentPropsWithoutRef<'button'>;

const Button = ({ children, variant = 'primary', className = '', ...props }: ButtonProps) => {
  const baseClasses = 'px-6 py-3 font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-primary dark:focus:ring-offset-[#0D0D0D]';
  const variantClasses = {
    primary: 'bg-accent text-white hover:bg-blue-500 focus:ring-accent',
    secondary: 'bg-highlight text-text-primary hover:brightness-95 focus:ring-highlight dark:bg-[#4F4F4F] dark:text-[#F2F2F2] dark:focus:ring-[#4F4F4F]',
  };

  return (
    <button className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export default Button;