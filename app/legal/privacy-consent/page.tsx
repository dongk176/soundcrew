import PrivacyConsentContent from "@/components/legal/PrivacyConsentContent";

export const metadata = {
  title: "개인정보 수집·이용 동의 - SoundCrew",
  robots: { index: false, follow: false }
};

export default function PrivacyConsentPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <PrivacyConsentContent />
    </main>
  );
}
