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

Таблица получена из router registrations и mounts в `backend/src/app.ts`. Сценарии и ограничения текущего HTTP-characterization покрытия этапа 8.3 описаны в [отчёте этапа 8.3](stage-8-3-api-characterization.md) и его [97-строчной матрице endpoint-сценариев](stage-8-3-endpoint-matrix.md). Наличие общей auth/role матрицы не означает, что каждый endpoint имеет отдельные успешные, невалидные и missing-object сценарии.

| Метод и путь | Доступ по действующей схеме | Вход → выход (категория) | Characterization |
|---|---|---|---|
| GET `/api/health` | публичный | без входа → health и состояние БД | см. отчёт 8.3 |
| GET `/api/health/telegram` | публичный | без входа → состояние интеграции Telegram | см. отчёт 8.3 |
| POST `/api/auth/register` | публичный | регистрационные поля → учётная запись/статус | см. отчёт 8.3 |
| POST `/api/auth/login` | публичный, rate limited | email/password → пользователь и auth cookies/tokens | см. отчёт 8.3 |
| POST `/api/auth/refresh` | refresh cookie/token | cookie → обновлённая сессия | см. отчёт 8.3 |
| POST `/api/auth/logout` | публичный | без входа → очистка auth cookies | см. отчёт 8.3 |
| GET `/api/auth/me` | access token | token → текущий пользователь/access | см. отчёт 8.3 |
| GET `/api/boards` | access token; доступ к персональным/общим доскам проверяется отдельно | фильтры/права → список доступных досок | см. отчёт 8.3 |
| POST `/api/boards` | access token; создание доски по роли/типу доски | данные доски → доска | см. отчёт 8.3 |
| GET `/api/boards/:boardId` | access token + доступ к доске | id → доска/колонки/карточки | см. отчёт 8.3 |
| GET `/api/boards/:boardId/archive` | access token + доступ к доске | id/параметры → архив карточек | см. отчёт 8.3 |
| PATCH `/api/boards/:boardId/layout` | access token + права на доску | конфигурация колонок → layout | см. отчёт 8.3 |
| POST `/api/boards/cards/:cardId/restore` | access token + доступ к доске | id карточки/целевая колонка/version → карточка | см. отчёт 8.3 |
| PATCH `/api/boards/:boardId` | access token + доступ/права на доску | поля доски → доска | см. отчёт 8.3 |
| DELETE `/api/boards/:boardId` | access token + доступ/права на доску | id → подтверждение удаления | см. отчёт 8.3 |
| GET `/api/boards/:boardId/access` | access token + доступ к доске | id → список доступа | см. отчёт 8.3 |
| POST `/api/boards/:boardId/access` | access token + право управления доской | пользователь/роль → список доступа | см. отчёт 8.3 |
| DELETE `/api/boards/:boardId/access/:userId` | access token + право управления доской | ids → подтверждение удаления доступа | см. отчёт 8.3 |
| POST `/api/boards/:boardId/columns` | access token + права на доску | данные колонки → колонка | см. отчёт 8.3 |
| PATCH `/api/boards/columns/:columnId` | access token + права на доску | данные колонки/version → колонка | см. отчёт 8.3 |
| DELETE `/api/boards/columns/:columnId` | access token + права на доску | id → подтверждение удаления | см. отчёт 8.3 |
| POST `/api/boards/columns/:columnId/move` | access token + права на доску | порядок/version → обновлённая колонка/доска | см. отчёт 8.3 |
| POST `/api/boards/columns/:columnId/cards` | access token + права на доску | данные карточки → карточка | см. отчёт 8.3 |
| PATCH `/api/boards/cards/:cardId` | access token + права на доску | поля карточки/version → карточка | см. отчёт 8.3 |
| DELETE `/api/boards/cards/:cardId` | access token + права на доску | id → подтверждение удаления | см. отчёт 8.3 |
| POST `/api/boards/cards/:cardId/archive` | access token + права на доску | id/version → архивная карточка | см. отчёт 8.3 |
| POST `/api/boards/cards/:cardId/move` | access token + права на доску | колонка/позиция/version → перемещённая карточка | см. отчёт 8.3 |
| GET `/api/components` | access token | без входа → каталог компонентов | см. отчёт 8.3 |
| POST `/api/components` | `MANAGE_TEMPLATES` | компонент → созданный компонент | см. отчёт 8.3 |
| PATCH `/api/components/:id` | `MANAGE_TEMPLATES` | поля компонента → компонент | см. отчёт 8.3 |
| GET `/api/departments` | access token | без входа → активные/доступные отделы | см. отчёт 8.3 |
| POST `/api/departments` | `MANAGE_STAFF` | поля отдела → отдел | см. отчёт 8.3 |
| PATCH `/api/departments/:id` | `MANAGE_STAFF` | поля отдела → отдел | см. отчёт 8.3 |
| GET `/api/knowledge/sections` | `MANAGE_KNOWLEDGE` | без входа → разделы базы знаний | см. отчёт 8.3 |
| POST `/api/knowledge/sections` | `MANAGE_KNOWLEDGE` | раздел → созданный раздел | см. отчёт 8.3 |
| PATCH `/api/knowledge/sections/:id` | `MANAGE_KNOWLEDGE` | поля раздела → раздел | см. отчёт 8.3 |
| DELETE `/api/knowledge/sections/:id` | `MANAGE_KNOWLEDGE` | id → подтверждение удаления | см. отчёт 8.3 |
| POST `/api/knowledge/import` | `MANAGE_KNOWLEDGE` | файлы импорта → результат импорта | см. отчёт 8.3 |
| GET `/api/knowledge/articles` | `MANAGE_KNOWLEDGE` | фильтры/поиск → список статей | см. отчёт 8.3 |
| POST `/api/knowledge/articles` | `MANAGE_KNOWLEDGE` | статья → созданная статья | см. отчёт 8.3 |
| GET `/api/knowledge/articles/:id` | `MANAGE_KNOWLEDGE` | id → статья | см. отчёт 8.3 |
| PATCH `/api/knowledge/articles/:id` | `MANAGE_KNOWLEDGE` | поля статьи → статья | см. отчёт 8.3 |
| DELETE `/api/knowledge/articles/:id` | `MANAGE_KNOWLEDGE` | id → подтверждение удаления | см. отчёт 8.3 |
| POST `/api/knowledge/articles/:id/attachments` | `MANAGE_KNOWLEDGE` | файл → вложение | см. отчёт 8.3 |
| GET `/api/knowledge/attachments/:id/download` | `MANAGE_KNOWLEDGE` | id → файл | см. отчёт 8.3 |
| DELETE `/api/knowledge/attachments/:id` | `MANAGE_KNOWLEDGE` | id → подтверждение удаления | см. отчёт 8.3 |
| GET `/api/moderation/users` | `MANAGE_CLIENTS` | без входа → ожидающие модерации пользователи | см. отчёт 8.3 |
| GET `/api/moderation/organizations` | `MANAGE_CLIENTS` | без входа → ожидающие организации | см. отчёт 8.3 |
| GET `/api/moderation/stores` | `MANAGE_CLIENTS` | без входа → ожидающие точки | см. отчёт 8.3 |
| PATCH `/api/moderation/users/:id` | `MANAGE_CLIENTS` | решение модерации → пользователь | см. отчёт 8.3 |
| PATCH `/api/moderation/organizations/:id` | `MANAGE_CLIENTS` | решение модерации → организация | см. отчёт 8.3 |
| PATCH `/api/moderation/stores/:id` | `MANAGE_CLIENTS` | решение модерации → точка | см. отчёт 8.3 |
| GET `/api/organizations` | access token; список ограничивается объектными правами | фильтры → организации | см. отчёт 8.3 |
| POST `/api/organizations` | access token; правила отличаются для клиента/сотрудника | поля организации → организация | см. отчёт 8.3 |
| PATCH `/api/organizations/:id` | access token + доступ к объекту/permission | поля → организация | см. отчёт 8.3 |
| DELETE `/api/organizations/:id` | `DELETE_ORGANIZATIONS` + объектная проверка | id → удаление организации | см. отчёт 8.3 |
| PUT `/api/organizations/:id/members` | access token + доступ/управление организацией | список участников → участники организации | см. отчёт 8.3 |
| POST `/api/organizations/:id/approve` | активный сотрудник; не CLIENT | id → организация | см. отчёт 8.3 |
| POST `/api/organizations/:id/reject` | активный сотрудник; не CLIENT | id/причина → организация | см. отчёт 8.3 |
| POST `/api/recurring-requests/:id/stop` | access token + проверка владельца/прав | id → остановленное расписание | см. отчёт 8.3 |
| GET `/api/request-types` | access token; выдача различается для CLIENT/staff | без входа → типы заявок | см. отчёт 8.3 |
| POST `/api/request-types` | `MANAGE_TEMPLATES` | тип/шаблон → созданный тип | см. отчёт 8.3 |
| PATCH `/api/request-types/:id` | `MANAGE_TEMPLATES` | поля типа → обновлённый тип | см. отчёт 8.3 |
| GET `/api/requests/assignees` | access token + role/access filtering | фильтры → исполнители | см. отчёт 8.3 |
| GET `/api/requests` | access token + role/object scope | фильтры/поиск → заявки | см. отчёт 8.3 |
| GET `/api/requests/stats` | `VIEW_REPORTS` | период → статистика | см. отчёт 8.3 |
| GET `/api/requests/procurement` | `VIEW_REPORTS` | период/componentId → плановая потребность в компонентах | см. отчёт 8.3 |
| POST `/api/requests` | access token + роль, организация/отдел и template checks | заявка → созданная заявка | см. отчёт 8.3 |
| PATCH `/api/requests/:id` | access token + объектные права/permissions | статус/приоритет/отдел/исполнители/комментарий → заявка | см. отчёт 8.3 |
| DELETE `/api/requests/:id` | access token + `DELETE_REQUESTS`/объектные права | id → удаление заявки | см. отчёт 8.3 |
| POST `/api/requests/:id/assignees/self` | access token + роль/доступ к заявке | id → назначение текущего исполнителя | см. отчёт 8.3 |
| DELETE `/api/requests/:id/assignees/self` | access token + роль/доступ к заявке | id → снятие текущего исполнителя | см. отчёт 8.3 |
| POST `/api/requests/:id/comments` | access token + объектные права/видимость комментария | текст/visibility → комментарий | см. отчёт 8.3 |
| GET `/api/staff` | `MANAGE_STAFF` | без входа → сотрудники/отделы | см. отчёт 8.3 |
| POST `/api/staff` | `MANAGE_STAFF` | данные сотрудника → сотрудник | см. отчёт 8.3 |
| PATCH `/api/staff/:id` | `MANAGE_STAFF` | поля сотрудника → сотрудник | см. отчёт 8.3 |
| PUT `/api/staff/:id/access` | `MANAGE_STAFF` | permissions/departments → обновлённый доступ | см. отчёт 8.3 |
| PATCH `/api/staff/:id/password` | `MANAGE_STAFF` | пароль → результат смены | см. отчёт 8.3 |
| POST `/api/staff/:id/telegram-link` | `MANAGE_STAFF` | id → код/ссылка привязки Telegram | см. отчёт 8.3 |
| GET `/api/stores` | access token; выдача и секреты фильтруются по роли/permission | фильтры → торговые точки | см. отчёт 8.3 |
| POST `/api/stores` | access token; правила отличаются CLIENT/staff | данные точки → созданная точка | см. отчёт 8.3 |
| PATCH `/api/stores/:id` | access token + доступ к объекту/permission | поля точки → обновлённая точка | см. отчёт 8.3 |
| DELETE `/api/stores/:id` | `DELETE_STORES` + объектная проверка | id → удаление точки | см. отчёт 8.3 |
| GET `/api/stores/:id/access` | `VIEW_STORE_SECRETS` или `MANAGE_STORES` в зависимости от handler | id → доступы точки | см. отчёт 8.3 |
| PUT `/api/stores/:id/access` | `MANAGE_STORES` | доступы/секреты → обновлённые доступы | см. отчёт 8.3 |
| POST `/api/stores/:id/approve` | активный сотрудник; не CLIENT | id → одобренная точка | см. отчёт 8.3 |
| POST `/api/stores/:id/reject` | активный сотрудник; не CLIENT | id/причина → отклонённая точка | см. отчёт 8.3 |
| GET `/api/telegram/integrations` | `VIEW_TELEGRAM` | без входа → интеграции | см. отчёт 8.3 |
| GET `/api/telegram/chats` | `VIEW_TELEGRAM` | фильтры → чаты и связи | см. отчёт 8.3 |
| GET `/api/telegram/chats/:id/messages` | `VIEW_TELEGRAM` | id/пагинация → сообщения чата | см. отчёт 8.3 |
| PATCH `/api/telegram/chats/:id/link` | `VIEW_TELEGRAM` (router-level) | привязка → связь чата | см. отчёт 8.3 |
| PUT `/api/telegram/chats/:id/links` | `VIEW_TELEGRAM` (router-level) | organizations/stores links → связи чата | см. отчёт 8.3 |
| POST `/api/telegram/...` (строка 167 handler) | `VIEW_TELEGRAM` + `SEND_TELEGRAM` | сообщение → результат отправки | см. отчёт 8.3 |
| GET `/api/users` | `MANAGE_CLIENTS` | фильтры → клиенты | см. отчёт 8.3 |
| POST `/api/users` | `MANAGE_CLIENTS` | данные клиента → созданный клиент | см. отчёт 8.3 |
| PATCH `/api/users/:id/status` | `MANAGE_CLIENTS` | статус → клиент | см. отчёт 8.3 |
| PATCH `/api/users/:id/password` | `MANAGE_CLIENTS` | пароль → результат смены | см. отчёт 8.3 |

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
