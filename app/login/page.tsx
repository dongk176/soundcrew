"use client";

import { useEffect, useState } from "react";
import LoginModal from "@/components/auth/LoginModal";
import { useGateRouter } from "@/components/common/routeGate";
import { useSession } from "next-auth/react";

export default function LoginPage() {
  const router = useGateRouter();
  const [open, setOpen] = useState(true);
  const [callbackUrl, setCallbackUrl] = useState("/");
  const { status } = useSession();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    setCallbackUrl(sp.get("callbackUrl") ?? sp.get("next") ?? "/");
  }, []);

  useEffect(() => {
    if (!open) router.replace("/");
  }, [open, router]);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(callbackUrl);
      router.refresh();
    }
  }, [status, callbackUrl, router]);

  return (
    <LoginModal
      open={open}
      onClose={() => setOpen(false)}
      callbackUrl={callbackUrl}
    />
  );
}
