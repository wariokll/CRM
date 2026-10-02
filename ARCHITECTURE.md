# Архитектура БАЗИС CRM

Этот документ фиксирует границы модулей перед production-развёртыванием. Модули не обязаны быть классами: в React используются функциональные компоненты и хуки, а в Express — маршруты, сервисы и политики доступа.

## Backend

- `backend/src/routes` — тонкие HTTP-контроллеры: авторизация, разбор запроса, код ответа.
- `backend/src/modules/requests/request-policy.ts` — единые правила видимости заявок и права управления ими.
- `backend/src/modules/requests/reports.service.ts` — сбор и агрегация отчётных данных; не зависит от Express.
- `backend/src/modules/requests/request.contracts.ts` — Zod-контракты создания/изменения заявок и проверка полей шаблонов.
- `backend/src/modules/requests/request.include.ts` — единое описание связанных данных заявки для Prisma.
- `backend/src/telegram` — транспорт Telegram-бота. Сценарии создания заявки и уведомления должны оставаться отдельными от HTTP-маршрутов.
- `backend/src/modules/telegram/template-fields.ts` — чистая логика вопросов, подсказок и разбора значений дополнительных полей Telegram-шаблона.
- `backend/src/utils` — инфраструктурные функции: авторизация, токены, шифрование, статусы заявок.
- `backend/src/utils/app-error.ts` — единый тип ожидаемых бизнес-ошибок с безопасным HTTP-статусом.

Новый код следует добавлять в порядке `route → service → policy/repository`, не помещая бизнес-логику в маршрут.

## Frontend

- `src/App.tsx` — композиция приложения, сессия, навигация и загрузка общих данных.
- `src/features/reports/ReportsPage.tsx` — независимый экран отчётов.
- `src/components/ui.tsx` — общие элементы UI (`Button`, `Field`, `Modal`, `Empty`).
- Следующие кандидаты на перенос из `App.tsx`: заявки, календарь, организации, точки, сотрудники и Telegram. Каждый экран переносится вместе со своими модальными окнами и локальным состоянием.

## Production checklist

1. Перенести секреты из локального `.env` в секрет-хранилище сервера; сгенерировать новые JWT/ключ шифрования и заменить Telegram-токен.
   Шаблон переменных: [backend/.env.production.example](./backend/.env.production.example).
2. Использовать `prisma migrate deploy` в CI/CD, а не `migrate dev`.
3. Развернуть приложение и MariaDB отдельно; настроить ежедневный резервный бэкап и проверку восстановления.
4. Поставить Nginx или Caddy перед API: HTTPS, HSTS, ограничение размера запросов и безопасные cookies.
5. Включить production-логи, мониторинг `/api/health`, алерты ошибок Telegram и резервный staging-контур.
6. Добавить интеграционные тесты API и e2e-проверки критических потоков до первого публичного релиза.

Подробный порядок развёртывания на Windows Server: [DEPLOYMENT.md](./DEPLOYMENT.md).
