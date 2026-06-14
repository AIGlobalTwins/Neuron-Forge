/**
 * Deterministic motion layer for generated websites.
 *
 * Why code-owned (not model-generated): CLAUDE.md forbids letting Claude emit
 * custom <style>/CSS — it exhausts tokens and produces broken pages. So the
 * model only adds attribute hooks (data-reveal / data-reveal-delay / data-count)
 * and we inject a tiny, always-closed CSS rule set + a small IntersectionObserver
 * script. This makes every generated site dynamic (scroll reveals, staggered
 * entrances, count-up stats, hover lift) with zero risk to the HTML.
 */

// CSS appended INSIDE the existing reset <style> block (kept tiny, always closed).
// Respects prefers-reduced-motion.
export const REVEAL_CSS =
  "@media(prefers-reduced-motion:no-preference){" +
  "[data-reveal]{opacity:0;transform:translateY(26px);transition:opacity .7s cubic-bezier(.16,1,.3,1),transform .7s cubic-bezier(.16,1,.3,1);will-change:opacity,transform}" +
  "[data-reveal].reveal-in{opacity:1;transform:none}}" +
  "a,button{transition:color .2s,background-color .2s,transform .2s,box-shadow .2s,opacity .2s}";

// Script appended just before </body>. Reveals elements on scroll, staggers
// groups, and counts up [data-count] numbers.
export const MOTION_SCRIPT = `<script>
(function(){
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  var reveals = document.querySelectorAll('[data-reveal]');
  if (reduce || !('IntersectionObserver' in window)) {
    reveals.forEach(function(el){ el.classList.add('reveal-in'); });
  } else {
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (e.isIntersecting) {
          var d = parseInt(e.target.getAttribute('data-reveal-delay') || '0', 10);
          setTimeout(function(){ e.target.classList.add('reveal-in'); }, d);
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function(el){ io.observe(el); });
  }
  var counters = document.querySelectorAll('[data-count]');
  if (counters.length && 'IntersectionObserver' in window && !reduce) {
    var co = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (!e.isIntersecting) return;
        var el = e.target, raw = el.getAttribute('data-count') || el.textContent || '';
        var num = parseFloat(raw.replace(/[^0-9.]/g,''));
        if (isNaN(num)) { co.unobserve(el); return; }
        var suffix = raw.replace(/[0-9.,]/g,''), dec = (raw.split('.')[1]||'').length, t0=null;
        function step(t){ if(!t0)t0=t; var p=Math.min((t-t0)/1100,1);
          var v = num*p; el.textContent=(dec?v.toFixed(dec):Math.round(v))+suffix;
          if(p<1) requestAnimationFrame(step); }
        requestAnimationFrame(step); co.unobserve(el);
      });
    }, { threshold: 0.5 });
    counters.forEach(function(el){ co.observe(el); });
  }
})();
</script>`;

// Instruction block injected into generation prompts. The model only adds the
// attributes/classes below — never CSS.
export const MOTION_PROMPT = `═══ MOTION & MODERN DYNAMICS (make it feel alive — modern, premium, dynamic) ═══
Animation is injected automatically. You ONLY add these attributes/classes:
- data-reveal — add to EVERY section's inner container, each section heading, each card, each image/media tile and each stats block. They fade + rise into view on scroll.
- data-reveal-delay — stagger items in a group in order: "0", "90", "180", "270" (milliseconds).
- data-count — on numeric stats put the target value here so it counts up (e.g. <p data-count="4.9">4.9</p>, data-count="175+", data-count="98%", data-count="12k").
- Cards / image tiles: add "transition duration-300 hover:-translate-y-1 hover:shadow-xl" for a tactile hover lift.
- Buttons: add "active:scale-95".
Modern layout cues: bold oversized display headings (tracking-tight), asymmetric / alternating rows, generous whitespace, one accent-tinted or subtly gradient focal block, rounded-2xl media with object-cover. Avoid flat, lifeless, evenly-stacked sections.
NEVER write a <style> block, @keyframes, or inline CSS for animation — only the attributes/classes above.
══════════════════════════════════════`;
