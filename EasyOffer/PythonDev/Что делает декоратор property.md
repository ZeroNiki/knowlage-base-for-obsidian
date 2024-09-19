# Что делает декоратор property

Декоратор который позволяет превратить метод в свойство, чтобы предоставить управляемым атрибутам возможность и для чтения, и для записи.

class Square:
    def __init__(self, side):
        self.side = side

    @property
    def side(self):
        return self._side

    @side.setter
    def side(self, value):
        self._side = float(value)

    @property
    def area(self):
        return self.side ** 2

    @area.setter
    def area(self, value):
        self.side = value ** 0.5
 

Декоратор который позволяет превратить метод в свойство, чтобы предоставить управляемым атрибутам возможность и для чтения, и для записи.

 

Oct. 10, 2023, Источник

