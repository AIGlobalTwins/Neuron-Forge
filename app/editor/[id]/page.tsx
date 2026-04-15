"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";

// ── Types ──────────────────────────────────────────────────────────────────

interface ElementStyles {
  fontSize: string;
  fontFamily: string;
  fontWeight: string;
  fontStyle: string;
  textDecoration: string;
  textAlign: string;
  color: string;
  backgroundColor: string;
  lineHeight: string;
  paddingTop: string;
  paddingRight: string;
  paddingBottom: string;
  paddingLeft: string;
  borderRadius: string;
}

interface ElementInfo {
  tagName: string;
  path: string;
  directText: string;
  hasOnlyText: boolean;
  imgSrc?: string;
  imgAlt?: string;
  styles: ElementStyles;
}

type Device = "desktop" | "tablet" | "mobile";

const DEVICE_WIDTHS: Record<Device, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "390px",
};

// ── Helpers ────────────────────────────────────────────────────────────────

function rgbToHex(rgb: string): string {
  if (!rgb || rgb === "transparent") return "#ffffff";
  if (rgb === "rgba(0, 0, 0, 0)") return "#000000";
  const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return rgb.startsWith("#") ? rgb : "#ffffff";
  return (
    "#" +
    [m[1], m[2], m[3]]
      .map((n) => parseInt(n).toString(16).padStart(2, "0"))
      .join("")
  );
}

function parsePx(v: string): number {
  return Math.round(parseFloat(v)) || 0;
}

function isTransparent(color: string): boolean {
  return (
    !color ||
    color === "transparent" ||
    color === "rgba(0, 0, 0, 0)"
  );
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1400;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width >= height) { height = Math.round((height * MAX) / width); width = MAX; }
          else { width = Math.round((width * MAX) / height); height = MAX; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// ── Injected editor script (stringified, runs inside the iframe) ───────────

const EDITOR_SCRIPT = `<script id="__nf_ed">
(function(){
var SK=new Set(['HTML','HEAD','BODY','SCRIPT','STYLE','NOSCRIPT','META','LINK','TITLE']);
var sel=null;
var sb=document.createElement('div');
sb.id='__nf_sb';
sb.style.cssText='position:fixed;border:2px solid #E8622A;border-radius:2px;pointer-events:none;z-index:2147483647;box-sizing:border-box;display:none;transition:top 60ms,left 60ms,width 60ms,height 60ms;';
var hb=document.createElement('div');
hb.id='__nf_hb';
hb.style.cssText='position:fixed;border:1.5px dashed rgba(232,98,42,0.5);border-radius:2px;pointer-events:none;z-index:2147483646;box-sizing:border-box;display:none;background:rgba(232,98,42,0.04);';
document.body.appendChild(sb);
document.body.appendChild(hb);
function upd(box,el){var r=el.getBoundingClientRect();box.style.top=r.top+'px';box.style.left=r.left+'px';box.style.width=r.width+'px';box.style.height=r.height+'px';box.style.display='block';}
function getPath(el){
  var p=[],c=el;
  while(c&&c!==document.body){
    var s=c.tagName.toLowerCase();
    if(c.id)s+='#'+c.id.slice(0,14);
    else if(c.className&&typeof c.className==='string'){var cl=c.className.trim().split(/\\s+/)[0];if(cl)s+='.'+cl.slice(0,20);}
    p.unshift(s);c=c.parentElement;
  }
  return p.join(' > ');
}
function dtxt(el){var t='';el.childNodes.forEach(function(n){if(n.nodeType===3)t+=n.textContent;});return t.trim();}
function sendSel(el){
  var cs=window.getComputedStyle(el);
  var isImg=el.tagName==='IMG';
  window.parent.postMessage({
    type:'ELEMENT_SELECTED',
    tagName:el.tagName.toLowerCase(),
    path:getPath(el),
    directText:dtxt(el),
    hasOnlyText:el.children.length===0,
    imgSrc:isImg?el.src:null,
    imgAlt:isImg?(el.getAttribute('alt')||''):null,
    styles:{
      fontSize:cs.fontSize,fontFamily:cs.fontFamily,fontWeight:cs.fontWeight,
      fontStyle:cs.fontStyle,textDecoration:cs.textDecoration,textAlign:cs.textAlign,
      color:cs.color,backgroundColor:cs.backgroundColor,lineHeight:cs.lineHeight,
      paddingTop:cs.paddingTop,paddingRight:cs.paddingRight,
      paddingBottom:cs.paddingBottom,paddingLeft:cs.paddingLeft,
      borderRadius:cs.borderRadius
    }
  },'*');
}
document.addEventListener('mouseover',function(e){
  var el=e.target;
  if(SK.has(el.tagName)||el.id==='__nf_sb'||el.id==='__nf_hb')return;
  document.body.style.cursor='pointer';
  upd(hb,el);
},true);
document.addEventListener('mouseout',function(e){
  if(!e.relatedTarget||e.relatedTarget===document.body)hb.style.display='none';
},true);
document.addEventListener('click',function(e){
  var el=e.target;
  if(SK.has(el.tagName)||el.id==='__nf_sb'||el.id==='__nf_hb')return;
  e.preventDefault();e.stopPropagation();
  sel=el;upd(sb,el);sendSel(el);
},true);
window.addEventListener('scroll',function(){
  if(sel)upd(sb,sel);
});
window.addEventListener('message',function(e){
  if(!e.data||!sel)return;
  var d=e.data;
  if(d.type==='UPDATE_STYLE'){
    if(d.prop==='textContent'){if(sel.children.length===0)sel.textContent=d.value;}
    else{sel.style[d.prop]=d.value;}
    upd(sb,sel);sendSel(sel);
  }
  if(d.type==='UPDATE_IMAGE'){
    if(sel.tagName==='IMG'){
      sel.src=d.src;
      if(typeof d.alt==='string')sel.alt=d.alt;
      // Remove srcset so browser uses our new src
      sel.removeAttribute('srcset');
      upd(sb,sel);sendSel(sel);
    }
  }
  if(d.type==='REMOVE_IMAGE'){
    if(sel&&sel.tagName==='IMG'){
      sel.remove();
      sel=null;sb.style.display='none';hb.style.display='none';
      window.parent.postMessage({type:'IMAGE_REMOVED'},'*');
    }
  }
  if(d.type==='DESELECT'){sel=null;sb.style.display='none';hb.style.display='none';}
  if(d.type==='GET_HTML'){
    var sc=document.getElementById('__nf_ed');
    var s2=document.getElementById('__nf_sb');
    var h2=document.getElementById('__nf_hb');
    if(sc)sc.remove();if(s2)s2.remove();if(h2)h2.remove();
    window.parent.postMessage({type:'CLEAN_HTML',html:'<!DOCTYPE html>\\n'+document.documentElement.outerHTML},'*');
  }
});
})();
</script>`;

// ── Icons ──────────────────────────────────────────────────────────────────

function PencilIcon() {
  return (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 2l3 3-9 9H2v-3L11 2z" />
    </svg>
  );
}

function DesktopIcon() {
  return (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="2" width="14" height="10" rx="1.5" />
      <path d="M5 14h6M8 12v2" />
    </svg>
  );
}

function TabletIcon() {
  return (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="1" width="10" height="14" rx="1.5" />
      <circle cx="8" cy="12.5" r="0.7" fill="currentColor" />
    </svg>
  );
}

function MobileIcon() {
  return (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="1" width="8" height="14" rx="1.5" />
      <circle cx="8" cy="12.5" r="0.7" fill="currentColor" />
    </svg>
  );
}

function CursorIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4l7.5 18 3-7 7-3L4 4z" />
    </svg>
  );
}

function AlignIcon({ align }: { align: string }) {
  const lines: Record<string, [number, number][]> = {
    left:    [[3,5],[3,11],[3,8]],
    center:  [[5,5],[3,11],[4,8]],
    right:   [[5,5],[3,11],[5,8]],
    justify: [[3,5],[3,11],[3,8]],
  };
  const widths: Record<string, number[]> = {
    left:    [8, 5, 6],
    center:  [6, 8, 4],
    right:   [8, 5, 6],
    justify: [8, 8, 8],
  };
  const starts: Record<string, number[]> = {
    left:    [3, 3, 3],
    center:  [3, 3, 3],
    right:   [5, 5, 5],
    justify: [3, 3, 3],
  };

  return (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      {[4, 7, 10].map((y, i) => (
        <line key={i} x1={align === "right" ? 16 - widths[align][i] - starts[align][i] + 3 : starts[align][i]} y1={y} x2={align === "right" ? 16 - starts[align][i] + 3 : starts[align][i] + widths[align][i]} y2={y} />
      ))}
    </svg>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-[#1a1a1a]">
      <div className="px-4 py-2 bg-[#111]">
        <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-gray-600">{label}</span>
      </div>
      <div className="px-4 py-3 space-y-3">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] text-gray-500 shrink-0 w-20">{label}</span>
      <div className="flex items-center gap-1.5 flex-1 justify-end">{children}</div>
    </div>
  );
}

function NumInput({
  value,
  onChange,
  min = 0,
  max = 999,
  suffix = "px",
  className = "",
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center bg-[#111] border border-[#2a2a2a] rounded-lg overflow-hidden ${className}`}>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Math.max(min, Math.min(max, parseInt(e.target.value) || 0)))}
        className="w-12 bg-transparent px-2 py-1.5 text-xs text-white text-center outline-none [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      {suffix && <span className="text-[10px] text-gray-600 pr-2">{suffix}</span>}
    </div>
  );
}

function ColorInput({
  value,
  transparent,
  onChange,
}: {
  value: string;
  transparent?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 bg-[#111] border border-[#2a2a2a] rounded-lg px-2 py-1.5">
      <label className="relative w-5 h-5 rounded cursor-pointer shrink-0 overflow-hidden border border-[#3a3a3a]"
        style={{ background: transparent ? "repeating-conic-gradient(#2a2a2a 0% 25%, #111 0% 50%) 0 0 / 8px 8px" : value }}>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
        />
      </label>
      <span className="text-[11px] font-mono text-gray-400 uppercase">{transparent ? "transparent" : value}</span>
    </div>
  );
}

function ToggleBtn({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-7 h-7 rounded border flex items-center justify-center text-xs transition-all ${
        active
          ? "border-[#E8622A]/60 bg-[#E8622A]/15 text-[#E8622A]"
          : "border-[#2a2a2a] bg-[#111] text-gray-500 hover:border-[#3a3a3a] hover:text-gray-300"
      }`}
    >
      {children}
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function EditorPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const cleanHtmlResolver = useRef<((html: string) => void) | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [srcDoc, setSrcDoc] = useState("");
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [element, setElement] = useState<ElementInfo | null>(null);
  const [localStyles, setLocalStyles] = useState<ElementStyles | null>(null);
  const [localText, setLocalText] = useState("");

  const [device, setDevice] = useState<Device>("desktop");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imgDragging, setImgDragging] = useState(false);

  // Load HTML and inject editor script
  useEffect(() => {
    if (!id) return;
    fetch(`/api/preview/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.text();
      })
      .then((html) => {
        const injected = html.includes("</body>")
          ? html.replace("</body>", EDITOR_SCRIPT + "\n</body>")
          : html + "\n" + EDITOR_SCRIPT;
        setSrcDoc(injected);
        setLoading(false);
      })
      .catch(() => {
        setFetchError("Website not found.");
        setLoading(false);
      });
  }, [id]);

  // Listen to postMessage from iframe
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (!e.data || typeof e.data !== "object") return;

      if (e.data.type === "ELEMENT_SELECTED") {
        const info = e.data as ElementInfo & { type: string };
        setElement(info);
        setLocalStyles({ ...info.styles });
        setLocalText(info.directText ?? "");
      }

      if (e.data.type === "CLEAN_HTML") {
        cleanHtmlResolver.current?.(e.data.html as string);
        cleanHtmlResolver.current = null;
      }

      if (e.data.type === "IMAGE_REMOVED") {
        setElement(null);
        setLocalStyles(null);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  function send(msg: object) {
    iframeRef.current?.contentWindow?.postMessage(msg, "*");
  }

  function sendUpdate(prop: string, value: string) {
    send({ type: "UPDATE_STYLE", prop, value });
  }

  function getCleanHtml(): Promise<string> {
    return new Promise((resolve) => {
      cleanHtmlResolver.current = resolve;
      send({ type: "GET_HTML" });
    });
  }

  function updateStyle(prop: keyof ElementStyles, value: string) {
    setLocalStyles((prev) => (prev ? { ...prev, [prop]: value } : prev));
    sendUpdate(prop, value);
  }

  function updateText(value: string) {
    setLocalText(value);
    sendUpdate("textContent", value);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError("");
    try {
      const html = await Promise.race([
        getCleanHtml(),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 5000)),
      ]);
      const res = await fetch(`/api/editor/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html }),
      });
      if (!res.ok) throw new Error("save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setSaveError("Erro ao guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDownload() {
    try {
      const html = await Promise.race([
        getCleanHtml(),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 5000)),
      ]);
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `website-${id}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silently fail
    }
  }

  async function handleImageFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    setUploadingImage(true);
    try {
      const dataUrl = await compressImage(file);
      send({ type: "UPDATE_IMAGE", src: dataUrl, alt: element?.imgAlt ?? "" });
      // Update local preview
      setElement((prev) => prev ? { ...prev, imgSrc: dataUrl } : prev);
    } finally {
      setUploadingImage(false);
    }
  }

  function handleImageInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
    e.target.value = ""; // allow re-selecting same file
  }

  function handleRemoveImage() {
    send({ type: "REMOVE_IMAGE" });
    // Element state cleared via IMAGE_REMOVED message
  }

  function deselect() {
    setElement(null);
    setLocalStyles(null);
    send({ type: "DESELECT" });
  }

  // ── Computed style values ──────────────────────────────────────────────

  const fs = localStyles;
  const isBold = fs?.fontWeight === "700" || fs?.fontWeight === "bold" || parseInt(fs?.fontWeight ?? "0") >= 700;
  const isItalic = fs?.fontStyle === "italic";
  const isUnderline = fs?.textDecoration?.includes("underline") ?? false;
  const textColorHex = fs ? rgbToHex(fs.color) : "#ffffff";
  const bgColorHex = fs ? rgbToHex(fs.backgroundColor) : "#ffffff";
  const bgTransparent = fs ? isTransparent(fs.backgroundColor) : true;
  const fontSize = fs ? parsePx(fs.fontSize) : 16;
  const lineHeight = fs ? (parseFloat(fs.lineHeight) || 1.5) : 1.5;
  const ptop = fs ? parsePx(fs.paddingTop) : 0;
  const pright = fs ? parsePx(fs.paddingRight) : 0;
  const pbottom = fs ? parsePx(fs.paddingBottom) : 0;
  const pleft = fs ? parsePx(fs.paddingLeft) : 0;
  const borderRadius = fs ? parsePx(fs.borderRadius) : 0;

  // ── Render ─────────────────────────────────────────────────────────────

  if (fetchError) {
    return (
      <div className="fixed inset-0 bg-[#080808] flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-white font-semibold">Website não encontrado</p>
          <p className="text-gray-500 text-sm">{fetchError}</p>
          <a href="/" className="text-[#E8622A] text-sm hover:underline">← Voltar ao Forge</a>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#080808] flex flex-col overflow-hidden" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="h-11 bg-[#0d0d0d] border-b border-[#1e1e1e] flex items-center justify-between px-4 shrink-0 gap-4">

        {/* Left */}
        <div className="flex items-center gap-3 min-w-0">
          <a
            href="/"
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors shrink-0"
          >
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 3L5 8l5 5" />
            </svg>
            Forge
          </a>
          <div className="w-px h-4 bg-[#2a2a2a] shrink-0" />
          <div className="flex items-center gap-2 text-xs text-gray-400 min-w-0">
            <span className="text-[#E8622A] shrink-0"><PencilIcon /></span>
            <span className="font-medium shrink-0">Website Editor</span>
            <span className="text-gray-700 shrink-0">·</span>
            <span className="text-gray-600 font-mono text-[10px] truncate">{id.slice(0, 12)}</span>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 shrink-0">
          {saveError && <span className="text-[10px] text-red-400">{saveError}</span>}
          <a
            href={`/api/preview/${id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 text-xs text-gray-500 hover:text-white border border-[#2a2a2a] hover:border-[#3a3a3a] rounded-lg transition-all"
          >
            Preview ↗
          </a>
          <button
            onClick={handleDownload}
            className="px-3 py-1.5 text-xs text-gray-400 hover:text-white border border-[#2a2a2a] hover:border-[#3a3a3a] rounded-lg transition-all flex items-center gap-1.5"
          >
            <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 2v8M5 7l3 3 3-3M2 13h12" />
            </svg>
            Download
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all disabled:opacity-50 flex items-center gap-1.5 ${
              saved
                ? "bg-green-600 text-white"
                : "bg-[#E8622A] hover:bg-[#d4571f] text-white"
            }`}
          >
            {saving ? (
              <>
                <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                Guardar...
              </>
            ) : saved ? (
              <>
                <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 8l4 4 8-8" />
                </svg>
                Guardado
              </>
            ) : (
              <>
                <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2H4L2 4v10l2 2h10l2-2V5l-3-3z" /><path d="M5 2v4h6V2M5 13h6" />
                </svg>
                Guardar
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Main area ─────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* ── Left: iframe ─────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#111]">

          {/* Device toolbar */}
          <div className="h-9 bg-[#0d0d0d] border-b border-[#1e1e1e] flex items-center justify-center gap-1 shrink-0">
            {(["desktop", "tablet", "mobile"] as Device[]).map((d) => (
              <button
                key={d}
                onClick={() => setDevice(d)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] transition-all ${
                  device === d
                    ? "bg-[#1a1a1a] border border-[#2a2a2a] text-white"
                    : "text-gray-600 hover:text-gray-400"
                }`}
              >
                {d === "desktop" ? <DesktopIcon /> : d === "tablet" ? <TabletIcon /> : <MobileIcon />}
                <span className="capitalize">{d}</span>
              </button>
            ))}
            {element && (
              <button
                onClick={deselect}
                className="ml-4 text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
              >
                Deselect
              </button>
            )}
          </div>

          {/* Iframe wrapper */}
          <div className="flex-1 overflow-auto flex justify-center bg-[#0a0a0a]">
            {loading ? (
              <div className="flex items-center justify-center flex-1">
                <div className="flex flex-col items-center gap-3">
                  <svg className="w-8 h-8 text-[#E8622A] animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  <span className="text-xs text-gray-500">A carregar website...</span>
                </div>
              </div>
            ) : (
              <div
                style={{
                  width: DEVICE_WIDTHS[device],
                  transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)",
                  minHeight: "100%",
                  boxShadow: device !== "desktop" ? "0 0 0 1px #2a2a2a, 0 20px 60px rgba(0,0,0,0.6)" : "none",
                }}
              >
                <iframe
                  ref={iframeRef}
                  srcDoc={srcDoc}
                  style={{
                    width: "100%",
                    minHeight: "2400px",
                    display: "block",
                    border: "none",
                  }}
                  title="Website Editor"
                />
              </div>
            )}
          </div>
        </div>

        {/* ── Right: properties panel ───────────────────────────────────── */}
        <div className="w-72 bg-[#0d0d0d] border-l border-[#1e1e1e] flex flex-col shrink-0 overflow-hidden">

          {!element ? (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#111] border border-[#2a2a2a] flex items-center justify-center text-gray-600">
                <CursorIcon />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-400 mb-1">Clica num elemento</p>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Clica em qualquer parte do website para selecionar e editar o elemento
                </p>
              </div>
              <div className="text-[10px] text-gray-700 bg-[#111] border border-[#1e1e1e] rounded-lg px-3 py-2 space-y-1 w-full text-left">
                <div>↖ Hover — destaca o elemento</div>
                <div>↖ Click — seleciona e abre painel</div>
                <div>✎ Edita texto, cores, tipografia</div>
              </div>
            </div>
          ) : (
            /* Properties panel */
            <div className="flex-1 overflow-y-auto">

              {/* Element header */}
              <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-[#E8622A]/15 text-[#E8622A] border border-[#E8622A]/25 rounded-md">
                      &lt;{element.tagName}&gt;
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-600 truncate leading-relaxed" title={element.path}>
                    {element.path}
                  </p>
                </div>
                <button
                  onClick={deselect}
                  className="text-gray-700 hover:text-gray-400 transition-colors shrink-0 mt-0.5"
                >
                  <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M2 2l8 8M10 2L2 10" />
                  </svg>
                </button>
              </div>

              {/* Image section — only for <img> elements */}
              {element.tagName === "img" && (
                <Section label="Image">
                  {/* Current image preview */}
                  {element.imgSrc && (
                    <div className="relative rounded-lg overflow-hidden border border-[#2a2a2a] bg-[#111]" style={{ aspectRatio: "16/9" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={element.imgSrc}
                        alt={element.imgAlt ?? ""}
                        className="w-full h-full object-cover"
                      />
                      {uploadingImage && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <svg className="w-5 h-5 text-white animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                          </svg>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Drag-and-drop / upload zone */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); setImgDragging(true); }}
                    onDragLeave={() => setImgDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setImgDragging(false);
                      const file = e.dataTransfer.files[0];
                      if (file) handleImageFile(file);
                    }}
                    onClick={() => imageInputRef.current?.click()}
                    className={`flex flex-col items-center justify-center gap-2 px-3 py-4 rounded-lg border-2 border-dashed cursor-pointer transition-all ${
                      imgDragging
                        ? "border-[#E8622A] bg-[#E8622A]/8"
                        : "border-[#2a2a2a] hover:border-[#E8622A]/50 hover:bg-[#E8622A]/5"
                    }`}
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                    <div className="text-center">
                      <p className="text-xs text-gray-400 font-medium">
                        {uploadingImage ? "A processar..." : "Substituir imagem"}
                      </p>
                      <p className="text-[10px] text-gray-600 mt-0.5">
                        Arrasta ou clica para fazer upload
                      </p>
                    </div>
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={handleRemoveImage}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-red-500/25 text-red-400/80 hover:border-red-500/50 hover:text-red-400 hover:bg-red-500/5 text-xs transition-all"
                  >
                    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 10h8l1-10" />
                    </svg>
                    Remover imagem
                  </button>
                </Section>
              )}

              {/* Content section (only for leaf text nodes) */}
              {element.hasOnlyText && (
                <Section label="Content">
                  <textarea
                    value={localText}
                    onChange={(e) => updateText(e.target.value)}
                    rows={3}
                    className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 resize-none focus:outline-none focus:border-[#E8622A]/50 focus:ring-1 focus:ring-[#E8622A]/15 leading-relaxed"
                    placeholder="Texto do elemento..."
                  />
                </Section>
              )}

              {/* Typography */}
              <Section label="Typography">
                {/* Font size + Line height */}
                <Row label="Font size">
                  <NumInput
                    value={fontSize}
                    min={6}
                    max={200}
                    onChange={(v) => updateStyle("fontSize", v + "px")}
                  />
                </Row>

                <Row label="Line height">
                  <div className="flex items-center bg-[#111] border border-[#2a2a2a] rounded-lg overflow-hidden">
                    <input
                      type="number"
                      value={lineHeight}
                      step={0.1}
                      min={0.8}
                      max={5}
                      onChange={(e) => updateStyle("lineHeight", e.target.value)}
                      className="w-14 bg-transparent px-2 py-1.5 text-xs text-white text-center outline-none [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </Row>

                {/* Style toggles */}
                <Row label="Style">
                  <div className="flex gap-1">
                    <ToggleBtn
                      active={isBold}
                      onClick={() => updateStyle("fontWeight", isBold ? "400" : "700")}
                      title="Bold"
                    >
                      <span className="font-bold text-sm">B</span>
                    </ToggleBtn>
                    <ToggleBtn
                      active={isItalic}
                      onClick={() => updateStyle("fontStyle", isItalic ? "normal" : "italic")}
                      title="Italic"
                    >
                      <span className="italic text-sm font-serif">I</span>
                    </ToggleBtn>
                    <ToggleBtn
                      active={isUnderline}
                      onClick={() => updateStyle("textDecoration", isUnderline ? "none" : "underline")}
                      title="Underline"
                    >
                      <span className="underline text-sm">U</span>
                    </ToggleBtn>
                  </div>
                </Row>

                {/* Text align */}
                <Row label="Align">
                  <div className="flex gap-1">
                    {(["left", "center", "right", "justify"] as const).map((a) => (
                      <ToggleBtn
                        key={a}
                        active={fs?.textAlign === a}
                        onClick={() => updateStyle("textAlign", a)}
                        title={a.charAt(0).toUpperCase() + a.slice(1)}
                      >
                        <AlignIcon align={a} />
                      </ToggleBtn>
                    ))}
                  </div>
                </Row>

                {/* Text color */}
                <Row label="Color">
                  <ColorInput
                    value={textColorHex}
                    onChange={(v) => updateStyle("color", v)}
                  />
                </Row>
              </Section>

              {/* Background */}
              <Section label="Background">
                <Row label="Fill">
                  <ColorInput
                    value={bgColorHex}
                    transparent={bgTransparent}
                    onChange={(v) => updateStyle("backgroundColor", v)}
                  />
                </Row>
              </Section>

              {/* Spacing */}
              <Section label="Spacing">
                <div>
                  <div className="text-[10px] text-gray-600 mb-2">Padding</div>
                  {/* Top row */}
                  <div className="flex justify-center mb-1">
                    <NumInput value={ptop} onChange={(v) => updateStyle("paddingTop", v + "px")} className="w-14" />
                  </div>
                  {/* Middle row: Left, visual box, Right */}
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <NumInput value={pleft} onChange={(v) => updateStyle("paddingLeft", v + "px")} className="w-14" />
                    <div className="w-10 h-7 rounded border border-dashed border-[#3a3a3a] bg-[#111] flex items-center justify-center">
                      <div className="w-4 h-3 bg-[#2a2a2a] rounded-sm" />
                    </div>
                    <NumInput value={pright} onChange={(v) => updateStyle("paddingRight", v + "px")} className="w-14" />
                  </div>
                  {/* Bottom row */}
                  <div className="flex justify-center">
                    <NumInput value={pbottom} onChange={(v) => updateStyle("paddingBottom", v + "px")} className="w-14" />
                  </div>
                  <div className="flex justify-center mt-1">
                    <span className="text-[9px] text-gray-700">T · L · R · B</span>
                  </div>
                </div>
              </Section>

              {/* Border */}
              <Section label="Border">
                <Row label="Radius">
                  <NumInput
                    value={borderRadius}
                    min={0}
                    max={999}
                    onChange={(v) => updateStyle("borderRadius", v + "px")}
                  />
                </Row>
              </Section>

              {/* Reset hint */}
              <div className="px-4 py-3 text-center">
                <p className="text-[9px] text-gray-700">Alterações aplicadas em tempo real · Guarda para persistir</p>
              </div>

            </div>
          )}
        </div>
      </div>

      {/* Hidden file input for image upload */}
      <input
        type="file"
        ref={imageInputRef}
        accept="image/*"
        onChange={handleImageInputChange}
        className="hidden"
      />
    </div>
  );
}
