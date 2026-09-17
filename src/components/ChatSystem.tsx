import React, { useState } from 'react';
import { Send, Users, Lock, MessageSquare, Sparkles, Ghost, ShieldAlert, Bot, HelpCircle } from 'lucide-react';
import { ChatMessage, Player } from '../types';

interface ChatSystemProps {
  currentPlayer: Player;
  players: Player[];
  messages: ChatMessage[];
  onSendMessage: (receiverId: string | null, content: string, asChameleon?: boolean) => void;
}

export const ChatSystem: React.FC<ChatSystemProps> = ({
  currentPlayer,
  players,
  messages,
  onSendMessage,
}) => {
  // activeChannel: 'general' or player.id for 1-to-1
  const [activeChannel, setActiveChannel] = useState<'general' | string>('general');
  const [inputContent, setInputContent] = useState('');
  const [isChameleonDisguiseActive, setIsChameleonDisguiseActive] = useState(false);

  // Dead players who can be impersonated by El Camaleón
  const deadPlayers = players.filter((p) => !p.isAlive);
  const isChameleon = currentPlayer.role === 'El Camaleón' && !currentPlayer.camaleonUsed && deadPlayers.length > 0;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputContent.trim()) return;

    const targetReceiver = activeChannel === 'general' ? null : activeChannel;
    onSendMessage(targetReceiver, inputContent.trim(), isChameleonDisguiseActive);
    setInputContent('');
    setIsChameleonDisguiseActive(false);
  };

  const handleInsertMention = (text: string) => {
    setInputContent((prev) => {
      if (prev.includes(text)) return prev;
      return `${text} ${prev}`.trim();
    });
  };

  // Filter messages for current view
  const visibleMessages = messages.filter((m) => {
    if (activeChannel === 'general') {
      return m.receiverId === null;
    } else {
      // 1-on-1 between currentPlayer and activeChannel target
      return (
        (m.senderId === currentPlayer.id && m.receiverId === activeChannel) ||
        (m.senderId === activeChannel && m.receiverId === currentPlayer.id)
      );
    }
  });

  const activeTargetPlayer = players.find((p) => p.id === activeChannel);

  return (
    <div className="bg-neutral-900/80 border border-neutral-800 rounded-3xl overflow-hidden flex flex-col h-[530px]">
      {/* Channels Nav */}
      <div className="p-3 border-b border-neutral-800 bg-neutral-950/70 flex items-center gap-2 overflow-x-auto scrollbar-none">
        <button
          id="chat-tab-general"
          onClick={() => setActiveChannel('general')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
            activeChannel === 'general'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          General Fiesta
        </button>

        <span className="text-neutral-700 text-xs">|</span>

        {players
          .filter((p) => p.id !== currentPlayer.id)
          .map((p) => {
            const hasUnread = messages.some(
              (m) => m.senderId === p.id && m.receiverId === currentPlayer.id
            );
            return (
              <button
                key={p.id}
                id={`chat-tab-${p.id}`}
                onClick={() => setActiveChannel(p.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
                  activeChannel === p.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                }`}
              >
                <Lock className="w-3 h-3 text-indigo-400" />
                <span>{p.name}</span>
                {!p.isAlive && <span className="text-[10px] text-red-400 font-mono">✝</span>}
              </button>
            );
          })}
      </div>

      {/* Active Channel Header */}
      <div className="px-4 py-2 bg-neutral-950/40 border-b border-neutral-800/60 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-neutral-300 font-medium">
          {activeChannel === 'general' ? (
            <>
              <Users className="w-4 h-4 text-rose-400" />
              <span>Canal Público de la Fiesta</span>
              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-800 text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                IA activa
              </span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4 text-indigo-400" />
              <span>
                Chat Privado 1 a 1 con <strong>{activeTargetPlayer?.name}</strong>
              </span>
              {!activeTargetPlayer?.isAlive && (
                <span className="px-2 py-0.5 rounded-full bg-red-950 text-red-400 text-[10px] border border-red-800">
                  Jugador Eliminado
                </span>
              )}
            </>
          )}
        </div>

        {/* Camaleón Special Ability Toggle in General Chat */}
        {activeChannel === 'general' && isChameleon && (
          <button
            onClick={() => setIsChameleonDisguiseActive(!isChameleonDisguiseActive)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 border transition ${
              isChameleonDisguiseActive
                ? 'bg-purple-600 border-purple-400 text-white shadow-sm'
                : 'bg-purple-950/40 border-purple-800/60 text-purple-300 hover:bg-purple-900/40'
            }`}
          >
            <Sparkles className="w-3 h-3 text-purple-300" />
            {isChameleonDisguiseActive ? 'Suplantación Activa' : 'Suplantar Identidad'}
          </button>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3">
        {visibleMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-neutral-500 text-xs">
            <MessageSquare className="w-8 h-8 mb-2 opacity-40" />
            <p>No hay mensajes en esta conversación aún.</p>
            <p className="text-[11px] text-neutral-600 mt-1">
              {activeChannel === 'general'
                ? 'Habla con tus amigos o invoca al @Árbitro IA para que intervenga en la partida.'
                : 'Pacta una alianza secreta o pregunta coartadas en privado.'}
            </p>
          </div>
        ) : (
          visibleMessages.map((msg) => {
            const isMe = msg.senderId === currentPlayer.id && !msg.isChameleon;
            const isSystem = msg.isSystem && !msg.isAI;
            const isAIArbitrator = msg.isAI || msg.senderName === 'ÁRBITRO IA';

            if (isSystem) {
              return (
                <div
                  key={msg.id}
                  className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800/80 text-center text-xs text-neutral-300 my-2"
                >
                  <span className="font-semibold text-rose-400 mr-1.5">[SISTEMA]</span>
                  {msg.content}
                </div>
              );
            }

            // Special AI Arbitrator message bubble
            if (isAIArbitrator) {
              return (
                <div
                  key={msg.id}
                  className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-100 my-2 shadow-lg shadow-amber-950/20"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="flex items-center gap-1.5 text-xs font-black text-amber-300 tracking-wide uppercase">
                      <Bot className="w-3.5 h-3.5 text-amber-400" />
                      Árbitro IA
                    </span>
                    <span className="text-[10px] text-amber-400/70 font-mono">{msg.timestamp}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-amber-50">{msg.content}</p>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 mb-0.5 px-1">
                  {msg.isChameleon ? (
                    <span className="text-purple-400 font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      {msg.chameleonDisguiseName || 'Identidad Oculta'}
                    </span>
                  ) : (
                    <span className="font-semibold">{msg.senderName}</span>
                  )}
                  <span>{msg.timestamp}</span>
                </div>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                    isMe
                      ? 'bg-rose-600 text-white rounded-tr-sm'
                      : msg.isChameleon
                      ? 'bg-purple-950/80 text-purple-100 border border-purple-700/60 rounded-tl-sm'
                      : 'bg-neutral-800 text-neutral-200 border border-neutral-700/60 rounded-tl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick AI mention bar in general chat */}
      {activeChannel === 'general' && (
        <div className="px-3 py-1.5 bg-neutral-950/90 border-t border-neutral-800/60 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-[11px]">
          <span className="text-neutral-500 text-[10px] uppercase font-bold shrink-0">Invocar:</span>
          <button
            type="button"
            onClick={() => handleInsertMention('@Árbitro IA')}
            className="px-2 py-0.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-semibold flex items-center gap-1 shrink-0 transition"
          >
            <Bot className="w-3 h-3" />
            @Árbitro IA
          </button>
          <button
            type="button"
            onClick={() => handleInsertMention('¿Quién es el más sospechoso?')}
            className="px-2 py-0.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 shrink-0 transition"
          >
            ¿Quién es sospechoso?
          </button>
          <button
            type="button"
            onClick={() => handleInsertMention('¿Quién comió pizza en el Seven?')}
            className="px-2 py-0.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 shrink-0 transition"
          >
            🍕 Pizza en el Seven
          </button>
        </div>
      )}

      {/* Input bar */}
      <form onSubmit={handleSend} className="p-3 bg-neutral-950/80 border-t border-neutral-800 flex gap-2">
        <input
          type="text"
          placeholder={
            isChameleonDisguiseActive
              ? `Escribiendo como ${deadPlayers[0]?.name} (Suplantación)...`
              : activeChannel === 'general'
              ? 'Escribe a la fiesta o menciona @Árbitro IA...'
              : `Susurro privado a ${activeTargetPlayer?.name}...`
          }
          value={inputContent}
          onChange={(e) => setInputContent(e.target.value)}
          className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 outline-none focus:border-rose-500"
        />
        <button
          type="submit"
          disabled={!inputContent.trim()}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          Enviar
        </button>
      </form>
    </div>
  );
};
