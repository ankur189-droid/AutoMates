/**
 * Gradly OCR Module
 * Handles document scanning and mark extraction from marksheets
 * Supports both browser-based (Tesseract.js) and Python backend OCR
 */

class GradlyOCR {
    constructor() {
        this.worker = null;
        this.usePythonBackend = false;
    }

    /**
     * Initialize Tesseract worker for browser-based OCR
     */
    async initBrowserOCR() {
        if (!this.worker) {
            this.worker = await Tesseract.createWorker('eng');
        }
        return this.worker;
    }

    /**
     * Toggle between Python backend and browser OCR
     */
    setBackend(usePython) {
        this.usePythonBackend = usePython;
    }

    /**
     * Process image and extract marks
     * @param {File} file - Image file to process
     * @param {string} classType - '10th' or '12th'
     * @returns {Promise<Object>} Extracted subjects and marks
     */
    async processImage(file, classType = '12th') {
        if (this.usePythonBackend) {
            return this.processWithPython(file, classType);
        } else {
            return this.processWithBrowser(file);
        }
    }

    /**
     * Process image using Python backend
     */
    async processWithPython(file, classType) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('classType', classType);

        const response = await fetch('/api/ocr', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'OCR processing failed');
        }

        return await response.json();
    }

    /**
     * Process image using browser Tesseract
     */
    async processWithBrowser(file) {
        await this.initBrowserOCR();
        const result = await this.worker.recognize(file);
        const subjects = this.parseMarksFromText(result.data.text);
        return { subjects, rawText: result.data.text };
    }

    /**
     * Parse marks from OCR text
     * @param {string} text - Raw OCR text
     * @returns {Object} Subject names mapped to marks
     */
    parseMarksFromText(text) {
        const lines = text.split('\n');
        const subjects = {};
        
        // Regex pattern to match subject rows in marksheets
        // Matches: Optional code (3 digits), Subject name (uppercase), Marks (2-3 digit numbers)
        const rowRegex = /^\s*(\d{3}\s+)?([A-Z][A-Z\s&]+[A-Z])\s+((?:\d{2,3}\s*)+)/;

        lines.forEach(line => {
            const cleanLine = line.trim();
            if (!cleanLine) return;

            const match = cleanLine.match(rowRegex);
            if (match) {
                const subjectName = match[2].trim();
                const numbersStr = match[3].trim();
                const numbers = numbersStr.split(/\s+/).map(n => parseInt(n, 10));

                if (numbers.length > 0) {
                    // Take the last number as total marks
                    const totalMark = numbers[numbers.length - 1];
                    
                    // Filter out header rows
                    const headers = ['THEORY', 'SUBJECT', 'TOTAL', 'SUBJECT NAME', 'POSITIONAL', 'PRACTICAL', 'MAXIMUM', 'MARKS'];
                    if (!headers.includes(subjectName) && subjectName.length > 2) {
                        subjects[subjectName] = totalMark;
                    }
                }
            }
        });

        return subjects;
    }

    /**
     * Calculate best of 5 marks and percentage
     * @param {Object} subjects - Subject marks object
     * @returns {Object} Calculated totals and percentage
     */
    calculateBestOfFive(subjects) {
        const entries = Object.entries(subjects)
            .map(([name, mark]) => ({ name, mark: parseInt(mark) || 0 }))
            .sort((a, b) => b.mark - a.mark);

        // Take top 5 subjects
        const top5 = entries.slice(0, 5);
        const total = top5.reduce((sum, item) => sum + item.mark, 0);
        const percentage = (total / 5).toFixed(2);

        return {
            top5: top5.map(e => e.name),
            allSubjects: entries,
            total,
            percentage: parseFloat(percentage),
            maxPossible: 500
        };
    }

    /**
     * Check eligibility based on percentage and stream cutoff
     * @param {number} percentage - Student's percentage
     * @param {string} stream - Selected stream
     * @param {Object} cutoffs - Stream cutoff requirements
     * @returns {Object} Eligibility result
     */
    checkEligibility(percentage, stream, cutoffs) {
        if (!cutoffs[stream]) {
            return { eligible: false, message: 'Invalid stream selected' };
        }

        const required = cutoffs[stream].cutoff;
        const streamName = cutoffs[stream].name;

        if (percentage >= required) {
            return {
                eligible: true,
                message: `Eligible for ${streamName}`,
                required,
                obtained: percentage,
                difference: (percentage - required).toFixed(2)
            };
        } else {
            return {
                eligible: false,
                message: `Not eligible for ${streamName}. Required: ${required}%, Obtained: ${percentage}%`,
                required,
                obtained: percentage,
                difference: (required - percentage).toFixed(2)
            };
        }
    }

    /**
     * Terminate OCR worker
     */
    async terminate() {
        if (this.worker) {
            await this.worker.terminate();
            this.worker = null;
        }
    }
}

// Stream cutoff requirements
const STREAM_CUTOFFS = {
    'btech_cse': { name: 'B. Tech CSE', cutoff: 85 },
    'btech_it': { name: 'B. Tech IT', cutoff: 80 },
    'btech_ece': { name: 'B. Tech ECE', cutoff: 78 },
    'btech_mech': { name: 'B. Tech Mechanical', cutoff: 75 },
    'btech_civil': { name: 'B. Tech Civil', cutoff: 72 },
    'bca': { name: 'BCA', cutoff: 70 },
    'mca': { name: 'MCA', cutoff: 75 },
    'mba': { name: 'MBA', cutoff: 70 },
    'bsc_cs': { name: 'B.Sc Computer Science', cutoff: 65 },
    'bcom': { name: 'B.Com', cutoff: 60 }
};

// Default subjects for manual entry
const DEFAULT_SUBJECTS = {
    '10th': ['Mathematics', 'Science', 'Social Science', 'English', 'Hindi'],
    '12th': ['Physics', 'Chemistry', 'Mathematics', 'English', 'Computer Science']
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GradlyOCR, STREAM_CUTOFFS, DEFAULT_SUBJECTS };
}

// Create global instance
window.gradlyOCR = new GradlyOCR();
window.STREAM_CUTOFFS = STREAM_CUTOFFS;
window.DEFAULT_SUBJECTS = DEFAULT_SUBJECTS;
