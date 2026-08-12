# NPM Plus 연동

Sejong TV Compose에는 Nginx가 없습니다. HTTPS/WSS는 기존 **NPM Plus**에서 처리합니다.

## 1. Docker 네트워크

`docker-compose.yml`의 `npmplus` external 네트워크 이름을, NPM Plus 컨테이너가 붙어 있는 네트워크와 동일하게 맞춥니다.

```bash
docker network ls
# 예: npmplus, proxy, nginx-proxy-manager_default 등
```

## 2. Proxy Host (권장: 앱을 NPM Plus 네트워크에 연결)

`docker-compose.yml`에서 `ports`를 끄고 `networks.npmplus`를 켠 뒤:

```bash
docker network ls
docker compose up -d --build
```

| 항목 | 값 |
|------|-----|
| Domain Names | `tv.example.com` (실제 도메인) |
| Scheme | `http` |
| Forward Hostname / IP | `sejong-tv` (container_name) |
| Forward Port | `3000` |
| Websockets Support | **ON** (필수) |
| SSL | Let's Encrypt 등 활성화 |

로컬만 쓸 때는 `http://localhost:3000` 으로 직접 접속하면 됩니다.

## 3. 권장 Custom Nginx 설정

장시간 방 유지 시 타임아웃을 늘립니다.

```nginx
proxy_read_timeout 3600s;
proxy_send_timeout 3600s;
```

## 4. 확인

- `https://tv.example.com` 접속
- 브라우저 개발자 도구 Network에서 `/socket.io/` 가 `101 Switching Protocols` 인지 확인
- Windows Chrome/Edge에서 화면 공유(시스템 오디오 포함) 테스트
