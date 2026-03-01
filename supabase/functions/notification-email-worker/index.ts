import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0'

type QueueItem = {
  id: string
  notification_id: string
  user_id: string
  channel: string
  category: string
  event_type: string
  recipient_email: string
  subject: string
  body_text: string
  payload: Record<string, unknown>
  status: string
  attempts: number
  next_attempt_at: string
  leased_at: string | null
  leased_by: string | null
  sent_at: string | null
  failed_at: string | null
  last_error: string | null
  created_at: string
  updated_at: string
}

type FinalizedQueueItem = QueueItem

type EmailProviderId = 'stub' | 'resend' | 'postmark' | 'webhook'

type EmailProviderAdapter = {
  id: EmailProviderId
  send: (queueItem: QueueItem) => Promise<void>
}

function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(init.headers ?? {}),
    },
  })
}

function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

function getIntEnv(name: string, fallback: number): number {
  const raw = Deno.env.get(name)
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

async function sendEmailViaWebhook(queueItem: QueueItem) {
  const webhookUrl = getRequiredEnv('NOTIFICATION_EMAIL_WEBHOOK_URL')
  const webhookAuthHeader = Deno.env.get('NOTIFICATION_EMAIL_WEBHOOK_AUTH_HEADER')
  const webhookAuthValue = Deno.env.get('NOTIFICATION_EMAIL_WEBHOOK_AUTH_VALUE')

  const headers: HeadersInit = {
    'content-type': 'application/json',
  }

  if (webhookAuthHeader && webhookAuthValue) {
    headers[webhookAuthHeader] = webhookAuthValue
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      to: queueItem.recipient_email,
      subject: queueItem.subject,
      text: queueItem.body_text,
      category: queueItem.category,
      eventType: queueItem.event_type,
      notificationId: queueItem.notification_id,
      queueId: queueItem.id,
      payload: queueItem.payload,
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Webhook email delivery failed (${response.status}): ${body.slice(0, 300)}`)
  }
}

async function sendEmailViaResend(queueItem: QueueItem) {
  const apiKey = getRequiredEnv('RESEND_API_KEY')
  const from = getRequiredEnv('NOTIFICATION_EMAIL_FROM')
  const replyTo = Deno.env.get('NOTIFICATION_EMAIL_REPLY_TO')

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [queueItem.recipient_email],
      subject: queueItem.subject,
      text: queueItem.body_text,
      ...(replyTo ? { reply_to: replyTo } : {}),
      tags: [
        { name: 'category', value: queueItem.category },
        { name: 'event_type', value: queueItem.event_type },
      ],
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Resend delivery failed (${response.status}): ${body.slice(0, 300)}`)
  }
}

async function sendEmailViaPostmark(queueItem: QueueItem) {
  const serverToken = getRequiredEnv('POSTMARK_SERVER_TOKEN')
  const from = getRequiredEnv('NOTIFICATION_EMAIL_FROM')
  const replyTo = Deno.env.get('NOTIFICATION_EMAIL_REPLY_TO')
  const messageStream = Deno.env.get('POSTMARK_MESSAGE_STREAM')

  const response = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      'X-Postmark-Server-Token': serverToken,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      From: from,
      To: queueItem.recipient_email,
      Subject: queueItem.subject,
      TextBody: queueItem.body_text,
      Tag: queueItem.category,
      Metadata: {
        category: queueItem.category,
        event_type: queueItem.event_type,
        notification_id: queueItem.notification_id,
        queue_id: queueItem.id,
      },
      ...(replyTo ? { ReplyTo: replyTo } : {}),
      ...(messageStream ? { MessageStream: messageStream } : {}),
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Postmark delivery failed (${response.status}): ${body.slice(0, 300)}`)
  }
}

function createEmailProviderAdapter(provider: EmailProviderId): EmailProviderAdapter {
  if (provider === 'stub') {
    return {
      id: 'stub',
      send: async () => {
        // No-op provider for local/dev testing. Queue item is finalized as sent.
      },
    }
  }

  if (provider === 'resend') {
    return {
      id: 'resend',
      send: sendEmailViaResend,
    }
  }

  if (provider === 'postmark') {
    return {
      id: 'postmark',
      send: sendEmailViaPostmark,
    }
  }

  return {
    id: 'webhook',
    send: sendEmailViaWebhook,
  }
}

function parseProviderId(raw: string | null | undefined): EmailProviderId | null {
  if (!raw) return null
  const normalized = raw.trim().toLowerCase()
  if (normalized === 'stub') return 'stub'
  if (normalized === 'resend') return 'resend'
  if (normalized === 'postmark') return 'postmark'
  if (normalized === 'webhook') return 'webhook'
  return null
}

function resolveEmailProviderId(body: { provider?: string; mode?: string }): EmailProviderId {
  const explicitProvider = body.provider?.trim()
  if (explicitProvider) {
    const parsed = parseProviderId(explicitProvider)
    if (!parsed) {
      throw new Error(`Unsupported email provider '${explicitProvider}'. Expected one of: stub, resend, postmark.`)
    }
    return parsed
  }

  const legacyMode = body.mode?.trim()
  if (legacyMode) {
    const parsed = parseProviderId(legacyMode)
    if (!parsed) {
      throw new Error(`Unsupported legacy mode '${legacyMode}'. Expected one of: stub, webhook.`)
    }
    return parsed
  }

  const envProvider = Deno.env.get('NOTIFICATION_EMAIL_PROVIDER')?.trim()
  if (envProvider) {
    const parsed = parseProviderId(envProvider)
    if (!parsed) {
      throw new Error(`Unsupported NOTIFICATION_EMAIL_PROVIDER='${envProvider}'.`)
    }
    return parsed
  }

  const legacyEnvMode = Deno.env.get('NOTIFICATION_EMAIL_PROVIDER_MODE')?.trim()
  if (legacyEnvMode) {
    const parsed = parseProviderId(legacyEnvMode)
    if (!parsed) {
      throw new Error(`Unsupported NOTIFICATION_EMAIL_PROVIDER_MODE='${legacyEnvMode}'.`)
    }
    return parsed
  }

  return 'stub'
}

async function processQueueItem(
  supabaseAdmin: ReturnType<typeof createClient<any>>,
  queueItem: QueueItem,
  options: {
    provider: EmailProviderAdapter
    workerId: string
    maxAttempts: number
    retryDelaySeconds: number
  },
) {
  try {
    await options.provider.send(queueItem)

    const { data, error } = await supabaseAdmin.rpc('notification_worker_finalize_email_queue_item', {
      _queue_id: queueItem.id,
      _outcome: 'sent',
      _worker_id: options.workerId,
      _error: null,
      _retry_delay_seconds: options.retryDelaySeconds,
    })

    if (error) throw error

    return { outcome: 'sent' as const, queueItem: data as FinalizedQueueItem }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    const shouldDiscard = queueItem.attempts >= options.maxAttempts

    const { data, error: finalizeError } = await supabaseAdmin.rpc('notification_worker_finalize_email_queue_item', {
      _queue_id: queueItem.id,
      _outcome: shouldDiscard ? 'discarded' : 'failed',
      _worker_id: options.workerId,
      _error: errMsg,
      _retry_delay_seconds: options.retryDelaySeconds,
    })

    if (finalizeError) {
      throw new Error(`Failed to finalize queue item ${queueItem.id}: ${finalizeError.message}. Original error: ${errMsg}`)
    }

    return {
      outcome: shouldDiscard ? ('discarded' as const) : ('failed' as const),
      queueItem: data as FinalizedQueueItem,
      error: errMsg,
    }
  }
}

Deno.serve(async (req) => {
  const startedAt = Date.now()

  try {
    if (req.method !== 'POST') {
      return json({ error: 'Method not allowed' }, { status: 405 })
    }

    const workerToken = Deno.env.get('NOTIFICATION_WORKER_TOKEN')
    if (workerToken) {
      const authHeader = req.headers.get('authorization') ?? ''
      const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice('Bearer '.length)
        : req.headers.get('x-worker-token')

      if (token !== workerToken) {
        return json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const body = await req.json().catch(() => ({})) as {
      batchSize?: number
      leaseSeconds?: number
      retryDelaySeconds?: number
      maxAttempts?: number
      mode?: string
      provider?: string
    }

    const supabaseUrl = getRequiredEnv('SUPABASE_URL')
    const serviceRoleKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY')

    const batchSize = Math.min(Math.max(body.batchSize ?? getIntEnv('NOTIFICATION_EMAIL_BATCH_SIZE', 25), 1), 100)
    const leaseSeconds = Math.min(Math.max(body.leaseSeconds ?? getIntEnv('NOTIFICATION_EMAIL_LEASE_SECONDS', 300), 30), 3600)
    const retryDelaySeconds = Math.min(Math.max(body.retryDelaySeconds ?? getIntEnv('NOTIFICATION_EMAIL_RETRY_DELAY_SECONDS', 300), 15), 86400)
    const maxAttempts = Math.min(Math.max(body.maxAttempts ?? getIntEnv('NOTIFICATION_EMAIL_MAX_ATTEMPTS', 5), 1), 100)
    const providerId = resolveEmailProviderId(body)
    const provider = createEmailProviderAdapter(providerId)

    const workerId = `notification-email-worker:${crypto.randomUUID()}`
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: claimed, error: claimError } = await supabaseAdmin.rpc('notification_worker_claim_email_queue', {
      _batch_size: batchSize,
      _worker_id: workerId,
      _lease_seconds: leaseSeconds,
      _max_attempts: maxAttempts,
    })

    if (claimError) {
      throw new Error(`Failed to claim queue batch: ${claimError.message}`)
    }

    const queueItems = (claimed ?? []) as QueueItem[]
    const results: Array<{ id: string; outcome: 'sent' | 'failed' | 'discarded'; error?: string }> = []

    for (const queueItem of queueItems) {
      const result = await processQueueItem(supabaseAdmin, queueItem, {
        provider,
        workerId,
        maxAttempts,
        retryDelaySeconds,
      })

      results.push({
        id: queueItem.id,
        outcome: result.outcome,
        ...(result.error ? { error: result.error } : {}),
      })
    }

    const summary = results.reduce(
      (acc, item) => {
        acc[item.outcome] += 1
        return acc
      },
      { sent: 0, failed: 0, discarded: 0 },
    )

    return json({
      ok: true,
      provider: provider.id,
      workerId,
      claimedCount: queueItems.length,
      processedCount: results.length,
      summary,
      durationMs: Date.now() - startedAt,
      results,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('notification-email-worker failed:', message)
    return json({ ok: false, error: message }, { status: 500 })
  }
})
