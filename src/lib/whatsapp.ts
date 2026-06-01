/**
 * WhatsApp integration — CallMeBot adapter.
 * Card content is configurable via LeadCardTemplate in the Admin panel.
 */
import type { CardField } from '@/components/admin/card-template-editor'
import { DEFAULT_CARD_FIELDS } from '@/app/(dashboard)/admin/card-template/page'

export interface LeadCardData {
  reqCode:              string
  requestDate:          Date
  businessUnitName:     string
  companyName:          string
  companyType?:         string | null
  contactName:          string
  contactNumber:        string
  contactEmail?:        string | null
  country?:             string | null
  city?:                string | null
  companySector?:       string | null
  leadRequest?:         string | null
  leadSource?:          string | null
  communicationChannel?: string | null
  leadType?:            string | null
  directedToDeptName?:  string | null
  marketingNotes?:      string | null
  companyWebsite?:      string | null
  newClient?:           boolean | null
  referralFrom?:        string | null
}

interface CardConfig {
  fields:      CardField[]
  headerTitle: string
  footerText:  string
}

/** Renders one field line given the field config and lead data. */
function renderField(field: CardField, lead: LeadCardData): string | null {
  const k = field.key as keyof LeadCardData
  const v = lead[k]
  if (v === null || v === undefined || v === '') return null

  // Special composite cases
  if (field.key === 'country') {
    const loc = [lead.city, lead.country].filter(Boolean).join(' — ')
    return loc ? `${field.icon} ${loc}` : null
  }
  if (field.key === 'leadSource') {
    const src = [lead.leadSource, lead.communicationChannel].filter(Boolean).join(' → ')
    return src ? `${field.icon} Source: ${src}` : null
  }
  if (field.key === 'communicationChannel') return null // already handled via leadSource composite

  return `${field.icon} ${field.label}: ${v}`
}

/** Formats a lead into a WhatsApp-ready card using the configured template. */
export function formatLeadCard(
  lead: LeadCardData,
  config?: CardConfig | null,
): string {
  const cfg = config ?? { fields: DEFAULT_CARD_FIELDS, headerTitle: 'New Lead', footerText: '' }

  const date = lead.requestDate.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })

  const lines: (string | null)[] = [
    `🔔 *${cfg.headerTitle} — ${lead.reqCode}*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `📅 ${date}  |  ${lead.businessUnitName}`,
    // Always show company name prominently
    `🏢 ${lead.companyName}${lead.companyType ? `  •  ${lead.companyType}` : ''}`,
    `📞 ${lead.contactName}  |  ${lead.contactNumber}`,
    // Configured fields (skip always-present ones)
    ...cfg.fields
      .filter((f) => f.include && !['requestDate', 'businessUnitName', 'companyName', 'companyType', 'contactName', 'contactNumber'].includes(f.key))
      .map((f) => renderField(f, lead)),
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    cfg.footerText || null,
  ]

  return lines.filter(Boolean).join('\n')
}

/** Generates a wa.me deep-link. */
export function generateWaMeLink(phoneNumber: string, message: string): string {
  const cleaned = phoneNumber.replace(/\D/g, '')
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`
}

/** Sends via CallMeBot. */
export async function sendViaCallMeBot(
  phone: string,
  apiKey: string,
  message: string,
): Promise<boolean> {
  const cleaned = phone.replace(/\D/g, '')
  const url = `https://api.callmebot.com/whatsapp.php?phone=${cleaned}&text=${encodeURIComponent(message)}&apikey=${apiKey}`
  try {
    const res  = await fetch(url, { method: 'GET' })
    const text = await res.text()
    return res.ok && text.toLowerCase().includes('message')
  } catch {
    return false
  }
}

/**
 * Main entry point. Loads card template from DB if available.
 * Falls back to default template when none configured.
 */
export async function sendLeadToCoordinator(
  coordinatorPhone: string,
  lead: LeadCardData,
  coordinatorApiKey?: string | null,
  cardConfig?: CardConfig | null,
): Promise<{ url: string; message: string; sent: boolean }> {
  const message = formatLeadCard(lead, cardConfig)

  if (coordinatorApiKey) {
    const sent = await sendViaCallMeBot(coordinatorPhone, coordinatorApiKey, message)
    return { url: generateWaMeLink(coordinatorPhone, message), message, sent }
  }

  const url = generateWaMeLink(coordinatorPhone, message)
  return { url, message, sent: false }
}
