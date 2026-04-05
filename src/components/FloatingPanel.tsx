import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  title: string
  open: boolean
  onClose: () => void
  anchorRef?: React.RefObject<HTMLElement | null>
  defaultWidth?: number
  defaultHeight?: number
  minWidth?: number
  minHeight?: number
  children: React.ReactNode
}

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export default function FloatingPanel({
  title, open, onClose, anchorRef,
  defaultWidth = 420, defaultHeight = 360,
  minWidth = 220, minHeight = 160,
  children,
}: Props) {
  const [rect, setRect] = useState<Rect | null>(null)
  const dragging = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)
  const resizing = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    if (rect) return

    const w = Math.min(defaultWidth, window.innerWidth - 16)
    const h = Math.min(defaultHeight, window.innerHeight - 16)

    if (anchorRef?.current) {
      const btn = anchorRef.current.getBoundingClientRect()
      let x = btn.left - w - 8
      if (x < 8) x = btn.right + 8
      if (x + w > window.innerWidth - 8) x = window.innerWidth - w - 8
      const y = Math.min(Math.max(8, btn.top), window.innerHeight - h - 8)
      setRect({ x: Math.max(8, x), y, w, h })
    } else {
      setRect({
        x: Math.round((window.innerWidth - w) / 2),
        y: Math.round((window.innerHeight - h) / 2),
        w, h,
      })
    }
  }, [open])

  const onDragStart = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.floating-panel-close')) return
    if (!rect) return
    e.preventDefault()
    dragging.current = { startX: e.clientX, startY: e.clientY, origX: rect.x, origY: rect.y }

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return
      setRect(prev => prev && ({
        ...prev,
        x: dragging.current!.origX + ev.clientX - dragging.current!.startX,
        y: dragging.current!.origY + ev.clientY - dragging.current!.startY,
      }))
    }
    const onUp = () => {
      dragging.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [rect])

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    if (!rect) return
    e.preventDefault()
    e.stopPropagation()
    resizing.current = { startX: e.clientX, startY: e.clientY, origW: rect.w, origH: rect.h }

    const onMove = (ev: MouseEvent) => {
      if (!resizing.current) return
      setRect(prev => prev && ({
        ...prev,
        w: Math.max(minWidth, resizing.current!.origW + ev.clientX - resizing.current!.startX),
        h: Math.max(minHeight, resizing.current!.origH + ev.clientY - resizing.current!.startY),
      }))
    }
    const onUp = () => {
      resizing.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [rect, minWidth, minHeight])

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  if (!open || !rect) return null

  return createPortal(
    <div
      ref={panelRef}
      className="floating-panel"
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
    >
      <div className="floating-panel-header" onMouseDown={onDragStart}>
        <span className="floating-panel-title">{title}</span>
        <button className="floating-panel-close" onClick={handleClose}>×</button>
      </div>
      <div className="floating-panel-body">
        {children}
      </div>
      <div className="floating-panel-resize" onMouseDown={onResizeStart} />
    </div>,
    document.body
  )
}
