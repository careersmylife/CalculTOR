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

const ScientificCalculator: React.FC<ScientificCalculatorProps> = ({ title, history, addHistoryEntry, deleteHistoryEntry, clearHistory, undoHistoryAction, redoHistoryAction, canUndoHistory, canRedoHistory }) => {
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

  const getCurrentValue = (): number => {
    if (result && result !== 'Error') {
      const parsedResult = parseFloat(result);
      if (!isNaN(parsedResult)) return parsedResult;
    }
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

      let processedDisplay = display.replace(/\^/g, '**');
      processedDisplay = processedDisplay.replace(/(\d+)!/g, (match, numStr) => {
        const num = parseInt(numStr, 10);
        return String(factorial(num));
      });

      const evalResult = eval(processedDisplay);
      if (typeof evalResult === 'number' && isFinite(evalResult)) {
        return evalResult;
      }
    } catch (error) {
      // Could be an incomplete expression, ignore.
    }
    return 0;
  };

  const handleButtonClick = (value: string) => {
    if (value === 'C') {
      setHistoryStack(['']);
      setCurrentIndex(0);
      setResult('');
    } else if (value === 'DEL') {
      updateDisplay(d => d.slice(0, -1));
    } else if (value === '=') {
      try {
        const factorial = (n: number): number => {
          if (n < 0 || n % 1 !== 0) return NaN;
          if (n === 0 || n === 1) return 1;
          let result = 1;
          for (let i = 2; i <= n; i++) {
            result *= i;
          }
          return result;
        };

        let processedDisplay = display.replace(/\^/g, '**');

        processedDisplay = processedDisplay.replace(/(\d+)!/g, (match, numStr) => {
          const num = parseInt(numStr, 10);
          return String(factorial(num));
        });

        const evalResult = eval(processedDisplay);
        
        if (typeof evalResult !== 'number' || !isFinite(evalResult)) {
          setResult('Error');
          return;
        }

        let resultString: string;
        const absResult = Math.abs(evalResult);

        // Use scientific notation for very large or very small numbers (but not zero)
        if (absResult > 1e12 || (absResult < 1e-6 && absResult !== 0)) {
          resultString = evalResult.toExponential(6);
        } else {
          // Use toPrecision for accuracy and parseFloat to remove trailing zeros
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

  const buttonLayout = [
    { display: 'sin', value: 'Math.sin(' }, { display: 'cos', value: 'Math.cos(' }, { display: 'tan', value: 'Math.tan(' }, { display: 'log', value: 'Math.log10(' }, { display: 'ln', value: 'Math.log(' },
    { display: 'sin⁻¹', value: 'Math.asin(' }, { display: 'cos⁻¹', value: 'Math.acos(' }, { display: 'tan⁻¹', value: 'Math.atan(' }, { display: '(', value: '(' }, { display: ')', value: ')' },
    { display: 'x²', value: '^2' }, { display: 'x³', value: '^3' }, { display: '√', value: 'Math.sqrt(' }, { display: '∛', value: 'Math.cbrt(' }, { display: '^', value: '^' },
    { display: 'abs', value: 'Math.abs(' }, { display: 'exp', value: 'Math.exp(' }, { display: 'n!', value: '!' }, { display: '%', value: '%' }, { display: 'DEL', value: 'DEL' },
    { display: '7', value: '7' }, { display: '8', value: '8' }, { display: '9', value: '9' }, { display: '/', value: '/' }, { display: 'C', value: 'C' },
    { display: '4', value: '4' }, { display: '5', value: '5' }, { display: '6', value: '6' }, { display: '*', value: '*' }, { display: '-', value: '-' },
    { display: '1', value: '1' }, { display: '2', value: '2' }, { display: '3', value: '3' }, { display: '+', value: '+' }, { display: '=', value: '=', rowSpan: 2 },
    { display: '0', value: '0', colSpan: 2 }, { display: '.', value: '.' },
  ];

  return (
    <>
      <div id="scientific-calculator-report">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold mb-4 text-text-primary dark:text-[#F2F2F2]">{title}</h2>
            <Card title="Calculation" icon="fas fa-calculator" className="mb-6">
              <div className="flex justify-between items-center mb-2">
                 <Button onClick={() => handleButtonClick('C')} variant="secondary" className="px-4 py-1 text-sm bg-red-500/20 text-red-500 hover:bg-red-500/30">Clear All</Button>
                <div className="flex space-x-2">
                  <Button onClick={undo} disabled={!canUndo} variant="secondary" className="px-4 py-1 text-sm"><i className="fas fa-undo mr-1"></i> Undo</Button>
                  <Button onClick={redo} disabled={!canRedo} variant="secondary" className="px-4 py-1 text-sm">Redo <i className="fas fa-redo ml-1"></i></Button>
                </div>
              </div>
              <div className="bg-primary p-4 rounded-lg mb-4 text-right dark:bg-[#0D0D0D]">
                <div className="text-text-secondary text-xl h-8 dark:text-[#BDBDBD] flex justify-between items-center">
                  <span 
                    className={`font-mono text-sm transition-opacity duration-300 ${memoryValue !== 0 ? 'opacity-100' : 'opacity-0'}`}
                    title={`Memory: ${memoryValue}`}
                  >
                    M
                  </span>
                  <div className="truncate flex-grow">{display || '0'}</div>
                </div>
                <div className="text-text-primary text-4xl font-bold h-12 dark:text-[#F2F2F2] truncate">{result}</div>
              </div>
              
              <div className="flex justify-around gap-2 mb-2">
                <Button className="flex-1" onClick={() => handleButtonClick('MC')} variant="secondary">MC</Button>
                <Button className="flex-1" onClick={() => handleButtonClick('MR')} variant="secondary">MR</Button>
                <Button className="flex-1" onClick={() => handleButtonClick('M+')} variant="secondary">M+</Button>
                <Button className="flex-1" onClick={() => handleButtonClick('M-')} variant="secondary">M-</Button>
              </div>

              <div className="grid grid-cols-5 grid-rows-7 gap-2">
                {buttonLayout.map((btn) => {
                  const isOperator = ['=', '+', '-', '*', '/', '^', '%'].includes(btn.display);
                  const isCommand = ['C', 'DEL'].includes(btn.value);
                  const classNames = [
                    btn.rowSpan === 2 ? `row-span-2` : '',
                    btn.colSpan === 2 ? `col-span-2` : '',
                    'h-full w-full flex items-center justify-center text-lg'
                  ].join(' ');

                  let variant: 'primary' | 'secondary' = 'secondary';
                  if (isOperator) variant = 'primary';
                  if (!isNaN(Number(btn.display))) variant = 'secondary';
                  if(btn.display === '.') variant = 'secondary';

                  return (
                    <Button
                      key={btn.display}
                      onClick={() => handleButtonClick(btn.value)}
                      variant={variant}
                      className={classNames}
                    >
                      {btn.display}
                    </Button>
                  );
                })}
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card title="Constants" icon="fas fa-atom">
                <div className="grid grid-cols-2 gap-2">
                    {Object.entries(SCIENTIFIC_CONSTANTS).map(([key, { value, name }]) => (
                        <Button key={key} onClick={() => handleButtonClick(String(value))} title={name} variant="secondary">
                            {key}
                        </Button>
                    ))}
                </div>
            </Card>

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