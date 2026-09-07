const STORAGE_KEY = 'vivero-plant-list-v1';
const SYNC_URL = new URLSearchParams(location.search).get('sync');
const SYNC_ENDPOINT = SYNC_URL || (location.protocol.startsWith('http') ? '/api/entries' : null);
const boxRules = { 'M8.5': 35, 'M10.5': 24, M12: 20, M15: 15 };

let entries = loadEntries();
let activeTab = 'pending';

const form = document.querySelector('#plantForm');
const pot = document.querySelector('#pot');
const boxes = document.querySelector('#boxes');
const unitsPerBox = document.querySelector('#unitsPerBox');
const unitsPerBoxField = document.querySelector('#unitsPerBoxField');
const quantity = document.querySelector('#quantity');
const manualQuantityInput = document.querySelector('#manualQuantityInput');
const boxControls = document.querySelector('#boxControls');
const manualQuantity = document.querySelector('#manualQuantity');
const listContainer = document.querySelector('#listContainer');
const pendingCount = document.querySelector('#pendingCount');
const doneCount = document.querySelector('#doneCount');
const syncStatus = document.querySelector('#syncStatus');
const syncIndicator = document.querySelector('#syncIndicator');
const entryPanel = document.querySelector('.entry-panel');
const toggleFormButton = document.querySelector('#toggleFormButton');

for (let greenhouse = 1; greenhouse <= 9; greenhouse += 1) {
  document.querySelector('#greenhouse').insertAdjacentHTML('beforeend', `<option value="${greenhouse}">Invernadero ${greenhouse}</option>`);
}

function loadEntries() {
  try { return JSON.parse(window.localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function saveEntries() {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch { /* Continue with the shared server when storage is unavailable. */ }
  setStatus('Guardado en este dispositivo');
  pushToServer();
}

function setStatus(message, syncing = false) {
  syncStatus.textContent = message;
  syncIndicator.classList.toggle('syncing', syncing);
}

function createEntryId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
  return `entry-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function setFormVisibility(isVisible) {
  entryPanel.classList.toggle('form-collapsed', !isVisible);
  form.hidden = !isVisible;
  toggleFormButton.setAttribute('aria-expanded', String(isVisible));
  toggleFormButton.title = isVisible ? 'Ocultar formulario' : 'Mostrar formulario';
  toggleFormButton.textContent = isVisible ? 'Ocultar formulario' : 'Añadir planta';
  try { window.localStorage.setItem('vivero-form-visible', String(isVisible)); } catch { /* Keep the control usable without local storage. */ }
}

function updateQuantityMode() {
  const usesBoxes = Object.prototype.hasOwnProperty.call(boxRules, pot.value);
  boxControls.hidden = !usesBoxes;
  manualQuantity.hidden = usesBoxes;
  unitsPerBoxField.hidden = pot.value !== 'M15';
  if (usesBoxes) updateBoxQuantity();
}

function updateBoxQuantity() {
  const units = pot.value === 'M15' ? Number(unitsPerBox.value) : boxRules[pot.value];
  quantity.value = Math.max(1, Math.round(Number(boxes.value || 0) * units));
}

function render() {
  const pending = entries.filter((entry) => !entry.done);
  const done = entries.filter((entry) => entry.done);
  const visible = activeTab === 'pending' ? pending : done;
  pendingCount.textContent = pending.length;
  doneCount.textContent = done.length;
  listContainer.innerHTML = '';

  if (!visible.length) {
    listContainer.innerHTML = `<div class="empty-state"><strong>${activeTab === 'pending' ? 'Todo despejado' : 'Aún no hay listas'}</strong>${activeTab === 'pending' ? 'Añade una planta para empezar el turno.' : 'Las plantas marcadas como listas aparecerán aquí.'}</div>`;
    return;
  }

  const grouped = visible.reduce((groups, entry) => {
    (groups[entry.greenhouse] ||= []).push(entry);
    return groups;
  }, {});

  Object.keys(grouped).sort((a, b) => Number(a) - Number(b)).forEach((greenhouse) => {
    const group = document.createElement('section');
    group.className = 'greenhouse-group';
    group.innerHTML = `<h3 class="group-title">Invernadero ${greenhouse}</h3>`;
    grouped[greenhouse].sort((a, b) => a.plant.localeCompare(b.plant, 'es')).forEach((entry) => group.appendChild(createCard(entry)));
    listContainer.appendChild(group);
  });
}

function createCard(entry) {
  const card = document.createElement('article');
  card.className = 'plant-card';
  card.innerHTML = `<div><div class="plant-name"></div><div class="plant-meta"><span class="meta-pill"></span><span class="quantity-label"></span></div><div class="note"></div></div><div class="card-actions"><button class="action-button done" type="button" title="${entry.done ? 'Marcar como pendiente' : 'Marcar como lista'}">${entry.done ? '↶' : '✓'}</button><button class="action-button delete" type="button" title="Eliminar">×</button></div>`;
  card.querySelector('.plant-name').textContent = entry.plant;
  card.querySelector('.meta-pill').textContent = entry.pot;
  card.querySelector('.quantity-label').textContent = `${entry.quantity} ${entry.quantity === 1 ? 'planta' : 'plantas'}`;
  card.querySelector('.note').textContent = entry.note ? entry.note : '';
  card.querySelector('.done').addEventListener('click', () => toggleDone(entry.id));
  card.querySelector('.delete').addEventListener('click', () => removeEntry(entry.id));
  return card;
}

function addEntry(event) {
  event.preventDefault();
  const plant = document.querySelector('#plantName').value.trim();
  const greenhouse = document.querySelector('#greenhouse').value;
  const selectedQuantity = Number(Object.prototype.hasOwnProperty.call(boxRules, pot.value) ? quantity.value : manualQuantityInput.value);
  const note = document.querySelector('#notes').value.trim();
  const existing = entries.find((entry) => !entry.done && entry.plant.toLocaleLowerCase() === plant.toLocaleLowerCase() && entry.pot === pot.value && entry.greenhouse === greenhouse && entry.note === note);

  if (existing) existing.quantity += selectedQuantity;
  else entries.push({ id: createEntryId(), plant, pot: pot.value, greenhouse, quantity: selectedQuantity, note, done: false });
  saveEntries();
  form.reset();
  boxes.value = '0.5';
  manualQuantityInput.value = '1';
  quantity.value = pot.value === 'M15' ? '7.5' : String(boxRules[pot.value] / 2);
  render();
}

function toggleDone(id) {
  const entry = entries.find((item) => item.id === id);
  if (entry) entry.done = !entry.done;
  saveEntries();
  render();
}

function removeEntry(id) {
  entries = entries.filter((entry) => entry.id !== id);
  saveEntries();
  render();
}

async function syncFromUrl() {
  if (!SYNC_ENDPOINT) return;
  setStatus('Sincronizando...', true);
  try {
    const response = await fetch(SYNC_ENDPOINT, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const remoteEntries = await response.json();
    if (Array.isArray(remoteEntries)) {
      entries = remoteEntries;
      try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch { /* Keep the shared list usable without local storage. */ }
      render();
    }
    setStatus('Sincronizado');
  } catch (error) {
    setStatus(error.message === 'HTTP 404' ? 'API no publicada' : error.message === 'HTTP 500' ? 'Base de datos no conectada' : 'Sin conexión compartida');
  }
}

async function pushToServer() {
  if (!SYNC_ENDPOINT) return;
  try {
    const response = await fetch(SYNC_ENDPOINT, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entries) });
    if (!response.ok) setStatus(response.status === 500 ? 'Base de datos no conectada' : `Error de servidor ${response.status}`);
  } catch { setStatus('Guardado local; servidor no disponible'); }
}

document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => {
  activeTab = tab.dataset.tab;
  document.querySelectorAll('.tab').forEach((item) => { item.classList.toggle('active', item === tab); item.setAttribute('aria-selected', item === tab); });
  render();
}));
pot.addEventListener('change', updateQuantityMode);
unitsPerBox.addEventListener('change', updateBoxQuantity);
boxes.addEventListener('input', updateBoxQuantity);
document.querySelectorAll('[data-step]').forEach((button) => button.addEventListener('click', () => {
  boxes.value = Math.max(0.5, Number(boxes.value || 0) + Number(button.dataset.step));
  updateBoxQuantity();
}));
form.addEventListener('submit', addEntry);
document.querySelector('#syncButton').addEventListener('click', syncFromUrl);
toggleFormButton.addEventListener('click', () => setFormVisibility(form.hidden));

updateQuantityMode();
render();
let savedFormVisibility = true;
try { savedFormVisibility = window.localStorage.getItem('vivero-form-visible') !== 'false'; } catch { /* Use the expanded form by default. */ }
setFormVisibility(savedFormVisibility);
if (SYNC_ENDPOINT) { syncFromUrl(); setInterval(syncFromUrl, 5000); }
