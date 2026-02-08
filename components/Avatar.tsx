import { ProfileIcon } from './Icons'

type AvatarProps = {
  src?: string | null
  alt?: string
  size?: number
}

export default function Avatar({ src, alt = 'avatar', size = 44 }: AvatarProps) {
  const hasSrc = Boolean(src)

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        background: '#e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {hasSrc ? (
        <img src={src as string} alt={alt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <ProfileIcon size={Math.max(16, Math.floor(size * 0.55))} color="#9ca3af" />
      )}
    </div>
  )
}
