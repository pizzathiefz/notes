---
{"publish":true,"title":"Contextual Personalized Re-Ranking of Music Recommendations","created":"2025-09-13","tags":["recsys"],"cssclasses":""}
---

> [Contextual Personalized Re-Ranking of Music Recommendations through Audio Features ](https://arxiv.org/abs/2009.02782) (2020)


# why audio features

- **Q.** contextual condition에 있어서 오디오 피쳐가 중요한가?
- Spotify API를 통해 접근 가능한 9가지 오디오 피처(acousticness, danceability, energy, instrumentalness, liveness, loudness, speechiness, valence, tempo)를 사용 
- context에도 dimension과 condition 이 존재
	- dimension(condition) = 활동(running, walking, sleeping, focusing), 시간대(morning, afternoon, evening, night), 기분(happy, sad)
- 각 맥락적 조건에 대해 Spotify 공개 플레이리스트에서 대표곡을 수집 -> 각 곡의 오디오 피처를 추출 -> 각 조건별로 오디오 피처 값의 평균을 계산
- 각 차원 내에서 가능한 모든 조건 쌍과 각 오디오 피처에 대해 independent t-tests을 수행
	- multi comparison -  Bonferroni correction
	- 검정 결과 대부분의 오디오 피처가 contextual condition을 구별하는 강력한 descriptors임을 확인
	- Liveness를 제외한 다른 피처들은 context에 따라 강한 상관관계가 있었음

# re-ranking

- User contextual preference modeling
	- Global Model
		- 특정 contextual condition $c_k$에서 모든 사용자 $U$의 긍정적인 상호작용을 보인 곡들의 오디오 피처 벡터를 평균 = 모든 사용자에 대한 일반적인 contextual 선호도를 나타내는 벡터
	- Personlized Model
		- 특정 contextual condition $c_k에서 특정 사용자 $u$$의 긍정적인 상호작용을 보인 곡들의 오디오 피처 벡터를 평균 = 해당 사용자의 contextual 선호도

- **Re-ranking score**
	- 초기 추천 점수에 곡의 오디오 피쳐 벡터와 현재 contextual condition에 대한 Global preference 벡터 또는 personla preference 벡터 간의 유사도를 조합해서 최종 re-ranking score를 얻음 (유사도는 unity-based normalized Euclidean distance)


# results

- 실험
	- NowPlaying-RS 데이터셋을 사용
		- Twitter에서 수집된 사용자-곡 상호작용과 Spotify의 오디오 피처로 구성됨 
		- '시간대' context만 사용 (다른 차원은 일관된 데이터를 확보할 수가 없음)
		- 7304곡, 333명의 사용자, 108,202개의 청취 이벤트를 포함
	- 초기 추천 알고리즘: BPR(Bayesian Probability Ranking), US-BPR(UserSplitting-BPR, contextual pre-filter), CAMF_ICS(Context-Aware Matrix Factorization - Independent Context Similarity) 세 가지를 사용
	- 평가 메트릭: Prec@k와 MAP@k를 사용하여 재순위화된 추천 목록의 정확도를 평가

- 결과
	- global 모델보다 presonalized 모델이 훨씬 우수한 성능을 보임
	- global 모델은 초기 추천 알고리즘에 따라 성능 편차가 컸지만, non-contextual 초기 추천(BPR)에 비해 개선을 보임
	- Opposite re-ranking 결과로도 personlized 모델의 유효함 확인
		- 반대로 현재 contextual condition에서 사용자가 선호하는 오디오 특징과 '가장 다른' 노래에 높은 순위를 부여해봄 -> 이때 정확도가 많이 떨어진다면 현재 리랭킹 방식이 추천 품질 개선에 도움이 된다는 것을 의미함
	- 초기 추천 점수와 contextual 벡터 유사도 간을 조절하는 파라미터인 lambda값의 최적화가 중요함 (초기 추천 알고리즘에 따라 최적의 값이 달랐음)
