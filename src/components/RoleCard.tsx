import React, { useState } from 'react';
import {
  ShieldAlert,
  Eye,
  EyeOff,
  Skull,
  Camera,
  MessageCircle,
  Stethoscope,
  ShieldCheck,
  Sparkles,
  Zap,
  HelpCircle,
  FileText,
  Ghost,
  CheckCircle2,
  Clock,
  Send,
  AlertCircle
} from 'lucide-react';
import { Player, RoleType, GamePhase, MurderReport } from '../types';
import { ROLES_CATALOG } from '../data/roles';

interface RoleCardProps {
  player: Player;
  players: Player[];
  currentPhase: GamePhase;
  murderHistory: MurderReport[];
  onRegisterKill: (code: string) => { success: boolean; message: string };
  onTriggerHackerPulse: () => void;
  onUseChismoso: (p1Id: string, p2Id: string) => { sameTeam: boolean };
  onUseEscolta: (targetId: string) => void;
  onConfirmEscoltaFaceToFace: () => void;
  onUseFotografo: (targetId: string) => void;
  onSubmitPeriodistaTheory: (targetId: string, role: RoleType) => boolean;
}

export const RoleCard: React.FC<RoleCardProps> = ({
  player,
  players,
  currentPhase,
  murderHistory,
  onRegisterKill,
  onTriggerHackerPulse,
  onUseChismoso,
  onUseEscolta,
  onConfirmEscoltaFaceToFace,
  onUseFotografo,
  onSubmitPeriodistaTheory,
}) => {
  const [showSecret, setShowSecret] = useState(false);
  const [killCode, setKillCode] = useState('');
  const [killFeedback, setKillFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Ability local state
  const [chismosoP1, setChismosoP1] = useState('');
  const [chismosoP2, setChismosoP2] = useState('');
  const [chismosoResult, setChismosoResult] = useState<string | null>(null);

  const [escoltaTarget, setEscoltaTarget] = useState('');
  const [fotografoTarget, setFotografoTarget] = useState('');
  const [periodistaTarget, setPeriodistaTarget] = useState('');
  const [periodistaRoleGuess, setPeriodistaRoleGuess] = useState<RoleType>('El Fotógrafo');
  const [periodistaFeedback, setPeriodistaFeedback] = useState<string | null>(null);

  const roleDef = ROLES_CATALOG[player.role];
  const isGhost = !player.isAlive;
  const aliveOthers = players.filter((p) => p.isAlive && p.id !== player.id);

  const handleKillSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!killCode.trim()) return;
    const res = onRegisterKill(killCode.trim());
    setKillFeedback(res);
    if (res.success) setKillCode('');
    setTimeout(() => setKillFeedback(null), 4000);
  };

  const handleChismosoSubmit = () => {
    if (!chismosoP1 || !chismosoP2 || chismosoP1 === chismosoP2) return;
    const res = onUseChismoso(chismosoP1, chismosoP2);
    setChismosoResult(
      res.sameTeam
        ? '¡Coincidencia! Ambos jugadores comparten la misma alineación de bando.'
        : '¡Bando opuesto! Uno de ellos pertenece a un bando rival del otro.'
    );
  };

  const handlePeriodistaSubmit = () => {
    if (!periodistaTarget) return;
    const correct = onSubmitPeriodistaTheory(periodistaTarget, periodistaRoleGuess);
    const targetName = players.find(p => p.id === periodistaTarget)?.name;
    setPeriodistaFeedback(
      correct
        ? `¡Primicia confirmada! Has acertado: ${targetName} es ${periodistaRoleGuess}.`
        : `Pista refutada: ${targetName} no ostenta ese rol.`
    );
    setTimeout(() => setPeriodistaFeedback(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Secret Credential Container */}
      <div className="rounded-3xl border border-neutral-800 bg-neutral-900/80 p-6 backdrop-blur shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Credencial Secreta de Identidad
            </span>
          </div>

          <button
            id="toggle-secret-btn"
            onClick={() => setShowSecret(!showSecret)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs font-semibold border border-neutral-700 transition"
          >
            {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showSecret ? 'Ocultar Credencial' : 'Tocar para ver'}
          </button>
        </div>

        {showSecret ? (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div>
              <div className="text-xs text-neutral-400 font-medium">Tu Rol Oculto:</div>
              <div className="text-2xl sm:text-3xl font-black text-white flex flex-wrap items-center gap-2.5 mt-1">
                <span>{player.role}</span>
                <span
                  className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    player.team.includes('Sombras')
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : player.team.includes('Caos')
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  {player.team}
                </span>
              </div>
              <p className="text-xs text-neutral-400 italic mt-0.5">{roleDef.tagline}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-neutral-950/70 border border-neutral-800 text-xs text-neutral-300 leading-relaxed space-y-2">
              <p>{roleDef.description}</p>
              <div className="border-t border-neutral-800/80 pt-2 font-medium text-neutral-400 text-[11px]">
                <strong className="text-neutral-200">Condición de Victoria:</strong> {roleDef.winCondition}
              </div>
            </div>

            {/* Victim Code (Only handed over upon physical murder) */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800">
              <div>
                <div className="text-[10px] text-neutral-400 uppercase font-mono tracking-wider">
                  Tu Código Secreto de Víctima
                </div>
                <div className="text-2xl font-mono font-black text-rose-400 tracking-widest mt-0.5">
                  {player.victimCode}
                </div>
              </div>
              <div className="text-[11px] text-neutral-400 max-w-[200px] text-right leading-tight">
                🔒 Nunca muestres este código. <strong>Solo entrégalo si alguien te acorrala a solas y te susurra: "¿Qué traes allí?".</strong>
              </div>
            </div>
          </div>
        ) : (
          <div
            onClick={() => setShowSecret(true)}
            className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-neutral-800 rounded-2xl bg-neutral-950/40 cursor-pointer hover:border-neutral-700 transition group"
          >
            <Eye className="w-6 h-6 text-neutral-500 group-hover:text-neutral-300 transition mb-2" />
            <span className="text-xs font-semibold text-neutral-300">
              Toca para consultar tu rol secreto en privado
            </span>
            <span className="text-[11px] text-neutral-500 mt-1">
              Verifica que nadie en la fiesta esté mirando tu pantalla
            </span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* INTERACTIVE ROLE-SPECIFIC ABILITY PANEL                                   */}
      {/* ========================================================================= */}
      <div className="rounded-3xl border border-neutral-800 bg-neutral-900/80 p-6 backdrop-blur shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
              Habilidad Especial: {roleDef.abilityName}
            </h3>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300">
            Fase: {roleDef.phaseDependence}
          </span>
        </div>

        {/* 1. ASESINO */}
        {player.role === 'Asesino' && (
          <div className="space-y-3">
            <p className="text-xs text-neutral-300 leading-relaxed">
              Acorrala a un invitado a solas (sin testigos a 3m), susúrrale discretamente al oído la frase: <strong className="text-rose-400">"¿Qué traes allí?"</strong> y solicita su Código Secreto de 4 dígitos. Ingrésalo aquí para confirmar su baja:
            </p>
            <form onSubmit={handleKillSubmit} className="flex gap-2">
              <input
                type="text"
                maxLength={4}
                placeholder="Código (Ej: 4921)"
                value={killCode}
                onChange={(e) => setKillCode(e.target.value)}
                className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm font-mono tracking-widest text-white outline-none focus:border-rose-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <Skull className="w-3.5 h-3.5" />
                Registrar Baja
              </button>
            </form>
            {killFeedback && (
              <div
                className={`p-2.5 rounded-xl text-xs font-semibold ${
                  killFeedback.success
                    ? 'bg-emerald-950/60 border border-emerald-600/40 text-emerald-300'
                    : 'bg-rose-950/60 border border-rose-600/40 text-rose-300'
                }`}
              >
                {killFeedback.message}
              </div>
            )}
          </div>
        )}

        {/* 2. EL FOTÓGRAFO */}
        {player.role === 'El Fotógrafo' && (
          <div className="space-y-3 text-xs">
            <p className="text-neutral-300 leading-relaxed">
              Toma una foto rápida a un jugador en persona con la app. Tras 15 minutos (o al cambiar de fase), tu cuarto oscuro digital revelará si esa persona es Inocente o Hostil.
            </p>

            {player.investigationPending ? (
              <div className="p-3.5 rounded-2xl bg-sky-950/40 border border-sky-600/30 text-sky-200">
                <div className="flex items-center gap-2 font-bold mb-1">
                  <Clock className="w-4 h-4 text-sky-400" />
                  Revelado en proceso
                </div>
                <p className="text-[11px]">
                  Analizando la fotografía de{' '}
                  <strong>{players.find((p) => p.id === player.investigationPending?.targetId)?.name}</strong>.
                  Recibirás el dictamen confidencial en la siguiente rotación.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <select
                  value={fotografoTarget}
                  onChange={(e) => setFotografoTarget(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-sky-500"
                >
                  <option value="">Selecciona al jugador fotografiado...</option>
                  {aliveOthers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    if (fotografoTarget) {
                      onUseFotografo(fotografoTarget);
                      setFotografoTarget('');
                    }
                  }}
                  disabled={!fotografoTarget}
                  className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Disparar y Enviar a Revelado
                </button>
              </div>
            )}
          </div>
        )}

        {/* 3. EL CHISMOSO */}
        {player.role === 'El Chismoso' && (
          <div className="space-y-3 text-xs">
            <p className="text-neutral-300">
              Compara a 2 jugadores una sola vez por partida para saber si comparten la misma alineación o son enemigos:
            </p>

            {player.chismosoUsed ? (
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-400">
                Ya has utilizado tu habilidad única de cotejo de rumores.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={chismosoP1}
                    onChange={(e) => setChismosoP1(e.target.value)}
                    className="bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-2 text-xs text-white outline-none"
                  >
                    <option value="">Jugador 1...</option>
                    {aliveOthers.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <select
                    value={chismosoP2}
                    onChange={(e) => setChismosoP2(e.target.value)}
                    className="bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-2 text-xs text-white outline-none"
                  >
                    <option value="">Jugador 2...</option>
                    {aliveOthers.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleChismosoSubmit}
                  disabled={!chismosoP1 || !chismosoP2 || chismosoP1 === chismosoP2}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white rounded-xl font-bold transition flex items-center justify-center gap-1.5"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  Analizar Lazos Ocultos (1 solo uso)
                </button>

                {chismosoResult && (
                  <div className="p-3 rounded-xl bg-amber-950/50 border border-amber-600/40 text-amber-200 font-semibold animate-in fade-in">
                    {chismosoResult}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 4. EL MÉDICO FORENSE */}
        {player.role === 'El Médico Forense' && (
          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-2 text-teal-400 font-semibold">
              <Stethoscope className="w-4 h-4" />
              <span>Registro de Autopsias Forenses</span>
            </div>

            {murderHistory.length === 0 ? (
              <p className="text-neutral-500 italic">No se han registrado víctimas mortales todavía.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {murderHistory.map((m) => (
                  <div key={m.id} className="p-3 rounded-xl bg-neutral-950 border border-teal-900/40 space-y-1">
                    <div className="flex items-center justify-between text-teal-300 font-bold">
                      <span>Víctima: {m.victimName}</span>
                      <span className="font-mono text-[10px] text-neutral-400">{m.timestamp}</span>
                    </div>
                    <p className="text-neutral-300 text-[11px] leading-relaxed">
                      🔍 <strong>Pista Forense:</strong> {m.clue}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 5. EL ESCOLTA */}
        {player.role === 'El Escolta' && (
          <div className="space-y-3 text-xs">
            <p className="text-neutral-300">
              Selecciona a quién proteger cada 15 min. <strong>Regla IRL:</strong> Debes hablar cara a cara con esa persona al menos una vez para que el escudo se active.
            </p>

            <div className="space-y-2">
              <select
                value={escoltaTarget}
                onChange={(e) => setEscoltaTarget(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
              >
                <option value="">Selecciona al objetivo a escoltar...</option>
                {aliveOthers.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              <button
                onClick={() => {
                  if (escoltaTarget) {
                    onUseEscolta(escoltaTarget);
                  }
                }}
                disabled={!escoltaTarget}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Asignar Protección
              </button>

              {player.protectedByEscoltaUntil && player.protectedByEscoltaUntil > Date.now() && (
                <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-600/30 text-indigo-200 flex items-center justify-between">
                  <span>
                    Objetivo protegido: <strong>{players.find(p => p.id === escoltaTarget)?.name}</strong>
                  </span>
                  <button
                    onClick={onConfirmEscoltaFaceToFace}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${
                      player.hasEscoltaSpokenFaceToFace
                        ? 'bg-emerald-950 border-emerald-600 text-emerald-300'
                        : 'bg-indigo-900 border-indigo-700 text-white hover:bg-indigo-800'
                    }`}
                  >
                    {player.hasEscoltaSpokenFaceToFace ? '✓ Conversación IRL Realizada' : 'Confirmar Charla Cara a Cara'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 6. EL CÓMPLICE / HACKER */}
        {player.role === 'El Cómplice / Hacker' && (
          <div className="space-y-3 text-xs">
            <p className="text-neutral-300">
              Desata un pulso electromagnético (EMP) una vez por partida para glitchear e inhabilitar los teléfonos de todos los inocentes durante 3 minutos.
            </p>
            <button
              onClick={onTriggerHackerPulse}
              disabled={player.hackerUsed}
              className="w-full py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-30 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-950/40 transition"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              {player.hackerUsed ? 'Interferencia Ya Utilizada' : 'Activar Pulso EMP (3 Minutos de Bloqueo)'}
            </button>
          </div>
        )}

        {/* 7. EL PERIODISTA */}
        {player.role === 'El Periodista' && (
          <div className="space-y-3 text-xs">
            <p className="text-neutral-300">
              Entrevista a los invitados y formula tus teorías para destapar 2 roles especiales:
            </p>

            <div className="grid grid-cols-2 gap-2">
              <select
                value={periodistaTarget}
                onChange={(e) => setPeriodistaTarget(e.target.value)}
                className="bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-2 text-xs text-white outline-none"
              >
                <option value="">Investigado...</option>
                {players.filter(p => p.id !== player.id).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              <select
                value={periodistaRoleGuess}
                onChange={(e) => setPeriodistaRoleGuess(e.target.value as RoleType)}
                className="bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-2 text-xs text-white outline-none"
              >
                <option value="El Fotógrafo">El Fotógrafo</option>
                <option value="El Chismoso">El Chismoso</option>
                <option value="El Médico Forense">El Médico Forense</option>
                <option value="El Escolta">El Escolta</option>
                <option value="El Camaleón">El Camaleón</option>
                <option value="El Cómplice / Hacker">El Cómplice / Hacker</option>
                <option value="El Paranoico">El Paranoico</option>
                <option value="Asesino">Asesino</option>
              </select>
            </div>

            <button
              onClick={handlePeriodistaSubmit}
              disabled={!periodistaTarget}
              className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition"
            >
              <FileText className="w-3.5 h-3.5" />
              Registrar Teoría Periodística
            </button>

            {periodistaFeedback && (
              <div className="p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-600/40 text-cyan-200 font-semibold">
                {periodistaFeedback}
              </div>
            )}
          </div>
        )}

        {/* 8. EL PARANOICO */}
        {player.role === 'El Paranoico' && (
          <div className="p-3.5 rounded-2xl bg-yellow-950/30 border border-yellow-500/30 text-xs text-yellow-200 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-yellow-400" />
              Objetivo de Victoria Único:
            </div>
            <p>
              Debes lograr que la asamblea te expulse mediante votos en la <strong>Asamblea 1 o 2</strong>. ¡Actúa de forma errática y sospechosa pero sin confesar tu rol!
            </p>
          </div>
        )}

        {/* 9. ALMA ATORMENTADORA */}
        {isGhost && (
          <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-slate-300">
              <Ghost className="w-4 h-4 text-purple-400" />
              Poder Espectral:
            </div>
            <p>
              Sigue completando tus tareas de ultratumba para alterar el equilibrio de la fiesta y apoyar a tu causa favorita.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
