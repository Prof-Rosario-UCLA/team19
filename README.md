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

This will:
1. Build the client (Svelte + Tailwind)
2. Build the server (Express)
3. Copy the client build to the server's public directory

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

6. **Nightly integration** runs at midnight, and if all tests pass, nightly is automatically merged into main

### Unit Testing

To use our testing infrastructure, run any of the following commands:
- `npm run test` to run all tests, including unit, integration and infrastructure
- `npm run test:unit` to run unit tests only
- `npm run test:integration` to run integration tests only
- `npm run test:coverage` to run all tests alongside nyc code coverage results

### CI/CD Pipeline

Our project uses GitHub Actions for continuous integration and deployment:

- **On pull requests to main or nightly**: Builds and runs unit tests on the code
- **On nightly schedule**: Builds and runs both unit and integration tests. If successful, merges nightly into main
- **On push to main**: Builds, tests, and deploys to production in GKE

You can check the status of workflows in the "Actions" tab of the repository.
