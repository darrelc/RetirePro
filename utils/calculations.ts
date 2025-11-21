import { Asset, FinancialSettings, IncomeStream, SimulationResult, YearData } from "../types";

export const runSimulation = (
  settings: FinancialSettings,
  assets: Asset[],
  incomeStreams: IncomeStream[]
): SimulationResult => {
  const startYear = new Date().getFullYear();
  const yearsToRun = settings.planningHorizon - settings.currentAge + 1;
  const data: YearData[] = [];

  // Deep copy assets to track running balances
  let currentAssets = assets.map(a => ({ ...a }));
  let portfolioBalance = currentAssets.reduce((sum, a) => sum + a.balance, 0);
  let depletionAge: number | null = null;

  for (let i = 0; i < yearsToRun; i++) {
    const currentAge = settings.currentAge + i;
    const currentYear = startYear + i;
    const isRetired = currentAge >= settings.retirementAge;

    // 1. Calculate Expense (Inflation Adjusted)
    const inflationMultiplier = Math.pow(1 + settings.inflationRate / 100, i);
    const requiredAnnualExpense = settings.monthlySpending * 12 * inflationMultiplier;

    // 2. Process Income Streams
    let totalFixedIncome = 0;
    const breakdown: Record<string, number> = {};

    incomeStreams.forEach(stream => {
      if (currentAge >= stream.startAge && currentAge <= stream.endAge) {
        // Calculate growth for this stream relative to its start
        const streamYearsActive = Math.max(0, currentAge - stream.startAge); 
        // Usually COLA starts when the income starts, but for simplicity we'll inflate from "now" 
        // if it's something like rental income, or from startAge if it's like a pension with COLA.
        // Here we assume the amount provided is in "Today's dollars" and grows by its specific rate from today.
        const streamMultiplier = Math.pow(1 + stream.growthRate / 100, i);
        const annualAmount = stream.monthlyAmount * 12 * streamMultiplier;
        
        totalFixedIncome += annualAmount;
        breakdown[stream.name] = Math.round(annualAmount);
      }
    });

    // 3. Asset Growth & Contributions (Before withdrawal)
    let totalAssetGrowth = 0;
    let totalContributions = 0;

    currentAssets.forEach(asset => {
      // Grow
      const growth = asset.balance * (asset.returnRate / 100);
      asset.balance += growth;
      totalAssetGrowth += growth;

      // Contribute (only if not retired)
      if (!isRetired) {
        // Inflate contributions? Typically contributions increase with salary/inflation.
        // Let's assume contributions increase by inflation rate for simplicity.
        const annualContribution = asset.contribution * inflationMultiplier;
        asset.balance += annualContribution;
        totalContributions += annualContribution;
      }
    });

    // 4. Determine Withdrawal Need
    let withdrawalNeeded = 0;
    let shortage = 0;

    if (isRetired) {
      const gap = requiredAnnualExpense - totalFixedIncome;
      if (gap > 0) {
        withdrawalNeeded = gap;
      }
    }

    // 5. Execute Withdrawal (Proportional Drawdown for simplicity)
    let actualWithdrawal = 0;
    const totalAvailable = currentAssets.reduce((sum, a) => sum + a.balance, 0);

    if (withdrawalNeeded > 0 && totalAvailable > 0) {
      if (totalAvailable >= withdrawalNeeded) {
        actualWithdrawal = withdrawalNeeded;
        // Reduce each asset proportionally
        currentAssets.forEach(asset => {
          const share = asset.balance / totalAvailable;
          asset.balance -= withdrawalNeeded * share;
        });
      } else {
        // Drained
        actualWithdrawal = totalAvailable;
        currentAssets.forEach(asset => asset.balance = 0);
        shortage = withdrawalNeeded - totalAvailable;
        if (!depletionAge) depletionAge = currentAge;
      }
    } else if (withdrawalNeeded > 0 && totalAvailable <= 0) {
      shortage = withdrawalNeeded;
      if (!depletionAge) depletionAge = currentAge;
    }

    breakdown['Portfolio Withdrawals'] = Math.round(actualWithdrawal);
    if (shortage > 0) {
        breakdown['Income Shortage'] = Math.round(shortage);
    }

    // Recalculate Total Portfolio Balance
    portfolioBalance = currentAssets.reduce((sum, a) => sum + a.balance, 0);

    data.push({
      age: currentAge,
      year: currentYear,
      expenses: Math.round(requiredAnnualExpense),
      totalIncome: Math.round(totalFixedIncome + actualWithdrawal),
      portfolioBalance: Math.round(portfolioBalance),
      withdrawals: Math.round(actualWithdrawal),
      shortfall: Math.round(shortage),
      breakdown
    });
  }

  return {
    success: depletionAge === null,
    depletionAge,
    finalBalance: portfolioBalance,
    data
  };
};
