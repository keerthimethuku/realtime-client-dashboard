import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { setAuthTokenGetter } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useToast } from './use-toast';

interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'project_manager' | 'developer';
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

let _tokenRef: string | null = null;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [_, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const storeToken = useCallback((token: string) => {
    _tokenRef = token;
    setAccessToken(token);
    setAuthTokenGetter(() => _tokenRef);
  }, []);

  const clearToken = useCallback(() => {
    _tokenRef = null;
    setAccessToken(null);
    setAuthTokenGetter(null);
  }, []);

  const scheduleRefresh = useCallback((delayMs: number) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          storeToken(data.accessToken);
          setUser(data.user);
          scheduleRefresh(13 * 60 * 1000);
        } else {
          clearToken();
          setUser(null);
          setLocation('/login');
        }
      } catch {
        clearToken();
        setUser(null);
        setLocation('/login');
      }
    }, delayMs);
  }, [storeToken, clearToken, setLocation]);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          storeToken(data.accessToken);
          setUser(data.user);
          scheduleRefresh(13 * 60 * 1000);
        }
      } catch {
        // No session
      } finally {
        setIsLoading(false);
      }
    };
    init();
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [storeToken, scheduleRefresh]);

  useEffect(() => {
    if (!isLoading && !user) {
      const path = window.location.pathname;
      if (path !== '/login') {
        setLocation('/login');
      }
    }
  }, [user, isLoading, setLocation]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Login failed');
    }
    const data = await res.json();
    storeToken(data.accessToken);
    setUser(data.user);
    scheduleRefresh(13 * 60 * 1000);
    toast({ title: 'Welcome back!', description: `Signed in as ${data.user.name}` });
    setLocation('/');
  }, [storeToken, scheduleRefresh, toast, setLocation]);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: _tokenRef ? { Authorization: `Bearer ${_tokenRef}` } : {},
        credentials: 'include',
      });
    } catch { }
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    clearToken();
    setUser(null);
    queryClient.clear();
    setLocation('/login');
  }, [clearToken, queryClient, setLocation]);

  return (
    <AuthContext.Provider value={{ user, isLoading, accessToken, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
