import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { User } from "@shared/schema";
import { useState } from 'react';

type RequestResult = {
  ok: true;
  user?: User;
  message?: string;
} | {
  ok: false;
  error: string;
};

async function handleRequest(
  url: string,
  method: string,
  body?: { 
    username: string; 
    password: string;
    fullName?: string;
    email?: string;
    phoneNumber?: string;
    company?: string;
  }
): Promise<RequestResult> {
  try {
    const response = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      return { 
        ok: false, 
        error: typeof data.error === 'string' ? data.error : 
          (data.message || response.statusText || 'An error occurred')
      };
    }

    return { 
      ok: true, 
      user: data.user,
      message: data.message
    };
  } catch (e: any) {
    return { 
      ok: false, 
      error: e.message || "An unexpected error occurred" 
    };
  }
}

async function fetchUser(): Promise<User | null> {
  try {
    const response = await fetch('/api/auth/check', {
      credentials: 'include'
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.log('User not authenticated');
        return null;
      }
      const error = await response.json();
      throw new Error(typeof error.error === 'string' ? error.error : 'Failed to fetch user');
    }

    const data = await response.json();
    
    if (!data.isAuthenticated || !data.user) {
      console.log('Auth check returned not authenticated');
      return null;
    }
    
    return data.user;
  } catch (error: any) {
    console.error('Error fetching user:', error);
    return null;
  }
}

export function useUser() {
  const queryClient = useQueryClient();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const { data: user, error, isLoading, refetch } = useQuery<User | null, Error>({
    queryKey: ['user'],
    queryFn: fetchUser,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: (failureCount, error) => {
      if (error.message.includes('401')) {
        return false;
      }
      return failureCount < 3;
    }
  });

  const loginMutation = useMutation<RequestResult, Error, { username: string; password: string; }>({
    mutationFn: (userData) => handleRequest('/api/login', 'POST', userData),
    onSuccess: (data) => {
      if (data.ok && data.user) {
        queryClient.setQueryData(['user'], data.user);
      }
    },
  });

  const logoutMutation = useMutation<RequestResult, Error>({
    mutationFn: () => handleRequest('/api/logout', 'POST'),
    onSuccess: () => {
      queryClient.setQueryData(['user'], null);
      queryClient.clear();
    },
  });

  const registerMutation = useMutation<RequestResult, Error, { 
    username: string; 
    password: string;
    fullName: string;
    email: string;
    phoneNumber?: string;
    company?: string;
  }>({
    mutationFn: (userData) => handleRequest('/api/register', 'POST', userData),
    onSuccess: (data) => {
      if (data.ok && data.user) {
        queryClient.setQueryData(['user'], data.user);
      }
    },
  });

  const logout = async () => {
    setIsLoggingOut(true);
    try {
      const result = await logoutMutation.mutateAsync();
      if (!result.ok) {
        throw new Error(result.error);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    } finally {
      setIsLoggingOut(false);
    }
  };

  return {
    user,
    isLoading,
    error: error?.message,
    isLoggingOut,
    login: loginMutation.mutateAsync,
    logout,
    register: registerMutation.mutateAsync,
    isLoginPending: loginMutation.isPending,
    isRegisterPending: registerMutation.isPending,
    loginError: loginMutation.error?.message || null,
    registerError: registerMutation.error?.message || null,
    mutate: refetch 
  };
}