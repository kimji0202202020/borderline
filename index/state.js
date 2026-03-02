export const state = {
    currentUser: null,
    projects: [],
    currentProjectId: null,
    autoSaveTimer: null,
    isSaving: false,
    isComposing: false, // 한글 입력 중인지 체크
    zoomLevel: 1.0,
    sidebarUpdateTimer: null,
    isGuest: false, // 게스트 모드 여부
    theme: localStorage.getItem('borderline-theme') || 'light' // 테마 설정
};