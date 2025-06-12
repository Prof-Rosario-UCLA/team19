# Hearts

A multiplayer implementation of Hearts - the classic card game - for CS144 S25.

## Table of Contents

- [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
    - [Development](#development)
    - [Building for Production](#building-for-production)
- [Contributing](#contributing)
    - [Branch Structure](#branch-structure)
    - [Workflow](#workflow)

## Getting Started

### Prerequisites

- Node.js (LTS, v18+)
- npm
- Git
- The `.env` file for secrets

### Installation

1. Clone the repository:

```bash
git clone https://github.com/Prof-Rosario-UCLA/team19.git
cd project-name
```

2. Install dependencies for client, server and testing:

```bash
# Install testing dependencies
npm install

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### Development

Run the development servers for both client and server:

```bash
# In the client directory
cd client
npm run dev

# In a separate terminal, in the server directory
cd server
npm run dev
```

The client will be available at http://localhost:5173
The server will be available at http://localhost:3000

### Building for Production

To build the application for production:

```bash
# From the root directory
npm run build
```

Note that a new production version is continually built automatically to GKE from the latest changes on main.

## Contributing

### Branch Structure

Our repository uses the following branch structure:

- `main`: Production-ready code
- `nightly`: Integration branch for testing, automatically merged to main if tests pass
- Other branches: Created as needed for new features or bug fixes

### Workflow

1. **Create a `feature` branch or `fix` branch** from either main or nightly
   ```bash
   git checkout main
   git pull
   git checkout -b feature/your-branch-name
   ```

2. **Make changes** and commit them
   ```bash
   git add .
   git commit -m "Description of your changes"
   ```

3. **Push your branch** to the remote repository
   ```bash
   git push -u origin feature/your-branch-name
   ```

4. **Open a pull request** to the nightly branch (Set "base" to `nightly`)

5. **After review and approval**, your changes will be merged into the nightly branch

6. **Nightly integration** runs at midnight (UTC), and if all tests pass, nightly is automatically merged into main

## Deployment Instructions
We recommend deploying using GitHub Actions. Specifically, in the CI/CD pipeline you can manually trigger all three
stages to run from whatever code is in nightly/main. 

If you need manual instructions, here is minimally how to deploy the app.

1. Checkout the `main` branch
2. Build the project
```bash
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
node --loader ts-node/esm build.ts
```
3. Obtain the necessary `.env` and put it in `/server` and source them
```bash
set -o allexport
source server/.env
set +o allexport
```
4. Build and push Docker image
```angular2html 
gcloud auth configure-docker

docker build --platform linux/amd64 \
  --build-arg DB_HOST="$DB_HOST" \
  --build-arg DB_NAME="$DB_NAME" \
  --build-arg DB_USER="$DB_USER" \
  --build-arg DB_PASSWORD="$DB_PASSWORD" \
  --build-arg JWT_SECRET="$JWT_SECRET" \
  --build-arg NODE_ENV="production" \
  -t hearts-game-server .

export GKE_PROJECT=cs144-25s-tahsin4466
export GITHUB_SHA=$(git rev-parse HEAD)

docker tag hearts-game-server gcr.io/$GKE_PROJECT/hearts-game-server:$GITHUB_SHA
docker tag hearts-game-server gcr.io/$GKE_PROJECT/hearts-game-server:latest
docker push gcr.io/$GKE_PROJECT/hearts-game-server:$GITHUB_SHA
docker push gcr.io/$GKE_PROJECT/hearts-game-server:latest
```

5. Deploy to GKE
```bash
kubectl delete secret hearts-app-secrets --ignore-not-found=true
kubectl create secret generic hearts-app-secrets \
  --from-env-file=server/.env
kubectl apply -f kubernetes/deployment.yaml
kubectl apply -f kubernetes/service.yaml
kubectl apply -f kubernetes/ingress.yaml
```

6. Update the deployment
```bash
kubectl set image deployment/hearts-game-deployment \
  hearts-game-server=gcr.io/$GKE_PROJECT/hearts-game-server:$GITHUB_SHA

kubectl rollout status deployment/hearts-game-deployment
```


## REST API Endpoints
1. `/auth/register` Registers a new user using internal auth
2. `/auth/login` logs in a new user using internal auth
3. `/leaderboard/` GET requests the leaderboard
4. `/room/` Joins last authenticated/joined room
5. `/room/room_code/` Gets room info identified by a specific code
6. `/room/room_code/join` Joins a specific room identified by its code (logged in player)
7. `/room/room_code/join-guest` Joins a specific room identified by its code (guest)
8. `/room/room_code/leave` Leaves a room 
9. `/room/room_code/end` Ends a game and deletes the room (if game finishes or all players leave lobby)
10. `/user_id (GET)` Gets user info by ID
11. `/user_id (PUT)` Updates a user by ID (unused)
12. `/user_id/stats` Gets aggregated game stats (unused)