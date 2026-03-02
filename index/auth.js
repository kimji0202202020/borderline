import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { state } from "./state.js";
import { $, showToast } from "./utils.js";

let auth;

export function initAuth(app, onLoginSuccess, onLogoutSuccess) {
    auth = getAuth(app);

    // 로그인 상태 변화 감지
    onAuthStateChanged(auth, (user) => {
        if (user) {
            state.currentUser = user;
            onLoginSuccess(user);
        } else {
            state.currentUser = null;
            onLogoutSuccess();
        }
    });

    // 로그인 버튼 이벤트
    const loginBtn = $('#login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            const provider = new GoogleAuthProvider();
            signInWithPopup(auth, provider).catch(error => {
                console.error("Login Error:", error);
                showToast(`로그인 실패: ${error.code}`, 'error');
            });
        });
    }
}