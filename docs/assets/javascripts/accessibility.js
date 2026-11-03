/* Original code: MIT. Native buttons add keyboard access to theme toggles. */
(() => {
  const wire = (name, labelText, panelSelector) => {
    const toggle = document.getElementById(name);
    const label = document.querySelector(`.md-header label[for="${name}"]`);
    const panel = document.querySelector(panelSelector);
    if (!toggle || !label || !panel) return;
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = label.className;
    trigger.setAttribute('for', name); // Preserve the theme's responsive selectors.
    trigger.innerHTML = label.innerHTML;
    panel.id ||= `ef-${name}`;
    trigger.setAttribute('aria-label', labelText);
    trigger.setAttribute('aria-controls', panel.id);
    label.replaceWith(trigger);
    const sync = () => trigger.setAttribute('aria-expanded', String(toggle.checked));
    sync();
    toggle.addEventListener('change', sync);
    for (const type of ['keydown', 'keyup']) {
      trigger.addEventListener(type, event => {
        if (event.key === 'Enter' || event.key === ' ') event.stopPropagation();
      });
    }
    trigger.addEventListener('click', event => {
      event.stopPropagation();
      toggle.checked = !toggle.checked;
      toggle.dispatchEvent(new Event('change', { bubbles: true }));
      sync();
      if (name === '__search' && toggle.checked) {
        panel.querySelector('input[type="text"]')?.focus();
      }
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && toggle.checked) {
        toggle.checked = false;
        toggle.dispatchEvent(new Event('change', { bubbles: true }));
        sync();
        trigger.focus();
      }
    });
  };
  wire('__drawer', 'Открыть меню курса', '.md-sidebar--primary');
  wire('__search', 'Открыть поиск', '[data-md-component="search"]');
})();
