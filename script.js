import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, query, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

let currentUser = null;
let planData = [];
let goalWeight = 60;
let weightRecords = [];

// ✅ Toast 함수
function showToast(msg) {
  const toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) return;
  
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

// ✅ 탭 전환 함수 (전역으로 선언)
function switchTab(tabName) {
  console.log('탭 전환:', tabName);
  
  // 모든 탭 버튼 비활성화
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // 모든 섹션 숨기기
  document.querySelectorAll('section').forEach(section => {
    section.classList.remove('active');
  });
  
  // 선택된 탭 활성화
  const selectedTab = document.querySelector(`[data-tab="${tabName}"]`);
  const selectedSection = document.getElementById(tabName);
  
  if (selectedTab) selectedTab.classList.add('active');
  if (selectedSection) selectedSection.classList.add('active');
  
  console.log('활성화된 섹션:', selectedSection);
}

// ✅ DOM 로드 완료 후 실행
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM 로드 완료');
  
  // ✅ 탭 메뉴 이벤트 (강제로 다시 바인딩)
  const tabButtons = document.querySelectorAll('.tab-btn');
  console.log('탭 버튼 개수:', tabButtons.length);
  
  tabButtons.forEach((btn, index) => {
    console.log(`탭 ${index}:`, btn.dataset.tab);
    
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('클릭된 탭:', this.dataset.tab);
      switchTab(this.dataset.tab);
    });
  });
  
  // ✅ DOM 요소 참조
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const userInfo = document.getElementById('userInfo');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const addWeightBtn = document.getElementById('addWeightBtn');
  const dateInput = document.getElementById('dateInput');
  const weightInput = document.getElementById('weightInput');
  const goalWeightDisplay = document.getElementById('goalWeightDisplay');
  const currentWeightDisplay = document.getElementById('currentWeightDisplay');
  const remainingWeightDisplay = document.getElementById('remainingWeightDisplay');
  const prevPeriodStartInput = document.getElementById('prevPeriodStart');
  const periodStartInput = document.getElementById('periodStart');
  const cycleLengthInput = document.getElementById('cycleLength');
  const menstrualLengthInput = document.getElementById('menstrualLength');
  const goalWeightInput = document.getElementById('goalWeight');
  const avgCycleDisplay = document.getElementById('avgCycleDisplay');
  const weightTable = document.getElementById('weightTable');

  // ✅ 로그인 이벤트
  if (loginBtn) {
    loginBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await setPersistence(auth, browserLocalPersistence);
        const res = await signInWithPopup(auth, provider);
        currentUser = res.user;
        showToast("✅ 로그인 성공!");
      } catch (error) {
        console.error(error.message);
        showToast("❌ 로그인 실패: " + error.message);
      }
    });
  }

  // ✅ 로그아웃 이벤트
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await signOut(auth);
      showToast("로그아웃 완료!");
    });
  }

  // ✅ 평균 주기 자동 계산
  function calcAvgCycle() {
    if (!prevPeriodStartInput || !periodStartInput) return;
    
    const prev = new Date(prevPeriodStartInput.value);
    const last = new Date(periodStartInput.value);
    if (!isNaN(prev) && !isNaN(last)) {
      const diff = Math.round((last - prev) / (1000 * 60 * 60 * 24));
      if (diff > 15 && diff < 60) {
        if (cycleLengthInput) cycleLengthInput.value = diff;
        if (avgCycleDisplay) avgCycleDisplay.textContent = diff;
      }
    }
  }

  if (prevPeriodStartInput) prevPeriodStartInput.addEventListener('change', calcAvgCycle);
  if (periodStartInput) periodStartInput.addEventListener('change', calcAvgCycle);

  // ✅ 설정 저장
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', async () => {
      if (!currentUser) return showToast("로그인이 필요합니다.");
      
      const start = periodStartInput?.value;
      const prevStart = prevPeriodStartInput?.value;
      const cycleLength = parseInt(cycleLengthInput?.value || 28);
      const menstrualLength = parseInt(menstrualLengthInput?.value || 5);
      goalWeight = parseFloat(goalWeightInput?.value || 60);
      
      if (!start || !cycleLength || !menstrualLength) return showToast("모든 항목 입력!");
      
      try {
        const ref = doc(db, "userData", currentUser.uid);
        await setDoc(ref, {
          periodStart: start,
          prevPeriodStart: prevStart,
          cycleLength,
          menstrualLength,
          goalWeight
        });
        
        showToast("✅ 설정 저장 완료!");
        generatePlan(start, cycleLength, menstrualLength);
        renderPlanTable();
        if (goalWeightDisplay) goalWeightDisplay.textContent = goalWeight;
      } catch (error) {
        console.error("설정 저장 오류:", error);
        showToast("❌ 설정 저장 실패");
      }
    });
  }

  // ✅ 체중 기록 추가
  if (addWeightBtn) {
    addWeightBtn.addEventListener('click', () => {
      const date = dateInput?.value;
      const weight = parseFloat(weightInput?.value);
      if (!date || !weight) return showToast("날짜와 체중 입력");
      
      weightRecords.push({ date, weight });
      weightRecords.sort((a, b) => new Date(a.date) - new Date(b.date));
      renderWeight();
      if (weightInput) weightInput.value = '';
    });
  }

  // ✅ 체중 테이블 렌더링
  function renderWeight() {
    if (!weightTable) return;
    
    weightTable.innerHTML = '';
    weightRecords.forEach(r => {
      const row = document.createElement('tr');
      row.innerHTML = `<td>${r.date}</td><td>${r.weight}</td>`;
      weightTable.appendChild(row);
    });
    
    if (weightRecords.length > 0) {
      const current = weightRecords[weightRecords.length - 1].weight;
      if (currentWeightDisplay) currentWeightDisplay.textContent = current;
      if (remainingWeightDisplay) remainingWeightDisplay.textContent = (current - goalWeight).toFixed(1);
    }
  }

  // ✅ 로그인 상태 감지
  onAuthStateChanged(auth, async (user) => {
  console.log('로그인 상태 변경:', user ? '로그인됨' : '로그아웃됨');
  
  const loginBtn = document.getElementById('loginBtn');
  const userSection = document.getElementById('userSection');
  const userInfo = document.getElementById('userInfo');
  
  if (user) {
    currentUser = user;
    console.log('사용자 정보:', currentUser.displayName);
    
    if (userInfo) userInfo.textContent = `정보: ${currentUser.displayName}`;
    if (loginBtn) {
      loginBtn.style.display = 'none';
      console.log('로그인 버튼 숨김');
    }
    if (userSection) {
      userSection.style.display = 'block';
      console.log('사용자 섹션 표시');
    }
    
    // 데이터 로드 함수들이 있다면 여기서 호출
    // await loadSettings();
    // await loadWeights();
    // await loadSettingsHistory();
    
  } else {
    currentUser = null;
    console.log('로그아웃 상태');
    
    if (loginBtn) {
      loginBtn.style.display = 'block';
      console.log('로그인 버튼 표시');
    }
    if (userSection) {
      userSection.style.display = 'none';
      console.log('사용자 섹션 숨김');
    }
    if (userInfo) userInfo.textContent = '';
  }
});

  // ✅ 초기 플랜 생성
  generatePlan(null, 28, 5);
  renderPlanTable();
  
  // ✅ 강제로 첫 번째 탭 활성화
  setTimeout(() => {
    switchTab('guide');
  }, 100);
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
    if (phaseDay < menstrual) phase = '월경기';
    else if (phaseDay < 14) phase = '여포기';
    else if (phaseDay === 14) phase = '배란기';
    else phase = '황체기';
    
    let cardio = "경사6%, 속도4.5, 30분";
    let home = "IMPT 루틴";
    if (phase === '월경기') { cardio = "가볍게 걷기 20분"; home = "스트레칭"; }
    if (phase === '배란기') { cardio = "속도5.0, 35분"; home = "IMPT + 코어"; }
    
    planData.push({
      day: i + 1,
      date: `${day.getMonth() + 1}/${day.getDate()} (${['일','월','화','수','목','금','토'][weekday]})`,
      phase, cardio, home, morningDone: false, eveningDone: false
    });
  }
}

// ✅ 플랜 테이블 렌더링
function renderPlanTable() {
  const tbody = document.getElementById('planTable');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  planData.forEach((p) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${p.day}</td>
      <td>${p.date}</td>
      <td>${p.phase}</td>
      <td>${p.cardio}</td>
      <td>${p.home}</td>
      <td><input type="checkbox" ${p.morningDone ? 'checked' : ''}></td>
      <td><input type="checkbox" ${p.eveningDone ? 'checked' : ''}></td>
    `;
    const checkboxes = row.querySelectorAll('input[type="checkbox"]');
    const am = checkboxes[0];
    const pm = checkboxes[1];
    if (am) am.addEventListener('change', () => { p.morningDone = am.checked; updateProgress(); });
    if (pm) pm.addEventListener('change', () => { p.eveningDone = pm.checked; updateProgress(); });
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
