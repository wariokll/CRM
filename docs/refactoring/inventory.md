# Этап 0. Инвентаризация CRM

Дата: 2026-11-11
Ветка: `refactor/stage-0-inventory` (инвентаризация не меняет код приложения)
Основание: ТЗ «рефакторинг CRM».

## 1. Состояние проекта

- Frontend: React/TypeScript/Vite в `src/`; backend: Express 5/TypeScript в `backend/src/`; Prisma 6 + MariaDB.
- В репозитории уже есть частичные модули `backend/src/modules/{boards,requests,telegram}`, но действующие HTTP-маршруты в основном остаются в `backend/src/routes/` и обращаются к Prisma напрямую.
- `backend/src/app.ts` создаёт Express-глобал на уровне импорта, напрямую импортирует config, Prisma и все routers, содержит health endpoints и SPA fallback. Фабрики `createApp(deps)` нет.
- `src/App.tsx` содержит авторизацию, общий layout/navigation, загрузку основных данных, проверки permission, dashboard, заявки, календарь, организации, торговые точки, шаблоны, сотрудников, Telegram и часть отчётов. Навигация хранится в React state.
- Уже есть 7 файлов тестов, преимущественно unit-тесты чистых функций и board/request domain logic. Интеграционных HTTP-тестов нет; перечисленные ниже endpoints тестами маршрутов не покрыты.
- Существующие в рабочей копии изменения до инвентаризации: `backend/package.json` (разрешения npm install scripts) и `stop-crm.ps1` (поиск MariaDB в PATH). Их происхождение — подготовка локального окружения до начала этапа 0; inventory не меняет эти файлы.

## 2. Размеры файлов

Лимиты из ТЗ: backend-файл до 300 строк; frontend-компонент до 250 строк. Это ориентиры разбиения, а не основания менять поведение. Строки посчитаны по исходным файлам TypeScript/TSX, включая тесты.

### Backend: топ-30 исходных файлов

| Строк | Файл | Превышение/смешанные ответственности |
|---:|---|---|
| 785 | `backend/src/telegram/bot.ts` | Да; transport Telegram, обработка команд/сообщений, доступ к Prisma и бизнес-процессы |
| 770 | `backend/src/routes/requests.ts` | Да; 2.6× ориентира, HTTP, проверка прав, запросы/транзакции Prisma и формирование DTO |
| 590 | `backend/src/routes/boards.ts` | Да; HTTP, board/card logic, доступ, транзакции и Prisma |
| 478 | `backend/src/routes/knowledge.ts` | Да; HTTP, upload/import файлов, knowledge logic и Prisma |
| 304 | `backend/src/routes/stores.ts` | Да; HTTP, доступ/модерация торговых точек и Prisma |
| 270 | `backend/src/routes/organizations.ts` | В пределах ориентира, но содержит бизнес-правила и Prisma наряду с HTTP |
| 261 | `backend/src/modules/requests/reports.service.ts` | В пределах ориентира; агрегация отчётов |
| 202 | `backend/src/modules/boards/board.service.test.ts` | Тест; не производственный модуль |
| 194 | `backend/src/routes/telegram.ts` | HTTP, permission checks и Prisma |
| 187 | `backend/src/routes/staff.ts` | HTTP, права сотрудников и Prisma |
| 175 | `backend/src/routes/moderation.ts` | HTTP и Prisma moderation workflow |
| 167 | `backend/src/routes/auth.ts` | HTTP, валидация, cookies/tokens, bcrypt и Prisma |
| 161 | `backend/src/utils/telegram-notifications.ts` | Формирование/отправка уведомлений и Prisma |
| 156 | `backend/src/routes/users.ts` | HTTP, права и Prisma |
| 136 | `backend/src/modules/boards/board.service.ts` | Сервис; кандидат оставить как основу целевого слоя |
| 123 | `backend/src/routes/request-types.ts` | HTTP, validation, permission checks и Prisma |
| 96 | `backend/src/utils/permissions.ts` | Permission policy, чтение пользователя и Express middleware в одном файле |
| 90 | `backend/src/utils/scheduled-reminders.ts` | Планировщик и отправка напоминаний |
| 87 | `backend/src/utils/recurring-requests.ts` | Генерация повторяющихся заявок |
| 83 | `backend/src/app.ts` | Сборка приложения + health endpoints + middleware + SPA fallback |
| 82 | `backend/src/middleware/errors.ts` | Обработка ошибок и legacy error response formatting |
| 82 | `backend/src/modules/telegram/template-fields.ts` | Чистая логика шаблонных полей Telegram |
| 71 | `backend/src/modules/boards/board-policy.test.ts` | Тест политики доступа к доскам |
| 60 | `backend/src/modules/requests/request.include.ts` | Сборка Prisma include для заявок |
| 58 | `backend/src/modules/requests/request.contracts.ts` | Схемы и типы request template data |
| 53 | `backend/src/utils/request-status.test.ts` | Тест переходов статусов заявок |
| 50 | `backend/src/telegram/bot-template-fields.test.ts` | Тест template fields для Telegram |
| 47 | `backend/src/routes/components.ts` | HTTP, permission checks и Prisma |
| 46 | `backend/src/routes/departments.ts` | HTTP, permission checks и Prisma |
| 46 | `backend/src/utils/business-days.ts` | Чистая календарная утилита |

### Frontend: все 12 исходных файлов

| Строк | Файл | Превышение/смешанные ответственности |
|---:|---|---|
| 3905 | `src/App.tsx` | Да; около 16 компонентов/страниц плюс auth, навигация, загрузка/обновление данных, права и CRUD |
| 1069 | `src/features/boards/BoardsPage.tsx` | Да; контейнер и несколько UI частей досок, запросы, drag-and-drop и состояние |
| 841 | `src/features/knowledge/KnowledgePage.tsx` | Да; UI, загрузка данных/файлов и действия базы знаний |
| 380 | `src/types.ts` | Да по ориентиру файла; общий каталог типов разных доменов |
| 351 | `src/features/reports/ReportsPage.tsx` | Да; отчёты, фильтры и визуализация |
| 258 | `src/features/boards/BoardLayoutDialog.tsx` | Чуть выше 250 строк |
| 219 | `src/features/boards/BoardArchiveDialog.tsx` | В пределах ориентира |
| 122 | `src/api.ts` | HTTP-клиент и API разных фич в одном файле |
| 93 | `src/features/boards/BoardDialog.tsx` | В пределах ориентира |
| 70 | `src/components/ui.tsx` | Общие UI компоненты |
| 10 | `src/main.tsx` | Точка входа |

В `src/App.tsx` обнаружены компоненты `Auth`, `RequestCard`, `TemplateData`, `StoreAccessLinks`, `RequestModal`, `RequestComponents`, `CreateRequest`, `RequestsList`, `Calendar`, `StoreDetails`, `Organizations`, `Stores`, `Templates`, `Staff`, `Telegram`, `Reports`, `App` и мелкие UI компоненты. Несколько несвязанных экранов живут в одном файле; точные границы компонентов следует подтвердить characterization-тестами до переноса.

## 3. Карта API endpoints и текущего покрытия

Таблица получена из router registrations и mounts в `backend/src/app.ts`. В колонке «Вход → выход» приведены категории текущего handler-контракта; детальные поля запросов/JSON ответов нужно зафиксировать characterization-тестами этапа 1 до перемещения каждого модуля. У endpoints нет интеграционных тестов маршрутов; «нет» означает отсутствие ссылки на тест endpoint. Проверки сервисов досок/политик и отдельные unit-тесты не считаются покрытием HTTP-контракта.

| Метод и путь | Доступ по действующей схеме | Вход → выход (категория) | Тест маршрута |
|---|---|---|---|
| GET `/api/health` | публичный | без входа → health и состояние БД | нет |
| GET `/api/health/telegram` | публичный | без входа → состояние интеграции Telegram | нет |
| POST `/api/auth/register` | публичный | регистрационные поля → учётная запись/статус | нет |
| POST `/api/auth/login` | публичный, rate limited | email/password → пользователь и auth cookies/tokens | нет |
| POST `/api/auth/refresh` | refresh cookie/token | cookie → обновлённая сессия | нет |
| POST `/api/auth/logout` | публичный | без входа → очистка auth cookies | нет |
| GET `/api/auth/me` | access token | token → текущий пользователь/access | нет |
| GET `/api/boards` | access token; доступ к персональным/общим доскам проверяется отдельно | фильтры/права → список доступных досок | нет |
| POST `/api/boards` | access token; создание доски по роли/типу доски | данные доски → доска | нет |
| GET `/api/boards/:boardId` | access token + доступ к доске | id → доска/колонки/карточки | нет |
| GET `/api/boards/:boardId/archive` | access token + доступ к доске | id/параметры → архив карточек | нет |
| PATCH `/api/boards/:boardId/layout` | access token + права на доску | конфигурация колонок → layout | нет |
| POST `/api/boards/cards/:cardId/restore` | access token + доступ к доске | id карточки/целевая колонка/version → карточка | нет |
| PATCH `/api/boards/:boardId` | access token + доступ/права на доску | поля доски → доска | нет |
| DELETE `/api/boards/:boardId` | access token + доступ/права на доску | id → подтверждение удаления | нет |
| GET `/api/boards/:boardId/access` | access token + доступ к доске | id → список доступа | нет |
| POST `/api/boards/:boardId/access` | access token + право управления доской | пользователь/роль → список доступа | нет |
| DELETE `/api/boards/:boardId/access/:userId` | access token + право управления доской | ids → подтверждение удаления доступа | нет |
| POST `/api/boards/:boardId/columns` | access token + права на доску | данные колонки → колонка | нет |
| PATCH `/api/boards/columns/:columnId` | access token + права на доску | данные колонки/version → колонка | нет |
| DELETE `/api/boards/columns/:columnId` | access token + права на доску | id → подтверждение удаления | нет |
| POST `/api/boards/columns/:columnId/move` | access token + права на доску | порядок/version → обновлённая колонка/доска | нет |
| POST `/api/boards/columns/:columnId/cards` | access token + права на доску | данные карточки → карточка | нет |
| PATCH `/api/boards/cards/:cardId` | access token + права на доску | поля карточки/version → карточка | нет |
| DELETE `/api/boards/cards/:cardId` | access token + права на доску | id → подтверждение удаления | нет |
| POST `/api/boards/cards/:cardId/archive` | access token + права на доску | id/version → архивная карточка | нет |
| POST `/api/boards/cards/:cardId/move` | access token + права на доску | колонка/позиция/version → перемещённая карточка | нет |
| GET `/api/components` | access token | без входа → каталог компонентов | нет |
| POST `/api/components` | `MANAGE_TEMPLATES` | компонент → созданный компонент | нет |
| PATCH `/api/components/:id` | `MANAGE_TEMPLATES` | поля компонента → компонент | нет |
| GET `/api/departments` | access token | без входа → активные/доступные отделы | нет |
| POST `/api/departments` | `MANAGE_STAFF` | поля отдела → отдел | нет |
| PATCH `/api/departments/:id` | `MANAGE_STAFF` | поля отдела → отдел | нет |
| GET `/api/knowledge/sections` | `MANAGE_KNOWLEDGE` | без входа → разделы базы знаний | нет |
| POST `/api/knowledge/sections` | `MANAGE_KNOWLEDGE` | раздел → созданный раздел | нет |
| PATCH `/api/knowledge/sections/:id` | `MANAGE_KNOWLEDGE` | поля раздела → раздел | нет |
| DELETE `/api/knowledge/sections/:id` | `MANAGE_KNOWLEDGE` | id → подтверждение удаления | нет |
| POST `/api/knowledge/import` | `MANAGE_KNOWLEDGE` | файлы импорта → результат импорта | нет |
| GET `/api/knowledge/articles` | `MANAGE_KNOWLEDGE` | фильтры/поиск → список статей | нет |
| POST `/api/knowledge/articles` | `MANAGE_KNOWLEDGE` | статья → созданная статья | нет |
| GET `/api/knowledge/articles/:id` | `MANAGE_KNOWLEDGE` | id → статья | нет |
| PATCH `/api/knowledge/articles/:id` | `MANAGE_KNOWLEDGE` | поля статьи → статья | нет |
| DELETE `/api/knowledge/articles/:id` | `MANAGE_KNOWLEDGE` | id → подтверждение удаления | нет |
| POST `/api/knowledge/articles/:id/attachments` | `MANAGE_KNOWLEDGE` | файл → вложение | нет |
| GET `/api/knowledge/attachments/:id/download` | `MANAGE_KNOWLEDGE` | id → файл | нет |
| DELETE `/api/knowledge/attachments/:id` | `MANAGE_KNOWLEDGE` | id → подтверждение удаления | нет |
| GET `/api/moderation/users` | `MANAGE_CLIENTS` | без входа → ожидающие модерации пользователи | нет |
| GET `/api/moderation/organizations` | `MANAGE_CLIENTS` | без входа → ожидающие организации | нет |
| GET `/api/moderation/stores` | `MANAGE_CLIENTS` | без входа → ожидающие точки | нет |
| PATCH `/api/moderation/users/:id` | `MANAGE_CLIENTS` | решение модерации → пользователь | нет |
| PATCH `/api/moderation/organizations/:id` | `MANAGE_CLIENTS` | решение модерации → организация | нет |
| PATCH `/api/moderation/stores/:id` | `MANAGE_CLIENTS` | решение модерации → точка | нет |
| GET `/api/organizations` | access token; список ограничивается объектными правами | фильтры → организации | нет |
| POST `/api/organizations` | access token; правила отличаются для клиента/сотрудника | поля организации → организация | нет |
| PATCH `/api/organizations/:id` | access token + доступ к объекту/permission | поля → организация | нет |
| DELETE `/api/organizations/:id` | `DELETE_ORGANIZATIONS` + объектная проверка | id → удаление организации | нет |
| PUT `/api/organizations/:id/members` | access token + доступ/управление организацией | список участников → участники организации | нет |
| POST `/api/organizations/:id/approve` | активный сотрудник; не CLIENT | id → организация | нет |
| POST `/api/organizations/:id/reject` | активный сотрудник; не CLIENT | id/причина → организация | нет |
| POST `/api/recurring-requests/:id/stop` | access token + проверка владельца/прав | id → остановленное расписание | нет |
| GET `/api/request-types` | access token; выдача различается для CLIENT/staff | без входа → типы заявок | нет |
| POST `/api/request-types` | `MANAGE_TEMPLATES` | тип/шаблон → созданный тип | нет |
| PATCH `/api/request-types/:id` | `MANAGE_TEMPLATES` | поля типа → обновлённый тип | нет |
| GET `/api/requests/assignees` | access token + role/access filtering | фильтры → исполнители | нет |
| GET `/api/requests` | access token + role/object scope | фильтры/поиск → заявки | нет |
| GET `/api/requests/stats` | `VIEW_REPORTS` | период → статистика | нет |
| GET `/api/requests/calendar` | `VIEW_REPORTS` | период/фильтры → календарные данные | нет |
| POST `/api/requests` | access token + роль, организация/отдел и template checks | заявка → созданная заявка | нет |
| PATCH `/api/requests/:id` | access token + объектные права/permissions | статус/приоритет/отдел/исполнители/комментарий → заявка | нет |
| DELETE `/api/requests/:id` | access token + `DELETE_REQUESTS`/объектные права | id → удаление заявки | нет |
| POST `/api/requests/:id/assignees/self` | access token + роль/доступ к заявке | id → назначение текущего исполнителя | нет |
| DELETE `/api/requests/:id/assignees/self` | access token + роль/доступ к заявке | id → снятие текущего исполнителя | нет |
| POST `/api/requests/:id/comments` | access token + объектные права/видимость комментария | текст/visibility → комментарий | нет |
| GET `/api/staff` | `MANAGE_STAFF` | без входа → сотрудники/отделы | нет |
| POST `/api/staff` | `MANAGE_STAFF` | данные сотрудника → сотрудник | нет |
| PATCH `/api/staff/:id` | `MANAGE_STAFF` | поля сотрудника → сотрудник | нет |
| PUT `/api/staff/:id/access` | `MANAGE_STAFF` | permissions/departments → обновлённый доступ | нет |
| PATCH `/api/staff/:id/password` | `MANAGE_STAFF` | пароль → результат смены | нет |
| POST `/api/staff/:id/telegram-link` | `MANAGE_STAFF` | id → код/ссылка привязки Telegram | нет |
| GET `/api/stores` | access token; выдача и секреты фильтруются по роли/permission | фильтры → торговые точки | нет |
| POST `/api/stores` | access token; правила отличаются CLIENT/staff | данные точки → созданная точка | нет |
| PATCH `/api/stores/:id` | access token + доступ к объекту/permission | поля точки → обновлённая точка | нет |
| DELETE `/api/stores/:id` | `DELETE_STORES` + объектная проверка | id → удаление точки | нет |
| GET `/api/stores/:id/access` | `VIEW_STORE_SECRETS` или `MANAGE_STORES` в зависимости от handler | id → доступы точки | нет |
| PUT `/api/stores/:id/access` | `MANAGE_STORES` | доступы/секреты → обновлённые доступы | нет |
| POST `/api/stores/:id/approve` | активный сотрудник; не CLIENT | id → одобренная точка | нет |
| POST `/api/stores/:id/reject` | активный сотрудник; не CLIENT | id/причина → отклонённая точка | нет |
| GET `/api/telegram/integrations` | `VIEW_TELEGRAM` | без входа → интеграции | нет |
| GET `/api/telegram/chats` | `VIEW_TELEGRAM` | фильтры → чаты и связи | нет |
| GET `/api/telegram/chats/:id/messages` | `VIEW_TELEGRAM` | id/пагинация → сообщения чата | нет |
| PATCH `/api/telegram/chats/:id/link` | `VIEW_TELEGRAM` (router-level) | привязка → связь чата | нет |
| PUT `/api/telegram/chats/:id/links` | `VIEW_TELEGRAM` (router-level) | organizations/stores links → связи чата | нет |
| POST `/api/telegram/...` (строка 167 handler) | `VIEW_TELEGRAM` + `SEND_TELEGRAM` | сообщение → результат отправки | нет |
| GET `/api/users` | `MANAGE_CLIENTS` | фильтры → клиенты | нет |
| POST `/api/users` | `MANAGE_CLIENTS` | данные клиента → созданный клиент | нет |
| PATCH `/api/users/:id/status` | `MANAGE_CLIENTS` | статус → клиент | нет |
| PATCH `/api/users/:id/password` | `MANAGE_CLIENTS` | пароль → результат смены | нет |

Примечания: таблица содержит 97 зарегистрированных путей: 95 router endpoints и два health endpoints. Точный URL Telegram POST — `/api/telegram/chats/:id/messages`; handler сейчас возвращает 501 после проверок настроенности интеграции, и это поведение должно быть зафиксировано тестом. У запросов на API нет общей OpenAPI-спецификации. Для нескольких маршрутов роль недостаточна как описание доступа: решение зависит от permission override, членства в отделе/доске, владения организацией/заявкой и статуса пользователя; сохранять эти правила следует буквально из текущих handlers/services.

## 4. Карта UI и ролей

Сейчас URL не является состоянием текущего раздела: `App` хранит `page` в `useState("dashboard")`; переходы вызывают `setPage(id)`. При прямом открытии другого пути и при перезагрузке страница выбирается снова как dashboard. Идентификаторы разделов и видимые названия:

| Текущий id | Раздел | Условие навигации |
|---|---|---|
| `dashboard` | Обзор | все вошедшие пользователи |
| `requests` | Заявки | все вошедшие пользователи; вид/действия зависят от роли и permissions |
| `calendar` | Календарь | все вошедшие пользователи |
| `organizations` | Организации | все вошедшие пользователи; список ограничен доступом к организации |
| `stores` | Торговые точки | все вошедшие пользователи; действия и секреты ограничены permissions |
| `my-boards` | Мои доски | `role !== CLIENT` |
| `team-boards` | Доски | `role !== CLIENT`; доступ к каждой доске дополнительно проверяется сервером |
| `reports` | Отчёты | `VIEW_REPORTS` |
| `templates` | Шаблоны | `MANAGE_TEMPLATES` |
| `staff` | Сотрудники | `MANAGE_STAFF` |
| `telegram` | Telegram | `VIEW_TELEGRAM` |
| `knowledge` | База знаний | `MANAGE_KNOWLEDGE` |

Вход/регистрация находится в `Auth` внутри `src/App.tsx`; при неавторизованном состоянии показывается форма, после входа — shell приложения. Отдельных URL login/registration, guard'ов, страницы 404 и восстановления исходного адреса нет. Встроенная страница отказа в доступе отдельно не обнаружена: недоступные nav пункты скрываются по текущим permissions; сервер остаётся источником фактической авторизации.

Роли Prisma: `CLIENT`, `DIRECTOR`, `DEPARTMENT_HEAD`, `MASTER`. Разрешения: `VIEW_ALL_REQUESTS`, `MANAGE_REQUESTS`, `CANCEL_REQUESTS`, `TRANSFER_REQUESTS`, `SET_PRIORITY`, `ASSIGN_MASTERS`, `MANAGE_CLIENTS`, `MANAGE_ORGANIZATIONS`, `MANAGE_STORES`, `VIEW_STORE_SECRETS`, `VIEW_TELEGRAM`, `SEND_TELEGRAM`, `MANAGE_TEMPLATES`, `VIEW_REPORTS`, `MANAGE_STAFF`, `MANAGE_KNOWLEDGE`, `DELETE_ORGANIZATIONS`, `DELETE_STORES`, `DELETE_REQUESTS`. `DIRECTOR` по умолчанию получает все enum permissions; `CLIENT` — ни одного; для `DEPARTMENT_HEAD` и `MASTER` задан список defaults; индивидуальные permission overrides меняют эти наборы. Поэтому guard'ы будущего frontend router должны опираться на access/permission данные пользователя, а не только на название роли.

Основной экран обновляет данные через общий `load()` и polling раз в 5 секунд, а также при возврате вкладки в видимое состояние. Большинство действий в компонентах вызывает прямой `api()` и затем `reload()`/`load()`. Это обеспечивает периодическое/ручное обновление в текущей вкладке, но не является feature-level кэшированием; конкретные моменты и затронутые списки фиксируются текущими UI characterization/smoke тестами до изменений.

## 5. God-файлы и план разбиения

| Файл/область | Смешанные ответственности | Предлагаемое направление |
|---|---|---|
| `src/App.tsx` | auth, app shell, навигация, permissions, все основные экраны, API mutations/reloads | сначала characterization/smoke; затем тонкий app/layout/router, auth provider/guards и feature pages/components/api/queries |
| `backend/src/routes/requests.ts` | 10 HTTP endpoints, parse/validation, permission/object rules, Prisma reads/writes/transactions, DTO | request routes → controllers → services → schemas/mappers; сохранить отдельные уже существующие request contracts/policy/include/reports pieces |
| `backend/src/routes/boards.ts` | board router/access, 20 endpoints, card/column operations, Prisma transactions, validation | модуль boards; использовать существующие board service/policy; сначала HTTP tests |
| `backend/src/routes/knowledge.ts` | 13 endpoints, CRUD, multipart upload/import, DOCX parsing, persistence | routes/controller/service/schemas; файловые преобразования отделить как чистые utils только при подтверждённом повторении |
| `backend/src/telegram/bot.ts` | polling/lifecycle Telegram, команды, взаимодействие с пользователем, Prisma, заявочная логика | module telegram + transport handler/service, сохранять формат Telegram сообщений и callback flow |
| `backend/src/app.ts` | composition, middleware, health logic, router mounts, static fallback | `createApp(deps)` и registration; listen и lifecycle оставить в `server.ts` |
| `backend/src/routes/stores.ts` и `organizations.ts` | endpoint handlers вперемешку с объектной авторизацией, moderation и транзакциями | отдельные modules; сохранить scoped rules и связанные organization/store сценарии |
| `backend/src/routes/auth.ts` | HTTP, schemas, password hash, tokens/cookies, user access | auth module отдельно после инфраструктуры, как указано в ТЗ |
| `backend/src/utils/permissions.ts`, `middleware/auth.ts`, `middleware/errors.ts` | shared access policy с Express context; auth middleware; legacy error mapping | characterization endpoints → shared/errors + shared/middleware; не менять тексты/status/body |
| `src/features/boards/BoardsPage.tsx` | загрузка/мутации, board state, optimistic drag/drop concerns и UI части | board queries/hooks и малые компоненты; оптимистичный drag/drop только после тестовой фиксации rollback-поведения |
| `src/features/knowledge/KnowledgePage.tsx` | page state, server requests, articles/sections/attachments UI | queries + контейнер + компоненты article/section/import/attachment |
| `src/features/reports/ReportsPage.tsx` | период/вкладка/загрузка и вывод разных срезов | report page и локальные view components; сохранять период и вкладку в URL |
| `src/api.ts`, `src/types.ts` | shared fetch/error handling и типы сразу нескольких доменов | shared/http + feature api/types; общие контракты через `shared-types/` после их проверки |

## 6. Список наблюдаемых особенностей и возможных странностей

Это только наблюдения, не исправления; до characterization они считаются текущим поведением:

1. `page` и report `view` — локальный React state; адрес/вкладка не восстанавливаются через URL.
2. Главные данные автоматически запрашиваются каждые 5 секунд, даже если пользователь просто просматривает открытый раздел; при возврате окна выполняется ещё одна загрузка.
3. Перечисленные HTTP endpoints не имеют integration tests; существующие тесты не фиксируют статус/JSON/cookies и role matrix через Express.
4. `src/App.tsx` превышает frontend лимит примерно в 15.6 раза; `backend/src/routes/{requests,boards,knowledge}.ts` превышают backend лимит.
5. Health `GET /api/health` напрямую исполняет Prisma query внутри `app.ts`; production SPA fallback зарегистрирован там же после API mounts.

На этапе 0 подтверждённых продуктовых багов не фиксировалось. Возможные потери состояния URL и частота polling — наблюдаемая текущая семантика, не предложение изменить её до characterization и решения по требованиям.

## 7. Предлагаемый порядок этапов/модулей

Обязательные верхнеуровневые этапы остаются в порядке ТЗ: 0 inventory → 1 backend characterization → 2 frontend tests/smoke/verify/CI → 3 backend shared infrastructure → 4 backend modules → 5 frontend router/providers → 6 frontend features → 7 cleanup/docs/deployment.

Предварительный порядок модулей внутри этапа 4, по текущему размеру и связям (после покрытия этапом 1 уточнить):

1. `recurring-requests` (37 строк) — малый HTTP модуль, зависит от request ownership/status.
2. `components` (47 строк) и `departments` (46 строк) — небольшие каталоги с разными permission rules.
3. `request-types` (123 строки) — template permissions, небольшой модуль.
4. `users` (156 строк) и `moderation` (175 строк) — клиентский CRUD/moderation, общие MANAGE_CLIENTS rules.
5. `staff` (187 строк) — права, department memberships и генерация Telegram link.
6. `telegram` HTTP (194 строки), затем `telegram/bot.ts`/notifications как отдельные тесно связанные unit работы.
7. `organizations` (270 строк) и `stores` (304 строки) — связанные сущности, approvals, secrets, object access.
8. `knowledge` (478 строк) — multipart/import/DOCX; отдельная проверка ответа и side effects вложений.
9. `boards` (590 строк) — уже есть domain service/policy, но много HTTP endpoints; использовать их после HTTP characterization.
10. `requests` (770 строк) — крупнейший и наиболее связанный домен, последним.
11. `auth` (167 строк) и middleware выносить отдельным этапом 3/4 после тестов; не включать auth в механический общий перенос модулей.

Внутри одного этапа каждый модуль/feature оформляется своей веткой и PR/набором небольших понятных коммитов. Начальная база тестов должна быть независимой от будущего рефакторинга и не подменять прежние ожидания.

## 8. Пробелы относительно критериев приёмки

- В корне нет `npm run verify`; CI выполняет сборки и backend unit tests, но не lint/format, frontend/backend typecheck отдельно, integration tests, coverage threshold или Playwright.
- Нет настроенной MariaDB test profile/test DB, `supertest`, фабрик и test auth helpers для всех четырёх ролей.
- Frontend не содержит Vitest/jsdom/Testing Library/MSW/Playwright; UI characterization smoke отсутствуют.
- Нет React Router, Query Client, feature query keys, frontend guards и URL-driven views/filters.
- `noUncheckedIndexedAccess` не включён; backend config использует ручную валидацию и не использует Zod для env.
- Frontend/backend contracts не синхронизированы с shared-types каталогом; OpenAPI/contract compile gate отсутствует.
- `backend/src/routes/` пока не пуста; `src/api.ts` и `src/types.ts` пока содержат логику/типы, не re-export-only.
- Имеющиеся миграции: 14; схема БД в рамках задачи не меняется. После настройки verify добавить read-only `prisma migrate diff` проверку без генерации новых migration files.

## 9. Отчёт этапа 0

- Создано: `docs/refactoring/inventory.md`.
- Код приложения, тесты, зависимости и Prisma schema/migrations этапом 0 не изменялись.
- Проверки: статическая инвентаризация через `rg`, подсчёт строк PowerShell и просмотр manifests/CI/schema. `npm run verify` отсутствует до этапа 2.
- Тесты не добавлялись и не запускались, поскольку на этапе 0 код не меняется.
- Отклонения: точное имя URL для Telegram POST на строке 167 уточнить до таблицы endpoint tests; пути отражены явно во время этапа 1.
- Ручная проверка: подтвердить, что разделы и текущие ограничения ролей соответствуют ожиданиям; прямые URL сегодня не поддерживаются.

## Приёмка этапа 0

ТЗ требует, чтобы этот документ утвердил автор **до перехода к этапу 1**. Этап 1 и изменение кода не начинались.
