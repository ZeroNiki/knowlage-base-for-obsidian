# Что знаешь про декоратор Middleware

Middleware – особый объект, который обычно изменяет входящий запрос или исходящий ответ. Например, добавляет заголовки, делает предварительные проверки. Middleware нужен, когда требуется подвергнуть обработке все запросы приложения.
На уровне языка это объект с методами process_request и process_response. Методы должны вернуть принятый объект (запрос или ответ) для дальнейшей обработки или выкинуть исключение, если что-то не в порядке. В этом случает дальнейшая обработка прекращается.
Чтобы включить Middleware, достаточно добавить путь к нему в список MIDDLEWARE.

Middleware – особый объект, который обычно изменяет входящий запрос или исходящий ответ. Например, добавляет заголовки, делает предварительные проверки. Middleware нужен, когда требуется подвергнуть обработке все запросы приложения.

На уровне языка это объект с методами process_request и process_response. Методы должны вернуть принятый объект (запрос или ответ) для дальнейшей обработки или выкинуть исключение, если что-то не в порядке. В этом случает дальнейшая обработка прекращается.

Чтобы включить Middleware, достаточно добавить путь к нему в список MIDDLEWARE.

Oct. 12, 2023, Источник

