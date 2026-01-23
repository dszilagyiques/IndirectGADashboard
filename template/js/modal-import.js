// === EXCEL IMPORT MODAL ===

const ImportModal = (function() {
    let selectedFile = null;
    let parsedData = null;
    let validationResult = null;

    // Required columns for validation
    const REQUIRED_COLUMNS = [
        'G/L Date',
        'Division Name',
        'Job',
        'Job Type',
        'Cost Type',
        'Actual Amount',
        'Document Type'
    ];

    // Optional columns that we recognize
    const OPTIONAL_COLUMNS = [
        'Description',
        'Vendor Name',
        'Employee Name',
        'Reference',
        'Comments'
    ];

    // Department mapping (same as build_dashboard.py)
    const DEPARTMENT_MAP = {
        '110': 'Exec', '130': 'Bus Dev', '140': 'Admin', '150': 'Acct', '165': 'Treasury',
        '170': 'HR Payroll', '180': 'IT', '190': 'Risk Mgmt', '210': 'Intl Ops',
        '230': 'Safety Mgmt', '250': 'Estimating', '260': 'Proposals', '520': 'Ops Proj Mgmt',
        '530': 'Ops Proj Cont', '540': 'Ops Proc Subs', '550': 'Ops Eng', '560': 'NonBillable',
        '590': 'Field Ops', '710': 'Eqp Gen', '711': 'Fuel', '720': 'Eqp Mech',
        '730': 'Eqp Haul', '740': 'Aviation Fixed Wing', '750': 'Aviation Rotary Wing',
        '760': 'Small Tools', '770': 'Warehouse', '810': 'Safety Gen', '820': 'Safety Train',
        '850': 'Comm IT Cell', '860': 'Facilities'
    };

    const DEPARTMENT_CATEGORY_MAP = {
        '110': 'G&A', '130': 'G&A', '140': 'G&A', '150': 'G&A', '165': 'G&A',
        '170': 'G&A', '180': 'G&A', '190': 'G&A', '210': 'G&A', '230': 'G&A',
        '250': 'G&A', '260': 'G&A', '520': 'Ops Support', '530': 'Ops Support',
        '540': 'Ops Support', '550': 'Ops Support', '560': 'Ops Support',
        '710': 'Equipment', '711': 'Equipment', '720': 'Equipment', '730': 'Equipment',
        '740': 'Equipment', '750': 'Equipment', '810': 'Safety', '820': 'Safety',
        '760': 'Tools', '590': 'Other', '770': 'Other', '850': 'Other', '860': 'Other'
    };

    /**
     * Open the import modal
     */
    function open() {
        resetState();
        showSection('dropzone');
        updateFooterInfo('Select an Excel file with Cost Code Detail Report data');
        document.getElementById('importSubmitBtn').disabled = true;

        ModalManager.open('importModal', {
            onClose: resetState
        });
    }

    /**
     * Reset modal state
     */
    function resetState() {
        selectedFile = null;
        parsedData = null;
        validationResult = null;

        document.getElementById('importFileInput').value = '';
        document.getElementById('importDropzone').classList.remove('has-file', 'dragover');
    }

    /**
     * Show a specific section of the modal
     */
    function showSection(section) {
        const sections = ['dropzone', 'file', 'validation', 'preview', 'processing', 'success'];
        sections.forEach(s => {
            const el = document.getElementById(`import${s.charAt(0).toUpperCase() + s.slice(1)}Section`);
            if (el) el.style.display = s === section || (section === 'file' && s === 'dropzone') ? 'block' : 'none';
        });

        // Special handling for file section
        if (section === 'file') {
            document.getElementById('importDropzoneSection').style.display = 'none';
            document.getElementById('importFileSection').style.display = 'block';
            document.getElementById('importValidationSection').style.display = 'block';
            document.getElementById('importPreviewSection').style.display = 'block';
        }
    }

    /**
     * Update footer info text
     */
    function updateFooterInfo(text) {
        document.getElementById('importFooterInfo').textContent = text;
    }

    /**
     * Handle file selection
     */
    function handleFileSelect(file) {
        if (!file) return;

        // Validate file type
        if (!file.name.match(/\.xlsx?$/i)) {
            alert('Please select an Excel file (.xlsx or .xls)');
            return;
        }

        selectedFile = file;

        // Update UI
        document.getElementById('importFileName').textContent = file.name;
        document.getElementById('importFileSize').textContent = formatFileSize(file.size);
        document.getElementById('importDropzone').classList.add('has-file');

        // Parse and validate
        parseFile(file);
    }

    /**
     * Parse Excel file using SheetJS
     */
    function parseFile(file) {
        showSection('processing');
        document.getElementById('importProcessingText').textContent = 'Reading Excel file...';

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                document.getElementById('importProcessingText').textContent = 'Parsing data...';

                // Parse with SheetJS
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });

                // Try to find the Cost Code Detail Report sheet
                let sheetName = 'Cost Code Detail Report';
                let sheet = workbook.Sheets[sheetName];

                if (!sheet) {
                    // Try first sheet
                    sheetName = workbook.SheetNames[0];
                    sheet = workbook.Sheets[sheetName];
                }

                // Convert to JSON
                const jsonData = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: '' });

                // Clean column names
                parsedData = jsonData.map(row => {
                    const cleaned = {};
                    Object.keys(row).forEach(key => {
                        const cleanKey = key.replace(/\n/g, ' ').trim();
                        cleaned[cleanKey] = row[key];
                    });
                    return cleaned;
                });

                // Validate
                validationResult = validateData(parsedData, sheetName);

                // Show results
                showValidationResults();

            } catch (err) {
                console.error('Parse error:', err);
                showSection('dropzone');
                alert('Error parsing Excel file: ' + err.message);
            }
        };

        reader.onerror = function() {
            showSection('dropzone');
            alert('Error reading file');
        };

        reader.readAsArrayBuffer(file);
    }

    /**
     * Validate parsed data
     */
    function validateData(data, sheetName) {
        const result = {
            valid: true,
            errors: [],
            warnings: [],
            columns: {
                required: [],
                optional: [],
                unknown: [],
                missing: []
            },
            rowCount: data.length,
            sheetName: sheetName
        };

        if (data.length === 0) {
            result.valid = false;
            result.errors.push('No data found in the file');
            return result;
        }

        // Check columns
        const foundColumns = Object.keys(data[0]);

        REQUIRED_COLUMNS.forEach(col => {
            if (foundColumns.includes(col)) {
                result.columns.required.push(col);
            } else {
                result.columns.missing.push(col);
                result.valid = false;
                result.errors.push(`Missing required column: ${col}`);
            }
        });

        OPTIONAL_COLUMNS.forEach(col => {
            if (foundColumns.includes(col)) {
                result.columns.optional.push(col);
            }
        });

        foundColumns.forEach(col => {
            if (!REQUIRED_COLUMNS.includes(col) && !OPTIONAL_COLUMNS.includes(col)) {
                result.columns.unknown.push(col);
            }
        });

        // Check for sheet name warning
        if (sheetName !== 'Cost Code Detail Report') {
            result.warnings.push(`Sheet "${sheetName}" used instead of "Cost Code Detail Report"`);
        }

        // Check for data quality issues
        let invalidDates = 0;
        let invalidAmounts = 0;

        data.forEach((row, idx) => {
            const date = row['G/L Date'];
            if (date && isNaN(Date.parse(date))) {
                invalidDates++;
            }

            const amount = row['Actual Amount'];
            if (amount !== '' && amount !== undefined && isNaN(parseFloat(String(amount).replace(/[$,]/g, '')))) {
                invalidAmounts++;
            }
        });

        if (invalidDates > 0) {
            result.warnings.push(`${invalidDates} rows have invalid or missing dates`);
        }

        if (invalidAmounts > 0) {
            result.warnings.push(`${invalidAmounts} rows have non-numeric amounts`);
        }

        if (result.columns.unknown.length > 0) {
            result.warnings.push(`${result.columns.unknown.length} unrecognized columns will be ignored`);
        }

        return result;
    }

    /**
     * Show validation results in UI
     */
    function showValidationResults() {
        showSection('file');

        const iconEl = document.getElementById('importValidationIcon');
        const titleEl = document.getElementById('importValidationTitle');

        if (validationResult.valid) {
            iconEl.className = 'import-validation-icon success';
            iconEl.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20,6 9,17 4,12"/></svg>';
            titleEl.textContent = 'Validation Passed';
            document.getElementById('importSubmitBtn').disabled = false;
        } else {
            iconEl.className = 'import-validation-icon error';
            iconEl.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
            titleEl.textContent = 'Validation Failed';
            document.getElementById('importSubmitBtn').disabled = true;
        }

        // Show columns
        renderColumnTags('importRequiredCols', validationResult.columns.required, 'required');
        renderColumnTags('importRequiredCols', validationResult.columns.missing, 'missing', true);
        renderColumnTags('importOptionalCols', validationResult.columns.optional, 'optional');
        renderColumnTags('importUnknownCols', validationResult.columns.unknown, 'unknown');

        // Show issues
        const issuesList = document.getElementById('importIssuesList');
        issuesList.innerHTML = '';

        validationResult.errors.forEach(err => {
            issuesList.innerHTML += `
                <li class="import-issue">
                    <span class="import-issue-icon error">&#10005;</span>
                    <span class="import-issue-text">${escapeHtml(err)}</span>
                </li>
            `;
        });

        validationResult.warnings.forEach(warn => {
            issuesList.innerHTML += `
                <li class="import-issue">
                    <span class="import-issue-icon warning">&#9888;</span>
                    <span class="import-issue-text">${escapeHtml(warn)}</span>
                </li>
            `;
        });

        // Show preview
        renderPreview();

        // Update footer
        updateFooterInfo(`${validationResult.rowCount.toLocaleString()} rows found in "${validationResult.sheetName}"`);
    }

    /**
     * Render column tags
     */
    function renderColumnTags(containerId, columns, type, append = false) {
        const container = document.getElementById(containerId);
        if (!append) container.innerHTML = '';

        columns.forEach(col => {
            container.innerHTML += `<span class="import-column-tag ${type}">${escapeHtml(col)}</span>`;
        });
    }

    /**
     * Render data preview table
     */
    function renderPreview() {
        if (!parsedData || parsedData.length === 0) return;

        const previewRows = parsedData.slice(0, 5);
        const columns = REQUIRED_COLUMNS.filter(c => validationResult.columns.required.includes(c));

        const headEl = document.getElementById('importPreviewHead');
        const bodyEl = document.getElementById('importPreviewBody');

        headEl.innerHTML = '<tr>' + columns.map(c => `<th>${escapeHtml(c)}</th>`).join('') + '</tr>';

        bodyEl.innerHTML = previewRows.map(row => {
            return '<tr>' + columns.map(c => `<td>${escapeHtml(String(row[c] || ''))}</td>`).join('') + '</tr>';
        }).join('');

        document.getElementById('importPreviewCount').textContent =
            `Showing first ${previewRows.length} of ${parsedData.length.toLocaleString()} rows`;
    }

    /**
     * Process and import the data
     */
    function importData() {
        if (!parsedData || !validationResult.valid) return;

        showSection('processing');
        document.getElementById('importProcessingText').textContent = 'Processing data...';

        setTimeout(() => {
            try {
                // Process data - add derived columns
                const processed = parsedData
                    .filter(row => row['Document Type'] !== 'Grand Total')
                    .map(row => {
                        // Parse amount
                        let amount = row['Actual Amount'];
                        if (typeof amount === 'string') {
                            amount = parseFloat(amount.replace(/[$,]/g, '')) || 0;
                        }
                        row['Actual Amount'] = amount;

                        // Parse date
                        if (row['G/L Date']) {
                            const date = new Date(row['G/L Date']);
                            if (!isNaN(date)) {
                                row['G/L Date'] = date.toISOString().slice(0, 10);
                            }
                        }

                        // Add Category
                        row['Category'] = categorizeCostType(row['Cost Type']);

                        // Add Is_Allocation
                        row['Is_Allocation'] = String(row['Cost Type'] || '').startsWith('693');

                        // Add Department
                        const job = row['Job'];
                        const jobStr = job ? String(Math.floor(Number(job))) : '';
                        const deptCode = jobStr.slice(-3);
                        row['Department'] = DEPARTMENT_MAP[deptCode] || `Unknown (${deptCode})`;
                        row['Dept_Category'] = DEPARTMENT_CATEGORY_MAP[deptCode] || 'Other';

                        return row;
                    });

                // Update global data
                rawData = processed;
                filteredData = [...rawData];

                // Refresh dashboard
                setupFilters();
                updateDashboard();

                // Show success
                showSection('success');
                document.getElementById('importSuccessSubtitle').textContent =
                    `${processed.length.toLocaleString()} records loaded successfully`;

                updateFooterInfo('Data imported - dashboard updated');

                // Close modal after delay
                setTimeout(() => {
                    ModalManager.close('importModal');
                }, 2000);

            } catch (err) {
                console.error('Import error:', err);
                alert('Error importing data: ' + err.message);
                showSection('file');
            }
        }, 100);
    }

    /**
     * Categorize cost type (same logic as build_dashboard.py)
     */
    function categorizeCostType(costType) {
        if (!costType) return 'Other';

        const code = String(costType).split(' - ')[0].trim();

        if (code.startsWith('61')) return 'Labor Costs';
        if (code.startsWith('62')) return 'Travel & Per Diem';
        if (code.startsWith('64')) return 'Fleet & Materials';
        if (code.startsWith('65')) return 'Facilities & Services';
        if (code.startsWith('67')) return 'Equipment Costs';
        if (code.startsWith('693')) return 'Allocation Credits';
        if (code.startsWith('69')) return 'Other Allocations';
        if (code.startsWith('71') || code.startsWith('72')) return 'Corporate Overhead';
        if (code.startsWith('73') || code.startsWith('74') || code.startsWith('75')) return 'G&A & Other';

        return 'Other';
    }

    /**
     * Format file size
     */
    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    /**
     * Remove selected file
     */
    function removeFile() {
        resetState();
        showSection('dropzone');
        updateFooterInfo('Select an Excel file with Cost Code Detail Report data');
        document.getElementById('importSubmitBtn').disabled = true;
    }

    /**
     * Initialize event listeners
     */
    function init() {
        const dropzone = document.getElementById('importDropzone');
        const fileInput = document.getElementById('importFileInput');
        const browseLink = document.getElementById('importBrowseLink');

        // Dropzone click
        dropzone?.addEventListener('click', () => fileInput?.click());

        // Browse link
        browseLink?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            fileInput?.click();
        });

        // File input change
        fileInput?.addEventListener('change', (e) => {
            if (e.target.files?.length > 0) {
                handleFileSelect(e.target.files[0]);
            }
        });

        // Drag and drop
        dropzone?.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });

        dropzone?.addEventListener('dragleave', () => {
            dropzone.classList.remove('dragover');
        });

        dropzone?.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            if (e.dataTransfer?.files?.length > 0) {
                handleFileSelect(e.dataTransfer.files[0]);
            }
        });

        // Remove file button
        document.getElementById('importFileRemove')?.addEventListener('click', removeFile);

        // Cancel button
        document.getElementById('importCancelBtn')?.addEventListener('click', () => {
            ModalManager.close('importModal');
        });

        // Import button
        document.getElementById('importSubmitBtn')?.addEventListener('click', importData);

        // Header import button
        document.getElementById('headerImportBtn')?.addEventListener('click', open);
    }

    return {
        open,
        init
    };
})();
