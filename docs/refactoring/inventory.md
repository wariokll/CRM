# Инвентаризация CRM после этапа 8

Дата: 2026-11-26
Ветка: `master`
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

## 2.1. Топ-30 backend-файлов

Таблица построена по строкам текущих `.ts`/`.tsx` исходников, тесты исключены.

| Строк | Файл |
|---:|---|
| 714 | `backend/src/modules/requests/request.service.ts` |
| 705 | `backend/src/telegram/bot-handlers.ts` |
| 623 | `backend/src/modules/boards/board.service.ts` |
| 298 | `backend/src/modules/stores/stores.service.ts` |
| 281 | `backend/src/modules/knowledge/knowledge.service.ts` |
| 256 | `backend/src/modules/requests/reports.service.ts` |
| 250 | `backend/src/modules/organizations/organizations.service.ts` |
| 193 | `backend/src/modules/boards/board.controller.ts` |
| 157 | `backend/src/utils/telegram-notifications.ts` |
| 139 | `backend/src/modules/requests/request.controller.ts` |
| 133 | `backend/src/modules/moderation/moderation.service.ts` |
| 130 | `backend/src/modules/users/users.service.ts` |
| 128 | `backend/src/shared/response-schemas.ts` |
| 121 | `backend/src/modules/knowledge/knowledge.controller.ts` |
| 120 | `backend/src/modules/staff/staff.service.ts` |
| 115 | `backend/src/modules/telegram/telegram.service.ts` |
| 115 | `backend/src/modules/auth/auth.service.ts` |
| 103 | `backend/src/modules/knowledge/knowledge.routes.ts` |
| 90 | `backend/src/shared/middleware/authorization.ts` |
| 89 | `backend/src/app.ts` |
| 86 | `backend/src/modules/organizations/organizations.controller.ts` |
| 86 | `backend/src/utils/scheduled-reminders.ts` |
| 85 | `backend/src/utils/recurring-requests.ts` |
| 85 | `backend/src/modules/knowledge/import-parser.ts` |
| 79 | `backend/src/telegram/bot.ts` |
| 79 | `backend/src/modules/telegram/template-fields.ts` |
| 77 | `backend/src/shared/middleware/errors.ts` |
| 72 | `backend/src/modules/boards/board.contracts.ts` |
| 71 | `backend/src/modules/stores/stores.controller.ts` |
| 60 | `backend/src/modules/requests/request.include.ts` |

## 2.2. Топ-30 frontend-файлов

| Строк | Файл |
|---:|---|
| 711 | `src/features/boards/BoardsPage.tsx` |
| 648 | `src/features/knowledge/KnowledgePage.tsx` |
| 259 | `src/features/requests/RequestsList.tsx` |
| 258 | `src/features/organizations/OrganizationsPage.tsx` |
| 253 | `src/features/requests/RequestModal.tsx` |
| 248 | `src/features/boards/BoardLayoutDialog.tsx` |
| 230 | `src/features/requests/CreateRequestForm.tsx` |
| 229 | `src/features/stores/StoresPage.tsx` |
| 221 | `src/types/core.ts` |
| 220 | `src/features/reports/ReportsPage.tsx` |
| 214 | `src/features/stores/StoreDetails.tsx` |
| 214 | `src/features/boards/BoardArchiveDialog.tsx` |
| 209 | `src/features/staff/StaffAccessDialog.tsx` |
| 208 | `src/App.tsx` |
| 191 | `src/features/telegram/TelegramPage.tsx` |
| 183 | `src/features/knowledge/KnowledgeArticleDialog.tsx` |
| 179 | `src/features/layout/AppPageContent.tsx` |
| 179 | `src/features/knowledge/KnowledgeImportDialog.tsx` |
| 178 | `src/features/requests/RequestCreationFields.tsx` |
| 175 | `src/features/templates/TemplateEditDialog.tsx` |
| 173 | `src/features/boards/BoardDialogs.tsx` |
| 172 | `src/features/boards/BoardCanvas.tsx` |
| 169 | `src/features/templates/TemplatesPage.tsx` |
| 166 | `src/features/staff/StaffPage.tsx` |
| 152 | `src/features/knowledge/KnowledgeArticleView.tsx` |
| 147 | `src/features/auth/AuthPage.tsx` |
| 136 | `src/features/knowledge/KnowledgeArticleList.tsx` |
| 136 | `src/features/organizations/OrganizationCards.tsx` |
| 129 | `src/features/requests/CalendarPage.tsx` |
| 126 | `src/features/stores/StoreGroups.tsx` |

## 2.3. Карта UI по ролям и правам

| Роль/право | Доступные разделы |
|---|---|
| `CLIENT` | Обзор, заявки, календарь, организации, торговые точки. |
| `DIRECTOR`, `DEPARTMENT_HEAD`, `MASTER` | Общие разделы, личные и командные доски; дополнительные пункты зависят от permission overrides. |
| `VIEW_REPORTS` | Отчёты. По умолчанию включено для директора, руководителя отдела и мастера. |
| `MANAGE_TEMPLATES` | Шаблоны. По умолчанию включено для директора, руководителя отдела и мастера. |
| `MANAGE_STAFF` | Сотрудники. По умолчанию включено для директора. |
| `VIEW_TELEGRAM` | Telegram. По умолчанию включено для директора, руководителя отдела и мастера. |
| `MANAGE_KNOWLEDGE` | База знаний. По умолчанию включено для директора, руководителя отдела и мастера. |
| Другие permissions | Управляют просмотром/изменением заявок, клиентами, организациями, точками, секретами доступа и удалением; полный список и дефолты заданы в `src/auth/permissions.ts`. |

## 2.4. God-файлы и порядок разбиения

Размеры сами по себе не требуют перемещения; перед каждым переносом нужно сохранить endpoint/UI characterization.

1. `request.service.ts`: отделить создание и его валидацию, комментарии, обновления статуса/назначений и чтение/фильтрацию; сохранить текущий порядок проверок.
2. `bot-handlers.ts`: выделить callback handlers, текстовые команды, связывание чатов и шаблонизацию сообщений.
3. `BoardsPage.tsx`: вынести загрузку и мутации в `useBoards`, а toolbar, canvas, dialogs и archive coordination — в отдельные компоненты.
4. `KnowledgePage.tsx`: отделить URL/query synchronization, загрузку разделов/статей, импорт/вложения и редакторные действия.
5. Остальные страницы свыше 200 строк: извлекать повторяемые формы и состояния в feature-компоненты по мере работы с каждой страницей.

Рекомендуемый порядок доменных модулей с учётом связей: auth/users и authorization; organizations/stores/departments/staff; components/request-types; requests/recurring-requests/reports; boards/knowledge; moderation/telegram. Это порядок для планирования, текущий runtime-порядок регистрации роутов находится в `backend/src/app.ts`.

## 3. API endpoints и characterization

Каталог содержит 97 endpoint-маршрутов: 6 публичных или cookie-auth flows и 91 защищённый маршрут. Для защищённых endpoint имеется общая проверка отсутствия токена и снимок ответов четырёх ролей; это не означает отдельный успешный, invalid-input и missing-object тест на каждом маршруте. Подробные пути, ожидания, сценарии и ссылки на тесты перечислены в [матрице всех 97 endpoints](stage-8-3-endpoint-matrix.md).

Сценарии HTTP-ответов, auth/role проверки и их ограничения описаны в [отчёте characterization этапа 8.3](stage-8-3-api-characterization.md). После backend-разделения маршруты размещены внутри `backend/src/modules/`; Telegram bot handlers находятся отдельно в `backend/src/telegram/`.

## 4. Проверки и контракты

- `npm.cmd run verify` выполняет проверку UTF-8, frontend/backend TypeScript, ESLint, Prettier, frontend и backend tests с coverage, обе production-сборки, SPA fallback и Playwright smoke.
- Последний полный прогон на этапе 8.6: frontend — 10 тестов; backend — 116 тестов; Playwright — 11 тестов. Все прошли.
- Покрытие backend: statements 84.86%, branches 66.39%, functions 87.37%, lines 86.13%. Frontend: statements 45.56%, branches 38.69%, functions 32.97%, lines 46.12%.
- В frontend и backend включён TypeScript `noUncheckedIndexedAccess`.
- Общий каталог `shared-types/` содержит response DTO для board access, request assignees, organization contacts/members, store summaries и client summaries. Runtime Zod validation пяти групп DTO выполняется в `backend/src/shared/response-schemas.ts`; `shared-types/` остаётся только декларациями типов, подключёнными через tsconfig alias.
- Схема БД и миграции этапом 8 не изменялись. Последние проверки Prisma не обнаружили ожидающих миграций или schema diff.

## 5. Эксплуатация

Приложение развёрнуто для локального запуска без установки Windows-служб. Docker не используется. Production/LAN deployment не выполнялся. Полный контекст ограничений и результата этапа 7 приведён в [отчёте этапа 7](stage-7-cleanup-docs-deployment.md).

## 6. Следующая работа

Этот документ отражает состояние на 2026-11-26. Оставшиеся требования и причины приведены в `stage-8-nontest-audit.md`; предложения по разбиению — ориентир для безопасной последовательной работы, а не разрешение менять API payloads или схему БД.
