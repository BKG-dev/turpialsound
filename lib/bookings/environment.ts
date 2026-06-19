export function isPreviewDeployment(vercelEnv: string | undefined = process.env.VERCEL_ENV): boolean {
  return vercelEnv === 'preview'
}

export const PREVIEW_SIMULATION_MESSAGE = 'Simulación completada. No se modificó la base de datos.'
