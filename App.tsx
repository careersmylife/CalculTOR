
import React, { useState, useCallback, useEffect } from 'react';
import { CALCULATOR_MODULES } from './constants';
import type { CalculatorModuleKey, HistoryState, HistoryEntry } from './types';
import Sidebar from './components/Sidebar';
import ScientificCalculator from './components/calculators/ScientificCalculator';
import BeamLoadCalculator from './components/calculators/BeamLoadCalculator';
import ConcreteMixCalculator from './components/calculators/ConcreteMixCalculator';
import RebarCalculator from './components/calculators/RebarCalculator';
import EarthworkCalculator from './components/calculators/EarthworkCalculator';
import WaterFlowCalculator from './components/calculators/WaterFlowCalculator';
import SurveyingCalculator from './components/calculators/SurveyingCalculator';
import AIAssistant from './components/AIAssistant';

type Theme = 'light' | 'dark';

const App: React.FC = () => {
  const [activeModule, setActiveModule] = useState<CalculatorModuleKey>('SCIENTIFIC');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    const storedTheme = localStorage.getItem('engiCalcTheme');
    if (storedTheme === 'light' || storedTheme === 'dark') {
      return storedTheme;
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  const [favorites, setFavorites] = useState<CalculatorModuleKey[]>(() => {
    try {
      const storedFavorites = localStorage.getItem('engiCalcFavorites');
      return storedFavorites ? JSON.parse(storedFavorites) : [];
    } catch (error) {
      console.error("Failed to parse favorites from localStorage", error);
      return [];
    }
  });

  const [historyTimeline, setHistoryTimeline] = useState<{ past: HistoryState[], present: HistoryState, future: HistoryState[] }>({
    past: [],
    present: (() => {
        try {
          const storedHistory = localStorage.getItem('engiCalcHistory');
          return storedHistory ? JSON.parse(storedHistory) : {};
        } catch (error) {
          console.error("Failed to parse history from localStorage", error);
          return {};
        }
    })(),
    future: [],
  });

  const history = historyTimeline.present;

  const setHistoryWithUndo = (updater: (prev: HistoryState) => HistoryState) => {
    setHistoryTimeline(current => {
      const newPresent = updater(current.present);
      if (JSON.stringify(newPresent) === JSON.stringify(current.present)) {
        return current;
      }
      return {
        past: [...current.past, current.present].slice(-20), // Limit undo history to last 20 changes
        present: newPresent,
        future: [],
      };
    });
  };

  const undoHistoryAction = useCallback(() => {
    setHistoryTimeline(current => {
        const { past, present, future } = current;
        if (past.length === 0) return current;
        const previous = past[past.length - 1];
        const newPast = past.slice(0, past.length - 1);
        return {
            past: newPast,
            present: previous,
            future: [present, ...future],
        };
    });
  }, []);

  const redoHistoryAction = useCallback(() => {
    setHistoryTimeline(current => {
        const { past, present, future } = current;
        if (future.length === 0) return current;
        const next = future[0];
        const newFuture = future.slice(1);
        return {
            past: [...past, present],
            present: next,
            future: newFuture,
        };
    });
  }, []);

  const canUndoHistory = historyTimeline.past.length > 0;
  const canRedoHistory = historyTimeline.future.length > 0;

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('engiCalcTheme', theme);
  }, [theme]);

  const handleThemeToggle = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    try {
      localStorage.setItem('engiCalcHistory', JSON.stringify(historyTimeline.present));
    } catch (error) {
      console.error("Failed to save history to localStorage", error);
    }
  }, [historyTimeline.present]);

  useEffect(() => {
    try {
      localStorage.setItem('engiCalcFavorites', JSON.stringify(favorites));
    } catch (error) {
      console.error("Failed to save favorites to localStorage", error);
    }
  }, [favorites]);

  const handleToggleFavorite = (moduleKey: CalculatorModuleKey) => {
    setFavorites(prevFavorites => {
      if (prevFavorites.includes(moduleKey)) {
        return prevFavorites.filter(fav => fav !== moduleKey);
      } else {
        return [...prevFavorites, moduleKey];
      }
    });
  };

  const addHistoryEntry = useCallback((moduleKey: CalculatorModuleKey, newEntryData: Omit<HistoryEntry, 'id' | 'timestamp'>) => {
    setHistoryWithUndo(prevHistory => {
      const moduleHistory = prevHistory[moduleKey] || [];
      
      const lastEntry = moduleHistory[0];
      if (lastEntry && JSON.stringify(lastEntry.inputs) === JSON.stringify(newEntryData.inputs)) {
          return prevHistory;
      }

      const newEntry: HistoryEntry = {
        ...newEntryData,
        id: new Date().toISOString() + Math.random(),
        timestamp: new Date().toLocaleString()
      };
      
      const updatedModuleHistory = [newEntry, ...moduleHistory].slice(0, 20);
      
      return { ...prevHistory, [moduleKey]: updatedModuleHistory };
    });
  }, []);

  const deleteHistoryEntry = useCallback((moduleKey: CalculatorModuleKey, entryId: string) => {
    setHistoryWithUndo(prevHistory => {
      const moduleHistory = prevHistory[moduleKey] || [];
      const updatedModuleHistory = moduleHistory.filter(entry => entry.id !== entryId);
      return { ...prevHistory, [moduleKey]: updatedModuleHistory };
    });
  }, []);
  
  const clearHistory = useCallback((moduleKey: CalculatorModuleKey) => {
    setHistoryWithUndo(prevHistory => {
      if (!prevHistory[moduleKey] || prevHistory[moduleKey]?.length === 0) {
        return prevHistory;
      }
      return { ...prevHistory, [moduleKey]: [] };
    });
  }, []);

  const renderActiveModule = useCallback(() => {
    const module = CALCULATOR_MODULES[activeModule];
    const moduleProps = {
      title: module.name,
      history: history[activeModule] || [],
      addHistoryEntry: (data: Omit<HistoryEntry, 'id' | 'timestamp'>) => addHistoryEntry(activeModule, data),
      deleteHistoryEntry: (id: string) => deleteHistoryEntry(activeModule, id),
      clearHistory: () => clearHistory(activeModule),
      theme,
      undoHistoryAction,
      redoHistoryAction,
      canUndoHistory,
      canRedoHistory,
    };

    switch (activeModule) {
      case 'SCIENTIFIC':
        return <ScientificCalculator {...moduleProps} />;
      case 'BEAM_LOAD':
        return <BeamLoadCalculator {...moduleProps} />;
      case 'CONCRETE_MIX':
        return <ConcreteMixCalculator {...moduleProps} />;
      case 'REBAR':
        return <RebarCalculator {...moduleProps} />;
      case 'EARTHWORK':
        return <EarthworkCalculator {...moduleProps} />;
      case 'WATER_FLOW':
        return <WaterFlowCalculator {...moduleProps} />;
      case 'SURVEYING':
        return <SurveyingCalculator {...moduleProps} />;
      default:
        return <ScientificCalculator title={CALCULATOR_MODULES.SCIENTIFIC.name} {...moduleProps} />;
    }
  }, [activeModule, history, addHistoryEntry, deleteHistoryEntry, clearHistory, theme, undoHistoryAction, redoHistoryAction, canUndoHistory, canRedoHistory]);

  const handleModuleChange = (moduleKey: CalculatorModuleKey) => {
    setActiveModule(moduleKey);
    setSidebarOpen(false); // Close sidebar on selection in mobile view
  };

  return (
    <div className="flex h-screen bg-primary font-sans dark:bg-[#0D0D0D]">
      <Sidebar 
        activeModule={activeModule} 
        onModuleChange={handleModuleChange}
        isOpen={isSidebarOpen}
        setIsOpen={setSidebarOpen}
        favorites={favorites}
        onToggleFavorite={handleToggleFavorite}
        theme={theme}
        onToggleTheme={handleThemeToggle}
      />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 bg-secondary shadow-md md:hidden dark:bg-[#1A1A1A]">
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="text-text-primary z-30 dark:text-[#F2F2F2]">
                <i className="fas fa-bars text-xl"></i>
            </button>
            <h1 className="text-lg font-bold text-accent">{CALCULATOR_MODULES[activeModule].name}</h1>
        </div>
        <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          {renderActiveModule()}
        </div>
      </main>
      <AIAssistant activeModule={activeModule} />
    </div>
  );
};

export default App;