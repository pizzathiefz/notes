---
publish: true
title: Mood 기반 음악 추천 @Deezer
created: 2025-08-02
modified: 2025-10-28T18:52:23.000+09:00
published: 2025-10-28T18:52:23.000+09:00
tags:
  - recsys
  - music-rec
---

> [**Flow Moods: Recommending Music by Moods on Deezer (2022)**](https://dl.acm.org/doi/10.1145/3523227.3547378)

![[assets/mood 기반 음악 추천 @deezer/flow-moods.png|600]]

- Flow Moods
  - 재생 context를 반영한 추천을 하기 위해
  - 사용자가 여섯 가지 미리 정의된 mood("Chill", "Focus", "Melancholy", "Motivation", "Party", "You & Me") 중에서 현재 mood를 선택하도록 안내
  - 목표: 사용자가 선택한 mood에 맞는 개인화된 재생 목록을 추천
- 곡 - mood 맵핑
  - Deezer의 전문 music curator들 전문성을 바탕으로 수천 곡의 노래에 대해 각 여섯 가지 mood에 해당하는지 또는 해당하지 않는지 mood annotation을 수동으로 부여 -> ground truth로 사용
  - 각 노래의 audio signal로부터 VGG-like convolutional neural network를 사용하여 256-dimensional embedding vector를 계산 ([musicnn 라이브러리](https://github.com/jordipons/musicnn))
  - 이 벡터들을 input으로 사용하여 여섯 개의 random forest binary classifiers를 학습 -> 곡별로 각 여섯 개의 mood에 대한 score를 얻음
- 이 score를 기존 추천 시스템과 결합해 개인화된 mood-specific playlist를 생성
  - user-song embedding space에서 각 사용자에게 가까운 노래를 추천하는 기존 방식 + 선택된 mood에 대해 고정된 threshold보다 큰 score를 가진 노래만 filtering
  - 요청된 mood와 관련된 충분한 neighbor를 가지고 있지 않은 사용자를 위해 미리 선정된 노래를 추천하는 fallback system도 포함
- deployment
  - mood score, embedding vector, metadata를 포함한 노래 관련 데이터는 매일 Cassandra cluster에 export
  - mood classification model의 변경 사항 등을 반영하기 위해 매주 업데이트
  - 노래 filtering, 재정렬, 사용자 피드백에 대한 적응을 포함한 playlist generation 작업은 Scala server에서 계산
  - Faiss library를 포함하는 Golang application을 통해 ANN
