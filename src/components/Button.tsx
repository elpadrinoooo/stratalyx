import React from 'react'
import { C, R } from '../constants/colors'

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'warn'
type Size = 'sm' | 'md' | 'lg'

interface Props extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: Variant
  size?: Size
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  loading?: boolean
  fullWidth?: boolean
  children?: React.ReactNode
}

const SIZE_STYLES: Record<Size, React.CSSProperties> = {
  sm: { fontSize: 12, padding: '5px 10px', gap: 5 },
  md: { fontSize: 13, padding: '7px 14px', gap: 6 },
  lg: { fontSize: 15, padding: '9px 18px', gap: 7 },
}

interface VariantTokens {
  base:  React.CSSProperties
  hover: React.CSSProperties
}

function variantTokens(v: Variant): VariantTokens {
  switch (v) {
    case 'primary':
      return {
        base:  { background: C.accent, color: 'var(--c-fg-on-accent, #fff)', border: '1px solid transparent' },
        hover: { opacity: 0.9 },
      }
    case 'secondary':
      return {
        base:  { background: C.bg2, color: C.t2, border: `1px solid ${C.border}` },
        hover: { borderColor: C.accentB, color: C.t1 },
      }
    case 'ghost':
      return {
        base:  { background: 'transparent', color: C.t2, border: '1px solid transparent' },
        hover: { background: C.bg2, color: C.t1 },
      }
    case 'destructive':
      return {
        base:  { background: 'transparent', color: C.t3, border: `1px solid ${C.border}` },
        hover: { borderColor: C.lossB, color: C.loss },
      }
    case 'warn':
      return {
        base:  { background: C.warnBg, color: C.warn, border: `1px solid ${C.warnB}` },
        hover: { opacity: 0.85 },
      }
  }
}

/**
 * Shared button component with semantic variants.
 * Variants: primary | secondary | ghost | destructive | warn
 * Sizes: sm | md | lg
 *
 * Hover effects are handled internally via onMouseEnter/Leave so consumers
 * don't reinvent them. Pass `icon` for an adjacent lucide-react icon.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  fullWidth = false,
  disabled,
  children,
  style,
  onMouseEnter,
  onMouseLeave,
  ...rest
}: Props) {
  const tokens = variantTokens(variant)
  const isDisabled = disabled || loading

  return (
    <button
      {...rest}
      disabled={isDisabled}
      onMouseEnter={(e) => {
        if (!isDisabled) Object.assign(e.currentTarget.style, tokens.hover)
        onMouseEnter?.(e)
      }}
      onMouseLeave={(e) => {
        if (!isDisabled) {
          // Restore base values for the keys hover touched
          const target = e.currentTarget
          for (const key of Object.keys(tokens.hover)) {
            const baseVal = (tokens.base as Record<string, unknown>)[key]
            ;(target.style as unknown as Record<string, unknown>)[key] = baseVal ?? ''
          }
          target.style.opacity = '1'
        }
        onMouseLeave?.(e)
      }}
      style={{
        ...tokens.base,
        ...SIZE_STYLES[size],
        borderRadius: R.r8,
        fontWeight: 600,
        fontFamily: C.sans,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.5 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: fullWidth ? '100%' : undefined,
        transition: 'opacity .15s, border-color .15s, background .15s, color .15s',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {iconPosition === 'left' && icon}
      {loading ? 'Loading…' : children}
      {iconPosition === 'right' && icon}
    </button>
  )
}
