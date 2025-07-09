"use client";
import React, { useRef, ReactNode } from "react";
import { Provider } from "react-redux";
import { makeStore, AppStore } from "@/store/store";
import { UserState } from "@/store/slices/userSlice";
import { ItemsState } from "@/store/slices/itemsSlice";

interface AppProvidersProps {
  children: ReactNode;
  preloadedState?: {
    user?: UserState;
    items?: ItemsState;
  };
}

export function AppProviders({ children, preloadedState }: AppProvidersProps) {
  // Fix: Provide null as the initial value for useRef
  const storeRef = useRef<AppStore | null>(null);

  // Initialize store only once
  if (!storeRef.current) {
    storeRef.current = makeStore(preloadedState);
  }

  return (
    <Provider store={storeRef.current}>
      {children}
    </Provider>
  );
}