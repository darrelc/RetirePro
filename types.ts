export enum AssetType {
  FOUR_01K = '401(k)/403(b)',
  ROTH_IRA = 'Roth IRA',
  BROKERAGE = 'Taxable Brokerage',
  SAVINGS = 'Cash/Savings'
}

export interface Asset {
  id: string;
  name: string;
  balance: number;
  contribution: number; // Annual
  returnRate: number; // Annual %
  type: AssetType;
}

export interface IncomeStream {
  id: string;
  name: string;
  monthlyAmount: number;
  startAge: number;
  endAge: number;
  growthRate: number; // Annual COLA %
  isTaxable: boolean;
}

export interface FinancialSettings {
  currentAge: number;
  retirementAge: number;
  planningHorizon: number; // Age to plan until (e.g., 95)
  monthlySpending: number; // In today's dollars
  inflationRate: number;
  preRetirementReturn: number;
}

export interface YearData {
  age: number;
  year: number;
  expenses: number;
  totalIncome: number;
  portfolioBalance: number;
  shortfall: number;
  withdrawals: number;
  breakdown: Record<string, number>; // Key is income source name
}

export interface SimulationResult {
  success: boolean;
  depletionAge: number | null;
  finalBalance: number;
  data: YearData[];
}
