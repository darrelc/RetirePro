import React, { useState, useMemo, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  LayoutDashboard, 
  Wallet, 
  PiggyBank, 
  TrendingUp, 
  Settings, 
  Plus, 
  Trash2, 
  Sparkles,
  Loader2,
  DollarSign,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { Asset, AssetType, FinancialSettings, IncomeStream } from './types';
import { runSimulation } from './utils/calculations';
import { SimulationCharts } from './components/SimulationCharts';
import { analyzeRetirementPlan } from './services/geminiService';

// Default Data
const DEFAULT_ASSETS: Asset[] = [
  { id: '1', name: 'My 401(k)', balance: 250000, contribution: 18000, returnRate: 7, type: AssetType.FOUR_01K },
  { id: '2', name: 'Roth IRA', balance: 55000, contribution: 6000, returnRate: 7, type: AssetType.ROTH_IRA },
];

const DEFAULT_INCOME: IncomeStream[] = [
  { id: '1', name: 'Social Security', monthlyAmount: 2500, startAge: 67, endAge: 95, growthRate: 2.5, isTaxable: true },
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'plan' | 'inputs'>('plan');
  
  // State
  const [settings, setSettings] = useState<FinancialSettings>({
    currentAge: 40,
    retirementAge: 65,
    planningHorizon: 90,
    monthlySpending: 6000,
    inflationRate: 3.0,
    preRetirementReturn: 7.0,
  });

  const [assets, setAssets] = useState<Asset[]>(DEFAULT_ASSETS);
  const [incomeStreams, setIncomeStreams] = useState<IncomeStream[]>(DEFAULT_INCOME);
  
  // AI State
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Derived State: Simulation Results
  const simulationResult = useMemo(() => {
    return runSimulation(settings, assets, incomeStreams);
  }, [settings, assets, incomeStreams]);

  // Helper: Unique keys for the chart
  const incomeKeys = useMemo(() => {
    const keys = new Set<string>();
    simulationResult.data.forEach(d => {
      Object.keys(d.breakdown).forEach(k => keys.add(k));
    });
    // Ensure 'Income Shortage' is last if present, 'Portfolio Withdrawals' usually near top
    return Array.from(keys).sort((a, b) => {
       if (a === 'Income Shortage') return 1;
       if (b === 'Income Shortage') return -1;
       return 0;
    });
  }, [simulationResult]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAiAnalysis(null);
    const result = await analyzeRetirementPlan(settings, simulationResult);
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  const addAsset = () => {
    setAssets([...assets, { 
      id: Math.random().toString(), 
      name: 'New Account', 
      balance: 0, 
      contribution: 0, 
      returnRate: 7, 
      type: AssetType.BROKERAGE 
    }]);
  };

  const removeAsset = (id: string) => {
    setAssets(assets.filter(a => a.id !== id));
  };

  const updateAsset = (id: string, field: keyof Asset, value: any) => {
    setAssets(assets.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  const addIncome = () => {
    setIncomeStreams([...incomeStreams, {
      id: Math.random().toString(),
      name: 'New Income',
      monthlyAmount: 0,
      startAge: 65,
      endAge: 95,
      growthRate: 0,
      isTaxable: false
    }]);
  };

  const removeIncome = (id: string) => {
    setIncomeStreams(incomeStreams.filter(s => s.id !== id));
  };

  const updateIncome = (id: string, field: keyof IncomeStream, value: any) => {
    setIncomeStreams(incomeStreams.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">RetireFlow<span className="text-indigo-600">Pro</span></h1>
          </div>
          <div className="flex gap-4">
             <button 
               onClick={() => setActiveTab('plan')}
               className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'plan' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:text-gray-900'}`}
             >
               Analysis
             </button>
             <button 
               onClick={() => setActiveTab('inputs')}
               className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'inputs' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:text-gray-900'}`}
             >
               Inputs & Assumptions
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* SUMMARY CARDS (Always visible) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
               <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Projected Success</p>
               <div className={`mt-2 flex items-center gap-2 ${simulationResult.success ? 'text-green-600' : 'text-red-600'}`}>
                  {simulationResult.success ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                  <span className="text-2xl font-bold">{simulationResult.success ? 'On Track' : 'Shortfall'}</span>
               </div>
               <p className="text-sm text-gray-500 mt-1">
                 {simulationResult.success 
                   ? `Funds last beyond age ${settings.planningHorizon}` 
                   : `Funds depleted at age ${simulationResult.depletionAge}`}
               </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
               <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Final Balance (Age {settings.planningHorizon})</p>
               <p className="mt-2 text-2xl font-bold text-indigo-900">${(simulationResult.finalBalance / 1000000).toFixed(2)}M</p>
               <p className="text-sm text-gray-500 mt-1">In future dollars</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
               <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Retirement Income Need</p>
               <p className="mt-2 text-2xl font-bold text-gray-900">${settings.monthlySpending.toLocaleString()}<span className="text-sm text-gray-400 font-normal">/mo</span></p>
               <p className="text-sm text-gray-500 mt-1">Today's dollars</p>
            </div>

             <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center">
               <button 
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
               >
                 {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                 {isAnalyzing ? 'Analyzing...' : 'AI Advisor Assessment'}
               </button>
            </div>
        </div>

        {/* AI ANALYSIS SECTION */}
        {aiAnalysis && (
          <div className="mb-8 bg-white rounded-xl border border-indigo-100 shadow-sm overflow-hidden">
             <div className="bg-indigo-50 px-6 py-4 border-b border-indigo-100 flex items-center gap-2">
               <Sparkles className="w-5 h-5 text-indigo-600" />
               <h3 className="font-semibold text-indigo-900">Gemini Analysis</h3>
             </div>
             <div className="p-6 prose prose-indigo max-w-none text-gray-700 whitespace-pre-line">
               {aiAnalysis}
             </div>
          </div>
        )}

        {activeTab === 'plan' ? (
          <div className="space-y-6">
            {/* Chart */}
            <SimulationCharts 
              data={simulationResult.data} 
              incomeKeys={incomeKeys}
              retirementAge={settings.retirementAge} 
            />
            
            {/* Quick Controls for Interactive Charting */}
             <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-4">Quick Adjustments</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Retirement Age: <span className="text-indigo-600 font-bold">{settings.retirementAge}</span></label>
                    <input 
                      type="range" 
                      min="50" 
                      max="80" 
                      value={settings.retirementAge} 
                      onChange={(e) => setSettings({...settings, retirementAge: parseInt(e.target.value)})}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1"><span>50</span><span>80</span></div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Spend: <span className="text-indigo-600 font-bold">${settings.monthlySpending}</span></label>
                    <input 
                      type="range" 
                      min="2000" 
                      max="20000" 
                      step="100"
                      value={settings.monthlySpending} 
                      onChange={(e) => setSettings({...settings, monthlySpending: parseInt(e.target.value)})}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1"><span>$2k</span><span>$20k</span></div>
                  </div>
                   <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Inflation: <span className="text-indigo-600 font-bold">{settings.inflationRate}%</span></label>
                    <input 
                      type="range" 
                      min="1" 
                      max="8" 
                      step="0.1"
                      value={settings.inflationRate} 
                      onChange={(e) => setSettings({...settings, inflationRate: parseFloat(e.target.value)})}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1"><span>1%</span><span>8%</span></div>
                  </div>
                </div>
             </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* COLUMN 1: Assets */}
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                 <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-gray-500" /> Assets
                    </h2>
                    <button onClick={addAsset} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1">
                      <Plus className="w-4 h-4" /> Add
                    </button>
                 </div>
                 <div className="space-y-4">
                    {assets.map(asset => (
                      <div key={asset.id} className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <div className="flex justify-between mb-2">
                          <input 
                            type="text" 
                            value={asset.name}
                            onChange={(e) => updateAsset(asset.id, 'name', e.target.value)}
                            className="bg-transparent font-medium text-gray-900 border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none w-full mr-2"
                          />
                          <button onClick={() => removeAsset(asset.id)} className="text-gray-400 hover:text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-gray-500 block">Current Balance</label>
                            <div className="relative">
                              <span className="absolute left-2 top-1.5 text-xs text-gray-500">$</span>
                              <input 
                                type="number" 
                                value={asset.balance}
                                onChange={(e) => updateAsset(asset.id, 'balance', parseFloat(e.target.value))}
                                className="w-full pl-5 py-1 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block">Annual Additions</label>
                             <div className="relative">
                              <span className="absolute left-2 top-1.5 text-xs text-gray-500">$</span>
                              <input 
                                type="number" 
                                value={asset.contribution}
                                onChange={(e) => updateAsset(asset.id, 'contribution', parseFloat(e.target.value))}
                                className="w-full pl-5 py-1 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block">Return %</label>
                            <input 
                              type="number" 
                              value={asset.returnRate}
                              onChange={(e) => updateAsset(asset.id, 'returnRate', parseFloat(e.target.value))}
                              className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                          </div>
                          <div>
                             <label className="text-xs text-gray-500 block">Type</label>
                             <select 
                               value={asset.type}
                               onChange={(e) => updateAsset(asset.id, 'type', e.target.value)}
                               className="w-full text-xs py-1 border border-gray-200 rounded"
                             >
                               {Object.values(AssetType).map(t => <option key={t} value={t}>{t}</option>)}
                             </select>
                          </div>
                        </div>
                      </div>
                    ))}
                 </div>
              </div>
            </div>

            {/* COLUMN 2: Income Streams */}
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                 <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <PiggyBank className="w-5 h-5 text-gray-500" /> Income Sources
                    </h2>
                    <button onClick={addIncome} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1">
                      <Plus className="w-4 h-4" /> Add
                    </button>
                 </div>
                  <div className="space-y-4">
                    {incomeStreams.map(stream => (
                      <div key={stream.id} className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <div className="flex justify-between mb-2">
                          <input 
                            type="text" 
                            value={stream.name}
                            onChange={(e) => updateIncome(stream.id, 'name', e.target.value)}
                            className="bg-transparent font-medium text-gray-900 border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none w-full mr-2"
                          />
                          <button onClick={() => removeIncome(stream.id)} className="text-gray-400 hover:text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2">
                            <label className="text-xs text-gray-500 block">Monthly Amount (Today's $)</label>
                            <div className="relative">
                              <span className="absolute left-2 top-1.5 text-xs text-gray-500">$</span>
                              <input 
                                type="number" 
                                value={stream.monthlyAmount}
                                onChange={(e) => updateIncome(stream.id, 'monthlyAmount', parseFloat(e.target.value))}
                                className="w-full pl-5 py-1 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block">Start Age</label>
                            <input 
                              type="number" 
                              value={stream.startAge}
                              onChange={(e) => updateIncome(stream.id, 'startAge', parseFloat(e.target.value))}
                              className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                          </div>
                           <div>
                            <label className="text-xs text-gray-500 block">End Age</label>
                            <input 
                              type="number" 
                              value={stream.endAge}
                              onChange={(e) => updateIncome(stream.id, 'endAge', parseFloat(e.target.value))}
                              className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block">COLA / Growth %</label>
                            <input 
                              type="number" 
                              value={stream.growthRate}
                              onChange={(e) => updateIncome(stream.id, 'growthRate', parseFloat(e.target.value))}
                              className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                 </div>
              </div>
            </div>

            {/* COLUMN 3: Global Settings */}
            <div className="space-y-6">
               <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                 <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <Settings className="w-5 h-5 text-gray-500" /> Assumptions
                    </h2>
                 </div>
                 <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Current Age</label>
                      <input 
                        type="number" 
                        value={settings.currentAge} 
                        onChange={(e) => setSettings({...settings, currentAge: parseInt(e.target.value)})}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                     <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Retirement Age</label>
                      <input 
                        type="number" 
                        value={settings.retirementAge} 
                        onChange={(e) => setSettings({...settings, retirementAge: parseInt(e.target.value)})}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                     <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Plan Until Age</label>
                      <input 
                        type="number" 
                        value={settings.planningHorizon} 
                        onChange={(e) => setSettings({...settings, planningHorizon: parseInt(e.target.value)})}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <hr className="border-gray-100 my-2" />
                     <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Inflation Rate (%)</label>
                      <input 
                        type="number" 
                        step="0.1"
                        value={settings.inflationRate} 
                        onChange={(e) => setSettings({...settings, inflationRate: parseFloat(e.target.value)})}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Spending (Today's $)</label>
                       <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                        <input 
                          type="number" 
                          value={settings.monthlySpending} 
                          onChange={(e) => setSettings({...settings, monthlySpending: parseInt(e.target.value)})}
                          className="w-full p-2 pl-7 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                    </div>
                 </div>
               </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
};

export default App;
