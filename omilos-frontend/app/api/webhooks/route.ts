import { API_ROUTES } from '@/app/constants'
import { verifyWebhook } from '@clerk/nextjs/webhooks'
import { NextRequest } from 'next/server'
import { createHmac } from 'crypto'

function signBody(body: string, secret: string) {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const signature = createHmac('sha256', secret)
    .update(`${timestamp}.${body}`)
    .digest('hex')
  return { timestamp, signature }
}

async function forwardToBackend(url: string, payload: unknown, secret: string) {
  const body = JSON.stringify(payload)
  const { timestamp, signature } = signBody(body, secret)

  return fetch(url, {
    method: 'POST',
    signal: AbortSignal.timeout(8000),
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Timestamp': timestamp,
      'X-Webhook-Signature': signature,
    },
    body,
  })
}

export async function POST(req: NextRequest) {
  const secret = process.env.INTERNAL_WEBHOOK_SECRET
  if (!secret) {
    console.error('INTERNAL_WEBHOOK_SECRET not configured')
    return new Response('Server misconfigured', { status: 500 })
  }

  let evt
  try {
    evt = await verifyWebhook(req)
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error verifying webhook', { status: 400 })
  }

  switch (evt.type) {
    case 'user.created': {
      try {
        const res = await forwardToBackend(API_ROUTES.users.create, evt.data, secret)
        if (!res.ok) {
          console.error('Backend rejected user.created', { status: res.status, clerkId: evt.data.id })
          return new Response('Error syncing user', { status: 502 })
        }
      } catch (err) {
        console.error('Error reaching backend to sync user:', err)
        return new Response('Error syncing user', { status: 502 })
      }
      return new Response('User synced', { status: 200 })
    }

    default:
      // events you aren't handling
      return new Response('Ignored', { status: 200 })
  }
}