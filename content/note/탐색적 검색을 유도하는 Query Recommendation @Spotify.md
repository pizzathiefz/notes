---
publish: true
title: 탐색적 검색을 유도하는 Query Recommendation @Spotify
created: 2025-10-14
modified: 2026-03-22T15:43:24.834+09:00
published: 2026-03-22T15:43:24.834+09:00
tags:
  - "#recsys"
  - "#search"
cssclasses: ""
---


> [Encouraging Exploration in Spotify Search through Query Recommendations](https://dl.acm.org/doi/10.1145/3640457.3688035) (2024)

## 배경 및 동기

- Spotify 검색은 전통적으로 **known-item search**에 최적화된 instant search 시스템
    - 키입력마다 결과를 보여주는 방식 → 짧은 prefix로도 원하는 곡/아티스트를 찾을 수 있었음
    - 예: "stair" 입력 후 "Stairway To Heaven" 클릭 → query가 완성되지 않아도 목적 달성
    - 결과적으로 search log가 대부분 몇 글자짜리 짧은 prefix로 채워짐
- **카탈로그 확장**으로 인한 새로운 도전
    - Music → Podcast → Audiobook 등 콘텐츠 유형 다변화
    - prefix query "new"만 봐서는 music intent인지 news podcast intent인지 불분명
    - 유저가 정확한 검색 의도를 표현하기 어려워짐
- **탐색적 검색(exploratory search)의 필요성**
    - "new indie releases" 같은 open-ended 쿼리는 잠재적으로 관련 항목이 매우 많음
    - Personalization 기반 추천 패러다임과 결합해야 효과적으로 처리 가능
    - 새로운 콘텐츠 타입과 creators에게 distribution 기회를 부여하는 것도 목표

## Hybrid QR Experience


![[note/assets/탐색적 검색을 유도하는 Query Recommendation @Spotify/new-hybrid-search-experience.png|515]]
- 기존: 키입력마다 즉시 결과 표시 (instant search only)
- 신규: Query Recommendation(QR)을 즉각 결과와 **나란히** 표시 → Hybrid Search

### 핵심 효과 (A/B 테스트 기준)

- 탐색 의도 쿼리 비중 **+9%**
- 유저당 최대 쿼리 길이 **+30%**
- 유저당 평균 쿼리 길이 **+10%**
- -> 유저가 더 완성된 형태의 query를 입력하게 유도 → intent 해석 정확도 향상

## Candidate Generation 

5가지 방식을 **iterative하게** 추가하며 각 방식의 효과를 온라인 A/B 테스트로 검증

1. **카탈로그 title 추출**: 아티스트명, 곡명, 플레이리스트명, 팟캐스트명 등에서 직접 추출
2. **Search log 마이닝**: 로그에서 완성된 쿼리를 감지하는 classifier 활용
    - Instant search 특성상 로그 대부분이 incomplete query → cold-start 문제 존재
    - Complete query classifier로 완성된 쿼리만 필터링
3. **유저 개인 데이터**: 본인의 최근 검색어 및 개인 items 활용
4. **메타데이터 확장 규칙**: 예: `[아티스트명] + covers` 형태의 규칙 기반 생성
5. **LLM 기반 synthetic query 생성**
    - Doc2query, InPars 기법 활용 → 자연어 쿼리 변형 후보 생성
    - 탐색 검색 지원 + **retrievability bias 감소** 효과도 기대
        - -> 인기 콘텐츠와 niche 콘텐츠 간 노출 격차 완화

## Ranking

- **Point-wise ranker**로 여러 소스의 후보를 단일 ranked list로 통합
- **학습 레이블**: 클릭된 추천 쿼리 중 downstream 성공 액션(stream, save, playlist 추가 등)으로 이어진 것 → positive / 나머지 → negative
- **Features**:
    - 어휘 특성: prefix query 통계, 추천 쿼리 통계, lexical features
    - 검색 특성: retrieval scores, query entropy, 해당 쿼리가 이어지는 콘텐츠 유형
    - 유저 특성: user-level features, 소비 패턴
    - **개인화**: 유저와 쿼리 후보의 vector representation 활용
        - 예: 뉴스를 자주 듣는 유저는 prefix "new" 입력 시 "new releases for me" 보다 "news podcast" 추천 가능성 높음
- **Ablation**: ranker 제거 시 추천 쿼리 클릭 **-20%** → 순위 모델의 중요성 확인

## Filtering

- **유해 쿼리 제거**: 잠재적으로 해로운 추천 쿼리를 사전에 감지 및 필터링
- **중복 제거**: 유사한 SERP와 클릭 패턴으로 이어지는 쿼리들 deduplication

## 평가의 어려움 및 향후 과제

### 평가 지표 문제

- 기존 검색 지표(prefix와 reformulation을 sequence로 묶는 방식)는 QR 도입 이후 부적합
    - QR이 query 분포 자체를 바꿔버리기 때문
- 탐색 검색 성공을 측정하는 **새로운 query-based 지표** 개발 필요
    - 예: 타이핑한 글자 대비 삭제 횟수
- 탐색 쿼리의 open-ended 특성상 쿼리만 따로 분리해서 평가하기 어려움

### 미해결 과제

1. 높은 품질의 search result로 이어지는 쿼리 추천 생성
2. 다국어 QR 및 지역별·개인별 취향을 반영한 대규모 시스템 구축
3. 미등장 prefix에 대한 고품질 쿼리 추천 (cold-start)
4. QR → Conversational Search로의 전환을 가능하게 하는 UX 연구
