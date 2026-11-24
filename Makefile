.PHONY: up down logs test check test-int e2e screenshot prod

up:
	docker compose up -d && echo "→ http://localhost:5175"
down:
	docker compose down
logs:
	docker compose logs -f
test:
	docker compose run --rm --no-deps install pnpm test
check:
	docker compose run --rm --no-deps install pnpm check
test-int:
	docker compose run --rm api pnpm --filter api test:int
e2e:
	docker compose run --rm e2e
screenshot:
	docker compose run --rm e2e npx --yes pnpm@9.15.0 --filter e2e screenshot
prod:
	docker compose -f docker-compose.prod.yml up -d --build && echo "→ http://localhost:8080"
