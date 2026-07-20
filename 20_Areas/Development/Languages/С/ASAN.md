#  **ASan (AddressSanitizer) в C**  

**ASan (AddressSanitizer)** — это инструмент для выявления **ошибок работы с памятью** в C и C++. Он помогает находить:  

 **Типичные ошибки памяти:**  
 Выход за границы массива (**buffer overflow**)  
 Использование освобождённой памяти (**use-after-free**)  
 Доступ к неинициализированной памяти (**use-after-scope**)  
 Двойное освобождение памяти (**double free**)  
 Утечки памяти (**memory leaks**)  

---  

##  **Как включить ASan?**  
Компиляторы **GCC** и **Clang** поддерживают ASan с флагом `-fsanitize=address`.  

###  **Компиляция с ASan**
```sh
gcc -g -fsanitize=address program.c -o program
```

###  **Запуск**
Просто запусти программу:  
```sh
./program
```
Если в коде есть ошибки работы с памятью, ASan их покажет.

---

##  **Примеры использования**  

###  **1. Выход за границы массива**  
```c
#include <stdio.h>

int main() {
    int arr[5];
    arr[10] = 42;  //  Ошибка: выход за границы массива
    return 0;
}
```
**Вывод ASan:**  
```
==12345==ERROR: AddressSanitizer: heap-buffer-overflow on address 0x...
```
 **Исправление:** Использовать **правильные индексы** и проверять границы массива.

---

###  **2. Использование освобождённой памяти (Use-after-free)**  
```c
#include <stdlib.h>

int main() {
    int *ptr = malloc(10 * sizeof(int));
    free(ptr);
    ptr[0] = 42;  //  Ошибка: доступ к освобождённой памяти
    return 0;
}
```
**Вывод ASan:**  
```
==12345==ERROR: AddressSanitizer: heap-use-after-free on address 0x...
```
 **Исправление:**  
После `free(ptr)` **обнуляй указатель**:  
```c
free(ptr);
ptr = NULL;
```

---

###  **3. Двойное освобождение памяти (Double free)**  
```c
#include <stdlib.h>

int main() {
    int *ptr = malloc(10 * sizeof(int));
    free(ptr);
    free(ptr);  //  Ошибка: двойное освобождение памяти
    return 0;
}
```
**Вывод ASan:**  
```
==12345==ERROR: AddressSanitizer: attempting double-free on 0x...
```
 **Исправление:**  
```c
free(ptr);
ptr = NULL;
```

---

###  **4. Утечки памяти (Memory Leaks)**  
ASan можно запустить с проверкой утечек памяти:  
```sh
ASAN_OPTIONS=detect_leaks=1 ./program
```

Пример кода с утечкой:  
```c
#include <stdlib.h>

int main() {
    int *ptr = malloc(10 * sizeof(int));
    return 0;  //  Ошибка: память не освобождена
}
```
**Вывод ASan:**  
```
==12345==ERROR: LeakSanitizer: detected memory leaks
```
 **Исправление:**  
```c
free(ptr);
```

---

##  **Вывод**  
 **ASan** — мощный инструмент для поиска ошибок работы с памятью.  
 Позволяет находить **переполнения буфера, утечки памяти и use-after-free**.  
 Работает с **GCC и Clang**.  