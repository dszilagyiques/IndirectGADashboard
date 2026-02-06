// === GLOBAL STATE ===

let rawData = [];
let filteredData = [];
let charts = {};
let trendView = 'summary';

let filters = {
    startDate: null,
    endDate: null,
    jobType: 'all',
    deptCategories: []
};

// Initialize all multiselect filter arrays from config
MULTISELECT_FILTERS.forEach(f => { filters[f.key] = []; });

// Drill-through state
const drill = {
    data: [],
    filtered: [],
    page: 1,
    pageSize: 100,
    sortCol: 'Actual Amount',
    sortDir: 'desc',
    search: ''
};
