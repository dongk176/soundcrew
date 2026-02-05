// components/auth/PhoneAuthWidget.tsx
'use client'

import { useEffect, useMemo, useRef, useState, type KeyboardEventHandler } from 'react'
import { signIn } from 'next-auth/react'

function toE164KR(input: string) {
  const d = (input || '').replace(/\D/g, '')
  if (!d) return ''
  if (d.startsWith('0')) return `+82${d.slice(1)}`
  if (d.startsWith('82')) return `+${d}`
  return `+82${d}`
}

type Props = {
  onVerified?: (phoneE164: string) => void
  callbackUrl?: string
}

export default function PhoneAuthWidget({ onVerified, callbackUrl = '/signup' }: Props) {
  const [phone, setPhone] = useState('')
  const [sending, setSending] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [sent, setSent] = useState(false)
  const [code, setCode] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [verified, setVerified] = useState(false)
  const [codeInputRef, setCodeInputRef] = useState<HTMLInputElement | null>(null)

  // ✅ 전화번호 형식/중복 체크
  const digits = (phone || '').replace(/\D/g, '')
  const phoneValid = digits.length >= 10 && digits.length <= 11

  const [checkingPhone, setCheckingPhone] = useState(false)
  const [phoneAvailable, setPhoneAvailable] = useState<boolean | null>(null)

  // ✅ 로컬 쿨다운(초)
  const [cooldownSec, setCooldownSec] = useState(0)
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  function startCooldown(sec: number) {
    const s = Math.max(0, Math.floor(sec || 0))
    if (s <= 0) return
    setCooldownSec(s)
    if (cooldownTimer.current) clearInterval(cooldownTimer.current)
    cooldownTimer.current = setInterval(() => {
      setCooldownSec((prev) => {
        if (prev <= 1) {
          if (cooldownTimer.current) clearInterval(cooldownTimer.current)
          cooldownTimer.current = null
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  function secondsLabel(s: number) {
    const mm = Math.floor(s / 60)
    const ss = s % 60
    return mm > 0 ? `${mm}분 ${ss.toString().padStart(2, '0')}초` : `${ss}초`
  }

  useEffect(() => {
    return () => {
      if (cooldownTimer.current) clearInterval(cooldownTimer.current)
    }
  }, [])

  useEffect(() => {
    setSent(false)
    setCode('')
    setToast(null)
    setVerified(false)
  }, [phone])

  useEffect(() => {
    setPhoneAvailable(null)
    if (!phoneValid || verified) return
    const t = setTimeout(async () => {
      try {
        setCheckingPhone(true)
        const r = await fetch(`/api/auth/check-phone?v=${encodeURIComponent(digits)}`, { cache: 'no-store' })
        const j = await r.json()
        setPhoneAvailable(j?.available === true)
      } catch {
        // 네트워크 에러 시 버튼까지 막진 않음 (요청 시점에 안내)
        setPhoneAvailable(null)
      } finally {
        setCheckingPhone(false)
      }
    }, 250)
    return () => clearTimeout(t)
  }, [digits, phoneValid, verified])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(t)
  }, [toast])

  const onChangeCode = (v: string) => setCode((v || '').replace(/\D/g, '').slice(0, 6))

  async function handleSend() {
    setToast(null)

    if (!phoneValid) { setToast('전화번호 형식을 확인해 주세요'); return }
    if (phoneAvailable === false) { setToast('이미 가입된 번호예요. 로그인이나 아이디 찾기를 이용해 주세요.'); return }
    if (cooldownSec > 0) { setToast(`잠시 후 다시 시도해 주세요. (${secondsLabel(cooldownSec)} 후 재전송 가능)`); return }

    try {
      setSending(true)
      const r = await fetch('/api/auth/phone/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: digits }),
      })
      const j = await r.json().catch(() => ({}))

      if (!r.ok || !j.ok) {
        const err = (j?.error || '').toString().toUpperCase()

        // 서버가 내려주는 재시도 대기시간 추출 (body 우선, 없으면 헤더)
        const retryAfter =
          Number(j?.retryAfter ?? r.headers.get('Retry-After') ?? '0') || 0

        if (err === 'COOLDOWN') {
          // 번호 기준 재전송 쿨다운
          if (retryAfter > 0) startCooldown(retryAfter)
          setToast(`요청이 너무 잦아요. ${retryAfter > 0 ? secondsLabel(retryAfter) + ' 후 ' : ''}다시 시도해 주세요.`)
        } else if (err === 'RATE_LIMITED' || err === 'IP_RATE_LIMIT') {
          // 미들웨어/라우트의 IP 단기 제한
          if (retryAfter > 0) startCooldown(retryAfter)
          setToast(`인증번호 요청이 너무 잦아요. ${retryAfter > 0 ? secondsLabel(retryAfter) + ' 후 ' : ''}다시 시도해 주세요.`)
        } else if (err === 'IP_DAILY_LIMIT') {
          // 일일 제한
          setToast('동일 IP에서의 일일 요청 한도를 초과했어요. 내일 다시 시도해 주세요.')
        } else if (err === 'INVALID_PHONE') {
          setToast('전화번호 형식을 확인해 주세요.')
        } else {
          setToast('인증번호 전송에 실패했어요. 잠시 후 다시 시도해 주세요.')
        }
        return
      }

      // ✅ 성공
      setSent(true)
      setToast('인증번호를 전송했어요')
      // 서버가 헤더/본문으로 준 재시도 대기시간이 있으면 사용, 없으면 기본 60초로 보호
      const retryAfter = Number(j?.retryAfter ?? r.headers.get('Retry-After') ?? '0') || 60
      startCooldown(retryAfter)
      codeInputRef?.focus()
    } catch (e) {
      console.error('[phone/send]', e)
      setToast('네트워크 문제가 발생했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setSending(false)
    }
  }

  async function handleConfirm() {
    if (!code || code.length < 4) { setToast('인증코드를 입력해 주세요'); return }
    try {
      setConfirming(true)
      const res = await signIn('phone-otp', {
        redirect: false,
        phone: digits,
        code,
        callbackUrl,
      })
      if (!res?.ok) {
        const msg = (res?.error || '').toUpperCase()
        if (msg.includes('OTP_EXPIRED')) setToast('인증코드가 만료되었어요. 다시 전송해 주세요.')
        else if (msg.includes('OTP_MISMATCH') || msg.includes('INVALID_OTP')) setToast('인증코드가 올바르지 않아요.')
        else if (msg.includes('TOO_MANY_ATTEMPTS')) setToast('시도 횟수가 많아요. 잠시 후 다시 시도해 주세요.')
        else setToast('인증에 실패했어요. 코드를 다시 확인해 주세요.')
        return
      }
      setVerified(true)
      setToast('휴대폰 인증 완료!')
      onVerified?.(toE164KR(phone))
    } catch (e) {
      console.error('[phone/confirm]', e)
      setToast('인증에 실패했어요. 코드를 다시 확인해 주세요.')
    } finally {
      setConfirming(false)
    }
  }

  const onCodeKeyDown: KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter' && !verified && code) {
      e.preventDefault()
      handleConfirm()
    }
  }

  const disableSend =
    verified ||
    sending ||
    !phoneValid ||
    checkingPhone ||
    phoneAvailable === false ||
    cooldownSec > 0

  // 버튼 라벨 구성
  const sendLabel = useMemo(() => {
    if (verified) return '인증됨'
    if (sending) return '전송 중…'
    if (cooldownSec > 0) return `재전송 (${secondsLabel(cooldownSec)})`
    return sent ? '재전송' : '인증번호 받기'
  }, [verified, sending, cooldownSec, sent])

  return (
    <div className="phone-auth space-y-3">
      {/* 휴대폰 번호 + 인증번호 받기 */}
      <div className="flex flex-wrap gap-2">
        <div className="flex-1 min-w-0">
          <input
            type="tel"
            inputMode="numeric"
            placeholder="01012345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
            disabled={verified}
            className="w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-zinc-300 disabled:bg-zinc-100"
            aria-label="휴대폰 번호"
          />
          {/* 안내 문구 */}
          {phone.length > 0 && !phoneValid && (
            <p className="mt-1 text-xs text-red-600">전화번호 형식을 확인해 주세요.</p>
          )}
          {phoneValid && phoneAvailable === false && (
            <p className="mt-1 text-xs text-red-600">
              이미 가입된 번호예요. 로그인 또는 <a className="underline" href="/auth/find-id">아이디 찾기</a>를 이용해 주세요.
            </p>
          )}
          {phoneValid && checkingPhone && (
            <p className="mt-1 text-xs text-zinc-500">번호 확인 중…</p>
          )}
          {cooldownSec > 0 && (
            <p className="mt-1 text-xs text-zinc-500">
              스팸 방지를 위해 {secondsLabel(cooldownSec)} 후 재전송할 수 있어요.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleSend}
          disabled={disableSend}
          className="phone-auth-send h-11 px-4 rounded-lg bg-black text-sm font-semibold text-white
                     disabled:opacity-60 hover:bg-zinc-900
                     whitespace-nowrap leading-none flex-shrink-0"
        >
          {sendLabel}
        </button>
      </div>

      {/* 인증코드 + 인증 완료 버튼 */}
      <div className="flex flex-wrap gap-2">
        <div className="flex-1 min-w-0">
          <input
            ref={setCodeInputRef}
            type="text"
            inputMode="numeric"
            placeholder="인증코드 6자리"
            value={code}
            onChange={(e) => onChangeCode(e.target.value)}
            onKeyDown={onCodeKeyDown}
            disabled={verified}
            className="w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-zinc-300 disabled:bg-zinc-100"
            maxLength={6}
            aria-label="인증코드"
          />
        </div>

        <button
          type="button"
          onClick={handleConfirm}
          disabled={verified || confirming || !code}
          aria-disabled={verified ? true : undefined}
          className={`phone-auth-confirm h-11 px-4 rounded-lg text-sm font-semibold text-white leading-none whitespace-nowrap flex-shrink-0
            ${verified ? 'bg-[#16a34a] disabled:opacity-100 cursor-default'
                      : 'bg-black hover:bg-zinc-900 disabled:opacity-60'}`}
        >
          {verified ? '인증 완료됨' : (confirming ? '확인 중…' : '인증 완료')}
        </button>
      </div>

      {/* 접근성: 토스트 라이브 영역 */}
      <div aria-live="polite" className="text-xs text-zinc-600 min-h-[1.25rem]">
        {toast}
      </div>
    </div>
  )
}
