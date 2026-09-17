import React, { useState } from 'react';
import { Bell, Vote, AlertTriangle, Users, Check, X, ShieldAlert, Sparkles } from 'lucide-react';
import { Player, RoleType } from '../types';
import { soundManager } from '../utils/audio';

interface EmergencyModalProps {
  callerName: string | null;
  timeRemaining: number;
  meetingRound: number;
  players: Player[];
  currentPlayer: Player;
  votes: Record<string, string>;
  onCastVote: (targetId: string | 'skip') => void;
  onConcludeMeeting: (expelledPlayerId: string | null) => void;
}

export const EmergencyModal: React.FC<EmergencyModalProps> = ({
  callerName,
  timeRemaining,
  meetingRound,
  players,
  currentPlayer,
  votes,
  onCastVote,
  onConcludeMeeting,
}) => {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(
    votes[currentPlayer.id] || null
  );

  const alivePlayers = players.filter((p) => p.isAlive);
  const totalVotesCast = Object.keys(votes).length;
  const isGhost = !currentPlayer.isAlive;
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const formattedTimer = `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`;

  const handleVoteSubmit = (targetId: string | 'skip') => {
    if (isGhost) return;
    setSelectedTarget(targetId);
    onCastVote(targetId);
    soundManager.playTick();
  };

  const handleManualConclude = () => {
    // Count votes taking into account Double Vote power from the Seven shop
    const counts: Record<string, number> = {};
    Object.entries(votes).forEach(([voterId, target]) => {
      const targetKey = String(target);
      const voter = players.find((p) => p.id === voterId);
      const weight = voter?.doubleVotesAvailable && voter.doubleVotesAvailable > 0 ? 2 : 1;
      counts[targetKey] = (counts[targetKey] || 0) + weight;
    });

    let topTarget: string | null = null;
    let topCount = 0;
    let isTie = false;

    Object.entries(counts).forEach(([target, count]) => {
      if (count > topCount) {
        topTarget = target;
        topCount = count;
        isTie = false;
      } else if (count === topCount && topCount > 0) {
        isTie = true;
      }
    });

    if (topTarget === 'skip' || isTie || !topTarget) {
      onConcludeMeeting(null);
    } else {
      onConcludeMeeting(topTarget);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-300">
      <div className="max-w-xl w-full border border-red-600/50 bg-neutral-900/90 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-red-950/50 text-center relative">
        {/* Header Alert */}
        <div className="w-16 h-16 rounded-2xl bg-red-600/20 border border-red-500/50 flex items-center justify-center mx-auto mb-4 animate-pulse">
          <Bell className="w-8 h-8 text-red-400" />
        </div>

        <div className="inline-block px-3 py-1 rounded-full bg-red-950/70 border border-red-800 text-[11px] font-mono text-red-300 uppercase tracking-widest mb-2">
          Asamblea de Emergencia #Ronda {meetingRound}
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
          ¡Reunión Convocada!
        </h2>

        <p className="text-xs sm:text-sm text-neutral-300 mt-1 max-w-md mx-auto leading-relaxed">
          {callerName ? (
            <>
              <strong>{callerName}</strong> ha tocado la alarma en la fiesta. Todos los participantes deben reunirse en el centro de la sala y guardar silencio mientras se debate.
            </>
          ) : (
            'Se ha reportado un suceso crítico. Reúnanse de inmediato en la zona central de la reunión.'
          )}
        </p>

        {/* Synchronized Debate Timer */}
        <div className="mt-4 mb-6 p-4 rounded-2xl bg-black/60 border border-red-500/30 flex items-center justify-around">
          <div>
            <div className="text-[10px] uppercase font-mono text-neutral-400 tracking-wider">Tiempo de Debate</div>
            <div className="text-3xl sm:text-4xl font-mono font-black text-red-400 tracking-wider">
              {formattedTimer}
            </div>
          </div>
          <div className="h-10 w-px bg-neutral-800" />
          <div>
            <div className="text-[10px] uppercase font-mono text-neutral-400 tracking-wider">Votos Recibidos</div>
            <div className="text-2xl sm:text-3xl font-mono font-bold text-white">
              {totalVotesCast} / {alivePlayers.length}
            </div>
          </div>
        </div>

        {/* Voting UI */}
        {isGhost ? (
          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 text-neutral-400 text-xs mb-6">
            <ShieldAlert className="w-5 h-5 text-amber-400 mx-auto mb-2" />
            <p className="font-semibold text-neutral-300">Eres un Alma Atormentadora (Eliminado)</p>
            <p className="text-[11px] text-neutral-500 mt-1">
              Las almas no pueden votar ni hablar en persona durante las asambleas. Observa las reacciones de los vivos en silencio.
            </p>
          </div>
        ) : (
          <div className="space-y-3 mb-6 text-left">
            <div className="flex items-center justify-between text-xs font-bold text-neutral-400 uppercase tracking-wider px-1">
              <span>Emite tu voto anónimo:</span>
              <span className="text-[11px] text-rose-400">
                {selectedTarget ? 'Voto registrado' : 'Pendiente de votar'}
              </span>
            </div>

            {currentPlayer.doubleVotesAvailable && currentPlayer.doubleVotesAvailable > 0 ? (
              <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-bold">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Poder de Voto Doble Activo
                </span>
                <span className="text-[10px] font-mono bg-amber-500/20 px-2 py-0.5 rounded-md">
                  x2 Votos
                </span>
              </div>
            ) : null}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1">
              {alivePlayers.map((player) => {
                const isSelected = selectedTarget === player.id;
                return (
                  <button
                    key={player.id}
                    onClick={() => handleVoteSubmit(player.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition ${
                      isSelected
                        ? 'bg-red-600/30 border-red-500 text-white shadow-sm'
                        : 'bg-neutral-950/70 border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:text-white'
                    }`}
                  >
                    <span>{player.name}</span>
                    {isSelected && <Check className="w-4 h-4 text-red-400" />}
                  </button>
                );
              })}

              <button
                onClick={() => handleVoteSubmit('skip')}
                className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold col-span-1 sm:col-span-2 transition ${
                  selectedTarget === 'skip'
                    ? 'bg-neutral-800 border-neutral-600 text-white'
                    : 'bg-neutral-950/50 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                <span>Saltar Voto (No expulsar a nadie / Abstención)</span>
                {selectedTarget === 'skip' && <Check className="w-4 h-4 text-neutral-400" />}
              </button>
            </div>
          </div>
        )}

        {/* Host / Autonomous Fast Forward Button */}
        <button
          onClick={handleManualConclude}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-red-950/50 transition"
        >
          Cerrar Votación y Revelar Veredicto
        </button>
      </div>
    </div>
  );
};
