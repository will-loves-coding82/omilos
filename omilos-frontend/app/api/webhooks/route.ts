import { BASE_URL, USERS_ENDPOINT } from '@/app/constants'
import { verifyWebhook } from '@clerk/nextjs/webhooks'
import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const evt = await verifyWebhook(req)

    // Do something with payload
    // For this guide, log payload to console
    const { id } = evt.data
    const eventType = evt.type
    console.log(`Received webhook with ID ${id} and event type of ${eventType}`)
    console.log('Webhook payload:', evt.data)

    switch (eventType) {
      case "user.created":
        // call create user endpoint
        const res = await fetch(BASE_URL+USERS_ENDPOINT, {
          method: "POST",
        })

        const data = await res.json()
        console.log(data)
      
      case "user.updated":
        // call user updated endpoint
    }

    return new Response('Webhook received', { status: 200 })
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error verifying webhook', { status: 400 })
  }
}