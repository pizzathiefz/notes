---
publish: true
title: Engagement-Aware & MoE-Enhanced Transformers @Amazon Prime Video
created: 2026-01-09
modified: 2026-01-13T22:35:56.000+09:00
published: 2026-01-13T22:35:56.000+09:00
tags:
  - recsys
  - sequential-rec
cssclasses: ""
---

> [Beyond Immediate Click: Engagement-Aware and MoE-Enhanced Transformers for Sequential Movie Recommendation](https://dl.acm.org/doi/10.1145/3705328.3748076)

- 비디오 스트리밍 서비스에서 sequential recommendation system이 겪는 문제
	- 유저별로 최적화되지 않은 negative sampling 전략 (단순 랜덤 또는 인기도 기반) = 모델이 false positive를 식별하는 능력을 저해함
	- 고정된 유저 이력 컨텍스트 길이를 사용 = 모델이 유저의 단기적 요구와 일관된 관심사를 모두 만족시키는 아이템을 찾기 어려워짐
	- 완료율보다도 클릭율을 과도하게 우선시 = 즉각적인 다음 아이템 예측에만 국한되는 시스템을 만들게 됨

## Methodology

### Personalized Hard Negative-aware Sampling (PHNS)
- 유저별 아이템 시청시 완료율(engagement signal)에 기반해서 개인화된 hard negative sample을 뽑음
	- 완료율이 낮은 아이템은 유저가 시청하다가 포기한 콘텐츠를 의미하여 모델이 더 어려운 부정 샘플을 잘 구분할 수 있게 함
	- 완료율 = 전체 런타임 중 유저가 본 시간의 비율 (기준: 0.05 이하)
- pools
	- **User-specific Hard Negatives**: 사용자가 부분적으로 시청하고 포기한 콘텐츠
	- **Globally Trending Negatives**: 전역적으로 인기가 많지만 사용자가 상호작용하지 않은 콘텐츠.
	- **Globally Tailing Negatives**: 전역적으로 인기가 적고 사용자가 상호작용하지 않은 콘텐츠.


![[assets/engagement-aware & moe-enhanced transformers @amazon prime video/overview.png|650]]


###  Adaptive Context-aware Mixture of Experts (MoE) Architecture
- (1) **Embedding Layers**
	- 사용자 특징, 범주형 특성, 컨텍스트 신호, 수치 입력, 콘텐츠 임베딩을 위한 공유 임베딩 레이어 (모든 experts가 이 임베딩을 공유)
	- 콘텐츠 특징은 dense 임베딩 공간으로 매핑되며, 각 특징 임베딩 $\mathbf{e}_i = E_i(\mathbf{f}_i)$는 concat되어 통합된 콘텐츠 표현 $\mathbf{t} = [\mathbf{e}_1, \mathbf{e}_2, \dots, \mathbf{e}_k]$를 형성
- (2) **Behavioral Sequential Transformer**
	- 주어진 사용자 상호작용 시퀀스 $\mathbf{X} = [\mathbf{x}_1, \mathbf{x}_2, \dots, \mathbf{x}_L]$ (여기서 $\mathbf{x}_t = [\mathbf{t}_t + \mathbf{p}_t]$는 콘텐츠 임베딩과 positional 임베딩의 concat)를 입력으로 받아 트랜스포머 인코더를 거친 contextualized sequence representation $\mathbf{H}$ 얻음
	- 최종 사용자 시퀀스 표현 $\mathbf{h}_{\text{user}}$는 attention pooling을 통해 얻어짐
		- $\mathbf{h}_{\text{user}} = \sum_{t=1}^L \alpha_t \mathbf{h}_t$ , $\alpha_t = \frac{\exp(\mathbf{w}^T \mathbf{h}_t)}{\sum_{t'} \exp(\mathbf{w}^T \mathbf{h}_{t'})}$ 
- (3) **Mixture-of-Experts Module**
	- 각 expert는 특정 시간 스케일의 사용자 입력 시퀀스를 처리하도록 특화
		- **Short-term Expert**: 최근 상호작용에 초점을 맞춰 사용자의 즉각적인 의도와 단기 선호도를 파악
		- **Mid-term Expert**: 장기적인 기간 동안의 사용자 숨겨진 관심사(예: 장르 선호도 변화)를 발견
		-  **Long-term Expert (optional)**: 수개월 또는 수년간 지속되는 선호 장르, 일관된 콘텐츠 선택 등 보다 영구적인 패턴을 학습
- (4) **Adaptive Gating Network**
	- 사용자 상호작용을 가장 적합한 expert에 라우팅
		- MLP로 구현되어 사용자 임베딩과 expert별 시퀀스 표현을 입력으로 받아 expert 라우팅 로짓을 생성 
		- expert 선택 확률은 Softmax 활성화 함수를 사용하여 계산
		- $$ \alpha_{u,e} = \frac{\exp((z_{u,e} + \epsilon)/\tau)}{\sum_{j=1}^E \exp((z_{u,j} + \epsilon)/\tau)} $$
		- 여기서 $z_{u,e}$는 게이팅 로짓, $\epsilon$은 가우시안 노이즈, $\tau$는 온도 매개변수
		- expert collapse를 방지하기 위해 entropy regularization 항 $L_{\text{entropy}} = (H(\alpha_u) - H^*)^2$을 도입
		- 최종 사용자 표현은 전문가 출력의 가중 합으로 계산됨 $\mathbf{u}_{\text{MoE}} = \sum_{e=1}^E \alpha_{u,e} \mathbf{h}_{u,e}$.


### Multitask Learning for Joint Optimization with Engagement-aware Personalized Loss
- CTR만을 최적화해서 clickbait bias로 이어지는 경향을 막고 CTR과 engagement의 균형을 맞추기 위해 MTL 프레임워크 제안 + 완료율을 유저별 가중치 요소로 사용하는 loss 제안
- Multi-Tasks
	- CTR Prediction
	- Ranking Optimization (참여도, 관련성이 높은 콘텐츠가 높은 우선순위가 되도록 constrastive loss)
	- Complete Rate Prediction (regression) -> 이건 보조 신호로 사용
- Engagement-aware Personalized Loss
	- $W_{u,i} = 1 + \alpha (c_{u,i} - c_{\text{threshold}})$ 라는 완료율에 기반한 engagement-aware weights를 사용 = 즉 사용자가 더 많이 본, 만족도가 높은 아이템에 더 가중치 부여하겠다
	-  Ranking Loss
		- $$ L_{\text{ranking}} = E[\max(0, 1 - (\text{pos\_score} - \text{neg\_score})) \cdot W_{u,i}] $$
	- CTR Loss
		- $$ L_{\text{CTR}} = E[-y \log(\hat{y}) - (1 - y) \log(1 - \hat{y})] \cdot W_{u,i} $$
	- 최종 손실 함수
		- $$ L = \lambda_1 L_{\text{CTR}} + \lambda_2 L_{\text{ranking}} + \lambda_3 L_{\text{Reg}} + \lambda_4 L_{\text{entropy}} $$


### Next-K Title Forecasting with Soft Positive Label
- next-title prediction을 넘어, $K$개의 미래 콘텐츠를 예측하는 보다 현실적인 시나리오를 제안
- **Soft-Label Multi-K Training**
	- 모든 $K$개 단계를 동일하게 취급하는 대신, 초기 단계에는 더 큰 label strengths를 할당
		- 예를 들어, 다음 콘텐츠 $t_{n+1}$에는 1.0, 그 다음 $t_{n+2}$에는 0.6, $t_{n+3}$에는 0.3과 같이 가중치를 부여 -> 모델이 단기 예측 정확도에 집중하면서도 장기적인 참여 패턴으로부터 학습하도록 유도



## Results
- 1백만 명의 사용자로부터 수집된 Amazon Prime Video 대규모 스트리밍 데이터를 사용하여 실험
	- Behavioral Sequential Transformers를 주요 베이스라인으로 활용 
	- NDCG@1, NDCG@5, Recall@5, MRR@5를 포함한 다양한 랭킹 지표를 통해 모델 성능을 평가
	- 제안된 S-MoE-BST (PHNS+MTL+PL) 모델은 베이스라인 대비 NDCG@1에서 최대 3.52% 향상된 성능

- ablation에서 PHNS를 비율이나 평가를 좀 자세하게 했는데 궁금했던 부분이라 정리해보면
	- PHNS를 아예 안 쓰고 학습한 경우, 테스트할 때 hard negative가 없으면 (PHNS안 쓴 정답지) 성능이 높지만 PHNS가 적용된 정답으로 하면 성능이 `NDCG@1` 기준 0.75 -> 0.36 기준으로 급락
		- 즉 hard negative가 존재하는 실제 환경에서 개인화되지 않은 negative sampling 전략이 문제가 될 수 있음을 보여줌. 
	- PHNS를 쓰고 학습할 때도 hard negative의 비중에 따라 HARD (50%), MEDIUM (30%), EASY (20%)로 나눴는데, 
		- PHNS 안 쓴 정답지로 테스트할 때 no PHNS로 학습한 것 대비는 떨어지나 크게 차이나지 않는 합리적인 성능을 robust하게 유지(0.71). i.e.  **hard negative를 섞는 게 쉬운 negative를 구분하는 능력을 크게 떨어뜨리는 것은 아님**.
		- PHNS 쓴 정답지로 테스트할 때 no PHNS 학습 대비 0.36 -> 0.59로 크게 잘함. MEDIUM이 제일 낫긴 한데 EASY, HARD랑 많이 차이나지는 않음
