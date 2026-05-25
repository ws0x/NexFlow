/**
 * WhatsApp integration — CallMeBot adapter.
 *
 * Setup per coordinator:
 *   1. Coordinator adds +34 644 60 49 48 to their WhatsApp contacts.
 *   2. They send the message: "I allow callmebot to send me messages"
 *   3. They receive their API key via WhatsApp.
 *   4. Admin saves the key in Entity → Coordinator API Key.
 *
 * API endpoint: GET https://api.callmebot.com/whatsapp.php?phone=PHONE&text=TEXT&apikey=KEY
 *
 * Fallback: if no API key is configured, we return a wa.me deep-link the user
 * can click to send manually.
 */

export interface LeadCardData {
  reqCode: string
  requestDate: Date
  businessUnitName: string
  companyName: string
  companyType?: string | null
  contactName: string
  contactNumber: string
  contactEmail?: string | null
  country?: string | null
  city?: string | null
  companySector?: string | null
  leadRequest?: string | null
  leadSource?: string | null
  communicationChannel?: string | null
  leadType?: string | null
  directedToDeptName?: string | null
  marketingNotes?: string | null
}

/** Formats a lead into a WhatsApp-ready card message. */
export function formatLeadCard(lead: LeadCardData): string {
  const date = lead.requestDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  const location = [lead.city, lead.country].filter(Boolean).join(' — ')
  const source   = [lead.leadSource, lead.communicationChannel].filter(Boolean).join(' → ')

  return [
    `🔔 *New Lead — ${lead.reqCode}*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `📅 ${date}  |  ${lead.businessUnitName}`,
    `🏢 ${lead.companyName}${lead.companyType ? `  •  ${lead.companyType}` : ''}`,
    `📞 ${lead.contactName}  |  ${lead.contactNumber}`,
    lead.contactEmail      ? `📧 ${lead.contactEmail}` : null,
    location               ? `🌍 ${location}` : null,
    lead.companySector     ? `🏭 Sector: ${lead.companySector}` : null,
    lead.leadRequest       ? `📋 Request: ${lead.leadRequest}` : null,
    source                 ? `🔗 Source: ${source}` : null,
    lead.leadType          ? `🎯 Type: ${lead.leadType}` : null,
    lead.directedToDeptName ? `👥 Directed to: ${lead.directedToDeptName}` : null,
    lead.marketingNotes    ? `📝 Notes: ${lead.marketingNotes}` : null,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
  ]
    .filter(Boolean)
    .join('\n')
}

/** Generates a wa.me deep-link (fallback when no API key is configured). */
export function generateWaMeLink(phoneNumber: string, message: string): string {
  const cleaned = phoneNumber.replace(/\D/g, '')
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`
}

/**
 * Sends a WhatsApp message via CallMeBot.
 * Returns true on success, false on failure (errors are non-fatal).
 */
export async function sendViaCallMeBot(
  phone: string,
  apiKey: string,
  message: string,
): Promise<boolean> {
  const cleaned = phone.replace(/\D/g, '')
  const url = `https://api.callmebot.com/whatsapp.php?phone=${cleaned}&text=${encodeURIComponent(message)}&apikey=${apiKey}`

  try {
    const res = await fetch(url, { method: 'GET' })
    const text = await res.text()
    // CallMeBot returns "Message queued. Total Messages Sent: X" on success
    return res.ok && text.toLowerCase().includes('message')
  } catch {
    return false
  }
}

/**
 * Main entry point.
 * - If coordinatorApiKey is provided → sends via CallMeBot (automatic).
 * - Otherwise → returns a wa.me link for manual sending.
 */
export async function sendLeadToCoordinator(
  coordinatorPhone: string,
  lead: LeadCardData,
  coordinatorApiKey?: string | null,
): Promise<{ url: string; message: string; sent: boolean }> {
  const message = formatLeadCard(lead)

  if (coordinatorApiKey) {
    const sent = await sendViaCallMeBot(coordinatorPhone, coordinatorApiKey, message)
    return { url: generateWaMeLink(coordinatorPhone, message), message, sent }
  }

  // Fallback: return the wa.me deep-link for manual send
  const url = generateWaMeLink(coordinatorPhone, message)
  return { url, message, sent: false }
}
