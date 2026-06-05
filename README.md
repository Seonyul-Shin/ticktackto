# 틱택토 네온 배틀 (Tic-Tac-Toe Neon Battle) 🎮

실시간 멀티플레이어 대전을 지원하는 프리미엄 틱택토(삼목) 웹 게임입니다. HSL 기반의 다크 네온 테마와 Web Audio API 소리 합성, 파티클 효과, 인공지능 모드를 포함하고 있으며, Firebase를 활용하여 데이터 사용량을 최적화하였습니다.

👉 **라이브 데모**: [https://seonyul-shin.github.io/ticktackto/](https://seonyul-shin.github.io/ticktackto/)

---

## 🌟 주요 특징 (Features)

1. **실시간 멀티플레이어 (Firebase RTDB)**:
   * 6자리 방 번호를 이용하여 원격의 친구와 1vs1로 동기화 대전을 펼칠 수 있습니다.
2. **15초 턴 타이머 (Turn Timer)**:
   * 각 턴마다 15초 제한 시간이 주어집니다. 15초 내에 돌을 두지 못할 경우 시간 초과 기권패(Timeout Defeat)가 선언됩니다.
3. **인공지능 대전 (AI Mode)**:
   * 혼자서도 즐길 수 있도록 AI 대전 모드를 지원합니다.
   * **쉬움**: 무작위 위치에 돌을 둡니다.
   * **어려움**: 미니맥스(Minimax) 알고리즘을 탑재하여 완벽한 최적의 수를 두는 언비터블(Unbeatable) AI와 겨룹니다.
4. **소리 효과음 합성 (Web Audio API)**:
   * 별도의 대용량 MP3 파일 로드 없이, 브라우저의 Web Audio API를 활용해 터치음, 타이머 경고음, 승리/무승부 멜로디를 실시간으로 합성 및 재생합니다. (무음 모드 지원)
5. **승리 기념 효과 (Confetti)**:
   * 삼목을 연결해 승리할 시 화려한 폭죽 파티클 애니메이션과 승리 전용 멜로디가 플레이됩니다.
6. **네온 글래스모피즘 디자인**:
   * 반응형 CSS 그리드와 미려한 글래스모피즘 테마를 적용해 PC와 모바일 화면 모두에서 훌륭한 UI를 제공합니다.

---

## ⚡ 초경량화 & 최적화 (Database Key Shortening)

Firebase 무료 요금제 사용량(용량 및 전송량)을 최소화하기 위해 아래와 같은 데이터 구조 경량화 처리를 적용했습니다.
* **키 이름 축소**: `status` ➔ `s`, `board` ➔ `b`, `players` ➔ `p` 등으로 짧게 줄여 네트워크 데이터 크기를 70% 이상 절약했습니다.
* **보드 데이터 플랫 문자열(Flat String) 처리**: 기존의 JSON 배열 형태 대신 9글자 단일 문자열(예: `"...X.O.X."`)로 변환하여 Firebase에 통신 및 저장하여 불필요한 트래픽 소모를 방지합니다.
* **자동 정리 (Garbage Collection)**: 호스트의 연결이 강제로 끊기거나 사용자가 로비로 나갈 시 생성된 대기 방 노드는 데이터베이스에서 즉시 삭제됩니다.

---

## 🛠️ 설치 및 로컬 실행 방법 (Setup)

이 프로젝트는 빌드 과정이 필요 없는 순수 Vanilla JS 모듈로 구성되어 있습니다.

1. 이 저장소를 클론하거나 다운로드합니다.
2. 폴더 내에서 로컬 HTTP 서버를 실행합니다 (예: Python 내장 서버 활용):
   ```bash
   python -m http.server 8000
   ```
3. 웹 브라우저에서 `http://localhost:8000`에 접속합니다.
4. 멀티플레이어 활성화를 원할 경우, 우측 상단 톱니바퀴(`⚙️`) 설정을 누르고 본인의 Firebase API Key, Database URL, Project ID를 입력한 뒤 저장합니다.

---

## 🚀 배포 방법 (Deployment)

### GitHub Pages (추천)
모든 경로가 상대 경로(`./`)로 연결되어 있어 GitHub Pages에서 완벽히 작동합니다.
1. GitHub 저장소를 만들고 코드를 푸시합니다.
2. 저장소의 **Settings ➔ Pages**로 이동합니다.
3. Build and deployment의 Source를 **Deploy from a branch**로 선택하고 `main` 브라우저를 지정하여 저장합니다.
4. 배포가 완료되면 `https://<your-username>.github.io/<repo-name>/` 주소로 접속 가능합니다.
