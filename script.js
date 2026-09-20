const messageInput = document.getElementById('messageInput');
const chunkSizeSelect = document.getElementById('chunkSizeSelect');
const sourceSelect = document.getElementById('sourceSelect');
const destinationSelect = document.getElementById('destinationSelect');
const nextBtn = document.getElementById('nextBtn');
const resetBtn = document.getElementById('resetBtn');
const autoBtn = document.getElementById('autoBtn');
const stage = document.getElementById('stage');
const stepTitle = document.getElementById('stepTitle');
const stepExplanation = document.getElementById('stepExplanation');
const currentStepBadge = document.getElementById('currentStepBadge');
const progressFill = document.getElementById('progressFill');
const movingPacket = document.getElementById('movingPacket');
const networkStatus = document.getElementById('networkStatus');
const sourceLabel = document.getElementById('sourceLabel');
const destinationLabel = document.getElementById('destinationLabel');

let currentStep = 0;
let autoRunning = false;
let packets = [];

const stepInfo = [
  {
    title: '元データ',
    text: 'まずは、送信したいデータ全体を確認します。'
  },
  {
    title: '元データを小さく分割',
    text: '大きなデータをそのまま送るのではなく、いくつかの小さなデータに分けます。'
  },
  {
    title: '各パケットにヘッダを付ける',
    text: 'データ部分だけでは宛先や順番が分からないので、通信に必要な情報をヘッダとして付けます。'
  },
  {
    title: 'ネットワーク上をパケットが移動',
    text: 'パケットは送信元からルータなどのネットワーク機器を通り、宛先へ届けられます。'
  },
  {
    title: '宛先で元のデータに戻す',
    text: '届いたパケットを番号順に並べ、データ部分をつなぎ合わせると元のデータに戻ります。'
  }
];

function splitMessage(message, size) {
  const chars = Array.from(message);
  const result = [];
  for (let i = 0; i < chars.length; i += size) {
    result.push(chars.slice(i, i + size).join(''));
  }
  return result;
}

function refreshPackets() {
  const message = messageInput.value || '（データが入力されていません）';
  const size = Number(chunkSizeSelect.value);
  packets = splitMessage(message, size).map((data, index, arr) => ({
    no: index + 1,
    total: arr.length,
    source: sourceSelect.value,
    destination: destinationSelect.value,
    data
  }));
  sourceLabel.textContent = sourceSelect.value;
  destinationLabel.textContent = destinationSelect.value;
}

function escapeHtml(text) {
  return text.replace(/[&<>'"]/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[c]));
}

function renderStep() {
  refreshPackets();
  currentStepBadge.textContent = currentStep;
  stepTitle.textContent = stepInfo[currentStep].title;
  stepExplanation.textContent = stepInfo[currentStep].text;
  progressFill.style.width = `${currentStep * 25}%`;

  document.querySelectorAll('.progress-item').forEach(item => {
    const step = Number(item.dataset.step);
    item.classList.toggle('active', step === currentStep);
    item.classList.toggle('done', step < currentStep);
  });

  if (currentStep === 0) renderRaw();
  if (currentStep === 1) renderSplit();
  if (currentStep === 2) renderHeaders();
  if (currentStep === 3) renderCommunication();
  if (currentStep === 4) renderReassembled();

  nextBtn.textContent = currentStep === 4 ? '最初に戻る' : '次へ進む';
}

function renderRaw() {
  const message = escapeHtml(messageInput.value || '（データが入力されていません）');
  stage.innerHTML = `
    <div class="raw-data-card flash">
      <div class="card-label">元データ</div>
      <div class="raw-message">${message}</div>
      <div class="raw-meta">文字数：${Array.from(messageInput.value).length}文字 ／ 送信元：${sourceSelect.value} ／ 宛先：${destinationSelect.value}</div>
    </div>
  `;
  movingPacket.classList.add('hidden');
  networkStatus.textContent = 'まだ通信は始まっていません。まずは送るデータを確認します。';
}

function renderSplit() {
  stage.innerHTML = `
    <div class="packet-list">
      ${packets.map(p => `
        <div class="packet flash">
          <div class="packet-number">分割 ${p.no}</div>
          <div class="packet-body">
            <strong>データ部分</strong>
            <div class="packet-data">${escapeHtml(p.data)}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
  movingPacket.classList.add('hidden');
  networkStatus.textContent = `元データを ${packets.length} 個に分割しました。`;
}

function renderHeaders() {
  stage.innerHTML = `
    <div class="packet-list">
      ${packets.map(p => `
        <div class="packet-with-header flash">
          <div class="header-box">
            <b>ヘッダ</b>
            <div class="header-lines">
              送信元：${p.source}<br>
              宛先：${p.destination}<br>
              パケット番号：${p.no}/${p.total}
            </div>
          </div>
          <div class="data-box">
            <b>データ部分</b>
            <div class="packet-data">${escapeHtml(p.data)}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
  movingPacket.classList.add('hidden');
  networkStatus.textContent = '各データに、通信に必要なヘッダ情報を付けました。';
}

async function renderCommunication() {
  stage.innerHTML = `
    <div class="packet-list">
      ${packets.map(p => `
        <div class="packet-with-header">
          <div class="header-box">
            <b>ヘッダ</b>
            <div class="header-lines">${p.source} → ${p.destination}<br>番号：${p.no}/${p.total}</div>
          </div>
          <div class="data-box">
            <b>データ部分</b>
            <div class="packet-data">${escapeHtml(p.data)}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  await animateNetwork();
}

async function animateNetwork() {
  movingPacket.classList.remove('hidden');
  const points = ['6%', '34%', '62%', '90%'];

  for (const packet of packets) {
    movingPacket.textContent = `P${packet.no}`;
    networkStatus.textContent = `パケット ${packet.no}/${packet.total} を送信中…`;
    for (let i = 0; i < points.length; i++) {
      movingPacket.style.left = points[i];
      if (i === 0) networkStatus.textContent = `P${packet.no}: ${packet.source} から送信`;
      if (i === 1) networkStatus.textContent = `P${packet.no}: ルータ1を通過`;
      if (i === 2) networkStatus.textContent = `P${packet.no}: ルータ2を通過`;
      if (i === 3) networkStatus.textContent = `P${packet.no}: ${packet.destination} に到着`;
      await wait(700);
    }
    await wait(220);
  }
  networkStatus.textContent = `すべてのパケット（${packets.length}個）が宛先に届きました。`;
}

function renderReassembled() {
  const rebuilt = packets.map(p => p.data).join('');
  stage.innerHTML = `
    <div class="reassembled flash">
      <h3>再構成されたデータ</h3>
      <div class="reassembled-message">${escapeHtml(rebuilt)}</div>
      <div class="match">✓ パケット番号の順に並べると、元データに戻りました。</div>
    </div>
  `;
  movingPacket.classList.add('hidden');
  networkStatus.textContent = '通信完了。宛先側でパケットを番号順に並べ、元のデータを復元しました。';
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

nextBtn.addEventListener('click', async () => {
  if (autoRunning) return;
  if (currentStep === 4) {
    currentStep = 0;
  } else {
    currentStep++;
  }
  renderStep();
});

resetBtn.addEventListener('click', () => {
  if (autoRunning) return;
  currentStep = 0;
  renderStep();
});

autoBtn.addEventListener('click', async () => {
  if (autoRunning) return;
  autoRunning = true;
  nextBtn.disabled = true;
  resetBtn.disabled = true;
  autoBtn.disabled = true;

  currentStep = 0;
  renderStep();
  await wait(900);

  for (let step = 1; step <= 4; step++) {
    currentStep = step;
    renderStep();
    await wait(step === 3 ? Math.max(1600, packets.length * 3000) : 1200);
  }

  autoRunning = false;
  nextBtn.disabled = false;
  resetBtn.disabled = false;
  autoBtn.disabled = false;
});

[messageInput, chunkSizeSelect, sourceSelect, destinationSelect].forEach(el => {
  el.addEventListener('input', () => {
    if (!autoRunning) renderStep();
  });
  el.addEventListener('change', () => {
    if (sourceSelect.value === destinationSelect.value) {
      destinationSelect.value = sourceSelect.value === 'PC-A' ? 'PC-B' : 'PC-A';
    }
    if (!autoRunning) renderStep();
  });
});

renderStep();
