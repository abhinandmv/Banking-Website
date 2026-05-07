import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('banking_token');
    if (!token) { setLoading(false); return; }

    authAPI.verify()
      .then((res) => {
        if (res.data.success) setUser(res.data.data.user);
        else { localStorage.removeItem('banking_token'); localStorage.removeItem('banking_user'); }
      })
      .catch(() => { localStorage.removeItem('banking_token'); localStorage.removeItem('banking_user'); })
      .finally(() => setLoading(false));
  }, []);

  const login = async (acno, password, account_type) => {
    const res = await authAPI.login(acno, password, account_type);
    const { token, user: userData } = res.data.data;
    localStorage.setItem('banking_token', token);
    localStorage.setItem('banking_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('banking_token');
    localStorage.removeItem('banking_user');
    setUser(null);
  };

  const updateUser = (updates) => setUser((u) => ({ ...u, ...updates }));

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
