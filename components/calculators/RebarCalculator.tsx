
import React, { useState, useEffect } from 'react';
import Card from '../common/Card';
import Input from '../common/Input';
import Select from '../common/Select';
import Button from '../common/Button';
import { REBAR_SIZES } from '../../constants';
import HistoryCard from '../common/HistoryCard';
import type { HistoryEntry } from '../../types';
import ExportPDFButton from '../common/ExportPDFButton';

interface RebarCalculatorProps {
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

const RebarDiagram = ({ areaLength, areaWidth, spacing, theme }: { areaLength: number, areaWidth: number, spacing: number, theme: 'light' | 'dark' }) => {
  const spacingM = spacing / 1000;
  const padding = 35;
  const containerWidth = 350;
  const containerHeight = 250;
  
  const availableWidth = containerWidth - 2 * padding;
  const availableHeight = containerHeight - 2 * padding;
  
  const safeLength = Math.max(0.1, areaLength);
  const safeWidth = Math.max(0.1, areaWidth);
  const safeSpacing = Math.max(0.01, spacingM);

  const ratio = safeLength / safeWidth;
  
  let drawWidth, drawHeight;
  if (ratio > availableWidth / availableHeight) {
    drawWidth = availableWidth;
    drawHeight = availableWidth / ratio;
  } else {
    drawHeight = availableHeight;
    drawWidth = availableHeight * ratio;
  }
  
  const offsetX = (containerWidth - drawWidth) / 2;
  const offsetY = (containerHeight - drawHeight) / 2;

  const numBarsSpacedAlongLength = Math.ceil(safeLength / safeSpacing) + 1;
  const numBarsSpacedAlongWidth = Math.ceil(safeWidth / safeSpacing) + 1;

  const maxBarsToDraw = 30;
  const stepX = numBarsSpacedAlongLength > maxBarsToDraw ? Math.ceil(numBarsSpacedAlongLength / maxBarsToDraw) : 1;
  const stepY = numBarsSpacedAlongWidth > maxBarsToDraw ? Math.ceil(numBarsSpacedAlongWidth / maxBarsToDraw) : 1;

  const barsAlongLength = [];
  for (let i = 0; i < numBarsSpacedAlongLength; i += stepX) {
    const x = offsetX + (i * (drawWidth / (numBarsSpacedAlongLength - 1 || 1)));
    barsAlongLength.push(<line key={`v-${i}`} x1={x} y1={offsetY} x2={x} y2={offsetY + drawHeight} stroke="#2D9CDB" strokeWidth="1.5" />);
  }

  const barsAlongWidth = [];
  for (let i = 0; i < numBarsSpacedAlongWidth; i += stepY) {
    const y = offsetY + (i * (drawHeight / (numBarsSpacedAlongWidth - 1 || 1)));
    barsAlongWidth.push(<line key={`h-${i}`} x1={offsetX} y1={y} x2={offsetX + drawWidth} y2={y} stroke="#2D9CDB" strokeWidth="1.5" opacity="0.6" />);
  }

  return (
    <div className="flex flex-col items-center w-full overflow-hidden">
      <div className="relative bg-white dark:bg-[#1A1A1A] p-2 rounded-xl border border-gray-200 dark:border-gray-800 shadow-inner w-full flex justify-center">
        <svg width={containerWidth} height={containerHeight} viewBox={`0 0 ${containerWidth} ${containerHeight}`} className="max-w-full h-auto">
          <rect 
            x={offsetX} 
            y={offsetY} 
            width={drawWidth} 
            height={drawHeight} 
            fill={theme === 'dark' ? '#262626' : '#F9F9F9'} 
            stroke={theme === 'dark' ? '#555555' : '#CCCCCC'} 
            strokeWidth="2" 
            rx="2"
          />
          
          {barsAlongLength}
          {barsAlongWidth}
          
          <text x={containerWidth / 2} y={offsetY - 12} textAnchor="middle" fontSize="12" fontWeight="600" fill={theme === 'dark' ? '#F2F2F2' : '#1A1A1A'}>{areaLength}m</text>
          <text 
            x={offsetX - 12} 
            y={containerHeight / 2} 
            textAnchor="middle" 
            fontSize="12" 
            fontWeight="600" 
            fill={theme === 'dark' ? '#F2F2F2' : '#1A1A1A'} 
            transform={`rotate(-90, ${offsetX - 12}, ${containerHeight / 2})`}
          >
            {areaWidth}m
          </text>

          {numBarsSpacedAlongLength > 1 && (
            <g>
               <line 
                x1={offsetX} 
                y1={offsetY + drawHeight + 15} 
                x2={offsetX + (drawWidth / (numBarsSpacedAlongLength - 1))} 
                y2={offsetY + drawHeight + 15} 
                stroke={theme === 'dark' ? '#BDBDBD' : '#555555'} 
                strokeWidth="1" 
                markerStart="url(#arrow)" 
                markerEnd="url(#arrow)" 
               />
               <text x={offsetX + (drawWidth / (numBarsSpacedAlongLength - 1)) / 2} y={offsetY + drawHeight + 30} textAnchor="middle" fontSize="10" fill={theme === 'dark' ? '#BDBDBD' : '#555555'}>{spacing}mm c/c</text>
            </g>
          )}

          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={theme === 'dark' ? '#BDBDBD' : '#555555'} />
            </marker>
          </defs>
        </svg>
      </div>
      <div className="mt-3 text-[10px] text-text-secondary dark:text-[#BDBDBD] italic text-center">
        * Schematic representation of reinforcement grid. {numBarsSpacedAlongLength > maxBarsToDraw || numBarsSpacedAlongWidth > maxBarsToDraw ? '(Simplified view)' : ''}
      </div>
    </div>
  );
};

interface Result {
    numBars: number;
    totalLength: number;
    totalWeight: number;
}

interface Inputs {
  rebarSize: string;
  spacing: number;
  areaLength: number;
  areaWidth: number;
}

const initialInputs: Inputs = {
  rebarSize: '12mm',
  spacing: 150,
  areaLength: 10,
  areaWidth: 5,
};

const RebarCalculator = ({ title, history, addHistoryEntry, deleteHistoryEntry, clearHistory, theme, undoHistoryAction, redoHistoryAction, canUndoHistory, canRedoHistory }: RebarCalculatorProps) => {
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
    const { rebarSize, spacing, areaLength, areaWidth } = inputs;
    if (spacing <= 0 || areaLength <= 0 || areaWidth <= 0) {
        setResult(null);
        return;
    }

    const spacingMeters = spacing / 1000;
    const sizeData = REBAR_SIZES[rebarSize];

    const numBarsLengthwise = Math.ceil(areaWidth / spacingMeters) + 1;
    const numBarsWidthwise = Math.ceil(areaLength / spacingMeters) + 1;

    const totalLength = (numBarsLengthwise * areaLength) + (numBarsWidthwise * areaWidth);
    const totalWeight = totalLength * sizeData.weightPerMeter;
    
    const newResult = {
        numBars: numBarsLengthwise + numBarsWidthwise,
        totalLength,
        totalWeight,
    };
    setResult(newResult);

    addHistoryEntry({
        summary: `${areaLength}x${areaWidth}m slab, ${rebarSize} @ ${spacing}mm`,
        inputs: {
            Size: rebarSize,
            Spacing: `${spacing} mm`,
            Dimensions: `${areaLength}m x ${areaWidth}m`,
        },
        results: {
            'Total Bars': newResult.numBars.toFixed(0),
            'Total Length': `${newResult.totalLength.toFixed(2)} m`,
            'Total Weight': `${newResult.totalWeight.toFixed(2)} kg`,
        }
    });
    
  }, [inputs, addHistoryEntry]);

  const handleCopyToClipboard = (entry: HistoryEntry) => {
    const textToCopy = `Rebar Estimation (${entry.timestamp})\nInputs:\n${Object.entries(entry.inputs).map(([k, v]) => `- ${k}: ${v}`).join('\n')}\n\nResults:\n${Object.entries(entry.results).map(([k, v]) => `- ${k}: ${v}`).join('\n')}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      alert('Results copied to clipboard!');
    }, (err) => {
      console.error('Could not copy text: ', err);
    });
  };

  return (
    <>
      <div id="rebar-report">
        <h2 className="text-2xl font-bold mb-4 text-text-primary dark:text-[#F2F2F2]">{title}</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card title="Inputs" icon="fas fa-edit">
            <div className="flex justify-end space-x-2 mb-2">
                <Button onClick={undo} disabled={!canUndo} variant="secondary" className="px-3 py-1 text-xs"><i className="fas fa-undo mr-1"></i> Undo</Button>
                <Button onClick={redo} disabled={!canRedo} variant="secondary" className="px-3 py-1 text-xs">Redo <i className="fas fa-redo ml-1"></i></Button>
            </div>
            <Select label="Rebar Diameter" id="rebarSize" value={inputs.rebarSize} onChange={(e) => setInputs(p => ({...p, rebarSize: e.target.value}))}>
              {Object.keys(REBAR_SIZES).map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </Select>
            <Input label="Spacing (Center to Center)" id="spacing" type="number" min="1" value={inputs.spacing} onChange={(e) => setInputs(p => ({...p, spacing: Number(e.target.value)}))} unit="mm" />
            <Input label="Slab / Area Length" id="areaLength" type="number" min="0" value={inputs.areaLength} onChange={(e) => setInputs(p => ({...p, areaLength: Number(e.target.value)}))} unit="m" />
            <Input label="Slab / Area Width" id="areaWidth" type="number" min="0" value={inputs.areaWidth} onChange={(e) => setInputs(p => ({...p, areaWidth: Number(e.target.value)}))} unit="m" />
            <Button onClick={handleReset} variant="secondary" className="w-full mt-4">
              <i className="fas fa-undo mr-2"></i> Reset Inputs
            </Button>
          </Card>
          
          <Card title="Reinforcement Estimation" icon="fas fa-grip-lines">
            {result ? (
              <div className="space-y-4">
                  <div className="flex justify-between items-center bg-primary p-3 rounded-lg dark:bg-[#0D0D0D]">
                      <span className="text-text-secondary dark:text-[#BDBDBD]">Total Number of Bars</span>
                      <span className="text-xl font-bold text-accent">{result.numBars.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-primary p-3 rounded-lg dark:bg-[#0D0D0D]">
                      <span className="text-text-secondary dark:text-[#BDBDBD]">Total Length</span>
                      <span className="text-xl font-bold text-accent">{result.totalLength.toFixed(2)} m</span>
                  </div>
                  <div className="flex justify-between items-center bg-primary p-3 rounded-lg dark:bg-[#0D0D0D]">
                      <span className="text-text-secondary dark:text-[#BDBDBD]">Total Weight</span>
                      <span className="text-xl font-bold text-accent">{result.totalWeight.toFixed(2)} kg</span>
                  </div>
                  <p className="text-xs text-text-secondary dark:text-[#BDBDBD] text-center pt-2">Note: This calculation is for a single mat of reinforcement. Lap lengths and wastage not included.</p>
              </div>
            ) : (
              <p className="text-text-secondary dark:text-[#BDBDBD]">Enter valid dimensions to see results.</p>
            )}
          </Card>

          <Card title="Placement Diagram" icon="fas fa-project-diagram">
            {result ? (
              <RebarDiagram 
                areaLength={inputs.areaLength} 
                areaWidth={inputs.areaWidth} 
                spacing={inputs.spacing} 
                theme={theme} 
              />
            ) : (
              <p className="text-text-secondary dark:text-[#BDBDBD]">Enter valid dimensions to see diagram.</p>
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
              elementId="rebar-report"
              defaultTitle="Rebar Estimation Report"
            />
        </div>
      </div>
    </>
  );
};

export default RebarCalculator;
