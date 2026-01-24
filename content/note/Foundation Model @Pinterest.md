---
{"publish":true,"title":"Foundation Model @Pinterest","created":"2025-12-11","tags":["recsys","generative-recsys"],"cssclasses":""}
---

> [PinFM: Foundation Model for User Activity Sequences at a Billion-scale Visual Discovery Platform](https://arxiv.org/abs/2507.12704)

- billion-scale 시각 콘텐츠 discovery 플랫폼을 위한 사용자 활동 시퀀스의 Foundation Model
	- 200억 개 이상의 파라미터를 가진 Transformer 모델을 방대한 사용자 활동 데이터로 pretrain한 후 특정 애플리케이션에 맞게 fine-tuning


## Methodology

![[assets/foundation model @pinterest/pinfm-training.png|650]]

### Pretraining
- 데이터 구성
	- 각 사용자의 과거 활동은 타임스탬프를 기준으로 오름차순으로 정렬, 최대 시퀀스 길이는 16,000으로 제한
	- 사용자의 전체 활동 시퀀스 $S = [S_1, S_2, \dots, S_N]$
		- 각 $S_i$는 $i$-번째 이벤트, 즉 $[t_i, a_i, v_i, id_i]$ 튜플(timestamp $t_i$, action type $a_i$, surface type $v_i$, item identifier $id_i$)
	- 학습 중에는 사용자 시퀀스를 길이 $L$의 겹치지 않는 세그먼트로 나눔
- 모델 및 입력
	- 백본: GPT2 아키텍처에 Pre-LN을 적용한 decoder-only Transformer를 사용
	- 모델 입력: 
		- item identifier $id_i$를 embedding vector $E_i = \text{emb}(id_i)$로 매핑하여 embedding matrix $E = [E_1, E_2, \dots, E_m]$을 형성
		- Surface 및 action type 시퀀스도 embedding table을 통해 $V = [V_1, V_2, \dots, V_m]$ 및 $A = [A_1, A_2, \dots, A_m]$으로 
		- pointwise MLP $\phi_{in}$을 통해 백본 모델 $M$의 입력으로 전달
		- $M$의 최종 hidden state는 또 다른 pointwise MLP $\phi_{out}$을 통해 사용자 representation 시퀀스 를 생성
			- $H = [H_1, H_2, \dots, H_m] = \phi_{\text{out}}(M(\phi_{\text{in}}(E + V + A)))$
- Loss Function
	- **infoNCE-based loss**
		- 각 사용자 representation $H_i$에 대해 시퀀스의 $i$-번째 위치 다음에 긍정적으로 engage된 아이템(embedding $z_{i+1} = \psi(\text{emb}(id_{i+1}))$, $\psi$는 MLP와 L2 normalization)이 있을 때
		- $$L(H_i, z_{i+1}) = - \log \frac{\exp(\text{sim}(H_i, z_{i+1}) / \tau)}{\exp(\text{sim}(H_i, z_{i+1}) / \tau) + \sum_{k=1}^K \exp(\text{sim}(H_i, z_{-k}) / \tau)}$$
			-  $\text{sim}(a, b) = a^T b$는 내적(inner product)
			- $\tau$는 학습 가능한 temperature parameter
			- $z_{-k}$는 in-batch로 샘플링된 negative sample embedding
	- **Next Token Loss (L_ntl)**
		- 위 $L(H_i, z_{i+1})$ 손실은 $H_i$에 대해 미래에 긍정적으로 engage된 아이템이 있을 때만 적용됨
		- $$L_{ntl} = \sum_{i=1}^{m-1} L(H_i, z_{i+1}) \mathbf{1}[a_{i+1} \in A_{pos}]$$
			-  $A_{pos}$는 미리 정의된 긍정적인 action의 집합, $\mathbf{1}[\cdot]$은 indicator function임
	- **Multi Token Loss (L_mtl)** 
		- 사용자 관심사가 짧은 기간 동안 일관적인 경향이 있으므로, 길이 $L'$의 윈도우(window) 내 미래 토큰을 예측
		- $$L_{mtl} = \sum_{i=1}^{m-1} \sum_{j=i+1}^{i+L'} L(H_i, z_j) \mathbf{1}[a_j \in A_{pos}]$$
	- **Future-Token Loss (L_ftl)**
		- downstream ranking model의 input sequence length $L_d$에 가까운 시퀀스 길이에 대해 모델이 더 predictive하게 되도록 $H_{L_d}$에 대한 미래 윈도우의 긍정적인 토큰을 예측하는 손실을 추가
		- $$L_{ftl} = \sum_{j=L_d+1}^{L_d+L'} L(H_{L_d}, z_j) \mathbf{1}[a_j \in A_{pos}]$$
	- mtl과 ftl이 뭐가 다른지 헷갈리는데
		- mtl은 입력 시퀀스 내 모든 유효한 위치에서 고정된 미래 윈도우 내를 예측 -> 시퀀스 전반에 걸친 단기적/다각적 관심사 학습
		- ftl은 다운스트림 입력 길이의 최종 위치 $L_d$(딱 하나)에서 고정된 미래 윈도우 내를 예측 -> 실제 서비스 환경에 대한 예측 성능 강화 및 정렬 (즉 실 서비스에서는 이 사용자의 최근 $L_d$ 개 활동만을 볼 건데 그걸로 구성된 사용자 표현이 정확하게 미래 행동을 예측할 수 있었으면 좋겠어)

### Fine-Tuning

- **랭킹 모델 통합**
	- 대부분의 랭킹 모델은 DLRM 또는 DCN과 같은 feature crossing layer를 가진 분류 모델
	- PinFM은 사용자 활동 시퀀스를 위한 모듈로 추가
- 이때 사용자 활동 시퀀스와 candidate item을 어떻게 융합할 것인가
	- **Early fusion**: candidate item이 사용자 시퀀스에 추가되어 사용자 시퀀스 모듈의 입력으로 사용 
		- 더 강력한 예측 능력을 제공하지만, 동일한 요청 내에서도 각 candidate item마다 PinFM의 입력 시퀀스가 달라짐 -> 후술할 DCAT을 통해 효율적인 처리 가능
	- **Late fusion**: 사용자 시퀀스를 입력으로 받아 사용자 embedding을 생성하고, 이는 나중에 다른 모듈의 출력과 통합 
		- 동일한 요청에 대해 PinFM의 출력을 caching할 수 있지만 PinFM이 각 candidate item에 대해 사용자 활동 시퀀스를 contextualize할 수 없다는 단점
- candidate 아이템에 대해서 콘텐츠 임베딩, 그래프 기반 임베딩 등 몇 가지 추가 임베딩 피쳐 사용이 가능함
	- 사용자 시퀀스 모듈 입력으로 투영된 ID 임베딩과 함께 투영하고 합산할 수도 있고, 이 경우 투영된 임베딩을 사용자 시퀀스 모듈 입력 공간에 정렬하기 위한 손실이 추가됨
- 사전 학습된 모델이 다운스트림 랭킹 모델의 시퀀스 분포에 더 빠르게 적응하도록 하기 위해 다운스트림 랭킹 모델 손실에 L_ntl 및 L_mtl 손실을 선택적으로 추가
- 사전 학습된 정보가 overwrite되지 않도록 사전학습된 모듈의 학습률은 랭킹 모델 학습률의 약 1/10로 설정
- 사용자 시퀀스 모듈 출력에 다운스트림 모델의 랭킹 손실을 적용하고, 사용자 시퀀스 모듈과 최종 랭킹 모델 예측값 간의 예측을 일치시키기 위한 MSE 손실도 함께 사용 시 다운스트림 랭킹 모델의 성능 향상
- Cold-start 아이템의 경우
	- Candidate item id randomization (CIR): fine-tuning 시 candidate item ID의 10%를 무작위로 선택하여 randomization함으로써 cold-start 상황을 시뮬레이션
	- candidate item이 fresh한 경우 (예: 학습 샘플 요청 시간으로부터 T일 이내에 생성된 경우) PinFM 생성 embedding의 출력에 dropout을 추가 (fresh할수록 강하게)
- 그외 design choices
	- 사전 학습 시에는 LLM과 유사한 이유로 unidirectional Transformer를 선호
	-  ID vs. pretrained embeddings: ID 기반 시퀀스 표현이 유연성과 확장성 측면에서 선택 (사전 훈련된 임베딩을 사용하면 사용자 시퀀스 특징에 대한 저장 및 서빙 데이터 볼륨이 수백 배 더 커져야 하므로 인프라에 더 많은 부담)

<br>

## Efficiency

![[assets/foundation model @pinterest/pinfm-serving.png|450]]


*   **Deduplicated Cross-Attention Transformer (DCAT)**:
    *  Serving 시점에서는 고유한 사용자 시퀀스가 score할 candidate 수보다 현저히 적다는 점(1:1000)을 활용
    * Transformer 계산을 사용자 이력 시퀀스에 Transformer를 적용하는 context component와 각 scoring할 아이템을 사용자 이력과 함께 평가하는 crossing component로 분리
    *  **Context Component**
        * Context component는 사용자당 한 번만 계산되며, 각 Transformer layer의 keys와 values는 KV cache로 저장
        * $X^{(0)}_u = \Psi(X^{(0)}) \in \mathbb{R}^{B_u \times L_d \times d}$
        * $Q^{(l)}_u = W_q X^{(l-1)}_u$, $K^{(l)}_u = W_k X^{(l-1)}_u$, $V^{(l)}_u = W_v X^{(l-1)}_u$
        * $X^{(l)}_u = g(\text{Attention}(Q^{(l)}_u, K^{(l)}_u, V^{(l)}_u), X^{(l-1)}_u)$
    *  **Crossing Component**
        * 저장된 context KV cache를 사용하여 전체 candidate item 목록과 cross-attention을 수행
        * inverse deduplication $\Psi^{-1}$를 KV cache에 적용하고 candidate KV와 concatenate
        * $Q^{(l)}_c = W_q X^{(l-1)}_c$, $K^{(l)}_c = W_k X^{(l-1)}_c$, $V^{(l)}_c = W_v X^{(l-1)}_c$
        * $X^{(l)}_c = g(\text{Attention}(Q^{(l)}_c, \Psi^{-1}(K^{(l)}_u) || K^{(l)}_c, \Psi^{-1}(V^{(l)}_u) || V^{(l)}_c), X^{(l-1)}_c)$
            * $||$ 연산자는 sequence dimension을 따라 concatenation함을 나타냄
    *  이 최적화를 통해 throughput이 600% 증가했음
    * 추가적으로 시퀀스 길이를 256으로 유지하고, concatenation을 제거하며, attention mask를 rotate하여 처리량을 25% 더 향상
*   **Large Embedding Table**
    * 8개의 sub embedding table을 사용하며, 각 table은 8천만 행, 32차원
        * 각 item ID $id_i$에 대해 256차원 float16 embedding vector $E_i = \bigoplus_{j=0}^7 \text{emb}_j(\text{hash}_j(id_i))$를 얻음
        * 총 200억 개의 학습 가능한 파라미터를 포함
    *  **Embedding quantization (PTQ)**
        * post-training quantization를 통해 데이터 크기를 줄임
        * 각 32차원 fp16 벡터를 32개의 int8/int4 값 + 1개의 fp16 scale 값 + 1개의 fp16 bias 값으로 변환
        * Int4 설정에서는 각 벡터를 512비트에서 160비트로 압축하여 embedding table 크기를 31.25%로 줄임
        * 온라인 Serving 테스트에서 int4 양자화는 성능 저하가 미미했으며, L2 norm deviation은 int8에서 0.45%, int4에서 7.8%로 나타남
*   **Serving Infrastructure**
	* embedding table은 CPU 클러스터에서 호스팅되고, dense model은 GPU 클러스터에서 처리
	* Inference router는 사용자 시퀀스 및 candidate item에 대한 관련 ID embedding을 CPU 클러스터에서 가져와 GPU 클러스터로 전달

<br>

## Experiment

- PinFM은 Home Feed (HF) 및 Related Items (I2I)라는 두 가지 주요 추천 시스템에 배포
*  **데이터셋 및 Metrics**
	* 사전 학습에는 지난 2년 간의 사용자 활동 데이터가 사용
	* fine-tuning에는 3주간의 HF/I2I 데이터가 사용
	* 평가 지표는 `HIT@3`으로, 추천된 상위 3개 아이템이 사용자 action (Save, Click, Share, Hide 등)을 받았는지 여부를 측정 + 모든 결과는 `HIT@3`의 relative lift로 보고됨
*   **Offline Experiments**:
    *  Input sequence construction: `PinFM-base`, `PinFM-GraphSAGE`, `PinFM-GraphSAGE-LT`, `PinFM-lite-mean`, `PinFM-lite-last` 등 다양한 PinFM 변형이 비교되었고 `PinFM-GraphSAGE-LT`가 가장 좋은 `Save HIT@3` (3.76%) 성능
        * 기본 PinFM(사용자 시퀀스 early fusion) + candidate의 GraphSAGE(아이템 간 그래프 구조에서 학습된 임베딩) + learnable token 추가
    *  Cold-start handling: Candidate Item Randomization 및 Item-age Dependent Dropout와 같은 기술이 cold-start item의 `Save HIT@3` 성능을 크게 개선함
    *  Losses: L_ntl, L_mtl, L_ftl을 추가함에 따라 Save 지표가 지속적으로 증가했고, Fine-tuning 시 L_ntl을 제거하면 Save 지표에 상당한 하락
    *  사전 학습에서 `Download` 또는 `Clickthrough`와 같은 action을 긍정적인 action으로 추가하면 HF 랭킹 모델의 성능에 긍정적인 영향
    *  사전 학습 반복 횟수가 증가함에 따라 `Save`와 `Hide` 지표가 모두 개선되었으며, one-epoch overfitting 문제는 관찰되지 않았음
    *  Fine-tuning이 없는 경우 PinFM의 성능 향상이 미미하거나 오히려 부정적인 영향을 미쳐 fine-tuning이 핵심적인 역할을 함
    *  embedding vocabulary size가 2천만 행에서 1억 6천만 행으로 증가함에 따라 모델 성능이 꾸준히 향상
*   **Online results**
    * Home Feed (HF) 랭킹 및 I2I 랭킹 모델에 성공적으로 A/B 테스트를 거쳐 배포됨
        *  **HF 랭킹**: Sitewide Saves +1.20%, Surface Saves +2.60%, Fresh Saves +5.70%의 향상
        *  **I2I 랭킹**: Sitewide Saves +0.72%, Surface Saves +2.09%의 향상을 보였지만, Fresh Saves는 -0.82%의 소폭 하락을 보임 (cold-start 완화 기술이 적용되지 않았기 때문)
        *  두 플랫폼 모두에서 feed diversity가 증가

