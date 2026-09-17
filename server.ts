import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import {
  Player,
  GameState,
  RoleType,
  TeamType,
  ChatMessage,
  MurderReport,
  PartyEvent,
  SHOP_ITEMS
} from './src/types';
import { generateFivePlayerMissions } from './src/data/missions';
import { PARTY_EVENTS, getRandomEvent } from './src/data/events';

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize GoogleGenAI client (lazy / safe)
let genAI: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  if (!genAI && process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAI;
}

// In-Memory Room Store for real-time online play
interface RoomData {
  state: GameState;
  players: Player[];
  chatMessages: ChatMessage[];
}

const rooms = new Map<string, RoomData>();

// Role catalog map
const ROLE_TEAMS: Record<RoleType, TeamType> = {
  'Inocente': 'Fiesta (Inocentes)',
  'El Fotógrafo': 'Fiesta (Inocentes)',
  'El Chismoso': 'Fiesta (Inocentes)',
  'El Médico Forense': 'Fiesta (Inocentes)',
  'El Escolta': 'Fiesta (Inocentes)',
  'El Periodista': 'Fiesta (Inocentes)',
  'Asesino': 'Sombras (Asesinos)',
  'El Camaleón': 'Sombras (Asesinos)',
  'El Cómplice / Hacker': 'Sombras (Asesinos)',
  'El Paranoico': 'Caos (Independiente)',
  'Alma Atormentadora': 'Caos (Independiente)',
};

function balanceRolesForPlayers(playerCount: number): RoleType[] {
  const roles: RoleType[] = [];
  if (playerCount <= 3) {
    roles.push('Asesino', 'El Fotógrafo', 'Inocente');
  } else if (playerCount === 4) {
    roles.push('Asesino', 'El Fotógrafo', 'El Escolta', 'El Paranoico');
  } else if (playerCount === 5) {
    roles.push('Asesino', 'El Fotógrafo', 'El Escolta', 'El Médico Forense', 'El Chismoso');
  } else if (playerCount === 6) {
    roles.push('Asesino', 'El Fotógrafo', 'El Escolta', 'El Médico Forense', 'El Chismoso', 'El Camaleón');
  } else if (playerCount === 7) {
    roles.push('Asesino', 'El Fotógrafo', 'El Escolta', 'El Médico Forense', 'El Chismoso', 'El Camaleón', 'El Paranoico');
  } else if (playerCount === 8) {
    roles.push('Asesino', 'El Fotógrafo', 'El Escolta', 'El Médico Forense', 'El Chismoso', 'El Camaleón', 'El Cómplice / Hacker', 'El Paranoico');
  } else if (playerCount === 9) {
    roles.push('Asesino', 'El Fotógrafo', 'El Escolta', 'El Médico Forense', 'El Chismoso', 'El Camaleón', 'El Cómplice / Hacker', 'El Paranoico', 'El Periodista');
  } else {
    // 10+
    roles.push(
      'Asesino',
      'Asesino',
      'El Fotógrafo',
      'El Escolta',
      'El Médico Forense',
      'El Chismoso',
      'El Camaleón',
      'El Cómplice / Hacker',
      'El Paranoico',
      'El Periodista'
    );
    while (roles.length < playerCount) {
      roles.push('Inocente');
    }
  }

  // Shuffle roles
  return roles.sort(() => Math.random() - 0.5);
}

// AI Group Chat Intervention: listens to group chatter and intervenes with dynamic wit
async function triggerAIGroupIntervention(room: RoomData, senderName: string, messageContent: string) {
  const recentMessages = room.chatMessages
    .filter((m) => !m.receiverId)
    .slice(-6)
    .map((m) => `${m.senderName}: "${m.content}"`)
    .join('\n');

  const alivePlayers = room.players.filter((p) => p.isAlive).map((p) => p.name).join(', ');
  const deadPlayers = room.players.filter((p) => !p.isAlive).map((p) => p.name).join(', ');
  const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  let aiIntervention = '';

  try {
    const ai = getAI();
    if (ai) {
      const prompt = `Eres el ÁRBITRO IA y Maestro de la Fiesta en un juego presencial de deducción social en tiempo real entre amigos.
Estás monitoreando el chat grupal que todos ven en sus celulares mientras se miran a la cara en la casa.
Jugadores vivos: ${alivePlayers}.
Almas caídas: ${deadPlayers || 'ninguno aún'}.
Anécdotas y lore del grupo:
- Luisda el migajero (siempre deja migajas).
- León el mandilón.
- Uriel la rata (tacaño con comida/tragos).
- El caballo en Día de Muertos.
- Jackie siempre comiendo en la uni.
- Meta AI el metiche.
- En Cancún todo cambió para bien.
- Todos odian a Majo y a la canción Superestrella.
- Los Hidrotemplados es la gran banda mítica.
- Siempre comen pizza o van al Seven.
- La frase secreta de muerte es: "¿Qué traes allí?".

Historial reciente del chat general:
${recentMessages}

${senderName} acaba de decir: "${messageContent}".

Tu labor: Intervén como Árbitro IA con un comentario muy breve (máximo 1 o 2 oraciones concisas), picante, hilarante o misterioso.
- Si te preguntaron o mencionaron (@IA o @árbitro), responde directamente con tono de juez supremo de la fiesta.
- Si se están acusando o debatiendo, siembra cizaña, señala una contradicción, advierte de las sombras o cita una anécdota.
- NUNCA reveles explícitamente quién es el asesino.`;

      const resp = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      if (resp.text) {
        aiIntervention = resp.text.trim();
      }
    }
  } catch (err) {
    console.error('AI group chat intervention error:', err);
  }

  // Fallback pool in case Gemini is unavailable or rate-limited
  if (!aiIntervention) {
    const fallbacks = [
      `👀 Árbitro IA: Mientras ${senderName} escribe eso, alguien en la sala está mirando fijamente la rebanada de pizza con cara de sospechoso.`,
      `⚖️ Intervención del Árbitro: Cuidado con las coartadas... recuerden que las migajas de Luisda nunca mienten.`,
      `🕵️ El Árbitro IA toma nota: Mucho bla bla bla en el chat, pero nadie ha explicado qué hacían cerca de la cocina hace 5 minutos.`,
      `🍕 Árbitro IA: No confíen en quien hable demasiado del Seven mientras susurra frases al oído de los demás.`,
      `⚠️ Alerta del Árbitro: Detecto altos niveles de cinismo en las palabras de ${senderName}. ¿Quién se atreve a mirarle a los ojos?`,
      `🎵 Árbitro IA: Esta discusión suena peor que la canción Superestrella. Más misiones y menos teatro.`,
      `👁️ Susurro del Árbitro: Alguien en este grupo tiene las manos frías y el corazón de asesino. Sigan debatiendo...`,
      `🐎 Árbitro IA: Si esa teoría fuera un caballo en Día de Muertos, ya se habría escapado trotando. Sean más observadores.`,
      `🥤 Árbitro IA: ${senderName} habla mucho para alguien que no ha completado ni una sola misión de fiesta.`,
      `🚨 Árbitro IA: El reloj sigue corriendo. Las sombras se preparan para preguntar otra vez "¿Qué traes allí?".`
    ];
    aiIntervention = fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  room.chatMessages.push({
    id: 'ai_interv_' + Date.now(),
    senderId: 'system',
    senderName: 'ÁRBITRO IA',
    receiverId: null,
    content: aiIntervention,
    timestamp: timeString,
    isSystem: true,
    isAI: true,
  });
}

// Background Game Loop (1-second tick)
setInterval(() => {
  rooms.forEach((room, roomCode) => {
    if (room.state.status !== 'playing' || room.state.winner) return;

    // Phase timer
    room.state.phaseTimeRemaining -= 1;
    if (room.state.phaseTimeRemaining <= 0) {
      room.state.phase = room.state.phase === 'Día' ? 'Noche' : 'Día';
      room.state.phaseTimeRemaining = room.state.phaseDuration;

      // Reveal pending photographer investigations
      room.players.forEach((p) => {
        if (p.investigationPending) {
          const target = room.players.find((t) => t.id === p.investigationPending?.targetId);
          const isHostile = target?.team === 'Sombras (Asesinos)';
          room.chatMessages.push({
            id: 'rev_' + Date.now(),
            senderId: 'system',
            senderName: 'ÁRBITRO IA (LAB FOTO)',
            receiverId: p.id,
            content: `📷 REVELADO DE FOTO: El análisis espectral de ${target?.name} arroja que pertenece a: ${
              isHostile ? '🔴 SOMBRAS (Bando Asesino)' : '🟢 FIESTA (Inocente)'
            }.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isAI: true,
          });
          p.investigationPending = undefined;
        }
      });
    }

    // Emergency timer
    if (room.state.isEmergencyActive) {
      room.state.emergencyTimeRemaining -= 1;
      if (room.state.emergencyTimeRemaining <= 0) {
        room.state.isEmergencyActive = false;
      }
    }

    // Event timer
    if (room.state.eventTimeRemaining > 0) {
      room.state.eventTimeRemaining -= 1;
      if (room.state.eventTimeRemaining <= 0) {
        room.state.activeEvent = null;
      }
    }

    // Check Win Conditions
    const alivePlayers = room.players.filter((p) => p.isAlive);
    const aliveAssassins = alivePlayers.filter((p) => p.team === 'Sombras (Asesinos)');
    const aliveInnocents = alivePlayers.filter((p) => p.team === 'Fiesta (Inocentes)');

    if (aliveAssassins.length === 0 && alivePlayers.length > 0) {
      room.state.winner = 'Fiesta (Inocentes)';
      room.state.status = 'ended';
    } else if (aliveAssassins.length >= aliveInnocents.length && aliveAssassins.length > 0) {
      room.state.winner = 'Sombras (Asesinos)';
      room.state.status = 'ended';
    } else if (room.state.collectiveTaskProgress >= 100) {
      room.state.winner = 'Fiesta (Inocentes)';
      room.state.status = 'ended';
    }
  });
}, 1000);

// API: Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', serverTime: Date.now() });
});

// API: Create Room
app.post('/api/rooms/create', (req, res) => {
  const { hostName, avatar, pin, roomCode } = req.body;
  const code = (roomCode || 'FIESTA-' + Math.floor(10 + Math.random() * 90)).toUpperCase().trim();

  const hostPlayer: Player = {
    id: 'p_' + Date.now(),
    name: hostName || 'Anfitrión',
    avatar: avatar || '👑',
    pin: pin || '1234',
    victimCode: Math.floor(1000 + Math.random() * 9000).toString(),
    role: 'Inocente',
    team: 'Fiesta (Inocentes)',
    isAlive: true,
    isHost: true,
    emergencyCallsLeft: 1,
    coins: 10,
    missions: generateFivePlayerMissions(false),
    chismosoUsed: false,
    camaleonUsed: false,
    hackerUsed: false,
    periodistaTheories: [],
  };

  const initialGameState: GameState = {
    roomCode: code,
    status: 'lobby',
    hostPlayerId: hostPlayer.id,
    phase: 'Día',
    phaseTimeRemaining: 900,
    phaseDuration: 900,
    isGameStarted: false,
    isEmergencyActive: false,
    emergencyTimeRemaining: 180,
    emergencyCallerName: null,
    activeEvent: null,
    eventTimeRemaining: 0,
    votes: {},
    meetingRound: 1,
    hackerGlitchActiveUntil: null,
    murderHistory: [],
    collectiveTaskProgress: 0,
    aiNarratorLogs: [
      {
        id: 'log_0',
        text: `Sala ${code} creada. Esperando a que el grupo de amigos se una en el lobby.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'lore',
      },
    ],
    winner: null,
  };

  rooms.set(code, {
    state: initialGameState,
    players: [hostPlayer],
    chatMessages: [
      {
        id: 'msg_0',
        senderId: 'system',
        senderName: 'ÁRBITRO IA',
        receiverId: null,
        content: `🎉 ¡Bienvenidos a la Sala ${code}! Entren con el código o escaneen el QR desde su celular.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isSystem: true,
        isAI: true,
      },
    ],
  });

  res.json({
    roomCode: code,
    player: hostPlayer,
    roomState: initialGameState,
    players: [hostPlayer],
  });
});

// API: Join Room
app.post('/api/rooms/join', (req, res) => {
  const { roomCode, name, avatar, pin } = req.body;
  const code = (roomCode || '').toUpperCase().trim();
  const room = rooms.get(code);

  if (!room) {
    return res.status(404).json({ error: 'La sala especificada no existe.' });
  }

  // Check if player already exists by name (re-login)
  const existingPlayer = room.players.find(
    (p) => p.name.toLowerCase().trim() === (name || '').toLowerCase().trim()
  );

  if (existingPlayer) {
    if (existingPlayer.pin === pin) {
      return res.json({
        roomCode: code,
        player: existingPlayer,
        roomState: room.state,
        players: room.players,
      });
    } else {
      return res.status(403).json({ error: 'PIN incorrecto para este jugador.' });
    }
  }

  if (room.state.status === 'playing') {
    return res.status(400).json({ error: 'La partida ya comenzó. No se admiten nuevos jugadores.' });
  }

  const newPlayer: Player = {
    id: 'p_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    name: name.trim(),
    avatar: avatar || '👤',
    pin: pin || '1234',
    victimCode: Math.floor(1000 + Math.random() * 9000).toString(),
    role: 'Inocente',
    team: 'Fiesta (Inocentes)',
    isAlive: true,
    isHost: false,
    emergencyCallsLeft: 1,
    coins: 10,
    missions: generateFivePlayerMissions(false),
    chismosoUsed: false,
    camaleonUsed: false,
    hackerUsed: false,
    periodistaTheories: [],
  };

  room.players.push(newPlayer);

  room.chatMessages.push({
    id: 'msg_join_' + Date.now(),
    senderId: 'system',
    senderName: 'LOBBY',
    receiverId: null,
    content: `${newPlayer.name} se ha unido al lobby de la fiesta.`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    isSystem: true,
  });

  res.json({
    roomCode: code,
    player: newPlayer,
    roomState: room.state,
    players: room.players,
  });
});

// API: Get Room State (polling)
app.get('/api/rooms/:roomCode', (req, res) => {
  const code = req.params.roomCode.toUpperCase().trim();
  const room = rooms.get(code);

  if (!room) {
    return res.status(404).json({ error: 'Sala no encontrada' });
  }

  res.json({
    roomState: room.state,
    players: room.players,
    chatMessages: room.chatMessages,
  });
});

// API: Start Game (Host only)
app.post('/api/rooms/:roomCode/start', async (req, res) => {
  const code = req.params.roomCode.toUpperCase().trim();
  const { playerId } = req.body;
  const room = rooms.get(code);

  if (!room) return res.status(404).json({ error: 'Sala no encontrada' });
  if (room.state.hostPlayerId !== playerId) {
    return res.status(403).json({ error: 'Solo el anfitrión de la sala puede iniciar la partida.' });
  }
  if (room.players.length < 3) {
    return res.status(400).json({ error: 'Se necesitan al menos 3 jugadores para jugar.' });
  }

  // Distribute balanced roles
  const assignedRoles = balanceRolesForPlayers(room.players.length);
  room.players = room.players.map((p, idx) => {
    const role = assignedRoles[idx];
    const team = ROLE_TEAMS[role] || 'Fiesta (Inocentes)';
    return {
      ...p,
      role,
      team,
      isAlive: true,
      emergencyCallsLeft: 1,
      coins: p.coins ?? 10,
      hasBulletproofVest: false,
      doubleVotesAvailable: 0,
      victimCode: Math.floor(1000 + Math.random() * 9000).toString(),
      missions: generateFivePlayerMissions(false),
      chismosoUsed: false,
      camaleonUsed: false,
      hackerUsed: false,
      periodistaTheories: [],
    };
  });

  room.state.status = 'playing';
  room.state.isGameStarted = true;
  room.state.phase = 'Día';
  room.state.phaseTimeRemaining = room.state.phaseDuration;
  room.state.meetingRound = 1;
  room.state.collectiveTaskProgress = 0;
  room.state.activeEvent = PARTY_EVENTS[0];
  room.state.eventTimeRemaining = 60;

  // Generate AI Opening with Gemini
  const playerNames = room.players.map((p) => p.name).join(', ');
  let aiOpening = '¡La fiesta ha comenzado! Recuerden: para asesinar, susurren al oído "¿Qué traes allí?". Completen sus misiones orgánicas.';

  try {
    const ai = getAI();
    if (ai) {
      const prompt = `Eres el Árbitro IA y Maestro del Crimen de un juego presencial de deducción social en una fiesta real entre amigos.
Los jugadores presentes son: ${playerNames}.
El grupo tiene estas anécdotas y bromas internas:
- Luisda es el migajero.
- León es mandilón.
- Uriel es una rata.
- Una pareja que se conoció por un caballo en Día de Muertos.
- Jackie siempre está comiendo en la uni.
- Meta AI es un metiche.
- En Cancún todo cambió para bien.
- Todos odiamos a Majo y a Superestrella.
- Los Hidrotemplados es un gran grupo musical.
- Siempre comen pizza o van al Seven.
- La frase de muerte pactada que susurran los asesinos es: "¿Qué traes allí?".

Escribe una proclama de inicio breve, divertida, picante y con mucho misterio (máximo 3 párrafos cortos) dando la bienvenida a la fiesta e incitando a la sospecha social.`;

      const aiResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      if (aiResponse.text) {
        aiOpening = aiResponse.text.trim();
      }
    }
  } catch (err) {
    console.error('Gemini AI Opening error:', err);
  }

  room.state.aiNarratorLogs.push({
    id: 'proclama_' + Date.now(),
    text: aiOpening,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    type: 'lore',
  });

  room.chatMessages.push({
    id: 'chat_proclama_' + Date.now(),
    senderId: 'system',
    senderName: 'ÁRBITRO IA',
    receiverId: null,
    content: aiOpening,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    isSystem: true,
    isAI: true,
  });

  res.json({
    roomState: room.state,
    players: room.players,
    chatMessages: room.chatMessages,
  });
});

// API: Game Action Handler
app.post('/api/rooms/:roomCode/action', async (req, res) => {
  const code = req.params.roomCode.toUpperCase().trim();
  const { playerId, actionType, payload } = req.body;
  const room = rooms.get(code);

  if (!room) return res.status(404).json({ error: 'Sala no encontrada' });

  const actingPlayer = room.players.find((p) => p.id === playerId);
  if (!actingPlayer) return res.status(404).json({ error: 'Jugador no encontrado en la sala' });

  // 1. Action: Kill
  if (actionType === 'kill') {
    const { victimCode } = payload;
    const victim = room.players.find((p) => p.victimCode === victimCode && p.isAlive);

    if (!victim) {
      return res.status(400).json({ error: 'Código incorrecto o jugador ya fallecido.' });
    }
    if (victim.id === actingPlayer.id) {
      return res.status(400).json({ error: 'No puedes atentar contra ti mismo.' });
    }

    // Escolta check
    if (
      victim.protectedByEscoltaUntil &&
      victim.protectedByEscoltaUntil > Date.now() &&
      victim.hasEscoltaSpokenFaceToFace
    ) {
      return res.status(400).json({
        error: '¡Ataque frustrado! El objetivo estaba protegido físicamente por un Escolta presencial.',
      });
    }

    // Bulletproof Vest check
    if (victim.hasBulletproofVest) {
      victim.hasBulletproofVest = false;
      room.chatMessages.push({
        id: 'vest_chat_' + Date.now(),
        senderId: 'system',
        senderName: 'ÁRBITRO IA',
        receiverId: null,
        content: `🛡️ ¡SALVADO POR EL CHALECO! ${victim.name} escuchó el susurro mortal en su oído, pero su Chaleco Antibalas absorbió el ataque. El chaleco ha quedado destruido, ¡pero sigue con vida!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isSystem: true,
        isAI: true,
      });

      return res.status(400).json({
        error: `¡Ataque frustrado! ${victim.name} llevaba equipado un Chaleco Antibalas del mercado negro. El chaleco amortiguó el golpe y tu víctima sobrevivió.`,
      });
    }

    // Reward killer with coins for elimination
    actingPlayer.coins = (actingPlayer.coins || 0) + 10;

    // Turn victim into Alma Atormentadora with 5 ghost missions
    victim.isAlive = false;
    victim.role = 'Alma Atormentadora';
    victim.team = 'Caos (Independiente)';
    victim.missions = generateFivePlayerMissions(true);

    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Generate AI Forensic Clue using Gemini
    let aiClue = 'Se detectaron migajas cerca del cuerpo y olor a pizza del Seven.';
    try {
      const ai = getAI();
      if (ai) {
        const prompt = `Genera una pista forense abstracta y críptica para el Médico Forense en una fiesta.
La víctima fue: ${victim.name}.
El atacante le susurró discretamente: "¿Qué traes allí?".
Incluye sutiles referencias humorísticas al grupo (migajas de Luisda, mandilón como León, la rata Uriel, el caballo de Día de Muertos, comida en la uni como Jackie, Meta AI el metiche, Cancún, Los Hidrotemplados, pizza o el Seven).
La pista no debe revelar directamente el nombre del asesino, sino un detalle sensorial o de vestimenta/comportamiento. Máximo 2 oraciones.`;

        const resp = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
        });
        if (resp.text) aiClue = resp.text.trim();
      }
    } catch (err) {
      console.error('AI clue error:', err);
    }

    const report: MurderReport = {
      id: 'rep_' + Date.now(),
      victimId: victim.id,
      victimName: victim.name,
      timestamp: timeString,
      clue: aiClue,
    };

    room.state.murderHistory.unshift(report);

    room.chatMessages.push({
      id: 'rep_chat_' + Date.now(),
      senderId: 'system',
      senderName: 'ÁRBITRO IA',
      receiverId: null,
      content: `💀 ¡CRIMEN EN LA FIESTA! ${victim.name} ha caído tras escuchar la frase prohibida "¿Qué traes allí?". Ahora vaga como Alma Atormentadora.`,
      timestamp: timeString,
      isSystem: true,
      isAI: true,
    });

    return res.json({ success: true, message: `Eliminación de ${victim.name} confirmada.`, report });
  }

  // 2. Action: Emergency Buzzer
  if (actionType === 'emergency') {
    if (room.state.hackerGlitchActiveUntil && room.state.hackerGlitchActiveUntil > Date.now()) {
      return res.status(400).json({
        error: '¡Sirena bloqueada! Hay una interferencia electromagnética activa en la fiesta.',
      });
    }

    if (!actingPlayer.isAlive || actingPlayer.emergencyCallsLeft <= 0) {
      return res.status(400).json({ error: 'No tienes llamadas de asamblea disponibles.' });
    }

    actingPlayer.emergencyCallsLeft -= 1;
    room.state.isEmergencyActive = true;
    room.state.emergencyCallerName = actingPlayer.name;
    room.state.emergencyTimeRemaining = 180;
    room.state.votes = {};

    room.chatMessages.push({
      id: 'emg_' + Date.now(),
      senderId: 'system',
      senderName: 'SIRENA DE ASAMBLEA',
      receiverId: null,
      content: `🚨 ¡${actingPlayer.name} ha convocado a todos al centro de la sala para una asamblea de emergencia! Tienen 3 minutos de debate.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSystem: true,
    });

    return res.json({ success: true });
  }

  // 3. Action: Cast Vote
  if (actionType === 'vote') {
    const { targetId } = payload;
    if (!actingPlayer.isAlive) {
      return res.status(403).json({ error: 'Las almas no pueden votar en la asamblea.' });
    }

    room.state.votes[actingPlayer.id] = targetId;
    return res.json({ success: true, votes: room.state.votes });
  }

  // 4. Action: Conclude Emergency
  if (actionType === 'conclude_meeting') {
    const { expelledPlayerId } = payload;
    let announcement = 'La asamblea ha concluido sin expulsar a ningún sospechoso.';

    if (expelledPlayerId && expelledPlayerId !== 'skip') {
      const expelled = room.players.find((p) => p.id === expelledPlayerId);
      if (expelled) {
        // Paranoico solo victory check in rounds 1 or 2
        if (expelled.role === 'El Paranoico' && room.state.meetingRound <= 2) {
          room.state.winner = 'Caos (Independiente)';
          room.state.isEmergencyActive = false;
          room.chatMessages.push({
            id: 'paranoico_win_' + Date.now(),
            senderId: 'system',
            senderName: 'ÁRBITRO IA',
            receiverId: null,
            content: `🏆 ¡VICTORIA ABSOLUTA DE EL PARANOICO! ${expelled.name} manipuló a la asamblea para ser expulsado en la ronda ${room.state.meetingRound}. ¡Ha ganado la partida en solitario!`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isSystem: true,
            isAI: true,
          });
          return res.json({ success: true, winner: 'Caos (Independiente)' });
        }

        // Convert expelled to Alma Atormentadora with 5 ghost missions without revealing role
        expelled.isAlive = false;
        expelled.role = 'Alma Atormentadora';
        expelled.team = 'Caos (Independiente)';
        expelled.missions = generateFivePlayerMissions(true);

        announcement = `Por votación de la fiesta, ${expelled.name} ha sido expulsado al reino de las sombras. Su rol exacto permanece en el anonimato.`;
      }
    }

    room.chatMessages.push({
      id: 'meet_res_' + Date.now(),
      senderId: 'system',
      senderName: 'ASAMBLEA',
      receiverId: null,
      content: announcement,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSystem: true,
    });

    room.state.isEmergencyActive = false;
    room.state.meetingRound += 1;
    room.state.votes = {};

    return res.json({ success: true });
  }

  // 5. Action: Advance Mission
  if (actionType === 'advance_mission') {
    const { missionId } = payload;
    const mission = actingPlayer.missions.find((m) => m.id === missionId);

    if (mission && !mission.completed) {
      mission.currentCount += 1;
      mission.completed = mission.currentCount >= mission.targetCount;
      mission.progress = Math.min(100, Math.round((mission.currentCount / mission.targetCount) * 100));

      let earnedCoins = 0;
      if (mission.completed) {
        earnedCoins = mission.rewardCoins || 10;
        actingPlayer.coins = (actingPlayer.coins || 0) + earnedCoins;

        room.chatMessages.push({
          id: 'reward_whisper_' + Date.now(),
          senderId: 'system',
          senderName: 'ÁRBITRO IA',
          receiverId: actingPlayer.id,
          content: `🪙 ¡Misión completada: "${mission.title}"! Has recibido +${earnedCoins} monedas del Seven. Saldo total: 🪙 ${actingPlayer.coins}.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isSystem: true,
          isAI: true,
        });
      }

      // Increase collective task bar
      room.state.collectiveTaskProgress = Math.min(100, room.state.collectiveTaskProgress + 5);

      return res.json({
        success: true,
        mission,
        earnedCoins,
        newBalance: actingPlayer.coins,
        collectiveProgress: room.state.collectiveTaskProgress
      });
    }
    return res.status(400).json({ error: 'Misión no encontrada o ya completada.' });
  }

  // 6. Action: Hacker EMP
  if (actionType === 'hacker_emp') {
    actingPlayer.hackerUsed = true;
    room.state.hackerGlitchActiveUntil = Date.now() + 180 * 1000;

    room.chatMessages.push({
      id: 'emp_msg_' + Date.now(),
      senderId: 'system',
      senderName: 'ALERTA TÉCNICA',
      receiverId: null,
      content: `⚡ ¡PULSO ELECTROMAGNÉTICO! Los dispositivos móviles de los inocentes han sufrido una sobrecarga de estática durante 3 minutos.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSystem: true,
    });

    return res.json({ success: true });
  }

  // 7. Action: Send Chat Message
  if (actionType === 'send_message') {
    const { receiverId, content, asChameleon } = payload;
    const deadPlayer = room.players.find((p) => !p.isAlive);
    const disguise = asChameleon && deadPlayer ? deadPlayer.name : undefined;

    const newMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      senderId: actingPlayer.id,
      senderName: actingPlayer.name,
      receiverId: receiverId || null,
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isChameleon: asChameleon,
      chameleonDisguiseName: disguise,
    };

    room.chatMessages.push(newMsg);
    if (asChameleon) actingPlayer.camaleonUsed = true;

    // AI group intervention check: when talking in general chat, the AI arbitrator listens and responds
    if (!receiverId) {
      const lower = (content || '').toLowerCase();
      const mentionsAI =
        lower.includes('@ia') ||
        lower.includes('@árbitro') ||
        lower.includes('@arbitro') ||
        lower.includes('arbitro') ||
        lower.includes('árbitro') ||
        lower.includes('quién es') ||
        lower.includes('quien es');

      const isSpicy =
        lower.includes('asesin') ||
        lower.includes('culpable') ||
        lower.includes('migaja') ||
        lower.includes('luisda') ||
        lower.includes('león') ||
        lower.includes('leon') ||
        lower.includes('mandil') ||
        lower.includes('uriel') ||
        lower.includes('rata') ||
        lower.includes('jackie') ||
        lower.includes('pizza') ||
        lower.includes('seven') ||
        lower.includes('cancún') ||
        lower.includes('cancun') ||
        lower.includes('caballo') ||
        lower.includes('majo') ||
        lower.includes('superestrella') ||
        lower.includes('sospech') ||
        lower.includes('traes allí');

      const recentAIMessages = room.chatMessages.slice(-5).filter((m) => m.isAI).length;

      if (mentionsAI || isSpicy || recentAIMessages === 0) {
        setTimeout(() => {
          triggerAIGroupIntervention(room, actingPlayer.name, content).catch((e) =>
            console.error('Intervention error:', e)
          );
        }, 1200);
      }
    }

    return res.json({ success: true, message: newMsg });
  }

  // 8. Action: Fotógrafo Snap
  if (actionType === 'fotografo_snap') {
    const { targetId } = payload;
    actingPlayer.investigationPending = {
      targetId,
      revealTime: Date.now() + 900 * 1000,
    };
    return res.json({ success: true });
  }

  // 9. Action: Escolta Protect
  if (actionType === 'escolta_protect') {
    const { targetId } = payload;
    const target = room.players.find((p) => p.id === targetId);
    if (target) {
      target.protectedByEscoltaUntil = Date.now() + 900 * 1000;
      target.hasEscoltaSpokenFaceToFace = false;
    }
    return res.json({ success: true });
  }

  // 10. Action: Confirm Escolta Face-to-Face
  if (actionType === 'escolta_confirm_face_to_face') {
    room.players.forEach((p) => {
      if (p.protectedByEscoltaUntil && p.protectedByEscoltaUntil > Date.now()) {
        p.hasEscoltaSpokenFaceToFace = true;
      }
    });
    return res.json({ success: true });
  }

  // 11. Action: AI Chat with Game Master
  if (actionType === 'ai_consult') {
    const { query } = payload;
    let reply = 'Las sombras susurran en la cocina... nadie está a salvo.';

    try {
      const ai = getAI();
      if (ai) {
        const prompt = `Eres el Árbitro IA y Dios de la Fiesta en un juego en vivo con este grupo de amigos:
Luisda (el migajero), León (el mandilón), Uriel (la rata), Jackie (siempre comiendo en la uni), Meta AI (el metiche). Todos odian a Majo y a Superestrella, aman a Los Hidrotemplados, comen pizza y van al Seven.
El jugador ${actingPlayer.name} te pregunta: "${query}".
Responde con tono de oráculo sarcástico, misterioso y divertido, dando pistas sutiles sin arruinar roles explícitos. Máximo 2 frases.`;

        const resp = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
        });
        if (resp.text) reply = resp.text.trim();
      }
    } catch (err) {
      console.error('AI consult error:', err);
    }

    return res.json({ success: true, reply });
  }

  // 12. Action: Buy Item from Black Market / Shop
  if (actionType === 'buy_item') {
    const { itemId } = payload;
    const item = SHOP_ITEMS.find((it) => it.id === itemId);
    if (!item) {
      return res.status(404).json({ error: 'Artículo no encontrado en el catálogo del mercado negro.' });
    }

    if ((actingPlayer.coins || 0) < item.cost) {
      return res.status(400).json({ error: `Monedas insuficientes. Necesitas ${item.cost} monedas del Seven.` });
    }

    actingPlayer.coins = (actingPlayer.coins || 0) - item.cost;
    let buyMessage = `Has adquirido ${item.name}.`;

    if (itemId === 'vest') {
      actingPlayer.hasBulletproofVest = true;
      buyMessage = '¡Chaleco Antibalas equipado! Estás blindado contra tu siguiente intento de asesinato.';
    } else if (itemId === 'double_vote') {
      actingPlayer.doubleVotesAvailable = (actingPlayer.doubleVotesAvailable || 0) + 1;
      buyMessage = '¡Voto Doble adquirido! Tu voto valdrá x2 en la próxima asamblea de emergencia.';
    } else if (itemId === 'seven_snack') {
      room.state.collectiveTaskProgress = Math.min(100, room.state.collectiveTaskProgress + 8);
      buyMessage = '¡Ronda de botana comprada! La meta colectiva de la fiesta subió +8%.';
      room.chatMessages.push({
        id: 'snack_chat_' + Date.now(),
        senderId: 'system',
        senderName: 'MERCADO DEL SEVEN',
        receiverId: null,
        content: `🍕 ¡RONDA DE PIZZA! ${actingPlayer.name} compró botanas para toda la fiesta. La meta colectiva de los inocentes subió un +8%.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isSystem: true,
      });
    } else if (itemId === 'emp_jam') {
      room.state.hackerGlitchActiveUntil = Date.now() + 90 * 1000;
      buyMessage = 'Interferidor activado: sirenas de asamblea bloqueadas por 90 segundos.';
      room.chatMessages.push({
        id: 'jam_chat_' + Date.now(),
        senderId: 'system',
        senderName: 'MERCADO DEL SEVEN',
        receiverId: null,
        content: `📡 ¡INTERFERENCIA TOTAL! ${actingPlayer.name} activó un inhibidor de señal. Las sirenas de asamblea están bloqueadas durante 90 segundos.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isSystem: true,
      });
    } else if (itemId === 'bribe_clue') {
      let clueText = 'El asesino se ha acercado a la mesa de snacks y suele mirar disimuladamente a los lados.';
      try {
        const ai = getAI();
        if (ai) {
          const killers = room.players.filter((p) => p.role === 'Asesino');
          const killerNames = killers.map((k) => k.name).join(' o ');
          const prompt = `Eres el Forense Clandestino de la fiesta. Un jugador (${actingPlayer.name}) te pagó un soborno de 10 monedas.
Los asesinos son: ${killerNames || 'alguien entre las sombras'}.
Genera una pista sutil, picante y confidencial sobre los hábitos o vestimenta de los asesinos en la reunión (sin decir el nombre directamente, pero dando un indicio como su cercanía a la cocina, su postura, si comió pizza o si habló de Cancún o del Seven). Máximo 1 o 2 oraciones breves.`;
          const resp = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: prompt,
          });
          if (resp.text) clueText = resp.text.trim();
        }
      } catch (e) {
        console.error('Clue generation error:', e);
      }

      actingPlayer.purchasedClues = actingPlayer.purchasedClues || [];
      actingPlayer.purchasedClues.push(clueText);

      room.chatMessages.push({
        id: 'clue_whisper_' + Date.now(),
        senderId: 'system',
        senderName: 'FORENSE CLANDESTINO',
        receiverId: actingPlayer.id,
        content: `🕵️ PISTA CONFIDENCIAL POR SOBORNO: "${clueText}"`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isSystem: true,
        isAI: true,
      });

      buyMessage = `Pista obtenida y enviada a tus susurros privados: "${clueText}"`;
    }

    return res.json({
      success: true,
      message: buyMessage,
      player: actingPlayer,
      roomState: room.state,
    });
  }

  // 13. Action: Transfer Coins to Friend
  if (actionType === 'transfer_coins') {
    const { targetPlayerId, amount } = payload;
    const numAmount = parseInt(amount) || 0;
    if (numAmount <= 0) {
      return res.status(400).json({ error: 'La cantidad debe ser mayor a 0.' });
    }
    if ((actingPlayer.coins || 0) < numAmount) {
      return res.status(400).json({ error: 'No cuentas con suficientes monedas para transferir.' });
    }

    const targetPlayer = room.players.find((p) => p.id === targetPlayerId);
    if (!targetPlayer) {
      return res.status(404).json({ error: 'Jugador destinatario no encontrado.' });
    }

    actingPlayer.coins = (actingPlayer.coins || 0) - numAmount;
    targetPlayer.coins = (targetPlayer.coins || 0) + numAmount;

    room.chatMessages.push({
      id: 'tx_chat_' + Date.now(),
      senderId: 'system',
      senderName: 'BANCO DEL SEVEN',
      receiverId: null,
      content: `💸 ¡TRANSFERENCIA! ${actingPlayer.name} le transfirió ${numAmount} monedas a ${targetPlayer.name}. ¿Soborno o pago de pizza?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSystem: true,
    });

    return res.json({
      success: true,
      senderBalance: actingPlayer.coins,
      message: `Has transferido ${numAmount} monedas a ${targetPlayer.name}.`,
    });
  }

  res.status(400).json({ error: 'Acción no reconocida' });
});

// Vite middleware & Static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
