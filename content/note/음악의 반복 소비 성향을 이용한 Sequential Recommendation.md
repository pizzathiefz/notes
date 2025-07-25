---
{"publish":true,"title":"음악의 반복 소비 성향을 이용한 Sequential Recommendation","created":"2025-07-11","tags":["recsys"],"cssclasses":""}
---

> [!tip] about
> 음악 소비 시 반복 청취 성향을 Sequential Recommendation에 이용한 논문 2개 / 둘다 RecSys'24 / 음악은 원래 꽂히면 무한반복재생이지!

# [**Enhancing Sequential Music Recommendation with Personalized Popularity Awareness** ](https://arxiv.org/abs/2409.04329)(2024)

> 💻 **code**: https://github.com/sisinflab/personalized-popularity-awareness

- Transformer 기반 sequential recommendation 모델들(BERT4Rec, SASRec)은 음악 소비의 동적인 특성과 사용자들의 **반복적인 음악 청취 습관** 을 효과적으로 포착하는 데 어려움을 겪음
	- 반복적으로 듣는 패턴을 여기서는 personalized popularity라고 표현

- 이 연구는 유저-아이템 인기 점수를 모델의 생성 점수와 결합해서 학습 시 인기 분포로부터의 편차를 학습하도록 함
	- Softmax 함수를 사용하는 모델(BERT4Rec) : 개인화된 인기 점수를 모델의 점수에 합산
	- Sigmoid 함수를 사용하는 모델(SASRec, gSASRec) : 개인화된 인기 점수를 모델의 점수 행렬에 합산하되, 미래 데이터로부터의 시간적 누출을 방지 (BERT와 달리 단방향이므로)

### 개인화된 인기도 (PPS)

$$

\hat{p}_P(j) = \frac{c_j + \epsilon max(C + \epsilon)}{\sum_{z=1}^{N} c_z + \epsilon max(C + \epsilon)}.

$$
- c는 그냥 이 유저가 그 아이템을 얼마나 들었는지 count여서 사실 개념적으로 인기도는 c_j / sum(c) 여야 하지만 수치적 안정성을 위해 max(C)가 들어가고 $\epsilon$ 으로 smoothing한 것임
	- 0.01을 사용했는데, 이 $\epsilon$ 가 작을수록 원래의 인기도에 더 가까워져서 인기도의 영향이 커지고, $\epsilon$ 가 커질수록 (실제 pp랑 상관 없이 아이템이 선택될 확률이 균등해져) 인기도의 영향이 없어짐


### Softmax 사용시,
모델이 생산하는 점수는
$$
p_M(j_i) = \text{softmax}(x_{ji}) = \frac{e^{x_{ji}}}{\sum_{z=1}^{N} e^{x_{jz}}}
$$
PPS는
$$
\hat{p}_P(j) = \frac{c_j + \epsilon max(C + \epsilon)}{\sum_{z=1}^{N} c_z + \epsilon max(C + \epsilon)} =  \frac{e^{\ln (c_j + \epsilon \max(C + \epsilon))}}{e^{\ln (\sum_{z=1}^{N} c_z + \epsilon \max(C + \epsilon))}} =  \frac{e^{\tilde{j}}}{\sum_{z=1}^{N} e^{\tilde{z}}}.
$$

*softmax 함수의 형태에 맞춰 Personalized Popularity 확률을 재구성하기 위한 변형 중간 단계라고 생각하면 됨..*
$$
\tilde{j} = \ln \left( \frac{c_j + \epsilon}{\max(C + \epsilon)} \right)
$$

결론적으로 위 점수가 각 $j$에 대한 PPS 점수라고 할 수 있고 이를 모델이 생성하는 점수에 더해서 최종 예측 확률이 나오게 됨!
$$
p'_{M}(j_i) = \frac{e^{x_{ij}} \cdot e^{\tilde{j}}}{\sum_{z=1}^{N} e^{x_{iz}} \cdot e^{\tilde{z}}}
$$

### Sigmoid 사용시,
모델이 생산하는 점수는
$$
p_M(j_i) = \text{sigmoid}(x_{ji}) = \frac{1}{1 + e^{-x_{ji}}}
$$

비슷하게 계산하면
$$
\tilde{j} = -\ln \left( \frac{1 - \hat{p}_P(j)}{\hat{p}_P(j)} \right)
$$

$x'_{ij} = x_{ij} + \tilde{j}$ 이 통합된 점수를 다음과 같이 최종 예측 확률에 사용

$$ p'_{M}(j_i) = \text{sigmoid}(x'_{ij}) = \frac{1}{1 + e^{-(x_{ij} + \tilde{j})}}
$$


## Result

![[assets/음악의 반복 소비 성향을 이용한 sequential recommendation/pps-sequential-recommendation-experiment.png|625]]

- Most Popular
	- 개인화가 아닌 전체 유저의 인기도를 바탕으로 추천하는 것
- **Personalized Most Popular** -> 대부분 Best Result
	- 사용자별 인기도를 기반으로 아이템을 추천하는 것 = 자주 사용되는 베이스라인이며 반복성이 높은 도메인에서는 sota 모델급의 성능을 보여주기도 함
	- (대충 생각해 봐도 정확도 성능에서만 보면 100%의 exploitation으로 좋은 결과를 낼 것 같음. 다만 실상황에서 / 장기적인 관점에서 선호되는 전략은 아니어서 그렇지)
- Sequential Recommendation(BERT4Rec, SASRec, gSASRec) 
- **Sequential Recommendation(BERT4Rec, SASRec, gSASRec) + Personalized Popularity Score** 
	- PPS를 사용하지 않은 모델보다 25%~70% 사이의 성능 향상 (괄호 안 표기)
	- 일부 지표에서는 best result
	- ➡️ sequential recommendation에서 이런 개인화된 인기를 반영하는 것이 효과적이다!


 
# [**Transformers Meet ACT-R: Repeat-Aware and Sequential Listening Session Recommendation**](https://arxiv.org/abs/2408.16578) (2024)

> 💻 **code**: https://github.com/deezer/recsys24-pisa (tensorflow implementation + Deezer dataset)


- 문제제기는 위랑 똑같음
- PISA (Psychology-Informed Session embedding using ACT-R)
	- ACT-R (Adaptive Control of Thought—Rational)이라는 인지 아키텍처 -> 여기서 처음 쓰인 건 아니고 이전에도 반복 행동을 모델링하기 위해 쓰였음
	- 이걸 Transformer(sequential recommendation)이랑 결합했다는 게 이 연구의 기여점

![[assets/음악의 반복 소비 성향을 이용한 sequential recommendation/transformer-actr-illustration.png|625]]
- Next Item이 아닌 Next Basket(함께 소비되는 item의 set) Recommendation
	- 음악 도메인에서는 한번 듣는 session을 basket으로 생각할 수 있음
	- CoSeRNN 등
- 이전 연구들은...
	- basket representation은 주로 average pooling 사용해서 반복 패턴 정보가 손실되는 경향이 있었음
	- 재청취가 빈번한 음악 도메인에서 basket recommendation 시 반복 행동을 무시한다는 것은 한계
	- 이전에 ACT-R을 사용한 연구들은 협업 필터링 모델을 주로 사용해서 시퀀스를 통한 dynamic dimension을 포착하지 못함


## Architecture

![[assets/음악의 반복 소비 성향을 이용한 sequential recommendation/transformer-actr-architecture.png|625]]

### ACT-R 프레임워크 + Session Embedding

3가지 구성요소
- **Base-level (BL) 컴포넌트** : 특정 노래  $v$ 를 사용자가 얼마나 자주, 그리고 최근에 들었는지 반영하여 기억 활성화를 모델링
	- $t_{ref}$ : 참조 시간
	- $t_k$ : 사용자가 $k$ 번째로 노래를 들은 시간
	- $\alpha$ : time decay parameter
$$\text{BL}^{(u)}_v = \text{softmax}_{s^{(u)}} \left( \sum_k (t_{ref} - t^{(u,v)}_k)^{-\alpha} \right)$$
- **Spreading (SPR) 컴포넌트** : 동일한 세션 내에서 노래들이 함께 나타나는 빈도(공동 발생 패턴)
	- $C$는 노래의 co-occurence matrix $F$의 정규화된 상관 행렬
$$\text{SPR}^{(u)}_v = \sum_{v' \in s^{(u)}, v' \neq v} C_{vv'} $$

- **Partial Matching (P) 컴포넌트** : 노래 임베딩 벡터의 내적을 통해 계산되는 음악적 유사성 (SPR과 보완적인 정보를 제공)
$$\text{P}^{(u)}_v = \sum_{v' \in s^{(u)}, v' \neq v} m_v^\top m_{v'}$$

**최종적으로 세션 임베딩은 각 곡 임베딩의 가중합으로 계산**되고,
$$m_{s^{(u)}} = \sum_{v \in s^{(u)}} w_v m_v$$

가중치는 각 컴포넌트의 선형조합으로 계산됨. 이때 3종류의 가중치는 learnable global parameter
$$
w_v = w_{BL} \text{BL}^{(u)}_v + w_{SPR} \text{SPR}^{(u)}_v + w_P \text{P}^{(u)}_v
$$


### User Embedding
각 사용자는 장기 선호도와 단기 선호도의 조합으로 표현
$$m_u = \beta m^{short}_u + (1 - \beta) m^{long}_u$$

장기 선호도: 사용자의 과거 청취 기록에서 BL값이 가장 높은 상위 20개 노래의 임베딩 벡터의 가중평균
$$
m^{long}_u = \sum_{v \in \text{Top-BL}^{(u)}} \text{BL}_u v m_v
$$
단기 선호도: Transformer 아키텍쳐 사용
- 각 세션 임베딩 $m_{s^{(u)}_l}$에 학습 가능한 위치 임베딩 $p_l$을 더한 입력 행렬 $(X^{(0)}$이 $B$개의 스택된 Self-Attention Block (SAB)을 통과하며, 최종 블록의 마지막 위치 출력 $X^{(B)}_L$이 $m^{short}_u$가 됨
- 이 과정에 세션 임베딩에 ACT-R 구성 요소가 반영되어 단기 선호도에 영향을 미침


## Training


## Result

![[assets/음악의 반복 소비 성향을 이용한 sequential recommendation/transformer-actr-result.png|625]]