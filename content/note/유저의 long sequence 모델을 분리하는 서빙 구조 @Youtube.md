---
{"publish":true,"title":"유저의 long sequence 모델을 분리하는 서빙 구조 @Youtube","created":"2025-08-14","tags":["recsys"],"cssclasses":""}
---


> [Short-form Video Needs Long-term Interests: An Industrial Solution for Serving Large User Sequence Models](https://youtu.be/AQoSQVMeqR4?si=X03qmSTjjk_TfXf5) / Recsys'24

- 숏폼영상(이하 SFV) 추천의 챌린지
	- 롱폼영상에 비해 유저가 데일리로 소비하는 수 자체가 압도적으로 많음
	- 일반적으로 실제 추천문제에서는 유저의 long-term interest를 반영하는 게 성공에 매우 중요하고, 많은 sequential 추천 모델에도 이런 장기 히스토리를 모델링하기 위한 테크닉이 많이 나와 있지만 deploy가 너무 빡세다 (extremely costly, latency sensitive)

![[assets/유저의 long sequence 모델을 분리하는 서빙 구조 @youtube/long-term-history-dilemma.png|450]]

📈 단순히 모델이 참고하는 유저 히스토리의 양을 늘리기만 해도 메트릭은 좋아지지만 비용과 레이턴시는 더 무서운 양으로 늘어나버린다!

- 제안: **UBS(User Behavior Service)**
	- User Model로 단기간에 휙 바뀌지는 않는 유저의 장기 관심사를 모델링
		- 그 결과를 캐싱해서 씀으로써 서빙 비용을 줄임 (감당 가능한 빈도로 refreshing, 많은 유저 리퀘스트에 대해서 재활용)
	- 무거운 유저 시퀀스 모델을 메인 모델에서 분리하는 역할

![[assets/유저의 long sequence 모델을 분리하는 서빙 구조 @youtube/architecture.png|550]]

- user model이랑 main model은 학습할 때는 같이 학습되지만 분리해서 export
- main model을 서빙할 때는 user model 결과를 따로 캐싱하고 (이 부분이 UBS) 결과를 가져다가 씀

![[assets/유저의 long sequence 모델을 분리하는 서빙 구조 @youtube/infrastructure-deep-dive.png|575]]
- user model도 서빙 비용이 없는 것은 아니지만 main model보다 빈도가 훨씬 낮기 때문에 감당 가능한 수준에서 사용할 수 있음
- 주요 서빙 path 밖에서 돌고 임베딩을 비동기로 refresh하기 때문에 user model의 size와 latency가 병목이 되지 않을 수 있고 유저 모델링을 위해 매우 큰 모델로 실험해볼 수 있음

- 실험: 1000 user behaviors를 사용해 학습한 main model을 UBS를 사용했을 때와 사용하지 않았을 때 품질과 비용을 비교
- 평가:
	- offline: AUC (분류), RSME (회귀)
	- online: 1 week A/B Test
- 당연히 online metric 증가폭은 동일하고, 
	- UBS를 썼을 때 serving cost 는 2.8% 증가, scoring latency는 neutral
	- UBS를 안 썼을 때 serving cost는 28.7% 증가, scoring latency는 6.8배

- Q&A
	- 업데이트 주기,유저 임베딩이 outdated되지 않았는지 어떻게 확인하냐
		- 간단한 방법 - 고정주기/일단위로 업데이트
		- 헤비유저일수록 업데이트를 더 자주(몇 번 볼 때마다)
	- 유저 임베딩은 별도 tokenization 없이 main ranker에 바로 넘김
	- 콜드스타트에 대해서는 이 방법이 좋은 게 별도 작업이 필요가 없고 어차피 임베딩을 함께 캐싱해서 넘기는 거기 때문에 히스토리가 매우 적은 유저라면 main model이 다른 피쳐들에 더 집중하게 될 거라 답변