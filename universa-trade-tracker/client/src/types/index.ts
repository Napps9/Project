export interface Portfolio {
  id: number;
  name: string;
  initial_cash: number;
  current_cash: number;
  created_at: string;
}

export interface PortfolioSummary {
  portfolio: {
    id: number;
    name: string;
    initialCash: number;
    currentCash: number;
    createdAt: string;
  };
  positions: {
    spy: { shares: number; value: number; price: number };
    puts: PutPosition[];
    putTotalValue: number;
    putTotalContracts: number;
  };
  totalValue: number;
  totalPnL: number;
  totalPnLPercent: number;
  allocation: { spy: number; puts: number; cash: number };
  targetAllocation: { spy: number; puts: number };
  needsRebalance: boolean;
}

export interface PutPosition {
  id: number;
  contracts: number;
  entryPrice: number;
  strike: number;
  expiry: string;
  value: number;
}

export interface SpyQuote {
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  marketState: string;
  timestamp: string;
}

export interface HistoryPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TobinQData {
  current: { value: number; date: string; signal: string };
  history: { date: string; value: number }[];
  source: string;
}

export interface Transaction {
  id: number;
  portfolio_id: number;
  action: string;
  quantity: number;
  price: number;
  total: number;
  created_at: string;
}

export interface OptionsData {
  expirationDate: string;
  expirationDates: string[];
  puts: PutOption[];
}

export interface PutOption {
  strike: number;
  lastPrice: number;
  bid: number;
  ask: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  expiration: string;
  inTheMoney: boolean;
}
