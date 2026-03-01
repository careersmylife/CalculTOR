
import React, { useState } from 'react';
import Card from '../common/Card';
import Button from '../common/Button';
import { SCIENTIFIC_CONSTANTS, UNIT_CONVERSIONS } from '../../constants';
import HistoryCard from '../common/HistoryCard';
import type { HistoryEntry } from '../../types';
import ExportPDFButton from '../common/ExportPDFButton';

interface ScientificCalculatorProps {
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

interface ButtonConfig {
  display: string;
  value: string;
  variant: 'primary' | 'secondary';
  className?: string;
  colSpan?: number;
}

const ScientificCalculator = ({ title, history, addHistoryEntry, deleteHistoryEntry, clearHistory, undoHistoryAction, redoHistoryAction, canUndoHistory, canRedoHistory }: ScientificCalculatorProps) => {
  const [historyStack, setHistoryStack] = useState(['']);
  const [currentIndex, setCurrentIndex] = useState(0);
  const display = historyStack[currentIndex];
  
  const [result, setResult] = useState('');
  const [memoryValue, setMemoryValue] = useState(0);
  
  // Unit Converter State
  const [unitCategory, setUnitCategory] = useState('length');
  const [fromUnit, setFromUnit] = useState('m');
  const [toUnit, setToUnit] = useState('ft');
  const [inputValue, setInputValue] = useState(1);
  const [convertedValue, setConvertedValue] = useState(UNIT_CONVERSIONS.length.ft);
  
  const updateDisplay = (value: string | ((prev: string) => string)) => {
    const newDisplay = typeof value === 'function' ? value(display) : value;
    if (newDisplay === display) return;
    
    const newHistory = historyStack.slice(0, currentIndex + 1);
    newHistory.push(newDisplay);
    setHistoryStack(newHistory);
    setCurrentIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const redo = () => {
    if (currentIndex < historyStack.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < historyStack.length - 1;

  // Helper to safely get numeric value for memory operations
  const getCurrentValue = (): number => {
    if (result && result !== 'Error') {
      const parsedResult = parseFloat(result);
      if (!isNaN(parsedResult)) return parsedResult;
    }
    // Very basic fallback attempt to eval current display if result is empty
    return 0;
  };

  const calculateResult = () => {
    try {
      const factorial = (n: number): number => {
        if (n < 0 || n % 1 !== 0) return NaN;
        if (n === 0 || n === 1) return 1;
        let res = 1;
        for (let i = 2; i <= n; i++) {
          res *= i;
        }
        return res;
      };

      // 1. Replace tokens with safe placeholders to prevent substring collisions
      let expr = display;
      const replacements: [RegExp, string][] = [
        [/sin⁻¹\(/g, 'FUNC_ASIN('],
        [/cos⁻¹\(/g, 'FUNC_ACOS('],
        [/tan⁻¹\(/g, 'FUNC_ATAN('],
        [/sin\(/g, 'FUNC_SIN('],
        [/cos\(/g, 'FUNC_COS('],
        [/tan\(/g, 'FUNC_TAN('],
        [/log\(/g, 'FUNC_LOG10('],
        [/ln\(/g, 'FUNC_LOG('],
        [/√\(/g, 'FUNC_SQRT('],
        [/∛\(/g, 'FUNC_CBRT('],
        [/abs\(/g, 'FUNC_ABS('],
        [/exp\(/g, 'FUNC_EXP('],
        [/×/g, '*'],
        [/÷/g, '/'],
        [/\^/g, '**'],
        [/π/g, 'CONST_PI'],
        [/e/g, 'CONST_E'],
        [/g/g, 'CONST_G'],
        [/mod/g, '%'],
      ];

      replacements.forEach(([regex, replacement]) => {
        expr = expr.replace(regex, replacement);
      });

      // Handle factorial (simple post-fix ! support)
      expr = expr.replace(/(\d+)!/g, (match, numStr) => {
        const num = parseInt(numStr, 10);
        return String(factorial(num));
      });

      // 2. Finalize to JS Syntax
      expr = expr
        .replace(/FUNC_ASIN/g, 'Math.asin')
        .replace(/FUNC_ACOS/g, 'Math.acos')
        .replace(/FUNC_ATAN/g, 'Math.atan')
        .replace(/FUNC_SIN/g, 'Math.sin')
        .replace(/FUNC_COS/g, 'Math.cos')
        .replace(/FUNC_TAN/g, 'Math.tan')
        .replace(/FUNC_LOG10/g, 'Math.log10')
        .replace(/FUNC_LOG/g, 'Math.log')
        .replace(/FUNC_SQRT/g, 'Math.sqrt')
        .replace(/FUNC_CBRT/g, 'Math.cbrt')
        .replace(/FUNC_ABS/g, 'Math.abs')
        .replace(/FUNC_EXP/g, 'Math.exp')
        .replace(/CONST_PI/g, 'Math.PI')
        .replace(/CONST_E/g, 'Math.E')
        .replace(/CONST_G/g, String(SCIENTIFIC_CONSTANTS.g.value));

      // eslint-disable-next-line no-eval
      const evalResult = eval(expr);
      
      if (typeof evalResult !== 'number' || !isFinite(evalResult)) {
        setResult('Error');
        return;
      }

      let resultString: string;
      const absResult = Math.abs(evalResult);

      if (absResult > 1e12 || (absResult < 1e-6 && absResult !== 0)) {
        resultString = evalResult.toExponential(6);
      } else {
        resultString = parseFloat(evalResult.toPrecision(12)).toString();
      }

      setResult(resultString);

      if (display && resultString && resultString !== 'Error') {
        addHistoryEntry({
          summary: `${display} = ${resultString}`,
          inputs: { Expression: display },
          results: { Result: resultString }
        });
      }
    } catch (error) {
      setResult('Error');
    }
  };

  const handleButtonClick = (value: string) => {
    if (value === 'C') {
      setHistoryStack(['']);
      setCurrentIndex(0);
      setResult('');
    } else if (value === 'DEL') {
      // Basic delete: remove last character. 
      // Ideally this would remove whole tokens (like 'sin(') but simple slice is standard fallback
      updateDisplay(d => d.slice(0, -1));
    } else if (value === '=') {
      calculateResult();
    } else if (value === 'MC') {
      setMemoryValue(0);
    } else if (value === 'MR') {
      updateDisplay(d => d + String(memoryValue));
    } else if (value === 'M+') {
      setMemoryValue(prev => prev + getCurrentValue());
    } else if (value === 'M-') {
      setMemoryValue(prev => prev - getCurrentValue());
    } else {
      updateDisplay(d => d + value);
    }
  };
  
  // Unit Converter Logic
  const handleUnitConversion = () => {
    const category = UNIT_CONVERSIONS[unitCategory];
    const baseValue = inputValue / category[fromUnit];
    const finalValue = baseValue * category[toUnit];
    setConvertedValue(finalValue);
  };
  
  React.useEffect(() => {
    const category = UNIT_CONVERSIONS[unitCategory];
    const units = Object.keys(category);
    setFromUnit(units[0]);
    setToUnit(units[1] || units[0]);
  }, [unitCategory]);

  React.useEffect(() => {
    handleUnitConversion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue, fromUnit, toUnit, unitCategory]);

  const handleCopyToClipboard = (entry: HistoryEntry) => {
    const textToCopy = `Scientific Calculation (${entry.timestamp})\nExpression: ${entry.inputs.Expression}\nResult: ${entry.results.Result}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      alert('Results copied to clipboard!');
    }, (err) => {
      console.error('Could not copy text: ', err);
    });
  };

  const buttonLayout: ButtonConfig[] = [
    // Row 1: Actions & Groups
    { display: 'C', value: 'C', variant: 'secondary', className: 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 font-bold' },
    { display: 'DEL', value: 'DEL', variant: 'secondary', className: 'bg-orange-100 text-orange-600 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400 font-bold' },
    { display: '(', value: '(', variant: 'secondary' },
    { display: ')', value: ')', variant: 'secondary' },
    { display: 'mod', value: 'mod', variant: 'secondary' },

    // Row 2: Trig & Logs
    { display: 'sin', value: 'sin(', variant: 'secondary' },
    { display: 'cos', value: 'cos(', variant: 'secondary' },
    { display: 'tan', value: 'tan(', variant: 'secondary' },
    { display: 'log', value: 'log(', variant: 'secondary' },
    { display: 'ln', value: 'ln(', variant: 'secondary' },

    // Row 3: Inverse Trig & Constants
    { display: 'sin⁻¹', value: 'sin⁻¹(', variant: 'secondary' },
    { display: 'cos⁻¹', value: 'cos⁻¹(', variant: 'secondary' },
    { display: 'tan⁻¹', value: 'tan⁻¹(', variant: 'secondary' },
    { display: 'π', value: 'π', variant: 'secondary', className: 'text-accent font-serif font-bold' },
    { display: 'e', value: 'e', variant: 'secondary', className: 'text-accent font-serif font-bold' },

    // Row 4: Powers & Roots
    { display: 'x²', value: '^2', variant: 'secondary' },
    { display: '√', value: '√(', variant: 'secondary' },
    { display: '^', value: '^', variant: 'secondary' },
    { display: 'n!', value: '!', variant: 'secondary' },
    { display: 'g', value: 'g', variant: 'secondary', className: 'text-accent font-serif font-bold' },

    // Row 5: Num 7-9
    { display: '7', value: '7', variant: 'secondary', className: 'bg-primary dark:bg-[#0D0D0D]' },
    { display: '8', value: '8', variant: 'secondary', className: 'bg-primary dark:bg-[#0D0D0D]' },
    { display: '9', value: '9', variant: 'secondary', className: 'bg-primary dark:bg-[#0D0D0D]' },
    { display: '÷', value: '÷', variant: 'primary' },
    { display: 'abs', value: 'abs(', variant: 'secondary' },

    // Row 6: Num 4-6
    { display: '4', value: '4', variant: 'secondary', className: 'bg-primary dark:bg-[#0D0D0D]' },
    { display: '5', value: '5', variant: 'secondary', className: 'bg-primary dark:bg-[#0D0D0D]' },
    { display: '6', value: '6', variant: 'secondary', className: 'bg-primary dark:bg-[#0D0D0D]' },
    { display: '×', value: '×', variant: 'primary' },
    { display: 'exp', value: 'exp(', variant: 'secondary' },

    // Row 7: Num 1-3
    { display: '1', value: '1', variant: 'secondary', className: 'bg-primary dark:bg-[#0D0D0D]' },
    { display: '2', value: '2', variant: 'secondary', className: 'bg-primary dark:bg-[#0D0D0D]' },
    { display: '3', value: '3', variant: 'secondary', className: 'bg-primary dark:bg-[#0D0D0D]' },
    { display: '-', value: '-', variant: 'primary' },
    { display: '∛', value: '∛(', variant: 'secondary' },

    // Row 8: Num 0
    { display: '0', value: '0', variant: 'secondary', className: 'bg-primary dark:bg-[#0D0D0D] col-span-2', colSpan: 2 },
    { display: '.', value: '.', variant: 'secondary', className: 'bg-primary dark:bg-[#0D0D0D]' },
    { display: '+', value: '+', variant: 'primary' },
    { display: '=', value: '=', variant: 'primary', className: 'bg-green-600 hover:bg-green-700 text-white' },
  ];

  return (
    <>
      <div id="scientific-calculator-report">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold mb-4 text-text-primary dark:text-[#F2F2F2]">{title}</h2>
            <Card title="Scientific Keypad" icon="fas fa-calculator" className="mb-6">
              <div className="flex justify-between items-center mb-2">
                 <div className="text-xs text-text-secondary dark:text-[#BDBDBD] font-mono">
                    Deg | Rad
                 </div>
                <div className="flex space-x-2">
                  <Button onClick={undo} disabled={!canUndo} variant="secondary" className="px-4 py-1 text-sm"><i className="fas fa-undo mr-1"></i> Undo</Button>
                  <Button onClick={redo} disabled={!canRedo} variant="secondary" className="px-4 py-1 text-sm">Redo <i className="fas fa-redo ml-1"></i></Button>
                </div>
              </div>
              <div className="bg-primary p-4 rounded-lg mb-4 text-right dark:bg-[#0D0D0D] border border-highlight dark:border-[#4F4F4F]">
                <div className="text-text-secondary text-xl h-8 dark:text-[#BDBDBD] flex justify-between items-center">
                  <span 
                    className={`font-mono text-sm transition-opacity duration-300 text-accent ${memoryValue !== 0 ? 'opacity-100' : 'opacity-0'}`}
                    title={`Memory: ${memoryValue}`}
                  >
                    M
                  </span>
                  <div className="truncate flex-grow font-mono tracking-wide">{display || '0'}</div>
                </div>
                <div className="text-text-primary text-4xl font-bold h-12 dark:text-[#F2F2F2] truncate mt-2">{result}</div>
              </div>
              
              <div className="flex justify-around gap-2 mb-3">
                <Button className="flex-1 text-xs py-2" onClick={() => handleButtonClick('MC')} variant="secondary">MC</Button>
                <Button className="flex-1 text-xs py-2" onClick={() => handleButtonClick('MR')} variant="secondary">MR</Button>
                <Button className="flex-1 text-xs py-2" onClick={() => handleButtonClick('M+')} variant="secondary">M+</Button>
                <Button className="flex-1 text-xs py-2" onClick={() => handleButtonClick('M-')} variant="secondary">M-</Button>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {buttonLayout.map((btn, idx) => (
                  <Button
                    key={`${btn.display}-${idx}`}
                    onClick={() => handleButtonClick(btn.value)}
                    variant={btn.variant}
                    className={`h-12 flex items-center justify-center text-lg ${btn.className || ''} ${btn.colSpan ? `col-span-${btn.colSpan}` : ''}`}
                  >
                    {btn.display}
                  </Button>
                ))}
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card title="Unit Converter" icon="fas fa-exchange-alt">
              <select value={unitCategory} onChange={(e) => setUnitCategory(e.target.value)} className="w-full bg-primary border border-highlight rounded-lg p-2 mb-2 dark:bg-[#0D0D0D] dark:border-[#4F4F4F] dark:text-[#F2F2F2]">
                    {Object.keys(UNIT_CONVERSIONS).map(cat => <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>)}
              </select>
              <div className="flex items-center space-x-2">
                    <input type="number" value={inputValue} onChange={(e) => setInputValue(Number(e.target.value))} className="w-full bg-primary border border-highlight rounded-lg p-2 dark:bg-[#0D0D0D] dark:border-[#4F4F4F] dark:text-[#F2F2F2]" />
                    <select value={fromUnit} onChange={(e) => setFromUnit(e.target.value)} className="w-full bg-primary border border-highlight rounded-lg p-2 dark:bg-[#0D0D0D] dark:border-[#4F4F4F] dark:text-[#F2F2F2]">
                        {Object.keys(UNIT_CONVERSIONS[unitCategory]).map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
              </div>
              <div className="text-center text-2xl my-2 text-text-secondary dark:text-[#BDBDBD]">=</div>
              <div className="flex items-center space-x-2">
                    <input type="text" readOnly value={convertedValue.toPrecision(6)} className="w-full bg-primary border border-highlight rounded-lg p-2 dark:bg-[#0D0D0D] dark:border-[#4F4F4F] dark:text-[#F2F2F2]" />
                    <select value={toUnit} onChange={(e) => setToUnit(e.target.value)} className="w-full bg-primary border border-highlight rounded-lg p-2 dark:bg-[#0D0D0D] dark:border-[#4F4F4F] dark:text-[#F2F2F2]">
                        {Object.keys(UNIT_CONVERSIONS[unitCategory]).map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
              </div>
            </Card>
          </div>
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
              elementId="scientific-calculator-report"
              defaultTitle="Scientific Calculator Report"
            />
        </div>
      </div>
    </>
  );
};

export default ScientificCalculator;
