import { supabase } from "@/integrations/supabase/client";
import type { ChatMessage } from "./chat-stream";

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export async function fetchSessions(): Promise<ChatSession[]> {
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((d: any) => ({
    ...d,
    messages: (d.messages || []) as ChatMessage[],
  }));
}

export async function createSession(title?: string): Promise<ChatSession> {
  const { data, error } = await supabase
    .from("chat_sessions")
    .insert({ title: title || "محادثة جديدة", messages: [] })
    .select()
    .single();
  if (error) throw error;
  return { ...data, messages: data.messages as unknown as ChatMessage[] };
}

export async function updateSessionMessages(id: string, messages: ChatMessage[]): Promise<void> {
  const title = messages.find(m => m.role === "user")?.content?.slice(0, 50) || "محادثة جديدة";
  const { error } = await supabase
    .from("chat_sessions")
    .update({ messages: messages as any, title, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteSession(id: string): Promise<void> {
  const { error } = await supabase.from("chat_sessions").delete().eq("id", id);
  if (error) throw error;
}
