# Docker runtime verification guide

## 1) Изменённые файлы
- `Dockerfile`
- `docker-compose.yml`
- `.env`
- `package.json`
- `frontend/vite.config.ts`
- `src/app.js`

## 2) Как запускается `app`
- В `docker-compose.yml` сервис `app` запускается командой:
  - `npm run dev`
- Скрипт `dev` (root `package.json`) запускает одновременно:
  - backend: `npm run backend` (Express на `3000`)
  - frontend: `npm run frontend` (Vite dev server на `8080`)

## 3) Build frontend vs `npm run dev`
- Для dev-окружения в одном контейнере используется Vite dev server (`npm run dev`).
- Шаг `npm run build --prefix frontend` из Dockerfile удалён как лишний для данного runtime-сценария.
- Если нужен production runtime, рекомендуется отдельный prod Dockerfile/target с `npm run build` + статическая раздача собранных файлов.

## 4) Подъём compose и проверка доступности
```bash
docker compose up --build
```

Проверки:
```bash
curl -f http://localhost:3000/health
curl -I http://localhost:8080
curl -I http://localhost:8081
```

## 5) Проверка Kafka-интеграции
- Backend подключается к Kafka через `.env` (`KAFKA_BROKERS=kafka:9093`).
- Kafka UI подключён к `kafka:9093`.
- Для проверки событий notifications:
  1. Создать notification через API backend.
  2. Открыть Kafka UI (`http://localhost:8081`) → topic `notifications`.
  3. Убедиться, что появилось сообщение.

## 6) Healthcheck
- `app`: добавлен (`GET /health`).
- `kafka`: добавлен (`kafka-topics.sh --list`).

## 7) Demo consumer
- Добавлен отдельный сервис `demo-consumer` в compose.
- Он запускается профилем `demo`:
```bash
docker compose --profile demo up --build
```
