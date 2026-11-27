# Инвентаризация CRM после этапа 8

Дата: 2026-11-27
Ветка: `master`
Основание: ТЗ «рефакторинг CRM» и завершённые этапы 0–8.7.

Этот документ отражает текущее состояние файлов и архитектуры. Исторический снимок до рефакторинга содержится в Git до этапа 8; поведение HTTP endpoints и качество их characterization-тестов описывает [матрица этапа 8.3](stage-8-3-endpoint-matrix.md).

## 1. Карта проекта

- Frontend: React, TypeScript и Vite; composition root находится в `src/app/`, feature UI разложен по `components/`, `pages/` и `hooks/`, feature-specific типы находятся в `types/`, общие типы — в `src/types/`.
- Backend: Express 5 и TypeScript в `backend/src/`; маршруты организованы в `backend/src/modules/` с разделением routes, controllers и services там, где это применимо. Запуск приложения и сервер находятся в `backend/src/app.ts` и `backend/src/server.ts`.
- Хранилище: Prisma 6 и MariaDB; схема — `backend/prisma/schema.prisma`, миграции — `backend/prisma/migrations/` (14 миграций).
- В `backend/src/modules/` находятся 14 модулей: `auth`, `boards`, `components`, `departments`, `knowledge`, `moderation`, `organizations`, `recurring-requests`, `request-types`, `requests`, `staff`, `stores`, `telegram`, `users`.
- Во `src/features/` находятся 12 feature-папок: `auth`, `boards`, `dashboard`, `knowledge`, `layout`, `organizations`, `reports`, `requests`, `staff`, `stores`, `telegram`, `templates`.
- Исходные `.ts` и `.tsx` файлы в `backend/src/` и `src/`: 255 (включая тесты).

## 2. Крупнейшие текущие файлы

Размеры рассчитаны по исходникам TypeScript/TSX; тесты исключены. Размер сам по себе не доказывает смешение ответственностей.

| Строк | Файл                                                         |
| ----: | ------------------------------------------------------------ |
|   298 | `backend/src/modules/stores/stores.service.ts`               |
|   276 | `backend/src/modules/organizations/organizations.service.ts` |
|   270 | `backend/src/modules/requests/reports.service.ts`            |
|   268 | `backend/src/modules/boards/board-cards.service.ts`          |
|   260 | `backend/src/modules/boards/board-structure.service.ts`      |
|   252 | `backend/src/modules/requests/request-update.service.ts`     |
|   249 | `backend/src/modules/boards/board.controller.ts`             |
|   241 | `backend/src/telegram/bot-handler-support.ts`                |
|   238 | `backend/src/telegram/bot-handlers.ts`                       |
|   232 | `src/types/core.ts`                                          |
|   232 | `backend/src/modules/requests/request-read.service.ts`       |
|   232 | `backend/src/telegram/bot-request-selections.ts`             |
|   230 | `backend/src/modules/requests/request-create.service.ts`     |
|   225 | `backend/src/modules/requests/request-create-targets.ts`     |
|   216 | `backend/src/modules/knowledge/knowledge.service.ts`         |
|   209 | `src/features/boards/hooks/useBoardsPage.ts`                 |
|   208 | `src/features/knowledge/hooks/useKnowledgeSelection.ts`      |
|   201 | `src/features/requests/components/CreateRequestForm.tsx`     |
|   199 | `src/features/boards/hooks/useBoardActions.ts`               |
|   196 | `src/features/stores/pages/StoresPage.tsx`                   |

## 2.1. Топ-30 backend-файлов

Топ-30 backend исходников; тестовые файлы исключены.

| Строк | Файл                                                         |
| ----: | ------------------------------------------------------------ |
|   298 | `backend/src/modules/stores/stores.service.ts`               |
|   276 | `backend/src/modules/organizations/organizations.service.ts` |
|   270 | `backend/src/modules/requests/reports.service.ts`            |
|   268 | `backend/src/modules/boards/board-cards.service.ts`          |
|   260 | `backend/src/modules/boards/board-structure.service.ts`      |
|   252 | `backend/src/modules/requests/request-update.service.ts`     |
|   249 | `backend/src/modules/boards/board.controller.ts`             |
|   241 | `backend/src/telegram/bot-handler-support.ts`                |
|   238 | `backend/src/telegram/bot-handlers.ts`                       |
|   232 | `backend/src/modules/requests/request-read.service.ts`       |
|   232 | `backend/src/telegram/bot-request-selections.ts`             |
|   230 | `backend/src/modules/requests/request-create.service.ts`     |
|   225 | `backend/src/modules/requests/request-create-targets.ts`     |
|   216 | `backend/src/modules/knowledge/knowledge.service.ts`         |
|   196 | `backend/src/test/api-characterization.helpers.ts`           |
|   173 | `backend/src/telegram/bot-targets.ts`                        |
|   166 | `backend/src/utils/telegram-notifications.ts`                |
|   164 | `backend/src/modules/requests/request.controller.ts`         |
|   157 | `backend/src/modules/knowledge/knowledge.controller.ts`      |
|   151 | `backend/src/modules/moderation/moderation.service.ts`       |
|   149 | `backend/src/modules/telegram/telegram.service.ts`           |
|   147 | `backend/src/modules/staff/staff.service.ts`                 |
|   146 | `backend/src/modules/boards/board-core.service.ts`           |
|   138 | `backend/src/modules/users/users.service.ts`                 |
|   138 | `backend/src/shared/response-schemas.ts`                     |
|   127 | `backend/src/modules/auth/auth.service.ts`                   |
|   126 | `backend/src/modules/knowledge/knowledge-import.service.ts`  |
|   118 | `backend/src/telegram/bot-employee-handlers.ts`              |
|   109 | `backend/src/utils/recurring-requests.ts`                    |
|   108 | `backend/src/modules/knowledge/knowledge.routes.ts`          |

## 2.2. Топ-30 frontend-файлов

Топ-30 frontend исходников; тестовые файлы исключены.

| Строк | Файл                                                           |
| ----: | -------------------------------------------------------------- |
|   232 | `src/types/core.ts`                                            |
|   209 | `src/features/boards/hooks/useBoardsPage.ts`                   |
|   208 | `src/features/knowledge/hooks/useKnowledgeSelection.ts`        |
|   201 | `src/features/requests/components/CreateRequestForm.tsx`       |
|   199 | `src/features/boards/hooks/useBoardActions.ts`                 |
|   196 | `src/features/stores/pages/StoresPage.tsx`                     |
|   194 | `src/features/organizations/pages/OrganizationsPage.tsx`       |
|   194 | `src/features/telegram/pages/TelegramPage.tsx`                 |
|   189 | `src/features/requests/components/RequestsList.tsx`            |
|   185 | `src/features/knowledge/components/KnowledgeArticleDialog.tsx` |
|   183 | `src/features/layout/components/AppPageContent.tsx`            |
|   182 | `src/features/knowledge/components/KnowledgeImportDialog.tsx`  |
|   180 | `src/features/knowledge/hooks/useKnowledgeEditor.ts`           |
|   180 | `src/features/requests/components/RequestCreationFields.tsx`   |
|   179 | `src/features/layout/components/AppContent.tsx`                |
|   178 | `src/features/requests/components/RequestStaffControls.tsx`    |
|   177 | `src/features/boards/components/BoardCanvas.tsx`               |
|   177 | `src/features/templates/components/TemplateEditDialog.tsx`     |
|   176 | `src/features/boards/components/BoardDialogs.tsx`              |
|   172 | `src/features/templates/pages/TemplatesPage.tsx`               |
|   171 | `src/features/boards/components/BoardArchiveDialog.tsx`        |
|   169 | `src/features/boards/components/BoardPageDialogs.tsx`          |
|   169 | `src/features/knowledge/pages/KnowledgePage.tsx`               |
|   169 | `src/features/staff/pages/StaffPage.tsx`                       |
|   165 | `src/features/boards/components/BoardWorkspace.tsx`            |
|   163 | `src/features/requests/components/RequestModal.tsx`            |
|   160 | `src/features/boards/components/BoardLayoutDialog.tsx`         |
|   159 | `src/features/reports/pages/ReportsPage.tsx`                   |
|   159 | `src/features/staff/components/StaffAccessDialog.tsx`          |
|   158 | `src/features/boards/pages/BoardsPage.tsx`                     |

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

## 2.4. Крупные файлы и выполненные разбиения

В завершающих подэтапах после первоначальной сверки разделены:

1. Request backend: read/create/update операции, update policy/уведомления и подготовка целей создания заявки вынесены в отдельные модули.
2. Boards backend/frontend: core, structure, cards и archive сервисы разделены; `BoardsPage` состоит из страницы, рабочего поля и диалогов, а состояние и действия вынесены в hooks с отдельным drag handler.
3. Knowledge backend/frontend: импорт документов отделён от основного сервиса; URL/query selection вынесен в `useKnowledgeSelection`, page hook собирает selection и editor hooks, section tree и сохранение статьи вынесены в отдельные компоненты/hooks.
4. Telegram bot: базовые операции, staff linking, выбор связанных организаций/точек и диспетчер событий разнесены по модулям.
5. Store UI/API: данные точки, форма доступа, toolbar, архивные карточки и DTO mapper разделены по обязанностям.

См. [аудит соответствия ТЗ](stage-8-nontest-audit.md) и [отчёт продолжения этапа 8](stage-8-continuation-report.md). Файлы свыше 200 строк перечислены в актуальных таблицах; дальнейшее разбиение ограничено приблизительным ориентиром ТЗ и не требует изменения API или схемы БД.

## 3. API endpoints и characterization

Каталог содержит 97 endpoint-маршрутов: 6 публичных или cookie-auth flows и 91 защищённый маршрут. Для защищённых endpoint имеется общая проверка отсутствия токена и снимок ответов четырёх ролей; это не означает отдельный успешный, invalid-input и missing-object тест на каждом маршруте. Подробные пути, ожидания, сценарии и ссылки на тесты перечислены в [матрице всех 97 endpoints](stage-8-3-endpoint-matrix.md).

Сценарии HTTP-ответов, auth/role проверки и их ограничения описаны в [отчёте characterization этапа 8.3](stage-8-3-api-characterization.md). После backend-разделения маршруты размещены внутри `backend/src/modules/`; Telegram bot handlers находятся отдельно в `backend/src/telegram/`.

## 4. Проверки и контракты

- `npm.cmd run verify` выполняет проверку UTF-8, frontend/backend TypeScript, ESLint, Prettier, frontend и backend tests с coverage, обе production-сборки, SPA fallback и Playwright smoke.
- Полный прогон 2026-11-27: frontend — 10 тестов; backend — 116 тестов; Playwright — 12 тестов. Все прошли.
- Актуальное покрытие выводится непосредственно в `verify`; это число не является критерием нонтестовой сверки.
- В frontend и backend включён TypeScript `noUncheckedIndexedAccess`.
- Общий каталог `shared-types/` содержит response DTO для board access, request assignees, organization contacts/members, store summaries и client summaries. Runtime Zod validation пяти групп DTO выполняется в `backend/src/shared/response-schemas.ts`; `shared-types/` остаётся только декларациями типов, подключёнными через tsconfig alias.
- Схема БД и миграции этапом 8 не изменялись. Последние проверки Prisma не обнаружили ожидающих миграций или schema diff.

## 5. Эксплуатация

Приложение развёрнуто для локального запуска без установки Windows-служб. Docker не используется. Production/LAN deployment не выполнялся. Полный контекст ограничений и результата этапа 7 приведён в [отчёте этапа 7](stage-7-cleanup-docs-deployment.md).

## 6. Следующая работа

Состояние инвентаризации обновлено 2026-11-27. После структурных подэтапов остались API/DB пункты только там, где это отдельно отмечено в `stage-8-nontest-audit.md`. Необходимость эксплуатации без Docker и служб также учтена по прямому указанию пользователя.
