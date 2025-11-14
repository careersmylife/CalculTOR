
import React, { useState, useEffect, useMemo } from 'react';
import Card from '../common/Card';
import Input from '../common/Input';
import Select from '../common/Select';
import Button from '../common/Button';
import type { BeamType, LoadType, BeamResult, HistoryEntry, BeamCrossSection } from '../../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush, ReferenceDot, Label } from 'recharts';
import HistoryCard from '../common/HistoryCard';
import ExportPDFButton from '../common/ExportPDFButton';

interface BeamLoadCalculatorProps {
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

interface Inputs {
  beamLength: number;
  load: number;
  loadPosition: number;
  beamType: BeamType;
  loadType: LoadType;
  crossSection: BeamCrossSection;
  standardSize: string;
  sectionWidth: number;
  sectionHeight: number;
  flangeThickness: number;
  webThickness: number;
  modulusOfElasticityPreset: string;
  modulusOfElasticity: number;
  momentOfInertia_cm4: number;
  distanceToFiber_mm: number;
}

const MATERIAL_PRESETS: Record<string, number> = {
  'Steel': 200,
  'Aluminum': 69,
  'Concrete': 30,
};

const I_BEAM_SIZES = [
  { name: 'IPE 80', height: 80, width: 46, webThickness: 3.8, flangeThickness: 5.2 },
  { name: 'IPE 100', height: 100, width: 55, webThickness: 4.1, flangeThickness: 5.7 },
  { name: 'IPE 120', height: 120, width: 64, webThickness: 4.4, flangeThickness: 6.3 },
  { name: 'IPE 140', height: 140, width: 73, webThickness: 4.7, flangeThickness: 6.9 },
  { name: 'IPE 160', height: 160, width: 82, webThickness: 5.0, flangeThickness: 7.4 },
];

const RECTANGULAR_BEAM_SIZES = [
  { name: '150 x 300 mm', width: 150, height: 300 },
  { name: '200 x 400 mm', width: 200, height: 400 },
  { name: '250 x 500 mm', width: 250, height: 500 },
  { name: '300 x 600 mm', width: 300, height: 600 },
];

const initialInputs: Inputs = {
  beamLength: 10,
  load: 100,
  loadPosition: 5,
  beamType: 'simply-supported',
  loadType: 'point-load',
  crossSection: 'rectangular',
  standardSize: 'Custom',
  sectionWidth: 150,
  sectionHeight: 300,
  flangeThickness: 15,
  webThickness: 10,
  modulusOfElasticityPreset: 'Steel',
  modulusOfElasticity: 200,
  momentOfInertia_cm4: 8000,
  distanceToFiber_mm: 150,
};

const BeamLoadCalculator = ({ title, history, addHistoryEntry, deleteHistoryEntry, clearHistory, theme, undoHistoryAction, redoHistoryAction, canUndoHistory, canRedoHistory }: BeamLoadCalculatorProps) => {
  const [inputHistory, setInputHistory] = useState([initialInputs]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const inputs = inputHistory[currentIndex];
  
  const [result, setResult] = useState<BeamResult | null>(null);
  const [brushRange, setBrushRange] = useState<{startIndex?: number, endIndex?: number}>({});
  const [selectedPoint, setSelectedPoint] = useState<{ x: number; moment: number; shear: number, deflection: number } | null>(null);

  // Chart Customization State
  const [momentColor, setMomentColor] = useState('#2D9CDB');
  const [shearColor, setShearColor] = useState('#22c55e');
  const [deflectionColor, setDeflectionColor] = useState('#f97316');
  const [momentStyle, setMomentStyle] = useState('solid');
  const [shearStyle, setShearStyle] = useState('solid');
  const [deflectionStyle, setDeflectionStyle] = useState('solid');
  const [showAnnotations, setShowAnnotations] = useState(true);

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
    setBrushRange({});
  };

  const handleStandardSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const name = e.target.value;
    if (name === 'Custom') {
        setInputs(p => ({ ...p, standardSize: 'Custom' }));
        return;
    }

    if (inputs.crossSection === 'i-beam') {
        const size = I_BEAM_SIZES.find(s => s.name === name);
        if (size) {
            setInputs(p => ({
                ...p,
                standardSize: name,
                sectionHeight: size.height,
                sectionWidth: size.width,
                webThickness: size.webThickness,
                flangeThickness: size.flangeThickness,
            }));
        }
    } else { // Rectangular
        const size = RECTANGULAR_BEAM_SIZES.find(s => s.name === name);
        if (size) {
            setInputs(p => ({
                ...p,
                standardSize: name,
                sectionHeight: size.height,
                sectionWidth: size.width,
            }));
        }
    }
  };

  const calculate = useMemo(() => () => {
    const { beamLength: L, load, loadPosition: a, beamType, loadType, crossSection, sectionWidth, sectionHeight, flangeThickness, webThickness, modulusOfElasticity, momentOfInertia_cm4, distanceToFiber_mm } = inputs;
    const P = load;
    const w = load; 

    if (L <= 0 || P <= 0 || modulusOfElasticity <= 0) {
      setResult(null);
      return;
    };
    
    // Convert units for calculation
    const E = modulusOfElasticity * 1e9; // GPa to Pa (N/m^2)
    const L_m = L;
    const P_N = P * 1000; // kN to N
    const w_Nm = w * 1000; // kN/m to N/m
    const a_m = a;
    
    let momentOfInertia: number; // m^4
    let c_m: number; // m, distance to extreme fiber

    if (crossSection === 'custom') {
        if (momentOfInertia_cm4 <= 0 || distanceToFiber_mm <= 0) {
            setResult(null);
            return;
        }
        momentOfInertia = momentOfInertia_cm4 / 1e8; // cm^4 to m^4
        c_m = distanceToFiber_mm / 1000; // mm to m
    } else {
        if (sectionWidth <= 0 || sectionHeight <= 0) {
            setResult(null);
            return;
        }
        const h_m = sectionHeight / 1000;
        const b_m = sectionWidth / 1000;
        c_m = h_m / 2;

        if (crossSection === 'rectangular') {
            momentOfInertia = (b_m * Math.pow(h_m, 3)) / 12;
        } else { // I-beam
            const ft_m = flangeThickness / 1000;
            const wt_m = webThickness / 1000;
            const I_flanges = (b_m * Math.pow(h_m, 3)) / 12;
            const I_void = ((b_m - wt_m) * Math.pow(h_m - 2 * ft_m, 3)) / 12;
            momentOfInertia = I_flanges - I_void;
        }
    }
    const I = momentOfInertia;

    let maxMoment_Nm = 0;
    let maxShear_N = 0;
    let reactions_N = { r1: 0, r2: 0 };
    const diagramData: { x: number; moment: number; shear: number; deflection: number }[] = [];
    const b_len = L_m - a_m;

    if (beamType === 'simply-supported') {
      if (loadType === 'point-load') {
        if (a_m > L_m || a_m < 0) return;
        reactions_N.r1 = (P_N * b_len) / L_m;
        reactions_N.r2 = (P_N * a_m) / L_m;
        maxMoment_Nm = (P_N * a_m * b_len) / L_m;
        maxShear_N = Math.max(Math.abs(reactions_N.r1), Math.abs(reactions_N.r2));
      } else { // UDL
        reactions_N.r1 = (w_Nm * L_m) / 2;
        reactions_N.r2 = (w_Nm * L_m) / 2;
        maxMoment_Nm = (w_Nm * L_m * L_m) / 8;
        maxShear_N = reactions_N.r1;
      }
    } else { // Cantilever (fixed at x=0)
        if (loadType === 'point-load') {
            if (a_m > L_m || a_m < 0) return;
            reactions_N.r1 = P_N; // Shear reaction
            reactions_N.r2 = -P_N * a_m; // Moment reaction
            maxMoment_Nm = reactions_N.r2;
            maxShear_N = P_N;
        } else { // UDL
            reactions_N.r1 = w_Nm * L_m; // Shear reaction
            reactions_N.r2 = -(w_Nm * L_m * L_m) / 2; // Moment reaction
            maxMoment_Nm = reactions_N.r2;
            maxShear_N = reactions_N.r1;
        }
    }
    
    for (let i = 0; i <= 100; i++) {
        const x = (L_m / 100) * i;
        let moment_Nm = 0;
        let shear_N = 0;
        let deflection_m = 0;
        
        if(beamType === 'simply-supported') {
            if(loadType === 'point-load') {
                moment_Nm = x <= a_m ? reactions_N.r1 * x : reactions_N.r1 * x - P_N * (x - a_m);
                shear_N = x < a_m ? reactions_N.r1 : reactions_N.r1 - P_N;
                if (x <= a_m) {
                    deflection_m = (P_N * b_len * x) / (6 * E * I * L_m) * (L_m*L_m - b_len*b_len - x*x);
                } else {
                    deflection_m = (P_N * a_m * (L_m-x)) / (6 * E * I * L_m) * (L_m*L_m - a_m*a_m - (L_m-x)*(L_m-x));
                }
            } else { // UDL
                moment_Nm = reactions_N.r1 * x - (w_Nm * x * x) / 2;
                shear_N = reactions_N.r1 - w_Nm * x;
                deflection_m = (w_Nm * x) / (24 * E * I) * (L_m*L_m*L_m - 2*L_m*x*x + x*x*x);
            }
        } else { // Cantilever (fixed at x=0)
             if(loadType === 'point-load') {
                moment_Nm = x < a_m ? reactions_N.r2 + reactions_N.r1 * x : 0;
                shear_N = x < a_m ? reactions_N.r1 : 0;
                if (x <= a_m) {
                    deflection_m = (P_N * x*x) / (6 * E * I) * (3*a_m - x);
                } else {
                    deflection_m = (P_N * a_m*a_m) / (6 * E * I) * (3*x - a_m);
                }
             } else { // UDL
                moment_Nm = reactions_N.r2 + reactions_N.r1 * x - (w_Nm * x * x)/2;
                shear_N = reactions_N.r1 - w_Nm * x;
                deflection_m = (w_Nm * x*x) / (24 * E * I) * (x*x + 6*L_m*L_m - 4*L_m*x);
             }
        }
        diagramData.push({ 
            x: Number(x.toFixed(2)), 
            moment: Number((moment_Nm/1000).toFixed(2)), 
            shear: Number((shear_N/1000).toFixed(2)), 
            deflection: Number(deflection_m * 1000) 
        });
    }

    const maxDeflection = Math.max(...diagramData.map(d => Math.abs(d.deflection)));
    const maxStress = (Math.abs(maxMoment_Nm) * c_m) / I / 1e6; // in MPa
    const maxMoment = maxMoment_Nm / 1000;
    const maxShear = maxShear_N / 1000;
    const reactions = {r1: reactions_N.r1/1000, r2: reactions_N.r2/1000};

    const newResult = { maxMoment, maxShear, reactions, diagramData, maxDeflection, maxStress, momentOfInertia };
    setResult(newResult);

    const historyInputs = {
        Type: `${beamType}, ${loadType}`,
        Length: `${L}m`,
        Load: `${P}kN${loadType === 'udl' ? '/m' : ''}`,
        ...(loadType === 'point-load' && { Position: `${a}m` }),
        ...(crossSection !== 'custom' && {Section: `${crossSection} (${sectionWidth}x${sectionHeight}mm)`}),
        ...(crossSection === 'custom' && {I: `${momentOfInertia_cm4} cm⁴`, c: `${distanceToFiber_mm} mm`}),
        Material: `E = ${modulusOfElasticity} GPa`
    };

    addHistoryEntry({
        summary: `${beamType === 'simply-supported' ? 'Simply Supported' : 'Cantilever'} Beam, ${loadType === 'point-load' ? 'Point Load' : 'UDL'}`,
        inputs: historyInputs,
        results: {
            'Max Moment': `${Math.abs(maxMoment).toFixed(2)} kNm`,
            'Max Shear': `${maxShear.toFixed(2)} kN`,
            'Max Stress': `${maxStress.toFixed(2)} MPa`,
            'Max Deflection': `${maxDeflection.toFixed(2)} mm`,
        }
    });

  }, [inputs, addHistoryEntry]);

  useEffect(() => {
    calculate();
  }, [calculate]);
  
  useEffect(() => {
    setBrushRange({});
    setSelectedPoint(null);
  }, [result]);

  const handleCopyToClipboard = (entry: HistoryEntry) => {
    const textToCopy = `Beam Load Analysis (${entry.timestamp})\nInputs:\n${Object.entries(entry.inputs).map(([k, v]) => `- ${k}: ${v}`).join('\n')}\n\nResults:\n${Object.entries(entry.results).map(([k, v]) => `- ${k}: ${v}`).join('\n')}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      alert('Results copied to clipboard!');
    }, (err) => {
      console.error('Could not copy text: ', err);
    });
  };

  const chartColors = {
    grid: theme === 'dark' ? '#4F4F4F' : '#E0E0E0',
    text: theme === 'dark' ? '#BDBDBD' : '#555555',
    tooltipBg: theme === 'dark' ? '#1A1A1A' : '#FFFFFF',
    tooltipBorder: theme === 'dark' ? '#4F4F4F' : '#E0E0E0',
    legend: theme === 'dark' ? '#F2F2F2' : '#1A1A1A'
  };

  const getStrokeDashArray = (style: string) => {
    switch (style) {
      case 'dashed': return '5 5';
      case 'dotted': return '1 5';
      default: return undefined;
    }
  };

  const annotationPoints = useMemo(() => {
    if (!result) return [];
    const points = [];
    const { maxMoment, diagramData, reactions } = result;
    const { beamLength, beamType } = inputs;

    const maxMomentDataPoint = diagramData.find(p => Math.abs(p.moment) === Math.abs(maxMoment));
    if (maxMomentDataPoint) {
      points.push({
        x: maxMomentDataPoint.x,
        y: maxMomentDataPoint.moment,
        label: `Max M: ${maxMoment.toFixed(2)}`,
        yAxisId: 'left',
        fill: momentColor
      });
    }

    if (beamType === 'simply-supported') {
      points.push({ x: 0, y: 0, label: `R1: ${reactions.r1.toFixed(2)}kN`, yAxisId: 'right', fill: '#8884d8'});
      points.push({ x: beamLength, y: 0, label: `R2: ${reactions.r2.toFixed(2)}kN`, yAxisId: 'right', fill: '#8884d8'});
    } else { // Cantilever
      points.push({ x: 0, y: 0, label: `R: ${reactions.r1.toFixed(2)}kN, M: ${reactions.r2.toFixed(2)}kNm`, yAxisId: 'right', fill: '#8884d8'});
    }
    return points;
  }, [result, inputs, momentColor]);
  
  const handleChartClick = (e: any) => {
    if (e && e.activePayload && e.activePayload.length > 0) {
      setSelectedPoint(e.activePayload[0].payload);
    }
  };

  return (
    <>
      <div id="beam-load-report">
          <h2 className="text-2xl font-bold mb-4 text-text-primary dark:text-[#F2F2F2]">{title}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1 space-y-6">
                  <Card title="Inputs" icon="fas fa-edit">
                      <div className="flex justify-end space-x-2 mb-2">
                          <Button onClick={undo} disabled={!canUndo} variant="secondary" className="px-3 py-1 text-xs"><i className="fas fa-undo mr-1"></i> Undo</Button>
                          <Button onClick={redo} disabled={!canRedo} variant="secondary" className="px-3 py-1 text-xs">Redo <i className="fas fa-redo ml-1"></i></Button>
                      </div>
                      <Select label="Beam Type" id="beamType" value={inputs.beamType} onChange={(e) => setInputs(p => ({...p, beamType: e.target.value as BeamType}))}>
                          <option value="simply-supported">Simply Supported</option>
                          <option value="cantilever">Cantilever (Fixed at Left)</option>
                      </Select>
                      <Select label="Load Type" id="loadType" value={inputs.loadType} onChange={(e) => setInputs(p => ({...p, loadType: e.target.value as LoadType}))}>
                          <option value="point-load">Point Load</option>
                          <option value="udl">Uniformly Distributed (UDL)</option>
                      </Select>
                      <Input label="Beam Length" id="beamLength" type="number" min="1" value={inputs.beamLength} onChange={(e) => setInputs(p => ({...p, beamLength: Number(e.target.value)}))} unit="m" />
                      <Input label={inputs.loadType === 'point-load' ? 'Load Magnitude' : 'Load per Meter'} id="load" type="number" min="0" value={inputs.load} onChange={(e) => setInputs(p => ({...p, load: Number(e.target.value)}))} unit={inputs.loadType === 'point-load' ? 'kN' : 'kN/m'} />
                      {inputs.loadType === 'point-load' && (
                          <Input label="Load Position (from left)" id="loadPosition" type="number" min="0" max={inputs.beamLength} value={inputs.loadPosition} onChange={(e) => setInputs(p => ({...p, loadPosition: Number(e.target.value)}))} unit="m" />
                      )}
                      <Button onClick={handleReset} variant="secondary" className="w-full mt-4">
                          <i className="fas fa-undo mr-2"></i> Reset Inputs
                      </Button>
                  </Card>

                  <Card title="Beam & Material Properties" icon="fas fa-cogs">
                      <Select label="Cross-Section" id="crossSection" value={inputs.crossSection} onChange={(e) => setInputs(p => ({...p, crossSection: e.target.value as BeamCrossSection, standardSize: 'Custom'}))}>
                          <option value="rectangular">Rectangular</option>
                          <option value="i-beam">I-Beam</option>
                          <option value="custom">Custom Properties</option>
                      </Select>

                      {inputs.crossSection !== 'custom' && (
                        <>
                          <Select label="Standard Size" id="standardSize" value={inputs.standardSize} onChange={handleStandardSizeChange}>
                              <option value="Custom">Custom</option>
                              {inputs.crossSection === 'i-beam' ? 
                                I_BEAM_SIZES.map(s => <option key={s.name} value={s.name}>{s.name}</option>) :
                                RECTANGULAR_BEAM_SIZES.map(s => <option key={s.name} value={s.name}>{s.name}</option>)
                              }
                          </Select>
                          <Input label={inputs.crossSection === 'i-beam' ? "Flange Width" : "Width"} id="sectionWidth" type="number" min="1" value={inputs.sectionWidth} onChange={(e) => setInputs(p => ({...p, sectionWidth: Number(e.target.value), standardSize: 'Custom'}))} unit="mm" />
                          <Input label="Height" id="sectionHeight" type="number" min="1" value={inputs.sectionHeight} onChange={(e) => setInputs(p => ({...p, sectionHeight: Number(e.target.value), standardSize: 'Custom'}))} unit="mm" />
                          {inputs.crossSection === 'i-beam' && (
                            <>
                              <Input label="Flange Thickness" id="flangeThickness" type="number" min="1" value={inputs.flangeThickness} onChange={(e) => setInputs(p => ({...p, flangeThickness: Number(e.target.value), standardSize: 'Custom'}))} unit="mm" />
                              <Input label="Web Thickness" id="webThickness" type="number" min="1" value={inputs.webThickness} onChange={(e) => setInputs(p => ({...p, webThickness: Number(e.target.value), standardSize: 'Custom'}))} unit="mm" />
                            </>
                          )}
                        </>
                      )}

                      {inputs.crossSection === 'custom' && (
                        <>
                           <Input label="Moment of Inertia (I)" id="momentOfInertia" type="number" min="0" value={inputs.momentOfInertia_cm4} onChange={(e) => setInputs(p => ({...p, momentOfInertia_cm4: Number(e.target.value)}))} unit="cm⁴" />
                           <Input label="Distance to Extreme Fiber (c)" id="distanceToFiber" type="number" min="0" value={inputs.distanceToFiber_mm} onChange={(e) => setInputs(p => ({...p, distanceToFiber_mm: Number(e.target.value)}))} unit="mm" />
                        </>
                      )}

                      <Select label="Material" id="modulusPreset" value={inputs.modulusOfElasticityPreset} onChange={(e) => {
                          const preset = e.target.value;
                          const value = MATERIAL_PRESETS[preset] || inputs.modulusOfElasticity;
                          setInputs(p => ({...p, modulusOfElasticityPreset: preset, modulusOfElasticity: value }));
                      }}>
                          {Object.keys(MATERIAL_PRESETS).map(name => <option key={name} value={name}>{name}</option>)}
                          <option value="Custom">Custom</option>
                      </Select>
                      {inputs.modulusOfElasticityPreset === 'Custom' && (
                          <Input label="Modulus of Elasticity" id="modulusOfElasticity" type="number" min="1" value={inputs.modulusOfElasticity} onChange={(e) => setInputs(p => ({...p, modulusOfElasticity: Number(e.target.value)}))} unit="GPa" />
                      )}
                  </Card>

                  <Card title="Chart Options" icon="fas fa-palette">
                      <div className="flex items-center justify-between">
                          <label htmlFor="momentColor" className="text-sm font-medium text-text-secondary dark:text-[#BDBDBD]">Moment Color</label>
                          <input type="color" id="momentColor" value={momentColor} onChange={(e) => setMomentColor(e.target.value)} className="w-8 h-8 rounded border-none bg-transparent" style={{'WebkitAppearance': 'none', 'MozAppearance': 'none', 'appearance': 'none'}}/>
                      </div>
                       <div className="flex items-center justify-between">
                          <label htmlFor="shearColor" className="text-sm font-medium text-text-secondary dark:text-[#BDBDBD]">Shear Color</label>
                          <input type="color" id="shearColor" value={shearColor} onChange={(e) => setShearColor(e.target.value)} className="w-8 h-8 rounded border-none bg-transparent" style={{'WebkitAppearance': 'none', 'MozAppearance': 'none', 'appearance': 'none'}}/>
                      </div>
                      <div className="flex items-center justify-between">
                          <label htmlFor="deflectionColor" className="text-sm font-medium text-text-secondary dark:text-[#BDBDBD]">Deflection Color</label>
                          <input type="color" id="deflectionColor" value={deflectionColor} onChange={(e) => setDeflectionColor(e.target.value)} className="w-8 h-8 rounded border-none bg-transparent" style={{'WebkitAppearance': 'none', 'MozAppearance': 'none', 'appearance': 'none'}}/>
                      </div>
                      <Select label="Moment Line Style" id="momentStyle" value={momentStyle} onChange={(e) => setMomentStyle(e.target.value)}>
                          <option value="solid">Solid</option>
                          <option value="dashed">Dashed</option>
                          <option value="dotted">Dotted</option>
                      </Select>
                      <Select label="Shear Line Style" id="shearStyle" value={shearStyle} onChange={(e) => setShearStyle(e.target.value)}>
                          <option value="solid">Solid</option>
                          <option value="dashed">Dashed</option>
                          <option value="dotted">Dotted</option>
                      </Select>
                      <Select label="Deflection Line Style" id="deflectionStyle" value={deflectionStyle} onChange={(e) => setDeflectionStyle(e.target.value)}>
                          <option value="solid">Solid</option>
                          <option value="dashed">Dashed</option>
                          <option value="dotted">Dotted</option>
                      </Select>
                      <div className="flex items-center mt-2">
                          <input type="checkbox" id="showAnnotations" checked={showAnnotations} onChange={(e) => setShowAnnotations(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" />
                          <label htmlFor="showAnnotations" className="ml-2 block text-sm text-text-secondary dark:text-[#BDBDBD]">Show Annotations</label>
                      </div>
                  </Card>
              </div>
              <div className="md:col-span-2">
                  <Card title="Results" icon="fas fa-chart-line">
                      {result ? (
                          <div className="space-y-4">
                              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                                  <div className="bg-primary p-3 rounded-lg dark:bg-[#0D0D0D]">
                                      <p className="text-sm text-text-secondary dark:text-[#BDBDBD]">Max Moment</p>
                                      <p className="text-xl font-bold" style={{color: momentColor}}>{Math.abs(result.maxMoment).toFixed(2)} kNm</p>
                                  </div>
                                  <div className="bg-primary p-3 rounded-lg dark:bg-[#0D0D0D]">
                                      <p className="text-sm text-text-secondary dark:text-[#BDBDBD]">Max Shear</p>
                                      <p className="text-xl font-bold" style={{color: shearColor}}>{result.maxShear.toFixed(2)} kN</p>
                                  </div>
                                  <div className="bg-primary p-3 rounded-lg dark:bg-[#0D0D0D]">
                                      <p className="text-sm text-text-secondary dark:text-[#BDBDBD]">Max Stress</p>
                                      <p className="text-xl font-bold text-red-500">{result.maxStress.toFixed(2)} MPa</p>
                                  </div>
                                  <div className="bg-primary p-3 rounded-lg dark:bg-[#0D0D0D]">
                                      <p className="text-sm text-text-secondary dark:text-[#BDBDBD]">Max Deflection</p>
                                      <p className="text-xl font-bold" style={{color: deflectionColor}}>{result.maxDeflection.toFixed(2)} mm</p>
                                  </div>
                                  <div className="bg-primary p-3 rounded-lg dark:bg-[#0D0D0D]">
                                      <p className="text-sm text-text-secondary dark:text-[#BDBDBD]">Moment of Inertia</p>
                                      <p className="text-xl font-bold text-text-primary dark:text-[#F2F2F2]">{((result.momentOfInertia) * 1e8).toExponential(2)} cm⁴</p>
                                  </div>
                                  <div className="bg-primary p-3 rounded-lg dark:bg-[#0D0D0D]">
                                      <p className="text-sm text-text-secondary dark:text-[#BDBDBD]">{inputs.beamType === 'cantilever' ? 'Shear Reaction' : 'Left Reaction (R1)'}</p>
                                      <p className="text-xl font-bold text-text-primary dark:text-[#F2F2F2]">{result.reactions.r1.toFixed(2)} kN</p>
                                  </div>
                                  <div className="bg-primary p-3 rounded-lg dark:bg-[#0D0D0D] col-span-2 lg:col-span-2">
                                      <p className="text-sm text-text-secondary dark:text-[#BDBDBD]">{inputs.beamType === 'cantilever' ? 'Moment Reaction' : 'Right Reaction (R2)'}</p>
                                      <p className="text-xl font-bold text-text-primary dark:text-[#F2F2F2]">{inputs.beamType === 'cantilever' ? result.reactions.r2.toFixed(2) : result.reactions.r2.toFixed(2)} {inputs.beamType === 'cantilever' ? 'kNm' : 'kN'}</p>
                                  </div>
                              </div>
                               <div className="flex justify-center space-x-2 mt-4">
                                <Button
                                    variant="secondary"
                                    className="py-1 px-3 text-xs"
                                    onClick={() => {
                                        const maxMomentPoint = result.diagramData.reduce((max, p) => Math.abs(p.moment) > Math.abs(max.moment) ? p : max, result.diagramData[0]);
                                        setSelectedPoint(maxMomentPoint);
                                    }}
                                >
                                    <i className="fas fa-crosshairs mr-2"></i> Select Max Moment
                                </Button>
                                <Button
                                    variant="secondary"
                                    className="py-1 px-3 text-xs"
                                    onClick={() => {
                                        const maxDeflectionPoint = result.diagramData.reduce((max, p) => Math.abs(p.deflection) > Math.abs(max.deflection) ? p : max, result.diagramData[0]);
                                        setSelectedPoint(maxDeflectionPoint);
                                    }}
                                >
                                    <i className="fas fa-crosshairs mr-2"></i> Select Max Deflection
                                </Button>
                              </div>
                              <div className="h-96 w-full mt-4">
                                  <ResponsiveContainer>
                                      <LineChart data={result.diagramData} margin={{ top: 20, right: 40, left: 20, bottom: 20 }} onClick={handleChartClick}>
                                          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                                          <XAxis dataKey="x" stroke={chartColors.text} label={{ value: 'Position (m)', position: 'insideBottom', offset: -10, fill: chartColors.text }} />
                                          <YAxis yAxisId="left" stroke={momentColor} label={{ value: 'Moment (kNm)', angle: -90, position: 'insideLeft', offset: -5, fill: momentColor }}/>
                                          <YAxis yAxisId="right" orientation="right" stroke={shearColor} label={{ value: 'Shear (kN)', angle: 90, position: 'insideRight', offset: 10, fill: shearColor }}/>
                                          <YAxis yAxisId="deflection" orientation="right" stroke={deflectionColor} label={{ value: 'Deflection (mm)', angle: 90, position: 'insideRight', offset: 35, fill: deflectionColor }} domain={['dataMin', 'dataMax']} reversed />
                                          <Tooltip contentStyle={{ backgroundColor: chartColors.tooltipBg, border: `1px solid ${chartColors.tooltipBorder}` }} cursor={{ stroke: chartColors.text, strokeWidth: 1, strokeDasharray: '3 3' }} />
                                          <Legend wrapperStyle={{ color: chartColors.legend, bottom: 0 }} />
                                          <Line yAxisId="left" type="monotone" dataKey="moment" stroke={momentColor} strokeDasharray={getStrokeDashArray(momentStyle)} strokeWidth={2} dot={false} activeDot={{ r: 5 }} name="Bending Moment" />
                                          <Line yAxisId="right" type="monotone" dataKey="shear" stroke={shearColor} strokeDasharray={getStrokeDashArray(shearStyle)} strokeWidth={2} dot={false} activeDot={{ r: 5 }} name="Shear Force" />
                                          <Line yAxisId="deflection" type="monotone" dataKey="deflection" stroke={deflectionColor} strokeDasharray={getStrokeDashArray(deflectionStyle)} strokeWidth={2} dot={false} activeDot={{ r: 5 }} name="Deflection" />
                                          
                                          {showAnnotations && annotationPoints.map((p, index) => (
                                            <ReferenceDot key={index} x={p.x} y={p.y} yAxisId={p.yAxisId} r={5} fill={p.fill} stroke="white">
                                                <Label value={p.label} position="top" fill={chartColors.text} fontSize="12" />
                                            </ReferenceDot>
                                          ))}
                                          {selectedPoint && (
                                            <>
                                              <ReferenceDot x={selectedPoint.x} y={selectedPoint.moment} yAxisId="left" r={6} fill={momentColor} stroke="white" strokeWidth={2} isFront={true} />
                                              <ReferenceDot x={selectedPoint.x} y={selectedPoint.shear} yAxisId="right" r={6} fill={shearColor} stroke="white" strokeWidth={2} isFront={true} />
                                              <ReferenceDot x={selectedPoint.x} y={selectedPoint.deflection} yAxisId="deflection" r={6} fill={deflectionColor} stroke="white" strokeWidth={2} isFront={true} />
                                            </>
                                          )}
                                          <Brush 
                                            dataKey="x" 
                                            height={30} 
                                            stroke={momentColor} 
                                            fill={theme === 'dark' ? 'rgba(242, 242, 242, 0.1)' : 'rgba(26, 26, 26, 0.1)'}
                                            startIndex={brushRange.startIndex}
                                            endIndex={brushRange.endIndex}
                                            onChange={(range) => setBrushRange(range)}
                                          />
                                      </LineChart>
                                  </ResponsiveContainer>
                              </div>
                              {brushRange.startIndex !== undefined && (
                                <div className="text-center mt-2">
                                  <Button onClick={() => setBrushRange({})} variant="secondary" className="py-1 px-3 text-xs">
                                    Reset Zoom
                                  </Button>
                                </div>
                              )}
                              {selectedPoint && (
                                <div className="mt-4 p-3 bg-primary dark:bg-[#0D0D0D] rounded-lg text-sm border border-highlight dark:border-[#4F4F4F]">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="font-semibold text-text-primary dark:text-[#F2F2F2]">Selected Point Details at x = {selectedPoint.x.toFixed(2)} m</h4>
                                        <Button onClick={() => setSelectedPoint(null)} variant="secondary" className="px-3 py-1 text-xs">Clear</Button>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div>
                                            <p className="text-xs text-text-secondary dark:text-[#BDBDBD]">Moment</p>
                                            <p className="font-bold" style={{ color: momentColor }}>{selectedPoint.moment.toFixed(2)} kNm</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-text-secondary dark:text-[#BDBDBD]">Shear</p>
                                            <p className="font-bold" style={{ color: shearColor }}>{selectedPoint.shear.toFixed(2)} kN</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-text-secondary dark:text-[#BDBDBD]">Deflection</p>
                                            <p className="font-bold" style={{ color: deflectionColor }}>{selectedPoint.deflection.toFixed(2)} mm</p>
                                        </div>
                                    </div>
                                </div>
                              )}
                          </div>
                      ) : <p className="text-text-secondary dark:text-[#BDBDBD]">Enter valid inputs to see results.</p>}
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
                elementId="beam-load-report"
                defaultTitle="Beam Load Analysis Report"
                defaultOrientation="l"
              />
          </div>
      </div>
    </>
  );
};

export default BeamLoadCalculator;
