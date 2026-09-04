.PHONY: install lint format test cov run docker-build docker-run

install:
	pip install -r requirements-dev.txt

lint:
	ruff check .
	black --check .

format:
	ruff check --fix .
	black .

test:
	pytest -q

cov:
	pytest --cov=app --cov-report=term-missing

run:
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

docker-build:
	docker build -t cyclonesense-api:local .

docker-run: docker-build
	docker run --rm -p 8000:8000 cyclonesense-api:local
