# Sejong TV

Nuxt 3 기반 멀티 스크린 화면 공유 플랫폼 (Native WebRTC P2P Mesh + Socket.io + Prisma/SQLite).

## 빠른 시작 (로컬)

```bash
cp .env.example .env
npm install
npx prisma migrate dev
npm run dev
```

- 앱: http://localhost:3000
- 관리자: http://localhost:3000/admin (기본 `admin` / `admin` — `.env`에서 변경)

## Docker + NPM Plus

레지스트리 이미지 예:

```bash
docker pull docker.sejong.dev/sejong-tv:latest
```

로컬 빌드:

```bash
docker compose up -d --build
```

프록시 설정은 [docs/npmplus.md](docs/npmplus.md) 참고.

Gitea CI: `main` 푸시 시 `docker.sejong.dev/sejong-tv:latest` 및 `sha-<commit>` 태그로 푸시합니다.  
시크릿 `REGISTRY_USERNAME`, `REGISTRY_PASSWORD`가 필요합니다.

## 주요 기능

- 관리자 방 생성/삭제 (영속, 방 비밀번호)
- URL 입장 + clientId/accessToken 재입장
- N:N 화면 공유, 자율 시청, 스트림별 볼륨/음소거
- Who-Watches-Whom 실시간 표시
- 방 인원 최대 8, 동시 방송 최대 4
