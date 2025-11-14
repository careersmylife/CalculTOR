
import React, { useState, useEffect } from 'react';
import Card from '../common/Card';
import Input from '../common/Input';
import Button from '../common/Button';
import HistoryCard from '../common/HistoryCard';
import type { HistoryEntry } from '../../types';
import ExportPDFButton from '../common/ExportPDFButton';

interface SurveyingCalculatorProps {
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
    deltaN: number; // Change in Northing (Latitude)
    deltaE: number; // Change in Easting (Departure)
    endN: number;   // Final Northing
    endE: number;   // Final Easting
    bearing: string; // Bearing in D° M' S" format
}

interface Inputs {
  startNorthing: number;
  startEasting: number;
  distance: number;
  azimuth: number;
}

const initialInputs: Inputs = {
  startNorthing: 1000,
  startEasting: 1000,
  distance: 50,
  azimuth: 45,
};

const SurveyingCalculator = ({ title, history, addHistoryEntry, deleteHistoryEntry, clearHistory, undoHistoryAction, redoHistoryAction, canUndoHistory, canRedoHistory }: SurveyingCalculatorProps) => {
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

  const getBearing = (az: number): string => {
    if (az < 0 || az > 360) return "Invalid Azimuth";

    let quadrant: string;
    let angle: number;

    if (az >= 0 && az < 90) {
        quadrant = 'N E';
        angle = az;
    } else if (az >= 90 && az < 180) {
        quadrant = 'S E';
        angle = 180 - az;
    } else if (az >= 180 && az < 270) {
        quadrant = 'S W';
        angle = az - 180;
    } else { // az >= 270 && az <= 360
        quadrant = 'N W';
        angle = 360 - az;
    }

    const deg = Math.floor(angle);
    const minutesDecimal = (angle - deg) * 60;
    const min = Math.floor(minutesDecimal);
    const sec = Math.round((minutesDecimal - min) * 60);

    const [startDir, endDir] = quadrant.split(' ');

    return `${startDir} ${deg}° ${String(min).padStart(2, '0')}' ${String(sec).padStart(2, '0')}" ${endDir}`;
};


  useEffect(() => {
    const { startNorthing, startEasting, distance, azimuth } = inputs;
    if (distance < 0) {
      setResult(null);
      return;
    }

    const azimuthRad = azimuth * (Math.PI / 180); // Convert azimuth to radians

    const deltaN = distance * Math.cos(azimuthRad); // Latitude
    const deltaE = distance * Math.sin(azimuthRad); // Departure

    const endN = startNorthing + deltaN;
    const endE = startEasting + deltaE;

    const bearing = getBearing(azimuth);

    const newResult = {
        deltaN,
        deltaE,
        endN,
        endE,
        bearing,
    };
    setResult(newResult);

    addHistoryEntry({
        summary: `From (${startNorthing}, ${startEasting}) to (${endN.toFixed(3)}, ${endE.toFixed(3)})`,
        inputs: {
            Start: `(${startNorthing}, ${startEasting})`,
            Distance: `${distance} m`,
            Azimuth: `${azimuth}°`,
        },
        results: {
            End: `(${endN.toFixed(3)}, ${endE.toFixed(3)})`,
            Bearing: bearing,
        }
    });
    
  }, [inputs, addHistoryEntry]);
  
  const handleCopyToClipboard = (entry: HistoryEntry) => {
    const textToCopy = `Surveying Traverse (${entry.timestamp})\nInputs:\n${Object.entries(entry.inputs).map(([k, v]) => `- ${k}: ${v}`).join('\n')}\n\nResults:\n${Object.entries(entry.results).map(([k, v]) => `- ${k}: ${v}`).join('\n')}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      alert('Results copied to clipboard!');
    }, (err) => {
      console.error('Could not copy text: ', err);
    });
  };

  return (
    <>
      <div id="surveying-report">
        <h2 className="text-2xl font-bold mb-4 text-text-primary dark:text-[#F2F2F2]">{title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title="Inputs" icon="fas fa-edit">
            <div className="flex justify-end space-x-2 mb-2">
                <Button onClick={undo} disabled={!canUndo} variant="secondary" className="px-3 py-1 text-xs"><i className="fas fa-undo mr-1"></i> Undo</Button>
                <Button onClick={redo} disabled={!canRedo} variant="secondary" className="px-3 py-1 text-xs">Redo <i className="fas fa-redo ml-1"></i></Button>
            </div>
            <Input label="Starting Northing (Y)" id="startNorthing" type="number" value={inputs.startNorthing} onChange={(e) => setInputs(p => ({...p, startNorthing: Number(e.target.value)}))} unit="m" />
            <Input label="Starting Easting (X)" id="startEasting" type="number" value={inputs.startEasting} onChange={(e) => setInputs(p => ({...p, startEasting: Number(e.target.value)}))} unit="m" />
            <Input label="Distance" id="distance" type="number" min="0" value={inputs.distance} onChange={(e) => setInputs(p => ({...p, distance: Number(e.target.value)}))} unit="m" />
            <Input label="Azimuth (Decimal Degrees)" id="azimuth" type="number" min="0" max="360" value={inputs.azimuth} onChange={(e) => setInputs(p => ({...p, azimuth: Number(e.target.value)}))} unit="°" />
            <Button onClick={handleReset} variant="secondary" className="w-full mt-4">
              <i className="fas fa-undo mr-2"></i> Reset Inputs
            </Button>
          </Card>
          
          <Card title="Calculated Coordinates" icon="fas fa-compass">
            {result ? (
              <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="bg-primary p-3 rounded-lg dark:bg-[#0D0D0D]">
                          <p className="text-sm text-text-secondary dark:text-[#BDBDBD]">Δ Northing (Latitude)</p>
                          <p className="text-xl font-bold text-accent">{result.deltaN.toFixed(3)} m</p>
                      </div>
                      <div className="bg-primary p-3 rounded-lg dark:bg-[#0D0D0D]">
                          <p className="text-sm text-text-secondary dark:text-[#BDBDBD]">Δ Easting (Departure)</p>
                          <p className="text-xl font-bold text-accent">{result.deltaE.toFixed(3)} m</p>
                      </div>
                  </div>
                  <div className="bg-primary p-4 rounded-lg text-center dark:bg-[#0D0D0D]">
                    <p className="text-sm text-text-secondary dark:text-[#BDBDBD]">Bearing</p>
                    <p className="text-2xl font-bold text-text-primary dark:text-[#F2F2F2]">{result.bearing}</p>
                  </div>
                  <div className="bg-primary p-4 rounded-lg text-center dark:bg-[#0D0D0D]">
                      <p className="text-sm text-text-secondary dark:text-[#BDBDBD]">Final Coordinates (N, E)</p>
                      <p className="text-2xl font-bold text-text-primary dark:text-[#F2F2F2]">{result.endN.toFixed(3)}, {result.endE.toFixed(3)}</p>
                  </div>
                  <p className="text-xs text-text-secondary dark:text-[#BDBDBD] text-center pt-2">Note: Azimuth is measured clockwise from North (0°). Ensure your angular units are correct.</p>
              </div>
            ) : (
              <p className="text-text-secondary dark:text-[#BDBDBD]">Enter valid inputs to see results.</p>
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
              elementId="surveying-report"
              defaultTitle="Surveying Traverse Report"
            />
        </div>
      </div>
    </>
  );
};

export default SurveyingCalculator;
