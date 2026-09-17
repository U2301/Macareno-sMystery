import { PlayerMission } from '../types';

export const FRIEND_LORE_MISSIONS: Omit<PlayerMission, 'id' | 'progress' | 'currentCount' | 'completed'>[] = [
  {
    title: 'El Rastro del Migajero',
    description: 'En honor a Luisda, encuentra o deja discretamente una pequeña migaja o servilleta doblada cerca de un jugador sin que te descubra.',
    type: 'lore',
    targetCount: 1,
  },
  {
    title: 'El Mandado de León',
    description: 'Cumple la orden de León el mandilón: ofrécete a servirle un vaso o alcanzarle algo a otro jugador diciendo "a tus órdenes".',
    type: 'lore',
    targetCount: 1,
  },
  {
    title: 'La Trampa de Queso',
    description: 'En honor a Uriel la rata, consigue que alguien te comparta comida o un trago usando una táctica de tacaño o engaño amistoso.',
    type: 'lore',
    targetCount: 1,
  },
  {
    title: 'La Leyenda del Caballo de Día de Muertos',
    description: 'Menciona sutilmente la palabra "caballo" o "Día de Muertos" en una conversación con dos personas sin que sospechen del juego.',
    type: 'lore',
    targetCount: 2,
  },
  {
    title: 'El Snack de Jackie en la Uni',
    description: 'Come o mastica disimuladamente algo de botana o pizza mientras escuchas una teoría de alguien con cara de máximo interés.',
    type: 'lore',
    targetCount: 1,
  },
  {
    title: 'Meta AI el Metiche',
    description: 'Interrumpe una conversación ajena diciendo de repente: "Según Meta AI..." o respondiendo algo que nadie te preguntó.',
    type: 'lore',
    targetCount: 2,
  },
  {
    title: 'Nostalgia de Cancún',
    description: 'Haz un brindis con al menos 2 jugadores diciendo la frase: "Brindo porque en Cancún todo cambió para bien".',
    type: 'lore',
    targetCount: 1,
  },
  {
    title: 'La Mirada Anti-Majo',
    description: 'Haz contacto visual cómplice con otro jugador y haz un gesto de desaprobación compartida como cuando todos odiamos a Majo.',
    type: 'lore',
    targetCount: 2,
  },
  {
    title: 'El Boicot a Superestrella',
    description: 'Critica o haz un comentario sarcástico sobre la canción "Superestrella" si suena, o convence a alguien de que esa canción es pésima.',
    type: 'lore',
    targetCount: 1,
  },
  {
    title: 'Himno de Los Hidrotemplados',
    description: 'Tararea una melodía o pregúntale a alguien si ha escuchado a la legendaria banda "Los Hidrotemplados".',
    type: 'lore',
    targetCount: 1,
  },
  {
    title: 'La Rebanada Sagrada de Pizza',
    description: 'Come o reparte una porción de pizza con alguien, debatiendo apasionadamente si la orilla de la pizza se come o se deja.',
    type: 'lore',
    targetCount: 1,
  },
  {
    title: 'Antojo Inminente del Seven',
    description: 'Propón en voz alta: "Deberíamos ir al Seven al rato por algo", y logra que al menos una persona te dé la razón.',
    type: 'lore',
    targetCount: 1,
  },
  {
    title: 'Duelo de Miradas Silencioso',
    description: 'Sostén la mirada con cualquier persona de la fiesta durante 6 segundos seguidos sin reírte ni pestañear en exceso.',
    type: 'social',
    targetCount: 2,
  },
  {
    title: 'El Chisme Inocente',
    description: 'Acércate a un jugador y susúrrale un secreto totalmente inventado pero inofensivo sobre la comida o la música.',
    type: 'social',
    targetCount: 1,
  },
  {
    title: 'El Brindis Cruzado',
    description: 'Choca tu vaso o botella con dos personas diferentes en un lapso menor a 2 minutos.',
    type: 'social',
    targetCount: 2,
  },
  {
    title: 'Verificación de Coartada',
    description: 'Pregúntale casualmente a alguien: "¿Dónde estabas hace 10 minutos?" fingiendo que es pura curiosidad.',
    type: 'social',
    targetCount: 2,
  },
  {
    title: 'El Halago Sospechoso',
    description: 'Dile un cumplido sincero o exagerado a otro jugador sobre su ropa o su vibra en la fiesta.',
    type: 'social',
    targetCount: 2,
  },
  {
    title: 'Intercambio de Objetos',
    description: 'Pide prestado un objeto pequeño (encendedor, servilleta, vaso vacío) y devuélvelo 1 minuto después con cara misteriosa.',
    type: 'desafio',
    targetCount: 1,
  },
  {
    title: 'La Postura de Alerta',
    description: 'Quédate apoyado contra una pared con los brazos cruzados observando la sala durante 30 segundos continuos.',
    type: 'desafio',
    targetCount: 1,
  }
];

export const GHOST_LORE_MISSIONS: Omit<PlayerMission, 'id' | 'progress' | 'currentCount' | 'completed'>[] = [
  {
    title: 'Aparición del Migajero Espectral',
    description: 'Como alma en pena de Luisda, quédate parado detrás de un jugador vivo a menos de un metro sin emitir sonido durante 20 segundos.',
    type: 'fantasma',
    targetCount: 1,
  },
  {
    title: 'La Maldición del Caballo',
    description: 'Pásale por al lado a dos jugadores vivos haciendo un leve relincho o chasquido con la lengua.',
    type: 'fantasma',
    targetCount: 2,
  },
  {
    title: 'El Fantasma Metiche de Meta AI',
    description: 'Ponte a escuchar el chisme de una conversación de vivos y asiente lentamente con la cabeza.',
    type: 'fantasma',
    targetCount: 2,
  },
  {
    title: 'Espíritu Hambriento de Pizza',
    description: 'Señala fijamente la comida o la pizza de un jugador vivo hasta que se sienta observado.',
    type: 'fantasma',
    targetCount: 1,
  },
  {
    title: 'Sombra del Seven-Eleven',
    description: 'Toca el hombro de un vivo y señálale la puerta de salida diciendo con la mirada que vaya al Seven.',
    type: 'fantasma',
    targetCount: 1,
  }
];

// Generates 5 unique missions per player
export function generateFivePlayerMissions(isGhost: boolean): PlayerMission[] {
  const sourcePool = isGhost ? GHOST_LORE_MISSIONS : FRIEND_LORE_MISSIONS;
  const shuffled = [...sourcePool].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 5);

  return selected.map((m, idx) => ({
    id: `mis_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
    title: m.title,
    description: m.description,
    type: m.type,
    progress: 0,
    targetCount: m.targetCount,
    currentCount: 0,
    completed: false,
  }));
}
