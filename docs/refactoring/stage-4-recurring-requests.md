# Этап 4. Backend modules — recurring requests pilot

Дата: 2026-11-11
Ветка: `refactor/stage-4-recurring-requests`

## Что сделано

- До переноса добавлены пять интеграционных characterization-тестов на текущий `POST /api/recurring-requests/:id/stop`.
- Логику остановки расписания вынесено в `backend/src/modules/recurring-requests/recurring-requests.service.ts`.
- HTTP-ответы выделены в тонкий controller; route-файл оставляет регистрацию маршрута и authentication middleware.
- Регистрация модуля перенесена в `app.ts`; прежний `backend/src/routes/recurring-requests.ts` удалён.
- Тесты пилотного модуля лежат рядом с модулем. Существующий characterization suite и его snapshot не менялись.

## Проверка

`npm run verify` завершился с кодом 0:

- Frontend unit: 3 теста.
- Backend: 53 теста, включая 5 новых тестов модуля.
- Playwright: 10 smoke-тестов.
- TypeScript, ESLint, Prettier и production builds прошли.

## Сохранённое поведение и ограничения

Тесты проверяют отказ CLIENT, 404 для отсутствующего расписания, запрет роли без доступа к отделу, перевод активного расписания в inactive и повторный запрос к уже inactive расписанию. Статусы и форма ответа прежние; API, UI и схема БД не менялись.
