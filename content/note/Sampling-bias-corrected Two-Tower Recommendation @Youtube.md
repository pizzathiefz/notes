---
publish: true
title: Sampling-bias-corrected Two-Tower Recommendation @Youtube
created: 2024-10-30
tags:
  - recsys
  - two-tower
  - representation-learning
cssclasses: ""
---


> [**Sampling-bias-corrected neural modeling for large corpus item recommendations**](https://research.google/pubs/sampling-bias-corrected-neural-modeling-for-large-corpus-item-recommendations/) (2019)


> [!quote] Two Tower Model
> 

![[assets/sampling-bias-corrected two-tower recommendation @youtube/youtube-dnn-two-tower.png|500]]
- **두 개의 입력을 각각 독립된(또는 파라미터를 공유하는) 인코더에 넣어 임베딩을 만든 뒤 임베딩 사이의 유사도 함수를 적용하는 구조**를 뜻함 (NLP쪽에서 처음에 주로 사용)
	- = Siamese network
	- 유사도 계산은 일반적으로 dot product, cosine similarity 등
	- inference 시에는 유사도 계산해서 top-k를 리턴
- 사용자/context -> User Tower
- 아이템 -> Item Tower

- [[note/DNN Recommendation @Youtube]]에서 제시된 retrieval 방식과 거의 유사함 (dot product + negative sampling + softmax)
- item (video id, channel id) -> embedding, hashing, average
- user (최근 본 비디오 id) -> embedding average

> [!quote] In-batch Negative Sampling 

- 임베딩 기반의 대규모 분류/유사도 학습 시 사용되는 트릭으로 **현재 mini-batch 안의 다른 item들을 negative로 재활용**
	- 별도 negative 샘플링 과정이 불필요하고 메모리 절약, 설정에 따라 hard negative 역할도 가능

![[assets/in-batch negative sampling/in-batch-negative-smapling.png|525]]
- 각 row는 하나의 **쿼리(혹은 user)**, 각 column은 **item**을 의미
- desired items(초록색): 이번 mini-batch에 포함된 **positive item**들
- sampled negative items(파란색): 해당 쿼리와 상호작용하지 않은 다른 아이템들 중 샘플링된 negative item들
	- 위 그림에서는 다른 쿼리의 positive만 negative로 샘플링하고 있음 -> hard negatives


- 여기서도 positive item들만 사용
	- 조금 시청하면 0, 다 봤으면 1
	- 아예 시청하지 않은 아이템들은 사용하지 않음
- **Stream Frequency Estimation**
	- ⚠️ **이 논문의 핵심 변경점**
	- 문제: 매우 인기 있는 아이템이 negative에 너무 많이 포함될 수 있음 (popularity bias) -> 즉 인기 아이템이 페널티를 받음
	-  해결: 각 아이템의in-batch softmax의 로짓에서 popularity(=배치의 등장황률) 를 빼주는 correction
		- $s_c(x_i,y_{j)}= s(x_{i},y_{j}) - log{p_j}$
	- $p_j$를 어떻게 추정하나
		- 그냥 전체 corpus counting은 안 됨
			- 유튜브의 아이템 개수를 고려하면 매번 배치마다 카운팅하는 게 사실상 불가능하고, 미리 계산해두면 실시간 변동하는 trend를 반영할 수 없음 
		- **스트리밍으로 각 아이템의 배치 간 도달 간격의 EWMA(지수 가중 이동 평균)을 사용**함
			- $A[h(y)]$ : 아이템 $y$가 마지막으로 관찰된 gloabl step
			- $t$ : 현재 step, $\alpha$ : 학습률 파라미터 (커질수록 변화를 크게 반영)
			- $B[h(y)] \leftarrow (1-\alpha)B[h(y)] +\alpha(t-A[h(y)])$
			- 즉 $B$는 스트리밍으로 업데이트 되는 평균적인 해당 아이템의 등장 간격 -> 이 값의 역수를 $p$로 사용 (등장 간격이 넓을수록 인기도가 낮은 아이템)
			- 왜 $h(y)$로 표기하나? -> hash sketch : 메모리가 터지지 않게 하기 위해 모든 아이템을 키로 저장하지 않고 고정된 크기의 배열을 만들어서 각 아이템을 해당 배열 내 인덱스로 맵핑 (해시 충돌, 즉 다른 아이템이 같은 위치로 맵핑될 경우 max를 써서 해결함. 등장 간격을 너무 적게 잡을 때의 위험이 더 크다고 보기 때문)  

![[assets/sampling-bias-corrected two-tower recommendation @youtube/youtube-dnn-two-tower-detail.png|650]]
- ⬆️ 최종 구조
- training
	- sequential training - 새 학습 데이터는 하루에 한번씩 일단위로 생성, 이어서 학습, shuffle하지 않음(최근의 distribution shift)
	-  빠른 inference를 위한 index training (학습된 item embedding을 기반으로 ANN 검색 구조를 빌드하는 과정)