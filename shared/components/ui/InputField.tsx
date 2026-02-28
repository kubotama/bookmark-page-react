import React from 'react'

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  id: string
}

export const InputField = ({
  label,
  id,
  className = '',
  ...props
}: InputFieldProps) => {
  return (
    <div className="flex items-center gap-4">
      <label
        htmlFor={id}
        className="w-12 text-xs font-medium text-gray-500 uppercase tracking-wider"
      >
        {label}
      </label>
      <input
        id={id}
        className={`flex-1 px-2 py-1 bg-blue-50 border-2 border-solid border-gray-500 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${className}`}
        {...props}
      />
    </div>
  )
}
