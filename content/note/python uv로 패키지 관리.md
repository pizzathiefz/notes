---
publish: true
title: python uv로 패키지 관리
created: 2025-07-20
modified: 2025-08-09T21:13:55.000+09:00
published: 2025-08-09T21:13:55.000+09:00
tags:
  - python
cssclasses: ""
---

https://docs.astral.sh/uv/
- Rust로 작성된 Python 패키지 및 프로젝트 매니저
- 기존의 pip, virtualenv, poetry 등을 대체
	- 의존성 설치가 매우 빠름 (pip보다 10~100배 이상)
	- uv pip install, uv venv, uv pip compile 등으로 거의 모든 패키지 및 프로젝트 관리 작업을 커버
		- 의존성 관리 및 버전 잠금 기능, 가상환경 생성 및 관리
![[assets/python uv로 패키지 관리/python-uv-speed 1.png|450]]


### uv install
```
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### initialize project
```
uv init my-project
```
다음 파일이 함께 생성
- `pyproject.toml` : 프로젝트의 주요 설정들을 저장
	- `dependencies` : 의존성 관리
- `.python-version` : 프로젝트에서 사용될 python version을 지정

### package install
```
uv add requests
```
- `pyproject.toml` 의 `dependencies`에 해당 패키지를 자동으로 추가하게 됨
- 프로젝트의 의존성을 관리하는 목적
- 이후 제거하고 싶다면, `uv remove requests` 와 같이 제거 가능

```
uv pip install requests
```
- 일반적으로 패키지를 설치할 때 사용 (pip 호환)

```
uv add requests
uv lock
```
- 해당 패키지의 버전을 잠금 (`uv.lock` 파일에 자동으로 추가)

```
uv sync
```
- 프로젝트의 의존성을 잠금 파일(`uv.lock`)에 맞춰 정확히 동기화하여 설치(install)
- -> **가상환경이 자동으로 생성**됨
	- `.venv` 파일이 생성 (sync 이전에 가상환경을 수동으로 생성하고 싶다면 `uv venv`)
	- 프로젝트 루트에 이 파일이 있는 게 conda 대비 장점인 듯 → **프로젝트 단위 격리**가 직관적이고 Git으로 관리하기 쉬움

### package upgrade
아래 명령어들 실행시, `uv.lock` 도 해당 버전에 맞춰 자동으로 바뀜

```
uv add pandas==2.2.1
```
- 원하는 버전으로 변경

```
uv add pandas --upgrade
```
- 가능한 최신 버전으로 업그레이드
	- 만약 처음에 add 할때 `uv add "pandas>=1.5,<2.0"` 이렇게 범위를 지정했다면 해당 범위 내에서 가장 최신으로 업그레이드 됨
		- 범위를 바꾸고 싶다면 `pyproject.toml`를 직접 수정하거나 다시add 필요
			-  `uv add "pandas>=2.0,<3.0"`

```
uv upgrade
```
- 모든 의존성에 대해 (지정된 범위 내에서) 업그레이드