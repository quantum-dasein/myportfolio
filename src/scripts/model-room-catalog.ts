import { archiveDimensions, type ArchiveModel } from '../data/model-archive';

export type ArchiveCatalogOptions = {
  entries: ArchiveModel[]; activeId: () => string | null;
  select: (entry: ArchiveModel, status: (phase: 'loading' | 'preparing') => void) => Promise<boolean>;
  cancel: () => void; clear: () => Promise<void>;
};

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
    const de = o.de(); previousFocus = document.activeElement as HTMLElement;
    panel = document.createElement('dialog'); panel.className = 'mr-kiosk mr-catalog';
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-labelledby', 'mr-catalog-title');
    panel.innerHTML = `<div class="mr-catalog-shell">
      <header class="mr-catalog-header"><span class="mr-kiosk-kicker">THE OBSERVATORY / ARCHIVE</span><button type="button" data-catalog-close aria-label="${de ? 'Archiv schließen' : 'Close archive'}">${de ? 'Zurück' : 'Back'} <span aria-hidden="true">×</span></button></header>
      <div class="mr-catalog-layout"><section class="mr-catalog-intro"><span class="mr-catalog-index">${String(o.entries.length).padStart(3, '0')} / ${de ? 'ARBEITEN' : 'WORKS'}</span><h2 id="mr-catalog-title">${de ? 'Was zeigen <br>wir als Nächstes?' : 'What shall we <br>show next?'}</h2><p>${de ? 'Wähle eine Arbeit. Ein grüner Scan bringt sie auf das Portal im Raum.' : 'Choose a work. A green scan brings it onto the portal at the centre of the room.'}</p><div class="mr-catalog-steps"><span>01 / ${de ? 'Auswählen' : 'Choose'}</span><span>02 / ${de ? 'Entstehen sehen' : 'Watch it appear'}</span><span>03 / ${de ? 'Erkunden' : 'Explore'}</span></div><p class="mr-catalog-footnote">${de ? 'Die Sammlung wächst. Hier findest du die bereits begehbaren Arbeiten.' : 'The collection is growing. These works are ready to explore in the room.'}</p><div class="mr-catalog-commission"><h3>${de ? 'Dein Modell. Nach Maß.' : 'Your model. Made to order.'}</h3><p>${de ? 'Ich erstelle individuelle 3D-Modelle für Produkte, Räume und Visualisierungen. Entdecke hier Beispiele und erzähle mir von deinem Projekt.' : 'I create custom 3D models for products, spaces and visualizations. Explore the examples here and tell me about your project.'}</p><a href="${de ? '/de/kontakt/' : '/contact/'}?project=modeling" data-catalog-enquire>${de ? 'Anfrage' : 'Enquire'} <span aria-hidden="true">↗</span></a></div></section>
      <section class="mr-catalog-library" aria-label="${de ? 'Modelle' : 'Models'}"><label class="mr-catalog-search">${de ? 'Im Archiv suchen' : 'Search the archive'}<input type="search" data-catalog-search placeholder="${de ? 'Name oder Stichwort…' : 'Name or keyword…'}" autocomplete="off" /></label><div class="mr-catalog-meta"><span data-catalog-count aria-live="polite"></span><span>${de ? 'KOLLEKTION' : 'COLLECTION'}</span></div><div class="mr-catalog-grid" data-catalog-grid></div></section></div>
      <footer class="mr-catalog-footer"><p data-catalog-status role="status" aria-live="polite">${de ? 'Wähle eine Arbeit für die Archivbühne.' : 'Choose a work for the archive stage.'}</p><button type="button" data-catalog-clear ${o.activeId() ? '' : 'hidden'}>${de ? 'Bühne leeren' : 'Clear stage'}</button></footer>
    </div>`;
    const currentPanel = panel;
    const status = panel.querySelector<HTMLElement>('[data-catalog-status]')!;
    function render(query = '') {
      const entries = o.entries.filter(e => `${e.title} ${e.category} ${e.description.en} ${e.description.de}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
      currentPanel.querySelector('[data-catalog-count]')!.textContent = `${String(entries.length).padStart(2, '0')} ${de ? 'VERFÜGBAR' : 'AVAILABLE'}`;
      currentPanel.querySelector('[data-catalog-grid]')!.innerHTML = entries.length ? entries.map(entry => `<article class="mr-catalog-work"><div class="mr-catalog-image"><img src="${escape(entry.preview)}" alt="${escape(entry.title)}" width="800" height="800" loading="lazy" /><span>${de ? 'IN 3D ENTDECKEN' : 'EXPLORE IN 3D'}</span></div><div class="mr-catalog-work-body"><div class="mr-catalog-work-title"><h3>${escape(entry.title)}</h3><span>${escape(archiveDimensions(entry, de))}</span></div><p>${escape(entry.description[de ? 'de' : 'en'])}</p><button type="button" data-catalog-show="${escape(entry.id)}">${o.activeId() === entry.id ? (de ? 'Im Raum ansehen' : 'View in room') : (de ? 'Im Raum zeigen' : 'Show in room')} <span aria-hidden="true">↗</span></button></div></article>`).join('') : `<p class="mr-catalog-empty">${de ? 'Keine passende Arbeit. Versuche einen anderen Suchbegriff.' : 'No matching work. Try another search.'}</p>`;
    }
    render();
    panel.querySelector<HTMLInputElement>('[data-catalog-search]')!.addEventListener('input', event => render((event.target as HTMLInputElement).value));
    panel.addEventListener('click', async event => {
      const target = event.target as HTMLElement;
      if (target === currentPanel || target.closest('[data-catalog-close]')) { close(); return; }
      if (target.closest('[data-catalog-clear]')) {
        const ticket = ++request; o.cancel(); pending = false; currentPanel.setAttribute('aria-busy', 'false');
        status.textContent = de ? 'Die Bühne wird geleert…' : 'Clearing the stage…';
        await o.clear(); if (panel !== currentPanel || ticket !== request) return;
        currentPanel.querySelector<HTMLElement>('[data-catalog-clear]')!.hidden = true; status.textContent = de ? 'Die Bühne ist bereit.' : 'The stage is ready.'; render(); return;
      }
      const button = target.closest<HTMLButtonElement>('[data-catalog-show]'); if (!button) return;
      const entry = o.entries.find(e => e.id === button.dataset.catalogShow); if (!entry) return;
      const ticket = ++request; pending = true; currentPanel.setAttribute('aria-busy', 'true');
      try {
        const done = await o.select(entry, phase => {
          if (ticket !== request || panel !== currentPanel) return;
          status.textContent = phase === 'loading' ? (de ? 'Die Arbeit wird geladen…' : 'Loading the work…') : (de ? 'Materialien werden vorbereitet…' : 'Preparing the materials…');
        });
        if (ticket !== request || panel !== currentPanel) return;
        if (done) close();
      } catch {
        if (ticket === request && panel === currentPanel) status.textContent = de ? 'Die Arbeit konnte nicht geladen werden. Bitte versuche es erneut.' : 'The work could not load. Please try again.';
      } finally { if (ticket === request) { pending = false; currentPanel.setAttribute('aria-busy', 'false'); } }
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
