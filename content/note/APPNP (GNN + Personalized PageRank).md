---
publish: true
title: APPNP (GNN + Personalized PageRank)
created: 2025-08-22
modified: 2025-08-29T12:33:51.000+09:00
published: 2025-08-29T12:33:51.000+09:00
tags:
  - graph
  - ai-ml
---

> **[Predict then Propagate: Graph Neural Networks meet Personalized PageRank](https://arxiv.org/abs/1810.05997)** / ICLR 2019

- Graph-based semi-supervised classification을 위한 neural message passing
- 문제: GNN에서 neighbor size를 늘리는 것은 (너무 많은 layer) oversmoothing을 유발하므로 일반적으로 제한된 수의 neighbor만 사용

❔ oversmoothing issue란
![[Oversmoothing in GNN]]

# PPNP

\= **Personalized Propagation of Neural Predictions**

![[assets/appnp (gnn + personalized pagerank)/ppnp.png]]

## Prediction과 Propagation의 분리

- prediction
  - node features만 사용해서 간단한 신경망(얕은 MLP)을 통해 해당 노드의 각 클래스별 점수를 예측함
- propagation
  - 위에서 얻은 초기 예측 $H$를 personalized pagerank를 사용해서 전파 (밑에 자세히 설명)
- 이 방식의 장점
  - **Oversmoothing 문제 해결**
    - prediction에 쓰이는 MLP는 얕게 유지하지만 전파는 그 뒷단에서 깊게 가져갈 수 있음
    - 이때 텔레포트(후술) 매커니즘 때문에 매우 깊은 레이어를 쓰더라도(더 먼 이웃 정보를 참조하더라도) 각 노드의 초기 정보를 보존할 수 있어 모든 노드가 전역적인 그래프 특성으로 평균화되는 것을 방지할 수 있음 = **GCN보다 더 넓은 범위의 엣지 정보를 예측에 반영할 수 있음**
  - **모델 유연성 및 모듈성**
    - prediction에 쓰이는 신경망은 어떤 종류의 딥러닝 모델이라도 자유롭게 선택할 수 있음
  - **계산 효율성(파라미터 수 감소)**
    - GCN은 레이어를 깊게 쌓을수록 그만큼 가중치 행렬이 늘어나서 파라미터 수가 급증하는데 personalized pagerank는 학습할 파라미터가 없으므로 모든 파라미터는 prediction 신경망에만 존재함

## Class-Sensitive Personalized PageRank

❓ PR, PPR recap
![[PageRank & Personalized PageRank]]

- PPNP는 사실상 propagation 단계에서 personalized page rank를 그대로 사용함
  - prediction 단계에서 생성된 초기 예측 $H$ ($H\_{i,j}$는 노드 $i$가 클래스 $j$에 속할 예측 점수)
  - personalized pagerank의 closed-form solution을 사용해서 최종 예측을 계산 $Z\_{PPNP} = \text{softmax} \left( \alpha (I\_n - (1 - \alpha) \hat{A})^{-1} H \right)$
    - 원래 PPR은 곱하는 게 원핫벡터(원래 시작노드만 1이고 나머지는 0)였지만, 여기서는 $H$의 각 열을 곱하게 되는 것과 같은데 각 열은 $j$번째 클래스에 대한 모든 노드의 초기 예측 점수 벡터임 -> 즉 초기 예측 결과 해당 클래스와 관련이 높다고 여겨지는 노드들의 값이 높게 반영되게 됨
    - 즉 PPNP에서 각 클래스에 대해 예측(전파)할 때, **특정 확률로 초기 예측시 해당 클래스와 관련성이 높았던 노드들로 되돌아감(텔레포트함)** = Topic-Sensitive

# APPNP

\= **Approximate Personalized Propagation of Neural Predictions**

- closed-form solution이 역행렬 계산으로 인해 대규모 그래프에는 적용이 어려우므로 이를 일반적인 power iteration 방식으로 접근하여 효율적인 근사해를 얻어낸 것
- 처음에  $Z^{(0)} = H$ 에서 시작해서 $Z^{(k+1)} = (1 - \alpha) \hat{A} Z^{(k)} + \alpha H$ 전파횟수 $k$만큼 반복 행렬곱

# Results

![[assets/appnp (gnn + personalized pagerank)/results.png|500]]

- 네 가지 벤치마크 데이터셋(Citeseer, Cora-ML, PubMed, MS Academic)에서 PPNP와 APPNP를 포함한 여러 GNN 모델들의 평균 정확도(Accuracy, Micro F1-score)
- PPNP는 PubMed와 MS Academic에서 메모리 부족(out of memory)으로 실행할 수 없었음 = 대규모 그래프에서는 부적합
- APPNP는 PPNP와 거의 동등한 성능을 보이면서도 모든 데이터셋에서 성공적으로 실행되었고, 특히 큰 그래프에서 우수한 성능

![[assets/appnp (gnn + personalized pagerank)/accuracy_k.png|550]]

- 전파 횟수 $K$에 따른 영향
  - GCN-like propagation은 텔레포트 확률 $\alpha$를 0으로 설정한 것
    - 이 경우 $K$가 증가하면서 정확도가 급격히 떨어짐 (oversmoothing)
  - 반면 APPNP는 $K$가 증가할수록 정확도가 향상되다가 일정 이상 되면 안정화 **(PPNP 해를 근사하는데 그렇게 엄청 큰 $K$가 필요하진 않음)**

![[assets/appnp (gnn + personalized pagerank)/accuracy_alpha.png|450]]

- 텔레포트 확률 $\alpha$
  - 너무 작지도(oversmoothing 경향 증가), 너무 크지도(지역성만 강조, 그래프 정보 부족) 않은 적절한 균형점을 찾는 것이 중요함

![[assets/appnp (gnn + personalized pagerank)/propagation_stage.png]]

- 전파(propagation) 단계가 training과 inference 과정에 각각 어떻게 기여하는지
  - `Never`: 전파를 전혀 사용하지 않음 (표준 MLP처럼 노드 특징만으로 예측)
  - `Training`: 학습 시에만 전파를 사용하고, 추론 시에는 전파 없이 신경망만 사용
  - `Inference`: 학습 시에는 전파 없이 신경망만 사용하고, 추론 시에만 전파를 적용
  - `Inf. & Training`: 둘다에서 전파를 사용 (표준 APPNP)
  - 결과: 표준적인 APPNP(`Inf. & Training`)가 가장 나은데, 신기하게도 학습할 땐 MLP만 학습시키고 추론 시에만 전파를 추가하는 경우(`Inference`)에도 정확도가 나쁘지 않음.
    - PPNP/APPNP의 전파 스킴이 강력하며, 심지어 사전 훈련된 신경망에도 그래프 정보를 활용하여 성능을 크게 높일 수 있음을 보여줌 = 모델의 modularity
