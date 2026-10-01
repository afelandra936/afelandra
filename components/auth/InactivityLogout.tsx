"use client";

import { useEffect, useRef } from "react";
import { logoutAction } from "@/lib/actions/auth";

const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutos sin actividad
const EVENTOS_ACTIVIDAD = ["mousedown", "keydown", "touchstart", "scroll"] as const;

/** Cierra la sesión automáticamente (ambos roles) después de un período sin actividad
 * — por seguridad, para que no quede una sesión de admin abierta sin querer. */
export function InactivityLogout() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function resetTimer() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        logoutAction();
      }, TIMEOUT_MS);
    }

    resetTimer();
    for (const evento of EVENTOS_ACTIVIDAD) {
      window.addEventListener(evento, resetTimer, { passive: true });
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const evento of EVENTOS_ACTIVIDAD) {
        window.removeEventListener(evento, resetTimer);
      }
    };
  }, []);

  return null;
}
