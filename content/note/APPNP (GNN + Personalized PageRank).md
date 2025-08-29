---
{"publish":true,"title":"APPNP (GNN + Personalized PageRank)","created":"2025-08-22","tags":["graph","ai-ml"],"cssclasses":""}
---

> **[Predict then Propagate: Graph Neural Networks meet Personalized PageRank](https://arxiv.org/abs/1810.05997)** / ICLR 2019

- Graph-based semi-supervised classification을 위한 neural message passing
- 문제: GNN에서 neighbor size를 늘리는 것은 (너무 많은 layer) oversmoothing을 유발하므로 일반적으로 제한된 수의 neighbor만 사용

❔ oversmoothing issue란


- 그래프의 레이어 수가 깊어질수록 발생하는 문제로, 노드들이 서로 반복적으로 정보를 교환하면서 **모든 노드의 표현이 점점 비슷해져서 구별력이 사라지는 현상** -> GNN의 성능 저하를 유발
	- GNN은 이웃 노드의 정보를 모아서 aggregate한 후 update함
	- 이를 반복할수록 더 멀리 있는 노드의 정보를 섞게 되는데, 이러면서 전체 노드가 그래프 자체의 평균에 가까운 벡터로 수렴함



# PPNP
= **Personalized Propagation of Neural Predictions**

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


- PageRank
	- 구글 검색 알고리즘으로 웹 페이지 간의 하이퍼링크 그래프를 통해서 모든 페이지의 **전역적인 중요도**를 알아내기 위한 것 (이 페이지가 전체에서 얼마나 중요한가?)
	- 랜덤 워크 세팅
		- 페이지 $n$개와 특정 페이지에서 다른 페이지로 가는 링크가 존재하는지 여부를 나타내는 $A$ (Adjacency Matrix)가 있음
		- 서퍼는 각 페이지에서 출발하여 해당 페이지에서 나가는 링크 $d_j$개 중 한 개로 랜덤으로 이동(랜덤워크, $1/d_j$의 확률) 
		- 막다른 곳에서 멈추지 않도록 특정 확률로 랜덤하게 다른 페이지로 ($1/n$ 확률) 빠져나갈 수 있는 텔레포트 옵션이 존재 
	- Power Iteration
		- 처음에 모든 페이지의 점수(최종 얻고자 하는 중요도 점수)는 동일하게 초기화됨 $\mathbf{\pi}^{(0)} = \mathbf{v} = \frac{1}{n} \mathbf{1}$
		- 이 중요도 벡터는 iteration을 반복하면서 계속 업데이트됨 $\mathbf{\pi}^{(k+1)} = d (P^T \mathbf{\pi}^{(k)}) + (1 - d) \mathbf{v}$
			- $d$는 링크를 따라 이동할지 텔레포트를 할지를 결정하는 확률 파라미터
			- $P$는 노드 $i$에서 $j$로 갈 확률($1/d_j$)을 나타내는 transition matrix, $\mathbf{v}$는 텔레포트확률이자 초기벡터랑 똑같음
		- 중요도(=PageRank) 벡터가 수렴하면 stop 
- Personalized PageRank
	- 특정 노드(페이지) 기준으로 한 개별적인 중요도를 알아내기 위한 것 (이 페이지는 A라는 페이지와 얼마나 관련성이 높은가?)
	- 방식은 PageRank와 비슷하지만, 관심을 가지는 노드가 정해져 있고 (해당 노드에서 시작) 텔레포트할 때 랜덤한 다른 노드가 아닌 시작 노드로 돌아온다는 점이 다름
	- $\mathbf{\pi}_{ppr}(x) = (1 - \alpha) P^T \mathbf{\pi}_{ppr}(x) + \alpha \mathbf{s}_x$
		- 이때 이 식을 잘 정리하면, $\mathbf{\pi}_{ppr}(x) = \alpha (I_n - (1 - \alpha) P^T)^{-1} \mathbf{s}_x$ 이런 식으로 역행렬을 통해 (closed-form solution) $\mathbf{\pi}$를 바로 구해버릴 수도 있음 (사실상 power iteration을 무한히 반복했을 때의 최종 결과)
		- 단 대규모 그래프에서는 역행렬 계산이 비용과 메모리가 매우 빡세서 역시 power iteration으로 가는 게 낫다

- PPNP는 사실상 propagation 단계에서 personalized page rank를 그대로 사용함
	- prediction 단계에서 생성된 초기 예측 $H$ ($H_{i,j}$는 노드 $i$가 클래스 $j$에 속할 예측 점수)
	- personalized pagerank의 closed-form solution을 사용해서 최종 예측을 계산 $Z_{PPNP} = \text{softmax} \left( \alpha (I_n - (1 - \alpha) \hat{A})^{-1} H \right)$
		- 원래 PPR은 곱하는 게 원핫벡터(원래 시작노드만 1이고 나머지는 0)였지만, 여기서는 $H$의 각 열을 곱하게 되는 것과 같은데 각 열은 $j$번째 클래스에 대한 모든 노드의 초기 예측 점수 벡터임 -> 즉 초기 예측 결과 해당 클래스와 관련이 높다고 여겨지는 노드들의 값이 높게 반영되게 됨
		- 즉 PPNP에서 각 클래스에 대해 예측(전파)할 때, **특정 확률로 초기 예측시 해당 클래스와 관련성이 높았던 노드들로 되돌아감(텔레포트함)** = Topic-Sensitive



# APPNP
= **Approximate Personalized Propagation of Neural Predictions**

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