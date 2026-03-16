export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  file?: {
    name: string;
    type: string;
    size: number;
  };
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}
