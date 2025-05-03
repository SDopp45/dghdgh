export interface Message {
  id: number;
  content: string;
  role: 'user' | 'assistant' | 'system';
  createdAt: string;
}

export interface Conversation {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'closed';
  category: string;
}

export interface ProviderInfo {
  provider: string;
  providerName: string;
  displayName: string;
}

export interface AIProviderResponse {
  error?: string;
  success: boolean;
  provider: string;
  providerName: string;
  displayName: string;
}