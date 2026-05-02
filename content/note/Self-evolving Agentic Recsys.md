---
publish: true
title: Self-evolving Agentic Recsys
created: 2026-04-13
modified: 2026-04-13T23:12:00.498+09:00
published: 2026-04-13T23:12:00.498+09:00
tags:
  - recsys
  - multi-agent
---

> [Rethinking Recommendation Paradigms: From Pipelines to Agentic Recommender Systems](https://arxiv.org/abs/2603.26100) (2026)

> [!note]
> 추천 시스템의 여러 모듈(recall/ranking/re-ranking)을 독립적인 agent화하여, RL과 LLM 기반 self-evolution을 통해 Agentic RecSys로 전환하는 프레임워크를 제안 (positional paper, 구체적 내용이 아닌 아키텍처 청사진/아이디어 위주)
>
> - 기존 multi-stage pipeline과 "One Model" 방식 모두 static하다는 핵심 한계를 지적함 (모델이 블랙박스이고 시스템 개선이 수동 엔지니어링에 의존)

## Background

- 추천 시스템의 발전
  ![[assets/Self-evolving Agentic Recsys/recsys-evolution.png|601]]

- CF → Deep Learning → LLM-based 순으로 기술 전환이 이루어진 타임라인

![[assets/Self-evolving Agentic Recsys/paradigm.png]]

- 현재 산업용 추천 시스템의 구조적 한계
  - Multi-stage pipeline: recall → coarse ranking → fine ranking → re-ranking
  - "One Model" approach: 하나의 대형 모델로 전체를 처리
  - 두 방식 모두 **static**: 모델은 블랙박스이고 개선은 전문가의 수동 작업(A/B 테스트, 설정 변경)에 의존

- AgenticRS가 필요한 배경:
  1. **heterogeneus 유저·아이템·시나리오**: 신규/헤비 유저, 헤드/롱테일 콘텐츠 공존 → 단일 모델로는 dominant pattern만 커버하고 niche segment는 소외됨
  2. **multi-objective & constraint-rich optimization**: 단기 engagement, 장기 가치, 생태계 건강, 리스크/컴플라이언스를 동시 고려해야 하는데, 현재는 대형 모델 내부에 뒤엉켜 있거나 ad hoc 규칙으로 처리 → 책임 귀속과 trade-off 조정이 어려움
  3. **복잡성 증가와 수동 반복 비용**: 다수의 recall 채널 + 랭킹 모델 + 정책 컴포넌트 + 대형 사전학습 모델까지 → 개선이 여전히 수동으로 이루어지며 로컬 변경의 글로벌 영향 예측이 어려움
  4. **지속적 자율 개선 부재**: 개별 모델은 재학습 가능하지만 시스템 전체 수준의 자가 개선 메커니즘이 없음

## Method

### Agent 정의 기준

모든 모듈이 agent가 되는 것이 아니라, 다음 3가지를 동시에 만족하는 유닛만 agent로 격상:

1. **Functional closed loop**: perception → decision → execution → feedback 루프를 형성
2. **독립 평가 가능성**: 전체 시스템 재설계 없이 단독으로 평가·교체 가능
3. **진화 가능한 결정 공간**: 구조, 하이퍼파라미터, 정책 등이 변경·개선 가능

### Agent의 두 가지 분류

- **Functional agents**: 비즈니스 기능 단위로 정의. 예측 수행이 아닌 모델 활용 방식을 결정
  - traffic orchestration agent: 유저 세그먼트 → 파이프라인 라우팅
  - strategy/experiment design agent: 정책 설정, 트래픽 할당
  - re-ranking policy agent: 다양성, 신선도, 리스크 제약 적용

- **Model-centric agents**: 예측·표현 능력을 캡슐화하며 상대적으로 격리된 채 진화
  - recall agent: 행동 기반, 콘텐츠 기반 검색
  - ranking agent 또는 특정 유저/아이템 세그먼트용 sub-tower
  - fusion/calibration agent: 여러 모델의 점수 통합

### 3계층 아키텍처

![[assets/Self-evolving Agentic Recsys/architecture.png]]

- AgenticRS의 전체 아키텍처: Decision, Evolution, Infrastructure 3계층 구조

- Evolution Layer의 세부 컴포넌트(AutoFeature, AutoTrain, AutoPerf)와 Infrastructure Layer의 구성요소(Memory, Skills, Knowledge Base 등)를 보여줌

- **Decision Layer**: 실제 추천 결정을 내리는 agent들
  - 기존 recall, ranking, re-ranking, strategy-control 역할을 계승하되 내부 구조와 조합이 고정되지 않음
  - 출력: candidate set, ranked list, policy adjustment

- **Evolution Layer**: 데이터 분석, 모델/정책 설계, 학습, 배포 담당 agent들
  - Decision Layer의 로그와 reward 신호를 소비하여 새 버전의 decision agent를 지속 제안·갱신
  - **AutoFeature**: 데이터 분석 → feature 엔지니어링 → feature 추출·관리
  - **AutoTrain**: 논문 리서치 → 모델 설계(Thesis Research, Model Design) → 코딩(Vibe Coding) → 모델 학습
  - **AutoPerf**: 성능 최적화 → 배포(Deployment) → A/B 테스트 → 성능 모니터링

- **Infrastructure Layer**: 태스크 오케스트레이션과 지식 저장소
  - 유저·아이템 프로필, 장기 인터랙션 히스토리, 글로벌 제약, 과거 실험 메타지식 관리
  - 경쟁하는 objectives 간 충돌 해소
  - 시스템 전체 memory 읽기/쓰기 인터페이스 제공
  - 구성: Operating environment(GPU/CPU, Distributed platform), Project environment(Project Code, Datasets), Agent Tools(Memory, Skills, Design Rules, Knowledge Base)

### Evolution 메커니즘

#### RL/Search 기반 로컬 최적화

- 적용 대상: 결정 공간이 중간 규모의 이산/연속 변수로 기술 가능한 model-centric agent
  - backbone, loss weights, sampling ratio, learning rate, routing threshold 등
- RL 또는 블랙박스 서치 프레임워크:
  - State: 현재 데이터 레짐과 제약 조건
  - Action: 아키텍처 또는 하이퍼파라미터 설정
  - Reward: 오프라인 메트릭 또는 소규모 온라인 테스트
- 컨트롤러가 반복 경험을 재활용 → 분포 변화 하에서도 수동 튜닝 비용 절감

#### LLM 기반 구조적 혁신

- 적용 대상: 결정 공간이 고차원적이고 구조화된 agent
  - multi-tower 구조 재설계, multi-task objective 변경, recall+ranking 경로 조합 등
  - RL action으로 열거하기 어려운 수준의 action space
- LLM이 design assistant 역할:
  - 입력: 현재 agent 설명 + 실패 로그 + 과거 실험 + 비즈니스 제약
  - 출력: 자연어 및 코드로 표현된 후보 아키텍처, 학습 절차, 라우팅 전략
- 성공적인 변형은 shared knowledge base에 저장 → 과거 실험이 축적될수록 LLM 제안의 질이 높아지는 구조

#### Individual vs. Compositional Evolution

- **Individual evolution**: 고정된 시스템 그래프 전제, 단일 agent 개선
  - 세밀한 설정 튜닝은 RL/Search, 대형 아키텍처 수정은 LLM 활용
- **Compositional evolution**: 어떤 agent가 존재하고 어떻게 연결되는지를 변경
  - 예: recall agent 선택, ranking ensemble 재구성, 유저 세그먼트별 라우팅 조정
  - Search, RL, LLM 제안으로 구동; 글로벌 비즈니스 메트릭과 리소스 예산 기준으로 평가
- 실제로는 두 레벨이 alternate함
  - 주어진 구성 하에서 개별 agent 최적화 → 성과 포화 또는 조건 변화 시 새 구성 탐색 → 업데이트된 아키텍처 하에서 로컬 정제 재개

---

💭

- 생각보다 너무 큰 범위까지 에이전틱한 방향으로 제안하고 있는데, 실제 프로덕션화하려면 검증 면에서 더 많은 고민이 필요할 듯. 알리바바는 이거 일부라도 하고 있나
- agent 간 인터페이스(state, action, feedback)를 표준화한다는 아이디어는 실용적 가치가 있음 - MSA(마이크로서비스)처럼 각 모듈을 독립 배포/교체 가능하게 만드는 것
