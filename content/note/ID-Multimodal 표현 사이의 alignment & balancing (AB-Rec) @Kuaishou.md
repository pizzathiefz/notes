---
publish: true
title: ID-Multimodal 표현 사이의 alignment & balancing (AB-Rec) @Kuaishou
created: 2026-04-05
modified: 2026-04-13T23:36:54.717+09:00
published: 2026-04-13T23:36:54.717+09:00
tags:
  - recsys
  - representation-learning
  - multimodal
---

> [Aligning and Balancing ID and Multimodal Representations for Recommendation](https://doi.org/10.1145/3711896.3737275) (2025)

> [!note]
> ID 표현과 Multimodal 표현 사이의 분포 불일치와 최적화 불균형을 Wasserstein 정렬 + Gradient Modulation으로 해결한 AB-Rec 프레임워크를 제안
>
> - 기존의 단순 ID+MM 결합은 오히려 ID-only보다 성능이 떨어지는 경우가 있었는데, 이를 distribution conflict와 convergence rate 차이라는 두 가지 원인으로 진단
> - Gradient Modulation이 Distribution Alignment보다 더 큰 성능 기여를 함
> - cold-start 구간에서도 개선 효과가 뚜렷하여, ID 피처가 부족한 상황을 MM이 보완하는 시너지를 설계 수준에서 실현함

## Background

- 대규모 산업 추천 시스템은 sparse ID 피처에 의존
  - 강력한 fitting 능력으로 user-item 패턴을 하지만, 아이템의 semantic content를 포착하지 못함
  - -> long-tail 아이템, data sparsity, cold-start 문제에 취약
- 멀티모달 정보(이미지, 텍스트)를 ID와 결합하면 성능 향상이 기대되지만, 두 가지 핵심 문제가 존재

![[assets/ID-Multimodal 표현 사이의 alignment & balancing (AB-Rec) @Kuaishou/problems.png|636]]

**문제 1: Distribution Discrepancy**
(a)(b)

- item 표현 공간과 user-item pair 표현 공간에서 ID와 MM의 분포를 t-SNE로 시각화
- MM 표현 (파랑)과 ID 표현 (주황)이 완전히 다른 클러스터에 분리되어 있음 → 단순 결합 시 user-item mismatch 발생
- MM 표현: 풍부한 semantic 정보 (visual + textual) ↔️ ID 표현: memory-based matching 패턴 저장

**문제 2: Optimization Imbalance**
(c)(d)

- ID-only vs MM-only 수렴 속도 비교 / ID+MM 결합 시 MM 기여도 추이
- ID는 1 epoch 내에 수렴하는 반면 MM은 지속적으로 느리게 수렴 → ID+MM에서 ID가 그래디언트를 독차지하고, MM이 under-optimize됨

## Method

![[assets/ID-Multimodal 표현 사이의 alignment & balancing (AB-Rec) @Kuaishou/architecture.png|501]]

- **AB-Rec**
  - MLLM(freeze)로 MM 임베딩 생성 → BackBone1(ID)과 BackBone2(MM)를 각각 학습 → 2-Wasserstein alignment + Gradient Modulation 적용 → BCE loss

### MLLM Fine-tuning (Multimodal Representation Generation)

- Backbone: Qwen2VL-2B (freeze)
- 특수 토큰 `[Item_cls]`를 입력 끝에 추가, 해당 hidden state를 아이템 임베딩으로 사용

$$\mathbf{e}^{mm}\_i = MMEnc(m^v\_i, m^t\_i)$$

- 추천 태스크 특화 fine-tuning 3가지:
  1. **Multimodal Content Alignment**: 입력 텍스트의 20%를 `[MASK]`로 가림 + 이미지 정보 → 원본 텍스트 재구성 (BERT-style). visual-text 간 관계를 학습하도록 유도
  2. **Metadata Processing**: structured metadata(제목, 가격, 태그 등)를 입력 → detailed 텍스트 설명 생성. 아이템 메타데이터 이해력 강화
  3. **Multimodal Robustness**: textual + 이미지 토큰 일부를 masking한 입력 → 완전한 MM 표현 재구성. data augmentation 효과, 일반화 능력 향상

- 유저 MM 표현 = 최근 k개 상호작용 아이템 MM 임베딩의 평균:

$$\mathbf{e}^{mm}_u = \frac{1}{k} \sum_{j \in \mathcal{I}\_u} \mathbf{e}^{mm}\_j$$

### Distribution Alignment

- ID 브랜치: $\mathbf{h}^{id} = f(\mathbf{e}^{id} = \[\mathbf{e}^{id}\_u, \mathbf{e}^{id}\_i]; \theta^{id})$
- MM 브랜치: $\mathbf{h}^{mm} = g(\mathbf{e}^{mm} = \[\mathbf{e}^{mm}\_u, \mathbf{e}^{mm}\_i]; \theta^{mm})$
- 배치 내 두 분포 간 [[Wasserstein Distance|2-Wasserstein 거리]] 최소화:

$$W\_2^2(H^{id}, H^{mm}) = |\mu^{id} - \mu^{mm}|^2 + \text{Tr}\left(\Sigma^{id} + \Sigma^{mm} - 2(\Sigma^{id}\Sigma^{mm})^{1/2}\right)$$

- 동시에 같은 user-item pair의 ID-MM 표현 간 코사인 거리를 최대화 → **representation collapse 방지**
  - Wasserstein 거리만 최소화하면 두 표현이 완전히 동일해질 수 있음. 이 경우 MM 표현이 ID의 복제가 되어 버려 complementary 정보를 잃음
  - 즉 두 표현이 분포는 비슷해지되, 같은 쌍에 대해서는 서로 다른 정보를 담게

- 전체 alignment loss:

$$\mathcal{L}_{align} = \alpha \cdot \frac{1}{n\_b}\sum_{k=1}^{n\_b} \frac{2}{1 + e^{W\_2^2(H^{id}\_k, H^{mm}_k)}} + \beta \cdot \frac{1}{2N}\sum_{i=1}^{N}(1 - \cos(\mathbf{h}^{id}\_i, \mathbf{h}^{mm}\_i))$$

### Gradient Modulation

- 각 표현의 contribution score (단독 예측 기여도):

$$s = y \cdot p + (1-y) \cdot (1-p), \quad p = \sigma(W \cdot f(\mathbf{e}; \theta) + b/2)$$

- ID vs MM contribution 차이 비율:

$$\gamma^{id}_t = \frac{\sum_{x\_i \in \mathcal{B}\_t} s^{id}_i}{\sum_{x\_i \in \mathcal{B}\_t} s^{mm}\_i}$$

- $\gamma^{id}\_t > 1$ (ID가 지배적일 때) ID의 gradient를 scale-down:

$$\omega\_t = \begin{cases} 1 - \tanh(\eta \cdot \gamma\_t), & \gamma\_t > 1 \ 1, & \text{others} \end{cases}$$

- 업데이트 규칙: $\theta\_{t+1} = \theta\_t - \kappa \cdot \omega\_t \cdot \nabla\_\theta \tilde{L}(\theta\_t)$
- -> 즉, ID가 MM보다 훨씬 많이 기여하고 있는 epoch에서는 **ID의 학습 속도를 줄여 MM이 따라잡을 수 있도록 함**. adaptive한 learning rate 조절과 유사한 효과

## Experiments

**데이터셋 및 설정**

- Baby(19K users, 7K items), Sports(35K, 18K), Electronics(192K, 63K), Industrial(KuaiShou 실 서비스, 174K users, 610K items, 6M interactions)
- MLLM fine-tuning: Qwen2VL-2B, 5 epochs, batch 128, 8×A100
- AB-Rec 추론: RTX 4090, TensorFlow 2.9.0, Adam optimizer
- 하이퍼파라미터 탐색: α, β, η ∈ {0.1, ..., 1.0}, batch ∈ {256, 512, 1024, 2048}, lr ∈ {1e-3, 1e-4, 1e-5}
- 평가 지표: AUC (높을수록 좋음), LogLoss (낮을수록 좋음), Recall@K

**Zero-Shot MM 표현 품질 평가**
![[assets/ID-Multimodal 표현 사이의 alignment & balancing (AB-Rec) @Kuaishou/zero-shot-rec-result.png|467]]

- 추천 모델 없이 임베딩 유사도만으로 추천했을 때 결과를 본 것
  - 유저의 이력으로 MM 표현 만들고 마지막 실제 아이템을 맞히는지
- Traditional(CNN+Transformer), untuned MLLM, AB-Rec(fine-tuned MLLM) 비교
- AB-Rec이 R@20, R@50 모두에서 압도적으로 우위 (예: Baby R@20: 0.0052 → 0.0140 → 0.0276)
- fine-tuning 전 MLLM 대비도 크게 개선 → 3가지 alignment task가 추천 특화 표현 품질을 실질적으로 향상

**다양한 Backbone 비교**

![[assets/ID-Multimodal 표현 사이의 alignment & balancing (AB-Rec) @Kuaishou/backbone-comparison.png|400]]

- MLP, DCN, Fibinet, AutoInt 4가지 backbone에서 ID / MM / ID+MM / AB-Rec 비교
- AB-Rec이 모든 backbone에서 최고 성능 달성
- 소규모 데이터셋(Baby, Sports)에서는 ID+MM이 ID보다 낮은 경우도 있음 → 데이터가 적을수록 분포 충돌이 더 심각

**SOTA 방법 비교**

![[assets/ID-Multimodal 표현 사이의 alignment & balancing (AB-Rec) @Kuaishou/sota-methods-comparison.png|379]]

- VBPR, FREEDOM, BM3, AlignRec vs AB-Rec
- 4개 데이터셋 모두에서 AUC, LogLoss 최고 성능
- Industrial AUC: AlignRec 0.8253 → AB-Rec **0.8300** (+0.0047)

**Ablation Study**
![[assets/ID-Multimodal 표현 사이의 alignment & balancing (AB-Rec) @Kuaishou/ablation.png|418]]

- DA 제거(-DA): AUC 소폭 하락
- CR 제거(-CR): AUC 소폭 하락
- GM 제거(-GM): **AUC 가장 큰 폭 하락**
- -> Gradient Modulation이 Distribution Alignment보다 성능에 더 중요한 역할. optimization imbalance가 distribution discrepancy보다 더 근본적인 문제임을 시사

**심화 분석**
![[assets/ID-Multimodal 표현 사이의 alignment & balancing (AB-Rec) @Kuaishou/comprehensive-analysis.png|635]]

Bucket Testing

- G1(고빈도) ~ G5(저빈도) 아이템 그룹별 AUC
- cold-start(G5) 구간에서 ID-only는 낮은 성능, MM-only가 상대적으로 강세
- AB-Rec은 전 구간에서 최고 성능, 특히 G5에서 격차가 두드러짐

Hyperparameter

- α=0.25, β=0.7, η=0.6이 최적
- η(Gradient Modulation 강도) 변화에 의한 AUC 변동폭 > α, β 변화에 의한 변동폭 → GM 모듈의 sensitivity가 더 높음

Convergence

- AB-Rec의 MM 기여도 곡선이 ID+MM 대비 훨씬 빠르게 수렴하고 높은 AUC 도달
- GM이 수렴 속도 불균형을 효과적으로 해소함을 시각적으로 확인

Representation Visualization

- AB-Rec 학습 후 ID-MM 표현의 분포가 Figure 1(b) 대비 훨씬 가깝게 정렬됨
- Distribution Alignment 효과 시각적 검증

**온라인 A/B 테스트**
![[assets/ID-Multimodal 표현 사이의 alignment & balancing (AB-Rec) @Kuaishou/online-result.png|501]]

- KuaiShou 비디오 플랫폼 실서비스 A/B 테스트
- 단순 +MM 대비 AB-Rec이 전 지표에서 압도
- short view는 두 방법 모두 소폭 감소 (-0.235%, -0.160%) → long-form 콘텐츠 소비 품질 향상에 집중되는 효과
