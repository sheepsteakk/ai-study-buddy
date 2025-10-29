// src/api/client.ts

// If VITE_API_BASE_URL is set (GitHub Pages build), use it.
// Otherwise use '' so Vite dev proxy handles /api/v1/* locally.
const RAW = (import.meta.env.VITE_API_BASE_URL ?? '').trim();
export const API_BASE = RAW ? RAW.replace(/\/+$/, '') : '';

function join(base: string, path: string) {
  // joins like: https://host  + /api/v1/feedback  -> https://host/api/v1/feedback
  if (!base) return path; // dev proxy
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
}

async function fetchJSON<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function summarizePdf(file: File): Promise<{ summary: string }> {
  const fd = new FormData();
  fd.append('file', file);
  return fetchJSON(join(API_BASE, '/api/v1/summarize'), {
    method: 'POST',
    body: fd, // let the browser set multipart boundary
    mode: 'cors',
  });
}

export async function studyFromPdf(file: File): Promise<{ summary: string; quiz: any[] }> {
  const fd = new FormData();
  fd.append('file', file);
  return fetchJSON(join(API_BASE, '/api/v1/study'), {
    method: 'POST',
    body: fd,
    mode: 'cors',
  });
}

type FeedbackReq = {
  question: string;
  choices: string[];
  selected_index: number;
  answer_index: number;
  summary?: string;
  explain_if_correct?: boolean;
  detail?: 'short' | 'full';
};

export async function getFeedback(
  payload: FeedbackReq
): Promise<{ correct: boolean; explanation: string; guidance?: string }> {
  return fetchJSON(join(API_BASE, '/api/v1/feedback'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    mode: 'cors',
  });
}
