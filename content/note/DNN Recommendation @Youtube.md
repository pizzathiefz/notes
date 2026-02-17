---
publish: true
title: DNN Recommendation @Youtube
created: 2024-10-30
tags:
  - recsys
  - two-stage
cssclasses: ""
---


> **[Deep Neural Networks for YouTube Recommendations](https://dl.acm.org/doi/10.1145/2959100.2959190)** (2016)

- Challenges
	- Scale
	- Freshness
	- Noise

![[assets/dnn recommendation @youtube/youtube-dnn-overview.png|500]]

- Two Stage
	- Candidate generation
		- 수백만 개의 전체 영상에서 유저가 관심 있을 만한 후보군을 선택 (high precision)
	- Ranking
		- 수백 개 내의 후보 영상에서 유저가 볼 것 같은 순으로 랭킹하여 추천 (high recall)


## Candidate Generation
![[assets/dnn recommendation @youtube/youtube-dnn-candidate-generation.png|525]]

### Recommendation as Classification
- 극단적으로 클래스가 많은 (즉 영상 1개 = 1개의 클래스)인 classification으로 생각해보면
	- 유저와 컨텍스트가 주어졌을 때 시간 $t$에 영상 $i$가 시청될 확률
$$P(w_{t}= i | U,C) = \frac{e^{v_iu}}{\sum_{j \in V} e^{v_ju}}$$
- 영상 임베딩 $v$와 유저 임베딩 $u$가 얼마나 유사한가?를 계산 후(dot product) 이를 softmax한 것 -> 주어진 유저/컨텍스트에 대해 이 확률을 최대화하는 영상 $i$를 찾는 문제
	- cross entropy loss를 최소화
- positive label: 유저가 영상을 끝까지 시청
	- 단순 클릭, 재생보다 명확한 implicit feedback
	- 좋아요, 구독 같은 explicit feedback은 너무 sparse하므로 long-tail item에 대한 추천까지 할 수 있도록
- 엄청나게 극단적인 멀티 클래스 문제이므로 학습 속도를 보장하기 위해 negative sampling 사용하여 학습
	- 즉 저 softmax식에서 진짜로 모든 다른(positive이 아닌) 영상들을 가지고 다 계산하는 것이 아닌 일부 샘플링해서 사용
- 서빙 시에는 **Dot Product를 활용한 ANN을 통해 확률이 가장 높은 N개의 영상을 조회**하는 구조 
	- 실험 결과 ANN 알고리즘을 뭘 쓰느냐는 크게 중요하지 않았다고 함


### Heterogeneous Signal
- 딥러닝을 사용함으로써 여러 continuous/categorical feature를 쉽게 합쳐서 사용할 수 있게 됨
- 유저 벡터 = 유저의 시청 기록 + 검색 기록(unigram/bigram으로 토큰화 후 임베딩) + 기본적인 인구통계학적 정보, 지역 정보, 기기 정보 등
	- 각 영상과 검색 토큰은 average로 합쳐서 고정된 벡터가 됨
- example age의 경우 **영상의 나이(새로움 정도)**를 의미함
	- 유튜브는 새로운 영상들이 매우 빠른 속도로 업데이트되며 유저들도 새로운 영상에 대한 선호도가 높음
	- 과거 데이터를 학습하여 미래를 예측하는 ML 모델 특성 상 과거 데이터에 대한 편향이 생길 수 있는데 영상의 나이를 피쳐로 사용하여 그림과 같이 최신 영상을 선호하는 (하단 그림) 유저의 패턴을 반영

![[assets/dnn recommendation @youtube/youtube-dnn-example-age.png|450]]

### Label/Context Selection
- 추천시스템은 대개 surrogate problem (실제 환경에 근사하는 문제로 정의하여 평가한다는 뜻)
	- 영화를 추천하기 <-> 영화의 별점 예측하기
	- 오프라인 metric이 좋아도 실제 서비스 성능과는 괴리가 있을 수 있음
- 추천 시스템 외의 요인으로 유저가 시청한 데이터도 학습에 포함할 필요가 있음
- 헤비 유저가 너무 영향을 주지 않도록 사용자 별 학습 데이터 양에 제한을 걸 필요가 있음
- 오프라인 평가 방식 비교
![[assets/dnn recommendation @youtube/youtube-dnn-input-label.png|575]]
- (a) held-out 시청을 예측 : 과거 기록 중 일부를 골라서 예측하도록 함. 같은 시점에 학습/평가 데이터가 나오므로 데이터 준비가 쉽고 빠른 장점
- (b) 미래의 시청을 예측 : 과거 기록으로 이후 시청을 예측하도록 함. 실제 서비스 효과를 예측하는 데 더 효과적 (모델이 서비스에서 해야 하는 일과 동일한 조건, 실제로 유저들의 영상 소비 패턴도 에피소드 순서대로 보는 등)


## Ranking
![[assets/dnn recommendation @youtube/youtube-dnn-ranking.png|500]]

- candiate generation단계보다 더 적은 데이터, 더 많은 feature를 사용
- 로지스틱 회귀를 사용해 영상별 예측된 스코어가 높은 순으로 노출
- 예측 목표는 **노출(impression) 당 예상 시청 시간** 
	- 단순 클릭과 같은 반응으로 하지 않음 (클릭 베이트 류의 영상이 좋은 스코어를 받는 것을 방지)

### Feature Engineering
- 유저의 **상호작용 히스토리 피쳐**는 매우 중요한 역할을 함 (서로 다른 아이템에 대해 일반화가 잘 됨)
	- e.g. 해당 채널에서 본 영상 개수, 이 주제의 영상을 마지막으로 본 일자
- candidate generation 단계의 결과물도 ranking 시 재활용
	- e.g. 어떤 source에서 선정되었는지, canddiate generation 시 score 등
- 영상의 노출 히스토리 관련된 피쳐도 중요함
	- 노출되었지만 시청되지 않은 경우 랭킹이 내려가도록 해야 함
- categorical feature의 embedding
	- cardinality가 매우 큰 피쳐의 경우(e.g. 검색 쿼리 ID) 임베딩을 다 학습할 수는 없음 
		- 빈도 정렬하여 상위 N개의 ID만 임베딩하고 나머지는 out-of-vocabulary 처리하여 고정된 크기의 0 벡터로 사용
	- 영상 ID는 하나의 global 임베딩 테이블을 사용
		- 여러 서로 다른 피쳐에서 같은 임베딩을 제사용 (e.g. 노출된 영상, 마지막에 본 영상, seed로 사용된 영상 등 여러 영상 관련 피쳐에서 모두 이 하나의 테이블을 look-up)
		- 이후 다른 layer로 처리되므로 **사용자 맞춤형 추천이 가능하면서도 학습 자원을 절약하고 일반화 능력을 향상할 수 있음**
- continuous feature의 normalization
	- 0~1로 scaling
	- 비선형 패턴을 학습할 수 있도록 scaling된 값을 $x^2$, $\sqrt{x}$ 로 변환하여 입력값으로 사용 -> 오프라인 정확도가 향상되었음

### Modeling Expected Watch Time
- weighted logistic regression (cross entropy loss)
	- positive sample(클릭함)은 시청 시간에 따른 가중치 부여
	- negative sample(클릭 안 함)은 단위 가중치 부여 (다 똑같이)