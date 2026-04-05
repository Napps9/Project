let yahooFinance: any = null;

async function getYahooFinance() {
  if (!yahooFinance) {
    const mod = await import('yahoo-finance2');
    yahooFinance = mod.default;
  }
  return yahooFinance;
}

export async function getSpyQuote() {
  const yf = await getYahooFinance();
  const quote = await yf.quote('SPY');
  return {
    price: quote.regularMarketPrice,
    change: quote.regularMarketChange,
    changePercent: quote.regularMarketChangePercent,
    previousClose: quote.regularMarketPreviousClose,
    marketState: quote.marketState,
    timestamp: quote.regularMarketTime,
  };
}

export async function getSpyHistory(range: string = '1y') {
  const periodMap: Record<string, { period1: string; interval: '1d' | '1wk' | '1mo' }> = {
    '1m': { period1: dateAgo(30), interval: '1d' },
    '3m': { period1: dateAgo(90), interval: '1d' },
    '6m': { period1: dateAgo(180), interval: '1d' },
    '1y': { period1: dateAgo(365), interval: '1d' },
    '5y': { period1: dateAgo(365 * 5), interval: '1wk' },
  };

  const config = periodMap[range] || periodMap['1y'];

  const yf = await getYahooFinance();
  const result = await yf.chart('SPY', {
    period1: config.period1,
    interval: config.interval,
  });

  return result.quotes.map((q: any) => ({
    date: q.date,
    open: q.open,
    high: q.high,
    low: q.low,
    close: q.close,
    volume: q.volume,
  }));
}

export async function getSpyOptions() {
  const yf = await getYahooFinance();
  const result = await yf.options('SPY');

  const puts = result.options?.[0]?.puts || [];

  return {
    expirationDate: result.options?.[0]?.expirationDate,
    expirationDates: result.expirationDates,
    puts: puts.map((p: any) => ({
      strike: p.strike,
      lastPrice: p.lastPrice,
      bid: p.bid,
      ask: p.ask,
      volume: p.volume,
      openInterest: p.openInterest,
      impliedVolatility: p.impliedVolatility,
      expiration: p.expiration,
      inTheMoney: p.inTheMoney,
    })),
  };
}

export async function getSpyOptionsForExpiry(expiryDate: string) {
  const yf = await getYahooFinance();
  const result = await yf.options('SPY', { date: new Date(expiryDate) });

  const puts = result.options?.[0]?.puts || [];

  return {
    expirationDate: result.options?.[0]?.expirationDate,
    puts: puts.map((p: any) => ({
      strike: p.strike,
      lastPrice: p.lastPrice,
      bid: p.bid,
      ask: p.ask,
      volume: p.volume,
      openInterest: p.openInterest,
      impliedVolatility: p.impliedVolatility,
      expiration: p.expiration,
      inTheMoney: p.inTheMoney,
    })),
  };
}

function dateAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}
