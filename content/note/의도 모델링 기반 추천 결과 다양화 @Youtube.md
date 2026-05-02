---
publish: true
title: 의도 모델링 기반 추천 결과 다양화 @Youtube
created: 2025-11-09
modified: 2025-11-16T17:44:06.000+09:00
published: 2025-11-16T17:44:06.000+09:00
tags:
  - recsys
  - diversity
  - re-ranking
---

> [Beyond Item Dissimilarities: Diversifying by Intent in Recommender Systems](https://arxiv.org/abs/2405.12327)

- 단기적인 engagement에만 초점을 맞추는 추천은 장기적인 사용자 경험에 좋지 않음 -> diversification 필요
  - 일반적으로 retrieval/ranking 다음 re-ranking단계(page-optimization)
- 기존의 많은 diversification 알고리즘은 주로 아이템 간의 dissimilarity를 기반으로 동작함 = 그냥 최대한 서로 다른 아이템을 순서대로 배치한다(a고르고 a랑 최대한 다른 b고르고 .. )
- 해당 연구는 세션에 지속되는 user intent를 활용한 diversification 방법을 제안함
  - 사용자의 의도에 대한 prior belief로 시작하여 각 위치에 아이템을 순차적으로 선택하고 이후 의도에 대한 posterior를 업데이트하는 방식으로 작동
    - 여기서 의도란 사용자의 근본적인 목표나 동기. 예를 들면 youtube 도메인에서는,
      - exploration(새로운 컨텐츠를 찾아보고 싶다) <-> familiarity (이전에 재밌게 본 걸 다시 보고 싶다)
      - creator-level intent (특정 크리에이터의 컨텐츠를 보고 싶다)
      - visit length intent (짧게 볼 수 있는 걸 찾고 싶다 또는 30분 정도 밥먹으면서 보겠다)
      - topic-level intent (게임, 학습, 메이크업, 운동)
    - 전체 의도 공간 $V$가 있을 때 의도는 각각 기본적으로 discrete한 값들이고 유저/맥락별로 이 의도들에 대한 확률 분포가 있을 것이라는 가정

### User Intent Modeling

![[assets/의도 모델링 기반 추천 결과 다양화 @youtube/intent-modeling.png|300]]

- 사용자의 의도 $v$를 예측할 수 있도록 DCN([[Deep & Cross Network]]) 컴포넌트를 포함한 모델 $f\_v$를 통해 학습
- 인풋 데이터는 과거 소비 패턴, 현재 세션 관련 정보, 시간/요일 등의 맥락 특징 등
- 라벨 $y\_v$은 사용자가 현재 추천 페이지에서 의도 $v$ 에 부합하는 아이템을 소비했는지 여부(1/0)로 정의됨
  - 즉 exploration <-> familiarity 의도를 모델링한다면 사용자가 소비한 아이템 $j$가 처음 보는 크리에이터의 영상이었을 때 exploration label 1로 라벨링을 한다는 것
- 이 모델은 추론시에 사용자 $i$가 의도 $v$를 가질 확률 = Prior 인 $Pr(v | i)$ 를 얻기 위해 사용
- cross-entropy loss $\hat{L}(\theta) = - \sum\_{(x, y\_v) \in \mathcal{D}} \sum\_{v \in \mathbb{V}} y\_v \log f\_v(x; \theta)$

### Intent Diversification Algorithm

![[assets/의도 모델링 기반 추천 결과 다양화 @youtube/diversify-framework.png|650]]

- 알고리즘
  - (첫번째) 사전확률에 따라 가장 의도에 부합하(면서 사용자가 좋아할 가능성이 높은) 아이템을 선정한다.
  - (두번째부터는) 지금까지 선정된 아이템에 관심이 없다고 가정하고 의도에 대한 posterior를 업데이트한다. 업데이트된 확률에 따라 계속 사용자의 의도에 가장 부합하면서 좋아할 가능성이 높은 아이템을 선정하는 것을 반복한다.
  - \= 사용자가 지금까지 고른 아이템에 관심이 없다고 가정함으로써 모든 의도가 잘 만족되도록 보장하는 것 (다양화)
    수식으로 보면,
    $$
    j\_m = \arg \max\_{j \in S} \left( s\_{ij} \cdot \left( \sum\_{v \in \mathbb{V}} \text{Pr}(v|i, R\_{m-1}) Q(j|i, v) \right)^\gamma \right)
    $$
- $s\_{ij}$ : 아이템 $j$가 유저 $i$에게 얼마나 relevant한지 = 즉 retrieval/ranking의 결과로 나온 quality score. 다양성을 적용하기 전의 순수한 유저의 선호도
- $Pr(v|i,R\_{m-1})$ : $m-1$ 까지의 선정된 아이템을 고려했을 때 업데이트된 의도에 대한 posterior probability
- $Q(j|i,v)$ : 사용자가 의도 $v$를 가지고 있을 때 $j$를 얼마나 좋아할 것이냐
  - 아이템 $j$가 부합하는 의도들의 집합 $V\_j$ (e.g. 요가에 대한 & 처음 보는 & 짧은 영상) 에 대해 $v$가 속한다면 단순 $Q(j|i)$ = relevant score(유저-아이템 선호도를 그냥 유지)이고 아니면 0임
    - (설명) 베이즈 정리에 따라 $Q(j | i, v) = \frac{Q(j | i) \Pr(v | i, j)}{\Pr(v | i)}$ 인데 사용자는 자신의 의도와 일치하는 아이템을 소비하고 일치하지 않는 아이템을 소비하지 않는다는 것이 의도 개념의 가정이므로, 아이템 $j$가 의도 $v$와 일치하지 않으면 $Pr(v|i,j) = 0$이고(소비했을 리가 없고) 의도와 일치하면 $Pr(v|i,j) = Pr(v|i)$ 로 사용자가 그 의도를 가질 가능성만 고려하면 됨.
- $\gamma$ 는 다양화 컴포넌트의 강도를 조절하는 하이퍼파라미터. 즉 위 기준은 $\gamma$에 따라서 다양화 점수(주어진 의도에 따른 선호)와 순수 선호를 조합해서 그걸 최대로 만드는 아이템 $j$를 고르는 방식이라고 보면 됨

$$
\text{Pr}(v|i, R\_m) = \begin{cases}
\frac{\text{Pr}(v|i, R\_{m-1}) (1 - Q(j\_m|i,v))}{1 - Q(j\_m|i)}, & \text{if } v \in \mathbb{V}_{j\_m} \\
\text{Pr}(v|i, R_{m-1}), & \text{otherwise}
\end{cases}
$$

- counterfactual하게 posterior를 업데이트
- 업데이트하려는 의도 $v$에
  - 방금 선정한 아이템 $j\_m$가 부합한다면, 이 의도에 대한 믿음은 그냥 내버려둠.
  - 방금 선정한 아이템 $j\_m$이 부합한다면, 일단 유저가 이걸 안 좋아했다고 가정하고 믿음을 수정함(다양화하기 위해)
    - $1 - Q(j\_m|i,v)$ 사용자가 의도 $v$를 가지고 있음에도 이 아이템을 좋아하지 않을 확률
      - '이 의도를 가졌다면 이 아이템을 좋아해야 하는데'가 클수록 사후 확률은 더 많이 깎임
    - $1 - Q(j\_m|i)$ 사용자가 전반적으로 이 아이템을 좋아하지 않을 확률(normalizing용)

### Experiment

- Exploration <-> Familiarity Intent를 대상으로 실험(본문 내용은 다 이거기준)
  - appendix에서는 creator-level intent와 visit length intent에 대한 실험도 진행했다고 되어있음
  - 이 연구에서 하지는 않았지만 제일 궁금한 건 이런 여러 결의 의도를 한꺼번에 다양화하려면 어떻게 해야 할까
    - 예를 들어 크리에이터 의도 공간은 exploration-familiarity 2개 대비 엄청나게 큼 (이런 차이에 따른 스케일 관리가 필요)
    - 멀티 헤드로 모델을 통합할 것인지(는 현실적으로 어려울 것) 아니면 각각의 모델을 운영하더라도 이를 diversification algorithm(posterior update)에서 어떻게 처리할 것인지
- 의도 모델은 **6시간 마다 재학습되어** 동적인 변화를 실시간으로 반영
- A/B 테스트 결과 overall enjoyment, DAU, landing page consumption 등 메이저 비즈니스 지표들에서 유의미한 개선이 있었고 탐색 행동과 소비 다양성에 미치는 영향도 긍정적이었음(**특히 개인화 효과 =  원래 탐색 의도가 높았던 사용자들에게 더 효과가 좋음**)

![[assets/의도 모델링 기반 추천 결과 다양화 @youtube/intent-variation.png|450]]

- exploration 의도는 하루 시간대에 따라 매우 동적으로 변화지만 장기간을 평균내면 크게 변하지 않음(안정적인 유저별 특성이 존재)
  ![[assets/의도 모델링 기반 추천 결과 다양화 @youtube/features.png|450]]
- exploration 의도와 관련 있었던 피쳐들
