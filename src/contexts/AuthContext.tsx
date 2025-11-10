import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../services/api";

type Address = {
  id: number;
  label: string;
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  number?: string;
  complement?: string;
  note?: string;
};

export type UserRole = "client" | "store" | "delivery" | "admin";

export type User = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  photo?: string | null;
  addresses?: Address[];
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | undefined>;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const storedUser = await AsyncStorage.getItem("@user");
        const storedToken = await AsyncStorage.getItem("@token");

        if (storedUser && storedToken) {
          const parsedUser = JSON.parse(storedUser) as User;
          setUser(parsedUser);
          setToken(storedToken);
          api.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`;
        }
      } catch (error) {
        console.error("Erro ao carregar usuário:", error);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  const login = async (userData: User, authToken: string) => {
    if (!userData || !authToken) {
      console.error("Login falhou: dados de usuário ou token ausentes.");
      throw new Error("Usuário ou token inválido");
    }

    try {
      setUser(userData);
      setToken(authToken);
      await AsyncStorage.setItem("@user", JSON.stringify(userData));
      await AsyncStorage.setItem("@token", authToken);
      api.defaults.headers.common["Authorization"] = `Bearer ${authToken}`;
    } catch (error) {
      console.error("Erro no login:", error);
    }
  };

  const logout = async () => {
    try {
      setUser(null);
      setToken(null);
      await AsyncStorage.removeItem("@user");
      await AsyncStorage.removeItem("@token");
      delete api.defaults.headers.common["Authorization"];
    } catch (error) {
      console.error("Erro no logout:", error);
    }
  };

  const refreshUser = async () => {
    try {
      const token = await AsyncStorage.getItem('@token');
      if (!token) return;

      const { data } = await api.get<User>("/clients/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUser(data);
      await AsyncStorage.setItem("@user", JSON.stringify(data));

      return data;
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, refreshUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
}