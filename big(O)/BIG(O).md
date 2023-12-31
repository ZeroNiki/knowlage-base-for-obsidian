
>BIG(O) описывает, насколько быстро
работает алгоритм. Предположим, имеется
список размера n. Простой поиск должен
проверить каждый элемент, поэтому ему
придется выполнить n операций. Время
выполнения BIG(O) имеет вид О(n).
Постойте, но где же секунды? А их здесь
нет - BIG(O) не сообщает скорость
в секундах, а позволяет сравнить количе­
ство операций . Оно указывает, насколько
быстро возрастает время выполнения ал-
горитма.

***«О-большое» определяет время выполненияв худшем случае***

## Типичные примеры «О-большого»

- [[О(1) Простая сложность]] 
- [[Логарифмическая сложность - O(log n)]] Пример: [[Бинарный поиск]]
- [[O(n) Линейная сложность]].  Пример: [[Простой поиск]]
- [[Логарифмически линейный]]. Пример: эффективные алгоритмы сортировки ([[Быстрая сотрировка]])
- [[Квадратичная сложность]]. Пример: медленные алгоритмы сортировки ([[Cортировка выбо­ром]])
- О(n!) факториальная сложность. Пример: очень медленные алгоритмы ([[задача о коммивояжере]])

## Случаи

### Сложность алгоритма в среднем
В теории [вычислительной сложности](https://www.wikiwand.com/ru/Вычислительная_сложность "Вычислительная сложность") **сложность [алгоритма](https://www.wikiwand.com/ru/Алгоритм "Алгоритм") в среднем** — это количество неких вычислительных ресурсов (обычно — время), требуемое для работы алгоритма, усреднённое по всем возможным входным данным. Понятие часто противопоставляется сложности в худшем случае[[en]](https://www.wikiwand.com/en/worst-case%20complexity "en:worst-case complexity"), где рассматривается максимальная сложность алгоритма по всем входным данным.

Имеются три основных причины изучения сложности в среднем[](https://www.wikiwand.com/ru/%D0%A1%D0%BB%D0%BE%D0%B6%D0%BD%D0%BE%D1%81%D1%82%D1%8C_%D0%B0%D0%BB%D0%B3%D0%BE%D1%80%D0%B8%D1%82%D0%BC%D0%B0_%D0%B2_%D1%81%D1%80%D0%B5%D0%B4%D0%BD%D0%B5%D0%BC#cite_note-_44a8f5917759c8fa-1). Во-первых, хотя некоторые задачи могут быть трудно разрешимы в худшем случае, входные данные, которые приводят к такому поведению, на практике встречаются редко, так что сложность в среднем может оказаться более аккуратной мерой производительности алгоритма. Во-вторых, анализ сложности в среднем даёт средства и технику генерации сложных данных для задачи, что можно использовать в [криптографии](https://www.wikiwand.com/ru/Криптография "Криптография") и дерандомизации[[en]](https://www.wikiwand.com/en/Derandomization "en:Derandomization"). В-третьих, сложность в среднем позволяет выделить наиболее эффективный алгоритм на практике среди алгоритмов той же основной сложности (например, [быстрая сортировка](https://www.wikiwand.com/ru/Быстрая_сортировка "Быстрая сортировка")).

[Анализ алгоритмов](https://www.wikiwand.com/ru/Теория_алгоритмов "Теория алгоритмов") в среднем требует понятия «средних» данных алгоритма, что приводит к задаче продумывания [распределения вероятностей](https://www.wikiwand.com/ru/Распределение_вероятностей "Распределение вероятностей") входных данных. Может быть использован также [вероятностный алгоритм](https://www.wikiwand.com/ru/Вероятностный_алгоритм "Вероятностный алгоритм"). Анализ таких алгоритмов приводит к связанному понятию **ожидаемой сложности**[](https://www.wikiwand.com/ru/%D0%A1%D0%BB%D0%BE%D0%B6%D0%BD%D0%BE%D1%81%D1%82%D1%8C_%D0%B0%D0%BB%D0%B3%D0%BE%D1%80%D0%B8%D1%82%D0%BC%D0%B0_%D0%B2_%D1%81%D1%80%D0%B5%D0%B4%D0%BD%D0%B5%D0%BC#cite_note-_b93e43c56e6e8cc4-2).

### Худший случай сложности
В [информатике](https://www.wikiwand.com/ru/Информатика "Информатика") (особенно в [теории сложности вычислений](https://www.wikiwand.com/ru/Теория_сложности_вычислений "Теория сложности вычислений")), **худший случай сложности** (он обозначается Big-oh(n)) измеряет ресурсы (например, время выполнения, [память](https://www.wikiwand.com/ru/Компьютерная_память "Компьютерная память")), которые требуются [алгоритму](https://www.wikiwand.com/ru/Алгоритм "Алгоритм") для обработки входных данных случайного размера (обычно обозначаемого n в [асимптотическом обозначении](https://www.wikiwand.com/ru/«O»_большое_и_«o»_малое "«O» большое и «o» малое")). Он обозначает верхнюю границу ресурсов, требуемых алгоритму.

В случае со временем выполнения, худший случай [временной сложности алгоритма](https://www.wikiwand.com/ru/Временная_сложность_алгоритма "Временная сложность алгоритма") обозначает самое долгое время выполнения требуемое алгоритму для обработки _любого_ размера входных данных n, тем самым гарантируя, что алгоритм выполнится в обозначенный период времени. Порядок роста (например, линейный, [логарифмический](https://www.wikiwand.com/ru/Логарифмический_рост "Логарифмический рост")) худшего случая сложности обычно используется для сравнения [эффективности](https://www.wikiwand.com/ru/Эффективность_алгоритма "Эффективность алгоритма") двух алгоритмов.

Худший случай сложности алгоритма следует противопоставлять с его [средним случаем сложности](https://www.wikiwand.com/ru/Сложность_алгоритма_в_среднем "Сложность алгоритма в среднем"), который обозначает усредненное количество ресурсов, требуемых алгоритму для обработки данных случайного размера.

#More : https://dev.to/nielsenjared/big-o-log-linear-time-complexity-h51