---
publish: true
title: Meta-Learning + Fuzzy Logic 기반 Cold Start 추천
created: 2026-05-05
modified: 2026-05-09T15:28:06.235+09:00
published: 2026-05-09T15:28:06.235+09:00
tags:
  - cold-start
  - music-rec
  - recsys
---

> [Cold-Start Music Recommendation Using Meta-Learning and Fuzzy Logic: A Hybrid Approach](https://www.jisem-journal.com/index.php/journal/article/view/10370) (2025)

> [!note]
> MAML 기반 메타러닝과 퍼지 로직을 결합한 프로토타입 아키텍처로 cold start 추천 (Music)

## Background

- **Cold-start 문제**: 신규 유저(user cold-start), 신규 아이템(item cold-start), 시스템 초기화(system cold-start) 세 가지 유형
- 음악 도메인의 특수성
  - 선호도가 주관적, 맥락 의존적(기분, 시간대, 활동)
  - 단기 변동성과 장기 일관성 공존
  - 장르, 음향 특성, 아티스트, 가사, 사회적 맥락 등 다차원 요인
- **LFM-2b 데이터셋**: Last.fm 12만 유저의 20억+ 청취 이벤트 (2005.02~2020.03)
- 기존 접근의 한계
  - 협업 필터링: 인터랙션 히스토리 없으면 동작 불가
  - 콘텐츠 기반: 콜드스타트 아이템엔 유용하나 유저 적응 부족
  - 메타러닝(MeLU): user cold-start만 처리, 콘텐츠 통합 미흡
  - 퍼지 로직(기존): cold-start에 적용 안 됨, 딥러닝과 미통합

## Method

### 문제 정의

- 유저 집합 $U$, 아이템 집합 $I$에 대해 선호도 점수 $r\_{u,i}$ 예측
- Cold-start: $|D\_u|$(유저 인터랙션 수)가 매우 작거나 0인 상황
- 아이템 피처 $f\_i \in \mathbb{R}^d$: 음향 특성, 장르, 메타데이터
- LFM-2b에서 $r\_{u,i}$는 play count (implicit feedback)

---

### 3.2 Meta-Learning Framework (MAML 기반)

![[assets/Meta-Learning + Fuzzy Logic 기반 Cold Start 추천/maml.png|393]]

- 각 유저를 하나의 태스크로 보고 MAML 2중 루프로 학습

- Global init → 유저별 적응 → 메타 업데이트

- **Inner loop (adaptation)**: 유저별 파라미터 적응
  $$\theta\_u = \theta - \alpha \nabla\_\theta \mathcal{L}(D\_u; \theta)$$

- **Outer loop (meta-update)**: 글로벌 파라미터 갱신
  $$\theta \leftarrow \theta - \beta \nabla\_\theta \sum\_{u \in U} \mathcal{L}(D\_u'; \theta\_u)$$

- 음악 도메인 inductive bias: 장르 일관성, 아티스트 친숙도, 음향 유사성에 집중하는 attention 메커니즘 추가

- 신규 유저에게 몇 번의 gradient update만으로 적응 (≤5 steps)

---

### 3.3 Fuzzy Logic Integration

![[assets/Meta-Learning + Fuzzy Logic 기반 Cold Start 추천/fuzzy-logic.png|460]]

- 선호도를 binary가 아니라 fuzzy membership degree로 표현
- $K$개의 선호 차원(장르 친화도, 음향 선호도 등)에 대한 멤버십 함수 $\mu\_k: \mathbb{R}^d \to \[0,1]$
- 유저 퍼지 프로파일: $P\_u = \[\omega\_{u,1}, \omega\_{u,2}, ..., \omega\_{u,K}]$ (차원별 중요도)
- 퍼지 선호도 점수:
  $$\hat{r}^F\_{u,i} = \sum\_{k=1}^K \omega\_{u,k} \cdot \mu\_k(f\_i)$$
- 멤버십 함수 초기화 (Bell 함수 형태):
  $$\mu\_k(f\_i) = \frac{1}{1 + \left(\frac{||f\_i - c\_k||}{a\_k}\right)^{2b\_k}}$$
  - $c\_k$: 중심, $a\_k$: 폭, $b\_k$: 형태 파라미터 (메타트레이닝 시 학습, 유저 적응 시 fine-tune)
- 멤버십 함수와 선호 프로파일 파라미터 모두 meta-learn하여 cold-start에서 빠른 적응 가능

---

### 3.4 Prototype-Based Architecture

![[assets/Meta-Learning + Fuzzy Logic 기반 Cold Start 추천/hybrid-with-prototype.png]]

- **User Prototype**: $K$개의 프로토타입 $P\_U = {p\_1^U, ..., p\_K^U}$
  - 유저 임베딩 $e\_u$의 soft assignment:
    $$s\_u^j = \frac{\exp(-d(e\_u, p\_j^U)/\tau)}{\sum\_l \exp(-d(e\_u, p\_l^U)/\tau)}$$
  - 프로토타입 다양성 regularization: $\mathcal{L}_{div} = -\sum\_j \sum_{l \neq j} d(p\_j^U, p\_l^U)$
  - Cold-start 유저는 소수 인터랙션 + 인구통계 정보로 프로토타입 할당 추론
- **Item Prototype**: $L$개의 프로토타입 $P\_I$; 콘텐츠 피처 기반 클러스터링으로 초기화
  - 신규 아이템은 콘텐츠 피처만으로 프로토타입 할당 가능
- **최종 점수 예측** (3가지 컴포넌트 가중 합산):
  - User-based: $r^U\_{u,i} = \sum\_j s\_u^j \cdot w\_j^U \cdot e\_i$
  - Item-based: $r^I\_{u,i} = e\_u \cdot \sum\_j s\_i^j \cdot w\_j^I$
  - Fuzzy: $r^F\_{u,i} = \sum\_k \omega\_{u,k} \cdot \mu\_k(f\_i)$
  - $$\hat{r}_{u,i} = \lambda\_1 r^U_{u,i} + \lambda\_2 r^I\_{u,i} + \lambda\_3 r^F\_{u,i}$$
  - $\lambda\_1, \lambda\_2, \lambda\_3$: 학습 가능 파라미터 (cold-start 상황에 따라 기여도 조절)

---

### 3.5 학습 과정

1. **Pretraining**: 아이템 피처 네트워크, fuzzy c-means로 프로토타입 초기화, 충분한 히스토리 보유 유저로 퍼지 멤버십 함수 사전학습
2. **Meta-Training**: MAML 프레임워크로 support set → 적응 → query set 평가
3. **Joint Optimization**:
   $$\mathcal{L}_{total} = \mathcal{L}_{pred} + \lambda\_P \mathcal{L}_{proto} + \lambda\_F \mathcal{L}_{fuzzy} + \lambda\_R \mathcal{L}\_{reg}$$
   - $\mathcal{L}\_{proto}$: 다양성 + 응집성
   - $\mathcal{L}\_{fuzzy}$: 퍼지셋 overlap 제어 + smooth 멤버십 함수 유도

## Experiments

### 데이터셋

- LFM-2b 서브셋: 유저 10,000명, 트랙 50,000개, 인터랙션 5,231,457건 (sparsity 98.95%)
- Cold-start 시뮬레이션: 20% 유저/아이템을 cold-start로 설정, N/M = 1, 3, 5, 10 인터랙션 조건

### 베이스라인

- MF, NeuMF, NGCF (그래프 기반)
- CMeLU (콘텐츠 인식 메타러닝), ProtoMF (프로토타입 MF), CFSM (few-shot 메타러닝)

### 평가 지표

- NDCG@5/10, HR@5/10, MAE, Coverage, Diversity

### 구현 상세

- PyTorch, NVIDIA Tesla V100 32GB
- Adam optimizer (lr=0.001, meta-lr=0.01)
- 임베딩 차원 64, 유저 프로토타입 20개, 아이템 프로토타입 30개, 퍼지 차원 8개
- Inner loop α=0.1, meta-learning β=0.001, 100 epochs (early stopping)

### 결과

**User Cold-Start** (주요 수치):

- Ours: NDCG@5=0.2101, HR@10=0.4789, MAE=0.6271
- Best baseline (CFSM): NDCG@5=0.1824, HR@10=0.4256
- **NDCG@5 +15.2%, HR@10 +12.5%**

**Item Cold-Start**:

- Ours: NDCG@5=0.1714, MAE=0.6824
- Best baseline (CFSM): NDCG@5=0.1521, MAE=0.7712

**Ablation Study**:

- Fuzzy Logic 제거 시 NDCG@5 -7.9%
- Meta-Learning 제거 시 NDCG@5 -12.9%
- Prototype 제거 시 NDCG@5 -11.4%
- 각 컴포넌트 모두 유의미하게 기여

**Coverage & Diversity**:

- Coverage 61.5% (ProtoMF 56.8% 대비 +8.3%)
- Diversity 0.397 (ProtoMF 0.362 대비 +9.7%)

**예시**:

- 3개 인터랙션(jazz, electronic, rock) 보유 신규 유저 → fuzzy 벡터 \[0.65, 0.58, 0.40, ...]
- Top-5 추천: jazz 3개 + electronic 2개, 모두 후속 positive 피드백

---

💭 메타러닝의 계산 비용(매 유저마다 gradient update 필요)이 서빙 병목이 될 수 있음 -  오프라인 pre-computation 전략 필요
