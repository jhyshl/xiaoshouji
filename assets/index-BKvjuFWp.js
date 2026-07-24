(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))n(s);new MutationObserver(s=>{for(const i of s)if(i.type==="childList")for(const o of i.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&n(o)}).observe(document,{childList:!0,subtree:!0});function r(s){const i={};return s.integrity&&(i.integrity=s.integrity),s.referrerPolicy&&(i.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?i.credentials="include":s.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function n(s){if(s.ep)return;s.ep=!0;const i=r(s);fetch(s.href,i)}})();function po(t){const e=Object.create(null);for(const r of t.split(","))e[r]=1;return r=>r in e}const ae={},jr=[],Tt=()=>{},Cl=()=>!1,Ms=t=>t.charCodeAt(0)===111&&t.charCodeAt(1)===110&&(t.charCodeAt(2)>122||t.charCodeAt(2)<97),Fs=t=>t.startsWith("onUpdate:"),je=Object.assign,go=(t,e)=>{const r=t.indexOf(e);r>-1&&t.splice(r,1)},ju=Object.prototype.hasOwnProperty,ce=(t,e)=>ju.call(t,e),G=Array.isArray,Dr=t=>Yr(t)==="[object Map]",Gr=t=>Yr(t)==="[object Set]",Wo=t=>Yr(t)==="[object Date]",Du=t=>Yr(t)==="[object RegExp]",Z=t=>typeof t=="function",Se=t=>typeof t=="string",pt=t=>typeof t=="symbol",ue=t=>t!==null&&typeof t=="object",Ol=t=>(ue(t)||Z(t))&&Z(t.then)&&Z(t.catch),Rl=Object.prototype.toString,Yr=t=>Rl.call(t),Lu=t=>Yr(t).slice(8,-1),xl=t=>Yr(t)==="[object Object]",mo=t=>Se(t)&&t!=="NaN"&&t[0]!=="-"&&""+parseInt(t,10)===t,gn=po(",key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted"),Hs=t=>{const e=Object.create(null);return(r=>e[r]||(e[r]=t(r)))},Bu=/-\w/g,ze=Hs(t=>t.replace(Bu,e=>e.slice(1).toUpperCase())),Uu=/\B([A-Z])/g,lr=Hs(t=>t.replace(Uu,"-$1").toLowerCase()),qs=Hs(t=>t.charAt(0).toUpperCase()+t.slice(1)),di=Hs(t=>t?`on${qs(t)}`:""),Be=(t,e)=>!Object.is(t,e),Lr=(t,...e)=>{for(let r=0;r<t.length;r++)t[r](...e)},Il=(t,e,r,n=!1)=>{Object.defineProperty(t,e,{configurable:!0,enumerable:!1,writable:n,value:r})},Ks=t=>{const e=parseFloat(t);return isNaN(e)?t:e},Mu=t=>{const e=Se(t)?Number(t):NaN;return isNaN(e)?t:e};let zo;const Vs=()=>zo||(zo=typeof globalThis<"u"?globalThis:typeof self<"u"?self:typeof window<"u"?window:typeof global<"u"?global:{});function Mn(t){if(G(t)){const e={};for(let r=0;r<t.length;r++){const n=t[r],s=Se(n)?Ku(n):Mn(n);if(s)for(const i in s)e[i]=s[i]}return e}else if(Se(t)||ue(t))return t}const Fu=/;(?![^(]*\))/g,Hu=/:([^]+)/,qu=/\/\*[^]*?\*\//g;function Ku(t){const e={};return t.replace(qu,"").split(Fu).forEach(r=>{if(r){const n=r.split(Hu);n.length>1&&(e[n[0].trim()]=n[1].trim())}}),e}function Qe(t){let e="";if(Se(t))e=t;else if(G(t))for(let r=0;r<t.length;r++){const n=Qe(t[r]);n&&(e+=n+" ")}else if(ue(t))for(const r in t)t[r]&&(e+=r+" ");return e.trim()}const Vu="itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly",Wu=po(Vu);function $l(t){return!!t||t===""}function zu(t,e){if(t.length!==e.length)return!1;let r=!0;for(let n=0;r&&n<t.length;n++)r=Xr(t[n],e[n]);return r}function Xr(t,e){if(t===e)return!0;let r=Wo(t),n=Wo(e);if(r||n)return r&&n?t.getTime()===e.getTime():!1;if(r=pt(t),n=pt(e),r||n)return t===e;if(r=G(t),n=G(e),r||n)return r&&n?zu(t,e):!1;if(r=ue(t),n=ue(e),r||n){if(!r||!n)return!1;const s=Object.keys(t).length,i=Object.keys(e).length;if(s!==i)return!1;for(const o in t){const a=t.hasOwnProperty(o),l=e.hasOwnProperty(o);if(a&&!l||!a&&l||!Xr(t[o],e[o]))return!1}}return String(t)===String(e)}function yo(t,e){return t.findIndex(r=>Xr(r,e))}const Pl=t=>!!(t&&t.__v_isRef===!0),j=t=>Se(t)?t:t==null?"":G(t)||ue(t)&&(t.toString===Rl||!Z(t.toString))?Pl(t)?j(t.value):JSON.stringify(t,Nl,2):String(t),Nl=(t,e)=>Pl(e)?Nl(t,e.value):Dr(e)?{[`Map(${e.size})`]:[...e.entries()].reduce((r,[n,s],i)=>(r[hi(n,i)+" =>"]=s,r),{})}:Gr(e)?{[`Set(${e.size})`]:[...e.values()].map(r=>hi(r))}:pt(e)?hi(e):ue(e)&&!G(e)&&!xl(e)?String(e):e,hi=(t,e="")=>{var r;return pt(t)?`Symbol(${(r=t.description)!=null?r:e})`:t};let Le;class Ju{constructor(e=!1){this.detached=e,this._active=!0,this._on=0,this.effects=[],this.cleanups=[],this._isPaused=!1,this._warnOnRun=!0,this.__v_skip=!0,!e&&Le&&(Le.active?(this.parent=Le,this.index=(Le.scopes||(Le.scopes=[])).push(this)-1):(this._active=!1,this._warnOnRun=!1))}get active(){return this._active}pause(){if(this._active){this._isPaused=!0;let e,r;if(this.scopes){const n=this.scopes.slice();for(e=0,r=n.length;e<r;e++)n[e].pause()}for(e=0,r=this.effects.length;e<r;e++)this.effects[e].pause()}}resume(){if(this._active&&this._isPaused){this._isPaused=!1;let e,r;if(this.scopes){const s=this.scopes.slice();for(e=0,r=s.length;e<r;e++)s[e].resume()}const n=this.effects.slice();for(e=0,r=n.length;e<r;e++)n[e].resume()}}run(e){if(this._active){const r=Le;try{return Le=this,e()}finally{Le=r}}}on(){++this._on===1&&(this.prevScope=Le,Le=this)}off(){if(this._on>0&&--this._on===0){if(Le===this)Le=this.prevScope;else{let e=Le;for(;e;){if(e.prevScope===this){e.prevScope=this.prevScope;break}e=e.prevScope}}this.prevScope=void 0}}stop(e){if(this._active){this._active=!1;let r,n;for(r=0,n=this.effects.length;r<n;r++)this.effects[r].stop();for(this.effects.length=0,r=0,n=this.cleanups.length;r<n;r++)this.cleanups[r]();if(this.cleanups.length=0,this.scopes){const s=this.scopes.slice();for(r=0,n=s.length;r<n;r++)s[r].stop(!0);this.scopes.length=0}if(!this.detached&&this.parent&&!e){const s=this.parent.scopes.pop();s&&s!==this&&(this.parent.scopes[this.index]=s,s.index=this.index)}this.parent=void 0}}}function Gu(){return Le}let _e;const fi=new WeakSet;class jl{constructor(e){this.fn=e,this.deps=void 0,this.depsTail=void 0,this.flags=5,this.next=void 0,this.cleanup=void 0,this.scheduler=void 0,Le&&(Le.active?Le.effects.push(this):this.flags&=-2)}pause(){this.flags|=64}resume(){this.flags&64&&(this.flags&=-65,fi.has(this)&&(fi.delete(this),this.trigger()))}notify(){this.flags&2&&!(this.flags&32)||this.flags&8||Ll(this)}run(){if(!(this.flags&1))return this.fn();this.flags|=2,Jo(this),Bl(this);const e=_e,r=ft;_e=this,ft=!0;try{return this.fn()}finally{Ul(this),_e=e,ft=r,this.flags&=-3}}stop(){if(this.flags&1){for(let e=this.deps;e;e=e.nextDep)bo(e);this.deps=this.depsTail=void 0,Jo(this),this.onStop&&this.onStop(),this.flags&=-2}}trigger(){this.flags&64?fi.add(this):this.scheduler?this.scheduler():this.runIfDirty()}runIfDirty(){Pi(this)&&this.run()}get dirty(){return Pi(this)}}let Dl=0,mn,yn;function Ll(t,e=!1){if(t.flags|=8,e){t.next=yn,yn=t;return}t.next=mn,mn=t}function vo(){Dl++}function _o(){if(--Dl>0)return;if(yn){let e=yn;for(yn=void 0;e;){const r=e.next;e.next=void 0,e.flags&=-9,e=r}}let t;for(;mn;){let e=mn;for(mn=void 0;e;){const r=e.next;if(e.next=void 0,e.flags&=-9,e.flags&1)try{e.trigger()}catch(n){t||(t=n)}e=r}}if(t)throw t}function Bl(t){for(let e=t.deps;e;e=e.nextDep)e.version=-1,e.prevActiveLink=e.dep.activeLink,e.dep.activeLink=e}function Ul(t){let e,r=t.depsTail,n=r;for(;n;){const s=n.prevDep;n.version===-1?(n===r&&(r=s),bo(n),Yu(n)):e=n,n.dep.activeLink=n.prevActiveLink,n.prevActiveLink=void 0,n=s}t.deps=e,t.depsTail=r}function Pi(t){for(let e=t.deps;e;e=e.nextDep)if(e.dep.version!==e.version||e.dep.computed&&(Ml(e.dep.computed)||e.dep.version!==e.version))return!0;return!!t._dirty}function Ml(t){if(t.flags&4&&!(t.flags&16)||(t.flags&=-17,t.globalVersion===En)||(t.globalVersion=En,!t.isSSR&&t.flags&128&&(!t.deps&&!t._dirty||!Pi(t))))return;t.flags|=2;const e=t.dep,r=_e,n=ft;_e=t,ft=!0;try{Bl(t);const s=t.fn(t._value);(e.version===0||Be(s,t._value))&&(t.flags|=128,t._value=s,e.version++)}catch(s){throw e.version++,s}finally{_e=r,ft=n,Ul(t),t.flags&=-3}}function bo(t,e=!1){const{dep:r,prevSub:n,nextSub:s}=t;if(n&&(n.nextSub=s,t.prevSub=void 0),s&&(s.prevSub=n,t.nextSub=void 0),r.subs===t&&(r.subs=n,!n&&r.computed)){r.computed.flags&=-5;for(let i=r.computed.deps;i;i=i.nextDep)bo(i,!0)}!e&&!--r.sc&&r.map&&r.map.delete(r.key)}function Yu(t){const{prevDep:e,nextDep:r}=t;e&&(e.nextDep=r,t.prevDep=void 0),r&&(r.prevDep=e,t.nextDep=void 0)}let ft=!0;const Fl=[];function Kt(){Fl.push(ft),ft=!1}function Vt(){const t=Fl.pop();ft=t===void 0?!0:t}function Jo(t){const{cleanup:e}=t;if(t.cleanup=void 0,e){const r=_e;_e=void 0;try{e()}finally{_e=r}}}let En=0;class Xu{constructor(e,r){this.sub=e,this.dep=r,this.version=r.version,this.nextDep=this.prevDep=this.nextSub=this.prevSub=this.prevActiveLink=void 0}}class Ws{constructor(e){this.computed=e,this.version=0,this.activeLink=void 0,this.subs=void 0,this.map=void 0,this.key=void 0,this.sc=0,this.__v_skip=!0}track(e){if(!_e||!ft||_e===this.computed)return;let r=this.activeLink;if(r===void 0||r.sub!==_e)r=this.activeLink=new Xu(_e,this),_e.deps?(r.prevDep=_e.depsTail,_e.depsTail.nextDep=r,_e.depsTail=r):_e.deps=_e.depsTail=r,Hl(r);else if(r.version===-1&&(r.version=this.version,r.nextDep)){const n=r.nextDep;n.prevDep=r.prevDep,r.prevDep&&(r.prevDep.nextDep=n),r.prevDep=_e.depsTail,r.nextDep=void 0,_e.depsTail.nextDep=r,_e.depsTail=r,_e.deps===r&&(_e.deps=n)}return r}trigger(e){this.version++,En++,this.notify(e)}notify(e){vo();try{for(let r=this.subs;r;r=r.prevSub)r.sub.notify()&&r.sub.dep.notify()}finally{_o()}}}function Hl(t){if(t.dep.sc++,t.sub.flags&4){const e=t.dep.computed;if(e&&!t.dep.subs){e.flags|=20;for(let n=e.deps;n;n=n.nextDep)Hl(n)}const r=t.dep.subs;r!==t&&(t.prevSub=r,r&&(r.nextSub=t)),t.dep.subs=t}}const Ni=new WeakMap,br=Symbol(""),ji=Symbol(""),An=Symbol("");function Ve(t,e,r){if(ft&&_e){let n=Ni.get(t);n||Ni.set(t,n=new Map);let s=n.get(r);s||(n.set(r,s=new Ws),s.map=n,s.key=r),s.track()}}function Mt(t,e,r,n,s,i){const o=Ni.get(t);if(!o){En++;return}const a=l=>{l&&l.trigger()};if(vo(),e==="clear")o.forEach(a);else{const l=G(t),c=l&&mo(r);if(l&&r==="length"){const u=Number(n);o.forEach((h,f)=>{(f==="length"||f===An||!pt(f)&&f>=u)&&a(h)})}else switch((r!==void 0||o.has(void 0))&&a(o.get(r)),c&&a(o.get(An)),e){case"add":l?c&&a(o.get("length")):(a(o.get(br)),Dr(t)&&a(o.get(ji)));break;case"delete":l||(a(o.get(br)),Dr(t)&&a(o.get(ji)));break;case"set":Dr(t)&&a(o.get(br));break}}_o()}function Er(t){const e=le(t);return e===t?e:(Ve(e,"iterate",An),at(t)?e:e.map(gt))}function zs(t){return Ve(t=le(t),"iterate",An),t}function kt(t,e){return Wt(t)?qr(wr(t)?gt(e):e):gt(e)}const Qu={__proto__:null,[Symbol.iterator](){return pi(this,Symbol.iterator,t=>kt(this,t))},concat(...t){return Er(this).concat(...t.map(e=>G(e)?Er(e):e))},entries(){return pi(this,"entries",t=>(t[1]=kt(this,t[1]),t))},every(t,e){return It(this,"every",t,e,void 0,arguments)},filter(t,e){return It(this,"filter",t,e,r=>r.map(n=>kt(this,n)),arguments)},find(t,e){return It(this,"find",t,e,r=>kt(this,r),arguments)},findIndex(t,e){return It(this,"findIndex",t,e,void 0,arguments)},findLast(t,e){return It(this,"findLast",t,e,r=>kt(this,r),arguments)},findLastIndex(t,e){return It(this,"findLastIndex",t,e,void 0,arguments)},forEach(t,e){return It(this,"forEach",t,e,void 0,arguments)},includes(...t){return gi(this,"includes",t)},indexOf(...t){return gi(this,"indexOf",t)},join(t){return Er(this).join(t)},lastIndexOf(...t){return gi(this,"lastIndexOf",t)},map(t,e){return It(this,"map",t,e,void 0,arguments)},pop(){return sn(this,"pop")},push(...t){return sn(this,"push",t)},reduce(t,...e){return Go(this,"reduce",t,e)},reduceRight(t,...e){return Go(this,"reduceRight",t,e)},shift(){return sn(this,"shift")},some(t,e){return It(this,"some",t,e,void 0,arguments)},splice(...t){return sn(this,"splice",t)},toReversed(){return Er(this).toReversed()},toSorted(t){return Er(this).toSorted(t)},toSpliced(...t){return Er(this).toSpliced(...t)},unshift(...t){return sn(this,"unshift",t)},values(){return pi(this,"values",t=>kt(this,t))}};function pi(t,e,r){const n=zs(t),s=n[e]();return n!==t&&!at(t)&&(s._next=s.next,s.next=()=>{const i=s._next();return i.done||(i.value=r(i.value)),i}),s}const Zu=Array.prototype;function It(t,e,r,n,s,i){const o=zs(t),a=o!==t&&!at(t),l=o[e];if(l!==Zu[e]){const h=l.apply(t,i);return a?gt(h):h}let c=r;o!==t&&(a?c=function(h,f){return r.call(this,kt(t,h),f,t)}:r.length>2&&(c=function(h,f){return r.call(this,h,f,t)}));const u=l.call(o,c,n);return a&&s?s(u):u}function Go(t,e,r,n){const s=zs(t),i=s!==t&&!at(t);let o=r,a=!1;s!==t&&(i?(a=n.length===0,o=function(c,u,h){return a&&(a=!1,c=kt(t,c)),r.call(this,c,kt(t,u),h,t)}):r.length>3&&(o=function(c,u,h){return r.call(this,c,u,h,t)}));const l=s[e](o,...n);return a?kt(t,l):l}function gi(t,e,r){const n=le(t);Ve(n,"iterate",An);const s=n[e](...r);return(s===-1||s===!1)&&ko(r[0])?(r[0]=le(r[0]),n[e](...r)):s}function sn(t,e,r=[]){Kt(),vo();const n=le(t)[e].apply(t,r);return _o(),Vt(),n}const ed=po("__proto__,__v_isRef,__isVue"),ql=new Set(Object.getOwnPropertyNames(Symbol).filter(t=>t!=="arguments"&&t!=="caller").map(t=>Symbol[t]).filter(pt));function td(t){pt(t)||(t=String(t));const e=le(this);return Ve(e,"has",t),e.hasOwnProperty(t)}class Kl{constructor(e=!1,r=!1){this._isReadonly=e,this._isShallow=r}get(e,r,n){if(r==="__v_skip")return e.__v_skip;const s=this._isReadonly,i=this._isShallow;if(r==="__v_isReactive")return!s;if(r==="__v_isReadonly")return s;if(r==="__v_isShallow")return i;if(r==="__v_raw")return n===(s?i?dd:Jl:i?zl:Wl).get(e)||Object.getPrototypeOf(e)===Object.getPrototypeOf(n)?e:void 0;const o=G(e);if(!s){let l;if(o&&(l=Qu[r]))return l;if(r==="hasOwnProperty")return td}const a=Reflect.get(e,r,Je(e)?e:n);if((pt(r)?ql.has(r):ed(r))||(s||Ve(e,"get",r),i))return a;if(Je(a)){const l=o&&mo(r)?a:a.value;return s&&ue(l)?Li(l):l}return ue(a)?s?Li(a):Gt(a):a}}class Vl extends Kl{constructor(e=!1){super(!1,e)}set(e,r,n,s){let i=e[r];const o=G(e)&&mo(r);if(!this._isShallow){const c=Wt(i);if(!at(n)&&!Wt(n)&&(i=le(i),n=le(n)),!o&&Je(i)&&!Je(n))return c||(i.value=n),!0}const a=o?Number(r)<e.length:ce(e,r),l=Reflect.set(e,r,n,Je(e)?e:s);return e===le(s)&&l&&(a?Be(n,i)&&Mt(e,"set",r,n):Mt(e,"add",r,n)),l}deleteProperty(e,r){const n=ce(e,r);e[r];const s=Reflect.deleteProperty(e,r);return s&&n&&Mt(e,"delete",r,void 0),s}has(e,r){const n=Reflect.has(e,r);return(!pt(r)||!ql.has(r))&&Ve(e,"has",r),n}ownKeys(e){return Ve(e,"iterate",G(e)?"length":br),Reflect.ownKeys(e)}}class rd extends Kl{constructor(e=!1){super(!0,e)}set(e,r){return!0}deleteProperty(e,r){return!0}}const nd=new Vl,sd=new rd,id=new Vl(!0);const Di=t=>t,Gn=t=>Reflect.getPrototypeOf(t);function od(t,e,r){return function(...n){const s=this.__v_raw,i=le(s),o=Dr(i),a=t==="entries"||t===Symbol.iterator&&o,l=t==="keys"&&o,c=s[t](...n),u=r?Di:e?qr:gt;return!e&&Ve(i,"iterate",l?ji:br),je(Object.create(c),{next(){const{value:h,done:f}=c.next();return f?{value:h,done:f}:{value:a?[u(h[0]),u(h[1])]:u(h),done:f}}})}}function Yn(t){return function(...e){return t==="delete"?!1:t==="clear"?void 0:this}}function ad(t,e){const r={get(s){const i=this.__v_raw,o=le(i),a=le(s);t||(Be(s,a)&&Ve(o,"get",s),Ve(o,"get",a));const{has:l}=Gn(o),c=e?Di:t?qr:gt;if(l.call(o,s))return c(i.get(s));if(l.call(o×m6×Ëh‘éì¶»§q«^u[]

KÏYOOOH˜ÛÛ[YH‹OR]JØÚ\˜XÝ\’Y]NœÏØ	Ü‹œ™[[ÝTØ]™S˜[Y_H0­È9¬¯ùå*˜	Ü‹œ™[[ÝTØ]™S˜[Y_H0­È9ên¹æoX]™\›”Ø]™RYœ‹œ™[[ÝTØ]™RY]™\›Ú\˜XÝ\’Ù^Nœ‹]™\›Ú\˜XÝ\’Ù^KÛÜQœ›ÛPœ˜[˜ÚYœÏÛËšYˆˆŸJNÜ™]\›ˆ[]HKœÞ[˜Ë›Z\ÛX]Ú\ÖÝKJÏÈ¹mì¹¬¯ùå*9¥éú b¹i*ynm¹nî¹êâù¥¬9b!¹¥+ÈŽˆ¹mì¹nî¹êâùên¹æoz b¹i*yb!¹¥+ÈŠK_Y[˜Ý[ÛˆØŠJ^ØÛÛœÝ^K˜Ú]œ˜[˜Ú\ÖÝKTÝš[™Ê_ˆŠKš[J
KœÛXÙJ
NÜ™]\›ˆ\Ÿ[ÈLNŠ‹]O[‹‹\]Y]Q]K››ÝÊ
K[Ê‹˜Ú\˜XÝ\’Y˜œ˜[˜Úœ™[˜[YHŠKL
_XÛÛœÝX^ØÛ\ÜÎˆœÞ[˜ËXØ\™Z\ÛX]ÚXØ\™ŸK^ØÛ\ÜÎˆ›Z\ÛX]ÚXXÝ[ÛœÈŸKX^××Û˜[YNˆ”Ø]™SZ\ÛX]ÚØ\™‹›ÜÎžØÚ\˜XÝ\ŽžÝ\N“Øš™XÝ™\]Z\™YˆLKZ\ÛX]ÚžÝ\N“Øš™XÝ™\]Z\™YˆL_KÙ]\

^Ü™]\›ŠKŠOOŠÊ
KÊ˜\XÛH‹X‹Ü–Ì×_
–Ì×OY
œÛX[‹[”ÐU‘HÒS‘ÑQ‹LJJK
šˆ‹[Š˜Ú\˜XÝ\‹›˜[YJJÈˆ9¨à9­bùb,9.#yd#:adºi¡¹kf9¨hÈ‹JK
œ‹[ˆ:adºi¡¹ã¬9g*9¦+ø 'ŠÚŠ›Z\ÛX]Úœ™[[ÝTØ]™S˜[YJJÈ¸ 'xà ¹odùbcyl#ù¢bù§.¹b!¹¥+ù.#¹k ùæ¡9kf9¨hÈQ9.#y. :!í;ï#:+íú`"y¢êy§+9§.¹i ¹/eyi!9ä!»ï&ù¥éùb!¹¥+ù.#y/&º(ªùb(:fi8à ˆ‹JK
™]ˆ‹‹Ý›Z\ÛX]Ú›X]Ú[™Ðœ˜[˜ÚYÊÊ
KÊ˜]Ûˆ‹ÚÙ^NŒÛ\ÜÎˆœš[X\žKX]Ûˆ‹\Nˆ˜]Ûˆ‹ÛÛXÚÎœ–Ì_
–ÌO[OšÊ	JJ˜Ú\˜XÝ\‹šYœÝÚ]ÚŠJ_Kˆ9b!ù£h¹b,9mì¹§"yb!¹¥+ÈŠJN›YJˆ‹L
K
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎœ–ÌW_
–ÌWO[OšÊ	JJ˜Ú\˜XÝ\‹šY˜›[šÈŠJ_Kˆ9¥¬9nî¹ên¹æoyb!¹¥+ÈŠK
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎœ–Ì—_
–Ì—O[OšÊ	JJ˜Ú\˜XÝ\‹šY˜ÛÛ[YHŠJ_Kˆ9¬¯ùå*9odùbcz b¹i*HŠWJWJJ__K˜^ØÛ\ÜÎˆœÞ[˜ËXØ\™œ˜[˜ÚXØ\™ŸK]Ï^ØÛ\ÜÎˆœÞ[˜ËXØ\™ZXY[™ÈŸKÏ^ØÛ\ÜÎˆ˜œ˜[˜Ú[\ÝŸKÏVÈ›ÛÛXÚÈ—KÏVÈ›ÛÛXÚÈ—KÝÏ^ØÛ\ÜÎˆœÞ[˜ËZ[›[™KYšY[œ˜[˜ÚXÜ™X]HŸK]Ï^××Û˜[YNˆœ˜[˜Ú\Ý‹›ÜÎžØÚ\˜XÝ\ŽžÝ\N“Øš™XÝ™\]Z\™YˆL_KÙ]\

^ØÛÛœÝO]T™JˆŠKYYJ

OOÝ
K˜Ú\˜XÝ\‹šY
JNÙ[˜Ý[ÛˆÊ
^ØÛÛœÝÏR]JØÚ\˜XÝ\’Y™K˜Ú\˜XÝ\‹šY]Nœ‹˜[Y_¹¥¬9æ¡9ên¹æoz b¹i*HŸJNÜ™]\›ˆ‹˜[YOHˆ‹ßY[˜Ý[ÛˆJÊ^ØÛÛœÝO]Ú[™ÝËœ›Û\
¹b!¹¥+ùd#yéì‹Ë]JNØI‰‘ØŠËšYJ_\™]\›ŠËJOOŠÊ
KÊ˜\XÛH‹˜‹Ù
šXY\ˆ‹]ËÙ
™]ˆ‹[ØVÌW_
VÌWOY
œÛX[‹[ÒU”SÒTÈ‹LJJK
šˆ‹[Š˜Ú\˜XÝ\‹›˜[YJKJWJK
˜ˆ‹[Š‹˜[YK›[™Ý
KJWJK
™]ˆ‹ËÊÊL
KÊ™K[J‹˜[YKOŠÊ
KÊœÙXÝ[Ûˆ‹ÚÙ^N›šYÛ\ÜÎ”YJØXÝ]™NšÊJK˜XÝ]™Pœ˜[˜ÚYÖÝ˜Ú\˜XÝ\‹šYOOO[šYJ_KÙ
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÎˆ˜œ˜[˜Ú[XZ[ˆ‹ÛÛXÚÎ˜ÏOšÊ	JJ˜Ú\˜XÝ\‹šYšY
_KÙ
œÜ[ˆ‹[Ù
œÝ›Û™È‹[Š]JKJK
œÛX[‹[Š›Y\ÜØYÙ\Ë›[™Ý
JÈˆ9§hy¬%9¬èH0­ÈŠÚŠ]™\›”Ø]™RYÈ¹mì¹îäyk¦ºadºi¡¹kf9¨hÈŽˆ¹l#ù¢bù§.¹âë9êâùb!¹¥+ÈŠKJWJK
˜ˆ‹[ŠÊJK˜XÝ]™Pœ˜[˜ÚYÖÝ˜Ú\˜XÝ\‹šYOOO[šYÈ¹/oùå*9.+HŽˆ¹b!ù£hˆŠKJWKÊK
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹Û\ÜÎˆ˜œ˜[˜ÚYY]‹ÛÛXÚÎ˜ÏOšJ
_K¹ï%º/¤H‹ÊWKŠJJKLŽ
JWJK
›X™[‹ÝËÚYJ
š[œ]‹È›Û•\]N›[Ù[˜[YHŽ˜VÌ_
VÌO[Oœ‹˜[YO[
KX^[™ÝˆŽ‹XÙZÛ\Žˆ¹¥¬9b!¹¥+ùd#yéì;ï"9cëú`"{ï"HŸK[LLŠKÖØ™K‹˜[YK›ÚYÝš[NˆLWWJK
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎœßK¹¥¬9nî¹ên¹æoyb!¹¥+ÈŠWJWJJ__KÝÏ^ØÛ\ÜÎˆšY]ÈXÝ]™HÞ[˜Ë]šY]ÈŸK]Ï^ÚÙ^NŒÛ\ÜÎˆœÞ[˜ËXØ\™]™\›‹X\ÜÙ]ËXØ\™ŸKÏ^ÚÙ^NŒKÛ\ÜÎˆœÞ[˜ËXØ\™š[™[™ËXØ\™ŸKÝÏVÈ›Û•\]N›[Ù[˜[YH—K]ÏVÈ˜[YH—KÏVÈ™\ØX›Y‹›ÛÛXÚÈ—KÏ^××Û˜[YNˆ”Þ[˜ÐÙ[\•šY]È‹Ù]\

^ØÛÛœÝOT™JßJKYYJ

OO“Øš™XÝ™[šY\ÊKœÞ[˜Ë]™\›’[˜›Þ
K›X\

ÛËWJOOŠÚÙ^N›Ë˜[YN˜K˜Ú\˜XÝ\Ë˜Ø\™Ë›˜[Y_K˜XÝ]™OË˜Ú\˜XÝ\“˜[Y_K˜Ú\˜XÝ\“˜[Y_¹§*¹doyd#zadºi¡º)äº"lˆ‹Ø\™Þ[˜ÙYˆHXK˜Ú\˜XÝ\Ë˜Ø\™›ÛÚÐÛÝ[˜K˜\ÜÙ[X›YÜ™X›ÛÚÜÏË›[™ÝK›Ü™X›ÛÚÜÏË˜›ÛÚÜÏË›[™Ý[žPÛÝ[ŠK˜\ÜÙ[X›YÜ™X›ÛÚÜß×JKœ™YXÙJ
ÊOO›
ÊË™[šY\ÏË›[™Ý
K
_JJK™š[\ŠÏO›Ë˜Ø\™Þ[˜ÙYË˜›ÛÚÐÛÝ[
JKYYJ

OO“Øš™XÝ™[šY\ÊKœÞ[˜Ë]™\›’[˜›Þ
K™š[\Š
Û×JOOˆ^KœÞ[˜Ë˜Ú\˜XÝ\š[™[™ÜÖÛ×JK›X\

ÛËWJOOŠÚÙ^N›Ë˜[YN˜K˜XÝ]™OË˜Ú\˜XÝ\“˜[Y_K˜Ú\˜XÝ\“˜[Y_¹§*¹doyd#zadºi¡º)äº"lˆ‹Ø]™S˜[YN˜K˜XÝ]™OËœØ]™S˜[Y_¹odùbcykf9¨hÈŸJJJKÏYYJ

OO“Øš™XÝ™[šY\ÊKœÞ[˜Ë›Z\ÛX]Ú\ÊK›X\

ÛËWJOOŠØÚ\˜XÝ\ŽžK˜Ú\˜XÝ\œË™š[™
O›šYOO[ÊKZ\ÛX]Ú˜_JJK™š[\ŠÏO›Ë˜Ú\˜XÝ\ŠJNÙ[˜Ý[ÛˆJÊ^ØÛÛœÝOYK˜[YVÛËšÙ^WNÒ˜ŠËšÙ^KJI‰™[]HK˜[YVÛËšÙ^W_\™]\›ŠËJOOŠÊ
KÊœÙXÝ[Ûˆ‹ÝËÞŠ[‹Ý]Nˆ¹d#9«iy.+yoàÈ‹ÝX]Nˆ¹§éyç"ù§+9§.¹a¡yk®xà zadºi¡¹kf9¨hùd£9i&¹êëù§ 9¥¬9â­¹  xà ˆŸJKŠ˜ŠK‹˜[YK›[™ÝÊÊ
KÊ˜\XÛH‹]ËØVÌ_
VÌOY
šXY\ˆ‹ØÛ\ÜÎˆœÞ[˜ËXØ\™ZXY[™ÈŸKÙ
™]ˆ‹[Ù
œÛX[‹[•U‘T“ˆTÔÑUÈŠK
šˆ‹[ºadºi¡º-a9¥¦yd#9«iHŠWJWKLJJK
ÊL
KÊ™K[J‹˜[YKOŠÊ
KÊœÙXÝ[Ûˆ‹ÚÙ^N›šÙ^_KÙ
œÜ[ˆ‹[Ù
œÝ›Û™È‹[Š›˜[YJKJK
œÛX[‹[Š˜Ø\™Þ[˜ÙYÈº)äº"l¹chymì¹d#9«iHŽˆ¹ëbyo¡z)äº"l¹chHŠJÈˆ0­ÈŠÚŠ˜›ÛÚÐÛÝ[
JÈˆ9§+9.%¹åc9.iˆ0­ÈŠÚŠ™[žPÛÝ[
JÈˆ9.*¹§hyæëˆ‹JWJWJJJKLŽ
JWJJN›YJˆ‹L
K
ÊL
KÊ™K[JË˜[YKOŠÊ
KJX‹ÚÙ^N›˜Ú\˜XÝ\‹šYÚ\˜XÝ\Ž›˜Ú\˜XÝ\‹Z\ÛX]Ú››Z\ÛX]ÚK[È˜Ú\˜XÝ\ˆ‹›Z\ÛX]Ú—JJJKLŽ
JK‹˜[YK›[™ÝÊÊ
KÊ˜\XÛH‹ËØVÌ—_
VÌ—OY
šXY\ˆ‹ØÛ\ÜÎˆœÞ[˜ËXØ\™ZXY[™ÈŸKÙ
™]ˆ‹[Ù
œÛX[‹[ÒTPÕTˆ’S‘S‘ÈŠK
šˆ‹[¹îäyk¦ºadºi¡º)äº"lˆŠWJWKLJJK
ÊL
KÊ™K[J‹˜[YKOŠÊ
KÊœÙXÝ[Ûˆ‹ÚÙ^N›šÙ^_KÙ
œÜ[ˆ‹[Ù
œÝ›Û™È‹[Š›˜[YJKJK
œÛX[‹[ŠœØ]™S˜[YJKJWJKYJ
œÙ[XÝ‹È›Û•\]N›[Ù[˜[YHŽ˜ÏO™K˜[YVÛšÙ^WOXßKØVÌW_
VÌWOY
›Ü[Ûˆ‹Ý˜[YNˆˆŸKº`"y¢êyl#ù¢bù§.º)äº"lˆ‹LJJK
ÊL
KÊ™K[JÊJK˜Ú\˜XÝ\œËÏOŠÊ
KÊ›Ü[Ûˆ‹ÚÙ^N˜ËšY˜[YN˜ËšYKŠË›˜[YJKK]ÊJJKLŽ
JWKÝÊKÖÑËK˜[YVÛšÙ^WWWJK
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹\ØX›YˆYK˜[YVÛšÙ^WKÛÛXÚÎ˜ÏOšJ
_K¹îäyk¦ˆ‹ÊWJJJKLŽ
JWJJN›YJˆ‹L
KŠXŠKŠ˜ŠK
ÊL
KÊ™K[JÊJK˜Ú\˜XÝ\œËOŠÊ
KJ]ËÚÙ^N›šYÚ\˜XÝ\Ž›K[È˜Ú\˜XÝ\ˆ—JJJKLŽ
JWJJ__KÏ^ØÛ\ÜÎˆ›[Ù[ZXY\ˆŸKÚO^××Û˜[YNˆ˜\ÙS[Ù[‹›ÜÎžÝ]NžÝ\N”Ýš[™Ë™\]Z\™YˆLKÚYNžÝ\N›ÛÛX[‹Y˜][ˆL__K[Z]Î–È˜ÛÜÙH—KÙ]\
Ù[Z]™_J^ØÛÛœÝYNÜ™]\›Š‹ÊOOŠÊ
KÊ™]ˆ‹ØÛ\ÜÎˆ›[Ù[[^Y\ˆ‹›ÛNˆ™X[ÙÈ‹˜\šXK[[Ù[ŽˆYH‹ÛÛXÚÎœÖÌW_
ÖÌWOZÜŠOOœŠ˜ÛÜÙHŠKÈœÙ[ˆ—JJ_KÙ
œÙXÝ[Ûˆ‹ØÛ\ÜÎ”YJÈ›[Ù[\[™[‹È›\™ÙK[[Ù[ŽÚY_WJ_KÙ
šXY\ˆ‹ËÙ
™]ˆ‹[ÜÖÌ—_
ÖÌ—OY
œÛX[‹[“S‘TÓ‘H‹LJJK
šˆ‹[Š]JKJWJK
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹˜\šXK[X™[Žˆ¹alúeëH‹ÛÛXÚÎœÖÌ_
ÖÌOZOOœŠ˜ÛÜÙHŠJ_K°åÈŠWJK\Ê‹‰ÛÝË™Y˜][ŠWKŠWJJ__KÏ^ØÛ\ÜÎˆ˜Ú\˜XÝ\‹X]˜]\‹YY]ÜˆŸKÝÏ^ØÛ\ÜÎˆœÛÙX]ÛˆŸK]Ï^ØÛ\ÜÎˆ›[Ù[YšY[ŸK]Ï^ØÛ\ÜÎˆ›[Ù[YšY[ŸKÏ^ØÛ\ÜÎˆ›[Ù[YšY[ŸKÝÏ^ØÛ\ÜÎˆ›[Ù[YšY[ŸKÏ^ØÛ\ÜÎˆ›[Ù[YšY[ŸKÝÏ^ØÛ\ÜÎˆ›[Ù[YšY[ŸKÝÏ^ØÛ\ÜÎˆ›[Ù[YšY[ŸKÝÏ^ØÛ\ÜÎˆ›[Ù[YšY[ŸK]Ï^ØÛ\ÜÎˆ›[Ù[XXÝ[ÛœÈÜ]XXÝ[ÛœÈŸK]Ï^××Û˜[YNˆÚ\˜XÝ\‘Y]Ü“[Ù[‹Ù]\

^ØÛÛœÝOYYJ

OOžK˜Ú\˜XÝ\œË™š[™
ÏOœËšYOOY™K˜Ú\˜XÝ\’Y
JKQÝ
”ÓÓ‹œ\œÙJ”ÓÓ‹œÝš[™ÚYžJK˜[YJJJNØ\Þ[˜È[˜Ý[ÛˆŠÊ^ØÛÛœÝO\Ë\™Ù]™š[\ÏË–ÌNÚYŠË\™Ù]˜[YOHˆ‹HZJ]ž^Ü‹˜]˜]\X]ØZ]›ÊJ_XØ]ÚÙJ¹i-9`ãú+îùcå¹i,z-)HŠ__\™]\›ŠËJOOŠÊ
KJÚKÝ]Nˆ¹ï%º/¤z)äº"l¹chH‹ÚYNˆˆ‹ÛÛÜÙNšVÌLW_
VÌLWO[ÏOšÊ™JK˜Ú\˜XÝ\’Y[[
_KÙY˜][–]


OO–Ù
™›Ü›H‹ÛÛ”ÝX›Z]šVÌL_
VÌLOZÜŠÏOšÊWÊJŠKÈœ™]™[—JJ_KÙ
™]ˆ‹ËÞŠÝÜÜ˜Îœ‹˜]˜]\‹˜[YNœ‹›˜[Y_K[ÈœÜ˜È‹›˜[YH—JK
›X™[‹ÝËÚVÌL—_
VÌL—OS™Jˆ9¦í9£h¹i-9`ãÈ‹LJJK
š[œ]‹Ý\Nˆ™š[H‹XØÙ\ˆš[XYÙKÊˆ‹ÛÚ[™ÙN›ŸK[ÌŠWJK
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹ÛÛXÚÎšVÌ_
VÌO[ÏOœ‹˜]˜]\HˆŠ_K¹éîúfi9i-9`ãÈŠWJK
›X™[‹]ËÚVÌL×_
VÌL×OY
œÜ[ˆ‹[º)äº"l¹d#H‹LJJKYJ
š[œ]‹È›Û•\]N›[Ù[˜[YHŽšVÌW_
VÌWO[ÏOœ‹›˜[YO[ÊK™\]Z\™YˆˆŸK[LLŠKÖØ™K‹›˜[YWWJWJK
›X™[‹]ËÚVÌM_
VÌMOY
œÜ[ˆ‹[º)äº"l¹£ãú/ì‹LJJKYJ
^\™XH‹È›Û•\]N›[Ù[˜[YHŽšVÌ—_
VÌ—O[ÏOœ‹™\ØÜš\[Û[ÊK›ÝÜÎˆHŸK[LLŠKÖØ™K‹™\ØÜš\[Û—WJWJK
›X™[‹ËÚVÌMW_
VÌMWOY
œÜ[ˆ‹[¹ )ù¨/‹LJJKYJ
^\™XH‹È›Û•\]N›[Ù[˜[YHŽšVÌ×_
VÌ×O[ÏOœ‹œ\œÛÛ˜[]O[ÊK›ÝÜÎˆŸK[LLŠKÖØ™K‹œ\œÛÛ˜[]WWJWJK
›X™[‹ÝËÚVÌM—_
VÌM—OY
œÜ[ˆ‹[¹g.¹¦kÈ‹LJJKYJ
^\™XH‹È›Û•\]N›[Ù[˜[YHŽšVÍ_
VÍO[ÏOœ‹œØÙ[˜\š[Ï[ÊK›ÝÜÎˆŸK[LLŠKÖØ™K‹œØÙ[˜\š[×WJWJK
›X™[‹ËÚVÌM×_
VÌM×OY
œÜ[ˆ‹[¹ë+9. 9§hy­¢9 kÈ‹LJJKYJ
^\™XH‹È›Û•\]N›[Ù[˜[YHŽšVÍW_
VÍWO[ÏOœ‹™š\œÝY\Ï[ÊK›ÝÜÎˆŸK[LLŠKÖØ™K‹™š\œÝY\×WJWJK
›X™[‹ÝËÚVÌN_
VÌNOY
œÜ[ˆ‹[¹kîz+çyé.¹/¢È‹LJJKYJ
^\™XH‹È›Û•\]N›[Ù[˜[YHŽšVÍ—_
VÍ—O[ÏOœ‹›Y\Ñ^[\O[ÊK›ÝÜÎˆHŸK[LLŠKÖØ™K‹›Y\Ñ^[\WWJWJK
›X™[‹ÝËÚVÌNW_
VÌNWOY
œÜ[ˆ‹[º)äº"l¹chyìîùîçù£ä9é.º+ãH‹LJJKYJ
^\™XH‹È›Û•\]N›[Ù[˜[YHŽšVÍ×_
VÍ×O[ÏOœ‹œÞ\Ý[T›Û\[ÊK›ÝÜÎˆŸK[LLŠKÖØ™K‹œÞ\Ý[T›Û\WJWJK
›X™[‹ÝËÚVÌŒ_
VÌŒOY
œÜ[ˆ‹[¹c¡¹cì¹d#¹£!ù.é‹LJJKYJ
^\™XH‹È›Û•\]N›[Ù[˜[YHŽšVÎ_
VÎO[ÏOœ‹œÜÝ\ÝÜžR[œÝXÝ[ÛœÏ[ÊK›ÝÜÎˆŸK[LLŠKÖØ™K‹œÜÝ\ÝÜžR[œÝXÝ[Ûœ×WJWJK
™]ˆ‹]ËÙ
˜]Ûˆ‹ØÛ\ÜÎˆ™[™Ù\‹X]Ûˆ‹\Nˆ˜]Ûˆ‹ÛÛXÚÎšVÎW_
VÎWO[ÏOšÊ—ÊJ‹šY
J_K¹b(:fi:)äº"lˆŠKVÌŒW_
VÌŒWOY
˜]Ûˆ‹ØÛ\ÜÎˆœš[X\žKX]Ûˆ‹\NˆœÝX›Z]ŸK¹/çykf:)äº"l¹chH‹LJJWJWKÌŠWJKÎŒ_JJ__KÏ^ØÛ\ÜÎˆÛÜ››ÛÚËY[žKYY]ÜˆŸKÝÏ^ØÛ\ÜÎˆœÝÚ]ÚXÛÛ›ÛŸKÝÏ^ØÛ\ÜÎˆ›[Ù[YšY[ŸKÏ^ØÛ\ÜÎˆ›[Ù[YšY[ŸKÏVÈ˜[YH—K]Ï^ØÛ\ÜÎˆ›[Ù[YšY[ŸK	ÏVÈ˜[YH—KÏ^ØÛ\ÜÎˆ›[Ù[YšY[ŸKÏ^ØÛ\ÜÎˆ™[žK[Ü[ÛœÈŸKÏ^××Û˜[YNˆ•ÛÜ››ÛÚÑ[žQY]Üˆ‹›ÜÎžÙ[žNžÝ\N“Øš™XÝ™\]Z\™YˆLK[™^žÝ\N“[X™\‹™\]Z\™YˆL_K[Z]Î–È™[]H—KÙ]\
Ù[Z]™_J^ØÛÛœÝ]YNÙ[˜Ý[ÛˆÊÊ^Ü‹™[žKšÙ^\Ï[Ë\™Ù]˜[YKœÜ]
ÖË;ï#ŸJËÊK›X\
OO˜Kš[J
JK™š[\Š›ÛÛX[Š_Y[˜Ý[ÛˆJÊ^Ü‹™[žKœÙXÛÛ™\žRÙ^\Ï[Ë\™Ù]˜[YKœÜ]
ÖË;ï#ŸJËÊK›X\
OO˜Kš[J
JK™š[\Š›ÛÛX[Š_\™]\›ŠËJOOŠÊ
KÊ˜\XÛH‹ËÙ
šXY\ˆ‹[Ù
›X™[‹ÝËÚYJ
š[œ]‹È›Û•\]N›[Ù[˜[YHŽ˜VÌ_
VÌO[O™[žK™[˜X›Y[
K\Nˆ˜ÚXÚØ›ÞŸK[LLŠKÖØ›‹™[žK™[˜X›YWJKVÍ×_
VÍ×OY
œÜ[ˆ‹[[LJJWJK
œÝ›Û™È‹[¹§hyæëˆŠÚŠš[™^
ÌJKJK
˜]Ûˆ‹Ý\Nˆ˜]Ûˆ‹˜\šXK[X™[Žˆ¹b(:fi9§hyæëˆ‹ÛÛXÚÎ˜VÌW_
VÌWO[O›Š™[]HŠJ_K°åÈŠWJK
›X™[‹ÝËØVÎ_
VÎOY
œÜ[ˆ‹[¹§hyæë¹d#yéì‹LJJKYJ
š[œ]‹È›Û•\]N›[Ù[˜[YHŽ˜VÌ—_
VÌ—O[O™[žK˜ÛÛ[Y[[
_K[LLŠKÖØ™K™[žK˜ÛÛ[Y[WJWJK
›X™[‹ËØVÎW_
VÎWOY
œÜ[ˆ‹[¹alúe+º+ã{ï":`%ùcíù¢%¹£hº(c9b!ºf¥;ï"H‹LJJK
^\™XH‹Ý˜[YN™[žKšÙ^\Ëš›Ú[Š‹ŠK›ÝÜÎˆŒˆ‹Û’[œ]œßK[ÊWJK
›X™[‹]ËØVÌL_
VÌLOY
œÜ[ˆ‹[¹«(yalúe+º+ãH‹LJJK
^\™XH‹Ý˜[YN™[žKœÙXÛÛ™\žRÙ^\Ëš›Ú[Š‹ŠK›ÝÜÎˆŒˆ‹Û’[œ]š_K[	ÊWJK
›X™[‹ËØVÌLW_
VÌLWOY
œÜ[ˆ‹[¹§hyæë¹a¡yk®H‹LJJKYJ
^\™XH‹È›Û•\]N›[Ù[˜[YHŽ˜VÌ×_
VÌ×O[O™[žK˜ÛÛ[[
K›ÝÜÎˆˆ‹™\]Z\™YˆˆŸK[LLŠKÖØ™K™[žK˜ÛÛ[WJWJK
™]ˆ‹ËÙ
›X™[‹[ÚYJ
š[œ]‹È›Û•\]N›[Ù[˜[YHŽ˜VÍ_
VÍO[O™[žK˜ÛÛœÝ[[
K\Nˆ˜ÚXÚØ›ÞŸK[LLŠKÖØ›‹™[žK˜ÛÛœÝ[WJKVÌL—_
VÌL—OS™Jˆ9n.:jnÈ‹LJJWJK
›X™[‹[ÚYJ
š[œ]‹È›Û•\]N›[Ù[˜[YHŽ˜VÍW_
VÍWO[O™[žKœÙ[XÝ]™O[
K\Nˆ˜ÚXÚØ›ÞŸK[LLŠKÖØ›‹™[žKœÙ[XÝ]™WWJKVÌL×_
VÌL×OS™Jˆ:`"y¢êy )ùc.zacH‹LJJWJK
›X™[‹[ØVÌM_
VÌMOS™J¹/&9ab9î©È‹LJJKYJ
š[œ]‹È›Û•\]N›[Ù[˜[YHŽ˜VÍ—_
VÍ—O[O™[žKœš[Üš]O[
K\Nˆ›[X™\ˆŸK[LLŠKÖØ™K™[žKœš[Üš]K›ÚYÛ[X™\ŽˆLWWJWJWJWJJ__KÏ^ØÛ\ÜÎˆ›[Ù[YšY[ŸKÏ^ØÛ\ÜÎˆÙÙÛK\›ÝÈŸKÏ^ØÛ\ÜÎˆœÝÚ]ÚXÛÛ›ÛŸK]Ï^ØÛ\ÜÎˆÛÜ››ÛÚËY[žK[\ÝŸK]Ï^ØÛ\ÜÎˆ›[Ù[XXÝ[ÛœÈÜ]XXÝ[ÛœÈŸKÏ^××Û˜[YNˆ•ÛÜ››ÛÚÑY]Ü“[Ù[‹Ù]\

^ØÛÛœÝOYYJ

OOžKÛÜ››ÛÚÜË™š[™
O›‹šYOOY™KÛÜ››ÛÚÒY
JKQÝ
”ÓÓ‹œ\œÙJ”ÓÓ‹œÝš[™ÚYžJK˜[YJJJNÜ™]\›Š‹ÊOOŠÊ
KJÚKÝ]Nˆ¹ï%º/¤y.%¹åc9.iˆ‹ÚYNˆˆ‹ÛÛÜÙNœÖÍW_
ÖÍWOZOOšÊ™JKÛÜ››ÛÚÒY[[
_KÙY˜][–]


OO–Ù
™›Ü›H‹ÛÛ”ÝX›Z]œÖÍ_
ÖÍOZÜŠOOšÊ×ÊJŠKÈœ™]™[—JJ_KÙ
›X™[‹ËÜÖÍ—_
ÖÍ—OY
œÜ[ˆ‹[¹.%¹åc9.i¹d#yéì‹LJJKYJ
š[œ]‹È›Û•\]N›[Ù[˜[YHŽœÖÌ_
ÖÌOZOOœ‹›˜[YOZJK™\]Z\™YˆˆŸK[LLŠKÖØ™K‹›˜[YWWJWJK
›X™[‹ËÜÖÎ_
ÖÎOY
œÜ[ˆ‹[Ù
œÝ›Û™È‹[¹d+ùå*9¥m9§+9.%¹åc9.iˆŠK
œÛX[‹[¹alúeëyd#¹¢`9§"y§hyæëº`ïy.#y/&¹¬ê9aixà ˆŠWKLJJK
œÜ[ˆ‹ËÚYJ
š[œ]‹È›Û•\]N›[Ù[˜[YHŽœÖÌW_
ÖÌWOZOOœ‹™[˜X›YZJK\Nˆ˜ÚXÚØ›ÞŸK[LLŠKÖØ›‹‹™[˜X›YWJKÖÍ×_
ÖÍ×OY
œÜ[ˆ‹[[LJJWJWJK
™]ˆ‹]ËÊÊL
KÊ™K[J‹™[šY\Ë
KÊOOŠÊ
KJËÚÙ^NšKšY[žNšK[™^›ËÛ‘[]N˜OOœ‹™[šY\ËœÜXÙJËJ_K[È™[žH‹š[™^‹›Û‘[]H—JJJKLŽ
JWJK
˜]Ûˆ‹ØÛ\ÜÎˆœÛÙX]Ûˆ[X]Ûˆ‹\Nˆ˜]Ûˆ‹ÛÛXÚÎœÖÌ—_
ÖÌ—OZOOšÊ—ÊJŠJ_K»ï"È9­îùb¨9§hyæëˆŠK
™]ˆ‹]ËÙ
˜]Ûˆ‹ØÛ\ÜÎˆ™[™Ù\‹X]Ûˆ‹\Nˆ˜]Ûˆ‹ÛÛXÚÎœÖÌ×_
ÖÌ×OZOOšÊ×ÊJ‹šY
J_K¹b(:fi9.%¹åc9.iˆŠKÖÎW_
ÖÎWOY
˜]Ûˆ‹ØÛ\ÜÎˆœš[X\žKX]Ûˆ‹\NˆœÝX›Z]ŸK¹/çykf9.%¹åc9.iˆ‹LJJWJWKÌŠWJKÎŒ_JJ__KÏ^ØÛ\ÜÎˆ›[Ù[YšY[ŸK]Ï^ØÛ\ÜÎˆ›[Ù[XXÝ[ÛœÈÜ]XXÝ[ÛœÈŸKÝÏ^ÚÙ^NŒKÛ\ÜÎˆ™[\K\Ý]HŸKÏ^××Û˜[YNˆ“Y\ÜØYÙQY]Ü“[Ù[‹Ù]\

^ØÛÛœÝOYYJ

OOœ
ÙK˜[YOËšY
K™š[™
O›‹šYOOY™K›Y\ÜØYÙRY
JKT™JK˜[YOË˜ÛÛ[ˆŠNÜ™]\›Š‹ÊOOŠÊ
KJÚKÝ]Nˆ¹ï%º/¤y­¢9 kÈ‹ÛÛÜÙNœÖÌ×_
ÖÌ×OZOOšÊ™JK›Y\ÜØYÙRY[[
_KÙY˜][–]


OO–ÙK˜[YOÊÊ
KÊ™›Ü›H‹ÚÙ^NŒÛ”ÝX›Z]œÖÌ—_
ÖÌ—OZÜŠOOšÊŠJK˜[YKšY‹˜[YJKÈœ™]™[—JJ_KÙ
›X™[‹ËÜÖÍ_
ÖÍOY
œÜ[ˆ‹[¹­¢9 kùa¡yk®H‹LJJKYJ
^\™XH‹È›Û•\]N›[Ù[˜[YHŽœÖÌ_
ÖÌOZOOœ‹˜[YOZJK›ÝÜÎˆÈ‹™\]Z\™YˆˆŸK[LLŠKÖØ™K‹˜[YWWJWJK
™]ˆ‹]ËÙ
˜]Ûˆ‹ØÛ\ÜÎˆ™[™Ù\‹X]Ûˆ‹\Nˆ˜]Ûˆ‹ÛÛXÚÎœÖÌW_
ÖÌWOZOOšÊWÊJK˜[YKšY
J_K¹b(:fiŠKÖÍW_
ÖÍWOY
˜]Ûˆ‹ØÛ\ÜÎˆœš[X\žKX]Ûˆ‹\NˆœÝX›Z]ŸK¹/çykf9/ë¹¥.H‹LJJWJWKÌŠJNŠÊ
KÊœ‹ÝËº/æy§hy­¢9 kùmì¹îãù.#ykf9g*8à ˆŠJWJKÎŒ_JJ__KÝÏVÈ˜[YH—KÏ^××Û˜[YNˆ”›Û\™]šY]Ó[Ù[‹Ù]\

^Ü™]\›ŠKŠOOŠÊ
KJÚKÝ]Nˆ¹§ 9îâ9ìîùîçù£ä9é.º+ãH‹ÚYNˆˆ‹ÛÛÜÙNœ–Ì_
–ÌO[OšÊ™JKœ›Û\™]šY]ÏHˆŠ_KÙY˜][–]


OO–Ù
^\™XH‹ØÛ\ÜÎˆœ›Û\\™]šY]ËX\™XH‹˜[YNšÊ™JKœ›Û\™]šY]Ë›ÝÜÎˆŒ‹™XYÛ›NˆˆŸK[ÝÊK–ÌW_
–ÌWOY
œ‹ØÛ\ÜÎˆ›[Ù[[›ÝHŸKˆ:/æy¦+ùodùbcyãªyk­¹.®º+¯¸à z)äº"l¹chxà ymì¹d+ùå*9.%¹åc9.i¸à yìîùîçù£ä9é.º+ãyª(y§où.#¹fç¹i#z)á9b&yd"9¢$9d#¹æ¡9§ 9îâ9âb9§+8à ˆ‹LJJWJKÎŒ_JJ__KÏ^ÚÙ^NŒÛ\ÜÎˆØ\Ý‹›ÛNˆœÝ]\ÈŸKÝÏ^××Û˜[YNˆ\Ø\Ý‹Ù]\

^Ü™]\›ŠKŠOOŠÊ
KJšÛ˜[YNˆØ\ÝŸKÙY˜][–]


OO–ÚÊÊOÊÊ
KÊ™]ˆ‹ËŠÊÊJKJJN›YJˆ‹L
WJKÎŒ_JJ__K]Ï^××Û˜[YNˆ\‹Ù]\

^ØÛÛœÝO^ÚÛYN˜›ÛÛXÝÎÝ‹Ú]™ËXœ˜\žNœWË\œÛÛ˜N–ËÙ][™ÜÎ”Ø‹XØÛÝ[Ø‹Þ[˜ÎšßKYYJ

OO™VÒ[‹˜[YW_›
KT™JLJNÛ]ÏLÚ\Š

OO–ÜË˜[YKË\Ù\ËšYK\Þ[˜ÊÛËWJOOžØÛÛœÝJÊÜÎÚYŠ‹˜[YOHLK[ßXJ^ÔÛ

NÜ™]\›ŸX]ØZ]ŠJKOO\É‰Š‹˜[YOHL]ØZ]ŠJJ_KÚ[[YYX]NˆLJNÙ[˜Ý[ÛˆJÊ^ÛËšÙ^OOOH‘\ØØ\H‰‰œXÊ
_\™]\›ˆÜŠ

OOžÝÚ[™ÝË˜Y]™[\Ý[™\ŠšÙ^YÝÛˆ‹JK^J
_JK\Š

OOžÝÚ[™ÝËœ™[[Ý™Q]™[\Ý[™\ŠšÙ^YÝÛˆ‹JKJ
KÛ

_JK
ËJOOŠÊ
KÊ™K[ÚÊÊOÛ‹˜[YOÊÊ
KJ™‹ÚÙ^NŒŸKÙY˜][–]


OO–ÊÊ
KJ[ÊÊ
KJ™
‹˜[YJJJWKL
JWJKÎŒ_JJNŠÊ
KJ]KÚÙ^NŒ_JJNŠÊ
KJžKÚÙ^NŒJJKÊÊI‰›‹˜[YOÊÊ
KÊ™KÚÙ^NŒßKÚÊ™JK˜Ú\˜XÝ\’YÊÊ
KJ]ËÚÙ^NŒJJN›YJˆ‹L
KÊ™JKÛÜ››ÛÚÒYÊÊ
KJËÚÙ^NŒ_JJN›YJˆ‹L
KÊ™JK›Y\ÜØYÙRYÊÊ
KJËÚÙ^NŒŸJJN›YJˆ‹L
KÊ™JKœ›Û\™]šY]ÏÊÊ
KJËÚÙ^NŒßJJN›YJˆ‹L
KŠÝÊWK
JN›YJˆ‹L
WK
J__NÐ™Š
NÛYŠ]ÊK›[Ý[
ˆØ\ŠNÈœÙ\šXÙUÛÜšÙ\ˆš[ˆ˜]šYØ]Ü‰‰Ú[™ÝË˜Y]™[\Ý[™\Š›ØY‹

OOžÛ˜]šYØ]Ü‹œÙ\šXÙUÛÜšÙ\‹œ™YÚ\Ý\Š‹‹ÜÝËšœÈŠK˜Ø]Ú
OžØÛÛœÛÛKØ\›Š”Ù\šXÙHÛÜšÙ\ˆ™YÚ\Ý˜][Ûˆ˜Z[Y‹
_J_JNÂ