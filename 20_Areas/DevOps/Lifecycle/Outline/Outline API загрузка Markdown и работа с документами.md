# Outline API: загрузка Markdown и работа с документами

## Обзор

У Outline есть HTTP API, и готовый `.md` загружается в него одним запросом `documents.import`. Через API доступно всё, что умеет интерфейс: коллекции, документы, поиск, экспорт, пользователи и группы. Описание проверено на стенде с Outline v1.12.0 (`https://outline.test`).

Общие правила для всех методов:

- Адрес: `POST https://outline.test/api/<метод>`, например `/api/documents.info`. Методы называются `<объект>.<действие>`.
- Метод всегда `POST`, даже для чтения.
- Авторизация: заголовок `Authorization: Bearer ol_api_...`.
- Тело запроса: JSON (`Content-Type: application/json`). Исключение — загрузка файлов: там `multipart/form-data`.
- Если параметров нет, тело можно не передавать или отправить `{}`.

Успешный ответ:

```json
{
  "ok": true,
  "status": 200,
  "data": { "id": "…", "title": "…", "url": "/doc/…" },
  "pagination": { "limit": 25, "offset": 0, "nextPath": "/api/documents.list?limit=25&offset=25" },
  "policies": [ … ]
}
```

Ошибка:

```json
{ "ok": false, "status": 401, "error": "authentication_required", "message": "Authentication required" }
```

Списочные методы (`*.list`, `*.search`) принимают `limit` (до 100) и `offset`. Полный справочник методов — [getoutline.com/developers](https://www.getoutline.com/developers).

## API-ключ

Ключ создаётся в интерфейсе: **Настройки → Account → API & Access** (`https://outline.test/settings/api-and-access`) → **New API key**. Значение показывается один раз — сразу сохрани его.

| Поле формы | Что указать |
| --- | --- |
| Name | Назначение, например `md-import` |
| Expiration | Срок жизни; по умолчанию месяц, можно «без срока» |
| Scopes | Пусто = полный доступ. Через пробел — ограничение: `read`, `write`, `create` или конкретные методы (`documents.import collections.list`) |

Что важно знать о ключах:

- Ключ начинается с `ol_api_` и действует **с правами своего владельца**. Ключ от `ivan` видит и меняет только то, что может `ivan`.
- Для скриптов заведи отдельного пользователя в LDAP (например `uid=bot`) и выдай ему доступ только к нужным коллекциям.
- Отозвать ключ можно только из интерфейса или из веб-сессии. Запрос `apiKeys.delete`, подписанный самим ключом, отклоняется: `403 Invalid authentication type`.
- Все ключи команды администратор видит в **Настройки → Developer → API keys**. Создание ключей участниками разрешено по умолчанию, админ может это выключить.
- Удалённый или просроченный ключ сразу получает `401 Invalid API key`.

Храни ключ вне репозитория, например в `~/.config/outline/token` с правами `600`.

## Подготовка рабочего места

Нужны `curl`, `jq` и доверие к CA стенда. Запись `outline.test` в hosts и файл `outline-lab-ca.crt` уже настроены по основной документации стенда.

1. Сохрани ключ в файл:

```bash
mkdir -p ~/.config/outline && chmod 700 ~/.config/outline
read -rs OUTLINE_TOKEN && printf %s "$OUTLINE_TOKEN" > ~/.config/outline/token && chmod 600 ~/.config/outline/token
```

2. Добавь в `~/.bashrc` или `~/.zshrc` переменные и обёртку `ol`:

```bash
export OUTLINE_URL=https://outline.test
export OUTLINE_CA=~/Documents/Training/outline/outline-lab-ca.crt

# ol <метод> [json]  —  вызов API с JSON-телом
ol() {
  curl -s --cacert "$OUTLINE_CA" -X POST "$OUTLINE_URL/api/$1" \
    -H "Authorization: Bearer $(cat ~/.config/outline/token)" \
    -H 'Content-Type: application/json' -d "${2:-{\}}"
}
```

Метод `documents.import` шлёт файл через `multipart/form-data`, поэтому обёртка `ol` ему не подходит. Для него — вторая функция:

```bash
# olf <метод> -F ключ=значение ...  —  multipart-запрос
olf() {
  local m="$1"; shift
  curl -s --cacert "$OUTLINE_CA" -X POST "$OUTLINE_URL/api/$m" \
    -H "Authorization: Bearer $(cat ~/.config/outline/token)" "$@"
}
```

3. Проверь ключ:

```bash
ol auth.info | jq '{ok, user: .data.user.name, role: .data.user.role, team: .data.team.name}'
# {"ok": true, "user": "Ivan Petrov", "role": "member", "team": "Lab"}
```

Если CA добавлен в системное хранилище (раздел 7 основной документации), `--cacert` можно убрать. Флаг `-k` не используй: он выключает проверку сертификата, а с ним и защиту токена.

## Коллекции

Любой документ лежит в коллекции, поэтому перед загрузкой нужен `id` коллекции. Место назначения задаётся одним из трёх способов: `collectionId` (UUID), `collectionId: "personal"` (личная коллекция) или `parentDocumentId` (вложить в документ).

Список коллекций, доступных владельцу ключа:

```bash
ol collections.list '{"limit":100}' | jq -r '.data[] | "\(.id)  \(.name)"'
```

Найти id по имени:

```bash
COL=$(ol collections.list '{"limit":100}' | jq -r '.data[] | select(.name=="Инструкции") | .id')
```

Создать коллекцию:

```bash
COL=$(ol collections.create '{"name":"Инструкции","description":"Импорт из md","permission":"read"}' | jq -r .data.id)
```

| `permission` | Кто видит коллекцию |
| --- | --- |
| не указан / `null` | Только создатель и явно добавленные участники (частная) |
| `read` | Вся команда читает, пишут участники коллекции |
| `read_write` | Вся команда читает и редактирует |

Структура коллекции деревом (удобно проверять после импорта):

```bash
ol collections.documents "{\"id\":\"$COL\"}" | jq '[.data[] | {title, children: [.children[].title]}]'
```

У списка коллекций пользователя есть кэш в Redis на 10 секунд. Документы в только что созданной коллекции попадают в `documents.list` и `documents.search` только через эти 10 секунд. `documents.info` и `collections.documents` видят их сразу.

`collections.delete` удаляет коллекцию **вместе со всеми документами** в ней.

## Загрузка готового .md

Готовый файл загружается методом `documents.import`. Он синхронный: ответ приходит уже с созданным документом.

```bash
olf documents.import \
  -F file=@notes.md \
  -F collectionId="$COL" \
  -F publish=true | jq '.data | {id, title, url}'
```

Ответ на стенде:

```json
{ "id": "054d4e5a-…", "title": "Заметка из файла", "url": "/doc/zametka-iz-fajla-fyk9gU29wI" }
```

Полный адрес документа — `https://outline.test` + `url`.

| Поле | Обязательно | Значение |
| --- | --- | --- |
| `file` | да | Файл: `@путь` |
| `collectionId` | одно из двух | UUID коллекции или `personal` |
| `parentDocumentId` | одно из двух | UUID родительского документа — новый ляжет вложенным |
| `publish` | нет | `true` — опубликовать. Без него документ станет черновиком, видным только владельцу ключа |

Как формируется заголовок (первое сработавшее правило):

1. `title:` во frontmatter (`---\ntitle: …\n---` в начале файла).
2. Первый заголовок `# H1`. Он становится заголовком документа и убирается из текста. Эмодзи в начале становится иконкой.
3. Имя файла без расширения: `no-title.md` → «no-title».

Тем же методом импортируются `.markdown`, `.txt`, `.html`, `.docx`, `.csv`, `.tsv`, `.pdf`, `.mht`, `.eml` и `.textpack`.

Импорт вложенным документом:

```bash
PARENT=$(olf documents.import -F file=@guide.md -F collectionId="$COL" -F publish=true | jq -r .data.id)
olf documents.import -F file=@guide-install.md -F parentDocumentId="$PARENT" -F publish=true | jq -r .data.title
```

**Лимит размера.** По умолчанию импорт принимает файлы до 1 000 000 байт (\~1 МБ). В `.env` стенда лимит не переопределён. Чтобы поднять его, на сервере outline добавь в `/opt/outline/.env` строку ниже и выполни `sudo systemctl restart outline`:

```bash
FILE_STORAGE_IMPORT_MAX_SIZE=26214400   # 25 МБ
```

Сам nginx на proxy пропускает до 250 МБ (`client_max_body_size 250m`).

## Документы из текста

Когда markdown собирает скрипт, а не лежит в файле, передавай его в JSON через `documents.create`. Этим же способом текст обновляется в уже существующем документе. JSON собирается через `jq`: так кавычки и переносы строк экранируются правильно.

### Создать

```bash
jq -n --arg title "Регламент" --rawfile text body.md --arg c "$COL" \
  '{title:$title, text:$text, collectionId:$c, publish:true}' \
| ol documents.create "$(cat)" | jq '.data | {id, title, url}'
```

Заголовок из `title` и `# H1` в `text` — разные вещи. Если в тексте остался H1, он покажется в документе вторым заголовком. Убрать первую строку `# …` перед отправкой:

```bash
sed '1{/^# /d}' notes.md > body.md
```

### Обновить

```bash
# заменить весь текст
jq -n --arg id "$DOC" --rawfile text body.md '{id:$id, text:$text}' | ol documents.update "$(cat)" | jq .ok

# дописать в конец (или "prepend" — в начало)
jq -n --arg id "$DOC" '{id:$id, text:"\n\nДописано через API", editMode:"append"}' | ol documents.update "$(cat)" | jq .ok

# переименовать
ol documents.update "{\"id\":\"$DOC\",\"title\":\"Новое название\"}" | jq .data.title
```

`editMode` принимает `replace` (по умолчанию), `append`, `prepend` и `patch`. Старый флаг `append: true` ещё работает, но устарел. Все изменения сохраняются в истории документа.

### Прочитать и найти

```bash
# по UUID или по хвосту ссылки: https://outline.test/doc/iz-json-Lytgym6K5x
ol documents.info '{"id":"iz-json-Lytgym6K5x"}' | jq '.data | {id, title, updatedAt}'

# документы коллекции страницами
ol documents.list "{\"collectionId\":\"$COL\",\"limit\":100,\"offset\":0}" | jq -r '.data[].title'

# полнотекстовый поиск (кириллица работает) и поиск по заголовкам
ol documents.search '{"query":"картошка"}' | jq -r '.data[] | "\(.document.title): \(.context)"'
ol documents.search_titles '{"query":"Регламент"}' | jq -r '.data[].title'
```

### Выгрузить обратно в .md

```bash
# с Accept: text/markdown ответ — чистый markdown, первой строкой идёт "# <заголовок>"
curl -s --cacert "$OUTLINE_CA" -X POST "$OUTLINE_URL/api/documents.export" \
  -H "Authorization: Bearer $(cat ~/.config/outline/token)" \
  -H 'Content-Type: application/json' -H 'Accept: text/markdown' \
  -d "{\"id\":\"$DOC\"}" -o export.md

# без Accept — JSON, текст в поле data
ol documents.export "{\"id\":\"$DOC\"}" | jq -r .data > export.md
```

### Удалить

```bash
ol documents.delete "{\"id\":\"$DOC\"}"                    # в корзину, можно вернуть documents.restore
ol documents.delete "{\"id\":\"$DOC\",\"permanent\":true}"  # навсегда: только уже удалённый и только админ команды
```

## Массовая загрузка

Каталог `.md` с подкаталогами загружает скрипт `scripts/outline-import-dir.sh` из каталога стенда. Вложенность и порядок как в `ls` сохраняются. Скрипт проверен на стенде ключом обычного участника (`ivan`).

```bash
~/Documents/Training/outline/scripts/outline-import-dir.sh ./docs "Инструкции"
```

Что он делает:

1. Ищет коллекцию по имени. Если её нет, создаёт.
2. Каждый `.md` импортирует методом `documents.import`, сразу опубликованным.
3. Подкаталог превращает в документ-раздел. Текст раздела берёт из `README.md` или `index.md`, а если их нет — создаёт пустой документ с именем каталога. Файлы каталога ложатся внутрь раздела (`parentDocumentId`).
4. Между загрузками делает паузу 2,5 с (лимит 25 импортов в минуту). На `429` ждёт 20 с и повторяет, на другой ошибке останавливается.

Пример с стенда — слева каталог, справа что получилось в Outline:

```text
docs/                             Инструкции (коллекция)
├── a.md            # А первый    ├── А первый
├── b.md            # Б второй    ├── Б второй
├── intro.md        # Введение    ├── Введение
├── Установка/                    ├── Раздел установки   ← README.md
│   ├── README.md                 │   ├── Outline
│   ├── outline.md                │   └── Proxy          ← пустой раздел
│   └── Proxy/                    │       └── Nginx
│       └── nginx.md              └── Эксплуатация
└── Эксплуатация/                     └── backup         ← файл без H1
    └── backup.md
```

Скрипт настраивается переменными окружения:

- `OUTLINE_URL` — адрес, по умолчанию `https://outline.test`;
- `OUTLINE_CA` — CA, по умолчанию `outline-lab-ca.crt` стенда;
- `OUTLINE_TOKEN` — ключ, по умолчанию читается из `~/.config/outline/token`.

**Картинки.** При загрузке по одному файлу картинки по относительным путям (`![](img/a.png)`) не загружаются. Ссылки на `https://…` остаются как есть. Для каталога с картинками используй ZIP-импорт:

1. Упакуй каталог: `cd docs && zip -r ../docs.zip .`
2. Зайди в Outline админом: **Настройки → Import → Markdown** → выбери `docs.zip`.
3. Каждый каталог верхнего уровня станет коллекцией. Импорт идёт в фоне, статус виден на той же странице.

У этого импорта есть и API (`attachments.create` + `imports.create`), но только для админа и с предварительной загрузкой файла. Разово проще сделать через интерфейс.

## Ошибки и лимиты

Причину ошибки почти всегда называет поле `message`. Смотри его так: `| jq '{status, error, message}'`.

| Код | `error` / `message` | Причина | Что делать |
| --- | --- | --- | --- |
| 401 | `authentication_required` / Unable to decode token | Ключ не передан или искажён | Проверь заголовок `Authorization: Bearer ol_api_…` и нет ли переноса строки в файле ключа |
| 401 | `authentication_required` / Invalid API key | Ключ отозван или просрочен | Выпусти новый |
| 403 | `authorization_error` | У владельца ключа нет прав на коллекцию или действие (админские методы, `apiKeys.delete` ключом) | Дай доступ к коллекции или возьми ключ админа |
| 403 | `csrf_error` | Запрос с cookie сессии вместо ключа | Для скриптов используй только Bearer-ключ: CSRF там не проверяется |
| 400 | `validation_error` / one of collectionId or parentDocumentId is required | Не указано, куда класть документ | Добавь `-F collectionId=…` |
| 400 | `validation_error` / … Invalid input | Неверный тип или формат поля (не UUID, строка вместо числа) | Сверь тело со справочником |
| 400 | `import_error` / File type … not supported | Формат не поддерживается | Проверь расширение файла |
| 404 | `not_found` | Нет такого id или документ недоступен | Проверь id и права |
| 400 | `invalid_request` / The selected file was larger than the 1 MB maximum size | Больше `FILE_STORAGE_IMPORT_MAX_SIZE` (1 МБ на стенде) | Подними лимит в `.env` (раздел «Загрузка готового .md») |
| 429 | `rate_limit_exceeded` | Превышен лимит запросов | Подожди и повтори |
| — | curl: (60) SSL certificate problem | curl не доверяет CA стенда | Добавь `--cacert outline-lab-ca.crt` |
| — | curl: (6) Could not resolve host | Нет записи `outline.test` в hosts | См. раздел 7 основной документации |

Ещё один частый `400 invalid_request`: `Pagination limit is too large (max 100)`, если передать `limit` больше 100.

Лимиты запросов включены по умолчанию (`RATE_LIMITER_ENABLED=true`), заголовков с остатком лимита Outline не отдаёт.

| Лимит | Значение |
| --- | --- |
| Общий на все методы | 1000 запросов за 60 с (`RATE_LIMITER_REQUESTS`, `RATE_LIMITER_DURATION_WINDOW`) |
| `documents.import` | 25 в минуту |
| `documents.list` | 100 в минуту |
| Размер импортируемого файла | 1 000 000 байт (`FILE_STORAGE_IMPORT_MAX_SIZE`) |
| Тело запроса на proxy | 250 МБ (`client_max_body_size`) |
| Страница списка | `limit` до 100 |
| Видимость новой коллекции в list/search | до 10 с (кэш Redis) |

## Справочник методов

Ниже методы из этого документа. Все они проверены на стенде (Outline v1.12.0) кроме `imports.create` и `documents.restore`. У остальных методов (пользователи, группы, доступ, комментарии, шаблоны) тот же формат, они описаны на [getoutline.com/developers](https://www.getoutline.com/developers).

| Метод | Тело | Ключевые параметры | Что делает |
| --- | --- | --- | --- |
| `auth.info` | JSON | — | Кто владелец ключа, какая команда |
| `collections.list` | JSON | `limit`, `offset` | Доступные коллекции |
| `collections.info` | JSON | `id` | Одна коллекция, её `url` |
| `collections.create` | JSON | `name`, `description`, `permission`, `icon`, `color` | Новая коллекция |
| `collections.documents` | JSON | `id` | Дерево документов коллекции |
| `collections.delete` | JSON | `id` | Удалить коллекцию вместе с документами |
| `documents.import` | multipart | `file`, `collectionId` или `parentDocumentId`, `publish` | Загрузить `.md` / `.docx` / `.html` … |
| `documents.create` | JSON | `title`, `text`, `collectionId` или `parentDocumentId`, `publish` | Документ из markdown-строки |
| `documents.update` | JSON | `id`, `title`, `text`, `editMode`, `publish` | Изменить текст или заголовок |
| `documents.info` | JSON | `id` (UUID или хвост ссылки) | Документ целиком, включая `text` |
| `documents.list` | JSON | `collectionId`, `parentDocumentId`, `limit`, `offset` | Список документов |
| `documents.search` | JSON | `query`, `limit`, `offset` | Полнотекстовый поиск, фрагмент в `context` |
| `documents.search_titles` | JSON | `query` | Поиск по заголовкам |
| `documents.export` | JSON | `id`; заголовок `Accept: text/markdown` | Выгрузить в markdown |
| `documents.delete` | JSON | `id`, `permanent` | В корзину или навсегда |
| `documents.restore` | JSON | `id` | Вернуть из корзины |
| `imports.create` | JSON | `service: "markdown"`, `attachmentId` | ZIP-импорт, только админ |
| `apiKeys.list` | JSON | — | Ключи пользователя (без значений, только `last4`) |
