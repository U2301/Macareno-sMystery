import { RoleType, TeamType } from '../types';

export interface RoleDefinition {
  type: RoleType;
  team: TeamType;
  badgeColor: string;
  tagline: string;
  description: string;
  rules: string[];
  winCondition: string;
  phaseDependence: string;
  abilityName: string;
  abilityDescription: string;
}

export const ROLES_CATALOG: Record<RoleType, RoleDefinition> = {
  'Inocente': {
    type: 'Inocente',
    team: 'Fiesta (Inocentes)',
    badgeColor: 'emerald',
    tagline: 'Superviviente social y observador',
    description: 'Eres un invitado inocente en la fiesta. No tienes poderes sobrenaturales, pero tu capacidad de observación y deducción social es vital.',
    rules: [
      'Cumple tus misiones cotidianas para hacer avanzar la barra grupal de la fiesta.',
      'Si alguien te arrincona a solas y te susurra "¿Qué traes allí?", dale tu Código de Víctima sin alertar a nadie.',
      'Al morir, no quedas fuera: ¡te conviertes en Alma Atormentadora con tareas para sembrar el caos!'
    ],
    winCondition: 'Eliminar a todos los asesinos mediante votación en asamblea O completar el 100% de las misiones colectivas de la fiesta.',
    phaseDependence: 'Ambos',
    abilityName: 'Deducción y Tareas',
    abilityDescription: 'Completa tus tareas orgánicas y observa contradicciones en los demás invitados.'
  },
  'Asesino': {
    type: 'Asesino',
    team: 'Sombras (Asesinos)',
    badgeColor: 'rose',
    tagline: 'Depredador silencioso de la fiesta',
    description: 'Tu misión es diezmar a los invitados uno a uno sin que sospechen de ti.',
    rules: [
      'Para asesinar a alguien debes acorralarlo estrictamente a solas (sin testigos a menos de 3 metros).',
      'Susúrrale la frase pactada: "¿Qué traes allí?" y solicita su Código Secreto de 4 dígitos.',
      'Ingresa el código en tu consola de asesinato en la app para confirmar la baja.',
      'Durante la Noche, las almas no pueden verte venir con tanta facilidad.'
    ],
    winCondition: 'Lograr que el número de Asesinos iguale o supere al de Inocentes vivos, o impedir que completen sus misiones.',
    phaseDependence: 'Ambos (Más letal en Noche)',
    abilityName: 'Consola de Asesinato',
    abilityDescription: 'Ingresa el código de 4 dígitos de tu víctima acorralada para eliminarla.'
  },
  'El Fotógrafo': {
    type: 'El Fotógrafo',
    team: 'Fiesta (Inocentes)',
    badgeColor: 'sky',
    tagline: 'Cazador de sombras a través del lente',
    description: 'Capturas retratos furtivos de los invitados para revelar su verdadera naturaleza oscura.',
    rules: [
      'Cada 15 minutos puedes tomarle una foto rápida a un jugador a través de la cámara de la app.',
      'Pasados 15 minutos (o al cambiar de fase), el laboratorio fotográfico digital te revelará en secreto si esa persona pertenece al bando del bien o al de las sombras.',
      'No le muestres la foto revelada a nadie: ¡úsela como tu argumento clave en la asamblea!'
    ],
    winCondition: 'Ayudar a la Fiesta a identificar a los asesinos y eliminarlos.',
    phaseDependence: 'Ambos',
    abilityName: 'Cámara Forense Instantánea',
    abilityDescription: 'Toma una foto a un jugador. Al revelar el rollo en 15 min sabrás si es hostil.'
  },
  'El Chismoso': {
    type: 'El Chismoso',
    team: 'Fiesta (Inocentes)',
    badgeColor: 'amber',
    tagline: 'El oído de la fiesta y maestro del rumor',
    description: 'Posees una aguda intuición para comparar los lazos ocultos entre los asistentes.',
    rules: [
      'Una vez por partida, selecciona a dos jugadores en la app.',
      'El sistema te enviará un mensaje privado confidencial indicando si ambos comparten la misma alineación (ambos inocentes o ambos asesinos) o si pertenecen a bandos opuestos.',
      'No sabrás quién es qué, pero sabrás si son aliados o enemigos.'
    ],
    winCondition: 'Conectar las pistas entre los sospechosos y desenmascarar el complot.',
    phaseDependence: 'Ambos (1 solo uso)',
    abilityName: 'Cotejo de Rumores',
    abilityDescription: 'Compara a 2 jugadores para saber si son del mismo bando o de bandos distintos.'
  },
  'El Médico Forense': {
    type: 'El Médico Forense',
    team: 'Fiesta (Inocentes)',
    badgeColor: 'teal',
    tagline: 'Perito criminalístico en la escena',
    description: 'Cada vez que ocurre una tragedia, tus conocimientos te permiten obtener detalles forenses del crimen.',
    rules: [
      'Cuando un jugador es eliminado, recibes automáticamente en tu pantalla la hora exacta del ataque.',
      'Recibes una pista abstracta del agresor (por ejemplo: color de ropa, si habló con la víctima antes de caer, o una palabra clave dicha).',
      'Compara la hora y las pistas con las coartadas de los demás en la asamblea.'
    ],
    winCondition: 'Reconstruir las escenas del crimen y delatar al asesino con pruebas forenses.',
    phaseDependence: 'Pasiva (Se activa con cada muerte)',
    abilityName: 'Informe de Autopsia',
    abilityDescription: 'Recibe automáticamente la hora y una pista abstracta del atacante al morir alguien.'
  },
  'El Escolta': {
    type: 'El Escolta',
    team: 'Fiesta (Inocentes)',
    badgeColor: 'indigo',
    tagline: 'Guardaespaldas presencial',
    description: 'Proteges físicamente a los invitados que consideras valiosos para la fiesta.',
    rules: [
      'Selecciona a un jugador cada 15 minutos desde tu celular para otorgarle un escudo protector.',
      'REQUISITO IRL OBLIGATORIO: Para que la protección funcione, debes hablar con ese jugador cara a cara al menos una vez durante los 15 minutos tras seleccionarlo.',
      'Si el asesino intenta atacar a tu protegido durante esa ventana, el ataque fallará y tu objetivo no morirá.'
    ],
    winCondition: 'Mantener con vida a los jugadores clave de la fiesta y frustrar los asesinatos.',
    phaseDependence: 'Ambos (Recarga cada 15 min)',
    abilityName: 'Escudo Presencial',
    abilityDescription: 'Elige un jugador y habla con él en persona para protegerlo de la muerte por 15 min.'
  },
  'El Camaleón': {
    type: 'El Camaleón',
    team: 'Sombras (Asesinos)',
    badgeColor: 'purple',
    tagline: 'Suplantador de identidades digitales',
    description: 'Eres un infiltrado con habilidades tecnológicas para manipular la percepción pública.',
    rules: [
      'Una vez por partida, puedes "robar" la identidad digital de un jugador que ya haya sido eliminado.',
      'Envía un único comunicado anónimo oficial a través de la pantalla del sistema haciéndote pasar por esa persona caída.',
      'Siembra pistas falsas, acusa a inocentes o finge que la víctima dejó una nota póstuma.'
    ],
    winCondition: 'Desorientar a la fiesta y permitir la victoria de las Sombras.',
    phaseDependence: 'Ambos (1 solo uso tras una muerte)',
    abilityName: 'Suplantación Póstuma',
    abilityDescription: 'Usa la identidad de un muerto para emitir un anuncio falso en el canal del sistema.'
  },
  'El Cómplice / Hacker': {
    type: 'El Cómplice / Hacker',
    team: 'Sombras (Asesinos)',
    badgeColor: 'red',
    tagline: 'Terrorista informático de bolsillo',
    description: 'Trabajas en conjunto con los asesinos saboteando las comunicaciones de los inocentes.',
    rules: [
      'No puedes matar directamente, pero eres el apoyo táctico más temible.',
      'Una vez por partida, activa tu "Interferencia Cibernética".',
      'Durante 3 minutos exactos, las pantallas de todos los inocentes sufrirán un bloqueo con estática/glitch que les impedirá ver misiones, consultar información o activar habilidades.',
      '¡Es el momento perfecto para que tus aliados asesinos ataquen en la fiesta!'
    ],
    winCondition: 'Facilitar la eliminación de inocentes y sabotear sus intentos de asamblea.',
    phaseDependence: 'Ambos (1 solo uso)',
    abilityName: 'Pulso de Interferencia (EMP)',
    abilityDescription: 'Bloquea y glitchea los teléfonos de todos los inocentes durante 3 minutos.'
  },
  'El Paranoico': {
    type: 'El Paranoico',
    team: 'Caos (Independiente)',
    badgeColor: 'yellow',
    tagline: 'El chivo expiatorio voluntario',
    description: 'Estás profundamente desquiciado y tu único propósito es convertirte en el mártir de la velada.',
    rules: [
      'Ganas la partida en solitario ÚNICAMENTE si logras que la asamblea te expulse por votación popular en los primeros DOS turnos de reunión de emergencia.',
      'Debes actuar de forma sospechosa, titubear en tus coartadas y parecer culpable sin que sospechen que eres el Paranoico.',
      'Si pasan las 2 primeras asambleas y sigues con vida, pierdes tu condición de victoria especial y juegas como inocente.'
    ],
    winCondition: 'Ser expulsado por mayoría de votos en la asamblea 1 o 2.',
    phaseDependence: 'Día (Fase de Votación)',
    abilityName: 'Auto-Inculpación',
    abilityDescription: 'Provoca que sospechen de ti en las primeras 2 reuniones para ganar en solitario.'
  },
  'El Periodista': {
    type: 'El Periodista',
    team: 'Fiesta (Inocentes)',
    badgeColor: 'cyan',
    tagline: 'Cronista de investigación encubierta',
    description: 'Has venido a la fiesta a destapar una exclusiva periodística de alto impacto.',
    rules: [
      'Tu objetivo personal es descubrir la identidad exacta de al menos 2 roles especiales antes de que termine la partida.',
      'Debes entrevistar sutilmente a la gente en persona, fijarte en sus preguntas y actitudes.',
      'Registra tus hipótesis en la app para validar si acertaste.'
    ],
    winCondition: 'Adivinar correctamente 2 roles especiales mediante tus entrevistas de campo.',
    phaseDependence: 'Ambos',
    abilityName: 'Cuaderno de Primicias',
    abilityDescription: 'Registra tus teorías sobre quién ostenta qué rol especial tras entrevistarlos.'
  },
  'Alma Atormentadora': {
    type: 'Alma Atormentadora',
    team: 'Caos (Independiente)',
    badgeColor: 'slate',
    tagline: 'Fantasma incorpóreo de la fiesta',
    description: 'Has sido eliminado, pero tu espíritu sigue rondando la fiesta. No puedes hablar durante las asambleas, pero tienes influencia en el juego.',
    rules: [
      'No puedes votar ni hablar durante las llamadas de emergencia.',
      'Recibes "Tareas de Ultratumba" neutrales que pueden beneficiar a los inocentes o ayudar a los asesinos a cambio de puntos de espectro.',
      'Puedes susurrar al oído de un vivo una única palabra clave cada noche.'
    ],
    winCondition: 'Cumplir tus desafíos espirituales para influir en el desenlace final de la fiesta.',
    phaseDependence: 'Ambos (Más activo de Noche)',
    abilityName: 'Susurro del Más Allá',
    abilityDescription: 'Cumple misiones de ultratumba para alterar el equilibrio de la fiesta.'
  }
};
