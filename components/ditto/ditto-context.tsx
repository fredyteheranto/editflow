"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface DittoContextValue {
  role: string | undefined;
  setRole: (role: string | undefined) => void;
}

const DittoContext = createContext<DittoContextValue>({
  role: undefined,
  setRole: () => {},
});

export function DittoProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<string | undefined>(undefined);
  return <DittoContext.Provider value={{ role, setRole }}>{children}</DittoContext.Provider>;
}

export function useDittoRole() {
  return useContext(DittoContext).role;
}

export function DittoRoleBridge({ role }: { role: string }) {
  const { setRole } = useContext(DittoContext);
  useEffect(() => {
    setRole(role);
    return () => setRole(undefined);
  }, [role, setRole]);
  return null;
}
