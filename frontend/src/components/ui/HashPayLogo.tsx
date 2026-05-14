import React from 'react'

interface HashPayLogoProps {
  /** icon + wordmark */
  variant?: 'full' | 'icon' | 'wordmark'
  /** height of the icon mark in px */
  size?: number
  className?: string
}

// ── Icon mark only (globe + H + pixels) ──────────────────────
export const HashPayIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 40,
  className = '',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="HashPay icon"
  >
    <defs>
      {/* Main globe gradient — deep blue → cyan */}
      <radialGradient id="globeGrad" cx="40%" cy="35%" r="65%">
        <stop offset="0%"   stopColor="#00C8E0" />
        <stop offset="50%"  stopColor="#1565C0" />
        <stop offset="100%" stopColor="#0D3B8C" />
      </radialGradient>

      {/* Orbital ring gradient */}
      <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%"   stopColor="#00E5FF" stopOpacity="0.9" />
        <stop offset="100%" stopColor="#1565C0" stopOpacity="0.5" />
      </linearGradient>

      {/* H letter gradient */}
      <linearGradient id="hGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%"   stopColor="#FFFFFF" />
        <stop offset="100%" stopColor="#B3E5FC" />
      </linearGradient>

      {/* Pixel dots gradient */}
      <linearGradient id="pixelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%"   stopColor="#00E5FF" />
        <stop offset="100%" stopColor="#1565C0" />
      </linearGradient>

      <clipPath id="globeClip">
        <circle cx="44" cy="52" r="36" />
      </clipPath>
    </defs>

    {/* ── Globe body ── */}
    <circle cx="44" cy="52" r="36" fill="url(#globeGrad)" />

    {/* ── Latitude lines (subtle) ── */}
    <g clipPath="url(#globeClip)" opacity="0.25">
      <ellipse cx="44" cy="52" rx="36" ry="12" stroke="#00E5FF" strokeWidth="1.2" fill="none" />
      <ellipse cx="44" cy="52" rx="36" ry="22" stroke="#00E5FF" strokeWidth="0.8" fill="none" />
      <ellipse cx="44" cy="52" rx="36" ry="32" stroke="#00E5FF" strokeWidth="0.6" fill="none" />
    </g>

    {/* ── Longitude lines (subtle) ── */}
    <g clipPath="url(#globeClip)" opacity="0.2">
      <ellipse cx="44" cy="52" rx="14" ry="36" stroke="#00E5FF" strokeWidth="0.8" fill="none" />
      <ellipse cx="44" cy="52" rx="26" ry="36" stroke="#00E5FF" strokeWidth="0.6" fill="none" />
    </g>

    {/* ── Orbital ring (sweeping arc around globe) ── */}
    {/* Back arc */}
    <ellipse
      cx="44" cy="68"
      rx="42" ry="11"
      stroke="url(#ringGrad)"
      strokeWidth="3.5"
      fill="none"
      strokeDasharray="80 50"
      strokeDashoffset="0"
      opacity="0.5"
      transform="rotate(-12 44 68)"
    />
    {/* Front arc — brighter */}
    <ellipse
      cx="44" cy="68"
      rx="42" ry="11"
      stroke="url(#ringGrad)"
      strokeWidth="4"
      fill="none"
      strokeDasharray="55 75"
      strokeDashoffset="55"
      transform="rotate(-12 44 68)"
    />

    {/* ── "H" lettermark ── */}
    <g filter="url(#hShadow)">
      {/* Left vertical bar */}
      <rect x="28" y="34" width="9" height="36" rx="2" fill="url(#hGrad)" />
      {/* Right vertical bar */}
      <rect x="51" y="34" width="9" height="36" rx="2" fill="url(#hGrad)" />
      {/* Crossbar */}
      <rect x="28" y="48" width="32" height="8" rx="2" fill="url(#hGrad)" />
    </g>

    {/* ── Pixel / data dots (top-right of globe) ── */}
    {/* Large square */}
    <rect x="72" y="18" width="8"  height="8"  rx="1.5" fill="url(#pixelGrad)" opacity="0.95" />
    {/* Medium square */}
    <rect x="82" y="12" width="6"  height="6"  rx="1"   fill="url(#pixelGrad)" opacity="0.75" />
    {/* Small square */}
    <rect x="78" y="8"  width="4"  height="4"  rx="0.8" fill="url(#pixelGrad)" opacity="0.55" />
    {/* Tiny dot */}
    <rect x="86" y="20" width="3"  height="3"  rx="0.6" fill="#00E5FF"         opacity="0.45" />

    {/* ── Subtle gloss highlight on globe ── */}
    <ellipse cx="36" cy="38" rx="12" ry="8" fill="white" opacity="0.08" transform="rotate(-20 36 38)" />
  </svg>
)

// ── Full logo: icon + "HashPay" wordmark + "GLOBAL" ───────────
export const HashPayLogo: React.FC<HashPayLogoProps> = ({
  variant = 'full',
  size = 40,
  className = '',
}) => {
  if (variant === 'icon') return <HashPayIcon size={size} className={className} />

  if (variant === 'wordmark') {
    return (
      <svg
        height={size * 0.6}
        viewBox="0 0 220 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="HashPay Global"
      >
        <defs>
          <linearGradient id="hashGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#1565C0" />
            <stop offset="100%" stopColor="#1565C0" />
          </linearGradient>
          <linearGradient id="payGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#00C8E0" />
            <stop offset="100%" stopColor="#00E5FF" />
          </linearGradient>
        </defs>
        <text x="0" y="34" fontFamily="Inter, sans-serif" fontWeight="700" fontSize="36" fill="url(#hashGrad)">Hash</text>
        <text x="88" y="34" fontFamily="Inter, sans-serif" fontWeight="700" fontSize="36" fill="url(#payGrad)">Pay</text>
        <text x="2" y="48" fontFamily="Inter, sans-serif" fontWeight="500" fontSize="13" letterSpacing="4" fill="#94A3B8">GLOBAL</text>
      </svg>
    )
  }

  // full: icon + text side by side
  const iconSize = size
  const textScale = iconSize / 40

  return (
    <div className={`flex items-center gap-3 ${className}`} aria-label="HashPay Global">
      <HashPayIcon size={iconSize} />
      <div className="flex flex-col leading-none" style={{ transform: `scale(${textScale})`, transformOrigin: 'left center' }}>
        {/* "HashPay" wordmark */}
        <div className="flex items-baseline">
          <span
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 700,
              fontSize: 22,
              color: '#1565C0',
              letterSpacing: '-0.3px',
            }}
          >
            Hash
          </span>
          <span
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 700,
              fontSize: 22,
              background: 'linear-gradient(90deg, #00C8E0, #00E5FF)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.3px',
            }}
          >
            Pay
          </span>
        </div>
        {/* "GLOBAL" sub-label */}
        <span
          style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 500,
            fontSize: 10,
            letterSpacing: '0.22em',
            color: '#94A3B8',
            marginTop: 1,
          }}
        >
          GLOBAL
        </span>
      </div>
    </div>
  )
}

export default HashPayLogo
