---
publish: true
title: Bootstrapping Conditional Retrieval for User-to-Item Recommendations
created: 2025-10-27
modified: 2025-10-28T19:27:38.000+09:00
published: 2025-10-28T19:27:38.000+09:00
tags:
  - recsys
  - representation-learning
  - two-tower
---

> [Bootstrapping Conditional Retrieval for User-to-Item Recommendations](https://arxiv.org/abs/2508.16793)

- Conditional Retrieval
  - retrieve된 아이템이 특정 조건(e.g. 주제, 카테고리)을 만족하기를 기대하는 시나리오
    - 이 논문 기준 Pinterest에서는 특정 주제에 관련된 컨텐츠를 추천하는 push 알림을 보내고 싶었음
  - \= 사용자와의 관련성(사용자가 좋아하고)과 조건과의 관련성(해당 주제에 속하는 컨텐츠여야)이라는 2가지의 목표를 달성해야 함
  - 기존에 일반적인 two-tower모델로 이를 달성하려면,
    - A안) 모델은 그냥 두고 그냥 retrieval할 때 필터를 통합하거나 후처리로 제외함 (이 필터링 때문에 서빙 비용이 높아질 수 있음. 해당 조건을 만족할 때까지 계속 찾아야 하니까)
    - B안) 유저 타워에 명시적인 조건 정보를 같이 입력으로 넣어 모델을 학습시킴
      - 조건이 사용자가 상호작용 하기 이전에 명확하게 정의되고 사용자가 그 조건을 인지하고 행동했을 때 발생한 데이터가 있어야 함. e.g. 뉴스 앱에서 "경제" 카테고리에서 뉴스를 클릭, "재즈" 카테고리에서 음악을 재생, "색상:파랑, 브랜드:나이키"로 운동화를 찾아서 클릭
      - 이런 데이터들이 쌓여 있지 않은 new use cases에 대해서(즉 이 상황처럼 새로운 push 알림을 런칭한다든지)는 어떻게 하나?

### 제안 방법

![[assets/bootstrapping conditional retrieval @pinterest/conditional-retrieval.png|525]]

- 굉장히 간단한 아이디어인데 그냥 유저-아이템 상호작용은 많고 아이템 메타데이터가 있으니까 거기서 조건을 만들어서 붙여서 (= bootstrapping) 유저 타워에 넣자
- Condition Extraction
  - 아이템 메타데이터에서 item-to-topic feature를 써서 아이템별 토픽(조건)의 리스트를 추출해냄
  - 이 중 하나를 무작위로 샘플링해서 조건으로 선택하고 유저 타워에 붙임
- Conditional User Tower
  - 사용자 피쳐(피쳐,히스토리 등)에 조건 임베딩을 합해서 학습
  - two-tower 모델 학습과 동일하게 유저x아이템 내적을 사용해서 constrastive learning
  - 학습 단계에서부터 사용자 선호도와 조건 관련성을 동시에 고려하여 아이템을 검색할 수 있도록 유도하게 됨

### 실험 및 결과

- models compared
  - INDEX : 토픽과 관련된 모든 아이템을 매핑해 놓은 인덱스 사용
    - retrieval 시 주어진 토픽에 해당하는 아이템 중에서 아이템 인기도(사용자 참여 횟수) 순으로 상위 k개
    - 개인화 기능이 없고 학습 기반이 아닌 간단한 baseline
  - LR (Learned Retrieval) : 표준 Two Tower Model 사용
    - 모델은 토픽 미고려, 이후에 추가 토픽 필터를 적용할 수 있음
  - CR (Conditional Retrieval) : 위에서 제안한 방식
    - 이후에 추가 토픽 필터를 적용할 수 있음(모델이 학습한 조건 관련성에 영향을 받지만 모델 아웃풋 자체에서 명시적으로 조건이 강제된 건 아니므로)
- 실험방식
  - 오프라인 실험을 통해 LR 및 CR 모델 중 가장 성능이 좋은 버전을 선택
  - 온라인 A/B 테스트: 각 방법으로 수백 개의 아이템을 검색한 후, 랭킹 단계를 거쳐 최종적으로 약 20개의 아이템을 선정하여 알림으로 보냄
- 지표
  - Email CTR (Click-Through Rate): 이메일 알림의 클릭률
  - Push CTR (Click-Through Rate): 푸시 알림의 클릭률
  - WAU (Weekly Active Users): 주간 활성 사용자 수 (핵심 비즈니스 지표)
  - Infra Cost (Infrastructure Cost): 추천 시스템의 연간 서빙 비용.

![[assets/비용 효율적인 Cold-Start 추천 @Pinterest/online-result.png|425]]

- 참여율 INDEX << LR (filter) <<< CR
- 서빙 비용으로 봤을 때 LR은 필터 때문에 매우 많은 서빙비용을 필요로 함 (ANN할 때 지정한 조건 필터를 만족할 때까지 훨씬 더 많은 후보를 확인해야 하므로)
  - 필터를 적용하지 않은 상태에서 LR의 조건 매칭률은 20%에 불과하기 때문
- CR은 우선 CTR, WAU도 높았고 훨씬 낮은 서빙 비용 (필터 없이도 조건/유저와 관련성 높은 아이템을 찾음)
  - 필터를 적용하지 않은 상태에서 조건 매칭률은 82.8%
  - 필터를 적용하면 조건 매칭을 100% 보장하게 되지만 역시 추가 검색이 필요해 서빙비용이 다소 증가하고,  조건과 덜 관련 있지만 highly engaging한 아이템이 빠지면서 CTR이 소폭 감소하는 결과가 있음
  - 최종적으로는 CR+필터 버전이 프로덕션에 배포됨
