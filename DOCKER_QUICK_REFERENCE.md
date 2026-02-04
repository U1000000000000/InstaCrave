# Docker Quick Reference (InstaCrave)

This repo ships two Compose stacks:

- `docker-compose.yml` (dev): hot-reload + volume mounts
- `docker-compose.prod.yml` (prod): built images + minimal mounts

If you prefer wrappers, use `./docker-dev.sh` (macOS/Linux) or `docker-dev.bat` (Windows). Otherwise use the Compose commands below.

## Dev (docker-compose.yml)

Start / stop:

```bash
docker compose up -d --build
docker compose ps

docker compose logs -f backend
docker compose logs -f frontend

docker compose down
```

URLs (dev stack):

- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- API docs: http://localhost:3000/docs

Reset data (MongoDB + Redis):

```bash
docker compose down -v
```

## Prod (docker-compose.prod.yml)

Create your env file once:

```bash
cp .env.prod.example .env.prod
```

Run:

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend
```

URLs (prod stack):

- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- API docs: http://localhost:5000/docs

Stop:

```bash
docker compose -f docker-compose.prod.yml down
```

## Minimal Troubleshooting

- Port conflicts: stop the stack with `docker compose down` and re-run.
- Stuck containers/volumes: `docker compose down -v` (dev) or `docker compose -f docker-compose.prod.yml down -v` (prod).
