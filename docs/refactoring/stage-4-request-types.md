# Этап 4. Backend modules — request types

Дата: 2026-11-11
Ветка: `refactor/stage-4-request-types`

## Что сделано

- До переноса добавлены тесты на defaults/nested component requirements, замену требований через PATCH, web visibility для CLIENT и permission deny.
- `backend/src/routes/request-types.ts` разделён на routes/controller/service/schemas/mapper в `backend/src/modules/request-types/` и удалён.
- Повторяющийся Prisma include вынесен в mapper. Текущий дублирующий component validation message сохранён.
- Существующий API characterization suite и snapshots не редактировались.

## Проверка

`npm run verify` завершился с кодом 0:

- Frontend unit: 3 теста.
- Backend: 63 теста, включая 3 новых теста модуля.
- Playwright: 10 smoke-тестов.
- TypeScript, ESLint, Prettier и production builds прошли.

## Сохранённое поведение

Для CLIENT сохранён фильтр активных типов, доступных на web. Create defaults, nested component list sorting, replacement component requirements on PATCH, permission gate и HTTP response shapes покрыты тестами. API, UI и schema БД не менялись.
