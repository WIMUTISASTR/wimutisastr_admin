'use client'

import { ComponentProps, ReactNode } from 'react'

type SvgProps = Omit<ComponentProps<'svg'>, 'children'>

interface IconProps extends SvgProps {
  title?: string
  children?: ReactNode
}

function BaseIcon({
  title,
  children,
  className = 'w-5 h-5',
  viewBox = '0 0 24 24',
  fill = 'none',
  stroke = 'currentColor',
  ...props
}: IconProps) {
  const ariaHidden = title ? undefined : true
  const ariaLabel = title ? title : undefined

  return (
    <svg
      className={className}
      viewBox={viewBox}
      fill={fill}
      stroke={stroke}
      aria-hidden={ariaHidden}
      aria-label={ariaLabel}
      {...props}
    >
      {children}
    </svg>
  )
}

export const UIIcons = {
  Close: (props: IconProps) => (
    <BaseIcon {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </BaseIcon>
  ),

  Plus: (props: IconProps) => (
    <BaseIcon {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </BaseIcon>
  ),

  ChevronDown: (props: IconProps) => (
    <BaseIcon {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </BaseIcon>
  ),

  DotsVertical: (props: IconProps) => (
    <BaseIcon {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
      />
    </BaseIcon>
  ),

  Edit: (props: IconProps) => (
    <BaseIcon {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </BaseIcon>
  ),

  Delete: (props: IconProps) => (
    <BaseIcon {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </BaseIcon>
  ),
}


