import type { FAQItem } from '@/types'

// SUGGESTED content — review all answers with client before publishing

export const faqItems: FAQItem[] = [
  {
    id: 'ubicacion',
    question: '¿Dónde está ubicado Turpial Sound?',
    answer: 'Estamos ubicados en Caracas, Venezuela. Contáctanos por WhatsApp para recibir la dirección exacta y coordinar tu visita.', // CLIENT_REQUIRED: dirección real
    category: 'general',
  },
  {
    id: 'reserva',
    question: '¿Cómo reservo una sala o sesión?',
    answer: 'Puedes iniciar tu solicitud desde la seccion de reservas. Si necesitas ayuda, te atendemos por WhatsApp. Confirmamos disponibilidad en menos de 24 horas.', // SUGGESTED — confirmar proceso real
    category: 'general',
    relatedServiceSlug: 'salas-de-ensayo',
  },
  {
    id: 'equipo-incluido',
    question: '¿El equipamiento está incluido en el precio de la sala?',
    answer: 'Sí. Las salas incluyen el equipamiento estándar (amplificadores, batería, PA). Puedes traer tu propio equipo si lo prefieres.', // CLIENT_REQUIRED: confirmar qué está incluido
    category: 'salas',
    relatedServiceSlug: 'salas-de-ensayo',
  },
  {
    id: 'precio-grabacion',
    question: '¿Cuánto cuesta una sesión de grabación?',
    answer: 'El precio varía según el proyecto. El ticket promedio es de 100 USD por sesión. Contáctanos para un presupuesto a medida según tus necesidades.', // SUGGESTED
    category: 'estudio',
    relatedServiceSlug: 'estudio-de-grabacion',
  },
  {
    id: 'produccion-externa',
    question: '¿Pueden mezclar y masterizar material grabado en otro estudio?',
    answer: 'Sí. Ofrecemos mezcla y masterización como servicio independiente, sin importar dónde se grabó el material original.', // SUGGESTED
    category: 'produccion',
    relatedServiceSlug: 'mezcla-masterizacion',
  },
  {
    id: 'idiomas',
    question: '¿Trabajan solo con música en español?',
    answer: 'No. Hemos trabajado con proyectos en español, inglés y otros géneros latinoamericanos. El criterio técnico aplica a cualquier idioma o género.', // SUGGESTED
    category: 'general',
  },
  {
    id: 'nuevos-artistas',
    question: '¿Trabajamos con artistas nuevos sin trayectoria?',
    answer: 'Absolutamente. Trabajamos con artistas en todas las etapas, desde la primera grabación hasta proyectos de producción completa.', // SUGGESTED
    category: 'general',
  },
  {
    id: 'tiempo-sesion',
    question: '¿Cuánto dura una sesión de grabación?',
    answer: 'Las sesiones se organizan por bloques de tiempo. El mínimo recomendado depende del proyecto. Consulta con nuestro equipo para estimar el tiempo que necesitas.', // SUGGESTED — CLIENT_REQUIRED: política real
    category: 'estudio',
    relatedServiceSlug: 'estudio-de-grabacion',
  },
]

export function getFAQByCategory(category: string): FAQItem[] {
  return faqItems.filter((item) => item.category === category)
}

export function getAllFAQCategories(): string[] {
  return [...new Set(faqItems.map((item) => item.category))]
}
