import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebase 설정
const firebaseConfig = { /* 기존 설정 */ };
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Toast
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

// 로그인 유지
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    userInfo.textContent = `로그인: ${currentUser.displayName}`;
    loginBtn.style.display = 'none';
    logoutBtn.style.display = 'inline';
    await loadSettings();
    await loadPlan();
    await loadWeights();
  } else {
    currentUser = null;
    userInfo.textContent = '';
    loginBtn.style.display = 'inline';
    logoutBtn.style.display = 'none';
  }
});

// ✅ 설정 저장
saveSettingsBtn.onclick = async () => {
  if (!currentUser) return showToast("로그인이 필요합니다.");
  const start = periodStartInput.value;
  const cycleLength = parseInt(cycleLengthInput.value);
  const menstrualLength = parseInt(menstrualLengthInput.value);
  goalWeight = parseFloat(goalWeightInput.value);
  if (!start || !cycleLength || !menstrualLength || isNaN(goalWeight)) return showToast("모든 항목 입력!");

  const ref = doc(db, "userData", currentUser.uid);
  await setDoc(ref, { periodStart: start, cycleLength, menstrualLength, goalWeight });
  showToast("✅ 설정 저장 완료!");
  generatePlan(start, cycleLength, menstrualLength);
  renderPlanTable();
  goalWeightDisplay.textContent = goalWeight;
};

// ✅ 체크박스 저장 시 Toast
planTable.addEventListener('change', () => {
  if (currentUser) showToast("체크사항이 저장되었습니다.");
});

// ✅ 체중 기록 시 Toast
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
  showToast("✅ 체중 기록이 추가되었습니다.");
};
