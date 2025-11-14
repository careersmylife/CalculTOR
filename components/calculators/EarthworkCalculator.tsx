
import React, { useState, useEffect } from 'react';
import Card from '../common/Card';
import Input from '../common/Input';
import Button from '../common/Button';
import HistoryCard from '../common/HistoryCard';
import type { HistoryEntry } from '../../types';
import ExportPDFButton from '../common/ExportPDFButton';

interface EarthworkCalculatorProps {
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
    cutVolume: number;
    fillVolume: number;
    netVolume: number;
}

interface Inputs {
  areaLength: number;
  areaWidth: number;
  avgCutDepth: number;
  avgFillDepth: number;
}

const initialInputs: Inputs = {
  areaLength: 50,
  areaWidth: 20,
  avgCutDepth: 0.5,
  avgFillDepth: 0.2,
};

const EarthworkCalculator = ({ title, history, addHistoryEntry, deleteHistoryEntry, clearHistory, undoHistoryAction, redoHistoryAction, canUndoHistory, canRedoHistory }: EarthworkCalculatorProps) => {
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
    const { areaLength, areaWidth, avgCutDepth, avgFillDepth } = inputs;
    const area = areaLength * areaWidth;
    if (area <= 0) {
        setResult(null);
        return;
    }

    const cutVolume = area * avgCutDepth;
    const fillVolume = area * avgFillDepth;

    const newResult = {
        cutVolume,
        fillVolume,
        netVolume: cutVolume - fillVolume
    };
    setResult(newResult);

    addHistoryEntry({
        summary: `${areaLength}m x ${areaWidth}m Area`,
        inputs: {
            Dimensions: `${areaLength}m x ${areaWidth}m`,
            'Avg Cut': `${avgCutDepth}m`,
            'Avg Fill': `${avgFillDepth}m`,
        },
        results: {
            'Cut Volume': `${newResult.cutVolume.toFixed(2)} m³`,
            'Fill Volume': `${newResult.fillVolume.toFixed(2)} m³`,
            'Net Volume': `${newResult.netVolume.toFixed(2)} m³`,
        }
    });
    
  }, [inputs, addHistoryEntry]);

  const handleCopyToClipboard = (entry: HistoryEntry) => {
    const textToCopy = `Earthwork Volume Estimation (${entry.timestamp})\nInputs:\n${Object.entries(entry.inputs).map(([k, v]) => `- ${k}: ${v}`).join('\n')}\n\nResults:\n${Object.entries(entry.results).map(([k, v]) => `- ${k}: ${v}`).join('\n')}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      alert('Results copied to clipboard!');
    }, (err) => {
      console.error('Could not copy text: ', err);
    });
  };

  return (
    <>
      <div id="earthwork-report">
        <h2 className="text-2xl font-bold mb-4 text-text-primary dark:text-[#F2F2F2]">{title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title="Site Dimensions" icon="fas fa-ruler-horizontal">
            <div className="flex justify-end space-x-2 mb-2">
                <Button onClick={undo} disabled={!canUndo} variant="secondary" className="px-3 py-1 text-xs"><i className="fas fa-undo mr-1"></i> Undo</Button>
                <Button onClick={redo} disabled={!canRedo} variant="secondary" className="px-3 py-1 text-xs">Redo <i className="fas fa-redo ml-1"></i></Button>
            </div>
            <Input label="Area Length" id="areaLength" type="number" min="0" value={inputs.areaLength} onChange={(e) => setInputs(p => ({...p, areaLength: Number(e.target.value)}))} unit="m" />
            <Input label="Area Width" id="areaWidth" type="number" min="0" value={inputs.areaWidth} onChange={(e) => setInputs(p => ({...p, areaWidth: Number(e.target.value)}))} unit="m" />
            <Input label="Average Cut Depth" id="avgCutDepth" type="number" min="0" value={inputs.avgCutDepth} onChange={(e) => setInputs(p => ({...p, avgCutDepth: Number(e.target.value)}))} unit="m" />
            <Input label="Average Fill Depth" id="avgFillDepth" type="number" min="0" value={inputs.avgFillDepth} onChange={(e) => setInputs(p => ({...p, avgFillDepth: Number(e.target.value)}))} unit="m" />
            <Button onClick={handleReset} variant="secondary" className="w-full mt-4">
              <i className="fas fa-undo mr-2"></i> Reset Inputs
            </Button>
          </Card>
          
          <Card title="Volume Estimation" icon="fas fa-mound">
            {result ? (
              <div className="space-y-4 text-center">
                  <div className="bg-primary p-4 rounded-lg dark:bg-[#0D0D0D]">
                      <p className="text-sm text-text-secondary dark:text-[#BDBDBD]">Cut Volume</p>
                      <p className="text-xl font-bold text-red-500">{result.cutVolume.toFixed(2)} m³</p>
                  </div>
                  <div className="bg-primary p-4 rounded-lg dark:bg-[#0D0D0D]">
                      <p className="text-sm text-text-secondary dark:text-[#BDBDBD]">Fill Volume</p>
                      <p className="text-xl font-bold text-green-500">{result.fillVolume.toFixed(2)} m³</p>
                  </div>
                  <div className="bg-primary p-4 rounded-lg dark:bg-[#0D0D0D]">
                      <p className="text-sm text-text-secondary dark:text-[#BDBDBD]">Net Volume (Cut - Fill)</p>
                      <p className={`text-2xl font-bold ${result.netVolume >= 0 ? 'text-accent' : 'text-yellow-500'}`}>
                          {result.netVolume.toFixed(2)} m³
                      </p>
                      <p className="text-xs text-text-secondary dark:text-[#BDBDBD]">{result.netVolume > 0 ? 'Surplus (requires removal)' : 'Deficit (requires import)'}</p>
                  </div>
              </div>
            ) : (
              <p className="text-text-secondary dark:text-[#BDBDBD]">Enter valid dimensions to see results.</p>
            )}
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
              elementId="earthwork-report"
              defaultTitle="Earthwork Volume Report"
            />
        </div>
      </div>
    </>
  );
};

export default EarthworkCalculator;
