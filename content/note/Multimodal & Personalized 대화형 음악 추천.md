---
publish: true
title: Multimodal & Personalized 대화형 음악 추천
created: 2026-01-25
modified: 2026-01-24T21:51:53.000+09:00
published: 2026-01-24T21:51:53.000+09:00
tags:
  - recsys
  - conversational-recsys
---

> [Just Ask for Music (JAM): Multimodal and Personalized Natural Language Music Recommendation](https://arxiv.org/abs/2507.15826), [github](https://github.com/hcai-mms/jam)

- 자연어 인터페이스를 갖춘(대화형) 음악 추천 시스템 구축에 있어 LLM은 상당한 추론 시간, 파인튜닝에 필요한 높은 비용, 새로운 음악/사용자에 대한 성능 이슈, 제한된 컨텍스트 크기 등의 기술적 한계를 겪는 경우가 빈번
- 따라서 지금까지 많은 연구들은 자연어 추천을 Retrieval 작업으로 접근함 = 대조 학습을 통해 쿼리와 아이템을 학습된 shared space로 투영
  - 더 작은 언어 모델을 사용할 수 있고 기존 CF나 content-based 추천 시스템의 구성요소와 통합할 수 있음
- 기존 접근의 한계
  - 단일 모달리티(예: 메타데이터만 / 오디오만 .. )에 의존
  - 대화에서 표현된 사용자 선호도 위주로 고려하고 장기적인 선호도는 거의 고려되지 않음 (히스토리 기반 개인화가 안 됨)
  - 전체 모델 스택의 완전한 재학습을 가정 -> 추천 시스템 아키텍처의 일부가 개별적으로 반복되는 실제 상황에서 그닥 실용적이지 않음
- 본 연구는 위 내용을 고려하여 자연어 기반 음악 추천을 위한 가볍고 직관적인 프레임워크인 **JAM (Just Ask for Music)** 을 제안

## Dataset

- 사용자-쿼리-트랙 데이터가 필요한데 기존에 공개된 데이터셋에는 부분적으로만 존재함
  - Million Playlist Dataset, Melon Dataset, Play Tell Dataset : 트랙 및 플레이리스트 제목 설명을 제공 (쿼리로 휴리스틱하게 해석될 수 있지만 사용자 측면은 포함하지 않음)
  - Million Song Dataset : 사용자-트랙 상호작용을 포함하지만 쿼리는 없음
  - 대안적 전략으로 30Music dataset같은 사용자 생성 플레이리스트를 마이닝하는 것을 포함하지만, 제목과 설명은 종종 노이즈가 많거나 반복적
- ➡️ 10만 개 이상의 user–query–item triple로 구성된 새로운 실제 데이터셋인 JAMSessions을 만들고 공개함
  - 2025년 3월 1주일 동안의 음악 스트리밍(Deezer) 서비스 검색 로그에서 샘플링
  - 각 데이터 포인트는 **사용자가 검색창에 쿼리를 입력하고, 결과를 탐색한 후, 10분 이상 들었던 에디터 큐레이션 플레이리스트에 도달**하는 것에 해당
    - 사용자의 단기 의도와 반응으로 해석할 수 있는 데이터로서, 검색 쿼리("sport")와 플레이리스트의 제목 및 설명("Motivation Sports – Get moving with this catchy music selection"), 사용자, 그리고 쿼리와 관련된 플레이리스트 트랙을 저장
  - 사용자 쿼리는 반복적이고 다소 짧기 때문에 플레이리스트 제목과 설명을 활용하여 LLM으로  컨텍스트와 다양성을 증강했음 (DeepSeek-R1-Distill-Qwen-7B4 사용)

## JAM

![[assets/multimodal & personalized 대화형 음악 추천/jam-framework.png|425]]

- 사용자($u$), 쿼리($q$), 아이템($t$) 간의 상호작용을 shared latent space에서의 vector translation으로 모델링
- TransE와 같은 knowledge graph embedding 방법에서 영감을 받아 $\mathbf{u} + \mathbf{q} \approx \hat{\mathbf{t}}$ 형태의 간단한 방정식을 최적화

1. **초기 임베딩 획득**
   - 사용자 임베딩 $\tilde{\mathbf{u}}$는 CF임베딩으로 사용자의 long-term music preferences를 반영
   - 쿼리 임베딩 $\tilde{\mathbf{q}}$는 ModernBert-base와 같은 텍스트 인코더를 통해 자연어 쿼리에서 추출되어 사용자의 short-term intent를 나타냄
   - 아이템 임베딩 $\tilde{\mathbf{t}}\_i$는 오디오, 가사, CF 등 다양한 모달리티에 대해 미리 계산된 임베딩 세트
2. **공유 Latent Space로의 투영**
   - 각 초기 임베딩은 1-layer feed-forward neural network를 통해 $d$차원의 공유 latent space로 투영
     - $\mathbf{u} = \mathbf{W}\_{\tilde{u}} \tilde{\mathbf{u}}$
     - $\mathbf{q} = \mathbf{W}\_{\tilde{q}} \tilde{\mathbf{q}}$
     - $\mathbf{t}_i = \mathbf{W}_{\tilde{t}\_i} \tilde{\mathbf{t}}\_i$
   - 여기서 $\mathbf{u}, \mathbf{q}, \mathbf{t}\_i \in \mathbb{R}^d$
3. **다중 모달 아이템 임베딩 통합 ($\hat{\mathbf{t}}$)**
   - 여러 모달리티별 아이템 임베딩 $\mathbf{t}\_i$를 단일 $\hat{\mathbf{t}}$로 통합하기 위해 세 가지 전략을 탐색
     - **Averaging (AvgMixing):** 모든 모달리티 임베딩의 단순 평균
       - $\hat{\mathbf{t}} = \frac{1}{N\_{mod}} \sum\_i \mathbf{t}\_i$
     - **Cross-Attention (CrossMixing):** 쿼리 임베딩 $\tilde{\mathbf{q}}$를 사용하여 각 모달리티의 기여도를 동적으로 가중
       - $\hat{\mathbf{t}} = \sum\_i \alpha(\tilde{\mathbf{t}}\_i, \tilde{\mathbf{q}}) \mathbf{t}\_i$
       - 여기서 $\alpha(\tilde{\mathbf{t}}_i, \tilde{\mathbf{q}}) = \text{Softmax}\left(\frac{(\mathbf{W}_{key}\tilde{\mathbf{t}}_i)^\top (\mathbf{W}_{query}\tilde{\mathbf{q}})}{\sqrt{d}}\right)$
     - **Sparse Mixture of Experts (MoEMixing):** Noisy Top-K gating 메커니즘을 사용하여 최대 K개의 모달리티만 활성화되게 함
       - $\hat{\mathbf{t}} = \sum\_i \alpha(\tilde{\mathbf{t}}\_i, \tilde{\mathbf{q}}) \mathbf{t}\_i$
       - 여기서 $\alpha(\tilde{\mathbf{t}}\_i, \tilde{\mathbf{q}}) = \text{Softmax}(\text{KeepTopK}(H(\tilde{\mathbf{t}}\_i, \tilde{\mathbf{q}})))$ 이며, $H(\tilde{\mathbf{t}}\_i, \tilde{\mathbf{q}})$는 게이팅 네트워크의 출력을 포함
4. **손실 함수**
   - BPR (Bayesian Personalized Ranking) recommendation loss와 유사하게, 긍정적인 $(\mathbf{u}, \mathbf{q}, \hat{\mathbf{t}})$ 삼중항의 유사성을 최대화하고 부정적인 $(\mathbf{u}, \mathbf{q}, \hat{\mathbf{t}}\_{neg})$ 삼중항의 유사성을 최소화하여 모델을 학습
   - $L = -\sum\_{(u,q,t) \in D} \log \sigma \left( \text{sim}(\mathbf{u} + \mathbf{q}, \hat{\mathbf{t}}) - \text{sim}(\mathbf{u} + \mathbf{q}, \hat{\mathbf{t}}\_{neg}) \right)$
     - 여기서 $\text{sim}$은 dot product임

## Experiment

- setup
  - 아이템의 모달리티는 오디오(과 유사하게 추출), 가사(multiligual-e5-base), CF(matrix factorization) 존재
  - baseline: TalkRec(유저 정보 사용하지 않음) , TwoTower (쿼리 정보 사용하지 않음)
    ![[assets/multimodal & personalized 대화형 음악 추천/jam-result.png|375]]

- JAM은 쿼리와 유저 정보를 모두 활용하기에, 모든 변형 모델이 기존의 TalkRec, TwoTower와 같은 baseline보다 높은 추천 정확도를 달성
  - 특히 CrossMixing 전략이 가장 우수 = 쿼리가 각 모달리티의 기여도를 동적으로 조절하여 semantic relevance에 따라 가중치를 부여함으로써 성능을 향상시킴을 시사
  - MoEMixing은 다른 방법에 비해 낮은 정확도 = 모든 모달리티가 쿼리에 대한 유용한 정보를 제공한다는 것을 나타냄

![[assets/multimodal & personalized 대화형 음악 추천/jam-ex.png|450]]
![[assets/multimodal & personalized 대화형 음악 추천/jam-tsne.png|425]]

- JAM이 동일한 쿼리에 대해서도 사용자의 시작점(long-term preferences)에 따라 개인화된 추천을 제공함
