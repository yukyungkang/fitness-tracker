import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, query, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ✅ Firebase 설정
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
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

// ✅ DOM Elements
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userInfo = document.getElementById('userInfo');
const planTable = document.getElementById('planTable');
const weightList = document.getElementById('weightList');
const weightTable = document.getElementById('weightTable');
const toastContainer = document.getElementById('toastContainer');

// ✅ Toast 함수
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

// ✅ 로그인 (지속성 적용)
loginBtn.onclick = async () => {
  try {
    await setPersistence(auth, browserLocalPersistence);
    const res = await signInWithPopup(auth, provider);
    currentUser = res.user;
    showToast("✅ 로그인 성공!");
  } catch (e) {
    console.error(e);
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
    await loadPlan();
    await loadWeights();
    await loadSettingsHistory();
  } else {
    currentUser = null;
    userInfo.textContent = '';
    loginBtn.style.display = 'inline';
    logoutBtn.style.display = 'none';
  }
});

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
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
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

  // 설정 히스토리 저장
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
  } else {
    generatePlan(null, 28, 5);
  }
}

// ✅ 설정 히스토리 불러오기
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

// ✅ 플랜 생성 (주말 휴식 적용)
function generatePlan(periodStart, cycleLength, menstrualLength) {
  planData = [];
  const startDate = new Date();
  const pattern = [
    { phase: "월경기", days: menstrualLength, morning: "경사3%, 속도4, 20분", evening: "스트레칭 / 요가" },
    { phase: "여포기", days: 8, morning: "경사6%, 속도4.5, 30분", evening: "IMPT 루틴" },
    { phase: "배란기", days: 2, morning: "경사8%, 속도5, 35분", evening: "IMPT + 코어 루틴" },
    { phase: "황체기", days: cycleLength - (menstrualLength + 8 + 2), morning: "경사5%, 속도4.5, 30분", evening: "IMPT 루틴" }
  ];

  let cycleIndex = 0, dayCount = 0;
  for (let i = 0; i < 90; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dayName = ['일','월','화','수','목','금','토'][d.getDay()];
    const dateStr = `${d.getMonth() + 1}/${d.getDate()} (${dayName})`;

    if (dayCount >= pattern[cycleIndex].days) {
      cycleIndex = (cycleIndex + 1) % pattern.length;
      dayCount = 0;
    }
    const phase = pattern[cycleIndex];
    let morningPlan = phase.morning;
    let eveningPlan = phase.evening;
    let isRest = false;

    if (d.getDay() === 0 || d.getDay() === 6) { // 주말 휴식
      morningPlan = "휴식";
      eveningPlan = "휴식";
      isRest = true;
    }

    planData.push({
      day: i + 1,
      date: dateStr,
      phase: phase.phase,
      morning: morningPlan,
      evening: eveningPlan,
      rest: isRest
    });
    dayCount++;
  }
}

// ✅ 플랜 렌더링
async function loadPlan() {
  const userDoc = doc(db, "plans", currentUser.uid);
  const snap = await getDoc(userDoc);
  let doneData = snap.exists() ? snap.data() : { morning: [], evening: [] };
  renderPlanTable(doneData);
}

function renderPlanTable(doneData = { morning: [], evening: [] }) {
  const progressText = document.getElementById('progressText');
  const progressFill = document.getElementById('progressFill');

  planTable.innerHTML = '';
  planData.forEach(item => {
    const checkedMorning = doneData.morning.includes(item.day) ? "checked" : "";
    const checkedEvening = doneData.evening.includes(item.day) ? "checked" : "";
    const disabled = item.rest ? "disabled" : "";
    planTable.innerHTML += `
      <tr>
        <td>${item.day}</td>
        <td>${item.date}</td>
        <td>${item.phase}</td>
        <td>${item.morning}</td>
        <td>${item.evening}</td>
        <td><input type="checkbox" class="morning" data-day="${item.day}" ${checkedMorning} ${disabled}></td>
        <td><input type="checkbox" class="evening" data-day="${item.day}" ${checkedEvening} ${disabled}></td>
      </tr>`;
  });

  planTable.querySelectorAll('input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', async () => {
      if (!currentUser) return;
      const morningDone = [...planTable.querySelectorAll('input.morning:checked')].map(c => parseInt(c.dataset.day));
      const eveningDone = [...planTable.querySelectorAll('input.evening:checked')].map(c => parseInt(c.dataset.day));
      const userDoc = doc(db, "plans", currentUser.uid);
      await setDoc(userDoc, { morning: morningDone, evening: eveningDone });
      updateWorkoutChart(morningDone.length, eveningDone.length);
      updateProgressBar(morningDone.length + eveningDone.length);
      showToast("체크사항 저장 완료!");
    });
  });
}

// ✅ 체중 기록
document.getElementById('addWeightBtn').onclick = async () => {
  const date = document.getElementById('dateInput').value;
  const weight = parseFloat(document.getElementById('weightInput').value);
  if (!date || isNaN(weight) || !currentUser) return showToast("입력 또는 로그인 확인!");
  const ref = doc(db, "weights", currentUser.uid);
  const snap = await getDoc(ref);
  let data = snap.exists() ? snap.data().records : [];
  data.push({ date, weight });
  await setDoc(ref, { records: data });
  renderWeights(data);
  showToast("✅ 체중 기록 추가 완료!");
};

async function loadWeights() {
  const ref = doc(db, "weights", currentUser.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) renderWeights(snap.data().records);
}

function renderWeights(data) {
  data.sort((a, b) => new Date(a.date) - new Date(b.date));
  weightList.innerHTML = data.map(d => `<div>${d.date} - ${d.weight}kg</div>`).join('');
  weightTable.innerHTML = data.map(d => `<tr><td>${d.date}</td><td>${d.weight}</td></tr>`).join('');
  weightChart.data.labels = data.map(d => d.date);
  weightChart.data.datasets[0].data = data.map(d => d.weight);
  weightChart.update();

  if (data.length > 0) {
    const currentWeight = data[data.length - 1].weight;
    currentWeightDisplay.textContent = currentWeight;
    remainingWeightDisplay.textContent = Math.max(0, currentWeight - goalWeight).toFixed(1);
  }
}

// ✅ 진행률 바
function updateProgressBar(doneCount) {
  const totalTasks = planData.filter(d => !d.rest).length * 2;
  const percent = Math.round((doneCount / totalTasks) * 100);
  document.getElementById('progressFill').style.width = percent + "%";
  document.getElementById('progressText').textContent = percent + "%";
}

// ✅ Chart.js
const weightCtx = document.getElementById('weightChart').getContext('2d');
const workoutCtx = document.getElementById('workoutChart').getContext('2d');
const weightChart = new Chart(weightCtx, {
  type: 'line',
  data: { labels: [], datasets: [{ label: '체중 (kg)', data: [], borderColor: '#000' }] },
  options: { responsive: true }
});
const workoutChart = new Chart(workoutCtx, {
  type: 'bar',
  data: {
    labels: ['아침 완료', '저녁 완료'],
    datasets: [{ data: [0, 0], backgroundColor: ['#333', '#999'] }]
  },
  options: { responsive: true }
});
function updateWorkoutChart(morningCount, eveningCount) {
  workoutChart.data.datasets[0].data = [morningCount, eveningCount];
  workoutChart.update();
}

// ✅ 초기 상태
generatePlan(null, 28, 5);
renderPlanTable();
