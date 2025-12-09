import { $, $$ } from "./utils.js";
import { state } from "./state.js";

// 로그인/로그아웃 UI 전환
export function toggleLoginUI(isLoggedIn, user = null) {
    const loginContainer = $('#login-container');
    const appContainer = $('#app-container');
    const userPhoto = $('#user-photo');
    const userName = $('#user-name');

    if (isLoggedIn) {
        loginContainer.style.display = 'none';
        appContainer.style.display = 'flex';
        userPhoto.src = user.photoURL || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="16" fill="%2364748b"/></svg>';
        userName.textContent = user.displayName;
    } else {
        loginContainer.style.display = 'flex';
        appContainer.style.display = 'none';
    }
}

// 프로젝트 목록 렌더링
export function renderProjectList(onProjectSelect, onDeleteProject) {
    const listContainer = $('#project-list');
    listContainer.innerHTML = '';

    state.projects.forEach(p => {
        const item = document.createElement('div');
        item.className = 'project-item';
        item.classList.toggle('active', p.id === state.currentProjectId);
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = p.name;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-project-btn';
        deleteBtn.innerHTML = '&times;';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            onDeleteProject(p.id, p.name);
        };
        
        item.onclick = () => onProjectSelect(p.id);
        
        item.appendChild(nameSpan);
        item.appendChild(deleteBtn);
        listContainer.appendChild(item);
    });
}

// 사이드바 (장면/인물) 업데이트
export function updateSidebars(editor) {
    // 장면 목록
    const sceneList = $('#scene-list');
    const scenes = editor.querySelectorAll('.scene-heading');
    sceneList.innerHTML = scenes.length ? '' : '<div class="empty-list-message">장면 없음</div>';
    
    scenes.forEach((el, index) => {
        const item = document.createElement('div');
        item.className = 'scene-item';
        item.textContent = `${index + 1}. ${el.textContent.trim() || '제목 없음'}`;
        item.onclick = () => el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        sceneList.appendChild(item);
    });

    // 인물 목록
    const charList = $('#character-list');
    const chars = [...new Set(Array.from(editor.querySelectorAll('.character')).map(el => el.textContent.trim()).filter(Boolean))];
    charList.innerHTML = chars.length ? '' : '<div class="empty-list-message">등장인물 없음</div>';
    
    chars.sort().forEach(name => {
        const item = document.createElement('div');
        item.className = 'character-item';
        item.textContent = name;
        charList.appendChild(item);
    });
}

// 저장 상태 표시
export function updateSaveStatus(status) {
    const el = $('#save-status');
    const text = $('#save-status span');
    
    if (status === 'saving') {
        el.className = 'save-status saving';
        text.textContent = '저장 중...';
    } else if (status === 'saved') {
        el.className = 'save-status saved';
        text.textContent = '저장됨';
        setTimeout(() => el.classList.remove('saved'), 2000);
    } else if (status === 'error') {
        text.textContent = '저장 실패';
    }
}