**CTE** (*Common Table Expression*) - это временный результирующий набор строк, который можно определить внутри SQL-запроса и использовать как `виртуальную таблицу`. Определяется с помощью ключевого слова `WITH` перед основным запросом.

## Простейший пример
```sql
WITH sales_by_customer AS (
    SELECT customer_id, SUM(amount) AS total_sales
    FROM sales
    GROUP BY customer_id
)
SELECT *
FROM sales_by_customer
WHERE total_sales > 1000;
```
Здесь `sales_by_customer` - это CTE.

## Для чего применять CTE
1. Упрощение сложных запросов 
	- Можно разбить громоздкий SQL на логичные части.
2. Повторное использование результата
	- Вместо написания одинакового подзапроса несколько раз, один раз определяешь CTE и используешь его.
3. Рекурсивные запросы
	- CTE поддерживает рекурсию - удобно, например, для обхода иерархий (категории, дерево сотрудников).
Пример рекурсивного CTE (вывод сотрудников и их начальников):
```sql
WITH RECURSIVE employee_hierarchy AS (
    SELECT id, name, manager_id, 1 AS level
    FROM employees
    WHERE manager_id IS NULL  -- топ-менеджер
    UNION ALL
    SELECT e.id, e.name, e.manager_id, eh.level + 1
    FROM employees e
    JOIN employee_hierarchy eh ON e.manager_id = eh.id
)
SELECT * FROM employee_hierarchy;
```