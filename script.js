import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, query, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ✅ Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyBasJig37TExc76J3mlcJ9p5uZLXFrY5CQ", // 실제 Firebase 키 입력
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

// ✅ 전역 변수
let currentUser = null;
let planData = [];
let goalWeight = 60;
let weightRecords = [];

// ✅ Toast 함수
function showToast(msg) {
  const toastContainer = document.getElementById('toastContainer');
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

// ✅ DOMContentLoaded 이벤트로 모든 초기화
document.addEventListener('DOMContentLoaded', function() {
  
  // DOM 요소 참조
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

  // ✅ 탭 메뉴 이벤트
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      console.log('탭 클릭됨:', btn.dataset.tab);
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });

  // ✅ 로그인 이벤트
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

  // ✅ 로그아웃 이벤트
  logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    showToast("로그아웃 완료!");
  });

  // ✅ 평균 주기 자동 계산
  function calcAvgCycle() {
    const prev = new Date(prevPeriodStartInput.value);
    const last = new Date(periodStartInput.value);
    if (!isNaN(prev) && !isNaN(last)) {
      const diff = Math.round((last - prev) / (1000 * 60 * 60 * 24));
      if (diff > 15 && diff < 60) {
        cycleLengthInput.value = diff;
        avgCycleDisplay.textContent = diff;
      }
    }
  }

  prevPeriodStartInput.addEventListener('change', calcAvgCycle);
  periodStartInput.addEventListener('change', calcAvgCycle);

  // ✅ 설정 저장
  saveSettingsBtn.addEventListener('click', async () => {
    if (!currentUser) return showToast("로그인이 필요합니다.");
    
    const start = periodStartInput.value;
    const prevStart = prevPeriodStartInput.value;
    const cycleLength = parseInt(cycleLengthInput.value);
    const menstrualLength = parseInt(menstrualLengthInput.value);
    goalWeight = parseFloat(goalWeightInput.value);
    
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
      
      const historyRef = doc(db, `settingsHistory/${currentUser.uid}_${Date.now()}`);
      await setDoc(historyRef, {
        uid: currentUser.uid,
        savedAt: new Date().toISOString(),
        periodStart: start,
        prevPeriodStart: prevStart,
        cycleLength,
        menstrualLength
      });
      
      showToast("✅ 설정 저장 완료!");
      generatePlan(start, cycleLength, menstrualLength);
      renderPlanTable();
      goalWeightDisplay.textContent = goalWeight;
      await loadSettingsHistory();
    } catch (error) {
      console.error("설정 저장 오류:", error);
      showToast("❌ 설정 저장 실패");
    }
  });

  // ✅ 체중 기록 추가
  addWeightBtn.addEventListener('click', () => {
    const date = dateInput.value;
    const weight = parseFloat(weightInput.value);
    if (!date || !weight) return showToast("날짜와 체중 입력");
    
    weightRecords.push({ date, weight });
    weightRecords.sort((a, b) => new Date(a.date) - new Date(b.date));
    renderWeight();
    saveWeights();
    weightInput.value = '';
  });

  // ✅ 설정 불러오기
  async function loadSettings() {
    if (!currentUser) return;
    try {
      const ref = doc(db, "userData", currentUser.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        prevPeriodStartInput.value = data.prevPeriodStart || '';
        periodStartInput.value = data.periodStart || '';
        cycleLengthInput.value = data.cycleLength || 28;
        menstrualLengthInput.value = data.menstrualLength || 5;
        goalWeightInput.value = data.goalWeight || 60;
        avgCycleDisplay.textContent = data.cycleLength || 28;
        goalWeight = data.goalWeight || 60;
        goalWeightDisplay.textContent = goalWeight;
        generatePlan(data.periodStart, data.cycleLength, data.menstrualLength);
        renderPlanTable();
      } else {
        generatePlan(null, 28, 5);
        renderPlanTable();
      }
    } catch (error) {
      console.error("설정 불러오기 오류:", error);
    }
  }

  // ✅ 설정 히스토리 불러오기
  async function loadSettingsHistory() {
    if (!currentUser) return;
    try {
      const q = query(
        collection(db, "settingsHistory"), 
        where("uid", "==", currentUser.uid), 
        orderBy("savedAt", "desc"), 
        limit(5)
      );
      const querySnapshot = await getDocs(q);
      let html = '';
      querySnapshot.forEach(docSnap => {
        const d = docSnap.data();
        html += `<div>${d.savedAt.slice(0, 10)} | 이전: ${d.prevPeriodStart} | 마지막: ${d.periodStart} | 주기: ${d.cycleLength}일</div>`;
      });
      document.getElementById('settingsHistoryList').innerHTML = html;
    } catch (error) {
      console.error("히스토리 불러오기 오류:", error);
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
    weightTable.innerHTML = '';
    weightRecords.forEach(r => {
      const row = document.createElement('tr');
      row.innerHTML = `<td>${r.date}</td><td>${r.weight}</td>`;
      weightTable.appendChild(row);
    });
    
    if (weightRecords.length > 0) {
      const current = weightRecords[weightRecords.length - 1].weight;
      currentWeightDisplay.textContent = current;
      remainingWeightDisplay.textContent = (current - goalWeight).toFixed(1);
      drawWeightChart();
    }
  }

  // ✅ 로그인 상태 감지
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      userInfo.textContent = `로그인: ${currentUser.displayName}`;
      loginBtn.style.display = 'none';
      logoutBtn.style.display = 'inline';
      await loadSettings();
      await loadWeights();
      await loadSettingsHistory();
    } else {
      currentUser = null;
      userInfo.textContent = '';
      loginBtn.style.display = 'inline';
      logoutBtn.style.display = 'none';
    }
  });

  // ✅ 초기 플랜 생성
  generatePlan(null, 28, 5);
  renderPlanTable();
});

// ✅ 플랜 생성 (전역 함수)
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
    am.addEventListener('change', () => { p.morningDone = am.checked; updateProgress(); });
    pm.addEventListener('change', () => { p.eveningDone = pm.checked; updateProgress(); });
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

// ✅ Chart.js 체중 차트
function drawWeightChart() {
  const ctx = document.getElementById('weightChart');
  if (!ctx) return;
  
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: weightRecords.map(r => r.date),
      datasets: [{
        label: '체중 (kg)',
        data: weightRecords.map(r => r.weight),
        borderColor: '#27ae60',
        fill: false
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: false
        }
      }
    }
  });
}
