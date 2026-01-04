---
{"publish":true,"title":"Negative feedback sequence를 활용한 추천","created":"2026-01-04","tags":["recsys","sequential-rec"],"cssclasses":""}
---

> [Benefiting from Negative yet Informative Feedback by Contrasting Opposing Sequential Patterns](https://arxiv.org/abs/2508.14786)

- problem
	- 기존의 시퀀스 모델들은 주로 긍정적인 상호작용만을 고려하고 예측함
	- 부정적 피드백이 유저 관심사를 더 정확하게 식별하는 유용한 신호를 제공할 수 있고, 정말 좋아하는 걸 추천해주는 것만큼이나 추천 결과에서 부정적인 아이템을 줄이는 것이 유저 만족도를 향상시킬 수 있다는 점을 간과함
- 기존에 부정적 피드백 아이템을 활용하는 방법들
	- training objective를 수정
		- contrastive loss term을 보조 손실로 추가
		- negative item을 추천하지 않을 log-likelihood 최적화
	- hard negative sampling
- 본 연구는 아예 부정적 피드백 시퀀스에 대해 인코더 자체를 추가함으로써 아키텍처 자체를 변경

<br>

### PNFRec (Positive Negative Feedback Recommendation)

![[assets/negative feedback sequence를 활용한 추천/fig.png|500]]

- architecutre
	- Positive/Negative 시퀀스 각각에 두 개의 독립적인 Transformer 인코더를 사용 
		- 모든 아이템은 단일 아이템 임베딩을 가지지만(공유), 시퀀스 내 각 아이템의 위치 정보는 학습 가능한 Positional Embedding으로 인코딩(긍/부정 각각)
	- **추론에서는 오직 Positive Encoder만을 사용하여 다음 긍정적 아이템을 예측**함 (Negative Encoder는 학습에서만 쓰임)
	- Backbone : [[note/SASRec]]
- Loss
	- Positive Cross-Entropy Loss ($L_{CE_p}$) : Positive Encoder를 훈련하기 위한 표준 교차 엔트로피 손실
		- 목표는 $S_p$​ 내 각 $i_t$​에 대해 다음 긍정적 아이템 $i_{t+1}$ 을 정확하게 예측하는 것
	- Negative Cross-Entropy Loss ($L_{CE_n}$) : Negative Encoder를 훈련하기 위한 표준 교차 엔트로피 손실
		- 목표는 $S_n$​ 내 각 $j_t$​에 대해 다음 부정적 아이템 $j_{t+1}$ 을 정확하게 예측하는 것
	- Contrastive Loss ($L_c$) : 현재 예측된 긍정적 아이템($\hat{i}_t$​)의 임베딩이 실제 다음 긍정적 아이템($i_{t+1​}$)에 가깝고, 동시에 해당 사용자의 부정적 시퀀스($S_n$​)에 있는 부정적 아이템($j$)들과는 멀리 떨어지도록 학습
		- $f$는 cosine simularity
$$L_c = - \sum_{u \in U} \sum_{i_t \in S_p} \log \frac{\exp(f(\hat{i}_t, i_{t+1}))}{\exp(f(\hat{i}_t, i_{t+1})) + \sum_{j \in S_n} \exp(f(\hat{i}_t, j))}$$
전체 손실은 $L = L_{CE_p} + \alpha L_{CE_n} + \beta L_c$ 이고, $\alpha$와 $\beta$는 hyperparameter


### Result
- experiment setup
	- MovieLens-1M, MovieLens-20M (명시적 피드백), Amazon Toys&Games (명시적 피드백), Kion (암시적 피드백)의 네 가지 데이터셋을 사용
	- 명시적 데이터셋에서는 median 평점을 기준으로, Kion 데이터셋에서는 시청 완료율 15%를 기준으로 부정적 피드백을 정의
- evaluation
	- $HR@k$, $NDCG@k$ (negative/positive 각각)
	- 핵심 목표는 $NDCG_p@k$를 최대화하고, 동시에 $\Delta NDCG@k = NDCG_p@k - NDCG_n@k$를 최대화하여, 긍정적 아이템 추천은 늘리고 부정적 아이템 추천은 줄이는 것

![[assets/negative feedback sequence를 활용한 추천/result-plot.png]]

![[assets/negative feedback sequence를 활용한 추천/result-table.png]]
PNFRec은 전체 손실함수를 다 사용한 것, PNFRec_pn은 alpha항만, PNFRec_pc는 beta항만 추가

- 대부분의 데이터셋에서 true-positive 지표($HR_p@10$, $NDCG_p@10$)를 유지하거나 개선하면서, 긍정적-부정적 아이템 간의 차이($\Delta HR@10$, $\Delta NDCG@10$)를 증가시키는 데 효과적
	- 특히 밀도 높은 MovieLens 데이터셋에서 PNFRec의 우수한 성능을 확인
- $L_{CE_n}$은 주로 $HR_p@10$ 및 $NDCG_p$ 개선에 기여하며, $L_c$은 $\Delta HR@10$ 및 $\Delta NDCG@10$에 큰 영향을 미침 (당연한 결과..)
- SASRec_c나 SASRec와 같은 기존 모델들은 명시적 피드백 데이터셋에서 긍정적 아이템과 부정적 아이템을 구분하는 데 어려움을 겪는 반면, PNFRec은 이를 더 잘 수행함
	- 같은 명시적 데이터셋끼리도 차이가 있는데 
		- movielens는 사용자당 평균 상호작용 수가 훨씬 많고 밀도가 높은 데이터셋으로 긍정적 패턴 학습에 더 많은 정보가 제공됨. 부정 피드백 정보가 가져오는 플러스가 상대적으로 덜한 것으로 보임
		- toy&games에서는 긍/부정 분리는 크게 개선된 반면 tp 예측은 오히려 감소 (싫어할 것 같은 아이템을 제외하는 것과 좋아하는 것을 잘 맞히는 데 trade-off가 있는 것 같기도 함)
- $alpha$의 경우 0.1 ~ 0.35 사이의 값이 최적이었음