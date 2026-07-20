Мы уже видели трейты: `Debug`, `Copy`, `Clone` — это все трейты. Чтобы придать типу признак, вы должны его реализовать. Поскольку `Debug` и другие методы настолько распространены, у нас есть атрибуты, которые делают это автоматически. Вот что происходит, когда вы пишете `#[derive(Debug)]`: вы автоматически реализуете Debug.

```rust
#[derive(Debug)]
struct MyStruct {
    number: usize,
}

fn main() {}
```

Но другие черты сложнее, поэтому вам придется реализовать их вручную с помощью `impl`. Например, `Add` (находится по адресу `std::ops::Add`) используется для добавления двух вещей. Но Rust не знает, как именно вы хотите что-то добавлять, поэтому вам придется сообщить ему об этом.

```rust
fn main() {
// 
let result = self.second_thing + self.first_thing as f32
}
```

Но, возможно, нам нужно целое число, вот так:

```rust
fn main() {
// 
let result = self.second_thing as u32 + self.first_thing
}
```

Или, может быть, мы хотим просто поместить `self.first_thing` рядом с `self. Second_thing` и сказать, что именно так мы хотим добавить. Итак, если мы добавим 55 к 33,4, мы хотим увидеть 5533,4, а не 88,4.  
  
Итак, сначала давайте посмотрим, как создать черту. О чертах важно помнить, что они касаются поведения. Чтобы создать типаж, напишите типаж, а затем создайте несколько функций.

```rust
struct Animal { // A simple struct - an Animal only has a name
    name: String,
}

trait Dog { // The dog trait gives some functionality
    fn bark(&self) { // It can bark
        println!("Woof woof!");
    }
    fn run(&self) { // and it can run
        println!("The dog is running!");
    }
}

impl Dog for Animal {} // Now Animal has the trait Dog

fn main() {
    let rover = Animal {
        name: "Rover".to_string(),
    };

    rover.bark(); // Now Animal can use bark()
    rover.run();  // and it can use run()
}

```