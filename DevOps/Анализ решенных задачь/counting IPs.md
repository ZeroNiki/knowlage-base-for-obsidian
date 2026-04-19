---
tags: [tasks, devops]
status: in progress 
created: 2026-04-18
---

# counting IPs
## Суть
Нужно найти часто повторяющийся IP из access.log

## Решение
- cat /home/admin/access.log | awk '{print $1}' | sort | uniq -c | sort -rn | head -1
- cat /home/admin/access.log - выводим весь файл
- awk ... - Получаем только первую колонку (ip адреса)
- uniq -c - считаем уникальное
- Сортируем в обратном парядке с нумерацией
- head -1 - Выводим только top 1

- echo "{IP}" > file.txt

## Рефликсия
- Изучить awk - чтобы было легче оптимизировать

###  Пример оптимизации
- `awk '{count[$1]++} END {for (ip in count) print count[ip], ip}' /home/admin/access.log | sort -rn | head -n 1 | awk '{print $2}' > /home/admin/highestip.txt`