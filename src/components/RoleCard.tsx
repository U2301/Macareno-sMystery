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
  AlertCircle,
  Users
} from 'lucide-react';
import { Player, RoleType, GamePhase, MurderReport } from '../types';
import { ROLES_CATALOG } from '../data/roles';

interface RoleCardProps {
  player: Player;
  players: Player[];
  currentPhase: GamePhase;
  murderHistory: MurderReport[];
  hackerGlitchActiveUntil?: number;
  onRegisterKill: (code: string) => { success: boolean; message: string };
  onTriggerHackerPulse: () => void;
  onUseChismoso: (p1Id: string, p2Id: string) => Promise<{ success: boolean; error?: string; chismosoReport?: any }> | { sameTeam: boolean };
  onUseEscolta: (targetId: string) => void;
  onConfirmEscoltaFaceToFace: () => void;
  onUseFotografo: (targetId: string) => void;
  onAccelerateFotografo?: () => void;
  onSubmitPeriodistaTheory: (targetId: string, role: RoleType) => Promise<boolean> | boolean;
}

export const RoleCard: React.FC<RoleCardProps> = ({
  player,
  players,
  currentPhase,
  murderHistory,
  hackerGlitchActiveUntil,
  onRegisterKill,
  onTriggerHackerPulse,
  onUseChismoso,
  onUseEscolta,
  onConfirmEscoltaFaceToFace,
  onUseFotografo,
  onAccelerateFotografo,
  onSubmitPeriodistaTheory,
}) => {
  const [showSecret, setShowSecret] = useState(false);
  const [killCode, setKillCode] = useState('');
  const [killFeedback, setKillFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Ability local state
  const [chismosoP1, setChismosoP1] = useState('');
  const [chismosoP2, setChismosoP2] = useState('');
  const [chismosoResult, setChismosoResult] = useState<string | null>(null);
  const [chismosoLoading, setChismosoLoading] = useState(false);

  const [escoltaTarget, setEscoltaTarget] = useState('');
  const [fotografoTarget, setFotografoTarget] = useState('');
  const [periodistaTarget, setPeriodistaTarget] = useState('');
  const [periodistaRoleGuess, setPeriodistaRoleGuess] = useState<RoleType>('El Fotógrafo');
  const [periodistaFeedback, setPeriodistaFeedback] = useState<string | null>(null);

  const roleDef = ROLES_CATALOG[player.role];
  const isGhost = !player.isAlive;
  const aliveOthers = players.filter((p) => p.isAlive && p.id !== player.id);
  const deadPlayers = players.filter((p) => !p.isAlive);

  // Shadow team allies (for Asesino, Hacker, Camaleón)
  const isShadowTeam = player.team.includes('Sombras');
  const shadowAllies = players.filter(
    (p) => p.id !== player.id && p.team.includes('Sombras')
  );

  const handleKillSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!killCode.trim()) return;
    const res = onRegisterKill(killCode.trim());
    setKillFeedback(res);
    if (res.success) setKillCode('');
    setTimeout(() => setKillFeedback(null), 4000);
  };

  const handleChismosoSubmit = async () => {
    if (!chismosoP1 || !chismosoP2 || chismosoP1 === chismosoP2) return;
    setChismosoLoading(true);
    try {
      const res: any = await onUseChismoso(chismosoP1, chismosoP2);
      if (res && res.chismosoReport) {
        setChismosoResult(res.chismosoReport.verdict);
      } else if (res && res.sameTeam !== undefined) {
        setChismosoResult(
          res.sameTeam
            ? '¡Coincidencia! Ambos jugadores pertenecen exactamente al mismo bando.'
            : '¡Bandos Opuestos! Uno de ellos es Fiesta y el otro Sombras.'
        );
      }
    } catch (e) {
      console.error('Chismoso error:', e);
    } finally {
      setChismosoLoading(false);
    }
  };

  const handlePeriodistaSubmit = async () => {
    if (!periodistaTarget) return;
    const correct = await onSubmitPeriodistaTheory(periodistaTarget, periodistaRoleGuess);
    const targetName = players.find(p => p.id === periodistaTarget)?.name;
    setPeriodistaFeedback(
      correct
        ? `¡Primicia confirmada! Has acertado: ${targetName} es ${periodistaRoleGuess}. (+15 monedas del Seven)`
        : `Pista refutada: ${targetName} NO ostenta ese rol.`
    );
    setTimeout(() => setPeriodistaFeedback(null), 5000);
  };

  const isGlitchActive = !!(hackerGlitchActiveUntil && hackerGlitchActiveUntil > Date.now());
  const glitchSecsLeft = isGlitchActive
    ? Math.max(0, Math.ceil((hackerGlitchActiveUntil! - Date.now()) / 1000))
    : 0;

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
          <div className="space-y-4">
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

            {/* Shadow Allies Syndicate */}
            {shadowAllies.length > 0 && (
              <div className="p-3 rounded-2xl bg-rose-950/30 border border-rose-900/40 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 text-rose-300 font-bold uppercase tracking-wider text-[10px]">
                  <Users className="w-3.5 h-3.5" />
                  Tus Aliados de las Sombras:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {shadowAllies.map((a) => (
                    <span
                      key={a.id}
                      className="px-2 py-0.5 rounded-lg bg-rose-900/50 border border-rose-700/60 text-rose-200 text-[11px] font-semibold"
                    >
                      {a.name} ({a.role})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. EL FOTÓGRAFO */}
        {player.role === 'El Fotógrafo' && (
          <div className="space-y-4 text-xs">
            <p className="text-neutral-300 leading-relaxed">
              Toma una fotografía rápida a un invitado en persona con la app. Tras el revelado en cuarto oscuro (45s o forzado manual), descubrirás su verdadera alineación:
            </p>

            {player.investigationPending ? (
              <div className="p-4 rounded-2xl bg-sky-950/50 border border-sky-600/40 text-sky-200 space-y-2">
                <div className="flex items-center justify-between font-bold">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-sky-400 animate-spin" />
                    <span>Revelado Químico en Proceso</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-900 text-sky-300 font-mono">
                    En laboratorio
                  </span>
                </div>
                <p className="text-[11px] text-sky-100">
                  Analizando el negativo de{' '}
                  <strong className="text-white">
                    {players.find((p) => p.id === player.investigationPending?.targetId)?.name || 'Objetivo'}
                  </strong>
                  .
                </p>
                {onAccelerateFotografo && (
                  <button
                    onClick={onAccelerateFotografo}
                    className="w-full mt-2 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Revelar Negativo Ahora Mismo
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <select
                  value={fotografoTarget}
                  onChange={(e) => setFotografoTarget(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-sky-500"
                >
                  <option value="">Selecciona al jugador a fotografiar...</option>
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

            {/* Permanent Photo Gallery of Revealed Targets */}
            {player.revealedPhotos && player.revealedPhotos.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-neutral-800">
                <div className="flex items-center justify-between text-neutral-400 font-semibold text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-sky-400" />
                    Galería de Negativos Revelados ({player.revealedPhotos.length})
                  </span>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {player.revealedPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      className={`p-3 rounded-xl border flex items-center justify-between ${
                        photo.isHostile
                          ? 'bg-rose-950/40 border-rose-700/50 text-rose-200'
                          : 'bg-emerald-950/40 border-emerald-700/50 text-emerald-200'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-white text-xs">{photo.targetName}</div>
                        <div className="text-[10px] opacity-75 font-mono">Revelado a las {photo.revealedAt}</div>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          photo.isHostile
                            ? 'bg-rose-600 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {photo.isHostile ? '🔴 HOSTIL (Sombras)' : '🟢 INOCENTE (Fiesta)'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. EL CHISMOSO */}
        {player.role === 'El Chismoso' && (
          <div className="space-y-4 text-xs">
            <p className="text-neutral-300">
              Compara a 2 jugadores una sola vez por partida para descubrir si comparten la misma alineación o son enemigos:
            </p>

            {player.chismosoReport || player.chismosoUsed ? (
              <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-100 space-y-2">
                <div className="flex items-center justify-between font-bold">
                  <div className="flex items-center gap-1.5 text-amber-300">
                    <CheckCircle2 className="w-4 h-4 text-amber-400" />
                    <span>Expediente de Cotejo Oficial</span>
                  </div>
                  {player.chismosoReport?.timestamp && (
                    <span className="text-[10px] font-mono text-amber-400/80">
                      {player.chismosoReport.timestamp}
                    </span>
                  )}
                </div>
                {player.chismosoReport ? (
                  <>
                    <div className="flex items-center gap-2 text-white font-bold text-xs">
                      <span>{player.chismosoReport.p1Name}</span>
                      <span className="text-neutral-400">vs</span>
                      <span>{player.chismosoReport.p2Name}</span>
                      <span
                        className={`text-[10px] ml-auto px-2 py-0.5 rounded-full font-bold ${
                          player.chismosoReport.sameTeam
                            ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                            : 'bg-rose-500/30 text-rose-300 border border-rose-500/50'
                        }`}
                      >
                        {player.chismosoReport.sameTeam ? 'Mismo Bando' : 'Bandos Opuestos'}
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-100 leading-relaxed font-medium">
                      {player.chismosoReport.verdict}
                    </p>
                  </>
                ) : (
                  <p className="text-neutral-300">
                    {chismosoResult || 'Habilidad de cotejo de rumores ya utilizada.'}
                  </p>
                )}
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
                  disabled={chismosoLoading || !chismosoP1 || !chismosoP2 || chismosoP1 === chismosoP2}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white rounded-xl font-bold transition flex items-center justify-center gap-1.5"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  {chismosoLoading ? 'Cotejando rumores...' : 'Analizar Lazos Ocultos (1 solo uso)'}
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
              Selecciona a quién proteger cada 15 min. <strong>Regla Presencial:</strong> Debes hablar cara a cara con esa persona al menos una vez para que el escudo se active.
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

              {/* Display current protected target */}
              {player.escoltaTargetId && (
                <div className="p-3.5 rounded-2xl bg-indigo-950/50 border border-indigo-600/40 text-indigo-200 space-y-2">
                  <div className="flex items-center justify-between font-bold">
                    <span>
                      Escoltando a:{' '}
                      <strong className="text-white">
                        {players.find((p) => p.id === player.escoltaTargetId)?.name || 'Jugador'}
                      </strong>
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        player.hasEscoltaSpokenFaceToFace
                          ? 'bg-emerald-600 text-white'
                          : 'bg-amber-600 text-white'
                      }`}
                    >
                      {player.hasEscoltaSpokenFaceToFace ? '✓ Blindaje Activo' : '⚠️ Charla Pendiente'}
                    </span>
                  </div>

                  <p className="text-[11px] text-indigo-300">
                    {player.hasEscoltaSpokenFaceToFace
                      ? 'Has confirmado la interacción presencial. Tu protegido sobrevivirá al siguiente intento de asesinato.'
                      : 'Acércate en la fiesta y háblale en persona, luego pulsa el botón abajo para consolidar la protección.'}
                  </p>

                  <button
                    onClick={onConfirmEscoltaFaceToFace}
                    className={`w-full py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      player.hasEscoltaSpokenFaceToFace
                        ? 'bg-emerald-950 border border-emerald-600 text-emerald-300'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {player.hasEscoltaSpokenFaceToFace
                      ? '✓ Charla Cara a Cara Confirmada'
                      : 'Confirmar Charla Cara a Cara en la Fiesta'}
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
              Desata un pulso electromagnético (EMP) una vez por partida para glitchear e inhabilitar los teléfonos de todos los inocentes durante 3 minutos y congelar las sirenas de emergencia.
            </p>

            {isGlitchActive && (
              <div className="p-3.5 rounded-2xl bg-red-950/60 border border-red-500 text-red-200 animate-pulse space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-red-400">
                  <Zap className="w-4 h-4 text-amber-300" />
                  ⚡ PULSO EMP ACTIVO: {glitchSecsLeft}s restantes
                </div>
                <p className="text-[11px] text-red-100">
                  Las pantallas de los inocentes están saturadas con estática cibernética. Tus asesinos tienen vía libre para actuar.
                </p>
              </div>
            )}

            <button
              onClick={onTriggerHackerPulse}
              disabled={player.hackerUsed || isGlitchActive}
              className="w-full py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-30 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-950/40 transition"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              {player.hackerUsed
                ? 'Interferencia Ya Utilizada'
                : 'Activar Pulso EMP (3 Minutos de Bloqueo)'}
            </button>

            {/* Shadow Allies Syndicate */}
            {shadowAllies.length > 0 && (
              <div className="p-3 rounded-2xl bg-rose-950/30 border border-rose-900/40 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 text-rose-300 font-bold uppercase tracking-wider text-[10px]">
                  <Users className="w-3.5 h-3.5" />
                  Tus Aliados de las Sombras:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {shadowAllies.map((a) => (
                    <span
                      key={a.id}
                      className="px-2 py-0.5 rounded-lg bg-rose-900/50 border border-rose-700/60 text-rose-200 text-[11px] font-semibold"
                    >
                      {a.name} ({a.role})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 6b. EL CAMALEÓN */}
        {player.role === 'El Camaleón' && (
          <div className="space-y-3 text-xs">
            <p className="text-neutral-300">
              Una vez por partida, suplanta la identidad de un jugador eliminado en el chat general para emitir coartadas falsas, acusaciones o sembrar desinformación.
            </p>

            {player.camaleonUsed ? (
              <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-600/40 text-purple-200">
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <CheckCircle2 className="w-4 h-4 text-purple-400" />
                  Suplantación Emitida
                </div>
                <p className="text-[11px]">
                  Tu mensaje encubierto ya fue difundido en el chat de la fiesta bajo el nombre de una víctima.
                </p>
              </div>
            ) : deadPlayers.length === 0 ? (
              <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-neutral-400 space-y-1">
                <div className="font-bold text-neutral-300 flex items-center gap-1.5">
                  <Ghost className="w-4 h-4 text-purple-400" />
                  Esperando la Primera Baja
                </div>
                <p className="text-[11px]">
                  Aún no hay almas fallecidas en la fiesta. Podrás suplantar la voz de la víctima en el chat en cuanto ocurra el primer asesinato.
                </p>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-purple-950/50 border border-purple-600/50 text-purple-200 space-y-2">
                <div className="font-bold flex items-center gap-1.5 text-purple-300">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  Habilidad Lista para Usarse en el Chat
                </div>
                <p className="text-[11px] text-purple-100">
                  Ve a la pestaña <strong>Chat</strong> y pulsa el botón morado <strong>"Suplantar Identidad"</strong> para hablar fingiendo ser:{' '}
                  <strong className="text-white">
                    {deadPlayers.map((d) => d.name).join(', ')}
                  </strong>
                  .
                </p>
              </div>
            )}

            {/* Shadow Allies Syndicate */}
            {shadowAllies.length > 0 && (
              <div className="p-3 rounded-2xl bg-rose-950/30 border border-rose-900/40 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 text-rose-300 font-bold uppercase tracking-wider text-[10px]">
                  <Users className="w-3.5 h-3.5" />
                  Tus Aliados de las Sombras:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {shadowAllies.map((a) => (
                    <span
                      key={a.id}
                      className="px-2 py-0.5 rounded-lg bg-rose-900/50 border border-rose-700/60 text-rose-200 text-[11px] font-semibold"
                    >
                      {a.name} ({a.role})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 7. EL PERIODISTA */}
        {player.role === 'El Periodista' && (
          <div className="space-y-3 text-xs">
            <p className="text-neutral-300">
              Formula teorías sobre las identidades secretas de otros invitados. Si aciertas su rol exacto, recibirás una recompensa de +15 monedas del Seven:
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
