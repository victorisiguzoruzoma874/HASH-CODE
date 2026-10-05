import React, { useState, useEffect, useRef, useCallback } from 'react'
import jsQR from 'jsqr'

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

  if (!isOpen) return null

  const statusText = cameraState === 'active' ? 'Camera on' : cameraState === 'requesting' ? 'Starting camera…' : 'Camera off'
  const frameHidden = !!result || cameraState === 'denied' || cameraState === 'unsupported' || cameraState === 'error'

  return (
    <div className="dash-modal-wrap" role="dialog" aria-modal="true" aria-label="Scan QR code" style={{ padding: 0 }}>
      <div className="dash-modal" style={{ maxWidth: 'none', height: '100vh', maxHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div className="dash-modal-head">
          <div>
            <h2>Scan QR code</h2>
            <p>Scan a HashPay account or a wallet address.</p>
          </div>
          <button className="lp-btn small" onClick={onClose}>Close</button>
        </div>

        <div className="dash-modal-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>

          {cameraState === 'denied' && (
            <div className="dash-form" style={{ maxWidth: 360, textAlign: 'center' }}>
              <div className="lp-error">Camera access is blocked. Allow the camera in your browser settings, then try again.</div>
              <button className="lp-btn" onClick={startCamera}>Try again</button>
            </div>
          )}

          {cameraState === 'unsupported' && (
            <div className="lp-error" style={{ maxWidth: 360 }}>
              This browser can't open the camera. Upload a photo of the QR code instead.
            </div>
          )}

          {cameraState === 'error' && (
            <div className="dash-form" style={{ maxWidth: 360, textAlign: 'center' }}>
              <div className="lp-error">The camera could not start. Close other apps that use it, then try again.</div>
              <button className="lp-btn" onClick={startCamera}>Try again</button>
            </div>
          )}

          {/* The camera frame stays mounted so videoRef is always attached */}
          <div style={{ position: 'relative', width: '100%', maxWidth: 400, aspectRatio: '1 / 1', overflow: 'hidden', border: '1px solid var(--line)', background: '#000', display: frameHidden ? 'none' : 'block' }}>
            <video ref={videoRef} autoPlay playsInline muted
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${zoom})`, transition: 'transform 0.2s' }} />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            {cameraState === 'requesting' && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', color: '#fff' }}>
                Starting camera…
              </div>
            )}
            <div style={{ position: 'absolute', inset: 24, border: '2px solid #fff', pointerEvents: 'none', mixBlendMode: 'difference' }} />
          </div>

          {result && result !== 'NO_QR_FOUND' && (
            <div className="dash-form" style={{ width: '100%', maxWidth: 400 }}>
              <div className="dash-found" style={{ wordBreak: 'break-all' }}>
                QR code found
                <div className="dash-mono" style={{ fontWeight: 400, color: 'var(--ink)', marginTop: 4 }}>{result}</div>
              </div>
              {isHashPayAccount && <div className="dash-notice">This is a HashPay account number. Copy it, then use Send.</div>}
              {isCryptoAddress && !isHashPayAccount && <div className="dash-notice">This looks like a crypto wallet address.</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="lp-btn" onClick={handleResultAction}>Copy</button>
                <button className="lp-btn" onClick={reset}>Scan again</button>
              </div>
            </div>
          )}

          {result === 'NO_QR_FOUND' && (
            <div className="dash-form" style={{ width: '100%', maxWidth: 400 }}>
              <div className="lp-error">No QR code was found in that image. Try a clearer photo.</div>
              <button className="lp-btn" onClick={reset}>Try again</button>
            </div>
          )}

          {!result && (
            <>
              <p className="dash-grey" aria-live="polite">
                {cameraState === 'active' ? 'Line up the QR code inside the frame.' : 'Point your camera at a QR code.'}
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                <button className="lp-btn small" onClick={() => fileInputRef.current?.click()}>Upload a photo</button>
                <button className="lp-btn small" onClick={() => setShowRecent(!showRecent)} aria-expanded={showRecent}>Recent scans</button>
                <button className="lp-btn small" onClick={() => setFacingMode(f => (f === 'environment' ? 'user' : 'environment'))}>Switch camera</button>
                <button className="lp-btn small" onClick={() => setZoom(z => Math.min(z + 0.25, 3))}>Zoom in</button>
                <button className="lp-btn small" onClick={() => setZoom(z => Math.max(z - 0.25, 1))}>Zoom out</button>
              </div>

              {showRecent && (
                recentScans.length > 0 ? (
                  <div className="dash-card" style={{ width: '100%', maxWidth: 400 }}>
                    {recentScans.map((s, i) => (
                      <button key={i} onClick={() => { setResult(s); setShowRecent(false) }}
                        className="dash-order dash-mono" style={{ fontSize: 12, borderBottom: '1px solid color-mix(in srgb, var(--line) 20%, transparent)' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="dash-meta">You have no recent scans.</p>
                )
              )}
            </>
          )}

          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleGalleryUpload} />
        </div>

        <div className="dash-pad" style={{ borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--grey)' }}>
          <i style={{ width: 8, height: 8, borderRadius: '50%', background: cameraState === 'active' ? 'var(--green)' : 'var(--meta)' }} />
          {statusText}
        </div>
      </div>
    </div>
  )
}
