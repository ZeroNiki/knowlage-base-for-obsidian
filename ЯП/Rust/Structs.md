С помощью структур вы можете создать свой собственный тип. Вы будете постоянно использовать структуры в Rust, потому что они очень удобны. Структуры создаются с помощью ключевого слова struct. Имя структуры должно быть написано в UpperCamelCase (каждое слово заглавная буква, без пробелов). Если вы напишете структуру строчными буквами, компилятор сообщит вам об этом.  
  
Существует три типа структур. Одним из них является «единичная структура». Единица означает «ничего не имеет». Для модульной структуры вы просто пишете имя и точку с запятой.

```rust
struct FileDirectory;
fn main() {}
```

Следующей является структура кортежа или безымянная структура. Он «безымянный», потому что вам нужно писать только типы, а не имена полей. Структуры Tuple хороши, когда вам нужна простая структура и не нужно запоминать имена.

```rust
struct Colour(u8, u8, u8);

fn main() {
    let my_colour = Colour(50, 0, 50); 
    println!("The second part of the colour is: {}", my_colour.1);
}
```

Третий тип — это именованная структура. Вероятно, это самая распространенная структура. В этой структуре вы объявляете имена и типы полей внутри блока кода {}. Обратите внимание, что вы не пишете точку с запятой после именованной структуры, поскольку после нее идет целый блок кода.

```rust
struct Colour(u8, u8, u8); 

struct SizeAndColour {
    size: u32,
    colour: Colour, 
}

fn main() {
    let my_colour = Colour(50, 0, 50);

    let size_and_colour = SizeAndColour {
        size: 150,
        colour: my_colour
    };
}

```

В именованной структуре поля также разделяются запятыми. В последнем поле вы можете ставить запятую или нет – решать вам. В SizeAndColour после цвета стояла запятая:

```rust
struct Colour(u8, u8, u8); 

struct SizeAndColour {
    size: u32,
    colour: Colour, // <- есть запятая
}

fn main() {}
```

но тебе это не нужно. Но всегда полезно ставить запятую, потому что иногда вам придется изменить порядок полей:

```rust
struct Colour(u8, u8, u8); 

struct SizeAndColour {
    size: u32,
    colour: Colour // <- нету запятой
}

fn main() {}
```

Тогда мы решили изменить порядок...

```rust
struct SizeAndColour {
    colour: Colour // ⚠️
    size: u32,
}

fn main() {}
```

Но в любом случае это не очень важно, поэтому вы сами можете выбрать, использовать запятую или нет.  
  
Давайте создадим структуру `Country` в качестве примера. Структура `Country` содержит поля `popilation`, `capital` и `lider_name`.

```rust
struct Country {
    population: u32,
    capital: String,
    leader_name: String
}

fn main() {
    let population = 500_000;
    let capital = String::from("Elista");
    let leader_name = String::from("Batu Khasikov");

    let kalmykia = Country {
        population: population,
        capital: capital,
        leader_name: leader_name,
    };
}
```




