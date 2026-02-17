---
publish: true
title: Claude Code 여러 계정 전환 (환경변수 설정)
created: 2026-01-26
tags:
  - misc
cssclasses: ""
---


```bash 
# 기존 settings.json을 별도 폴더로, bedrock 관련 세팅들 옮기기
mkdir -p ~/.claude-2
mv ~/.claude/settings.json ~/.claude-2/settings.json 
```

`~/.zshrc` 파일에 추가:
```
alias claude-2='CLAUDE_CONFIG_DIR=~/.claude-2 claude'
```

이후에는 다른 계정은 원하는 alias명으로 실행하면 됨
```bash
source ~/.zshrc
claude-2
```
안되면 `CLAUDE_CONFIG_DIR=~/.claude-2 claude code` 한번 실행하고 나면 됨