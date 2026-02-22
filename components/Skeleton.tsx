import type { CSSProperties } from 'react'

type SkeletonProps = {
  className?: string
  style?: CSSProperties
}

export default function Skeleton({ className = '', style }: SkeletonProps) {
  return <div aria-hidden="true" className={`rn-skeleton ${className}`.trim()} style={style} />
}
