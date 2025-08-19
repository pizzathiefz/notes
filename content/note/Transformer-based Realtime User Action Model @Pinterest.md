---
{"publish":true,"title":"Transformer-based Realtime User Action Model @Pinterest","created":"2024-11-16","tags":["recsys"],"cssclasses":""}
---

> **[TransAct: Transformer-based Realtime User Action Model for Recommendation at Pinterest](https://arxiv.org/abs/2306.00248)** (2023)


# Pinnability, Transact
- **Homefeed Ranking** Model = Pinnability 
	- 핀 𝑝에 대한 사용자 𝑢의 다양한 행동(클릭, 리핀, 숨기기 등 긍정적 및 부정적 행동 모두 포함) 확률을 예측하는 multi-task 
	- 기본적으로 wide & deep 구조
		- 특징 상호작용을 명시적으로 모델링하기 위한 full-rank DCNv2    *∗* [[note/Deep & Cross Network]] 
		- 마지막으로 output 행동 헤드로 연결되는 fully connected layer 
			- 각 헤드가 하나의 행동에 맵핑됨

- loss의 경우 weighted cross-entropy loss
	- $$L = \sum_{u \in U} w_u \sum_{h \in H} \{-w_h [y_h \log f(\mathbf{x})_h + (1 - y_h)(1 - \log f(\mathbf{x})_h)]\}$$
		- $f(\mathbf{x})_h$는 헤드 $h$의 출력 확률, 가중치는 ground truth $y$와 label weight matrix를 사용하여 계산 
		- $$ w_h = \sum_{a \in H} \mathbf{M}_{h,a} \times y_a$$
		- 비즈니스 요구사항에 따라 유저 레벨의 가중치도 넣음

- 아래와 같은 구조로 장기적인 관심사와 실시간의 단기적인 관심사를 둘 다 반영할 수 있음 (real-time & batch hybrid model)

![[assets/transformer-based realtime user action model @pinterest/ranking-model-architecture.png|525]]

- PinnerFormer
	- 일단위 배치로 학습되는 사용자 임베딩 (장기적인 관심사 반영)
	- 상세내용: [[note/User Sequence Modeling @Pinterest]]

- **TransAct**
	- 실시간 사용자 행동 시퀀스를 처리하는 서브모듈 (이므로 사실 위의 Pinnability외에도 다른 곳에도 쓸 수 있음)
	- 각 행동에는 타임스탬프, 행동 유형, 32차원 PinSage 임베딩이 포함, 최근 100개의 행동으로 시퀀스를 생성(없는 유저는 패딩)

![[assets/transformer-based realtime user action model @pinterest/transact.png|475]]

- Feature Encoding: 행동 유형은 학습 가능한 임베딩 테이블을 통해 저차원 벡터로 투영되어 사용자 행동 임베딩 행렬 $\mathbf{W}_{actions} \in \mathbb{R}^{|S| \times d_{action}}$ 을 형성
	- 핀 내용은 PinSage 임베딩 행렬 $\mathbf{W}_{\text{pins}} \in \mathbb{R}^{|S| \times d_{PinSage}}$ 로 표현
	- 최종 인코딩된 시퀀스 특성은 $\text{CONCAT}(\mathbf{W}_{actions}, \mathbf{W}_{pins})$
- Early fusion: 후보 핀과 사용자가 이전에 상호작용한 핀들 간의 상호작용을 명시적으로 모델
	- concat 방식이 append 방식보다 우수하다고 판단되어 채택
	- 사용자 행동 시퀀스의 각 행동에 후보 핀의 PinSage 임베딩을 연결
- Sequence Aggregation Model: 준비된 $\mathbf{U}$를 입력으로 받아 사용자의 단기 선호도를 효율적으로 집계
	- 표준 Transformer 인코더 (2개의 인코더 레이어, 1개의 헤드)가 사용
	- 오프라인 실험 결과 positional encoding은 효과적이지 않아 제외
- Random Time Window Mask
	- 모델이 사용자의 최근 상호작용과 유사한 콘텐츠만을 추천하는 rabbit hole 효과를 방지하고 다양성을 향상시키기 위해 도입
	- 학습 중에만 적용되며, 0에서 24시간 사이의 랜덤 시간 창 $T$가 샘플링되어 요청 타임스탬프 $t_{request}$를 기준으로 $(t_{request} - T, t_{request})$ 내에서 발생한 모든 행동은 마스킹함 
- Transformer Output Compression:  과도한 시간 복잡도를 피하기 위함
	- Transformer 인코더 출력 $\mathbf{O} = (o_0 : o_{|S|-1}) \in \mathbb{R}^{|S| \times d}$ 
	- 첫 번째 $K$개 열 $(o_0 : o_{K-1})$을 전체 시퀀스에 대한 맥스 풀링 벡터 $\text{MAXPOOL}(\mathbf{O}) \in \mathbb{R}^d$와 연결한 다음 벡터 $\mathbf{z} \in \mathbb{R}^{(K+1) \times d}$로 flatten
	- 사용자의 가장 최근 관심사(첫 $K$개 열)와 전체 시퀀스의 집계된 장기 선호도(맥스 풀링)를 모두 포착하여 성능과 지연 시간 사이의 균형을 맞출 수 있음 ($K$=10).

# Productionize

- retraining
	-  실시간 특성을 사용하는 모델은 사용자 행동 변화에 민감하므로 staleness방지하기 위해 주 2회 전체 재훈련을 수행
- GPU 서빙
	- TransAct를 도입하면서 계산 복잡도가 65배 증가했으나 다음 최적화를 통해 latency와 cost를 neutral하게 유지
		- CUDA 커널 융합: nvFuser 및 cuCollections를 활용한 맞춤형 임베딩 테이블 조회 모듈 구현으로 수백 개의 개별 연산을 하나로 통합
		- CPU에서 GPU로의 수백 개의 개별 텐서 복사 오버헤드를 줄이기 위해 여러 텐서를 하나의 연속적인 버퍼로 결합하여 전송
		- 더 큰 배치를 생성(효율적 추론), 캐시 용량 손실을 보완하기 위해 DRAM과 SSD를 결합한 하이브리드 캐시를 구현
		- 나머지 작은 연산 오버헤드를 완전히 제거하기 위해 모델 추론 프로세스를 단일 단위로 실행하는 정적 그래프로 캡처하는 CUDA 그래프를 사용
- 실시간 feature 처리
	- Flink 기반의 애플리케이션이 프론트엔드 이벤트에서 생성된 Kafka 스트림을 소비하여 사용자 행동 기록을 Rockstor에 저장합니다
	- 서빙 시에는 시퀀스 특성을 모델에서 활용 가능한 형식으로 변환


# Experiment

## offline
![[assets/transformer-based realtime user action model @pinterest/offline-experiment.png|450]]
- setting
	- Pinterest Homefeed View Log(FVL)의 3주치 데이터를 사용하여 2주치 데이터로 모델을 훈련하고 3주치 데이터로 평가
	- 학습 데이터는 사용자 상태 및 레이블에 따라 샘플링되었으며, 불균형한 데이터셋을 보완하기 위해 음성 샘플을 다운샘플링함
	- 평가는 HIT@3 지표를 사용했으며, 평가 데이터셋에서는 위치 편향을 제거하기 위해 핀 순서를 무작위화
- results
	- TransAct는 기존의 순차 추천 방식(WDL + 시퀀스, BST)을 크게 능가함
	- 특히 숨기기 예측에서 TransAct의 성능이 압도적으로 우수했으며, 이는 행동 유형 인코딩 능력 덕분
	- 특히 비핵심 사용자(non-core user)의 경우 실시간 사용자 행동 특성이 제한된 과거 상호작용 정보를 보완해주므로 모든 사용자 그룹보다 더 높은 성능 향상을 보임

![[assets/transformer-based realtime user action model @pinterest/early-fusion-and-sequence-length.png|500]]

- Ablation Study
	- 하이브리드 랭킹 모델: TransAct(실시간)와 PinnerFormer(배치) 중 TransAct가 더 중요한 요소였지만, PinnerFormer 역시 장기적인 사용자 선호도를 포착하여 모델 성능에 기여함. 두 요소를 모두 사용하는 하이브리드 모델이 최상의 성능
	- 기본 시퀀스 인코더 아키텍처: Transformer가 평균 풀링, CNN, RNN, LSTM보다 우수한 성능을 보임
	- early fusion : concat 방식이 append 방식보다 우수함 
	- 시퀀스 길이가 길어질수록 성능이 향상되지만 증가율은 sub-linear하므로 100 정도로

## online
- TransAct가 도입된 Pinnability 모델과 실시간 사용자 시퀀스 특성이 없는 Pinnability 모델을 대상으로 1.5%의 사용자 트래픽에 대해 A/B 테스트를 수행
	- re-pin 11.0% 증가, 숨기기 10.0% 감소, 전반적인 Pinterest 체류 시간이 2.0% 증가 
		- 이 경우에도 비핵심 사용자의 참여도 향상이 더 컸음
-  모델을 재훈련하지 않을 경우 참여도 지표가 시간이 지남에 따라 감소하는 현상이 관찰
	- 주 2회와 같은 빈번한 재훈련이 참여율을 안정적으로 유지하는 데 필수적이었음
- TransAct 도입으로 인해 추천 다양성이 2~3% 감소하는 문제가 발생했으나 Random Time Window 을 통해 다양성 감소를 1%로 완화하면서도 relevance 지표를 떨어뜨리지 않고 유지함