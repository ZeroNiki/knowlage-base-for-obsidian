## Определение

Для начала рассмотрим определение из англоязычной википедии. В русскоязычной википедии базовое определение имеет другой смысл и плохо стыкуется с тем, что обычно описывают в литературе, как и с моим личным пониманием данной парадигмы.

> Object-oriented programming (OOP) is a programming paradigm based on the concept of "objects", which can contain data and code: data in the form of fields (often known as attributes or properties), and code, in the form of procedures (often known as methods).

В Rust для описания объектов используются структуры. Они позволяют упаковать в объект нужные ему данные (поля) и наделить объект необходимым функционалом (методами).

## Принципы
- **Инкапсуляция** — сокрытие внутренней реализации объекта от внешнего пользователя. В Rust эта идея реализуется с помощью приватных полей и методов структур, используя механизм модулей. Если поле или метод в структуре не помечен как публичный, то для любого внешнего модуля это поле является скрытым и не может быть использовано. Более того, чтобы саму структуру было видно извне её модуля, её тоже нужно помечать, как публичную. Пример:
    

```rust
mod aaa {
    fn foo(inner: bbb::Inner) {
        // Есть доступ к публичному полю.
        let a = inner.public;
        
        // Ошибка компиляции: попытка обращения к приватному полю.
        let b = inner.private;
        
        // Ошибка компиляции: попытка использования приватной структуры.
        let c = bbb::Private {};
    }

    mod bbb {
        pub struct Inner {
            private: i32,
            pub public: i32,
        }

        struct Private {}
    }
}
```

- **Наследование** описывает отношение "является" между двумя объектами. Например, "собака является млекопитающим" или "круг является фигурой". При этом, дочерний объект может быть использован в любом контексте, в котором ожидается родительский объект. Для этого необходимо, чтобы функционал базового объекта присутствовал, также, и в дочернем. Тут в Rust начинают появляться отличия от классического подхода к реализации данной идеи — через классы и интерфейсы. Во-первых, в Rust отсутствует наследование структур, а, следовательно, и наследование данных. Вместо этого в языке есть механизм для описания функционала в отрыве от конкретной реализации. Этот механизм называется трейты. Их могут наследовать как структуры, так и другие трейты. Пример:
    

```rust
trait Shape {
    // У любой фрормы можно посчитать площадь.
    fn area(&self) -> f32;
}

trait HasAngles: Shape {
    // У любой фигуры с углами можно посчитать количество углов.
    fn angles_count(&self) -> i32;
}

struct Rectangle {
    x: f32,
    y: f32,
}

// Прямоугольник является формой.
impl Shape for Rectangle {
    fn area(&self) -> f32 {
        self.x * self.y
    }
}

// Прямоугольник является фигурой с углами.
impl HasAngles for Rectangle {
    fn angles_count(&self) -> i32 {
        4
    }
}

struct Circle {
    r: f32,
}

// Круг является формой
impl Shape for Circle {
    fn area(&self) -> f32 {
        self.r.powi(2) * PI
    }
}
```

- Следующий принцип используется как раз для того, чтобы дать возможность использовать в данном контексте любой тип, который является наследником заданного родителя. Этот принцип называют **полиморфизмом**. Rust поддерживает сразу два вида полиморфизма: статический и динамический. Оба подхода решают одну проблему, но каждый имеет свои особенности.
    
    - Статический полиморфизм требует, чтобы при компиляции программы было известно, какие конкретные типы используются в каждом обобщённом контексте. Имея эту информацию компилятор проводит, так называемую, мономорфизацию. Когда одна обобщённая сущность превращается в несколько сущностей с конкретными типами, используемыми в них. При этом размер исполняемого файла раздувается и мы теряем возможность подменять наследника в процессе выполнения программы. Взамен получаем более высокую скорость выполнения, так как компилятору известны конкретные типы и адреса функций для каждой ситуации, а следовательно, он может применять больше оптимизаций.
        
    - Динамический полиморфизм работает посредством динамической диспетчеризации. При этом мы не знаем конкретного типа объекта и для получения адреса его методов в памяти используем дополнительную информацию — таблицу функций. Её содержимое зависит от того, какой конкретный тип скрывается за абстрактным указателем. Такой подход не раздувает исполняемый файл и позволяет подменять реализацию в процессе выполнения программы. Но при этом мы жертвуем частью производительности — для вызова метода нам придётся сначала прочитать его адрес из памяти, что значительно затрудняет оптимизацию программы на этапе компиляции.

Пример статического полиморфизма:

```rust
// Принимаем что угодно, реализующее трейт Shape.
fn areas_sum(shape1: impl Shape, shape2: impl Shape) -> f32 {
    shape1.area() + shape2.area()
}

fn foo(rectangle: Rectangle, circle: Circle) {
    // Можем передать две разные фигуры.
    let sum = areas_sum(rectangle, circle);
}
```

Пример динамического полиморфизма:

```rust
// Принимаем что угодно, реализующее трейт Shape.
// В этот раз принимаем не сами объекты, а ссылки на них,
// так как не зная конкретный тип объекта, мы не знаем и его размер,
// а следовательно, не сможем выделить для него место на стеке.
fn areas_sum(shape1: &dyn Shape, shape2: &dyn Shape) -> f32 {
    shape1.area() + shape2.area()
}

fn foo(rectangle: Rectangle, circle: Circle) {
    // Можем передать ссылки на две разные фигуры.
    let sum = areas_sum(&rectangle, &circle);
}
```

- Последний принцип не всегда указывают, так как он, в некотором смысле, следует из предыдущих. Это **абстракция** — способность скрывать детали различных реализаций некоторого функционала под общим интерфейсом и, затем использовать их в общем для всех реализаций коде. Собрав воедино код всех примеров с формами мы получим пример абстракции.