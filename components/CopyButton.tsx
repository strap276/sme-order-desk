'use client'

import { useState } from 'react'

export function CopyButton({ text, label = 'Copier pour WhatsApp' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false)

  async function copy() {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setDone(true)
      setTimeout(() => setDone(false), 2000)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <button type="button" className="btn" onClick={copy}>
      {done ? 'Copié ✓' : label}
    </button>
  )
}
