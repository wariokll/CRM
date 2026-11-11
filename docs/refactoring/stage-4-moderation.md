# Этап 4. Backend modules — moderation

Дата: 2026-11-11
Ветка: `refactor/stage-4-moderation`

## Что сделано

- До переноса добавлены интеграционные тесты approval cascade и причины отклонения; оба прошли на старом и новом маршрутах.
- `backend/src/routes/moderation.ts` разделён на routes/controller/service/schemas в `backend/src/modules/moderation/` и удалён.
- Существующие API characterization snapshots не менялись.

## Проверка

`npm run verify` завершился с кодом 0:

- Frontend unit: 3 теста.
- Backend: 68 тестов.
- Playwright: 10 smoke-тестов.
- TypeScript, ESLint, Prettier и production builds прошли.

## Сохранённое поведение

Подтверждены список ожидающих пользователей/организаций/магазинов, активация связанных pending organization и store при подтверждении клиента, а также 400 при отклонении без причины. Сохранены status codes и JSON shape; API/UI/БД не менялись.
