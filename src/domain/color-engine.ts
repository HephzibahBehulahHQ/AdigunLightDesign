export interface RGB {r:number;g:number;b:number;}
export interface HSL {h:number;s:number;l:number;}
export interface HSV {h:number;s:number;v:number;}
export interface XYZ {x:number;y:number;z:number;}
export interface Lab {l:number;a:number;b:number;}
export interface Lch {l:number;c:number;h:number;}
const clamp = (value:number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const mod = (value:number, divisor:number) => ((value % divisor) + divisor) % divisor;

export function normalizeHex(value:unknown) {
  const clean = String(value).trim().replace(/^#/, "");
  if (!/^[\da-f]{3}([\da-f]{3})?$/i.test(clean)) return null;
  const full = clean.length === 3 ? [...clean].map((char) => char + char).join("") : clean;
  return `#${full.toUpperCase()}`;
}

export function hexToRgb(value:unknown) {
  const hex = normalizeHex(value);
  if (!hex) return null;
  const number = Number.parseInt(hex.slice(1), 16);
  return { r: number >> 16, g: (number >> 8) & 255, b: number & 255 };
}

export function rgbToHex({ r, g, b }:RGB) {
  return `#${[r, g, b].map((channel:number) => Math.round(clamp(channel, 0, 255)).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

export function rgbToHsl(rgb:RGB) {
  const r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = 60 * mod((g - b) / d, 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  const l = (max + min) / 2;
  return { h, s: d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1)), l };
}

export function hslToRgb({ h, s, l }:HSL) {
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const x = chroma * (1 - Math.abs(mod(h / 60, 2) - 1));
  const m = l - chroma / 2;
  const [r, g, b]:[number,number,number] = h < 60 ? [chroma, x, 0] : h < 120 ? [x, chroma, 0] : h < 180 ? [0, chroma, x] : h < 240 ? [0, x, chroma] : h < 300 ? [x, 0, chroma] : [chroma, 0, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

export function rgbToHsv(rgb:RGB) {
  const r=rgb.r/255,g=rgb.g/255,b=rgb.b/255,max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min;
  let h=0; if(delta){if(max===r)h=60*mod((g-b)/delta,6);else if(max===g)h=60*((b-r)/delta+2);else h=60*((r-g)/delta+4);}
  return { h, s:max===0?0:delta/max, v:max };
}

export function hsvToRgb({ h, s, v }:HSV) { const chroma=v*s,x=chroma*(1-Math.abs(mod(h/60,2)-1)),m=v-chroma;const [r,g,b]:[number,number,number]=h<60?[chroma,x,0]:h<120?[x,chroma,0]:h<180?[0,chroma,x]:h<240?[0,x,chroma]:h<300?[x,0,chroma]:[chroma,0,x];return {r:(r+m)*255,g:(g+m)*255,b:(b+m)*255}; }

const linearRgb = (channel:number) => { const value=channel/255; return value<=.04045?value/12.92:((value+.055)/1.055)**2.4; };
const displayRgb = (channel:number) => 255*(channel<=.0031308?12.92*channel:1.055*channel**(1/2.4)-.055);
export function rgbToXyz({ r, g, b }:RGB) { const R=linearRgb(r),G=linearRgb(g),B=linearRgb(b); return { x:.4124564*R+.3575761*G+.1804375*B, y:.2126729*R+.7151522*G+.072175*B, z:.0193339*R+.119192*G+.9503041*B }; }
export function xyzToRgb({ x, y, z }:XYZ) { return { r:displayRgb(3.2404542*x-1.5371385*y-.4985314*z), g:displayRgb(-.969266*x+1.8760108*y+.041556*z), b:displayRgb(.0556434*x-.2040259*y+1.0572252*z) }; }
const labPivot = (value:number) => value>.008856?value**(1/3):(7.787*value)+16/116;
const labPivotInverse = (value:number) => { const cube=value**3; return cube>.008856?cube:(value-16/116)/7.787; };
export function xyzToLab({ x, y, z }:XYZ) { const fx=labPivot(x/.95047),fy=labPivot(y),fz=labPivot(z/1.08883); return { l:116*fy-16, a:500*(fx-fy), b:200*(fy-fz) }; }
export function labToXyz({ l, a, b }:Lab) { const fy=(l+16)/116; return { x:.95047*labPivotInverse(fy+a/500), y:labPivotInverse(fy), z:1.08883*labPivotInverse(fy-b/200) }; }
export function rgbToLab(rgb:RGB) { return xyzToLab(rgbToXyz(rgb)); }
export function labToRgb(lab:Lab) { return xyzToRgb(labToXyz(lab)); }
export function labToLch({ l, a, b }:Lab) { return { l, c:Math.hypot(a,b), h:mod(Math.atan2(b,a)*180/Math.PI,360) }; }
export function lchToLab({ l, c, h }:Lch) { const angle=h*Math.PI/180; return { l, a:c*Math.cos(angle), b:c*Math.sin(angle) }; }
export function rgbToOklab({ r, g, b }:RGB) { const R=linearRgb(r),G=linearRgb(g),B=linearRgb(b),l=Math.cbrt(.4122214708*R+.5363325363*G+.0514459929*B),m=Math.cbrt(.2119034982*R+.6806995451*G+.1073969566*B),s=Math.cbrt(.0883024619*R+.2817188376*G+.6299787005*B); return { l:.2104542553*l+.793617785*m-.0040720468*s, a:1.9779984951*l-2.428592205*m+.4505937099*s, b:.0259040371*l+.7827717662*m-.808675766*s }; }
export function oklabToRgb({ l, a, b }:Lab) { const L=(l+.3963377774*a+.2158037573*b)**3,M=(l-.1055613458*a-.0638541728*b)**3,S=(l-.0894841775*a-1.291485548*b)**3;return {r:displayRgb(4.0767416621*L-3.3077115913*M+.2309699292*S),g:displayRgb(-1.2684380046*L+2.6097574011*M-.3413193965*S),b:displayRgb(-.0041960863*L-.7034186147*M+1.707614701*S)}; }
export function oklabToOklch({ l, a, b }:Lab) { return { l, c:Math.hypot(a,b), h:mod(Math.atan2(b,a)*180/Math.PI,360) }; }
export function oklchToOklab({ l, c, h }:Lch) { const angle=h*Math.PI/180; return {l,a:c*Math.cos(angle),b:c*Math.sin(angle)}; }
export function mapOklchToSrgb({l,c,h}:Lch) {
  if (![l,c,h].every(Number.isFinite) || l<0 || l>1 || c<0 || c>1) throw new Error("OKLCH requires lightness 0–1, chroma 0–1 and finite hue.");
  const rgbAt=(chroma:number)=>oklabToRgb(oklchToOklab({l,c:chroma,h}));
  const fits=(rgb:RGB)=>Object.values(rgb).every((value)=>value>=-.001 && value<=255.001);
  const requested=rgbAt(c);
  if (fits(requested)) return {hex:rgbToHex(requested),mapped:false,chroma:c};
  let low=0,high=c;
  for (let index=0;index<24;index+=1) {const middle=(low+high)/2;if(fits(rgbAt(middle)))low=middle;else high=middle;}
  return {hex:rgbToHex(rgbAt(low)),mapped:true,chroma:low};
}
export function isSrgbGamut(rgb:RGB) { return [rgb.r,rgb.g,rgb.b].every((channel)=>Number.isFinite(channel)&&channel>=0&&channel<=255); }

export function shiftHue(hex:unknown, degrees:number, { saturation, lightness }:{saturation?:number;lightness?:number} = {}) {
  const rgb = hexToRgb(hex); if (!rgb) throw new Error("A valid HEX colour is required.");
  const hsl = rgbToHsl(rgb);
  return rgbToHex(hslToRgb({ h: mod(hsl.h + degrees, 360), s: saturation ?? hsl.s, l: lightness ?? hsl.l }));
}

export function harmony(seed:unknown, type = "analogous") {
  const patterns:Record<string,number[]> = { complementary:[0, 180], splitComplementary:[0, 150, 210], analogous:[-30, 0, 30, 60, -60], triadic:[0, 120, 240], tetradic:[0, 60, 180, 240], square:[0, 90, 180, 270], monochromatic:[0, 0, 0, 0, 0] };
  const steps=Object.hasOwn(patterns,type) ? patterns[type]! : [0];
  return steps.map((step, index) => type === "monochromatic" ? shiftHue(seed, 0, { lightness: [0.2, 0.35, 0.5, 0.65, 0.8][index]! }) : shiftHue(seed, step));
}
export function customHueHarmony(seed:unknown,spacing:number,count=5) {
  if (!normalizeHex(seed) || !Number.isFinite(spacing) || !Number.isInteger(count) || count<1 || count>32) throw new Error("Custom harmony needs a valid seed, finite hue spacing and 1–32 colors.");
  return Array.from({length:count},(_,index)=>shiftHue(seed,index*spacing));
}
export function perceptualScale(seed:unknown,count=5) {
  if (!normalizeHex(seed) || !Number.isInteger(count) || count<2 || count>32) throw new Error("Lightness scale needs a valid seed and 2–32 colors.");
  const lch=oklabToOklch(rgbToOklab(hexToRgb(seed)!));
  return Array.from({length:count},(_,index)=>mapOklchToSrgb({...lch,l:.15+index/(count-1)*.75}).hex);
}

export function luminance(hex:unknown) { const rgb = hexToRgb(hex); if (!rgb) return null; return .2126 * linearRgb(rgb.r) + .7152 * linearRgb(rgb.g) + .0722 * linearRgb(rgb.b); }
export function contrastRatio(a:unknown, b:unknown) { const l1 = luminance(a), l2 = luminance(b); if (l1 === null || l2 === null) return null; return (Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05); }
export function contrastResult(a:unknown, b:unknown) { const ratio = contrastRatio(a, b); return { ratio, aa: ratio !== null && ratio >= 4.5, aaa: ratio !== null && ratio >= 7, largeAa: ratio !== null && ratio >= 3, largeAaa: ratio !== null && ratio >= 4.5 }; }
export function suggestContrast(foreground:unknown,background:unknown,target=4.5) {
  if (!Number.isFinite(target) || target<1 || target>21) throw new Error("Contrast target must be from 1 to 21.");
  const original=normalizeHex(foreground);
  if (!original || !normalizeHex(background)) throw new Error("Valid HEX colors are required.");
  if (contrastRatio(original,background)!>=target) return original;
  const hsl=rgbToHsl(hexToRgb(original)!);
  let best=null,distance=Infinity;
  for (let step=0;step<=1000;step+=1) {
    const l=step/1000,candidate=rgbToHex(hslToRgb({...hsl,l}));
    if (contrastRatio(candidate,background)!>=target && Math.abs(l-hsl.l)<distance) {best=candidate;distance=Math.abs(l-hsl.l);}
  }
  return best;
}

