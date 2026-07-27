(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))n(s);new MutationObserver(s=>{for(const i of s)if(i.type==="childList")for(const o of i.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&n(o)}).observe(document,{childList:!0,subtree:!0});function r(s){const i={};return s.integrity&&(i.integrity=s.integrity),s.referrerPolicy&&(i.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?i.credentials="include":s.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function n(s){if(s.ep)return;s.ep=!0;const i=r(s);fetch(s.href,i)}})();function yo(t){const e=Object.create(null);for(const r of t.split(","))e[r]=1;return r=>r in e}const ce={},Dr=[],Rt=()=>{},Pl=()=>!1,Ks=t=>t.charCodeAt(0)===111&&t.charCodeAt(1)===110&&(t.charCodeAt(2)>122||t.charCodeAt(2)<97),Vs=t=>t.startsWith("onUpdate:"),Ne=Object.assign,vo=(t,e)=>{const r=t.indexOf(e);r>-1&&t.splice(r,1)},Fu=Object.prototype.hasOwnProperty,de=(t,e)=>Fu.call(t,e),G=Array.isArray,Lr=t=>Xr(t)==="[object Map]",Yr=t=>Xr(t)==="[object Set]",Yo=t=>Xr(t)==="[object Date]",Hu=t=>Xr(t)==="[object RegExp]",ee=t=>typeof t=="function",Se=t=>typeof t=="string",mt=t=>typeof t=="symbol",he=t=>t!==null&&typeof t=="object",Nl=t=>(he(t)||ee(t))&&ee(t.then)&&ee(t.catch),jl=Object.prototype.toString,Xr=t=>jl.call(t),qu=t=>Xr(t).slice(8,-1),Dl=t=>Xr(t)==="[object Object]",_o=t=>Se(t)&&t!=="NaN"&&t[0]!=="-"&&""+parseInt(t,10)===t,gn=yo(",key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted"),Ws=t=>{const e=Object.create(null);return(r=>e[r]||(e[r]=t(r)))},Ku=/-\w/g,We=Ws(t=>t.replace(Ku,e=>e.slice(1).toUpperCase())),Vu=/\B([A-Z])/g,lr=Ws(t=>t.replace(Vu,"-$1").toLowerCase()),zs=Ws(t=>t.charAt(0).toUpperCase()+t.slice(1)),mi=Ws(t=>t?`on${zs(t)}`:""),Le=(t,e)=>!Object.is(t,e),Br=(t,...e)=>{for(let r=0;r<t.length;r++)t[r](...e)},Ll=(t,e,r,n=!1)=>{Object.defineProperty(t,e,{configurable:!0,enumerable:!1,writable:n,value:r})},Js=t=>{const e=parseFloat(t);return isNaN(e)?t:e},Wu=t=>{const e=Se(t)?Number(t):NaN;return isNaN(e)?t:e};let Xo;const Gs=()=>Xo||(Xo=typeof globalThis<"u"?globalThis:typeof self<"u"?self:typeof window<"u"?window:typeof global<"u"?global:{});function Hn(t){if(G(t)){const e={};for(let r=0;r<t.length;r++){const n=t[r],s=Se(n)?Yu(n):Hn(n);if(s)for(const i in s)e[i]=s[i]}return e}else if(Se(t)||he(t))return t}const zu=/;(?![^(]*\))/g,Ju=/:([^]+)/,Gu=/\/\*[^]*?\*\//g;function Yu(t){const e={};return t.replace(Gu,"").split(zu).forEach(r=>{if(r){const n=r.split(Ju);n.length>1&&(e[n[0].trim()]=n[1].trim())}}),e}function Ye(t){let e="";if(Se(t))e=t;else if(G(t))for(let r=0;r<t.length;r++){const n=Ye(t[r]);n&&(e+=n+" ")}else if(he(t))for(const r in t)t[r]&&(e+=r+" ");return e.trim()}const Xu="itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly",Qu=yo(Xu);function Bl(t){return!!t||t===""}function Zu(t,e){if(t.length!==e.length)return!1;let r=!0;for(let n=0;r&&n<t.length;n++)r=Qr(t[n],e[n]);return r}function Qr(t,e){if(t===e)return!0;let r=Yo(t),n=Yo(e);if(r||n)return r&&n?t.getTime()===e.getTime():!1;if(r=mt(t),n=mt(e),r||n)return t===e;if(r=G(t),n=G(e),r||n)return r&&n?Zu(t,e):!1;if(r=he(t),n=he(e),r||n){if(!r||!n)return!1;const s=Object.keys(t).length,i=Object.keys(e).length;if(s!==i)return!1;for(const o in t){const a=t.hasOwnProperty(o),l=e.hasOwnProperty(o);if(a&&!l||!a&&l||!Qr(t[o],e[o]))return!1}}return String(t)===String(e)}function bo(t,e){return t.findIndex(r=>Qr(r,e))}const Ul=t=>!!(t&&t.__v_isRef===!0),N=t=>Se(t)?t:t==null?"":G(t)||he(t)&&(t.toString===jl||!ee(t.toString))?Ul(t)?N(t.value):JSON.stringify(t,Ml,2):String(t),Ml=(t,e)=>Ul(e)?Ml(t,e.value):Lr(e)?{[`Map(${e.size})`]:[...e.entries()].reduce((r,[n,s],i)=>(r[gi(n,i)+" =>"]=s,r),{})}:Yr(e)?{[`Set(${e.size})`]:[...e.values()].map(r=>gi(r))}:mt(e)?gi(e):he(e)&&!G(e)&&!Dl(e)?String(e):e,gi=(t,e="")=>{var r;return mt(t)?`Symbol(${(r=t.description)!=null?r:e})`:t};let De;class ed{constructor(e=!1){this.detached=e,this._active=!0,this._on=0,this.effects=[],this.cleanups=[],this._isPaused=!1,this._warnOnRun=!0,this.__v_skip=!0,!e&&De&&(De.active?(this.parent=De,this.index=(De.scopes||(De.scopes=[])).push(this)-1):(this._active=!1,this._warnOnRun=!1))}get active(){return this._active}pause(){if(this._active){this._isPaused=!0;let e,r;if(this.scopes){const n=this.scopes.slice();for(e=0,r=n.length;e<r;e++)n[e].pause()}for(e=0,r=this.effects.length;e<r;e++)this.effects[e].pause()}}resume(){if(this._active&&this._isPaused){this._isPaused=!1;let e,r;if(this.scopes){const s=this.scopes.slice();for(e=0,r=s.length;e<r;e++)s[e].resume()}const n=this.effects.slice();for(e=0,r=n.length;e<r;e++)n[e].resume()}}run(e){if(this._active){const r=De;try{return De=this,e()}finally{De=r}}}on(){++this._on===1&&(this.prevScope=De,De=this)}off(){if(this._on>0&&--this._on===0){if(De===this)De=this.prevScope;else{let e=De;for(;e;){if(e.prevScope===this){e.prevScope=this.prevScope;break}e=e.prevScope}}this.prevScope=void 0}}stop(e){if(this._active){this._active=!1;let r,n;for(r=0,n=this.effects.length;r<n;r++)this.effects[r].stop();for(this.effects.length=0,r=0,n=this.cleanups.length;r<n;r++)this.cleanups[r]();if(this.cleanups.length=0,this.scopes){const s=this.scopes.slice();for(r=0,n=s.length;r<n;r++)s[r].stop(!0);this.scopes.length=0}if(!this.detached&&this.parent&&!e){const s=this.parent.scopes.pop();s&&s!==this&&(this.parent.scopes[this.index]=s,s.index=this.index)}this.parent=void 0}}}function td(){return De}let be;const yi=new WeakSet;class Fl{constructor(e){this.fn=e,this.deps=void 0,this.depsTail=void 0,this.flags=5,this.next=void 0,this.cleanup=void 0,this.scheduler=void 0,De&&(De.active?De.effects.push(this):this.flags&=-2)}pause(){this.flags|=64}resume(){this.flags&64&&(this.flags&=-65,yi.has(this)&&(yi.delete(this),this.trigger()))}notify(){this.flags&2&&!(this.flags&32)||this.flags&8||ql(this)}run(){if(!(this.flags&1))return this.fn();this.flags|=2,Qo(this),Kl(this);const e=be,r=ft;be=this,ft=!0;try{return this.fn()}finally{Vl(this),be=e,ft=r,this.flags&=-3}}stop(){if(this.flags&1){for(let e=this.deps;e;e=e.nextDep)ko(e);this.deps=this.depsTail=void 0,Qo(this),this.onStop&&this.onStop(),this.flags&=-2}}trigger(){this.flags&64?yi.add(this):this.scheduler?this.scheduler():this.runIfDirty()}runIfDirty(){Di(this)&&this.run()}get dirty(){return Di(this)}}let Hl=0,yn,vn;function ql(t,e=!1){if(t.flags|=8,e){t.next=vn,vn=t;return}t.next=yn,yn=t}function wo(){Hl++}function So(){if(--Hl>0)return;if(vn){let e=vn;for(vn=void 0;e;){const r=e.next;e.next=void 0,e.flags&=-9,e=r}}let t;for(;yn;){let e=yn;for(yn=void 0;e;){const r=e.next;if(e.next=void 0,e.flags&=-9,e.flags&1)try{e.trigger()}catch(n){t||(t=n)}e=r}}if(t)throw t}function Kl(t){for(let e=t.deps;e;e=e.nextDep)e.version=-1,e.prevActiveLink=e.dep.activeLink,e.dep.activeLink=e}function Vl(t){let e,r=t.depsTail,n=r;for(;n;){const s=n.prevDep;n.version===-1?(n===r&&(r=s),ko(n),rd(n)):e=n,n.dep.activeLink=n.prevActiveLink,n.prevActiveLink=void 0,n=s}t.deps=e,t.depsTail=r}function Di(t){for(let e=t.deps;e;e=e.nextDep)if(e.dep.version!==e.version||e.dep.computed&&(Wl(e.dep.computed)||e.dep.version!==e.version))return!0;return!!t._dirty}function Wl(t){if(t.flags&4&&!(t.flags&16)||(t.flags&=-17,t.globalVersion===Tn)||(t.globalVersion=Tn,!t.isSSR&&t.flags&128&&(!t.deps&&!t._dirty||!Di(t))))return;t.flags|=2;const e=t.dep,r=be,n=ft;be=t,ft=!0;try{Kl(t);const s=t.fn(t._value);(e.version===0||Le(s,t._value))&&(t.flags|=128,t._value=s,e.version++)}catch(s){throw e.version++,s}finally{be=r,ft=n,Vl(t),t.flags&=-3}}function ko(t,e=!1){const{dep:r,prevSub:n,nextSub:s}=t;if(n&&(n.nextSub=s,t.prevSub=void 0),s&&(s.prevSub=n,t.nextSub=void 0),r.subs===t&&(r.subs=n,!n&&r.computed)){r.computed.flags&=-5;for(let i=r.computed.deps;i;i=i.nextDep)ko(i,!0)}!e&&!--r.sc&&r.map&&r.map.delete(r.key)}function rd(t){const{prevDep:e,nextDep:r}=t;e&&(e.nextDep=r,t.prevDep=void 0),r&&(r.prevDep=e,t.nextDep=void 0)}let ft=!0;const zl=[];function Wt(){zl.push(ft),ft=!1}function zt(){const t=zl.pop();ft=t===void 0?!0:t}function Qo(t){const{cleanup:e}=t;if(t.cleanup=void 0,e){const r=be;be=void 0;try{e()}finally{be=r}}}let Tn=0;class nd{constructor(e,r){this.sub=e,this.dep=r,this.version=r.version,this.nextDep=this.prevDep=this.nextSub=this.prevSub=this.prevActiveLink=void 0}}class Ys{constructor(e){this.computed=e,this.version=0,this.activeLink=void 0,this.subs=void 0,this.map=void 0,this.key=void 0,this.sc=0,this.__v_skip=!0}track(e){if(!be||!ft||be===this.computed)return;let r=this.activeLink;if(r===void 0||r.sub!==be)r=this.activeLink=new nd(be,this),be.deps?(r.prevDep=be.depsTail,be.depsTail.nextDep=r,be.depsTail=r):be.deps=be.depsTail=r,Jl(r);else if(r.version===-1&&(r.version=this.version,r.nextDep)){const n=r.nextDep;n.prevDep=r.prevDep,r.prevDep&&(r.prevDep.nextDep=n),r.prevDep=be.depsTail,r.nextDep=void 0,be.depsTail.nextDep=r,be.depsTail=r,be.deps===r&&(be.deps=n)}return r}trigger(e){this.version++,Tn++,this.notify(e)}notify(e){wo();try{for(let r=this.subs;r;r=r.prevSub)r.sub.notify()&&r.sub.dep.notify()}finally{So()}}}function Jl(t){if(t.dep.sc++,t.sub.flags&4){const e=t.dep.computed;if(e&&!t.dep.subs){e.flags|=20;for(let n=e.deps;n;n=n.nextDep)Jl(n)}const r=t.dep.subs;r!==t&&(t.prevSub=r,r&&(r.nextSub=t)),t.dep.subs=t}}const Li=new WeakMap,br=Symbol(""),Bi=Symbol(""),Cn=Symbol("");function Ke(t,e,r){if(ft&&be){let n=Li.get(t);n||Li.set(t,n=new Map);let s=n.get(r);s||(n.set(r,s=new Ys),s.map=n,s.key=r),s.track()}}function Ht(t,e,r,n,s,i){const o=Li.get(t);if(!o){Tn++;return}const a=l=>{l&&l.trigger()};if(wo(),e==="clear")o.forEach(a);else{const l=G(t),c=l&&_o(r);if(l&&r==="length"){const u=Number(n);o.forEach((h,f)=>{(f==="length"||f===Cn||!mt(f)&&f>=u)&&a(h)})}else switch((r!==void 0||o.has(void 0))&&a(o.get(r)),c&&a(o.get(Cn)),e){case"add":l?c&&a(o.get("length")):(a(o.get(br)),Lr(t)&&a(o.get(Bi)));break;case"delete":l||(a(o.get(br)),Lr(t)&&a(o.get(Bi)));break;case"set":Lr(t)&&a(o.get(br));break}}So()}function Er(t){const e=ue(t);return e===t?e:(Ke(e,"iterate",Cn),at(t)?e:e.map(gt))}function Xs(t){return Ke(t=ue(t),"iterate",Cn),t}function Tt(t,e){return Jt(t)?Kr(wr(t)?gt(e):e):gt(e)}const sd={__proto__:null,[Symbol.iterator](){return vi(this,Symbol.iterator,t=>Tt(this,t))},concat(...t){return Er(this).concat(...t.map(e=>G(e)?Er(e):e))},entries(){return vi(this,"entries",t=>(t[1]=Tt(this,t[1]),t))},every(t,e){return Pt(this,"every",t,e,void 0,arguments)},filter(t,e){return Pt(this,"filter",t,e,r=>r.map(n=>Tt(this,n)),arguments)},find(t,e){return Pt(this,"find",t,e,r=>Tt(this,r),arguments)},findIndex(t,e){return Pt(this,"findIndex",t,e,void 0,arguments)},findLast(t,e){return Pt(this,"findLast",t,e,r=>Tt(this,r),arguments)},findLastIndex(t,e){return Pt(this,"findLastIndex",t,e,void 0,arguments)},forEach(t,e){return Pt(this,"forEach",t,e,void 0,arguments)},includes(...t){return _i(this,"includes",t)},indexOf(...t){return _i(this,"indexOf",t)},join(t){return Er(this).join(t)},lastIndexOf(...t){return _i(this,"lastIndexOf",t)},map(t,e){return Pt(this,"map",t,e,void 0,arguments)},pop(){return on(this,"pop")},push(...t){return on(this,"push",t)},reduce(t,...e){return Zo(this,"reduce",t,e)},reduceRight(t,...e){return Zo(this,"reduceRight",t,e)},shift(){return on(this,"shift")},some(t,e){return Pt(this,"some",t,e,void 0,arguments)},splice(...t){return on(this,"splice",t)},toReversed(){return Er(this).toReversed()},toSorted(t){return Er(this).toSorted(t)},toSpliced(...t){return Er(this).toSpliced(...t)},unshift(...t){return on(this,"unshift",t)},values(){return vi(this,"values",t=>Tt(this,t))}};function vi(t,e,r){const n=Xs(t),s=n[e]();return n!==t&&!at(t)&&(s._next=s.next,s.next=()=>{const i=s._next();return i.done||(i.value=r(i.value)),i}),s}const id=Array.prototype;function Pt(t,e,r,n,s,i){const o=Xs(t),a=o!==t&&!at(t),l=o[e];if(l!==id[e]){const h=l.apply(t,i);return a?gt(h):h}let c=r;o!==t&&(a?c=function(h,f){return r.call(this,Tt(t,h),f,t)}:r.length>2&&(c=function(h,f){return r.call(this,h,f,t)}));const u=l.call(o,c,n);return a&&s?s(u):u}function Zo(t,e,r,n){const s=Xs(t),i=s!==t&&!at(t);let o=r,a=!1;s!==t&&(i?(a=n.length===0,o=function(c,u,h){return a&&(a=!1,c=Tt(t,c)),r.call(this,c,Tt(t,u),h,t)}):r.length>3&&(o=function(c,u,h){return r.call(this,c,u,h,t)}));const l=s[e](o,...n);return a?Tt(t,l):l}function _i(t,e,r){const n=ue(t);Ke(n,"iterate",Cn);const s=n[e](...r);return(s===-1||s===!1)&&To(r[0])?(r[0]=ue(r[0]),n[e](...r)):s}function on(t,e,r=[]){Wt(),wo();const n=ue(t)[e].apply(t,r);return So(),zt(),n}const od=yo("__proto__,__v_isRef,__isVue"),Gl=new Set(Object.getOwnPropertyNames(Symbol).filter(t=>t!=="arguments"&&t!=="caller").map(t=>Symbol[t]).filter(mt));function ad(t){mt(t)||(t=String(t));const e=ue(this);return Ke(e,"has",t),e.hasOwnProperty(t)}class Yl{constructor(e=!1,r=!1){this._isReadonly=e,this._isShallow=r}get(e,r,n){if(r==="__v_skip")return e.__v_skip;const s=this._isReadonly,i=this._isShallow;if(r==="__v_isReactive")return!s;if(r==="__v_isReadonly")return s;if(r==="__v_isShallow")return i;if(r==="__v_raw")return n===(s?i?yd:ec:i?Zl:Ql).get(e)||Object.getPrototypeOf(e)===Object.getPrototypeOf(n)?e:void 0;const o=G(e);if(!s){let l;if(o&&(l=sd[r]))return l;if(r==="hasOwnProperty")return ad}const a=Reflect.get(e,r,ze(e)?e:n);if((mt(r)?Gl.has(r):od(r))||(s||Ke(e,"get",r),i))return a;if(ze(a)){const l=o&&_o(r)?a:a.value;return s&&he(l)?Mi(l):l}return he(a)?s?Mi(a):Xt(a):a}}class Xl extends Yl{constructor(e=!1){super(!1,e)}set(e,r,n,s){let i=e[r];const o=G(e)&&_o(r);if(!this._isShallow){const c=Jt(i);if(!at(n)&&!Jt(n)&&(i=ue(i),n=ue(n)),!o&&ze(i)&&!ze(n))return c||(i.value=n),!0}const a=o?Number(r)<e.length:de(e,r),l=Reflect.set(e,r,n,ze(e)?e:s);return e===ue(s)&&l&&(a?Le(n,i)&&Ht(e,"set",r,n):Ht(e,"add",r,n)),l}deleteProperty(e,r){const n=de(e,r);e[r];const s=Reflect.deleteProperty(e,r);return s&&n&&Ht(e,"delete",r,void 0),s}has(e,r){const n=Reflect.has(e,r);return(!mt(r)||!Gl.has(r))&&Ke(e,"has",r),n}ownKeys(e){return Ke(e,"iterate",G(e)?"length":br),Reflect.ownKeys(e)}}class ld extends Yl{constructor(e=!1){super(!0,e)}set(e,r){return!0}deleteProperty(e,r){return!0}}const cd=new Xl,ud=new ld,dd=new Xl(!0);const Ui=t=>t,Xn=t=>Reflect.getPrototypeOf(t);function hd(t,e,r){return function(...n){const s=this.__v_raw,i=ue(s),o=Lr(i),a=t==="entries"||t===Symbol.iterator&&o,l=t==="keys"&&o,c=s[t](...n),u=r?Ui:e?Kr:gt;return!e&&Ke(i,"iterate",l?Bi:br),Ne(Object.create(c),{next(){const{value:h,done:f}=c.next();return f?{value:h,done:f}:{value:a?[u(h[0]),u(h[1])]:u(h),done:f}}})}}function Qn(t){return function(...e){return t==="delete"?!1:t==="clear"?void 0:this}}function fd(t,e){const r={get(s){const i=this.__v_raw,o=ue(i),a=ue(s);t||(Le(s,a)&&Ke(o,"get",s),Ke(o,"get",a));const{has:l}=Xn(o),c=e?Ui:t?Kr:gt;if(l.call(o,s))return c(i.get(s));if(l.c×m¸÷«h‘éì¶»§q«^u\Ë˜Ø\™›ÛÚÐÛÝ[˜K˜\ÜÙ[X›YÜ™X›ÛÚÜÏË›[™ÝK›Ü™X›ÛÚÜÏË˜›ÛÚÜÏË›[™Ý[žPÛÝ[ŠK˜\ÜÙ[X›YÜ™X›ÛÚÜß×JKœ™YXÙJ
ÊOO›
ÊË™[šY\ÏË›[™Ý
K
_JJK™š[\ŠÏO›Ë˜Ø\™Þ[˜ÙYË˜›ÛÚÐÛÝ[
JKVŠ

OO“Øš™XÝ™[šY\ÊËœÞ[˜Ë]™\›’[˜›Þ
K™š[\Š
Û×JOOˆYËœÞ[˜Ë˜Ú\˜XÝ\š[™[™ÜÖÛ×JK›X\

ÛËWJOOŠÚÙ^N›Ë˜[YN˜K˜XÝ]™OË˜Ú\˜XÝ\“˜[Y_K˜Ú\˜XÝ\“˜[Y_¹§*¹doyd#zadºi¡º)äº"lˆ‹Ø]™S˜[YN˜K˜XÝ]™OËœØ]™S˜[Y_¹odùbcykf9¨hÈŸJJJKÏVŠ

OO“Øš™XÝ™[šY\ÊËœÞ[˜Ë›Z\ÛX]Ú\ÊK›X\

ÛËWJOOŠØÚ\˜XÝ\Ž™Ë˜Ú\˜XÝ\œË™š[™
O›šYOO[ÊKZ\ÛX]Ú˜_JJK™š[\ŠÏO›Ë˜Ú\˜XÝ\ŠJNÙ[˜Ý[ÛˆJÊ^ØÛÛœÝOYK˜[YVÛËšÙ^WNÔXŠËšÙ^KJI‰™[]HK˜[YVÛËšÙ^W_\™]\›ŠËJOOŠŠ
KJœÙXÝ[Ûˆ‹]ËÕÊ‹Ý]Nˆ¹d#9«iy.+yoàÈ‹ÝX]Nˆ¹§éyç"ù§+9§.¹a¡yk®xà zadºi¡¹kf9¨hùd£9i&¹êëù§ 9¥¬9â­¹  xà ˆŸJKÊ˜ŠK‹˜[YK›[™ÝÊŠ
KJ˜\XÛH‹ËØVÌ_
VÌOY
šXY\ˆ‹ØÛ\ÜÎˆœÞ[˜ËXØ\™ZXY[™ÈŸKÙ
™]ˆ‹[Ù
œÛX[‹[•U‘T“ˆTÔÑUÈŠK
šˆ‹[ºadºi¡º-a9¥¦yd#9«iHŠWJWKLJJK
ŠL
KJ™K[	J‹˜[YKOŠŠ
KJœÙXÝ[Ûˆ‹ÚÙ^N›šÙ^_KÙ
œÜ[ˆ‹[Ù
œÝ›Û™È‹[Š›˜[YJKJK
œÛX[‹[Š˜Ø\™Þ[˜ÙYÈº)äº"l¹chymì¹d#9«iHŽˆ¹ëbyo¡z)äº"l¹chHŠJÈˆ0­ÈŠÓŠ˜›ÛÚÐÛÝ[
JÈˆ9§+9.%¹åc9.iˆ0­ÈŠÓŠ™[žPÛÝ[
JÈˆ9.*¹§hyæëˆ‹JWJWJJJKLŽ
JWJJNœÙJˆ‹L
K
ŠL
KJ™K[	JË˜[YKOŠŠ
KJËÚÙ^N›˜Ú\˜XÝ\‹šYÚ\˜XÝ\Ž›˜Ú\˜XÝ\‹Z\ÛX]Ú››Z\ÛX]ÚK[È˜Ú\˜XÝ\ˆ‹›Z\ÛX]Ú—JJJKLŽ
JK‹˜[YK›[™ÝÊŠ
KJ˜\XÛH‹ËØVÌ—_
VÌ—OY
šXY\ˆ‹ØÛ\ÜÎˆœÞ[˜ËXØ\™ZXY[™ÈŸKÙ
™]ˆ‹[Ù
œÛX[‹[ÒTPÕTˆ’S‘S‘ÈŠK
šˆ‹[¹îäyk¦ºadºi¡º)äº"lˆŠWJWKLJJK
ŠL
KJ™K[	J‹˜[YKOŠŠ
KJœÙXÝ[Ûˆ‹ÚÙ^N›šÙ^_KÙ
œÜ[ˆ‹[Ù
œÝ›Û™È‹[Š›˜[YJKJK
œÛX[‹[ŠœØ]™S˜[YJKJWJKÙJ
œÙ[XÝ‹È›Û•\]N›[Ù[˜[YHŽ˜ÏO™K˜[YVÛšÙ^WOXßKØVÌW_
VÌWOY
›Ü[Ûˆ‹Ý˜[YNˆˆŸKº`"y¢êyl#ù¢bù§.º)äº"lˆ‹LJJK
ŠL
KJ™K[	JÊÊK˜Ú\˜XÝ\œËÏOŠŠ
KJ›Ü[Ûˆ‹ÚÙ^N˜ËšY˜[YN˜ËšYKŠË›˜[YJKKÊJJKLŽ
JWKÊKÖÒËK˜[YVÛšÙ^WWWJK
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹\ØX›YˆYK˜[YVÛšÙ^WKÛÛXÚÎ˜ÏOšJ
_K¹îäyk¦ˆ‹]ÊWJJJKLŽ
JWJJNœÙJˆ‹L
KÊØŠKÊØŠK
ŠL
KJ™K[	JÊÊK˜Ú\˜XÝ\œËOŠŠ
KJÝËÚÙ^N›šYÚ\˜XÝ\Ž›K[È˜Ú\˜XÝ\ˆ—JJJKLŽ
JWJJ__K]Ï^ØÛ\ÜÎˆ›[Ù[ZXY\ˆŸK›^××Û˜[YNˆ˜\ÙS[Ù[‹›ÜÎžÝ]NžÝ\N”Ýš[™Ë™\]Z\™YˆLKÚYNžÝ\N›ÛÛX[‹Y˜][ˆL__K[Z]Î–È˜ÛÜÙH—KÙ]\
Ù[Z]™_J^ØÛÛœÝYNÜ™]\›Š‹ÊOOŠŠ
KJ™]ˆ‹ØÛ\ÜÎˆ›[Ù[[^Y\ˆ‹›ÛNˆ™X[ÙÈ‹˜\šXK[[Ù[ŽˆYH‹ÛÛXÚÎœÖÌW_
ÖÌWOZÜŠOOœŠ˜ÛÜÙHŠKÈœÙ[ˆ—JJ_KÙ
œÙXÝ[Ûˆ‹ØÛ\ÜÎ–YJÈ›[Ù[\[™[‹È›\™ÙK[[Ù[ŽÚY_WJ_KÙ
šXY\ˆ‹]ËÙ
™]ˆ‹[ÜÖÌ—_
ÖÌ—OY
œÛX[‹[“S‘TÓ‘H‹LJJK
šˆ‹[Š]JKJWJK
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹˜\šXK[X™[Žˆ¹alúeëH‹ÛÛXÚÎœÖÌ_
ÖÌOZOOœŠ˜ÛÜÙHŠJ_K°åÈŠWJKšJ‹‰ÛÝË™Y˜][ŠWKŠWJJ__KÏ^ØÛ\ÜÎˆ˜Ú\˜XÝ\‹X]˜]\‹YY]ÜˆŸKÝÏ^ØÛ\ÜÎˆœÛÙX]ÛˆŸKÏ^ØÛ\ÜÎˆ›[Ù[YšY[ŸKÝÏ^ØÛ\ÜÎˆ›[Ù[YšY[ŸKÝÏ^ØÛ\ÜÎˆ›[Ù[YšY[ŸKÝÏ^ØÛ\ÜÎˆ›[Ù[YšY[ŸK]Ï^ØÛ\ÜÎˆ›[Ù[YšY[ŸK]Ï^ØÛ\ÜÎˆ›[Ù[YšY[ŸKÏ^ØÛ\ÜÎˆ›[Ù[YšY[ŸKÝÏ^ØÛ\ÜÎˆ›[Ù[YšY[ŸKÝÏ^ØÛ\ÜÎˆ›[Ù[XXÝ[ÛœÈÜ]XXÝ[ÛœÈŸKÏ^××Û˜[YNˆÚ\˜XÝ\‘Y]Ü“[Ù[‹Ù]\

^ØÛÛœÝOVŠ

OO™Ë˜Ú\˜XÝ\œË™š[™
ÏOœËšYOOXYK˜Ú\˜XÝ\’Y
JKV
”ÓÓ‹œ\œÙJ”ÓÓ‹œÝš[™ÚYžJK˜[YJJJNØ\Þ[˜È[˜Ý[ÛˆŠÊ^ØÛÛœÝO\Ë\™Ù]™š[\ÏË–ÌNÚYŠË\™Ù]˜[YOHˆ‹HZJ]ž^Ü‹˜]˜]\X]ØZ]›ÊJ_XØ]ÚÜJ¹i-9`ãú+îùcå¹i,z-)HŠ__\™]\›ŠËJOOŠŠ
KJ›‹Ý]Nˆ¹ï%º/¤z)äº"l¹chH‹ÚYNˆˆ‹ÛÛÜÙNšVÌLW_
VÌLWO[ÏOšÊYJK˜Ú\˜XÝ\’Y[[
_KÙY˜][ž]


OO–Ù
™›Ü›H‹ÛÛ”ÝX›Z]šVÌL_
VÌLOZÜŠÏOšÊ×ÊJŠKÈœ™]™[—JJ_KÙ
™]ˆ‹ËÕÊÜÜ˜Îœ‹˜]˜]\‹˜[YNœ‹›˜[Y_K[ÈœÜ˜È‹›˜[YH—JK
›X™[‹ÝËÚVÌL—_
VÌL—OSYJˆ9¦í9£h¹i-9`ãÈ‹LJJK
š[œ]‹Ý\Nˆ™š[H‹XØÙ\ˆš[XYÙKÊˆ‹ÛÚ[™ÙN›ŸK[ÌŠWJK
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎšVÌ_
VÌO[ÏOœ‹˜]˜]\HˆŠ_K¹éîúfi9i-9`ãÈŠWJK
›X™[‹ËÚVÌL×_
VÌL×OY
œÜ[ˆ‹[º)äº"l¹d#H‹LJJKÙJ
š[œ]‹È›Û•\]N›[Ù[˜[YHŽšVÌW_
VÌWO[ÏOœ‹›˜[YO[ÊK™\]Z\™YˆˆŸK[LLŠKÖÝÙK‹›˜[YWWJWJK
›X™[‹ÝËÚVÌM_
VÌMOY
œÜ[ˆ‹[º)äº"l¹£ãú/ì‹LJJKÙJ
^\™XH‹È›Û•\]N›[Ù[˜[YHŽšVÌ—_
VÌ—O[ÏOœ‹™\ØÜš\[Û[ÊK›ÝÜÎˆHŸK[LLŠKÖÝÙK‹™\ØÜš\[Û—WJWJK
›X™[‹ÝËÚVÌMW_
VÌMWOY
œÜ[ˆ‹[¹ )ù¨/‹LJJKÙJ
^\™XH‹È›Û•\]N›[Ù[˜[YHŽšVÌ×_
VÌ×O[ÏOœ‹œ\œÛÛ˜[]O[ÊK›ÝÜÎˆŸK[LLŠKÖÝÙK‹œ\œÛÛ˜[]WWJWJK
›X™[‹ÝËÚVÌM—_
VÌM—OY
œÜ[ˆ‹[¹g.¹¦kÈ‹LJJKÙJ
^\™XH‹È›Û•\]N›[Ù[˜[YHŽšVÍ_
VÍO[ÏOœ‹œØÙ[˜\š[Ï[ÊK›ÝÜÎˆŸK[LLŠKÖÝÙK‹œØÙ[˜\š[×WJWJK
›X™[‹]ËÚVÌM×_
VÌM×OY
œÜ[ˆ‹[¹ë+9. 9§hy­¢9 kÈ‹LJJKÙJ
^\™XH‹È›Û•\]N›[Ù[˜[YHŽšVÍW_
VÍWO[ÏOœ‹™š\œÝY\Ï[ÊK›ÝÜÎˆŸK[LLŠKÖÝÙK‹™š\œÝY\×WJWJK
›X™[‹]ËÚVÌN_
VÌNOY
œÜ[ˆ‹[¹kîz+çyé.¹/¢È‹LJJKÙJ
^\™XH‹È›Û•\]N›[Ù[˜[YHŽšVÍ—_
VÍ—O[ÏOœ‹›Y\Ñ^[\O[ÊK›ÝÜÎˆHŸK[LLŠKÖÝÙK‹›Y\Ñ^[\WWJWJK
›X™[‹ËÚVÌNW_
VÌNWOY
œÜ[ˆ‹[º)äº"l¹chyìîùîçù£ä9é.º+ãH‹LJJKÙJ
^\™XH‹È›Û•\]N›[Ù[˜[YHŽšVÍ×_
VÍ×O[ÏOœ‹œÞ\Ý[T›Û\[ÊK›ÝÜÎˆŸK[LLŠKÖÝÙK‹œÞ\Ý[T›Û\WJWJK
›X™[‹ÝËÚVÌŒ_
VÌŒOY
œÜ[ˆ‹[¹c¡¹cì¹d#¹£!ù.é‹LJJKÙJ
^\™XH‹È›Û•\]N›[Ù[˜[YHŽšVÎ_
VÎO[ÏOœ‹œÜÝ\ÝÜžR[œÝXÝ[ÛœÏ[ÊK›ÝÜÎˆŸK[LLŠKÖÝÙK‹œÜÝ\ÝÜžR[œÝXÝ[Ûœ×WJWJK
™]ˆ‹ÝËÙ
˜]Ûˆ‹ØÛ\ÜÎˆ™[™Ù\‹X]Ûˆ‹\Nˆ˜]Ûˆ‹ÛÛXÚÎšVÎW_
VÎWO[ÏOšÊ×ÊJ‹šY
J_K¹b(:fi:)äº"lˆŠKVÌŒW_
VÌŒWOY
˜]Ûˆ‹ØÛ\ÜÎˆœš[X\žKX]Ûˆ‹\NˆœÝX›Z]ŸK¹/çykf:)äº"l¹chH‹LJJWJWKÌŠWJKÎŒ_JJ__K	Ï^ØÛ\ÜÎˆÛÜ››ÛÚËY[žKYY]ÜˆŸK]Ï^ØÛ\ÜÎˆœÝÚ]ÚXÛÛ›ÛŸKÏ^ØÛ\ÜÎˆ›[Ù[YšY[ŸKÏ^ØÛ\ÜÎˆ›[Ù[YšY[ŸKÏVÈ˜[YH—KÏ^ØÛ\ÜÎˆ›[Ù[YšY[ŸKÏVÈ˜[YH—KÏ^ØÛ\ÜÎˆ›[Ù[YšY[ŸKÏ^ØÛ\ÜÎˆ™[žK[Ü[ÛœÈŸK]Ï^××Û˜[YNˆ•ÛÜ››ÛÚÑ[žQY]Üˆ‹›ÜÎžÙ[žNžÝ\N“Øš™XÝ™\]Z\™YˆLK[™^žÝ\N“[X™\‹™\]Z\™YˆL_K[Z]Î–È™[]H—KÙ]\
Ù[Z]™_J^ØÛÛœÝ]YNÙ[˜Ý[ÛˆÊÊ^Ü‹™[žKšÙ^\Ï[Ë\™Ù]˜[YKœÜ]
ÖË;ï#ŸJËÊK›X\
OO˜Kš[J
JK™š[\Š›ÛÛX[Š_Y[˜Ý[ÛˆJÊ^Ü‹™[žKœÙXÛÛ™\žRÙ^\Ï[Ë\™Ù]˜[YKœÜ]
ÖË;ï#ŸJËÊK›X\
OO˜Kš[J
JK™š[\Š›ÛÛX[Š_\™]\›ŠËJOOŠŠ
KJ˜\XÛH‹	ËÙ
šXY\ˆ‹[Ù
›X™[‹]ËÛÙJ
š[œ]‹È›Û•\]N›[Ù[˜[YHŽ˜VÌ_
VÌO[O™[žK™[˜X›Y[
K\Nˆ˜ÚXÚØ›ÞŸK[LLŠKÖÝÛ‹™[žK™[˜X›YWJKVÍ×_
VÍ×OY
œÜ[ˆ‹[[LJJWJK
œÝ›Û™È‹[¹§hyæëˆŠÓŠš[™^
ÌJKJK
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹˜\šXK[X™[Žˆ¹b(:fi9§hyæëˆ‹ÛÛXÚÎ˜VÌW_
VÌWO[O›Š™[]HŠJ_K°åÈŠWJK
›X™[‹ËØVÎ_
VÎOY
œÜ[ˆ‹[¹§hyæë¹d#yéì‹LJJKÙJ
š[œ]‹È›Û•\]N›[Ù[˜[YHŽ˜VÌ—_
VÌ—O[O™[žK˜ÛÛ[Y[[
_K[LLŠKÖÝÙK™[žK˜ÛÛ[Y[WJWJK
›X™[‹ËØVÎW_
VÎWOY
œÜ[ˆ‹[¹alúe+º+ã{ï":`%ùcíù¢%¹£hº(c9b!ºf¥;ï"H‹LJJK
^\™XH‹Ý˜[YN™[žKšÙ^\Ëš›Ú[Š‹ŠK›ÝÜÎˆŒˆ‹Û’[œ]œßK[ÊWJK
›X™[‹ËØVÌL_
VÌLOY
œÜ[ˆ‹[¹«(yalúe+º+ãH‹LJJK
^\™XH‹Ý˜[YN™[žKœÙXÛÛ™\žRÙ^\Ëš›Ú[Š‹ŠK›ÝÜÎˆŒˆ‹Û’[œ]š_K[ÊWJK
›X™[‹ËØVÌLW_
VÌLWOY
œÜ[ˆ‹[¹§hyæë¹a¡yk®H‹LJJKÙJ
^\™XH‹È›Û•\]N›[Ù[˜[YHŽ˜VÌ×_
VÌ×O[O™[žK˜ÛÛ[[
K›ÝÜÎˆˆ‹™\]Z\™YˆˆŸK[LLŠKÖÝÙK™[žK˜ÛÛ[WJWJK
™]ˆ‹ËÙ
›X™[‹[ÛÙJ
š[œ]‹È›Û•\]N›[Ù[˜[YHŽ˜VÍ_
VÍO[O™[žK˜ÛÛœÝ[[
K\Nˆ˜ÚXÚØ›ÞŸK[LLŠKÖÝÛ‹™[žK˜ÛÛœÝ[WJKVÌL—_
VÌL—OSYJˆ9n.:jnÈ‹LJJWJK
›X™[‹[ÛÙJ
š[œ]‹È›Û•\]N›[Ù[˜[YHŽ˜VÍW_
VÍWO[O™[žKœÙ[XÝ]™O[
K\Nˆ˜ÚXÚØ›ÞŸK[LLŠKÖÝÛ‹™[žKœÙ[XÝ]™WWJKVÌL×_
VÌL×OSYJˆ:`"y¢êy )ùc.zacH‹LJJWJK
›X™[‹[ØVÌM_
VÌMOSYJ¹/&9ab9î©È‹LJJKÙJ
š[œ]‹È›Û•\]N›[Ù[˜[YHŽ˜VÍ—_
VÍ—O[O™[žKœš[Üš]O[
K\Nˆ›[X™\ˆŸK[LLŠKÖÝÙK™[žKœš[Üš]K›ÚYÛ[X™\ŽˆLWWJWJWJWJJ__K]Ï^ØÛ\ÜÎˆ›[Ù[YšY[ŸKÏ^ØÛ\ÜÎˆÙÙÛK\›ÝÈŸKÏ^ØÛ\ÜÎˆœÝÚ]ÚXÛÛ›ÛŸK]Ï^ØÛ\ÜÎˆÛÜ››ÛÚËY[žK[\ÝŸKÝÏ^ØÛ\ÜÎˆ›[Ù[XXÝ[ÛœÈÜ]XXÝ[ÛœÈŸKÏ^××Û˜[YNˆ•ÛÜ››ÛÚÑY]Ü“[Ù[‹Ù]\

^ØÛÛœÝOVŠ

OO™ËÛÜ››ÛÚÜË™š[™
O›‹šYOOXYKÛÜ››ÛÚÒY
JKV
”ÓÓ‹œ\œÙJ”ÓÓ‹œÝš[™ÚYžJK˜[YJJJNÜ™]\›Š‹ÊOOŠŠ
KJ›‹Ý]Nˆ¹ï%º/¤y.%¹åc9.iˆ‹ÚYNˆˆ‹ÛÛÜÙNœÖÍW_
ÖÍWOZOOšÊYJKÛÜ››ÛÚÒY[[
_KÙY˜][ž]


OO–Ù
™›Ü›H‹ÛÛ”ÝX›Z]œÖÍ_
ÖÍOZÜŠOOšÊ×ÊJŠKÈœ™]™[—JJ_KÙ
›X™[‹]ËÜÖÍ—_
ÖÍ—OY
œÜ[ˆ‹[¹.%¹åc9.i¹d#yéì‹LJJKÙJ
š[œ]‹È›Û•\]N›[Ù[˜[YHŽœÖÌ_
ÖÌOZOOœ‹›˜[YOZJK™\]Z\™YˆˆŸK[LLŠKÖÝÙK‹›˜[YWWJWJK
›X™[‹ËÜÖÎ_
ÖÎOY
œÜ[ˆ‹[Ù
œÝ›Û™È‹[¹d+ùå*9¥m9§+9.%¹åc9.iˆŠK
œÛX[‹[¹alúeëyd#¹¢`9§"y§hyæëº`ïy.#y/&¹¬ê9aixà ˆŠWKLJJK
œÜ[ˆ‹ËÛÙJ
š[œ]‹È›Û•\]N›[Ù[˜[YHŽœÖÌW_
ÖÌWOZOOœ‹™[˜X›YZJK\Nˆ˜ÚXÚØ›ÞŸK[LLŠKÖÝÛ‹‹™[˜X›YWJKÖÍ×_
ÖÍ×OY
œÜ[ˆ‹[[LJJWJWJK
™]ˆ‹]ËÊŠL
KJ™K[	J‹™[šY\Ë
KÊOOŠŠ
KJ]ËÚÙ^NšKšY[žNšK[™^›ËÛ‘[]N˜OOœ‹™[šY\ËœÜXÙJËJ_K[È™[žH‹š[™^‹›Û‘[]H—JJJKLŽ
JWJK
˜]Ûˆ‹ØÛ\ÜÎˆœÛÙX]Ûˆ[X]Ûˆ‹\Nˆ˜]Ûˆ‹ÛÛXÚÎœÖÌ—_
ÖÌ—OZOOšÊWÊJŠJ_K»ï"È9­îùb¨9§hyæëˆŠK
™]ˆ‹ÝËÙ
˜]Ûˆ‹ØÛ\ÜÎˆ™[™Ù\‹X]Ûˆ‹\Nˆ˜]Ûˆ‹ÛÛXÚÎœÖÌ×_
ÖÌ×OZOOšÊWÊJ‹šY
J_K¹b(:fi9.%¹åc9.iˆŠKÖÎW_
ÖÎWOY
˜]Ûˆ‹ØÛ\ÜÎˆœš[X\žKX]Ûˆ‹\NˆœÝX›Z]ŸK¹/çykf9.%¹åc9.iˆ‹LJJWJWKÌŠWJKÎŒ_JJ__KÝÏ^ØÛ\ÜÎˆ›[Ù[YšY[ŸKÏ^ØÛ\ÜÎˆ›[Ù[XXÝ[ÛœÈÜ]XXÝ[ÛœÈŸKÏ^ÚÙ^NŒKÛ\ÜÎˆ™[\K\Ý]HŸKÝÏ^××Û˜[YNˆ“Y\ÜØYÙQY]Ü“[Ù[‹Ù]\

^ØÛÛœÝOVŠ

OO—Ý
™K˜[YOËšY
K™š[™
O›‹šYOOXYK›Y\ÜØYÙRY
JKT™JK˜[YOË˜ÛÛ[ˆŠNÜ™]\›Š‹ÊOOŠŠ
KJ›‹Ý]Nˆ¹ï%º/¤y­¢9 kÈ‹ÛÛÜÙNœÖÌ×_
ÖÌ×OZOOšÊYJK›Y\ÜØYÙRY[[
_KÙY˜][ž]


OO–ÙK˜[YOÊŠ
KJ™›Ü›H‹ÚÙ^NŒÛ”ÝX›Z]œÖÌ—_
ÖÌ—OZÜŠOOšÊ—ÊJK˜[YKšY‹˜[YJKÈœ™]™[—JJ_KÙ
›X™[‹ÝËÜÖÍ_
ÖÍOY
œÜ[ˆ‹[¹­¢9 kùa¡yk®H‹LJJKÙJ
^\™XH‹È›Û•\]N›[Ù[˜[YHŽœÖÌ_
ÖÌOZOOœ‹˜[YOZJK›ÝÜÎˆÈ‹™\]Z\™YˆˆŸK[LLŠKÖÝÙK‹˜[YWWJWJK
™]ˆ‹ËÙ
˜]Ûˆ‹ØÛ\ÜÎˆ™[™Ù\‹X]Ûˆ‹\Nˆ˜]Ûˆ‹ÛÛXÚÎœÖÌW_
ÖÌWOZOOšÊ—ÊJK˜[YKšY
J_K¹b(:fiŠKÖÍW_
ÖÍWOY
˜]Ûˆ‹ØÛ\ÜÎˆœš[X\žKX]Ûˆ‹\NˆœÝX›Z]ŸK¹/çykf9/ë¹¥.H‹LJJWJWKÌŠJNŠŠ
KJœ‹Ëº/æy§hy­¢9 kùmì¹îãù.#ykf9g*8à ˆŠJWJKÎŒ_JJ__K]Ï^ÚÙ^NŒÛ\ÜÎˆ›Y[[ÜžK[[Ù[XÛÛ[ŸKÏ^ØÛ\ÜÎˆ›Y[[ÜžKXÚ\˜XÝ\‹ZXYŸK]Ï^ØÛ\ÜÎˆ›Y[[ÜžKY]Z[\ÙXÝ[ÛˆŸKÏ^ØÛ\ÜÎˆ›Y[[ÜžKY]Z[ZXYŸKL^ÚÙ^NŒÛ\ÜÎˆ›Y[[ÜžK\Ý]\ÈÝ[HŸK^ÚÙ^NŒKÛ\ÜÎˆ›Y[[ÜžK\Ý]\ÈŸKŒ^ÚÙ^NŒÛ\ÜÎˆ›Y[[ÜžKXÛÜHŸKŒ^ÚÙ^NŒKÛ\ÜÎˆ›Y[[ÜžKY[\HŸKÌ^ÚÙ^NŒŸKL^ØÛ\ÜÎˆ›Y[[ÜžKY]Z[\ÙXÝ[ÛˆŸKÌ^ØÛ\ÜÎˆ›Y[[ÜžKY]Z[ZXYŸKL^ÚÙ^NŒÛ\ÜÎˆ›Y[[ÜžK\Ý]\ÈÝ[HŸK^ÚÙ^NŒKÛ\ÜÎˆ›Y[[ÜžK\Ý]\ÈŸKÌ^ÚÙ^NŒÛ\ÜÎˆ›Y[[ÜžKXÛÜHŸKL^ÚÙ^NŒKÛ\ÜÎˆ›Y[[ÜžKY[\HŸK^ÚÙ^NŒŸK^ØÛ\ÜÎˆ›Y[[ÜžKY]Z[\ÙXÝ[ÛˆŸKŒ^ØÛ\ÜÎˆ›Y[[ÜžKY]Z[ZXYŸK^ÚÙ^NŒÛ\ÜÎˆ›Y[[ÜžK\Ý]\ÈŸKL^ÚÙ^NŒÛ\ÜÎˆ]™\›‹\›Ý[™[\ÝŸKÌ^ÚÙ^NŒKÛ\ÜÎˆ›Y[[ÜžKY[\HŸKL^××Û˜[YNˆÚ\˜XÝ\“Y[[ÜžS[Ù[‹Ù]\

^ØÛÛœÝOVŠ

OO™Ë˜Ú\˜XÝ\œË™š[™
OO˜KšYOOXYK›Y[[ÜžPÚ\˜XÝ\’Y
JKVŠ

OO™K˜[YOÒ™JK˜[YKšY
N›[
KVŠ

OOœ‹˜[YOËœÛ™TÝ[[X\ž_[
KÏVŠ

OOœ‹˜[YOË]™\›”Ý[[X\ž_[
KOVŠ

OO\œ˜^Kš\Ð\œ˜^J‹˜[YOË]™\›”™XÙ[Ëœ›Ý[™ÊOÜ‹˜[YK]™\›”™XÙ[œ›Ý[™Î–×JNÙ[˜Ý[ÛˆÊJ^Ü™]\›ˆOÛ™]È[‘]U[YQ›Ü›X]
žšPÓˆ‹Û[Ûˆ›[Y\šXÈ‹^Nˆ›[Y\šXÈ‹Ý\ŽˆŒ‹YYÚ]‹Z[]NˆŒ‹YYÚ]ŸJK™›Ü›X]
™]È]JJJNˆˆŸ\™]\›ŠK
OOŠŠ
KJ›‹Ý]N˜	ÙK˜[YOË›˜[Y_º)äº"lˆŸyæ¡:+¬9oá˜ÚYNˆˆ‹ÛÛÜÙN›Ì_
ÌOXÏOšÊYJK›Y[[ÜžPÚ\˜XÝ\’Y[[
_KÙY˜][ž]


OO–ÙK˜[YOÊŠ
KJ™]ˆ‹]ËÙ
šXY\ˆ‹ËÕÊÜÜ˜Î™K˜[YK˜]˜]\‹˜[YN™K˜[YK›˜[YKÚ^™Nˆ›\™ÙHŸK[ÈœÜ˜È‹›˜[YH—JK
™]ˆ‹[ÛÌW_
ÌWOY
œÛX[‹[ÕT”‘S•”SÒ‹LJJK
œÝ›Û™È‹[Š‹˜[YOË]_¹..ú b¹i*HŠKJKÌ—_
Ì—OY
œÜ[ˆ‹[¹.éy."ùa¡yk®y/&¹/g9..º)äº"l¹fç¹i#y¥í¹æ¡:+¬9oá¹/§y£kˆ‹LJJWJWJK
œÙXÝ[Ûˆ‹]ËÙ
™]ˆ‹ËÛÌ×_
Ì×OY
™]ˆ‹[Ù
œÛX[‹[”Ó‘HQSSÔ–HŠK
šÈ‹[¹l#ù¢bù§.¹ .ùîäú+¬9oáˆŠWKLJJK‹˜[YOËœÝ[OÊŠ
KJœÜ[ˆ‹L¹mìº/áù§'ÈŠJN›‹˜[YOË˜ÛÛ[ÊŠ
KJœÜ[ˆ‹¹odùbcHŠJNœÙJˆ‹L
WJK‹˜[YOË˜ÛÛ[ÊŠ
KJœ‹ŒŠ‹˜[YK˜ÛÛ[
KJJNŠŠ
KJœ‹Œ¹odùbcz b¹i*z/æ9¬¨y§"yå'ù¢$9l#ù¢bù§.¹ .ùîäøà ˆŠJK‹˜[YOË\]Y]ÊŠ
KJ[YH‹Ìˆ9¦í9¥¬9.£ˆŠÓŠÊ‹˜[YK\]Y]
JKJJNœÙJˆ‹L
WJK
œÙXÝ[Ûˆ‹LÙ
™]ˆ‹ÌÛÍ_
ÍOY
™]ˆ‹[Ù
œÛX[‹[•U‘T“ˆQSSÔ–HŠK
šÈ‹[ºadºi¡¹ .ùîäú+¬9oáˆŠWKLJJKË˜[YOËœÝ[OÊŠ
KJœÜ[ˆ‹L¹mìº/áù§'ÈŠJNœË˜[YOË˜ÛÛ[ÊŠ
KJœÜ[ˆ‹¹odùbcHŠJNœÙJˆ‹L
WJKË˜[YOË˜ÛÛ[ÊŠ
KJœ‹ÌŠË˜[YK˜ÛÛ[
KJJNŠŠ
KJœ‹L¹odùbczadºi¡¹kf9¨hú/æ9¬¨y§"zf-¹«­y .ùîäøà ˆŠJKË˜[YOË\]Y]ÊŠ
KJ[YH‹ˆ9¦í9¥¬9.£ˆŠÓŠÊË˜[YK\]Y]
JKJJNœÙJˆ‹L
WJK
œÙXÝ[Ûˆ‹Ù
™]ˆ‹ŒÛÍW_
ÍWOY
™]ˆ‹[Ù
œÛX[‹[”‘PÑS•U‘T“ˆ“ÓÔ”ÈŠK
šÈ‹[ºadºi¡¹§*¹ .ùîäù©o9l`ˆŠWKLJJKK˜[YK›[™ÝÊŠ
KJœÜ[ˆ‹ŠK˜[YK›[™Ý
JÈˆ9©o‹JJNœÙJˆ‹L
WJKK˜[YK›[™ÝÊŠ
KJ™]ˆ‹LÊŠL
KJ™K[	JK˜[YK
ËJOOŠŠ
KJ˜\XÛH‹ÚÙ^N˜	ØË™›ÛÜŸ_KIÝ_XÛ\ÜÎˆ]™\›‹\›Ý[™ŸKÙ
œÝ›Û™È‹[¹ë+ŠÓŠË™›ÛÜÏÝJÌJJÈˆ9©o‹JK
™‹[Ù
™]ˆ‹[ÛÍ—_
Í—OY
™‹[¹ãªyk­ˆ‹LJJK
™‹[ŠË\Ù\Ÿ»ï"9ên»ï"HŠKJWJK
™]ˆ‹[Ù
™‹[ŠK˜[YK›˜[YJKJK
™‹[ŠË˜\ÜÚ\Ý[»ï"9ên»ï"HŠKJWJWJWJJJKLŽ
JWJJNŠŠ
KJœ‹Ì¹odùbcy¬¨y§"yëbyo¡y .ùîäùæ¡:adºi¡¹©o9l`¸à ˆŠJWJWJJNœÙJˆ‹L
WJKÎŒ_KÈ]H—JJ__KŒVÈ˜[YH—KÌ^××Û˜[YNˆ”›Û\™]šY]Ó[Ù[‹Ù]\

^Ü™]\›ŠKŠOOŠŠ
KJ›‹Ý]Nˆ¹§ 9îâ9ìîùîçù£ä9é.º+ãH‹ÚYNˆˆ‹ÛÛÜÙNœ–Ì_
–ÌO[OšÊYJKœ›Û\™]šY]ÏHˆŠ_KÙY˜][ž]


OO–Ù
^\™XH‹ØÛ\ÜÎˆœ›Û\\™]šY]ËX\™XH‹˜[YNšÊYJKœ›Û\™]šY]Ë›ÝÜÎˆŒ‹™XYÛ›NˆˆŸK[Œ
K–ÌW_
–ÌWOY
œ‹ØÛ\ÜÎˆ›[Ù[[›ÝHŸKˆ:/æy¦+ùodùbcyãªyk­¹.®º+¯¸à z)äº"l¹chxà ymì¹d+ùå*9.%¹åc9.i¸à yìîùîçù£ä9é.º+ãyª(y§où.#¹fç¹i#z)á9b&yd"9¢$9d#¹æ¡9§ 9îâ9âb9§+8à ˆ‹LJJWJKÎŒ_JJ__KŒ^ÚÙ^NŒÛ\ÜÎˆØ\Ý‹›ÛNˆœÝ]\ÈŸKÌ^××Û˜[YNˆ\Ø\Ý‹Ù]\

^Ü™]\›ŠKŠOOŠŠ
KJšÛ˜[YNˆØ\ÝŸKÙY˜][ž]


OO–ÚÊœÊOÊŠ
KJ™]ˆ‹ŒŠÊœÊJKJJNœÙJˆ‹L
WJKÎŒ_JJ__KÌ^××Û˜[YNˆ\‹Ù]\

^ØÛÛœÝO^ÚÛYN•ÛÛXÝÎ”Ý‹Ú]›WËXœ˜\žNž—Ë\œÛÛ˜N‹Ù][™ÜÎ•‹XØÛÝ[’X‹Þ[˜Î™ÝßKVŠ

OO™VÔ‹˜[YW_
KT™JLJNÛ]ÏLÛÜŠ

OO–ÙÜË˜[YK‹\Ù\ËšYK\Þ[˜ÊÛËWJOOžØÛÛœÝJÊÜÎÚYŠ‹˜[YOHLK[ßXJ^ÓÛ

NÜ™]\›ŸX]ØZ]™ŠJKOO\É‰Š‹˜[YOHL]ØZ]ŠJJ_KÚ[[YYX]NˆLJNÙ[˜Ý[ÛˆJÊ^ÛËšÙ^OOOH‘\ØØ\H‰‰–XÊ
_\™]\›ˆÜŠ

OOžÝÚ[™ÝË˜Y]™[\Ý[™\ŠšÙ^YÝÛˆ‹JKÞJ
_JKœŠ

OOžÝÚ[™ÝËœ™[[Ý™Q]™[\Ý[™\ŠšÙ^YÝÛˆ‹JK^J
KÛ

_JK
ËJOOŠŠ
KJ™K[ÈZÊŠKš[š]X[^™YZÊŠK\Ù\ÊŠ
KJÛÚÙ^NŒJJNšÊÜÊOÛ‹˜[YOÊŠ
KJXKÚÙ^NŒßKÙY˜][ž]


OO–ÊŠ
KJY[ÊŠ
KJZ
‹˜[YJJJWKL
JWJKÎŒ_JJNŠŠ
KJÝKÚÙ^NŒŸJJNŠŠ
KJXKÚÙ^NŒKœÚÝË[˜]šYØ][ÛˆŽˆL_KÙY˜][ž]


OO–ÕÊÛÙ[X™YYˆˆŸJWJKÎŒ_JJKÊÜÊI‰›‹˜[YOÊŠ
KJ™KÚÙ^NKÚÊYJK˜Ú\˜XÝ\’YÊŠ
KJËÚÙ^NŒJJNœÙJˆ‹L
KÊYJKÛÜ››ÛÚÒYÊŠ
KJËÚÙ^NŒ_JJNœÙJˆ‹L
KÊYJK›Y\ÜØYÙRYÊŠ
KJÝËÚÙ^NŒŸJJNœÙJˆ‹L
KÊYJK›Y[[ÜžPÚ\˜XÝ\’YÊŠ
KJLÚÙ^NŒßJJNœÙJˆ‹L
KÊYJKœ›Û\™]šY]ÏÊŠ
KJÌÚÙ^NJJNœÙJˆ‹L
KÊÌ
WK
JNœÙJˆ‹L
WK
J__NÕÙŠ
NÔÙŠÌ
K›[Ý[
ˆØ\ŠNÈœÙ\šXÙUÛÜšÙ\ˆš[ˆ˜]šYØ]Ü‰‰Ú[™ÝË˜Y]™[\Ý[™\Š›ØY‹

OOžÛ˜]šYØ]Ü‹œÙ\šXÙUÛÜšÙ\‹œ™YÚ\Ý\Š‹‹ÜÝËšœÈŠK˜Ø]Ú
OžØÛÛœÛÛKØ\›Š”Ù\šXÙHÛÜšÙ\ˆ™YÚ\Ý˜][Ûˆ˜Z[Y‹
_J_JNÂ