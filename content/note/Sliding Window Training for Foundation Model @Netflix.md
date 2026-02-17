---
publish: true
title: Sliding Window Training for Foundation Model @Netflix
created: 2025-11-02
tags:
  - recsys
cssclasses: ""
---

> [Sliding Window Training - Utilizing Historical Recommender Systems Data for Foundation Models](https://arxiv.org/abs/2409.14517) (2024)

- [[note/Foundation Model for Personalized Recommendation @Netflix]] 에서 사용자의 장기 시퀀스를 가지고 foundation model을 학습할 때 사용한 sliding window training
- model/dataset
	- baseline 모델로는 auto-regressive prediction objective를 따르는 RecSys 모델
	- online serving latency 제약으로 인해 입력 시퀀스 길이를 최대 100개로 제한하나 해당 기법은 시퀀스 길이와 무관하게 적용 가능
	- 2억 5천만 명의 사용자 상호작용(재생,좋아요,목록추가) 데이터 사용

![[assets/sliding window training for foundation model @netflix/control.png|350]]

- baseline(control) training loop = truncating sampler
	- 가장 최근의 상호작용 기록 100개만 선택

![[assets/sliding window training for foundation model @netflix/sliding-window.png|350]]
- sliding window training loop = sliding window sampler
	- 100개 크기의 sliding window를 시퀀스 내에서 계속 슬라이딩 해가면서 입력을 만듦
	- 더 많은 사용자 상호작용 시퀀스가 인코딩되어, 모델이 사용자의 long-term interests에 대해 더 많이 학습하게 됨
- mixed method
	- 최근 상호작용은 현재 행동에 즉각적으로 관련성이 높지만, 오래된 상호작용은 사용자의 상호작용 패턴과 long-term interest를 학습하는 데 유용 = 2가지 목표가 존재
	- 전체 N epoch중에서 X epoch 동안은 fixed latest window, N-X epoch동안은 sliding window 사용

![[assets/sliding window training for foundation model @netflix/result.png|400]]

- Mixed-1000:  fixed recent epoch와 sliding window epoch를 혼합하며, sliding window는 최대 1000개 아이템 이벤트까지 거슬러 올라감
- sliding window training 접근 방식이 모든 평가 지표에서 baseline보다 효과적임을 보여줌