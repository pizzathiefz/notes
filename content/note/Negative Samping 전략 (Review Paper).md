---
publish: true
title: Negative Samping 전략 (Review Paper)
created: 2025-09-09
modified: 2026-01-01T21:26:36.000+09:00
published: 2026-01-01T21:26:36.000+09:00
tags:
  - recsys
  - negative-sampling
cssclasses: ""
---

> [Negative Sampling in Recommendation: A Survey and Future Directions](https://arxiv.org/abs/2409.07237)


![[assets/negative samping 전략 (review paper)/recsys-training.png]]


![[assets/negative samping 전략 (review paper)/negative-sample-types.png|400]]

Negative Samples
 - Explicit Feedback -> 낮게 평가된 아이템(e.g. 별점 1,2점)
 - Implicit Feedback -> 상호작용 하지 않은 전체 아이템
 
 - Hard Negative Sample: 다른 negative sample보다 더 많은 정보를 가지고 있는 아이템 (유저가 긍정적으로 상호작용한 아이템들과 비슷하다거나)
	 - 모델 입장에서 맞히기 어렵지만 긍정-부정 경계를 더 미세하게 학습할 수 있어서 효율성과 robustness를 높일 수 있음
	 - 예를 들어 유저 관심사가 전자기기일 때 여성용 구두는 전혀 상관이 없는 매우 쉬운(정보가 없는) negative이지만, 일부 태블릿 기기는 hard negative일 수 있음(유저 관심사와 어느 정도 비슷한데 사실 유저가 원하는 건 아님) 
 - False Negative Sample: 실제로는 유저의 잠재적인 관심사가 맞지만 실수로 negative sample로 채택된 아이템 -> hard negative 선택 과정에서 포함되어 모델의 수렴 속도를 저해하고 성능을 떨어뜨릴 수 있음
 - 결국 negative sampling의 주요 과제는 어느 정도 정보력이 있으면서(어려우면서) false negative가 아닌 샘플을 찾는 것
 - multi-behavior recommendation에서는 여러 행동 정보를 활용하는 것이 필요 e.g. 클릭은 했지만 구매는 하지 않았다


## Negative Sampling 전략

### Static Negative Sampling
- Uniform: unobserved 아이템 중에서 negative sample을 무작위로 선택
- Predefined: 데이터셋 내의 미리 정의된 negative sample을 선택 = 평점 2점 이하이면 선택하겠다, 건너뛰기 행동을 했으면 선택하겠다
- Popularity-based: 인기도에 따라 샘플링될 확률을 높임
- Non-sampling: 전체 데이터 사용 (계산 효율성 면에서 큰 도전)


### Dynamic Negative Sampling
- Universal: 무작위로 선택된 아이템 후보군에서 (유저-아이템 매칭 점수 상) 상위 랭크된 아이템 또는 특정 랭크 범위 내에서 negative sample로 선택
- User-Similarity: 사용자들과 유사하거나 소셜 네트워크상 가까운 사용자들을 찾아서 이 유사도 관계를 이용해서 샘플링 
- Knowledge-aware: 아이템의 attributes/features를 활용하여 정보성 있는 샘플을 찾고 positive 샘플과 관련 있는 아이템을 negative로 선택
- Distribution-based: pos/neg 샘플의 분포 패턴을 분석하고, 학습 단계를 과도하게 방해하지 않으면서도 정보력 있는 negative을 동적으로 선택
- Interpolation: interpolation을 사용하여 positive 샘플로부터 정보를 주입하여 정보성 negative sample을 합성
- Mixed: stratified sampling, random negative + hard negative 섞기 등 혼합 전략

### Adversarial Negative Generation 
- Generative: 생성 모델을 사용하여 기존 데이터에 가정을 부과하지 않고 거짓이지만 그럴듯한 샘플을 생성 (user-specific generation, distribution-associated generation, content-aware generation)
- Sampled: 포착된 분포에서 가장 가능성 있는 아이템을 negative instance로 샘플링 (기존 아이템 풀에서 instance를 직접 선택)

### Importance Re-weighting 
- 목적: 학습 과정에서 샘플 가중치를 조정하여 특정 중요한 negative sample의 중요도를 우선시
- Attention-based: 어텐션 메커니즘을 통해 각 아이템에 중요도 점수를 할당하고 가중치를 조정하여 사용자 개인화된 관심사에 맞는 추천을 제공
- Knowledge-aware: 유저의 social contexts 및 아이템의 heterogeneous information을 활용하여 아이템의 중요도를 식별
- Debiased: 추천 모델의 bias를 수정하는 차원에서 과거에 간과되었던 아이템에 더 높은 가중치를 할당하여 공평하고 다양한 추천을 제공

### Knowledge-enhanced Negative Sampling 
- 보조 정보(auxiliary information) 및 지식 그래프(knowledge graphs)와 같은 보충적인 정보성 지식을 활용하여 negative sample의 선택을 개선
- General : 기존의 잠재적 지식 패턴을 기반으로 negative sample을 선택
- Knowledge Graphs-based: 지식 그래프 내 사용자, 아이템 및 기타 엔티티(entities) 간의 명시적 연관성 및 high-order correlation를 활용하여 negative instance를 샘플링
