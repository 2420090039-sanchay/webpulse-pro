"use client";

import { Toaster } from "sonner";
import { useTheme } from "next-themes";

export function AppToaster() {
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "light" ? "light" : "dark";

  return (
    <Toaster
      theme={theme}
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        className: "font-sans",
      }}
    />
  );
}
