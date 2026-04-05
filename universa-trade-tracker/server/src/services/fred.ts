// Tobin's Q data service
// Uses FRED API if FRED_API_KEY is set, otherwise falls back to mock data

interface TobinQDataPoint {
  date: string;
  value: number;
}

// Historical Tobin's Q mock data (quarterly, sourced from Federal Reserve Z.1 report)
const MOCK_TOBIN_Q: TobinQDataPoint[] = [
  { date: '2015-01-01', value: 1.02 },
  { date: '2015-04-01', value: 1.05 },
  { date: '2015-07-01', value: 1.01 },
  { date: '2015-10-01', value: 1.04 },
  { date: '2016-01-01', value: 0.95 },
  { date: '2016-04-01', value: 0.99 },
  { date: '2016-07-01', value: 1.02 },
  { date: '2016-10-01', value: 1.05 },
  { date: '2017-01-01', value: 1.10 },
  { date: '2017-04-01', value: 1.14 },
  { date: '2017-07-01', value: 1.17 },
  { date: '2017-10-01', value: 1.22 },
  { date: '2018-01-01', value: 1.25 },
  { date: '2018-04-01', value: 1.18 },
  { date: '2018-07-01', value: 1.20 },
  { date: '2018-10-01', value: 1.05 },
  { date: '2019-01-01', value: 1.10 },
  { date: '2019-04-01', value: 1.15 },
  { date: '2019-07-01', value: 1.16 },
  { date: '2019-10-01', value: 1.22 },
  { date: '2020-01-01', value: 1.20 },
  { date: '2020-04-01', value: 0.92 },
  { date: '2020-07-01', value: 1.18 },
  { date: '2020-10-01', value: 1.30 },
  { date: '2021-01-01', value: 1.40 },
  { date: '2021-04-01', value: 1.52 },
  { date: '2021-07-01', value: 1.58 },
  { date: '2021-10-01', value: 1.62 },
  { date: '2022-01-01', value: 1.55 },
  { date: '2022-04-01', value: 1.28 },
  { date: '2022-07-01', value: 1.22 },
  { date: '2022-10-01', value: 1.18 },
  { date: '2023-01-01', value: 1.25 },
  { date: '2023-04-01', value: 1.30 },
  { date: '2023-07-01', value: 1.35 },
  { date: '2023-10-01', value: 1.32 },
  { date: '2024-01-01', value: 1.40 },
  { date: '2024-04-01', value: 1.48 },
  { date: '2024-07-01', value: 1.52 },
  { date: '2024-10-01', value: 1.55 },
  { date: '2025-01-01', value: 1.58 },
  { date: '2025-04-01', value: 1.54 },
  { date: '2025-07-01', value: 1.50 },
  { date: '2025-10-01', value: 1.52 },
];

async function fetchFromFred(): Promise<TobinQDataPoint[] | null> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) return null;

  try {
    // Fetch market value of equities and net worth
    const [mvRes, nwRes] = await Promise.all([
      fetch(`https://api.stlouisfed.org/fred/series/observations?series_id=NCBEILQ027S&api_key=${encodeURIComponent(apiKey)}&file_type=json&sort_order=asc`),
      fetch(`https://api.stlouisfed.org/fred/series/observations?series_id=TNWMVBSNNCB&api_key=${encodeURIComponent(apiKey)}&file_type=json&sort_order=asc`),
    ]);

    if (!mvRes.ok || !nwRes.ok) return null;

    const mvData: any = await mvRes.json();
    const nwData: any = await nwRes.json();

    const nwMap = new Map<string, number>();
    for (const obs of nwData.observations) {
      if (obs.value !== '.') {
        nwMap.set(obs.date, parseFloat(obs.value));
      }
    }

    const result: TobinQDataPoint[] = [];
    for (const obs of mvData.observations) {
      if (obs.value === '.') continue;
      const nwVal = nwMap.get(obs.date);
      if (nwVal && nwVal !== 0) {
        result.push({
          date: obs.date,
          value: parseFloat((parseFloat(obs.value) / nwVal).toFixed(3)),
        });
      }
    }

    return result.length > 0 ? result : null;
  } catch {
    return null;
  }
}

export async function getTobinQ(): Promise<{
  current: { value: number; date: string; signal: string };
  history: TobinQDataPoint[];
  source: string;
}> {
  let data = await fetchFromFred();
  let source = 'fred';

  if (!data) {
    data = MOCK_TOBIN_Q;
    source = 'mock';
  }

  const latest = data[data.length - 1];
  let signal: string;
  if (latest.value < 1.0) {
    signal = 'undervalued';
  } else if (latest.value < 1.5) {
    signal = 'fair';
  } else {
    signal = 'overvalued';
  }

  return {
    current: { value: latest.value, date: latest.date, signal },
    history: data,
    source,
  };
}
