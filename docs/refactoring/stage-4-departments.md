# Этап 4. Backend modules — departments

Дата: 2026-11-11
Ветка: `refactor/stage-4-departments`

## Что сделано

- Добавлены characterization-тесты на department list, создание с trim, обновление имени/активности и запрет управления для CLIENT; затем тот же файл прошёл на новом модуле.
- `backend/src/routes/departments.ts` разделён на routes/controller/service/schemas в `backend/src/modules/departments/` и удалён.
- `app.ts` подключает feature router. Существующий API snapshot не менялся.

## Проверка

- После стабилизации smoke browser полный `npm run verify` завершился с кодом 0: 3 frontend unit, 60 backend и 10 Playwright тестов.
- TypeScript, ESLint, Prettier и production builds прошли.

Smoke browser изолирован от сетевой загрузки Google Fonts и использует 150 мс slow motion. Это устранило `page.goto()` timeout и гонку, когда список досок ещё загружался при следующем клике.

## Сохранённое поведение

Контракты department CRUD, сортировка списка, trim/валидация входных данных и `MANAGE_STAFF` gate сохранены. API, UI и схема БД не менялись.
