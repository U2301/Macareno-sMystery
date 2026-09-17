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
  type: 'social' | 'desafio' | 'fantasma' | 'lore' | 'sombra';
  progress: number; // 0 - 100
  targetCount: number;
  currentCount: number;
  completed: boolean;
  rewardCoins?: number; // Monedas ganadas al completar
}

export interface RevealedPhoto {
  id: string;
  targetId: string;
  targetName: string;
  team: TeamType;
  isHostile: boolean;
  revealedAt: string;
}

export interface ChismosoReport {
  id: string;
  p1Id: string;
  p1Name: string;
  p2Id: string;
  p2Name: string;
  sameTeam: boolean;
  verdict: string;
  timestamp: string;
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
  coins: number; // Monedas / Fichas de la Fiesta
  hasBulletproofVest?: boolean; // Chaleco Antibalas (salva de 1 intento)
  doubleVotesAvailable?: number; // Votos dobles para asamblea
  purchasedClues?: string[];
  missions: PlayerMission[]; // Mínimo 5 misiones individuales
  missionCompleted?: boolean;
  protectedByEscoltaUntil?: number; // timestamp
  hasEscoltaSpokenFaceToFace?: boolean;
  escoltaTargetId?: string;
  escoltaProtectedUntil?: number;
  photographCooldownUntil?: number;
  investigationPending?: { targetId: string; revealTime: number };
  revealedPhotos?: RevealedPhoto[];
  chismosoUsed: boolean;
  chismosoReport?: ChismosoReport;
  camaleonUsed: boolean;
  hackerUsed: boolean;
  periodistaTheories: { targetId: string; guessedRole: RoleType; isCorrect?: boolean }[];
}

export interface ShopItem {
  id: string;
  name: string;
  icon: string;
  cost: number;
  description: string;
  badge?: string;
  availableFor: 'all' | 'alive' | 'ghost';
}

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'vest',
    name: 'Chaleco Antibalas',
    icon: '🛡️',
    cost: 15,
    description: 'Si un asesino te acorrala e introduce tu código, el chaleco amortigua el ataque y tu muerte queda anulada.',
    badge: 'Defensa Vital',
    availableFor: 'alive',
  },
  {
    id: 'bribe_clue',
    name: 'Soborno al Forense (Pista IA)',
    icon: '🔍',
    cost: 10,
    description: 'El Árbitro IA te envía una pista confidencial al chat privado sobre la vestimenta o hábitos del asesino.',
    badge: 'Información',
    availableFor: 'all',
  },
  {
    id: 'double_vote',
    name: 'Voto Doble en Asamblea',
    icon: '⚖️',
    cost: 8,
    description: 'Tu voto contará por 2 en la próxima asamblea de emergencia para expulsar a un sospechoso.',
    badge: 'Influencia',
    availableFor: 'alive',
  },
  {
    id: 'seven_snack',
    name: 'Ronda de Pizza del Seven',
    icon: '🍕',
    cost: 6,
    description: 'Aporta a la fiesta. Sube la barra colectiva de los inocentes en +8% de inmediato.',
    badge: 'Colectivo',
    availableFor: 'all',
  },
  {
    id: 'emp_jam',
    name: 'Interferidor de Asamblea',
    icon: '📡',
    cost: 12,
    description: 'Bloquea la sirena de emergencia de la fiesta durante 90 segundos de caos total.',
    badge: 'Caos',
    availableFor: 'all',
  }
];

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
  nextEventCooldown?: number;
  votes: Record<string, string>; // voterId -> targetId | 'skip'
  meetingRound: number;
  hackerGlitchActiveUntil: number | null;
  murderHistory: MurderReport[];
  collectiveTaskProgress: number; // 0 - 100%
  aiNarratorLogs: AILogEntry[];
  winner: TeamType | null;
}
