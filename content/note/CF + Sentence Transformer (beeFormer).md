---
publish: true
title: CF + Sentence Transformer (beeFormer)
created: 2025-10-26
modified: 2025-10-28T18:54:24.000+09:00
published: 2025-10-28T18:54:24.000+09:00
tags:
  - recsys
  - representation-learning
cssclasses: ""
---

> [beeFormer: Bridging the Gap Between Semantic and Interaction Similarity in Recommender Systems](https://arxiv.org/abs/2409.10309)


- 기존의 아이템 설명 텍스트 기반 Sentence Transformer 모델들은 주로 의미론적 유사성 예측에 초점을 맞추느라 사용자 상호작용 데이터에 숨겨진 패턴을 포착하지 못할 수 있음
	- 예를 들어 장난감을 살 때 필요한 배터리나 프린터를 살 때 필요한 케이블처럼 의미론적으로는 유사도가 낮지만 상호작용 맥락에서는 높은 유사도를 가지는 아이템들이 존재


![[assets/cf + sentence transformer (beeformer)/elsa.jpg|550]]
- [ELSA (Efficient Linear Shallow Autoencoder)](https://dl.acm.org/doi/10.1145/3523227.3551482)
	- 기본적으로는 CF 목적의 오코인코더
	- 상호작용 행렬 $X$가 있을 때 아이템 임베딩 행렬 $A$를 학습함
		- 원래는 아이템-아이템 간의 상호작용을 다 구해서 아이템-아이템 weight로 쓰는 방식(EASE)이 먼저 나왔는데, 아이템 수에 따라서 행렬 크기가 너무 커지므로 이걸 low-rank 행렬 $A$ ($I \times I$ -> $I \times r$ 처럼 임베딩 차원 $r$ 만큼) 로 줄여서 상호작용 행렬 = $AA^T$로 근사한다는 것이 ELSA의 아이디어
	- reconstructed 상호작용 행렬 $\hat{X} = X(AA^{T}- I)$
		- 오토인코더이므로 자기자신을 복원 ($X$와 $\hat{X}$의 차이가 작아지도록 하는 것이 목표)
		- $AA^T$ 는 아이템 임베딩 간의 유사도
		- 단위행렬 $I$를 빼줌으로써 self-smilarity항을 제거함(제거하지 않으면 자기 자신과의 유사도가 가장 높으므로 계속 자기복제 형태의 결과물이 됨)


![[assets/cf + sentence transformer (beeformer)/framework.png|550]]

- beeFormer (본 논문)
	- ELSA 모델의 학습 절차를 따라하되, $A$  자체를 학습하게 하는 게 아니라 대신 sentence Transformer 모델이 내놓은 임베딩을 가지고 $L = \text{norm}(𝑋_𝑢) − \text{norm}(𝑋_𝑢 (𝐴𝐴^⊤ − I))_2^𝐹$ 를 생성한 뒤 이 모델의 파라미터를 학습함
		- 즉 오토인코더의 **인코더는 sentence transformer가 되고 디코더만 ELSA랑 같은 구조로 아이템의 텍스트(semantic) 정보와 상호작용 정보를 동시에 학습**하게 함
	- 다만 이 방식은 모든 아이템에 대한 임베딩을 매 학습 단계마다 생성하고 최적화해야 하므로 대규모 데이터셋에서는 엄청난 비용이 필요함
		- gradient checkpointing, gradient accumulation, negative sampling을 사용해서 문제를 해결했음



### results
- setup
	- 데이터
		- Goodbooks(도서), MovieLens(영화), Amazon(도서) 데이터 사용하고 explicit ratings 데이터를 implicit 으로 바꿈 (4점 이상이면 interaction = 1)
		- 텍스트 설명: 데이터셋 내에 있는 설명과 더불어 imdb, goodreads books 데이터셋에서 설명 수집하고 부족한 항목에 대해서는 Meta Llama-3.1-8B-Instruct 모델 사용해서 표준화된 아이템 설명을 생성했음
	- baselines
		- sentence transformer: all-mpnet-base-v2, BAAI/bge-m3, nomic-embed-text-v1.5 (flash-attention기반 long context임베딩)
		- traditional CF models: KNN, ALS MF, EASE, SANSA, ELSA
	- beeFormer의 경우 각 데이터셋에서 학습된 모델들과 Goodbooks + MovieLens(도메인 통합) 모델을 같이 비교
- Item-split 시나리오
	- 각 데이터셋에서 임의로 2000개의 아이템을 테스트 셋으로 분리하여 테스트 -> 새로운 아이템(콜드스타트/제로샷) 일반화 능력 평가
	- zero-shot: 한 도메인에서 학습된 뒤, 다른 도메인 데이터로 평가
		- beeFormer가 기존의 베이스라인 semantic similarity 모델보다 2 배 이상 높은 Recall 및 NDCG를 기록
			- 텍스트 설명의 의미적 유사도뿐아니라 interaction 패턴까지 반영할 수 있고, 특히 도메인에 종속되지 않고 일반적인 패턴을 학습했음을 알 수 있음
	- cold-start: 같은 도메인 내에서, 텍스트 정보만 보고 처음 등장한 아이템을 추천
		- 단순 텍스트 임베딩 기반 Content based filtering와 [Heater](https://www.semanticscholar.org/paper/Recommendation-for-New-Users-and-New-Items-via-and-Zhu-Sefati/bd80c2ffbdd0e8736034e1f47b91682303264365)(텍스트 임베딩과 상호작용 데이터를 맵핑하여 콜드스타트를 해결)와 함께 사용했을 때를 비교함
		- 단일 데이터셋으로 학습된 beeFormer 모델보다, 여러 데이터셋(여기서는 Goodbooks와 MovieLens)을 함께 학습한 모델이 콜드 스타트 시나리오에서 더 뛰어난 성능 
		- 특히 Heater방법으로 사용되는 경우에도 기존 sentence transformer보다 더 높은 성능
- Time-split 시나리오
	- 상호작용을 타임스탬프 기준으로 정렬하여 마지막 20%를 테스트 -> 실제 서비스 상황(과거 상호작용으로 미래의 선호 예측) 평가
	- zero-shot : 다른 데이터셋에서 학습 후 Amazon Books에 적용 (CBF)	
	- supervised: Amazon Books에서 학습 후 적용 (CF, CBF)
		- 2개 시나리오 모두에서 상당한 격차로 다른 베이스라인 모델을 능가함 (도메인 간 전이 능력 및 상호작용 데이터가 많은 시나리오에서도 기존 CF모델보다 더 나은 성능을 달성할 수 있음)
