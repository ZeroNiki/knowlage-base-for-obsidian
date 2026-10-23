---
title: "Vim Training — Модуль 2: Операционная система Vim"
aliases: []
tags:
  - area/os
  - topic/vim
type: howto
status: stable
created: 2026-07-19
updated: 2026-10-23
---

# Модуль 2: "Операционная система Vim"
Здесь мы учимся применять изменения ко всему файлу сразу, используя командный режим (Ex commands). Vim работает как база данных текста.

## Основные инструменты
|**Команда**|**Философия / Что делает**|
|---|---|
|**`:g/pattern/cmd`**|Global. Находит все строки, соответствующие паттерну, и выполняет команду `cmd`.|
|**`:v/pattern/cmd`**|Inverse Global. Выполняет команду на строках, которые **НЕ** содержат паттерн.|
|**`:normal {cmd}`**|Выполняет обычные команды Vim (как в Normal режиме) для каждой выбранной строки. Безумно мощная вещь в связке с `:g`.|
|**`:bn` / `:bp` / `:bd`**|Навигация по буферам: следующий (buffer next), предыдущий, удалить (закрыть файл).|

##  Training File 2: Глобальная очистка
Создай файл `mod2_log.txt`:

```plaintext
INFO: System started successfully
DEBUG: Loading config file...
var connectionString = "localhost:5432"
DEBUG: Connecting to database...
ERROR: Connection timeout
var retryCount = 5
DEBUG: Retrying connection...
INFO: Connected to fallback database
var tempBuffer = "allocated"
```

**Задачи и Minimal Keystroke Challenge:**
1. **Задача:** Удалить все строки с логами `DEBUG`.
    - **Философия:** Не ищи их по одной. Прикажи системе удалить всё, что содержит паттерн.
    - **Challenge:** 11 нажатий -> `:g/DEBUG/d` + `Enter`.
2. **Задача:** Добавить точку с запятой (`;`) в конец каждой строки, которая начинается со слова `var`.
    - **Философия:** Используем комбинацию поиска и выполнения Normal-команд. Команда `A` (Shift+A) переводит в режим вставки в конце строки.
        
    - **Challenge:** 16 нажатий -> `:g/var/norm A;` + `Enter`.
