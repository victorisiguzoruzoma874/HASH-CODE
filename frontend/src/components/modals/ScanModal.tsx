import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Image, History, ZoomIn, QrCode, Wallet, BarChart2,
  Shield, CheckCircle2, AlertCircle, Loader2, ZoomOut,
} from 'lucide-react'
import jsQR from 'jsqr'
import { HashPayIcon } from '../ui/HashPayLogo'

interface ScanModalProps {
  isOpen: boolean
  onClose: () => void
  onResult?: (data: string) => void
}

type CameraState = 'idle' | 'requesting' | 'active' | 'denied' | 'unsupported' | 'error'

export const ScanModal: React.FC<ScanModalProps> = ({ isOpen, onClose, onResult }) => {
  const videoRef        = useRef<HTMLVideoElement>(null)
  const canvasRef       = useRef<HTMLCanvasElement>(null)
  const streamRef       = useRef<MediaStream | null>(null)
  const rafRef          = useRef<number>(0)
  const fileInputRef    = useRef<HTMLInputElement>(null)

  const [cameraState, setCameraState] = useState<CameraState>('idle')
  const [result, setResult]           = useState<string | null>(null)
  const [zoom, setZoom]               = useState(1)
  const [facingMode, setFacingMode]   = useState<'environment' | 'user'>('environment')
  const [recentScans, setRecentScans] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('hashpay_scans') ?? '[]') } catch { return [] }
  })
  const [showRecent, setShowRecent]   = useState(false)

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('unsupported'); return
    }
    setCameraState('requesting')
    stopCamera()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      // videoRef must already be in the DOM — attach and play
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        video.onloadedmetadata = () => {
          video.play().then(() => setCameraState('active')).catch(() => setCameraState('error'))
        }
      } else {
        // video not mounted yet — wait one tick
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play()
                .then(() => setCameraState('active'))
                .catch(() => setCameraState('error'))
            }
          }
        }, 50)
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraState('denied')
      } else {
        setCameraState('error')
      }
    }
  }, [facingMode, stopCamera])

  // Scan loop — runs every animation frame when camera is active
  const scanFrame = useCallback(() => {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2 || video.videoWidth === 0) {
      rafRef.current = requestAnimationFrame(scanFrame); return
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) { rafRef.current = requestAnimationFrame(scanFrame); return }
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)
    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      })
      if (code?.data) {
        setResult(code.data)
        saveToRecent(code.data)
        stopCamera()
        setCameraState('idle')
        onResult?.(code.data)
        return
      }
    } catch { /* skip frame */ }
    rafRef.current = requestAnimationFrame(scanFrame)
  }, [stopCamera, onResult])

  // Start scan loop when active
  useEffect(() => {
    if (cameraState === 'active') {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(scanFrame)
    }
    return () => cancelAnimationFrame(rafRef.current)
  }, [cameraState, scanFrame])

  // Open / close
  useEffect(() => {
    if (isOpen) {
      setResult(null)
      startCamera()
    } else {
      stopCamera()
      setCameraState('idle')
    }
    return () => stopCamera()
  }, [isOpen]) // eslint-disable-line

  // Facing mode change
  useEffect(() => {
    if (isOpen) startCamera()
  }, [facingMode]) // eslint-disable-line

  const saveToRecent = (data: string) => {
    setRecentScans(prev => {
      const next = [data, ...prev.filter(s => s !== data)].slice(0, 10)
      localStorage.setItem('hashpay_scans', JSON.stringify(next))
      return next
    })
  }

  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = document.createElement('img') as HTMLImageElement
      img.onload = () => {
        const canvas = canvasRef.current ?? (document.createElement('canvas') as HTMLCanvasElement)
        canvas.width  = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0)
        const imageData = ctx.getImageData(0, 0, img.width, img.height)
        const code = jsQR(imageData.data, imageData.width, imageData.height)
        if (code?.data) {
          setResult(code.data)
          saveToRecent(code.data)
          onResult?.(code.data)
        } else {
          setResult('NO_QR_FOUND')
        }
      }
      img.src = ev.target?.result as string
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleResultAction = () => {
    if (!result || result === 'NO_QR_FOUND') return
    // Copy to clipboard
    navigator.clipboard.writeText(result).catch(() => {})
  }

  const reset = () => {
    setResult(null)
    startCamera()
  }

  const isHashPayAccount = result && /^\d{10}$/.test(result)
  const isCryptoAddress  = result && /^(0x[a-fA-F0-9]{40}|[a-zA-Z0-9]{32,}$)/.test(result)

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-[#0B0F1A] flex flex-col"
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-2.5">
              <HashPayIcon size={32} />
              <span className="text-[16px] font-semibold text-white">Scan QR Code</span>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all"
            >
              <X size={18} />
            </motion.button>
          </div>

          {/* Main content */}
          <div className="flex-1 flex relative overflow-hidden">

            {/* Left sidebar */}
            <div className="w-14 flex flex-col items-center gap-4 py-6 border-r border-white/[0.08]">
              {[
                { icon: QrCode,    active: true },
                { icon: Wallet,    active: false },
                { icon: BarChart2, active: false },
              ].map(({ icon: Icon, active }, i) => (
                <button key={i}
                  className={`w-9 h-9 rounded-[10px] flex items-center justify-center transition-all ${
                    active ? 'bg-[#39FF14]/15 text-[#39FF14]' : 'text-[#4B5563] hover:text-[#94A3B8]'
                  }`}
                >
                  <Icon size={18} />
                </button>
              ))}
            </div>

            {/* Camera area */}
            <div className="flex-1 flex flex-col items-center justify-center relative bg-[#0B0F1A] p-8">

              {/* ── Error states (shown instead of camera frame) ── */}
              {cameraState === 'denied' && (
                <div className="flex flex-col items-center gap-4 text-center max-w-xs">
                  <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
                    <AlertCircle size={28} className="text-red-400" />
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-white mb-1">Camera Access Denied</p>
                    <p className="text-[12px] text-[#94A3B8]">Enable camera permission in your browser settings, then try again.</p>
                  </div>
                  <button onClick={startCamera}
                    className="px-5 py-2.5 rounded-full text-[13px] font-bold bg-[#39FF14]/10 text-[#39FF14] border border-[#39FF14]/30 hover:bg-[#39FF14]/20 transition-all">
                    Try Again
                  </button>
                </div>
              )}

              {cameraState === 'unsupported' && (
                <div className="flex flex-col items-center gap-4 text-center max-w-xs">
                  <AlertCircle size={36} className="text-yellow-400" />
                  <p className="text-[14px] text-[#94A3B8]">Camera not supported. Use "Upload from Gallery" instead.</p>
                </div>
              )}

              {/* ── Camera frame — always in DOM so videoRef is always attached ── */}
              <div className={`relative w-full max-w-[400px] aspect-square ${result || cameraState === 'denied' || cameraState === 'unsupported' || cameraState === 'error' ? 'hidden' : ''}`}>

                {/* Requesting overlay */}
                {cameraState === 'requesting' && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#050810] rounded-[20px]">
                    <Loader2 size={32} className="animate-spin text-[#39FF14]" />
                    <p className="text-[13px] text-[#94A3B8]">Starting camera…</p>
                  </div>
                )}

                <video
                  ref={videoRef}
                  autoPlay playsInline muted
                  className="w-full h-full rounded-[20px] object-cover bg-[#050810]"
                  style={{ transform: `scale(${zoom})`, transition: 'transform 0.2s' }}
                />
                {/* Canvas used only for pixel analysis — invisible */}
                <canvas ref={canvasRef} style={{ display: 'none' }} />

                {/* Corner brackets */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-3 left-3 w-8 h-8 border-[#39FF14] rounded-tl-[6px]"
                    style={{ borderTopWidth: 3, borderLeftWidth: 3 }} />
                  <div className="absolute top-3 right-3 w-8 h-8 border-[#39FF14] rounded-tr-[6px]"
                    style={{ borderTopWidth: 3, borderRightWidth: 3 }} />
                  <div className="absolute bottom-3 left-3 w-8 h-8 border-[#39FF14] rounded-bl-[6px]"
                    style={{ borderBottomWidth: 3, borderLeftWidth: 3 }} />
                  <div className="absolute bottom-3 right-3 w-8 h-8 border-[#39FF14] rounded-br-[6px]"
                    style={{ borderBottomWidth: 3, borderRightWidth: 3 }} />
                </div>

                {/* Scan line — only when active */}
                {cameraState === 'active' && (
                  <motion.div
                    animate={{ top: ['15%', '85%', '15%'] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                    className="absolute left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-transparent via-[#39FF14] to-transparent opacity-80"
                    style={{ position: 'absolute' }}
                  />
                )}

                {/* Flip camera */}
                <button
                  onClick={() => setFacingMode(f => f === 'environment' ? 'user' : 'environment')}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white/70 hover:text-white transition-all"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 7H4M4 7l4-4M4 7l4 4M4 17h16M16 17l4 4M16 17l4-4"/>
                  </svg>
                </button>
              </div>

              {/* ── Result ── */}
              {result && result !== 'NO_QR_FOUND' && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="w-full max-w-[400px] flex flex-col gap-4">
                  <div className="flex items-center gap-3 p-4 rounded-[16px] bg-[#39FF14]/10 border border-[#39FF14]/30">
                    <CheckCircle2 size={24} className="text-[#39FF14] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold text-[#39FF14] mb-1">QR Code Detected!</p>
                      <p className="text-[13px] text-white/80 font-mono break-all">{result}</p>
                    </div>
                  </div>

                  {isHashPayAccount && (
                    <div className="p-3 rounded-[12px] bg-blue-500/10 border border-blue-500/30 text-[12px] text-blue-300">
                      HashPay Account — ready to send money
                    </div>
                  )}
                  {isCryptoAddress && !isHashPayAccount && (
                    <div className="p-3 rounded-[12px] bg-purple-500/10 border border-purple-500/30 text-[12px] text-purple-300">
                      Crypto address detected
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button onClick={handleResultAction}
                      className="flex-1 py-2.5 rounded-full text-[13px] font-bold bg-[#39FF14]/10 text-[#39FF14] border border-[#39FF14]/30 hover:bg-[#39FF14]/20 transition-all">
                      Copy Address
                    </button>
                    <button onClick={reset}
                      className="flex-1 py-2.5 rounded-full text-[13px] font-bold bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 transition-all">
                      Scan Again
                    </button>
                  </div>
                </motion.div>
              )}

              {result === 'NO_QR_FOUND' && (
                <div className="flex flex-col items-center gap-4">
                  <AlertCircle size={36} className="text-yellow-400" />
                  <p className="text-[14px] text-[#94A3B8]">No QR code found in image</p>
                  <button onClick={reset}
                    className="px-5 py-2.5 rounded-full text-[13px] font-bold bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 transition-all">
                    Try Again
                  </button>
                </div>
              )}

              {/* Instruction + action buttons */}
              {!result && (
                <>
                  <p className="text-[14px] text-[#94A3B8] mt-6 text-center">
                    {cameraState === 'active' ? 'Align QR code within the frame' : 'Point camera at a QR code'}
                  </p>
                  <div className="flex gap-3 mt-4">
                    <button onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2.5 bg-[#111827] border border-white/10 rounded-[12px] text-[13px] text-[#94A3B8] hover:text-white hover:border-white/20 transition-all">
                      <Image size={15} /> Upload from Gallery
                    </button>
                    <button onClick={() => setShowRecent(!showRecent)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-[#111827] border border-white/10 rounded-[12px] text-[13px] text-[#94A3B8] hover:text-white hover:border-white/20 transition-all">
                      <History size={15} /> Recent Scans
                    </button>
                  </div>

                  {/* Recent scans dropdown */}
                  <AnimatePresence>
                    {showRecent && recentScans.length > 0 && (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="mt-3 w-full max-w-[400px] rounded-[12px] bg-[#111827] border border-white/10 overflow-hidden">
                        {recentScans.map((s, i) => (
                          <button key={i} onClick={() => { setResult(s); setShowRecent(false) }}
                            className="w-full text-left px-4 py-2.5 text-[12px] font-mono text-[#94A3B8] hover:bg-white/5 hover:text-white transition-all truncate border-b border-white/5 last:border-0">
                            {s}
                          </button>
                        ))}
                      </motion.div>
                    )}
                    {showRecent && recentScans.length === 0 && (
                      <p className="mt-3 text-[12px] text-[#4B5563]">No recent scans</p>
                    )}
                  </AnimatePresence>
                </>
              )}

              {/* Hidden file input */}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleGalleryUpload} />
            </div>

            {/* Right controls */}
            <div className="w-14 flex flex-col items-center gap-4 py-6 border-l border-white/[0.08]">
              <button onClick={() => setZoom(z => Math.min(z + 0.25, 3))}
                className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[#4B5563] hover:text-[#94A3B8] transition-all">
                <ZoomIn size={18} />
              </button>
              <button onClick={() => setZoom(z => Math.max(z - 0.25, 1))}
                className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[#4B5563] hover:text-[#94A3B8] transition-all">
                <ZoomOut size={18} />
              </button>
            </div>
          </div>

          {/* Status bar */}
          <div className="flex items-center justify-between px-6 py-3 border-t border-white/[0.08] bg-[#111827]">
            <div className="flex items-center gap-2.5">
              <Shield size={15} className="text-[#39FF14]" />
              <div>
                <div className="text-[11px] font-medium tracking-[0.06em] uppercase text-white">Secure Node Connection</div>
                <div className="text-[10px] text-[#4B5563]">End-to-end encrypted validation active</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${cameraState === 'active' ? 'bg-[#39FF14] animate-pulse' : 'bg-[#4B5563]'}`} />
              <span className={`text-[11px] font-medium ${cameraState === 'active' ? 'text-[#39FF14]' : 'text-[#4B5563]'}`}>
                {cameraState === 'active' ? 'Camera Active' : cameraState === 'requesting' ? 'Connecting…' : 'Standby'}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
