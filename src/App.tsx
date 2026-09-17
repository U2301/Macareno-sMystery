import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Skull,
  Bell,
  Sun,
  Moon,
  Users,
  MessageSquare,
  Smartphone,
  Radio,
  Flame,
  Target,
  CheckCircle2,
  Lock,
  LogOut,
  Trophy,
  AlertTriangle,
  Zap,
  Sparkles,
  Bot,
  Copy,
  CheckCircle
} from 'lucide-react';
import {
  Player,
  GameState,
  ChatMessage,
  GamePhase,
  RoleType,
  MurderReport
} from './types';
import { soundManager } from './utils/audio';
import { RoleCard } from './components/RoleCard';
import { ChatSystem } from './components/ChatSystem';
import { EmergencyModal } from './components/EmergencyModal';
import { HackerGlitchOverlay } from './components/HackerGlitchOverlay';
import { LoginModal } from './components/LoginModal';
import { JoinScreen } from './components/JoinScreen';
import { LobbyScreen } from './components/LobbyScreen';
import { MissionsPanel } from './components/MissionsPanel';
import { AIOracleModal } from './components/AIOracleModal';

export default function App() {
  // Session / Room state
  const [currentRoomCode, setCurrentRoomCode] = useState<string | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [gameState, setGameState] = useState<GameState | null>(null);

  // Modals & UI states
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isAIOracleOpen, setIsAIOracleOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [joinErrorMessage, setJoinErrorMessage] = useState<string | null>(null);
  const [activeMobileTab, setActiveMobileTab] = useState<'role' | 'missions' | 'chat'>('role');

  const prevPhaseRef = useRef<GamePhase | null>(null);
  const prevEmergencyRef = useRef<boolean>(false);

  // 1. Polling interval to sync room state with server
  useEffect(() => {
    if (!currentRoomCode) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/rooms/${currentRoomCode}`);
        if (res.ok) {
          const data = await res.json();
          setGameState(data.roomState);
          setPlayers(data.players);
          setChatMessages(data.chatMessages);

          // Update current player instance with latest data (e.g. if killed or roles assigned)
          if (currentPlayer) {
            const updatedMe = data.players.find((p: Player) => p.id === currentPlayer.id);
            if (updatedMe) setCurrentPlayer(updatedMe);
          }

          // Sound triggers on phase transition
          if (prevPhaseRef.current && prevPhaseRef.current !== data.roomState.phase) {
            soundManager.playPhaseTransition(data.roomState.phase === 'Noche');
          }
          prevPhaseRef.current = data.roomState.phase;

          // Sound trigger on emergency
          if (!prevEmergencyRef.current && data.roomState.isEmergencyActive) {
            soundManager.playEmergencyAlarm();
          }
          prevEmergencyRef.current = data.roomState.isEmergencyActive;

          // Confetti on victory
          if (data.roomState.winner) {
            confetti({ particleCount: 100, spread: 80 });
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    };

    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [currentRoomCode, currentPlayer?.id]);

  // 2. Action Helpers
  const sendRoomAction = async (actionType: string, payload: any = {}) => {
    if (!currentRoomCode || !currentPlayer) return { success: false };
    try {
      const res = await fetch(`/api/rooms/${currentRoomCode}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: currentPlayer.id,
          actionType,
          payload,
        }),
      });
      const data = await res.json();
      return data;
    } catch (err) {
      console.error('Action error:', err);
      return { success: false, error: 'Error al comunicarse con el servidor' };
    }
  };

  // Handlers
  const handleCreateRoom = async (name: string, avatar: string, pin: string, customCode?: string) => {
    setJoinErrorMessage(null);
    try {
      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostName: name, avatar, pin, roomCode: customCode }),
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentRoomCode(data.roomCode);
        setCurrentPlayer(data.player);
        setGameState(data.roomState);
        setPlayers(data.players);
      } else {
        setJoinErrorMessage(data.error || 'No se pudo crear la sala.');
      }
    } catch (err) {
      setJoinErrorMessage('Error de red al crear la sala.');
    }
  };

  const handleJoinRoom = async (roomCode: string, name: string, avatar: string, pin: string) => {
    setJoinErrorMessage(null);
    try {
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode, name, avatar, pin }),
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentRoomCode(data.roomCode);
        setCurrentPlayer(data.player);
        setGameState(data.roomState);
        setPlayers(data.players);
      } else {
        setJoinErrorMessage(data.error || 'No se pudo ingresar a la sala.');
      }
    } catch (err) {
      setJoinErrorMessage('Error de red al unirse a la sala.');
    }
  };

  const handleStartGame = async () => {
    if (!currentRoomCode || !currentPlayer) return;
    try {
      const res = await fetch(`/api/rooms/${currentRoomCode}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: currentPlayer.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setGameState(data.roomState);
        setPlayers(data.players);
        setChatMessages(data.chatMessages);
        const me = data.players.find((p: Player) => p.id === currentPlayer.id);
        if (me) setCurrentPlayer(me);
        soundManager.playPhaseTransition(false);
      }
    } catch (err) {
      console.error('Start game error:', err);
    }
  };

  const handleRegisterKill = async (victimCode: string) => {
    const res = await sendRoomAction('kill', { victimCode });
    if (res.success) {
      soundManager.playMurderStinger();
      return { success: true, message: res.message };
    }
    return { success: false, message: res.error || 'Código incorrecto.' };
  };

  const handleCallEmergency = () => {
    soundManager.playEmergencyAlarm();
    sendRoomAction('emergency');
  };

  const handleCastVote = (targetId: string) => {
    soundManager.playTick();
    sendRoomAction('vote', { targetId });
  };

  const handleConcludeMeeting = (expelledPlayerId: string | null) => {
    sendRoomAction('conclude_meeting', { expelledPlayerId });
  };

  const handleAdvanceMission = (missionId: string) => {
    soundManager.playTick();
    sendRoomAction('advance_mission', { missionId });
  };

  const handleTriggerHackerPulse = () => {
    soundManager.playGlitch();
    sendRoomAction('hacker_emp');
  };

  const handleUseFotografo = (targetId: string) => {
    sendRoomAction('fotografo_snap', { targetId });
  };

  const handleUseEscolta = (targetId: string) => {
    sendRoomAction('escolta_protect', { targetId });
  };

  const handleConfirmEscoltaFaceToFace = () => {
    sendRoomAction('escolta_confirm_face_to_face');
  };

  const handleUseChismoso = (p1Id: string, p2Id: string) => {
    const p1 = players.find((p) => p.id === p1Id);
    const p2 = players.find((p) => p.id === p2Id);
    return { sameTeam: p1?.team === p2?.team };
  };

  const handleSubmitPeriodistaTheory = (targetId: string, guessedRole: RoleType) => {
    const target = players.find((p) => p.id === targetId);
    return target?.role === guessedRole;
  };

  const handleSendMessage = (receiverId: string | null, content: string, asChameleon?: boolean) => {
    sendRoomAction('send_message', { receiverId, content, asChameleon });
  };

  const handleAskAI = async (query: string): Promise<string> => {
    const res = await sendRoomAction('ai_consult', { query });
    return res.reply || 'El Árbitro IA guarda silencio.';
  };

  // If not joined to any room yet -> Show JoinScreen
  if (!currentRoomCode || !currentPlayer || !gameState) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-center p-4">
        <JoinScreen
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          errorMessage={joinErrorMessage}
        />
      </div>
    );
  }

  // If room is in 'lobby' -> Show LobbyScreen
  if (gameState.status === 'lobby') {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-center p-4">
        <LobbyScreen
          roomState={gameState}
          players={players}
          currentPlayer={currentPlayer}
          onStartGame={handleStartGame}
          onLeaveRoom={() => {
            setCurrentRoomCode(null);
            setCurrentPlayer(null);
            setGameState(null);
          }}
        />
      </div>
    );
  }

  // ACTIVE GAMEPLAY: 100% PURE CELLPHONE SCREEN
  const isHackerGlitchActive =
    gameState.hackerGlitchActiveUntil !== null &&
    gameState.hackerGlitchActiveUntil > Date.now() &&
    currentPlayer.team === 'Fiesta (Inocentes)';

  const hackerGlitchSecondsRemaining = gameState.hackerGlitchActiveUntil
    ? Math.max(0, Math.ceil((gameState.hackerGlitchActiveUntil - Date.now()) / 1000))
    : 0;

  const phaseMinutes = Math.floor(gameState.phaseTimeRemaining / 60);
  const phaseSeconds = gameState.phaseTimeRemaining % 60;
  const formattedPhaseTimer = `${phaseMinutes.toString().padStart(2, '0')}:${phaseSeconds
    .toString()
    .padStart(2, '0')}`;

  const isNight = gameState.phase === 'Noche';

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans pb-24 selection:bg-rose-500/30 selection:text-rose-200">
      {/* Hacker EMP Glitch Overlay for Innocents */}
      {isHackerGlitchActive && (
        <HackerGlitchOverlay timeRemainingSeconds={hackerGlitchSecondsRemaining} />
      )}

      {/* Emergency Assembly Modal */}
      {gameState.isEmergencyActive && (
        <EmergencyModal
          callerName={gameState.emergencyCallerName}
          timeRemaining={gameState.emergencyTimeRemaining}
          meetingRound={gameState.meetingRound}
          players={players}
          currentPlayer={currentPlayer}
          votes={gameState.votes}
          onCastVote={handleCastVote}
          onConcludeMeeting={handleConcludeMeeting}
        />
      )}

      {/* AI Oracle & Árbitro Modal */}
      <AIOracleModal
        isOpen={isAIOracleOpen}
        onClose={() => setIsAIOracleOpen(false)}
        onAskAI={handleAskAI}
      />

      {/* Mobile Top Navigation Header */}
      <header className="border-b border-neutral-800 bg-neutral-900/90 backdrop-blur sticky top-0 z-40 px-4 py-2.5">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{currentPlayer.avatar}</span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white leading-none">{currentPlayer.name}</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase ${
                    currentPlayer.isAlive
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {currentPlayer.isAlive ? 'Vivo' : 'Alma'}
                </span>
              </div>
              <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                SALA: {gameState.roomCode}
              </div>
            </div>
          </div>

          {/* Phase Cycle Badge + Timer */}
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border text-xs font-mono font-bold ${
                isNight
                  ? 'bg-purple-950/50 border-purple-800/60 text-purple-300'
                  : 'bg-amber-950/50 border-amber-800/60 text-amber-300'
              }`}
            >
              {isNight ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              <span>{formattedPhaseTimer}</span>
            </div>

            {/* AI Árbitro Button */}
            <button
              id="open-ai-oracle-btn"
              onClick={() => setIsAIOracleOpen(true)}
              className="p-2 rounded-xl bg-purple-900/40 border border-purple-500/40 text-purple-300 hover:text-white transition relative"
              title="Consultar al Árbitro IA"
            >
              <Sparkles className="w-4 h-4 animate-pulse" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-md mx-auto w-full px-4 pt-4 space-y-4 flex-1">
        {/* Winner Banner */}
        {gameState.winner && (
          <div className="p-4 rounded-3xl bg-amber-500/20 border border-amber-500/40 text-center space-y-1">
            <Trophy className="w-6 h-6 text-amber-400 mx-auto" />
            <h3 className="text-sm font-black text-white uppercase">
              ¡Partida Ganada por: {gameState.winner}!
            </h3>
          </div>
        )}

        {/* Active Party Event Banner */}
        {gameState.activeEvent && (
          <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-start gap-2.5">
            <Flame className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
            <div className="text-xs">
              <div className="font-bold text-white flex items-center justify-between">
                <span>{gameState.activeEvent.title}</span>
                <span className="text-[10px] font-mono text-amber-400">
                  ⏳ {gameState.eventTimeRemaining}s
                </span>
              </div>
              <p className="text-neutral-300 text-[11px] mt-0.5">
                {gameState.activeEvent.instructions}
              </p>
            </div>
          </div>
        )}

        {/* TAB 1: Secret Role Card & Emergency Panic Button */}
        {activeMobileTab === 'role' && (
          <div className="space-y-4">
            <RoleCard
              player={currentPlayer}
              players={players}
              currentPhase={gameState.phase}
              murderHistory={gameState.murderHistory}
              onRegisterKill={(code) => handleRegisterKill(code)}
              onTriggerHackerPulse={handleTriggerHackerPulse}
              onUseChismoso={handleUseChismoso}
              onUseEscolta={handleUseEscolta}
              onConfirmEscoltaFaceToFace={handleConfirmEscoltaFaceToFace}
              onUseFotografo={handleUseFotografo}
              onSubmitPeriodistaTheory={handleSubmitPeriodistaTheory}
            />

            {/* Panic Buzzer for Emergency Meeting */}
            <div className="rounded-3xl border border-red-950 bg-gradient-to-b from-red-950/25 to-neutral-900/90 p-5 text-center space-y-2 shadow-xl">
              <div className="flex items-center justify-center gap-2">
                <Bell className="w-4 h-4 text-red-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-red-300">
                  Sirena de Asamblea General
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 leading-tight">
                Convoca a todos a debatir si encontraste una baja o viste a alguien sospechoso.
              </p>
              <button
                id="emergency-panic-btn"
                onClick={handleCallEmergency}
                disabled={!currentPlayer.isAlive || currentPlayer.emergencyCallsLeft <= 0}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-40 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-red-950/50 transition active:scale-95"
              >
                {currentPlayer.isAlive
                  ? `🚨 Convocar Asamblea (${currentPlayer.emergencyCallsLeft} disponible)`
                  : 'Las almas en pena no pueden convocar asambleas'}
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: 5 Lore Missions Panel */}
        {activeMobileTab === 'missions' && (
          <div className="space-y-4">
            <MissionsPanel
              missions={currentPlayer.missions || []}
              isAlive={currentPlayer.isAlive}
              onAdvanceMission={handleAdvanceMission}
            />

            {/* Collective Task Progress Bar */}
            <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold">
                <span className="text-neutral-300">Meta Colectiva de la Fiesta</span>
                <span className="text-amber-400 font-mono">
                  {Math.round(gameState.collectiveTaskProgress)}% / 100%
                </span>
              </div>
              <div className="w-full bg-neutral-950 h-2 rounded-full overflow-hidden border border-neutral-800">
                <div
                  className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, gameState.collectiveTaskProgress)}%` }}
                />
              </div>
              <p className="text-[10px] text-neutral-500">
                Si la fiesta completa el 100% de las tareas antes de que los asesinos igualen a los vivos, ¡los inocentes ganan la partida!
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: Secret Whispers & Party Chat */}
        {activeMobileTab === 'chat' && (
          <ChatSystem
            currentPlayer={currentPlayer}
            players={players}
            messages={chatMessages}
            onSendMessage={handleSendMessage}
          />
        )}
      </main>

      {/* Fixed Bottom Navigation Bar for Cellphones */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-neutral-900/95 backdrop-blur border-t border-neutral-800 px-4 py-2">
        <div className="max-w-md mx-auto grid grid-cols-3 gap-2">
          <button
            id="tab-role"
            onClick={() => setActiveMobileTab('role')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition ${
              activeMobileTab === 'role'
                ? 'bg-rose-600/20 text-rose-400 font-bold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Skull className="w-4 h-4" />
            <span className="text-[10px] mt-0.5">Mi Rol</span>
          </button>

          <button
            id="tab-missions"
            onClick={() => setActiveMobileTab('missions')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition relative ${
              activeMobileTab === 'missions'
                ? 'bg-amber-500/20 text-amber-400 font-bold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Target className="w-4 h-4" />
            <span className="text-[10px] mt-0.5">5 Misiones</span>
            {(currentPlayer.missions || []).some((m) => !m.completed) && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 absolute top-1 right-8" />
            )}
          </button>

          <button
            id="tab-chat"
            onClick={() => setActiveMobileTab('chat')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition ${
              activeMobileTab === 'chat'
                ? 'bg-sky-500/20 text-sky-400 font-bold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="text-[10px] mt-0.5">Chat & Susurros</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
