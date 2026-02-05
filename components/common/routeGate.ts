"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";

export const startRouteGate = () => {};
export const endRouteGate = () => {};

export const useGateRouter = () => {
  const router = useRouter();

  const push = useCallback(
    (...args: Parameters<typeof router.push>) => {
      return router.push(...args);
    },
    [router]
  );

  const replace = useCallback(
    (...args: Parameters<typeof router.replace>) => {
      return router.replace(...args);
    },
    [router]
  );

  return useMemo(() => ({ ...router, push, replace }), [router, push, replace]);
};
