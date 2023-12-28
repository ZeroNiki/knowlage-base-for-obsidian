
Именно здесь вы можете начать придавать своим структурам и перечислениям реальную мощь. Чтобы вызвать функции в структуре или перечислении, используйте блок `impl`. Эти функции называются методами. В блоке `impl` есть два типа методов.  
  
- Методы: они принимают self (или `&self `или `&mut self`). Обычные методы используют . (Период).` .clone()` — пример обычного метода.  

- Связанные функции (в некоторых языках называемые «статическими» методами): они не принимают self. Ассоциированный означает «связанный с». Они пишутся по-другому, используя`::`. `String::from()` является ассоциированной функцией, как и `Vec::new()`. Вы видите связанные функции, которые чаще всего используются для создания новых переменных.  
  
В нашем примере мы собираемся создать животных и распечатать их.  
  
Для новой структуры или перечисления вам нужно указать Debug, если вы хотите использовать `{:?}` для печати, поэтому мы так и сделаем. Если вы напишете `#[derive(Debug)]`над структурой или перечислением, вы сможете напечатать его с помощью `{:?}.` Эти сообщения с `#[]` называются атрибутами. Иногда вы можете использовать их, чтобы сообщить компилятору, что он должен предоставить вашей структуре такую ​​возможность, как Debug. Атрибутов много, и о них мы узнаем позже. Но получение, вероятно, является наиболее распространенным, и вы часто видите его над структурами и перечислениями.

```rust
#[derive(Debug)]
struct Animal {
    age: u8,
    animal_type: AnimalType,
}

#[derive(Debug)]
enum AnimalType {
    Cat,
    Dog,
}

impl Animal {
    fn new() -> Self {
        // Self means Animal.
        // You can also write Animal instead of Self

        Self {
            // When we write Animal::new(), we always get a cat that is 10 years old
            age: 10,
            animal_type: AnimalType::Cat,
        }
    }

    fn change_to_dog(&mut self) { // because we are inside Animal, &mut self means &mut Animal
                                  // use .change_to_dog() to change the cat to a dog
                                  // with &mut self we can change it
        println!("Changing animal to dog!");
        self.animal_type = AnimalType::Dog;
    }

    fn change_to_cat(&mut self) {
        // use .change_to_cat() to change the dog to a cat
        // with &mut self we can change it
        println!("Changing animal to cat!");
        self.animal_type = AnimalType::Cat;
    }

    fn check_type(&self) {
        // we want to read self
        match self.animal_type {
            AnimalType::Dog => println!("The animal is a dog"),
            AnimalType::Cat => println!("The animal is a cat"),
        }
    }
}



fn main() {
    let mut new_animal = Animal::new(); // Associated function to create a new animal
                                        // It is a cat, 10 years old
    new_animal.check_type();
    new_animal.change_to_dog();
    new_animal.check_type();
    new_animal.change_to_cat();
    new_animal.check_type();
}