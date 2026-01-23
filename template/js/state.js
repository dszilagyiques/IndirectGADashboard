// === GLOBAL STATE ===

let rawData = [];
let filteredData = [];
let charts = {};
let trendView = 'summary';
let trendTopN = 8;

let filters = {
    startDate: null,
    endDate: null,
    jobType: 'all',
    divisions: [],
    departments: [],
    deptCategories: [],
    categories: [],
    docTypes: []
};

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
