# Виды JOIN
## INNER JOIN
Внутреннее соединение - соединяет строки из обеих таблиц, которые удовлетворяют условию соединения

in [stackoverflow](https://stackoverflow.com/questions/38549/what-is-the-difference-between-inner-join-and-outer-join?utm_source=chatgpt.com)

Пример:
> An inner join using either of the equivalent queries gives the intersection of the two tables, i.e. the two rows they have in common.
> Внутреннее соединение с использованием любого из эквивалентных запросов дает пересечение двух таблиц, т. е. две строки, которые они имеют в общем. 

```sql
SELECT 
  * 
FROM 
  a 
INNER JOIN b ON a.a = b.b;

SELECT 
  a.*, 
  b.* 
FROM 
  a, 
  b 
WHERE 
  a.a = b.b;
```

```
a | b
--+--
3 | 3
4 | 4
```

**INNER** можно опускать в запросе просто **JOIN ... ON**


!!!!***INFO*** INNER JOIN - Это частный случай θ-join (theta join)

----

## NATURAL JOIN
***Natural JOIN*** (Естественное соединение) - автоматически использует все столбцы с одинаковыми именами в обеих таблицах

In stack [stackoverflow](https://stackoverflow.com/questions/7870155/difference-between-a-theta-join-equijoin-and-natural-join?utm_source=chatgpt.com):
> Естественное соединение — это равнозначное соединение атрибутов, имеющих одинаковые имена в каждом отношении.

```sql
SELECT *
FROM customers
NATURAL JOIN orders;
```

----
## THETA JOIN
Theta Join позволяет объединить две таблицы на основе условия, представленного тета. Theta joins работают для всех операторов сравнения. Обозначается символом θ. Общий случай операции JOIN называется Theta join.

Это более общее определение соединения: можно использовать любое логическое условие, а не только равенство.

```sql
SELECT c.name, o.product
FROM customers c
JOIN orders o ON c.id < o.customer_id;
```

Здесь пары формируются по условию сравнения, а не по ключу.

`INNER JOIN` → это θ-join с условием равенства (=).
`THETA JOIN` → более общее понятие, охватывающее и `INNER JOIN`, и соединения с другими условиями.

in [stackoverflow](https://stackoverflow.com/questions/7870155/difference-between-a-theta-join-equijoin-and-natural-join?utm_source=chatgpt.com):
> A theta join allows for arbitrary comparison relationships (such as ≥).

----

## Outer Joins
### Left Join
Берёт все строки из *левой* таблицы, даже если совпадений справа *нет*.
Если совпадения нет, то справа будут `NULL`.
``` sql
SELECT c.name, o.product
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id;
```

| name | product |
| ---- | ------- |
| Иван | Телефон |
| Иван | Ноутбук |
| Анна | Планшет |
| Олег | NULL    |

**Олег** остался в выборке, хотя заказов у него нет.

### Right Join
Симметричный `LEFT JOIN`.
Берёт все строки из правой таблицы, даже если совпадений слева нет.
Если совпадения нет, то слева будут `NULL`.

``` sql
SELECT c.name, o.product
FROM customers c
RIGHT JOIN orders o ON c.id = o.customer_id;
```

| name | product   |
| ---- | --------- |
| Иван | Телефон   |
| Иван | Ноутбук   |
| Анна | Планшет   |
| NULL | Телевизор |

Появился заказ №104 (Телевизор), хотя покупателя с id=4 в customers нет.


### Full Join
Объединяет логику `LEFT JOIN` и `RIGHT JOIN`.
Берёт все строки из обеих таблиц.
Где нет совпадения — ставит `NULL`.

```sql
SELECT c.name, o.product
FROM customers c
FULL JOIN orders o ON c.id = o.customer_id;
```

| name | product   |
| ---- | --------- |
| Иван | Телефон   |
| Иван | Ноутбук   |
| Анна | Планшет   |
| Олег | NULL      |
| NULL | Телевизор |

Здесь и Олег без заказов, и заказ без покупателя — оба попали в результат.

---

## Semi-Join
**Semi-join** возвращает строки только из первой (левой) таблицы, но только те, для которых существуют совпадения во второй.

Похоже на **INNER JOIN**, но разница в том, что:
- ***INNER JOIN*** -> возвращает данные обеих таблиц и может дублировать строки;
- ***SEMI JOIN*** -> возвращает только данные первой таблицы, без дублирования по числу совпадений.

in [stackoverflow](https://stackoverflow.com/questions/42249690/what-is-semi-join-in-database)

- Semi-Join:
``` sql
SELECT c.name
FROM customers c
WHERE EXISTS (
    SELECT 1
    FROM orders o
    WHERE o.customer_id = c.id
);
```

- INNER JOIN:
```sql
SELECT c.name, o.product
FROM customers c
JOIN orders o ON c.id = o.customer_id;
```


---

## Anti-Join
**Anti-join** — противоположность semi-join. Он возвращает строки из первой (левой) таблицы, для которых нет совпадений во второй таблице.
- Используется, чтобы найти ***“висячие”*** записи (например, покупателей без заказов).
- В SQL нет ключевого слова **ANTI JOIN**, но его поведение реализуется через:
	- ***NOT EXISTS***
	- ***NOT IN***
    - ***LEFT JOIN ... WHERE right IS NULL***

```sql
SELECT c.name
FROM customers c
WHERE NOT EXISTS (
    SELECT 1
    FROM orders o
    WHERE o.customer_id = c.id
);
```

```sql
SELECT c.name
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
WHERE o.id IS NULL;
```