# Этап 4. Backend modules — staff

Дата: 2026-11-11
Ветка: `refactor/stage-4-staff`

## Что сделано

- До переноса добавлены тесты на создание staff member с department membership и self-role protection директора.
- `backend/src/routes/staff.ts` разделён на routes/controller/service/schemas/mapper в `backend/src/modules/staff/` и удалён.
- Вынесены списки/изменения сотрудников, access transaction, password update и Telegram link generation.
- API characterization suite и snapshots не менялись.

## Проверка

`npm run verify` завершился с кодом 0:

- Frontend unit: 3 теста.
- Backend: 70 тестов.
- Playwright: 10 smoke-тестов.
- TypeScript, ESLint, Prettier и production builds прошли.

## Сохранённое поведение

Сохранены permission gates, role/department membership defaults, replacement of access rows in transaction, защита собственной роли, password 204 и срок/формат Telegram deep link. API/UI/схема БД не менялись.
