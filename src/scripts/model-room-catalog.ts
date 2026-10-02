import { archiveDimensions, type ArchiveModel } from '../data/model-archive';

export type ArchiveCatalogOptions = {
  entries: ArchiveModel[]; activeId: () => string | null;
  select: (entry: ArchiveModel, status: (phase: 'loading' | 'preparing') => void) => Promise<boolean>;
  cancel: () => void; clear: () => Promise<void>;
};

const CATEGORY: Record<ArchiveModel['category'], [string, string]> = {
  architecture: ['Architecture', 'Architektur'], equipment: ['Equipment', 'Ausstattung'], sculpture: ['Sculpture', 'Skulptur'],
};

/**
 * The archive tablet: a sheet of glass over the (blurred) room. Works on the right as cards with a large
 * preview; on the left what the archive is and the way to commission a model. Buttons are "liquid glass":
 * translucent, with a highlight that follows the pointer.
 */
export function createArchiveCatalog(o: ArchiveCatalogOptions & {
  root: HTMLElement; de: () => boolean; onOpen?: () => void; onClose?: () => void;
}) {
  let panel: HTMLDialogElement | null = null, previousFocus: HTMLElement | null = null;
  let pending = false, request = 0;
  const events = new AbortController();
  const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
  function close() {
    if (!panel) return;
    request++; o.cancel(); pending = false; panel.close(); panel.remove(); panel = null; o.onClose?.();
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  }
  function open() {
    if (panel) return;
    const de = o.de(), t = (en: string, d: string) => de ? d : en;
    previousFocus = document.activeElement as HTMLElement;
    panel = document.createElement('dialog'); panel.className = 'mr-kiosk mr-catalog';
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-labelledby', 'mr-catalog-title');
    const categories = [...new Set(o.entries.map(e => e.category))];
    panel.innerHTML = `<div class="mr-catalog-shell">
      <header class="mr-catalog-header">
        <span class="mr-catalog-brand"><i aria-hidden="true"></i>THE OBSERVATORY <b>/</b> ${t('ARCHIVE', 'ARCHIV')}</span>
        <button type="button" class="mr-liquid mr-liquid--quiet" data-catalog-close aria-label="${t('Close archive', 'Archiv schließen')}"><span>${t('Back to the room', 'Zurück in den Raum')}</span><span aria-hidden="true">×</span></button>
      </header>
      <div class="mr-catalog-layout">
        <aside class="mr-catalog-intro">
          <span class="mr-catalog-index">${String(o.entries.length).padStart(3, '0')} / ${t('WORKS ON CALL', 'ARBEITEN AUF ABRUF')}</span>
          <h2 id="mr-catalog-title">${t('What shall we <br>show next?', 'Was zeigen <br>wir als Nächstes?')}</h2>
          <p>${t('Choose a work. A green scan builds it on the stage at the centre of the room, and you can walk around it.', 'Wähle eine Arbeit. Ein grüner Scan baut sie auf der Bühne in der Raummitte auf, und du kannst um sie herumgehen.')}</p>
          <ol class="mr-catalog-steps"><li>${t('Choose', 'Auswählen')}</li><li>${t('Watch it appear', 'Entstehen sehen')}</li><li>${t('Explore', 'Erkunden')}</li></ol>
          <div class="mr-catalog-commission mr-glass">
            <span class="mr-catalog-index">${t('COMMISSIONS', 'AUFTRÄGE')}</span>
            <h3>${t('Your model. Made to order.', 'Dein Modell. Nach Maß.')}</h3>
            <p>${t('Custom 3D models for products, spaces and visualizations. Tell me about your project.', 'Individuelle 3D-Modelle für Produkte, Räume und Visualisierungen. Erzähl mir von deinem Projekt.')}</p>
            <a class="mr-liquid mr-liquid--accent" href="${de ? '/de/kontakt/' : '/contact/'}?project=modeling" data-catalog-enquire><span>${t('Enquire', 'Anfrage')}</span><span class="mr-liquid-arrow" aria-hidden="true">↗</span></a>
          </div>
        </aside>
        <section class="mr-catalog-library" aria-label="${t('Models', 'Modelle')}">
          <div class="mr-catalog-tools">
            <label class="mr-catalog-search"><span class="mr-sr">${t('Search the archive', 'Im Archiv suchen')}</span><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg><input type="search" data-catalog-search placeholder="${t('Search the archive…', 'Im Archiv suchen…')}" autocomplete="off" /></label>
            <div class="mr-catalog-filters" role="group" aria-label="${t('Category', 'Kategorie')}">
              <button type="button" class="mr-chip" data-catalog-filter="" aria-pressed="true">${t('All', 'Alle')}</button>
              ${categories.map(c => `<button type="button" class="mr-chip" data-catalog-filter="${c}" aria-pressed="false">${CATEGORY[c][de ? 1 : 0]}</button>`).join('')}
            </div>
          </div>
          <div class="mr-catalog-meta"><span data-catalog-count aria-live="polite"></span><span>${t('READY IN THE ROOM', 'IM RAUM BEREIT')}</span></div>
          <div class="mr-catalog-grid" data-catalog-grid></div>
        </section>
      </div>
      <footer class="mr-catalog-footer"><p data-catalog-status role="status" aria-live="polite">${t('Choose a work for the archive stage.', 'Wähle eine Arbeit für die Archivbühne.')}</p><button type="button" class="mr-liquid mr-liquid--quiet" data-catalog-clear ${o.activeId() ? '' : 'hidden'}>${t('Clear stage', 'Bühne leeren')}</button></footer>
    </div>`;
    const currentPanel = panel;
    const status = panel.querySelector<HTMLElement>('[data-catalog-status]')!;
    let query = '', category = '';
    function render() {
      const q = query.trim().toLocaleLowerCase();
      const entries = o.entries.filter(e => (!category || e.category === category) && `${e.title} ${e.category} ${CATEGORY[e.category].join(' ')} ${e.description.en} ${e.description.de}`.toLocaleLowerCase().includes(q));
      currentPanel.querySelector('[data-catalog-count]')!.textContent = `${String(entries.length).padStart(2, '0')} ${t('AVAILABLE', 'VERFÜGBAR')}`;
      currentPanel.querySelector('[data-catalog-grid]')!.innerHTML = entries.length ? entries.map((entry, i) => {
        const active = o.activeId() === entry.id;
        return `<article class="mr-catalog-work mr-glass${active ? ' is-active' : ''}" style="--i:${i}">
          <div class="mr-catalog-image"><img src="${escape(entry.preview)}" alt="${escape(entry.title)}" width="960" height="720" loading="lazy" decoding="async" />
            <span class="mr-catalog-no">${escape(entry.no)}</span><span class="mr-catalog-tag">${active ? t('ON THE STAGE', 'AUF DER BÜHNE') : CATEGORY[entry.category][de ? 1 : 0].toUpperCase()}</span></div>
          <div class="mr-catalog-work-body">
            <div class="mr-catalog-work-title"><h3>${escape(entry.title)}</h3><span>${escape(archiveDimensions(entry, de))}</span></div>
            <p>${escape(entry.description[de ? 'de' : 'en'])}</p>
            <button type="button" class="mr-liquid${active ? ' mr-liquid--accent' : ''}" data-catalog-show="${escape(entry.id)}"><span>${active ? t('View in room', 'Im Raum ansehen') : t('Show in room', 'Im Raum zeigen')}</span><span class="mr-liquid-arrow" aria-hidden="true">↗</span></button>
          </div></article>`;
      }).join('') : `<p class="mr-catalog-empty">${t('No matching work. Try another search.', 'Keine passende Arbeit. Versuche einen anderen Suchbegriff.')}</p>`;
    }
    render();
    panel.querySelector<HTMLInputElement>('[data-catalog-search]')!.addEventListener('input', event => { query = (event.target as HTMLInputElement).value; render(); });
    // The highlight in the glass follows the pointer (a custom property per element; no layout work).
    panel.addEventListener('pointermove', event => {
      const glass = (event.target as HTMLElement).closest<HTMLElement>('.mr-liquid, .mr-glass'); if (!glass) return;
      const r = glass.getBoundingClientRect(); glass.style.setProperty('--mx', `${event.clientX - r.left}px`); glass.style.setProperty('--my', `${event.clientY - r.top}px`);
    }, { passive: true });
    panel.addEventListener('click', async event => {
      const target = event.target as HTMLElement;
      if (target === currentPanel || target.closest('[data-catalog-close]')) { close(); return; }
      const chip = target.closest<HTMLElement>('[data-catalog-filter]');
      if (chip) {
        category = chip.dataset.catalogFilter ?? '';
        currentPanel.querySelectorAll('[data-catalog-filter]').forEach(c => c.setAttribute('aria-pressed', String(c === chip))); render(); return;
      }
      if (target.closest('[data-catalog-clear]')) {
        const ticket = ++request; o.cancel(); pending = false; currentPanel.setAttribute('aria-busy', 'false');
        status.textContent = t('Clearing the stage…', 'Die Bühne wird geleert…');
        await o.clear(); if (panel !== currentPanel || ticket !== request) return;
        currentPanel.querySelector<HTMLElement>('[data-catalog-clear]')!.hidden = true; status.textContent = t('The stage is ready.', 'Die Bühne ist bereit.'); render(); return;
      }
      const button = target.closest<HTMLButtonElement>('[data-catalog-show]'); if (!button) return;
      const entry = o.entries.find(e => e.id === button.dataset.catalogShow); if (!entry) return;
      const ticket = ++request; pending = true; currentPanel.setAttribute('aria-busy', 'true');
      currentPanel.querySelectorAll('.mr-catalog-work').forEach(card => card.classList.toggle('is-loading', card.contains(button)));
      try {
        const done = await o.select(entry, phase => {
          if (ticket !== request || panel !== currentPanel) return;
          status.textContent = phase === 'loading' ? t('Loading the work…', 'Die Arbeit wird geladen…') : t('Preparing the materials…', 'Materialien werden vorbereitet…');
        });
        if (ticket !== request || panel !== currentPanel) return;
        if (done) close();
      } catch {
        if (ticket === request && panel === currentPanel) status.textContent = t('The work could not load. Please try again.', 'Die Arbeit konnte nicht geladen werden. Bitte versuche es erneut.');
      } finally {
        if (ticket === request) { pending = false; currentPanel.setAttribute('aria-busy', 'false'); currentPanel.querySelectorAll('.is-loading').forEach(card => card.classList.remove('is-loading')); }
      }
    });
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); return; }
      if (event.key !== 'Tab') return;
      const nodes = Array.from(currentPanel.querySelectorAll<HTMLElement>('button:not([disabled]),input,a[href]')).filter(n => !n.hidden && n.getClientRects().length);
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    });
    panel.addEventListener('cancel', event => { event.preventDefault(); close(); });
    o.root.append(panel); o.onOpen?.(); panel.showModal(); panel.querySelector<HTMLElement>('[data-catalog-close]')?.focus({ preventScroll: true });
  }
  addEventListener('rb:langchange', close, { signal: events.signal });
  return { open, close, isOpen: () => Boolean(panel), isLoading: () => pending, dispose() { close(); events.abort(); } };
}
