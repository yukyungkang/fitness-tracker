import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, query, where, orderBy, limit, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
  }
  
  if (selectedSection) {
    selectedSection.classList.add('active');
    console.log('✅ 섹션 활성화:', selectedSection);
    
    // 통계 탭일 때 차트 그리기
    if (tabName === 'stats') {
      console.log('📊 통계 탭 활성화 - 차트 그리기 시작');
      setTimeout(() => {
        drawWeightChart();
        drawWorkoutChart();
      }, 200);
    }
  }
}

// ✅ DOM 로드 완료 후 실행
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM 로드 완료');
  
  // ✅ 요소 존재 확인
  const loginBtn = document.getElementById('loginBtn');
  const userSection = document.getElementById('userSection');
  const logoutBtn = document.getElementById('logoutBtn');
  const userInfo = document.getElementById('userInfo');
  
  console.log('로그인 버튼:', loginBtn);
  console.log('사용자 섹션:', userSection);
  console.log('인증 섹션:', document.querySelector('.auth-section'));
  
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

  // ✅ 설정 저장
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
          timestamp: now.getTime()
        };
        
        console.log('📝 히스토리 데이터:', historyData);
        
        const historyRef = collection(db, "settingsHistory");
        await addDoc(historyRef, historyData);
        console.log('✅ 히스토리 저장 완료');
        
        showToast("✅ 설정 저장 완료!");
        
        // 3. 플랜 재생성
        generatePlan(start, cycleLength, menstrualLength);
        renderPlanTable();
        if (goalWeightDisplay) goalWeightDisplay.textContent = goalWeight;
        
        // 4. 히스토리 다시 로드
        setTimeout(async () => {
          console.log('🔄 히스토리 다시 로드...');
          await loadSettingsHistory();
        }, 1000);
        
      } catch (error) {
        console.error("❌ 설정 저장 오류:", error);
        showToast("❌ 설정 저장 실패: " + error.message);
      }
    });
  }

  // ✅ 체중 기록 추가
  if (addWeightBtn) {
    addWeightBtn.addEventListener('click', async () => {
      const date = dateInput?.value;
      const weight = parseFloat(weightInput?.value);
      if (!date || !weight) return showToast("날짜와 체중 입력");
      
      weightRecords.push({ date, weight });
      weightRecords.sort((a, b) => new Date(a.date) - new Date(b.date));
      renderWeight();
      await saveWeights();
      if (weightInput) weightInput.value = '';
      showToast("✅ 체중 기록 추가됨");
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
      
      await loadSettingsHistory();
      
    } catch (error) {
      console.error("❌ 설정 불러오기 오류:", error);
      generatePlan(null, 28, 5);
      renderPlanTable();
    }
  }

  // ✅ 설정 히스토리 불러오기
  async function loadSettingsHistory() {
    const historyContainer = document.getElementById('settingsHistoryList');
    
    if (!currentUser) {
      console.log('❌ 로그인되지 않아 히스토리를 불러올 수 없습니다');
      if (historyContainer) {
        historyContainer.innerHTML = '<div class="no-login">로그인 후 설정 기록을 확인할 수 있습니다.</div>';
      }
      return;
    }
    
    try {
      console.log('📚 설정 히스토리 로드 시작...');
      console.log('👤 현재 사용자 UID:', currentUser.uid);
      
      const historyCollection = collection(db, "settingsHistory");
      const querySnapshot = await getDocs(historyCollection);
      
      console.log(`📊 전체 문서 개수: ${querySnapshot.size}`);
      
      let historyList = [];
      querySnapshot.forEach(docSnap => {
        const data = docSnap.data();
        console.log('📄 문서:', docSnap.id, data);
        
        if (data.uid === currentUser.uid) {
          historyList.push({
            id: docSnap.id,
            ...data
          });
        }
      });
      
      console.log(`📋 필터링된 히스토리 개수: ${historyList.length}`);
      console.log('📋 히스토리 리스트:', historyList);
      
      historyList.sort((a, b) => {
        const timeA = a.timestamp || new Date(a.savedAt).getTime();
        const timeB = b.timestamp || new Date(b.savedAt).getTime();
        return timeB - timeA;
      });
      
      historyList = historyList.slice(0, 5);
      
      let html = '';
      if (historyList.length === 0) {
        html = '<div class="no-history">저장된 설정 기록이 없습니다. 설정을 저장해보세요!</div>';
        console.log('📝 히스토리가 없습니다');
      } else {
        historyList.forEach((item, index) => {
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
        console.log(`📝 히스토리 HTML 생성 완료 (${historyList.length}개)`);
      }
      
      if (historyContainer) {
        historyContainer.innerHTML = html;
        console.log('✅ 히스토리 HTML 업데이트 완료');
      } else {
        console.error('❌ settingsHistoryList 요소를 찾을 수 없습니다');
      }
      
    } catch (error) {
      console.error("❌ 히스토리 불러오기 오류:", error);
      if (historyContainer) {
        historyContainer.innerHTML = '<div class="error">히스토리를 불러오는 중 오류가 발생했습니다: ' + error.message + '</div>';
      }
    }
  }

  // ✅ 체중 데이터 저장
  async function saveWeights() {
    if (!currentUser) return;
    try {
      const ref = doc(db, "weightData", currentUser.uid);
      await setDoc(ref, { 
        records: weightRecords,
        updatedAt: new Date().toISOString()
      });
      console.log('💾 체중 데이터 저장 완료');
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
        console.log('📥 체중 데이터 로드 완료:', weightRecords.length, '개');
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
      row.innerHTML = `<td>${r.date}</td><td>${r.weight}kg</td>`;
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
  
  // 현재 통계 탭이 활성화되어 있으면 차트 업데이트
  const statsSection = document.getElementById('stats');
  if (statsSection && statsSection.classList.contains('active')) {
    console.log('📊 진행률 업데이트로 인한 차트 재그리기');
    setTimeout(() => {
      drawWorkoutChart();
    }, 100);
  }
}

// ✅ Chart.js 체중 차트
function drawWeightChart() {
  console.log('📊 체중 차트 그리기 시작...');
  
  const ctx = document.getElementById('weightChart');
  if (!ctx) {
    console.log('❌ weightChart 요소를 찾을 수 없습니다');
    return;
  }
  
  console.log('📊 체중 데이터:', weightRecords);
  
  // 기존 차트 삭제
  if (window.weightChartInstance) {
    window.weightChartInstance.destroy();
  }
  
  if (weightRecords.length === 0) {
    console.log('📊 체중 데이터가 없어서 빈 차트를 그립니다');
    
    // 빈 차트 그리기
    window.weightChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['데이터 없음'],
        datasets: [{
          label: '체중 (kg)',
          data: [],
          borderColor: '#27ae60',
          backgroundColor: 'rgba(39, 174, 96, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
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
            text: '체중 변화 추이 (데이터를 추가해주세요)'
          }
        }
      }
    });
    
    console.log('✅ 빈 체중 차트 그리기 완료');
    return;
  }
  
  // 실제 데이터로 차트 그리기
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
      maintainAspectRatio: false,
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
  
  console.log('✅ 체중 차트 그리기 완료');
}

// ✅ 운동 완료율 차트
function drawWorkoutChart() {
  console.log('📊 운동 차트 그리기 시작...');
  
  const ctx = document.getElementById('workoutChart');
  if (!ctx) {
    console.log('❌ workoutChart 요소를 찾을 수 없습니다');
    return;
  }
  
  console.log('📊 플랜 데이터:', planData.length, '개');
  
  // 기존 차트 삭제
  if (window.workoutChartInstance) {
    window.workoutChartInstance.destroy();
  }
  
  if (planData.length === 0) {
    console.log('📊 플랜 데이터가 없어서 빈 차트를 그립니다');
    
    // 빈 차트 그리기
    window.workoutChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['데이터 없음'],
        datasets: [{
          data: [1],
          backgroundColor: ['#ecf0f1'],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
                        text: '운동 완료 현황 (플랜을 생성해주세요)'
          },
          legend: {
            position: 'bottom'
          }
        }
      }
    });
    
    console.log('✅ 빈 운동 차트 그리기 완료');
    return;
  }
  
  // 실제 데이터 계산
  const morningDone = planData.filter(p => p.morningDone).length;
  const eveningDone = planData.filter(p => p.eveningDone).length;
  const total = planData.length;
  const notDone = (total * 2) - morningDone - eveningDone;
  
  console.log('📊 운동 데이터:', { 
    morningDone, 
    eveningDone, 
    notDone, 
    total,
    totalExercises: total * 2
  });
  
  // 실제 데이터로 차트 그리기
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
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: `운동 완료 현황 (총 ${total * 2}회 중 ${morningDone + eveningDone}회 완료)`
        },
        legend: {
          position: 'bottom'
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = Math.round((value / total) * 100);
              return `${label}: ${value}회 (${percentage}%)`;
            }
          }
        }
      }
    }
  });
  
  console.log('✅ 운동 차트 그리기 완료');
}
