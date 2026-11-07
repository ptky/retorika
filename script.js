(() => {
  'use strict';
  const slides = window.RETORIKA_SLIDES;
  const $ = id => document.getElementById(id);
  const stage = $('stage');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let manualReduced = false;
  const motionReduced = () => manualReduced || reducedMotion.matches;
  const syncMotion = () => {
    document.documentElement.classList.toggle('reduce-motion',motionReduced());
    $('motion-toggle').checked=motionReduced();
    $('motion-toggle').disabled=reducedMotion.matches;
  };
  let current = -1, cancelInk = () => {}, idleTimer, toastTimer, lastFocus;
  let presenting = false, nativeWasActive = false, nativePresentationRequest = 0, presentationRequest = 0, suppressClickUntil = 0;
  const esc = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number = n => String(n).padStart(2,'0');
  const icons = {
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    speech: '<path d="M4 4h16v12H10l-6 5V4Z"/><path d="M8 8h8M8 12h5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
    scales: '<path d="M12 3v17M6 21h12M4 7h16M5 7l-3 7h6L5 7Zm14 0-3 7h6l-3-7Z"/>',
    spark: '<path d="m12 2 2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4L12 2Z"/>',
    book: '<path d="M12 6C9 3 5 3 2 4v15c4-1 7-1 10 2 3-3 6-3 10-2V4c-3-1-7-1-10 2Zm0 0v15"/>',
    heart: '<path d="M12 21 3 12C-3 4 8-1 12 6c4-7 15-2 9 6l-9 9Z"/>',
    check: '<path d="m4 12 5 5L21 5"/>',
    person: '<circle cx="12" cy="6" r="3"/><path d="M4 22v-5a8 8 0 0 1 16 0v5M8 21v-5m8 5v-5"/>',
    eye: '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z"/><circle cx="12" cy="12" r="3"/>',
    wave: '<path d="M2 9v6m4-10v14m4-17v20m4-16v12m4-14v16m4-11v6"/>',
    fact: '<path d="M4 3h16v18H4zM8 7h8M8 11h8M8 15h3"/>',
    link: '<path d="m9 15-1 1a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m-2 4 1-1a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0M8 16l8-8"/>',
    cause: '<circle cx="4" cy="12" r="2"/><circle cx="20" cy="12" r="2"/><path d="M6 12h12m-5-5 5 5-5 5"/>'
  };
  function icon(name, cls='') { return `<svg class="draw-icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.spark}</svg>`; }
  function ink(path, viewBox='0 0 1000 100', cls='') {
    return `<svg class="ink ${cls}" viewBox="${viewBox}" aria-hidden="true"><path class="ink-path" d="${path}"/><g class="pen" style="opacity:0"><g class="pen-shape"><path d="m0 0 7-21 70-70 15 15-70 70Z" fill="#d1ff5f" stroke="#182021" stroke-width="2"/><path d="m0 0 7-21 15 15Z" fill="#dfbca0" stroke="#182021" stroke-width="2"/><path d="m0 0 3-9 6 6Z" fill="#182021"/><path d="m71-90 8-8a5 5 0 0 1 7 0l8 8a5 5 0 0 1 0 7l-8 8Z" fill="#a29bff" stroke="#182021" stroke-width="2"/><path d="m15-23 61-61" fill="none" stroke="#fff" stroke-width="3"/></g></g></svg>`;
  }
  function heading(s) { return `<div class="slide-heading"><p class="eyebrow"><span>${number(s.id)}</span> ${esc(s.chapter)}</p><h1 id="slide-title">${esc(s.title)}</h1></div>`; }
  const bigArrow = '<span class="flow-arrow" aria-hidden="true">↗</span>';
  function content(s) {
    switch(s.type) {
      case 'opener': return `<div class="opening"><div class="opening-text"><p class="eyebrow">${esc(s.chapter)}</p><h1 id="slide-title">${esc(s.lines[0])} <br><em>${esc(s.lines[1])}</em></h1><p class="opening-question">${esc(s.copy.prompt)}</p></div><div class="opening-art" aria-hidden="true"><div class="five">5<span>${esc(s.copy.unit)}</span></div><svg viewBox="0 0 380 420"><path d="M130 45C28 63 9 185 68 285c51 87 195 102 253 2 56-95 8-216-102-244"/><path d="m220 20-3 28 29-3"/><path class="coral-stroke" d="m64 340-25 15m41 3-8 29m31-22 12 19"/></svg></div><div class="opening-mark">${esc(s.copy.subject)}${ink('M12 55 Q240 21 470 48 T975 38','0 0 1000 100')}</div></div>`;
      case 'definition': return `${heading(s)}<div class="definition-layout"><div class="definition-word"><span class="serif-word">${esc(s.copy.word)}</span><svg class="definition-loop" viewBox="0 0 500 150" aria-hidden="true"><path d="M23 87Q240 138 467 64M443 47l29 17-17 27"/></svg></div><ol class="numbered-list">${s.items.map((t,i)=>`<li><span class="list-index">0${i+1}</span>${esc(t)}</li>`).join('')}</ol></div>`;
      case 'timeline': return `${heading(s)}<div class="timeline">${s.items.map((x,i)=>`<div class="timeline-item"><span class="timeline-step">0${i+1}</span><div class="timeline-node">${icon(i===0?'speech':i===1?'spark':'scales')}</div><h2>${esc(x[0])}</h2><p>${esc(x[1])}</p></div>`).join('')}</div><p class="hand-note timeline-note">${esc(s.copy.note)}</p>`;
      case 'audience': return `${heading(s)}<div class="audience-layout"><ul class="questions">${s.items.map((t,i)=>`<li><span>${number(i+1)}</span>${esc(t)}</li>`).join('')}</ul><div class="audience-drawing"><div class="message">${esc(s.copy.message)}${icon('speech')}</div><svg viewBox="0 0 400 100" aria-hidden="true"><path d="M200 0v30Q200 45 180 45H70v40M200 30q0 15 20 15h110v40m-273-13 13 14 13-14m234 0 13 14 13-14"/></svg><div class="audiences"><div>${icon('person')}<p>${esc(s.copy.audiences[0])}</p></div><div>${icon('person')}${icon('person')}<p>${esc(s.copy.audiences[1])}</p></div></div></div></div>`;
      case 'genres': return `${heading(s)}<div class="genre-grid">${s.items.map((x,i)=>`<section class="genre"><span class="genre-symbol">${icon(['arrow','scales','sun'][i])}</span><h2>${esc(x[0])}</h2><p class="genre-time">${esc(x[1])}</p><p>${esc(x[2])}</p></section>`).join('')}</div>`;
      case 'triangle': return `${heading(s)}<div class="persuasion"><div class="persuasion-label ethos"><span class="concept-index">01</span><h2>${esc(s.items[0][0])}</h2><p>${esc(s.items[0][1])}</p></div><div class="persuasion-label pathos"><span class="concept-index">02</span><h2>${esc(s.items[1][0])}</h2><p>${esc(s.items[1][1])}</p></div><div class="persuasion-label logos"><span class="concept-index">03</span><h2>${esc(s.items[2][0])}</h2><p>${esc(s.items[2][1])}</p></div>${ink('M190 320 Q330 190 500 50 Q650 170 810 320 Q500 345 190 320','0 0 1000 400','triangle-ink')}<span class="triangle-star" aria-hidden="true">✳</span></div>`;
      case 'books': return `${heading(s)}<div class="books-layout"><div class="book-art" aria-hidden="true"><svg viewBox="0 0 440 400"><path d="m47 284 267-26 77 46-270 34Z" fill="#df6652"/><path d="M47 284v37l74 45 270-28v-34l-270 34Z" fill="#f6e6d0"/><path d="m73 215 266-12 45 41-268 14Z" fill="#244be2"/><path d="M73 215v35l43 39 268-15v-30l-268 14Z" fill="#e9e8e0"/><path d="m42 140 253-30 74 43-257 31Z" fill="#182021"/><path d="M42 140v43l70 42 257-31v-41l-257 31Z" fill="#f6e6d0"/><path d="m112 185 1 39m8 115v25m-4-104v26M70 162l28 18m34 16 208-26m-201 41 201-26M148 274l203-11M152 350l207-21" fill="none"/><path d="M191 69c-67-37-46-88-9-63l13 15 11-18c31-33 72 5-15 66Z" fill="#df6652" stroke="none"/></svg></div><div class="book-reasons">${s.items.map((x,i)=>`<div><span class="reason-icon">${icon(['check','heart','arrow'][i])}</span><p><strong>${esc(x[0])}</strong><span>${esc(x[1])}</span></p></div>`).join('')}</div></div>`;
      case 'process': return `${heading(s)}<div class="process">${s.items.map((t,i)=>`<div class="process-step"><span>${number(i+1)}</span><h2>${esc(t)}</h2></div>`).join('')}${ink('M35 110 Q320 93 510 107 T961 103 M930 80 L965 103 932 124','0 0 1000 180','process-ink')}</div>`;
      case 'structure': return `${heading(s)}<div class="structure">${s.items.map((x,i)=>`<div class="structure-row"><span>${number(i+1)}</span><h2>${esc(x[0])}</h2><p>${esc(x[1])}</p></div>`).join('')}</div><p class="bottom-note">${esc(s.copy.note[0])} <span>${esc(s.copy.note[1])}</span> ${esc(s.copy.note[2])}</p>`;
      case 'argument': return `${heading(s)}<div class="argument-equation">${s.items.map((x,i)=>`${i?'<span class="plus" aria-hidden="true">+</span>':''}<span class="equation-term term-${i}">${esc(x)}</span>`).join('')}</div><div class="argument-example">${s.copy.example.map((t,i)=>`${i?bigArrow:''}<p>${esc(t)}</p>`).join('')}</div>`;
      case 'evidence': return `${heading(s)}<div class="evidence-grid">${s.items.map((x,i)=>`<div class="evidence-item">${icon(['fact','link','cause','person'][i])}<h2>${esc(x)}</h2></div>`).join('')}</div><p class="hand-note source-question">${esc(s.copy.question)}</p>`;
      case 'reasoning': return `${heading(s)}<div class="reasoning-rows"><div><h2>${esc(s.items[0][0])}</h2><p>${esc(s.items[0][1])} <span class="reason-arrow" aria-hidden="true">→</span> ${esc(s.items[0][2])}</p><svg class="dot-pattern" viewBox="0 0 200 50" aria-hidden="true"><circle cx="12" cy="10" r="4"/><circle cx="12" cy="25" r="4"/><circle cx="12" cy="40" r="4"/><circle cx="27" cy="10" r="4"/><circle cx="27" cy="25" r="4"/><circle cx="27" cy="40" r="4"/><path d="M50 25h95m-12-10 12 10-12 10"/><circle cx="176" cy="25" r="8"/></svg></div><div><h2>${esc(s.items[1][0])}</h2><p>${esc(s.items[1][1])} <span class="reason-arrow" aria-hidden="true">→</span> ${esc(s.items[1][2])}</p><svg class="dot-pattern" viewBox="0 0 200 50" aria-hidden="true"><circle cx="15" cy="25" r="8"/><path d="M45 25h95m-12-10 12 10-12 10"/><circle cx="169" cy="10" r="4"/><circle cx="169" cy="25" r="4"/><circle cx="169" cy="40" r="4"/><circle cx="184" cy="10" r="4"/><circle cx="184" cy="25" r="4"/><circle cx="184" cy="40" r="4"/></svg></div></div><p class="bottom-note">${esc(s.copy.note[0])} <span>${esc(s.copy.note[1])}</span> ${esc(s.copy.note[2])}</p>`;
      case 'fallacy': return `${heading(s)}<div class="fallacy-quote"><p>„<span data-ink-word>${esc(s.copy.quote[0])}</span> ${esc(s.copy.quote[1])} <br><span data-ink-word>${esc(s.copy.quote[2])}</span> ${esc(s.copy.quote[3])}”</p>${ink('M42 55 C-15-12 164-13 174 40 C193 100 17 118 42 55 M37 175 C-15 100 164 115 176 163 C201 228 19 234 37 175','0 0 1000 260','fallacy-ink')}</div><p class="fallacy-question">${esc(s.copy.question)}</p><ul class="fallacy-labels">${s.items.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;
      case 'attention': return `${heading(s)}<div class="attention-grid">${s.items.map((x,i)=>`<div>${icon(['speech','wave','eye'][i])}<h2>${esc(x[0])}</h2><p>${esc(x[1])}</p></div>`).join('')}</div><div class="style-examples">${s.copy.examples.map(x=>`<p><span>${esc(x[0].toLocaleUpperCase('hu'))}</span>${esc(x[1])}</p>`).join('')}</div>`;
      case 'ethics': return `${heading(s)}<div class="ethics-grid"><section><span class="ethics-icon">${icon('eye')}</span><h2>${esc(s.items[0][0])}</h2><ul>${s.items[0].slice(1).map(t=>`<li>${esc(t)}</li>`).join('')}</ul></section><section><span class="ethics-icon">${icon('speech')}</span><h2>${esc(s.items[1][0])}</h2><ul>${s.items[1].slice(1).map(t=>`<li>${esc(t)}</li>`).join('')}</ul></section></div><p class="bottom-note">${esc(s.copy.note)}</p>`;
      case 'closing': return `<div class="closing"><p class="eyebrow">${esc(s.chapter)}</p><h1 id="slide-title">${esc(s.lines[0])} <br><em>${esc(s.lines[1])}</em></h1><p class="closing-triad">${s.copy.triad.map(esc).join(' <span>·</span> ')}</p><div class="last-question"><p>${esc(s.copy.question)}</p>${ink('M15 55 Q270 25 510 45 T980 36','0 0 1000 100','closing-ink')}</div><span class="closing-star" aria-hidden="true">✳</span></div>`;
      case 'thanks': return `<div class="thanks"><div class="thanks-aura" aria-hidden="true"></div><div class="thanks-streaks" aria-hidden="true">${Array.from({length:30},(_,i)=>`<i style="--x:${Math.cos(i*2.399)*56}vw;--y:${Math.sin(i*2.399)*58}vh;--r:${i*137}deg;--delay:${(i%6)*.035}s;--color:${i%3===0?'#a29bff':i%3===1?'#d1ff5f':'#f4f5f7'}"></i>`).join('')}</div><div class="thanks-sculpture" aria-hidden="true"><div class="thanks-orbit orbit-one"></div><div class="thanks-orbit orbit-two"></div><svg viewBox="0 0 400 400"><defs><linearGradient id="thankStar" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f8ffe4"/><stop offset=".4" stop-color="#d1ff5f"/><stop offset="1" stop-color="#658d16"/></linearGradient><linearGradient id="thankShade"><stop stop-color="#a29bff"/><stop offset="1" stop-color="#4e477e"/></linearGradient></defs><path d="m200 35 25 107 96-63-63 96 107 25-107 25 63 96-96-63-25 107-25-107-96 63 63-96-107-25 107-25-63-96 96 63Z" fill="url(#thankStar)"/><path d="m200 35 0 165 25-58Zm121 44-121 121 58-25Zm44 121H200l58 25Zm-44 121L200 200l25 58Zm-121 44V200l-25 58Zm-121-44 121-121-58 25Zm-44-121h165l-58-25Zm44-121 121 121-25-58Z" fill="url(#thankShade)" opacity=".55"/><circle cx="200" cy="200" r="8" fill="#fff"/></svg></div><h1 id="slide-title"><span class="sr-only">${esc(s.title)}</span>${s.lines.map((line,i)=>`<span class="thanks-line line-${i}" aria-hidden="true">${[...line].map((char,j)=>`<span style="--letter:${j+i*7}">${char===' '?'&nbsp;':esc(char)}</span>`).join('')}</span>`).join('')}</h1><div class="thanks-finish" aria-hidden="true"><span></span><span></span><span></span></div></div>`;
      default: return '';
    }
  }
  function animateInk(animate) {
    const svg = stage.querySelector('.ink');
    if (!svg) return () => {};
    const path = svg.querySelector('.ink-path'), pen = svg.querySelector('.pen');
    if (slides[current].type === 'fallacy') {
      const box = svg.getBoundingClientRect();
      svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
      const circles = [...stage.querySelectorAll('[data-ink-word]')].map(word => {
        const r = word.getBoundingClientRect();
        const cx=r.left-box.left+r.width/2, cy=r.top-box.top+r.height/2;
        const rx=r.width/2+9, ry=r.height/2+4;
        return `M${cx+rx} ${cy} C${cx+rx} ${cy+ry*1.3} ${cx-rx} ${cy+ry*1.3} ${cx-rx} ${cy} C${cx-rx} ${cy-ry*1.3} ${cx+rx} ${cy-ry*1.3} ${cx+rx} ${cy}`;
      });
      path.setAttribute('d', circles.join(' '));
    }
    const length = path.getTotalLength();
    if (!animate || motionReduced()) return () => {};
    path.style.strokeDasharray = String(length);
    path.style.strokeDashoffset = String(length);
    let frame, start;
    const step = now => {
      if (start === undefined) start = now;
      const t = Math.min(1, Math.max(0, (now-start-160)/1200));
      const point = path.getPointAtLength(t*length);
      path.style.strokeDashoffset = String(length*(1-t));
      pen.setAttribute('transform',`translate(${point.x} ${point.y})`);
      pen.style.opacity = now-start < 160 || t === 1 ? '0' : '1';
      if(t<1) frame=requestAnimationFrame(step);
    };
    frame=requestAnimationFrame(step);
    return () => { cancelAnimationFrame(frame); path.style.strokeDashoffset='0'; pen.style.opacity='0'; };
  }
  function routeIndex() {
    const match = location.hash.match(/^#\/(\d+)$/);
    return Math.max(0,Math.min(slides.length-1,match?Number(match[1])-1:0));
  }
  function render(index) {
    index=Math.max(0,Math.min(slides.length-1,index));
    if(index===current)return;
    cancelInk();
    const s=slides[index], animate=index>current;
    current=index;
    stage.innerHTML=`<article class="slide slide-${s.type}${animate&&!motionReduced()?' entering is-forward':''}" aria-labelledby="slide-title">${content(s)}</article>`;
    $('current-number').textContent=number(s.id);
    $('prev-btn').disabled=index===0;
    $('next-btn').disabled=index===slides.length-1;
    $('notes-prev').disabled=index===0;
    $('notes-next').disabled=index===slides.length-1;
    $('progress-fill').style.width=`${s.id/slides.length*100}%`;
    $('progress').setAttribute('aria-valuenow',String(s.id));
    document.title=`${s.id} / ${slides.length} · ${s.title} — Retorika`;
    $('announcement').textContent=`${s.id}. dia. Összesen ${slides.length} dia. ${s.title}.`;
    document.querySelectorAll('.overview-tile').forEach((el,i)=>{
      el.setAttribute('aria-current',i===index?'step':'false');
    });
    updateNotes();
    cancelInk=animateInk(animate);
    wakeControls();
  }
  function go(index) {
    index=Math.max(0,Math.min(slides.length-1,index));
    if(index===current)return;
    // Render synchronously so even rapid keyboard input moves exactly one slide.
    history.pushState(null,'',`#/${index+1}`);
    render(index);
  }
  function updateNotes(){
    const s=slides[current];
    $('notes-meta').textContent=`${number(s.id)} / ${slides.length}`;
    $('notes-title').textContent=s.title;
    $('notes-body').innerHTML=s.notes.map(t=>`<p>${esc(t)}</p>`).join('');
    $('notes-body').scrollTop=0;
  }
  function activeDialog(){return document.querySelector('dialog[open]');}
  function openDialog(id){
    if(presenting)return;
    const old=activeDialog();if(old)old.close();
    lastFocus=document.activeElement;
    const dialog=$(id);dialog.showModal();
    if(id==='overview-dialog')dialog.querySelector('[aria-current="step"]')?.focus();
    wakeControls();
  }
  document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
  document.querySelectorAll('dialog').forEach(dialog=>{
    dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
    dialog.addEventListener('close',()=>{if(presenting)stage.focus({preventScroll:true});else lastFocus?.focus();wakeControls();});
  });
  $('overview-grid').innerHTML=slides.map((s,i)=>`<button class="overview-tile tile-${s.type}" data-slide="${i}" aria-label="${s.id}. dia: ${esc(s.title)}"><span class="tile-number">${number(s.id)}</span><span class="tile-decoration" aria-hidden="true">${['?','r.','↗','↔','Ⅲ','△','▱','→','≡','+','✓','⇄','!','✳','≠','?','✦'][i] || '✦'}</span><strong>${esc(s.title)}</strong></button>`).join('');
  $('overview-grid').addEventListener('click',event=>{const tile=event.target.closest('[data-slide]');if(tile){$('overview-dialog').close();go(Number(tile.dataset.slide));}});
  $('overview-btn').addEventListener('click',()=>openDialog('overview-dialog'));
  $('notes-btn').addEventListener('click',()=>openDialog('notes-dialog'));
  $('help-btn').addEventListener('click',()=>openDialog('help-dialog'));
  $('prev-btn').addEventListener('click',()=>go(current-1));
  $('next-btn').addEventListener('click',()=>go(current+1));
  $('notes-prev').addEventListener('click',()=>go(current-1));
  $('notes-next').addEventListener('click',()=>go(current+1));
  function toast(message){
    if(presenting)return;
    clearTimeout(toastTimer);$('toast').textContent=message;$('toast').hidden=false;
    toastTimer=setTimeout(()=>$('toast').hidden=true,4500);
  }
  function nativeFullscreenElement(){return document.fullscreenElement || document.webkitFullscreenElement;}
  function setPresentation(active){
    presenting=active;
    document.body.classList.toggle('presenting',active);
    document.body.classList.remove('idle');
    clearTimeout(idleTimer);clearTimeout(toastTimer);$('toast').hidden=true;
    document.querySelectorAll('.masthead,.bottom-bar,.progress').forEach(element=>{
      element.hidden=active;element.inert=active;
      // Inline display also guarantees chrome is absent in older embedded views.
      element.style.display=active?'none':'';
    });
    if(active){
      document.querySelectorAll('dialog[open]').forEach(dialog=>dialog.close());
      stage.focus({preventScroll:true});
    } else wakeControls();
    const label=active?'Diavetítés bezárása':'Diavetítés indítása';
    $('fullscreen-btn').setAttribute('aria-label',label);
    $('fullscreen-btn').setAttribute('aria-pressed',String(active));
    $('fullscreen-btn').title=`${label} (F)`;
  }
  async function exitNativeFullscreen(){
    try{
      if(document.fullscreenElement && document.exitFullscreen)await document.exitFullscreen();
      else if(document.webkitFullscreenElement && document.webkitExitFullscreen)document.webkitExitFullscreen();
    }catch{/* Presentation mode has already been exited locally. */}
  }
  async function fullscreen(requestNative=true){
    if(presenting){
      presentationRequest++;
      setPresentation(false);
      await exitNativeFullscreen();
      return;
    }
    setPresentation(true);
    const request=++presentationRequest;
    if(!requestNative)return;
    try{
      const root=document.documentElement;
      // The slide-only mode is immediate, even when a WebView declines native fullscreen.
      if(document.fullscreenEnabled!==false && root.requestFullscreen){
        await root.requestFullscreen({navigationUI:'hide'});
      } else if(root.webkitRequestFullscreen){
        await root.webkitRequestFullscreen();
      }
      if(request!==presentationRequest && nativeFullscreenElement())await exitNativeFullscreen();
    }catch{/* Keep the clean, slide-only presentation inside the available viewport. */}
  }
  function nativeFullscreenChanged(){
    const active=!!nativeFullscreenElement();
    if(active){
      nativeWasActive=true;
      if(!presenting){exitNativeFullscreen();return;}
      nativePresentationRequest=presentationRequest;
    } else if(nativeWasActive){
      nativeWasActive=false;
      const exitedRequest=nativePresentationRequest;
      nativePresentationRequest=0;
      // A delayed exit from an older request must not dismiss a new presentation.
      if(exitedRequest===presentationRequest){presentationRequest++;setPresentation(false);}
    }
  }
  $('fullscreen-btn').addEventListener('click',()=>fullscreen(true));
  document.addEventListener('fullscreenchange',nativeFullscreenChanged);
  document.addEventListener('webkitfullscreenchange',nativeFullscreenChanged);
  document.addEventListener('keydown',event=>{
    wakeControls();
    if(event.altKey||event.ctrlKey||event.metaKey||event.target.matches('input,textarea,select,[contenteditable="true"]'))return;
    if(event.key==='Escape' && presenting){event.preventDefault();presentationRequest++;setPresentation(false);exitNativeFullscreen();return;}
    if(activeDialog())return;
    if(presenting && event.key==='Tab'){event.preventDefault();stage.focus({preventScroll:true});return;}
    if(event.target.closest('button,a') && [' ','Enter'].includes(event.key))return;
    switch(event.key.toLowerCase()){
      case 'arrowright':case ' ':event.preventDefault();go(current+1);break;
      case 'arrowleft':event.preventDefault();go(current-1);break;
      case 'home':event.preventDefault();go(0);break;
      case 'end':event.preventDefault();go(slides.length-1);break;
      case 'f':event.preventDefault();fullscreen(true);break;
      case 'p':event.preventDefault();fullscreen(false);break;
      case 'o':openDialog('overview-dialog');break;
      case 'n':openDialog('notes-dialog');break;
      case '?':openDialog('help-dialog');break;
    }
  });
  function wakeControls(){
    clearTimeout(idleTimer);
    if(presenting)return;
    document.body.classList.remove('idle');
    idleTimer=setTimeout(()=>{if(!activeDialog()&&!document.querySelector('.controls:focus-within')&&!matchMedia('(hover: none)').matches)document.body.classList.add('idle');},3800);
  }
  document.addEventListener('pointermove',wakeControls,{passive:true});
  document.addEventListener('pointerdown',wakeControls,{passive:true});
  document.addEventListener('focusin',wakeControls);
  let touchStart;
  stage.addEventListener('touchstart',e=>{if(e.touches.length===1)touchStart={x:e.touches[0].clientX,y:e.touches[0].clientY};else touchStart=null;},{passive:true});
  stage.addEventListener('touchcancel',()=>touchStart=null,{passive:true});
  stage.addEventListener('touchend',e=>{
    if(!touchStart||activeDialog()||!e.changedTouches.length)return;
    const dx=e.changedTouches[0].clientX-touchStart.x,dy=e.changedTouches[0].clientY-touchStart.y;
    touchStart=null;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5){suppressClickUntil=performance.now()+700;go(current+(dx<0?1:-1));}
  },{passive:true});
  stage.addEventListener('click',event=>{
    if(!presenting||activeDialog()||performance.now()<suppressClickUntil||event.target.closest('a,button,input,select,textarea,[contenteditable="true"]'))return;
    go(current+1);
  });
  window.addEventListener('resize',()=>{if(slides[current]?.type==='fallacy'){cancelInk();cancelInk=animateInk(false);}});
  window.addEventListener('hashchange',()=>{const i=routeIndex();if(location.hash!==`#/${i+1}`)history.replaceState(null,'',`#/${i+1}`);render(i);});
  window.addEventListener('popstate',()=>render(routeIndex()));
  reducedMotion.addEventListener('change',()=>{syncMotion();if(motionReduced())cancelInk();});
  $('motion-toggle').addEventListener('change',()=>{manualReduced=$('motion-toggle').checked;syncMotion();if(motionReduced())cancelInk();});
  syncMotion();
  $('total-number').textContent=String(slides.length);
  $('progress').setAttribute('aria-valuemax',String(slides.length));
  const initial=routeIndex();history.replaceState(null,'',`#/${initial+1}`);render(initial);
})();
