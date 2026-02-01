document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('marksheetUpload');
    const statusSection = document.querySelector('.app-status-section');
    const statusContent = document.querySelector('.status-content');

    // UI Elements for status updates
    const initialStatusHTML = statusContent.innerHTML;

    // Helper to update status UI
    function updateStatus(state, message = '', details = '') {
        if (state === 'scanning') {
            statusContent.innerHTML = `
                <div style="color: var(--primary);">
                    <svg class="animate-spin" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                    <h2 style="margin-top: 15px; color: var(--secondary);">AI is scanning...</h2>
                    <p style="color: var(--text-light);">${message}</p>
                </div>
            `;
        } else if (state === 'success') {
            statusContent.innerHTML = `
                <div style="color: #10b981;">
                    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    <h2 style="margin-top: 15px; color: #065f46;">Document Verified!</h2>
                    <p style="color: #047857;">Marks auto-filled successfully.</p>
                </div>
            `;
            // Flash success on form fields
            document.querySelectorAll('.marks-grid input').forEach(input => {
                input.style.borderColor = '#10b981';
                input.style.backgroundColor = '#ecfdf5';
                setTimeout(() => {
                    input.style.borderColor = '#e2e8f0';
                    input.style.backgroundColor = 'white';
                }, 2000);
            });
        } else if (state === 'error') {
            statusContent.innerHTML = `
                <div style="color: #ef4444;">
                    <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <h2 style="margin-top: 15px; color: #991b1b;">Scan Failed</h2>
                    <p style="color: #b91c1c;">${message}</p>
                    <button id="retryBtn" style="margin-top: 15px; padding: 8px 16px; background: white; border: 1px solid #ef4444; color: #ef4444; border-radius: 8px; cursor: pointer;">Try Again</button>
                </div>
            `;
            document.getElementById('retryBtn').onclick = () => {
                statusContent.innerHTML = initialStatusHTML;
                fileInput.value = '';
            };
        }
    }

    // File Upload Handling
    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--primary)';
        dropZone.style.backgroundColor = 'rgba(46, 196, 182, 0.05)';
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'rgba(46, 196, 182, 0.4)';
        dropZone.style.backgroundColor = 'var(--bg-light)';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'rgba(46, 196, 182, 0.4)';
        dropZone.style.backgroundColor = 'var(--bg-light)';

        if (e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    function handleFile(file) {
        // UI Update for selected file
        dropZone.querySelector('h3').textContent = file.name;
        dropZone.querySelector('p').textContent = "Processing image...";

        // Start OCR
        processImage(file);
    }

    async function processImage(file) {
        updateStatus('scanning', 'Extracting text from marksheet...');

        try {
            const worker = await Tesseract.createWorker('eng');

            const ret = await worker.recognize(file);
            console.log('OCR Result:', ret.data.text);

            const extractedMarks = parseMarks(ret.data.text);

            // Auto-fill form
            fillForm(extractedMarks);

            await worker.terminate();

            if (Object.keys(extractedMarks).length > 0) {
                updateStatus('success');
            } else {
                updateStatus('error', 'Could not detect clear marks. Please check image quality or enter manually.');
            }

        } catch (err) {
            console.error(err);
            updateStatus('error', 'An error occurred during scanning.');
        }
    }

    function parseMarks(text) {
        // Regex to match a Subject line:
        // Group 1: Optional Subject Code (3 digits)
        // Group 2: Subject Name (UPPERCASE text, spaces, &)
        // Group 3: Marks chunk (e.g. 057 019 076)
        // We look for patterns where there are multiple numbers at the end of the line

        const lines = text.split('\n');
        const subjects = {};

        // Regex explanation:
        // ^\s*                          Start of line, potential whitespace
        // (\d{3}\s+)?                   Optional 3-digit code
        // ([A-Z][A-Z\s&]+?)             Subject Name (Must start with letter, greedy match until numbers start)
        // \s+                           Separator
        // ((?:\d{2,3}\s*)+)             One or more groups of 2-3 digit numbers
        const rowRegex = /^\s*(\d{3}\s+)?([A-Z\s&]+[A-Z])\s+((?:\d{2,3}\s*)+)/;

        console.log("Parsing lines...");

        lines.forEach(line => {
            // Cleanup line
            const cleanLine = line.trim();
            if (!cleanLine) return;

            const match = cleanLine.match(rowRegex);

            if (match) {
                const subjectName = match[2].trim();
                const numbersStr = match[3].trim();
                const numbers = numbersStr.split(/\s+/).map(n => parseInt(n, 10));

                // Logic:
                // If 3 numbers (Theory, Practical, Total) -> Take Last (Total)
                // If 1 number -> Take it
                // If >3 -> Take Last

                // Filter out obviously wrong numbers (e.g. year 2024, or code) if they leaked in, 
                // but regex structure helps avoid this.
                // Assuming marks are <= 100 per paper usually, but Total could be higher.

                if (numbers.length > 0) {
                    const totalMark = numbers[numbers.length - 1]; // Take the last number as Total

                    // Filter out header lines like "THEORY PRACTICAL TOTAL"
                    if (subjectName !== 'THEORY' && subjectName !== 'SUBJECT' && subjectName !== 'TOTAL') {
                        subjects[subjectName] = totalMark;
                    }
                }
            }
        });

        return subjects;
    }

    function fillForm(subjects) {
        const grid = document.getElementById('marksGrid');
        const grandTotalInput = document.getElementById('grandTotal');

        // Clear existing static inputs or waiting message
        grid.innerHTML = '';

        let calculatedGrandTotal = 0;

        if (Object.keys(subjects).length === 0) {
            grid.innerHTML = `
                <div class="form-group" style="grid-column: 1/-1;">
                    <p style="color: #ef4444;">No clear subjects found. Please enter manually.</p>
                </div>
             `;
            const defaults = ['Maths', 'Physics', 'Chemistry', 'English', 'Computer Science'];
            defaults.forEach(sub => {
                addSubjectInput(grid, sub, '', false);
            });
            return;
        }

        // Convert to array to sort and find top 5
        const entries = Object.entries(subjects).map(([name, mark]) => ({ name, mark }));

        // Sort by marks descending to find top 5
        entries.sort((a, b) => b.mark - a.mark);

        // Identify top 5
        const top5 = entries.slice(0, 5);
        const top5Names = new Set(top5.map(e => e.name));

        // Calculate total of top 5
        calculatedGrandTotal = top5.reduce((sum, item) => sum + item.mark, 0);

        // Display ALL subjects (original order or sorted? Let's keep them sorted by marks for better visibility of top 5)
        entries.forEach(entry => {
            const isTop5 = top5Names.has(entry.name);
            addSubjectInput(grid, entry.name, entry.mark, isTop5);
        });

        if (grandTotalInput) {
            grandTotalInput.value = calculatedGrandTotal;
            grandTotalInput.style.borderColor = '#10b981';
            grandTotalInput.style.backgroundColor = '#ecfdf5';
            // Add a helpful note
            const noteId = 'total-note';
            let note = document.getElementById(noteId);
            if (!note) {
                note = document.createElement('p');
                note.id = noteId;
                note.style.fontSize = '0.75rem';
                note.style.color = '#64748b';
                note.style.marginTop = '4px';
                grandTotalInput.parentNode.appendChild(note);
            }
            note.textContent = `* Calculated using Best of 5 subjects`;
        }
    }

    function addSubjectInput(container, name, value, isTop5) {
        const div = document.createElement('div');
        div.className = 'subject-row'; // Updated class for horizontal alignment

        const label = document.createElement('label');
        label.textContent = name;
        // Styles now handled by CSS .subject-row label

        if (isTop5) {
            const badge = document.createElement('span');
            badge.textContent = 'Included';
            badge.style.fontSize = '0.65rem';
            badge.style.backgroundColor = '#dcfce7';
            badge.style.color = '#15803d';
            badge.style.padding = '2px 6px';
            badge.style.borderRadius = '4px';
            badge.style.marginLeft = '8px'; // Add spacing
            label.appendChild(badge);
        }

        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'form-input';
        input.value = value;
        input.placeholder = 'Marks';

        if (value !== '') {
            input.style.borderColor = isTop5 ? '#10b981' : '#e2e8f0';
            input.style.backgroundColor = isTop5 ? '#ecfdf5' : '#fff';
        }

        div.appendChild(label);
        div.appendChild(input);
        container.appendChild(div);
    }
});

// Add spin animation style dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes spin { 100% { transform: rotate(360deg); } }
    .animate-spin { animation: spin 1s linear infinite; }
`;
document.head.appendChild(style);
