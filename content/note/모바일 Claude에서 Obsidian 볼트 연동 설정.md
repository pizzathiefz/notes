---
publish: true
title: 모바일 Claude에서 Obsidian 볼트 연동 설정
created: 2026-05-02
modified: 2026-05-02T21:26:07.267+09:00
published: 2026-05-02T21:26:07.267+09:00
tags:
  - misc
---

- iOS Claude 앱에서 Obsidian 볼트를 읽고 쓸 수 있도록 MCP 커넥터를 연결
- 클코에서 로컬 파일로 하던 작업을 모바일에서도 동일하게 수행하기 위함
- claude 커스텀 커넥터는 **퍼블릭 인터넷에서 접근 가능한 MCP 서버**를 요구함 - 항상 켜놓는 맥미니 사용

1. **Obsidian Local REST API 플러그인** → 볼트를 로컬 HTTPS로 노출
2. **Docker MCP 서버** → REST API를 MCP Streamable HTTP 프로토콜로 변환
3. **Cloudflare Named Tunnel** → 로컬 MCP 서버를 고정 퍼블릭 URL로 노출

- 다른 옵션들
  - 단순 프록시나 임시 Cloudflare Tunnel은 MCP 프로토콜 변환이 안 되거나 재시작 시 URL이 바뀌는 문제가 있어서 채택하지 않음
  - 기존에 쓰던  https://github.com/jacksteamdev/obsidian-mcp-tools 는 데스크탑 전용

## 구성 요소

### 1. Obsidian Local REST API 플러그인

- Community Plugin: `Local REST API` (coddingtonbear)
- 기본 포트: `27124` (HTTPS)
- 설정에서 API Key 발급
- GitHub: https://github.com/coddingtonbear/obsidian-local-rest-api

### 2. Docker MCP 서버 (cyanheads/obsidian-mcp-server)

- Obsidian REST API를 MCP Streamable HTTP 프로토콜로 변환
- 12개 도구 제공: 읽기/쓰기/검색/frontmatter/태그 관리 등
- 인증 없이(`MCP_AUTH_MODE=none`) 로컬 실행 - Cloudflare Tunnel이 외부 접근 제어
- GitHub: https://github.com/cyanheads/obsidian-mcp-server

### 3. Cloudflare Named Tunnel

- 고정 URL: `https://obsidian.[도메인]/mcp`
- 가지고 있던 도메인의 서브도메인으로 설정

## 설치 방법

### 사전 준비

- Obsidian에 Local REST API 플러그인 설치 및 활성화, API Key 복사
- Docker Desktop 설치
- `brew install cloudflared`
- Cloudflare 계정 및 도메인

### Docker MCP 서버 실행

```bash
docker run -d --name obsidian-mcp \
  --restart unless-stopped \
  -p 3010:3010 \
  -e OBSIDIAN_API_KEY="<Obsidian_API_KEY>" \
  -e OBSIDIAN_BASE_URL="https://host.docker.internal:27124" \
  -e OBSIDIAN_VERIFY_SSL="false" \
  -e MCP_TRANSPORT_TYPE="http" \
  -e MCP_AUTH_MODE="none" \
  ghcr.io/cyanheads/obsidian-mcp-server:latest
```

- `--restart unless-stopped`: Docker Desktop 시작 시 자동 실행
- `host.docker.internal`: Docker 컨테이너에서 맥 로컬호스트에 접근하는 주소

### Cloudflare Named Tunnel 설정

```bash
# Cloudflare 로그인
cloudflared tunnel login

# 터널 생성
cloudflared tunnel create obsidian-mcp

# ~/.cloudflared/config.yml 생성
tunnel: <터널_UUID>
credentials-file: /Users/<username>/.cloudflared/<터널_UUID>.json

ingress:
  - hostname: obsidian.[도메인]
    service: http://localhost:3010
  - service: http_status:404

# DNS 등록
cloudflared tunnel route dns obsidian-mcp obsidian.[도메인]
```

### launchd 자동 시작 등록

`~/Library/LaunchAgents/com.cloudflare.tunnel.plist` 생성:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.cloudflare.tunnel</string>
    <key>ProgramArguments</key>
    <array>
        <string>/opt/homebrew/bin/cloudflared</string>
        <string>tunnel</string>
        <string>run</string>
        <string>obsidian-mcp</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/cloudflared.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/cloudflared.log</string>
</dict>
</plist>
```

```bash
mkdir -p ~/Library/LaunchAgents
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.cloudflare.tunnel.plist
```

### claude.ai 커넥터 등록

Settings → Connectors → Add custom connector → URL: `https://obsidian.[도메인]/mcp`

## 자동 실행 구조 (맥 재시작 후)

| 구성 요소 | 자동 실행 방법 |
|---|---|
| Obsidian | 수동 실행 필요 (플러그인이 Obsidian 내에서 동작) |
| Docker MCP 서버 | `--restart unless-stopped` + Docker Desktop 로그인 시 자동 시작 |
| Cloudflare Tunnel | launchd (`RunAtLoad + KeepAlive`) |

## 확인 방법

```bash
cat /tmp/cloudflared.log        # cloudflared 로그
docker ps                       # Docker 컨테이너 상태
curl http://localhost:3010/mcp  # MCP 서버 접근 확인
```
