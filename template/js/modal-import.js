// === EXCEL IMPORT MODAL ===
// Two parsing paths:
//   SMALL FILES (<30 MB): SheetJS XLSX.read() — fast, in-memory
//   LARGE FILES (≥30 MB): Custom streaming parser — uses DecompressionStream
//     to incrementally decompress the ZIP and SAX-parse the XML without
//     ever holding the full 670 MB sheet XML in memory.

const ImportModal = (function() {
    let selectedFile = null;
    let parsedData = null;        // Columnar: { columns: {name: values[]}, rowCount, allColumns }
    let validationResult = null;

    // Browser streaming support check
    const SUPPORTS_STREAMING = typeof DecompressionStream !== 'undefined';

    // Required columns for validation
    const REQUIRED_COLUMNS = [
        'G/L Date', 'Division Name', 'Job', 'Job Type',
        'Cost Type', 'Actual Amount', 'Document Type'
    ];

    const OPTIONAL_COLUMNS = [
        'Description', 'Vendor Name', 'Employee Name',
        'Reference', 'Comments', 'Actual Units',
        // Additional columns for multiselect filters
        'Job Status', 'Job Groupings', 'Div #', 'Batch Type',
        'Document Company', 'Cost Code', 'Unit Number'
    ];

    const KEEP_COLUMNS = new Set([...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS]);

    // Columns whose numeric values are Excel date serials
    const DATE_COLUMNS = new Set(['G/L Date', 'Invoice Date', 'Batch Date']);

    // Department mapping
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

    const AMOUNT_CLEAN_REGEX = /[$,]/g;
    const COST_CODE_SPLIT = ' - ';

    // ──────────────────────────────────────────────────────
    //  UI helpers
    // ──────────────────────────────────────────────────────

    function open() {
        resetState();
        showSection('dropzone');
        updateFooterInfo('Select an Excel file with Cost Code Detail Report data');
        document.getElementById('importSubmitBtn').disabled = true;
        ModalManager.open('importModal', { onClose: resetState });
    }

    function resetState() {
        selectedFile = null;
        parsedData = null;
        validationResult = null;
        document.getElementById('importFileInput').value = '';
        document.getElementById('importDropzone').classList.remove('has-file', 'dragover');
    }

    function showSection(section) {
        const sections = ['dropzone', 'file', 'validation', 'preview', 'processing', 'success'];
        sections.forEach(s => {
            const el = document.getElementById(`import${s.charAt(0).toUpperCase() + s.slice(1)}Section`);
            if (el) el.style.display = s === section || (section === 'file' && s === 'dropzone') ? 'block' : 'none';
        });
        if (section === 'file') {
            document.getElementById('importDropzoneSection').style.display = 'none';
            document.getElementById('importFileSection').style.display = 'block';
            document.getElementById('importValidationSection').style.display = 'block';
            document.getElementById('importPreviewSection').style.display = 'block';
        }
    }

    function updateFooterInfo(text) {
        document.getElementById('importFooterInfo').textContent = text;
    }

    function updateProgress(text, percent) {
        document.getElementById('importProcessingText').textContent = text;
        const bar = document.getElementById('importProgressBar');
        const track = document.getElementById('importProgressTrack');
        if (bar && track) {
            if (percent != null) {
                track.style.display = 'block';
                bar.style.width = Math.min(100, Math.max(0, percent)) + '%';
            } else {
                track.style.display = 'none';
            }
        }
    }

    // ──────────────────────────────────────────────────────
    //  File selection & routing
    // ──────────────────────────────────────────────────────

    function handleFileSelect(file) {
        if (!file) return;
        if (!file.name.match(/\.xlsx?$/i)) {
            alert('Please select an Excel file (.xlsx or .xls)');
            return;
        }
        selectedFile = file;
        document.getElementById('importFileName').textContent = file.name;
        document.getElementById('importFileSize').textContent = formatFileSize(file.size);
        document.getElementById('importDropzone').classList.add('has-file');

        const fileMB = file.size / (1024 * 1024);

        if (fileMB >= 30 && SUPPORTS_STREAMING) {
            // Large file → streaming parser (no full-file-in-memory)
            showSection('processing');
            updateProgress(`Preparing streaming parse for ${fileMB.toFixed(0)} MB file...`, 0);
            parseFileStreaming(file, performance.now(), fileMB);
        } else {
            // Small file → SheetJS in-memory parser
            parseFileSheetJS(file);
        }
    }

    // ──────────────────────────────────────────────────────
    //  PATH A: SheetJS parser (files < 30 MB)
    // ──────────────────────────────────────────────────────

    function parseFileSheetJS(file) {
        showSection('processing');
        updateProgress('Reading Excel file...', 0);
        const startTime = performance.now();

        const reader = new FileReader();
        reader.onload = function(e) {
            setTimeout(() => {
                try {
                    doParseSheetJS(new Uint8Array(e.target.result), startTime);
                } catch (err) {
                    console.error('Parse error:', err);
                    showSection('dropzone');
                    alert('Error parsing Excel file: ' + err.message);
                }
            }, 50);
        };
        reader.onerror = () => { showSection('dropzone'); alert('Error reading file'); };
        reader.readAsArrayBuffer(file);
    }

    function doParseSheetJS(data, startTime) {
        updateProgress('Parsing workbook...', 10);

        const opts = {
            type: 'array', cellDates: true, cellNF: false, cellHTML: false,
            cellStyles: false, cellFormula: false, sheetStubs: false
        };

        const workbook = XLSX.read(data, opts);
        data = null;

                let sheetName = 'Cost Code Detail Report';
                let sheet = workbook.Sheets[sheetName];
        if (!sheet) { sheetName = workbook.SheetNames[0]; sheet = workbook.Sheets[sheetName]; }
        if (!sheet) throw new Error('No sheets found');

        if (!sheet['!ref'] || typeof sheet['!ref'] !== 'string') {
            repairSheetRef(sheet);
        }

        let range;
        try { range = XLSX.utils.decode_range(sheet['!ref']); }
        catch (_) { repairSheetRef(sheet); range = XLSX.utils.decode_range(sheet['!ref']); }

        const totalRows = range.e.r - range.s.r;
        if (totalRows < 1) throw new Error('No data rows');

                updateProgress('Extracting columns...', 30);

        const headerRowNum = range.s.r + 1;
        const allHeaders = [];
        const colLetters = [];
        for (let c = range.s.c; c <= range.e.c; c++) {
            const cl = XLSX.utils.encode_col(c);
            colLetters.push(cl);
            const cell = sheet[cl + headerRowNum];
            allHeaders.push(cell && cell.v != null ? String(cell.v).split(/\s+/).join(' ').trim() : '');
        }

        const neededCols = [], neededPrefixes = [];
        for (let c = 0; c < allHeaders.length; c++) {
            if (KEEP_COLUMNS.has(allHeaders[c])) {
                neededCols.push(allHeaders[c]);
                neededPrefixes.push(colLetters[c]);
            }
        }

        const columns = {};
        for (const n of neededCols) columns[n] = new Array(totalRows);

        const dataRowStart = headerRowNum + 1;
        const numCols = neededCols.length;
        for (let r = 0; r < totalRows; r++) {
            const rn = dataRowStart + r;
            for (let j = 0; j < numCols; j++) {
                const cell = sheet[neededPrefixes[j] + rn];
                columns[neededCols[j]][r] = cell ? (cell.v !== undefined ? cell.v : (cell.w || '')) : '';
            }
        }

        for (const sn of Object.keys(workbook.Sheets)) workbook.Sheets[sn] = null;

        parsedData = { columns, rowCount: totalRows, allColumns: allHeaders.filter(h => h) };
        validationResult = validateDataFast(parsedData, sheetName);

        const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
        console.log(`SheetJS parse completed in ${elapsed}s for ${totalRows.toLocaleString()} rows`);
        showValidationResults();
    }

    function repairSheetRef(sheet) {
        let maxR = 0, maxC = 0, found = false;
        for (const k of Object.keys(sheet)) {
            if (k.charCodeAt(0) === 33) continue;
            try { const c = XLSX.utils.decode_cell(k); if (c.r > maxR) maxR = c.r; if (c.c > maxC) maxC = c.c; found = true; } catch (_) {}
        }
        if (!found) throw new Error('Sheet is empty');
        sheet['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxR, c: maxC } });
    }

    // ──────────────────────────────────────────────────────
    //  PATH B: Streaming parser (files ≥ 30 MB)
    //  Uses DecompressionStream to decompress the ZIP entries
    //  and a simple state-machine XML parser to extract rows
    //  one at a time. Peak memory ≈ shared-strings table +
    //  the columnar output arrays. No 670 MB XML string.
    // ──────────────────────────────────────────────────────

    async function parseFileStreaming(file, startTime, fileMB) {
        try {
            // 1. Read ZIP central directory
            updateProgress('Reading ZIP structure...', 2);
            const entries = await zipReadEntries(file);

            const ssEntry = entries.find(e => e.name === 'xl/sharedStrings.xml');
            const sheetEntry = entries.find(e => /^xl\/worksheets\/sheet\d+\.xml$/i.test(e.name));
            if (!sheetEntry) throw new Error('No worksheet found inside xlsx');

            // 2. Parse shared strings (small — 2-3 MB)
            updateProgress('Parsing shared strings...', 5);
            let sharedStrings = [];
            if (ssEntry) {
                const ssXml = await zipDecompressToString(file, ssEntry);
                sharedStrings = xmlParseSharedStrings(ssXml);
                console.log(`Shared strings: ${sharedStrings.length.toLocaleString()} unique values`);
            }

            // 3. Stream-parse the sheet XML
            updateProgress('Starting row streaming...', 8);
            const result = await streamParseSheet(
                file, sheetEntry, sharedStrings,
                (text, pct) => updateProgress(text, pct)
            );

            // 4. Done
            parsedData = result;
            validationResult = validateDataFast(parsedData, 'Cost Code Detail Report');

            const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
            console.log(`Streaming parse completed in ${elapsed}s for ${result.rowCount.toLocaleString()} rows`);
            showValidationResults();

        } catch (err) {
            console.error('Streaming parse error:', err);
            showSection('dropzone');
            alert('Error parsing file: ' + err.message);
        }
    }

    // ── ZIP helpers ──────────────────────────────────────

    /** Read ZIP central directory entries from a File/Blob. */
    async function zipReadEntries(file) {
        // Read last 64 KB to find End-of-Central-Directory record
        const tailSize = Math.min(file.size, 65557);
        const tail = new Uint8Array(await file.slice(file.size - tailSize).arrayBuffer());

        // Search backwards for EOCD signature 0x06054b50
        let eocd = -1;
        for (let i = tail.length - 22; i >= 0; i--) {
            if (tail[i] === 0x50 && tail[i + 1] === 0x4b && tail[i + 2] === 0x05 && tail[i + 3] === 0x06) {
                eocd = i; break;
            }
        }
        if (eocd === -1) throw new Error('Invalid ZIP (no EOCD)');

        const dv = new DataView(tail.buffer, tail.byteOffset + eocd);
        const cdCount = dv.getUint16(10, true);
        const cdSize  = dv.getUint32(12, true);
        const cdOff   = dv.getUint32(16, true);

        // Read central directory
        const cd = new Uint8Array(await file.slice(cdOff, cdOff + cdSize).arrayBuffer());
        const cdv = new DataView(cd.buffer, cd.byteOffset);
        const dec = new TextDecoder();
        const entries = [];
        let p = 0;

        for (let i = 0; i < cdCount; i++) {
            if (cd[p] !== 0x50 || cd[p + 1] !== 0x4b || cd[p + 2] !== 0x01 || cd[p + 3] !== 0x02) break;
            const method   = cdv.getUint16(p + 10, true);
            const cSize    = cdv.getUint32(p + 20, true);
            const uSize    = cdv.getUint32(p + 24, true);
            const nameLen  = cdv.getUint16(p + 28, true);
            const extraLen = cdv.getUint16(p + 30, true);
            const cmtLen   = cdv.getUint16(p + 32, true);
            const lhOff    = cdv.getUint32(p + 42, true);
            const name     = dec.decode(cd.slice(p + 46, p + 46 + nameLen));
            entries.push({ name, method, cSize, uSize, lhOff });
            p += 46 + nameLen + extraLen + cmtLen;
        }

        // Resolve each entry's data-start offset from its local header
        for (const e of entries) {
            const lh = new DataView(await file.slice(e.lhOff, e.lhOff + 30).arrayBuffer());
            const lhNameLen  = lh.getUint16(26, true);
            const lhExtraLen = lh.getUint16(28, true);
            e.dataOff = e.lhOff + 30 + lhNameLen + lhExtraLen;
        }
        return entries;
    }

    /** Decompress a ZIP entry fully and return as string (for small files). */
    async function zipDecompressToString(file, entry) {
        const blob = file.slice(entry.dataOff, entry.dataOff + entry.cSize);
        if (entry.method === 0) return new TextDecoder().decode(await blob.arrayBuffer());

        const ds = new DecompressionStream('deflate-raw');
        const reader = blob.stream().pipeThrough(ds).getReader();
        const chunks = [];
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
        }
        const total = chunks.reduce((s, c) => s + c.length, 0);
        const buf = new Uint8Array(total);
        let off = 0;
        for (const c of chunks) { buf.set(c, off); off += c.length; }
        return new TextDecoder().decode(buf);
    }

    // ── Shared-strings parser ───────────────────────────

    function xmlParseSharedStrings(xml) {
        const strings = [];
        const siRe = /<si>([\s\S]*?)<\/si>/g;
        const tRe  = /<t[^>]*>([\s\S]*?)<\/t>/g;
        let m;
        while ((m = siRe.exec(xml)) !== null) {
            let text = '';
            let tm;
            tRe.lastIndex = 0;
            while ((tm = tRe.exec(m[1])) !== null) text += tm[1];
            strings.push(xmlDecode(text));
        }
        return strings;
    }

    function xmlDecode(s) {
        return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"').replace(/&apos;/g, "'");
    }

    // ── Excel date serial → JS Date ─────────────────────

    function excelDateToJSDate(serial) {
        if (typeof serial !== 'number' || serial < 1 || serial > 2958465) return serial;
        // 25569 = days between 1900-01-01 and 1970-01-01,
        // adjusted for Excel's 1900-leap-year bug
        const dayMs = 86400000;
        const adjust = serial > 60 ? 25568 : 25567; // bug: Excel thinks 1900 is leap
        return new Date((serial - adjust) * dayMs);
    }

    // ── Streaming sheet XML parser ──────────────────────

    /**
     * Incrementally decompress + parse xl/worksheets/sheetN.xml.
     * Keeps only the KEEP_COLUMNS in columnar arrays.
     * Peak memory ≈ sharedStrings[] + output columns.
     */
    async function streamParseSheet(file, entry, sharedStrings, onProgress) {
        const blob = file.slice(entry.dataOff, entry.dataOff + entry.cSize);
        let stream;
        if (entry.method === 0) {
            stream = blob.stream();
        } else {
            stream = blob.stream().pipeThrough(new DecompressionStream('deflate-raw'));
        }

        const reader = stream.getReader();
        const decoder = new TextDecoder();

        let buf = '';             // rolling text buffer
        let inSheetData = false;  // true once we pass <sheetData>
        let headerDone = false;

        // Column mapping  (populated from header row)
        let colLetterToName = {}; // "A" → "Document Type"
        let neededLetters = {};   // "G" → "G/L Date" (columns we keep)
        let neededNames = [];     // ordered list of kept column names
        let allHeaders = [];

        // Output columnar storage
        let columns = {};
        let rowCount = 0;
        let totalRows = 0;       // from <dimension>

        while (true) {
            const { done, value } = await reader.read();
            if (value) buf += decoder.decode(value, { stream: !done });

            // ─ Grab totalRows from <dimension ref="A1:AB640667"> ─
            if (totalRows === 0 && !inSheetData) {
                const dm = buf.match(/<dimension\s+ref="[A-Z]+\d+:([A-Z]+)(\d+)"/);
                if (dm) totalRows = parseInt(dm[2]) - 1;
            }

            // ─ Wait for <sheetData> before processing rows ─
            if (!inSheetData) {
                const si = buf.indexOf('<sheetData');
                if (si === -1) {
                    // Discard prefix, keep tail for partial-tag safety
                    if (buf.length > 500) buf = buf.slice(-300);
                    if (done) break;
                    continue;
                }
                inSheetData = true;
                buf = buf.slice(si);
            }

            // ─ Process every complete <row …>…</row> in the buffer ─
            let consumed = 0;
            while (true) {
                const endTag = buf.indexOf('</row>', consumed);
                if (endTag === -1) break;
                const rowEndPos = endTag + 6;

                // Find the <row that opens this </row>
                const chunk = buf.slice(consumed, rowEndPos);
                const rowOpen = chunk.lastIndexOf('<row ');
                if (rowOpen === -1) { consumed = rowEndPos; continue; }

                const rowXml = chunk.slice(rowOpen);
                consumed = rowEndPos;

                if (!headerDone) {
                    // ── Parse header row ──
                    const cells = extractCells(rowXml, sharedStrings);
                    for (const [letter, val] of cells) {
                        const clean = String(val).split(/\s+/).join(' ').trim();
                        colLetterToName[letter] = clean;
                        allHeaders.push(clean);
                        if (KEEP_COLUMNS.has(clean)) {
                            neededLetters[letter] = clean;
                            neededNames.push(clean);
                            columns[clean] = [];
                        }
                    }
                    headerDone = true;
                } else {
                    // ── Parse data row (only needed columns) ──
                    const vals = extractCells(rowXml, sharedStrings, neededLetters);
                    for (const name of neededNames) {
                        let v = vals.get(name);
                        // Convert Excel date serials for date columns
                        if (v !== undefined && DATE_COLUMNS.has(name) && typeof v === 'number') {
                            v = excelDateToJSDate(v);
                        }
                        columns[name].push(v !== undefined ? v : '');
                    }
                    rowCount++;

                    // Yield to UI every 10 000 rows
                    if (rowCount % 10000 === 0) {
                        const pct = totalRows > 0
                            ? Math.round(8 + (rowCount / totalRows) * 82)
                            : 50;
                        onProgress(
                            `Streaming rows: ${rowCount.toLocaleString()}` +
                            (totalRows ? ` / ${totalRows.toLocaleString()}` : '') + '...',
                            pct
                        );
                        await new Promise(r => setTimeout(r, 0));
                    }
                }
            }

            // Keep only the unprocessed tail
            if (consumed > 0) buf = buf.slice(consumed);

            // Stop once we've passed all sheet data
            if (buf.includes('</sheetData>') || done) break;
        }

        onProgress('Finalizing...', 92);
        return { columns, rowCount, allColumns: allHeaders };
    }

    /**
     * Extract cells from a single <row …>…</row> XML fragment.
     * @param {string}   rowXml        – the row XML
     * @param {string[]} sharedStrings – shared-string table
     * @param {Object}   [filter]      – if given, { colLetter: colName } — only extract these
     * @returns {Map|Array}  Map(colName→value) if filter, else Array of [letter, value]
     */
    function extractCells(rowXml, sharedStrings, filter) {
        const out = filter ? new Map() : [];

        // Match each <c …>…</c> or <c …/>
        const re = /<c\s([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
        let m;
        while ((m = re.exec(rowXml)) !== null) {
            const attrs = m[1];
            const body  = m[2] || '';

            // Cell reference  e.g. r="AB640667"  →  letters="AB"
            const rm = attrs.match(/r="([A-Z]+)\d+"/);
            if (!rm) continue;
            const letter = rm[1];

            if (filter && !(letter in filter)) continue;

            // Cell type
            const tm = attrs.match(/t="([^"]*)"/);
            const t  = tm ? tm[1] : '';

            // Raw <v> value
            const vm = body.match(/<v>([^<]*)<\/v>/);

            let value = '';
            if (t === 's' && vm) {
                value = sharedStrings[parseInt(vm[1])] ?? '';
            } else if (t === 'inlineStr') {
                const im = body.match(/<t[^>]*>([^<]*)<\/t>/);
                value = im ? xmlDecode(im[1]) : '';
            } else if (vm) {
                const n = parseFloat(vm[1]);
                value = isNaN(n) ? xmlDecode(vm[1]) : n;
            }

            if (filter) {
                out.set(filter[letter], value);
            } else {
                out.push([letter, value]);
            }
        }
        return out;
    }

    // ──────────────────────────────────────────────────────
    //  Validation
    // ──────────────────────────────────────────────────────

    function validateDataFast(data, sheetName) {
        const result = {
            valid: true, errors: [], warnings: [],
            columns: { required: [], optional: [], unknown: [], missing: [] },
            rowCount: data.rowCount, sheetName
        };
        if (data.rowCount === 0) { result.valid = false; result.errors.push('No data found'); return result; }

        const found = data.allColumns;
        REQUIRED_COLUMNS.forEach(c => {
            if (found.includes(c)) result.columns.required.push(c);
            else { result.columns.missing.push(c); result.valid = false; result.errors.push(`Missing required column: ${c}`); }
        });
        OPTIONAL_COLUMNS.forEach(c => { if (found.includes(c)) result.columns.optional.push(c); });
        found.forEach(c => { if (!REQUIRED_COLUMNS.includes(c) && !OPTIONAL_COLUMNS.includes(c)) result.columns.unknown.push(c); });

        if (sheetName !== 'Cost Code Detail Report') result.warnings.push(`Sheet "${sheetName}" used`);

        // Sample-based date/amount check
        const sampleSize = Math.min(1000, data.rowCount);
        let badDates = 0, badAmts = 0;
        const dates = data.columns['G/L Date'], amts = data.columns['Actual Amount'];
        if (dates && amts) {
            for (let i = 0; i < sampleSize; i++) {
                const d = dates[i];
                if (d && !(d instanceof Date) && isNaN(Date.parse(d))) badDates++;
                const a = amts[i];
                if (a !== '' && a !== undefined && typeof a !== 'number') {
                    if (isNaN(parseFloat(String(a).replace(AMOUNT_CLEAN_REGEX, '')))) badAmts++;
                }
            }
        }
        if (badDates > 0) result.warnings.push(`~${Math.round(badDates / sampleSize * data.rowCount).toLocaleString()} rows may have invalid dates`);
        if (badAmts > 0) result.warnings.push(`~${Math.round(badAmts / sampleSize * data.rowCount).toLocaleString()} rows may have non-numeric amounts`);
        if (result.columns.unknown.length > 0) result.warnings.push(`${result.columns.unknown.length} unrecognized columns ignored`);
        if (data.rowCount > 300000) result.warnings.push(`Large dataset (${data.rowCount.toLocaleString()} rows) — import may take 15-45 s`);

        return result;
    }

    // ──────────────────────────────────────────────────────
    //  Validation UI / Preview
    // ──────────────────────────────────────────────────────

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

        renderColumnTags('importRequiredCols', validationResult.columns.required, 'required');
        renderColumnTags('importRequiredCols', validationResult.columns.missing, 'missing', true);
        renderColumnTags('importOptionalCols', validationResult.columns.optional, 'optional');
        renderColumnTags('importUnknownCols', validationResult.columns.unknown, 'unknown');

        const issuesList = document.getElementById('importIssuesList');
        issuesList.innerHTML = '';
        validationResult.errors.forEach(err => {
            issuesList.innerHTML += `<li class="import-issue"><span class="import-issue-icon error">&#10005;</span><span class="import-issue-text">${escapeHtml(err)}</span></li>`;
        });
        validationResult.warnings.forEach(w => {
            issuesList.innerHTML += `<li class="import-issue"><span class="import-issue-icon warning">&#9888;</span><span class="import-issue-text">${escapeHtml(w)}</span></li>`;
        });

        renderPreviewFast();
        updateFooterInfo(`${validationResult.rowCount.toLocaleString()} rows found in "${validationResult.sheetName}"`);
    }

    function renderColumnTags(containerId, cols, type, append) {
        const el = document.getElementById(containerId);
        if (!append) el.innerHTML = '';
        cols.forEach(c => { el.innerHTML += `<span class="import-column-tag ${type}">${escapeHtml(c)}</span>`; });
    }

    function renderPreviewFast() {
        if (!parsedData || parsedData.rowCount === 0) return;
        const cols = REQUIRED_COLUMNS.filter(c => validationResult.columns.required.includes(c));
        const n = Math.min(5, parsedData.rowCount);
        document.getElementById('importPreviewHead').innerHTML =
            '<tr>' + cols.map(c => `<th>${escapeHtml(c)}</th>`).join('') + '</tr>';
        let body = '';
        for (let i = 0; i < n; i++) {
            body += '<tr>' + cols.map(c => `<td>${escapeHtml(String(parsedData.columns[c]?.[i] ?? ''))}</td>`).join('') + '</tr>';
        }
        document.getElementById('importPreviewBody').innerHTML = body;
        document.getElementById('importPreviewCount').textContent =
            `Showing first ${n} of ${parsedData.rowCount.toLocaleString()} rows`;
    }

    // ──────────────────────────────────────────────────────
    //  Import data processing (shared by both paths)
    // ──────────────────────────────────────────────────────

    function importData() {
        if (!parsedData || !validationResult.valid) return;
        showSection('processing');
        updateProgress('Preparing import...', 0);

        const startTime = performance.now();
        const totalRows = parsedData.rowCount;
        const batchSize = totalRows > 300000 ? 80000 : 20000;
        let currentRow = 0;

        const cols = parsedData.columns;
        const dates = cols['G/L Date'] || [];
        const amounts = cols['Actual Amount'] || [];
        const costTypes = cols['Cost Type'] || [];
        const jobs = cols['Job'] || [];
        const docTypes = cols['Document Type'] || [];
        const divNames = cols['Division Name'] || [];
        const jobTypes = cols['Job Type'] || [];
        const descriptions = cols['Description'] || [];
        const actualUnits = cols['Actual Units'] || [];
        // Additional filter columns
        const jobStatuses = cols['Job Status'] || [];
        const jobGroupings = cols['Job Groupings'] || [];
        const divNums = cols['Div #'] || [];
        const batchTypes = cols['Batch Type'] || [];
        const docCompanies = cols['Document Company'] || [];
        const costCodes = cols['Cost Code'] || [];
        const unitNumbers = cols['Unit Number'] || [];

        const processed = new Array(totalRows);
        let writeIdx = 0;

        function processBatch() {
            const end = Math.min(currentRow + batchSize, totalRows);
            for (let i = currentRow; i < end; i++) {
                const dt = docTypes[i];
                if (dt === 'Grand Total') continue;

                let amount = amounts[i];
                if (typeof amount !== 'number') amount = typeof amount === 'string' ? (parseFloat(amount.replace(AMOUNT_CLEAN_REGEX, '')) || 0) : 0;

                let dateStr = dates[i];
                if (dateStr instanceof Date) {
                    dateStr = `${dateStr.getFullYear()}-${String(dateStr.getMonth()+1).padStart(2,'0')}-${String(dateStr.getDate()).padStart(2,'0')}`;
                } else if (dateStr) {
                    const p = new Date(dateStr);
                    if (!isNaN(p)) dateStr = `${p.getFullYear()}-${String(p.getMonth()+1).padStart(2,'0')}-${String(p.getDate()).padStart(2,'0')}`;
                }

                const costType = costTypes[i] || '';
                const ctStr = String(costType);
                const ce = ctStr.indexOf(COST_CODE_SPLIT);
                const code = ce > 0 ? ctStr.substring(0, ce).trim() : ctStr.trim();

                let category;
                if (code.startsWith('61')) category = 'Labor Costs';
                else if (code.startsWith('62')) category = 'Travel & Per Diem';
                else if (code.startsWith('64')) category = 'Fleet & Materials';
                else if (code.startsWith('65')) category = 'Facilities & Services';
                else if (code.startsWith('67')) category = 'Equipment Costs';
                else if (code.startsWith('693')) category = 'Allocation Credits';
                else if (code.startsWith('69')) category = 'Other Allocations';
                else if (code.startsWith('71') || code.startsWith('72')) category = 'Corporate Overhead';
                else if (code.startsWith('73') || code.startsWith('74') || code.startsWith('75')) category = 'G&A & Other';
                else category = 'Other';

                const job = jobs[i];
                let deptCode = '';
                if (job != null && job !== '') {
                    const jn = typeof job === 'number' ? Math.floor(job) : parseInt(job, 10);
                    if (!isNaN(jn)) deptCode = String(jn).slice(-3);
                }
                const dn = DEPARTMENT_MAP[deptCode];
                const department = dn ? `${deptCode} - ${dn}` : (deptCode ? `Unknown (${deptCode})` : 'Unknown');
                const deptCategory = DEPARTMENT_CATEGORY_MAP[deptCode] || 'Other';

                let units = actualUnits[i];
                if (typeof units !== 'number') units = typeof units === 'string' ? (parseFloat(units.replace(AMOUNT_CLEAN_REGEX, '')) || 0) : 0;

                processed[writeIdx++] = {
                    'G/L Date': dateStr || '', 'Division Name': String(divNames[i] || ''),
                    'Job': job, 'Job Type': String(jobTypes[i] || ''), 'Cost Type': costType,
                    'Actual Amount': amount, 'Actual Units': units, 'Document Type': String(dt || ''),
                    'Description': String(descriptions[i] || ''), 'Category': category,
                    'Is_Allocation': code.startsWith('693'), 'Department': department, 'Dept_Category': deptCategory,
                    // Additional filter columns
                    'Job Status': String(jobStatuses[i] || ''), 'Job Groupings': String(jobGroupings[i] || ''),
                    'Div #': String(divNums[i] || ''), 'Batch Type': String(batchTypes[i] || ''),
                    'Document Company': String(docCompanies[i] || ''), 'Cost Code': String(costCodes[i] || ''),
                    'Unit Number': String(unitNumbers[i] || '')
                };
            }
            currentRow = end;
            const pct = Math.round((currentRow / totalRows) * 100);
            updateProgress(`Processing rows... ${currentRow.toLocaleString()} / ${totalRows.toLocaleString()} (${pct}%)`, pct);
            if (currentRow < totalRows) setTimeout(processBatch, 0);
            else { processed.length = writeIdx; parsedData = null; finishImport(processed, startTime); }
        }
        setTimeout(processBatch, 0);
    }

    function finishImport(processed, startTime) {
        updateProgress('Updating dashboard...', 95);
        rawData = processed;
        filteredData = rawData;
        filters = { startDate: null, endDate: null, jobType: 'all', deptCategories: [] };
        MULTISELECT_FILTERS.forEach(f => { filters[f.key] = []; });
        cachedMetrics = null;

        document.getElementById('startDate').value = '';
        document.getElementById('endDate').value = '';
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.chip-toggle').forEach(c => c.classList.remove('active'));
        const jt = document.getElementById('jobTypeToggle');
        if (jt) jt.querySelectorAll('.pill-btn').forEach(b => b.classList.toggle('active', b.dataset.value === 'all'));

        repopulateFilterOptions();
        updateMultiselectTriggers();
        updateDashboard();

        const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
        console.log(`Import completed in ${elapsed}s for ${processed.length.toLocaleString()} rows`);
        showSection('success');
        document.getElementById('importSuccessSubtitle').textContent = `${processed.length.toLocaleString()} records loaded in ${elapsed}s`;
        updateFooterInfo('Data imported — dashboard updated');
        setTimeout(() => ModalManager.close('importModal'), 2000);
    }

    function repopulateFilterOptions() {
        // Single-pass extraction using MULTISELECT_FILTERS config
        const fields = MULTISELECT_FILTERS.map(f => f.field);
        const numF = fields.length;
        const sets = [];
        for (let j = 0; j < numF; j++) sets.push(new Set());
        const deptCatSet = new Set();

        const len = rawData.length;
        for (let i = 0; i < len; i++) {
            const r = rawData[i];
            for (let j = 0; j < numF; j++) {
                const v = r[fields[j]];
                if (v != null && v !== '') sets[j].add(String(v));
            }
            if (r['Dept_Category']) deptCatSet.add(r['Dept_Category']);
        }

        for (let j = 0; j < numF; j++) {
            const f = MULTISELECT_FILTERS[j];
            const values = Array.from(sets[j]).sort();
            filterTotals[f.key] = values.length;
            populateMultiselect(document.getElementById(f.id + 'Options'), values, f.key);
        }

        const deptCategories = Array.from(deptCatSet).sort();
        filterTotals.deptCategories = deptCategories.length;
        const cc = document.getElementById('deptCategoryChips');
        if (cc) cc.innerHTML = deptCategories.map(c => `<button class="chip-toggle" data-value="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('');
    }

    function formatFileSize(b) {
        if (b < 1024) return b + ' B';
        if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
        return (b / 1048576).toFixed(1) + ' MB';
    }

    function removeFile() {
        resetState(); showSection('dropzone');
        updateFooterInfo('Select an Excel file with Cost Code Detail Report data');
        document.getElementById('importSubmitBtn').disabled = true;
    }

    // ──────────────────────────────────────────────────────
    //  Event listeners
    // ──────────────────────────────────────────────────────

    function init() {
        const dz = document.getElementById('importDropzone');
        const fi = document.getElementById('importFileInput');
        const bl = document.getElementById('importBrowseLink');
        dz?.addEventListener('click', () => fi?.click());
        bl?.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); fi?.click(); });
        fi?.addEventListener('change', e => { if (e.target.files?.length) handleFileSelect(e.target.files[0]); });
        dz?.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('dragover'); });
        dz?.addEventListener('dragleave', () => dz.classList.remove('dragover'));
        dz?.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('dragover'); if (e.dataTransfer?.files?.length) handleFileSelect(e.dataTransfer.files[0]); });
        document.getElementById('importFileRemove')?.addEventListener('click', removeFile);
        document.getElementById('importCancelBtn')?.addEventListener('click', () => ModalManager.close('importModal'));
        document.getElementById('importSubmitBtn')?.addEventListener('click', importData);
        document.getElementById('headerImportBtn')?.addEventListener('click', open);
    }

    return { open, init };
})();
