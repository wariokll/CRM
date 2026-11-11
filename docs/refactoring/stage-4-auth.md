# Этап 4. Backend modules — auth

Дата: 2026-11-11
Ветка: `refactor/stage-4-auth`

## Что сделано

- До разделения добавлены тесты на неверный пароль и заблокированный аккаунт; успешная регистрация, login, refresh, logout и `/me` уже покрывались неизменённым API characterization suite.
- Auth разделён на `auth.routes.ts`, `auth.controller.ts`, `auth.service.ts` и `auth.schemas.ts` в `backend/src/modules/auth/`.
- Валидация выполняется общим `validateBody`, login rate limiter и authentication остаются общими middleware.
- `app.ts` подключает feature router; прежний `backend/src/routes/auth.ts` удалён.
- Существующие characterization тесты и snapshot не редактировались.

## Проверка

`npm run verify` завершился с кодом 0:

- Frontend unit: 3 теста.
- Backend: 55 тестов, включая 2 новых auth-теста.
- Playwright: 10 smoke-тестов.
- TypeScript, ESLint, Prettier и production builds прошли.

## Сохранённое поведение

Существующие тесты подтверждают форму регистрации, cookie атрибуты/путь, токены login/refresh, logout и `/me`. Новые тесты проверяют HTTP 401 при неверном пароле и HTTP 403 для заблокированного пользователя. API, UI и схема БД не менялись.
