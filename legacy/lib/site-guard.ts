/**
 * Runtime safety net injected into every generated site. It guarantees — at load
 * time, regardless of what the model emitted — that:
 *   1. No dead links: <a href="#"> / empty / javascript: → routed to contact.
 *   2. Buttons always do something: a non-submit <button> with no handler routes
 *      to contact (nav/dropdown/hamburger are left alone).
 *   3. Contact forms never dead-reload: submit is intercepted and a success
 *      message is shown (the sites are static, no backend).
 *   4. WhatsApp is always reachable: if the site has NO wa.me link, a floating
 *      WhatsApp button is added (only when a phone number exists).
 *
 * This is deterministic and complements the prompt rules — it catches whatever the
 * model missed. Injected after the page router so it sees the final DOM.
 */
export function siteGuard(opts: { waUrl?: string; contactHref?: string; waLabel?: string }): string {
  const waUrl = opts.waUrl || "";
  const contactHref = opts.contactHref || "#contact";
  const waLabel = opts.waLabel || "Falar por WhatsApp";
  const WA_SVG =
    '<svg viewBox="0 0 24 24" width="30" height="30" fill="#fff"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413z"/></svg>';

  return `
<script>(function(){
  var WA=${JSON.stringify(waUrl)}, CONTACT=${JSON.stringify(contactHref)}, WALABEL=${JSON.stringify(waLabel)};
  function go(){ location.hash=CONTACT.replace(/^#/,''); }
  function run(){
    try{
      // Known views (router pages) + their first one (home).
      var pageSet={}, firstPage='';
      document.querySelectorAll('[data-page]').forEach(function(p){var n=p.getAttribute('data-page')||'';pageSet[n]=1;if(!firstPage)firstPage=n;});
      function guessPage(txt){
        txt=(txt||'').toLowerCase();
        for(var n in pageSet){ if(n && txt.indexOf(n.toLowerCase())>=0) return n; }
        return '';
      }
      document.querySelectorAll('a').forEach(function(a){
        var h=(a.getAttribute('href')||'').trim();
        // 1) Empty / placeholder → contact.
        if(h===''||h==='#'||h.toLowerCase().indexOf('javascript:')===0){ a.setAttribute('href',CONTACT); return; }
        // 2) Real protocols / external / wa.me → leave alone.
        if(/^(tel:|mailto:|https?:|\\/\\/)/i.test(h) || h.indexOf('wa.me')>=0) return;
        if(h.charAt(0)!=='#') return;
        // 3) Page route #/name — if the page doesn't exist, remap (by link text, else home).
        var rm=h.match(/^#\\/([^#]+)/);
        if(rm){
          if(firstPage && !pageSet[rm[1]]){ a.setAttribute('href','#/'+(guessPage(a.textContent)||firstPage)); }
          return;
        }
        // 4) Plain #anchor — only valid if the element exists; else remap to a page or contact.
        var id=h.slice(1);
        if(id && !document.getElementById(id)){
          var g=guessPage(a.textContent);
          a.setAttribute('href', g?('#/'+g):CONTACT);
        }
      });
      document.querySelectorAll('button').forEach(function(b){
        var t=(b.getAttribute('type')||'').toLowerCase();
        if(t==='submit'||t==='reset')return;
        if(b.id==='hamburger'||b.hasAttribute('data-dropdown-toggle'))return;
        if(b.closest('a'))return;
        if(b.hasAttribute('onclick')){
          // A handler exists but may be broken — add a safe fallback that only fires
          // if the click didn't already navigate/scroll.
          b.addEventListener('click',function(){var y=window.scrollY;setTimeout(function(){if(window.scrollY===y && (location.hash||'')==='')go();},120);});
          return;
        }
        b.addEventListener('click',go);
      });
      document.querySelectorAll('form').forEach(function(f){
        f.addEventListener('submit',function(e){
          e.preventDefault();
          var ok=f.querySelector('[data-form-success]');
          if(!ok){ok=document.createElement('p');ok.setAttribute('data-form-success','');ok.className='mt-4 font-medium';ok.style.color='#16a34a';ok.textContent='Mensagem enviada! Entraremos em contacto em breve.';f.appendChild(ok);}
          ok.style.display='block'; try{f.reset();}catch(_){}
        });
      });
      if(WA && !document.querySelector('a[href*="wa.me"]')){
        var fab=document.createElement('a');
        fab.href=WA; fab.target='_blank'; fab.rel='noopener noreferrer'; fab.setAttribute('aria-label',WALABEL);
        fab.style.cssText='position:fixed;right:20px;bottom:20px;z-index:9999;width:56px;height:56px;border-radius:9999px;background:#25D366;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(0,0,0,.28)';
        fab.innerHTML=${JSON.stringify(WA_SVG)};
        document.body.appendChild(fab);
      }
    }catch(_){}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
})();</script>`;
}
