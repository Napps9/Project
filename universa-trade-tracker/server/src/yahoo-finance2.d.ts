declare module 'yahoo-finance2' {
  const yahooFinance: {
    quote(symbol: string): Promise<any>;
    chart(symbol: string, options: any): Promise<any>;
    options(symbol: string, options?: any): Promise<any>;
  };
  export default yahooFinance;
}
