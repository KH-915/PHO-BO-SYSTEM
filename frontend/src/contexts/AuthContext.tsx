import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

export type UserRole = 'mentee' | 'tutor' | 'coordinator';

interface User {
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hard-coded credentials
const VALID_CREDENTIALS = {
  email: 'admin@gmail.com',
  password: '12345678'
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole>('mentee');

  // Check if user is already logged in on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedRole = localStorage.getItem('currentRole') as UserRole;
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    if (savedRole) {
      setCurrentRole(savedRole);
    }
  }, []);

  const login = (email: string, password: string): boolean => {
    // Validate credentials
    if (email === VALID_CREDENTIALS.email && password === VALID_CREDENTIALS.password) {
      const userData: User = {
        email: email,
        name: 'Admin User',
        role: 'mentee' // default role
      };
      setUser(userData);
      setCurrentRole('mentee');
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('currentRole', 'mentee');
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    setCurrentRole('mentee');
    localStorage.removeItem('user');
    localStorage.removeItem('currentRole');
    localStorage.removeItem('selectedRole'); // Clear selected role on logout
  };

  const handleSetCurrentRole = (role: UserRole) => {
    setCurrentRole(role);
    localStorage.setItem('currentRole', role);
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isAuthenticated: !!user,
      currentRole,
      setCurrentRole: handleSetCurrentRole
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
