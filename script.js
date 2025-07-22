import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, query, where, orderBy, limit, addDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ✅ Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyBasJig37TExc76J3mlcJ9p5uZLXFrY5CQ",
  authDomain: "dietpage-5f49a.firebaseapp.com",
  projectId: "dietpage-5f49a",
  storageBucket: "dietpage-5f49a.firebasestorage.app",
  messagingSenderId: "666434272009",
  appId: "1:666434272009:web:a491c168ac072658bdb1d8",
  measurementId: "G-60RQ5NPWF5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// ✅ 전역 변수들
let currentUser = null;
let planData = [];
let goalWeight = 60;
let bodyRecords = [];
let userHeight = 165;

// ✅ Toast 함수
function showToast(msg) {
  console.log('🍞 Toast:', msg);
  const toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) {
    alert(msg); // 백업으로 alert 사용
    return;
  }
  const div = document.createElement('div');
  div.className = 'toast';
  div.textContent = msg;
  toastContainer.appendChild(div);
  setTimeout(() => div.classList.add('show'), 100);
  setTimeout(() => {
    div.classList.remove('show');
    setTimeout(() => div.remove(), 400);
  }, 3000);
}

// ✅ BMI 계산 함수
function calculateBMI(height, weight) {
  if (!height || !weight) return 0;
  const heightInM = height / 100;
  return (weight / (heightInM * heightInM)).toFixed(1);
}

// ✅ 탭 전환 함수
function switchTab(tabName) {
  console.log('🎯 탭 전환:', tabName);
  
  // 모든 섹션 숨기기
  document.querySelectorAll('section').forEach(section => {
    section.classList.remove('active');
  });
  
  // 선택된 섹션 표시
  const selectedSection = document.getElementById(tabName);
  if (selectedSection) {
    selectedSection.classList.add('active');
    
    if (tabName === 'stats') {
      setTimeout(() => drawAllCharts(), 300);
    }
  }
}

// ✅ DOM 완전 로드 후 실행
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 DOM 로드 완료');
  
  // 초기 설정
  setupInitialState();
  setupEventListeners();
  setupNavigation();
  
  console.log('✅ 모든 초기화 완료');
});

// ✅ 초기 상태 설정
function setupInitialState() {
  console.log('📋 초기 상태 설정');
  
  // 오늘 날짜 설정
  const measureDate = document.getElementById('measureDate');
  if (measureDate) {
    measureDate.value = new Date().toISOString().split('T')[0];
  }
  
  // 초기 플랜 생성
  generatePlan(null, 28, 5);
  renderPlanTable();
  
  // 첫 번째 탭 활성화
  setTimeout(() => switchTab('guide'), 100);
}

// ✅ 이벤트 리스너 설정
function setupEventListeners() {
  console.log('🎧 이벤트 리스너 설정');
  
  // 로그인 버튼
  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) {
    console.log('🔐 로그인 버튼 이벤트 설정');
    loginBtn.addEventListener('click', handleLogin);
  }
  
  // 로그아웃 버튼
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    console.log('🚪 로그아웃 버튼 이벤트 설정');
    logoutBtn.addEventListener('click', handleLogout);
  }
  
  // 신체 정보 저장 버튼
  const addBodyDataBtn = document.getElementById('addBodyDataBtn');
  if (addBodyDataBtn) {
    console.log('📊 신체 정보 저장 버튼 이벤트 설정');
    addBodyDataBtn.addEventListener('click', handleBodyDataSave);
  } else {
    console.error('❌ addBodyDataBtn을 찾을 수 없습니다');
  }
  
  // 설정 저장 버튼
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  if (saveSettingsBtn) {
    console.log('💾 설정 저장 버튼 이벤트 설정');
    saveSettingsBtn.addEventListener('click', handleSettingsSave);
  }
  
  // 주기 자동 계산
  const prevPeriodStart = document.getElementById('prevPeriodStart');
  const periodStart = document.getElementById('periodStart');
  if (prevPeriodStart) prevPeriodStart.addEventListener('change', calculateAvgCycle);
  if (periodStart) periodStart.addEventListener('change', calculateAvgCycle);
}

// ✅ 네비게이션 설정
function setupNavigation() {
  console.log('🧭 네비게이션 설정');
  
  const allNavButtons = document.querySelectorAll('[data-tab]');
  console.log(`📱 네비게이션 버튼 ${allNavButtons.length}개 발견`);
  
  allNavButtons.forEach((button, index) => {
    console.log(`📱 버튼 ${index + 1}: ${button.dataset.tab}`);
    button.addEventListener('click', function(e) {
      e.preventDefault();
      
      const tabName = this.dataset.tab;
      console.log(`🎯 탭 클릭: ${tabName}`);
      
      // 모든 네비게이션 버튼에서 active 제거
      allNavButtons.forEach(btn => btn.classList.remove('active'));
      
      // 같은 탭의 모든 버튼 활성화
      document.querySelectorAll(`[data-tab="${tabName}"]`).forEach(btn => {
        btn.classList.add('active');
      });
      
      // 탭 전환
      switchTab(tabName);
      
      // 햅틱 피드백
      if (navigator.vibrate) navigator.vibrate(50);
    });
  });
}

// ✅ 로그인 처리
async function handleLogin(e) {
  e.preventDefault();
  console.log('🔐 로그인 버튼 클릭됨');
  
  try {
    showToast("🔄 로그인 시도 중...");
    
    await setPersistence(auth, browserLocalPersistence);
    const result = await signInWithPopup(auth, provider);
    
    currentUser = result.user;
    console.log('✅ 로그인 성공:', currentUser.displayName);
    showToast("✅ 로그인 성공!");
    
  } catch (error) {
    console.error('❌ 로그인 오류:', error);
    showToast("❌ 로그인 실패: " + error.message);
  }
}

// ✅ 로그아웃 처리
async function handleLogout(e) {
  e.preventDefault();
  console.log('🚪 로그아웃 버튼 클릭됨');
  
  try {
    await signOut(auth);
    showToast("✅ 로그아웃 완료!");
  } catch (error) {
    console.error('❌ 로그아웃 오류:', error);
    showToast("❌ 로그아웃 실패");
  }
}

// ✅ 신체 정보 저장 처리
async function handleBodyDataSave(e) {
  e.preventDefault();
  console.log('📊 신체 정보 저장 버튼 클릭됨');
  
  if (!currentUser) {
    showToast("로그인이 필요합니다.");
    return;
  }
  
  // 입력값 가져오기
  const measureDate = document.getElementById('measureDate')?.value;
  const measureTime = document.getElementById('measureTime')?.value || 'morning';
  const weight = parseFloat(document.getElementById('weightInput')?.value);
  const bodyFat = parseFloat(document.getElementById('bodyFatInput')?.value);
  const muscleMass = parseFloat(document.getElementById('muscleMassInput')?.value);
  const visceralFat = parseFloat(document.getElementById('visceralFatInput')?.value);
  const waterPercent = parseFloat(document.getElementById('waterPercentInput')?.value);
  const bmr = parseFloat(document.getElementById('bmrInput')?.value);
  const memo = document.getElementById('bodyMemo')?.value || '';
  
  console.log('📝 입력 데이터:', { measureDate, weight, bodyFat });
  
  // 유효성 검사
  if (!measureDate) {
    showToast("측정 날짜를 선택해주세요.");
    return;
  }
  
  if (!weight || isNaN(weight)) {
    showToast("체중을 올바르게 입력해주세요.");
    return;
  }
  
  try {
    showToast("📊 신체 정보 저장 중...");
    
    const bodyData = {
      uid: currentUser.uid,
      userName: currentUser.displayName,
      date: measureDate,
      time: measureTime,
      weight: weight,
      bodyFat: isNaN(bodyFat) ? null : bodyFat,
      muscleMass: isNaN(muscleMass) ? null : muscleMass,
      visceralFat: isNaN(visceralFat) ? null : visceralFat,
      waterPercent: isNaN(waterPercent) ? null : waterPercent,
      bmr: isNaN(bmr) ? null : bmr,
      bmi: parseFloat(calculateBMI(userHeight, weight)),
      memo: memo,
      createdAt: new Date().toISOString(),
      timestamp: new Date().getTime()
    };
    
    console.log('💾 저장할 데이터:', bodyData);
    
    const bodyRef = collection(db, "bodyRecords");
    await addDoc(bodyRef, bodyData);
    
    showToast("✅ 신체 정보 저장 완료!");
    
    // 입력 폼 초기화
    clearBodyInputs();
    
    // 데이터 다시 로드
    await loadBodyRecords();
    
  } catch (error) {
    console.error("❌ 신체 정보 저장 오류:", error);
    showToast("❌ 저장 실패: " + error.message);
  }
}

// ✅ 설정 저장 처리
async function handleSettingsSave(e) {
  e.preventDefault();
  console.log('💾 설정 저장 버튼 클릭됨');
  
  if (!currentUser) {
    showToast("로그인이 필요합니다.");
    return;
  }
  
  const start = document.getElementById('periodStart')?.value;
  const prevStart = document.getElementById('prevPeriodStart')?.value;
  const cycleLength = parseInt(document.getElementById('cycleLength')?.value || 28);
  const menstrualLength = parseInt(document.getElementById('menstrualLength')?.value || 5);
  goalWeight = parseFloat(document.getElementById('goalWeight')?.value || 60);
  userHeight = parseFloat(document.getElementById('userHeight')?.value || 165);
  
  if (!start || !cycleLength || !menstrualLength) {
    showToast("모든 항목을 입력해주세요!");
    return;
  }
  
  try {
    showToast("💾 설정 저장 중...");
    
    // 사용자 설정 저장
    const userRef = doc(db, "userData", currentUser.uid);
    await setDoc(userRef, {
      periodStart: start,
      prevPeriodStart: prevStart,
      cycleLength,
      menstrualLength,
      goalWeight,
      userHeight,
      updatedAt: new Date().toISOString()
    });
    
    // 히스토리 저장
    const historyRef = collection(db, "settingsHistory");
    await addDoc(historyRef, {
      uid: currentUser.uid,
      userName: currentUser.displayName,
      savedAt: new Date().toISOString(),
      periodStart: start,
      prevPeriodStart: prevStart,
      cycleLength,
      menstrualLength,
      timestamp: new Date().getTime()
    });
    
    showToast("✅ 설정 저장 완료!");
    
    // 플랜 재생성
    generatePlan(start, cycleLength, menstrualLength);
    renderPlanTable();
    
    // 히스토리 다시 로드
    setTimeout(() => loadSettingsHistory(), 1000);
    
  } catch (error) {
    console.error("❌ 설정 저장 오류:", error);
    showToast("❌ 저장 실패: " + error.message);
  }
}

// ✅ 입력 폼 초기화
function clearBodyInputs() {
  const inputs = [
    'weightInput', 'bodyFatInput', 'muscleMassInput', 
    'visceralFatInput', 'waterPercentInput', 'bmrInput', 'bodyMemo'
  ];
  
  inputs.forEach(id => {
    const element = document.getElementById(id);
    if (element) element.value = '';
  });
}

// ✅ 평균 주기 계산
function calculateAvgCycle() {
  const prevInput = document.getElementById('prevPeriodStart');
  const lastInput = document.getElementById('periodStart');
  const cycleInput = document.getElementById('cycleLength');
  const avgDisplay = document.getElementById('avgCycleDisplay');
  
  if (!prevInput || !lastInput) return;
  
  const prev = new Date(prevInput.value);
  const last = new Date(lastInput.value);
  
  if (!isNaN(prev) && !isNaN(last)) {
    const diff = Math.round((last - prev) / (1000 * 60 * 60 * 24));
    if (diff > 15 && diff < 60) {
      if (cycleInput) cycleInput.value = diff;
      if (avgDisplay) avgDisplay.textContent = diff;
    }
  }
}

// ✅ 신체 기록 불러오기
async function loadBodyRecords() {
  if (!currentUser) return;
  
  try {
    console.log('📥 신체 기록 불러오기...');
    
    const bodyCollection = collection(db, "bodyRecords");
    const q = query(bodyCollection, where("uid", "==", currentUser.uid));
    const querySnapshot = await getDocs(q);
    
    bodyRecords = [];
    querySnapshot.forEach(docSnap => {
      bodyRecords.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });
    
    bodyRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    console.log(`📥 ${bodyRecords.length}개 기록 로드됨`);
    
    renderBodyRecordsTable();
    updateBodySummary();
    updateStatsCards();
    
  } catch (error) {
    console.error("❌ 신체 기록 불러오기 오류:", error);
  }
}

// ✅ 설정 불러오기
async function loadSettings() {
  if (!currentUser) return;
  
  try {
    console.log('📥 설정 불러오기...');
    
    const userRef = doc(db, "userData", currentUser.uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const data = userSnap.data();
      
      // DOM 업데이트
      const elements = {
        prevPeriodStart: data.prevPeriodStart || '',
        periodStart: data.periodStart || '',
        cycleLength: data.cycleLength || 28,
        menstrualLength: data.menstrualLength || 5,
        goalWeight: data.goalWeight || 60,
        userHeight: data.userHeight || 165
      };
      
      Object.keys(elements).forEach(key => {
        const element = document.getElementById(key);
        if (element) element.value = elements[key];
      });
      
      // 표시 업데이트
      const avgDisplay = document.getElementById('avgCycleDisplay');
      if (avgDisplay) avgDisplay.textContent = data.cycleLength || 28;
      
      // 전역 변수 업데이트
      goalWeight = data.goalWeight || 60;
      userHeight = data.userHeight || 165;
      
      // 플랜 생성
      generatePlan(data.periodStart, data.cycleLength, data.menstrualLength);
      renderPlanTable();
      
    } else {
      generatePlan(null, 28, 5);
      renderPlanTable();
    }
    
    await loadSettingsHistory();
    
  } catch (error) {
    console.error("❌ 설정 불러오기 오류:", error);
  }
}

// ✅ 설정 히스토리 불러오기
async function loadSettingsHistory() {
  const historyContainer = document.getElementById('settingsHistoryList');
  if (!historyContainer) return;
  
  if (!currentUser) {
    historyContainer.innerHTML = '<div class="no-login">로그인 후 설정 기록을 확인할 수 있습니다.</div>';
    return;
  }
  
  try {
    const historyCollection = collection(db, "settingsHistory");
    const querySnapshot = await getDocs(historyCollection);
    
    let historyList = [];
    querySnapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.uid === currentUser.uid) {
        historyList.push({ id: docSnap.id, ...data });
      }
    });
    
    historyList.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    historyList = historyList.slice(0, 5);
    
    let html = '';
    if (historyList.length === 0) {
      html = '<div class="no-history">저장된 설정 기록이 없습니다.</div>';
    } else {
      historyList.forEach(item => {
        const date = item.savedAt ? item.savedAt.slice(0, 10) : '날짜 없음';
        html += `
          <div class="history-item">
            <div class="history-date">📅 ${date}</div>
            <div class="history-details">
              생리 시작일: ${item.periodStart || '미설정'} | 주기: ${item.cycleLength || 28}일
            </div>
          </div>
        `;
      });
    }
    
    historyContainer.innerHTML = html;
    
  } catch (error) {
    console.error("❌ 히스토리 불러오기 오류:", error);
    historyContainer.innerHTML = '<div class="error">히스토리를 불러오는 중 오류가 발생했습니다.</div>';
  }
}

// ✅ 신체 기록 테이블 렌더링
function renderBodyRecordsTable() {
  const tbody = document.getElementById('bodyRecordsTable');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  const recentRecords = bodyRecords.slice(0, 10);
  
  recentRecords.forEach(record => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${record.date}</td>
      <td>${record.time === 'morning' ? '아침' : '저녁'}</td>
      <td>${record.weight}kg</td>
      <td>${record.bodyFat ? record.bodyFat + '%' : '-'}</td>
      <td>${record.muscleMass ? record.muscleMass + 'kg' : '-'}</td>
      <td>${record.bmi}</td>
      <td>${record.memo || '-'}</td>
      <td><button class="delete-btn" onclick="deleteBodyRecord('${record.id}')">삭제</button></td>
    `;
    tbody.appendChild(row);
  });
}

// ✅ 신체 정보 요약 업데이트
function updateBodySummary() {
  const elements = {
    currentWeightDisplay: bodyRecords.length > 0 ? bodyRecords[0].weight + 'kg' : '-kg',
    currentBodyFatDisplay: bodyRecords.length > 0 && bodyRecords[0].bodyFat ? bodyRecords[0].bodyFat + '%' : '-%',
    currentMuscleDisplay: bodyRecords.length > 0 && bodyRecords[0].muscleMass ? bodyRecords[0].muscleMass + 'kg' : '-kg',
    remainingWeightDisplay: bodyRecords.length > 0 ? 
      (bodyRecords[0].weight - goalWeight > 0 ? (bodyRecords[0].weight - goalWeight).toFixed(1) + 'kg' : '목표 달성!') : '-kg'
  };
  
  Object.keys(elements).forEach(id => {
    const element = document.getElementById(id);
    if (element) element.textContent = elements[id];
  });
}

// ✅ 통계 카드 업데이트
function updateStatsCards() {
  if (bodyRecords.length < 2) return;
  
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recent = bodyRecords[0];
  const oldRecord = bodyRecords.find(r => new Date(r.date) <= thirtyDaysAgo) || bodyRecords[bodyRecords.length - 1];
  
  const changes = {
    weight: recent.weight - oldRecord.weight,
    bodyFat: (recent.bodyFat || 0) - (oldRecord.bodyFat || 0),
    muscle: (recent.muscleMass || 0) - (oldRecord.muscleMass || 0)
  };
  
  const displays = {
    weightChangeDisplay: (changes.weight > 0 ? '+' : '') + changes.weight.toFixed(1) + 'kg',
    bodyFatChangeDisplay: (changes.bodyFat > 0 ? '+' : '') + changes.bodyFat.toFixed(1) + '%',
    muscleGainDisplay: (changes.muscle > 0 ? '+' : '') + changes.muscle.toFixed(1) + 'kg',
    currentBMIDisplay: recent.bmi
  };
  
  Object.keys(displays).forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = displays[id];
      if (id.includes('weight') || id.includes('bodyFat')) {
        element.style.color = changes.weight < 0 || changes.bodyFat < 0 ? '#27ae60' : '#e74c3c';
      } else if (id.includes('muscle')) {
        element.style.color = changes.muscle > 0 ? '#27ae60' : '#e74c3c';
      }
    }
  });
}

// ✅ 로그인 상태 변경 감지
onAuthStateChanged(auth, async (user) => {
  const loginBtn = document.getElementById('loginBtn');
  const userSection = document.getElementById('userSection');
  const userInfo = document.getElementById('userInfo');
  
  if (user) {
    currentUser = user;
    console.log('✅ 사용자 로그인:', user.displayName);
    
    if (loginBtn) loginBtn.style.display = 'none';
    if (userSection) userSection.style.display = 'flex';
    if (userInfo) userInfo.textContent = user.displayName;
    
    await loadSettings();
    await loadBodyRecords();
    
  } else {
    currentUser = null;
    console.log('❌ 사용자 로그아웃');
    
    if (loginBtn) loginBtn.style.display = 'block';
    if (userSection) userSection.style.display = 'none';
    if (userInfo) userInfo.textContent = '';
    
    await loadSettingsHistory();
  }
});

// ✅ 플랜 생성
function generatePlan(startDateStr, cycle, menstrual) {
  planData = [];
  
  let startDate = startDateStr ? new Date(startDateStr) : new Date();
  const today = new Date();
  
  for (let i = 0; i < 90; i++) {
    const day = new Date(today);
    day.setDate(today.getDate() + i);
    
    const weekday = day.getDay();
    if (weekday === 0 || weekday === 6) continue;
    
    const diff = Math.floor((day - startDate) / (1000 * 60 * 60 * 24));
    const phaseDay = diff % cycle;
    
    let phase = '여포기';
    let cardio = "경사6%, 속도4.5, 30분";
    let home = "IMPT 루틴";
    
    if (phaseDay < menstrual) {
      phase = '월경기';
      cardio = "가볍게 걷기 20분";
      home = "스트레칭";
    } else if (phaseDay < 14) {
      phase = '여포기';
    } else if (phaseDay === 14) {
      phase = '배란기';
      cardio = "속도5.0, 35분";
      home = "IMPT + 코어";
    } else {
      phase = '황체기';
    }
    
    planData.push({
      day: i + 1,
      date: `${day.getMonth() + 1}/${day.getDate()} (${['일','월','화','수','목','금','토'][weekday]})`,
      phase,
      cardio,
      home,
      morningDone: false,
      eveningDone: false
    });
  }
}

// ✅ 플랜 테이블 렌더링
function renderPlanTable() {
  const tbody = document.getElementById('planTable');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  planData.forEach((item) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${item.day}</td>
      <td>${item.date}</td>
      <td>${item.phase}</td>
      <td>${item.cardio}</td>
      <td>${item.home}</td>
      <td><input type="checkbox" ${item.morningDone ? 'checked' : ''}></td>
      <td><input type="checkbox" ${item.eveningDone ? 'checked' : ''}></td>
    `;
    
    const checkboxes = row.querySelectorAll('input[type="checkbox"]');
    checkboxes[0].addEventListener('change', () => {
      item.morningDone = checkboxes[0].checked;
      updateProgress();
    });
    checkboxes[1].addEventListener('change', () => {
      item.eveningDone = checkboxes[1].checked;
      updateProgress();
    });
    
    tbody.appendChild(row);
  });
  
  updateProgress();
}

// ✅ 진행률 업데이트
function updateProgress() {
  const total = planData.length * 2;
  const done = planData.filter(p => p.morningDone).length + planData.filter(p => p.eveningDone).length;
  const percent = Math.round((done / total) * 100);
  
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  
  if (progressFill) progressFill.style.width = percent + '%';
  if (progressText) progressText.textContent = percent + '%';
}

// ✅ 차트 그리기 (간단 버전)
function drawAllCharts() {
  console.log('📊 차트 그리기 시작');
  drawWeightChart();
  drawBodyFatChart();
  drawMuscleChart();
  drawWorkoutChart();
}

<!-- 임시 테스트 섹션 - body 태그 닫히기 전에 추가 -->
<div id="testSection" style="position: fixed; top: 10px; right: 10px; background: rgba(255,0,0,0.8); color: white; padding: 15px; border-radius: 10px; z-index: 9999; font-size: 12px;">
  <h4>🔧 테스트 패널</h4>
  <button onclick="testLogin()" style="display: block; margin: 5px 0; padding: 5px 10px;">🔐 로그인 테스트</button>
  <button onclick="testBodySave()" style="display: block; margin: 5px 0; padding: 5px 10px;">📊 저장 테스트</button>
  <button onclick="checkStatus()" style="display: block; margin: 5px 0; padding: 5px 10px;">🔍 상태 확인</button>
  <button onclick="hideTestPanel()" style="display: block; margin: 5px 0; padding: 5px 10px;">❌ 패널 숨기기</button>
</div>

<script>
// 테스트 함수들
function testLogin() {
  console.log('🧪 로그인 테스트 시작');
  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) {
    console.log('✅ 로그인 버튼 찾음');
    loginBtn.click();
  } else {
    console.log('❌ 로그인 버튼 없음');
    alert('로그인 버튼을 찾을 수 없습니다');
  }
}

function testBodySave() {
  console.log('🧪 신체정보 저장 테스트 시작');
  
  // 테스트 데이터 입력
  const weightInput = document.getElementById('weightInput');
  const measureDate = document.getElementById('measureDate');
  
  if (weightInput) weightInput.value = '65.5';
  if (measureDate) measureDate.value = new Date().toISOString().split('T')[0];
  
  // 저장 버튼 클릭
  const saveBtn = document.getElementById('addBodyDataBtn');
  if (saveBtn) {
    console.log('✅ 저장 버튼 찾음');
    saveBtn.click();
  } else {
    console.log('❌ 저장 버튼 없음');
    alert('저장 버튼을 찾을 수 없습니다');
  }
}

function checkStatus() {
  const status = {
    '로그인 버튼': !!document.getElementById('loginBtn'),
    '저장 버튼': !!document.getElementById('addBodyDataBtn'),
    '설정 버튼': !!document.getElementById('saveSettingsBtn'),
    '현재 사용자': window.currentUser ? '로그인됨' : '로그아웃됨',
    '체중 입력': !!document.getElementById('weightInput'),
    '날짜 입력': !!document.getElementById('measureDate')
  };
  
  console.table(status);
  
  let message = '📊 상태 확인:\n';
  Object.entries(status).forEach(([key, value]) => {
    message += `${key}: ${value ? '✅' : '❌'}\n`;
  });
  
  alert(message);
}

function hideTestPanel() {
  document.getElementById('testSection').style.display = 'none';
}

// 자동으로 상태 확인 (5초 후)
setTimeout(() => {
  console.log('🔍 자동 상태 확인');
  checkStatus();
}, 5000);
</script>
