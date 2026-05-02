---
publish: true
title: Deep & Cross Network
created: 2024-10-30
modified: 2025-10-28T18:55:21.000+09:00
published: 2025-10-28T18:55:21.000+09:00
tags:
  - recsys
  - ctr-prediction
---

# DCN

> [**Deep & Cross Network for Ad Click Predictions**](https://arxiv.org/abs/1708.05123) (2017)

![[assets/deep & cross network/deep-cross-network.png|575]]

- deep network와 cross network의 출력이 concat되어 FC -> Logit -> sigmoid(확률)
  - CTR 예측 (Binary Cross Entropy Loss)
- **deep network**
  - 일반적인 DNN구조
  - 복잡한 암묵적인 비선형 관계(상호작용)을 학습함
- **cross network**
  - 명시적인 feature간의 상호작용을 학습함
    ![[assets/deep & cross network/cross-layer.png|500]]
- **layer의 개수**는 피쳐들 간의 high-order interaction을 **몇 차**까지 모델링할 건지를 의미함
  - 1개 layer -> 2-way interaction e.g. `user_age * item_price`
  - 2개 layer -> 3-way interaction e.g. `user_age * item_price * item_category`
  - ...
- 각 layer에서 이번 layer의 입력($x'$)과 처음 입력값($x\_0$)을 cross
- 마지막 x는 residual connection의 개념
  - x는 이전 layer까지 학습된 모든 특성 상호작용 -> 이것도 다음 layer로 전달함으로써 $l$-layer 네트워크가 1차부터 $l$+1차까지 모든 상호작용을 포함하게 함
  - feature crossing부분이 이번 layer x과 다음 layer x의 잔차를 학습하도록 설계되어 이전 상태에서 추가적으로 필요한 변화량만을 학습 (효율적, 안정적인 학습)

### contribution

- 수동 피쳐 엔지니어링 불필요 (cross network에서 자동으로 피쳐를 교차시킨 상호작용을 학습)
- 한정된 차수(bounded-degree)의 피쳐 상호작용을 효율적으로 학습할 수 있음

<br>

# DCN v2

> [**DCN V2: Improved Deep & Cross Network and Practical Lessons for Web-scale Learning to Rank System**](https://arxiv.org/abs/2008.13535) (2020)

![[assets/deep & cross network/dcnv2.png|525]]

- 2가지 방식으로 조합할 수 있음 stacked, parallel
  - 기존 DCN은 parallel이었음

![[assets/deep & cross network/dcnv2-cross-layer.png|475]]

- cross layer의 수식에서 가중치를 벡터가 아닌 행렬로 변경
  - 더 많은 파라미터를 사용하여 모델의 표현력을 크게 향상

🌟 초기 DCN에서는 cross layer를 6-8개로 제안했지만 DCN v2는 향상된 표현력으로 인해 1~2개의 cross layer로도 정확성 확보(2개를 초과하면 성능 향상이 정체됨)

![[assets/deep & cross network/dcnv2-mixture-of-low-rank.png|450]]

- Mixture of low-rank experts
  - 하나의 복잡한 큰 가중치 행렬을 학습하지 않고 대신 여러 개의 low-rank expert (더 작은 가중치 행렬) 를 학습한 뒤 weighted sum(softmax)해서 사용
    - (a)를 보면, 노란색(초기의 가중치 행렬)은 singular value들이 매우 천천히 감소하는데 파란색(학습 후의 행렬)은 하위로 내려갈수록 singular value가 급격히 감소하므로 아주 소수의 중요한 차원에 대부분의 정보가 들어있다는 것을 의미함 = full-rank 행렬이 아닌 처음부터 low-rank로 구성해도 적은 파라미터로 중요한 내용은 다 학습할 수 있음
  - weighted sum을 어떻게 할 건지는 gating network가 입력 $x\_l$을 보고 결정
- ➡️ 상황별 적합한 표현력, overfitting 방지, 적은 파라미터 수로 계산 효율성 증대-> 대규모 scale 서비스에서도 서빙 가능
