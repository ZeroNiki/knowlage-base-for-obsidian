# Сортировка выбором на Python

Программа будет сортировать список методом выбора (Selection sort).

![](https://pythonist.ru/wp-content/uploads/2020/05/selection-sort-gif.gif)

#### Суть сортировки

1. В неотсортированном подмассиве ищется локальный максимум (минимум).
2. Найденный максимум (минимум) меняется местами с последним (первым) элементом в подмассиве.
3. Если в массиве остались неотсортированные подмассивы — смотри пункт 1.

## Шаги к правильному решению

1. Создадим функцию `selection_sort`, которая принимает на вход список.
2. Внутри функции создадим цикл с переменной `i`, которая будет исчисляться с 0 до (`длины списка - 1`)
3. Создадим переменную `smallest = i`.
4. Создадим внутренний цикл с переменной `j` от `i + 1` до (`длины списка - 1`).
5. Внутри этого цикла, если `j`-элемент (элемент под индексом `j`) меньше, чем элемент с индексом `smallest`, тогда устанавливаем `smallest = j`.
6. После завершения внутреннего цикла меняем местами элементы под индексами i и smallest.

### Исходный код для сортировки выбором:
```python
def selection_sort(arr):
    for i in range(len(arr)):
        min_ind = i
        for j in range(i+1, len(arr)):
            if arr[j] < arr[min_ind]:
                min_ind = j

            arr[i], arr[min_ind] = arr[min_ind], arr[i]

    return arr



arr = [2, 5, 4, 3, 1]
print("Отсортированный массив:", selection_sort(arr))
```