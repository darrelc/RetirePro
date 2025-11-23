import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  CheckCircle2,
  Save,
  Upload,
  Download,
  Copy,
  FileJson,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Edit2,
  FolderOpen
} from 'lucide-react';
import { Asset, AssetType, FinancialSettings, IncomeStream, Scenario, RetireFlowFile } from './types';
import { runSimulation } from './utils/calculations';
import { SimulationCharts } from './components/SimulationCharts';
import { analyzeRetirementPlan } from './services/geminiService';

// Default Data
const DEFAULT_ASSETS: Asset[] = [
  { id: '1', name: 'My 401(k)', balance: 250000, contribution: 18000, returnRate: 7, type: AssetType.FOUR_01K },
  { id: '2', name: 'Roth IRA', balance: 55000, contribution: 6000, returnRate: 7, type: AssetType.ROTH_IRA },
];

const DEFAULT_INCOME: IncomeStream[] = [
  { id: '1', name: 'Social Security', monthlyAmount: 2500, startAge: 67, endAge: 95, growthRate: 2.5, isTaxable: true, color: '#4f46e5' },
];

const DEFAULT_SETTINGS: FinancialSettings = {
  currentAge: 40,
  retirementAge: 65,
  planningHorizon: 90,
  monthlySpending: 6000,
  inflationRate: 3.0,
  preRetirementReturn: 7.0,
};

const PALETTE = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'plan' | 'inputs'>('plan');
  
  // --- Scenario State Management ---
  const [scenarios, setScenarios] = useState<Scenario[]>([{
    id: 'default',
    name: 'Base Plan',
    assets: DEFAULT_ASSETS,
    incomeStreams: DEFAULT_INCOME,
    settings: DEFAULT_SETTINGS,
    createdAt: Date.now()
  }]);
  const [activeScenarioId, setActiveScenarioId] = useState<string>('default');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditingName, setIsEditingName] = useState(false);

  // Derived Active Scenario
  const activeScenario = useMemo(() => 
    scenarios.find(s => s.id === activeScenarioId) || scenarios[0], 
  [scenarios, activeScenarioId]);

  // AI State
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // --- Scenario Actions ---
  const updateActiveScenario = (updates: Partial<Scenario>) => {
    setScenarios(prev => prev.map(s => 
      s.id === activeScenarioId ? { ...s, ...updates } : s
    ));
  };

  const switchScenario = (direction: 'prev' | 'next') => {
    const idx = scenarios.findIndex(s => s.id === activeScenarioId);
    let newIdx = direction === 'next' ? idx + 1 : idx - 1;
    if (newIdx < 0) newIdx = scenarios.length - 1;
    if (newIdx >= scenarios.length) newIdx = 0;
    setActiveScenarioId(scenarios[newIdx].id);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent switching if user is typing in an input
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

      if (e.key === 'ArrowLeft') switchScenario('prev');
      if (e.key === 'ArrowRight') switchScenario('next');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeScenarioId, scenarios]);

  const handleAddScenario = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    const newScenario: Scenario = {
      ...JSON.parse(JSON.stringify(activeScenario)), // Deep Clone
      id: newId,
      name: `${activeScenario.name} (Copy)`,
      createdAt: Date.now()
    };
    setScenarios([...scenarios, newScenario]);
    setActiveScenarioId(newId);
  };

  const handleDeleteScenario = (id: string) => {
    if (scenarios.length <= 1) {
      alert("You must have at least one scenario.");
      return;
    }
    const newScenarios = scenarios.filter(s => s.id !== id);
    setScenarios(newScenarios);
    if (activeScenarioId === id) {
      setActiveScenarioId(newScenarios[0].id);
    }
  };

  const handleExport = () => {
    const data: RetireFlowFile = {
      version: 1,
      scenarios,
      activeScenarioId
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `retireflow_scenarios_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content) as RetireFlowFile;
        
        if (data.scenarios && Array.isArray(data.scenarios)) {
          setScenarios(data.scenarios);
          setActiveScenarioId(data.activeScenarioId || data.scenarios[0].id);
          // Reset AI state as data changed
          setAiAnalysis(null);
        } else {
          alert("Invalid file format.");
        }
      } catch (err) {
        console.error(err);
        alert("Failed to parse file.");
      }
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  // --- Simulation ---
  const simulationResult = useMemo(() => {
    return runSimulation(activeScenario.settings, activeScenario.assets, activeScenario.incomeStreams);
  }, [activeScenario]);

  const incomeKeys = useMemo(() => {
    const keys = new Set<string>();
    simulationResult.data.forEach(d => {
      Object.keys(d.breakdown).forEach(k => keys.add(k));
    });
    return Array.from(keys).sort((a, b) => {
       if (a === 'Income Shortage') return 1;
       if (b === 'Income Shortage') return -1;
       return 0;
    });
  }, [simulationResult]);

  const colorMap = useMemo(() => {
    const map: Record<string, string> = {};
    activeScenario.incomeStreams.forEach(s => map[s.name] = s.color);
    map['Portfolio Withdrawals'] = '#94a3b8'; // slate-400
    map['Income Shortage'] = '#ef4444'; // red-500
    return map;
  }, [activeScenario.incomeStreams]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAiAnalysis(null);
    const result = await analyzeRetirementPlan(activeScenario.settings, simulationResult);
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  // --- Update Helpers ---
  const addAsset = () => {
    const newAsset: Asset = { 
      id: Math.random().toString(), 
      name: 'New Account', 
      balance: 0, 
      contribution: 0, 
      returnRate: 7, 
      type: AssetType.BROKERAGE 
    };
    updateActiveScenario({ assets: [...activeScenario.assets, newAsset] });
  };

  const removeAsset = (id: string) => {
    updateActiveScenario({ assets: activeScenario.assets.filter(a => a.id !== id) });
  };

  const updateAsset = (id: string, field: keyof Asset, value: any) => {
    updateActiveScenario({ 
      assets: activeScenario.assets.map(a => a.id === id ? { ...a, [field]: value } : a) 
    });
  };

  const addIncome = () => {
    const randomColor = PALETTE[Math.floor(Math.random() * PALETTE.length)];
    const newStream: IncomeStream = {
      id: Math.random().toString(),
      name: 'New Income',
      monthlyAmount: 0,
      startAge: 65,
      endAge: 95,
      growthRate: 0,
      isTaxable: false,
      color: randomColor
    };
    updateActiveScenario({ incomeStreams: [...activeScenario.incomeStreams, newStream] });
  };

  const removeIncome = (id: string) => {
    updateActiveScenario({ incomeStreams: activeScenario.incomeStreams.filter(s => s.id !== id) });
  };

  const updateIncome = (id: string, field: keyof IncomeStream, value: any) => {
    updateActiveScenario({ 
      incomeStreams: activeScenario.incomeStreams.map(s => s.id === id ? { ...s, [field]: value } : s) 
    });
  };

  const updateSettings = (updates: Partial<FinancialSettings>) => {
    updateActiveScenario({ settings: { ...activeScenario.settings, ...updates } });
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept=".json" 
      />

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
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
        </div>
        
        {/* Scenario Bar */}
        <div className="bg-gray-100 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between">
            
            <div className="flex items-center gap-2 flex-1">
              {/* Prev Button */}
              <button 
                 onClick={() => switchScenario('prev')}
                 className="p-1.5 bg-white text-gray-600 rounded-md border border-gray-300 hover:bg-gray-50 shadow-sm"
                 title="Previous Scenario (Left Arrow)"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="relative group">
                 <div className="flex items-center gap-2 text-sm font-medium text-gray-700 bg-white px-3 py-1.5 rounded-md shadow-sm border border-gray-200 cursor-pointer hover:bg-gray-50">
                   <FolderOpen className="w-4 h-4 text-gray-500" />
                   <select 
                    value={activeScenarioId}
                    onChange={(e) => setActiveScenarioId(e.target.value)}
                    className="bg-transparent border-none focus:ring-0 p-0 text-gray-800 font-semibold cursor-pointer w-32 sm:w-48 truncate"
                   >
                     {scenarios.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                   </select>
                 </div>
              </div>

               {/* Next Button */}
               <button 
                 onClick={() => switchScenario('next')}
                 className="p-1.5 bg-white text-gray-600 rounded-md border border-gray-300 hover:bg-gray-50 shadow-sm"
                 title="Next Scenario (Right Arrow)"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {isEditingName ? (
                <div className="flex items-center gap-2 ml-2">
                   <input 
                    type="text" 
                    value={activeScenario.name}
                    autoFocus
                    onBlur={() => setIsEditingName(false)}
                    onChange={(e) => updateActiveScenario({ name: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                    className="px-2 py-1 text-sm bg-white text-gray-900 border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                   />
                </div>
              ) : (
                <button 
                  onClick={() => setIsEditingName(true)} 
                  className="p-1.5 ml-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                  title="Rename Scenario"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
              
              <div className="h-4 w-px bg-gray-300 mx-2"></div>

              <button 
                onClick={handleAddScenario}
                className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-indigo-700 px-2 py-1.5 rounded hover:bg-white transition-colors"
                title="Clone Current Scenario"
              >
                <Copy className="w-4 h-4" /> Copy / New
              </button>

              {scenarios.length > 1 && (
                <button 
                  onClick={() => handleDeleteScenario(activeScenarioId)}
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-red-600 px-2 py-1.5 rounded hover:bg-white transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
               <button 
                 onClick={handleImportClick}
                 className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-white rounded-md transition-colors"
               >
                 <Upload className="w-4 h-4" />
                 <span className="hidden sm:inline">Load File</span>
               </button>
               <button 
                 onClick={handleExport}
                 className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-gray-300 text-gray-700 shadow-sm hover:bg-gray-50 rounded-md transition-colors"
               >
                 <Save className="w-4 h-4 text-indigo-600" />
                 <span className="hidden sm:inline">Save to File</span>
               </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
               <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Projected Success</p>
               <div className={`mt-2 flex items-center gap-2 ${simulationResult.success ? 'text-green-600' : 'text-red-600'}`}>
                  {simulationResult.success ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                  <span className="text-2xl font-bold">{simulationResult.success ? 'On Track' : 'Shortfall'}</span>
               </div>
               <p className="text-sm text-gray-500 mt-1">
                 {simulationResult.success 
                   ? `Funds last beyond age ${activeScenario.settings.planningHorizon}` 
                   : `Funds depleted at age ${simulationResult.depletionAge}`}
               </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
               <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Final Balance (Age {activeScenario.settings.planningHorizon})</p>
               <p className="mt-2 text-2xl font-bold text-indigo-900">${(simulationResult.finalBalance / 1000000).toFixed(2)}M</p>
               <p className="text-sm text-gray-500 mt-1">In future dollars</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
               <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Retirement Income Need</p>
               <p className="mt-2 text-2xl font-bold text-gray-900">${activeScenario.settings.monthlySpending.toLocaleString()}<span className="text-sm text-gray-400 font-normal">/mo</span></p>
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
              retirementAge={activeScenario.settings.retirementAge}
              colorMap={colorMap} 
            />
            
            {/* Quick Controls for Interactive Charting */}
             <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-4">Quick Adjustments</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Retirement Age: <span className="text-indigo-600 font-bold">{activeScenario.settings.retirementAge}</span></label>
                    <input 
                      type="range" 
                      min="50" 
                      max="80" 
                      value={activeScenario.settings.retirementAge} 
                      onChange={(e) => updateSettings({ retirementAge: parseInt(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1"><span>50</span><span>80</span></div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Spend: <span className="text-indigo-600 font-bold">${activeScenario.settings.monthlySpending}</span></label>
                    <input 
                      type="range" 
                      min="2000" 
                      max="20000" 
                      step="100"
                      value={activeScenario.settings.monthlySpending} 
                      onChange={(e) => updateSettings({ monthlySpending: parseInt(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1"><span>$2k</span><span>$20k</span></div>
                  </div>
                   <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Inflation: <span className="text-indigo-600 font-bold">{activeScenario.settings.inflationRate}%</span></label>
                    <input 
                      type="range" 
                      min="1" 
                      max="8" 
                      step="0.1"
                      value={activeScenario.settings.inflationRate} 
                      onChange={(e) => updateSettings({ inflationRate: parseFloat(e.target.value) })}
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
                    {activeScenario.assets.map(asset => (
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
                                className="w-full pl-5 py-1 text-sm bg-white text-gray-900 border border-gray-200 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
                                className="w-full pl-5 py-1 text-sm bg-white text-gray-900 border border-gray-200 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block">Return %</label>
                            <input 
                              type="number" 
                              value={asset.returnRate}
                              onChange={(e) => updateAsset(asset.id, 'returnRate', parseFloat(e.target.value))}
                              className="w-full px-2 py-1 text-sm bg-white text-gray-900 border border-gray-200 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                          </div>
                          <div>
                             <label className="text-xs text-gray-500 block">Type</label>
                             <select 
                               value={asset.type}
                               onChange={(e) => updateAsset(asset.id, 'type', e.target.value)}
                               className="w-full text-xs py-1 bg-white text-gray-900 border border-gray-200 rounded"
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
                    {activeScenario.incomeStreams.map(stream => (
                      <div key={stream.id} className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <div className="flex justify-between mb-2">
                          <input 
                            type="text" 
                            value={stream.name}
                            onChange={(e) => updateIncome(stream.id, 'name', e.target.value)}
                            className="bg-transparent font-medium text-gray-900 border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none w-full mr-2"
                          />
                          
                          {/* Color Picker for Income Stream */}
                          <div className="flex items-center gap-2">
                             <input 
                               type="color"
                               value={stream.color || '#4f46e5'}
                               onChange={(e) => updateIncome(stream.id, 'color', e.target.value)}
                               className="w-6 h-6 p-0 border-0 rounded overflow-hidden cursor-pointer"
                               title="Change Income Color"
                             />
                             <button onClick={() => removeIncome(stream.id)} className="text-gray-400 hover:text-red-500">
                               <Trash2 className="w-4 h-4" />
                             </button>
                          </div>
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
                                className="w-full pl-5 py-1 text-sm bg-white text-gray-900 border border-gray-200 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block">Start Age</label>
                            <input 
                              type="number" 
                              value={stream.startAge}
                              onChange={(e) => updateIncome(stream.id, 'startAge', parseFloat(e.target.value))}
                              className="w-full px-2 py-1 text-sm bg-white text-gray-900 border border-gray-200 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                          </div>
                           <div>
                            <label className="text-xs text-gray-500 block">End Age</label>
                            <input 
                              type="number" 
                              value={stream.endAge}
                              onChange={(e) => updateIncome(stream.id, 'endAge', parseFloat(e.target.value))}
                              className="w-full px-2 py-1 text-sm bg-white text-gray-900 border border-gray-200 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block">COLA / Growth %</label>
                            <input 
                              type="number" 
                              value={stream.growthRate}
                              onChange={(e) => updateIncome(stream.id, 'growthRate', parseFloat(e.target.value))}
                              className="w-full px-2 py-1 text-sm bg-white text-gray-900 border border-gray-200 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
                        value={activeScenario.settings.currentAge} 
                        onChange={(e) => updateSettings({ currentAge: parseInt(e.target.value) })}
                        className="w-full p-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                     <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Retirement Age</label>
                      <input 
                        type="number" 
                        value={activeScenario.settings.retirementAge} 
                        onChange={(e) => updateSettings({ retirementAge: parseInt(e.target.value) })}
                        className="w-full p-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                     <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Plan Until Age</label>
                      <input 
                        type="number" 
                        value={activeScenario.settings.planningHorizon} 
                        onChange={(e) => updateSettings({ planningHorizon: parseInt(e.target.value) })}
                        className="w-full p-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <hr className="border-gray-100 my-2" />
                     <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Inflation Rate (%)</label>
                      <input 
                        type="number" 
                        step="0.1"
                        value={activeScenario.settings.inflationRate} 
                        onChange={(e) => updateSettings({ inflationRate: parseFloat(e.target.value) })}
                        className="w-full p-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Spending (Today's $)</label>
                       <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                        <input 
                          type="number" 
                          value={activeScenario.settings.monthlySpending} 
                          onChange={(e) => updateSettings({ monthlySpending: parseInt(e.target.value) })}
                          className="w-full p-2 pl-7 bg-white text-gray-900 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
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