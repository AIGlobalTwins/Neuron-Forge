/**
 * Runtime safety net injected into every generated site. At load (and again after
 * AI edits, since it re-runs) it guarantees EVERY link/button does something
 * visible — works on both multi-page (data-page router) and single-page sites:
 *   - real targets (tel:/mailto:/http/wa.me, a valid #/page, a valid #id) are kept,
 *   - a route to a non-existent page is remapped (by the link text, else home),
 *   - anything else scrolls to a relevant section or the contact destination,
 *   - contact forms show a success message (sites are static),
 *   - a floating WhatsApp button is added when a number exists and none is present.
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
  function run(){
    try{
      var pages=Array.prototype.slice.call(document.querySelectorAll('[data-page]'));
      var pageNames=pages.map(function(p){return p.getAttribute('data-page')||'';});
      var multipage=pageNames.length>0;
      var home=multipage?pageNames[0]:'';

      function matchPage(txt){txt=(txt||'').toLowerCase();for(var i=0;i<pageNames.length;i++){if(pageNames[i]&&txt.indexOf(pageNames[i].toLowerCase())>=0)return pageNames[i];}return '';}
      function matchId(txt){txt=(txt||'').toLowerCase().trim();if(!txt)return '';var els=document.querySelectorAll('[id]');for(var i=0;i<els.length;i++){var id=els[i].id;if(id&&id.length>2&&txt.indexOf(id.toLowerCase())>=0)return id;}return '';}
      function contactTarget(){
        for(var i=0;i<pageNames.length;i++){if(/contact|contacto|marcar|book|agenda/i.test(pageNames[i]))return {page:pageNames[i]};}
        var el=document.querySelector('[id*="contact" i],[id*="contacto" i],[id*="marcar" i]');
        if(el)return {id:el.id};
        var form=document.querySelector('form');if(form){var s=form.closest('[id]');if(s)return {id:s.id};}
        return null;
      }
      var CT=contactTarget();
      function gotoContact(){
        if(CT&&CT.page){location.hash='/'+CT.page;}
        else if(CT&&CT.id){var e=document.getElementById(CT.id);if(e){e.scrollIntoView({behavior:'smooth'});return;}}
        if(CONTACT&&CONTACT.charAt(0)==='#'){location.hash=CONTACT.replace(/^#/,'');}
        else{window.scrollTo({top:0,behavior:'smooth'});}
      }
      function scrollId(id){var e=document.getElementById(id);if(e)e.scrollIntoView({behavior:'smooth'});else gotoContact();}

      document.querySelectorAll('a').forEach(function(a){
        var h=(a.getAttribute('href')||'').trim();
        if(/^(tel:|mailto:|https?:|\\/\\/)/i.test(h)||h.indexOf('wa.me')>=0)return; // real
        if(h===''||h==='#'||h.toLowerCase().indexOf('javascript:')===0){a.addEventListener('click',function(e){e.preventDefault();gotoContact();});return;}
        if(h.charAt(0)!=='#')return;
        var rm=h.match(/^#\\/([^#]+)/);
        if(rm){
          if(multipage){ if(pageNames.indexOf(rm[1])<0)a.setAttribute('href','#/'+(matchPage(a.textContent)||home)); }
          else{ var sid=matchId(rm[1])||matchId(a.textContent); a.addEventListener('click',function(e){e.preventDefault();if(sid)scrollId(sid);else gotoContact();}); }
          return;
        }
        var id=h.slice(1);
        if(id&&!document.getElementById(id)){
          var g=matchPage(a.textContent),sid2=matchId(a.textContent);
          if(g)a.setAttribute('href','#/'+g);
          else if(sid2)a.setAttribute('href','#'+sid2);
          else a.addEventListener('click',function(e){e.preventDefault();gotoContact();});
        }
      });

      document.querySelectorAll('button').forEach(function(b){
        var t=(b.getAttribute('type')||'').toLowerCase();
        if(t==='submit'||t==='reset')return;
        if(b.id==='hamburger'||b.hasAttribute('data-dropdown-toggle')||b.hasAttribute('data-dropdown'))return;
        if(b.closest('a'))return;
        if(b.hasAttribute('onclick')){b.addEventListener('click',function(){var y=window.scrollY,hsh=location.hash;setTimeout(function(){if(window.scrollY===y&&location.hash===hsh)gotoContact();},160);});return;}
        var pg=matchPage(b.textContent),sid=matchId(b.textContent);
        b.addEventListener('click',function(){if(pg){location.hash='/'+pg;}else if(sid){scrollId(sid);}else{gotoContact();}});
      });

      // Ensure each dropdown service anchor (#/page#srv-x) has a real target: if the
      // service block was not id'd by the model, tag the matching heading by its text.
      document.querySelectorAll('a[href*="#srv-"]').forEach(function(a){
        var hh=a.getAttribute('href')||'';var mm=hh.match(/#([^#]+)$/);if(!mm)return;
        var id=mm[1];if(!id||document.getElementById(id))return;
        var label=(a.textContent||'').trim().toLowerCase();if(label.length<3)return;
        var hs=document.querySelectorAll('h1,h2,h3,h4,h5');
        for(var i=0;i<hs.length;i++){var ht=(hs[i].textContent||'').trim().toLowerCase();
          if(ht.length>2&&(ht===label||ht.indexOf(label)>=0||label.indexOf(ht)>=0)){
            var cont=hs[i].closest('section,article')||hs[i].parentElement||hs[i];
            if(!cont.id){cont.id=id;}else{hs[i].id=id;}break;}}
      });

      // Fix Google Maps embeds that need a paid API key → key-less embed.
      document.querySelectorAll('iframe').forEach(function(f){
        var s=f.getAttribute('src')||'';var sl=s.toLowerCase();
        if(sl.indexOf('/maps/embed')>=0 || (sl.indexOf('google.')>=0 && sl.indexOf('/maps')>=0 && /[?&]key=/i.test(s))){
          var q='';var m=s.match(/[?&]q=([^&]+)/i);if(m)q=decodeURIComponent(m[1].replace(/\\+/g,' '));
          if(!q){var p=s.match(/place[\\/]+([^\\/?&]+)/i);if(p)q=decodeURIComponent(p[1].replace(/\\+/g,' '));}
          if(q)f.setAttribute('src','https://www.google.com/maps?q='+encodeURIComponent(q)+'&output=embed');
        }
      });

      document.querySelectorAll('form').forEach(function(f){
        f.addEventListener('submit',function(e){
          e.preventDefault();
          var ok=f.querySelector('[data-form-success]');
          if(!ok){ok=document.createElement('p');ok.setAttribute('data-form-success','');ok.className='mt-4 font-medium';ok.style.color='#16a34a';ok.textContent='Mensagem enviada! Entraremos em contacto em breve.';f.appendChild(ok);}
          ok.style.display='block';try{f.reset();}catch(_){}
        });
      });

      if(WA){
        // Wire EVERY WhatsApp-looking element to the real number (fixes broken/dead
        // ones); if there is none, add a floating button.
        var waEls=[];
        document.querySelectorAll('a').forEach(function(a){var h=(a.getAttribute('href')||'');if(/wa\\.me|api\\.whatsapp|whatsapp\\.com/i.test(h)||/whats\\s*app/i.test(a.textContent||'')||/whatsapp/i.test(a.getAttribute('aria-label')||''))waEls.push(a);});
        document.querySelectorAll('button').forEach(function(b){if(/whats\\s*app/i.test(b.textContent||'')||/whatsapp/i.test(b.getAttribute('aria-label')||''))waEls.push(b);});
        if(waEls.length){
          waEls.forEach(function(el){
            if(el.tagName==='A'){el.setAttribute('href',WA);el.setAttribute('target','_blank');el.setAttribute('rel','noopener noreferrer');}
            else{el.addEventListener('click',function(e){e.preventDefault();window.open(WA,'_blank','noopener');});}
          });
        } else {
          var fab=document.createElement('a');
          fab.href=WA;fab.target='_blank';fab.rel='noopener noreferrer';fab.setAttribute('aria-label',WALABEL);
          fab.style.cssText='position:fixed;right:20px;bottom:20px;z-index:9999;width:56px;height:56px;border-radius:9999px;background:#25D366;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(0,0,0,.28)';
          fab.innerHTML=${JSON.stringify(WA_SVG)};
          document.body.appendChild(fab);
        }
      }
    }catch(_){}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
})();</script>`;
}
