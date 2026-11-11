# Этап 4. Backend modules — users

Дата: 2026-11-11
Ветка: `refactor/stage-4-users`

## Что сделано

- До переноса добавлены тесты на создание клиента с organization/store, поиск, отклонение с обязательной причиной и смену пароля.
- `backend/src/routes/users.ts` разделён на routes/controller/service/schemas в `backend/src/modules/users/` и удалён.
- Поисковая выдача с flatten списка stores осталась частью service; исходный порядок сортировки и permission gate сохранены.
- API characterization suite и snapshots не редактировались.

## Проверка

`npm run verify` завершился с кодом 0:

- Frontend unit: 3 теста.
- Backend: 66 тестов, включая 3 новых теста модуля.
- Playwright: 10 smoke-тестов.
- TypeScript, ESLint, Prettier и production builds прошли.

## Сохранённое поведение

Клиент создаётся активным вместе с активными organization/store. Status update сохраняет rejection reason только для `REJECTED`; password update отвечает пустым HTTP 204. API, UI и schema БД не менялись.
