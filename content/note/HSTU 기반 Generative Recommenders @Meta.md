---
publish: true
title: HSTU 기반 Generative Recommenders @Meta
created: 2025-10-10
modified: 2026-03-24T18:39:33.348+09:00
published: 2026-03-24T18:39:33.348+09:00
tags:
  - "#recsys"
  - "#generative-recsys"
cssclasses: ""
---


> [Actions Speak Louder than Words: Trillion-Parameter Sequential Transducers for Generative Recommendations](https://arxiv.org/abs/2402.17152) (2024)

## 배경 및 동기

- 기존 DLRM의 한계
    - 수천 개의 heterogeneous feature(categorical + numerical)를 사용하지만 compute 대비 성능이 잘 스케일되지 않음
    - feature engineering에 크게 의존 → 수백 명의 엔지니어가 수년간 쌓아온 결과물
- Transformer가 language/vision에서 보여준 성공에 착안 → 추천 시스템의 fundamental design을 재검토

- 추천 시스템에서 순수 sequential 모델을 적용하기 어려운 세 가지 도전
    1. **Feature 구조 부재**: NLP와 달리 추천 시스템의 feature는 explicit 구조가 없고 heterogeneous함
    2. **Billion-scale 동적 vocabulary**: NLP의 100K 정적 vocabulary와 달리, 추천은 매 분마다 새로운 아이템이 추가되는 non-stationary 환경
    3. **계산 비용**: 대규모 플랫폼은 LLM이 1-2개월간 처리하는 것보다 수 배 많은 user action을 하루에 처리해야 함 (user sequence 길이 최대 $10^5$)

## Generative Recommenders (GR) 패러다임

### 핵심 아이디어

- 추천 문제를 **sequential transduction task**로 reformulate
- DLRMs의 heterogeneous feature space를 **단일 time series**로 통합

### Feature 통합 방법

[Figure 2]
- DLRMs vs GRs의 feature 및 training 비교

- **Categorical features (sparse)**
    - User engagement item 목록을 main time series로 선정
    - 나머지 auxiliary time series(demographics, followed creators 등)는 연속된 구간별 earliest entry만 유지 후 merge
        - → 이런 feature들은 매우 느리게 변하므로 sequence 길이가 크게 늘지 않음

- **Numerical features (dense)**
    - CTR, ratio 등은 매 (user, item) interaction마다 변하므로 fully sequentialize 불가
    - 하지만 이 값들이 집계되는 categorical feature들은 이미 sequentialize되어 있음
    - → 충분히 표현력 있는 sequential transduction + target-aware formulation이 있다면, sequence 길이가 길어질수록 numerical feature 없이도 포착 가능

### Ranking vs Retrieval as Sequential Transduction

[Table 1]

- **Retrieval**: user representation $u_i$를 이용해 $p(\Phi_{i+1} | u_i)$를 학습
    - positive engagement인 경우에만 $y_i$가 정의됨
- **Ranking**: target-aware formulation 필요
    - item과 action을 interleave해서 $p(a_{i+1} | \Phi_0, a_0, \Phi_1, a_1, \ldots, \Phi_{i+1})$ 형태로
    - → target이 sequence 안에 들어가므로, target과 history의 "interaction"이 early stage에서 발생 (late softmax가 아니라)
    - 모든 $n_c$개 engagement에 대해 target-aware cross-attention을 one pass로 적용 가능

### Generative Training

- 기존 impression-level training의 계산 복잡도: $O(N^3 d + N^2 d^2)$ → cost prohibitive
- Generative training으로 전환 시 user $i$의 sampling rate를 $s_u(n_i) = 1/n_i$로 설정
    - → 전체 비용이 $O(N^2 d + N d^2)$으로 **O(N) factor 감소**
    - 실제 구현: user request/session 종료 시점에 training example을 emit → $\hat{s}_u(n_i) \propto 1/n_i$ 자연스럽게 달성
    - → 같은 compute로 훨씬 많은 데이터를 학습할 수 있게 됨

## HSTU 아키텍처

[Figure 3]
- DLRMs의 주요 모듈들과 GRs의 HSTU 비교

HSTU(Hierarchical Sequential Transduction Unit)는 세 개의 sub-layer로 구성된 identical block을 stack:

$$U(X), V(X), Q(X), K(X) = \text{Split}(\phi_1(f_1(X))) \tag{1}$$

$$A(X)V(X) = \phi_2\left(Q(X)K(X)^T + r^{abp,t}\right) V(X) \tag{2}$$

$$Y(X) = f_2\left(\text{Norm}(A(X)V(X)) \odot U(X)\right) \tag{3}$$

- $f_1, f_2$: 단일 linear layer (compute 줄이고 Q, K, V, U를 fused kernel로 배치 처리)
- $\phi_1, \phi_2$: SiLU 비선형함수
- $r^{abp,t}$: positional(p) + temporal(t) 정보를 담은 relative attention bias

### DLRM 3단계를 HSTU 하나로 대체

- **Feature Extraction** → HSTU의 attention pooling이 target-aware pooling을 포함
- **Feature Interaction** → $\text{Norm}(A(X)V(X)) \odot U(X)$로 attention pooled feature들 간 interaction
    - dot product를 learned MLP로 근사하는 것의 어려움을 우회
    - $\text{Norm}(A(X)V(X)) \odot U(X)$는 SwiGLU의 변형으로도 해석 가능
- **Transformation of Representations (MoE)** → HSTU의 element-wise dot product가 MoE의 gating operation과 유사하게 동작 (normalization 차이만 있음)

### 핵심 설계: Pointwise Aggregated Attention

- **Softmax attention 대신** pointwise aggregated (normalized) attention 사용
- 이유 1: target과 관련된 prior data point 수 자체가 user preference intensity의 강한 feature → softmax normalization이 이 정보를 희석
    - * engagement 강도 예측(time spent)과 상대적 순위(AUC) 모두 포착해야 하므로 중요
- 이유 2: softmax는 non-stationary vocabulary streaming 환경에 덜 적합
- Pointwise attention 이후 **layer norm 필수** (training 안정화)

[Table 2]
- Synthetic streaming data에서: softmax vs pointwise attention 간 HR@10 기준 최대 44.7% 차이

### 효율화 기법들

**1. Sparsity 활용 + Stochastic Length (SL)**

- 추천 user history의 길이 분포는 skewed → sparse input
- Ragged attention computation으로 GPU kernel 최적화 (FlashAttention 방식이지만 fully raggified)
    - → self-attention이 memory-bound가 되어 $\Theta(\sum_i n_i^2 d_{qk} R^{-1})$로 스케일
- **Stochastic Length**: user history의 temporal repetitiveness를 이용해 sequence를 확률적으로 sub-sample
    - 복잡도를 $O(N^\alpha d)$로 줄임 ($\alpha \in (1, 2]$)
    - $\alpha = 1.6$, sequence length 4096: 80% 이상의 토큰 제거 가능하면서 NE 0.2% 이하 하락

[Table 3]
- SL의 sparsity 영향: alpha값과 max sequence length별 sparsity 비율

[Figure 4]
- SL이 metrics에 미치는 영향 (n=4096, n=8192)

**2. Activation Memory 최소화**

- HSTU: attention 외부의 linear layer를 6개 → 2개로 축소
- 계산을 단일 operator로 aggressive fusion
    - activation memory: **14d per layer** (bfloat16)
    - vs Transformer: **33d per layer** (standard assumption 기준)
    - → **2x 이상 깊은 네트워크** 구성 가능
- 10B vocabulary, 512d embedding, Adam의 경우 embedding + optimizer states만 60TB → rowwise AdamW + optimizer states on DRAM으로 HBM 사용량을 float당 12 bytes → 2 bytes로 절감

### M-FALCON: Inference Cost Amortization

- Ranking 추론 시 tens of thousands of candidates를 처리해야 하는 문제
- **M-FALCON** (Microbatched-Fast Attention Leveraging Cacheable OperatioNs)
    - $b_m$개 candidate를 병렬로 처리하도록 attention mask와 $r^{abp,t}$ bias를 수정
    - cross-attention 비용: $O(b_m n^2 d) \to O((n + b_m)^2 d) = O(n^2 d)$ ($b_m \ll n$인 경우)
    - $m$개 전체를 $\lceil m/b_m \rceil$개 microbatch로 분할 → KV caching 활용 가능
- 결과: 285x 복잡한 모델을 **동일한 inference budget으로** 1.50x~2.99x 높은 throughput으로 서빙

## 실험 결과

### Public Dataset (전통적 sequential 설정)

[Table 4]

- HSTU vs SASRec (2023) 비교:
    - ML-1M: HR@10 +8.6%, NDCG@10 +7.3%
    - ML-20M: HR@10 +11.9%, NDCG@10 +15.9%
    - Amazon Books: HR@10 +38.4%, NDCG@10 +40.6%
    - HSTU-large: Books 기준 HR@10 +60.6%, NDCG@10 +65.8%

### Industrial-Scale Streaming 설정

[Table 5]

- 100B examples, 64-256 H100 사용
- HSTU는 Transformers 대비 ranking에서 특히 크게 앞섬 (Transformer는 ranking에서 NaN 발생)
- Transformer++도 HSTU보다 낮은 성능
- 동일 설정에서 **1.5x~2x 빠른 wall-clock time + 50% 적은 HBM 사용**

[Figure 5]
- HSTU vs FlashAttention2 Transformers 효율 비교: training 최대 15.2x, inference 최대 5.6x 빠름

### GR vs DLRM 비교 (실제 서비스)

[Table 6, Table 7]

- **Retrieval**: GR(new source) +6.2%/+5.0% (E/C-Task) vs DLRM baseline
- **Ranking**: GR **+12.4%/+4.4%** (E/C-Task) vs DLRM baseline
    - DLRM에서 GR이 사용하는 feature만 남겼을 때 DLRM 성능 대폭 하락 → GR이 sequential 구조로 그 feature들을 더 잘 활용함을 의미
    - "GR (interactions only)": 기존 sequential recommender와 유사 → GR 전체보다 2.6% NE 더 나쁨
    - content-only baseline은 DLRM/GR과 큰 격차 → **user action (collaborative signal)의 중요성** 재확인

[Figure 6]
- M-FALCON 기반 inference throughput: 285x 복잡한 GR 모델이 DLRM 대비 1.5x~3x 높은 QPS 달성

### Scaling Law

[Figure 7]

- 추천 시스템에서도 **power-law scaling** 확인: $L = a + b \ln C$ 형태
    - Retrieval HR@100: $L = .15 + .0195 \ln C$
    - Retrieval HR@500: $L = .395 + .0212 \ln C$
    - Ranking NE: $L = .549 - 0.0053 \ln C$
- 3 orders of magnitude 범위에서 관찰 (GPT-3/LLaMa-2 수준까지)
- 낮은 compute 구간에서는 DLRM이 앞서기도 함 (handcrafted feature 덕분)
- 단, **LLM과 달리 sequence length가 scaling에서 특히 중요** → embedding dim, layer 수와 함께 같이 늘려야 함
- DLRMs는 약 200B parameter에서 포화되나, GR은 1.5T parameter 모델까지 지속 향상

## 결론 및 의의

- DLRM → GR 패러다임 전환: heterogeneous feature를 unified time series로 통합하고 ranking/retrieval을 sequential transduction으로 재정의
- HSTU: 추천 특성에 맞춘 새로운 attention 설계 (pointwise aggregated attention, temporal bias, stochastic length)
- M-FALCON: 285x 복잡한 모델을 동일 budget에서 실제 배포 가능하게 하는 inference 알고리즘
- 추천 시스템 최초로 LLM 수준의 scaling law 검증 → "추천 시스템의 ChatGPT moment" 가능성 제시
- foundation model for recommendations 가능성: unified feature space로 cross-domain 적용 가능
