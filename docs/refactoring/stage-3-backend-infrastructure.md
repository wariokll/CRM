# Этап 3. Backend infrastructure

Дата: 2026-11-11
Ветка: `refactor/stage-3-backend-infrastructure`

## Что сделано

- Добавлена Zod-проверка окружения в `backend/src/config.ts`; сохранены прежние имена переменных, значения по умолчанию и ограничения.
- Общие ошибки собраны в `backend/src/shared/errors.ts`: `AppError`, `NotFoundError`, `ForbiddenError`, `ValidationError`, `ConflictError`.
- Middleware перенесены в `backend/src/shared/middleware/`: authentication/role guard, permission guard, error handler, body validation, logger и rate limit.
- Все backend-маршруты, типы Express и модули переведены на импорты из `shared/`; прежние файлы `middleware/auth.ts`, `middleware/errors.ts`, `utils/permissions.ts`, `utils/app-error.ts` удалены.
- Login rate limiter и request logger теперь подключаются из общего слоя. Для E2E добавлен отдельный Vite config с proxy на изолированный backend; завершение E2E серверов учитывает дерево процессов Windows.

## Проверка

`npm run verify` завершился с кодом 0:

- Frontend unit: 3 теста.
- Backend: 48 тестов.
- Playwright: 10 smoke-тестов.
- TypeScript, ESLint, Prettier и production builds прошли.

Есть 10 ранее существовавших ESLint warnings. Проверка Prisma продолжает сообщать только известный drift длин полей `organization_contacts.full_name` и `phone`; схема БД по правилам ТЗ не менялась.

## Тесты и отклонения

Существующие тесты и их ожидания не менялись. Новые backend-модульные тесты добавлены на следующем этапе до переноса первого маршрута.

Формат ответов middleware и авторизации сохранён по characterization suite. Отдельный E2E Vite config устраняет зависимость тестового proxy от локального приложения на порту 3001.
