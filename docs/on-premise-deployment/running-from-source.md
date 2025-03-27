# Running From Source

### Building Sequence

**Requirements**

* Node version 14 and greater
* Postgres version 11 and greater

**Recommended**

* A Sendgrid API Key to send emails
* Read `/packages/api/.env.example` to configure your environment variables.

Setting up Sequence with **Docker Compose** is easy:

```
git clone https://github.com/sequence-so/sequence
cd sequence
./build/copy_env # Copy sample environment variables
docker compose up
```

Open `http://0.0.0.0:8000` to see the application.

### API Proxy Configuration

Sequence uses a Next.js API proxy to handle all API communications. This setup:
- Eliminates CORS issues
- Simplifies environment configuration
- Improves security by not exposing the API directly
- Maintains authentication flow

The proxy is automatically configured when using Docker Compose. The application will be available at:
- UI: http://0.0.0.0:8000
- API: http://0.0.0.0:3000 (internal only, proxied through Next.js)

Key environment variables:
```bash
# Development
NEXT_PUBLIC_API_URL=/api           # Public API endpoint (proxied)
NEXT_PRIVATE_API_URL=http://api:3000  # Internal container communication
DEV_UI_URL=http://localhost:8000   # Development UI URL

# Production
NEXT_PUBLIC_API_URL=/api           # Public API endpoint (proxied)
NEXT_PRIVATE_API_URL=http://api:3000  # Internal container communication
```

If you'd like to run the application in development mode:

```text
git clone https://github.com/sequence-so/sequence
cd sequence
yarn bootstrap
./build/copy_env
yarn dev
```

Please reach out if any errors occur at `support@sequence.so`.

