---
publish: true
created: 2024-09-28
modified: 2025-07-12T15:23:01.000+09:00
published: 2025-07-12T15:23:01.000+09:00
tags:
  - python
cssclasses: ""
---

> [!TIP] Source
> [전문가를 위한 파이썬](https://www.hanbit.co.kr/store/books/look.php?p_code=B9617416545)(Fluent Python) 17장


## Iterable, Iterator

### 반복형(Iterable)과 반복자(Iterator) 

- 정의
	- **반복형(Iterable)**: for 루프에서 쓸 수 있는 객체. iter() 함수를 적용할 수 있는 객체.
	- **반복자(Iterator)**: __next__() 메서드로 다음 값을 계속 꺼낼 수 있는 객체. 끝에 도달하면 StopIteration 예외를 발생시킴.
- 둘의 관계: 반복형은 반복자를 생성하는 객체임. 즉 반복형은  `__iter__()` 메서드를 구현하고, 이 메서드는 **반복자(iterator)를 리턴** 해야 함.

- iter() 내장함수란?
	- 파이썬이 반복을 시작할 때 호출하는 함수로 다음 2가지 동작을 함
		- 객체에 `__iter__()`가  있으면 그걸 호출해서 반복자를 리턴.
		- 없으면, `__getitem__()` 이 구현되어 있는 경우, 인덱스 0부터 순차적으로 값을 꺼내 반복자를 흉내냄. 인덱스 오류가 나면 멈춤
			- 이게 바로 모든 시퀀스가 반복형인 이유 -> str, list, tuple 같은 **시퀀스 객체**는 `__getitem__()`을 통해 인덱스로 접근할 수 있어서 반복이 지원되기 때문


```python
import re
import reprlib

RE_WORD = re.compile(r'\w+')


class Sentence:
    def __init__(self, text):
        self.text = text
        self.words = RE_WORD.findall(text)

    def __repr__(self):
        return f'Sentence({reprlib.repr(self.text)})'

    def __iter__(self):
        return SentenceIterator(self.words)  


class SentenceIterator:
    def __init__(self, words):
        self.words = words  
        self.index = 0  
    def __next__(self):
        try:
            word = self.words[self.index]  
        except IndexError:
            raise StopIteration() 
        self.index += 1  
        return word  
    def __iter__(self): 
        return self
```

- Iterator는 기본적으로 위 예시와 같이 index의 상태를 카운트함. 
	-  `__next__`를 구현해야 함 = 다음 값을 꺼내는 함수. 다음 값을 꺼내고, index를 하나 올리고, index가 끝까지 가면 StopIteration 예외를 발생시킴.
	- Iterator에서도 `__iter__`를 구현해야 함 = for 루프 등 반복형이 필요한 곳에 사용되려면  Iterator 자신도 iterable이어야 하기 때문에. 자기 자신을 돌려주도록 구현.

- `__getitem__`을 써도 반복형으로 잘 동작하는데 왜 Iterator를 제대로 구현해야 하나?
	- `__getitem__`의 단점은 한번에 메모리에 모든 데이터를 올려야 하고, 내부 상태가 없는 반복 → **매 반복마다 처음부터 시작**
	- 위와 같은 구현의 장점
		- **지연 평가(lazy evaluation)** 가능 → 즉 필요한 만큼만 가져와서 필요한 만큼만 계산한다 (메모리 절약)
			- lazy의 반대말은 eager다..
		- 내부 상태(index 등)를 갖고 있어서 **복잡한 로직 구현 가능**
		- 무한 반복자, 파일 스트리밍 등 **동적이고 유연한 반복 처리** 가능
		- 여러 개의 반복자를 병렬로 써도 각각 독립적으로 동작
	- 예를 들면
		- 대용량 텍스트 파일에서 줄 단위로 처리하고 싶을 때
		- 네트워크에서 스트리밍으로 데이터를 읽을 때
		- 한 번만 순회 가능한 객체 (예: 제너레이터) 등을 쓸 때


- 한번에 `__iter__()`과  `__next__()`를 구현하는 것은 (즉 위 예시에서 SentenceIterator를 안만들고 Sentence에 때려넣기) **안티패턴**임 
- 이유: 반복을 한번만 하면 끝나버림. 재사용 불가. 병렬 반복이 안됨
```python
s = Sentence("this is not good")
for w in s:
    print(w)  # OK
for w in s:
    print(w)  # 아무 것도 안 나옴 (index가 이미 끝에 있음)

it1 = iter(s)
it2 = iter(s)  # 같은 객체 리턴됨 → 상태 공유됨
next(it1)  # it2도 영향을 받음

```



## Generator

Sentence에서 Iterator를 별도로 만들지 않고 `__iter__`를 다음과 같이 쓴다면?

```python
def __iter__(self):
    for word in self.words:
        yield word
```
-  = 제너레이터
	- yield 구문을 사용해서 값을 하나씩 생성하는 특별한 함수나 표현식을 의미함
	- return 대신 yield를 사용해서 값을 **하나씩 반환**하고, 호출자가 next()로 요구할 때마다 **중단했던 지점에서 이어서 실행**
	- 반복자를 자동으로 만들어주는 문법적 편의 기능으로 이해..
		- 제너레이터 객체는 `__next__`를 제공하므로 반복자임


- 사실 이터레이터의 장점이 lazy할 수 있다는 거라고 했지만, 위의 예시들은 lazy하지 않았음. findall에서 이미 다 메모리에 올려놓고 순회를 시작하기 때문.
- lazy하게 만든다면?

```python
def __iter__(self):
    for match in RE_WORD.finditer(self.text):
        yield match.group()
```
- finditer로 매칭되는 단어를 하나씩 돌려줌
- 텍스트가 커도 CPU, 메모리 자원을 효율적으로 사용


```python
def __iter__(self):
    return (match.group() for match in RE_WORD.finditer(self.text))
```

- 동일한 내용을 제너레이터 표현식으로 작성했음
	- 로직이 간단하고 짧다면 가독성이 높음
	- 여러 줄로 걸칠 거면 그냥 제너레이터 함수 쓰자


### 표준 라이브러리 제너레이터


####  Filtering 

| 함수 | 설명 | 예시 |
|------|------|------|
| `itertools.compress(data, selectors)` | `selectors`가 True인 곳의 `data`만 반환 | `compress('ABCDE', [1,0,1,0,1]) → A C E` |
| `itertools.dropwhile(pred, iterable)` | 조건이 **False가 되는 시점부터** 모든 값 반환 | `dropwhile(lambda x: x<3, [1,2,3,4]) → 3 4` |
| `itertools.filterfalse(pred, iterable)` | 조건이 **False인 값만** 반환 | `filterfalse(lambda x: x%2, range(5)) → 0 2 4` |
| `filter(pred, iterable)` | 조건이 **True인 값만** 반환 | `filter(lambda x: x>3, [1,4,5]) → 4 5` |
| `itertools.takewhile(pred, iterable)` | 조건이 **False가 되기 전까지** 값 반환 | `takewhile(lambda x: x<3, [1,2,3,4]) → 1 2` |


#### Mapping

| 함수 | 설명 | 예시 |
|------|------|------|
| `itertools.accumulate(iterable, func=operator.add)` | 누적 계산 (합/곱/최대 등) | `accumulate([1,2,3]) → 1 3 6` |
| `enumerate(iterable, start=0)` | (인덱스, 값) 튜플 반환 | `enumerate('abc') → (0, 'a'), (1, 'b')` |
| `map(func, iterable)` | 각 요소에 함수 적용 | `map(str.upper, ['a', 'b']) → 'A' 'B'` |
| `itertools.starmap(func, iterable_of_tuples)` | 튜플을 **언팩해서** 함수에 적용 | `starmap(pow, [(2,3),(3,2)]) → 8 9` |


####  Merging

| 함수 | 설명 | 예시 |
|------|------|------|
| `itertools.chain(*iterables)` | 여러 iterable을 **하나처럼** 이어 붙임 | `chain('AB', 'CD') → A B C D` |
| `itertools.product(*iterables, repeat=1)` | 데카르트 곱 | `product('AB', repeat=2) → AA AB BA BB` |
| `zip(a, b)` | 같은 인덱스끼리 튜플 묶음 (짧은 쪽 기준) | `zip('AB', '12') → ('A','1'), ('B','2')` |
| `itertools.zip_longest(a, b, fillvalue=None)` | zip과 같지만 **긴 쪽 기준**, 없는 곳은 fill | `zip_longest('AB', '123', fillvalue='X') → ('A','1'), ('B','2'), (None,'3')` |


#### Expanding

| 함수 | 설명 | 예시 |
|------|------|------|
| `itertools.combinations(iterable, r)` | r개 조합 (순서 무관) | `combinations('ABC', 2) → AB AC BC` |
| `itertools.count(start=0, step=1)` | 무한 증가 수열 | `count(10, 2) → 10 12 14 ...` |
| `itertools.cycle(iterable)` | 반복적으로 순환 | `cycle('AB') → A B A B A ...` |
| `itertools.pairwise(iterable)` | (현재, 다음) 쌍 튜플 생성 | `pairwise('ABCD') → (A,B), (B,C), (C,D)` |
| `itertools.permutations(iterable, r=None)` | r개 순열 (순서 중요) | `permutations('ABC', 2) → AB AC BA BC CA CB` |
| `itertools.repeat(elem, times=None)` | 같은 값을 계속 반복 | `repeat(10, 3) → 10 10 10` |


#### Rearranging

| 함수 | 설명 | 예시 |
|------|------|------|
| `itertools.groupby(iterable, key=...)` | 인접한 값 기준 그룹핑 | `groupby('AAABBB') → ('A', ['A','A','A']), ('B', ['B','B','B'])` |
| `reversed(seq)` | 역순 반복자 (list, str 등 시퀀스만) | `reversed([1,2,3]) → 3 2 1` |
| `itertools.tee(iterable, n=2)` | 반복 가능한 객체를 n개 복제 | `a, b = tee(range(3)) → a, b 독립 사용 가능` |

#### Reduce 

| 함수 | 설명 | 예시 |
|------|------|------|
| `all(iterable)` | 모두 True여야 True | `all([1, 2, 3]) → True` |
| `any(iterable)` | 하나라도 True면 True | `any([0, 0, 3]) → True` |
| `max(iterable)` / `min(...)` | 최댓값 / 최솟값 | `max([1, 5, 2]) → 5` |
| `functools.reduce(func, iterable[, initializer])` | 누적 계산 후 **최종값 하나 반환** | `reduce(lambda x,y: x+y, [1,2,3]) → 6` |
| `sum(iterable)` | 합계 | `sum([1, 2, 3]) → 6` |





## Classic Coroutines

- **코루틴은 “함수 ↔ 호출자” 간에 양방향으로 값을 주고받을 수 있는 실행 단위**
	- 일반 함수: 호출자 → 함수 → return
	- 제너레이터: 호출자 → 함수 → yield
	- **코루틴**: 호출자 ↔ 함수 ←→ send/yield


- 고전적 코루틴이란
	- async/await 문법이 없었을 때 **제너레이터에 yield + .send()를 조합** 해서 비슷하게 동작하게 했던 것 (파이썬 3.5 이전)
```python
def package_receiver():
    while True:
        package = yield 
        print(f"택배를 받았다: {package}")

receiver = package_receiver()
next(receiver) # 코루틴 가동 (yield까지 실행)
receiver.send("의류")  
receiver.send("전자기기")  
```

- yield에서 멈추고, 이후에 send를 통해 외부에서 값을 받아서 하나씩 반복해서 동작하는 방식