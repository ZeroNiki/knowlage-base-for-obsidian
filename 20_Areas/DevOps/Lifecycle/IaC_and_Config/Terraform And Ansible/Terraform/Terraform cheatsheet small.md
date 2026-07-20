#  Terraform Cheat Sheet: Infrastructure as Code

## 1. Основной рабочий цикл (Core Workflow)
Стандартная последовательность действий при внесении изменений.
* **Инициализация:** `terraform init` (загрузка провайдеров, настройка бэкенда).
* **Проверка формата:** `terraform fmt` (автоматическое выравнивание кода).
* **Валидация:** `terraform validate` (проверка синтаксиса без обращения к API).
* **Планирование:** `terraform plan` (предварительный просмотр изменений).
* **Применение:** `terraform apply` (создание/обновление ресурсов).
* **Удаление:** `terraform destroy` (полное уничтожение инфраструктуры).

---

## 2. Управление состоянием (State Management)
Работа с «источником истины» о ваших ресурсах.
* **Список ресурсов:** `terraform state list` (что сейчас в базе).
* **Показать ресурс:** `terraform state show <resource_name>` (подробности объекта).
* **Импорт:** `terraform import <resource_addr> <id>` (добавление уже созданного вручную ресурса в код).
* **Удаление из базы:** `terraform state rm <resource_addr>` (забыть ресурс без его физического удаления).
* **Разблокировка:** `terraform force-unlock <lock_id>` (если процесс прервался и заблокировал state).

---

## 3. Синтаксис HCL (Блоки)
```hcl
# Провайдер — с кем работаем
provider "aws" {
  region = "us-east-1"
}

# Ресурс — что создаем
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t2.micro"
  
  tags = { Name = "Web-Server" }
}

# Источник данных — получение инфо извне
data "aws_ami" "latest" {
  most_recent = true
  owners      = ["self"]
}

# Вывод — информация после apply
output "instance_ip" {
  value = aws_instance.web.public_ip
}
```

---

## 4. Метаргументы (Логика)
| Аргумент | Описание |
| :--- | :--- |
| **`count`** | Создание $N$ идентичных ресурсов по индексу (`count.index`). |
| **`for_each`** | Итерация по Map или Set (ключ `each.key`, значение `each.value`). |
| **`depends_on`** | Явное указание порядка (сначала ресурс А, потом Б). |
| **`lifecycle`** | Настройка поведения: `prevent_destroy`, `create_before_destroy`. |

---

## 5. Переменные (Input Variables)
Способы передачи данных:
1. Файлы: `terraform.tfvars` или `*.auto.tfvars`.
2. Командная строка: `-var="instance_type=t2.small"`.
3. Переменные окружения: `TF_VAR_instance_type`.

---

## 6. Профессиональные советы (Pro Tips)

> [!warning] Remote Backend
> Никогда не храни `terraform.tfstate` локально при работе в команде. 
> Используй S3 + DynamoDB (для AWS) или GitLab Managed Terraform State для **State Locking**.

> [!tip] Target Apply
> Если нужно обновить только один конкретный ресурс, не затрагивая остальные:
> `terraform apply -target=aws_instance.web` (использовать осторожно!).

> [!info] Console
> Используй `terraform console` для тестирования функций, интерполяции строк или проверки значений переменных перед тем, как вписывать их в код.