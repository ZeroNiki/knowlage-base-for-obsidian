---
title: "TLS и SSL: сравнение и история версий"
aliases:
  - TLS SSL
  - История версий TLS SSL
tags:
  - area/networking
  - topic/tls
  - topic/ssl
type: reference
status: stable
created: 2026-07-19
updated: 2026-10-23
---

# Протоколы TLS/SSL: Защищенные сетевые протоколы

> Эта заметка — сравнительный обзор версий и места TLS/SSL в стеке протоколов. Базовые определения см. в [[TLS]] и [[SSL]], практическое применение — в [[Root CA и HTTPS в Docker (практика)]].

## 1. Общие сведения

* **SSL (Secure Sockets Layer):** Протокол защищенных сокетов. Изначально разработан компанией Netscape. [[04:48](https://www.youtube.com/watch?v=LTLqazCztnc&t=288)]
* **TLS (Transport Layer Security):** Безопасность транспортного уровня. Современный стандарт, пришедший на смену SSL. [[00:20](https://www.youtube.com/watch?v=LTLqazCztnc&t=20)]
* **Назначение:** Обеспечение безопасной передачи данных по компьютерным сетям. [[01:01](https://www.youtube.com/watch?v=LTLqazCztnc&t=61)]

## 2. Место в стеке протоколов

* **Уровень:** Находится между прикладным уровнем (HTTP, SMTP, FTP) и транспортным уровнем (TCP). [[02:12](https://www.youtube.com/watch?v=LTLqazCztnc&t=132)]
* **Модель OSI:** Занимает место на сеансовом уровне и уровне представления. [[02:54](https://www.youtube.com/watch?v=LTLqazCztnc&t=174)]
* **Примеры использования:**
* HTTP + TLS = **HTTPS** (порт 443) [[12:39](https://www.youtube.com/watch?v=LTLqazCztnc&t=759)]
* Почта: LDAPS, SMTPS, POP3S, IMAPS. [[01:45](https://www.youtube.com/watch?v=LTLqazCztnc&t=105)]



## 3. История версий [[04:30](https://www.youtube.com/watch?v=LTLqazCztnc&t=270)]

| Протокол | Версия | Год | Статус |
| --- | --- | --- | --- |
| **SSL** | 2.0 | 1995 | Устарел (небезопасен) |
| **SSL** | 3.0 | 1996 | Устарел (небезопасен) |
| **TLS** | 1.0 | 1999 | Фактически SSL 3.1 |
| **TLS** | 1.1 | 2006 | Устаревает |
| **TLS** | 1.2 | 2008 | Самая популярная на текущий момент [[06:38](https://www.youtube.com/watch?v=LTLqazCztnc&t=398)] |
| **TLS** | 1.3 | 2018 | Самая современная и быстрая |

## 4. Функции безопасности [[10:06](https://www.youtube.com/watch?v=LTLqazCztnc&t=606)]

1. **Конфиденциальность (Encryption):** Защита от перехвата данных. Используется шифрование.
2. **Целостность (Integrity):** Защита от изменения данных в процессе передачи. Используются хэш-функции. [[09:43](https://www.youtube.com/watch?v=LTLqazCztnc&t=583)]
3. **Аутентификация (Authentication):** Подтверждение того, что сервер (и иногда клиент) является тем, за кого себя выдает. [[10:23](https://www.youtube.com/watch?v=LTLqazCztnc&t=623)]

## 5. Как это работает (Кратко) [[11:38](https://www.youtube.com/watch?v=LTLqazCztnc&t=698)]

* **Цифровые сертификаты:** Основа аутентификации. Сервер предъявляет сертификат, подтверждающий владение доменом. [[15:30](https://www.youtube.com/watch?v=LTLqazCztnc&t=930)]
* **Электронная подпись:** Используется для проверки подлинности сертификатов. [[12:05](https://www.youtube.com/watch?v=LTLqazCztnc&t=725)]
* **Handshake (Рукопожатие):** Процесс согласования алгоритмов шифрования и обмена ключами перед началом передачи данных.

---
**Источник:** [Видео Андрея Созыкина](http://www.youtube.com/watch?v=LTLqazCztnc)
