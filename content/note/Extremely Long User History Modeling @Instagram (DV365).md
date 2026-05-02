---
publish: true
title: Extremely Long User History Modeling @Instagram (DV365)
created: 2025-10-17
modified: 2025-10-28T18:55:58.000+09:00
published: 2025-10-28T18:55:58.000+09:00
tags:
  - recsys
  - sequence-modeling
cssclasses: ""
---

> [DV365: Extremely Long User History Modeling at Instagram](https://arxiv.org/abs/2506.00450) (2025)

📋 요약
- 긴 사용자 히스토리는 추천 품질 향상에 중요하지만 비용이 큼
- 기존의 end-to-end 시퀀스 길이 최적화 방식은 확장성 및 ROI 한계에 도달했기에 대신 오프라인 임베딩 방식을 채택 = **DV365**
	- 목적: 사용자의 매우 길고 안정적인 관심사를 나타내는 일반화 가능한 유저 표현을 생성
	- 길이가 최대 70,000개, 평균 40,000개에 달하는 사용자 히스토리를 인코딩
	- 오프라인 임베딩의 한계인 freshness 문제를 시간에 따라 크게 변하지 않는 안정적인 관심사에 초점을 맞춤으로써 완화
	- 단일 foundational model에서 생성된 임베딩 여러 다운스트림 모델에서 활용하고 이때 가벼운 domain adaptation 모듈을 추가 -> 인스타그램/스레드의 15개 이상 모델의 성공적으로 배포되어 1년 이상 프로덕션 환경에서 검증됨

---

## Data & Feature
- UniTi (Unified User Timeline)
	- 각 유저 상호작용은 미디어 ID, 작성자 ID, 이벤트 타임스탬프, 액션 유형(like, share, comment, ...), 비디오 길이, 시청시간, 지면(surface) 유형, 미디어 유형 등으로 이루어짐
	- $\mathbf{m} = (e_{1}, e_{2}, \dots)$ 이 하나의 미디어를 표현하는 벡터(각 원소가 미디어 ID, 작성자 ID, topic Id등 미디어 속성값을 나타냄)라고 하면, 2가지 유형의 타임라인을 만들 수 있음
		- Explicit timeline(like, share등) $E_e = [..., (m_i, \text{action\_type}_i, t_i), ...]$
		- Implicit timeline(미디어를 보거나 머무르는 행위) $E_i = [..., (m_j, \text{video\_duration}_j, \text{dwell\_time}_j, t_j), ...]$
- **Multi-Slicing**
	- 이 UniTi를 여러 기준에 따라 slicing하여 더 구체적이고 의미 있는 subsequence를 만듦
	- Explicit timeline slicing
		- 행동 유형별 slicing(e.g. 좋아요 누른 미디어만 자르기), 미디어 유형별 slicing
	- Implicit timeline slicing
		- Dwell Time slicing: 사용자가 특정 시간 이상 머무른 미디어만
		- Watch Ratio slicing: 동영상 길이 대비 시청한 비율을 기준으로  
		- Duration-debiased Weighted Watch Score slicing
			- 긴 동영상은 자연히 시청 시간도 길어지기 때문에 단순히 시청 시간만으로는 '진정한 관심'을 파악하기 어려움. duration으로 debias한 점수를 생성해서 해당 점수가 특정 기준 이상인 미디어만 
			- $s(E_i) = \frac{\ln(\text{dwell\_time} + 1)}{\ln(\gamma \cdot \text{video\_duration} + 1)}$
	- Time slicing
		- 얼마나 최근의 행동인가를 기준으로 자름 (전체 기간, 3일이내, 7일이내)
- 이렇게 총 200여개의 파생피쳐(슬라이스된 섭시퀀스들)가 만들어짐
- 각 피쳐를 임베딩으로 summarize
	- Non-weighted categorical features: 대부분의 행동 기반 피처(e.g. '좋아요' 시퀀스)는 해당 시퀀스 내의 모든 아이템 임베딩을 단순 mean-pooling
	- Weighted categorical features: 동영상 시청 점수처럼 가중치가 있는 피처는weighted mean-pooling
- **Embedding Table sharing**
	- 메모리 사용량을 줄이고 각 임베딩 테이블이 특정 유형의 정보에 집중하도록 하기 위해 생성된 범주형 피처들을 몇 가지 기준으로 그룹화하여 raw 임베딩 테이블을 공유함 
		- 예를 들어, '긍정적 반응(좋아요, 15초 이상 시청)'과 '부정적 반응(스킵, 3초 미만 시청)'을 구분하고, 명시적/암묵적 타임라인, ID 유형(미디어 ID, 작성자 ID) 등으로 그룹화
	- 같은 미디어라 해도 어떤 맥락이냐에 따라 특화되어 학습되도록 해서 표현력을 극대화함

<br>

## Model Architecture

![[assets/비용 효율적인 Cold-Start 추천 @Pinterest/model-architecture.png]]

### User Encoder
- 목표: 피처 엔지니어링 단계에서 생성된 200개의 pooled embedding를 더욱 압축하여, 다운스트림 모델이 사용하기에 효율적인 'DV365 Embedding'을 만들어내는 것
- **Funnel Summarization Arch (FSA)**
	- 트랜스포머 계열 모델은 긴 시퀀스의 모든 토큰을 처음부터 끝까지 같은 길이로 처리하지만 FSA는 깔때기처럼 점진적으로 시퀀스 길이를 줄여나감
	- 초기 입력 형태: N개의 임베딩 ($N$=200), 각 임베딩의 차원 $D$ (e.g. 256)
	- Token-wise View
		- 일반적인 MLP나 Transformer는 이 입력을 $[1, N \times D]$ 또는 $[N , D]$ 형태로 보는 것과 달리, FSA는 이 텐서를 transpose하여 $[D , N]$형태로 만듦
		- $D$차원의 임베딩 벡터 하나하나를 하나의 '토큰'처럼 보고, 이 토큰들의 시퀀스($N$개)를 처리 -> 각 임베딩 벡터 내부의 의미를 유지하면서, 이 임베딩들 사이의 상호작용을 학습
	- Funnel Transformer Encoder (여러 블록으로 구성)
		- 각 블록 내: Transformer의 표준 EncoderLayer (멀티헤드 셀프 어텐션과 피드포워드 네트워크)를 적용하여 N개의 토큰(pooled embedding)들 간의 관계를 학습
		- 블록 간: 각 블록 사이에 Pool 연산을 적용하여 $N$개의 토큰 시퀀스의 길이를 $N/\text{stride}$로 줄여나가면서 가장 중요한 정보만 남기고 불필요한 중복 정보를 걸러냄
		- 결과:  $N_{\text{out}}$ (예: 58)개의 $D$차원 임베딩으로 이루어진 더 짧은 시퀀스로 압축
- Linear Compression Encoder (LCE)
	- FSA와 병렬적으로 선형 압축 인코더를 통과
- FSA와 LCE의 출력 임베딩들은 합쳐져 (stacked) 백본 시뮬레이션 네트워크의 입력으로 들어감
- 서빙시에는 이 출력 임베딩들을 4-bit quantization해서 크기를 대폭 줄여서 key-value store에 저장
  

### Backbone Simulation Network 
- 기반 모델 : DLRM (Deep Learning Recommendation Model) 
	- [Software-Hardware Co-design for Fast and Scalable Training of Deep Learning Recommendation Models](https://arxiv.org/abs/2104.05158) @Meta
	- multi-task 랭커로, 여러 예측 작업(예: 좋아요, 댓글, 시청 완료, 스킵 등 이진 분류 작업 및 시청 시간 예측 같은 회귀 작업)을 동시에 수행
	- **실제 프로덕션 모델(다운스트림 모델)과 유사한 전체 랭킹 맥락에서 학습되도록 하여 다운스트림 모델에 지식을 전달하는 효율성을 높이고, 여러 다운스트림 과제에 걸쳐 잘 작동하는 일반화된 사용자 표현이 되도록 함**
- Distant Interest Prediction Objective
	- 유저의 가장 최근 24시간 동안의 행동 기록을 UniTi에서 의도적으로 제거함
	- 가장 fresh한 정보 없이도 예측을 잘 수행해야 하므로, 단기적인 변동성 높은 관심사보다는 **오래된 데이터에서도 파악할 수 있는 장기적이고 안정적인 유저 관심사를 학습**하도록 유도
- 입력
	- DV365 Embedding: 위에서 FSA를 통해 생성된 DV365 사용자 임베딩 
	- 추천 대상 아이템에 대한 피처들
	- 다른 사용자 피처: DV365가 모델링하지 않는, 다른 일반적인 사용자 피처들 
-  해당 입력으로부터 여러 태스크에 대한 예측 점수를 출력하고 binary task에 대해서는 BCE Loss, regression task에 대해서는 MSE Loss를 계산하고, 이들을 합하여 총 손실로 사용


<br>


## Downstream Integration & Serving

![[assets/extremely long user history modeling @instagram (dv365)/recys-architecture.png]]

- Existing System - 오른쪽 녹색 부분
	- DV365가 도입되기 전의 일반적인 대규모 추천 시스템의 흐름 = 실시간 처리와 온라인 학습
	- app에서 사용자 요청이 발생하면 백엔드에서 추천 후보 아이템들을 준비하고 model inference service에서 랭킹 모델을 사용하여 정렬
		- 이때 랭킹 모델은 online trainer로부터 지속적으로 업데이트되는 모델 가중치를 받아 사용
	- 이 구조상으로 온라인 트레이닝은 최신 사용자 행동 데이터를 거의 실시간으로 반영하여 모델을 업데이트하므로, 모델의 freshness를 극대화함 (매우 빠른 피드백 루프)
	- 이런 구조에서 긴 사용자 히스토리를 실시간으로 처리하기에는 비용 이슈가 발생
- DV365와 새로운 컴포넌트들 - 왼쪽  노란색 부분
	- 오프라인 처리 + 비용 효율적인 지식 공유
	- Long-term User History Storage에 UniTi를 저장함. 실시간 접근이 필요 없는 요소이므로 비교적 저렴한 웨어하우스를 사용
	- Data 위 장기 히스토리(UniTi) 와 우측 기존 시스템의 'Training Data Generation'에서 생성되는 Online Training Data의 일부를 결합하여 DV365 Foundation Model 학습을 위한 Offline Training Data를 생성
	- DV365 Foundation Model: 위에 설명된 유저 인코더와 백본 시뮬레이션 네트워크를 포함하는 모델을 Offline Trainer가 학습시킴
		- recurring job scheduler로 주기적으로(몇시간마다) 학습 - 온라인 학습처럼 실시간일 필요는 없음
	- 학습된 foundation model의 인코더 부분만 사용하여 모든 활성 사용자에 대한 DV365 임베딩을 생성하고 양자화 기법을 적용하여 유저ID를 키로 하는 고성능 온라인 key-value store에 저장 (Embedding Cache)
	- 기존 시스템의 Model Inference Service에서 추천 후보 아이템에 대한 예측 점수를 계산할 때 입력으로 DV365임베딩을 조회하여 함께 사용 + 다운스트림별 Model-specific adoption arch를 거쳐서 통합됨

<br>

## Experiments

### setup
- 데이터셋은 인스타그램의 내부 추천 로그에서 생성된 학습 데이터를 사용
	- 기존 프로덕션 학습 테이블: 기존 프로덕션 모델(다운스트림 모델) 학습에 사용되는 데이터로, 사용자 이력 길이가 평균 1500개, 최대 2000개 정도
	- DV365 학습용 테이블: DV365를 위해 특별히 생성된 테이블로 히스토리 길이가 평균 40,000개, 최대 70,000개에 달함 
- DV365 기반 upstream model에서 Normalized Entropy (NE) 지표를 기반으로 모델 디자인을 결정함
- 다운스트림 모델
	- Ranking 
		- DLRM 기반 모델을 사용하며, [HSTU](https://arxiv.org/abs/2402.17152) 라는 강력한 어텐션 기반 시퀀스 인코더를 포함한 당시 프로덕션 모델을 베이스라인으로 설정
		- 평가지표는 BCE Loss를 배경 CTR으로 정규화한 값 (값이 작을수록 좋고 -0.1% 이상 감소하면 통계적으로 유의미한 성능 향상으로 간주)
		- $\text{NE}_k = \frac{\text{BCEloss}(\hat{y}^{(k)}, y^{(k)}) - [p_k \ln(p_k) + (1-p_k) \ln(1-p_k)]}{[p_k \ln(p_k) + (1-p_k) \ln(1-p_k)]}$
	- Retrieval 
		- [Mixture of Logits](https://arxiv.org/abs/2306.04039) 기반 모델을 사용하며, 마찬가지로 HSTU를 포함한 당시 프로덕션 모델을 베이스라인으로 설정
		- 평가지표는 HitRate@1, HitRate@10


### design choices

- sequence encoder
	- 최종적으로 mean-pooling 선택
	- 다른 옵션들: position-weighted pooling, HSTU(어텐션 기반)
	- 퀀스 길이가 짧을 때는 위 옵션들이 Mean-pooling보다 약간의 개선이 있었으나 30K이상의 매우 긴 시퀀스에서는 추가적인 시퀀스 모델링에서 오는 이점이 완전히 사라졌음
	- 시퀀스 정보는 emerging interest에 유용하며, DV365가 목표로 하는 long-term stable interest에는 (비용 효율성까지 고려하면) mean-pooling이 베스트였다
- backbone simulation network
	- DLRM (ranking과 consistent), Siamese network (retrieval과 consistent) 두 가지를 테스트
	- retrieval에서는 성능이 유사하고 랭킹에서는 DLRM 백본이 0.2% NE delta의 유의미한 개선을 보여 DLRM 선택
- user encoder
	- 디자인 선택
		- Compression perspective: Dim-wise vs. Token-wise
		- 인코더 아키텍처: Linear Compression Encoder (LCE), MLP, Vanilla Transformer, Funnel Transformer
		- 다양한 조합을 테스트했을 때 Token-wise 압축 방식이 모든 인코더에서 Dim-wise 방식보다 훨씬 뛰어난 성능을 보임 (모델이 단일 토큰 임베딩 내에서 파라미터 공유를 선호한다는 것을 알 수 있음)
		- 인코더 선택에서는 Vanilla Transformer와 FSA (Funnel Transformer + LCE)가 가장 좋았고, FSA가 파라미터 수가 더 적고 훈련 QPS (Query Per Second)가 10% 더 높았기 때문에 최종 선택

### Product Launches 

- 인스타그램에서 가장 큰 트래픽을 차지하는 릴스서비스에 대한 오프라인 결과만 보고함(다른 서비스에서도 유사한 결과)

![[assets/extremely long user history modeling @instagram (dv365)/ranking.png|400]]
- DV365를 추가했을 때, 모든 랭킹 태스크에서 NE가 평균 0.4% 이상 유의미하게 개선
	- 통합 방식으로는 linear projection이 더 나은 성능

![[assets/extremely long user history modeling @instagram (dv365)/retrieval.png|400]]

- Hit Rate가 2%에서 8%까지 증가
	- 통합 방식으로는 [Gatenet](https://arxiv.org/abs/2007.03519)이 대부분의 태스크에서 더 나은 성능

- Production 
	- 인스타그램과 스레드의 15개 다른 프로덕션 모델에 성공적으로 출시
	- 모든 A/B 테스트 결과를 종합했을 때, 인스타그램 앱 사용 시간을 0.7% 향상시켰으며, 다른 중요한 engagement metrics도 개선
	- 높은 일반화 능력: 매우 이질적인 다운스트림 모델 아키텍처와 목표에도 불구하고, 하나의 DV365 기반 모델에서 생성된 임베딩이 다양한 사용 사례(콘텐츠 추천 품질 향상, 알림 CTR, 스레드 서비스 시작 등)에 효과적임을 입증
	- **임베딩의 staleness가 증가해도 임베딩 품질이 안정적으로 유지**됨

![[assets/extremely long user history modeling @instagram (dv365)/staleness-and-negain.png|450]]
- X축: 누적 학습 데이터의 양을 '일' 단위로 나타낸 것 - 학습이 진행될수록 더 많은 과거 데이터를 모델이 보게 됨
- Y축 (NE Gain (%)): Normalized Entropy (NE)의 개선율(낮을수록 베이스라인 대비 성능향상)
- 비교
	- Fresh Embedding NE Gain: DV365 임베딩을 매일 업데이트하는 경우
		- NE Gain이 처음 3일 동안은 증가하다가, 이후에는 약 -0.35% 수준에서 안정적으로 수렴
	- Stale Embedding NE Gain: DV365 임베딩을 고정된 상태로 업데이트하지 않는 경우 (Age = 초록색 점선이 계속 증가함)
		- fresh와 거의 유사하게 약 -0.35% 수준에서 안정적으로 수렴하며 7일이 지나도 성능 저하가 거의 없음

![[assets/extremely long user history modeling @instagram (dv365)/similarity-between-two-version.png|450]]
- 시간의 변화에 따라서도 임베딩이 안정적으로 유지됨을 보여줌
	- 2개의 7일 간격의 서로 다른 임베딩 버전의 코사인 유사도 -> 높은값(0.95 근처)에 매우 집중되어있음 