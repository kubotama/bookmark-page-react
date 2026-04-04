import { type InputHTMLAttributes } from 'react'

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  id: string
  width?: string
}

export const InputField = ({
  label,
  id,
  width = 'w-12',
  className = '',
  ...props
}: InputFieldProps) => {
  return (
    <div className="flex items-center gap-4">
      <label
        htmlFor={id}
        className={`text-xs font-medium text-gray-500 uppercase tracking-wider ${width}`}
      >
        {label}
      </label>
      <input
        id={id}
        className={`flex-1 px-2 py-1 bg-blue-50 text-gray-900 border-2 border-solid border-gray-500 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${className}`}
        {...props}
      />
    </div>
  )
}
