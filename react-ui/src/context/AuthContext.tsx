// src/context/AuthContext.tsx
import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { jwtDecode, JwtPayload } from 'jwt-decode';
import { set } from 'react-hook-form';

interface DecodedToken extends JwtPayload {
  role?: string;
  username?: string;
  name?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  userRole: string | null;
  username: string | null;
  name: string | null;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('jwtToken');
    if (token) {
      try {
        const decoded = jwtDecode<DecodedToken>(token);
        console.log(decoded);
        setUserRole(decoded.role || null);
        setUsername(decoded.username || null);
        setName(decoded.name || null);
        setIsAuthenticated(true);
      } catch (e) {
        setUserRole(null);
        setUsername(null);
        setName(null);
        setIsAuthenticated(false);
      }
    } else {
      setUserRole(null);
      setUsername(null);
      setName(null);
      setIsAuthenticated(false);
    }
    setIsLoading(false);
  }, []);

  const login = (token: string) => {
    localStorage.setItem('jwtToken', token);
    try {
      const decoded = jwtDecode<DecodedToken>(token);
      setUserRole(decoded.role || null);
      setUsername(decoded.username || null);
      setName(decoded.name || null);
      setIsAuthenticated(true);
    } catch (e) {
      setUserRole(null);
      setUsername(null);
      setName(null);
      setIsAuthenticated(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('jwtToken');
    setIsAuthenticated(false);
    setUserRole(null);
    setUsername(null);
    setName(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, userRole, username, name, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);