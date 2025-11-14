
import type { CalculatorModule, CalculatorModuleKey } from './types';

export const CALCULATOR_MODULES: Record<CalculatorModuleKey, CalculatorModule> = {
  SCIENTIFIC: { key: 'SCIENTIFIC', name: 'Scientific Calculator', icon: 'fas fa-calculator' },
  BEAM_LOAD: { key: 'BEAM_LOAD', name: 'Beam Bending Moment', icon: 'fas fa-ruler-combined' },
  CONCRETE_MIX: { key: 'CONCRETE_MIX', name: 'Concrete Mix Estimator', icon: 'fas fa-cubes' },
  REBAR: { key: 'REBAR', name: 'Rebar Calculator', icon: 'fas fa-grip-lines' },
  EARTHWORK: { key: 'EARTHWORK', name: 'Earthwork Volume', icon: 'fas fa-mound' },
  WATER_FLOW: { key: 'WATER_FLOW', name: 'Pipe Sizing Tool', icon: 'fas fa-water' },
  SURVEYING: { key: 'SURVEYING', name: 'Surveying Calculations', icon: 'fas fa-map-marked-alt' },
};

export const SCIENTIFIC_CONSTANTS = {
  'π': { value: Math.PI, name: 'Pi' },
  'g': { value: 9.80665, name: 'Gravity (m/s²)' },
  'e': { value: Math.E, name: 'Euler\'s Number' },
  'NA': { value: 6.02214076e23, name: 'Avogadro\'s Number' },
};

export const CONCRETE_MIX_RATIOS: Record<string, { cement: number, sand: number, aggregate: number, description: string }> = {
    'M15': { cement: 1, sand: 2, aggregate: 4, description: '1:2:4 (Lean Concrete)' },
    'M20': { cement: 1, sand: 1.5, aggregate: 3, description: '1:1.5:3 (Standard RCC)' },
    'M25': { cement: 1, sand: 1, aggregate: 2, description: '1:1:2 (High-Strength RCC)' },
    'M30': { cement: 1, sand: 1, aggregate: 2, description: '1:1:2 (Pre-stressed)' },
};

// Standard rebar diameters in mm and weight in kg/m
export const REBAR_SIZES: Record<string, { diameter: number, weightPerMeter: number }> = {
    '8mm': { diameter: 8, weightPerMeter: 0.395 },
    '10mm': { diameter: 10, weightPerMeter: 0.617 },
    '12mm': { diameter: 12, weightPerMeter: 0.888 },
    '16mm': { diameter: 16, weightPerMeter: 1.578 },
    '20mm': { diameter: 20, weightPerMeter: 2.466 },
    '25mm': { diameter: 25, weightPerMeter: 3.853 },
    '32mm': { diameter: 32, weightPerMeter: 6.313 },
};

export const UNIT_CONVERSIONS: Record<string, Record<string, number>> = {
    length: { 'm': 1, 'ft': 3.28084, 'in': 39.3701 },
    mass: { 'kg': 1, 'lb': 2.20462, 'ton': 0.001 },
    area: { 'm2': 1, 'ft2': 10.7639, 'acre': 0.000247105 },
    volume: { 'm3': 1, 'ft3': 35.3147, 'l': 1000, 'gal': 264.172 },
    pressure: { 'Pa': 1, 'psi': 0.000145038, 'bar': 0.00001 },
};