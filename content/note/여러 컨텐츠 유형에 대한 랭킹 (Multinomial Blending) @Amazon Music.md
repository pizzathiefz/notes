---
publish: true
title: 여러 컨텐츠 유형에 대한 랭킹 (Multinomial Blending) @Amazon Music
created: 2025-11-07
modified: 2026-01-01T21:45:13.000+09:00
published: 2026-01-01T21:45:13.000+09:00
tags:
  - recsys
  - re-ranking
---

> [Ranking Across Different Content Types: The Robust Beauty of Multinomial Blending](https://arxiv.org/abs/2408.09168)

### Problem

- 음악, 팟캐스트, 비디오 등 서로 다른 콘텐츠 타입을 하나의 랭킹 슬레이트에 섞어 배치하는 것은 기존 LTR 모델로는 구조적 한계가 있음
- 콘텐츠 타입마다 **이용 빈도·보상 신호가 다르기 때문에** 클릭 같은 단기 지표를 최적화하면 fast 콘텐츠(음악)가 과도하게 노출되고 팟캐스트 같은 slow 콘텐츠는 점점 사라지는 악순환
- 고려할 수 있는 해결책들은
  - Diversity-aware LTR/MMR :
    - 슬롯을 하나씩 채우면서 LTR 점수 + diversity 점수를 높이는 방향으로 후보를 선택
    - 노출 비율을 직접 보장하지 못함, 매번 재튜닝이 필요(운영 불안정), 파라미터 해석 불가
      - 보통 `lambda * LTR score + (1-lambda) * diversity score` 이런 식으로 가는데 lamdba를 어떻게 정할 건지의 문제
  - Reward shaping/수동 오버라이드
    - 그냥 정해진 규칙 e.g. 슬롯3에는 무조건 팟캐스트 하나
    - 운영 복잡도 증가, 개인화 훼손, off-policy 평가 왜곡 문제(실제 서빙될 때는 다른 아이템이 강제로 삽입된다든지)

### Proposal : Multinomial Blending (MB)

![[assets/여러 컨텐츠 유형에 대한 랭킹 (multinomial blending) @amazon music/multinomial-blending.png|450]]

- **콘텐츠 타입 단위 확률 분포**를 먼저 정의하고, 랭킹 생성 시 다음을 반복 (슬롯이 다 찰 때까지):
  - 확률 p\_c에 따라 콘텐츠 타입 c를 샘플링
  - 해당 타입 내에서 가장 점수가 높은 아이템을 선택 (같은 타입 내부의 LTR 순서는 그대로 보존)
- p\_c는 콘텐츠 타입 c가 슬레이트 평균에서 차지해야 하는 노출 비율이기 때문에 **개인화 요소는 아님**.
  - e.g. 평균적으로 슬레이트의 20%는 팟캐스트가 들어가도록 보장하겠다.
  - baseline 랭커가 이미 충분한 slow-content 노출을 주면(개인화 상으로 팟캐스트가 충분히 나오면) MB를 아예 적용하지 않는 **lower-bound MB 변형**을 제안하기도 했음
- 이 방식은 파라미터 p\_c가 해석가능하고, 노출 비율이 스코어 분포나 모델 재학습 여부에 거의 영향받지 않아 안정적.

### Results

- 시나리오: 음악 + 팟캐스트를 하나의 슬레이트에 랭킹
- 비교 대상: 수동 오버라이드(기존) vs MMR vs MB
  - MB: 팟캐스트 청취 시간 +18.82%, 전체 engagement +2.23%
  - MRR: 팟캐스트 청취 시간 +13.57%, 전체 engagement +2.76%
- 두 방법 모두 파레토 개선을 달성했지만, **운영 단순성·안정성·확장성** 때문에 MB가 최종 채택됨
