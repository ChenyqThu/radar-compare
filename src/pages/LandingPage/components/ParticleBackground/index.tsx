import { useEffect, useRef } from 'react'
import styles from './ParticleBackground.module.css'

declare global {
  interface Window {
    UnicornStudio?: {
      isInitialized: boolean
      init: () => void
    }
  }
}

export function ParticleBackground() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Load Unicorn Studio script
    if (!window.UnicornStudio) {
      window.UnicornStudio = { isInitialized: false, init: () => {} }
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v2.0.0/dist/unicornStudio.umd.js'
      script.onload = () => {
        if (window.UnicornStudio && !window.UnicornStudio.isInitialized) {
          window.UnicornStudio.init()
          window.UnicornStudio.isInitialized = true
        }
      }
      document.head.appendChild(script)
    } else if (!window.UnicornStudio.isInitialized) {
      window.UnicornStudio.init()
      window.UnicornStudio.isInitialized = true
    }
  }, [])

  return (
    <div className={styles.particleContainer} ref={containerRef}>
      <div
        data-us-project="vLGJIxHINq2tCeLOR9Dt"
        className={styles.unicornScene}
      />
    </div>
  )
}
