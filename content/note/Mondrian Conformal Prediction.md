---
publish: true
title: Mondrian Conformal Prediction
created: 2025-08-21
tags:
  - ai-ml
cssclasses: ""
---

- [[Conformal Prediction]] (CP)의 확장 
	- 데이터의 heterogeneity를 다루기 위해 고안됨
	- MNIST라고 치면 5를 맞히는 게 0을 맞히는 것보다 훨씬 어렵다면? 공통된 신뢰도 레벨을 가정하기 어렵다
	- 몬드리안 그림처럼 (캔버스를 수직/수평으로 나누고 색상 블록으로 분할된) 데이터를 카테고리화해서 나누고 CP를 적용하자
- partitioning nonconformity score
	- 그룹별로 nonconformity score를 별도로 관리
		- e.g. binary classification에서 클래스 0과 1에 대해 score 분포와 quantile을 따로 계산
	- 같은 그룹(카테고리) 내에서만 calibration set의 score 비교하여 그룹에 대한 조건부 예측 구간/예측 세트를 생성
	- 이때 그룹을 나누는 방식(Mondrian taxonomy)은 **분류문제에서 단순히 클래스일 수도 있고 아니면 특정 피쳐 값에 따라 그룹화한 것일 수도 있는 유연성**을 지님


![[assets/mondrian conformal prediction/mondrian-cp.png|525]]
