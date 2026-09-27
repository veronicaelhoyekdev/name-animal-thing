# Name Animal Thing

Real-time multiplayer web application based on the classic **Name, Animal, Thing** game, built with Node.js, Express, MongoDB, and Socket.IO.

## Overview

Name Animal Thing is a full-stack multiplayer application that brings the traditional category-based word game to the browser.

The application combines persistent user accounts, session-based authentication, game management, and real-time client-server communication. Express provides the HTTP application layer, MongoDB handles persistent data, and Socket.IO enables live interactions between players.

## Features

- User registration and authentication
- Session-based access control
- User profiles and avatar management
- Game creation and multiplayer sessions
- Real-time client-server communication
- Persistent application data
- Contact and messaging functionality

## Tech Stack

| Layer | Technologies |
| --- | --- |
| Frontend | HTML, CSS, JavaScript |
| Backend | Node.js, Express.js |
| Real-time | Socket.IO |
| Database | MongoDB |
| Authentication | Express Session, bcrypt |
| Configuration | dotenv |

## Architecture

```text
Browser
   │
   ├── HTTP ──────────────► Express
   │                         │
   │                         ├── Authentication & Sessions
   │                         ├── Application Routes
   │                         └── MongoDB
   │
   └── WebSocket ──────────► Socket.IO
                              │
                              └── Real-time Game Events
```

The backend serves the web application and exposes the routes required for authentication, profiles, game management, and application data.

Socket.IO maintains bidirectional communication with connected clients for multiplayer interactions, while MongoDB provides persistent storage.

## Project Structure

```text
.
├── css/              # Stylesheets
├── html/             # Application views
├── js/               # Client-side logic
├── ressources/       # Static assets
├── server.js         # Express server and Socket.IO logic
├── package.json      # Dependencies and scripts
├── .env.example      # Environment configuration template
└── .gitignore
```

## Getting Started

### Prerequisites

- Node.js
- npm
- MongoDB instance

### Installation

```bash
git clone https://github.com/veronica-el-hoyek/nameanimalthing.git
cd nameanimalthing
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Configure the required variables:

```env
MONGODB_URI=your_mongodb_connection_string
SESSION_SECRET=your_session_secret
```

Start the application:

```bash
npm start
```

## Security

Application secrets and database credentials are provided through environment variables and excluded from version control.

Passwords are stored as cryptographic hashes using bcrypt rather than as plaintext.

## Project Context

Full-stack web development project focused on backend architecture, persistent data management, authentication, and real-time multiplayer communication.

## Author

**Veronica El Hoyek**  
Software & AI Engineer

Portfolio: https://veronica-el-hoyek.vercel.app/  
GitHub: https://github.com/veronica-el-hoyek