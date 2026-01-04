import Image from 'next/image'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  className?: string
}

const sizeMap = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-32 h-32',
}

export default function Logo({ size = 'md', showText = false, className = '' }: LogoProps) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className={`relative ${sizeMap[size]} ${showText ? 'mb-6' : ''}`}>
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
          <h1 className="text-2xl font-bold text-amber-900 mb-2">
            WIMUTISASSTR
          </h1>
          <p className="text-sm text-amber-700 mb-1">Law Office</p>
          <p className="text-xs text-amber-600">ការិយាល័យមេធាវី វិមុត្តិសាស្ត្រ</p>
        </>
      )}
    </div>
  )
}


