#  Ansible Cheat Sheet: Core Essentials

## 1. Базовые команды (Ad-hoc)
Быстрые действия без написания плейбуков.
* **Проверка связи:** `ansible all -m ping`
* **Выполнение команды:** `ansible web -a "uptime"`
* **Сбор фактов:** `ansible all -m setup`
* **Установка пакета:** `ansible all -m apt -a "name=vim state=present" --become`

---

## 2. Структура Playbook (YAML)
```yaml
- name: Описание сценария
  hosts: webservers        # Группа из inventory
  become: yes              # Выполнять через sudo
  vars:
    pkg_name: nginx
  tasks:
    - name: Установка пакета
      apt:
        name: "{{ pkg_name }}"
        state: present
      notify: Restart Nginx # Вызов хендлера

  handlers:
    - name: Restart Nginx
      service:
        name: nginx
        state: restarted
```

---

## 3. Inventory (Реестр хостов)
Файл `hosts.ini` или `hosts.yml`.
```ini
[web]
192.168.1.10 ansible_user=nellaror
192.168.1.11

[db]
db.example.com

[production:children]
web
db
```

---

## 4. Ключевые модули
| Модуль | Назначение |
| :--- | :--- |
| `apt` / `yum` | Управление пакетами (Debian/RHEL). |
| `copy` | Копирование локального файла на сервер. |
| `template` | Копирование файла с обработкой Jinja2. |
| `file` | Управление правами, папками и ссылками (symlinks). |
| `lineinfile` | Поиск и замена строки в текстовом файле. |
| `service` / `systemd` | Управление демонами (start, stop, restart). |
| `shell` / `command` | Выполнение произвольных команд (использовать в крайнем случае). |

---

## 5. Переменные и Приоритеты
1. **Extra Vars** (`-e` в CLI) — Самый высокий приоритет.
2. **Role Vars** (`roles/x/vars/main.yml`).
3. **Host Vars** (`host_vars/hostname.yml`).
4. **Group Vars** (`group_vars/groupname.yml`).
5. **Role Defaults** (`roles/x/defaults/main.yml`) — Самый низкий приоритет.

---

## 6. Ansible Vault (Безопасность)
Шифрование паролей и секретов.
* **Создать файл:** `ansible-vault create secret.yml`
* **Редактировать:** `ansible-vault edit secret.yml`
* **Запустить плейбук с паролем:** `ansible-playbook site.yml --ask-vault-pass`

---

## 7. Профессиональные советы (Pro Tips)

> [!tip] Идемпотентность
> Всегда используй специализированные модули вместо `shell`. Модуль `apt` не будет скачивать пакет, если он уже есть. `shell` же будет выполняться при каждом запуске, нарушая логику "чистого" состояния.

> [!info] Ускорение (Pipelining)
> Добавь в `ansible.cfg` для ускорения работы в 2-4 раза:
> ```ini
> [ssh_connection]
> pipelining = True
> ```

> [!check] Проверка синтаксиса
> Перед запуском всегда делай:
> `ansible-playbook site.yml --syntax-check`
> `ansible-playbook site.yml --check` (Dry Run — симуляция без изменений)