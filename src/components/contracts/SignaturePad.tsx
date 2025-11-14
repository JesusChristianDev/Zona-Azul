'use client'

import { useRef, useState, useEffect } from 'react'

interface SignaturePadProps {
  onSignatureChange?: (signatureData: string | null) => void
  width?: number
  height?: number
  penColor?: string
  backgroundColor?: string
  disabled?: boolean
}

export default function SignaturePad({
  onSignatureChange,
  width = 400,
  height = 200,
  penColor = '#000000',
  backgroundColor = '#ffffff',
  disabled = false,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Configurar canvas
    ctx.strokeStyle = penColor
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, width, height)

    // Función para obtener coordenadas del mouse/touch
    const getCoordinates = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect()
      if ('touches' in e) {
        return {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top,
        }
      }
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
    }

    // Iniciar dibujo
    const startDrawing = (e: MouseEvent | TouchEvent) => {
      if (disabled) return
      e.preventDefault()
      setIsDrawing(true)
      const coords = getCoordinates(e)
      ctx.beginPath()
      ctx.moveTo(coords.x, coords.y)
    }

    // Dibujar
    const draw = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing || disabled) return
      e.preventDefault()
      const coords = getCoordinates(e)
      ctx.lineTo(coords.x, coords.y)
      ctx.stroke()
      setHasSignature(true)
      exportSignature()
    }

    // Detener dibujo
    const stopDrawing = () => {
      if (isDrawing) {
        setIsDrawing(false)
        exportSignature()
      }
    }

    // Event listeners para mouse
    canvas.addEventListener('mousedown', startDrawing)
    canvas.addEventListener('mousemove', draw)
    canvas.addEventListener('mouseup', stopDrawing)
    canvas.addEventListener('mouseout', stopDrawing)

    // Event listeners para touch
    canvas.addEventListener('touchstart', startDrawing)
    canvas.addEventListener('touchmove', draw)
    canvas.addEventListener('touchend', stopDrawing)

    // Función para exportar firma
    const exportSignature = () => {
      if (onSignatureChange) {
        const dataURL = canvas.toDataURL('image/png')
        onSignatureChange(dataURL)
      }
    }

    return () => {
      canvas.removeEventListener('mousedown', startDrawing)
      canvas.removeEventListener('mousemove', draw)
      canvas.removeEventListener('mouseup', stopDrawing)
      canvas.removeEventListener('mouseout', stopDrawing)
      canvas.removeEventListener('touchstart', startDrawing)
      canvas.removeEventListener('touchmove', draw)
      canvas.removeEventListener('touchend', stopDrawing)
    }
  }, [isDrawing, penColor, backgroundColor, width, height, disabled, onSignatureChange])

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, width, height)
    setHasSignature(false)
    if (onSignatureChange) {
      onSignatureChange(null)
    }
  }

  // Calcular ancho responsive
  const responsiveWidth = typeof window !== 'undefined' 
    ? Math.min(width, window.innerWidth - 64) // 64px de padding total
    : width

  return (
    <div className="space-y-2 w-full">
      <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white w-full max-w-full" style={{ height }}>
        <canvas
          ref={canvasRef}
          width={responsiveWidth}
          height={height}
          className="cursor-crosshair touch-none w-full max-w-full"
          style={{ display: 'block', maxWidth: '100%' }}
        />
      </div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <p className="text-xs text-gray-500 flex-1">
          {hasSignature ? '✓ Firma capturada' : 'Dibuja tu firma en el área de arriba'}
        </p>
        {hasSignature && !disabled && (
          <button
            type="button"
            onClick={clearSignature}
            className="text-xs text-red-600 hover:text-red-800 font-medium whitespace-nowrap px-2 py-1 rounded hover:bg-red-50 transition"
          >
            Limpiar
          </button>
        )}
      </div>
    </div>
  )
}

