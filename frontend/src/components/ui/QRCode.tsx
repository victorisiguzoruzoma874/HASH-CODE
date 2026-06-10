import React, { useEffect, useRef } from 'react'
import QRCodeLib from 'qrcode'
import { HashPayIcon } from './HashPayLogo'

interface QRCodeProps {
  /** Value encoded into the QR (account number, address, payment URI…) */
  value: string
  /** Pixel size of the square QR */
  size?: number
  /** Dark module color */
  fgColor?: string
  /** Background color */
  bgColor?: string
  /** Render the HashPay mark in the center (uses high error correction) */
  logo?: boolean
  className?: string
}

/**
 * Branded QR code. Renders `value` to a canvas with high error correction so
 * the center HashPay mark never breaks scannability.
 */
export const QRCode: React.FC<QRCodeProps> = ({
  value,
  size = 200,
  fgColor = '#0A1929',
  bgColor = '#FFFFFF',
  logo = true,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !value) return
    QRCodeLib.toCanvas(canvas, value, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'H',
      color: { dark: fgColor, light: bgColor },
    }).catch(() => {})
  }, [value, size, fgColor, bgColor])

  if (!value) {
    return (
      <div
        className={`flex items-center justify-center rounded-[14px] ${className}`}
        style={{ width: size, height: size, background: '#F8FAFD', border: '1.5px solid #DDE6F2' }}
      >
        <span className="text-[11px] font-semibold" style={{ color: '#A8BDD4' }}>No code yet</span>
      </div>
    )
  }

  const logoSize = Math.round(size * 0.22)

  return (
    <div className={`relative inline-flex ${className}`} style={{ width: size, height: size }}>
      <canvas ref={canvasRef} width={size} height={size} className="rounded-[6px]" />
      {logo && (
        <div
          className="absolute top-1/2 left-1/2 flex items-center justify-center rounded-[10px]"
          style={{
            width: logoSize + 10,
            height: logoSize + 10,
            transform: 'translate(-50%, -50%)',
            background: bgColor,
            boxShadow: '0 1px 4px rgba(10,25,41,0.12)',
          }}
        >
          <HashPayIcon size={logoSize} />
        </div>
      )}
    </div>
  )
}

export default QRCode
