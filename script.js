// Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebase 설정
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

// DOM 요소
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userInfo = document.getElementById('userInfo');
const planTable = document.getElementById('planTable');

// 로그인
loginBtn.addEventListener('click', async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    userInfo.textContent = `로그인: ${user.displayName}`;
    loginBtn.style.display = 'none';
    logoutBtn.style.display = 'inline';
    loadPlan(user.uid);
    loadWeights(user.uid);
  } catch (err) {
    console.error(err);
  }
});

// 로그아웃
logoutBtn.addEventListener('click', async () => {
  await signOut(auth);
  userInfo.textContent = '';
  loginBtn.style.display = 'inline';
  logoutBtn.style.display = 'none';
  planTable.innerHTML = '';
  weightChart.data.labels = [];
  weightChart.data.datasets[0].data = [];
  weightChart.update();
});

// ✅ 84일 플랜 (샘플 + 실제 84일 데이터 추가 가능)
const planData = [
  { day: 1, date: "7/22 (월)", cycle: "여포기", morning: "경사 6%, 4.5km/h, 30분", evening: "IMPT 루틴", link: "https://www.youtube.com/watch?v=wmSz8C44ldo" },
  { day: 2, date: "7/23 (화)", cycle: "여포기", morning: "경사 6%, 4.5km/h, 30분", evening: "IMPT 루틴", link: "https://www.youtube.com/watch?v=wmSz8C44ldo" }
  // TODO: 나머지 84일 데이터 추가
];

// 플랜 로드
async function loadPlan(uid) {
  planTable.innerHTML = '';
  planData.forEach(item => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${item.day}</td>
      <td>${item.date}</td>
      <td>${item.cycle}</td>
      <td>${item.morning}</td>
      <td><a href="${item.link}" target="_blank">${item.evening}</a></td>
      <td><input type="checkbox" class="done" data-day="${item.day}"></td>
    `;
    planTable.appendChild(row);
  });
}

// ✅ Chart.js
const ctx = document.getElementById('weightChart').getContext('2d');
const weightChart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: [],
    datasets: [{
      label: '체중 (kg)',
      data: [],
      borderColor: '#000',
      backgroundColor: '#333'
    }]
  },
  options: { responsive: true }
});

// ✅ 체중 기록 Firestore 저장
document.getElementById('addWeightBtn').addEventListener('click', async () => {
  const date = document.getElementById('dateInput').value;
  const weight = parseFloat(document.getElementById('weightInput').value);
  if (!date || isNaN(weight)) return;

  const user = auth.currentUser;
  if (!user) return alert("로그인 먼저 하세요!");

  const docRef = doc(db, "weights", user.uid);
  const docSnap = await getDoc(docRef);
  let weightData = docSnap.exists() ? docSnap.data().records : [];
  weightData.push({ date, weight });

  await setDoc(docRef, { records: weightData });
  updateChart(weightData);
});

async function loadWeights(uid) {
  const docRef = doc(db, "weights", uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    updateChart(docSnap.data().records);
  }
}

function updateChart(weightData) {
  weightChart.data.labels = weightData.map(d => d.date);
  weightChart.data.datasets[0].data = weightData.map(d => d.weight);
  weightChart.update();
}
