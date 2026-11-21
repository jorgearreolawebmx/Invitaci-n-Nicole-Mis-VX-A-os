/**
 * Nicole XV - servicio central de invitaciones y confirmaciones.
 * Ejecutar setupNicoleRsvp() una vez antes de desplegar como Aplicación web.
 * Requiere la propiedad de script ADMIN_PASSWORD configurada por el propietario.
 */
const NICOLE_SHEETS = {
  INVITES: 'Invitaciones',
  RESPONSES: 'Respuestas',
  SETTINGS: 'Configuracion'
};
const NICOLE_HEADERS = {
  Invitaciones: ['id', 'nombre', 'tipo', 'pases', 'activo', 'creado'],
  Respuestas: ['responseId', 'invitationId', 'invitacion', 'nombre', 'estado', 'pasesAsignados', 'asistentes', 'origen', 'creado', 'actualizado'],
  Configuracion: ['clave', 'valor']
};
const NICOLE_SEED_INVITES = [
  { id: 'fam-olmos-dorantes', name: 'Familia Olmos Dorantes', type: 'family', passes: '' },
  { id: 'fam-roa-ficache', name: 'Familia Roa Ficache', type: 'family', passes: '' },
  { id: 'humberto-corona-padilla', name: 'Sr. Humberto Corona Padilla y Esposa', type: 'family', passes: '' },
  { id: 'zoila-corona-padilla', name: 'Sra. Zoila Corona Padilla', type: 'family', passes: '' },
  { id: 'fam-olmos-garcia', name: 'Familia Olmos García', type: 'family', passes: '' },
  { id: 'gandhi-olmos-garcia', name: 'Mtro. Gandhi Olmos García y Familia', type: 'family', passes: '' },
  { id: 'fam-olmos-prado', name: 'Familia Olmos Prado', type: 'family', passes: 2 },
  { id: 'fam-olmos-roa', name: 'Familia Olmos Roa', type: 'family', passes: 6 },
  { id: 'maria-luisa-ficache', name: 'Sra. María Luisa Ficache Martínez', type: 'family', passes: '' },
  { id: 'lourdes-roa-morales', name: 'Mtra. María de Lourdes Roa Morales', type: 'family', passes: 2 },
  { id: 'fam-torres-olivos', name: 'Familia Torres Olivos', type: 'family', passes: 2 },
  { id: 'itzel-roa-franco', name: 'Itzel Roa Franco e Hijo', type: 'family', passes: '' },
  { id: 'pase-jovenes-general', name: 'Pase personal para jóvenes', type: 'personal', passes: 1 }
];

function setupNicoleRsvp() {
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('ADMIN_PASSWORD')) {
    throw new Error('Antes de ejecutar, agrega ADMIN_PASSWORD en Configuración del proyecto > Propiedades del script. Usa una contraseña nueva y segura; no uses 12345.');
  }
  let id = props.getProperty('SPREADSHEET_ID');
  let ss;
  if (id) {
    ss = SpreadsheetApp.openById(id);
  } else {
    ss = SpreadsheetApp.create('Nicole XV - Registro de invitaciones y asistencia');
    props.setProperty('SPREADSHEET_ID', ss.getId());
  }
  ensureSheet_(ss, NICOLE_SHEETS.INVITES, NICOLE_HEADERS.Invitaciones);
  ensureSheet_(ss, NICOLE_SHEETS.RESPONSES, NICOLE_HEADERS.Respuestas);
  ensureSheet_(ss, NICOLE_SHEETS.SETTINGS, NICOLE_HEADERS.Configuracion);

  const inviteSheet = ss.getSheetByName(NICOLE_SHEETS.INVITES);
  if (inviteSheet.getLastRow() < 2) {
    const now = new Date();
    inviteSheet.getRange(2, 1, NICOLE_SEED_INVITES.length, 6).setValues(NICOLE_SEED_INVITES.map(x => [x.id, x.name, x.type, x.passes, true, now]));
  }
  const settingsSheet = ss.getSheetByName(NICOLE_SHEETS.SETTINGS);
  const settings = readSettings_(settingsSheet);
  if (!settings.whatsapp) settingsSheet.appendRow(['whatsapp', '522288560974']);
  if (!settings.message) settingsSheet.appendRow(['message', 'Hola Sheylla, te comparto mi confirmación de asistencia a los XV años de Nicole.']);
  Logger.log('Configuración lista. Hoja de cálculo: ' + ss.getUrl());
  return ss.getUrl();
}

function ensureSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  return sheet;
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  const action = String(p.action || '');
  try {
    let result;
    if (action === 'ping') result = { ok: true, service: 'Nicole RSVP', version: '1.0' };
    else if (action === 'getInvite') result = publicInvite_(p);
    else if (action === 'publicConfig') result = { ok: true, settings: publicSettings_() };
    else if (action === 'checkResponse') result = { ok: true, exists: responseExists_(String(p.responseId || '')) };
    else if (action === 'adminData') {
      if (!validSession_(p.token)) throw new Error('Sesión no autorizada.');
      result = { ok: true, data: adminData_() };
    } else result = { ok: false, error: 'Acción GET desconocida.' };
    return output_(result, p.callback);
  } catch (err) {
    return output_({ ok: false, error: safeError_(err) }, p.callback);
  }
}

function doPost(e) {
  const p = (e && e.parameter) || {};
  const action = String(p.action || '');
  try {
    let result;
    if (action === 'login') result = login_(String(p.password || ''), String(p.token || ''));
    else if (action === 'saveRsvp') result = saveRsvp_(p);
    else {
      if (!validSession_(p.token)) throw new Error('Sesión no autorizada. Vuelve a iniciar sesión.');
      if (action === 'createInvite') result = createInvite_(JSON.parse(p.invitation || '{}'));
      else if (action === 'deleteInvite') result = deleteInvite_(String(p.invitationId || ''));
      else if (action === 'updateInvite') result = updateInvite_(JSON.parse(p.invitation || '{}'));
      else if (action === 'manualAdd') result = manualAdd_(p);
      else if (action === 'deleteResponse') result = deleteResponse_(String(p.responseId || ''));
      else if (action === 'clearResponses') result = clearResponses_();
      else if (action === 'updateSettings') result = updateSettings_(p);
      else if (action === 'importLegacy') result = importLegacy_(JSON.parse(p.records || '[]'));
      else if (action === 'importLegacyInvites') result = importLegacyInvites_(JSON.parse(p.invites || '[]'));
      else throw new Error('Acción POST desconocida.');
    }
    return jsonOutput_(result);
  } catch (err) {
    return jsonOutput_({ ok: false, error: safeError_(err) });
  }
}

function saveRsvp_(p) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const invitation = findInvitation_(String(p.invitationId || ''), String(p.legacyFamily || ''), String(p.passType || ''));
    if (!invitation) throw new Error('No reconocemos este enlace de invitación. Solicita a la familia organizadora que te comparta el enlace correcto.');
    const status = p.status === 'no' ? 'no' : 'yes';
    const attendees = status === 'yes' ? Number(p.attendees) : 0;
    const maxPasses = Number(invitation.passes) > 0 ? Number(invitation.passes) : 0;
    if (status === 'yes' && maxPasses < 1) throw new Error('Esta invitación aún no tiene pases asignados. Pide a la persona organizadora que configure los pases.');
    if (status === 'yes' && (!Number.isInteger(attendees) || attendees < 1 || attendees > maxPasses)) throw new Error('La cantidad de asistentes supera los pases asignados.');
    const name = cleanText_(p.guestName || invitation.name || 'Invitado', 120);
    if (name.length < 3) throw new Error('Escribe tu nombre.');
    const sheet = getSpreadsheet_().getSheetByName(NICOLE_SHEETS.RESPONSES);
    const values = sheet.getDataRange().getValues();
    let targetRow = -1;
    // Las familias tienen una respuesta por enlace. El pase general permite una respuesta por nombre.
    for (let i = 1; i < values.length; i++) {
      const sameInvitation = String(values[i][1]) === invitation.id;
      const sameName = normalize_(values[i][3]) === normalize_(name);
      if (sameInvitation && (invitation.type !== 'personal' || sameName)) { targetRow = i + 1; break; }
    }
    const now = new Date();
    const row = [String(p.responseId || Utilities.getUuid()), invitation.id, invitation.name, name, status, Number(invitation.passes) || '', attendees, 'web', now, now];
    if (targetRow > 0) sheet.getRange(targetRow, 1, 1, row.length).setValues([row]);
    else sheet.appendRow(row);
    return { ok: true };
  } finally { lock.releaseLock(); }
}

function login_(password, token) {
  const expected = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD') || '';
  if (!expected || !token || token.length < 16 || !constantTimeEquals_(password, expected)) throw new Error('Contraseña incorrecta.');
  CacheService.getScriptCache().put('nicole_admin_' + token, '1', 21600);
  return { ok: true };
}
function validSession_(token) {
  return Boolean(token && CacheService.getScriptCache().get('nicole_admin_' + token) === '1');
}
function constantTimeEquals_(a, b) {
  a = String(a); b = String(b);
  let diff = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
function getSpreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('Ejecuta setupNicoleRsvp() antes de usar el servicio.');
  return SpreadsheetApp.openById(id);
}
function getRows_(sheetName) {
  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheet.getDataRange().getValues().slice(1);
}
function inviteObjects_() {
  return getRows_(NICOLE_SHEETS.INVITES).map(r => ({ id: String(r[0]), name: String(r[1]), type: String(r[2]), passes: r[3] === '' ? null : Number(r[3]), active: r[4] !== false, createdAt: dateIso_(r[5]) })).filter(x => x.active);
}
function responseObjects_() {
  return getRows_(NICOLE_SHEETS.RESPONSES).map(r => ({ responseId: String(r[0]), invitationId: String(r[1]), invitationName: String(r[2]), guestName: String(r[3]), name: String(r[3]), status: String(r[4]), assignedPasses: r[5] === '' ? null : Number(r[5]), attendees: Number(r[6]) || 0, source: String(r[7]), createdAt: dateIso_(r[8]), updatedAt: dateIso_(r[9]) }));
}
function findInvitation_(id, family, passType) {
  const list = inviteObjects_();
  if (id) { const byId = list.find(x => x.id === id); if (byId) return byId; }
  if (passType === 'personal') return list.find(x => x.type === 'personal') || null;
  if (family) return list.find(x => normalize_(x.name) === normalize_(family)) || null;
  return null;
}
function publicInvite_(p) {
  const found = findInvitation_(String(p.inv || ''), String(p.family || ''), String(p.passType || ''));
  if (!found) return { ok: false, error: 'Invitación no encontrada.' };
  return { ok: true, invite: { id: found.id, name: found.name, type: found.type, passes: found.passes } };
}
function publicSettings_() {
  const settings = readSettings_(getSpreadsheet_().getSheetByName(NICOLE_SHEETS.SETTINGS));
  return { whatsapp: String(settings.whatsapp || '522288560974'), message: String(settings.message || 'Hola Sheylla, te comparto mi confirmación de asistencia a los XV años de Nicole.') };
}
function readSettings_(sheet) {
  const result = {};
  if (!sheet || sheet.getLastRow() < 2) return result;
  sheet.getDataRange().getValues().slice(1).forEach(row => { if (row[0]) result[String(row[0])] = String(row[1] || ''); });
  return result;
}
function adminData_() {
  return { invites: inviteObjects_(), responses: responseObjects_().sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))), settings: publicSettings_() };
}
function responseExists_(id) { return id && responseObjects_().some(r => r.responseId === id); }
function createInvite_(item) {
  const id = cleanText_(item.id, 40);
  const type = item.type === 'personal' ? 'personal' : 'family';
  const name = cleanText_(item.name, 70);
  const passes = type === 'personal' ? 1 : (item.passes === '' || item.passes == null ? '' : Number(item.passes));
  if (!id || (type === 'family' && name.length < 2)) throw new Error('Faltan datos para crear la invitación.');
  if (passes !== '' && (!Number.isInteger(passes) || passes < 1 || passes > 30)) throw new Error('Los pases deben estar entre 1 y 30.');
  const sheet = getSpreadsheet_().getSheetByName(NICOLE_SHEETS.INVITES);
  const existing = inviteObjects_().some(x => x.id === id);
  if (existing) throw new Error('El identificador de esta invitación ya existe.');
  sheet.appendRow([id, name, type, passes, true, new Date()]);
  return { ok: true };
}

function updateInvite_(item) {
  const id = cleanText_(item.id, 40);
  const name = cleanText_(item.name, 70);
  const type = item.type === 'personal' ? 'personal' : 'family';
  const passes = type === 'personal' ? 1 : Number(item.passes);
  if (!id || (type === 'family' && name.length < 2)) throw new Error('Faltan datos de la invitación.');
  if (type === 'family' && (!Number.isInteger(passes) || passes < 1 || passes > 30)) throw new Error('Asigna entre 1 y 30 pases a esta familia.');
  const sheet = getSpreadsheet_().getSheetByName(NICOLE_SHEETS.INVITES);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === id) {
      sheet.getRange(i + 1, 2, 1, 3).setValues([[name, type, passes]]);
      return { ok: true };
    }
  }
  throw new Error('No se encontró la invitación que deseas editar.');
}
function deleteInvite_(id) {
  const sheet = getSpreadsheet_().getSheetByName(NICOLE_SHEETS.INVITES);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) if (String(rows[i][0]) === id) { sheet.getRange(i + 1, 5).setValue(false); return { ok: true }; }
  throw new Error('No se encontró la invitación.');
}
function manualAdd_(p) {
  const name = cleanText_(p.name, 120);
  const status = p.status === 'no' ? 'no' : 'yes';
  const attendees = status === 'yes' ? Number(p.attendees) || 1 : 0;
  if (name.length < 3 || (status === 'yes' && (!Number.isInteger(attendees) || attendees < 1 || attendees > 30))) throw new Error('Revisa el nombre y la cantidad de asistentes.');
  const now = new Date();
  getSpreadsheet_().getSheetByName(NICOLE_SHEETS.RESPONSES).appendRow([String(p.responseId || Utilities.getUuid()), 'manual-' + Utilities.getUuid(), 'Registro manual de WhatsApp', name, status, '', attendees, 'manual', now, now]);
  return { ok: true };
}
function deleteResponse_(id) {
  const sheet = getSpreadsheet_().getSheetByName(NICOLE_SHEETS.RESPONSES);
  const rows = sheet.getDataRange().getValues();
  for (let i = rows.length - 1; i >= 1; i--) if (String(rows[i][0]) === id) { sheet.deleteRow(i + 1); return { ok: true }; }
  throw new Error('No se encontró el registro.');
}
function clearResponses_() {
  const sheet = getSpreadsheet_().getSheetByName(NICOLE_SHEETS.RESPONSES);
  if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
  return { ok: true };
}
function updateSettings_(p) {
  const whatsapp = String(p.whatsapp || '').replace(/\D/g, '');
  const message = cleanText_(p.message || '', 400);
  if (whatsapp.length < 10 || whatsapp.length > 15) throw new Error('El número debe incluir código de país.');
  const sheet = getSpreadsheet_().getSheetByName(NICOLE_SHEETS.SETTINGS);
  const rows = sheet.getDataRange().getValues();
  const values = { whatsapp, message };
  Object.keys(values).forEach(key => {
    let found = false;
    for (let i = 1; i < rows.length; i++) if (String(rows[i][0]) === key) { sheet.getRange(i + 1, 2).setValue(values[key]); found = true; break; }
    if (!found) sheet.appendRow([key, values[key]]);
  });
  return { ok: true };
}
function importLegacy_(records) {
  if (!Array.isArray(records)) throw new Error('El respaldo local no tiene el formato esperado.');
  const sheet = getSpreadsheet_().getSheetByName(NICOLE_SHEETS.RESPONSES);
  const existing = new Set(responseObjects_().map(x => x.responseId));
  let imported = 0;
  records.slice(0, 500).forEach(record => {
    const id = 'legacy-' + cleanText_(record.responseId || Utilities.getUuid(), 100);
    if (existing.has(id)) return;
    const name = cleanText_(record.name || '', 120);
    if (!name) return;
    const status = record.status === 'no' ? 'no' : 'yes';
    const attendees = status === 'yes' ? Math.max(1, Math.min(30, Number(record.attendees) || 1)) : 0;
    const when = record.createdAt ? new Date(record.createdAt) : new Date();
    sheet.appendRow([id, 'legacy-' + Utilities.getUuid(), 'Registro importado del navegador', name, status, '', attendees, 'importado', isNaN(when.getTime()) ? new Date() : when, new Date()]);
    existing.add(id); imported++;
  });
  return { ok: true, imported };
}

function importLegacyInvites_(records) {
  if (!Array.isArray(records)) throw new Error('La lista antigua de enlaces no tiene el formato esperado.');
  const sheet = getSpreadsheet_().getSheetByName(NICOLE_SHEETS.INVITES);
  const existingNames = new Set(inviteObjects_().map(x => normalize_(x.name)));
  let imported = 0;
  records.slice(0, 300).forEach(record => {
    const name = cleanText_(record.name || '', 70);
    if (!name || existingNames.has(normalize_(name))) return;
    const slug = normalize_(name).replace(/\s+/g, '-').slice(0, 24) || Utilities.getUuid().slice(0, 8);
    const id = 'old-' + slug + '-' + Utilities.getUuid().replace(/-/g, '').slice(0, 6);
    const passes = Number(record.passes) > 0 ? Math.min(30, Math.floor(Number(record.passes))) : '';
    sheet.appendRow([id, name, 'family', passes, true, new Date()]);
    existingNames.add(normalize_(name)); imported++;
  });
  return { ok: true, imported };
}
function normalize_(value) { return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-MX').replace(/[^a-z0-9]+/g, ' ').trim(); }
function cleanText_(value, max) { return String(value || '').replace(/[<>]/g, '').replace(/[\u0000-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim().slice(0, max); }
function dateIso_(value) { return value instanceof Date ? value.toISOString() : (value ? new Date(value).toISOString() : ''); }
function safeError_(err) { return String(err && err.message ? err.message : err).slice(0, 300); }
function output_(data, callback) {
  if (callback && /^[A-Za-z_$][\w$]{0,80}$/.test(callback)) return ContentService.createTextOutput(callback + '(' + JSON.stringify(data) + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return jsonOutput_(data);
}
function jsonOutput_(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }
