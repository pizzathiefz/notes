---
{"publish":true,"title":"Lifelong User Action Sequence Modeling @Pinterest","created":"2025-08-15","tags":["recsys"],"cssclasses":""}
---

> **[TransAct V2: Lifelong User Action Sequence Modeling on Pinterest Recommendation](https://arxiv.org/abs/2506.02267)** (2025)

- Homefeed Recommendation
	- 3 stages : retrieval / ranking / blending(비즈니스 로직에 따라 핀을 섞음)
	- **CTR 예측 랭킹 과제에서 realtime + lifelong 유저 시퀀스를 통합하는 새로운 모델이 필요**
		- TransAct ([[note/Transformer-based Realtime User Action Model @Pinterest]]) 의 업데이트된 버전을 소개 -> **TransAct V2** 


# Ranking Model Architecture

![[assets/lifelong user action sequence modeling @pinterest/transact-v2-ranking-model.png|450]]

- 기본적으로 point-wise multi task learning + 표준 wide and deep 아키텍쳐
	- context, 크리에이터, 아이템 및 유저 피쳐를 입력으로 받아 유저가 아이템과 상호작용할 확률을 예측
	- 사용자 시퀀스를 포함한 다양한 피쳘르 인코딩한 뒤 feature cross 레이어가 있고 MLP를 적용해서 각 헤드별(상호작용별) 점수를 생성
- 핵심 손실 함수는 multi-label 분류에 맞는 weighted cross entropy loss
$$L_{CE} = \sum_{h \in H} \{-w_h [y_h \text{log} f(x)_h + (1 - y_h) \text{log}(1 - f(x)_h)]\}$$
- 여기에 다음 액션 예측을 sub task로 도입해서 아래에서 다룰 Next action loss도 함께 최소화


# TransAct V2 Architecture

![[assets/lifelong user action sequence modeling @pinterest/transact-v2-architecture.png|475]]

- **시퀀스 피쳐들**
	- 유저의 수년 간에 걸친 상호작용 시퀀스 $S_{LL}$ 
		- repin, click, hide 같은 명시적인 액션으로만 구성
		- 최대 길이는 가중치가 부여된 유저의 지난 2년간 액션 기록 길이의 90th percentile 기준으로 선택 (가중치는 방문 빈도가 높고 수익에 크게 기여하는 유저일수록 높아짐)
		- 시퀀스 각 토큰은 행동 타임스탬프, 행동 유형, 행동 지면, 행동 대상 핀의 32차원 PinSage 임베딩
			- 임베딩은 원래 32차원 fp16이었는데 32차원 int8 vector로 크기를 절반으로 줄임 (affine quantization)
		- 동일 핀에 대해 여러번 상호작용 했을 수 있으므로(e.g. 클로즈업 후 저장) 행동 유형은 multi-hot vector
	- 실시간 시퀀스 $S_{RT}$, 노출 시퀀스 $S_{Imp}$ 도 동일한 피쳐들을 사용함
		- 노출 시퀀스는 유저가 보았지만 클릭하지 않은 아이템들로 구성되어 잠재적인 부정적인 선호도를 파악할 수 있음
- **Nearest Neighbor Search**
	- ❓이걸 이 단계에서 갑자기 왜 하는가? -> 시퀀스 데이터가 매우 길어서 Transformer에 넣고 처리하기가 어려움. 긴 시퀀스 전체를 처리하지 않고 그 시퀀스에서 정보를 효율적으로 추출해내자는 접근
	- 후보 아이템 $c$를 앵커로 사용하여 위의 세가지 시퀀스에 대해 NN search 해서 상대적으로 적은 수의 벡터만 남김
		- 즉 **현재 사용자에게 추천할까 하는 아이템과 가장 유사성이 높은 과거 행동을 방대한 길이의 시퀀스에서 선별적으로 찾아냄**
	- 후보 아이템과의 유사성과 무관하게 유저의 가장 최신 행동은 무조건 반영하도록 $S_{RT}$의 마지막 $r$개는 무조건 유지
	- ➡️ NN search + 가장 최근 행동을 concat해서 최종적으로 사용될 시퀀스를 다음과 같이 만들 수 있음 
		- 수백 개의 길이로 제한되어 Transformer가 효율적으로 인코딩할 수 있는 수준

$$S_{\text{all}} = \text{NN}(S_{LL}, c) \oplus S_{RT}[:r] \oplus \text{NN}(S_{RT}[r:], c) \oplus \text{NN}(S_{imp}, c)$$
- **Feature Encoding** -> Transformer의 최종 input을 준비
	- 위 all sequence 내의 각 핀의 PinSage 임베딩과 후보 핀의 임베딩을 concat (**Early Fusion**)
	- 행동 유형($E_{act}$) 임베딩 (저장, 클릭, 숨기기) 및 행동 지면 ($E_{surf}$) 임베딩
	- Transformer positional encoding ($E_{pos}$)은 학습 가능한 파라미터로
	- 이 임베딩들은 모두 동일한 차원으로 맞춰져서 합산됨


$$F = \text{CONCAT}(E_{PinSage}(S_{all}), e_c) + E_{act} + E_{surf} + E_{pos} \in R^{|S| \times d}$$

- **Next Action Loss**
	- 메인은 CTR 예측이지만, 보조 태스크로 유저가 다음에 할 행동을 예측하도록 함
		- 이 과제를 통해 Transformer가 시간 순서에 따른 유저 관심사 변화를 더 포괄적이고 정교하게 모델링하도록 학습됨
		- Transformer 인코더의 출력 (= 각 시점 $t$의 유저 임베딩)을 linear, max pooling layer를 거쳐서 $t+1$ 시점의 행동을 예측하여 sampled softmax loss를 계산 
			- 일반적인 contrastive learning 방식, negative sample은 유저가 봤지만 클릭하지 않은 핀 (더 어려운 negative라서 더 효과적인 것으로 확인)
		- 이 Next Action Loss는 메인 loss인 CTR Cross-Entropy Loss와 함께 가중합산되어 최종 손실함수가 됨


# Serving

![[assets/lifelong user action sequence modeling @pinterest/transact-v2-serving.png|525]]


- pipeline 최적화
	- 전체 LL sequence를 저장하거나 네트워크로 전송하는 대신, candidate item과 관련성이 높은 소수의 NN feature만을 추출하여 로깅
		- training: 모델은 이미 로깅된 NN feature를 소비하므로 데이터 로딩 오버헤드가 적음
		- serving: 시스템은 대상 사용자의 전체 LL sequence를 검색하고, 이를 $N$개의 아이템에 브로드캐스트한 후, on-device에서 NN search를 수행하여 관련 NN feature를 추출하고 Transformer Encoder에 전달

![[assets/lifelong user action sequence modeling @pinterest/transactv2-serving-optimization.png]]


- serving 최적화
	- Request Level De-duplication
		- 단일 요청 내에서 사용자 시퀀스 같은 요청 수준 feature들이 여러 아이템에 대해 복제(broadcast)되어 GPU로 전송되는 문제를 해결
		- 새로운 sparse tensor format을 도입하여 중복을 제거하고 offset을 저장
		- 이를 위한 custom Triton kernel을 개발하여 GPU 상에서 broadcast 없이 NN search를 직접 수행하면서 시퀀스 feature에 대한 PCIe 데이터 전송량이 8배 감소
	- Fused Sequence Dequantization
		- int8로 양자화된 PinSage 시퀀스 feature를 float16으로 역양자화하고 L2 정규화하는 과정은 여러 개의 CUDA kernel 호출을 필요로 함 
		- 이를 NN search kernel과 융합(fuse)하여 단일 kernel로 처리함으로써, 모델 지연 시간을 20% 줄임
	- Single Kernel Unified Transformer (SKUT)
		- 모델의 낮은 차원 (64)을 활용하여 Transformer의 모든 연산을 단일 custom Triton kernel로 융합
		- QKV sequence tensor를 on-the-fly로 생성하고, 모든 Transformer 가중치를 GPU L2 Cache (SRAM) 내에 담아 GPU 전송 오버헤드와 kernel 호출을 크게 줄임
		- PyTorch 대비 6.6배 빠른 forward pass 성능과 최대 85.09% 낮은 지연 시간을 달성
	- Pinned Memory Arena
		- 대규모 payload (mini-batch당 64MB)로 인한 메모리 복사 병목 현상을 해결하기 위해, 미리 할당된 Pinned Memory Arena를 구현하여 mini-batch를 Arena에 직접 구성
		- pageable to pinned 복사 단계를 완전히 제거하고 추론 속도를 최대 35% 향상




# Experiment and Results

- setup
	- 2주간 홈피드 사용자 활동을 다운샘플링
		- volume: 69억 개 instances(1억 8,200만 명 유저, 3억 5천 만 개의 pin 포함)
		- trained from scratch
		- evaluation: 학습 데이터 수집 마지막 날로부터 7일 후에 수집된 데이터셋
	- 평가지표: head-wise HitRate 
		- 긍정적 head이면 높은 게 좋고 hide처럼 부정적 head이면 낮은 게 좋음


![[assets/lifelong user action sequence modeling @pinterest/results-offline.png|450]]
- Offline Results
	- HIT@3/repin 13.31% ⬆, HIT@3/hide 11.25% ⬇


![[assets/lifelong user action sequence modeling @pinterest/results-online.png|350]]
- Online Results
	- NAL의 효과 
		- Homefeed Hide Volume을 6.26% 감소
			- 이는 impression-based negative sampling이 관련 없는 추천을 효과적으로 걸러내어 사용자 경험을 개선함
	- TransAct V2의 전반적 우수성 
		- Homefeed Repin Volume: 6.35% 상당한 증가 (모델이 매우 관련성 높은 추천을 제공함)
		- Homefeed Hide Volume: 12.80% 감소를 달성 (사용자가 선호하는 콘텐츠를 선별하는 모델의 능력을 추가로 입증)
		- Impression Diversity: 0.45% 향상
		- Time Spent on App: 1.41% 향상


- Ablation/Hyperparameter Tuning
	- NAL Negative Sample Selection: Impression-based negative samples가 in-batch sampling보다 모델 일반화 및 'hide' 감소에 더 효과적
	- NAL Loss Weight Tuning : NAL과 CTR 예측 간의 균형을 위해 0.01이 최적이며, 가중치 조정은 필수적
	- NAL Loss Type: Sampled softmax loss는 긍정/부정 샘플 비율 조정의 유연성 덕분에 cross-entropy보다 우수한 성능을 보임
	- Transformer Hyperparameters (Figure 6): 시퀀스 길이 192, 2개 레이어, feed-forward dimension 32가 repin 성능과 추론 지연 시간 간의 최적의 균형을 제공
	- Single Kernel Unified Transformer (SKUT) : QKV materialization 회피 및 Triton 커널 융합을 통해 PyTorch 대비 최대 85.09% 낮은 지연 시간과 적은 GPU 메모리 사용량을 달성
	- Server Optimizations: Request-level De-duplication, Fused Dequantization, Pinned Memory Arena, SKUT 등의 조합으로 E2E 추론 지연 시간이 p99 기준 최대 250배 이상 감소