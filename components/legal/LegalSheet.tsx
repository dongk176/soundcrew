// components/legal/LegalSheet.tsx
'use client'

import { useEffect } from 'react'
import { TermsContent } from './LegalDocs'
import PrivacyConsentContent from '@/components/legal/PrivacyConsentContent'

type Props = {
  open: boolean
  doc: 'terms' | 'privacy'
  onClose: () => void
}

export default function LegalSheet({ open, doc, onClose }: Props) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[90] md:hidden" role="dialog" aria-modal="true">
      {/* dim */}
      <button
        className="absolute inset-0 bg-black/10"
        onClick={onClose}
        aria-label="닫기"
      />
      {/* sheet */}
      <div
        className="fixed inset-x-0 bottom-0 rounded-t-[22px] border-t border-zinc-200 bg-white shadow-[0_-16px_40px_rgba(0,0,0,0.12)]"
        style={{
          paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
          maxHeight: '100svh',
        }}
      >
        {/* handle */}
        <div className="mx-auto mt-4 mb-3 h-1.5 w-12 rounded-full bg-zinc-300/80" />

        {/* header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-4">
          <div className="text-[18px] font-semibold text-zinc-900">
            {doc === 'terms' ? '서비스 이용약관' : '개인정보 수집·이용 동의'}
          </div>
          <button
            aria-label="닫기"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-[10px] border border-zinc-200"
          >
            ×
          </button>
        </div>

        {/* body */}
        <div className="px-5 pb-4 overflow-y-auto pt-2" style={{ maxHeight: 'calc(100svh - 120px)' }}>
          {doc === 'terms' ? <TermsContent /> : <PrivacyConsentContent />}
        </div>
      </div>
    </div>
  )
}
