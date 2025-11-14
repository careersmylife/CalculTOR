
import React, { useState, useEffect } from 'react';
import Card from '../common/Card';
import Input from '../common/Input';
import Button from '../common/Button';
import HistoryCard from '../common/HistoryCard';
import type { HistoryEntry } from '../../types';
import ExportPDFButton from '../common/ExportPDFButton';

interface WaterFlowCalculatorProps {
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
    requiredDiameterMM: number;
    requiredAreaM2: number;
    velocityMPS: number;
}

interface Inputs {
  flowRateLPS: number;
  maxVelocity: number;
}

const initialInputs: Inputs = {
  flowRateLPS: 10,
  maxVelocity: 1.5,
};

const WaterFlowCalculator = ({ title, history, addHistoryEntry, deleteHistoryEntry, clearHistory, undoHistoryAction, redoHistoryAction, canUndoHistory, canRedoHistory }: WaterFlowCalculatorProps) => {
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
    const { flowRateLPS, maxVelocity } = inputs;
    if (flowRateLPS <= 0 || maxVelocity <= 0) {
      setResult(null);
      return;
    }
    
    const flowRateM3PS = flowRateLPS / 1000;
    const requiredAreaM2 = flowRateM3PS / maxVelocity;
    const requiredDiameterM = Math.sqrt((4 * requiredAreaM2) / Math.PI);
    const requiredDiameterMM = requiredDiameterM * 1000;

    const newResult = {
        requiredDiameterMM,
        requiredAreaM2,
        velocityMPS: maxVelocity
    };
    setResult(newResult);
    
    addHistoryEntry({
        summary: `${flowRateLPS} L/s @ ${maxVelocity} m/s`,
        inputs: {
            'Flow Rate': `${flowRateLPS} L/s`,
            'Max Velocity': `${maxVelocity} m/s`,
        },
        results: {
            'Req. Diameter': `${newResult.requiredDiameterMM.toFixed(1)} mm`,
            'Req. Area': `${newResult.requiredAreaM2.toPrecision(3)} m²`,
        }
    });

  }, [inputs, addHistoryEntry]);
  
  const handleCopyToClipboard = (entry: HistoryEntry) => {
    const textToCopy = `Pipe Sizing Calculation (${entry.timestamp})\nInputs:\n${Object.entries(entry.inputs).map(([k, v]) => `- ${k}: ${v}`).join('\n')}\n\nResults:\n${Object.entries(entry.results).map(([k, v]) => `- ${k}: ${v}`).join('\n')}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      alert('Results copied to clipboard!');
    }, (err) => {
      console.error('Could not copy text: ', err);
    });
  };

  return (
    <>
      <div id="water-flow-report">
        <h2 className="text-2xl font-bold mb-4 text-text-primary dark:text-[#F2F2F2]">{title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title="Flow Parameters" icon="fas fa-tachometer-alt">
            <div className="flex justify-end space-x-2 mb-2">
                <Button onClick={undo} disabled={!canUndo} variant="secondary" className="px-3 py-1 text-xs"><i className="fas fa-undo mr-1"></i> Undo</Button>
                <Button onClick={redo} disabled={!canRedo} variant="secondary" className="px-3 py-1 text-xs">Redo <i className="fas fa-redo ml-1"></i></Button>
            </div>
            <Input label="Desired Flow Rate" id="flowRate" type="number" min="0" value={inputs.flowRateLPS} onChange={(e) => setInputs(p => ({...p, flowRateLPS: Number(e.target.value)}))} unit="L/s" />
            <Input label="Maximum Design Velocity" id="maxVelocity" type="number" min="0.1" step="0.1" value={inputs.maxVelocity} onChange={(e) => setInputs(p => ({...p, maxVelocity: Number(e.target.value)}))} unit="m/s" />
            <Button onClick={handleReset} variant="secondary" className="w-full mt-4">
              <i className="fas fa-undo mr-2"></i> Reset Inputs
            </Button>
          </Card>
          
          <Card title="Pipe Sizing Results" icon="fas fa-ruler">
            {result ? (
              <div className="space-y-4 text-center">
                  <div className="bg-primary p-4 rounded-lg dark:bg-[#0D0D0D]">
                      <p className="text-sm text-text-secondary dark:text-[#BDBDBD]">Required Internal Diameter</p>
                      <p className="text-3xl font-bold text-accent">{result.requiredDiameterMM.toFixed(1)} mm</p>
                  </div>
                  <div className="bg-primary p-4 rounded-lg dark:bg-[#0D0D0D]">
                      <p className="text-sm text-text-secondary dark:text-[#BDBDBD]">Required Cross-Sectional Area</p>
                      <p className="text-xl font-bold text-accent">{result.requiredAreaM2.toPrecision(3)} m²</p>
                  </div>
                  <p className="text-xs text-text-secondary dark:text-[#BDBDBD] pt-2">Note: Select the next available standard pipe size that is equal to or larger than the required diameter. This calculation does not account for friction losses.</p>
              </div>
            ) : (
              <p className="text-text-secondary dark:text-[#BDBDBD]">Enter valid flow parameters.</p>
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
              elementId="water-flow-report"
              defaultTitle="Pipe Sizing Report"
            />
        </div>
      </div>
    </>
  );
};

export default WaterFlowCalculator;
