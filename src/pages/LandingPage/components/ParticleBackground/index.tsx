import { useEffect, useRef } from 'react'
import styles from './ParticleBackground.module.css'

declare global {
  interface Window {
    UnicornStudio?: {
      isInitialized: boolean
      init: () => Promise<unknown[]>
      destroy: () => void
    }
  }
}

export function ParticleBackground() {
  const containerRef = useRef<HTMLDivElement>(null)
  const instanceRef = useRef<unknown[]>([])

  useEffect(() => {
    let isMounted = true

    const initUnicorn = async () => {
      if (!window.UnicornStudio) {
        // 首次加载脚本
        await new Promise<void>((resolve) => {
          const script = document.createElement('script')
          script.src = 'https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v2.0.0/dist/unicornStudio.umd.js'
          script.onload = () => resolve()
          document.head.appendChild(script)
        })
      }

      // 脚本加载完成后初始化
      if (isMounted && window.UnicornStudio) {
        try {
          // 每次组件挂载都调用 init()，它会扫描 DOM 中的 data-us-project 元素
          const instances = await window.UnicornStudio.init()
          if (isMounted) {
            instanceRef.current = instances
          }
        } catch (e) {
          console.warn('UnicornStudio init failed:', e)
        }
      }
    }

    initUnicorn()

    return () => {
      isMounted = false
      // 组件卸载时销毁实例，避免内存泄漏
      if (window.UnicornStudio?.destroy) {
        window.UnicornStudio.destroy()
      }
      instanceRef.current = []
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
