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
  if (!toastContainer) {
    console.error('Toast 컨테이너를 찾을 수 없습니다');
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

// ✅ 탭 전환 함수
function switchTab(tabName) {
  console.log('탭 전환:', tabName);
  
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  document.querySelectorAll('section').forEach(section => {
    section.classList.remove('active');
  });
  
  const selectedTab = document.querySelector(`[data-tab="${tabName}"]`);
  const selectedSection = document.getElementById(tabName);
  
  if (selectedTab) {
    selectedTab.classList.add('active');
    console.log('✅ 탭 활성화:', selectedTab);
  } else {
    console.error('❌ 탭을 찾을 수 없음:', tabName);
  }
  
  if (selectedSection) {
    selectedSection.classList.add('active');
    console.log('✅ 섹션 활성화:', selectedSection);
  } else {
    console.error('❌ 섹션을 찾을 수 없음:', tabName);
  }
}

// ✅ DOM 로드 완료 후 실행
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM 로드 완료');
  
  // ✅ 요소 존재 확인
  const loginBtn = document.getElementById('loginBtn');
  const userSection = document.getElementById('userSection');
  const authSection = document.querySelector('.auth-section');
  const logoutBtn = document.getElementById('logoutBtn');
  const userInfo = document.getElementById('userInfo');
  
  console.log('로그인 버튼:', loginBtn);
  console.log('사용자 섹션:', userSection);
  console.log('인증 섹션:', authSection);
  
  // ✅ 초기 상태 설정
  if (loginBtn) {
    loginBtn.style.display = 'block';
    console.log('로그인 버튼 강제 표시');
  }
  
  if (userSection) {
    userSection.style.display = 'none';
    console.log('사용자 섹션 강제 숨김');
  }
  
  // ✅ 탭 메뉴 이벤트
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
      console.log('🔐 로그인 버튼 클릭됨');
      
      try {
        showToast("🔄 로그인 시도 중...");
        await setPersistence(auth, browserLocalPersistence);
        const res = await signInWithPopup(auth, provider);
        currentUser = res.user;
        console.log('✅ 로그인 성공:', currentUser.displayName);
        showToast("✅ 로그인 성공!");
      } catch (error) {
        console.error('❌ 로그인 오류:', error);
        showToast("❌ 로그인 실패: " + error.message);
      }
    });
  }

  // ✅ 로그아웃 이벤트
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      console.log('🚪 로그아웃 버튼 클릭됨');
      try {
        await signOut(auth);
        showToast("✅ 로그아웃 완료!");
      } catch (error) {
        console.error('❌ 로그아웃 오류:', error);
      }
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

  // ✅ 설정 저장 (디버깅 강화)
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', async () => {
      console.log('💾 설정 저장 버튼 클릭됨');
      
      if (!currentUser) {
        console.log('❌ 사용자 로그인 안됨');
        return showToast("로그인이 필요합니다.");
      }
      
      console.log('👤 현재 사용자:', currentUser.displayName);
      
      const start = periodStartInput?.value;
      const prevStart = prevPeriodStartInput?.value;
      const cycleLength = parseInt(cycleLengthInput?.value || 28);
      const menstrualLength = parseInt(menstrualLengthInput?.value || 5);
      goalWeight = parseFloat(goalWeightInput?.value || 60);
      
      console.log('📝 입력 데이터:', {
        start,
        prevStart,
        cycleLength,
        menstrualLength,
        goalWeight
      });
      
      if (!start || !cycleLength || !menstrualLength) {
        console.log('❌ 필수 항목 누락');
        return showToast("모든 항목 입력!");
      }
      
      try {
        showToast("💾 설정 저장 중...");
        
        // 1. 사용자 설정 저장
        console.log('📤 사용자 설정 저장 시작...');
        const ref = doc(db, "userData", currentUser.uid);
        await setDoc(ref, {
          periodStart: start,
          prevPeriodStart: prevStart,
          cycleLength,
          menstrualLength,
          goalWeight,
          updatedAt: new Date().toISOString()
        });
        console.log('✅ 사용자 설정 저장 완료');
        
        // 2. 설정 히스토리 저장
        console.log('📤 히스토리 저장 시작...');
        const now = new Date();
        const historyData = {
          uid: currentUser.uid,
          userName: currentUser.displayName,
          savedAt: now.toISOString(),
          savedAtKST: now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
          periodStart: start,
          prevPeriodStart: prevStart,
          cycleLength,
          menstrualLength,
        };
        
        const historyId = `${currentUser.uid}_${now.getTime()}`;
        console.log('📝 히스토리 ID:', historyId);
        console.log('📝 히스토리 데이터:', historyData);
        
        const historyRef = doc(db, "settingsHistory", historyId);
        await setDoc(historyRef, historyData);
        console.log('✅ 히스토리 저장 완료');
        
        showToast("✅ 설정 저장 완료!");
        
        // 3. 플랜 재생성
        generatePlan(start, cycleLength, menstrualLength);
        renderPlanTable();
        if (goalWeightDisplay) goalWeightDisplay.textContent = goalWeight;
        
        // 4. 히스토리 다시 로드
        console.log('🔄 히스토리 다시 로드...');
        await loadSettingsHistory();
        
      } catch (error) {
        console.error("❌ 설정 저장 오류:", error);
        showToast("❌ 설정 저장 실패: " + error.message);
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
      saveWeights();
      if (weightInput) weightInput.value = '';
    });
  }

  // ✅ 설정 불러오기
  async function loadSettings() {
    if (!currentUser) return;
    
    try {
      console.log('📥 설정 불러오기 시작...');
      const ref = doc(db, "userData", currentUser.uid);
      const snap = await getDoc(ref);
      
      if (snap.exists()) {
        const data = snap.data();
        console.log('📥 설정 데이터 로드:', data);
        
        if (prevPeriodStartInput) prevPeriodStartInput.value = data.prevPeriodStart || '';
        if (periodStartInput) periodStartInput.value = data.periodStart || '';
        if (cycleLengthInput) cycleLengthInput.value = data.cycleLength || 28;
        if (menstrualLengthInput) menstrualLengthInput.value = data.menstrualLength || 5;
        if (goalWeightInput) goalWeightInput.value = data.goalWeight || 60;
        if (avgCycleDisplay) avgCycleDisplay.textContent = data.cycleLength || 28;
        
        goalWeight = data.goalWeight || 60;
        if (goalWeightDisplay) goalWeightDisplay.textContent = goalWeight;
        
        generatePlan(data.periodStart, data.cycleLength, data.menstrualLength);
        renderPlanTable();
        
        console.log('✅ 설정 불러오기 완료');
      } else {
        console.log('📭 저장된 설정이 없습니다');
        generatePlan(null, 28, 5);
        renderPlanTable();
      }
      
      // 설정 로드 후 히스토리도 로드
      await loadSettingsHistory();
      
    } catch (error) {
      console.error("❌ 설정 불러오기 오류:", error);
      generatePlan(null, 28, 5);
      renderPlanTable();
    }
  }

  // ✅ 설정 히스토리 불러오기 (디버깅 강화)
  async function loadSettingsHistory() {
    if (!currentUser) {
      console.log('❌ 로그인되지 않아 히스토리를 불러올 수 없습니다');
      const historyContainer = document.getElementById('settingsHistoryList');
      if (historyContainer) {
        historyContainer.innerHTML = '<div class="no-login">로그인 후 설정 기록을 확인할 수 있습니다.</div>';
      }
      return;
    }
    
    try {
      console.log('📚 설정 히스토리 로드 시작...');
      console.log('👤 현재 사용자 UID:', currentUser.uid);
      
      const historyCollection = collection(db, "settingsHistory");
      console.log('📁 컬렉션 참조:', historyCollection);
      
      // 단순 쿼리로 변경 (인덱스 문제 방지)
      const allDocs = await getDocs(historyCollection);
      console.log(`📊 전체 문서 개수: ${allDocs.size}`);
      
      let historyList = [];
      allDocs.forEach(docSnap => {
        const data = docSnap.data();
        console.log('📄 문서 데이터:', data);
        
        // 현재 사용자의 문서만 필터링
        if (data.uid === currentUser.uid) {
          historyList.push({
            id: docSnap.id,
            ...data
          });
        }
      });
      
      console.log(`📋 필터링된 히스토리 개수: ${historyList.length}`);
            console.log('📋 히스토리 리스트:', historyList);
      
      // 날짜순 정렬 (최신순)
      historyList.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
      
      // 최근 5개만 표시
      historyList = historyList.slice(0, 5);
      
      // HTML 생성
      let html = '';
      if (historyList.length === 0) {
        html = '<div class="no-history">저장된 설정 기록이 없습니다.</div>';
        console.log('📝 히스토리가 없습니다');
      } else {
        historyList.forEach(item => {
          const date = item.savedAtKST || item.savedAt.slice(0, 10);
          const prevDate = item.prevPeriodStart || '미설정';
          const lastDate = item.periodStart || '미설정';
          const cycle = item.cycleLength || '28';
          
          html += `
            <div class="history-item">
              <div class="history-date">📅 ${date}</div>
              <div class="history-details">
                이전 생리: ${prevDate} | 마지막 생리: ${lastDate} | 주기: ${cycle}일
              </div>
            </div>
          `;
        });
        console.log('📝 히스토리 HTML 생성 완료');
      }
      
      const historyContainer = document.getElementById('settingsHistoryList');
      if (historyContainer) {
        historyContainer.innerHTML = html;
        console.log('✅ 히스토리 HTML 업데이트 완료');
      } else {
        console.error('❌ settingsHistoryList 요소를 찾을 수 없습니다');
      }
      
    } catch (error) {
      console.error("❌ 히스토리 불러오기 오류:", error);
      const historyContainer = document.getElementById('settingsHistoryList');
      if (historyContainer) {
        historyContainer.innerHTML = '<div class="error">히스토리를 불러오는 중 오류가 발생했습니다.</div>';
      }
    }
  }

  // ✅ 체중 데이터 저장
  async function saveWeights() {
    if (!currentUser) return;
    try {
      const ref = doc(db, "weightData", currentUser.uid);
      await setDoc(ref, { records: weightRecords });
    } catch (error) {
      console.error("체중 데이터 저장 오류:", error);
    }
  }

  // ✅ 체중 데이터 불러오기
  async function loadWeights() {
    if (!currentUser) return;
    try {
      const ref = doc(db, "weightData", currentUser.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        weightRecords = snap.data().records || [];
        renderWeight();
      }
    } catch (error) {
      console.error("체중 데이터 불러오기 오류:", error);
    }
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
      drawWeightChart();
    }
  }

  // ✅ 로그인 상태 감지
  onAuthStateChanged(auth, async (user) => {
    console.log('🔄 로그인 상태 변경:', user ? '로그인됨' : '로그아웃됨');
    
    if (user) {
      currentUser = user;
      console.log('✅ 사용자 정보:', currentUser.displayName);
      
      if (userInfo) {
        userInfo.textContent = `정보: ${currentUser.displayName}`;
      }
      
      if (loginBtn) {
        loginBtn.style.display = 'none';
        console.log('🔒 로그인 버튼 숨김');
      }
      
      if (userSection) {
        userSection.style.display = 'block';
        console.log('👤 사용자 섹션 표시');
      }
      
      // 데이터 로드
      await loadSettings();
      await loadWeights();
      
    } else {
      currentUser = null;
      console.log('❌ 로그아웃 상태');
      
      if (loginBtn) {
        loginBtn.style.display = 'block';
        console.log('🔓 로그인 버튼 표시');
      }
      
      if (userSection) {
        userSection.style.display = 'none';
        console.log('🚫 사용자 섹션 숨김');
      }
      
      if (userInfo) {
        userInfo.textContent = '';
      }
      
      // 히스토리 초기화
      await loadSettingsHistory();
    }
  });

  // ✅ 초기 플랜 생성
  generatePlan(null, 28, 5);
  renderPlanTable();
  
  // ✅ 강제로 첫 번째 탭 활성화
  setTimeout(() => {
    switchTab('guide');
  }, 100);
  
  console.log('🎉 DOM 초기화 완료');
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
    if (am) am.addEventListener('change', () => { p.morningDone = am.checked; updateProgress(); savePlanProgress(); });
    if (pm) pm.addEventListener('change', () => { p.eveningDone = pm.checked; updateProgress(); savePlanProgress(); });
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

// ✅ 플랜 진행률 저장
async function savePlanProgress() {
  if (!currentUser) return;
  try {
    const ref = doc(db, "planProgress", currentUser.uid);
    await setDoc(ref, { 
      planData: planData.map(p => ({
        day: p.day,
        morningDone: p.morningDone,
        eveningDone: p.eveningDone
      })),
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("플랜 진행률 저장 오류:", error);
  }
}

// ✅ 플랜 진행률 불러오기
async function loadPlanProgress() {
  if (!currentUser) return;
  try {
    const ref = doc(db, "planProgress", currentUser.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const savedProgress = snap.data().planData || [];
      savedProgress.forEach(saved => {
        const planItem = planData.find(p => p.day === saved.day);
        if (planItem) {
          planItem.morningDone = saved.morningDone;
          planItem.eveningDone = saved.eveningDone;
        }
      });
      renderPlanTable();
    }
  } catch (error) {
    console.error("플랜 진행률 불러오기 오류:", error);
  }
}

// ✅ Chart.js 체중 차트
function drawWeightChart() {
  const ctx = document.getElementById('weightChart');
  if (!ctx) return;
  
  // 기존 차트 삭제
  if (window.weightChartInstance) {
    window.weightChartInstance.destroy();
  }
  
  window.weightChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: weightRecords.map(r => r.date),
      datasets: [{
        label: '체중 (kg)',
        data: weightRecords.map(r => r.weight),
        borderColor: '#27ae60',
        backgroundColor: 'rgba(39, 174, 96, 0.1)',
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: false,
          title: {
            display: true,
            text: '체중 (kg)'
          }
        },
        x: {
          title: {
            display: true,
            text: '날짜'
          }
        }
      },
      plugins: {
        title: {
          display: true,
          text: '체중 변화 추이'
        }
      }
    }
  });
}

// ✅ 운동 완료율 차트
function drawWorkoutChart() {
  const ctx = document.getElementById('workoutChart');
  if (!ctx) return;
  
  // 기존 차트 삭제
  if (window.workoutChartInstance) {
    window.workoutChartInstance.destroy();
  }
  
  const morningDone = planData.filter(p => p.morningDone).length;
  const eveningDone = planData.filter(p => p.eveningDone).length;
  const total = planData.length;
  const notDone = (total * 2) - morningDone - eveningDone;
  
  window.workoutChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['아침 운동 완료', '저녁 운동 완료', '미완료'],
      datasets: [{
        data: [morningDone, eveningDone, notDone],
        backgroundColor: [
          '#3498db',
          '#e74c3c', 
          '#ecf0f1'
        ],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: '운동 완료 현황'
        },
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

// ✅ 통계 탭 클릭 시 차트 업데이트
document.addEventListener('click', function(e) {
  if (e.target.dataset.tab === 'stats') {
    setTimeout(() => {
      drawWeightChart();
      drawWorkoutChart();
    }, 100);
  }
});
