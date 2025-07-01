---
{"publish":true,"created":"2025-02-05","tags":["python"],"cssclasses":""}
---

> [!TIP] Source
> [전문가를 위한 파이썬](https://www.hanbit.co.kr/store/books/look.php?p_code=B9617416545)(Fluent Python) 13장

## 4가지 타이핑 유형

![[assets/python - interface, protocols, abcs/python-typings.png|475]]

이번 챕터를 그림 한장에 🦆🪿🤯 

이 그림 보기 전에 우선 타입 검사에 대해서 한번 짚고 넘어가자. Python에서 가능한 타입 검사(Type Checking)은,

- 기본 인터프리터의 타입 검사 (= 동적 타입 검사, Dynamic Typing)
	- Python은 원래 동적 타입 언어로 변수 타입을 미리 선언할 필요 없음
	- 타입 지정 없이 실행이 가능하며 실행중(runtime)에 타입이 결정되고 문제가 있어도 실행중에 typeerror가 발생
		- 사실상 이걸 타입 '검사'라고 볼 수 있나? 런타임에 잘못될 때까지 검사를 안하는 거임.. 어쨌든 Python의 기본 작동 방식이 이렇다

- 런타임 타입 검사 
	- 실행중(runtime)에 객체의 타입을 명시적으로 직접 확인
	- `isinstance()`나 `hasattr()`를 통해 타입을 체크하는 것을 말함

- 정적 타입 검사 (Static Type Checking)
	- type hints를 사용해서 타입을 미리 지정
	- 하지만 Python 자체는 타입을 강제하지 않기 때문에 **mypy 같은 모듈이나 IDE에서 제공하는 기능과 같은 별도의 외부 도구를 사용해서 검사**
```python
def add(x: int, y: int) -> int: #int라고 type hinting
    return x + y

print(add(3, 5))   # 정상 작동
print(add("3", "5"))  # mypy 검사 시 오류 발생
```

```sh
$ mypy script.py
error: Argument 1 to "add" has incompatible type "str"; expected "int"
```


다시 그림으로 돌아가서 축을 보면,
- 정적 🆚 런타임 검사
	- 위의 검사 유형 중 런타임 검사이냐 정적 검사이냐를 의미
- 구조적 🆚 명목형 검사
	- 구조적 검사: 객체의 구조에 기반해서 체크함. 클래스가 뭐든지 간에 이 객체가 어떤 메소드를 가지고 있다면 이런 타입이다 라는 방식 (그야말로 🦆 typing의 정의)
	- 명목형 검사: 명시적으로 클래스명이 이거냐? 이 클래스를 상속했느냐? 를 검사

이 기준들로 볼 경우 4가지 타이핑 유형이 나눠진다는 것
- **덕타이핑**
	- 초기 파이썬부터 기본방식
- **구스타이핑**
	- 추상 베이스 클래스(ABC)로 지원
	- 객체가 ABC형인지 런타임에 검사 - `isinstance()`
- **정적 타이핑**
	- C, 자바처럼 정적으로 타입 검사
	- 위의 코드 예시처럼 type hinting + 외부 타입 검사기로 검사
- **정적 덕 타이핑**
	- typing.Protocol의 서브클래스를 통해 지원
	- 덕타이핑의 유연함을 살리면서 타입 검사도 할 수 있는 방법!
	- 외부 타입 검사기로 검사

사실 정적 타이핑은 명확하기 때문에... 덕타이핑, 구스타이핑, 정적 덕 타이핑(정적 프로토콜)은 아래에서 더 자세히 다룬다!

<br>

### 프로토콜이란?

- 맥락에 따라 정말 많은 의미를 가질 수 있는 말이지만 Python 문서에서는 초기부터 **비공식 인터페이스**를 의미해왔음
	- 예를 들어 어떤 클래스가 `__getitem__()`이라는 스페셜 메서드를 구현하면, 시퀀스 프로토콜이 지원되어 항목을 가져오고 반복,in연산자 등 일반적인 시퀀스처럼 작동할 수 있게 됨
	- 덕타이핑과 일치하는 맥락
- 파이썬 3.8에서 [Protocols - Structural subtyping(정적 덕 타이핑)](https://peps.python.org/pep-0544/)이 등장하면서 프로토콜의 의미가 하나 더 추가됨
- 이 책에서는 두 가지 프로토콜을 다음 용어로 나누어 구분하려고 함
	- 동적 프로토콜
		- 처음에 언급한 전통적인(?) 의미의 프로토콜로 인터프리터 자체에서 기본으로 지원
		- 타입 검사기 사용할 수 없고 런타임에만 타입이 맞는지 확인할 수 있음
	- 정적 프로토콜
		- typing.Protocol의 서브클래스
		- 정적 타입 검사기로 검증할 수 있음
- 둘 다 어떤 클래스를 상속할 필요는 없다는 점이 중요함! 동적 프로토콜의 경우에도 예를 들어 `__getitem__()`을 구현만 하면 되고, 정적 프로토콜의 경우에도 typing.Protocol을 이용해 정의된 메소드를 구현하기만 하면 상속 없이 타이핑이 가능


<br>

## 덕 타이핑 (=동적 프로토콜)

### 멍키 패칭

> **기존 코드(클래스, 모듈, 라이브러리 등)를 수정하지 않고, 런타임에 동적으로 속성(메서드, 변수 등)을 변경**

```python
class Dog:
    def speak(self):
        return "멍멍!"

dog = Dog()
print(dog.speak())  # 멍멍

# 멍키 패칭
def new_speak(self):
    return "월월!"
Dog.speak = new_speak 

print(dog.speak())  # 월월
```
- 이런 방식으로 런타임에서 메서드를 추가하게 되면(예- 가변 시퀀스 프로토콜을 만족하는 메서드), 1) 이 클래스가 어떤 클래스이든 상관없이 2) 원래 코드에 있는 게 아니라 런타임에 추가되었더라도 **프로토콜이 만족**됨

### 방어적 프로그래밍/조기 실패

> 방어운전처럼, 부주의한 프로그래머가 있더라도 안정성을 높이는 관례
- 조기 실패: 함수 시작 부분에서 잘못된 인수를 거부하는 등 가능한 한 빨리 런타임 에러를 발생시킴

- 예를 들면,
```python
def __init__(self, iterable):
	self._balls = list(iterable)
```
- 너가 어떤 걸 넣든지 안전하게 list로 바꿔서 쓰겠다
	- 만약 iterable이 아니어서 list로 변환이 안 되면 이때 실패할 것
	- 이걸 미리 해두지 않으면 나중에 코드의 다른 부분에서 list형이 지원하는 연산을 하려고 할 때 실패할 텐데 그때는 원인을 찾기가 힘들 수 있음

- 타입 힌트를 사용하더라도 조기 실패가 필요할 수 있음
	- 힌트는 힌트일 뿐이고 런타임에서 강제되지 않기 때문에

```python
def multiply(x: int, y: int) -> int:
    return x * y

print(multiply("3", 4))  # "3333"
#mypy를 쓰면 "3"이 int가 아니라고 경고, 하지만 런타임에서 그냥 실행은 되어버림


def multiply(x: int, y: int) -> int:
    if not isinstance(x, int) or not isinstance(y, int):
        raise TypeError("x와 y는 정수여야 합니다.")  #조기실패
    return x * y

```


<br>

## 구스 타이핑 (ABC)

> **추상 베이스 클래스(ABC)로 인터페이스를 정의하고 상속/등록한 뒤 런타임 검사(isinstance, issubclass)하기**!


- 추상 클래스(Abstrac Class) 🆚 구상 클래스(Concrete Class)
	- 추상 클래스: 인스턴스를 생성할 수 없고 메서드의 목록(=인터페이스)만 가지고 있는 클래스
	- 구상 클래스: 직접 인스턴스를 만들 수 있는 클래스
	- **추상 클래스를 상속하여 클래스를 만들 때 추상 클래스에서 정의된 메서드의 구현이 강**제됨


- 구상 클래스에 대해 런타임 검사(isinstance)를 하면 객체지향 프로그래밍의 특성인 다형성을 제한하게 됨
	- **다형성(Polymorphism)** 이란?
		- 같은 인터페이스(메서드)를 가진 객체들이 서로 다른 방식으로 동작할 수 있음
		- 계속 if/elif를 난사하면서 isinstance() 체크해서 각각 다르게 동작하도록 작성하는 것은 다형성과 어긋난다는 말

```python
class Dog:
    def speak(self):
        return "멍멍!"

class Cat:
    def speak(self):
        return "야옹!"

def make_sound(animal):
    if isinstance(animal, Dog) or isinstance(animal, Cat): 
        return animal.speak()
    else:
        raise TypeError("Animal이 아닙니다!")
```
- 구상 클래스에 대해 런타임 검사를 하면 새로운 클래스가 추가될 때마다 타입 검사의 if문을 계속 수정해야 함
- 다음과 같이 추상 클래스를 사용해 융통성 있게 검사할 수 있음

```python
from abc import ABC, abstractmethod

class Animal(ABC):
    @abstractmethod
    def speak(self):
        pass
        
    def sleep(self):
        print("zzz...") 

class Dog(Animal):
    def speak(self):
        return "멍멍!"

class Cat(Animal):
    def speak(self):
        return "야옹!"

def make_sound(animal: Animal):
    if isinstance(animal, Animal):
        return animal.speak()
    else:
        raise TypeError("Animal이 아닙니다!")
```
- 추상 메서드와 일반 메서드 차이
	- 추상 메서드(`@abstractmethod`)는 서브클래스에서 반드시 구현해야 함, `speak`을 구현하지 않고 상속한 뒤 객체를 생성하면 TypeError 발생
	- 일반 메서드는 기본적인 기능을 제공하며 서브클래스에서 구현하지 않고 그냥 바로 사용할 수 있음. 원한다면 오버라이딩(재정의)해도 됨
<br>

### 표준 라이브러리 ABC

- collections.abc 모듈에 대부분의 표준적인 ABC가 정의되어 있음
	- 표준 ABC를 활용하는 것이 일반적으로 권장되며, **새로운 ABC를 정의해야 한다면 그 필요성이 명확**해야 함

![[collections_abc.png\|500]]

### ABC 정의하고 상속하기

- 표준 ABC로 안 되는 기능, 새로운 개념이나 특화된 비즈니스 로직에 맞는 인터페이스가 필요하다면 ABC를 새로 정의
- 예를 들어,

> 아이템을 랜덤하게 보여주지만 목록에 있는 아이템을 다 보여줄 때까지 같은 아이템을 반복해서 보여주면 안 됨

```python
import abc

class Tombola(abc.ABC):

	@abc.abstractmethod
	def load(self, iterable):
		"""iterable의 항목들을 추가한다."""

	@abc.abstractmethod
	def pick(self):
		"""무작위로 항목 하나를 제거하고 반환한다.
		인스턴스가 비어 있으면 LookupError를 발생시킨다.
		"""

	def loaded(self):
		"""항목이 최소 한 개 이상 있으면 True, 아니면 False 반환한다."""
		return bool(self.inspect())

	def inspect(self):
		"""현재 항목들로 정렬된 튜플을 만들어 반환한다."""
		items = []
		while True:
			try:
				items.append(self.pick())
			except LookupError:
				break
		self.load(items)
		return tuple(items)

```

- ABC를 선언할 때는 abc.ABC나 다른 ABC를 상속하는 게 표준적인 방법임
- 구문상의 주의점은 `@abstractmethod` 데커레이터는 다른 데커레이터랑 같이 쓸 때 가장 뒤에, 즉 def 바로 앞에 와야 함
- 위 Tombola 라는 ABC는 2개의 추상 메서드와 2개의 일반 메서드가 정의되어 있음

```python
class Fake(Tombola):
	def pick(self):
		return 13

f = Fake() #TypeError
```

- 위와 같이 Tombola를 상속했지만, 2개의 추상 메서드 중 하나를 구현하지 않았으므로 TypeError가 남



### ABC를 상속하지 않고 가상 서브클래스로 등록하기

- 구스타이핑의 본질적 기능은 ABC를 상속하지 않고도 그 클래스의 가상 서브클래스로 등록할 수 있다는 것
	- 등록할 경우,
		- 객체를 생성할 때 ABC의 인터페이스를 따르는지 검사하지 않음 (mypy같은 도구도 이 가상 서브클래스를 검사하지 않음)
		- issubclass()나 isinstance()함수에 의해 그 ABC로 인식됨
		- 실제 상속이 아니기 때문에 ABC로부터 메서드나 속성은 전혀 상속받지 않음
		- **ABC 인터페이스의 구현이 강제되지 않기 때문에 유연하지만 런타임 검사만 가능 (메서드를 구현하지 않아서 실행 중 오류가 발생할 수 있음)**


```python
class Car:
    pass 
Animal.register(Car) #이렇게 해도 되고

@Animal.register
class Car:
	pass #이렇게 해도 됨


####

issubclass(Car, Animal) #True

car = Car() #인터페이스 구현을 안했는데도 잘 생성됨
print(isinstance(car, Animal))  #True

#하지만 abstractmethod인 speak을 구현하지 않았기 때문에..
print(car.speak())  # AttributeError: 'Car' object has no attribute 'speak'
```

<br>

## 정적 덕 타이핑 (=정적 프로토콜)

 > **typing.Protocol 을 사용해서 특정 인터페이스(메서드/속성)만 가지만 해당 타입으로 인정하는 방식**


```python
from typing import Protocol

class Flyable(Protocol): 
    def fly(self) -> str:
        ...

class Bird:
    def fly(self) -> str:
        return "새가 난다!"

class Airplane:
    def fly(self) -> str:
        return "비행기가 난다!"

class Fish:
    def swim(self) -> str: 
        return "물고기가 헤엄친다!"

def make_it_fly(flyer: Flyable):
    print(flyer.fly()) 

bird = Bird()
plane = Airplane()
fish = Fish()

make_it_fly(bird) 
make_it_fly(plane)
make_it_fly(fish)   # 오류 발생
```

- Bird, Airplane이 모두 어떤 클래스를 상속할 필요 없이 fly()를 구현하는 것만으로도 Flyable로 인정됨
- Protocol은 런타임에 강제되지 않음 **(런타임 검사 불가능)**
	- **정적 검사 방식으로 mypy등의 검사기를 사용해야 함**

```python
isinstance(bird, Flyable) #TypeError. Flyable은 런타임에서 클래스로 인식X
```


- 하지만 `@runtime_checkable` 데코레이터를 사용하면 Protocol도 isinstance()나 issubclass()로 검사할 수 있음

```python
from typing import Protocol, runtime_checkable

@runtime_checkable
class Flyable(Protocol):
    def fly(self) -> str:
        ...

class Bird:
    def fly(self) -> str:
        return "새가 날아갑니다!"

class Fish:
    def swim(self) -> str:
        return "물고기가 헤엄칩니다!"

b = Bird()
f = Fish()

print(isinstance(b, Flyable))  # True (Bird는 fly()를 구현했으므로)
print(isinstance(f, Flyable))  # False (Fish는 fly() 없음)
```

<br>

| 검사 방식                            | 검사 시점          | 타입 체크 방식                        | 상속 필요 여부 | `isinstance()` 사용 가능 | 강제되는 메서드         |
| -------------------------------- | -------------- | ------------------------------- | -------- | -------------------- | ---------------- |
| **동적 타입 검사**                     | 런타임            | `isinstance()` 등으로 직접 검사        | ❌        | ✅                    | ❌ (아무 메서드나 가능)   |
| **정적 타입 검사**                     | 정적 검사기(`mypy`) | 타입 힌트 기반 검사                     | ❌        | ❌                    | ❌ (힌트만 제공)       |
| **ABC 상속**                       | 런타임            | `isinstance()` 검사 가능            | ✅        | ✅                    | ✅ (추상 메서드 구현 필수) |
| **ABC `register()`**             | 런타임            | `isinstance()` 검사 가능 (등록된 클래스만) | ❌        | ✅                    | ❌ (구현 강제 안 함)    |
| **Protocol (`typing.Protocol`)** | 정적 검사기(`mypy`) | "해당 메서드만 있으면 타입 인정"             | ❌        | 🔺 (데코레이터 사용하면 가능)   | ✅ (정의된 메서드 필요)   |
