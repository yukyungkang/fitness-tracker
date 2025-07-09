# 💪 나의 운동 & 체중 기록 앱

> 상세한 운동 기록으로 더 정확한 진전을 추적하는 개인 피트니스 웹 애플리케이션

[![Made with Love](https://img.shields.io/badge/Made%20with-❤️-red.svg)](https://github.com)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)](https://html.spec.whatwg.org/)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)](https://www.w3.org/Style/CSS/)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?style=flat&logo=chart.js&logoColor=white)](https://www.chartjs.org/)

## 📖 목차

- [🎯 프로젝트 소개](#-프로젝트-소개)
- [✨ 주요 기능](#-주요-기능)
- [📸 스크린샷](#-스크린샷)
- [🚀 시작하기](#-시작하기)
- [💡 사용법](#-사용법)
- [🛠️ 기술 스택](#️-기술-스택)
- [📱 반응형 지원](#-반응형-지원)
- [🔧 커스터마이징](#-커스터마이징)
- [📊 데이터 관리](#-데이터-관리)
- [🤝 기여하기](#-기여하기)
- [📄 라이선스](#-라이선스)

## 🎯 프로젝트 소개

**나의 운동 & 체중 기록 앱**은 개인의 피트니스 여정을 체계적으로 관리할 수 있는 웹 기반 애플리케이션입니다. 

### 🌟 핵심 가치
- **간편한 기록**: 직관적인 인터페이스로 운동 정보를 쉽게 입력
- **시각적 분석**: 차트와 그래프로 진전 상황을 한눈에 파악
- **개인화**: 사용자만의 운동 종류 추가 및 관리
- **동기부여**: 목표 설정과 연속 기록으로 지속적인 운동 습관 형성

## ✨ 주요 기능

### 📊 **스마트 대시보드**
- 실시간 운동 현황 모니터링
- 주요 지표 시각화 (체중, 걸음수, 칼로리, 운동 기록)
- 주간 목표 진행률 추적
- 운동 연속 기록 (스트릭) 달력

### 📝 **상세 운동 기록**
- **기본 운동**: 걷기, 달리기, 일립티컬, 수영, 웨이트
- **커스텀 운동**: 사용자 정의 운동 종류 추가
- **다차원 데이터**: 시간, 칼로리, 거리, 걸음수 기록
- **메모 기능**: 컨디션, 느낀 점 등 상세 기록

### 📈 **진전 분석 그래프**
- 체중 변화 추이 (꺾은선 그래프)
- 일일 칼로리 소모량
- 운동시간 변화
- 운동 거리 기록
- 걸음수 목표 달성도
- 운동 종류별 분포

### 🔍 **고급 검색 & 필터**
- 날짜별 기록 검색
- 운동 종류별 필터링
- 키워드 검색 (메모 내용)
- 다중 조건 필터링

### 💾 **데이터 관리**
- 자동 로컬 저장
- JSON 형태 데이터 백업/복원
- 전체 데이터 초기화
- 개인정보 보호 (로컬 저장)

## 📸 스크린샷

### 🖥️ 데스크톱 화면
![Desktop Dashboard](https://via.placeholder.com/800x600/667eea/ffffff?text=Desktop+Dashboard)

### 📱 모바일 화면
![Mobile Dashboard](https://via.placeholder.com/400x800/667eea/ffffff?text=Mobile+Dashboard)

### 📊 그래프 화면
![Charts View](https://via.placeholder.com/800x600/4ECDC4/ffffff?text=Progress+Charts)

## 🚀 시작하기

### 📋 필요 조건
- 웹 브라우저 (Chrome, Firefox, Safari, Edge)
- 인터넷 연결 (Chart.js CDN 로드용)

### ⚡ 빠른 시작

1. **파일 다운로드**
   ```bash
   git clone https://github.com/yourusername/fitness-tracker.git
   cd fitness-tracker
   ```

2. **파일 구조 확인**
   ```
   📁 fitness-tracker/
   ├── 📄 index.html      # 메인 HTML 파일
   ├── 🎨 styles.css      # 스타일시트
   ├── ⚡ script.js       # JavaScript 로직
   └── 📖 README.md       # 프로젝트 문서
   ```

3. **실행**
   - `index.html` 파일을 더블클릭하여 브라우저에서 실행
   - 또는 라이브 서버를 사용하여 실행

## 💡 사용법

### 1️⃣ **첫 기록 작성**
1. **기록 입력** 탭 선택
2. 날짜 설정 (기본: 오늘)
3. 체중 입력 (선택사항)
4. 걸음수 입력 (선택사항)
5. 운동 종류 선택
6. 운동 세부정보 입력 (시간, 칼로리, 거리)
7. 메모 작성 (선택사항)
8. **저장** 버튼 클릭

### 2️⃣ **대시보드 확인**
- **주요 지표**: 총 운동 기록, 현재 체중, 오늘 걸음수, 주간 칼로리
- **진행률**: 주간 운동 목표, 일일 걸음 목표
- **연속 기록**: 운동 스트릭과 최근 2주 달력
- **최근 기록**: 최근 5개 운동 기록

### 3️⃣ **그래프 분석**
- **그래프** 탭에서 다양한 차트 확인
- 체중, 칼로리, 운동시간, 거리, 걸음수 추이 분석
- 운동 종류별 분포 파악

### 4️⃣ **데이터 관리**
- **설정** 탭에서 운동 종류 추가/삭제
- 데이터 백업 (JSON 파일 다운로드)
- 데이터 복원 (JSON 파일 업로드)

## 🛠️ 기술 스택

### Frontend
- **HTML5**: 시맨틱 마크업
- **CSS3**: 
  - Flexbox & Grid 레이아웃
  - 그라데이션 & 애니메이션
  - 반응형 디자인
- **Vanilla JavaScript**: 
  - ES6+ 문법
  - 로컬 스토리지 API
  - DOM 조작

### 라이브러리
- **Chart.js**: 데이터 시각화
  - 꺾은선 그래프
  - 막대 그래프  
  - 도넛 차트

### 데이터 저장
- **Local Storage**: 브라우저 로컬 저장소
- **JSON**: 데이터 구조화 및 백업

## 📱 반응형 지원

### 📐 브레이크포인트
- **모바일**: `< 768px`
- **태블릿**: `768px - 1024px`
- **데스크톱**: `> 1024px`

### 🎨 적응형 레이아웃
- **모바일**: 1-2열 그리드, 세로 네비게이션
- **태블릿**: 2-3열 그리드, 가로 네비게이션
- **데스크톱**: 3-4열 그리드, 전체 기능

### ✋ 터치 최적화
- 터치 친화적 버튼 크기
- 스와이프 제스처 지원
- 모바일 키보드 최적화

## 🔧 커스터마이징

### 🎨 **색상 테마 변경**
`styles.css`에서 주요 색상 변경:
```css
/* 메인 그라데이션 */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* 액센트 컬러 */
--primary-color: #667eea;
--secondary-color: #4ECDC4;
--success-color: #00b894;
--danger-color: #e74c3c;
```

### 🏃‍♂️ **기본 운동 종류 수정**
`script.js`에서 기본 운동 배열 수정:
```javascript
const defaultExercises = [
    { name: '걷기', icon: '🚶‍♂️', hasDistance: true },
    { name: '달리기', icon: '🏃‍♂️', hasDistance: true },
    // 원하는 운동 추가...
];
```

### 🎯 **목표 설정 변경**
목표 값 조정:
```javascript
const weeklyGoal = 5;     // 주간 운동 목표 (회)
const dailyGoal = 10000;  // 일일 걸음 목표 (보)
```

## 📊 데이터 관리

### 📁 **데이터 구조**
```json
{
  "records": [
    {
      "id": 1640995200000,
      "date": "2024-01-01",
      "weight": 70.5,
      "steps": 8500,
      "exerciseType": "러닝",
      "duration": 30,
      "calories": 300,
      "distance": 5.2,
      "notes": "컨디션 좋음"
    }
  ],
  "customExercises": [
    {
      "name": "요가",
      "icon": "🧘‍♂️",
      "hasDistance": false
    }
  ]
}
```

### 💾 **백업 방법**
1. **설정** 탭 이동
2. **데이터 내보내기** 클릭
3. JSON 파일 자동 다운로드
4. 파일명: `fitness-data-YYYY-MM-DD.json`

### 📥 **복원 방법**
1. **설정** 탭 이동
2. **데이터 가져오기** 클릭
3. 백업 JSON 파일 선택
4. 자동 데이터 복원

## 🤝 기여하기

### 🐛 **버그 신고**
[Issues](https://github.com/yourusername/fitness-tracker/issues)에서 버그를 신고해주세요.

### 💡 **기능 제안**
새로운 기능 아이디어가 있다면 [Discussions](https://github.com/yourusername/fitness-tracker/discussions)에서 공유해주세요.

### 🔧 **개발 참여**
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📈 로드맵

### 🔮 **예정 기능**
- [ ] PWA 지원 (오프라인 사용)
- [ ] 운동 루틴 템플릿
- [ ] 소셜 공유 기능
- [ ] 다크 모드
- [ ] 다국어 지원
- [ ] CSV 데이터 내보내기

### 🏆 **버전 히스토리**
- **v1.0.0** (2024-01-01): 초기 릴리즈
  - 기본 운동 기록 기능
  - 대시보드 및 통계
  - 그래프 시각화
  - 반응형 디자인

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 📞 연락처

- **개발자**: Your Name
- **이메일**: your.email@example.com
- **GitHub**: [@yourusername](https://github.com/yourusername)

## 🙏 감사의 말

- [Chart.js](https://www.chartjs.org/) - 아름다운 차트 라이브러리
- [Google Fonts](https://fonts.google.com/) - 웹 폰트 제공
- [Unsplash](https://unsplash.com/) - 고품질 이미지 제공

---

<div align="center">
  <strong>💪 건강한 운동 습관을 만들어보세요! 💪</strong>
  <br><br>
  <sub>Made with ❤️ by <a href="https://github.com/yourusername">Your Name</a></sub>
</div>
