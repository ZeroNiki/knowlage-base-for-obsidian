# Что знаешь про singleton

Паттерн Одиночка (Синглтон) применяется, когда необходим класс, у которого должен быть единственный экземпляр во всей программе.
С помощью паттерна Одиночка могут быть реализованы многие паттерны (абстрактная фабрика, строитель, прототип).
В сборнике рецептов приводится простой класс Singleton, которому любой класс может унаследовать, чтобы стать одиночкой.

class Singleton(object):

    def __new__(cls,*dt,**mp):
        if not hasattr(cls,'_inst'):
            cls._inst = super(Singleton, cls).__new__(cls,dt,mp)
        else:
            def init_pass(self,*dt,**mp):pass
            cls.__init__ = init_pass

        return cls._inst

if __name__ == '__main__':


    class A(Singleton):

        def __init__(self):
            """Super constructor
                There is we can open file or create connection to the database
            """
            print "A init"


    a1 = A()
    a2 = A()
И класс Borg, который даст тот же результат совсем другим способом.

class Borg:
    __shared_state = {}

    def __init__(self):
        self.__dict__ = self.__shared_state
        self.state = 'Init'

    def __str__(self):
        return self.state


class YourBorg(Borg):
    pass


def main():
    """
    >>> rm1 = Borg()
    >>> rm2 = Borg()
    >>> rm1.state = 'Idle'
    >>> rm2.state = 'Running'
    >>> print('rm1: {0}'.format(rm1))
    rm1: Running
    >>> print('rm2: {0}'.format(rm2))
    rm2: Running
    # When the `state` attribute is modified from instance `rm2`,
    # the value of `state` in instance `rm1` also changes
    >>> rm2.state = 'Zombie'
    >>> print('rm1: {0}'.format(rm1))
    rm1: Zombie
    >>> print('rm2: {0}'.format(rm2))
    rm2: Zombie
    # Even though `rm1` and `rm2` share attributes, the instances are not the same
    >>> rm1 is rm2
    False
    # Shared state is also modified from a subclass instance `rm3`
    >>> rm3 = YourBorg()
    >>> print('rm1: {0}'.format(rm1))
    rm1: Init
    >>> print('rm2: {0}'.format(rm2))
    rm2: Init
    >>> print('rm3: {0}'.format(rm3))
    rm3: Init
    """


if __name__ == "__main__":
    import doctest
    doctest.testmod()
Однако самый простой способ получить функциональность одиночки в Python - создать модуль с глобальным состоянием, которое хранится в закрытых переменных, и предоставить открытые функции для доступа к нему. Например, для получения курсов валют нам понадобится функция, которая будет возвращать словарь (ключ - название валюты, значение - обменный курс). Возможно, эту функцию понадобится вызывать несколько раз, но в большинстве случев извлекать откуда-то курсы нужно единожды. Реализовать это поможет паттерн Одиночка.

def get(refresh=False):
    if refresh:
        get.rates = {}
    if get.rates:
        return get.rates
    with urllib.request.urlopen(_URL) as file:
        for line in file:
            line = line.rstrip().decode("utf-8")
            if not line or line.startswith(("#", "Date")):
                continue
            name, currency, *rest = re.split(r"/s*,/s*", line)
            key = "{} ({})".format(name, currency)
            try:
                get.rates[key] = float(rest[-1])
            except ValueError as err:
                print("error {}: {}".format(err, line))
    return get.rates
get.rates = {}


if __name__ == "__main__":
    import sys
    if sys.stdout.isatty():
        print(get())
    else:
        print("Loaded OK")

Здесь мы создаем словарь rates в виде атрибута функции Rates.get() - это наше закрытое значение. Когда открытая функция get() вызывается в первый раз (а также при вызове с параметром refresh=True), мы загружаем список курсов; в противном случае просто возвращаем последние загруженные курсы.

Паттерн Одиночка (Синглтон) применяется, когда необходим класс, у которого должен быть единственный экземпляр во всей программе.

С помощью паттерна Одиночка могут быть реализованы многие паттерны (абстрактная фабрика, строитель, прототип).

В сборнике рецептов приводится простой класс Singleton, которому любой класс может унаследовать, чтобы стать одиночкой.

И класс Borg, который даст тот же результат совсем другим способом.

Однако самый простой способ получить функциональность одиночки в Python - создать модуль с глобальным состоянием, которое хранится в закрытых переменных, и предоставить открытые функции для доступа к нему. Например, для получения курсов валют нам понадобится функция, которая будет возвращать словарь (ключ - название валюты, значение - обменный курс). Возможно, эту функцию понадобится вызывать несколько раз, но в большинстве случев извлекать откуда-то курсы нужно единожды. Реализовать это поможет паттерн Одиночка.

Здесь мы создаем словарь rates в виде атрибута функции Rates.get() - это наше закрытое значение. Когда открытая функция get() вызывается в первый раз (а также при вызове с параметром refresh=True), мы загружаем список курсов; в противном случае просто возвращаем последние загруженные курсы.

Oct. 9, 2023, Источник

