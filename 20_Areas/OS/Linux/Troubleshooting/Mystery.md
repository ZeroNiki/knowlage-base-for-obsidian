#  Issue: Mystery
**Дата:** 04-26-2026
**Статус:** #status/solved 

## Описание
Расследовать убийство в терминале используя терминал

## Ход расследования

- [ ] Шаг 1: Скачать zip архив
- [ ] Шаг 2: Разорхивировать архив
- [ ] Шаг 3: Перейти в дерикторию mystery 
- [ ] Шаг 4: В файлах много мусора. Пока что зацепок нету... поэтому выполним команду по ключевому слову CLUE по файлу crimscene:
```bash
grep -i "clue" crimescene
```
Вывод
```plaintext
CLUE: Footage from an ATM security camera is blurry but shows that the perpetrator is a tall male, at least 6'.
CLUE: Found a wallet believed to belong to the killer: no ID, just loose change, and membership cards for AAA, Delta SkyMiles, the local library, and the Museum of Bash History. The cards are totally untraceable and have no name, for some reason.
CLUE: Questioned the barista at the local coffee shop. He said a woman left right before they heard the shots. The name on her latte was Annabel, she had blond spiky hair and a New Zealand accent.
```
Что нам известно:
- Male (M)
- Рост 6 футов
- Состоит в AAA, Delta SkyMiles, the local library, and the Museum of Bash History.
- Свидетель под именем Annabel

- [ ] Шаг 5: Найдем Cвидетеля:
```bash
grep "Annabel" people
```
```plaintext
Annabel Sun	F	26	Hart Place, line 40
Oluwasegun Annabel	M	37	Mattapan Street, line 173
Annabel Church	F	38	Buckingham Place, line 179
Annabel Fuglsang	M	40	Haley Street, line 176
```

Проверим Annabel Sun:
```
 grep -i "interview" streets/Hart_Place
SEE INTERVIEW #47246024
```
```
 head interviews/interview-47246024
Ms. Sun has brown hair and is not from New Zealand.  Not the witness from the cafe.
```

- Отсекаем ее
- Проверяем Annabel Church
```
 grep -i "interview" streets/Buckingham_Place
SEE INTERVIEW #699607
```
```
 head interviews/interview-699607
Interviewed Ms. Church at 2:04 pm.  Witness stated that she did not see anyone she could identify as the shooter, that she ran away as soon as the shots were fired.

However, she reports seeing the car that fled the scene.  Describes it as a blue Honda, with a license plate that starts with "L337" and ends with "9"
```

Бинго! Что нам известно теперь:
- Male (M)
- Рост 6 футов
- Состоит в AAA, Delta SkyMiles, the local library, and the Museum of Bash History.
- Синяя хонда
- L337.\*9

- [ ] Шаг 6: Будем искать машины:
```bash
grep -i "L337.*9" -A6 vehicles | grep -i "Honda" -B2 -A5 | grep -i "Blue" -B3 -A4 | grep -i "6'" -B5 -A2 | grep "Owner"
Owner: Erika Owens
Owner: Joe Germuska
Owner: Jeremy Bowers
Owner: Jacqui Maher
```

- Проверим их:
```bash
grep -i "L337.*9" -A6 vehicles | grep -i "Honda" -B2 -A5 | grep -i "Blue" -B3 -A4 | grep -i "6'" -B5 -A2 | grep "Owner" | awk '{print $2 " " $3}' > full_names.txt
```

```bash
grep -f full_names.txt people | grep -vE "*.F.*"

Joe Germuska	M	65	Plainfield Street, line 275
Jeremy Bowers	M	34	Dunstable Road, line 284
```

- [ ] Шаг 7: Проверим где они состоят:
```bash
grep -E "Joe Germuska|Jeremy Bowers" memberships/AAA memberships/Delta_SkyMiles memberships/Terminal_City_Library memberships/Museum_of_Bash_History
```

```plaintext
memberships/AAA:Joe Germuska
memberships/AAA:Jeremy Bowers
memberships/Delta_SkyMiles:Jeremy Bowers
memberships/Terminal_City_Library:Joe Germuska
memberships/Terminal_City_Library:Jeremy Bowers
memberships/Museum_of_Bash_History:Jeremy Bowers
```

Joe = 2
Jeremy = 4

- [ ] Шаг 8: Бинго! Мы нашли убийцу, его имя Jeremy Bowers

## Решение

- У нас есть имя теперь проверим:
```bash
echo "Jeremy Bowers" | $(command -v md5 || command -v md5sum) | grep -qif /dev/stdin encoded && echo CORRECT\! GREAT WORK, GUMSHOE. || echo SORRY, TRY AGAIN.
```

- Вывод:
```plaintext
CORRECT! GREAT WORK, GUMSHOE.
```

## Выводы
### ОТЧЕТ ПО РЕЗУЛЬТАТАМ РАССЛЕДОВАНИЯ 
#### 1. Краткое содержание
В ходе проведения оперативно-технических мероприятий с использованием инструментов анализа данных в среде CLI был проведен поиск лица, причастного к инциденту. Исходные данные включали описание внешности (мужчина, рост 6 футов), свидетельские показания по транспортному средству (синяя Honda, номерной знак вида `L337...9`) и принадлежность к ряду организаций.

#### 2. Методология исследования
Идентификация проводилась путем поэтапного сужения выборки подозреваемых:
* **Фильтрация данных:** Использование конвейерной обработки (piping) для анализа ведомостей транспортных средств и списков членов организаций.
* **Анализ показаний:** Исключение свидетелей по критериям внешности и географическим данным (сопоставление с данными интервью).
* **Корреляция данных:** Перекрестная проверка членства в организациях (AAA, Delta SkyMiles, Library, Museum of Bash History).

#### 3. Установленные факты
В результате автоматизированного анализа был выявлен единственный субъект, соответствующий всем заданным параметрам (пол, рост, автотранспорт, членство в организациях):
* **Имя:** Jeremy Bowers.
* **Подтверждение:** Контрольная сумма MD5, полученная из личных данных субъекта, совпала с записью, хранящейся в защищенном реестре (`encoded`).

#### 4. Рекомендации по развитию компетенций
Для повышения эффективности последующих оперативных мероприятий рекомендуется освоить следующие технические стеки:

* **Расширенная текстовая аналитика:** Переход от базовых `grep` к `awk` и `sed` для комплексной обработки массивов данных без создания промежуточных файлов.
* **Работа с форматами обмена данными:** Изучение `jq` для обработки JSON-структур, которые становятся стандартом в современных отчетных ведомостях.
* **Автоматизация пайплайнов:** Практика использования `xargs` для динамической передачи аргументов между процессами, что позволит исключить необходимость в промежуточном сохранении данных.
* **Регулярные выражения (Regex):** Углубленное изучение расширенных шаблонов для поиска сложных неструктурированных идентификаторов.

Для включения в отчет рекомендую следующий список обучающих материалов, ориентированных на повышение квалификации в области анализа данных и работы с командной строкой:

### План профессионального развития (CLI & Data Analysis)

* **Работа с текстовыми потоками (Stream Processing):**
    * *Материалы:* Книга «The AWK Programming Language» (Aho, Kernighan, Weinberger) и интерактивные руководства по `sed` (например, GNU sed manual).
    * *Цель:* Переход от многоэтапной фильтрации к написанию лаконичных однострочных скриптов.
* **Регулярные выражения (Regex):**
    * *Материалы:* Ресурс [RegexOne](https://regexone.com/) и «Mastering Regular Expressions» (Jeffrey Friedl).
    * *Цель:* Построение сложных поисковых запросов для неструктурированных данных.
* **Автоматизация и Shell Scripting:**
    * *Материалы:* Официальный «Advanced Bash-Scripting Guide» (The Linux Documentation Project).
    * *Цель:* Оптимизация рутинных задач, создание модульных скриптов с обработкой ошибок.
* **Современные альтернативы инструментов:**
    * *Материалы:* Документация `ripgrep` (поиск), `fd` (поиск файлов), `jq` (обработка JSON).
    * *Цель:* Повышение производительности труда за счет использования высокоскоростных инструментов нового поколения.
* **Методология расследований (Data Forensics/OSINT):**
    * *Материалы:* Практические платформы, такие как OverTheWire (например, уровень Bandit).
    * *Цель:* Укрепление навыков работы в условиях жестких ограничений и повышение стрессоустойчивости при анализе «зашумленных» данных.