.PHONY: dev dev-up dev-down dev-logs dev-shell

# Start development environment with hot reloading
dev-up:
	docker compose -f docker-compose.dev.yml up --build

# Stop development environment
dev-down:
	docker compose -f docker-compose.dev.yml down -v

# View logs
dev-logs:
	docker compose -f docker-compose.dev.yml logs -f app

# Enter app container shell
dev-shell:
	docker compose -f docker-compose.dev.yml exec app bash

# Restart only app service
dev-restart:
	docker compose -f docker-compose.dev.yml restart app

# Clean everything
dev-clean:
	docker compose -f docker-compose.dev.yml down -v
	 