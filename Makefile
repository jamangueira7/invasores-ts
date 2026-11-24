.PHONY: up down logs test check prod

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
prod:
	docker compose -f docker-compose.prod.yml up -d --build && echo "→ http://localhost:8080"
