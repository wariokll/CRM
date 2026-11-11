# Этап 4. Backend modules — components

Дата: 2026-11-11
Ветка: `refactor/stage-4-components`

## Что сделано

- До переноса добавлены characterization-тесты на создание, trim, patch и отказ роли без `MANAGE_TEMPLATES`; тесты прошли на исходном маршруте.
- `backend/src/routes/components.ts` разделён на routes/controller/service/schemas в `backend/src/modules/components/` и удалён.
- `app.ts` подключает feature router. Существующий API characterization suite и snapshots не менялись.

## Проверка

`npm run verify` завершился с кодом 0:

- Frontend unit: 3 теста.
- Backend: 60 тестов.
- Playwright: 10 smoke-тестов.
- TypeScript, ESLint, Prettier и production builds прошли.

Smoke конфигурация отключает сетевые Google Fonts и замедляет браузерные действия на 150 мс, чтобы загрузка страницы/доски успевала завершиться до следующего действия.

## Сохранённое поведение

Сортировка каталога, нормализация имени, create/patch статусы и permission gate сохранены. API, UI и схема БД не менялись.
