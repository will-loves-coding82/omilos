## Overview
Omilos is a real-time outing planner that lets a host chain together multiple stops for a group hangout, with live visibility into who's on the way, arrived, or running behind at each one.

## Core Project Files
```text
omilos-frontend/
├── app/
│   ├── (dashboard)/
│   ├── (home)/
│   ├── api/webhooks/
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
3. Navigate to the root project directory and start the docker postgres service using the following commands. We need to export the variables so the Docker service can copy them to its container:
    ```
    source ../set-env.sh .env
    docker compose up postgres -d
    ```
3. In a new terminal, open the backend folder and start the Go HTTP server:
    ```
    source ../set-envh.sh .env
    air
    ```
4. In the same backend directory, launch ngrok using this command:
    ```
    ngrok http 3000 --url https://ethanol-arena-drab.ngrok-free.dev
    ```
4. Open the frontend folder in a different terminal and start the web app:
    ```
    npm run dev
    ```

## Authentication
User auth and identity claims are managed via Clerk. To get access to the Clerk dashboard for Omilos, contact the owner for access.