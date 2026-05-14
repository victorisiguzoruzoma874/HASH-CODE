import React from 'react'

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string
  prefix?: React.ReactNode
  suffix?: React.ReactNode
  error?: string
}

export const Input: React.FC<InputProps> = ({
  label,
  prefix,
  suffix,
  error,
  className = '',
  ...props
}) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-[11px] font-medium tracking-[0.08em] uppercase text-[#94A3B8]">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {prefix && (
          <div className="absolute left-3 text-[#94A3B8] flex items-center pointer-events-none">
            {prefix}
          </div>
        )}
        <input
          className={`
            w-full bg-[#1A2235] border border-white/10 rounded-[10px]
            text-white text-sm placeholder-[#4B5563]
            py-2.5 transition-all duration-150
            ${prefix ? 'pl-10' : 'pl-3'}
            ${suffix ? 'pr-20' : 'pr-3'}
            ${error ? 'border-[#EF4444]' : ''}
            ${className}
          `}
          {...props}
        />
        {suffix && (
          <div className="absolute right-3 flex items-center">
            {suffix}
          </div>
        )}
      </div>
      {error && <p className="text-[#EF4444] text-xs">{error}</p>}
    </div>
  )
}
