import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'
import { z } from 'zod'

const schema = z.object({
  topic:          z.enum(['species_correction', 'missing_species', 'location_fix', 'landmark_issue', 'general']),
  subtopic:       z.string().min(1).max(100),
  reference_name: z.string().max(200).optional().or(z.literal('')),
  details:        z.string().min(10, 'Please add a bit more detail (10+ characters)').max(1000),
  contact_email:  z.string().email('Enter a valid email').optional().or(z.literal('')),
  _hp:            z.string().max(0, 'Submission rejected'),  // honeypot — must stay empty
})

// In-memory rate limit: ip_hash → last submission ms
// Resets on cold start; sufficient for small-scale community use
const rateMap = new Map<string, number>()
const RATE_WINDOW_MS = 10 * 60 * 1000  // 10 minutes

const TOPIC_LABELS: Record<string, string> = {
  species_correction: '🌿 Plant correction',
  missing_species:    '➕ Missing plant',
  location_fix:       '📍 Location issue',
  landmark_issue:     '🏛️ Landmark note',
  general:            '💡 General feedback',
}

export async function POST(request: NextRequest) {
  try {
    // IP-based rate limiting
    const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown'
    const salt = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'fallback').slice(0, 12)
    const ipHash = createHash('sha256').update(ip + salt).digest('hex')

    const last = rateMap.get(ipHash) ?? 0
    if (Date.now() - last < RATE_WINDOW_MS) {
      return NextResponse.json(
        { error: 'Thank you — please wait 10 minutes before submitting again.' },
        { status: 429 },
      )
    }

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      const issues = parsed.error.issues ?? (parsed.error as unknown as { errors: { message: string }[] }).errors
      return NextResponse.json({ error: issues?.[0]?.message ?? 'Invalid input' }, { status: 400 })
    }

    const { _hp: _ignored, ...data } = parsed.data

    // Anon key is sufficient — the feedback table has a public INSERT RLS policy.
    // Service role key is not required for this route.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    )

    const { error: dbError } = await supabase.from('feedback').insert({
      topic:          data.topic,
      subtopic:       data.subtopic,
      reference_name: data.reference_name || null,
      details:        data.details,
      contact_email:  data.contact_email || null,
      property_id:    'ELAN_HOMES',
      ip_hash:        ipHash,
    })

    if (dbError) throw new Error(dbError.message)

    rateMap.set(ipHash, Date.now())

    // Email via Resend — non-fatal if not configured
    const resendKey = process.env.RESEND_API_KEY
    const notifyEmail = process.env.FEEDBACK_NOTIFY_EMAIL
    if (resendKey && notifyEmail) {
      const label = TOPIC_LABELS[data.topic] ?? data.topic
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from:    'Elan Greens <onboarding@resend.dev>',
          to:      [notifyEmail],
          subject: `[Elan Greens Feedback] ${label} — ${data.subtopic}`,
          html: `
            <div style="font-family:sans-serif;max-width:560px">
              <h2 style="color:#2E7D32">${label}</h2>
              <table style="width:100%;border-collapse:collapse">
                <tr><td style="padding:6px 0;color:#555;width:130px">Type</td>
                    <td style="padding:6px 0;font-weight:600">${data.subtopic}</td></tr>
                ${data.reference_name ? `
                <tr><td style="padding:6px 0;color:#555">Reference</td>
                    <td style="padding:6px 0;font-weight:600">${data.reference_name}</td></tr>` : ''}
                <tr><td style="padding:6px 0;color:#555;vertical-align:top">Details</td>
                    <td style="padding:6px 0">${data.details.replace(/\n/g, '<br>')}</td></tr>
                <tr><td style="padding:6px 0;color:#555">Contact</td>
                    <td style="padding:6px 0">${data.contact_email || '<em style="color:#999">Not provided</em>'}</td></tr>
              </table>
              <p style="font-size:11px;color:#aaa;margin-top:24px">
                Elan Greens · property: ELAN_HOMES · view all feedback in the admin app
              </p>
            </div>
          `,
        }),
      }).catch(() => {}) // log silently — feedback is already in DB
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[feedback API]', err)
    return NextResponse.json(
      { error: 'Could not save your feedback. Please try again.' },
      { status: 500 },
    )
  }
}
