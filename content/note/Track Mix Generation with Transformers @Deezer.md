---
publish: true
title: Track Mix Generation with Transformers @Deezer
created: 2025-08-04
tags:
  - recsys
  - music-rec
  - playlist-generation
cssclasses: ""
---

> [Track Mix Generation on Music Streaming Services using Transformers](https://www.google.com/url?sa=t&source=web&rct=j&opi=89978449&url=https://arxiv.org/abs/2307.03045&ved=2ahUKEwi1kfXZ8IKPAxURcvUHHZkaIBkQFnoECAkQAQ&usg=AOvVaw1IAhMz0hf2P0Km7-MYuI76) (2023)

- Track Mix
	- 사용자가 이전에 좋아했거나 정기적으로 들었던 트랙들 중에서 개인화된 최대 12개의 음악 트랙 목록을 제공 -> 그 중 하나를 고르면 해당 트랙을 포함한 총 40곡의 믹스 플레이리스트를 생성
- 기존 방식 : **Mix-SVD**
	- 플레이리스트와 즐겨찾기 목록에 기반한 트랙 간의 공동 출현(co-occurrence) 정보를 데이터로 사용
	- PMI (트랙 쌍에 대해 얼마나 자주 같이 등장하는지 트랙 간의 연관성을 점수화) 행렬
	- 이 PMI 행렬에 대해 SVD를 수행해 저차원 임베딩 벡터로 분해
	- 사용자가 초기 트랙을 선택하면, 해당 트랙 임베딩과 가장 가까운 임베딩을 ANN
	- 이 후보 트랙들을 내부 규칙으로 재정렬해 최종 믹스 플레이리스트를 생성
- 새로운 방식 : **Mix-Transformer**
	- 이전에 APC(Automatic Playlist Continuation) 기능에 Transformer를 사용했을 때 효과적이었음
		- [A Scalable Framework for Automatic Playlist Continuation on Music Streaming Services](https://arxiv.org/abs/2304.09061)
		- 다만 APC+Transformer의 경우 기존 플레이리스트 트랙 수가 적을 때 성능이 감소하는 경향이 있었는데, Track Mix는 초기 트랙이 1개이기 때문에 어려움이 예상됐음
	- Decoder-only Transformer (당시 GPT계열 모델의 인기에 영향을 받은..)
		- 기존 사용자 플레이리스트들을 시퀀스 데이터로 사용함
		- playlist completion - 앞에 오는 트랙 시퀀스로 뒤의 트랙을 예측하는 과제
		- 초기 트랙 임베딩은 Mix-SVD에서 가져와서 학습 시작 
	- deploy
		- SVD모델에 비해 4배 긴 추론 시간 -> 허용할 수 없는 latency
		- scalable하게 만들기 위해 APC 연구에서 제안됐던 represent-then-aggregate
			-  Transformer 모델 학습을 통해 트랙의 임베딩을 미리 다 계산해놓고 그다음에 이를 시퀀스(플레이리스트) 수준으로 aggregate
			- 즉 유저가 선택한 초기 트랙을 1-트랙 플레이리스트로 간주하고 플레이리스트 벡터를 얻은 다음 유사한 트랙을 ANN -> 다시 플레이리스트 벡터로 aggregate -> 다시 유사도 계산 ... (반복)
		- ONNX 모델에 동적 양자화(dynamic quantization)를 적용하여 계산 비용을 크게 줄이면서 성능 유지
	- 평가
		- 온라인 A/B Test: 사용자 중심 및 플레이리스트 중심의 청취 시간과 "collect actions"(사용자가 추천 트랙을 즐겨찾기 목록이나 개인 플레이리스트에 추가하는 횟수)
		- Mix-Transformer는 모든 청취 시간 지표에서 Mix-SVD 대비 긍정적인 개선을 보였으나 collect actions는 전체적으로 감소
			- 자세한 분석 결과 collection actions 감소는 주로 30일 이상 활동한 기존 사용자에게서 발생했고 신규 사용자에게서는 collectin actions이 크게 증가함
			- 이 결과를 Mix-Transformer가 Mix-SVD보다 더 인기 있는 트랙을 추천하는 경향(대중성 증가)이 있다고 해석함 -> 기존 사용자들은 이런 대중적인 트랙 추천에 대해 이미 알고 있거나 좀더 니치한 추천을 기대하기 때문에 / 어쨌든 신규 사용자의 선호도 정보를 빨리 획득해서 콜드스타트를 완화할 수 있다고 주장
				- Mix-Transformer의 상대적인 인기곡 편향 이유 (추측) : Mix-SVD는 결국 PMI 행렬 기반인데, 인기곡은 거의 모든 곡이랑 cooccurence가 발생해서 PMI가 상대적으로 낮아서 니치한 조합이 상대적으로 더 주목받을 수 있는 구조. GPT st model은 정답을 인기곡으로 때려맞히는 게 모델이 쉽게 스코어 올릴 수 있는 방향이어서 그런 거 아닐까