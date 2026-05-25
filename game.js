'use strict';

const cfg = GAME_DATA.config;
const allDefects = GAME_DATA.defects;
const procedures = GAME_DATA.procedures;
const images = GAME_DATA.images;

// Shuffle defects so order varies each game
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let score, defectIndex, defectOrder, currentDefect, usedProcedures;

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function startGame() {
  score = cfg.conf_inicial_score;
  defectIndex = 0;
  defectOrder = shuffle(allDefects);
  loadDefect();
  showScreen('screen-game');
}

function loadDefect() {
  currentDefect = defectOrder[defectIndex];
  usedProcedures = new Set();

  document.getElementById('defect-num').textContent = defectIndex + 1;
  document.getElementById('score-display').textContent = score.toLocaleString('pt-BR');
  document.getElementById('symptoms-text').textContent = currentDefect.symptoms;
  document.getElementById('additional-text').textContent = currentDefect.aditional_information;

  renderComponents();
}

function renderComponents() {
  const hwGrid = document.getElementById('components-hardware');
  const swGrid = document.getElementById('components-software');
  hwGrid.innerHTML = '';
  swGrid.innerHTML = '';

  currentDefect.procedures.forEach(proc => {
    const globalProc = procedures[proc.proc_id];
    const isHardware = globalProc && globalProc.proc_is_hardware === 'true';
    const imgPath = globalProc
      ? (isHardware ? globalProc.proc_small_image_path : globalProc.proc_small_image_path)
      : null;

    const card = document.createElement('div');
    card.className = 'component-card';
    card.dataset.procId = proc.proc_id;

    card.innerHTML = `
      ${imgPath ? `<img src="Images/${imgPath}" alt="${proc.proc_label}" onerror="this.style.display='none'">` : ''}
      <span>${proc.proc_label}</span>
    `;

    card.addEventListener('click', () => onComponentClick(proc.proc_id));

    if (isHardware) hwGrid.appendChild(card);
    else swGrid.appendChild(card);
  });
}

function onComponentClick(procId) {
  if (usedProcedures.has(procId)) return;

  const proc = currentDefect.procedures.find(p => p.proc_id === procId);
  const globalProc = procedures[procId];
  const imgPath = globalProc && globalProc.proc_image_path ? `Images/${globalProc.proc_image_path}` : null;

  showComponentDetail(proc, imgPath);
}

function showComponentDetail(proc, imgPath) {
  const content = document.getElementById('modal-content');
  content.innerHTML = `
    <div class="modal-comp">
      ${imgPath ? `<img src="${imgPath}" alt="${proc.proc_label}" onerror="this.style.display='none'">` : ''}
      <h3>${proc.proc_label}</h3>
      <p class="proc-action">${proc.proc_text}</p>
      <div class="modal-btn-row">
        <button class="btn-confirm" id="btn-exec-proc">EXECUTAR PROCEDIMENTO</button>
        <button class="btn-cancel" id="btn-cancel-proc">CANCELAR</button>
      </div>
    </div>
  `;

  document.getElementById('btn-exec-proc').addEventListener('click', () => {
    executeProcedure(proc.proc_id);
  });
  document.getElementById('btn-cancel-proc').addEventListener('click', closeModal);

  openModal();
}

function executeProcedure(procId) {
  usedProcedures.add(procId);
  markCardUsed(procId);

  const proc = currentDefect.procedures.find(p => p.proc_id === procId);
  const isCorrect = procId === currentDefect.right_procedure_id;
  let pointsChange = 0;

  if (isCorrect) {
    pointsChange = cfg.conf_acquired_score_getright_proc;
    score += pointsChange;
    markCardCorrect(procId);
  } else {
    pointsChange = -proc.proc_loss_score;
    score = Math.max(0, score + pointsChange);
  }

  document.getElementById('score-display').textContent = score.toLocaleString('pt-BR');

  showFeedback(proc, isCorrect, pointsChange);
}

function showFeedback(proc, isCorrect, pointsChange) {
  const content = document.getElementById('modal-content');
  const badgeClass = isCorrect ? 'badge-correct' : 'badge-wrong';
  const badgeText = isCorrect ? '✓ PROCEDIMENTO CORRETO' : '✗ PROCEDIMENTO INCORRETO';
  const changeClass = pointsChange >= 0 ? 'ok' : '';
  const changeText = pointsChange > 0
    ? `+${pointsChange} pontos`
    : pointsChange < 0
    ? `${pointsChange} pontos`
    : 'Sem alteração de pontos';

  const nextBtnLabel = isCorrect
    ? (defectIndex + 1 < allDefects.length ? 'PRÓXIMO DEFEITO →' : 'VER RESULTADO FINAL')
    : 'FECHAR';

  content.innerHTML = `
    <div class="modal-feedback">
      <span class="feedback-badge ${badgeClass}">${badgeText}</span>
      <p class="score-change ${changeClass}">${changeText}</p>
      <p class="feedback-text">${proc.proc_feedback}</p>
      <button class="btn-primary" id="btn-next-action" style="width:100%">${nextBtnLabel}</button>
    </div>
  `;

  document.getElementById('btn-next-action').addEventListener('click', () => {
    closeModal();
    if (isCorrect) advanceDefect();
  });

  openModal();
}

function advanceDefect() {
  defectIndex++;
  if (defectIndex >= allDefects.length) {
    endGame();
  } else {
    loadDefect();
  }
}

function endGame() {
  document.getElementById('final-score').textContent = score.toLocaleString('pt-BR');

  let message = cfg.warning_1;
  if (score >= cfg.level_2) message = cfg.warning_3;
  else if (score >= cfg.level_1) message = cfg.warning_2;
  document.getElementById('end-message').textContent = message;

  showScreen('screen-end');
}

function showComputerImage(type) {
  const imgId = type === 'monitor' ? currentDefect.id_image_monitor : currentDefect.id_image_cabinet;
  const description = type === 'monitor'
    ? currentDefect.def_apparent_problem_monitor
    : currentDefect.def_apparent_problem_cabinet;
  const title = type === 'monitor' ? 'MONITOR' : 'GABINETE';

  const imgPath = images[imgId];
  const isSWF = imgPath && imgPath.toLowerCase().endsWith('.swf');

  const content = document.getElementById('modal-content');
  content.innerHTML = `
    <div class="modal-image-view">
      <h3>${title}</h3>
      ${isSWF
        ? `<div style="background:#0a0a1a;border-radius:6px;padding:24px;text-align:center;color:#e94560;border:1px solid #2a3560">
             <p style="font-size:2rem;margin-bottom:8px">⚠</p>
             <p style="font-size:0.85rem">Animação Flash (SWF) não suportada no navegador.</p>
           </div>`
        : imgPath
          ? `<img src="Images/${imgPath}" alt="${title}" onerror="this.parentElement.innerHTML='<p style=color:#e94560>Imagem não disponível.</p>'">`
          : `<p style="color:#e94560">Sem imagem disponível.</p>`
      }
      <p>${description}</p>
    </div>
  `;
  openModal();
}

function markCardUsed(procId) {
  const card = document.querySelector(`.component-card[data-proc-id="${procId}"]`);
  if (card) card.classList.add('used');
}

function markCardCorrect(procId) {
  const card = document.querySelector(`.component-card[data-proc-id="${procId}"]`);
  if (card) { card.classList.remove('used'); card.classList.add('correct'); }
}

function openModal() {
  document.getElementById('modal-overlay').classList.remove('hidden');
}
function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`components-${tab.dataset.tab}`).classList.add('active');
  });
});

// Event bindings
document.getElementById('btn-start').addEventListener('click', startGame);
document.getElementById('btn-restart').addEventListener('click', startGame);
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal();
});
document.getElementById('btn-monitor').addEventListener('click', () => showComputerImage('monitor'));
document.getElementById('btn-cabinet').addEventListener('click', () => showComputerImage('cabinet'));
