// Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebase Config
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

// DOM
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userInfo = document.getElementById('userInfo');
const planTable = document.getElementById('planTable');
const weightList = document.getElementById('weightList');
const weightTable = document.getElementById('weightTable');
let currentUser = null;

// Tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// 로그인
loginBtn.onclick = async () => {
  try {
    const res = await signInWithPopup(auth, provider);
    currentUser = res.user;
    userInfo.textContent = `로그인: ${currentUser.displayName}`;
    loginBtn.style.display = 'none';
    logoutBtn.style.display = 'inline';
    loadPlan();
    loadWeights();
  } catch (e) { console.error(e); }
};

logoutBtn.onclick = async () => {
  await signOut(auth);
  currentUser = null;
  userInfo.textContent = '';
  loginBtn.style.display = 'inline';
  logoutBtn.style.display = 'none';
  planTable.innerHTML = '';
  weightList.innerHTML = '';
  weightTable.innerHTML = '';
  chart.data.labels = [];
  chart.data.datasets[0].data = [];
  chart.update();
};

// ✅ 84일 플랜 생성
const planData = [];
const startDate = new Date("2024-07-22");
for (let i = 0; i < 84; i++) {
  const d = new Date(startDate);
  d.setDate(d.getDate() + i);
  const dateStr = `${d.getMonth() + 1}/${d.getDate()} (${['일', '월', '화', '수', '목', '금', '토'][d.getDay()]})`;
  planData.push({
    day: i + 1,
    date: dateStr,
    cycle: "다이어트",
    morning: "경사6%, 속도4.5, 30분",
    evening: "IMPT 루틴",
    link: "https://www.youtube.com/watch?v=wmSz8C44ldo"
  });
}

// ✅ 플랜 렌더링
async function loadPlan() {
  planTable.innerHTML = '';
  const userDoc = doc(db, "plans", currentUser.uid);
  const snap = await getDoc(userDoc);
  let doneData = snap.exists() ? snap.data().done : [];
  planData.forEach(item => {
    const checked = doneData.includes(item.day) ? "checked" : "";
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.day}</td>
      <td>${item.date}</td>
      <td>${item.cycle}</td>
      <td>${item.morning}</td>
      <td><a href="${item.link}" target="_blank">${item.evening}</a></td>
      <td><input type="checkbox" ${checked} data-day="${item.day}"></td>`;
    planTable.appendChild(tr);
  });
  planTable.querySelectorAll('input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', async () => {
      const checkedDays = [...planTable.querySelectorAll('input:checked')].map(c => parseInt(c.dataset.day));
      await setDoc(userDoc, { done: checkedDays });
    });
  });
}

// ✅ 체중 기록 기능
document.getElementById('addWeightBtn').onclick = async () => {
  const date = document.getElementById('dateInput').value;
  const weight = parseFloat(document.getElementById('weightInput').value);
  if (!date || isNaN(weight) || !currentUser) return alert("입력 또는 로그인 확인!");
  const ref = doc(db, "weights", currentUser.uid);
  const snap = await getDoc(ref);
  let data = snap.exists() ? snap.data().records : [];
  data.push({ date, weight });
  await setDoc(ref, { records: data });
  renderWeights(data);
};

async function loadWeights() {
  const ref = doc(db, "weights", currentUser.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) renderWeights(snap.data().records);
}

function renderWeights(data) {
  data.sort((a, b) => new Date(a.date) - new Date(b.date));
  weightList.innerHTML = data.map(d => `<div class="list-item">${d.date} - ${d.weight}kg</div>`).join('');
  weightTable.innerHTML = data.map(d => `<tr><td>${d.date}</td><td>${d.weight}</td></tr>`).join('');
  chart.data.labels = data.map(d => d.date);
  chart.data.datasets[0].data = data.map(d => d.weight);
  chart.update();
}

// ✅ Chart.js
const ctx = document.getElementById('weightChart').getContext('2d');
const chart = new Chart(ctx, {
  type: 'line',
  data: { labels: [], datasets: [{ label: '체중 (kg)', data: [], borderColor: '#000' }] },
  options: { responsive: true }
});
