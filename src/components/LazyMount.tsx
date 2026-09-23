import { useEffect, useRef, useState, type ReactNode } from 'react'

/** Renders children once the placeholder comes within `margin` of the viewport (then stays mounted). */
export function LazyMount({ children, placeholder, margin = '800px' }: { children: ReactNode; placeholder: ReactNode; margin?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [show, setShow] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || show) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setShow(true), { rootMargin: `${margin} 0px` })
    io.observe(el)
    return () => io.disconnect()
  }, [margin, show])
  return <div ref={ref}>{show ? children : placeholder}</div>
}
