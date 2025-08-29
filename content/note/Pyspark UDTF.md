---
{"publish":true,"title":"Pyspark UDTF","created":"2024-01-24","tags":["spark"],"cssclasses":""}
---


## UDTF (User-Defined Table Function)

- **사용자 정의 테이블 함수**
	- 스파크 3.5.0에서 새로 생긴 피쳐
	- 빌트인 함수로는 뭔가 한계가 있을 때 사용한다는 목적에 있어서는 UDF(User-Defined Function)와 같지만, 스칼라 값을 뱉어주는 UDF와는 달리(row-level transformation), **UDTF는 여러 행 (=즉 테이블)을 뱉어준다**는 것이 핵심

<br>

###  기본적인 사용법

- `eval` 메소드(필수)가 있는 클래스를 정의함 
- `eval` 메소드 안에서는 원하는 작업을 작성하되 마지막에 튜플을 `yield` 
	- yield 이기 때문에 개념적으로는 이터레이션을 통해 여러 행들을 생성하도록 내부 동작할 것으로 이해됨
	- 즉 **UDTF를 통해 생성하고자 하는 테이블의 한 행을 튜플로** yield 해주면 됨
	- 다만 이때 꼭 한 행만 리턴하게 할 필요는 없음 (여러 행을 yield 해도 됨)
- 구현된 UDTF 기능들을 사용할 수 있도록 데코레이터를 붙여줌
	- 이때 `returnType` 파라미터로 스키마를 정의!
	- eval 에서 yield 하는 튜플은 이 스키마에 맞아야 함

공식문서:  [Python User-defined Table Functions (UDTFs)](https://spark.apache.org/docs/latest/api/python/user_guide/sql/python_udtf.html)

```python
from pyspark.sql.functions import lit, udtf

@udtf(returnType="sum: int, diff: int")
class SimpleUDTF:
    def eval(self, x: int, y: int):
        yield x + y, x - y

#데코레이터 없이 정의한 다음 아래처럼 해도 됨
#simple_udtf = udtf(SimpleUDTF, returnType="sum: int, diff: int")

SimpleUDTF(lit(1), lit(2)).show()
# +----+-----+
# | sum| diff|
# +----+-----+
# |   3|   -1|
# +----+-----+

```

- 다음은 꼭 1개의 행만 yield하지 않는 예시
	- 주어진 텍스트를 공백 기준으로 쪼갠 다음, 각 단어를 한 행으로 

```python
@udtf(returnType="word: string")
class WordSplitter:
    def eval(self, text: str):
        for word in text.split(" "):
            yield (word.strip(),)

WordSplitter(lit('Wisconsin Cheese Potato')).show()
# +---------+ 
# |   word  | 
# +---------+ 
# |Wisconsin| 
# |  Cheese |  
# |  Potato | 
# +---------+
```

<br>
### 등록해서 SQL 쿼리에서 사용하기

- UDF와 마찬가지로, UDTF도 register를 사용해서 Spark SQL 쿼리로 작성 가능

```python
#split_words 라는 이름으로 등록!
spark.udtf.register("split_words", WordSplitter)

spark.sql("SELECT * FROM split_words('Irish Potato')").show()

# +------+ 
# | word |  
# +------+ 
# | Irish| 
# |Potato| 
# +------+

```

- `VALUES`와 `LATERAL`을 다음과 같이 사용해서, 여러 값들의 결과를 얻고 원래의 텍스트와 같이 볼 수도 있음

```python
spark.sql( "SELECT * FROM VALUES ('Wisconsin Cheese Potato'), ('Super Papas'), ('Johns Favourite'), ('All Meat') t(text), "
"LATERAL split_words(text)"
).show()

# +--------------------+---------+ 
# |               text |    word | 
# +--------------------+---------+ 
# |Wisconsin Cheese ...|Wisconsin| 
# |Wisconsin Cheese ...|  Cheese | 
# |Wisconsin Cheese ...|  Potato | 
# |        Super Papas |   Super | 
# |        Super Papas |   Papas | 
# |    Johns Favourite |   Johns | 
# |    Johns Favourite |Favourite| 
# |           All Meat |     All | 
# |           All Meat |    Meat | 
# +--------------------+---------+
```

<br>

### 테이블로 테이블 만들기


-  UDTF의 인풋이 테이블인 경우
	- 각 행을 Row type으로 취급한 뒤 각 행의 칼럼명을 사용해서 작성하면 됨
	- 테이블 외에도 다른 인자를 넣어줄 수 있음


```python
from pyspark.sql.types import Row

@udtf(returnType= "pizza: string, price: int")
class HungryButBrokeUDTF:
    def eval(self, row: Row, balance: int):
        if row["price"] < balance:
            yield row["pizza"], row["price"]

spark.udtf.register("hbb_udtf", HungryButBrokeUDTF)


#input인 메뉴판 테이블의 경우 pizza와 price 2개의 칼럼으로 이루어져 있다고 가정
my_balance = 30000
spark.sql(f"SELECT * FROM hbb_udtf(SELECT * FROM menu_table, {my_balance})").show()
```

- 인풋이 원래 테이블이 아니고 spark DataFrame이면, 다음과 같이 `createOrReplaceTempView` 를 사용해서 임시 테이블 뷰를 만들어주면 됨

```python
#DataFrame
menu_df.show()
# +---------------+-----+ 
# |         pizza |price| 
# +---------------+-----+ 
# |      Hawaiian |27500| 
# |   Super Papas |29500| 
# |  Irish Potato |28500| 
# |Johns Favourite|30500| 
# |      All Meat |30500| 
# |     Pepperoni |26500| 
# +---------------+-----+

menu_df.createOrReplaceTempView('menu')
spark.sql(f"SELECT * FROM hbb_udtf(TABLE(menu),{my_balance})").show()

# +---------------+-----+ 
# |         pizza |price| 
# +---------------+-----+ 
# |      Hawaiian |27500| 
# |   Super Papas |29500| 
# |  Irish Potato |28500| 
# |     Pepperoni |26500| 
# +---------------+-----+

```


## 참고한 글들

- [What are Python user-defined table functions?](https://docs.databricks.com/en/udf/python-udtf.html#pass-a-table-argument-to-a-udtf)
- [Python User-defined Table Functions (UDTFs)](https://spark.apache.org/docs/latest/api/python/user_guide/sql/python_udtf.html)