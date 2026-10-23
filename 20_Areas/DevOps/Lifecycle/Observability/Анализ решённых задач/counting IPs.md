---
title: "Counting IPs"
aliases: []
tags:
  - area/devops
  - topic/observability
  - topic/bash
type: troubleshooting
status: stable
created: 2026-04-19
updated: 2026-10-23
---

# counting IPs
## Суть
Нужно найти часто повторяющийся IP из access.log

## Решение
- cat /home/admin/access.log | awk '{print $1}' | sort | uniq -c | sort -rn | head -1
- cat /home/admin/access.log - выводим весь файл
- awk ... - Получаем только первую колонку (ip адреса)
- uniq -c - считаем уникальное
- Сортируем в обратном порядке с нумерацией
- head -1 - Выводим только top 1

- echo "{IP}" > file.txt

## Рефлексия
- Изучить awk - чтобы было легче оптимизировать

###  Пример оптимизации
- `awk '{count[$1]++} END {for (ip in count) print count[ip], ip}' /home/admin/access.log | sort -rn | head -n 1 | awk '{print $2}' > /home/admin/highestip.txt`