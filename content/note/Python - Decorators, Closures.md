---
{"publish":true,"created":"2025-03-11","tags":["python"],"cssclasses":""}
---

> [!TIP] Source
> [전문가를 위한 파이썬](https://www.hanbit.co.kr/store/books/look.php?p_code=B9617416545)(Fluent Python) 15장


## 데커레이터

- 함수의 동작을 변경/확장하는 기능을 제공하는 문법
	- 함수의 핵심 로직을 건드리지 않고 부가적인 기능을 추가할 수 있음
	- 여러 함수에 같은 기능을 제공할 때 재사용 장점
- 데커레이트된 함수에 어떤 처리를 수행하고, 함수를 반환하거나 함수를 다른 함수나 콜러블 객체로 대체함

```python
@decorate
def target():
	print('running target()')

#위 코드는 다음 코드와 똑같다
def target():
	print('running target()')
target = decorate(target)
```
- 즉 target이라는 이름을 decorate(target)이 반환한 함수에 바인딩
	- 다른 함수로 바꿀 수도 있고 원래 target을 반환할 수도 있음

- 데커레이터는 파이썬이 모듈을 로딩하는 시점(임포트 시)에 실행되며 데커레이트된 함수는 명시적으로 호출될 때만 실행됨
	- 즉 처음에 데커레이터가 함수를 감싸면서 decorate(target)이 한번 실행됨. target을 실행해야 실제로 데코레이트된 함수가 실행됨


- 복수의 데커레이터를 붙일 수도 있음 
```python
@alpha
@beta
def f():
	#..

#이경우 다음과 같다
f = alpha(beta(f)) 
```
<br>

## 클로저

- **내부 함수가 외부 함수의 변수를 기억하고, 함수 실행이 끝난 후에도 그 변수를 계속 사용할 수 있는 함수**
- 변수 범위
	- global: 모듈 최상위에 선언되어, 모듈 내 모든 함수에서 접근할 수 있는 변수
		- 함수 내에서 동일한 이름을 선언해도 함수 내에서는 지역변수로 인지하므로 함수 내에서 접근하려면 global 키워드를 써야 함
	- local: 함수 내에서 접근할 수 있는 변수로 함수가 실행될 때 생성되고 함수가 종료되면 소멸됨
	- **nonlocal**: 중첩 함수(내부 함수)에서, 바로 바깥에 있는 함수의 로컬 변수를 참조할 때 사용하는 변수
		- 내부 함수에서 값 할당이 이루어질 경우 nonlocal 키워드를 써야함

예를 들어

```python
def make_averager():
	series =[]

	def averager(new_value):
		series.append(new_value)
		total = sum(series)
		return total/len(series)

	return averager


avg = make_averager()
avg(10) #10
avg(20) #15
avg(30) #20
```

- 내부 함수: averager, 외부 함수: make_averager
- series는 외부 함수의 지역 변수인데 내부 함수가 이를 사용하고 있음
- make_averager가 실행되는 순간 `series =[]` 가 생성되고, 반환된 averager 함수가 호출될때마다 이 series를 계속 참조하기 때문에 series에 계속 누적해서 값이 업데이트됨
- 이런 series같은 변수라를 자유변수 라고 함

```python
def make_averager():
	count = 0
	total = 0

	def averager(new_value):
		nonlocal count, total
		count += 1
		total += new_value
		return total / count
	return averager
```

- 첫번째 예시의 경우 series가 가변객체이고 내부함수 코드는 series에 append만 할 뿐 series를 새로 선언하지 않았음
- 그러나 위 예시의 경우 count +=1 처럼  (count = count+1) count라는 변수에 값을 새로 할당하게 되는데 이경우 내부 함수의 지역변수로 인식이 되어서 클로저의 자유변수로 인식되지 않음
- 이를 명시적으로 자유변수라고 지정해주는 키워드가 바로 nonlocal


- **클로저 사용의 장점?**
	- 전역 변수 없이 상태를 저장할 수 있음 (전역 변수를 사용하면 코드가 복잡해지고, 여러 함수가 같은 변수를 수정할 수 있어 버그가 생길 위험이 큼)
	- 데이터 캡슐화 (외부에서 직접 접근하지 못함. 정의된 내부 함수를 통해서만 조작 가능)
	- 독립적인 환경(스코프) 유지 가능 – 같은 함수라도 각각 다른 상태 유지
	- 클래스로 구현하는 것보다 코드가 짧다 (클래스는 클래스 정의와 self.count 이런 식으로 변수를 저장해야 해서 코드가 길어진다)
<br>

## 데커레이터 구현 예시


```python
import time

def clock(func):
	def clocked(*args):
		t0 = time.perf_counter()
		result = func(*args)
		elapsed = time.perf_counter() - t0
		name = func.__name__
		arg_str = ', '.join(repr(arg) for arg in args)
		print('[%0.8fs] %s(%s) -> %r' % (elapsed, name, arg_str, result))
		return result
	return clocked

@clock
def factorial(n):
	return 1 if n < 2 else n*factorial(n-1)
```

- 함수 실행 시간을 측정 -> 실행에 걸린 시간, 전달된 인자, 반환값을 출력 / 내부 함수를 반환해 데커레이트된 함수를 대체
- 데커레이터를 통해서 factorial(n)을 호출하면 사실상 clocked(n) 이 실행됨

<br>

## functools 헬퍼들


- **functools.wraps**
	- 데코레이터를 만들 때 원래 함수 정보(`__name__`, `__doc__`) 유지
		- 사용하지 않으면 위 예시에서 factorial의 name조회시 clocked가 나오고, factorial에 doctstring을 작성했더라도 그게 조회되지 않음
```python
def clock(func):
	@functools.wraps(func)
	def clocked(*args):
		#...
```

- **functools.cache()**
	- 메모이제이션 - 값비싼 연산의 결과를 저장해두고 재사용해 동일 연산을 반복 실행할 필요가 없게 함
	- 재귀 함수 또는 반복되는 연산이 많은 경우 성능을 크게 향상시킴
	- 파이썬 3.9 이상만 가능
```python
import functools
import time

@functools.cache
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)
```
- 이 데코레이터가 없으면 fibonacci(6)을 실행 시 0,1,2,1,0,1,2,3,4,1,0,1,2,3,.. 이렇게 매단계 쌩으로 다 호출해야 함. cache를 통해서 동일한 n에 대해서는 함수를 반복 호출하지 않도록 할 수 있음

- **functools.lru_cache()**
	- cache와 비슷하지만 3.8 이전 버전과도 호환이 되면서 캐시 크기(최대 저장 가능 개수)를 조절할 수 있음 - 메모리 너무 많이 사용하지 않게
```python
@functools.lru_cache(maxsize=5)  # 최근 5개 결과만 캐싱
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)
```


- **functools.singledispatch()**
	- 파이썬은 함수 오버로딩을 기본적으로 지원하지 않지만, singledispatch()를 사용해서 입력 타입에 따라 다른 함수가 실행되도록 구현할 수 있음
```python
@functools.singledispatch
def process(value):
    raise NotImplementedError("지원되지 않는 타입!")

@process.register
def _(value: int):
    return f"정수 처리: {value * 2}"

@process.register
def _(value: str):
    return f"문자열 처리: {value.upper()}"

@process.register
def _(value: list):
    return f"리스트 처리: 길이 {len(value)}"

print(process(10))     # 정수 처리: 20
print(process("hello")) # 문자열 처리: HELLO
print(process([1, 2, 3])) # 리스트 처리: 길이 3
```

<br>

## 매개변수화된 데커레이터

- 데코레이터를 만들 때, 추가적인 설정 값을 전달할 수 있도록 하는 데코레이터

```python
def repeat(n):  # 데코레이터의 매개변수
    def decorator(func):  # 실제 데코레이터
        def wrapper(*args, **kwargs):
            for _ in range(n):
                func(*args, **kwargs)
        return wrapper
    return decorator  # 데코레이터를 반환

@repeat(3)  # repeat(3)이 실행된 후, 그 결과가 @데코레이터 역할을 함
def hello():
    print("Hello, world!")

hello()
```

 - 데코레이터를 반환하는 바깥 함수를 하나 더 둘러싸고 그 함수에 설정값을 인수로 전달