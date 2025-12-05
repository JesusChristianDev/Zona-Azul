"use client"

import { ReactNode } from 'react'

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'muted'
  | 'muted-outline'
  | 'outline'
  | 'ghost'
  | 'success'
  | 'danger'
  | 'warning'
  | 'soft-success'
  | 'soft-warning'
  | 'soft-danger'
  | 'link'

interface ActionButtonProps {
  onClick?: () => void
  children: ReactNode
  variant?: ButtonVariant
  size?: 'sm' | 'md' | 'lg'
  icon?: ReactNode
  fullWidth?: boolean
  className?: string
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
}

/**
 * Botón de acción reutilizable y responsive
 */
export default function ActionButton({
  onClick,
  children,
  variant = 'primary',
  size = 'md',
  icon,
  fullWidth = false,
  className = '',
  type = 'button',
  disabled = false,
}: ActionButtonProps) {
  const variantClasses: Record<ButtonVariant, string> = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    muted: 'btn-muted',
    'muted-outline': 'btn-muted-outline',
    outline: 'btn-outline',
    ghost: 'btn-ghost',
    success: 'btn-success',
    danger: 'btn-danger',
    warning: 'btn-warning',
    'soft-success': 'btn-soft-success',
    'soft-warning': 'btn-soft-warning',
    'soft-danger': 'btn-soft-danger',
    link: 'btn-link',
  }

  const sizeClasses: Record<'sm' | 'md' | 'lg', string> = {
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg',
  }

  const widthClass = fullWidth ? 'w-full sm:w-auto' : ''

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={['btn', variantClasses[variant], sizeClasses[size], widthClass, className].filter(Boolean).join(' ')}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
    </button>
  )
}

