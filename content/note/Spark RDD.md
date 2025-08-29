---
{"publish":true,"title":"Spark RDD","created":"2022-06-08","tags":["spark"],"cssclasses":""}
---

> 스파크의 RDD와 관련된 개념들(Transformation & Action, DAG, Lazy Evaluation)

- 스파크에 대해 접하면 처음 배우는 말
	- 아파치 스파크는 빅데이터를 위한 분산 병렬 처리 프레임워크다. 이전에 비슷한 목적의 하둡 맵리듀스라는 게 있었는데 그거 대비 뭔가 더 좋다더라.
	- 스파크의 주요 데이터 구조 중에는 RDD라는 저수준 API가 있고 DataFrame이라는 고수준 API가 있대.
	    - DataFrame은 뭔지 아는데 RDD는? *탄력적인 분산 데이터셋*이고 변경이 불가능한 *Read-Only* 란다.
	        - (일단 여기서부터.. 🤔? 변경이 불가능한데 탄력적인 게 뭐야 따뜻한 아이스아메리카노?)
- 사실 RDD가 뭔지 몰라도 처음에 스파크 사용에 큰 지장은 없음 (그냥 spark sql 문법만 익혀서 코드 작성하면 나한테 익숙한 형태인 DataFrame을 가지고 내가 원하는 작업들이 그럭저럭 돌아가니깐..)
	- 하지만 RDD는 ‘뭔지 모르겠고 이해할 필요 없는 것 같다’는 첫인상과 달리 스파크의 핵심적인 개념 중 하나


## 하둡 맵리듀스 ➡️ 스파크

- ❓ 분산 병렬 처리 시스템
	- 데이터가 너무 크고 작업이 너무 빡세니 한 컴퓨터로 하지 말고 여러 컴퓨터로 나눠서 동시에 한 다음에 합치면 되지 않겠냐
	- 하둡 맵리듀스는 이 아이디어를 실제로 성공적으로 실행할 수 있게 해준 프로젝트였음
- 그 이후에 등장한 스파크는 In-Memory라는 것, 즉 메모리 위에서 처리를 한다는 것에서 하둡 맵리듀스와 결정적으로 다름
	-  기존 하둡 맵리듀스는 디스크로부터 데이터를 불러오고 처리한 결과를 디스크에서 쓰고, 이걸 반복하는 과정에서 (읽고 쓰기) 속도가 느려질 수밖에 없음
		- 매번 스테이지마다 결과를 디스크에 저장하고 다시 읽어와서 다음 작업을 하기 때문에 실시간 서비스에는 적용이 어려웠고 배치성 작업 위주로 가능하다는 단점
	- 스파크는 메모리에서 처리하고 쓰기 때문에 매번 불필요한 디스크 I/O가 발생하지 않아 훨씬 빠르고, 스트리밍 데이터를 다룰 수 있다는 장점
		- 그런데 만약 메모리 용량은 아무래도 한계가 있을 텐데 큰 데이터를 올렸다가 뭐가 잘못되면? 중간에 디스크에 쓰지도 않는데 날아가면 처음부터 다시 해야 하나? -> 여기서 RDD가 등장


![[assets/spark rdd/spark-rdd-mapreduce.png|475]]
비교 ([출처](https://eduinpro.com/blog/apache-spark-vs-hadoop-mapreduce/))


## RDD

- RDD는 신생아 시절의 스파크의 핵심 API였음
	- 2.x 버전 이상으로 올라오면서부터는 명백한 목적이 있지 않은 이상 잘 사용하지 않게 되었으나, 우리가 잘 아는 DataFrame과 같은 보다 더 고수준의 API 를 다루는 코드도 결국 사실상 RDD로 컴파일됨
- **RDD는 Resilient Distributed Dataset** =  탄력적인 분산 데이터셋
- ‘분산’은 뭐 우리가 분산 컴퓨팅을 하려고 하는 것이니 별로 어려울 것 없이 여러 곳에 분산되어 저장된 데이터셋이라고 보면 됨

![[assets/spark rdd/rdd.png|375]]
RDD는 여러 개의 파티션에 나누어서 위치함 - 클러스터의 여러 워커 노드에 의해 연산이 수행되도록 ([출처](https://k21academy.com/datascience/python/day8-faqs/))

- 탄력적이라는 말은
	- 메모리 위에서 모든 작업을 할 건데 하다가 잘못된 상황에서 탄력적으로 잘 대처할 수 있다는 말인데 뭔가 모순적이지만 불변이라 탄력적인 것임
	- RDD의 가장 중요한 특성: **불변(immutable)하며 Read-only**, 즉 저장 시스템에서 읽어오는 것만 가능하다!
	- 불변이기 때문에 처음 만들어진 이후에 어떤 변경도 가해지지 않았다는 게 보장됨
	- 그러면 데이터가 먼지처럼 날라갈지언정 처음 그것이 어떻게 만들어졌었는지만 우리가 잘 기록하고 있다면 똑같이 다시 만들 수 있음

그 기록은 어떻게 되어 있냐면
1. 파티션: 데이터가 어떻게 나뉘어져 있는지
2. 연산 함수: 각 조각이 어떤 연산을 통해 만들어졌는지 
3. 의 존성: 위 연산을 하려면 다른 부모 RDD가 필요할 경우 그 정보
4. 위치 목록: 각 파티션을 연산하기 위한 위치는 어디인지 (ex. HDFS의 어딘가)
5. 파티셔너: 데이터를 어떻게 파티션으로 나눌 것인지 (ex. 해시 파티셔너)
- 즉 이런 정보(일종의 lineage)만 있으면 우리는 언제든 RDD를 다시 만들어낼 수 있음


## Transformation

- 변경은 그럼 못하나? 할 수 있음
	- 단, 우리가 RDD에 가하는 모든 변경(연산) 작업은 그 RDD를 바꾸는 것이 아님
	- 스파크는 매번 이전 RDD를 기반으로 새로운 RDD를 만들고, 그 이전 RDD에 대한 정보와 어떤 연산을 했는지를 기록해 두게 됨 (리니지)
	-  이때 **RDD에 가해지는 연산을 다른 이름으로 Transformation** 이라고 부름

![[assets/spark rdd/rdd-transformation.png|425]]
- 모든 Transformation은 위와 같은 **DAG** 로 기록됨.
	- 이 그래프에서 **각 노드는 RDD 파티션이고, 엣지는 Transformation**
- groupBy, map, union, join 등등
	- 좁은 트랜스포메이션: 각 입력 파티션이 하나의 출력 파티션에만 영향을 미칠 때. 즉 파티션 간 교환이 일어날 필요가 없을 때 ex. filter
	- 넓은 트랜스포메이션: 하나의 입력 파티션이 여러 출력 파티션에 영향을 미칠 때. 즉 파티션 간 교환(shuffle)이 발생할 때 ex. join


## Lazy Evaluation, Action

- DAG이 만들어졌지만 이때까지는 아무 일도 일어나지 않음
- 스파크는 일단 기록만 해두고 가만히 기다림 -  우리가 실제로 **그 결과를 요구할 때**까지 (=Action이 있을 때까지)
	- 결과를 요구하는 것의 예시 :
		- 가장 첫번째 데이터를 보여줘
		- 전체가 몇 개인지 세줘
		- 나 파이썬 쓰는데 파이썬 객체에 데이터를 모아줘
		- 여기다가 저장해줘
		- …
-  Action의 단계가 오면 스파크는 그제서야 필요한 연산들을 실제로 수행하기 시작함
- **전체 그림을 다 그려놓고 마지막의 마지막까지 기다렸다가 한꺼번에 실행을 함으로써 스파크는 우리가 원하는 결과물을 최적화된 방법으로 처리할 수 있게** 됨
	- 이걸 바로  **Lazy evaluation (지연 연산)** 이라고 함!

<br>

## References

- [스파크 완벽 가이드](https://www.kyobobook.co.kr/product/detailViewKor.laf?mallGb=KOR&ejkGb=KOR&barcode=9791162241288)
- [Spark core concepts explained](https://luminousmen.com/post/spark-core-concepts-explained)
- 원 논문(안읽어봄)
    - [Spark: Cluster Computing with Working Sets](https://www.usenix.org/legacy/event/hotcloud10/tech/full_papers/Zaharia.pdf)
    - [Resilient Distributed Datasets: A Falut-Tolerant Abstraction for In-Memory Cluster Computing](https://www.usenix.org/system/files/conference/nsdi12/nsdi12-final138.pdf)

