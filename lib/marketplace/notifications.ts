// Meta WhatsApp Cloud API — notification utility
// Env vars required: WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID
// Template: 'hello_world' for dev/testing (replace with 'mp_new_message' once approved in Meta Business Manager)
// Fire-and-forget pattern: callers must wrap in void (async () => { ... })()

export async function sendWhatsAppNotification(
  phone: string,
  _senderName: string,
  _preview: string,
): Promise<void> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  if (!accessToken || !phoneNumberId) return

  const to = phone.replace(/\D/g, '')
  if (!to || to.length < 7) return

  await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        // TODO: register 'mp_new_message' template in Meta Business Manager
        // and replace 'hello_world' below. Add components[] with senderName + preview vars.
        name: 'hello_world',
        language: { code: 'en_US' },
      },
    }),
  })
}
