type IconProps = {
  size?: number
  color?: string
  strokeWidth?: number
}

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function SearchIcon({ size = 20, color, strokeWidth = 2 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ color }}>
      <circle cx="11" cy="11" r="8"></circle>
      <path d="m21 21-4.35-4.35"></path>
    </svg>
  )
}

export function SearchButtonIcon({ size = 16, color, strokeWidth = 2.5 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ color }}>
      <circle cx="11" cy="11" r="8"></circle>
      <path d="m21 21-4.35-4.35"></path>
    </svg>
  )
}

export function UsersIcon({ size = 16, color, strokeWidth = 2 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ color }} {...base} strokeWidth={strokeWidth}>
      <circle cx="9" cy="7" r="4" />
      <path d="M3 21v-1a4 4 0 0 1 4-4h4" />
      <circle cx="17" cy="7" r="3" />
      <path d="M14 20v-1a3 3 0 0 1 3-3h1" />
    </svg>
  )
}

export function MailIcon({ size = 16, color, strokeWidth = 2 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ color }} {...base} strokeWidth={strokeWidth}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  )
}

export function PlusIcon({ size = 16, color, strokeWidth = 2 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ color }} {...base} strokeWidth={strokeWidth}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  )
}

export function ProfileIcon({ size = 20, color, strokeWidth = 2 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ color }} {...base} strokeWidth={strokeWidth}>
      <circle cx="12" cy="8" r="4" />
      <path d="M6 20v-1a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1" />
    </svg>
  )
}

export function ArrowLeftIcon({ size = 18, color, strokeWidth = 2 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ color }} {...base} strokeWidth={strokeWidth}>
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  )
}

export function ChevronLeftIcon({ size = 18, color, strokeWidth = 2 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ color }} {...base} strokeWidth={strokeWidth}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

export function ChevronRightIcon({ size = 18, color, strokeWidth = 2 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ color }} {...base} strokeWidth={strokeWidth}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

export function LoaderIcon({ size = 18, color, strokeWidth = 2 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ color }} {...base} strokeWidth={strokeWidth}>
      <path d="M12 2a10 10 0 1 0 10 10" />
    </svg>
  )
}

export function SaveIcon({ size = 18, color, strokeWidth = 2 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ color }} {...base} strokeWidth={strokeWidth}>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <path d="M17 21v-8H7v8" />
      <path d="M7 3v5h8" />
    </svg>
  )
}

export function LogInIcon({ size = 18, color, strokeWidth = 2 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ color }} {...base} strokeWidth={strokeWidth}>
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
    </svg>
  )
}

export function LogOutIcon({ size = 18, color, strokeWidth = 2 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ color }} {...base} strokeWidth={strokeWidth}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  )
}

export function TrashIcon({ size = 18, color, strokeWidth = 2 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ color }} {...base} strokeWidth={strokeWidth}>
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  )
}

export function UserPlusIcon({ size = 18, color, strokeWidth = 2 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ color }} {...base} strokeWidth={strokeWidth}>
      <circle cx="9" cy="8" r="4" />
      <path d="M3 20v-1a4 4 0 0 1 4-4h4" />
      <path d="M16 8v6" />
      <path d="M13 11h6" />
    </svg>
  )
}

export function UserMinusIcon({ size = 18, color, strokeWidth = 2 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ color }} {...base} strokeWidth={strokeWidth}>
      <circle cx="9" cy="8" r="4" />
      <path d="M3 20v-1a4 4 0 0 1 4-4h4" />
      <path d="M13 11h6" />
    </svg>
  )
}

export function CheckIcon({ size = 18, color, strokeWidth = 2 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ color }} {...base} strokeWidth={strokeWidth}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

export function XIcon({ size = 18, color, strokeWidth = 2 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ color }} {...base} strokeWidth={strokeWidth}>
      <path d="M18 6L6 18" />
      <path d="M6 6l12 12" />
    </svg>
  )
}

export function MoreHorizontalIcon({ size = 18, color, strokeWidth = 2 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ color }} {...base} strokeWidth={strokeWidth}>
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </svg>
  )
}

export function BellIcon({ size = 18, color, strokeWidth = 2 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ color }} {...base} strokeWidth={strokeWidth}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

export function TeamsIcon({ size = 18, color, strokeWidth = 2 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ color }} {...base} strokeWidth={strokeWidth}>
      <rect x="3" y="3" width="18" height="18" rx="3" ry="3" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M8 8v8M8 8l-3 3M8 8l3 3" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="16" cy="8" r="2" fill="currentColor"/>
      <path d="M16 10v6M14 12h4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <circle cx="6" cy="16" r="1.5" fill="currentColor"/>
      <path d="M6 17.5v2M4 18.5h4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    </svg>
  )
}

export function GoogleMeetIcon({ size = 18, color, strokeWidth = 2 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ color }} {...base} strokeWidth={strokeWidth}>
      <rect x="2" y="2" width="20" height="20" rx="4" ry="4" />
      <path d="M8 12h8" />
      <circle cx="6" cy="12" r="2" fill="currentColor" />
      <circle cx="18" cy="12" r="2" fill="currentColor" />
      <path d="M12 6v12" />
      <path d="M9 9h6v6h-6z" fill="currentColor" />
    </svg>
  )
}
