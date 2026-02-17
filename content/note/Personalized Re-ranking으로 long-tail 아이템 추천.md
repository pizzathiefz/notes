---
publish: true
title: Personalized Re-ranking으로 long-tail 아이템 추천
created: 2025-06-14
tags:
  - recsys
  - long-tail-rec
  - re-ranking
cssclasses: ""
---

> [Managing Popularity Bias in Recommender Systems with Personalized Re-ranking](https://arxiv.org/abs/1901.07555) (2019)

xQuAD에 영감을 받음 ->❓

>  **Explicit Query Aspect Diversification**

- 정보 검색(Information Retrieval, IR) 분야에서 **검색 결과의 다양성**을 확보하기 위해 제안된 알고리즘
- 기본 아이디어
	- 사용자가 입력한 쿼리는 여러 **잠재적 의도(aspects or sub-intents)**를 가지지만 전통적인 랭킹 모델은 하나의 지배적 의미만 반영할 가능성이 높음
	- 특정 의도에만 치우치지 않고 여러 의도를 균형 있게 커버하도록 re-ranking한다
	- 새로운 문서를 선택할 때, relavance와 diversity를 동시에 고려하는 목적 함수를 사용하여 이미 선택된 결과들이 충분히 다루지 못한 의도를 커버하는 문서를 우선 배치 ( `(1-lambda) * relevance(d) + lambda * diversity(d)` 이런 식임)
- 단점: 의도(aspect) 분포를 미리 가정하거나 추론해야 하므로, 실제 시스템 적용 시 **aspect 추정 정확도**에 성능이 크게 좌우

- 롱테일 아이템의 발견은 비즈니스에 중요하며, 사용자의 다양한 취향을 만족시키고 새로운 아이템 탐색을 촉진하는 데 필수적
- 기존 추천 알고리즘의 output에 적용할 수 있는 post-processing 단계로 정확도를 허용 가능한 수준으로 유지하면서 롱테일 아이템 노출을 증가시키는 것을 목표로 함
- personalized = 모든 유저한테 롱테일 노출을 증가시키는 게 아니라 과거 이력 상 롱테일 아이템에 대한 관심도가 높은 유저에게 promote한다는 점에서


### 요약하면
- greedy하게 아이템을 추가하면서
	- 추가할 아이템 후보(원래 추천 시스템의 추천 목록 중 하나)에 대해 점수를 매기는데
	- 현재까지 선택된 추천 목록을 살펴봤을 때 롱테일 아이템이 충분히 포함되지 않았다면 & 이 사용자가 롱테일 아이템을 선호하는 경향이 있다면 & 이 아이템이 롱테일 아이템이라면 -> 점수를 올려준다. 
	- 다만 점수에는 relavance score (원래 추천 시스템이 생각한 스코어)도 합산해서 쓰므로 롱테일이지만 사용자가 아예 좋아하지 않을 것 같은 아이템은 점수가 많이 올라갈 수는 없다 
- 원하는 길이의 최종 추천 목록이 형성될 때까지 반복한다


### 식으로 살펴보면

$$
P(v | u) + \lambda P(v, S' | u)
$$
- re-ranking score
	- $P(v | u)$ 는 원래 추천 시스템의 output score (그냥 사용자 $u$가 이 아이템 $v$을 좋아할까? )
		- = **accuracy**
	- $P(v, S' | u)$ 는 유저가 현재까지 생성된 목록 $S$에 없는 아이템 $v$에 관심을 가질 가능성 = 즉 현재 목록에 새로운 다양성을 제공하면서 유저가 그것을 좋아할 확률
	- $\lambda$ 는 accuracy와 diversity 간의 가중치를 제어하는 파라미터


$$
P(v, S' | u) = \sum_{d \in \{\Gamma, \Gamma'\}} P(v, S' | d) P(d | u)
$$

- 뒷부분 $P(v, S' | u)$ 인 을 쪼개면
	- $\Gamma$ : long-tail, $\Gamma'$ : short-head -> 즉 $d$는 아이템의 인기/비인기 여부를 나누는 카테고리
	- $P(d | u)$ : 사용자 $u$가 인기 카테고리 또는 비인기 카테고리를 좋아할 확률 (사용자의 기존 행동을 바탕으로 계산할 수 있음. 평소에 비인기 아이템을 많이 소비했는지)
	- $P(v, S' |d)$ : $S'$는 not $S$이므로, 카테고리 $d$에 속하는 $v$가 $S$에 많이 포함이 안되었는지 = 즉 현재 $S$ 기준 카테고리 내에서 $v$가 얼마나 새로운 다양성을 제공하는지

$$
P(v, S' | d) = P(v | d) P(S' | d) = P(v | d) \prod_{i \in S} (1 - P(i | d, S))
$$

- $P(v, S' | d)$를 쪼개면
	- (xQuAD의 접근 방식대로 가정) 나머지 아이템들이 현재 $S$의 내용과 독립적이며, 항목들은 인기/비인기 카테고리가 주어졌을 때 서로 독립적이다
	- $P(v |d)$는 항목 $v$가 카테고리 $d$에 속할 확률인데 여기서는 indicator function을 써서 $v$가 long-tail이면 1 아니면 0 (-> 이렇게 안 하고 인기도를 0~1 사이 값으로 맞추고 1-인기도 쓰면 smooth하게 될듯)
	- $\prod_{i \in S} (1 - P(i | d, S))$ 는 $S$에 이미 있는 아이템 $i$들이 카테고리 $d$를 얼마나 커버하고 있지 않은지
		- indicator function을 쓴다면 어차피 short-head에 대해서는 0이 곱해지므로 아예 계산에서 빼버릴 수 있고 long-tail만 생각한다면, 결국 이 식은 현재 있는 아이템 $i$들이 long-tail이 많을수록 더 작아짐 = 이 long-tail 아이템 $v$에 플러스되는 점수가 작아짐. 반대로 long-tail이 없다면 이 값이 커져서 promotion되는 정도가 커짐.
	- $P(i|d,S)$는 $S$가 $d$를 커버하는 정도로 종류에 따라 다르게 설정되는데 
		- Binary xQuAD : $S$에 long-tail이 하나라도 있으면 1로 -> 저 항 전체가 그냥 0이 돼서, 항목에 이미 long-tail이 하나라도 있으면 더이상 다양성 증진은 안하겠다
		- Smooth xQuAD: $S$에서 long-tail item의 비율로 


### 결과

- 베이스라인(RankALS -> long-tail관련 조작을 하지 않은 기본 추천모델), LT-Reg, Binary xQuAD, Smooth xQuAD비교
	- 이때 [LT-Reg](https://dl.acm.org/doi/10.1145/3109859.3109912)는 기본적인 learning-to-rank 추천 시스템의 학습 과정 자체에 인기도 편향을 완화하는 regularization 항을 추가하는 방식임 
		- 아예 추천모델 학습시부터 비인기 아이템에 대한 예측 오류를 더 민감하게 만들거나, 더 높은 점수를 받도록 유도하는 목적 함수를 사용
		- 이 논문에서는 이런 방식은 모든 유저에게 획일적으로 롱테일 항목의 가중치를 높이는 경향이 있어, 롱테일에 관심 없는 사용자에게도 강제로 롱테일 항목을 추천할 수 있다는 한계가 있다고 지적
- 다양성 지표
	- Average Recommendation Popularity (ARP) = 추천 목록에 포함된 아이템들의 평균 인기도
	- Average Percentage of Long Tail Items (APLT) = 추천 목록에 포함된 롱테일 아이템의 평균 비율
	- Average Coverage of Long Tail Items (ACLT) = 전체 롱테일 항목 카탈로그중에서 추천 시스템이 얼마나 많은 비율의 롱테일 아이템을 추천했는지 커버리지
- 당연히 모든 알고리즘에서 $\lambda$값 을 증가시킬수록 다양성 지표(APLT, ACLT)는 향상되었지만, 예상대로 랭킹 정확도(NDCG)는 일부 손실
- 결과
	- Epinions
		- Binary xQuAD, Smooth xQuAD이 롱테일 아이템 노출(ACLT) 측면에서 LT-Reg보다 훨씬 뛰어난 성능
		- NDCG 정확도 측면에서는 Binary xQuAD가 최소한의 조정으로 약간 더 나은 성능
		- LT-Reg는 롱테일 노출 면에서는 효과가 미미함
		- ARP는 셋다 비슷
	- MovieLens
		- Smooth xQuAD 방법의 이점이 더욱 두드러짐
		- LT-Reg도 여기서는 효과가 있긴 했음
		- 여전히 ARP는 별 차이가 없음 (-> **ARP는 롱테일 다양성을 평가하는 데 있어서 단독으로 사용하기에는 부적절하다**는 결론)
	- MovieLens가 Epinions보다 더 풍부한 데이터셋으로, 고품질의 롱테일 아이템이 더 많아서 Smooth xQuAD가 롱테일 프로모션 가치를 더 활용할 수 있었다고 판단
	- Epinions는 **더 희소한 데이터셋이라 같은 정도의 롱테일 노출 증가(15%)를 위해서 더 많은 NDCG 손실 (10%)이 필요했음**. MovieLens에서는 0.2% 손실로 같은 증가를 얻을 수 있음. 

