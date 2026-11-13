# Stage 8.1 — Cyrillic text recovery

## Scope and comparison

Compared Cyrillic string literals before editing: the current refactor branch at the stage-8 starting commit (`a99a6d1`) and `HEAD~1` (`4b9a68b`) as the behavioral baseline. The comparison covered frontend source, backend source, Prisma seed files and scripts. For backend modules moved into `backend/src/modules`, the corresponding legacy route files were checked in `backend/src/routes`.

PowerShell rendered some valid UTF-8 source as mojibake, so comparison and detection used source code points and parsed TypeScript literals. No frontend text was changed: the suspicious console rendering there did not match the source code points. Confirmed damaged literals were in the board, knowledge, organization, request and store route modules.

## Recovered text

| Area | Damaged text | Recovered text |
| --- | --- | --- |
| Boards | `руководитель Рё начальники РѕС‚делов` | `руководитель и начальники отделов` |
| Boards | `Создатель РЅРµ может...` | `Создатель не может...` |
| Knowledge | `РЅРµ должен превышать` | `не должен превышать` |
| Knowledge | `Рљ статье` | `К статье` |
| Knowledge | `РќРµ удалось загрузить...` | `Не удалось загрузить...` |
| Knowledge | `РРјРїРѕСЂС‚ поддерживает...` | `Импорт поддерживает...` |
| Knowledge | `Р—Р° один раз...` | `За один раз...` |
| Knowledge | `статьи Рё подразделы` | `статьи и подразделы` |
| Knowledge | `РѕС‚ 2 до 240` | `от 2 до 240` |
| Knowledge | `Р’ документе РЅРµ найден текст` | `В документе не найден текст` |
| Knowledge | `РР·РІР»РµС‡С‘РЅРЅС‹Р№ текст` | `Извлечённый текст` |
| Knowledge | `РќРµ удалось обработать файл` | `Не удалось обработать файл` |
| Organizations | `Организация РЅР° модерации` | `Организация на модерации` |
| Requests | `Аккаунт РµС‰ё не одобрен` | `Аккаунт ещё не одобрен` |
| Requests | `РЅРµ найдена` / `РЅРµ принята` | `не найдена` / `не принята` |
| Requests | `Рє выбранной организации` / `Рє организации` | `к выбранной организации` / `к организации` |
| Requests | `РІ пределах`, `РІ заявке`, `РІ работу` | `в пределах`, `в заявке`, `в работу` |
| Requests | `Р±С‹ один` | `бы один` |
| Requests | `РёР· выбранных` | `из выбранных` |
| Requests | `РѕС‚дела` | `отдела` |
| Requests | `Р—аявка` | `Заявка` |
| Requests | `РСЃРїРѕР»РЅРёС‚Рµ...` | `Исполнитель` / `Исполнители` |
| Requests | `Р‘РђР—РРЎ CRM` | `БАЗИС CRM` |
| Requests | `Р’ работе`, `Р’С‹полнена`, `РћС‚менена`, `РІС‹сокий` | `В работе`, `Выполнена`, `Отменена`, `высокий` |
| Requests | `В»`, `В«`, `в†’` in interpolated notifications | Matching Russian quotation marks and arrow (`«…»`, `→`) |
| Stores | `Нет доступа Рє организации` | `Нет доступа к организации` |
| Stores | `Точка РЅРµ найдена` / `Точка РЅР° модерации` | `Точка не найдена` / `Точка на модерации` |

The request, knowledge and store entries above appeared at multiple call sites; every occurrence was corrected. API status codes, JSON keys, schemas, routes and database schema were left unchanged.

## Encoding guard

- Added `.editorconfig` with UTF-8 charset and `.gitattributes` with normalized LF text files and binary asset exceptions.
- Added `scripts/check-text-encoding.mjs`, which scans frontend, backend, seed and script sources for common mojibake markers, replacement characters and malformed quote sequences. `scripts/verify.mjs` runs it before compilation and tests.
- Added characterization assertions for the authentication 401 message and invalid-registration 400 response.

## Verification

- New characterization test on the original worktree at `4b9a68b`: 2 passed.
- `npm run verify` (invoked as `npm.cmd run verify` on Windows): passed. Text encoding scan, TypeScript, ESLint, Prettier, frontend tests (4), backend tests (84), frontend and backend builds, production SPA fallback and Playwright smoke tests (11) all passed.
- Prisma reported no pending migrations and no schema difference.
- Existing tests were not edited. The added characterization test is separate and is compatible with both the original app export and refactored app factory.

## Notes

- No database changes or dependencies were added.
- Manual browser review of every translated string in production UI was not performed; UI source literals had no confirmed corruption in the code-point scan.
