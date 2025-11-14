
import React, { useState, useEffect } from 'react';
import Card from '../common/Card';
import Input from '../common/Input';
import Select from '../common/Select';
import Button from '../common/Button';
import { CONCRETE_MIX_RATIOS } from '../../constants';
import HistoryCard from '../common/HistoryCard';
import type { HistoryEntry } from '../../types';
import ExportPDFButton from '../common/ExportPDFButton';

interface ConcreteMixCalculatorProps {
  title: string;
  history: HistoryEntry[];
  addHistoryEntry: (data: Omit<HistoryEntry, 'id' | 'timestamp'>) => void;
  deleteHistoryEntry: (id: string) => void;
  clearHistory: () => void;
  theme: 'light' | 'dark';
  undoHistoryAction: () => void;
  redoHistoryAction: () => void;
  canUndoHistory: boolean;
  canRedoHistory: boolean;
}

interface Result {
    cement: number;
    sand: number;
    aggregate: number;
    cementBags: number;
}

interface Inputs {
  mixGrade: string;
  volume: number;
}

const initialInputs: Inputs = {
  mixGrade: 'M20',
  volume: 1,
};

const ConcreteMixCalculator = ({ title, history, addHistoryEntry, deleteHistoryEntry, clearHistory, undoHistoryAction, redoHistoryAction, canUndoHistory, canRedoHistory }: ConcreteMixCalculatorProps) => {
  const [inputHistory, setInputHistory] = useState([initialInputs]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const inputs = inputHistory[currentIndex];
  
  const [result, setResult] = useState<Result | null>(null);

  const setInputs = (newInputs: Inputs | ((prev: Inputs) => Inputs)) => {
    const nextInputs = typeof newInputs === 'function' ? newInputs(inputs) : newInputs;
    if (JSON.stringify(nextInputs) === JSON.stringify(inputs)) return;

    const newHistory = inputHistory.slice(0, currentIndex + 1);
    newHistory.push(nextInputs);
    setInputHistory(newHistory);
    setCurrentIndex(newHistory.length - 1);
  };
  
  const undo = () => { if (currentIndex > 0) setCurrentIndex(currentIndex - 1); };
  const redo = () => { if (currentIndex < inputHistory.length - 1) setCurrentIndex(currentIndex + 1); };
  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < inputHistory.length - 1;

  const handleReset = () => {
    setInputHistory([initialInputs]);
    setCurrentIndex(0);
  };

  useEffect(() => {
    const { mixGrade, volume } = inputs;
    const ratio = CONCRETE_MIX_RATIOS[mixGrade];
    if (!ratio || volume <= 0) {
      setResult(null);
      return;
    }

    const totalRatioParts = ratio.cement + ratio.sand + ratio.aggregate;
    const dryVolume = volume * 1.54; // Adding 54% for dry volume
    
    const cementVolume = (dryVolume * ratio.cement) / totalRatioParts;
    const sandVolume = (dryVolume * ratio.sand) / totalRatioParts;
    const aggregateVolume = (dryVolume * ratio.aggregate) / totalRatioParts;
    
    const cementBags = cementVolume * 28.8; // 1 m^3 of cement is approx 28.8 bags of 50kg

    const newResult = {
        cement: cementVolume,
        sand: sandVolume,
        aggregate: aggregateVolume,
        cementBags: cementBags,
    };
    setResult(newResult);

    addHistoryEntry({
        summary: `${volume} m³ of ${mixGrade}`,
        inputs: {
            Grade: mixGrade,
            Volume: `${volume} m³`
        },
        results: {
            Cement: `${newResult.cement.toFixed(2)} m³ (~${Math.ceil(newResult.cementBags)} bags)`,
            Sand: `${newResult.sand.toFixed(2)} m³`,
            Aggregate: `${newResult.aggregate.toFixed(2)} m³`
        }
    });

  }, [inputs, addHistoryEntry]);
  
  const handleCopyToClipboard = (entry: HistoryEntry) => {
    const textToCopy = `Concrete Mix Calculation (${entry.timestamp})\nInputs:\n${Object.entries(entry.inputs).map(([k, v]) => `- ${k}: ${v}`).join('\n')}\n\nResults:\n${Object.entries(entry.results).map(([k, v]) => `- ${k}: ${v}`).join('\n')}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      alert('Results copied to clipboard!');
    }, (err) => {
      console.error('Could not copy text: ', err);
    });
  };

  return (
    <>
      <div id="concrete-mix-report">
        <h2 className="text-2xl font-bold mb-4 text-text-primary dark:text-[#F2F2F2]">{title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title="Inputs" icon="fas fa-edit">
            <div className="flex justify-end space-x-2 mb-2">
                <Button onClick={undo} disabled={!canUndo} variant="secondary" className="px-3 py-1 text-xs"><i className="fas fa-undo mr-1"></i> Undo</Button>
                <Button onClick={redo} disabled={!canRedo} variant="secondary" className="px-3 py-1 text-xs">Redo <i className="fas fa-redo ml-1"></i></Button>
            </div>
            <Select label="Concrete Grade (Mix Ratio)" id="mixGrade" value={inputs.mixGrade} onChange={(e) => setInputs(p => ({...p, mixGrade: e.target.value}))}>
              {Object.entries(CONCRETE_MIX_RATIOS).map(([grade, { description }]) => (
                <option key={grade} value={grade}>{`${grade} - ${description}`}</option>
              ))}
            </Select>
            <Input label="Wet Concrete Volume" id="volume" type="number" min="0" value={inputs.volume} onChange={(e) => setInputs(p => ({...p, volume: Number(e.target.value)}))} unit="m³" />
            <Button onClick={handleReset} variant="secondary" className="w-full mt-4">
              <i className="fas fa-undo mr-2"></i> Reset Inputs
            </Button>
          </Card>

          <Card title="Required Materials" icon="fas fa-cubes">
            {result ? (
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-primary p-4 rounded-lg dark:bg-[#0D0D0D]">
                  <p className="text-sm text-text-secondary dark:text-[#BDBDBD]">Cement</p>
                  <p className="text-xl font-bold text-accent">{result.cement.toFixed(2)} m³</p>
                  <p className="text-md text-text-primary dark:text-[#F2F2F2]">~{Math.ceil(result.cementBags)} bags</p>
                </div>
                <div className="bg-primary p-4 rounded-lg dark:bg-[#0D0D0D]">
                  <p className="text-sm text-text-secondary dark:text-[#BDBDBD]">Sand (Fine Aggregate)</p>
                  <p className="text-xl font-bold text-accent">{result.sand.toFixed(2)} m³</p>
                </div>
                <div className="bg-primary p-4 rounded-lg col-span-2 dark:bg-[#0D0D0D]">
                  <p className="text-sm text-text-secondary dark:text-[#BDBDBD]">Gravel (Coarse Aggregate)</p>
                  <p className="text-xl font-bold text-accent">{result.aggregate.toFixed(2)} m³</p>
                </div>
              </div>
            ) : (
              <p className="text-text-secondary dark:text-[#BDBDBD]">Enter a valid volume to see results.</p>
            )}
            <p className="text-xs text-text-secondary dark:text-[#BDBDBD] mt-4 text-center">Note: Calculations assume a dry volume factor of 1.54 and 50kg cement bags (~0.0347 m³). Wastage not included.</p>
          </Card>
        </div>
        <HistoryCard 
          history={history}
          onDelete={deleteHistoryEntry}
          onClear={clearHistory}
          onCopy={handleCopyToClipboard}
          onUndo={undoHistoryAction}
          onRedo={redoHistoryAction}
          canUndo={canUndoHistory}
          canRedo={canRedoHistory}
        />
        <div className="mt-6 text-center export-pdf-button-container">
            <ExportPDFButton 
              elementId="concrete-mix-report"
              defaultTitle="Concrete Mix Estimation Report"
            />
        </div>
      </div>
    </>
  );
};

export default ConcreteMixCalculator;
