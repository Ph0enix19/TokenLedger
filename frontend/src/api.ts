export * from "./lib/api";
export type {
  AuditRow as AuditEntry,
  ChatTrace as PipelineTrace,
  ChatResponse,
  DashboardStats,
  ModelUsage,
  ToolCall,
} from "./types/tokenledger";

import { getAudit, getDashboardStats, sendChat } from "./lib/api";

export const fetchStats = getDashboardStats;
export const fetchAudit = getAudit;
export const postChat = (prompt: string, maxTokens: number) =>
  sendChat({ prompt, user_id: "dashboard", max_tokens: maxTokens });
