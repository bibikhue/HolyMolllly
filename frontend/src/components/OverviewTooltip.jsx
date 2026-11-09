import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export default function OverviewTooltip({ label, text }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const anchor = useRef(null)
  const bubble = useRef(null)
  const pinned = useRef(false)
  const close = () => { pinned.current = false; setOpen(false) }

  useEffect(() => {
    if (!open) return
    const position = () => {
      if (!anchor.current || !bubble.current) return
      const box = anchor.current.getBoundingClientRect()
      const { width, height } = bubble.current.getBoundingClientRect()
      const left = Math.max(12, Math.min(box.left, window.innerWidth - width - 12))
      const below = box.bottom + 8
      bubble.current.style.left = `${left}px`
      bubble.current.style.top = `${Math.max(12, below + height < window.innerHeight - 12 ? below : box.top - height - 8)}px`
      bubble.current.style.visibility = 'visible'
    }
    const outside = event => { if (!anchor.current?.contains(event.target) && !bubble.current?.contains(event.target)) { pinned.current = false; setOpen(false) } }
    position()
    window.addEventListener('resize', position)
    window.addEventListener('scroll', position, true)
    document.addEventListener('pointerdown', outside)
    return () => { window.removeEventListener('resize', position); window.removeEventListener('scroll', position, true); document.removeEventListener('pointerdown', outside) }
  }, [open])

  return <span className="overview-info-anchor" ref={anchor} onPointerEnter={event => { if (event.pointerType !== 'touch') setOpen(true) }} onPointerLeave={() => { if (!pinned.current && !anchor.current?.contains(document.activeElement)) setOpen(false) }}>
    <button type="button" className="overview-info-button" aria-label={label} aria-describedby={open ? id : undefined} aria-expanded={open} onFocus={() => setOpen(true)} onBlur={close} onClick={() => { pinned.current = !pinned.current; setOpen(pinned.current) }} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); close() } }}>i</button>
    {open && createPortal(<span className="overview-info-tooltip" id={id} role="tooltip" ref={bubble} style={{ visibility: 'hidden' }} onPointerEnter={() => setOpen(true)} onPointerLeave={() => { if (!pinned.current && !anchor.current?.contains(document.activeElement)) setOpen(false) }}>{text}</span>, document.body)}
  </span>
}
