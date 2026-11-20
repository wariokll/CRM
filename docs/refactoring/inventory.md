# Инвентаризация CRM после этапа 8

Дата: 2026-11-20
Ветка: `refactor/stage-8`
Основание: ТЗ «рефакторинг CRM» и завершённые этапы 0–8.6.

Этот документ отражает текущее состояние файлов и архитектуры. Исторический снимок до рефакторинга содержится в Git до этапа 8; поведение HTTP endpoints и качество их characterization-тестов описывает [матрица этапа 8.3](stage-8-3-endpoint-matrix.md).

## 1. Карта проекта

- Frontend: React, TypeScript и Vite; приложение и страницы находятся в `src/`, общие типы — в `src/types/`, feature-код — в `src/features/`.
- Backend: Express 5 и TypeScript в `backend/src/`; маршруты организованы в `backend/src/modules/` с разделением routes, controllers и services там, где это применимо. Запуск приложения и сервер находятся в `backend/src/app.ts` и `backend/src/server.ts`.
- Хранилище: Prisma 6 и MariaDB; схема — `backend/prisma/schema.prisma`, миграции — `backend/prisma/migrations/` (14 миграций).
- В `backend/src/modules/` находятся 14 модулей: `auth`, `boards`, `components`, `departments`, `knowledge`, `moderation`, `organizations`, `recurring-requests`, `request-types`, `requests`, `staff`, `stores`, `telegram`, `users`.
- Во `src/features/` находятся 12 feature-папок: `auth`, `boards`, `dashboard`, `knowledge`, `layout`, `organizations`, `reports`, `requests`, `staff`, `stores`, `telegram`, `templates`.
- Исходные `.ts` и `.tsx` файлы в `backend/src/` и `src/`: 213 (включая тесты).

## 2. Крупнейшие текущие файлы

Размеры посчитаны по строкам исходного TypeScript/TSX на дату снимка. Размер сам по себе не доказывает смешение ответственностей.

| Строк | Файл | Содержание |
|---:|---|---|
| 711 | `backend/src/modules/requests/request.service.ts` | Сервис заявок и связанные операции |
| 705 | `backend/src/telegram/bot-handlers.ts` | Обработчики Telegram команд и сообщений |
| 658 | `src/features/boards/BoardsPage.tsx` | Контейнер страницы досок и координация UI |
| 641 | `src/features/knowledge/KnowledgePage.tsx` | Контейнер базы знаний и координация действий |
| 620 | `backend/src/modules/boards/board.service.ts` | Сервис досок |
| 319 | `backend/src/modules/boards/board-api.characterization.test.ts` | HTTP characterization досок |
| 292 | `backend/src/modules/stores/stores.service.ts` | Сервис торговых точек |
| 281 | `backend/src/modules/knowledge/knowledge.service.ts` | Сервис базы знаний |
| 259 | `src/features/requests/RequestsList.tsx` | Список заявок |
| 256 | `backend/src/modules/requests/reports.service.ts` | Агрегация отчётов |
| 248 | `src/features/boards/BoardLayoutDialog.tsx` | Настройка раскладки доски |
| 242 | `src/features/organizations/OrganizationsPage.tsx` | Страница организаций |
| 240 | `src/features/requests/RequestModal.tsx` | Диалог заявки |
| 248 | `backend/src/modules/organizations/organizations.service.ts` | Сервис организаций |
| 223 | `src/types/core.ts` | Общие типы frontend |
| 220 | `src/features/requests/CreateRequestForm.tsx` | Форма создания заявки |
| 220 | `src/features/reports/ReportsPage.tsx` | Страница отчётов |
| 217 | `src/features/boards/BoardArchiveDialog.tsx` | Архив доски |
| 214 | `src/features/stores/StoresPage.tsx` | Страница торговых точек |
| 214 | `src/features/stores/StoreDetails.tsx` | Детали торговой точки |
| 209 | `src/features/staff/StaffAccessDialog.tsx` | Права сотрудника |
| 207 | `src/App.tsx` | Маршрутизация, провайдеры и сборка приложения |

Файлы страниц и диалогов свыше ориентиров ТЗ перечислены здесь как текущие размеры. Этап 8 не переносил представление без необходимости; ранее задокументированные ограничения остаются в [отчёте 8.5](stage-8-5-frontend-report.md) и [отчётах 8.4](stage-8-4-boards-report.md).

## 3. API endpoints и characterization

Каталог содержит 97 endpoint-маршрутов: 6 публичных или cookie-auth flows и 91 защищённый маршрут. Для защищённых endpoint имеется общая проверка отсутствия токена и снимок ответов четырёх ролей; это не означает отдельный успешный, invalid-input и missing-object тест на каждом маршруте. Подробные пути, ожидания, сценарии и ссылки на тесты перечислены в [матрице всех 97 endpoints](stage-8-3-endpoint-matrix.md).

Сценарии HTTP-ответов, auth/role проверки и их ограничения описаны в [отчёте characterization этапа 8.3](stage-8-3-api-characterization.md). После backend-разделения маршруты размещены внутри `backend/src/modules/`; Telegram bot handlers находятся отдельно в `backend/src/telegram/`.

## 4. Проверки и контракты

- `npm.cmd run verify` выполняет проверку UTF-8, frontend/backend TypeScript, ESLint, Prettier, frontend и backend tests с coverage, обе production-сборки, SPA fallback и Playwright smoke.
- Последний полный прогон на этапе 8.6: frontend — 10 тестов; backend — 116 тестов; Playwright — 11 тестов. Все прошли.
- Покрытие backend: statements 84.86%, branches 66.39%, functions 87.37%, lines 86.13%. Frontend: statements 45.56%, branches 38.69%, functions 32.97%, lines 46.12%.
- В frontend и backend включён TypeScript `noUncheckedIndexedAccess`.
- Общий каталог `shared-types/` содержит response DTO для board access, request assignees, organization contacts/members, store summaries и client summaries; он подключён через tsconfig path alias без workspaces и runtime-зависимости.
- Схема БД и миграции этапом 8 не изменялись. Последние проверки Prisma не обнаружили ожидающих миграций или schema diff.

## 5. Эксплуатация

Приложение развёрнуто для локального запуска без установки Windows-служб. Docker не используется. Production/LAN deployment не выполнялся. Полный контекст ограничений и результата этапа 7 приведён в [отчёте этапа 7](stage-7-cleanup-docs-deployment.md).

## 6. Следующая работа

Этап 8 завершает пункты своего ТЗ; оставшиеся риски и отклонения зафиксированы в `stage-8-report.md`. Выход за рамки этапа 8 — прежде всего совместные DTO `shared-types/` — требует отдельной задачи и characterization текущих payloads перед изменением контрактов.
