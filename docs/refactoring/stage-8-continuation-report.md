# Отчёт о продолжении рефакторинга этапа 8

Дата: 2026-11-27. Ветка: `master`. Основа работ: `ТЗ рефакторинг CRM.docx` и `stage-8-nontest-audit.md`.

## Сделанные подэтапы

- `8928ac0` — разделены knowledge import, stores mapper и request update notifications.
- `c8ef14f` — `BoardsPage` разделён на оболочку, рабочее поле и группу диалогов.
- `008cbb4` — knowledge page разделён на URL/query hook, editor hook и import hook.
- `9a25505` — Telegram handler разделён на базовые операции, staff linking и target selection.
- `d613639` — board actions и drag/drop вынесены из `useBoardsPage`.
- `e063c8f` — request update policy вынесена из update service.
- `26724ee` — загрузка knowledge page data и форматирование ошибок вынесены в общий helper.
- текущий подэтап — composition root перенесён в `src/app/`; `main.tsx` стал точкой запуска, `AppContent` размещён в layout feature, прежние корневые импорты сохранены через barrel. Исправлена mojibake-строка загрузки.
- следующий подэтап — проверки входа, статуса пользователя и доступных разделов вынесены в `RequireAuth` / `RequireRole`; доступ по-прежнему строится через `buildNavigation`.
- структура frontend features приведена к `components/`, `pages/`, `hooks/` и `types/`; 64 TSX UI/type файла и 6 существующих TS hooks перенесены, импорты скорректированы. Knowledge editor разделён на editing и attachment hooks.

Каждый подэтап проверялся перед коммитом и был отправлен в `origin/master`.

## Финальная проверка

Последний полный `npm.cmd run verify` завершился с кодом 0:

- UTF-8 check, frontend/backend TypeScript, ESLint, Prettier — успешно;
- frontend: 10 тестов;
- backend: 116 тестов;
- Prisma: 14 миграций, нет ожидающих миграций и schema diff;
- обе production-сборки и SPA fallback smoke — успешно;
- Playwright: 12/12.

Полный прогон после реорганизации папок и разделения knowledge attachment hook также завершился успешно: frontend 10/10, backend 116/116, Prisma без schema diff, обе сборки, SPA fallback smoke и Playwright 12/12.

Этот прогон включал guards: frontend 10/10, backend 116/116, 14 Prisma migrations без schema diff, сборки, SPA fallback smoke и Playwright 12/12.

Проверка включала текущий composition-root подэтап. Повторный `npm.cmd run verify` прошёл после исправления относительных импортов; затем были удалены только случайные форматтером изменённые файлы из diff и BOM у `main.tsx` (содержимое приложения не менялось).

API контракты и схема БД не менялись. Docker и службы не использовались по прямому указанию пользователя. Проверка/публикация production/LAN окружения не выполнялась.

## Остаточные отклонения

Ограничения и причины зафиксированы в [сверке ТЗ](stage-8-nontest-audit.md). Ключевые из них: развёртывание через Docker/services исключено пользователем; request validation оставлена рядом с операциями ради неизменности API ответов; физическая структура отдельных frontend features ещё не полностью копирует схему из ТЗ; approximate size/function limits остаются ориентиром для локальной декомпозиции. Актуальные размеры приведены в [инвентаризации](inventory.md).
