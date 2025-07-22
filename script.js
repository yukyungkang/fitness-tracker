import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, query, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ✅ Firebase 설정
const firebaseConfig = {
  apiKey: "YOUR_API_KEY", // 🔒 실제 값 입력
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

// ✅ Toast 함수
const toastContainer = document.getElementById('toastContainer');
function showToast(msg) {
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

// ✅ Tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

let currentUser = null;
let planData = [];
let goalWeight = 60;
let weightRecords = [];

// ✅ 로그인
loginBtn.onclick = async (e) => {
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
};

logoutBtn.onclick = async () => {
  await signOut(auth);
  showToast("로그아웃 완료!");
};

// ✅ 로그인 유지
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
};

// ✅ 평균 주기 자동 계산
const prevPeriodStartInput = document.getElementById('prevPeriodStart');
const periodStartInput = document.getElementById('periodStart');
const cycleLengthInput = document.getElementById('cycleLength');
const menstrualLengthInput = document.getElementById('menstrualLength');
const goalWeightInput = document.getElementById('goalWeight');
const avgCycleDisplay = document.getElementById('avgCycleDisplay');
prevPeriodStartInput.addEventListener('change', calcAvgCycle);
periodStartInput.addEventListener('change', calcAvgCycle);

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

// ✅ 설정 저장
saveSettingsBtn.onclick = async () => {
  if (!currentUser) return showToast("로그인이 필요합니다.");
  const start = periodStartInput.value;
  const prevStart = prevPeriodStartInput.value;
  const cycleLength = parseInt(cycleLengthInput.value);
  const menstrualLength = parseInt(menstrualLengthInput.value);
  goalWeight = parseFloat(goalWeightInput.value);

  if (!start || !cycleLength || !menstrualLength) return showToast("모든 항목 입력!");

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
};

// ✅ 설정 불러오기
async function loadSettings() {
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
}

// ✅ 설정 히스토리
async function loadSettingsHistory() {
  const q = query(collection(db, "settingsHistory"), where("uid", "==", currentUser.uid), orderBy("savedAt", "desc"), limit(5));
  const querySnapshot = await getDocs(q);
  let html = '';
  querySnapshot.forEach(docSnap => {
    const d = docSnap.data();
    html += `<div>${d.savedAt.slice(0, 10)} | 이전: ${d.prevPeriodStart} | 마지막: ${d.periodStart} | 주기: ${d.cycleLength}일</div>`;
  });
  document.getElementById('settingsHistoryList').innerHTML = html;
}

// ✅ 플랜 생성
function generatePlan(startDateStr, cycle, menstrual) {
  planData = [];
  let startDate = startDateStr ? new Date(startDateStr) : new Date();
  const today = new Date();
  for (let i = 0; i < 90; i++) {
    const day = new Date(today);
    day.setDate(today.getDate() + i);
    const weekday = day.getDay();
    if (weekday === 0 || weekday === 6) continue; // ✅ 주말 휴식

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
  tbody.innerHTML = '';
  planData.forEach((p, idx) => {
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
    const [ , , , , , am, pm ] = row.querySelectorAll('input');
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
  document.getElementById('progressFill').style.width = percent + '%';
  document.getElementById('progressText').textContent = percent + '%';
}

// ✅ 체중 기록
const weightTable = document.getElementById('weightTable');
const addWeightBtn = document.getElementById('addWeightBtn');
addWeightBtn.onclick = async () => {
  const date = dateInput.value;
  const weight = parseFloat(weightInput.value);
  if (!date || !weight) return showToast("날짜와 체중 입력");
  weightRecords.push({ date, weight });
  weightRecords.sort((a, b) => new Date(a.date) - new Date(b.date));
  renderWeight();
  weightInput.value = '';
};

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

// ✅ Chart.js
function drawWeightChart() {
  const ctx = document.getElementById('weightChart').getContext('2d');
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
    }
  });
}

