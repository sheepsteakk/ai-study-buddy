// src/api/client.ts
const BASE = import.meta.env.VITE_API_BASE_URL || ''; // '' uses Vite proxy

export async function summarizePdf(file: File): Promise<{ summary: string }> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`${BASE}/api/v1/summarize`, { method: 'POST', body: fd });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function studyFromPdf(file: File): Promise<{ summary: string; quiz: any[] }> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`${BASE}/api/v1/study`, { method: 'POST', body: fd });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
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
export async function getFeedback(payload: FeedbackReq): Promise<{correct:boolean; explanation:string; guidance?:string}> {
  const res = await fetch(`${BASE}/api/v1/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
