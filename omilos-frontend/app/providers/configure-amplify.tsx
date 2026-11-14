"use client";

import { useEffect } from "react";
import { Amplify } from "aws-amplify";
import { useAuth } from "@clerk/nextjs";

// NEXT_PUBLIC_* vars are inlined into the client bundle at build time,
// so they must be referenced literally (no dynamic process.env[key] access).
const endpoint = process.env.NEXT_PUBLIC_APPSYNC_EVENTS_ENDPOINT;
const region = process.env.NEXT_PUBLIC_APPSYNC_AWS_REGION;

// Set by <ConfigureAmplify /> once Clerk is available. Amplify's token provider calls it.
let getClerkToken: (() => Promise<string | null>) | null = null;

// Decodes a JWT's payload without verifying it. AppSync does the verification;
// Amplify only reads `sub` from the payload and sends the raw token via toString().
function toAmplifyJWT(token: string) {
  const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  const payload = JSON.parse(atob(base64));
  return { payload, toString: () => token };
}

if (endpoint) {
  Amplify.configure(
    {
      API: {
        Events: {
          endpoint,
          region,
          defaultAuthMode: "oidc",
        },
      },
    },
    {
      ssr: true,
      Auth: {
        // For "oidc", Amplify takes the token for the WebSocket connection handshake from this
        // provider. An `authToken` passed to events.connect() only reaches subscribe/publish
        // messages, so without this the handshake fails with "Required headers are missing".
        // Amplify calls this on every connect, subscribe, publish and reconnect, so the
        // short-lived Clerk token is always fresh.
        tokenProvider: {
          async getTokens() {
            const token = await getClerkToken?.();
            return token ? { accessToken: toAmplifyJWT(token) } : null;
          },
        },
      },
    },
  );
} else {
  console.warn(
    "[amplify] NEXT_PUBLIC_APPSYNC_EVENTS_ENDPOINT is not set; real-time events are disabled.",
  );
}

// Rendered once inside <ClerkProvider> in the root layout. Importing this module runs
// Amplify.configure() in the browser; the component hands Clerk's getToken to Amplify.
export function ConfigureAmplify() {
  const { getToken } = useAuth();

  useEffect(() => {
    getClerkToken = () => getToken();
    return () => {
      getClerkToken = null;
    };
  }, [getToken]);

  return null;
}
