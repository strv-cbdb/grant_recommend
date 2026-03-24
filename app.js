/**
 * 補助金レコメンド - 入力フォームスクリプト
 * ユーザープロフィールの収集とlocalStorageへの保存
 */

document.addEventListener('DOMContentLoaded', function () {
  // ===================================
  // デモ用プリセット値
  // ===================================
  const DEMO_PROFILE = {
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
    relocationRegion: 'tohoku',
    relocationOpenToOther: 'yes',
    startup: 'false',
    housing: 'false',
    car: 'false',
    concerns: ['housing', 'childcare'],
    priorities: ['immediate', 'large_amount', 'easy'],
  };

  // ===================================
  // フォームへのデモ値プリセット
  // ===================================
  function prefillForm() {
    // 年齢
    const ageInput = document.getElementById('age');
    if (ageInput) ageInput.value = DEMO_PROFILE.age;

    // 性別
    const genderRadio = document.querySelector(`input[name="gender"][value="${DEMO_PROFILE.gender}"]`);
    if (genderRadio) {
      genderRadio.checked = true;
      genderRadio.closest('.chip')?.classList.add('active');
    }

    // 都道府県
    const prefectureSelect = document.getElementById('prefecture');
    if (prefectureSelect) prefectureSelect.value = DEMO_PROFILE.prefecture;

    // 市区町村
    const cityInput = document.getElementById('city');
    if (cityInput) cityInput.value = DEMO_PROFILE.city;

    // 世帯構成
    const householdRadio = document.querySelector(`input[name="household"][value="${DEMO_PROFILE.household}"]`);
    if (householdRadio) {
      householdRadio.checked = true;
      householdRadio.closest('.chip')?.classList.add('active');
    }

    // 収入
    const incomeSelect = document.getElementById('income');
    if (incomeSelect) incomeSelect.value = DEMO_PROFILE.income;

    // 職業
    const occupationSelect = document.getElementById('occupation');
    if (occupationSelect) occupationSelect.value = DEMO_PROFILE.occupation;

    // 雇用形態
    const employmentRadio = document.querySelector(`input[name="employment"][value="${DEMO_PROFILE.employment}"]`);
    if (employmentRadio) {
      employmentRadio.checked = true;
      employmentRadio.closest('.chip')?.classList.add('active');
    }

    // トグルスイッチ
    const toggleIds = ['childcare', 'nursing', 'disability', 'relocation', 'startup', 'housing', 'car'];
    toggleIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.checked = DEMO_PROFILE[id] === 'true';
    });

    // 移住サブ質問のプリセット
    if (DEMO_PROFILE.relocation === 'true') {
      const subSection = document.getElementById('relocationSubQuestions');
      if (subSection) subSection.style.display = 'block';
    }
    if (DEMO_PROFILE.relocationRegion) {
      const regionRadio = document.querySelector(`input[name="relocationRegion"][value="${DEMO_PROFILE.relocationRegion}"]`);
      if (regionRadio) {
        regionRadio.checked = true;
        regionRadio.closest('.chip')?.classList.add('active');
      }
    }
    if (DEMO_PROFILE.relocationOpenToOther) {
      const otherRadio = document.querySelector(`input[name="relocationOpenToOther"][value="${DEMO_PROFILE.relocationOpenToOther}"]`);
      if (otherRadio) {
        otherRadio.checked = true;
        otherRadio.closest('.chip')?.classList.add('active');
      }
    }

    // 現在困っていること（チェックボックス）
    DEMO_PROFILE.concerns.forEach(val => {
      const el = document.querySelector(`input[name="concerns"][value="${val}"]`);
      if (el) {
        el.checked = true;
        el.closest('.chip')?.classList.add('active');
      }
    });

    // 重視する条件（チェックボックス）
    DEMO_PROFILE.priorities.forEach(val => {
      const el = document.querySelector(`input[name="priorities"][value="${val}"]`);
      if (el) {
        el.checked = true;
        el.closest('.chip')?.classList.add('active');
      }
    });
  }

  // ===================================
  // チップのクリックイベント設定
  // ===================================
  function setupChips() {
    // ラジオボタンチップ（単一選択）
    document.querySelectorAll('.chip-group--radio .chip').forEach(chip => {
      chip.addEventListener('click', function () {
        const input = this.querySelector('input[type="radio"]');
        if (input) {
          input.checked = true;
          // 同じグループ内のチップをリセット
          const groupName = input.name;
          document.querySelectorAll(`input[name="${groupName}"]`).forEach(r => {
            r.closest('.chip')?.classList.remove('active');
          });
          this.classList.add('active');
          input.dispatchEvent(new Event('change'));
          updateProgress();
          triggerInputAnimation(input);
        }
      });
    });

    // チェックボックスチップ（複数選択）
    document.querySelectorAll('.chip-group--checkbox .chip').forEach(chip => {
      chip.addEventListener('click', function () {
        const input = this.querySelector('input[type="checkbox"]');
        if (input) {
          input.checked = !input.checked;
          this.classList.toggle('active', input.checked);
          updateProgress();
        }
      });
    });
  }

  // ===================================
  // プログレスバーの更新
  // ===================================
  function updateProgress() {
    const requiredFields = [
      { id: 'age', type: 'input' },
      { name: 'gender', type: 'radio' },
      { id: 'prefecture', type: 'select' },
      { name: 'household', type: 'radio' },
      { id: 'income', type: 'select' },
      { id: 'occupation', type: 'select' },
      { name: 'employment', type: 'radio' },
    ];

    let filledCount = 0;

    requiredFields.forEach(field => {
      if (field.type === 'radio') {
        const checked = document.querySelector(`input[name="${field.name}"]:checked`);
        if (checked) filledCount++;
      } else if (field.type === 'input') {
        const el = document.getElementById(field.id);
        if (el && el.value.trim() !== '') filledCount++;
      } else if (field.type === 'select') {
        const el = document.getElementById(field.id);
        if (el && el.value !== '' && el.value !== '回答しない') filledCount++;
      }
    });

    const percentage = Math.round((filledCount / requiredFields.length) * 100);
    const progressFill = document.getElementById('progressFill');
    const progressPercent = document.getElementById('progressPercent');

    if (progressFill) {
      progressFill.style.width = percentage + '%';
    }
    if (progressPercent) {
      progressPercent.textContent = percentage + '%';
    }
  }

  // ===================================
  // 入力フィールドのフォーカスアニメーション
  // ===================================
  function triggerInputAnimation(el) {
    if (!el) return;
    el.style.transition = 'transform 0.15s ease';
    el.style.transform = 'scale(1.01)';
    setTimeout(() => {
      el.style.transform = 'scale(1)';
    }, 150);
  }

  // ===================================
  // フォームバリデーション
  // ===================================
  function validateForm() {
    const errors = [];

    const age = document.getElementById('age');
    if (!age || age.value.trim() === '') {
      errors.push({ el: age, message: '年齢を入力してください' });
    } else {
      const ageVal = parseInt(age.value);
      if (isNaN(ageVal) || ageVal < 1 || ageVal > 100) {
        errors.push({ el: age, message: '有効な年齢を入力してください（1〜100）' });
      }
    }

    const gender = document.querySelector('input[name="gender"]:checked');
    if (!gender) {
      const genderGroup = document.querySelector('.chip-group--gender');
      errors.push({ el: genderGroup, message: '性別を選択してください' });
    }

    const prefecture = document.getElementById('prefecture');
    if (!prefecture || prefecture.value === '') {
      errors.push({ el: prefecture, message: '都道府県を選択してください' });
    }

    const household = document.querySelector('input[name="household"]:checked');
    if (!household) {
      const householdGroup = document.querySelector('.chip-group--household');
      errors.push({ el: householdGroup, message: '世帯構成を選択してください' });
    }

    return errors;
  }

  // ===================================
  // 最初のエラーフィールドへスムーススクロール
  // ===================================
  function scrollToFirstError(errors) {
    if (errors.length === 0) return;
    const firstErrorEl = errors[0].el;
    if (firstErrorEl) {
      firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const formGroup = firstErrorEl.closest('.form-group');
      if (formGroup) formGroup.classList.add('has-error');
      setTimeout(() => {
        if (formGroup) formGroup.classList.remove('has-error');
      }, 3000);
    }
  }

  // ===================================
  // ユーザープロフィールの収集
  // ===================================
  function collectProfile() {
    const profile = {};

    // 基本情報
    const ageEl = document.getElementById('age');
    profile.age = ageEl ? ageEl.value : '';

    const genderEl = document.querySelector('input[name="gender"]:checked');
    profile.gender = genderEl ? genderEl.value : '';

    // 居住地
    const prefectureEl = document.getElementById('prefecture');
    profile.prefecture = prefectureEl ? prefectureEl.value : '';

    const cityEl = document.getElementById('city');
    profile.city = cityEl ? cityEl.value : '';

    // 世帯構成
    const householdEl = document.querySelector('input[name="household"]:checked');
    profile.household = householdEl ? householdEl.value : '';

    // 収入・職業
    const incomeEl = document.getElementById('income');
    profile.income = incomeEl ? incomeEl.value : '';

    const occupationEl = document.getElementById('occupation');
    profile.occupation = occupationEl ? occupationEl.value : '';

    const employmentEl = document.querySelector('input[name="employment"]:checked');
    profile.employment = employmentEl ? employmentEl.value : '';

    // トグルスイッチ
    ['childcare', 'nursing', 'disability', 'relocation', 'startup', 'housing', 'car'].forEach(id => {
      const el = document.getElementById(id);
      profile[id] = el ? String(el.checked) : 'false';
    });

    // 移住サブ質問（relocation ON時のみ収集）
    if (profile.relocation === 'true') {
      const regionEl = document.querySelector('input[name="relocationRegion"]:checked');
      profile.relocationRegion = regionEl ? regionEl.value : 'undecided';
      const otherEl = document.querySelector('input[name="relocationOpenToOther"]:checked');
      profile.relocationOpenToOther = otherEl ? otherEl.value : 'no';
    } else {
      profile.relocationRegion = '';
      profile.relocationOpenToOther = '';
    }

    // 現在困っていること
    const concernEls = document.querySelectorAll('input[name="concerns"]:checked');
    profile.concerns = Array.from(concernEls).map(el => el.value);

    // 重視する条件
    const priorityEls = document.querySelectorAll('input[name="priorities"]:checked');
    profile.priorities = Array.from(priorityEls).map(el => el.value);

    return profile;
  }

  // ===================================
  // ローディング状態の制御
  // ===================================
  function setLoadingState(loading) {
    const btn = document.getElementById('submitBtn');
    const btnText = document.getElementById('submitBtnText');
    const btnSpinner = document.getElementById('submitBtnSpinner');

    if (!btn) return;

    if (loading) {
      btn.disabled = true;
      if (btnText) btnText.textContent = '診断中...';
      if (btnSpinner) btnSpinner.style.display = 'inline-block';
    } else {
      btn.disabled = false;
      if (btnText) btnText.textContent = 'おすすめ制度を診断する →';
      if (btnSpinner) btnSpinner.style.display = 'none';
    }
  }

  // ===================================
  // フォーム送信ハンドラー
  // ===================================
  const form = document.getElementById('profileForm');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      // バリデーション
      const errors = validateForm();
      if (errors.length > 0) {
        scrollToFirstError(errors);
        return;
      }

      // プロフィール収集
      const profile = collectProfile();

      // localStorageに保存
      try {
        localStorage.setItem('userProfile', JSON.stringify(profile));
      } catch (err) {
        console.error('localStorage保存エラー:', err);
      }

      // ローディング状態に移行
      setLoadingState(true);

      // 1200ms後にrecommend.htmlへ遷移
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1200);
    });
  }

  // ===================================
  // 移住サブ質問の表示制御
  // ===================================
  function resetRelocationOpenToOther() {
    const group = document.getElementById('relocationOpenToOtherGroup');
    if (group) group.style.display = 'none';
    document.querySelectorAll('input[name="relocationOpenToOther"]').forEach(r => {
      r.checked = false;
      r.closest('.chip')?.classList.remove('active');
    });
  }

  function setupRelocationToggle() {
    const relocationCheckbox = document.getElementById('relocation');
    const subSection = document.getElementById('relocationSubQuestions');
    if (!relocationCheckbox || !subSection) return;

    relocationCheckbox.addEventListener('change', function () {
      const openToOtherGroup = document.getElementById('relocationOpenToOtherGroup');
      if (this.checked) {
        subSection.style.display = 'block';
        if (openToOtherGroup) openToOtherGroup.style.display = 'block';
      } else {
        subSection.style.display = 'none';
        // 非表示時はサブ質問の選択をリセット
        document.querySelectorAll('input[name="relocationRegion"]').forEach(r => {
          r.checked = false;
          r.closest('.chip')?.classList.remove('active');
        });
        resetRelocationOpenToOther();
      }
    });
  }

  // ===================================
  // 入力フィールドのリアルタイムイベント
  // ===================================
  function setupInputListeners() {
    // テキスト・数値・セレクトの変更時にプログレス更新
    document.querySelectorAll('input[type="text"], input[type="number"], select').forEach(el => {
      el.addEventListener('input', updateProgress);
      el.addEventListener('change', updateProgress);

      // フォーカスアニメーション
      el.addEventListener('focus', function () {
        this.closest('.form-group')?.classList.add('focused');
      });
      el.addEventListener('blur', function () {
        this.closest('.form-group')?.classList.remove('focused');
      });
    });
  }

  // ===================================
  // 初期化
  // ===================================
  prefillForm();
  setupChips();
  setupRelocationToggle();
  setupInputListeners();
  updateProgress();
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('./service-worker.js');
  });
}
