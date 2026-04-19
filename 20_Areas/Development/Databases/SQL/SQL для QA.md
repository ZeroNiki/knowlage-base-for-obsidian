# SQL
## **Базовые запросы**  
**1. Вывести все записи из таблицы**  
```sql
SELECT * FROM users;
```

**2. Выбрать определённые колонки**  
```sql
SELECT id, username, email FROM users;
```

**3. Фильтр по условию (WHERE)**  
```sql
SELECT * FROM users WHERE status = 'active';
```

**4. Поиск по части строки (LIKE, % - любое кол-во символов, _ - один символ)**  
```sql
SELECT * FROM users WHERE username LIKE '%test%';
```

---

## **Проверки на уникальность и дубликаты**  
**5. Найти дублирующиеся записи**  
```sql
SELECT email, COUNT(*) 
FROM users 
GROUP BY email 
HAVING COUNT(*) > 1;
```

**6. Найти пользователей без email**  
```sql
SELECT * FROM users WHERE email IS NULL;
```

---

## **Работа с JOIN (связь таблиц)**  
**7. Вывести заказы с данными о пользователе**  
```sql
SELECT orders.id, users.username, orders.amount 
FROM orders
JOIN users ON orders.user_id = users.id;
```

**8. Найти пользователей без заказов (LEFT JOIN + WHERE NULL)**  
```sql
SELECT users.id, users.username 
FROM users 
LEFT JOIN orders ON users.id = orders.user_id 
WHERE orders.id IS NULL;
```

---

## **Анализ данных**  
**9. Подсчитать количество пользователей по статусу**  
```sql
SELECT status, COUNT(*) FROM users GROUP BY status;
```

**10. Средний чек покупателя**  
```sql
SELECT user_id, AVG(amount) FROM orders GROUP BY user_id;
```

**11. Найти максимальную, минимальную и среднюю сумму заказа**  
```sql
SELECT MAX(amount) AS max_order, MIN(amount) AS min_order, AVG(amount) AS avg_order FROM orders;
```

---

## **Тестирование безопасности и валидации**  
**12. Проверить уязвимые пароли (короткие или пустые)**  
```sql
SELECT * FROM users WHERE LENGTH(password) < 8 OR password IS NULL;
```

**13. Найти SQL-инъекции (если есть подозрительные символы в логах или вводах)**  
```sql
SELECT * FROM logs WHERE input_data LIKE '%DROP%' OR input_data LIKE '%DELETE%';
```

---

## **Проверки после тестов**  
**14. Найти пользователей, зарегистрированных за последние 24 часа**  
```sql
SELECT * FROM users WHERE created_at >= NOW() - INTERVAL 1 DAY;
```

**15. Проверить, есть ли в БД ошибки (если есть лог-таблица)**  
```sql
SELECT * FROM error_logs ORDER BY created_at DESC LIMIT 10;
```

**16. Проверить обновлённые записи за последние 10 минут**  
```sql
SELECT * FROM orders WHERE updated_at >= NOW() - INTERVAL 10 MINUTE;
```

---

## **Дополнительные полезные запросы**  
**17. Обновить тестовые данные**  
```sql
UPDATE users SET email = 'test@example.com' WHERE id = 123;
```

**18. Удалить тестовые записи (ОСТОРОЖНО!)**  
```sql
DELETE FROM users WHERE email LIKE 'test%';
```

**19. Ограничение выборки (LIMIT)**  
```sql
SELECT * FROM users LIMIT 10;
```

**20. Проверить размер таблицы**  
```sql
SELECT table_name, round(((data_length + index_length) / 1024 / 1024), 2) AS size_mb 
FROM information_schema.tables 
WHERE table_schema = 'database_name';
```
