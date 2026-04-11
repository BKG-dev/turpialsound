// Turpial Sound — Seed base de catálogos
// Fase 1A.3 — services, service_variants, resources
// Idempotente: usa upsert en todos los registros.

import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // ── Services ────────────────────────────────────────────────────

  const servicesData = [
    {
      slug: "sala-ensayo",
      name: "Sala de Ensayo",
      description: "Espacio acústicamente tratado para ensayo de bandas y artistas.",
    },
    {
      slug: "grabacion",
      name: "Grabación",
      description: "Sesión de grabación profesional en estudio.",
    },
    {
      slug: "produccion-musical",
      name: "Producción Musical",
      description: "Producción integral de una pieza o proyecto musical.",
    },
    {
      slug: "mezcla-masterizacion",
      name: "Mezcla y Masterización",
      description: "Mezcla y masterización de material grabado.",
    },
    {
      slug: "podcast-locucion",
      name: "Podcast / Locución",
      description: "Producción de podcast o sesión de locución profesional.",
    },
    {
      slug: "video-session",
      name: "Video Session",
      description: "Sesión de video para artistas en set de producción audiovisual.",
    },
    {
      slug: "arreglos-musicales",
      name: "Arreglos Musicales",
      description: "Arreglos y adaptaciones musicales para proyectos propios o de terceros.",
    },
    {
      slug: "consultoria",
      name: "Consultoría",
      description: "Clase o consultoría de producción por hora.",
    },
  ];

  for (const data of servicesData) {
    await prisma.service.upsert({
      where: { slug: data.slug },
      update: {},
      create: data,
    });
  }

  console.log(`  ✓ ${servicesData.length} services`);

  // ── Service Variants ────────────────────────────────────────────
  // Sala de ensayo: 3 variantes
  // El resto del catálogo sigue los subtipos aprobados en 1B.6b

  const variantsData: Array<{
    slug: string;
    name: string;
    description: string | null;
    serviceSlug: string;
  }> = [
    {
      slug: "sala-ensayo-flexible",
      name: "Flexible",
      description: "Bloque de horas flexible sin horario preferencial fijo.",
      serviceSlug: "sala-ensayo",
    },
    {
      slug: "sala-ensayo-premium",
      name: "Premium",
      description: "Bloque preferencial con acceso a equipamiento completo.",
      serviceSlug: "sala-ensayo",
    },
    {
      slug: "sala-ensayo-prioritaria",
      name: "Prioritaria",
      description: "Reserva con prioridad máxima y confirmación acelerada.",
      serviceSlug: "sala-ensayo",
    },
    {
      slug: "grabacion-ensayo",
      name: "Grabación de ensayo",
      description: "Registro de ensayo por hora.",
      serviceSlug: "grabacion",
    },
    {
      slug: "grabacion-hora-estudio",
      name: "Hora de grabación",
      description: "Sesión de grabación en estudio por hora.",
      serviceSlug: "grabacion",
    },
    {
      slug: "produccion-musical-por-tema",
      name: "Producción por tema",
      description: "Servicio principal por tema.",
      serviceSlug: "produccion-musical",
    },
    {
      slug: "mezcla-por-tema",
      name: "Mezcla",
      description: "Proceso de mezcla por tema.",
      serviceSlug: "mezcla-masterizacion",
    },
    {
      slug: "master-por-tema",
      name: "Master",
      description: "Proceso de master por tema.",
      serviceSlug: "mezcla-masterizacion",
    },
    {
      slug: "mezcla-master-por-tema",
      name: "Mezcla + Master",
      description: "Paquete conjunto por tema.",
      serviceSlug: "mezcla-masterizacion",
    },
    {
      slug: "podcast-por-episodio",
      name: "Podcast",
      description: "Producción por episodio con máximo 4 horas por sesión.",
      serviceSlug: "podcast-locucion",
    },
    {
      slug: "locucion-por-hora",
      name: "Locución",
      description: "Sesión de locución por hora.",
      serviceSlug: "podcast-locucion",
    },
    {
      slug: "studio-session-fija",
      name: "Studio Session",
      description: "Sesión fija de video con máximo 4 horas.",
      serviceSlug: "video-session",
    },
    {
      slug: "diseno-sonoro-video",
      name: "Diseño de sonido para video",
      description: "Puede pedirse como servicio aparte o como complemento.",
      serviceSlug: "video-session",
    },
    {
      slug: "arreglos-musicales-por-tema",
      name: "Arreglo por tema",
      description: "Servicio principal por tema.",
      serviceSlug: "arreglos-musicales",
    },
    {
      slug: "consultoria-produccion",
      name: "Clase / consultoría de producción",
      description: "Consultoría o clase por hora.",
      serviceSlug: "consultoria",
    },
  ];

  for (const { serviceSlug, ...variantData } of variantsData) {
    const service = await prisma.service.findUniqueOrThrow({
      where: { slug: serviceSlug },
    });

    await prisma.serviceVariant.upsert({
      where: { slug: variantData.slug },
      update: {},
      create: { ...variantData, serviceId: service.id },
    });
  }

  console.log(`  ✓ ${variantsData.length} service_variants`);

  // ── Resources ───────────────────────────────────────────────────

  const resourcesData = [
    {
      slug: "sala-ensayo-a",
      name: "Sala Ensayo A",
      description: "Sala de ensayo principal. Capacidad hasta 8 músicos con batería.",
    },
    {
      slug: "sala-ensayo-b",
      name: "Sala Ensayo B",
      description: "Sala de ensayo secundaria. Capacidad hasta 5 músicos.",
    },
    {
      slug: "estudio-grabacion",
      name: "Estudio de Grabación",
      description: "Estudio principal con consola, monitores y control room.",
    },
    {
      slug: "booth-voz",
      name: "Booth de Voz",
      description: "Cabina aislada para grabación de voces, locución y doblaje.",
    },
    {
      slug: "set-video",
      name: "Set Video Session",
      description: "Set de producción audiovisual para video sessions y contenido visual.",
    },
  ];

  for (const data of resourcesData) {
    await prisma.resource.upsert({
      where: { slug: data.slug },
      update: {},
      create: data,
    });
  }

  console.log(`  ✓ ${resourcesData.length} resources`);
  console.log("Seed completado.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
