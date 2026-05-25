'use strict';

const cfg = GAME_DATA.config;
const allDefects = GAME_DATA.defects;
const procedures = GAME_DATA.procedures;
const images = GAME_DATA.images;

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
  document.getElementById('problema-text').textContent = currentDefect.def_apparent_problem_monitor;
  document.getElementById('additional-text').textContent = currentDefect.aditional_information;

  // Update monitor thumbnail to reflect current defect
  const monImgId = currentDefect.id_image_monitor;
  const monImgPath = images[monImgId];
  if (monImgPath && !monImgPath.endsWith('.swf')) {
    document.getElementById('monitor-thumb').src = `Images/${monImgPath}`;
  } else {
    document.getElementById('monitor-thumb').src = 'Images/monitor.jpg';
  }

  renderParts();
}

function renderParts() {
  const hwRow = document.getElementById('hw-parts');
  const swRow = document.getElementById('sw-parts');
  hwRow.innerHTML = '';
  swRow.innerHTML = '';

  currentDefect.procedures.forEach(proc => {
    const globalProc = procedures[proc.proc_id];
    const isHardware = globalProc && globalProc.proc_is_hardware === 'true';
    const smallImg = globalProc ? globalProc.proc_small_image_path : null;

    const card = document.createElement('div');
    card.className = 'part-card';
    card.dataset.procId = proc.proc_id;
    card.title = proc.proc_label;

    card.innerHTML = `
      ${smallImg ? `<img src="Images/${smallImg}" alt="${proc.proc_label}" onerror="this.style.display='none'">` : ''}
      <span class="part-tip">${proc.proc_label}</span>
    `;

    card.addEventListener('click', () => onPartClick(proc.proc_id));

    if (isHardware) hwRow.appendChild(card);
    else swRow.appendChild(card);
  });
}

function onPartClick(procId) {
  if (usedProcedures.has(procId)) return;

  const proc = currentDefect.procedures.find(p => p.proc_id === procId);
  const globalProc = procedures[procId];
  const bigImg = globalProc && globalProc.proc_image_path
    ? `Images/${globalProc.proc_image_path}` : null;

  showPartDetail(proc, bigImg);
}

function showPartDetail(proc, imgPath) {
  const content = document.getElementById('modal-content');
  content.innerHTML = `
    <div class="modal-comp">
      ${imgPath ? `<img src="${imgPath}" alt="${proc.proc_label}" onerror="this.style.display='none'">` : ''}
      <h3>${proc.proc_label}</h3>
      <p class="proc-action">${proc.proc_text}</p>
      <div class="modal-btn-row">
        <button class="btn-confirm" id="btn-exec">EXECUTAR PROCEDIMENTO</button>
        <button class="btn-cancel" id="btn-cancel">CANCELAR</button>
      </div>
    </div>
  `;
  document.getElementById('btn-exec').onclick = () => executeProcedure(proc.proc_id);
  document.getElementById('btn-cancel').onclick = closeModal;
  openModal();
}

function executeProcedure(procId) {
  usedProcedures.add(procId);
  markUsed(procId);

  const proc = currentDefect.procedures.find(p => p.proc_id === procId);
  const isCorrect = procId === currentDefect.right_procedure_id;
  let delta = 0;

  if (isCorrect) {
    delta = cfg.conf_acquired_score_getright_proc;
    score += delta;
    markCorrect(procId);
  } else {
    delta = -proc.proc_loss_score;
    score = Math.max(0, score + delta);
  }

  document.getElementById('score-display').textContent = score.toLocaleString('pt-BR');
  showFeedback(proc, isCorrect, delta);
}

function showFeedback(proc, isCorrect, delta) {
  const badgeClass = isCorrect ? 'badge-correct' : 'badge-wrong';
  const badgeText = isCorrect ? '✓ PROCEDIMENTO CORRETO' : '✗ PROCEDIMENTO INCORRETO';
  const deltaText = delta > 0 ? `+${delta} pontos` : delta < 0 ? `${delta} pontos` : 'Sem alteração';
  const nextLabel = isCorrect
    ? (defectIndex + 1 < defectOrder.length ? 'PRÓXIMO DEFEITO →' : 'VER RESULTADO FINAL')
    : 'FECHAR';

  document.getElementById('modal-content').innerHTML = `
    <div class="modal-feedback">
      <span class="feedback-badge ${badgeClass}">${badgeText}</span>
      <p class="score-change ${delta >= 0 ? 'ok' : ''}">${deltaText}</p>
      <p class="feedback-text">${proc.proc_feedback}</p>
      <button class="btn-primary" id="btn-next" style="width:100%">${nextLabel}</button>
    </div>
  `;
  document.getElementById('btn-next').onclick = () => {
    closeModal();
    if (isCorrect) advance();
  };
  openModal();
}

function advance() {
  defectIndex++;
  if (defectIndex >= defectOrder.length) endGame();
  else loadDefect();
}

function endGame() {
  document.getElementById('final-score').textContent = score.toLocaleString('pt-BR');
  let msg = cfg.warning_1;
  if (score >= cfg.level_2) msg = cfg.warning_3;
  else if (score >= cfg.level_1) msg = cfg.warning_2;
  document.getElementById('end-message').textContent = msg;
  showScreen('screen-end');
}

function showComputerImage(type) {
  const imgId = type === 'monitor' ? currentDefect.id_image_monitor : currentDefect.id_image_cabinet;
  const desc  = type === 'monitor' ? currentDefect.def_apparent_problem_monitor : currentDefect.def_apparent_problem_cabinet;
  const title = type === 'monitor' ? 'MONITOR' : 'GABINETE';
  const imgPath = images[imgId];
  const isSWF = imgPath && imgPath.toLowerCase().endsWith('.swf');

  document.getElementById('modal-content').innerHTML = `
    <div class="modal-image-view">
      <h3>${title}</h3>
      ${isSWF
        ? `<div style="padding:20px;text-align:center;color:#aaa;border:1px solid #444;border-radius:4px">
             <p style="font-size:0.85rem">Animação Flash — não disponível no navegador.</p>
           </div>`
        : imgPath
          ? `<img src="Images/${imgPath}" alt="${title}">`
          : `<img src="Images/monitor_off.jpg" alt="Monitor">`
      }
      <p>${desc}</p>
    </div>
  `;
  openModal();
}

function markUsed(procId) {
  document.querySelector(`.part-card[data-proc-id="${procId}"]`)?.classList.add('used');
}
function markCorrect(procId) {
  const c = document.querySelector(`.part-card[data-proc-id="${procId}"]`);
  if (c) { c.classList.remove('used'); c.classList.add('correct'); }
}
function openModal()  { document.getElementById('modal-overlay').classList.remove('hidden'); }
function closeModal() { document.getElementById('modal-overlay').classList.add('hidden'); }

// Bindings
document.getElementById('btn-start').onclick   = startGame;
document.getElementById('btn-restart').onclick = startGame;
document.getElementById('modal-close').onclick  = closeModal;
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal();
});
document.getElementById('btn-monitor').onclick = () => showComputerImage('monitor');
document.getElementById('btn-cabinet').onclick = () => showComputerImage('cabinet');
