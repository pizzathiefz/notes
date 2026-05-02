---
publish: true
title: Foundation Model for Personalized Recommendation @Netflix
created: 2025-10-11
modified: 2025-10-15T22:42:53.000+09:00
published: 2025-10-15T22:42:53.000+09:00
tags:
  - recsys
cssclasses: ""
---


> https://netflixtechblog.com/foundation-model-for-personalized-recommendation-1a0bd8e02d39

![[assets/foundation model for personalized recommendation @netflix/distinct-needs.png]]
- 여러 가지 추천 기능들에 맞는 각각의 전문화된 모델을 운영 = 복잡도, 유지비용
- 특히 대부분 공통된 데이터 소스(복잡한 대규모 유저 상호작용)로 학습됨에도 불구하고 여러 모델이 별도로 학습되고 관리되므로 한 모델에서 유의미한 innovation이 있어도 이를 전파하기 어려움

![[assets/foundation model for personalized recommendation @netflix/as-is.png|450]]
![[assets/foundation model for personalized recommendation @netflix/to-be.png|450]]


- LMM으로의 패러다임 변화에 영감을 받아 추천 시스템에서도 하나의 Foundation model로 여러 다운스트림 피쳐에 사용할 수 있는 접근법을 마련
	- small, specialized models ➡️ single, large model
	- model-centric ➡️ data-centric

<br>

### Tokenizing User Interactions

- 2024년 말 기준 3억 명 이상의 사용자로부터 수천억 건의 상호 작용 데이터가 존재 = LLM 토큰 볼륨과 유사한 규모
- 모든 사용자 행동이 다 중요한 것은 아니므로 이 중에서 의미 있는 이벤트를 식별하고 중복을 최소화하기 위해 상호 작용 토큰화를 사용

![[assets/foundation model for personalized recommendation @netflix/tokenization.png]]

- NLP의 BPE(Byte Pair Encoding)와 유사하게 인접한 행동들을 병합하는 방식으로 토큰 생성
- 중요한 정보(총 시청 지속 시간, 참여 유형 등)를 보존하기 위해 세부 데이터와 시퀀스 압축 간의 균형을 맞춤
- 제약: 유저별 상호 작용 기록은 수천 개의 이벤트에 달할 수 있지만, 밀리초 단위의 latency가 요구되므로 추론 시 컨텍스트 윈도우가 수백 개의 이벤트로 제한됨
	- 해결책
		- **Sparse Attention Mechanisms**: low-rank compression과 같은 기술을 활용하여 계산 효율성을 유지하면서 컨텍스트 윈도우를 수백 개의 이벤트로 확장
		- **Sliding Window Sampling** : 전체 시퀀스에서 중첩되는 상호 작용 윈도우를 샘플링하여 모델이 비현실적으로 큰 컨텍스트 윈도우 없이도 전체 기록으로부터 학습하도록 함
		- (추론시) **KV 캐싱**을 통해 과거 계산을 효율적으로 재사용하고 낮은 latency 유지
- 상호작용 데이터는 언어토큰과 다르게 heterogeneous한 데이터로 이루어져있음
	- 행동 자체의 속성 e.g. 지역, 시간, 지속시간, 디바이스
	- 콘텐츠 정보 e.g. item id, 출시국가
- 이런 피쳐들은 end-to-end learning으로 모델 내에 직접 임베딩이 되고 timestamp같은 피쳐들은 특별히 처리함
- 추가로 2가지 분류가 가능한데 모델은 이전 단계의 post-action 피쳐와 현재 단계의 request-time 피쳐를 결합하여 사용함 -> 각 토큰이 문맥적 정보와 과거 이력 정보가 혼합된 **포괄적인 표현**을 갖게 되도록
	- request-time features : 예측이이루어질 때(요청받는 시점에) 즉시 접근 가능한 로그인 시간, 디바이스, 위치 등
	- post-action features: 상호작용이 끝나고 나서야 알 수 있는 ID, duration 등

<br>

### Next Token Prediction

- GPT와 유사한 auto-regeressive **다음 토큰 예측 목표**를 기본 접근 방식으로 채택하여 레이블이 없는 대규모 사용자 상호 작용 데이터를 효과적으로 활용함
- objectives
	- 다중 토큰 예측: 모든 사용자 상호 작용이 동일한 가중치를 갖지 않기 때문에 (e.g. 5분짜리 예고편 재생과 2시간짜리 전체 영화 시청) 단일 토큰 대신 다음 N개의 토큰을 예측하게 하여 근시안적 예측을 방지함
	- 보조 예측 목표: 입력 데이터의 여러 필드를 보조 예측 목표로 사용(e.g. 장르 예측) 하여 잡음이 많은 아이템 ID 예측에 대한 과적합을 줄이는 정규화 역할

<br>

### Cold Start

- **Incremental training**
	- 잦은 재학습은 비실용적이므로, 이전 모델의 파라미터를 재사용하여 새 모델을 warm-start하고, 새 타이틀에 대해서는 새로운 임베딩을 초기화함 
	- 새 타이틀 임베딩은 기존 평균 임베딩에 약간의 무작위 노이즈를 추가하거나 메타데이터 기반으로 유사한 타이틀의 임베딩을 가중 조합하여 초기화할 수 있음
-  **Dealing with unseen entities** 
	- Foundation model은 단순 상호작용 데이터뿐 아니라 엔티티 및 입력의 메타데이터 정보(장르, 스토리라인, 분위기 등)를 사용함

![[assets/foundation model for personalized recommendation @netflix/embedding.png]]
- 최종 타이틀 임베딩은 **학습 가능한 ID 기반 임베딩**과 **메타데이터 기반 임베딩**을 결합하여 생성
	- 결합할 때 엔티티의 age를 기반으로 하는 attention mechanism을 Mixing layer에 사용 = 새로운 아이템일수록 메타데이터에 더 의존하고, 오래된 아이템은 ID기반 임베딩(상호작용 데이터 기반)에 의존하도록 함!

<br>

### Downstream Applications and Scaling

- Foundation model의 활용
	- **예측 모델로 직접 사용:** 다음 엔티티를 예측하도록 훈련되었으며, 다양한 비즈니스 요구를 충족하기 위해 다양한 예측 헤드를 포함
	- **임베딩 활용:** 배치 작업을 통해 회원, 비디오, 게임, 장르와 같은 엔티티에 대한 임베딩을 생성하여 다른 모델의 특징으로 사용하거나 candidate generation에 사용
		- 단 임베딩 공간이 임의적이며 모델 재학습시마다 호환이 안 되는 이슈 ->  orthogonal low-rank transformation을 적용하여 유저/아이템 임베딩 공간을 안정화하고 foundation model이 재학습될 때에도 임베딩 차원의 일관된 의미를 보장
		- 자세한 내용은 아마 [Orthogonal Low Rank Embedding Stabilization](https://arxiv.org/abs/2508.07574) 이거인듯
	- **특정 데이터로 Fine-Tuning** : 모델의 전체 또는 서브그래프를 application별 데이터로 미세 조정하여 적은 데이터와 계산 능력으로도 이전 모델과 비슷한 성능을 달성할 수 있음


![[assets/foundation model for personalized recommendation @netflix/parameter-size.png|550]]
- 데이터와 모델 크기를 증가시킬수록 성능이 일관되게 향상되는 law of scaling이 recsys foundation model에도 적용되고 있음