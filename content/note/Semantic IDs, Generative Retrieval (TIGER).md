---
publish: true
title: Semantic IDs, Generative Retrieval (TIGER)
created: 2025-07-12
modified: 2026-03-24T18:48:00.084+09:00
published: 2026-03-24T18:48:00.084+09:00
tags:
  - recsys
  - llm
  - generative-recsys
---

> [Recommender Systems with Generative Retrieval](https://arxiv.org/abs/2305.05065) (2023)

![[assets/semantic ids, generative retrieval (tiger)/example.png|503]]

- 아이디어
  - 기존 대규모 추천시스템에서는 일반적으로 쿼리와 아이템 임베딩을 잘 생성한 다음 ANN을 통해 주어진 쿼리에 대해 가까운 아이템 후보들을 찾는 방식의 retrieval을 함
  - 언어 생성 모델처럼 추천할 아이템의 ID를 생성하는 방식의 추천을 하려면?
    - 원래의 랜덤한 아이템 ID가 아닌 의미를 담은 semantic ID를 만들고 이걸 언어 모델의 토큰처럼 취급하면 어떨까
- 이름: TIGER(Transformer Index for GEnerative Recommenders)

![[assets/semantic ids, generative retrieval (tiger)/tiger-overview.png]]

- overview (2개의 단계)
  - semantic ID로 변환한다 (dense embedding -> quantization)
  - 이를 토큰으로 삼아 seq2seq Transformer에 넣어 다음 토큰을 생성하도록 한다

<br>

### Semantic ID Generation

- 우선 아이템의 콘텐츠 임베딩이 밑재료가 됨
  - 아이템에 대한 텍스트 설명(e.g. 이름, 가격, 브랜드, 카테고리 등)을 sentence-T5나 BERT 같은 범용 사전훈련된 텍스트 인코더를 사용해 dense semantic embedding을 얻음
- **Residual Quantization(RQ-VAE)** : 이 임베딩들을 각 $K$ 크기를 가지는 $m$개의 코드북을 사용해 길이 $m$의 코드워드의 튜플로 바꾸면 이게 바로 semantic ID가 됨

![[assets/semantic ids, generative retrieval (tiger)/rq-vae.png]]

- 구성
  - 인코더: 입력 dense embedding $x$를 잠재 표현 $z = E(x)$로 바꾼다.
  - RQ: $m$번의 quantization을 반복한다.
    - 첫번째 코드북에는 $C\_0={e\_k}_{k=0}^{K-1}$ 와 같이 $K$개의 벡터가 존재하며, 이중에서 $z$와 가장 가까운 $e_{c0}$ 을 찾는다. 그림에서는 $c\_0=7$ -> 이게 첫번째 코드워드가 됨.
      - 이때 완전히 동일하진 않을 것이므로 잔차($z-e\_{c0}$의 절대값)가 발생하는데, 이를 $r\_1$ 이라고 하고 다음 코드북으로 넘기자.
    - 두번째 코드북 $C\_1$에서 $K$개의 벡터 중 $r\_1$과 가장 가까운 $e\_{c1}$을 찾는다. 그림에서는 $c\_1$ = 1 -> 두번째 코드워드.
      - 여기서 또 잔차가 발생하므로 다시 $r\_2$를 다음 코드북으로 넘기자.
    - 이를 코드북 개수 $m$ 만큼 반복하면 $m$개의 코드워드(가장 가까웠던 벡터의 인덱스)와 함께 각 단계에서 선택되었던 벡터 $e\_{c\_k}$를 얻게 됨
  - 디코더: 선택되었던 벡터들의 합이 $z$의 quantized representation $\hat{z} = \sum^{m-1}_{0}e_{c\_i}$ 가 되고 이를 decoder가 인풋으로 가져감. 최종적으로 디코더의 출력 $\hat{x} = D(\hat(z))$
- 기본적으로 auto encoder구조이므로 **인코더-디코더를 거쳐 원래의 embedding이 잘 복원되도록 해야 하고 동시에 quantization 과정에서 정보 손실이 적어야 함** -> 이 2가지 목적을 손실함수로 두고 인코더, 코드북, 디코더의 파라미터를 학습하게 됨
  - Reconstruction Loss : 입력 $x$ 과 디코더의 출력 $\hat{x}$간의 차이
  - Quantization Loss: $\sum\_{d=0}^{m-1} \left( | \text{sg}\[r\_i] - e\_{c\_i} |^2 + \beta | r\_i - \text{sg}\[e\_{c\_i}] |^2 \right)$
    - $\text{sg}$는 stop-gradient operation (역전파할 때 안에 있는 값을 무시하고 상수 취급)
    - 첫번째 항은 잔차와 선택되는 벡터를 가깝게 하되 잔차에 대해서는 학습하지 않고 코드북 내의 벡터들을 잔차에 가깝게 조정
    - 두번째 항은 인코더의 출력이 선택된 코드북 벡터에 더 가까워지도록 하되 코드북 벡터는 냅두고 인코더가 코드북 벡터로 잘 표현될 수 있는 값을 내보내도록 유도
- 충돌 처리
  - 여러 아이템이 동일한 semantic ID를 가지게 되는 것을 방지하기 위해 맨 마지막에 추가 토큰을 하나 더 붙여줌 e.g. 두 아이템이 Semantic ID (12, 24, 52)를 공유하는 경우(12, 24, 52, 0) 및 (12, 24, 52, 1)로 나타내어 구별

<br>

### Generative Retrieval

- 만들어진 semantic ID를 사용해 Transformer 기반 sequence-to-sequence 모델을 sequential recommendation 태스크에 대해 학습시킴
- 사용자의 아이템 소비 기록 (item 1, ..., item n)을 semantic ID 토큰 시퀀스로 변환
  - $(c\_{1,0}, \cdots, c\_{1,m-1}, \cdots, c\_{n\_{0},}\cdots,c\_{n,m-1})$
- 모델은 이 시퀀스를 입력받아 사용자가 다음으로 상호작용할 item n+1의 semantic ID $(c\_{n+1, 0}, \cdots, c\_{n+1, m-1})$ 를 예측하도록 학습됨

<br>

### Experiment

- details
  - Amazon Product Reviews 데이터셋 Beauty, Sports and Outdoors, Toys and Games 사용
  - 아이템의 dense embedding은 Sentence-T5 사용, 768차원
  - 인코더의 아웃풋 잠재 표현은 32차원 (따라서 코드북 벡터도 32차원)
  - 각 코드북의 크기는 256, 3개의 코드북 사용 + 마지막에 충돌 방지를 위한 하나의 코드워드 추가 -> 즉 표현 가능한 아이디의 개수는 256^4 였음
  - RQ-VAE는 높은 코드북 사용률을 보장하기 위해 총 20 epoch 학습
  - seq2seq모델은 T5X 프레임워크 사용, 총 1,300만 개 정도의 파라미터
  - 개인화를 위해 유저별 토큰도 추가했으나 vocab 사이즈를 너무 늘리지 않기 위해 hashing trick을 사용해서 2천개의 제한된 ID토큰에 맵핑하는 방식을 사용했음
- results
  - GRU4Rec, Caser, HGN, SASRec, BERT4Rec, FDSA, S3-Rec, P5와 같은 기존의 SOTA sequential recommender 모델들과 비교함
    - 기존 모델들은 대부분 dual-encoder 기반으로 임베딩 공간에서 Maximum Inner Product Search (MIPS)를 통해 다음 아이템을 retrieval함
  - TIGER는 모든 데이터셋과 모든 지표에서 기존 baseline 모델들을 지속적으로 능가
    - Beauty: 특히 큰 폭의 개선을 보여, NDCG@5에서 SASRec 대비 최대 29% 개선, Recall@5에서 S3-Rec 대비 17.3% 개선
    - Toys and Games: NDCG@5에서 21%, NDCG@10에서 15% 개선
- new capabilities
  - cold-start 대응: 새롭게 추가되거나 사용자 상호작용 기록이 없는 unseen items에 대한 추천 결과를 봤을 때 semantic KNN 대비 지속적으로 높은 Recall@K를 보임
    - random ID + 상호작용에 의존하는 기존방식 대비 텍스트 설명만 있으면 의미적 표현을 토큰에 담을 수 있기 때문에
  - 추천 다양성: 디코딩 시 temperature-based sampling을 통해 다양성을 조절할 수 있는데([[생성 모델의 Temperature]]), 예측된 top-k item의 실제 카테고리 분포에 대한 entropy@K를 확인한 결과 temperature를 높일수록 다양성을 향상시킬 수 있음
- 모델이 유효하지 않은 semantic ID (추천 데이터셋의 어떤 아이템에도 매핑되지 않는 ID)를 생성할 수도 있나?
  - Top-10 예측시 invalid ID의 비율은 데이터셋에 따라 약 0.1%에서 1.6% 정도로 매우 낮았음
  - 이런 부분은 beam search의 빔 사이즈를 늘리거나, 접두사 매칭(prefix matching)과 같은 방법으로 더 개선될 수 있음
- 추론 비용
  - autoregressive decoding을 위한 beam search로 인해 ANN 기반 모델보다 추론 비용이 더 들 수 있음 (이 부분은 이 연구의 주요 목적은 아니었다 라고 언급..)
  - 대신 각 아이템에 대한 임베딩 대신 각 semantic codeword에 대한 임베딩만 저장하므로 **임베딩 테이블의 메모리 비용이 훨씬 적다**는 장점
