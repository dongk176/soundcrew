// components/legal/PrivacyConsentContent.tsx
'use client'

import React, { useEffect, useRef } from 'react'

const LEGAL_PRIVACY_VERSION = 'v1.1'
const EFFECTIVE_DATE = '2026-01-07' // KST
const NO_COPY = true

export default function PrivacyConsentContent() {
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!NO_COPY) return
    const stop = (e: Event) => { e.preventDefault(); e.stopPropagation(); return false }
    const opts: AddEventListenerOptions = { passive: false }
    document.addEventListener('copy', stop, opts)
    document.addEventListener('cut', stop, opts)
    document.addEventListener('paste', stop, opts)
    document.addEventListener('contextmenu', stop, opts)
    document.addEventListener('selectstart', stop, opts)
    document.addEventListener('dragstart', stop, opts)
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ['c', 'x', 's', 'p', 'u'].includes(e.key.toLowerCase())) stop(e)
    }
    document.addEventListener('keydown', onKey as any, opts)
    return () => {
      document.removeEventListener('copy', stop)
      document.removeEventListener('cut', stop)
      document.removeEventListener('paste', stop)
      document.removeEventListener('contextmenu', stop)
      document.removeEventListener('selectstart', stop)
      document.removeEventListener('dragstart', stop)
      document.removeEventListener('keydown', onKey as any)
    }
  }, [])

  const sec = 'mt-8 md:mt-10 pt-5 border-t border-zinc-200'

  return (
    <div
      ref={rootRef}
      className={[
        'prose prose-zinc max-w-none select-none',
        'text-[15px] leading-7 md:leading-8 tracking-[0.01em]',
        'prose-p:my-3 prose-ul:my-3 prose-ol:my-3 prose-li:my-1.5',
      ].join(' ')}
      style={{ userSelect: NO_COPY ? 'none' as const : 'text' }}
      aria-label="개인정보 수집·이용 동의"
    >
      <header className="mb-6">
        <h1 className="text-[22px] md:text-2xl font-bold tracking-[0.015em]">개인정보 수집·이용 동의</h1>
        <p className="text-sm text-zinc-500">버전 {LEGAL_PRIVACY_VERSION} · 시행일 {EFFECTIVE_DATE}</p>
      </header>

      <section className={sec}>
        <h2 className="text-lg font-semibold tracking-[0.015em]">제 1 조 (수집·이용 목적)</h2>
        <ol className="list-decimal pl-5">
          <li>회원가입, 본인확인, 계정 관리, 부정 이용 방지 및 보안 사고 대응</li>
          <li>공간/쉐어 게시물 탐색·저장·문의 등 핵심 서비스 제공 및 고객지원</li>
          <li>결제·정산(호스트 정산 포함), 세무증빙 발급 지원, 법령상 의무 이행 및 분쟁 대응</li>
          <li>이름, 연락처, 생년월일: 카드 등록 시 본인 확인 및 정보 일치 여부 확인</li>
          <li>거래내역: 분쟁 발생 시 확인 및 대응</li>
          <li>카드정보(토큰화): 간편 결제 기능 제공을 위한 등록</li>
          <li>(선택) 이벤트·혜택·광고성 정보 제공 및 맞춤형 알림</li>
        </ol>
        <p className="mt-2 text-xs text-zinc-500">※ 당사는 개인정보 최소수집·목적 제한 원칙을 따르며, 목적이 변경되는 경우 추가 동의를 받습니다.</p>
      </section>

      <section className={sec}>
        <h2 className="text-lg font-semibold tracking-[0.015em]">제 2 조 (수집 항목)</h2>
        <ol className="list-decimal pl-5">
          <li><b>필수</b>: 이메일, 비밀번호(해시), 닉네임/이름, 휴대폰 번호(문자(OTP) 인증), 생년월일, 성별, 서비스 이용기록, 접속 기기/브라우저 정보, 접속 IP·로그(보안·감사)</li>
          <li><b>선택</b>: 마케팅 수신 동의(채널), 프로필 이미지, 관심 카테고리 등</li>
          <li><b>결제 관련</b>: 거래내역, 결제수단 토큰(간편 결제 등록 시). 카드정보 원문은 결제대행사(PG)에서 보관</li>
          <li><b>호스트 정산 관련(호스트에 한함)</b>: 사업자등록정보, 정산 계좌, 세금계산서/현금영수증 발급 정보</li>
          <li><b>민감정보</b>: 원칙적으로 수집하지 않으며, 법령상 필요 또는 별도 필요 시 별도 고지·동의 후 처리합니다.</li>
          <li><b>쿠키·유사기술</b>: 로그인 유지, 접속 보안, 품질 개선 목적의 필수 쿠키 사용(제한 시 기능 저하 가능)</li>
        </ol>
      </section>

      <section className={sec}>
        <h2 className="text-lg font-semibold tracking-[0.015em]">제 3 조 (보유·이용 기간)</h2>
        <p className="mb-2">원칙적으로 목적 달성 시 지체 없이 파기합니다. 다만 아래는 관련 법령에 따라 보관합니다.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-zinc-200">
            <thead>
              <tr className="bg-zinc-50">
                <th className="px-3 py-2 text-left">보관 항목</th>
                <th className="px-3 py-2 text-left">보유기간 / 근거</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t"><td className="px-3 py-2">표시·광고 기록</td><td className="px-3 py-2">6개월 / 전자상거래법</td></tr>
              <tr className="border-t"><td className="px-3 py-2">계약·청약철회, 대금결제, 재화·용역 공급 기록</td><td className="px-3 py-2">5년 / 전자상거래법</td></tr>
              <tr className="border-t"><td className="px-3 py-2">소비자 불만·분쟁처리 기록</td><td className="px-3 py-2">3년 / 전자상거래법</td></tr>
              <tr className="border-t"><td className="px-3 py-2">접속 로그 등 통신사실확인자료</td><td className="px-3 py-2">3개월 / 통신비밀보호 관련 법령·고시</td></tr>
            </tbody>
          </table>
        </div>
        <ol className="list-decimal pl-5 mt-2">
          <li>부정 이용 방지 및 분쟁 대비 최소 정보는 법정 보존기간 범위 내에서 보관합니다.</li>
          <li>전화번호 인증 로그(성공/실패 시각, 발송·수신 이력, IP 일부 등)는 보안 및 분쟁 대응을 위해 최대 <b>6개월</b> 보관 후 파기합니다.</li>
        </ol>
        <p className="mt-2 text-xs text-zinc-500">※ 회원 탈퇴 시에도 법정 보존 대상은 기간 만료 시까지 분리 저장 후 즉시 파기합니다.</p>
      </section>

      {/* 4조: 인증 수단 설명을 SOLAPI 기준으로 일치 */}
      <section className={sec}>
        <h2 className="text-lg font-semibold tracking-[0.015em]">제 4 조 (전화번호 인증)</h2>
        <ol className="list-decimal pl-5">
          <li>회원 식별을 위해 <b>문자(OTP) 기반의 휴대폰 번호 인증(SOLAPI)</b>를 사용합니다.</li>
          <li>본 인증은 번호 소유 확인 절차이며, 통신사 PASS/NICE의 <b>법정 ‘본인확인서비스’(CI/DI 발급)</b>가 아닙니다.</li>
          <li>인증 데이터는 제 5 조·제 6 조 범위 내에서 보안 목적으로 최소한도로 보관·이용되며, 오남용 탐지에 활용될 수 있습니다.</li>
        </ol>
      </section>

      {/* 5조: 처리위탁 — SOLAPI로 교체 및 세부 항목 보강 */}
      <section className={sec}>
        <h2 className="text-lg font-semibold tracking-[0.015em]">제 5 조 (처리위탁)</h2>
        <ul className="list-disc pl-5">
          <li><b>AWS</b>: 인프라·스토리지(S3), CDN(CloudFront) — 주 저장: 서울 리전(ap-northeast-2)</li>
          <li><b>Toss Payments</b>: 결제 대행(PG) — 카드정보 등 결제수단 정보 비저장</li>
          <li><b>Kakao</b>: 간편 로그인(OAuth) 및 카카오톡 채널 알림(선택)</li>
          <li>
            <b>SOLAPI</b>: SMS/알림톡 기반 <b>휴대폰 번호 OTP 발송·인증</b> 처리
            <div className="text-xs text-zinc-600 mt-1">
              전송·처리를 위해 수집·이용되는 항목(예시): 수신 전화번호, 메시지(인증코드 포함),
              발송/수신 시각 및 결과코드, 메시지 식별자 등. 오남용 방지·분쟁 대응을 위해
              관련 로그가 일정 기간 보관될 수 있습니다(제 3 조 범위 내).
            </div>
          </li>
        </ul>
      </section>

      {/* 6조: 국외 이전 — Firebase 항목 제거, SOLAPI 국내 처리 명시 */}
      <section className={sec}>
        <h2 className="text-lg font-semibold tracking-[0.015em]">제 6 조 (국외 이전)</h2>
        <ol className="list-decimal pl-5">
          <li><b>CloudFront 글로벌 엣지</b>: 콘텐츠 전송 가속을 위해 엣지 노드에 일시 캐시(만료/무효화 정책에 따라 자동 삭제).</li>
          <li><b>SOLAPI</b>: 국내 인프라에서 SMS/알림톡 발송을 처리하며, <b>국외 이전은 원칙적으로 없음</b>. 다만 메시지 전송 경로상 해외 통신망을 경유할 수 있습니다.</li>
        </ol>
      </section>

      <section className={sec}>
        <h2 className="text-lg font-semibold tracking-[0.015em]">제 7 조 (개인정보의 제3자 제공)</h2>
        <p>법령 근거 또는 수사기관의 적법한 요청을 제외하고 동의 없이 제공하지 않습니다. 익명·가명 정보는 개인 식별이 불가능한 범위에서 제공될 수 있습니다.</p>
      </section>

      <section className={sec}>
        <h2 className="text-lg font-semibold tracking-[0.015em]">제 8 조 (정보주체의 권리)</h2>
        <ol className="list-decimal pl-5">
          <li>열람·정정·삭제·처리정지, 동의 철회·회원탈퇴 권리</li>
          <li>행사 방법: 마이페이지 &gt; 설정, 또는 고객센터로 접수</li>
          <li>타인 권리 침해 우려, 법정 보관의무 등 해당 시 일부 제한 가능</li>
        </ol>
      </section>

      <section className={sec}>
        <h2 className="text-lg font-semibold tracking-[0.015em]">제 9 조 (알림 및 마케팅 수신·철회)</h2>
        <ol className="list-decimal pl-5">
          <li>
            <b>서비스 필수 알림(비마케팅)</b>: 예약 확정/변경/취소/리마인드, 결제·환불 통지, 보안·인증, 약관/정책 변경 안내 등은
            이메일·앱 푸시·SMS 또는 <b>카카오 알림톡(실패 시 문자 대체)</b>로 발송될 수 있습니다.
            이는 마케팅 정보가 아니며, 완전 차단 시 서비스 이용에 중대한 장애 발생 가능(채널별 최소 설정 내 제어).
          </li>
          <li><b>마케팅 알림(선택)</b>: 수신 동의자에 한해 이메일, SMS, 앱 푸시, 카카오톡 채널로 발송</li>
          <li><b>철회 방법</b>: 마이페이지 알림 설정, 이메일 하단 수신거부, SMS 수신거부, 카카오톡 채널 차단, 고객센터 요청</li>
        </ol>
      </section>

      <section className={sec}>
        <h2 className="text-lg font-semibold tracking-[0.015em]">제 10 조 (안전성 확보조치)</h2>
        <ul className="list-disc pl-5">
          <li>비밀번호 일방향 암호화, HTTPS/TLS 암호화</li>
          <li>접근 권한 최소화 및 부여 이력 관리, 접속기록 보관·위·변조 방지</li>
          <li>정기 점검, 이상행위 탐지, 침해사고 대응 절차</li>
          <li>위험 기반 2단계 인증/접속 차단 등 추가 통제 적용 가능</li>
        </ul>
      </section>

      <section className={sec}>
        <h2 className="text-lg font-semibold tracking-[0.015em]">제 11 조 (동의 거부 권리 및 불이익)</h2>
        <p>필수 항목 비동의 시 회원가입 및 핵심 서비스 제공이 제한될 수 있습니다. 선택 항목은 비동의해도 이용 가능.</p>
      </section>

      <section className={sec}>
        <h2 className="text-lg font-semibold tracking-[0.015em]">제 12 조 (고지 및 문의)</h2>
        <ol className="list-decimal pl-5">
          <li>중요 변경은 시행 7일 전(중대한 불이익 우려 시 30일 전) 공지합니다.</li>
          <li>
            <div className="rounded-xl border p-3 text-sm" style={{ borderColor: '#e5e7eb' }}>
              <div className="font-semibold">고객센터</div>
              <div>운영시간: 평일 14:00 ~ 19:00 (주말·공휴일 휴무)</div>
              <div>이메일: <a href="mailto:artiroom176@gmail.com">artiroom176@gmail.com</a></div>
            </div>
          </li>
        </ol>
      </section>
    </div>
  )
}
