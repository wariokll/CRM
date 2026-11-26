# Инвентаризация CRM после этапа 8

Дата: 2026-11-26
Ветка: `master`
Основание: ТЗ «рефакторинг CRM» и завершённые этапы 0–8.7.

Этот документ отражает текущее состояние файлов и архитектуры. Исторический снимок до рефакторинга содержится в Git до этапа 8; поведение HTTP endpoints и качество их characterization-тестов описывает [матрица этапа 8.3](stage-8-3-endpoint-matrix.md).

## 1. Карта проекта

- Frontend: React, TypeScript и Vite; приложение и страницы находятся в `src/`, общие типы — в `src/types/`, feature-код — в `src/features/`.
- Backend: Express 5 и TypeScript в `backend/src/`; маршруты организованы в `backend/src/modules/` с разделением routes, controllers и services там, где это применимо. Запуск приложения и сервер находятся в `backend/src/app.ts` и `backend/src/server.ts`.
- Хранилище: Prisma 6 и MariaDB; схема — `backend/prisma/schema.prisma`, миграции — `backend/prisma/migrations/` (14 миграций).
- В `backend/src/modules/` находятся 14 модулей: `auth`, `boards`, `components`, `departments`, `knowledge`, `moderation`, `organizations`, `recurring-requests`, `request-types`, `requests`, `staff`, `stores`, `telegram`, `users`.
- Во `src/features/` находятся 12 feature-папок: `auth`, `boards`, `dashboard`, `knowledge`, `layout`, `organizations`, `reports`, `requests`, `staff`, `stores`, `telegram`, `templates`.
- Исходные `.ts` и `.tsx` файлы в `backend/src/` и `src/`: 229 (включая тесты).

## 2. Крупнейшие текущие файлы

Размеры рассчитаны автоматически по текущим исходникам TypeScript/TSX; тестовые файлы исключены. Размер сам по себе не доказывает смешение ответственностей.

| Строк | Файл                                                         | Содержание      |
| ----: | ------------------------------------------------------------ | --------------- |
|   723 | `backend/src/telegram/bot-handlers.ts`                       | Backend source  |
|   722 | `backend/src/modules/boards/board.service.ts`                | Backend source  |
|   633 | `src/features/knowledge/useKnowledgePage.tsx`                | Frontend source |
|   464 | `src/features/boards/useBoardsPage.ts`                       | Frontend source |
|   441 | `backend/src/modules/requests/request-create.service.ts`     | Backend source  |
|   346 | `src/features/boards/BoardsPage.tsx`                         | Frontend source |
|   339 | `backend/src/modules/knowledge/knowledge.service.ts`         | Backend source  |
|   331 | `backend/src/modules/requests/request-update.service.ts`     | Backend source  |
|   322 | `backend/src/modules/stores/stores.service.ts`               | Backend source  |
|   275 | `backend/src/modules/organizations/organizations.service.ts` | Backend source  |
|   269 | `backend/src/modules/requests/reports.service.ts`            | Backend source  |
|   251 | `src/features/boards/BoardLayoutDialog.tsx`                  | Frontend source |
|   248 | `backend/src/modules/boards/board.controller.ts`             | Backend source  |
|   231 | `backend/src/modules/requests/request-read.service.ts`       | Backend source  |
|   231 | `src/features/stores/StoresPage.tsx`                         | Frontend source |
|   231 | `src/types/core.ts`                                          | Frontend source |
|   219 | `src/features/boards/BoardArchiveDialog.tsx`                 | Frontend source |
|   216 | `src/features/stores/StoreDetails.tsx`                       | Frontend source |
|   203 | `src/App.tsx`                                                | Frontend source |
|   200 | `src/features/requests/CreateRequestForm.tsx`                | Frontend source |

## 2.1. Топ-30 backend-файлов

Топ-30 backend-исходников; тестовые файлы исключены.

| Строк | Файл                                                            |
| ----: | --------------------------------------------------------------- |
|   723 | `backend/src/telegram/bot-handlers.ts`                          |
|   722 | `backend/src/modules/boards/board.service.ts`                   |
|   441 | `backend/src/modules/requests/request-create.service.ts`        |
|   339 | `backend/src/modules/knowledge/knowledge.service.ts`            |
|   331 | `backend/src/modules/requests/request-update.service.ts`        |
|   322 | `backend/src/modules/stores/stores.service.ts`                  |
|   275 | `backend/src/modules/organizations/organizations.service.ts`    |
|   269 | `backend/src/modules/requests/reports.service.ts`               |
|   248 | `backend/src/modules/boards/board.controller.ts`                |
|   231 | `backend/src/modules/requests/request-read.service.ts`          |
|   172 | `backend/src/telegram/bot-targets.ts`                           |
|   165 | `backend/src/utils/telegram-notifications.ts`                   |
|   164 | `backend/src/modules/requests/request.controller.ts`            |
|   156 | `backend/src/modules/knowledge/knowledge.controller.ts`         |
|   150 | `backend/src/modules/moderation/moderation.service.ts`          |
|   148 | `backend/src/modules/telegram/telegram.service.ts`              |
|   146 | `backend/src/modules/staff/staff.service.ts`                    |
|   137 | `backend/src/modules/users/users.service.ts`                    |
|   137 | `backend/src/shared/response-schemas.ts`                        |
|   126 | `backend/src/modules/auth/auth.service.ts`                      |
|   108 | `backend/src/utils/recurring-requests.ts`                       |
|   107 | `backend/src/modules/knowledge/knowledge.routes.ts`             |
|   100 | `backend/src/shared/middleware/authorization.ts`                |
|    98 | `backend/src/utils/scheduled-reminders.ts`                      |
|    96 | `backend/src/modules/stores/stores.controller.ts`               |
|    95 | `backend/src/modules/organizations/organizations.controller.ts` |
|    94 | `backend/src/app.ts`                                            |
|    91 | `backend/src/modules/knowledge/import-parser.ts`                |
|    83 | `backend/src/telegram/bot.ts`                                   |
|    82 | `backend/src/modules/telegram/template-fields.ts`               |

## 2.2. Топ-30 frontend-файлов

Топ-30 frontend-исходников; тестовые файлы исключены.

| Строк | Файл                                                |
| ----: | --------------------------------------------------- |
|   633 | `src/features/knowledge/useKnowledgePage.tsx`       |
|   464 | `src/features/boards/useBoardsPage.ts`              |
|   346 | `src/features/boards/BoardsPage.tsx`                |
|   251 | `src/features/boards/BoardLayoutDialog.tsx`         |
|   231 | `src/features/stores/StoresPage.tsx`                |
|   231 | `src/types/core.ts`                                 |
|   219 | `src/features/boards/BoardArchiveDialog.tsx`        |
|   216 | `src/features/stores/StoreDetails.tsx`              |
|   203 | `src/App.tsx`                                       |
|   200 | `src/features/requests/CreateRequestForm.tsx`       |
|   193 | `src/features/telegram/TelegramPage.tsx`            |
|   188 | `src/features/requests/RequestsList.tsx`            |
|   187 | `src/features/organizations/OrganizationsPage.tsx`  |
|   184 | `src/features/knowledge/KnowledgeArticleDialog.tsx` |
|   182 | `src/features/layout/AppPageContent.tsx`            |
|   181 | `src/features/knowledge/KnowledgeImportDialog.tsx`  |
|   179 | `src/features/requests/RequestCreationFields.tsx`   |
|   177 | `src/features/knowledge/KnowledgePage.tsx`          |
|   177 | `src/features/requests/RequestStaffControls.tsx`    |
|   176 | `src/features/boards/BoardCanvas.tsx`               |
|   176 | `src/features/templates/TemplateEditDialog.tsx`     |
|   175 | `src/features/boards/BoardDialogs.tsx`              |
|   171 | `src/features/templates/TemplatesPage.tsx`          |
|   168 | `src/features/staff/StaffPage.tsx`                  |
|   162 | `src/features/requests/RequestModal.tsx`            |
|   158 | `src/features/reports/ReportsPage.tsx`              |
|   158 | `src/features/staff/StaffAccessDialog.tsx`          |
|   153 | `src/features/knowledge/KnowledgeArticleView.tsx`   |
|   153 | `src/features/requests/RequestFilters.tsx`          |
|   150 | `src/features/auth/AuthPage.tsx`                    |

## 2.3. Карта UI по ролям и правам

| Роль/право                              | Доступные разделы                                                                                                                                                     |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CLIENT`                                | Обзор, заявки, календарь, организации, торговые точки.                                                                                                                |
| `DIRECTOR`, `DEPARTMENT_HEAD`, `MASTER` | Общие разделы, личные и командные доски; дополнительные пункты зависят от permission overrides.                                                                       |
| `VIEW_REPORTS`                          | Отчёты. По умолчанию включено для директора, руководителя отдела и мастера.                                                                                           |
| `MANAGE_TEMPLATES`                      | Шаблоны. По умолчанию включено для директора, руководителя отдела и мастера.                                                                                          |
| `MANAGE_STAFF`                          | Сотрудники. По умолчанию включено для директора.                                                                                                                      |
| `VIEW_TELEGRAM`                         | Telegram. По умолчанию включено для директора, руководителя отдела и мастера.                                                                                         |
| `MANAGE_KNOWLEDGE`                      | База знаний. По умолчанию включено для директора, руководителя отдела и мастера.                                                                                      |
| Другие permissions                      | Управляют просмотром/изменением заявок, клиентами, организациями, точками, секретами доступа и удалением; полный список и дефолты заданы в `src/auth/permissions.ts`. |

## 2.4. God-файлы и порядок разбиения

Выполнено в рамках завершающих подэтапов:

1. `request.service.ts` разделён на операции чтения, создания и обновления; API-порядок проверок сохранён.
2. Выбор связанных организаций и точек из `bot-handlers.ts` выделен в `backend/src/telegram/bot-targets.ts`. Остальной bot dispatcher сохраняет общую сессию диалога.
3. Состояние и действия досок вынесены в `useBoardsPage.ts`; визуальные компоненты доски и диалоги уже расположены отдельно.
4. URL/query state и действия базы знаний вынесены в `useKnowledgePage.tsx`; визуальные компоненты статьи, списка и диалоги уже расположены отдельно.

Другие файлы более 200 строк перечислены в топ-таблицах выше. Их дальнейшее разбиение — локальная работа по мере изменения соответствующих экранов, а не блокер API или схемы БД. Перед изменением поведения следует сверяться с characterization/E2E.

Рекомендуемый порядок доменных модулей с учётом связей: auth/users и authorization; organizations/stores/departments/staff; components/request-types; requests/recurring-requests/reports; boards/knowledge; moderation/telegram. Это порядок для планирования, текущий runtime-порядок регистрации роутов находится в `backend/src/app.ts`.

## 3. API endpoints и characterization

Каталог содержит 97 endpoint-маршрутов: 6 публичных или cookie-auth flows и 91 защищённый маршрут. Для защищённых endpoint имеется общая проверка отсутствия токена и снимок ответов четырёх ролей; это не означает отдельный успешный, invalid-input и missing-object тест на каждом маршруте. Подробные пути, ожидания, сценарии и ссылки на тесты перечислены в [матрице всех 97 endpoints](stage-8-3-endpoint-matrix.md).

Сценарии HTTP-ответов, auth/role проверки и их ограничения описаны в [отчёте characterization этапа 8.3](stage-8-3-api-characterization.md). После backend-разделения маршруты размещены внутри `backend/src/modules/`; Telegram bot handlers находятся отдельно в `backend/src/telegram/`.

## 4. Проверки и контракты

- `npm.cmd run verify` выполняет проверку UTF-8, frontend/backend TypeScript, ESLint, Prettier, frontend и backend tests с coverage, обе production-сборки, SPA fallback и Playwright smoke.
- Полный прогон 2026-11-26: frontend — 10 тестов; backend — 116 тестов; Playwright — 12 тестов. Все прошли.
- Актуальное покрытие выводится непосредственно в `verify`; это число не является критерием нонтестовой сверки.
- В frontend и backend включён TypeScript `noUncheckedIndexedAccess`.
- Общий каталог `shared-types/` содержит response DTO для board access, request assignees, organization contacts/members, store summaries и client summaries. Runtime Zod validation пяти групп DTO выполняется в `backend/src/shared/response-schemas.ts`; `shared-types/` остаётся только декларациями типов, подключёнными через tsconfig alias.
- Схема БД и миграции этапом 8 не изменялись. Последние проверки Prisma не обнаружили ожидающих миграций или schema diff.

## 5. Эксплуатация

Приложение развёрнуто для локального запуска без установки Windows-служб. Docker не используется. Production/LAN deployment не выполнялся. Полный контекст ограничений и результата этапа 7 приведён в [отчёте этапа 7](stage-7-cleanup-docs-deployment.md).

## 6. Следующая работа

Этот документ отражает состояние на 2026-11-26. Оставшиеся требования и причины приведены в `stage-8-nontest-audit.md`; предложения по разбиению — ориентир для безопасной последовательной работы, а не разрешение менять API payloads или схему БД.
