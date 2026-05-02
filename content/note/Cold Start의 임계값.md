---
publish: true
title: Cold Start의 임계값
created: 2025-11-03
modified: 2025-11-03T19:09:44.000+09:00
published: 2025-11-03T19:09:44.000+09:00
tags:
  - recsys
  - cold-start
cssclasses: ""
---

> [Recommendation Is a Dish Better Served Warm](https://arxiv.org/abs/2508.07856) (2025)


![[assets/cold start의 임계값/intro.png]]

- 일반적으로 CF기반 추천 시스템에서 상호작용이 너무 적은 아이템/유저는 노이즈를 유발하여 품질을 저하시키므로 특정 임계값을 정해 필터링하는 것이 관행
- 그러나 이러한 cold user 또는 cold item을 정하는 기준은 대부분 자의적임
	- 최근 연구들 대부분 필터링 결정에 대한 설명 자체를 언급하지 않고 있고 임계값에 대한 설명은 더더욱 없음 (그림)
- 유저와 아이템에 대해 cold-warm threshold를 정할 수 있는 model-agnostic한 방법론 제안
	- Item-Based Threshold
		- 목표: 아이템이 warm으로 간주되기 위해 필요한 최소 상호작용의 수(필터링 기준)을 식별
		- 각 아이템 $i$에 대해 상호작용 데이터 집합 $M(i)$에서 $N$개의 상호작용을 무작위로 추출하여 이를 기반으로 추천 모델을 학습하고, **아이템 기준의** HR@K와 NDCG@K 성능을 확인 -> 이 과정을 다양한 $N$값에 대해 여러 아이템에 대해 반복하여 평균
			- 이때 이 성능지표는 사용자별 ground truth과 비교하는 게 아니라 해당 아이템 $i$가 추천 목록에 얼마나 잘 나타나는지(등장 빈도 및 랭킹)를 의미함!
	- User-Based Threshold
		- 목표: 유저가 의미 있는 추천을 받기 위해 필요한 최소 상호작용의 수(필터링 기준)을 식별
		- 모델은 1회 학습하여 고정하고 추론 단계에서 각 테스트 사용자의 전체 상호작용 기록에서 $N$개의 상호작용을 샘플링하여 타임스탬프 순으로 정렬 -> NDCG@10, HR@10으로 성능 확인

![[assets/cold start의 임계값/eval-setting.png]]

- 실험 세팅
	- global timepoint
		- 기존에 next item prediction 추천 문제에서 사용하는 Leave-one-out (각 유저의 마지막 상호작용을 테스트 세트로 지정하고 나머지를 학습 세트로 사용)은 leakage가 있을 수 있음
		- 모든 상호작용의 0.9-quantile시점을 Global timepoint로 설정해서 이 기준으로 학습/검증/테스트셋을 분리
			- 모든 상호작용이 GT 이전에 발생한 경우 -> 학습/검증으로 분할 (검증 유저의 경우 마지막 상호작용 하나를 ground truth로 지정하는 leave-on-out방식 적용) 
			- GT 이후 발생한 상호작용이 있는 유저 ->테스트셋 
	- 이때 item-based의 경우 successive evaluation(그림a)을 사용하고 user-based의 경우 GT이후 상호작용 중 가장 첫번째 상호작용만 ground truth로(예측이 ground) 하여 나머지는 버림(discarded holdout; GT에서 멀어질수록 성능이 저하되는 효과를 빼고 보려고)
	- item-based의 경우 매번 모델을 재학습하는 비용이 크므로 카탈로그에서 무작위로 샘플링 된 아이템 $S (=1000)$개에 대해서만 진행했고 해당 타겟 아이템의 상호작용은 테스트/검증 세트에서 제거했음 ($N$ 의 값의 개수 $\times$ $S$ 만큼의 모델 재학습을 한 것)
	- 최근 편향을 없애기 위해 상호작용은 랜덤으로 뽑았는데, sequntial 추천 문제에도 적용되도록 하기 위해 상호작용을 샘플링할 때 시간순으로 정렬해줬음(그래도 이빠진 시퀀스라.. 장단이 있을듯)


![[assets/cold start의 임계값/result-table.png]]

![[assets/cold start의 임계값/result-k.png]]
- item-based
	- 빨간 선이 성능이 급격히 상승하는 지점 (cold - warm 임계)
	- K가 커질수록 추천 목록의 크기가 커지므로 타겟 아이템이 포함될 확률이 높아져 곡선이 부드러워짐(성능 변화 지점이 덜 뚜렷해짐)

![[assets/cold start의 임계값/result-n.png]]
- user-based
	- 빨간 선이 추천 품질이 plateau에 도달하는 지점 (이보다 더 늘려도 성능 향상에 도움이 되지 않음)
	- SASRec-CE이 대체로 다른 협업 필터링 모델(EASER, PureSVD, ItemKNN)보다 더 긴 사용자 이력을 요구하는 경향이 있었음
	- 각 데이터셋(ML-1M, BeerAdvocate 등)마다 임계값이 달랐음 (데이터셋, 도메인에 따른 선택 중요)
