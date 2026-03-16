/**
 * SubsidyAI - レコメンド表示スクリプト
 * CSVから補助金データを読み込み、スコアリング・表示を行う
 */

// ===================================
// グローバル状態
// ===================================
let allSubsidies = [];
let userProfile = {};
let scoredSubsidies = [];
let currentTab = 'recommend';
let currentCategory = '全て';
let currentSort = 'score';
let searchQuery = '';
let notifications = {};

// ===================================
// デフォルトのデモプロフィール
// ===================================
const DEFAULT_PROFILE = {
  age: '35',
  gender: 'male',
  prefecture: '大阪府',
  city: '大阪市',
  household: 'child',
  income: '500',
  occupation: 'employee',
  employment: 'fulltime',
  childcare: 'true',
  nursing: 'false',
  disability: 'false',
  relocation: 'true',
  startup: 'false',
  housing: 'false',
  car: 'false',
  concerns: ['housing', 'childcare'],
  priorities: ['immediate', 'large_amount', 'easy'],
};

// ===================================
// CSVパーサー
// ===================================
function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = parseCSVRow(lines[0]);
  const result = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVRow(line);
    const obj = {};
    headers.forEach((header, idx) => {
      obj[header.trim()] = (values[idx] || '').trim();
    });
    result.push(obj);
  }

  return result;
}

function parseCSVRow(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// ===================================
// CSVの読み込み
// ===================================
async function loadSubsidies() {
  try {
    const response = await fetch('subsidies.csv');
    if (!response.ok) throw new Error('CSVの読み込みに失敗しました');
    const text = await response.text();
    return parseCSV(text);
  } catch (err) {
    console.error('CSVロードエラー:', err);
    return [];
  }
}

// ===================================
// ユーザープロフィールの読み込み
// ===================================
function loadUserProfile() {
  try {
    const saved = localStorage.getItem('userProfile');
    if (saved) {
      const parsed = JSON.parse(saved);
      // concernsとprioritiesが文字列の場合は配列に変換
      if (typeof parsed.concerns === 'string') {
        parsed.concerns = parsed.concerns ? parsed.concerns.split(',') : [];
      }
      if (typeof parsed.priorities === 'string') {
        parsed.priorities = parsed.priorities ? parsed.priorities.split(',') : [];
      }
      return parsed;
    }
  } catch (err) {
    console.error('プロフィール読み込みエラー:', err);
  }
  return { ...DEFAULT_PROFILE };
}

// ===================================
// スコアリングアルゴリズム
// ===================================
function scoreSubsidy(subsidy, profile) {
  let score = 0;

  // 年齢マッチ: 範囲内なら+15
  const age = parseInt(profile.age) || 35;
  const ageMin = parseInt(subsidy.target_age_min);
  const ageMax = parseInt(subsidy.target_age_max);
  if (age >= ageMin && age <= ageMax) score += 15;

  // 家族構成マッチ: target_familyにユーザーの世帯が含まれるか
  const family = subsidy.target_family.split('|');
  if (family.includes('all')) {
    score += 20;
  } else {
    if (profile.household === 'child' && family.includes('child')) score += 20;
    if (profile.household === 'couple' && family.includes('couple')) score += 10;
    if (profile.household === 'single' && family.includes('single')) score += 20;
    if (profile.household === 'elderly' && family.includes('elderly')) score += 20;
  }

  // 収入マッチ: 収入が上限以下なら+15
  const income = parseInt(profile.income) || 500;
  const maxIncome = parseInt(subsidy.target_income_max);
  if (maxIncome >= 9999 || income <= maxIncome) score += 15;

  // 地域マッチ: national+15, 都道府県一致+20, kansai+10
  if (subsidy.target_region === 'national') {
    score += 15;
  } else if (subsidy.target_region === 'osaka' && (profile.prefecture || '').includes('大阪')) {
    score += 20;
  } else if (subsidy.target_region === 'kansai') {
    score += 10;
  }

  // 条件マッチ: 該当条件ごとに+10
  const conditions = subsidy.target_conditions.split('|');
  if (profile.relocation === 'true' && conditions.includes('relocation')) score += 10;
  if (profile.startup === 'true' && conditions.includes('startup')) score += 10;
  if (profile.housing === 'true' && conditions.includes('housing_purchase')) score += 10;
  if (profile.nursing === 'true' && conditions.includes('nursing')) score += 10;
  if (profile.disability === 'true' && conditions.includes('disabled')) score += 10;
  if (profile.household === 'child' && conditions.includes('child')) score += 10;
  if (profile.household === 'elderly' && conditions.includes('elderly')) score += 10;

  // 悩みマッチ: 該当タグごとに+10
  const concerns = Array.isArray(profile.concerns) ? profile.concerns : [];
  if (concerns.includes('childcare') && subsidy.tags.includes('子育て')) score += 10;
  if (concerns.includes('housing') && subsidy.tags.includes('住宅')) score += 10;
  if (concerns.includes('education') && subsidy.tags.includes('教育')) score += 10;
  if (concerns.includes('nursing') && subsidy.tags.includes('介護')) score += 10;
  if (concerns.includes('employment') && subsidy.tags.includes('就業')) score += 10;
  if (concerns.includes('startup') && subsidy.tags.includes('起業')) score += 10;
  if (concerns.includes('relocation') && subsidy.tags.includes('移住')) score += 10;

  return Math.min(score, 100);
}

// ===================================
// カードレンダリング
// ===================================
function renderSubsidyCard(subsidy, score) {
  // スコアレベルの判定
  const scoreLevel = score >= 80 ? 'high' : score >= 60 ? 'medium' : 'low';
  const scoreColorClass = `match-score__circle--${scoreLevel}`;

  // 緊急度バッジ
  const urgencyMap = {
    high: { label: '緊急度：高', cls: 'badge--red pulse', dot: '🔴' },
    medium: { label: '緊急度：中', cls: 'badge--orange', dot: '🟡' },
    low: { label: '緊急度：低', cls: 'badge--gray', dot: '⚪' },
  };
  const urgencyInfo = urgencyMap[subsidy.urgency] || urgencyMap['low'];

  // カテゴリバッジ
  const categoryColors = {
    '子育て': 'badge--green',
    '住宅': 'badge--blue',
    '移住': 'badge--cyan',
    '起業': 'badge--orange',
    '就業': 'badge--navy',
    '介護': 'badge--gray',
    '教育': 'badge--green',
    '生活支援': 'badge--orange',
    '省エネ': 'badge--cyan',
  };
  const categories = subsidy.category.split('|');
  const categoryBadges = categories.map(cat => {
    const colorCls = categoryColors[cat.trim()] || 'badge--gray';
    return `<span class="badge ${colorCls}">${cat.trim()}</span>`;
  }).join('');

  // AIバッジ（スコア70以上）
  const aiBadge = score >= 70
    ? `<span class="ai-badge">✦ AIおすすめ</span>`
    : '';

  // 難易度インジケーター
  const difficultyMap = { low: 1, medium: 2, high: 3 };
  const difficultyLevel = difficultyMap[subsidy.difficulty] || 1;
  const difficultyLabel = { low: '簡単', medium: '普通', high: '複雑' }[subsidy.difficulty] || '普通';
  const dots = [1, 2, 3].map(i =>
    `<span class="difficulty-dot ${i <= difficultyLevel ? 'filled' : ''}"></span>`
  ).join('');

  // 地域ラベル
  const regionLabel = {
    national: '全国',
    osaka: '大阪府・市',
    kansai: '関西圏',
  }[subsidy.target_region] || '全国';

  // 条件タグ
  const conditionTagMap = {
    child: '子育て',
    couple: '夫婦',
    single: 'ひとり親',
    elderly: '高齢者',
    low_income: '低所得',
    relocation: '移住',
    startup: '起業',
    housing_purchase: '住宅購入',
    disabled: '障害者',
    nursing: '介護',
    employment: '就業',
    all: '全員',
  };
  const conditionTags = subsidy.target_conditions.split('|').map(c => {
    const label = conditionTagMap[c.trim()] || c.trim();
    return `<span class="card-condition-tag">${label}</span>`;
  }).join('');

  // 通知状態
  const isNotified = notifications[subsidy.id] || false;
  const bellIcon = isNotified ? '🔔' : '🔕';
  const bellLabel = isNotified ? '通知設定済み' : '通知を受け取る';
  const bellActiveCls = isNotified ? 'active' : '';

  return `
    <div class="subsidy-card" data-id="${subsidy.id}" data-urgency="${subsidy.urgency}" data-score="${score}" style="animation-delay: ${Math.random() * 0.3}s">
      <div class="card-header">
        <div class="card-header__info">
          <div class="card-header__name">${subsidy.subsidy_name}</div>
          <div class="card-header__badges">
            ${categoryBadges}
            <span class="badge ${urgencyInfo.cls}">${urgencyInfo.label}</span>
            ${aiBadge}
          </div>
        </div>
        <div class="card-header__score">
          <div class="match-score">
            <div class="match-score__circle ${scoreColorClass}">${score}</div>
            <div class="match-score__label">マッチ度</div>
          </div>
        </div>
      </div>

      <div class="card-body">
        <div class="card-amount">
          <span class="card-amount__label">支援額</span>
          <span class="card-amount__value">${subsidy.amount}</span>
        </div>

        <p class="card-summary">${subsidy.summary}</p>

        <div class="card-reason">
          <span class="card-reason__icon">✓</span>
          <span class="card-reason__text">${subsidy.reason}</span>
        </div>

        <div class="card-conditions">
          ${conditionTags}
        </div>

        <div class="card-meta">
          <div class="card-meta__item">
            <span>📍</span>
            <span>${regionLabel}</span>
          </div>
          <div class="card-difficulty">
            <span>申請難易度：</span>
            <div class="difficulty-dots">${dots}</div>
            <span>${difficultyLabel}</span>
          </div>
        </div>
      </div>

      <div class="card-footer">
        <div class="card-footer__left">
          <div class="card-meta__item" style="font-size: 0.75rem; color: var(--color-text-muted);">
            <span>🏷</span>
            <span>${subsidy.tags.split('|').join(' / ')}</span>
          </div>
        </div>
        <div class="card-footer__right">
          <button
            class="btn-icon ${bellActiveCls}"
            title="${bellLabel}"
            onclick="toggleNotification('${subsidy.id}', this)"
            aria-label="${bellLabel}"
          >${bellIcon}</button>
          <a href="${subsidy.official_url}" class="btn-outline btn-small" target="_blank" rel="noopener">
            公式サイト
          </a>
          <button class="btn-primary btn-small" onclick="showDetail('${subsidy.id}')">
            詳しく見る
          </button>
        </div>
      </div>
    </div>
  `;
}

// ===================================
// スケルトンカードのレンダリング
// ===================================
function renderSkeletonCards(count = 4) {
  return Array.from({ length: count }, () => `
    <div class="skeleton-card">
      <div class="skeleton skeleton-line skeleton-line--medium" style="margin-bottom: 8px;"></div>
      <div style="display:flex; gap: 8px; margin-bottom: 12px;">
        <div class="skeleton skeleton-line" style="width: 60px; height: 20px;"></div>
        <div class="skeleton skeleton-line" style="width: 80px; height: 20px;"></div>
      </div>
      <div class="skeleton skeleton-block" style="margin-bottom: 12px;"></div>
      <div class="skeleton skeleton-line skeleton-line--full" style="margin-bottom: 6px;"></div>
      <div class="skeleton skeleton-line skeleton-line--medium"></div>
    </div>
  `).join('');
}

// ===================================
// タブコンテンツのフィルタリング
// ===================================
function getTabSubsidies(tab) {
  let filtered;

  switch (tab) {
    case 'now':
      filtered = scoredSubsidies.filter(s => s.urgency === 'high' && s.score >= 20);
      break;
    case 'future':
      filtered = scoredSubsidies.filter(s =>
        (s.urgency === 'low' || s.recommendation_type === 'future') && s.score >= 20
      );
      break;
    case 'recommend':
    default:
      filtered = scoredSubsidies.filter(s => s.score >= 30);
      break;
  }

  return filtered;
}

// ===================================
// カテゴリフィルタリング
// ===================================
function filterByCategory(subsidies, category) {
  if (category === '全て') return subsidies;
  return subsidies.filter(s => s.category.includes(category));
}

// ===================================
// 検索フィルタリング
// ===================================
function filterBySearch(subsidies, query) {
  if (!query) return subsidies;
  const q = query.toLowerCase();
  return subsidies.filter(s =>
    s.subsidy_name.toLowerCase().includes(q) ||
    s.summary.toLowerCase().includes(q) ||
    s.tags.toLowerCase().includes(q) ||
    s.category.toLowerCase().includes(q)
  );
}

// ===================================
// ソート
// ===================================
function sortSubsidies(subsidies, sortKey) {
  const copy = [...subsidies];
  switch (sortKey) {
    case 'score':
      return copy.sort((a, b) => b.score - a.score);
    case 'amount':
      return copy.sort((a, b) => parseInt(b.amount_raw || 0) - parseInt(a.amount_raw || 0));
    case 'difficulty':
      const diffOrder = { low: 1, medium: 2, high: 3 };
      return copy.sort((a, b) => (diffOrder[a.difficulty] || 2) - (diffOrder[b.difficulty] || 2));
    case 'urgency':
      const urgOrder = { high: 1, medium: 2, low: 3 };
      return copy.sort((a, b) => (urgOrder[a.urgency] || 2) - (urgOrder[b.urgency] || 2));
    default:
      return copy;
  }
}

// ===================================
// タブコンテンツのレンダリング
// ===================================
function renderTabContent(tab) {
  let subsidies = getTabSubsidies(tab);
  subsidies = filterByCategory(subsidies, currentCategory);
  subsidies = filterBySearch(subsidies, searchQuery);
  subsidies = sortSubsidies(subsidies, currentSort);

  const tabIdMap = {
    recommend: 'tabRecommend',
    now: 'tabNow',
    future: 'tabFuture',
  };
  const containerId = tabIdMap[tab];
  const container = document.getElementById(containerId);
  if (!container) return;

  if (subsidies.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">🔍</div>
        <div class="empty-state__title">該当する制度が見つかりませんでした</div>
        <div class="empty-state__text">条件を変えて再度お試しください</div>
      </div>
    `;
    return;
  }

  container.innerHTML = `<div class="cards-list">${subsidies.map(s => renderSubsidyCard(s, s.score)).join('')}</div>`;
}

// ===================================
// 全タブのレンダリング
// ===================================
function renderAllTabs() {
  renderTabContent('recommend');
  renderTabContent('now');
  renderTabContent('future');
  updateTabCounts();
}

// ===================================
// タブカウントの更新
// ===================================
function updateTabCounts() {
  const nowCount = getTabSubsidies('now').length;
  const futureCount = getTabSubsidies('future').length;
  const recommendCount = getTabSubsidies('recommend').length;

  const nowBadge = document.getElementById('tabCountNow');
  const futureBadge = document.getElementById('tabCountFuture');
  const recommendBadge = document.getElementById('tabCountRecommend');

  if (nowBadge) nowBadge.textContent = nowCount;
  if (futureBadge) futureBadge.textContent = futureCount;
  if (recommendBadge) recommendBadge.textContent = recommendCount;
}

// ===================================
// 統計情報の更新
// ===================================
function updateStats() {
  const totalMatching = scoredSubsidies.filter(s => s.score >= 30).length;
  const canApplyNow = scoredSubsidies.filter(s => s.urgency === 'high' && s.score >= 20).length;
  const futureUse = scoredSubsidies.filter(s => s.urgency === 'low' && s.score >= 20).length;
  const topSubsidy = scoredSubsidies.length > 0
    ? scoredSubsidies.sort((a, b) => b.score - a.score)[0].subsidy_name
    : '該当なし';

  const statTotal = document.getElementById('statTotal');
  const statNow = document.getElementById('statNow');
  const statFuture = document.getElementById('statFuture');
  const statTop = document.getElementById('statTop');

  if (statTotal) statTotal.textContent = totalMatching;
  if (statNow) statNow.textContent = canApplyNow;
  if (statFuture) statFuture.textContent = futureUse;
  if (statTop) statTop.textContent = topSubsidy;
}

// ===================================
// プロフィールサマリーの表示
// ===================================
function renderProfileSummary() {
  const container = document.getElementById('profileSummary');
  if (!container) return;

  const genderLabel = { male: '男性', female: '女性', other: 'その他', noanswer: '回答しない' };
  const householdLabel = { single: '単身', couple: '夫婦', child: '子どもあり', elderly: '高齢者同居' };
  const occupationLabel = {
    employee: '会社員',
    civil: '公務員',
    freelance: '自営業・フリーランス',
    parttime: 'パート・アルバイト',
    unemployed: '無職',
    other: 'その他',
  };

  const tags = [];

  if (userProfile.age) tags.push(`${userProfile.age}歳`);
  if (userProfile.gender && genderLabel[userProfile.gender]) tags.push(genderLabel[userProfile.gender]);
  if (userProfile.prefecture) tags.push(userProfile.prefecture);
  if (userProfile.city) tags.push(userProfile.city);
  if (userProfile.household && householdLabel[userProfile.household]) tags.push(householdLabel[userProfile.household]);
  if (userProfile.income && userProfile.income !== '回答しない') tags.push(`年収${userProfile.income}万円台`);
  if (userProfile.occupation && occupationLabel[userProfile.occupation]) tags.push(occupationLabel[userProfile.occupation]);
  if (userProfile.childcare === 'true') tags.push('子育て中');
  if (userProfile.relocation === 'true') tags.push('移住予定');
  if (userProfile.nursing === 'true') tags.push('介護中');
  if (userProfile.housing === 'true') tags.push('住宅購入予定');
  if (userProfile.startup === 'true') tags.push('起業予定');

  const tagsHTML = tags.map(t => `<span class="profile-tag">${t}</span>`).join('');

  container.innerHTML = `
    <span class="profile-summary__label">あなたのプロフィール</span>
    <div class="profile-summary__tags">${tagsHTML}</div>
    <a href="index.html" class="btn-ghost btn-small" style="margin-left: auto;">
      ✏️ 編集
    </a>
  `;
}

// ===================================
// 通知トグル
// ===================================
window.toggleNotification = function (subsidyId, btn) {
  notifications[subsidyId] = !notifications[subsidyId];
  const isOn = notifications[subsidyId];
  btn.textContent = isOn ? '🔔' : '🔕';
  btn.classList.toggle('active', isOn);
  btn.title = isOn ? '通知設定済み' : '通知を受け取る';
  try {
    localStorage.setItem('subsidyNotifications', JSON.stringify(notifications));
  } catch (e) {}
};

// ===================================
// 詳細表示（デモ用）
// ===================================
window.showDetail = function (subsidyId) {
  const subsidy = allSubsidies.find(s => s.id === subsidyId);
  if (!subsidy) return;
  alert(`【${subsidy.subsidy_name}】\n\n${subsidy.summary}\n\n支援額: ${subsidy.amount}\n\n${subsidy.reason}`);
};

// ===================================
// タブ切り替え
// ===================================
function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      const tab = this.dataset.tab;
      if (!tab) return;

      currentTab = tab;

      // アクティブ状態の切り替え
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');

      // タブコンテンツの表示切り替え
      document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
      const tabIdMap = {
        recommend: 'tabRecommend',
        now: 'tabNow',
        future: 'tabFuture',
      };
      const activeContainer = document.getElementById(tabIdMap[tab]);
      if (activeContainer) activeContainer.style.display = 'block';
    });
  });
}

// ===================================
// カテゴリフィルターの設定
// ===================================
function setupCategoryFilter() {
  const filterContainer = document.getElementById('categoryFilter');
  if (!filterContainer) return;

  filterContainer.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', function () {
      currentCategory = this.dataset.category || '全て';

      filterContainer.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      this.classList.add('active');

      renderAllTabs();
    });
  });
}

// ===================================
// 検索入力の設定
// ===================================
function setupSearch() {
  const searchInput = document.getElementById('searchInput');
  if (!searchInput) return;

  let debounceTimer;
  searchInput.addEventListener('input', function () {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      searchQuery = this.value.trim();
      renderAllTabs();
    }, 300);
  });
}

// ===================================
// ソートセレクトの設定
// ===================================
function setupSort() {
  const sortSelect = document.getElementById('sortSelect');
  if (!sortSelect) return;

  sortSelect.addEventListener('change', function () {
    currentSort = this.value;
    renderAllTabs();
  });
}

// ===================================
// 通知バナーの設定
// ===================================
function setupNotificationBanner() {
  const banner = document.getElementById('notificationBanner');
  const closeBtn = document.getElementById('notificationBannerClose');
  const toggle = document.getElementById('globalNotificationToggle');
  const badge = document.getElementById('notificationSetBadge');

  if (closeBtn && banner) {
    closeBtn.addEventListener('click', () => {
      banner.style.display = 'none';
    });
  }

  if (toggle && badge) {
    toggle.addEventListener('change', function () {
      if (this.checked) {
        badge.style.display = 'inline-flex';
        badge.textContent = '設定済み';
      } else {
        badge.style.display = 'none';
      }
    });
  }
}

// ===================================
// ローディングオーバーレイの制御
// ===================================
function showLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    overlay.classList.remove('hidden');
  }
}

function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    overlay.classList.add('hidden');
    setTimeout(() => {
      overlay.style.display = 'none';
    }, 300);
  }
}

// ===================================
// 通知設定の読み込み
// ===================================
function loadNotifications() {
  try {
    const saved = localStorage.getItem('subsidyNotifications');
    if (saved) notifications = JSON.parse(saved);
  } catch (e) {}
}

// ===================================
// メイン初期化処理
// ===================================
async function init() {
  showLoading();
  loadNotifications();

  // プロフィール読み込み
  userProfile = loadUserProfile();

  // CSVデータ読み込み
  allSubsidies = await loadSubsidies();

  if (allSubsidies.length === 0) {
    hideLoading();
    document.getElementById('tabRecommend').innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">⚠️</div>
        <div class="empty-state__title">データの読み込みに失敗しました</div>
        <div class="empty-state__text">ページを再読み込みしてください</div>
      </div>
    `;
    return;
  }

  // スコアリング
  scoredSubsidies = allSubsidies.map(subsidy => ({
    ...subsidy,
    score: scoreSubsidy(subsidy, userProfile),
  }));

  // ローディング表示（最低800ms）
  await new Promise(resolve => setTimeout(resolve, 800));

  hideLoading();

  // UI更新
  renderProfileSummary();
  updateStats();
  setupTabs();
  setupCategoryFilter();
  setupSearch();
  setupSort();
  setupNotificationBanner();

  // 初期タブコンテンツのレンダリング
  renderAllTabs();

  // 最初のタブを表示
  document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
  const firstTab = document.getElementById('tabRecommend');
  if (firstTab) firstTab.style.display = 'block';
}

// ===================================
// DOMContentLoaded
// ===================================
document.addEventListener('DOMContentLoaded', init);
