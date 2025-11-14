

export interface CalculatorModule {
  key: CalculatorModuleKey;
  name: string;
  icon: string;
}

export type CalculatorModuleKey = 
  | 'SCIENTIFIC'
  | 'BEAM_LOAD'
  | 'CONCRETE_MIX'
  | 'REBAR'
  | 'EARTHWORK'
  | 'WATER_FLOW'
  | 'SURVEYING';

export type BeamType = 'simply-supported' | 'cantilever';
export type LoadType = 'point-load' | 'udl';
export type BeamCrossSection = 'rectangular' | 'i-beam' | 'custom';

export interface BeamResult {
  maxMoment: number;
  maxShear: number;
  maxStress: number;
  maxDeflection: number;
  momentOfInertia: number;
  reactions: { r1: number; r2: number };
  diagramData: { x: number; moment: number; shear: number; deflection: number }[];
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  }
}

export interface GroundingMetadata {
  groundingChunks: GroundingChunk[];
}

export interface HistoryEntry {
  id: string;
  timestamp: string;
  inputs: Record<string, string | number>;
  results: Record<string, string | number>;
  summary: string;
}

export type HistoryState = Partial<Record<CalculatorModuleKey, HistoryEntry[]>>;