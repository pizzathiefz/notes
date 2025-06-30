---
{"publish":true,"created":"2025-02-28","tags":["python"],"cssclasses":""}
---

> [!TIP] Source
> [전문가를 위한 파이썬](https://www.hanbit.co.kr/store/books/look.php?p_code=B9617416545)(Fluent Python) 6장




## 변수란 무엇인가

> 변수는 상자에 붙인 레이블이지 상자 자체가 아니다

```python
a = [1,2,3]
b = a
a.append(4)
b 
# --> [1,2,3,4]
```
- `b=a`는 상자 a의 내용물을 b에 복사한 것이 아님
- a라는 레이블이 이미 붙어 있는 상자에 b라는 레이블도 붙인 것임
- 알 수 있는 사실: **변수는 레이블일 뿐임**

```python
class Gizmo:
	def __init__(self):
		print(f'Gizmo id: {id(self)}')

y = Gizmo()*10
# --> print Gizmo id & Error가 동시 발생
```
- Gizmo 객체에 10을 곱하는 것은 예외를 발생시킴
- 곱하기 전에 프린트되는 걸로 봐서는 Gizmo 객체가 생성은 되었음
- 하지만! 에러가 발생했기 때문에 변수 y는 할당되지 못했음
- 알 수 있는 사실: **객체가 먼저 생성되고 그 다음에 변수가 할당됨**
	- 개인적으로 프로그래밍을 처음 배울 때 x=3 이면 x라는 게 원래 있고 3이라는 값을 x에 할당하는 것처럼 생각했는데 변수가 객체에 할당되는 것이 맞음(여기서는 '바인딩된다'는 말이 더 적절하다고 함)


### 정체성( == 와 is연산자)

```python
charles = {'name': 'Charles L. Dogson', 'born':1832}
lewis = charles

lewis is charles #True

id(lewis)
id(charles)
#---> 동일한 값

alex = {'name': 'Charles L. Dogson', 'born':1832}

alex is charles #False
alex == charles #False
```
- `lewis`는 `charles`의 **별칭**임 (두 변수가 동일 객체에 바인딩된 상황)
	- 맨 위 예시처럼 `charles`에 어떤 값을 추가한다면 `lewis`에도 똑같이 추가될 것
	- `id(lewis)` 와 `id(charles)`는 두 변수가 같은 객체를 가리키며 정체성이 동일하다는 것을 알려줌
		- **객체의 정체성**이란, 객체의 메모리 주소처럼 생성된 후에 절대 변경되지 않는 값으로 객체마다 고유한 레이블을 보장
- `alex`는 `charles`와 동일한 값을 가진 객체에 바인딩되었지만 별개의 객체임
	- **동치 연산자 == 는 객체의 값을 비교하고 is 연산자는 정체성을 비교**한다는 것을 알 수 있음	
	- is가 == 보다 빠르지만 대부분 유즈케이스에서 정체성보다 동치성(값)에 관심이 있음


<br>

## 깊은 복사 v.s. 얕은 복사
![[assets/python - object references, mutability, recycling/deep-copy-shallow-copy.png|600]]

- 대부분의 내장 가변 컬렉션은 내장 생성자 또는 `[:]`와 같은 방식으로 복사될 수 있음
	- 하지만 이것은 얕은 복사(shallow copy)임
	- 얕은 복사란? **최상위 컨테이너는 다른 객체로 복사하지만 그 안에 있는 객체들은 기존에 있는 컨테이너 안에 있는 동일 객체에 대한 참조**로 채움
	- 안에 있던 항목들이 불변형이면 문제가 없지만 가변형이면 원하지 않는 효과가 발생할 수 있음
- 중첩된 내부 항목들이 참조를 공유하지 않도록 하고 싶으면 **copy 모듈에서 제공하는 deepcopy 함수를 이용**

```python
l1 = [3,[66,55,44],(7,8,9)]
l2 = list(l1) #또는 l2 = l1[:] =======> Shallow Copy

l1.append(100)
#l1: [3,[66,55,44],(7,8,9),100]
#l2: [3,[66,55,44],(7,8,9)] -> 100이 추가되지 않았음

l1[1].remove(55) 
#l1: [3,[66,44],(7,8,9),100]
#l2: [3,[66,44],(7,8,9)] 

l2[2]+=(10,11)
#l1: [3,[66,44],(7,8,9),100]
#l2: [3,[66,44],(7,8,9,10,11)]

```
- `l1`에 새로운 객체(100)를 append하는 것은 `l2`에는 영향을 주지 않음
- 가변형 리스트인 `l1[1]`에 변화를 가하면, `l2[1]`는 `l1[1]`에 대한 참조이므로 같이 55가 지워져버림
- 튜플은 불변형으로 +=는 새로운 튜플을 만들어 `l2[2]`에 새롭게 바인딩하고 `l1[2]`에는 영향이 없음

```python
class Bus:
	def __init__(self, passengers=None):
		if passengers is None:
			self.passengers = []
		else:
			self.passengers = list(passengers)
	def pick(self,name):
		self.passengers.append(name)
	def drop(self,name)
		self.passengers.remove(name)

import copy

bus1 = Bus(['Alice','Bill','Claire','David'])
bus2 = copy.copy(bus1) #shallow copy
bus3 = copy.deepcopy(bus1) #deep copy

bus1.drop('Bill')
id(bus1.passengers),id(bus2.passengers),id(bus3.passengers)
bus2.passengers
```

- shallow copy 시 `bus1`과 `bus2`의 승객은 같은 리스트를 참조하기 때문에 bus1에서 Bill이 내리면 bus2에서도 내려짐


<br>

## 참조로서의 함수 매개변수

- 파이썬은 Call by sharing 하는 매개변수 전달 방식만 지원
	- call by sharing이란, 함수의 매개변수에 참조의 사본이 저장된다는 의미
		- call by object reference라고도 함
	- 참고로
		- call by value: 인수로 들어가는 입력의 값을 복사해서 넘기고 함수 밖의 객체와는 별개가 됨
		- call by reference: 인수로 들어가는 입력의 참조를 넘김 (같은 메모리 주소)
	- 파이썬은 입력되는 객체가 가변이면 call by reference로 동작하여 그 값을 변경할 수 있고(정체성은 변경할 수 없음) 불변형이면 call by value로 동작하여 새로운 객체가 매개변수로 적용되고 당연히 원래 객체는 변경되지 않음 


### 가변 매개변수 주의사항

- **매개변수의 기본값으로 가변 객체를 사용하는 것은 피하는 게 좋음**

```python
class HauntedBus:
	def __init__(self, passengers=[]):
		self.passengers = passengers
	def pick(self,name):
		self.passengers.append(name)
	def drop(self,name)
		self.passengers.remove(name)

bus1 = HauntedBus(['Alis','Bill'])
bus1.pick('Charlie')
bus1.drop('Alice')
bus1.passengers #Bill, Charlie

bus2 = HauntedBus() #기본값인 빈 리스트로 시작
bus2.pick('Carrie')
bus2.passengers #Carrie

bus3 = HauntedBus() #bus2
bus3.passengers #Carrie

bus2.passengers is bus3.passengers #True
```

- `self.passengers`가 `passengers` 매개변수 기본값의 별칭이 되기 때문에 이 가변 객체(리스트)를 변경하면 변경 내용이 이후에 생성되는 인스턴스에도 계속 반영이 됨
- `bus2`와 `bus3`의 `passengers`는 정체성이 같음



```python
class TwilightBus:
	def __init__(self, passengers=None):
		if passengers is None:
			self.passengers = []
		else:
			self.passengers = passengers 
			#문제 = list(passengers)로 복사하지 않고 그대로 참조하게 함
	def pick(self,name):
		self.passengers.append(name)
	def drop(self,name)
		self.passengers.remove(name)

basketball_team = ['Sue','Tina','Maya','Diana','Pat']
bus = TwilightBus(basketball_team)
bus.drop('Tina')

basketball_team #['Sue','Maya','Diana','Pat']

```

- 생성될 때 입력인 리스트 (`basketball_team`)을 그대로 참조하도록 했기 때문에 버스에서 내릴 때 remove되어 원래 리스트에서도 없어져버림
- 인수로 원래 전달된 객체가 변경되는 것은 일반적으로 사용자가 예상하는 결과는 아닐 것
<br>

## del과 가비지 컬렉션

- del은 참조를 제거할 뿐 객체를 제거하는 것이 아님
	- 제거된 변수가 객체를 참조하는 마지막 변수일 때 (객체에 대한 참조 카운트가 0이 될 때) 파이썬 가비지 컬렉터가 객체를 메모리에서 제거할 수 있게 됨
	- 참조 카운트(reference count) = 이 객체에 바인딩된 변수의 수

### Weak reference

- 사용하는 이유
	- 순환 참조가 있는 경우 참조 카운트가 0이 안 되어서 계속 객체가 메모리에 남아 있는 leakage 발생하는 것을 방지하기 위해
	- 캐시 구현 시 메모리 관리
	- 임시로 잠깐 참조하고 싶을 때 (메모리에 유지되지 않도록)
	- 객체가 메모리에서 해제될 때 특정 작업을 하고 싶을 때(함수로 등록)
- weakref 모듈

```python
import weakref 
class MyClass: 
	def __del__(self): 
	print("MyClass instance is being destroyed") 
	
obj = MyClass()
weak_ref = weakref.ref(obj) 
print(weak_ref()) # 객체에 접근 가능 
del obj #strong reference가 없어지면서 참조 카운트는 0이 됨
print(weak_ref())  # None 반환 (객체는 위에서 없어졌음)
```


```python
import weakref
s1 = {1,2,3}
s2 = s1
def bye():
	print('...like tears in the rain.')
ender = weakref.finalize(s1,bye) # {1,2,3} 객체에 bye() 콜백 등록

ender.alive #True
del s1
s2 = 'spam'
ender.alive #False
```

-  `finalize`는 `{1,2,3}` 객체에 `bye()`라는 콜백을 등록함
	- 이 객체가 메모리에서 해제될 때 `bye()`를 호출하겠다는 것
- `finalize`는 `alive` 라는 속성을 제공
	- `alive`가 True면 아직 살아있다 (콜백 실행 전이다)
	- 첫번째 변수인 s1을 del 하고, 두번째 변수인 s2에 다른 객체를 바인딩하면 `{1,2,3}` 객체는 메모리에서 해제되고 bye() 콜백이 호출되고 alive는 False가 됨