export type RoleType =
  | 'Inocente'
  | 'Asesino'
  | 'El Fotógrafo'
  | 'El Chismoso'
  | 'El Médico Forense'
  | 'El Escolta'
  | 'El Camaleón'
  | 'El Cómplice / Hacker'
  | 'El Paranoico'
  | 'El Periodista'
  | 'Alma Atormentadora';

export type TeamType = 'Fiesta (Inocentes)' | 'Sombras (Asesinos)' | 'Caos (Independiente)';

export type GamePhase = 'Día' | 'Noche';

export const MURDER_PACT_WORD = '¿Qué traes allí?';

export interface PlayerMission {
  id: string;
  title: string;
  description: string;
  type: 'social' | 'desafio' | 'fantasma' | 'lore';
  progress: number; // 0 - 100
  targetCount: number;
  currentCount: number;
  completed: boolean;
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  pin: string; // PIN personal de 4 dígitos
  victimCode: string; // Código de 4 dígitos revelado solo si te eliminan
  role: RoleType;
  team: TeamType;
  isAlive: boolean;
  isHost?: boolean;
  emergencyCallsLeft: number;
  missions: PlayerMission[]; // Mínimo 5 misiones individuales
  missionCompleted?: boolean;
  protectedByEscoltaUntil?: number; // timestamp
  hasEscoltaSpokenFaceToFace?: boolean;
  photographCooldownUntil?: number;
  investigationPending?: { targetId: string; revealTime: number };
  chismosoUsed: boolean;
  camaleonUsed: boolean;
  hackerUsed: boolean;
  periodistaTheories: { targetId: string; guessedRole: RoleType; isCorrect?: boolean }[];
}

export interface PartyEvent {
  id: string;
  title: string;
  description: string;
  instructions: string;
  durationSeconds: number;
  type: 'urgente' | 'divertido' | 'caotico';
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string | null; // null = General, string = privado
  content: string;
  timestamp: string;
  isSystem?: boolean;
  isAI?: boolean;
  isChameleon?: boolean;
  chameleonDisguiseName?: string;
}

export interface MurderReport {
  id: string;
  victimId: string;
  victimName: string;
  timestamp: string;
  clue: string; // Pista forense abstracta o generada por IA
  aiAnalysis?: string;
}

export interface AILogEntry {
  id: string;
  text: string;
  timestamp: string;
  type: 'forensic' | 'lore' | 'event' | 'referee';
}

export interface GameState {
  roomCode: string;
  status: 'lobby' | 'playing' | 'ended';
  hostPlayerId: string;
  phase: GamePhase;
  phaseTimeRemaining: number;
  phaseDuration: number;
  isGameStarted: boolean;
  isEmergencyActive: boolean;
  emergencyTimeRemaining: number;
  emergencyCallerName: string | null;
  activeEvent: PartyEvent | null;
  eventTimeRemaining: number;
  votes: Record<string, string>; // voterId -> targetId | 'skip'
  meetingRound: number;
  hackerGlitchActiveUntil: number | null;
  murderHistory: MurderReport[];
  collectiveTaskProgress: number; // 0 - 100%
  aiNarratorLogs: AILogEntry[];
  winner: TeamType | null;
}
