/**
 * Client-side multi-page for generated static sites.
 *
 * The model wraps content in <div data-page="NAME" class="page"> containers and
 * the injected PAGE_BOOT (CSS + router) shows one page at a time based on the URL
 * hash (#/servicos), updates the active nav item, handles dropdown menus, and
 * supports in-page anchors (#/servicos#detalhe). This keeps the whole site in ONE
 * HTML file — so storage, preview and Vercel deploy stay unchanged — while it
 * reads and behaves like a real multi-page site with a dropdown navbar.
 *
 * SEO note: separate crawlable URLs would need a prerender/SSG step (a known gap,
 * same as the static-SPA caveat). For an MVP demo the hash router is the safe win.
 */

export interface NavPage {
  name: string; // hash slug, e.g. "servicos"
  label: string; // visible label, e.g. "Serviços"
}

/** CSS (hide inactive pages, no-JS shows the .active home) + the hash router. */
export const PAGE_BOOT = `
<style>[data-page]:not(.active){display:none!important}.nav-active{color:var(--accent,var(--primary,inherit));font-weight:700}[data-dropdown]{transition:opacity .15s}</style>
<script>(function(){
  function pages(){return Array.prototype.slice.call(document.querySelectorAll('[data-page]'));}
  function show(name){
    var ps=pages(); if(!ps.length)return;
    var names=ps.map(function(p){return p.getAttribute('data-page');});
    if(names.indexOf(name)<0)name=names[0];
    ps.forEach(function(p){p.classList.toggle('active',p.getAttribute('data-page')===name);});
    document.querySelectorAll('[data-nav]').forEach(function(a){a.classList.toggle('nav-active',a.getAttribute('data-nav')===name);});
    var mm=document.getElementById('mobile-menu'); if(mm)mm.classList.add('hidden');
    document.querySelectorAll('[data-dropdown]').forEach(function(d){d.classList.add('hidden');});
  }
  function route(){
    var h=location.hash||'';
    var m=h.match(/^#\\/([^#]+)(?:#(.+))?$/);
    if(m){show(m[1]); if(m[2]){var el=document.getElementById(m[2]); if(el)setTimeout(function(){el.scrollIntoView({behavior:'smooth'});},60); else window.scrollTo(0,0);} else window.scrollTo(0,0);}
    else if(h.length>1 && document.getElementById(h.slice(1))){document.getElementById(h.slice(1)).scrollIntoView({behavior:'smooth'});}
    else {var f=pages()[0]; show(f?f.getAttribute('data-page'):'');}
  }
  window.addEventListener('hashchange',route);
  document.addEventListener('click',function(e){
    var t=e.target.closest&&e.target.closest('[data-dropdown-toggle]');
    if(t){e.preventDefault();var dd=t.parentElement.querySelector('[data-dropdown]');if(dd)dd.classList.toggle('hidden');return;}
    if(!(e.target.closest&&e.target.closest('[data-dropdown]')))document.querySelectorAll('[data-dropdown]').forEach(function(d){d.classList.add('hidden');});
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',route);else route();
})();</script>`;

/** Stable anchor id for a dropdown service, e.g. "Medicina do Trabalho" → "srv-medicina-do-trabalho". Must match the id the model puts on that service's block. */
export function serviceSlug(name: string): string {
  const s = (name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 40)
    .replace(/^-+|-+$/g, "");
  return "srv-" + (s || "item");
}

/**
 * Ready-to-use fixed navbar with a Serviços dropdown (desktop hover + mobile/touch
 * click) and a mobile accordion menu. Each dropdown item routes to its OWN service
 * anchor (#/servicos#srv-slug); other links are page routes (#/name). Deterministic.
 */
export function pageNav(opts: {
  businessName: string;
  pages: NavPage[]; // in order, first is home
  serviceItems: string[]; // dropdown contents under the services page
  servicesName: string; // which page the dropdown items route to
  navCta: string;
  ctaName: string; // page the CTA routes to (usually "contacto")
}): string {
  const { businessName, pages, serviceItems, servicesName, navCta, ctaName } = opts;
  const initial = (businessName.trim()[0] || "N").toUpperCase();
  const items = serviceItems.filter(Boolean).slice(0, 6);

  const desktopLink = (p: NavPage) =>
    p.name === servicesName && items.length
      ? `<div class="relative">
        <button type="button" data-dropdown-toggle class="flex items-center gap-1 text-slate-600 hover:text-primary text-sm font-medium transition">${p.label}<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></button>
        <div data-dropdown class="hidden absolute left-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 p-2 z-50">
          ${items.map((s) => `<a href="#/${servicesName}#${serviceSlug(s)}" data-nav="${servicesName}" class="block px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50 hover:text-primary transition">${s}</a>`).join("\n          ")}
        </div>
      </div>`
      : `<a href="#/${p.name}" data-nav="${p.name}" class="text-slate-600 hover:text-primary text-sm font-medium transition">${p.label}</a>`;

  const mobileLink = (p: NavPage) =>
    p.name === servicesName && items.length
      ? `<div><p class="px-1 py-2 text-xs uppercase tracking-wider text-slate-400">${p.label}</p>${items
          .map((s) => `<a href="#/${servicesName}#${serviceSlug(s)}" data-nav="${servicesName}" class="block px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50">${s}</a>`)
          .join("")}</div>`
      : `<a href="#/${p.name}" data-nav="${p.name}" class="block px-1 py-2 text-slate-700 font-medium">${p.label}</a>`;

  return `<nav id="navbar" class="fixed top-0 inset-x-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-100 shadow-sm">
  <div class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
    <a href="#/${pages[0].name}" data-nav="${pages[0].name}" class="flex items-center gap-3">
      <span class="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-heading font-bold">${initial}</span>
      <span class="font-heading font-bold text-xl text-slate-900">${businessName}</span>
    </a>
    <div class="hidden md:flex items-center gap-8">
      ${pages.map(desktopLink).join("\n      ")}
      <a href="#/${ctaName}" data-nav="${ctaName}" class="px-5 py-2.5 bg-primary hover:opacity-90 text-white text-sm font-semibold rounded-full transition">${navCta}</a>
    </div>
    <button id="hamburger" type="button" class="md:hidden p-2" aria-label="Menu"><svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg></button>
  </div>
  <div id="mobile-menu" class="hidden md:hidden border-t border-slate-100 px-6 py-4 space-y-1">
    ${pages.map(mobileLink).join("\n    ")}
    <a href="#/${ctaName}" class="block mt-2 px-1 py-2 text-primary font-semibold">${navCta}</a>
  </div>
  <script>document.getElementById('hamburger').addEventListener('click',function(){document.getElementById('mobile-menu').classList.toggle('hidden')});</script>
</nav>`;
}

/** Prompt block telling the model to group sections into page containers. */
export function multipagePromptBlock(opts: {
  pages: NavPage[];
  mapping: string; // human description of which content goes on which page
}): string {
  const list = opts.pages.map((p) => `"${p.name}" (${p.label})`).join(", ");
  return `MULTI-PAGE STRUCTURE — MANDATORY. This site has SEPARATE PAGES, not one long scroll. Build the body as page containers:
- Wrap each page's sections in <div data-page="NAME" class="page">…</div>. Pages, in order: ${list}.
- The FIRST page container ("${opts.pages[0].name}") MUST have class="page active".
- The fixed <nav> (provided below) stays OUTSIDE every page container, at the top of <body>.
- Every <section> belongs to exactly one page container. Page contents:
${opts.mapping}
- Do NOT add your own show/hide CSS or JS and do NOT change the nav links — a router is injected. Page links use href="#/NAME"; in-page anchors keep href="#section-id".`;
}
