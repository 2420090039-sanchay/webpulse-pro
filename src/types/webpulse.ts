export type DiffChunk = [operation: number, text: string];

export interface ActivityLogEntry {
  id: string;
  websiteName: string;
  websiteUrl: string;
  classification: string;
  timestamp: string;
  diffResult: unknown;
  aiSummary?: string | null;
  keywordSignals?: unknown;
}

export type RecentSnapshot = {
  id: string;
  screenshotPath: string | null;
  timestamp: string;
  isUp: boolean;
  httpStatus: number | null;
  responseTimeMs: number | null;
};

export interface WebsiteRow {
  _id: string;
  id?: string;
  name: string;
  url: string;
  status: string;
  lastChecked: string | null;
  keywordsJson?: string;
  keywords?: string[];
  lastIsUp?: boolean;
  lastHttpStatus?: number | null;
  lastLatencyMs?: number | null;
  uptimePercent?: number;
  recentSnapshots?: RecentSnapshot[];
  latestAiSummary?: string | null;
  latestKeywordSignals?: {
    appeared?: string[];
    disappeared?: string[];
    contextChanged?: { term: string; note: string }[];
  } | null;
}
