---
publish: true
title: Generative Retrieval의 프로덕션 적용 (PLUM) @Youtube
created: 2025-11-10
modified: 2026-03-24T18:52:52.901+09:00
published: 2026-03-24T18:52:52.901+09:00
tags:
  - "#recsys"
  - "#generative-recsys"
cssclasses: ""
---


> [PLUM: Adapting Pre-trained Language Models for Industrial-scale Generative Recommendations](https://arxiv.org/abs/2510.07784) (2025)

## 배경

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

## PLUM Framework

1. **Item Tokenization** (Semantic IDs)
2. **Continued Pre-training (CPT)**
3. **Task-specific Fine-tuning** (Generative Retrieval)


![[assets/Generative Retrieval의 프로덕션 적용 (PLUM) @Youtube/generative-retrieval.png|497]]
- Generative Retrieval 전체 흐름: SID 토큰, 텍스트, numerical feature 토큰이 혼합된 입력 프롬프트 → 다음 영상의 SID를 decoder-only LLM이 autoregressive 생성

---

## 1. Semantic IDs (SID-v2)

기존 TIGER/RQ-VAE 기반 SIDv1 ([[note/Semantic IDs, Generative Retrieval (TIGER)]] ) 을 개선한 **SID-v2** 제안

![[assets/Generative Retrieval의 프로덕션 적용 (PLUM) @Youtube/semantic-ids.png|604]]

- SID 모델 구조: multi-modal 영상 임베딩 → 인코딩 → Residual Quantizer → quantized ID
- 학습 목표: 원본 임베딩 reconstruction + co-occurrence contrastive loss

### 1.1 Fused Multi-Modal Content Representation

- 기존 single content embedding의 한계: 텍스트, 영상, 오디오 등 다양한 정보를 단일 모달로 커버 불가
- 솔루션: 여러 임베딩 소스를 agnostic하게 처리
    - 각 modality $x_m$을 별도 encoder $\mathcal{E}_m$으로 latent vector $z_m$으로 인코딩
    - Concatenation $\tilde{z} = [z_1, \ldots, z_M]$ 후 projection → 통합 feature vector $z$
    - 이를 RQ-VAE quantization 입력으로 사용

### 1.2 Hierarchical Refinements in Quantization

- **Multi-Resolution Codebooks**
    - 기존: 균일 해상도 codebook → SID 공간이 넓고 희소
    - 개선: 상위 level일수록 고해상도, 하위 level로 갈수록 저해상도
    - Codebook cardinality: $2048 / 2^{level-1}$
    - -> 즉, 앞쪽 SID 토큰이 아이템을 더 굵게 분류하고, 뒤쪽 토큰은 잔차(residual)를 세밀하게 표현하는 구조

- **Progressive Masking**
    - 잔차 양자화 시 hierarchy를 강제하는 정규화 기법
    - Binary mask $m_l \in \{0,1\}$을 정의: $m_l = \mathbf{1}_{l < r}$, $r \in [1, L]$ 은 random integer
    - 학습 시 SID의 처음 $r$개 level만 선택적으로 사용
    - Quantized vector: $\hat{z} = \sum_{l=1}^{L} m_l e_l^*$
    - * 왜 이렇게 하는가: codebook 상위 level이 의미 있는 정보를 담도록 강제하여 계층 구조 완결성 확보

### 1.3 Co-occurrence Contrastive Regularization

- Item의 content feature만으로는 "user가 느끼는 유사성"을 충분히 포착하지 못함
- User behavior의 co-occurrence 신호를 SID 생성 단계에 직접 주입
    - 자주 함께 시청되는 영상 쌍 → 유사한 SID 표현
    - 함께 시청되지 않는 영상 → SID 표현 분리

$$\mathcal{L}_{con} = -\sum_{i=1}^{2N_b} \frac{\exp(\text{sim}(p_i, p_i^+))}{\sum_{j=1}^{2N_b} \exp(\text{sim}(p_i, p_j))}$$

- $p_i$: 배치 내 영상 표현, $p_i^+$: 영상 $i$와 co-occur한 영상의 표현
- -> CF-based item embedding을 직접 fuse하는 대신 contrastive objective로 유도하는 이유: CF 임베딩은 인기도 변화에 따라 동적으로 변해 quantizer 재학습이 필요해지기 때문

**최종 SID Training Loss:**
$$\mathcal{L} = \mathcal{L}_{recon} + \mathcal{L}_{rq} + \mathcal{L}_{con}$$

---

## 2. Continued Pre-training (CPT)

### 목표
- SID 토큰을 기존 LLM의 텍스트 토큰과 semantically grounded하게 align

### 학습 데이터
두 가지 소스 50:50 혼합:

- **User behavior data**: 유저 시청 이력 + watch feature (watch ratio, watch time 등)
    - 포맷: `<sid_1> <channel_name> <watch_ratio> <watch_time> <hours_since_final_watch> <sid_2> ... || <sid_n>`
- **Video metadata corpus**: SID와 텍스트 feature 연결
    - 포맷: `Video <sid> has title (en): <video_title>`
    - 토픽, description, ASR caption, 합성 데이터 포함

### 학습 규모
- 1M training steps, batch size 16
- 총 약 **260B tokens**

### In-context Learning
- CPT 이후 모델은 SID와 자연어를 혼합한 few-shot in-context learning 가능
- SID 입력 기반으로 자유형식 텍스트 생성도 가능

---

## 3. Generative Retrieval (SFT)

### 학습 방식
- CPT 모델을 바탕으로 Supervised Fine-Tuning (SFT)
- Autoregressive maximum-likelihood objective
- Ground-truth: 유저 로그에서 클릭된 영상의 SID 토큰

$$\mathcal{L}_{SFT} = -\sum_{t=1}^{L} r(\text{user}, v_{click}) \cdot \log P(\text{sid}_t | \text{Context}_\text{user}, \text{History}_\text{user}, \text{sid}_{<t})$$

- $r(\text{user}, v_{click})$: 클릭별 handcrafted reward signal
- 실제로는 reward 기반 example sampling 후 equal weight 적용

### 입력 프롬프트 구성
- SID 토큰 + numerical feature를 위한 custom 토큰 + 텍스트 feature
- 자연어 텍스트는 pre-trained LLM이 그대로 처리 가능한 이점 활용

### Inference
- Beam search로 다수의 SID sequence 생성 → 후보 집합으로 활용
- 생성된 SID를 billions-scale corpus의 실제 영상으로 매핑
- Hallucination rate (SFT 이후): **< 5%**

---

## 4. 실험 결과

### 4.1 LEM 대비 Generative Retrieval 성능

- 모델: Gemini-1.5 MoE 계열의 **900M activated-param** PLUM
- Baseline: production LEM (Transformer 기반이나 파라미터 대부분이 embedding layer)
    - LEM의 neural network 비율: **전체의 0.4%**
    - PLUM의 neural network 비율: **전체의 90%**

[Table 2]

| Metric | LFV | Shorts |
|---|---|---|
| Effective Vocab Size | 13.24x | 2.60x |
| CTR | 1.33x | 1.42x |
| WT/View | 1.13x | 0.72x |
| WF/View | 1.03x | 1.32x |

- Effective Vocab Size: 95% impressions를 커버하는 unique 영상 수 → PLUM이 훨씬 다양한 롱테일 추천
- CTR, watch time 등 user engagement 지표에서도 competitive

**Live A/B 실험 (Table 3):**

| Metric | LFV | Shorts |
|---|---|---|
| Engaged Users | +0.07% | +0.28% |
| Panel CTR | +0.76% | +4.96% |
| Views | +0.80% | +0.39% |
| Satisfaction | +0.06% | +0.39% |

**Sample Efficiency:**
- PLUM 900M MoE: 하루 약 **250M examples** 학습
- 기존 LEM: 하루 수 billion examples 학습
- 학습 FLOPs: PLUM이 LEM 대비 **< 0.55x**

### 4.2 SID-v2 Ablation

[Table 4]

| SID Model | SID Uniqueness | VID Recall@10 |
|---|---|---|
| SIDv1 (Baseline) | 94.0% | 12.3% |
| SIDv2 (Ours) | 96.7% | 14.4% |
| Ablate Multi-Resolution | 94.8% | 13.2% |
| Ablate Multi-Embedding | 96.9% | 12.8% |
| Ablate Co-occurrence | 91.8% | 12.6% |

- Co-occurrence contrastive loss 제거 시 SID uniqueness와 recall 모두 가장 큰 하락
- 모든 변경사항이 기여

### 4.3 CPT의 효과 (2x2 Ablation)

| 모델 | Pre-trained LLM | CPT | Recall@10 (Day 8) |
|---|---|---|---|
| R1 | No | No | 0.19 |
| R2 | Yes | No | 0.23 |
| CR1 | No | Yes | 0.27 |
| CR2 | Yes | Yes | **0.28** |

[Figure 3]
- CPT 적용 모델이 훨씬 빠른 수렴 → 학습 효율성 향상
- Pre-trained LLM 초기화도 일관되게 성능 향상 (자연어 이해 능력 또는 general sequence processing 능력이 추천에도 유용)

### 4.4 Scaling Study

- 모델: Gemini-1.5 MoE 4종 (110M, 370M, 900M, 3B activated params)
- 데이터: YouTube 프로덕션, 2025년 7월 7일치 데이터, Day 8 평가
- 입력: 1,536 tokens, 최근 100회 시청 이력 포함

**주요 발견:**
- Training/Evaluation loss와 Iso-FLOPS 간 **power-law** 상관관계 존재
- Evaluation loss frontier가 training loss보다 훨씬 빠르게 큰 모델로 이동 → 대형 모델이 미래 데이터에 더 잘 일반화
- Evaluation Recall@10은 포화 징후 없이 계속 향상
- 소형 모델(110M)은 4.24 epoch 학습에도 overfitting 없음

**MoE-3B 한계:**
- 고려한 compute budget 내에서 900M 대비 우위 미확인
- 배치 사이즈 제약(HBM 포화)으로 학습 예시 수 부족 (~5B examples, 0.57 epoch)
- Compute-optimal 학습을 위해 학습 예시 수와 모델 크기의 **동시 스케일링** 필요

---

## 프로덕션 서빙

- YouTube LFV (Long Form Video)와 Shorts 모두 적용
- Online 및 offline inference 방식으로 서빙
- Large embedding table 없이 구축된 YouTube 최초의 neural retrieval 모델
- SID→영상 매핑의 collision은 낮게 유지 (SID uniqueness 96.7%)
