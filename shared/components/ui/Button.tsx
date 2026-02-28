import React from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
type ButtonSize = 'small' | 'medium'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  children: React.ReactNode
}

export const Button = ({
  variant = 'primary',
  size = 'small',
  children,
  className = '',
  ...props
}: ButtonProps) => {
  const sizeStyles: Record<ButtonSize, string> = {
    small: 'h-5 px-1 text-[10px] transform scale-90 origin-right',
    medium: 'h-10 px-4 text-xs',
  }

  const baseStyles = `w-full rounded-md font-bold transition-colors shadow-sm leading-none uppercase flex items-center justify-center ${sizeStyles[size]}`

  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-blue-600 text-white border border-blue-700 hover:bg-blue-700 shadow-sm',
    secondary:
      'bg-gray-100 text-gray-700 border border-gray-400 hover:bg-gray-200',
    danger: 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100',
    ghost: 'text-gray-400 hover:text-gray-600 shadow-none',
  }

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
