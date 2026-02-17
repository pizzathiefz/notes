---
publish: true
title: Long-Term + Multi-Interest Retrieval @Taobao
created: 2025-11-11
tags:
  - recsys
  - representation-learning
cssclasses: ""
---

> [User Long-Term Multi-Interest Retrieval Model for Recommendation](https://arxiv.org/abs/2507.10097)

- 기본적으로 retrieval은 활용할 수 있는 행동 시퀀스의 볼륨이 ranking보다 제한적이기 때문에 두 단계 간의 불일치가 발생
- 해당 연구에서 제시하는 ULIM(User Long-Term Multi-Interest Retrieval Model)은 더 장기간의 시퀀스를 multi interest를 고려하여 모델링하고 이를 retrieval에서 활용할 수 있게 함


### Category-Aware Hierarchical Dual-Interest Learning 

![[assets/long-term + multi-interest retrieval @taobao/CHDL.png|500]]

- 우선 유저의 장기간 raw 시퀀스를 category-aware하게 분할함
	- Taobao 데이터셋이므로 여기서 카테고리는 상품이 속한 분류(e.g. 전자기기, 의류)가 될 것
	- 이때 ranking 단계와 동일한 카테고리 분류를 사용해야 함(일치성을 위해)
	- 이 분할된 하위 시퀀스들은 유저의 장기적인 관심사 cluster를 나타내게 됨
	- 장기 시퀀스는 매우 길지만(L) 카테고리 N개면 O(L/N) 
- 유저의 가장 최근 시퀀스(최대 100개의 행동/카테고리 무관)를 Multi-head Self-Attention 처리 후 average pooling하여 short-term embedding을 얻음 = 이는 유저별 하나만 존재
	- 유저의 단기 관심사를 나타내는 임베딩을 장기 시퀀스에 대해 target attention의 쿼리 벡터로 사용함!
- 학습이 이루어지는 방식은
	- 유저가 특정 아이템 하나를 클릭한다 = target item
	- 많은 카테고리별 분할된 장기 시퀀스 중에서 타겟 아이템이 속한 카테고리 C에 해당하는 시퀀스만 선택한다
	- 단기 관심사를 쿼리 벡터로 사용하여 target attention을 통해 이 장기 시퀀스를 주어진 카테고리 C에 대한 유저의 장기 관심사를 나타내는 임베딩 벡터를 얻는다
		- 이때 negative sample도 C에서만 선택한다. 즉 학습은 항상 전체 candidate pool이 아닌 해당 카테고리 내에서만 이루어짐
		- **target attention을 통해서 유저의 긴 과거 시퀀스 중 현재 단기적인 관심사와 관련이 높은 정보들을 찾아낸다**고 볼 수 있음. DIN에서는 이 타겟 쿼리를 후보 아이템으로 썼었음
- 즉 CHDL은 유저의 단기 관심사 임베딩, 각 카테고리에 대한 장기 관심사 임베딩을 학습함

<br>

### Pointer-Enhanced Cascaded Category-to-Item Retrieval 

![[assets/long-term + multi-interest retrieval @taobao/PGIN.png|550]]

- PGIN (Pointer-Generator Interset Network)
	- 얘의 목표는 유저가 가장 관심을 가질 만한 **K개의 카테고리**를 맞히는 것 = multi-class classification
	- PointerNet
		- 중복제거되고 시간 순으로 정렬된 장기 및 단기 카테고리 이력 시퀀스를 입력받아 유저 프로필 Target-Attention을 적용  -> backward projection을 통해 전체 카테고리 분포로 맵핑
		- 유저의 이미 형성된 명시적 카테고리 interest을 pointer 형태로 (이미 관심 있었던 것 중에) 어떤 것을 클릭할 확률이 높은지 예측
	- GeneratorNet
		- raw 장기 및 단기 행동 시퀀스를 MHSA와 풀링을 통해 인코딩하고 유저 프로필 Target-Attention -> MLP로 카테고리 확률을 출력
			- 그림에 cate seq만 있어서 좀 헷갈렸는데 카테고리 레벨로 변환된 시퀀스가 아니라 아이템 레벨의 원래 시퀀스를 그대로 쓴다는 말인듯
		- 유저의 최근 implicit한 행동 패턴을 학습해서 그에 맞는 새로운/잠재적 카테고리를 예측
	- 최종 출력은 학습된 gating network를 통해 이 두 출력 분포를 혼합 $b_{y}= P_{\text{poi}}y_{\text{poi}} + (1-P_{\text{poi}})y_{\text{gen}}$
- Category-Constrained Retrieval
	- PGIN이 내놓은 K개의 카테고리에 대해 각각 장기시퀀스를 분할한 하위 카테고리 시퀀스를 얻고 위에 학습된 모델을 사용해 장기 임베딩을 얻음(=K개의 임베딩)
	- 그리고 이 K개에 대해 카테고리가 일치하는 후보 풀 내에서만 병렬로 ANN을 수행함
	- = 다양한 관심사에 맞는 아이템을 효율적으로 검색할 수 있음
	- +전체 후보 풀에서 단기 임베딩을 통해 ANN도 함



- offline결과
![[assets/long-term + multi-interest retrieval @taobao/offline-result.png|380]]
- online 결과: 5.54% 클릭, 11.01% 주문, 4.03% GMV 상승

- ablation 특이사항
	- Target-Attention 대신 Self-Attention을 사용하면?
		- 다른 모델보다는 괜찮지만 성능이 떨어지긴 함. **즉 Short-Term Interest를 쿼리로 사용하여 Long-Term Interest를 동적으로 추출하는 target attention이 단순히 장기 시퀀스 내재적인 정보만 사용하는 것보다 효과적**이다.