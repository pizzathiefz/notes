---
{"publish":true,"title":"Conformal Prediction","created":"2024-03-31","tags":["ai-ml"],"cssclasses":""}
---


![[assets/conformal prediction/sheepdog-mob.png|450]]

대걸레인가..쉽독인가..치와와인가..머핀인가..

- 기본적으로 ML 모델은 point prediction이기 때문에 얼마나 확실하게 치와와인가? 에 대한 정보는 얻기 어려움
- 물론 어떤 모델들은 로지스틱 확률값, 소프트맥스 아웃풋처럼 '모델이 생각하는' 확률을 0과 1 사이의 값으로 알려주기도 하지만, 문제는 그러한 값들은 휴리스틱한 개념으로서의 확률일 뿐이라는 것
	- 경험적으로 모든 분류 케이스 중에서 10개 중 9개는 맞힌다고 했을 때 90%의 확률이라고 할 수 있지, 모델이 이 케이스에 대해서 90%로 대걸레로 예측했다고 해서 그걸 확률이라고 보기는 어려움
- conformal prediction = 휴리스틱한 개념의 확률(불확실성)을 엄밀한 정의로 바꿔주기 위함

<br>
- 예시 상황
	- 각 이미지를  여러 개의 클래스 중 하나로 분류하는 분류기는 각 클래스에 대한 휴리스틱한 확률(예를 들면 softmax 출력값)을 아웃풋으로 돌려주고, 그 값이 가장 높은 클래스를 예측값으로 고름



- Conformal Prediction을 하기 위해서 $n$개의 새로운 = 모델 학습 과정에서 쓰이지 않았던 작은 데이터셋을 준비해야 함 
	- 이 새 데이터들을 $(X_1, Y_1), \cdots, (X_n, Y_n)$  라 하면, 목표는 이 데이터들과 이미 학습된 분류 모델을 사용해서 다음을 만족하는 예측 결과의 집합(prediction set) $\mathcal{C}(X_{test}) \subset \{1, \cdots, K\}$ 을 만드는 것

$$ 1- \alpha  \le P(Y_{test} \in \mathcal{C}(X_{test})) \le 1- \alpha + \frac{1}{n+1}$$
- 이때 $\alpha$ 는 사용자가 이 정도는 허용하겠다! 라고 정한 0과 1 사이의 오류율
- 만약 우리가 고른 $\alpha$ 값이 10%라면, 위 식의 의미는 이 작은 테스트셋에 대해서 실제 라벨인 $Y$가 우리의 예측 결과 집합 $\mathcal{C}$에 포함될 확률이 **거의 정확히 90% 정도**라는 것
	- 이를 marginal coverage라고도 하는데, 확률분포에서 x에 대한 주변분포, 주변 확률(marginal probability)은 x에 영향을 주는 다른 변수 y를 다 합해서 계산한다는 사실을 떠올리면 의미가 대충 통함
	- 모든 테스트 셋의 데이터 포인트들 각각에는 랜덤성이 존재하지만 이걸 다 합쳐서 봤을 때 90% 정도의 커버리지가 나온다는 뜻에서 marginal coverage이다!

![[assets/conformal prediction/image-classifier.png|600]]

- point prediction
	- 그냥 각각 fox squirrel, fox squirrel, marmot 
- conformal prediction
	- 결과물이 '집합'
		- 실제 정답을 포함할 수도 있고 아닐 수도 있음 -> 이걸 포함할 전체 확률이 90%가 되게 하자

![[assets/conformal prediction/cp-process.png|500]]


**(1) 모델의 '틀림' 점수를 구하기**
- non-conformity score $s$ 라는 걸 정할 건데, 이 점수는 모델의 예측이 틀릴수록 높아지는 값으로 함 (정하기 나름)
- 우리 예시에서는 (1-정답 클래스의 소프트맥스 스코어) 즉 $s_i = 1- \hat{f}(X_i)_{Y_i}$ 
- 이 점수를 모든 500개의 새 데이터셋에 대해 구하면, 이 점수의 분포를 알 수 있음

**(2) 이 점수의 $1-\alpha$ 퀀타일 $\hat{q}$ 을 구하기**
- $\alpha = 0.1$ 이라면, 모델 예측이 틀린 순으로 나열했을 때, 점수가 $\hat{q}$ 정도 되면 상위 10% 정도 되는 선이라는 것
- 즉 전체 분포를 봤을 때 중 10%만 이거보다 더 틀린다는 최소한의 보장 

**(3) softmax 값이 $1-\hat{q}$ 보다 큰 클래스들을 고르기**
- $\mathcal{C}(X_{test}) = \{ y : \hat{f} (X_{test})_y \ge 1- \hat{q} \}$
- 반전을 여러 번 해서 헷갈리는데, 즉 전체 점수 기준으로 10% 안 되는 수준의 softmax 값이 나오는 클래스는 버리고 그 이상인 클래스만 최종 예측 결과 집합으로 쓰겠다는 것

🗒
- 이렇게 만든 $\mathcal{C}$ 는 앞서 언급한 조건(정답을 포함할 확률이 $1-\alpha$ 근처)을 만족하게 됨
	-  증명 [여기](https://arxiv.org/abs/2107.07511)의 Appendix
- $q$를 구한 과정을 다시 생각해보면 정답 softmax 값의 90% 정도가 $1-q$ 이상인 것이기 때문에 어느 정도 직관적으로 이해가 됨
- $\mathcal{C}$ 의 특징을 보면, 모델이 불확실할수록 크기가 커지는 집합 
	- 불확실함의 이유는,

1. **모델 자체가 불확실하다** =  모델이 잘 틀리는 모델이면 모델이 틀리는 정도를 나타내는 $s$의 분포가 오른쪽으로 쏠려서 $1-\alpha$ 퀀타일 값이 더 커지게 되고, $1-\hat{q}$이  작아지게 되므로, 마지막 $\mathcal{C}$를 정하는 임계치가 낮아져서 더 많은 클래스가 예측결과 집합에 속하게 됨.
2. **이미지가 불확실하다** =  이미지 분류에서 이미지 자체가 난이도가 높다면(매우 쉽독같은 대걸레, 매우 대걸레같은 쉽독) 여러 클래스에 비슷하게 높은 휴리스틱 확률값을 주게 되고, 그러면 같은 임계치에 대해서도 여러 클래스가 그 임계치를 통과할 수 있음.

- 결론적으로 conformal prediction은 실제로 모델의 불확실성을 반영한 예측 집합 또는 예측 범위를 결과물로 얻을 수 있고, '정답을 맞힐 확률이 특정 값(예를 들면 95%) 이상인' 결과물을 보장받을 수 있음 
- 장점
	- 어떤 가정에 의해서 확률을 계산하는 게 아니라 데이터의 분포에 대한 가정이 필요 없고, 이미 학습이 완료된 모델과 새로운 작은 데이터셋만 있으면 적용 가능하다는 점
	- **모델에 종속적이지 않기 때문에 어떤 예측 모델에도 똑같은 방식을 거치면 된다는 점**
		- 위에서는 softmax 썼지만 그냥 모델의 틀린 정도를 줄 세울 수 있는 개념만 있으면  $s$ 로 쓸 수 있음
		- 모델에 종속적이지 않기 때문에 분류가 아닌 회귀 문제에서도 비슷한 접근을 해볼 수 있고 이 경우 집합이 아닌 prediction interval 처럼 나올 것


![[assets/conformal prediction/cp-interval.png|500]]

- 데이터의 불확실성이 커질수록 커지는 결과(스칼라값)이면 되니까 데이터의 가우시안 분포에 대한 가정이 들어간다면 표준편차 $\hat{\sigma}(x)$일 수도 있고, 모델을 앙상블 시켰을 때나 아니면 모델의 일부를 드롭아웃 시켰을 때 발생하는 결과의 변동성일 수도 있음. 아니면  이미 학습된 회귀 모델의 잔차를 학습하는 추가적인 모델을 학습시켜서 그 값을 쓸 수도 
- 이런 함수를 $u(x)$ 라 하면, non-conformity score는

$$ s(x,y) = \frac{\vert y- \hat{f}(x) \vert}{u(x)} $$

-  이후에는 똑같이 $s$의  $1-\alpha$ 퀀타일 $\hat{q}$ 을 구해서 예측 구간을 정함


$$ P(X_{\text{test}}, Y_{\text{test}}) \le \hat{q}) \ge 1- \alpha \Longrightarrow P(\vert Y_{\text{test}} - \hat{f}(X_{\text{test}})\vert \le u(X_{\text{test}})\hat{q}) \ge 1-\alpha $$


$$ \mathcal{C}(x) = \left[ \hat{f}(x) - u(x)\hat{q}, \hat{f}(x) + u(x)\hat{q}  \right]$$

<br>
## References
- [Week #1: Getting Started With Conformal Prediction For Classification](https://mindfulmodeler.substack.com/p/week-1-getting-started-with-conformal?sort=community)
- [A Gentle Introduction to Conformal Prediction and Distribution-Free Uncertainty Quantification](https://arxiv.org/abs/2107.07511)
- [Theoretical Description for Conformity Scores](https://mapie.readthedocs.io/en/latest/theoretical_description_conformity_scores.html)

<br>