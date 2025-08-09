---
{"publish":true,"title":"Multi-Embedding Retrieval Framework at Pinterest","created":"2025-07-28","tags":["recsys"],"cssclasses":""}
---

 > [!tip] about
> [Synergizing Implicit and Explicit User Interests: A Multi-Embedding Retrieval Framework at Pinterest](https://arxiv.org/abs/2506.23060) / KDD '25

# Intro

![[assets/multi-embedding retrieval framework for pinterest homfeed/failed-case.png|600]]
- 기존 모델의 failed case
	- user의 saved pins(explicit feedback)을 보면 음식, 교육, 뷰티 등 다양한 관심사가 있지만 vanilla two-tower model 하나의 retrieval 결과만으로는 이를 커버하지 못함
- 왜 이런 현상이 발생하는가?
	- **유저 임베딩에 head interest bias**가 심함 (사용자가 가장 많이 관심을 보인 주제가 dominant하게 임베딩을 끌고감)


![[assets/multi-embedding retrieval framework for pinterest homfeed/multi-embedding-retrieval-framework.png|500]]
- 이런 문제를 해결하기 위해 **multi-embedding retrieval framework**를 제안
	-  1) Implicit UserInterest Modeling = **Differentiable Clustering Module**
	- 2) Explicit User Interest Modeling = **Conditional Retrieval**


# Implicit User Interest Modeling

![[assets/multi-embedding retrieval framework for pinterest homfeed/implicit-user-interest-modeling.png|525]]


# Explicit User Interest Modeling

![[assets/multi-embedding retrieval framework for pinterest homfeed/explicit-user-interest-modeling.png|550]]



# Deployment
- 각각의 모델에서 생성된 여러 개의 사용자 임베딩 각각을 독립적으로 사용해서 각 임베딩 별로 candidates를 ANN으로 가져옴
	- implicit 관심사 임베딩들에서 후보군을 우선순위(클러스터 중요도)에 따라 일정 수 배정해 뽑기 (온라인 성능을 저하시키는 torso/tail 후보군을 과도하게 가져오는 것을 방지)
	- explicit 관심사 임베딩들에서 (랜덤하게 $K_{ex}$개 선정) 일정 수씩 균등하게 후보를 뽑기
- 마지막으로 모든 후보들을 중복제거, round-robin 방식으로 균형 있게 섞어 최종 candidates를 만들기
- 150ms -> 205ms의 p90 레이턴시 증가가 있지만 limit을 넘지는 않음
- serving cost고려해서 임베딩할 후보 수를 줄여서 single embedding retrieval과 동일한 budget을 유지함


# Results
- implicit interest 모델은 주로 단기 관심사를 포착, 활성 사용자에게 유용
- explicit interest 모델은 장기/롱테일 관심사를 보완, 신규/저신호 사용자에게 유용
- 두 모델이 생성한 후보 간 겹치는 정도는 3.2%에 불과하여 강력한 상호 보완성을 시사

## Experiment


![[assets/multi-embedding retrieval framework for pinterest homfeed/results.png|625]]

- 오프라인 평가
	- DCM은 HR@100과 HR@1000에서 Self-Attention, Interest Token, MIND, PinnerFormer Subsequence (PFS) 기반 모델을 포함한 다른 암시적 관심사 모델들을 능가
	- CR의 경우, 액션 로깅 시점의 소스 관심사를 사용하고 필터링을 적용한 모델이 가장 우수
- 온라인 A/B Test
	- DCM은 HF Repins 및 Adopted Pincepts(온라인 참여 다양성 지표)에서 유의미한 개선을 보임
	- CR은 비핵심 사용자(non-core users)의 HF Repins를 크게 향상시켜, 각 모델이 다른 사용자 세그먼트에서 강점을 가짐을 입증
	- 전반적으로  Sitewide Repins, HF Repins, A-Pincepts에서 상당한 상승
- Ablation
	- DCM의 VA-FPI와 SAR 구성 요소가 클러스터 중심의 다양성을 높이고 온라인 성능을 크게 향상시키는 데 필수적임
	- 클러스터 수가 적으면 온라인 성능이 저하
