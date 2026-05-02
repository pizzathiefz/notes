---
publish: true
title: Generative Retrieval의 프로덕션 적용 (PLUM) @Youtube
created: 2025-11-10
modified: 2026-03-29T17:05:44.054+09:00
published: 2026-03-29T17:05:44.054+09:00
tags:
  - recsys
  - generative-recsys
cssclasses: ""
---


> [PLUM: Adapting Pre-trained Language Models for Industrial-scale Generative Recommendations](https://arxiv.org/abs/2510.07784) (2025)


## Background

- 기존 산업 추천 시스템의 지배적 패러다임: **Large Embedding Model (LEM)**
    - 파라미터 대부분이 대규모 embedding table에 집중
    - Item ID 등 high-cardinality categorical feature를 embedding으로 표현
    - User-item interaction 암기에는 효과적이나, deep network scaling에 제약
- LLM의 성공은 새로운 패러다임을 제시
    - Embedding table 확장이 아닌 neural network 크기 확장
    - Compact input token의 composition 학습
- LLM을 추천에 직접 적용하는 것은 비자명함
    - **Domain gap**: LLM은 user behavior data나 item corpus로 pre-training되지 않음
    - **Scaling challenge**: 대규모 embedding table은 대량의 학습 데이터를 요구해 large Transformer 학습에 비용 문제

---

## Method

PLUM의 3단계 구성: Item Tokenization (SID-v2) → Continued Pre-training (CPT) → Generative Retrieval (SFT)

![[assets/Generative Retrieval의 프로덕션 적용 (PLUM) @Youtube/generative-retrieval.png|497]]
- Generative Retrieval 전체 흐름: SID 토큰, 텍스트, numerical feature 토큰이 혼합된 입력 프롬프트 → 다음 영상의 SID를 decoder-only LLM이 autoregressive 생성

### 1. Semantic IDs (SID-v2)

기존 TIGER/RQ-VAE 기반 SID-v1 ([[note/Semantic IDs, Generative Retrieval (TIGER)]]) 을 개선한 SID-v2 제안

![[assets/Generative Retrieval의 프로덕션 적용 (PLUM) @Youtube/semantic-ids.png|604]]
- SID 모델 구조: multi-modal 영상 임베딩 → 인코딩 → Residual Quantizer → quantized ID
- 학습 목표: 원본 임베딩 reconstruction + co-occurrence contrastive loss

#### Fused Multi-Modal Content Representation

- 기존 single content embedding의 한계: 텍스트, 영상, 오디오 등 다양한 정보를 단일 모달로 커버 불가
- 여러 임베딩 소스를 agnostic하게 처리
    - 각 modality $x_m$을 별도 encoder $\mathcal{E}_m$으로 latent vector $z_m$으로 인코딩
    - Concatenation $\tilde{z} = [z_1, \ldots, z_M]$ 후 projection → 통합 feature vector $z$
    - 이를 RQ-VAE quantization 입력으로 사용

#### Hierarchical Refinements in Quantization

- **Multi-Resolution Codebooks**
    - 기존: 균일 해상도 codebook → SID 공간이 넓고 희소
    - 개선: 상위 level일수록 고해상도, 하위 level로 갈수록 저해상도
    - Codebook cardinality: $2048 / 2^{level-1}$
    - -> 앞쪽 SID 토큰이 아이템을 더 굵게 분류하고, 뒤쪽 토큰은 잔차(residual)를 세밀하게 표현하는 구조

- **Progressive Masking**
    - 잔차 양자화 시 hierarchy를 강제하는 정규화 기법
    - Binary mask $m_l \in \{0,1\}$: $m_l = \mathbf{1}_{l < r}$, $r \in [1, L]$ 은 random integer
    - 학습 시 SID의 처음 $r$개 level만 선택적으로 사용
    - Quantized vector: $\hat{z} = \sum_{l=1}^{L} m_l e_l^*$
    - * 왜 이렇게 하는가: codebook 상위 level이 의미 있는 정보를 담도록 강제하여 계층 구조 완결성 확보

#### Co-occurrence Contrastive Regularization

- Item의 content feature만으로는 "user가 느끼는 유사성"을 충분히 포착하지 못함
- User behavior의 co-occurrence 신호를 SID 생성 단계에 직접 주입
    - 자주 함께 시청되는 영상 쌍 → 유사한 SID 표현
    - 함께 시청되지 않는 영상 → SID 표현 분리

$$\mathcal{L}_{con} = -\sum_{i=1}^{2N_b} \frac{\exp(\text{sim}(p_i, p_i^+))}{\sum_{j=1}^{2N_b} \exp(\text{sim}(p_i, p_j))}$$

- $p_i$: 배치 내 영상 표현, $p_i^+$: 영상 $i$와 co-occur한 영상의 표현
- -> CF-based item embedding을 직접 fuse하는 대신 contrastive objective로 유도하는 이유: CF 임베딩은 인기도 변화에 따라 동적으로 변해 quantizer 재학습이 필요해지기 때문

**최종 SID Training Loss:**
$$\mathcal{L} = \mathcal{L}_{recon} + \mathcal{L}_{rq} + \mathcal{L}_{con}$$

### 2. Continued Pre-training (CPT)

- **목표**: SID 토큰을 기존 LLM의 텍스트 토큰과 semantically grounded하게 align

**학습 데이터** (두 가지 소스 50:50 혼합):
- **User behavior data**: 유저 시청 이력 + watch feature (watch ratio, watch time 등)
    - 포맷: `<sid_1> <channel_name> <watch_ratio> <watch_time> <hours_since_final_watch> <sid_2> ... || <sid_n>`
- **Video metadata corpus**: SID와 텍스트 feature 연결
    - 포맷: `Video <sid> has title (en): <video_title>`
    - 토픽, description, ASR caption, 합성 데이터 포함

![[assets/Generative Retrieval의 프로덕션 적용 (PLUM) @Youtube/cpt-example-schema.png|423]]

**학습 규모**: 1M training steps, batch size 16, 총 약 **260B tokens**

**In-context Learning**
- CPT 이후 모델은 SID와 자연어를 혼합한 few-shot in-context learning 가능
- SID 입력 기반으로 자유형식 텍스트 생성도 가능
- * random init CPT는 SID와 텍스트 구분조차 못하는 반면, LLM init CPT는 문맥에 맞는 완성을 생성 → LLM의 general sequence processing 능력이 SID modality에도 전이됨

### 3. Generative Retrieval (SFT)

- CPT 모델을 바탕으로 Supervised Fine-Tuning (SFT)
- Autoregressive maximum-likelihood objective
- Ground-truth: 유저 로그에서 클릭된 영상의 SID 토큰

$$\mathcal{L}_{SFT} = -\sum_{t=1}^{L} r(\text{user}, v_{click}) \cdot \log P(\text{sid}_t | \text{Context}_\text{user}, \text{History}_\text{user}, \text{sid}_{<t})$$

- $r(\text{user}, v_{click})$: 클릭별 handcrafted reward signal
- 실제로는 reward 기반 example sampling 후 equal weight 적용

**입력 프롬프트**: SID 토큰 + numerical feature custom 토큰 + 텍스트 feature

**Inference**
- Beam search로 다수의 SID sequence 생성 → 후보 집합으로 활용
- 생성된 SID를 billions-scale corpus의 실제 영상으로 매핑
- Hallucination rate (SFT 이후): **< 5%**

---

## Experiments

### LEM 대비 Generative Retrieval 성능

- 모델: Gemini-1.5 MoE 계열의 **900M activated-param** PLUM
- Baseline (LEM+): production 최상위 Transformer 기반 retrieval 모델
    - LEM의 neural network 비율: **전체의 0.4%**, PLUM: **전체의 90%**
- 비교 방식: PLUM 추천을 candidate pool에 추가 후 LEM+ 대비 metric 변화 측정


![[assets/Generative Retrieval의 프로덕션 적용 (PLUM) @Youtube/plum-rem-comparison.png|246]]

- 추천 품질 비교 (PLUM/LEM 비율)

![[assets/Generative Retrieval의 프로덕션 적용 (PLUM) @Youtube/plum-lem-camprison-engagement.png|294]]

- Live A/B 결과 (LEM+ 대비)

**Sample Efficiency**
- PLUM 900M MoE: 하루 약 **250M examples** 학습
- 기존 LEM: 하루 수 billion examples 학습
- 학습 FLOPs: PLUM이 LEM 대비 **< 0.55x**

### SID-v2 Ablation

- SIDv1 vs SIDv2: Uniqueness 94.0% → 96.7%, VID Recall@10 12.3% → 14.4%
- Co-occurrence loss 제거 시 uniqueness와 recall 모두 가장 큰 하락 (91.8%, 12.6%)
- Multi-Resolution, Multi-Embedding 각각 제거해도 성능 하락 → 모든 변경사항이 기여

### CPT Ablation (2x2)

![[assets/Generative Retrieval의 프로덕션 적용 (PLUM) @Youtube/cpt-ablation.png|575]]

- 8th-day Recall@10 및 training loss vs training step. CPT 적용 모델이 훨씬 빠른 수렴
	- R1(random init, no CPT): 0.19 / R2(LLM init, no CPT): 0.23 / CR1(random init + CPT): 0.27 / CR2(LLM init + CPT): **0.28**
- CPT 유무 차이(R1 0.19 → CR1 0.27)가 LLM init 유무 차이(R1 0.19 → R2 0.23)보다 훨씬 큼 → CPT가 더 결정적인 요인

### Scaling Study

- Gemini-1.5 MoE 4종 (110M, 370M, 900M, 3B activated params)
- 입력: 1,536 tokens (최근 100회 시청 이력 포함), July 2025 YouTube 프로덕션 데이터

![[assets/Generative Retrieval의 프로덕션 적용 (PLUM) @Youtube/iso-flops-vs-loss.png|445]]

- Iso-FLOPS vs training/eval loss: power-law 상관관계. eval loss frontier가 training loss보다 훨씬 빠르게 대형 모델로 이동 → 대형 모델이 미래 데이터 일반화에 유리

![[assets/Generative Retrieval의 프로덕션 적용 (PLUM) @Youtube/iso-flops-vs-recall.png|407]]

- Iso-FLOPS vs Recall@10: 포화 징후 없이 계속 향상. MoE-110M도 4.24 epoch 학습해도 overfitting 없음


![[assets/Generative Retrieval의 프로덕션 적용 (PLUM) @Youtube/iso-flops-curves-computing-budget.png|466]]
- 고정 compute budget에서 최적 모델 크기: budget이 커질수록 최적 모델 크기가 대형 쪽으로 이동

**MoE-3B 한계**
- 고려한 compute budget 내에서 900M 대비 우위 미확인
- 배치 사이즈 제약(HBM 포화)으로 학습 예시 수 부족 (약 5B examples, 0.57 epoch)
- compute-optimal 학습을 위해 학습 예시 수와 모델 크기의 **동시 스케일링** 필요

---

💭
- CPT 없는 LLM init(R2=0.23)보다 CPT 있는 random init(CR1=0.27)이 더 좋다 - LLM의 world knowledge보다 domain-specific pre-training 자체가 더 결정적임을 시사
- Hallucination rate < 5% -> 유튜브 규모를 봤을 때 5%는 작은 수치가 아니긴 함
- MoE-3B가 900M보다 좋지 않은 결과의 경우, 현재 실험 범위 내에서는 scaling law가 불완전하게 검증된 것으로 보임