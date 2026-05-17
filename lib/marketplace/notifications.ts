// Meta WhatsApp Cloud API — notification utility
// Env vars required: WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID
// Fire-and-forget pattern: callers must wrap in void (async () => { ... })()

type NotifType = 'new_message' | 'payment_received' | 'payment_sent' | 'dispute' | 'delivery' | 'payout'

export async function sendWhatsAppNotification(
  phone: string,
  type: NotifType,
  details: { senderName?: string; preview?: string; amount?: string; txId?: string },
): Promise<void> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  if (!accessToken || !phoneNumberId) return

  const to = phone.replace(/\D/g, '')
  if (!to || to.length < 7) return

  const messages: Record<NotifType, string> = {
    new_message: `Turpial Sound: ${details.senderName || 'Alguien'} te ha enviado un mensaje sobre tu publicacion. Responde en el marketplace.`,
    payment_received: `Turpial Sound: Hemos recibido el pago de $${details.amount || '--'} por tu compra. El vendedor sera notificado. TX: ${(details.txId || '').slice(-8)}`,
    payment_sent: `Turpial Sound: El comprador ha enviado el pago de $${details.amount || '--'}. Prepara la entrega. TX: ${(details.txId || '').slice(-8)}`,
    dispute: `Turpial Sound: Se ha abierto una disputa en la transaccion ${(details.txId || '').slice(-8)}. Nuestro equipo la revisara.`,
    delivery: `Turpial Sound: El vendedor registro la entrega de tu pedido. Confirma la recepcion en el marketplace. TX: ${(details.txId || '').slice(-8)}`,
    payout: `Turpial Sound: Tu pago de $${details.amount || '--'} ha sido liberado. Revisa tu metodo de cobro registrado. TX: ${(details.txId || '').slice(-8)}`,
  }

  const body = details.preview || messages[type] || messages.new_message

  await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body },
    }),
  }).catch(() => {})
}

// Convenience: send WhatsApp to the default business phone (+4168017844)
export async function notifyBusinessWhatsApp(
  type: NotifType,
  details: { senderName?: string; preview?: string; amount?: string; txId?: string },
): Promise<void> {
  void sendWhatsAppNotification('+584168017844', type, details)
}
