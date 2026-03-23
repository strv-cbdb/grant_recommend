/**
 * BenefitAI - 制度詳細表示スクリプト
 */

// ===================================
// CSVパーサー（recommend.js と同一）
// ===================================
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

function getCSVPath() {
  return window.innerWidth <= 768 ? 'subsidies_sp.csv' : 'subsidies.csv';
}

async function loadSubsidies() {
  try {
    const response = await fetch(getCSVPath());
    if (!response.ok) throw new Error('CSVの読み込みに失敗しました');
    return parseCSV(await response.text());
  } catch (err) {
    console.error('CSVロードエラー:', err);
    return [];
  }
}

// ===================================
// URLからIDを取得
// ===================================
function getIdFromURL() {
  return new URLSearchParams(window.location.search).get('id');
}

// ===================================
// 詳細ページのレンダリング
// ===================================
function renderDetail(subsidy) {
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
    '医療': 'badge--red',
  };

  const urgencyMap = {
    high: { label: 'おすすめ度：高', cls: 'badge--red pulse' },
    medium: { label: 'おすすめ度：中', cls: 'badge--orange' },
    low: { label: 'おすすめ度：低', cls: 'badge--gray' },
  };
  const urgencyInfo = urgencyMap[subsidy.urgency] || urgencyMap['low'];

  const regionLabel = {
    national: '全国',
    osaka: '大阪府・市',
    kansai: '関西圏',
  }[subsidy.target_region] || '全国';

  const difficultyLabel = {
    low: '簡単',
    medium: '普通',
    high: '複雑',
  }[subsidy.difficulty] || '普通';

  const categories = subsidy.category.split('|');
  const categoryBadges = categories.map(cat => {
    const colorCls = categoryColors[cat.trim()] || 'badge--gray';
    return `<span class="badge ${colorCls}">${cat.trim()}</span>`;
  }).join('');

  const tags = subsidy.tags.split('|').map(t =>
    `<span class="detail-tag">${t.trim()}</span>`
  ).join('');

  const hasOfficialUrl = subsidy.official_url && subsidy.official_url !== '#';

  const container = document.getElementById('detailContent');
  container.innerHTML = `
    <!-- 戻るボタン -->
    <div class="detail-back">
      <a href="index.html" class="btn-ghost btn-small">← 診断結果に戻る</a>
    </div>

    <!-- ヒーロー -->
    <div class="detail-hero">
      <div class="detail-hero__badges">
        ${categoryBadges}
        <span class="badge ${urgencyInfo.cls}">${urgencyInfo.label}</span>
      </div>
      <h1 class="detail-hero__title">${subsidy.subsidy_name}</h1>
      <p class="detail-hero__summary">${subsidy.summary}</p>
    </div>

    <!-- メインレイアウト -->
    <div class="detail-layout">

      <!-- 左：詳細情報 -->
      <div class="detail-main">

        <!-- 制度概要 -->
        <div class="detail-section">
          <h2 class="detail-section__title">制度概要</h2>
          <p class="detail-section__text">${subsidy.detail_description || subsidy.summary}</p>
        </div>

        <!-- 対象条件 -->
        <div class="detail-section">
          <h2 class="detail-section__title">対象条件</h2>
          <p class="detail-section__text">${subsidy.eligibility || '詳細は公式サイトをご確認ください。'}</p>
        </div>

        <!-- 申請情報 -->
        <div class="detail-section">
          <h2 class="detail-section__title">申請情報</h2>
          <div class="detail-info-grid">
            <div class="detail-info-item">
              <span class="detail-info-item__label">申請期間</span>
              <span class="detail-info-item__value">${subsidy.application_period || '公式サイトをご確認ください'}</span>
            </div>
            <div class="detail-info-item">
              <span class="detail-info-item__label">対象地域</span>
              <span class="detail-info-item__value">${regionLabel}</span>
            </div>
            <div class="detail-info-item detail-info-item--wide">
              <span class="detail-info-item__label">申請方法</span>
              <span class="detail-info-item__value">${subsidy.application_method || '公式サイトをご確認ください'}</span>
            </div>
            <div class="detail-info-item">
              <span class="detail-info-item__label">申請難易度</span>
              <span class="detail-info-item__value">${difficultyLabel}</span>
            </div>
          </div>
        </div>

        <!-- 関連タグ -->
        <div class="detail-section">
          <h2 class="detail-section__title">関連タグ</h2>
          <div class="detail-tags">${tags}</div>
        </div>

      </div>

      <!-- 右：アクションパネル -->
      <aside class="detail-sidebar">

        <!-- 支援額カード -->
        <div class="detail-action-card">
          <div class="detail-action-card__label">支援額</div>
          <div class="detail-action-card__amount">${subsidy.amount}</div>
          <div class="detail-action-card__reason">
            <span class="card-reason__icon">✓</span>
            <span>${subsidy.reason}</span>
          </div>
        </div>

        <!-- アクションボタン -->
        <div class="detail-actions">
          ${hasOfficialUrl
            ? `<a href="${subsidy.official_url}" class="btn-primary btn-primary--full" target="_blank" rel="noopener">公式サイトで確認する →</a>`
            : `<a href="#" class="btn-primary btn-primary--full">公式サイトを確認する</a>`
          }
          <a href="index.html" class="btn-outline detail-btn-back">← 診断結果に戻る</a>
        </div>

      </aside>
    </div>
  `;

  document.getElementById('detailContent').style.display = 'block';
}

// ===================================
// メイン初期化
// ===================================
async function init() {
  const id = getIdFromURL();

  if (!id) {
    window.location.href = 'index.html';
    return;
  }

  const subsidies = await loadSubsidies();
  const subsidy = subsidies.find(s => s.id === id);

  if (!subsidy) {
    document.getElementById('detailLoading').innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">⚠️</div>
        <div class="empty-state__title">制度情報が見つかりませんでした</div>
        <div class="empty-state__text">
          <a href="index.html" style="color: var(--color-secondary); text-decoration: underline;">診断結果に戻る</a>
        </div>
      </div>
    `;
    return;
  }

  document.title = `${subsidy.subsidy_name} | BenefitAI`;
  document.getElementById('detailLoading').style.display = 'none';
  renderDetail(subsidy);
}

document.addEventListener('DOMContentLoaded', init);
