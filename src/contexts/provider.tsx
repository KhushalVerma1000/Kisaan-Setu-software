"use client";

import { PropsWithChildren, useRef } from "react";
import { Provider } from "react-redux";
import { makeStore, RootState, AppStore } from "@/store/store";

/**
 * Props:
 *  • children – React tree
 *  • preloadedState – data passed from the server (user, units, etc.)
 */
interface AppProvidersProps extends PropsWithChildren {
  preloadedState?: Partial<RootState>;
}

export function AppProviders({ children, preloadedState }: AppProvidersProps) {
  // Keep a single store instance for the whole client session
  const storeRef = useRef<AppStore>();

  if (!storeRef.current) {
    storeRef.current = makeStore(preloadedState);
  }

  return <Provider store={storeRef.current}>{children}</Provider>;
}
