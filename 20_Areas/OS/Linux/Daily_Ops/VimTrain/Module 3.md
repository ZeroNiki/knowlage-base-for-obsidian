---
title: "Vim Training — Модуль 3: Flow и эффективность"
aliases: []
tags:
  - area/os
  - topic/vim
type: howto
status: stable
created: 2026-07-19
updated: 2026-10-23
---

# Модуль 3: "Flow и эффективность"
Профессионал не нажимает `l` двадцать раз, чтобы добраться до нужного символа. Он смотрит на символ и перемещается туда мгновенно.

## Основные инструменты

|**Команда**|**Философия / Что делает**|
|---|---|
|**`f{char}` / `t{char}`**|Find: прыжок **на** символ в строке. Till: прыжок **перед** символом. (Shift+F/T — поиск назад).|
|**`;` / `,`**|Повторить последний поиск через `f`/`t` вперед (`;`) или назад (`,`).|
|**`Ctrl + o` / `Ctrl + i`**|Jump List. `Ctrl+o` возвращает курсор на предыдущую позицию (как кнопка "Назад" в браузере). `Ctrl+i` — "Вперед". Спасает при прыжках по функциям.|
|**Keymaps (Пример)**|`nnoremap <leader>w :w<CR>` — маппинг для быстрого сохранения без набора `:w`.|

##  Training File 3: Снайперская навигация
Создай файл `mod3.js`:

```javascript
function calculateTotal(price, discount, taxRate) {
    const base = price - (price * discount);
    const finalPrice = base + (base * taxRate);
    return Math.round(finalPrice * 100) / 100;
}

// TODO: Refactor this later
console.log(calculateTotal(100, 0.2, 0.05));
```

**Задачи и Minimal Keystroke Challenge:**
1. **Задача:** В первой строке (находясь в начале строки) нужно поменять `taxRate` на `vat`.
    - **Философия:** Используй `f` для прыжка к букве `t`, затем команду замены.
    - **Challenge:** 8 нажатий -> `ft` (прыжок к первой `t` в 'calculate'), `;` (повтор до `taxRate`), `ciw` + `vat` + `Esc`.
2. **Задача:** Удалить аргументы функции при вызове (превратить `console.log(...)` в `console.log()`).
    - **Действие:** Прыгни на скобку `(` после `console.log`.
    - **Challenge:** 4 нажатия -> `di(`.
3. **Задача:** Прыжок к определению и обратно.
    - **Действие:** Если у тебя настроен LSP (например, `gd` для go-to-definition), наведи курсор на `calculateTotal` в самом низу и нажми `gd` (прыгнешь вверх).
    - **Challenge:** 2 нажатия -> `Ctrl+o`, чтобы мгновенно вернуться вниз к `console.log`.
