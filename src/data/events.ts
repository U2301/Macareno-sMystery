import { PartyEvent } from '../types';

export const PARTY_EVENTS: PartyEvent[] = [
  {
    id: 'ev_1',
    title: 'Brote de Sarampión Repentino',
    description: '¡Cuarentena inmediata en la fiesta!',
    instructions: 'Todos los jugadores deben alejarse al menos 3 metros de cualquier otra persona durante 60 segundos. Si alguien se acerca, márcalo en el chat.',
    durationSeconds: 60,
    type: 'urgente',
  },
  {
    id: 'ev_2',
    title: 'El Antojo Colectivo del Seven',
    description: '¡Nostalgia de medianoche en el 7-Eleven!',
    instructions: 'Cada persona debe decirle a la persona más cercana exactamente qué botana o bebida compraría en el Seven en este momento.',
    durationSeconds: 45,
    type: 'divertido',
  },
  {
    id: 'ev_3',
    title: 'Himno de Los Hidrotemplados',
    description: '¡Respeto a la mejor banda!',
    instructions: 'Todos los presentes deben poner su mano en el pecho durante 30 segundos en honor a Los Hidrotemplados. Si suena música, no se puede cambiar.',
    durationSeconds: 45,
    type: 'divertido',
  },
  {
    id: 'ev_4',
    title: 'Alerta Meta AI: El Metiche Supremo',
    description: '¡La inteligencia artificial interrumpe la reunión!',
    instructions: 'Durante este minuto, antes de hablar, debes empezar tu frase diciendo obligatoriamente: "Oye, según Meta AI..."',
    durationSeconds: 60,
    type: 'caotico',
  },
  {
    id: 'ev_5',
    title: 'Cancún Vibes: En Cancún Todo Cambió',
    description: '¡Momento de fraternidad absoluta!',
    instructions: 'Todos los vivos deben levantar su vaso o botella y hacer un brindis grupal pronunciando juntos: "¡Por Cancún!".',
    durationSeconds: 45,
    type: 'divertido',
  },
  {
    id: 'ev_6',
    title: 'El Silencio de Superestrella',
    description: '¡Prohibido hablar de lo que odiamos!',
    instructions: 'Silencio sepulcral durante 45 segundos. Nadie puede emitir palabras habladas. Solo miradas y gestos de sospecha.',
    durationSeconds: 45,
    type: 'urgente',
  }
];

export function getRandomEvent(): PartyEvent {
  const randomIndex = Math.floor(Math.random() * PARTY_EVENTS.length);
  return PARTY_EVENTS[randomIndex];
}
