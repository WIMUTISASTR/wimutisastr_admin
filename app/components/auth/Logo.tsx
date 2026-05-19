import Image from 'next/image'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  className?: string
}

const sizeMap = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-28 h-28',
}

export default function Logo({ size = 'md', showText = false, className = '' }: LogoProps) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className={`relative ${sizeMap[size]} ${showText ? 'mb-4' : ''}`}>
        <Image
          src="/logo/logo.png"
          alt="WIMUTISASSTR Law Office Logo"
          fill
          className="object-contain"
          priority={size === 'lg'}
        />
      </div>
      {showText && (
        <>
          <h1 className="text-2xl font-bold text-navy-800 mb-1 font-heading tracking-tight">
            WIMUTISASSTR
          </h1>
          <p className="text-sm text-navy-600 mb-0.5">Law Office</p>
          <p className="text-xs text-slate-500">ការិយាល័យមេធាវី វិមុត្តិសាស្ត្រ</p>
        </>
      )}
    </div>
  )
}
