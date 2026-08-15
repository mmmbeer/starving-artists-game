"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ConfirmationOptions = {
  title: string;
  message: string;
  confirmLabel: string;
};

type PendingConfirmation = ConfirmationOptions & {
  resolve: (confirmed: boolean) => void;
};

export function useConfirmation() {
  const [pending, setPending] = useState<PendingConfirmation | null>(null);
  const pendingRef = useRef<PendingConfirmation | null>(null);

  const respond = useCallback((confirmed: boolean) => {
    const current = pendingRef.current;
    pendingRef.current = null;
    setPending(null);
    current?.resolve(confirmed);
  }, []);

  const confirm = useCallback((options: ConfirmationOptions) => {
    pendingRef.current?.resolve(false);
    return new Promise<boolean>((resolve) => {
      const request = { ...options, resolve };
      pendingRef.current = request;
      setPending(request);
    });
  }, []);

  useEffect(
    () => () => {
      pendingRef.current?.resolve(false);
      pendingRef.current = null;
    },
    [],
  );

  return { confirm, pending, respond };
}

export type ConfirmationController = ReturnType<typeof useConfirmation>;
