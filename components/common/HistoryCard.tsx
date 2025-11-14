
import React from 'react';
import type { HistoryEntry } from '../../types';
import Button from './Button';
import Card from './Card';

interface HistoryCardProps {
  history: HistoryEntry[];
  onDelete: (id: string) => void;
  onClear: () => void;
  onCopy: (entry: HistoryEntry) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const HistoryCard = ({ history, onDelete, onClear, onCopy, onUndo, onRedo, canUndo, canRedo }: HistoryCardProps) => {
  if (history.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <Card title="Calculation History" icon="fas fa-history">
        <div className="flex justify-between items-center mb-2">
          <div className="flex space-x-2">
            <Button onClick={onUndo} disabled={!canUndo} variant="secondary" className="px-3 py-1 text-xs"><i className="fas fa-undo mr-1"></i> Undo</Button>
            <Button onClick={onRedo} disabled={!canRedo} variant="secondary" className="px-3 py-1 text-xs">Redo <i className="fas fa-redo ml-1"></i></Button>
          </div>
          <Button onClick={onClear} variant="secondary" className="px-3 py-1 text-xs !font-normal">
            Clear History
          </Button>
        </div>
        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
          {history.map((entry) => (
            <div key={entry.id} className="bg-primary dark:bg-[#0D0D0D] p-3 rounded-lg flex justify-between items-start transition-colors hover:bg-highlight/30 dark:hover:bg-[#4F4F4F]/30">
              <div className="flex-1 mr-4">
                <p className="font-semibold text-text-primary dark:text-[#F2F2F2] text-sm">{entry.summary}</p>
                <div className="text-xs text-text-secondary dark:text-[#BDBDBD] mt-1 flex flex-wrap">
                  {Object.entries(entry.inputs).map(([key, value]) => (
                    <span key={key} className="mr-4">
                      <span className="font-medium text-text-secondary/80 dark:text-[#BDBDBD]/80">{key}:</span> {value}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-text-secondary/70 dark:text-[#BDBDBD]/70 mt-1">{entry.timestamp}</p>
              </div>
              <div className="flex items-center space-x-3">
                <button onClick={() => onCopy(entry)} className="text-text-secondary dark:text-[#BDBDBD] hover:text-accent transition-colors" title="Copy results">
                  <i className="fas fa-copy"></i>
                </button>
                <button onClick={() => onDelete(entry.id)} className="text-text-secondary dark:text-[#BDBDBD] hover:text-red-500 transition-colors" title="Delete entry">
                  <i className="fas fa-trash"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default HistoryCard;
