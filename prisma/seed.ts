// Turpial Sound — Seed base de catálogos
// Fase 1A.3 — services, service_variants, resources
// Idempotente: usa upsert en todos los registros.

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
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
  // Sala de ensayo: 3 variantes (flexible / premium / prioritaria)
  // Resto de servicios: 1 variante estándar por servicio

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
      slug: "grabacion-standard",
      name: "Estándar",
      description: null,
      serviceSlug: "grabacion",
    },
    {
      slug: "produccion-musical-standard",
      name: "Estándar",
      description: null,
      serviceSlug: "produccion-musical",
    },
    {
      slug: "mezcla-masterizacion-standard",
      name: "Estándar",
      description: null,
      serviceSlug: "mezcla-masterizacion",
    },
    {
      slug: "podcast-locucion-standard",
      name: "Estándar",
      description: null,
      serviceSlug: "podcast-locucion",
    },
    {
      slug: "video-session-standard",
      name: "Estándar",
      description: null,
      serviceSlug: "video-session",
    },
    {
      slug: "arreglos-musicales-standard",
      name: "Estándar",
      description: null,
      serviceSlug: "arreglos-musicales",
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