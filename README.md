## Overview
Omilos is a real-time outing planner that lets a host chain together multiple stops for a group hangout, with live visibility into who's on the way, arrived, or running behind at each one.

## Core Project Files
```text
omilos-frontend/
├── app/
│   ├── (dashboard)/
│   ├── (home)/
│   ├── api/webhooks/
│   ├── providers/
│   ├── actions.ts
│   └── .env
omilos-backend/
├── cmd/main.go
├── internal/
│   ├── app/
│   ├── database/
│   └── server/
├── sql/init/
├── tygo.yml
├── air.toml
├── docker-compose.yml
└── .env
```

## Tool Installation
1. Install the latest go version on your machine via `homebrew install go`
2. Update your `PATH` to point to the golang binary
   ```
   vi ~/.zshrc # nano ~/.bashrc

   # Add this line to your file and save it
   export PATH=$PATH:/usr/local/go/bin
   ```
3. To support server hot-reloading, install air
    ```
    go install github.com/air-verse/air@latest
    ```
4. Install Docker Desktop on your machine. Vist this page for [instructions](https://www.docker.com/products/docker-desktop/)
5. The application requires port forwarding in order for wehbook workflows. Make sure to install ngrok on your machine ([Macos](https://ngrok.com/download/mac-os) or [Windows](https://ngrok.com/download/windows))

## Development Setup
1. Fill out each `.env` file in the backend and frontend folders. Contact the project owner if you need private access to these variable values 
3. Navigate to the **root** project directory and start the docker postgres service using the following commands. We need to export the variables so the Docker service can copy them to its container:
    ```
    source set-env.sh omilos-frontend/.env
    docker compose up postgres -d
    ```
3. In a new terminal, open the backend folder and start the Go HTTP server:
    ```
   source set-env.sh omilos-backend/.env
    air
    ```
4. In a new terminal in the same backend directory, launch ngrok using this command:
    ```
    ngrok http 3000 --url https://ethanol-arena-drab.ngrok-free.dev
    ```
4. Open the frontend folder in a different terminal and start the web app:
    ```
    npm run dev
    ```


## Generating Types
During development, schema and data requirements can frequently change in the backend so it is important to ensure these changes are synced with the frontend to consume these properly. However, manually updating the types to ensure consistency takes up a significant amount of time and requires difficult context switching.

To minimize overhead, the project leverages a tool called `tygo` which reads a subset of Golang files that define your structs & types and converts them to TypeScript types using the following commands:
```
# Run this from the omilos-backend/ folder
tygo generate
```

Tygo is configured to write the resulting TypeScript file to the `omilos-frontend/app/types/api-types.ts` file. A similar adjacent `client-types.ts` contains functions that handle the conversion of API data shapes to be customized and used on the frontend. Exceptions can be made in certain cases where frontend components can directly import an API type but the general rule is to convert between the two. To configure the behavior of tygo, you can edit the `/omilos-backend/tygo.yaml` file. 

## Authentication and Webhooks
`Clerk` is a 3rd party authentication service that is used to manage user signins, signups, profile updates, deletion, etc. However by default, user information lives in Clerk's system so syncing these identity claims in our PostgreSQL database requires a strategy called `webhooks` which are custom HTTP endpoints that allow two applications to communicate with each other and send events asynchronously. 

The Next.js frontend project defines a special `api/webhooks/` route handler that listens for events pushed from Clerk. For example, when a user signs up for the first time, an HTTP request containing the event payload (user info) is extracted and sent to a Golang API endpoint. An internal shared secret key is used in this last network hop along with HMAC signatures to verify that the request hasn't been tampered with while it was traveling. Once the API endpoint verifies the request is valid, the application proceeds with inserting the new user in the database. Should any errors outside of the 2xx range occur, Clerk will attempt to invoke the webhook endpoint with exponential backoff retries.

