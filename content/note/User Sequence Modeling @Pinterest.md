---
publish: true
title: User Sequence Modeling @Pinterest
created: 2024-11-15
modified: 2025-10-28T18:47:17.000+09:00
published: 2025-10-28T18:47:17.000+09:00
tags:
  - recsys
  - sequence-modeling
  - sequential-rec
cssclasses: ""
---

> **[PinnerFormer: Sequence Modeling for User Representation at Pinterest](https://arxiv.org/abs/2205.04507)** (2022)

# Design Choices
- Single 🆚 Multi Embedding
	- Multi Embedding 
		- 이전에 PinnerSage에서 했던 방식. 유저의 핀 보드를 클러스터링 후 클러스터마다 임베딩 학습, 유저별로 여러 개의 가변적인 수의 임베딩이 할당됨 e.g. 요리 임베딩, 여행 임베딩, 가드닝 임베딩
		- 👍 : 다양한 명시적 관심사를 학습할 수 있고 retrieval에 잘 작동함, 다양하고 폭넓은 추천결과를 생성할 수 있음
		- 👎 : downstream model 사용시 복잡성 (저장/전달 시 overhead, latency 문제), 단일 표현의 부재(homefeed ranking에서는 사용자를 통합적으로 나타내는 피쳐가 필요함)
	- Single Embedding
		- Pinnerformer로 달성하고자 하는 목표: **단일한 고품질 유저 임베딩을 얻어서 여러 general한 downstream task에서 사용하고자 함**
- Real-time 🆚 Offline inference
	- sequntial한 유저 모델링은 보통 실시간/준실시간으로 작동하는 것에 중점을 두는 경우가 많으나 이 경우 계산비용이 크고 높은 수준의 인프라 복잡도가 요구됨
	- 핀터레스트의 경우 유저들이 하루에도 수십~수백개의 행동을 하기 때문에 real-time 업데이트보다는 하루에 한번만 업데이트하는 방식을 택함
	- 임베딩의 freshness가 떨어질수록(real-time 대비 offline 방식일수록 = staleness) 성능이 떨어지지만 이하에서 제시할 Pinnerformer는 dense all-action loss라는 새로운 방식을 통해 이 성능 갭을 크게 줄였음


# Pinnerformer

## Overview

![[assets/user sequence modeling @pinterest/pinnerformer-architecture.png|550]]

- User Sequence
	- 학습 데이터 시퀀스
		- **과거 1년 동안**의 사용자의 행동 시퀀스 (단, 효율성을 위해 최근 $M$개의 행동만 사용). 각 행동은 다음 요소들로 구성됨
			- Pin(item) 임베딩 <- PinSage
			- Action : 저장(Repin), 클릭, 이미지 확대 등 (부정적인 행동도 포함됨 🔴 - 짧은 클릭, 핀 숨기기 등)
			- Timestamp
			- Duration : 행동의 지속시간
		- 그림 속 Extract & Project는 이 시퀀스를 구성하고 각 피쳐 유형에 맞게 벡터변환/로그변환/타임스탬프의 주기변환 등을 진행한 것을 의미함
	- Transformer
		- 행동 시퀀스를 받아 순차적인 패턴을 학습
		- **Causal Masking** : 각 시점에서 현재 이전 시점만 참고! (미래 데이터 leak 방지)
	- User MLP
		- Transformer의 출력(hidden state)이 MLP를 통과 후 L2 normalization
			- 추가 비선형 변환으로 표현력을 높이고 차원을 맞추고 정규화하는 역할
- Metric Learning
	- Future Window Data (Positive Examples)
		- 바로 다음 행동만 예측하는 것이 아닌 임베딩 생성 시점 이후 🌟 **미래의 28일 동안의 긍정적인 상호작용을 예측하도록 학습**하는 것이 Pinnerformer의 핵심적인 특징
	- Negative Sampling
		- [[wiki/In-batch Negative Sampling]] 과 전체 corpus에서의 단순 Random negative sampling 를 섞어서 씀 
			- 전자는 인기 아이템이 페널티받기 쉽고 후자는 너무 쉬운 negative
	- Pin MLP
		- 긍정/부정 샘플 모두 PinSage 임베딩을 기반으로 MLP를 통과하여 유저 임베딩과 같은 공간으로 align됨
	- 🌟 **Dense All Action Loss**
		- 중간 사용자 임베딩 중 무작위로 여러 개를 선택 + 긍정 샘플 중 하나 무작위로 선택 -> 예측하도록 학습
			- 원래 시퀀셜 추천을 할 때 보통 가장 최근 시점의 임베딩으로 다음 행동 1개를 예측하는 것과 다른 구조
		- 하나의 특정 다음 행동에 과적합되지 않고, 사용자의 시퀀스 내 다양한 시점의 상태를 통해 더 넓은 시간 범위의 장기적고 안정적인 관심사를 포착하도록 유도
			- 보통 이런 sequential 추천은 real-time이 아닌 배치 추론 환경을 할 경우 잘 작동하지 않는데, PinnerFormer는 이런 장기 관심사 반영 때문에 하루에 한번만 업데이트하는 배치추론을 해도 성능 하락이 덜함
		- Loss: sampled softmax + logQ Correction
			- 모든 아이템이 아닌 긍정 샘플 1개와 부정 샘플 K개만 가지고 softmax 근사치를 계산 
			- 이때 부정 샘플에 인기도 편향이 발생할 수 있으므로, 유사도 점수에 해당 아이템이 포함될 확률(~인기도 $Q$, $-\log(Q(v))$)을 빼주는 방식으로 보정함

$$
\text{L}(u, p_{pos}) = -\log \left( \frac{\exp(s(u, p_{pos}) - \log(Q(p_{pos})))}{\exp(s(u, p_{pos}) - \log(Q(p_{pos}))) + \sum_{k=1}^{K} \exp(s(u, p_{neg,k}) - \log(Q(p_{neg,k})))} \right)
$$


## Training objective

![[assets/user sequence modeling @pinterest/pinnerformer-training-objective.png|450]]

Dense All Action Loss이 너무 중요한 아이디어여서 그런지 한번 더 짚고 넘어감..

- NextAction
	- 가장 일반적인 시퀀스 모델링 방식으로, 입력 시퀀스의 가장 마지막 행동 기준으로 바로 다음 (긍정) 행동을 예측
	- 단기적 패턴에 집중, 서빙시에도 준실시간 이상의 구조가 아니면 임베딩이 예전 내용이라는 문제
- SASRec
	- 시퀀스 내의 모든 시점에서 해당 시점의 바로 다음 (긍정) 행동을 예측
- All Action
	- 입력 시퀀스의 가장 마지막 행동으로 k day window내 모든 (긍정) 행동을 예측
	- 마지막 시퀀스 임베딩에 너무 많은 정보를 압축하게 만들어 특정 정보를 흐리게 만들거나 학습을 비효율적으로 만들 수 있음 (larger averaging effect로 인해 dense all action보다 성능이 떨어졌다고 함)
- Dense All Action
	- 생략


## Serving

![[assets/user sequence modeling @pinterest/pinnerformer-serving.png|525]]

- 지난 하루동안 새로 상호작용이 추가된 유저들에 대해서만 새로운 임베딩을 만들고 전체 임베딩이랑 합쳐서 key-value online feature store에 업데이트
	- 이런 방식 때문에 제약이 덜하게 더 큰 모델을 사용할 수 있어서 더 고품질의 임베딩을 사용할 수 있다는 점을 언급하고 있음
- 핀 임베딩도 Pinsage Embedding을 Pin MLP통해 변환시키는데, 계산비용이 낮으므로 매일 전체 Pin을 from scratch 생성 -> ANN할 수 있게 HNSW Index로
- 홈피드 랭킹/retrieval, 검색 랭킹 등에 다양하게 사용


# Experiment and Results


## Offline Evaluation

- metrics
	- recall@10
	- interest entropy@50: 추천된 핀들의 관심사(interest)의 다양성
	- p90 coverage@10: 전체 추천된 핀들의 90%(노출량 기준으로)를 설명할 수 있는 핀들이 전체 핀 인덱스에서 얼마나 많은 비중을 차지하는지 (높을수록 더 넓은 범위의 핀을 추천함)

### Results
- single vs multi embedding
	- baseline이었던 **multi embedding PinnerSage 대비 (0.026, 0.046) 압도적인 recall@10 (0.229)** 확인
	- 다만 다양성지표는 PinnerSage가 나았는데, 다중 임베딩 방식이 사용자의 다양한 관심사를 명시적으로 표현하여 더 넓은 범위의 핀을 추천하는 데 유리함을 시사
- real-time v.s. offline batch inference
	- 당연히 임베딩 추론 빈도가 높을수록(Realtime > Daily > Once) Recall@10 성능이 높아지는 경향
	- Realtime에서 Daily 추론으로 전환할 때 **SASRec은 Recall@10이 13.9% 하락(-0.035)** 하는 반면, **PinnerFormer는 8.3% 하락(-0.021)** 하여 성능 하락 폭이 훨씬 작음 (즉 PinnerFormer가 일간 배치 추론 방식의 staleness문제를 완화한다는 것을 알 수 있음)
	- 전반적으로도 모든 빈도에서 SASrec보다 높은 Recall
- training objectives
	- Dense All Action이 다른 방식들(Next Action, SASRec, All Action)보다 나음
	- 14일보다 28일 미래 데이터로 훈련할 때 Recall@10이 더 높음
	- Next Action 및 SASRec이 P90 Coverage@10가 상대적으로 높음 = 특정 사용자 관심사보다는 더 일반적이거나 인기 있는 콘텐츠를 예측하는 경향이 있음

![[assets/user sequence modeling @pinterest/negative-sampling-and-spc.png|325]]

- negative sampling 방식, SPC (sample probability correction)
	- random 네거티브만 사용할 경우 P90 Coverage@10이 매우 낮아 모델이 매우 유사한(인기 있는) 결과만 모든 사용자에게 추천하는 collapse 현상 + 낮은 recall
	- in-batch 는 다양성이 올라가지만 recall이 낮음
	- in-batch 또는 mixed 네거티브와 함께 SPC를 사용할 경우 Recall@10이 유의미하게 상승하고, random에서는 의미가 없음
	- 결론: mixed + SPC가 best다 (높은 recall, 중간 수준의 다양성)

- single task v.s. multi-task learning
	- 클로즈업만 학습하면 당연히 클로즈업 태스크 평가에서 제일 잘함
	- 하지만 multi-task로 학습해야 전체 긍정적 행동을 가장 잘 예측하고 개별 태스크에서도 두번째로 높은 성능


![[assets/user sequence modeling @pinterest/ablation.png|400]]


- Ablation
	- PinSage 피처를 제거했을 때 Recall@10(0.142 vs 0.229)이 가장 크게 하락하고 P90 Coverage@10도 거의 0에 가까워짐 - 모델이 핀의 콘텐츠를 이해하는 데 PinSage 임베딩이 필수적임
	- Timestamp 피처를 제거했을 때도 Recall@10(0.210)이 눈에 띄게 하락 -> 사용자의 행동이 발생한 시간 정보(절대 시간, 상대 시간, 간격 등)가 시퀀스 모델링에서 매우 중요한 역할을 함
- 입력 시퀀스 길이
	- 증가할수록 recall과 p90 coverage 모두 상승하지만 diminishing returns (성능 향상 속도가 점차 둔화됨)
	- 256 이후에는 거의 수평에 가까워질 것으로 예상
	- 성능 vs. 비용 트레이드오프를 고려하여(시퀀스 길이가 길어질수록 트랜스포머 비용이 크게 증가하므로) 256로 결정했음


## Online Ranking A/B Test 

![[assets/user sequence modeling @pinterest/online-ab-test.png|425]]
- Homefeed ranking 모델 피쳐로 사용했을 때
- 각종 지면에서 광고 ranking 모델 피쳐로 사용했을 때