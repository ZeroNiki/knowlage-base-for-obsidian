**Clean Architecture** (чистая архитектура) — это архитектурный подход к разработке программного обеспечения, предложенный Робертом Мартином (дядя Боб). Он направлен на создание гибких, сопровождаемых и масштабируемых систем за счет четкого разделения ответственности между слоями приложения.

------

## 🔹 Основные принципы Clean Architecture
1. *Независимость от фреймворков*
	- Архитектура не должна зависеть от конкретных технологий (Spring, Django, Express и т. д.).

2. *Независимость от UI*
	- Интерфейс (Web, CLI, Mobile) можно менять без влияния на бизнес-логику.

3. *Независимость от базы данных*
	- Можно легко менять SQL на NoSQL или другую технологию хранения.

4. *Независимость от внешних сервисов*
	- API, библиотеки и другие зависимости легко заменяются.

## 🔹 Структура (слои) Clean Architecture
Clean Architecture обычно изображается в виде **круговой схемы**, где каждый слой отделяется от другого.

### 🟡 **1. Entities (Сущности)**
- Бизнес-логика (основные объекты и правила).
- Не зависят от приложения.
- Например, класс `User` с методами `activate()`, `deactivate()`.

### 🔵 **2. Use Cases (Прецеденты использования)**
- Логика конкретного сценария.
- Здесь происходят вызовы репозиториев, работа с сущностями.
- Например, `RegisterUserUseCase`, который создает нового пользователя.

### 🟢 **3. Interface Adapters (Адаптеры)**
- Преобразует данные из удобного формата (DTO, ViewModel) в формат, понятный бизнес-логике.
- Здесь находятся контроллеры, презентеры, репозитории.

### 🔴 **4. Frameworks & Drivers (Фреймворки и драйверы)**

- Внешний слой, где работают базы данных, UI, веб-серверы.
- Это инфраструктура: ORM, веб-фреймворки, API.

## 🔹 **Пример реализации на Python**
```python
# Entity (сущность)
class User:
    def __init__(self, username: str):
        self.username = username
        self.active = False

    def activate(self):
        self.active = True

# Use Case (Прецедент использования)
class ActivateUserUseCase:
    def __init__(self, user_repository):
        self.user_repository = user_repository

    def execute(self, username: str):
        user = self.user_repository.get_user(username)
        user.activate()
        self.user_repository.save(user)

# Adapter (Репозиторий)
class UserRepository:
    def __init__(self):
        self.users = {}

    def get_user(self, username):
        return self.users.get(username)

    def save(self, user):
        self.users[user.username] = user
```

## 🔹 **Пример на C**
### **Пример: Регистрация и активация пользователя**
Допустим, у нас есть система управления пользователями, где нужно создать и активировать пользователя. Мы применим Clean Architecture, разделив код на **Entities (Сущности)**, **Use Cases (Прецеденты использования)**, **Adapters (Адаптеры)** и **Frameworks & Drivers (Инфраструктура)**.

#### **1️⃣ Entities (Сущности)**
Это чистые бизнес-объекты, не зависящие от базы данных, UI или других технологий.

```c
// user.h
#ifndef USER_H
#define USER_H

typedef struct {
    char username[50];
    int is_active;
} User;

// Функция активации пользователя
void activate_user(User *user);

#endif
```

```c
// user.c
#include "user.h"
#include <string.h>

void activate_user(User *user) {
    if (user) {
        user->is_active = 1;
    }
}
```

#### **2️⃣ Use Cases (Прецеденты использования)**
Здесь определяются сценарии работы с бизнес-логикой.
```c
// user_usecase.h
#ifndef USER_USECASE_H
#define USER_USECASE_H

#include "user.h"
#include "user_repository.h"

// Функция регистрации пользователя
void register_user(const char *username, UserRepository *repo);

// Функция активации пользователя
void activate_user_usecase(const char *username, UserRepository *repo);

#endif
```

```c
// user_usecase.c
#include "user_usecase.h"
#include <stdio.h>
#include <string.h>

void register_user(const char *username, UserRepository *repo) {
    User user;
    strncpy(user.username, username, sizeof(user.username));
    user.is_active = 0;
    repo->save(repo, &user);
}

void activate_user_usecase(const char *username, UserRepository *repo) {
    User user;
    if (repo->get(repo, username, &user)) {
        activate_user(&user);
        repo->save(repo, &user);
        printf("Пользователь %s активирован!\n", user.username);
    } else {
        printf("Пользователь %s не найден!\n", username);
    }
}
```

#### **3️⃣ Adapters (Репозиторий)**
Адаптер для хранения пользователей (может быть файл, БД, память и т. д.).

```c
// user_repository.h
#ifndef USER_REPOSITORY_H
#define USER_REPOSITORY_H

#include "user.h"

// Интерфейс репозитория пользователей
typedef struct UserRepository {
    void (*save)(struct UserRepository *, User *);
    int (*get)(struct UserRepository *, const char *, User *);
} UserRepository;

// Функция инициализации репозитория (в памяти)
void init_memory_user_repository(UserRepository *repo);

#endif
```

```c
// user_repository.c
#include "user_repository.h"
#include <stdio.h>
#include <string.h>

#define MAX_USERS 100

// Простая база данных в памяти
static User users[MAX_USERS];
static int user_count = 0;

void save_user(UserRepository *repo, User *user) {
    for (int i = 0; i < user_count; i++) {
        if (strcmp(users[i].username, user->username) == 0) {
            users[i] = *user;
            return;
        }
    }
    if (user_count < MAX_USERS) {
        users[user_count++] = *user;
    }
}

int get_user(UserRepository *repo, const char *username, User *user) {
    for (int i = 0; i < user_count; i++) {
        if (strcmp(users[i].username, username) == 0) {
            *user = users[i];
            return 1;
        }
    }
    return 0;
}

void init_memory_user_repository(UserRepository *repo) {
    repo->save = save_user;
    repo->get = get_user;
}
```

#### **4️⃣ Frameworks & Drivers (Основная программа)**
В этом файле мы создаем репозиторий и выполняем сценарии.

```c
// main.c
#include <stdio.h>
#include "user_usecase.h"
#include "user_repository.h"

int main() {
    UserRepository repo;
    init_memory_user_repository(&repo);

    register_user("alice", &repo);
    register_user("bob", &repo);

    activate_user_usecase("alice", &repo);
    activate_user_usecase("bob", &repo);
    activate_user_usecase("charlie", &repo);  // Ошибка: пользователь не найден

    return 0;
}
```

#### 🔹 **Вывод программы**
```
Пользователь alice активирован!
Пользователь bob активирован!
Пользователь charlie не найден!
```

### 🔹 **Как это соответствует Clean Architecture?**
- ✅ Entities (Сущности) – user.h, user.c
- ✅ Use Cases (Прецеденты использования) – user_usecase.h, user_usecase.c
- ✅ Adapters (Адаптеры) – user_repository.h, user_repository.c
- ✅ Frameworks & Drivers – main.c

Этот подход позволяет легко заменять репозиторий (например, вместо памяти использовать SQLite), изменять логику без переписывания кода приложения и тестировать отдельные компоненты. 

## 🔹 **Преимущества Clean Architecture**
- ✅ Четкое разделение ответственности  
- ✅ Легкость тестирования  
- ✅ Гибкость и возможность заменять технологии  
- ✅ Долговечность кода

Но у него есть и **минусы**:  
- ❌ Усложнение структуры на старте проекта  
- ❌ Требует больше времени на разработку

Clean Architecture особенно полезна для **долгосрочных и сложных проектов**. В небольших проектах иногда достаточно **слоистой архитектуры (Layered Architecture)**.