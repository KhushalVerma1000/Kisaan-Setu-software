"use client";

import { createContext, useContext, useState, ReactNode, useCallback } from "react";

interface HeaderButton {
  label: string;
  onClick: () => void;
}

interface HeaderContextType {
  headerButtons: HeaderButton[];
  setHeaderButtons: (buttons: HeaderButton[]) => void;
}

const HeaderContext = createContext<HeaderContextType | undefined>(undefined);

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [headerButtons, setHeaderButtons] = useState<HeaderButton[]>([]);

  // Memoize the setHeaderButtons function to prevent unnecessary re-renders
  const memoizedSetHeaderButtons = useCallback((buttons: HeaderButton[]) => {
    setHeaderButtons(buttons);
  }, []);

  return (
    <HeaderContext.Provider value={{ headerButtons, setHeaderButtons: memoizedSetHeaderButtons }}>
      {children}
    </HeaderContext.Provider>
  );
}

export function useHeaderContext() {
  const context = useContext(HeaderContext);
  if (context === undefined) {
    throw new Error("useHeaderContext must be used within a HeaderProvider");
  }
  return context;
}