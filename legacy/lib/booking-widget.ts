/**
 * Deterministic online-booking section injected into a generated site (no AI, so it
 * never truncates). A vanilla-JS month calendar + time slots; on confirm it opens
 * WhatsApp with the chosen date/time prefilled, or scrolls to the contact section
 * when there is no number. Used by both the generator (toggle) and the site editor
 * ("Add online booking"). Tailwind classes + an extracted accent colour so it blends
 * with the site.
 */

/** Pull the site's primary colour from its Tailwind config / CSS so the widget matches. */
export function extractAccent(html: string): string {
  const m =
    html.match(/primary['"]?\s*:\s*['"](#[0-9a-fA-F]{3,8})['"]/) ||
    html.match(/--primary\s*:\s*(#[0-9a-fA-F]{3,8})/) ||
    html.match(/--accent\s*:\s*(#[0-9a-fA-F]{3,8})/);
  return m ? m[1] : "#2563eb";
}

export function bookingWidgetHtml(opts: { waUrl?: string; accent?: string }): string {
  const accent = opts.accent || "#2563eb";
  const wa = opts.waUrl || "";
  const script = `(function(){
  if(window.__nfBookingInit)return;window.__nfBookingInit=1;
  var WA=${JSON.stringify(wa)},ACC=${JSON.stringify(accent)};
  var root=document.getElementById('nf-booking');if(!root)return;
  var cal=root.querySelector('[data-cal]'),slots=root.querySelector('[data-slots]'),conf=root.querySelector('[data-confirm]'),out=root.querySelector('[data-bk-msg]');
  var now=new Date();now.setHours(0,0,0,0);
  var view=new Date(now.getFullYear(),now.getMonth(),1),selDay=null,selSlot=null;
  var MON=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  var DOW=['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
  function pad(n){return(n<10?'0':'')+n;}
  function slotList(){var a=[];for(var h=9;h<18;h++){if(h===13)continue;a.push(pad(h)+':00');a.push(pad(h)+':30');}return a;}
  function renderCal(){
    var y=view.getFullYear(),m=view.getMonth(),first=new Date(y,m,1),sd=(first.getDay()+6)%7,days=new Date(y,m+1,0).getDate();
    var h='<div class="flex items-center justify-between mb-3"><button type="button" data-prev class="px-3 py-1 rounded-lg hover:bg-black/5">&#8249;</button><div class="font-semibold text-slate-800">'+MON[m]+' '+y+'</div><button type="button" data-next class="px-3 py-1 rounded-lg hover:bg-black/5">&#8250;</button></div>';
    h+='<div class="grid grid-cols-7 gap-1 text-center text-xs text-slate-400 mb-1">'+DOW.map(function(d){return '<div>'+d+'</div>';}).join('')+'</div><div class="grid grid-cols-7 gap-1">';
    for(var i=0;i<sd;i++)h+='<div></div>';
    for(var d=1;d<=days;d++){var dt=new Date(y,m,d),past=dt<now,sel=selDay&&dt.getTime()===selDay.getTime();
      h+='<button type="button" '+(past?'disabled':'data-day="'+dt.getTime()+'"')+' class="aspect-square rounded-lg text-sm '+(past?'text-slate-300 cursor-not-allowed':'hover:bg-black/5 text-slate-700')+(sel?' text-white':'')+'"'+(sel?' style="background:'+ACC+'"':'')+'>'+d+'</button>';}
    h+='</div>';cal.innerHTML=h;
  }
  function renderSlots(){
    if(!selDay){slots.innerHTML='<p class="text-sm text-slate-400 col-span-3">Escolha um dia primeiro.</p>';return;}
    slots.innerHTML=slotList().map(function(t){var sel=selSlot===t;return '<button type="button" data-slot="'+t+'" class="px-2 py-2 rounded-lg border text-sm '+(sel?'text-white border-transparent':'border-slate-200 hover:border-slate-300 text-slate-700')+'"'+(sel?' style="background:'+ACC+'"':'')+'>'+t+'</button>';}).join('');
  }
  function upd(){conf.disabled=!(selDay&&selSlot);}
  cal.addEventListener('click',function(e){
    var p=e.target.closest('[data-prev]'),n=e.target.closest('[data-next]'),d=e.target.closest('[data-day]');
    if(p||n||d)e.stopImmediatePropagation();
    if(p){view=new Date(view.getFullYear(),view.getMonth()-1,1);renderCal();return;}
    if(n){view=new Date(view.getFullYear(),view.getMonth()+1,1);renderCal();return;}
    if(d){selDay=new Date(parseInt(d.getAttribute('data-day'),10));selSlot=null;renderCal();renderSlots();upd();}
  },true);
  slots.addEventListener('click',function(e){var s=e.target.closest('[data-slot]');if(s){e.stopImmediatePropagation();selSlot=s.getAttribute('data-slot');renderSlots();upd();}},true);
  conf.addEventListener('click',function(e){
    e.stopImmediatePropagation();
    if(!(selDay&&selSlot))return;
    var ds=pad(selDay.getDate())+'/'+pad(selDay.getMonth()+1)+'/'+selDay.getFullYear(),txt='Olá! Gostava de marcar para '+ds+' às '+selSlot+'.';
    if(WA){var base=WA.split('?')[0],wu=base+'?text='+encodeURIComponent(txt),w=window.open(wu,'_blank','noopener');if(!w)location.href=wu;}
    else{var c=document.querySelector('[id*="contact" i],[id*="contacto" i],form');if(c)c.scrollIntoView({behavior:'smooth'});}
    if(out){out.textContent='Marcação para '+ds+' às '+selSlot+(WA?' — continue no WhatsApp para confirmar.':' — contacte-nos para confirmar.');out.style.display='block';}
  },true);
  renderCal();renderSlots();upd();
})();`;

  return `<section id="agendamento" class="py-16 px-6 bg-slate-50">
  <div class="max-w-3xl mx-auto" id="nf-booking">
    <div class="text-center mb-8">
      <p class="text-xs font-semibold uppercase tracking-widest mb-2" style="color:${accent}">Marcações</p>
      <h2 class="text-3xl md:text-4xl font-bold text-slate-900">Marque a sua visita</h2>
      <p class="text-slate-500 mt-2">Escolha o dia e a hora — confirmamos por WhatsApp.</p>
    </div>
    <div class="grid md:grid-cols-2 gap-6 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div data-cal></div>
      <div>
        <p class="text-sm font-medium text-slate-700 mb-2">Horas disponíveis</p>
        <div data-slots class="grid grid-cols-3 gap-2"></div>
        <button type="button" data-confirm disabled class="mt-5 w-full py-3 rounded-full text-white font-semibold transition disabled:opacity-40" style="background:${accent}">Confirmar marcação</button>
        <p data-bk-msg class="mt-3 text-sm font-medium text-green-600" style="display:none"></p>
      </div>
    </div>
  </div>
  <script>${script}</script>
</section>`;
}

/** Insert the booking section before the footer (or before </body>). Idempotent. */
export function injectBooking(html: string, opts: { waUrl?: string }): string {
  if (/id=["']agendamento["']/i.test(html)) return html; // already present
  const widget = bookingWidgetHtml({ waUrl: opts.waUrl, accent: extractAccent(html) });

  // Multipage sites wrap content in <div data-page>. A bare section before the footer
  // would sit OUTSIDE the router and render on every page. Put the widget at the end of
  // the first (home) page container instead, so it only shows on the home page.
  const pages = [...html.matchAll(/<(?:div|section)[^>]*\bdata-page=/gi)];
  if (pages.length >= 2 && pages[1].index !== undefined) {
    const closeIdx = html.lastIndexOf("</div>", pages[1].index);
    if (closeIdx > (pages[0].index ?? 0)) {
      return html.slice(0, closeIdx) + widget + "\n" + html.slice(closeIdx);
    }
  }

  const footerIdx = html.search(/<footer[\s>]/i);
  if (footerIdx >= 0) return html.slice(0, footerIdx) + widget + "\n" + html.slice(footerIdx);
  const bodyClose = html.lastIndexOf("</body>");
  if (bodyClose >= 0) return html.slice(0, bodyClose) + widget + "\n" + html.slice(bodyClose);
  return html + widget;
}
