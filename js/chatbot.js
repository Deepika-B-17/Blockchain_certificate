const chatForm = document.getElementById('chatForm');
const userInput = document.getElementById('userInput');
const chatWindow = document.getElementById('chatWindow');

function formatMessage(text) {
    // 1. Sanitize (basic) - mimic textContent behavior first
    let safeText = text.replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    // 2. Format Bold (**text**)
    safeText = safeText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // 3. Format Bullet Points (* item)
    safeText = safeText.replace(/^\* (.*$)/gm, '• $1');

    // 4. Line Breaks
    return safeText.replace(/\n/g, '<br>');
}

function addMessage(text, isUser) {
    const div = document.createElement('div');
    div.className = `message ${isUser ? 'user-msg' : 'bot-msg'}`;

    // User messages are plain text, Bot messages get formatting
    if (isUser) {
        div.textContent = text;
    } else {
        div.innerHTML = formatMessage(text);
    }

    chatWindow.appendChild(div);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

if (chatForm) {
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = userInput.value.trim();
        const imageFile = document.getElementById('imageInput').files[0];
        const previewDiv = document.getElementById('imagePreview');

        if (!text && !imageFile) return;

        // Display user message
        if (text) {
            addMessage(text, true);
        }
        if (imageFile) {
            addMessage(`[Sent Image: ${imageFile.name}]`, true);
        }

        userInput.value = '';
        document.getElementById('imageInput').value = ''; // Clear file input
        if (previewDiv) {
            previewDiv.style.display = 'none';
            previewDiv.textContent = '';
        }

        try {
            const formData = new FormData();
            formData.append('query', text || "Analyze this image"); // Default text if only image sent
            if (imageFile) {
                formData.append('image', imageFile);
            }

            const response = await fetch('http://localhost:8000/chatbot/ai-guidance', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            addMessage(data.answer, false);

            if (data.confidence_note) {
                const noteDiv = document.createElement('div');
                noteDiv.className = 'message bot-msg';
                noteDiv.style.fontSize = '0.8rem';
                noteDiv.style.fontStyle = 'italic';
                noteDiv.style.color = 'var(--text-sec)';
                noteDiv.textContent = data.confidence_note;
                chatWindow.appendChild(noteDiv);
                chatWindow.scrollTop = chatWindow.scrollHeight;
            }

        } catch (err) {
            addMessage("Sorry, I'm having trouble connecting to the AI service. Please check your connection or try again later.", false);
            console.error("Chatbot Error:", err);
        }
    });

    // Optional: Add preview handler
    const imgInput = document.getElementById('imageInput');
    if (imgInput) {
        imgInput.addEventListener('change', () => {
            const previewDiv = document.getElementById('imagePreview');
            if (imgInput.files && imgInput.files[0]) {
                previewDiv.textContent = `Selected: ${imgInput.files[0].name}`;
                previewDiv.style.display = 'block';
            } else {
                previewDiv.style.display = 'none';
            }
        });
    }
}
