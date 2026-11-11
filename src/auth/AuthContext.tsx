import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { restoreSession } from "../api";
import type { User } from "../types";

type AuthContextValue = {
  user: User | null;
  setUser: (user: User | null) => void;
  booting: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    restoreSession()
      .then(setUser)
      .finally(() => setBooting(false));
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, booting }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
