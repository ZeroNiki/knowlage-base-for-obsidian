## Различия между Kubernetes и Docker Compose

**В то время как Docker Compose предназначен для создания и запуска одного или нескольких контейнеров, Kubernetes больше служит платформой для создания сети, в которой мы можем оркестровать контейнеры.**

Kubernetes смог решить многие важные проблемы в управлении приложениями:

- Оптимизация ресурсов
- Самовосстановление контейнеров
- Время простоя при повторном развертывании приложений
- Автомасштабирование

Наконец, Kubernetes выводит несколько изолированных контейнеров на этап, на котором ресурсы всегда доступны с потенциально оптимальным распределением.

Однако когда дело доходит до разработки, Docker Compose может настроить все сервисные зависимости приложения, чтобы приступить к работе, например, с нашими автоматическими тестами. Таким образом, это мощный инструмент для местного развития.
