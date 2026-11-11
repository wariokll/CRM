# Карта проекта БАЗИС CRM

Этот документ — краткая карта исходного кода: где находится каждая часть CRM и в каком файле безопаснее менять интерфейс или бизнес-логику.

## Быстрый запуск

- Запуск локальной CRM, MariaDB, API и Telegram-бота: [start-crm.ps1](./start-crm.ps1).
- Остановка всех локальных процессов: [stop-crm.ps1](./stop-crm.ps1).
- Основной адрес после запуска: `http://localhost:3001`.
- Проверка API и базы: `http://localhost:3001/api/health`.
- Основные команды и сведения о развёртывании: [README.md](./README.md).

Секреты, токен Telegram-бота и пароли находятся только в `backend/.env`. Этот файл не нужно добавлять в Git и не следует передавать третьим лицам.

## Устройство проекта

| Зона | Назначение | Где менять |
| --- | --- | --- |
| Interface entry and browser routes | `src/main.tsx`, `src/router.tsx` |
| Оформление | Глобальные CSS-стили, адаптивность | [src/styles.css](./src/styles.css) |
| Запросы из интерфейса | API-клиент, сессия, обработка ошибок | [src/shared/http.ts](./src/shared/http.ts) |
| Frontend domain types | `src/types/`; `src/types.ts` re-exports them for compatibility |
| Сервер | Express API | [backend/src](./backend/src) |
| База | Prisma-модель и миграции MariaDB | [backend/prisma](./backend/prisma) |
| Telegram-бот | Приём сообщений и создание заявок | [backend/src/telegram/bot.ts](./backend/src/telegram/bot.ts) |

## Where to change the UI

The shell, route definitions, feature pages, and reusable views live in separate modules. Use these locations when changing the interface:

| Area | Source |
| --- | --- |
| Browser routes and not-found page | `src/router.tsx`, `src/features/layout/NotFoundPage.tsx` |
| Application shell and role guard | `src/App.tsx`, `src/features/layout/navigation.ts` |
| Sidebar and page header | `src/features/layout/AppSidebar.tsx`, `AppPageHeader.tsx` |
| Dashboard | `src/features/dashboard/DashboardPage.tsx` |
| Requests, card, editor, and create form | `src/features/requests/` |
| Calendar | `src/features/requests/CalendarPage.tsx` |
| Organizations and stores | `src/features/organizations/`, `src/features/stores/` |
| Request templates and staff | `src/features/templates/`, `src/features/staff/` |
| Telegram | `src/features/telegram/` |
| Boards | `src/features/boards/` |
| Reports | `src/features/reports/` |
| Knowledge base | `src/features/knowledge/` |
| Shared HTTP and query keys | `src/shared/http.ts`, `src/shared/queryKeys.ts` |

### Стили

Визуальные изменения — цвета, отступы, сетки, мобильное отображение, оформление карточек и модальных окон — находятся в [src/styles.css](./src/styles.css).

Полезные CSS-классы:

- `.sidebar`, `.content`, `.page` — общий каркас;
- `.request-card`, `.request-grid` — список заявок;
- `.request-filters` — панель фильтров;
- `.calendar-*` — календарь;
- `.modal`, `.field`, `.modal-actions` — формы и окна;
- `.activity-list` — журнал изменений;
- `.overdue` — метка просроченной заявки;
- `.telegram-link` — блок привязки Telegram сотрудника;
- `.telegram-links-form` — форма связей Telegram-аккаунта с организациями и точками.

Карточка организации открывает вкладку «Торговые точки» уже с фильтром по выбранной организации. Вкладка точек группирует карточки по организациям; клик по точке открывает `StoreDetails` с адресом, контактами, числом заявок и доступами. Любой активный сотрудник может заполнить или обновить доступы; сохранённые пароли видны только пользователям с разрешением `VIEW_STORE_SECRETS`. Ссылки открытия AnyDesk, ОФД и налоговой отображаются в карточке точки, её подробностях и в связанной заявке — только когда заполнен соответствующий ID или адрес.

Над списком точек есть выпадающий фильтр «Все организации»: он позволяет показать точки выбранной организации или вернуть общий список.

Любой активный сотрудник видит кнопки «Принять» и «Отклонить» в карточке ИП/организации или точки со статусом «На модерации». При отклонении требуется причина для клиента. Ожидающие модерации карточки всегда находятся сверху, выделены янтарным цветом, а их количество показано в левом меню. После принятия объект становится активным и доступен для выбора в заявках.

Логотип хранится в [src/assets/bazis-logo.svg](./src/assets/bazis-logo.svg). Точка входа React — [src/main.tsx](./src/main.tsx).

## Канбан-доски

Личные и командные доски реализованы в [src/features/boards/BoardsPage.tsx](./src/features/boards/BoardsPage.tsx). Кнопка «Архив» показывает архивные карточки текущей доски, поиск работает по названию, описанию и исходному столбцу. При восстановлении можно выбрать любой действующий столбец этой же доски; карточка возвращается в конец списка с сохранением описания и срока.

Кнопка «Вид доски» открывает настройки всех текущих столбцов, а значок настройки в заголовке столбца — настройки конкретного столбца. Доступны ширина 240–1800 px, ползунок, быстрые размеры ×2/×3/×4, сетка 1–6 карточек в строке, предпросмотр и возврат к стандартному виду 294 px / 1 карточка. При увеличении числа карточек минимальная ширина автоматически растёт. Настройки хранятся в базе и общие для всех участников доски. Новые столбцы создаются со стандартным видом.

- Окно архива: [BoardArchiveDialog.tsx](./src/features/boards/BoardArchiveDialog.tsx).
- Настройки вида: [BoardLayoutDialog.tsx](./src/features/boards/BoardLayoutDialog.tsx).
- API: [backend/src/modules/boards/board.routes.ts](./backend/src/modules/boards/board.routes.ts) — `GET /api/boards/:boardId/archive`, `POST /api/boards/cards/:cardId/restore` и `PATCH /api/boards/:boardId/layout`.
- Проверка доступа, восстановление и атомарное сохранение настроек: [board.service.ts](./backend/src/modules/boards/board.service.ts). Изменения защищены версиями; при конфликте обновление всех выбранных столбцов откатывается целиком.
- Миграция `20261030120000_board_column_layout` добавляет ширину и сетку, сохраняя прежний вид существующих столбцов.

## Функциональность заявок

Главный серверный модуль заявок: [backend/src/modules/requests/request.routes.ts](./backend/src/modules/requests/request.routes.ts).

Он отвечает за:

- `GET /api/requests` — выдачу доступных пользователю заявок и серверные фильтры;
- `POST /api/requests` — создание заявки и проверку обязательных полей шаблона;
- `PATCH /api/requests/:id` — статус, приоритет, отдел и исполнителей;
- `POST /api/requests/:id/assignees/self` — «Взять в работу»;
- `POST /api/requests/:id/comments` — внутренние и клиентские комментарии;
- запись истории создания, статусов, приоритета, отдела, исполнителей и комментариев.

Request status transitions are shared from `src/features/requests/requestDisplay.ts` and `backend/src/utils/request-status.ts`.

### Выполненные, отменённые и просроченные

- Кнопка «Показать выполненные» в `RequestsList` показывает только `DONE`.
- Активный список скрывает `DONE` и `CANCELLED`.
- Просроченной считается плановая заявка с прошедшим `scheduledAt`, если её статус не `DONE` и не `CANCELLED`.
- Overdue display logic: `src/features/requests/requestDisplay.ts`; request API behavior: `backend/src/modules/requests/request.routes.ts`.

## Календарь и планирование

The calendar UI is in `src/features/requests/CalendarPage.tsx`; it displays scheduled requests with `urgency = SCHEDULED` and `scheduledAt`.

При нажатии на день открывается `CreateRequest` с уже выбранными датой и типом «Плановая». Ограничения даты (не раньше текущего времени и не более года вперёд) проверяются сервером в [backend/src/modules/requests/request.routes.ts](./backend/src/modules/requests/request.routes.ts).

Автоматические напоминания выполняются в [backend/src/utils/scheduled-reminders.ts](./backend/src/utils/scheduled-reminders.ts):

- за 24 часа;
- за 2 часа;
- отдельно для клиента и назначенных сотрудников;
- без повторов: факт отправки хранится в таблице `request_reminders`.

Планировщик запускается вместе с API в [backend/src/server.ts](./backend/src/server.ts) и проверяет заявки каждые 5 минут.

## Организации, точки и шаблоны

| Функция | API-логика | UI |
| --- | --- | --- |
| Organizations | `backend/src/modules/organizations/organizations.routes.ts` | `src/features/organizations/OrganizationsPage.tsx` |
| Stores and access details | `backend/src/modules/stores/stores.routes.ts` | `src/features/stores/StoresPage.tsx` |
| Отделы | [backend/src/modules/departments/departments.routes.ts](./backend/src/modules/departments/departments.routes.ts) | используются в формах заявок и сотрудников |
| Request templates and extra fields | `backend/src/modules/request-types/request-types.routes.ts` | `src/features/templates/TemplatesPage.tsx` |

Template validation is in `backend/src/modules/requests/request.routes.ts`; request template data is rendered by `src/features/requests/RequestTemplateData.tsx`.

## Сотрудники, роли и права

| Зона | Файл |
| --- | --- |
| Список сотрудников, создание и доступы | [backend/src/modules/staff/staff.routes.ts](./backend/src/modules/staff/staff.routes.ts) |
| Проверка прав | [backend/src/utils/permissions.ts](./backend/src/utils/permissions.ts) |
| Авторизация и JWT | [backend/src/modules/auth/auth.routes.ts](./backend/src/modules/auth/auth.routes.ts), [backend/src/shared/middleware/auth.ts](./backend/src/shared/middleware/auth.ts) |
| Staff UI | `src/features/staff/StaffPage.tsx` |

Роли: `CLIENT`, `MASTER`, `DEPARTMENT_HEAD`, `DIRECTOR`. Базовые клиентские ограничения и права сотрудников определяются сервером; интерфейс дополнительно скрывает недоступные действия, но не заменяет серверную проверку.

### Привязка рабочего Telegram мастера

1. Руководитель открывает сотрудника в разделе «Сотрудники».
2. Нажимает «Подключить Telegram».
3. CRM создаёт одноразовую ссылку на 20 минут через `POST /api/staff/:id/telegram-link`.
4. Мастер открывает ссылку и запускает бота.
5. Бот связывает личный чат с учётной записью сотрудника.

Ссылку генерирует [backend/src/modules/staff/staff.routes.ts](./backend/src/modules/staff/staff.routes.ts), а бот проверяет и активирует её в [backend/src/telegram/bot.ts](./backend/src/telegram/bot.ts). Одноразовые коды хранятся в `telegram_link_codes`.

После привязки мастер получает сообщения о назначении заявки и напоминания о плановых работах.

## Telegram

| Задача | Файл |
| --- | --- |
| Получение команд и создание заявки из бота | [backend/src/telegram/bot.ts](./backend/src/telegram/bot.ts) |
| Отправка клиенту статусов и комментариев | [backend/src/utils/telegram-notifications.ts](./backend/src/utils/telegram-notifications.ts) |
| Отправка уведомлений назначенным сотрудникам | [backend/src/utils/telegram-notifications.ts](./backend/src/utils/telegram-notifications.ts) |
| API просмотра интеграций и диалогов | [backend/src/modules/telegram/telegram.routes.ts](./backend/src/modules/telegram/telegram.routes.ts) |
| Настройки имени бота и токена | [backend/src/config.ts](./backend/src/config.ts), `backend/.env` |

Клиент не получает номер заявки в сообщении о создании. Клиентские уведомления отправляются только в бот-чат, явно связанный с конкретной заявкой. Ошибка Telegram не отменяет изменение заявки в CRM.

### Привязка Telegram-аккаунта к организациям и точкам

Пользователь сначала пишет боту, после чего его аккаунт появляется в разделе «Telegram». Нажмите «Настроить привязки» у нужного аккаунта и выберите любое число организаций и торговых точек. Связи хранятся отдельно, поэтому один аккаунт может относиться к нескольким организациям и точкам, а каждая организация или точка — к нескольким аккаунтам.

При создании заявки ботом точка, привязанная напрямую, имеет приоритет. Если напрямую выбрана ровно одна точка, она подставляется автоматически. Если у аккаунта указана только организация, бот получает её активные точки: единственную подставляет сам, при нескольких показывает кнопки выбора. Логика находится в [backend/src/telegram/bot.ts](./backend/src/telegram/bot.ts), API сохранения связей — в [backend/src/modules/telegram/telegram.routes.ts](./backend/src/modules/telegram/telegram.routes.ts).

## База и миграции

Схема всей базы данных: [backend/prisma/schema.prisma](./backend/prisma/schema.prisma).

Основные таблицы:

- `users`, `user_permissions`, `user_departments` — пользователи, роли и права;
- `organizations`, `stores` — клиенты и точки;
- `request_types` — шаблоны заявок;
- `requests`, `request_assignees`, `request_comments` — заявки и работа по ним;
- `request_activities` — журнал действий;
- `request_reminders` — защита от повторных напоминаний;
- `telegram_chats`, `telegram_messages`, `telegram_link_codes` — Telegram и безопасная привязка сотрудников;
- `telegram_chat_organizations`, `telegram_chat_stores` — связи «многие-ко-многим» между Telegram-аккаунтами, организациями и точками.
- `organization_contacts` — несколько контактных лиц организации: ФИО, телефон и примечание.

Новые изменения структуры БД добавляются отдельной миграцией в [backend/prisma/migrations](./backend/prisma/migrations). Не редактируйте уже применённую миграцию: создавайте новую.

```powershell
cd backend
npx prisma migrate dev --name короткое_название_изменения
npm run prisma:deploy
```

После изменения схемы нужно обновить Prisma-клиент и собрать API:

```powershell
cd backend
npx prisma generate
npm run build
npm test
```

## API, ошибки и безопасность

- Сборка Express и маршрутов: [backend/src/app.ts](./backend/src/app.ts).
- Конфигурация окружения: [backend/src/config.ts](./backend/src/config.ts).
- Карта модулей и production-checklist: [ARCHITECTURE.md](./ARCHITECTURE.md).
- Шаблон production-переменных без секретов: [backend/.env.production.example](./backend/.env.production.example).
- Подключение Prisma: [backend/src/db.ts](./backend/src/db.ts).
- Подробные сообщения ошибок полей: [backend/src/middleware/errors.ts](./backend/src/middleware/errors.ts).
- Шифрование чувствительных реквизитов торговых точек: [backend/src/utils/crypto.ts](./backend/src/utils/crypto.ts).

Если добавляется новое поле формы, нужно синхронно проверить четыре места: UI in the matching `src/features/<feature>/` module, its type under `src/types/`, backend validation in the corresponding feature module, and Prisma schema/migration only when storage changes are separately approved.

## Сборка и проверка после изменений

```powershell
# Интерфейс, из корня
npm run build

# API и тесты
cd backend
npm run build
npm test
```

Для применения изменений в локальной запущенной версии выполните из корня:

```powershell
./stop-crm.ps1
./start-crm.ps1
```

Логи API и бота: `backend/.logs`. Локальные данные MariaDB: `backend/.mysql-data`; оба каталога не следует коммитить.

## Telegram, отчёты и обновление данных

- [backend/src/telegram/bot.ts](./backend/src/telegram/bot.ts): после выбора шаблона бот задаёт дополнительные поля по очереди, затем просит описание. Поле `FILE` в боте принимает ссылку или текстовое описание; загрузка бинарных файлов потребует отдельного файлового хранилища.
- [backend/src/utils/telegram-notifications.ts](./backend/src/utils/telegram-notifications.ts): клиент получает статусы и публичные комментарии в чат создания заявки либо в чаты, привязанные к клиенту, организации или точке. Исполнитель получает уведомление при назначении и самостоятельном взятии заявки.
- Reports API and aggregation: `backend/src/modules/requests/request.routes.ts` and `reports.service.ts`; reports UI and date filters: `src/features/reports/ReportsPage.tsx`.
Общие списки и карточки используют TanStack Query; мутации инвалидируют связанные ключи, а возврат к вкладке обновляет устаревшие данные.
- При регистрации достаточно принять организацию: ожидающая учётная запись клиента и её ожидающие точки активируются автоматически. Обработчик: [backend/src/modules/organizations/organizations.routes.ts](./backend/src/modules/organizations/organizations.routes.ts).

## Проверка пользовательских сценариев

Автоматические unit-тесты находятся в [backend/src/utils](./backend/src/utils): они проверяют допустимые и запрещённые переходы статусов, а также шифрование реквизитов. Перед выпуском обязательно запускайте `npm test` из `backend`.

Ручная приемка для сценариев с внешними системами:

1. Создать шаблон с обязательными `TEXT`, `SELECT`, `NUMBER`, `DATE`, `CHECKBOX` и необязательным полем; пройти его в браузере и через Telegram, затем сверить «Дополнительные данные» в заявке.
2. Привязать один клиентский чат к организации и несколько — к точкам; изменить статус и добавить клиентский комментарий. Убедиться, что уведомления пришли только в привязанные клиентские чаты.
3. Подключить Telegram сотрудника одноразовой ссылкой; назначить его на заявку, сменить статус и взять заявку в работу. Убедиться в уведомлениях.
4. Зарегистрировать нового клиента с первой точкой; принять организацию и проверить автоматическую активацию клиента и точки.
5. Проверить отчёты за текущий месяц и произвольный период: клиент, сотрудник, точка и каждая заявка должны учитывать права текущего пользователя.
6. Открыть CRM в двух вкладках, изменить заявку в одной и убедиться, что во второй данные обновляются примерно через 5 секунд либо при возвращении на вкладку.
