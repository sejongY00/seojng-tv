# Sejong TV

Nuxt 3 기반 멀티 스크린 화면 공유 플랫폼 (Native WebRTC P2P Mesh + Socket.io + Prisma/SQLite).

## 빠른 시작 (로컬)

로컬 개발은 **`.env` 파일**로 설정을 관리합니다.

```bash
cp .env.example .env
# .env 에서 JWT_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD 등 수정
npm install
npx prisma migrate dev
npm run dev
```

`.env.example`을 복사한 뒤 값을 수정합니다.

### 환경 변수

로컬(`.env`)과 Docker(`environment`)에서 동일하게 사용합니다.

| 변수 | 필수 | 기본값 | 설명 |
|------|------|--------|------|
| `JWT_SECRET` | 예 | — | 관리자 JWT·방 accessToken 서명 키. 프로덕션에서는 긴 난수로 변경 |
| `ADMIN_USERNAME` | 예 | `admin` | 관리자 로그인 아이디 |
| `ADMIN_PASSWORD` | 예 | — | 관리자 로그인 비밀번호 (반드시 변경) |
| `DATABASE_URL` | 아니오* | 로컬 `file:../data/sejong.db` / 이미지 `file:/app/data/sejong.db` | Prisma SQLite DB 경로 (*Docker 이미지가 기본값 포함) |
| `MAX_ROOM_MEMBERS` | 아니오 | `8` | 방당 최대 참여자 수 (하드 리밋) |
| `MAX_CONCURRENT_STREAMS` | 아니오 | `4` | 방당 동시 화면 공유(방송) 수 상한 |
| `ROOM_ACCESS_TTL_DAYS` | 아니오 | `7` | 방 비밀번호 통과 후 발급되는 accessToken 유효 기간(일) |
| `HOST` / `NITRO_HOST` | 아니오* | `0.0.0.0` | 바인딩 주소 (*Docker 이미지 기본값) |
| `PORT` / `NITRO_PORT` | 아니오* | `3000` | 리스닝 포트 (*Docker 이미지 기본값) |

Docker Compose에서는 보통 **`JWT_SECRET` / `ADMIN_USERNAME` / `ADMIN_PASSWORD`만** 지정하면 됩니다.

- 앱: http://localhost:3000
- 관리자: http://localhost:3000/admin (계정은 위 `ADMIN_*` 값)

> **참고:** `localhost`의 HTTP는 브라우저가 예외로 허용합니다. 다른 PC·사설 IP·도메인으로 접속할 때는 아래 HTTPS 요구사항을 보세요.

## HTTPS 요구사항 (필수)

**화면 공유·시스템 오디오 등 핵심 기능을 쓰려면 HTTPS로 접속해야 합니다.**

브라우저는 `navigator.mediaDevices.getDisplayMedia()`(화면/창 캡처)를 **보안 컨텍스트(Secure Context)** 에서만 허용합니다.

| 접속 방식 | 화면 공유 | 비고 |
|-----------|-----------|------|
| `https://도메인` | 가능 | 프로덕션·LAN 공용 권장 (NPM Plus SSL) |
| `http://localhost` | 가능 | 개발 PC 본인만 |
| `http://192.168.x.x` 등 사설 IP | **불가** | UI·입장은 열려도 화면 공유가 차단됨 |

따라서 같은 네트워크의 다른 PC와 테스트하거나 실제로 쓰려면 **NPM Plus 등으로 SSL을 켠 뒤 `https://...`로 접속**하세요. Socket.io 시그널링도 같은 호스트의 **WSS**(WebSocket over TLS)로 붙는 구성이 안전합니다.

## Docker + NPM Plus

### 레지스트리 이미지로 실행 (권장)

아래 `docker-compose.yml` 예시처럼 **시크릿·관리자 계정만** `environment`에 넣고 실행합니다.  
(`DATABASE_URL`, 포트 등은 이미지 기본값 사용. 로컬 개발은 `.env` 파일.)

```yaml
services:
  app:
    image: docker.sejong.dev/sejong-tv:latest
    container_name: sejong-tv
    restart: unless-stopped
    environment:
      JWT_SECRET: change-me-to-a-long-random-string
      ADMIN_USERNAME: admin
      ADMIN_PASSWORD: change-me
    volumes:
      - sqlite_data:/app/data
    # 직접 포트 노출 (로컬/테스트)
    ports:
      - "3000:3000"
    # NPM Plus 연동 시: ports를 제거하고 아래 네트워크를 사용
    # networks:
    #   - npmplus

volumes:
  sqlite_data:

# networks:
#   npmplus:
#     external: true
#     # docker network ls 로 NPM Plus 네트워크 이름 확인 후 수정
```

```bash
docker compose pull
docker compose up -d
```

NPM Plus Proxy Host 예: `http` → `sejong-tv:3000`, **Websockets Support ON**, **SSL(HTTPS) 필수 활성화**.  
화면 공유를 포함한 전체 기능은 `https://도메인` 접속에서만 정상 동작합니다.  
자세한 설정은 [docs/npmplus.md](docs/npmplus.md) 참고.

### 로컬에서 이미지 빌드

```bash
docker compose up -d --build
```

### Gitea CI

`main` 푸시 시 `docker.sejong.dev/sejong-tv:latest` 및 `sha-<commit>` 태그로 푸시합니다.  
시크릿 `REGISTRY_USERNAME`, `REGISTRY_PASSWORD`가 필요합니다.


## 주요 기능

- 관리자 방 생성/삭제 (영속, 방 비밀번호)
- URL 입장 + clientId/accessToken 재입장
- N:N 화면 공유, 자율 시청, 스트림별 볼륨/음소거
- Who-Watches-Whom 실시간 표시
- 방 인원 최대 8, 동시 방송 최대 4
