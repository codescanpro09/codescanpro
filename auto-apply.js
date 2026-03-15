// Auto-apply fixed code functionality

// Extract fixed code from AI response
function extractFixedCode(aiResponse, language) {
    const codeBlockRegex = /```(?:\w+)?\s*([\s\S]*?)```/g;
    const matches = [...aiResponse.matchAll(codeBlockRegex)];

    if (matches.length === 0) return null;

    let fixedCode = null;
    let maxLength = 0;

    for (const match of matches) {
        const code = match[1].trim();
        const beforeMatch = aiResponse.substring(0, match.index).toLowerCase();
        if (beforeMatch.includes('fixed') || beforeMatch.includes('corrected')) {
            return code;
        }
        if (code.length > maxLength) {
            maxLength = code.length;
            fixedCode = code;
        }
    }

    return fixedCode;
}

// Apply fixed code to editor
function applyFixedCode() {
    if (!app.state.fixedCode) {
        alert('No fixed code available');
        return;
    }

    const editor = document.getElementById('code-input');
    editor.value = app.state.fixedCode;

    app.setTab('editor');

    const notification = document.createElement('div');
    notification.className = 'fixed top-20 right-6 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3';
    notification.innerHTML = `
        <i class="fa-solid fa-check-circle text-xl"></i>
        <span class="font-semibold">Fixed code applied to editor!</span>
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add these functions to the app object
if (typeof app !== 'undefined') {
    app.extractFixedCode = extractFixedCode;
    app.applyFixedCode = applyFixedCode;
    if (!app.state.fixedCode) {
        app.state.fixedCode = null;
    }
}
