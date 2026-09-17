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

// High-entropy Fisher-Yates shuffle algorithm
function fisherYatesShuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

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
    // 10+ jugadores: 2 Asesinos + roles clave de investigación y engaño
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

  // Double-pass Fisher-Yates shuffle for zero positional bias
  return fisherYatesShuffle(fisherYatesShuffle(roles));
}

// AI Group Chat Intervention: listens to group chatter and intervenes with dynamic wit
async function triggerAIGroupIntervention(room: RoomData, senderName: string, messageContent: string) {
  const recentMessages = room.chatMessages
    .filter((m) => !m.receiverId)
    .slice(-6)
    .map((m) => `${m.senderName}: "${m.content}"`)
    .join('\n');

  const aliveList = room.players.filter((p) => p.isAlive).map((p) => p.name);
  const deadList = room.players.filter((p) => !p.isAlive).map((p) => p.name);
  const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  let aiIntervention = '';

  try {
    const ai = getAI();
    if (ai) {
      const prompt = `Eres el ÁRBITRO IA y Maestro del Juego de deducción social de una fiesta real entre amigos en una casa.
Estás monitoreando el chat general de la aplicación.

DATOS VERIFICADOS DE LA SALA (HECHOS REALES, NO INVENTAR NADA FUERA DE AQUÍ):
- Jugadores vivos en la sala: ${aliveList.join(', ') || 'ninguno'}.
- Jugadores fallecidos / almas de ultratumba: ${deadList.join(', ') || 'ninguno aún'}.
- Historial de asesinatos registrados: ${room.state.murderHistory.map((m) => `${m.victimName} (pista: "${m.clue}")`).join(', ') || 'aún no hay muertes'}.
- Fase actual: ${room.state.phase} | Ronda de asamblea: ${room.state.meetingRound} | Progreso de fiesta: ${room.state.collectiveTaskProgress}%.

DIRECTIVAS ESTRICTAS CONTRA ALUCINACIONES (OBLIGATORIO):
1. PROHIBIDO INVENTAR NOMBRES: Únicamente puedes mencionar a los jugadores reales presentes en la lista anterior (${aliveList.join(', ')}${deadList.length ? ', ' + deadList.join(', ') : ''}). Jamás inventes personas ficticias.
2. PROHIBIDO INVENTAR ROLES O REGLAS: Los únicos roles existentes en este juego son: Inocente, Asesino, El Fotógrafo, El Chismoso, El Médico Forense, El Escolta, El Camaleón, El Cómplice / Hacker, El Paranoico, El Periodista, Alma Atormentadora. No menciones roles de otros juegos como Vidente, Bruja, Lobo, etc.
3. ESTRICTA VERDAD SOBRE ESTADO DE JUGADORES: No digas que alguien murió o fue eliminado a menos que figure explícitamente en la lista de fallecidos. Si están vivos, trátalos como vivos en la fiesta.
4. SI NO TIENES INFORMACIÓN O TE PIDEN DELATAR: Di que el Árbitro observa pero no revela identidades secretas para no arruinar la fiesta, o que no tienes pruebas forenses aún.
5. LONGITUD: Máximo 1 o 2 oraciones concisas, picantes y afiladas.

Anécdotas del grupo para sazonar el comentario:
- Luisda el migajero (siempre deja migajas de comida).
- León el mandilón.
- Uriel la rata (tacaño con comida/tragos).
- El caballo en Día de Muertos.
- Jackie siempre comiendo en la uni.
- Meta AI el metiche.
- En Cancún todo cambió para bien.
- Todos odian a Majo y a la canción Superestrella.
- Los Hidrotemplados es la banda mítica.
- Siempre comen pizza o van al Seven.
- La frase secreta para asesinar susurrada al oído es: "¿Qué traes allí?".

Historial reciente del chat general:
${recentMessages}

${senderName} acaba de escribir: "${messageContent}".

Tu intervención breve como Árbitro IA:`;

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
    }

    // Reveal pending photographer investigations when countdown expires or on phase change
    room.players.forEach((p) => {
      if (p.investigationPending && (Date.now() >= p.investigationPending.revealTime || room.state.phaseTimeRemaining <= 0)) {
        const target = room.players.find((t) => t.id === p.investigationPending?.targetId);
        if (target) {
          const isHostile = target.team === 'Sombras (Asesinos)';
          const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const photoRecord = {
            id: 'photo_' + Date.now(),
            targetId: target.id,
            targetName: target.name,
            team: target.team,
            isHostile,
            revealedAt: timeStr,
          };
          p.revealedPhotos = p.revealedPhotos || [];
          p.revealedPhotos.unshift(photoRecord);

          room.chatMessages.push({
            id: 'rev_' + Date.now(),
            senderId: 'system',
            senderName: 'ÁRBITRO IA (LAB FOTO)',
            receiverId: p.id,
            content: `📷 REVELADO DE FOTO: El análisis espectral de "${target.name}" indica que su bando es: ${
              isHostile ? '🔴 SOMBRAS (Bando Asesino)' : '🟢 FIESTA (Inocente)'
            }. El informe confidencial ha quedado guardado en tu Credencial de Rol.`,
            timestamp: timeStr,
            isAI: true,
            isSystem: true,
          });
        }
        p.investigationPending = undefined;
      }
    });

    // Emergency timer
    if (room.state.isEmergencyActive) {
      room.state.emergencyTimeRemaining -= 1;
      if (room.state.emergencyTimeRemaining <= 0) {
        room.state.isEmergencyActive = false;
      }
    }

    // Event timer & Periodic automatic event system
    if (room.state.status === 'playing' && !room.state.isEmergencyActive) {
      if (room.state.eventTimeRemaining > 0) {
        room.state.eventTimeRemaining -= 1;
        if (room.state.eventTimeRemaining <= 0) {
          room.state.activeEvent = null;
          // Cooldown for next random event: between 75 and 135 seconds (~1.5 - 2.2 min)
          room.state.nextEventCooldown = 75 + Math.floor(Math.random() * 60);
        }
      } else {
        if (room.state.nextEventCooldown === undefined) {
          room.state.nextEventCooldown = 60;
        }
        room.state.nextEventCooldown -= 1;
        if (room.state.nextEventCooldown <= 0) {
          const nextEv = getRandomEvent(room.state.activeEvent?.id);
          room.state.activeEvent = nextEv;
          room.state.eventTimeRemaining = nextEv.durationSeconds;
          room.state.nextEventCooldown = 80 + Math.floor(Math.random() * 60);

          room.chatMessages.push({
            id: 'auto_ev_' + Date.now(),
            senderId: 'system',
            senderName: 'ÁRBITRO IA',
            receiverId: null,
            content: `🚨 ¡EVENTO DE FIESTA: "${nextEv.title}"! ${nextEv.instructions} (Tiempo: ${nextEv.durationSeconds}s).`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isSystem: true,
          });
        }
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
  // Also shuffle player order mapping so host doesn't always receive the first role
  const playerShuffleOrder = fisherYatesShuffle(room.players.map((_, i) => i));

  room.players = room.players.map((p, originalIdx) => {
    const randomizedRoleIdx = playerShuffleOrder.indexOf(originalIdx);
    const role = assignedRoles[randomizedRoleIdx];
    const team = ROLE_TEAMS[role] || 'Fiesta (Inocentes)';
    const isShadow = team === 'Sombras (Asesinos)';
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
      missions: generateFivePlayerMissions(false, isShadow),
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
  const initialEvent = getRandomEvent();
  room.state.activeEvent = initialEvent;
  room.state.eventTimeRemaining = initialEvent.durationSeconds;
  room.state.nextEventCooldown = 90;

  // Generate AI Opening with Gemini
  const playerNames = room.players.map((p) => p.name).join(', ');
  let aiOpening = '¡La fiesta ha comenzado! Recuerden: para asesinar, susurren al oído "¿Qué traes allí?". Completen sus misiones orgánicas.';

  try {
    const ai = getAI();
    if (ai) {
      const prompt = `Eres el Árbitro IA y Maestro del Crimen de un juego presencial de deducción social en una fiesta real entre amigos.
Los únicos jugadores presentes en esta sala son exactamente: ${playerNames}. (PROHIBIDO INVENTAR OTROS NOMBRES).
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
        earnedCoins = mission.rewardCoins || (mission.type === 'sombra' ? 12 : 10);
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

        // Si fue una misión del bando de las Sombras, genera una pista sospechosa pública que ayuda a los buenos
        if (mission.type === 'sombra') {
          room.chatMessages.push({
            id: 'shadow_trace_' + Date.now(),
            senderId: 'system',
            senderName: 'ÁRBITRO FORENSE',
            receiverId: null,
            content: `👁️ RASTRO DETECTADO: Alguien de las Sombras ejecutó una acción sospechosa en la casa (Completó encubierto: "${mission.title}"). ¡Observen con atención quién estuvo actuando de forma extraña recientemente!`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isSystem: true,
            isAI: true,
          });
        }
      }

      // Increase collective task bar (las misiones de sombra ayudan a los buenos con +7%)
      const progressBonus = mission.type === 'sombra' ? 7 : 5;
      room.state.collectiveTaskProgress = Math.min(100, room.state.collectiveTaskProgress + progressBonus);

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

    room.chatMessages.push({
      id: 'emp_hacker_' + Date.now(),
      senderId: 'system',
      senderName: 'ÁRBITRO IA (HACKER)',
      receiverId: actingPlayer.id,
      content: `⚡ ¡PULSO ACTIVADO CON ÉXITO! Has inhabilitado los teléfonos de todos los inocentes y congelado las sirenas de emergencia por 3 minutos (180s). Tus aliados de las Sombras tienen vía libre.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSystem: true,
      isAI: true,
    });

    return res.json({
      success: true,
      glitchUntil: room.state.hackerGlitchActiveUntil,
      player: actingPlayer,
      roomState: room.state,
    });
  }

  // 7. Action: Send Chat Message
  if (actionType === 'send_message') {
    const { receiverId, content, asChameleon, targetDisguiseName } = payload;
    const deadPlayers = room.players.filter((p) => !p.isAlive);
    let disguise: string | undefined = undefined;

    if (asChameleon && deadPlayers.length > 0) {
      const chosen = targetDisguiseName
        ? deadPlayers.find((p) => p.name.toLowerCase() === targetDisguiseName.toLowerCase())
        : deadPlayers[0];
      disguise = chosen ? chosen.name : deadPlayers[0].name;
      actingPlayer.camaleonUsed = true;

      room.chatMessages.push({
        id: 'camaleon_notice_' + Date.now(),
        senderId: 'system',
        senderName: 'ÁRBITRO IA (CAMALEÓN)',
        receiverId: actingPlayer.id,
        content: `🎭 SUPLANTACIÓN EMITIDA: Tu mensaje fue enviado en el chat general haciéndote pasar por "${disguise}". Todos los demás jugadores ven el mensaje como si fuera enviado por esa alma.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isSystem: true,
        isAI: true,
      });
    }

    const newMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      senderId: actingPlayer.id,
      senderName: disguise || actingPlayer.name,
      receiverId: receiverId || null,
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isChameleon: !!disguise,
      chameleonDisguiseName: disguise,
    };

    room.chatMessages.push(newMsg);

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

    return res.json({ success: true, message: newMsg, player: actingPlayer });
  }

  // 8. Action: Fotógrafo Snap
  if (actionType === 'fotografo_snap') {
    const { targetId } = payload;
    const target = room.players.find((p) => p.id === targetId);
    if (!target) {
      return res.status(404).json({ error: 'Objetivo fotográfico no encontrado en la sala.' });
    }

    const revealTime = Date.now() + 45 * 1000; // 45 seconds developing time
    actingPlayer.investigationPending = {
      targetId,
      revealTime,
    };

    room.chatMessages.push({
      id: 'foto_snap_' + Date.now(),
      senderId: 'system',
      senderName: 'ÁRBITRO IA (LAB FOTO)',
      receiverId: actingPlayer.id,
      content: `📷 FOTO CAPTURADA: Has enfocado a "${target.name}". El revelado químico en cuarto oscuro tardará 45 segundos. Recibirás el dictamen del bando aquí y en tu Credencial de Rol.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSystem: true,
      isAI: true,
    });

    return res.json({ success: true, player: actingPlayer });
  }

  // 8b. Action: Fotógrafo Accelerate Reveal
  if (actionType === 'fotografo_accelerate') {
    if (!actingPlayer.investigationPending) {
      return res.status(400).json({ error: 'No tienes ningún negativo en proceso de revelado.' });
    }
    const target = room.players.find((t) => t.id === actingPlayer.investigationPending?.targetId);
    if (target) {
      const isHostile = target.team === 'Sombras (Asesinos)';
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const photoRecord = {
        id: 'photo_' + Date.now(),
        targetId: target.id,
        targetName: target.name,
        team: target.team,
        isHostile,
        revealedAt: timeStr,
      };
      actingPlayer.revealedPhotos = actingPlayer.revealedPhotos || [];
      actingPlayer.revealedPhotos.unshift(photoRecord);

      room.chatMessages.push({
        id: 'rev_accel_' + Date.now(),
        senderId: 'system',
        senderName: 'ÁRBITRO IA (LAB FOTO)',
        receiverId: actingPlayer.id,
        content: `📷 REVELADO INSTANTÁNEO: El dictamen químico de "${target.name}" arroja que pertenece a: ${
          isHostile ? '🔴 SOMBRAS (Bando Asesino)' : '🟢 FIESTA (Inocente)'
        }. El informe ha quedado archivado en tu Credencial de Rol.`,
        timestamp: timeStr,
        isAI: true,
        isSystem: true,
      });
    }
    actingPlayer.investigationPending = undefined;
    return res.json({ success: true, player: actingPlayer });
  }

  // 8c. Action: Chismoso Compare
  if (actionType === 'chismoso_compare') {
    const { p1Id, p2Id } = payload;
    if (actingPlayer.chismosoUsed) {
      return res.status(400).json({ error: 'Ya has utilizado tu habilidad única de cotejo del Chismoso.' });
    }

    const p1 = room.players.find((p) => p.id === p1Id);
    const p2 = room.players.find((p) => p.id === p2Id);

    if (!p1 || !p2 || p1.id === p2.id) {
      return res.status(400).json({ error: 'Debes seleccionar dos jugadores distintos válidos de la fiesta.' });
    }

    const sameTeam = p1.team === p2.team;
    actingPlayer.chismosoUsed = true;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const verdict = sameTeam
      ? `¡COINCIDENCIA DE BANDO! ${p1.name} y ${p2.name} comparten exactamente la misma alineación de bando.`
      : `¡BANDOS OPUESTOS! ${p1.name} y ${p2.name} pertenecen a bandos rivales (uno es Fiesta y el otro Sombras).`;

    const report = {
      id: 'chism_' + Date.now(),
      p1Id: p1.id,
      p1Name: p1.name,
      p2Id: p2.id,
      p2Name: p2.name,
      sameTeam,
      verdict,
      timestamp: timeStr,
    };
    actingPlayer.chismosoReport = report;

    room.chatMessages.push({
      id: 'chism_msg_' + Date.now(),
      senderId: 'system',
      senderName: 'ÁRBITRO IA (CHISMOSO)',
      receiverId: actingPlayer.id,
      content: `🤫 REPORTE CONFIDENCIAL DEL CHISMOSO: Has cotejado a ${p1.name} y ${p2.name}. Dictamen: ${verdict}`,
      timestamp: timeStr,
      isSystem: true,
      isAI: true,
    });

    return res.json({
      success: true,
      chismosoReport: report,
      player: actingPlayer,
    });
  }

  // 9. Action: Escolta Protect
  if (actionType === 'escolta_protect') {
    const { targetId } = payload;
    const target = room.players.find((p) => p.id === targetId);
    if (!target) {
      return res.status(404).json({ error: 'Jugador objetivo no encontrado.' });
    }

    const protectDuration = 900 * 1000;
    target.protectedByEscoltaUntil = Date.now() + protectDuration;
    target.hasEscoltaSpokenFaceToFace = false;

    actingPlayer.escoltaTargetId = targetId;
    actingPlayer.escoltaProtectedUntil = target.protectedByEscoltaUntil;
    actingPlayer.hasEscoltaSpokenFaceToFace = false;

    room.chatMessages.push({
      id: 'esc_msg_' + Date.now(),
      senderId: 'system',
      senderName: 'ÁRBITRO IA (ESCOLTA)',
      receiverId: actingPlayer.id,
      content: `🛡️ OBJETIVO DE ESCOLTA ASIGNADO: Has seleccionado proteger a ${target.name}. Debes acercarte a hablarle en persona en la fiesta y presionar "Confirmar Charla Cara a Cara" para blindarlo contra asesinatos.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSystem: true,
      isAI: true,
    });

    return res.json({ success: true, player: actingPlayer });
  }

  // 10. Action: Confirm Escolta Face-to-Face
  if (actionType === 'escolta_confirm_face_to_face') {
    actingPlayer.hasEscoltaSpokenFaceToFace = true;
    if (actingPlayer.escoltaTargetId) {
      const target = room.players.find((p) => p.id === actingPlayer.escoltaTargetId);
      if (target) {
        target.hasEscoltaSpokenFaceToFace = true;
      }
    }

    room.chatMessages.push({
      id: 'esc_conf_' + Date.now(),
      senderId: 'system',
      senderName: 'ÁRBITRO IA (ESCOLTA)',
      receiverId: actingPlayer.id,
      content: `🛡️ ¡BLINDAJE FÍSICO CONFIRMADO! Has activado la protección física presencial. Si un asesino intenta acorralar a tu objetivo, el atentado será frustrado.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSystem: true,
      isAI: true,
    });

    return res.json({ success: true, player: actingPlayer });
  }

  // 10b. Action: Periodista Investigate Theory
  if (actionType === 'periodista_investigate') {
    const { targetId, guessedRole } = payload;
    const target = room.players.find((p) => p.id === targetId);
    if (!target) {
      return res.status(404).json({ error: 'Jugador no encontrado.' });
    }

    const isCorrect = target.role === guessedRole;
    actingPlayer.periodistaTheories = actingPlayer.periodistaTheories || [];
    actingPlayer.periodistaTheories.push({ targetId, guessedRole, isCorrect });

    if (isCorrect) {
      actingPlayer.coins = (actingPlayer.coins || 0) + 15;
    }

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    room.chatMessages.push({
      id: 'per_msg_' + Date.now(),
      senderId: 'system',
      senderName: 'ÁRBITRO IA (PRENSA)',
      receiverId: actingPlayer.id,
      content: isCorrect
        ? `📰 ¡EXCLUSIVA PERIODÍSTICA VERIFICADA! Tu teoría era 100% acertada: "${target.name}" es efectivamente "${guessedRole}". Has ganado +15 monedas del Seven por tu primicia.`
        : `📰 TEORÍA REFUTADA: Tu investigación sobre "${target.name}" concluye que NO es "${guessedRole}". Busca otra pista.`,
      timestamp: timeStr,
      isSystem: true,
      isAI: true,
    });

    return res.json({
      success: true,
      isCorrect,
      player: actingPlayer,
    });
  }

  // 11. Action: AI Chat with Game Master
  if (actionType === 'ai_consult') {
    const { query } = payload;
    let reply = 'Las sombras susurran en la cocina... observa a quienes te rodean con atención.';

    try {
      const ai = getAI();
      if (ai) {
        const aliveNames = room.players.filter((p) => p.isAlive).map((p) => p.name).join(', ');
        const deadNames = room.players.filter((p) => !p.isAlive).map((p) => p.name).join(', ');
        const prompt = `Eres el Árbitro IA oficial del juego presencial de deducción social de fiesta entre amigos.
El jugador ${actingPlayer.name} (rol: ${actingPlayer.role}, equipo: ${actingPlayer.team}) te consulta en privado: "${query}".

DATOS REALES Y VERIFICADOS DE ESTA PARTIDA (PROHIBIDO INVENTAR NADA FUERA DE ESTOS HECHOS):
- Jugadores vivos en la sala: ${aliveNames || 'ninguno'}.
- Jugadores fallecidos / almas: ${deadNames || 'ninguno aún'}.
- Fase actual: ${room.state.phase} | Progreso de la fiesta: ${room.state.collectiveTaskProgress}%.
- Reglas oficiales del juego: Los asesinos eliminan susurrando al oído "¿Qué traes allí?". Cada jugador tiene 1 llamada de asamblea de emergencia. Las misiones dan monedas y llenan la meta colectiva para que ganen los inocentes. En la tienda del Seven se compran chalecos, votos dobles y sobornos.

DIRECTIVAS ESTRICTAS CONTRA ALUCINACIONES:
1. NUNCA inventes nombres de personas que no estén en la lista de jugadores reales.
2. NUNCA inventes reglas, poderes fantásticos o roles que no pertenezcan al juego.
3. Si el jugador te pide que le reveles quién es el asesino o los roles secretos de otros, niégate ingeniosamente explicando que el Árbitro cuida la integridad del juego.
4. Si no sabes algo o te preguntan sobre hechos no ocurridos, responde con ingenio diciendo que el Árbitro solo juzga con evidencia real y no con inventos.
5. Mantén la respuesta en máximo 2 oraciones breves, sarcásticas, misteriosas y divertidas.`;

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
