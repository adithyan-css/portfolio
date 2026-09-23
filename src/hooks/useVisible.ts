import { useEffect, useState, type RefObject } from 'react'

/** True while the element is (nearly) on screen and the tab is visible. */
export function useVisible<T extends Element>(ref: RefObject<T | null>, rootMargin = '120px') {
  const [inView, setInView] = useState(false)
  const [pageVisible, setPageVisible] = useState(true)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin })
    io.observe(el)
    return () => io.disconnect()
  }, [ref, rootMargin])

  useEffect(() => {
    const onVis = () => setPageVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  return inView && pageVisible
}
