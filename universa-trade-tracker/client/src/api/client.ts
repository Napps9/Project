const BASE = '/api';

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export const api = {
  // Portfolio
  listPortfolios: () => fetchJson<any[]>('/portfolio'),
  createPortfolio: (name: string, initialCash: number) =>
    fetchJson<any>('/portfolio', {
      method: 'POST',
      body: JSON.stringify({ name, initialCash }),
    }),
  getPortfolio: (id: number) => fetchJson<any>(`/portfolio/${id}`),
  invest: (id: number) =>
    fetchJson<any>(`/portfolio/${id}/invest`, { method: 'POST' }),
  getTransactions: (id: number) => fetchJson<any[]>(`/portfolio/${id}/transactions`),

  // Market
  getQuote: () => fetchJson<any>('/market/quote'),
  getHistory: (range: string = '1y') => fetchJson<any[]>(`/market/history?range=${range}`),
  getOptions: () => fetchJson<any>('/market/options'),

  // Indicators
  getTobinQ: () => fetchJson<any>('/indicators/tobin-q'),
};
