export enum StopStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export interface DeliveryStop {
  id: string;
  customerName: string;
  address: string;
  notes?: string;
  status: StopStatus;
  timestamp: number;
}

export interface DailyRoute {
  id: string;
  date: string; // ISO string YYYY-MM-DD
  driverName: string;
  stops: DeliveryStop[];
}

// For the Gemini Tool Function Calls
export interface AddStopArgs {
  customerName: string;
  address: string;
  notes?: string;
}

export interface RemoveStopArgs {
  customerName: string;
}

export type AudioBarData = number[];

// New types for Team Management
export type TeamRole = 'Motorista' | 'Auxiliar' | 'Operador';

export interface TeamMember {
  id: string;
  name: string;
  role: TeamRole;
  subRole: string;
}

export interface Fleet {
  id: string;
  name: string; // e.g. "Frota 113"
  driverId: string;
  assistantId?: string;
  date: string; // YYYY-MM-DD
}

// Time Off Schedule Types
export type DayOfWeek = 'Segunda-feira' | 'Terça-feira' | 'Quarta-feira' | 'Quinta-feira' | 'Sexta-feira' | 'Sábado' | 'Domingo';

export interface TimeOffEntry {
  id: string;
  memberId: string;
  dayOfWeek: DayOfWeek;
}