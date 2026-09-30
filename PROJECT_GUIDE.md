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
| Интерфейс | React + TypeScript | [src/App.tsx](./src/App.tsx) |
| Оформление | Глобальные CSS-стили, адаптивность | [src/styles.css](./src/styles.css) |
| Запросы из интерфейса | API-клиент, сессия, обработка ошибок | [src/api.ts](./src/api.ts) |
| Типы интерфейса | TypeScript-описания данных API | [src/types.ts](./src/types.ts) |
| Сервер | Express API | [backend/src](./backend/src) |
| База | Prisma-модель и миграции MariaDB | [backend/prisma](./backend/prisma) |
| Telegram-бот | Приём сообщений и создание заявок | [backend/src/telegram/bot.ts](./backend/src/telegram/bot.ts) |

## Где менять UI

Весь основной пользовательский интерфейс пока расположен в одном файле: [src/App.tsx](./src/App.tsx). В нём удобно искать название кнопки, заголовок или компонент через поиск редактора.

| Что нужно изменить | Компонент / участок | Файл |
| --- | --- | --- |
| Левое меню, названия вкладок и иконки | `nav` внутри `App` | [src/App.tsx](./src/App.tsx) |
| Главная страница и карточки показателей | ветка `dashboard` внутри `App` | [src/App.tsx](./src/App.tsx) |
| Карточка заявки в списке | `RequestCard` | [src/App.tsx](./src/App.tsx) |
| Окно заявки, статусы, комментарии, история | `RequestModal` | [src/App.tsx](./src/App.tsx) |
| Форма новой заявки | `CreateRequest` | [src/App.tsx](./src/App.tsx) |
| Фильтры, «Мои на сегодня», выполненные и просроченные | `RequestsList` | [src/App.tsx](./src/App.tsx) |
| Месячный календарь и клик по дню | `Calendar` | [src/App.tsx](./src/App.tsx) |
| Организации | `Organizations` | [src/App.tsx](./src/App.tsx) |
| Торговые точки | `Stores` | [src/App.tsx](./src/App.tsx) |
| Шаблоны заявок | `Templates` | [src/App.tsx](./src/App.tsx) |
| Сотрудники, права и ссылка на Telegram | `Staff` | [src/App.tsx](./src/App.tsx) |
| Экран Telegram-диалогов | `Telegram` | [src/App.tsx](./src/App.tsx) |

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
- `.telegram-link` — блок привязки Telegram сотрудника.

Карточка организации открывает вкладку «Торговые точки» уже с фильтром по выбранной организации. Вкладка точек группирует карточки по организациям; клик по точке открывает `StoreDetails` с адресом, контактами, числом заявок и доступами. Любой активный сотрудник может заполнить или обновить доступы; сохранённые пароли видны только пользователям с разрешением `VIEW_STORE_SECRETS`. Ссылки открытия AnyDesk, ОФД и налоговой отображаются в карточке точки, её подробностях и в связанной заявке — только когда заполнен соответствующий ID или адрес.

Логотип хранится в [src/assets/bazis-logo.svg](./src/assets/bazis-logo.svg). Точка входа React — [src/main.tsx](./src/main.tsx).

## Функциональность заявок

Главный серверный модуль заявок: [backend/src/routes/requests.ts](./backend/src/routes/requests.ts).

Он отвечает за:

- `GET /api/requests` — выдачу доступных пользователю заявок и серверные фильтры;
- `POST /api/requests` — создание заявки и проверку обязательных полей шаблона;
- `PATCH /api/requests/:id` — статус, приоритет, отдел и исполнителей;
- `POST /api/requests/:id/assignees/self` — «Взять в работу»;
- `POST /api/requests/:id/comments` — внутренние и клиентские комментарии;
- запись истории создания, статусов, приоритета, отдела, исполнителей и комментариев.

Допустимые переходы статусов находятся в [backend/src/utils/request-status.ts](./backend/src/utils/request-status.ts). Если нужно разрешить новый переход, менять следует этот файл и список `transitions` в [src/App.tsx](./src/App.tsx), чтобы сервер и интерфейс работали одинаково.

### Выполненные, отменённые и просроченные

- Кнопка «Показать выполненные» в `RequestsList` показывает только `DONE`.
- Активный список скрывает `DONE` и `CANCELLED`.
- Просроченной считается плановая заявка с прошедшим `scheduledAt`, если её статус не `DONE` и не `CANCELLED`.
- Логика визуальной просрочки: `isOverdue` в [src/App.tsx](./src/App.tsx). Серверная логика при необходимости расширяется в [backend/src/routes/requests.ts](./backend/src/routes/requests.ts).

## Календарь и планирование

Интерфейс календаря находится в компоненте `Calendar` в [src/App.tsx](./src/App.tsx). Он показывает заявки с `urgency = SCHEDULED` и датой `scheduledAt`.

При нажатии на день открывается `CreateRequest` с уже выбранными датой и типом «Плановая». Ограничения даты (не раньше текущего времени и не более года вперёд) проверяются сервером в [backend/src/routes/requests.ts](./backend/src/routes/requests.ts).

Автоматические напоминания выполняются в [backend/src/utils/scheduled-reminders.ts](./backend/src/utils/scheduled-reminders.ts):

- за 24 часа;
- за 2 часа;
- отдельно для клиента и назначенных сотрудников;
- без повторов: факт отправки хранится в таблице `request_reminders`.

Планировщик запускается вместе с API в [backend/src/server.ts](./backend/src/server.ts) и проверяет заявки каждые 5 минут.

## Организации, точки и шаблоны

| Функция | API-логика | UI |
| --- | --- | --- |
| Организации | [backend/src/routes/organizations.ts](./backend/src/routes/organizations.ts) | `Organizations` в [src/App.tsx](./src/App.tsx) |
| Торговые точки и доступы | [backend/src/routes/stores.ts](./backend/src/routes/stores.ts) | `Stores` в [src/App.tsx](./src/App.tsx) |
| Отделы | [backend/src/routes/departments.ts](./backend/src/routes/departments.ts) | используются в формах заявок и сотрудников |
| Шаблоны заявок и дополнительные поля | [backend/src/routes/request-types.ts](./backend/src/routes/request-types.ts) | `Templates` в [src/App.tsx](./src/App.tsx) |

Новые поля шаблона добавляются через UI в JSON-поле «Дополнительные поля». Сервер проверяет обязательные поля при создании заявки в `validateTemplateData` внутри [backend/src/routes/requests.ts](./backend/src/routes/requests.ts). Заполненные значения отображаются в карточке заявки блоком «Дополнительные данные» (`TemplateData` в [src/App.tsx](./src/App.tsx)).

## Сотрудники, роли и права

| Зона | Файл |
| --- | --- |
| Список сотрудников, создание и доступы | [backend/src/routes/staff.ts](./backend/src/routes/staff.ts) |
| Проверка прав | [backend/src/utils/permissions.ts](./backend/src/utils/permissions.ts) |
| Авторизация и JWT | [backend/src/routes/auth.ts](./backend/src/routes/auth.ts), [backend/src/middleware/auth.ts](./backend/src/middleware/auth.ts) |
| UI сотрудников | `Staff` в [src/App.tsx](./src/App.tsx) |

Роли: `CLIENT`, `MASTER`, `DEPARTMENT_HEAD`, `DIRECTOR`. Базовые клиентские ограничения и права сотрудников определяются сервером; интерфейс дополнительно скрывает недоступные действия, но не заменяет серверную проверку.

### Привязка рабочего Telegram мастера

1. Руководитель открывает сотрудника в разделе «Сотрудники».
2. Нажимает «Подключить Telegram».
3. CRM создаёт одноразовую ссылку на 20 минут через `POST /api/staff/:id/telegram-link`.
4. Мастер открывает ссылку и запускает бота.
5. Бот связывает личный чат с учётной записью сотрудника.

Ссылку генерирует [backend/src/routes/staff.ts](./backend/src/routes/staff.ts), а бот проверяет и активирует её в [backend/src/telegram/bot.ts](./backend/src/telegram/bot.ts). Одноразовые коды хранятся в `telegram_link_codes`.

После привязки мастер получает сообщения о назначении заявки и напоминания о плановых работах.

## Telegram

| Задача | Файл |
| --- | --- |
| Получение команд и создание заявки из бота | [backend/src/telegram/bot.ts](./backend/src/telegram/bot.ts) |
| Отправка клиенту статусов и комментариев | [backend/src/utils/telegram-notifications.ts](./backend/src/utils/telegram-notifications.ts) |
| Отправка уведомлений назначенным сотрудникам | [backend/src/utils/telegram-notifications.ts](./backend/src/utils/telegram-notifications.ts) |
| API просмотра интеграций и диалогов | [backend/src/routes/telegram.ts](./backend/src/routes/telegram.ts) |
| Настройки имени бота и токена | [backend/src/config.ts](./backend/src/config.ts), `backend/.env` |

Клиент не получает номер заявки в сообщении о создании. Клиентские уведомления отправляются только в бот-чат, явно связанный с конкретной заявкой. Ошибка Telegram не отменяет изменение заявки в CRM.

## База и миграции

Схема всей базы данных: [backend/prisma/schema.prisma](./backend/prisma/schema.prisma).

Основные таблицы:

- `users`, `user_permissions`, `user_departments` — пользователи, роли и права;
- `organizations`, `stores` — клиенты и точки;
- `request_types` — шаблоны заявок;
- `requests`, `request_assignees`, `request_comments` — заявки и работа по ним;
- `request_activities` — журнал действий;
- `request_reminders` — защита от повторных напоминаний;
- `telegram_chats`, `telegram_messages`, `telegram_link_codes` — Telegram и безопасная привязка сотрудников.

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
- Подключение Prisma: [backend/src/db.ts](./backend/src/db.ts).
- Подробные сообщения ошибок полей: [backend/src/middleware/errors.ts](./backend/src/middleware/errors.ts).
- Шифрование чувствительных реквизитов торговых точек: [backend/src/utils/crypto.ts](./backend/src/utils/crypto.ts).

Если добавляется новое поле формы, нужно синхронно проверить четыре места: UI в `src/App.tsx`, тип в [src/types.ts](./src/types.ts), Zod-схему в нужном серверном route-файле и Prisma-схему/миграцию, если поле хранится в базе.

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
