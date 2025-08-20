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



# Experiment and Results