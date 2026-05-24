/**
 * WhatsApp integration – swappable adapter pattern.
 * MVP uses wa.me deep links (zero API setup).
 * Swap to Meta Business API or Twilio by changing WHATSAPP_PROVIDER env var.
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

/**
 * Formats a lead into a WhatsApp-ready card message.
 */
export function formatLeadCard(lead: LeadCardData): string {
  const date = lead.requestDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  const location = [lead.city, lead.country].filter(Boolean).join(' — ')
  const source = [lead.leadSource, lead.communicationChannel].filter(Boolean).join(' → ')

  const lines = [
    `🔔 *New Lead — ${lead.reqCode}*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `📅 ${date}  |  ${lead.businessUnitName}`,
    `🏢 ${lead.companyName}${lead.companyType ? `  •  ${lead.companyType}` : ''}`,
    `📞 ${lead.contactName}  |  ${lead.contactNumber}`,
    lead.contactEmail ? `📧 ${lead.contactEmail}` : null,
    location ? `🌍 ${location}` : null,
    lead.companySector ? `🏭 Sector: ${lead.companySector}` : null,
    lead.leadRequest ? `📋 Request: ${lead.leadRequest}` : null,
    source ? `🔗 Source: ${source}` : null,
    lead.leadType ? `🎯 Type: ${lead.leadType}` : null,
    lead.directedToDeptName ? `👥 Directed to: ${lead.directedToDeptName}` : null,
    lead.marketingNotes ? `📝 Notes: ${lead.marketingNotes}` : null,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
  ]
    .filter(Boolean)
    .join('\n')

  return lines
}

/**
 * Generates a wa.me deep link URL that opens WhatsApp with a pre-filled message.
 * The user clicks this link and sends the message manually.
 */
export function generateWaMeLink(phoneNumber: string, message: string): string {
  // Strip all non-digits from phone number
  const cleaned = phoneNumber.replace(/\D/g, '')
  const encoded = encodeURIComponent(message)
  return `https://wa.me/${cleaned}?text=${encoded}`
}

/**
 * Main entry point – returns a wa.me URL to open WhatsApp with the lead card.
 * Extend this function to call Meta API or Twilio when WHATSAPP_PROVIDER changes.
 */
export async function sendLeadToCoordinator(
  coordinatorPhone: string,
  lead: LeadCardData
): Promise<{ url: string; message: string }> {
  const message = formatLeadCard(lead)
  const url = generateWaMeLink(coordinatorPhone, message)
  return { url, message }
}
