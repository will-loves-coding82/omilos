import { BASE_URL, USERS_ENDPOINT } from '@/app/constants'
import { verifyWebhook } from '@clerk/nextjs/webhooks'
import { NextRequest } from 'next/server'


// If the route handler returns a 4xx or 5xx code, or no code at all, 
// the webhook event will be retried. If the route handler returns a 2xx code, 
// the event will be marked as successful, and retries will stop.
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
      case "user.created": {
        // call create user endpoint
        try {
          const res = await fetch(BASE_URL + USERS_ENDPOINT, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(evt.data)
          })
          
          if (res.status !== 200) {
            console.log("error syncing user")
            return new Response('Error syncing user', { status: res.status})
          }

        } catch (err) {
          console.error('Error reaching backend to sync user:', err)
          // backend unreachable - retryable, let Clerk retry the webhook
          return new Response('Error syncing user', { status: 502 })
        }

    
        return new Response('User successfully synced', {status: 200})
      }

      case "user.updated":
        // call user updated endpoint
        break
    }

    return new Response('Webhook received', { status: 200 })
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error verifying webhook', { status: 400 })
  }
}