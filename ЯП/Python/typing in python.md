**Аннотации типов** в Python — это способ указания типов данных для переменных, аргументов функций и возвращаемых значений. Они помогают сделать код более читаемым и понятным, а также могут использоваться сторонними инструментами для статического анализа, например, с помощью `mypy`.

Хотя аннотации типов не влияют на выполнение кода, они обеспечивают явное указание того, какие типы данных предполагается использовать.

### Пример использования аннотаций типов в функциях

#### Аннотация аргументов и возвращаемого значения

```python
def greeting(name: str) -> str:
    return f"Hello, {name}!"
```
Здесь:
- `name: str` — аргумент `name` должен быть строкой.
- `-> str` — функция возвращает строку.

#### Пример аннотации переменных

```python
age: int = 25
height: float = 1.75
is_student: bool = False
```

### Аннотации для встроенных коллекций

Для аннотации типов, таких как списки, множества и словари, используются обобщения (`generics`).

- **Список строк**: `List[str]`
- **Множество чисел**: `Set[int]`
- **Словарь с ключами-строками и значениями целого типа**: `Dict[str, int]`

Пример:
```python
from typing import List, Dict

def process_students(names: List[str], grades: Dict[str, int]) -> None:
    for name, grade in grades.items():
        print(f"Student {name} has grade {grade}.")
```

### Аннотация с использованием `Optional`

Для переменной, которая может быть либо задана, либо иметь значение `None`, используется `Optional`.

Пример:
```python
from typing import Optional

def get_name(user_id: int) -> Optional[str]:
    if user_id == 1:
        return "Alice"
    return None
```

Здесь `Optional[str]` означает, что функция может вернуть либо строку, либо `None`.

### Аннотация с использованием `Union`

`Union` используется, когда переменная или возвращаемое значение могут быть одного из нескольких типов.

Пример:
```python
from typing import Union

def process_value(value: Union[int, float]) -> float:
    return value * 1.5
```
Функция принимает либо `int`, либо `float`.

### Аннотация с использованием `Any`

Если тип данных не имеет значения (например, принимается любой тип), можно использовать `Any`.

Пример:
```python
from typing import Any

def print_value(value: Any) -> None:
    print(value)
```

### Аннотации для классов и объектов

Вы можете аннотировать классы и объекты:

```python
class Person:
    def __init__(self, name: str, age: int) -> None:
        self.name = name
        self.age = age

p: Person = Person("John", 30)
```

### Аннотации для функций с аргументами переменной длины

Для аннотации аргументов с переменной длиной (например, `*args`, `**kwargs`) используется следующее:

```python
from typing import Any

def foo(*args: int, **kwargs: Any) -> None:
    print(args, kwargs)
```

### Аннотации типов с использованием `Callable`

`Callable` используется для аннотации объектов, которые можно вызвать (функции или методы).

Пример:
```python
from typing import Callable

def execute_function(func: Callable[[int, int], int]) -> int:
    return func(5, 10)
```
Здесь `Callable[[int, int], int]` указывает, что `func` — это функция, принимающая два целых числа и возвращающая целое число.

### Итог

Аннотации типов в Python помогают разработчикам более точно выражать свои намерения при написании кода, а также обеспечивают лучшее взаимодействие с инструментами для статической типизации и IDE.