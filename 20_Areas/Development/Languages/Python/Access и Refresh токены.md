#  Глубокое погружение: Access и Refresh токены

> [!ABSTRACT] Архитектурная цель
> Переход от статических паролей к токенной модели (Bearer tokens) минимизирует «окно компрометации». Вместо передачи учетных данных в каждом запросе, мы используем краткосрочные производные ключи.

---

## 1.  Теория: Жизненный цикл токенов

Решение дилеммы «удобство vs безопасность» достигается через разделение ролей:

### Механика взаимодействия
* **Access Token (Session Token):** Временный «пропуск» (15–30 мин). Передается в заголовке `Authorization: Bearer <token>`.
* **Refresh Token:** Долгоживущий ключ (дни/недели). Используется **только** для получения новой пары токенов.



### Сравнительная таблица
| Тип токена | Срок жизни | Кратность | Хранение (Best Practice) | Риски |
| :--- | :--- | :--- | :--- | :--- |
| **Access** | 15–30 мин | Многократно | Memory / Auth Header | XSS перехват |
| **Refresh** | 7–30 дней | Однократно | `HttpOnly` Cookie | Захват аккаунта |

> [!IMPORTANT] Root of Trust
> Серверный `SECRET_KEY` — основа безопасности. Его компрометация позволяет подделывать любые токены, что обесценивает всю защиту.

---

## 2.  Анатомия JWT (RFC 7519)

JWT позволяет проверять подлинность без обращения к БД — это чистая математика над подписью.

1. **Header (Заголовок):** Алгоритм (напр., HS256).
2. **Payload (Нагрузка):** "Claims" (утверждения): `sub` (ID пользователя), `exp` (истечение), `roles`.
3. **Signature (Подпись):** Гарантия неизменности данных. Создается на основе заголовка, нагрузки и секретного ключа.

---

## 3.  Реализация: Flask + SQLAlchemy

Используем паттерн **Application Factory** и расширение `Flask-JWT-Extended`.

### Модель и инициализация
```python
import os
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token, create_refresh_token, jwt_required, get_jwt_identity

db = SQLAlchemy()
jwt = JWTManager()

def create_app():
    app = Flask(__name__)
    # ВАЖНО: Ключи конфигурации ТОЛЬКО в верхнем регистре
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///app.db')
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY') 
    
    db.init_app(app)
    jwt.init_app(app)
    return app
```

### Эндпоинты обновления сессии
```python
@app.route('/login', methods=['POST'])
def login():
    # ... проверка пользователя в БД ...
    access = create_access_token(identity=str(user.id))
    refresh = create_refresh_token(identity=str(user.id))
    return jsonify(access_token=access, refresh_token=refresh), 200

@app.route('/refresh', methods=['POST'])
@jwt_required(refresh=True) # Требует именно Refresh Token
def refresh():
    current_user_id = get_jwt_identity()
    new_access = create_access_token(identity=current_user_id)
    return jsonify(access_token=new_access), 200
```

---

## 4.  Безопасность и хранение

| Место хранения | Плюсы | Минусы |
| :--- | :--- | :--- |
| **LocalStorage** | Легко реализовать | Уязвим для **XSS**-атак |
| **HttpOnly Cookies** | Недоступны для JS | Требуют защиты от **CSRF** |

> [!WARNING] Blacklisting (Отзыв токенов)
> Хотя JWT — это stateless, для реализации Logout нужен механизм отзыва. 
> **Best Practice:** Использовать **Redis** для хранения `jti` (ID токена) отозванных ключей до момента их истечения.

---

#Related #Python #Flask #JWT #Backend #Security