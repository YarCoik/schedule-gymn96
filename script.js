const links = {
    main: "https://docs.google.com/document/d/1wJBD7NMTuwH4XcIiV5UuZmQ-7lyJB66W/export?format=html",
    changes: "https://docs.google.com/document/d/15_GMTlGH7J3LfqoA8PTMOyjrFHb8pAL-/export?format=html"
};

let currentTab = 'changes';
let htmlCache = { main: null, changes: null };
let isFetching = { main: false, changes: false };

// ТЕМЫ
const themes =['dark', 'light', 'cyber'];
let currentTheme = localStorage.getItem('yarcoik_theme') || 'dark';
if (!themes.includes(currentTheme)) currentTheme = 'dark';

function applyTheme(theme) {
    document.body.classList.remove('light-mode', 'dark-mode', 'cyber-mode');
    document.body.classList.add(`${theme}-mode`);
    const btn = document.getElementById('themeToggle');
    if (theme === 'light') btn.innerText = '☀️';
    else if (theme === 'dark') btn.innerText = '🌙';
    else btn.innerText = '👾'; 
    localStorage.setItem('yarcoik_theme', theme);
}

function toggleTheme() {
    let idx = themes.indexOf(currentTheme);
    currentTheme = themes[(idx + 1) % themes.length];
    applyTheme(currentTheme);
}
applyTheme(currentTheme);

// ТАЙМЕР-УБИЙЦА
async function fetchWithTimeout(resource, timeout = 3000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(resource, { signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
}

// КАСКАДНЫЙ ЗАГРУЗЧИК
async function fetchTabData(tab) {
    let autoHtml = "";
    let manualHtml = "";
    const targetUrl = links[tab];

    const proxyList =[
        `/api/proxy?url=${encodeURIComponent(targetUrl)}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`,
        `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
        `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`
    ];

    for (let i = 0; i < proxyList.length; i++) {
        try {
            const response = await fetchWithTimeout(proxyList[i], 3000);
            if (!response.ok) throw new Error('Bad status');

            if (proxyList[i].includes('allorigins')) {
                const data = await response.json();
                autoHtml = data.contents;
            } else {
                autoHtml = await response.text();
            }

            if (autoHtml && (autoHtml.includes('<table') || autoHtml.includes('<body'))) {
                console.log(`✅ Расписание загружено через прокси #${i + 1}`);
                break;
            }
        } catch (e) {
            console.warn(`⚠️ Прокси #${i + 1} недоступен. Ищем следующий...`);
        }
    }

    if (!autoHtml) throw new Error('Все серверы лежат.');

    if (tab === 'changes') {
        try {
            const manualRes = await fetchWithTimeout('/api/manual', 2000);
            if (manualRes.ok) manualHtml = await manualRes.text();
        } catch(e) { }
    }
    
    return manualHtml + autoHtml;
}

async function loadData(background = false) {
    const tabToLoad = currentTab;
    if (!background) {
        if (htmlCache[tabToLoad]) processAndRender(htmlCache[tabToLoad]);
        else document.getElementById('content').innerHTML = "<div style='padding:40px 20px; text-align:center; color: var(--accent); font-size: 16px; font-weight: bold;'>⏳ Подключение к расписанию...</div>";
    }

    if (isFetching[tabToLoad]) return;
    isFetching[tabToLoad] = true;

    try {
        const combinedHtml = await fetchTabData(tabToLoad);
        if (combinedHtml) {
            htmlCache[tabToLoad] = combinedHtml;
            if (currentTab === tabToLoad) processAndRender(combinedHtml);
        }
    } catch (e) {
        if (!htmlCache[tabToLoad]) document.getElementById('content').innerHTML = "<div class='announcement'>❌ Ошибка загрузки. Серверы перегружены, попробуйте обновить страницу.</div>";
    } finally {
        isFetching[tabToLoad] = false;
    }
}

function processAndRender(htmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    renderSmartSchedule(doc.body);
}

function normalizeTable(table) {
    const rows = Array.from(table.querySelectorAll('tr'));
    const matrix =[];
    rows.forEach((row, rIdx) => {
        if (!matrix[rIdx]) matrix[rIdx] =[];
        let cIdx = 0;
        Array.from(row.children).forEach(cell => {
            let safety = 0;
            while (matrix[rIdx][cIdx] && safety < 100) { cIdx++; safety++; }
            
            const rSpan = Math.min(50, Math.max(1, parseInt(cell.getAttribute('rowspan')) || 1));
            const cSpan = Math.min(50, Math.max(1, parseInt(cell.getAttribute('colspan')) || 1));
            
            cell.removeAttribute('rowspan');
            cell.removeAttribute('colspan');
            cell.setAttribute('data-col', cIdx);
            cell.setAttribute('data-orig-colspan', cSpan); 
            
            matrix[rIdx][cIdx] = cell;
            for (let c = 1; c < cSpan; c++) {
                const clone = cell.cloneNode(true);
                clone.setAttribute('data-col', cIdx + c);
                matrix[rIdx][cIdx + c] = clone;
            }
            for (let r = 1; r < rSpan; r++) {
                if (!matrix[rIdx + r]) matrix[rIdx + r] =[];
                const cloneDown = cell.cloneNode(true);
                cloneDown.setAttribute('data-col', cIdx);
                matrix[rIdx + r][cIdx] = cloneDown;
                for (let c = 1; c < cSpan; c++) {
                    const cloneCorner = cell.cloneNode(true);
                    cloneCorner.setAttribute('data-col', cIdx + c);
                    matrix[rIdx + r][cIdx + c] = cloneCorner;
                }
            }
            cIdx += cSpan;
        });
    });
    
    table.innerHTML = '';
    matrix.forEach(rowArr => {
        const tr = document.createElement('tr');
        rowArr.forEach(item => { if (item instanceof HTMLElement) tr.appendChild(item); });
        table.appendChild(tr);
    });
}

function renderSmartSchedule(body) {
    const container = document.getElementById('content');
    container.innerHTML = '';
    
    Array.from(body.children).forEach(el => {
        const tag = el.tagName.toLowerCase();
        const text = el.innerText.trim();
        if (!text) return;

        if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
            if (text.length > 500 && text.indexOf(' ') === -1) return; 
            const div = document.createElement('div');
            const lowerText = text.toLowerCase();
            if (lowerText.includes('!') || lowerText.includes('уроки по') || lowerText.includes('остальных')) {
                div.className = 'announcement';
            } else if (lowerText.includes('расписание') || /январ|феврал|март|апрел|ма|июн|июл|август|сентябр|октябр|ноябр|декабр/.test(lowerText) || lowerText.includes('замена')) {
                div.className = 'doc-title';
            } else { div.className = 'announcement'; }
            div.innerHTML = el.innerHTML;
            container.appendChild(div);
        }
        
        if (tag === 'table' || el.querySelector('table')) {
            const table = tag === 'table' ? el : el.querySelector('table');
            if (table.querySelectorAll('td').length < 6) return; 

            const card = document.createElement('div');
            card.className = 'day-card';
            
            const rows = Array.from(table.querySelectorAll('tr'));
            rows.forEach(row => {
                const cells = Array.from(row.children);
                if (cells.length === 1 && parseInt(cells[0].getAttribute('colspan') || 1) > 2) {
                    const rowText = row.innerText.trim();
                    if (rowText.length > 5 && !/\d[а-яa-z]/i.test(rowText)) {
                        const div = document.createElement('div');
                        div.className = 'announcement';
                        div.innerHTML = cells[0].innerHTML;
                        card.appendChild(div);
                        row.remove();
                    }
                }
            });

            normalizeTable(table); 
            const tContainer = document.createElement('div');
            tContainer.className = 'table-container';
            tContainer.appendChild(table);
            card.appendChild(tContainer);
            container.appendChild(card);
        }
    });

    applySmartFilter();
}

function applySmartFilter() {
    const searchInput = document.getElementById('classSearch');
    if (!searchInput) return;
    const inputVal = searchInput.value;
    const query = inputVal.toLowerCase().replace(/\s+/g, '');
    localStorage.setItem('yarcoik_class', inputVal);

    const exactMatchRegex = new RegExp(`(^|[^а-яёa-z0-9])${query}([^а-яёa-z0-9]|$)`, 'i');
    const isClassDeclaration = (text) => /^\s*\d{1,2}\s*[а-яёa-z]\s*(класс)?\s*$/i.test(text);
    
    const cards = document.querySelectorAll('.day-card');
    let anyCardVisible = false;

    cards.forEach(card => {
        const table = card.querySelector('table');
        if (!table) return;

        const rows = Array.from(table.querySelectorAll('tr'));
        let colActive = {}; 
        let visibleDataRows = 0;

        rows.forEach((row, rIdx) => {
            const cells = Array.from(row.children);
            let showRow = false;
            let rowHasTargetContent = false;
            let hasWideCell = false;

            cells.forEach(cell => {
                const colIdx = parseInt(cell.getAttribute('data-col'));
                const origColspan = parseInt(cell.getAttribute('data-orig-colspan') || 1);
                if (origColspan >= 3) hasWideCell = true;

                const rawText = cell.innerText.toLowerCase();
                const cleanText = rawText.replace(/\s+/g, '');

                if (colIdx > 1) {
                    if (query && exactMatchRegex.test(rawText)) {
                        colActive[colIdx] = true; 
                    } else if (isClassDeclaration(rawText)) {
                        colActive[colIdx] = false; 
                    }
                }

                if (!query) {
                    cell.style.display = '';
                    cell.classList.remove('found-cell');
                    if (colIdx > 1 && cleanText.length > 0) rowHasTargetContent = true;
                } else {
                    if (origColspan >= 3 || colIdx <= 1) {
                        cell.style.display = ''; 
                    } else {
                        if (colActive[colIdx]) {
                            cell.style.display = '';
                            if (exactMatchRegex.test(rawText)) cell.classList.add('found-cell');
                            else cell.classList.remove('found-cell');
                            
                            if (cleanText.replace(/[-_.]/g, '').length > 0) {
                                rowHasTargetContent = true;
                            }
                        } else {
                            cell.style.display = 'none'; 
                        }
                    }
                }
            });

            if (!query) {
                showRow = true;
                visibleDataRows++;
            } else {
                if (hasWideCell || rowHasTargetContent) {
                    showRow = true;
                    if (rowHasTargetContent) visibleDataRows++;
                }
            }
            row.style.display = showRow ? '' : 'none';
        });

        if (query && visibleDataRows === 0) {
            card.style.display = 'none';
        } else { 
            card.style.display = ''; 
            anyCardVisible = true;
        }
    });

    let emptyMsg = document.getElementById('empty-search-msg');
    if (query && !anyCardVisible && cards.length > 0) {
        if (!emptyMsg) {
            emptyMsg = document.createElement('div');
            emptyMsg.id = 'empty-search-msg';
            emptyMsg.className = 'announcement';
            emptyMsg.style.textAlign = 'center';
            document.getElementById('content').appendChild(emptyMsg);
        }
        emptyMsg.innerHTML = `Увы, для класса <b>${inputVal}</b> расписания не найдено 🎉`;
    } else if (emptyMsg) {
        emptyMsg.remove();
    }
}

function switchTab(tab) {
    if (currentTab === tab) return;
    currentTab = tab;
    document.querySelectorAll('.tab').forEach(t => {
        t.classList.toggle('active', t.innerText.toLowerCase().includes(tab === 'main' ? 'осн' : 'изм'));
    });
    loadData(false);
}

// Запуск после загрузки структуры
document.addEventListener('DOMContentLoaded', () => {
    const savedClass = localStorage.getItem('yarcoik_class');
    if (savedClass) {
        const sBox = document.getElementById('classSearch');
        if(sBox) sBox.value = savedClass;
    }
    loadData(false);
    setInterval(() => loadData(true), 120000); 
});
