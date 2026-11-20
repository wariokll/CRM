# Этап 8.4 — модуль organizations

## 1. Что сделано

Разделён модуль организаций: `organizations.routes.ts` содержит маршруты, middleware и валидацию; `organizations.controller.ts` преобразует запросы и HTTP-ответы; `organizations.service.ts` содержит операции Prisma и бизнес-логику; схемы вынесены в `organizations.contracts.ts`.

Размеры файлов:

| Файл                          |           До |      После |
| ----------------------------- | -----------: | ---------: |
| `organizations.routes.ts`     |  8 563 байта |   937 байт |
| `organizations.controller.ts` | отсутствовал | 2 178 байт |
| `organizations.service.ts`    | отсутствовал | 7 356 байт |
| `organizations.contracts.ts`  | отсутствовал | 1 379 байт |

## 2. Результат `npm.cmd run verify`

Полный прогон прошёл: проверка кодировки, TypeScript, ESLint и Prettier; frontend — 2 файла/4 теста; backend — 37 файлов/116 тестов. Backend coverage: statements 85.14%, branches 66.81%, functions 87.59%, lines 86.27%. Frontend и backend production builds, SPA fallback и Playwright smoke прошли; E2E — 11/11. Проверка Prisma миграций не обнаружила расхождений.

## 3. Тесты

Новые тесты не добавлялись. Существующие characterization-тесты API организаций прошли в составе полного прогона.

## 4. Изменение существующих тестов

Нет.

## 5. Отклонения

Схема БД и миграции не менялись. Сохранены порядок валидации и проверки доступа. Необычное поведение `PUT /api/organizations/:id/members` для отсутствующей организации (ошибка Prisma с HTTP 500) оставлено без изменений согласно требованиям этапа.

## 6. Найденные баги и странности поведения

Новых отклонений API не выявлено. Указанное поведение отсутствующей организации подтверждается существующей characterization-проверкой и намеренно не исправлялось.

## 7. Ручная проверка

Не требуется для завершения этого подэтапа: API suites, сборки и Playwright прошли.
