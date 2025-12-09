import { $, $$ } from "./utils.js";
import { state } from "./state.js";

const elementTypes = {
    'scene-heading': { class: 'scene-heading', placeholder: '예: S#1. 카페 - 낮' },
    'action': { class: 'action', placeholder: '행동이나 지문을 입력하세요' },
    'character': { class: 'character', placeholder: '인물 이름' },
    'dialogue': { class: 'dialogue', placeholder: '대사를 입력하세요' },
    'parenthetical': { class: 'parenthetical', placeholder: '(놀라며)' }
};

export function setupEditor(editorElement, onAutoSave, onSidebarUpdate) {
    
    // 요소 생성 헬퍼
    const createNewElement = (type, content = '<br>') => {
        const div = document.createElement('div');
        const config = elementTypes[type];
        div.className = `element ${config.class}`;
        div.dataset.type = type;
        div.dataset.placeholder = config.placeholder;
        div.innerHTML = content;
        return div;
    };

    // 현재 선택된 요소 찾기
    const getActiveElement = () => {
        const selection = window.getSelection();
        if (!selection.rangeCount) return null;
        let node = selection.anchorNode;
        if (!editorElement.contains(node)) return null;
        return node.nodeType === Node.TEXT_NODE ? node.parentElement.closest('.element') : node.closest('.element');
    };

    // 포커스 이동
    const setCaret = (element) => {
        const range = document.createRange();
        const sel = window.getSelection();
        if (!element.hasChildNodes() || element.innerHTML === '<br>') element.innerHTML = '\u200B';
        range.selectNodeContents(element);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
        element.focus();
    };

    // 엔터키 로직
    const handleEnter = (e) => {
        e.preventDefault();
        const current = getActiveElement();
        if (!current) return;
        const currentType = current.dataset.type;

        // Shift + Enter: 같은 타입 줄바꿈
        if (e.shiftKey) {
            const newEl = createNewElement(currentType, '');
            current.after(newEl);
            setCaret(newEl);
            onAutoSave();
            return;
        }

        // Enter: 다음 추천 타입으로
        const nextTypeMap = {
            'scene-heading': 'action',
            'action': 'character',
            'character': 'dialogue',
            'dialogue': 'character',
            'parenthetical': 'dialogue'
        };
        const nextType = nextTypeMap[currentType] || 'action';
        const newEl = createNewElement(nextType, '');
        current.after(newEl);
        setCaret(newEl);
        onSidebarUpdate();
        onAutoSave();
    };

    // 탭키 로직
    const handleTab = (e) => {
        e.preventDefault();
        const current = getActiveElement();
        if (!current) return;
        
        const types = Object.keys(elementTypes);
        const idx = types.indexOf(current.dataset.type);
        const nextType = types[(idx + 1) % types.length];
        
        current.className = `element ${elementTypes[nextType].class}`;
        current.dataset.type = nextType;
        current.dataset.placeholder = elementTypes[nextType].placeholder;
        
        // 포맷 버튼 UI 업데이트
        updateActiveFormatButton(nextType);
        onAutoSave();
    };

    // 포맷 버튼 UI 연동
    const updateActiveFormatButton = (type) => {
        $$('.format-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === type);
        });
    };

    // 이벤트 리스너 등록
    editorElement.addEventListener('keydown', (e) => {
        if (e.isComposing) return;
        if (e.key === 'Enter') handleEnter(e);
        if (e.key === 'Tab') handleTab(e);
        
        // 단축키 (Ctrl+1~5)
        if (e.ctrlKey || e.metaKey) {
            const keyMap = {'1':'scene-heading', '2':'action', '3':'character', '4':'dialogue', '5':'parenthetical'};
            if (keyMap[e.key]) {
                e.preventDefault();
                const current = getActiveElement();
                if(current) {
                    current.className = `element ${elementTypes[keyMap[e.key]].class}`;
                    current.dataset.type = keyMap[e.key];
                    onAutoSave();
                }
            }
        }
    });

    editorElement.addEventListener('click', () => {
        const current = getActiveElement();
        if(current) updateActiveFormatButton(current.dataset.type);
    });

    editorElement.addEventListener('input', () => {
        if (state.isComposing) return;
        if (editorElement.children.length === 0) {
            editorElement.appendChild(createNewElement('action'));
        }
        onAutoSave();
    });

    return { createNewElement };
}