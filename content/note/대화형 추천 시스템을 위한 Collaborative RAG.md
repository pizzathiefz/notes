---
publish: true
title: 대화형 추천 시스템을 위한 Collaborative RAG
created: 2026-01-24
modified: 2026-01-24T17:26:09.000+09:00
published: 2026-01-24T17:26:09.000+09:00
tags:
  - recsys
  - llm
  - conversational-recsys
cssclasses: ""
---

> [Collaborative Retrieval for Large Language Model-based Conversational Recommender Systems](https://arxiv.org/abs/2502.14137) (2025), [github](https://github.com/yaochenzhu/CRAG)


## Conversational RecSys (CRS)

![[assets/대화형 추천 시스템을 위한 collaborative rag/crs-ex.png|430]]

- Traditional CRS (LLM 이전)
	- Entity Modeling: 대화에서 언급되는 아이템(영화, 음악 등)을 표현하는 방법을 학습 - item id embedding, knowledge graph
	- Context Modeling: 대화의 흐름, 사용자의 발화, 시스템의 응답 등 자연어 맥락을 이해하고 표현하는 방법을 학습 - RNN, Transformer
	- Semantic Fusion: 엔티티 모델링과 맥락 모델링에서 얻은 정보를 통합하여 사용자의 선호를 종합적으로 이해하는 방법을 학습
	- Generation: 추천 결과+응답 텍스트 생성
- **LLM-based CRS**
	- White-box LLM
		- 모델의 아키텍처와 가중치에 직접 접근하여 수정할 수 있는 LLM을 학습시켜 사용함. 주로 규모가 상대적으로 작은 공개된 모델(e.g. LLaMA, T5) 기반
		- 방법
			- Instruction Fine-Tuning
			- CF 정보 통합(user/item ID를 토큰화해서 임베딩을 학습하거나 기존 CF모델로 학습시킨 user/item 임베딩을 주입)
	- Black-box LLM
		- API 형태로만 접근 가능하고 모델의 내부 구조나 가중치를 수정할 수 없는, 일반적으로 매우 큰 규모와 강력한 성능의 모델
		- 방밥
			- Zero-shot(프롬프트만 사용)
			- Naive-RAG(영화 줄거리, 메타데이터 등 외부 문서를 검색하여 프롬프트에 추가)
- Problem
	- sota LLM은 방대한 지식과 추론 능력에도 불구하고 기본적으로 추천시스템에서 효과적인 CF성 데이터를 잘 활용하지 못함
		- 당연히 사용자-아이템 상호작용 데이터는 일반적으로 공개되어 있지 않고 자연어로 fully 설명되기 어렵기 때문
	- 지금까지 LLM에 CF 정보를 통합하는 것은 주로 White-box LLM에 집중해왔지만 본 연구는 **Zero-shot/Black-box LLM 기반 대화형 추천에 CF 정보를 통합하는 첫번째 시도** 
- Formulation (CRS 문제에 대한 정의)
	- 사용자 집합을 $U$, 아이템 집합을 $I$라고 함
	- 사용자-CRS 간의 대화: $C = \{(u_t, s_t, I_t)\}_{t=1}^T$
		- $t$-번째 턴에서 $u_t \in \{\text{User, System}\}$가 발화 $s_t = (w_1, w_2, \dots, w_{N_t})$를 생성 
			- $I_t$는 $s_t$에서 언급된 아이템 집합 (아이템 언급을 안 했으면 비어있음)
	- 시스템
		- 고정된 카탈로그 $Q \subseteq I$에서만 아이템을 추천할 수 있음
		- 백본은 블랙박스 LLM $\Phi$ 
		- 외부 협업 필터링 지식 데이터베이스로 과거 상호작용 데이터 $R = \{0, 1\}^{|U_r| \times |I|}$를 사용할 수 있음
	- 목표: 현재 대화 $C^{k-1} = \{(u_t, s_t, I_t)\}_{t=1}^{k-1}$ 및 사용 가능한 상호작용 데이터 $R$을 기반으로 카탈로그 $Q$에서 아이템의 순위 목록 $\hat{I}_k$를 생성하여 실제 아이템 $I_k$에 가장 잘 일치하도록 하는 것


## Approach (CRAG)

![[assets/대화형 추천 시스템을 위한 collaborative rag/crag-overview.png|650]]

### (1) LLM-based Entity Link

- 각 발화 $s_k$에서 아이템 $I_k$를 추출하고 이를 아이템 데이터베이스 $I$에 매핑하는 과정
	- 텍스트 대화와 외부 구조화된 지식(CRAG의 경우 상호작용 데이터 $R$) 간의 간극을 메우는 데 중요
	- 약어, 오타, 아이템 제목의 모호성 처리등이 과제
- **LLM-based Entity Extraction**
	- LLM의 사전 학습된 지식과 추론 능력을 활용하여 각 발화 에서 언급된 아이템을 추출하고 각 아이템에 대한 사용자의 태도를 분석함
		- $$I_{raw_t} = f_e(\Phi(T_e, F_e, s_t))$$
		- $f_e$는 LLM의 출력에서 아이템-감정 쌍을 파싱하는 문자열 처리 함수
		- $T_e$는 LLM $\Phi$에게 발화 $s_t$에서 언급된 아이템을 표준화된 형태로 응답하도록 지시하는 태스크별 프롬프트
		- $F_e$는 LLM이 `[item]<sep>[attitude]` 형식으로 모든 아이템-태도(감정) 쌍을 응답하도록 안내하는 배치 추론 형식 지침
		- 태도는 부정~긍정이 {-2, -1, 0, 1, 2} 범위의 숫자 값으로 표현
- **Bi-level Match and Reflection** 
	- extraction의 아웃풋인 각 raw 아이템  $i_{raw_{t,j}} \in I_{raw_t}$는 텍스트 문자열이며, 표준화되지 않은 형태이거나 작은 오타를 포함할 수 있음
	- 문자-레벨 fuzzy match & 단어-레벨 BM25 match 후, $I_{char_t}$와 $I_{word_t}$ 사이의 불일치(있는 경우)에 대해 LLM에게 reflection 하도록 요청 (프롬프트에 2개의 매치 결과가 다를 수 있음을 명시하고 맥락을 고려해서 더 가능성이 높은 것을 선택하라고 함)
		- $$I_{ref_t} = f_{ref_e}(\Phi(T_{ref_e}, F_{ref_e}, I_{char_t}, I_{word_t}, s_t))$$
		- $T_{ref_e}$는 LLM에게 발화 $s_t$를 기반으로 $I_{char_t}$와 $I_{word_t}$의 차이점에 대해 리플렉션하도록 지시
		- $F_{ref_e}$는 LLM이 `[matched_item]<sep>[method]` 형식으로 각 아이템의 최종 리플렉션 결과를 반환하도록 안내
		- `[matched_item`]은 LLM이 데이터베이스 에 올바르게 연결되었다고 판단한 아이템이고 `[method`]는 {char, word, both, none} 중 올바른 매칭 전략
		- $f_{ref_e}$는  `[matched_item]`과 `[method]` 필드를 기반으로 각 아이템을 선택, 제거 또는 수정하여 $s_t$에 대한 최종 아이템 집합 $I_{ref_t}$를 형성


### (2) Context-Aware Collaborative Retrieval

- 현재 대화 $C^{k-1}$와 과거 상호작용 $R$을 기반으로 컨텍스트 관련 아이템을 검색
	- 협업 필터링(CF) 지식으로 프롬프트를 보강하여 LLM 기반 추천을 향상시키는 것을 목표로함 
- **Collaborative Retrieval**
	- 일반적인 RAG과 동일하게 query re-writing, similarity matching이라는 두가지 단계를 따름
	- $$I_{CR_k} = \text{TopK}(\text{Sim}(f_r(C^{k-1}), Q; R))$$
		- $f_r(C^{k-1})$: 현재 대화 $C^{k-1}$에서 긍정적으로 언급된 아이템(즉, $I_{q_k} = \bigcup_{t=1}^{k-1} I_t$)을 집계하고 이를 멀티-핫 변수 $r_k \in \{0, 1\}^{|I|}$로 변환
		- similarity 함수는 다양한 CF 방법으로 학습될 수 있고 본 연구에서는 EASE 사용
			- $$\min_W \|RQ - RW\|_F^2 + \lambda \cdot \|W\|_F^2 \quad \text{s.t.} \quad W_{i,j}=0, \forall i=\text{ReID}(j)$$
			- $RQ$는 카탈로그 $Q$에 해당하는 $R$의 열을 선택하고, 비대칭 행렬 $W \in \mathbb{R}^{|I| \times |Q|}$는 사용자가 대화에서 자유롭게 언급하는 아이템($I$)의 공간을 카탈로그 $Q$에서 추천 가능한 아이템의 공간으로 매핑
			- $\text{Sim}(I_{q_k}, Q; R) = r_k^T \times W$
- **Context-Aware Reflection**
	- 이제 위의 raw retrieval 결과에 현재 대화 의 컨텍스트 정보 고려한 후처리를 해줄 차례
	- $$I_{aug_k} = f_{aug}(\Phi(T_{aug}, F_{aug}, C^{k-1}, I_{CR_k}))$$
		- $T_{aug}$는 LLM에게 대화 $C^{k-1}$를 기반으로 $I_{CR_k}$의 아이템들의 컨텍스트 관련성에 대해 리플렉션하도록 지시하는 태스크별 프롬프트
		- $F_{aug}$는 LLM이 `[item]<sep>[relevance]` 형식으로 $I_{CR_k}$의 모든 아이템에 대한 동시 판단을 응답하도록 안내하는 컨텍스트-관련성 배치 리플렉션 지침
		-  `[relevance]`는 검색된 `[item]`이 컨텍스트 관련인지 여부를 나타내는 이진 점수 {0, 1}
		- 리플렉션 후, 컨텍스트 관련으로 판단된 아이템만 $I_{aug_k}$에 보존


### (3) Recommendation with Reflect and Rerank

- 이제 $I_{aug_k}$에 기반하여 LLM으로 최종 추천 목록을 생성하는 단계
- **Collaborative Query Augmentation**
	- 우선 검색된 아이템의 CF적 특성을 강조하는 서문(`Below are items other users tend to interact with given the positive items mentioned in the dialogue:`)을 추가하는 것으로 시작
	-  $I_{aug_k}$는 세미콜론으로 구분된 유사성 순위 아이템을 나열하는 문자열 $I_{aug_{s,k}}$로 변환
		- RAG 관점에서는 외부 사용자-아이템 상호작용 데이터베이스 $R$에서 검색된 추가 CF 정보로 작동
		- 추천 관점에서는 최종 추천에 사용될 수 있는 잠재적 아이템 후보이기도 함
	- 이때 2가지 프롬프트를 설계
		- rag prompt: `Use the above information at your discretion (i.e., do not confine your recommendation to the above movies)`
		- rec prompt:  `Consider using the above movies for recommendations`
		- 어떤 프롬프트가 더 잘 작동하는지는 사용되는 LLM 모델에 따라 달랐음 (GPT-4o는 rag prompt, GPT-4는 rec prompt 선호/rag prompt사용시 검색된 아이템을 무시하는 경향)
- **LLM-based Recommendations**
	- $I_{aug_{s,k}}$는 현재 대화 $C^{k-1}$에 추가되어 LLM에 입력되어 예비 추천 목록을 생성
	- $$I_{rec_k} = f_{rec}(\Phi(T_{rec}, F_{rec}, C^{k-1}, I_{aug_{s,k}}))$$
		- $T_{rec}$는 LLM에게 대화 $C^{k-1}$ 및 협업 증강 $I_{aug_{s,k}}$를 기반으로 추천으로서 순위가 매겨진 아이템 목록을 생성하는 CRS로 기능하도록 지시
		- 형식 지침 $F_{rec}$는 LLM이 표준화된 아이템 이름을 줄별로 구분하여 반환하도록 안내
- **Reflect and Rerank**
	- $I_{aug_{s,k}}$는 LLM에 내재된 편향을 유발할 수 있음 = attention 매커니즘이 이 $I_{aug_{s,k}}$ 아이템을 추천의 시작 부분에 복제하는 경향이 있고, LLM이 생성한  $I_{rec_k}$에서 가장 관련성이 높은 아이템들(반드시 에 있지 않을 수 있음)이 상위에 랭크되지 않을 수 있음
		- 이 문제를 해결하기 위한 가장 간단한 방법은 LLM에게 raw 추천 결과를 직접 재랭킹하도록 요청하는 것이지만 이 경우 LLM은 아이템을 변형/누락하거나 새 아이템을 추가해버릴 수 있음. 또한 재랭킹이라는 추상적인 작업에 대해 의미론적 간극 때문에 비논리적인 결과가 나올 수도 있음
	- 따라서 직접적으로 재랭킹을 하라는 것이 아니라 **각 아이템에 얼마나 적합한 추천인지 점수를 할당하도록 요청**함
		- 재랭킹이라는 추상적인 작업 대신, 각 아이템에 대한 개별 평가라는 구체적인 작업을 부여하여 더 명확하고 일관성 있게 응답하도록 유도
	- $$I_{r\&r_k} = f_{r\&r}(\Phi(T_{r\&r}, F_{r\&r}, C^{k-1}, I_{rec_k}))$$
		- $T_{r\&r}$는 LLM에게 추천에 대해 리플렉션하고 대화 $C^{k-1}$를 기반으로 $I_{rec_k}$의 모든 아이템에 점수를 할당하도록 지시
		- $F_{r\&r}$는 LLM이 `[item]<sep>[score]` 형식으로 $I_{rec_k}$의 모든 아이템에 대한 점수를 동시에 반환하도록 안내
			- `[score]` $\in$ "{-2, -1, 0, 1, 2}"는 {매우 나쁨, 나쁨, 보통, 좋음, 매우 좋음}의 추천 품질 수준에 해당
- 사용자가 아이템 언급을 안 한 경우
	- LLM에게 대화 $C^{k-1}$를 기반으로 사용자가 좋아할 만한 잠재적 아이템을 추론하도록 프롬프트하고 이 잠재적 아이템들을 마치 사용자가 언급한 것처럼 취급(entity link단계의 raw item), 나머지 단계는 똑같이 함

<br>

## Empirical Study

### Datasets & Setup
- Datasets
	- Reddit-v2 데이터셋: Reddit 데이터셋을 정제한 버전으로, GPT-4o를 기반으로 영화를 추출하여 영화 언급 정확도를 크게 향상
		- 기존 Reddit 데이터셋은 레딧에서 영화 추천 주제로 수집된 글과 덧글에서 fine tuning한 T5로 아이템을 추출한 데이터인데 아이템 인식을 잘 못했음. 부록에 보면 예를 들면 Everything, Everywhere, All At Once를 서로 다른 영화 3개로 인식한다든가 It을 아예 영화로 인식 못한다든가..
	- Redial 데이터셋: 크라우드소싱한 영화 추천 데이터셋
		- 이 경우 아이템 인식/데이터베이스 맵핑이 불필요하지만 실제 애플리케이션에서는 비현실적인 설정. 대화가 지나치게 공손하고 경직되어 있으며 맥락이 부족하기도 함(유저가 선호도를 명확히 하지 않고 무엇이든 좋다, 어떤 제안에도 열려 있다 라는 식).
- Experiment Setup
	- Reddit-v2 데이터셋의 경우, 2022년 12월의 대화 서브셋을 테스트 세트로, 이전 달의 서브셋을 검증 세트로, 나머지 모든 대화를 학습 세트로 사용
		- 학습 대화를 기반으로 상호작용 데이터 $R$을 구축 - 각 대화가 사용자로 취급되며 긍정적으로 언급된 모든 아이템을 상호작용으로 취급
	- LLM은 GPT-4와 최신 GPT-4o를 CRAG의 백본으로 사용 (모든 테스트 대화는 GPT-4 사전 학습 종료 날짜 이후에 이루어졌고 GPT-4o는 아니지만 레딧에서 GPT-4o 이전에 크롤링 인터페이스를 닫아버려서 leakage는 없을 것으로 예상함)

### Results

![[assets/대화형 추천 시스템을 위한 collaborative rag/2-step-refelect-experiment.png|475]]
![[assets/대화형 추천 시스템을 위한 collaborative rag/2-stemp-reflect-comparision.png|350]]
- 2-step Reflections (검색 시 context aware, 추천 시 rerank)의 효과
	- collabrative retrieval 된 아이템의 개수 $K$개에 따라  - 즉 $K=0$이면 그냥 zero-shot LLM 방식임
	- CRAG-nR12(=Naive collaborative retrieval, 두 reflect다 제거)는 컨텍스트와 무관한 정보를 도입하여 성능을 저하시키는 경향
	- CRAG-nR2(=Context-aware reflection, rerank reflect만 제거)은 $K$가 증가함에 따라 더 많은 관련 항목이 추천되지만 recall@5, 10을 보면 그것들이 상위에 랭킹되지는 않고 있음을 알 수 있음
	- CRAG(2 reflect 다 사용)는 랭킹 편향을 해결하고 가장 관련성이 높은 아이템의 우선순위를 높임
		- $K=0$일 때의 reflection(즉, 외부 지식 없는 self-reflection)은 도움이 되지 않음
		- Reddit v2와 Redial 비교하면 대화에 풍부한 컨텍스트 정보가 있을 때 2-step reflection이 더 잘 작동함

![[assets/대화형 추천 시스템을 위한 collaborative rag/baseline-comparision.png|365]]
- 베이스라인과 비교
	- Redial, KBRD, KGSF, UniCRS(RNN 및 Transformer 기반), Zero-shot LLM, Naive-RAG(RAG 기반), EASE(비-CRS)와 같은 다양한 CRS baseline과 비교
	- 대화와 아이템을 별도로 모델링하는 Redial이 가장 낮은 성능, UniCRS는 컨텍스트를 모델링하기 위해 사전 훈련된 transformer를 추가로 활용하여 모든 비-LLM 기반 baseline 중에서 최고의 성능을 달성 -> 그러나 Zero-shot LLM은 방대한 지식과 추론 능력으로 인해 이를 능가
	- 관련 콘텐츠/메타데이터를 문서로 검색하여 Zero-shot LLM을 증강하는 Naive-RAG는 실제로 **성능이 저하**됨
		- 대화의 단어와 암묵적인 사용자 선호도 사이의 큰 의미론적 간극 때문일 수 있음 e.g. 위 예시 대화에서 사용자는 바쿠라우 같은 브라질 영화를 찾기를 원하지만 Naive-RAG는 브라질이 제목에 들어가는 영화를 검색
	- CRAG는 Zero-shot LLM과 Naive-RAG를 포함한 모든 baseline에 비해 두 데이터셋에서 모든 메트릭에서 가장 우수한 성능을 달성
		- 특이할 점은 컨텍스트가 적은 Redial 데이터에 zero-shot LLM의 한계가 있어서인지 zero-shot LLM과 CRAG 격차가 커보임
- 아이템의 최신성 분석
	- **CRAG는 모든 경우에 추천 정확도를 향상시키지만, 최근에 출시된 영화에 대한 이득이 더 큼**
		- 기준 연도를 정하고 그 이전에 나온 영화랑 이후 영화를 구분했을 때(어떤 연도든 비슷한 결과라 기준 연도는 중요치 않음) 기본적으로 이후 그룹이 항상 성능이 낮음 
		- $K$를 증가시킴에 따라 이후 그룹에서 메트릭 증가가 가파르게 발생 = CRAG는 최신 아이템 추천에서 더 큰 개선을 이끌어냄 (즉 LLM은 당연히 사전학습될 때 데이터에서 언급이 적은 최신 아이템 추천에 취약할 수밖에 없는데, CF정보가 이를 보완해준다고 할 수 있음)
- 검색-추천 관계
	- 컨텍스트-인식 협업 검색 $I_{aug_k}$에 있는 아이템과 CRAG-nR2(Reflect-and-Rerank 없음) 및 CRAG(Reflect-and-Rerank 있음)에 의해 추천된 최종 목록 간의 관계를 조사
	- LLM은 검색된 아이템을 복제하는 편향이 있고 CRAG-nR2의 혼동 행렬에서 대각선 요소가 지배적으로 나타남 =  $I_{aug_k}$에서 1위인 게 최종에도 1위인 
	-  LLM은 아이템을 제거하고 다음 아이템을 채우는 대신, 제자리에 아이템을 대체하는 경향이 있음 (안 맞아 보이면 그냥 그 자리에서 없애면 되는데 유사한 다른 아이템을 생성하여 채우기)
	- Reflect-and-rerank가 도입된 CRAG의 경우, 혼동 행렬에서 지배적인 대각선 요소가 사라지며, 이는 $I_{aug_k}$에서 왔든 LLM이 새로 생성했든 상관없이 더 관련성 높은 아이템이 추천 목록 상위에 우선순위가 부여됨
- 아이템 언급이 없는 대화
	- 아이템이 언급된 경우와 유사한 추세를 보이지만, CRAG의 Zero-shot LLM baseline 대비 개선 폭은 상대적으로 크지 않음
	- 대화에 아이템 언급이 없는 경우에도 최근 개봉된 영화 추천에서의 CRAG 개선은 여전히 매우 뚜렷
