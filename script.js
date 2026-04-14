    // --- Splash ---
    const splashEl = document.getElementById('splash');
    function dismissSplash() {
      splashEl.classList.add('fade-out');
      setTimeout(() => { splashEl.style.display = 'none'; }, 700);
    }
    // Button click (desktop) + tap anywhere (mobile)
    const splashBtn = document.getElementById('splash-enter-btn');
    if (splashBtn) splashBtn.addEventListener('click', e => { e.stopPropagation(); dismissSplash(); });
    splashEl.addEventListener('click', dismissSplash);

    // --- Lock Stock background slideshow ---
    const lsSlidePhotos = [
      "https://i.imgur.com/fRxXTtB.jpg","https://i.imgur.com/rtx4E5N.jpg","https://i.imgur.com/xPOir63.jpg",
      "https://i.imgur.com/vPflhUi.jpg","https://i.imgur.com/9cLsFNU.jpg","https://i.imgur.com/bezajV9.jpg",
      "https://i.imgur.com/drbnvTj.jpg","https://i.imgur.com/7hvZo2W.jpg","https://i.imgur.com/SNyA81z.jpg",
      "https://i.imgur.com/6jrsk0b.jpg","https://i.imgur.com/oKJbIxw.jpg","https://i.imgur.com/kQ5Bjxd.jpg",
      "https://i.imgur.com/U5dfqKY.jpg","https://i.imgur.com/dOT4Jvg.jpg","https://i.imgur.com/qDKqWHc.jpg",
      "https://i.imgur.com/uzi7OBV.jpg","https://i.imgur.com/Dorutbl.jpg","https://i.imgur.com/GJEipTx.jpg",
      "https://i.imgur.com/oFLdSNd.jpg","https://i.imgur.com/eBGbR0X.jpg","https://i.imgur.com/ATBthDZ.jpg",
      "https://i.imgur.com/HWDYPZ3.jpg","https://i.imgur.com/rQ6K1XS.jpg","https://i.imgur.com/trGWzh4.jpg",
      "https://i.imgur.com/Tm1uIwi.jpg","https://i.imgur.com/LQ1AlwZ.jpg","https://i.imgur.com/NZADuPW.jpg",
      "https://i.imgur.com/miZMl33.jpg"
    ];

    document.getElementById('rv-download-btn').addEventListener('click', function() {
      const btn = this;
      btn.textContent = 'Generating…';
      btn.disabled = true;

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: 'mm', format: 'letter', orientation: 'portrait' });
      const ml = 25.4, mr = 25.4, pageW = 215.9;
      const cw = pageW - ml - mr;
      let y = 25.4;

      const sf = (size, style='normal', r=17, g=17, b=17) => {
        doc.setFontSize(size); doc.setFont('helvetica', style); doc.setTextColor(r,g,b);
      };
      const hline = (r=17,g=17,b=17,w=0.4) => {
        doc.setDrawColor(r,g,b); doc.setLineWidth(w);
        doc.line(ml, y, pageW - mr, y);
      };

      // Header
      sf(22, 'bold'); doc.text('LUCIUS CAMPANY', ml, y); y += 9;
      sf(7.5, 'normal', 80,80,80); doc.text('Brand Activation  \u00b7  Experiential Marketing  \u00b7  Hospitality Operations', ml, y); y += 6;
      sf(7, 'normal', 80,80,80); doc.text('New York, NY   \u00b7   lucius@luciuscampany.com   \u00b7   luciuscampany.com', ml, y); y += 5.5;
      hline(17,17,17,0.5); y += 11;

      // Section heading helper
      const sectionHead = (title) => {
        sf(6, 'bold', 130,130,130); doc.text(title, ml, y); y += 3.5;
        hline(200,200,200,0.2); y += 6;
      };

      sectionHead('EXPERIENCE');

      const jobs = [
        { title:"Ma\u00eetre D' & Events Producer", dates:"Jun 2023 \u2013 Oct 2024", company:"Happier New York  \u00b7  Brooklyn, NY",
          bullets:[
            "Produced Studio Skate, a five-event experiential activation series at 99 Scott designed to convert Chalet dinner guests into a second-half-of-night experience: vendor coordination, programming, day-of execution, 1,000+ person invite list",
            "Ran the floor and led a five-person team at a Brooklyn members club where the brand was the membership and every shift was a brand activation",
            "Opened Habibi and SAA alongside the flagship: buildout walk-throughs, service-flow design, FOH training, opening-week ops",
            "Worked the floor for Tyla's release party, Odell Beckham Jr.'s birthday, and Luar fashion shows",
            "Managed founding member, regular, and VIP relationships; at a members club, that's the actual product",
            "Coordinated corporate buyouts with HR, Facilities, and Comms; daily ops on Resy, OpenTable, and Toast"
          ]},
        { title:"Digital Marketing Analyst", dates:"Mar 2021 \u2013 Apr 2023", company:"Kepler  \u00b7  New York, NY",
          bullets:[
            "Managed paid social for J.Crew's post-bankruptcy rebrand across six platforms (Meta, TikTok, Pinterest, Snapchat, X, LinkedIn) inside a $250K monthly budget",
            "Pulled daily optimizations against ROAS, handled weekly client reporting, and called platform shifts in real time while the brand was rewriting its own story in public",
            "Dug through five years of historical campaign data, found patterns nobody had flagged, and put them to work in live optimization",
            "Watched brand recovery happen up close at one of the more scrutinized retail comebacks of the era"
          ]},
        { title:"Floor & Closing Manager", dates:"Jan 2020 \u2013 Mar 2021", company:"Lock Stock Bar & Grill  \u00b7  Canandaigua, NY",
          bullets:[
            "Ran the floor across lunch, dinner, and late-night at a high-volume bar, day-one through close alongside family ownership",
            "When COVID hit, rebuilt the entire operation: online ordering, digital marketing to bring takeout customers in, kitchen-to-curb fulfillment built from scratch",
            "Wrote the SOPs for every reopening phase and retrained the team each time the restrictions changed",
            "Closed every night: financial reports, cash reconciliation, Health Department walk-throughs, the whole shift-end stack"
          ]},
        { title:"Digital Strategy Assistant", dates:"Jun 2018 \u2013 May 2019", company:"New Blue Interactive  \u00b7  Washington DC \u2013 Baltimore Area",
          bullets:[
            "Ran digital fundraising for state and local political candidates at six-figure list scale: 100,000+ subscribers, real money on the line every send",
            "Drafted fundraising emails and A/B tested everything: subject lines, tone, ask amounts, button order",
            "Built the HTML/CSS templates that went out through the CRM; creative production in Photoshop and Illustrator",
            "Learned that political fundraising is just marketing under maximum pressure; every conversion is a vote you might actually win"
          ]}
      ];

      jobs.forEach(job => {
        sf(8.5, 'bold'); doc.text(job.title, ml, y);
        sf(7, 'normal', 80,80,80);
        doc.text(job.dates, pageW - mr - doc.getTextWidth(job.dates), y);
        y += 5.5;
        sf(7.5, 'normal', 80,80,80); doc.text(job.company, ml, y); y += 5.5;
        job.bullets.forEach(b => {
          sf(7.5, 'normal');
          const lines = doc.splitTextToSize('\u2013  ' + b, cw - 4);
          lines.forEach((l, i) => { doc.text(l, ml + (i > 0 ? 4 : 0), y); y += 4.7; });
        });
        y += 4.5;
      });

      y += 3.5;
      sectionHead('SKILLS');

      const groups = [
        { label:'Events & Brand Activation', tags:['Brand Activation','Guest Relations','VIP Management','Experiential Programming','Resy','OpenTable','Toast POS'] },
        { label:'Marketing', tags:['Paid Social','Campaign Management','A/B Testing','Performance Analytics','Email Marketing'] },
        { label:'Platforms', tags:['Meta','TikTok','LinkedIn','Pinterest','Snapchat'] },
        { label:'Operations', tags:['Team Leadership','Staff Training','Scheduling','Financial Reporting','Compliance'] },
        { label:'Tools', tags:['HTML/CSS','Adobe Photoshop','Illustrator','Google Analytics'] }
      ];

      const gw = cw / groups.length;
      const baseY = y;
      groups.forEach((grp, gi) => {
        const gx = ml + gi * gw;
        let gy = baseY;
        sf(6, 'bold'); doc.text(grp.label.toUpperCase(), gx, gy); gy += 6;
        let tx = gx;
        grp.tags.forEach(tag => {
          sf(6, 'normal');
          const tw = doc.getTextWidth(tag) + 4;
          if (tx + tw > gx + gw - 1) { tx = gx; gy += 7.5; }
          doc.setFillColor(235,235,235);
          doc.roundedRect(tx, gy - 3.2, tw, 4.5, 0.6, 0.6, 'F');
          doc.text(tag, tx + 2, gy); tx += tw + 1.5;
        });
      });

      doc.save('lucius-campany-resume.pdf');
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download`;
      btn.disabled = false;
    });

    // Skip splash if opening a direct URL
    const initPath = window.location.pathname.replace(/^\//, '').toLowerCase();
    if (initPath && ['kepler','nbi','happier','lockstock'].includes(initPath)) {
      splashEl.style.display = 'none';
    }

    const roles = {
      maitre: {
        title: "Guest Experience & Events Producer",
        color: "#1a1a2e",
        sections: [
          { heading: "Happier New York · Brooklyn, NY · Jun 2023 – Oct 2024", text: "Ran the floor and led a team of five at a Brooklyn members club. The brand was the membership — and every shift was an activation." },
          { heading: "Studio Skate", text: "Produced a five-event ice skating activation at The Chalet built to convert dinner guests into a second-half-of-night experience. Owned vendor coordination, programming, day-of execution, and the audience build: 1,000+ invite list plus live conversion of pop-up walk-bys into rink guests." },
          { heading: "In the Room", text: "Worked events on the floor including Tyla's release party, Odell Beckham Jr.'s birthday, and Luar fashion shows. The members club was where the culture was happening — the job was making sure it felt that way for everyone in the room." },
          { heading: "The Openings", text: "Helped open two new venues under the same hospitality group — Habibi and SAA — from buildout walk-throughs to opening-week service. Every new opening is a brand launch. Treated it that way." },
          { heading: "The Relationships", text: "Held the relationships with founding members, regulars, and VIPs. Coordinated with HR, Facilities, and Comms on corporate buyouts. Daily ops on Resy, OpenTable, and Toast." }
        ]
      },
      manager: {
        title: "Floor & Closing Manager",
        color: "#16213e",
        sections: [
          { heading: "Lock Stock Bar & Grill · Canandaigua, NY · Jan 2020 – Mar 2021", text: "Ran floor operations across lunch, dinner, and late-night at a high-volume venue alongside family ownership. The brand was local and personal — everything depended on whether you could hold the experience together on a bad night." },
          { heading: "The COVID Pivot", text: "When COVID hit, rebuilt the whole operation: stood up the online ordering system, ran the digital marketing that brought takeout customers in, coordinated fulfillment from kitchen to curb. The dining room was closed. The business wasn't." },
          { heading: "The Reopening", text: "Wrote the reopening SOPs and retrained the team for every phase of coming back to dine-in. Kept the standards intact through a period when nobody had a playbook." },
          { heading: "Closing the Night", text: "Closed every night — financial reports, cash reconciliation, Health Department walk-throughs, the whole shift-end stack. Cross-trained staff across every FOH role and ran ongoing coaching throughout." }
        ]
      },
      digital: {
        title: "Digital Strategy Assistant",
        color: "#533483",
        sections: [
          { heading: "New Blue Interactive · Washington DC – Baltimore Area · Jun 2018 – May 2019", text: "Digital fundraising for state and local political candidates. Million-dollar lift, 100,000+ subscriber lists, real money on the line every send. This is where I learned that persuasion is a discipline, not a vibe." },
          { heading: "The Testing", text: "Drafted fundraising emails and A/B tested everything: subject lines, tone, ask amounts, the order of the buttons. Every variable was a hypothesis. Every send was data." },
          { heading: "The Technical Work", text: "Built HTML/CSS email templates for CRM deployment and handled creative production in Photoshop and Illustrator. The acquisition work and the craft lived in the same role." },
          { heading: "The Lesson", text: "Political fundraising is just marketing under maximum pressure. Every open, every click, every dollar raised is a conversion. And every conversion is a vote you might actually win." }
        ]
      }
    };

    // --- J.Crew × Kepler — scatter popup system ---
    const keplerPhotos = [
      "https://i.imgur.com/GSuZaci.jpg","https://i.imgur.com/MOMyb6R.jpg","https://i.imgur.com/gmRLdp2.jpg",
      "https://i.imgur.com/IO4OwGE.jpg","https://i.imgur.com/cHiGT5x.jpg","https://i.imgur.com/bOGMvQJ.jpg",
      "https://i.imgur.com/tO5rNmz.jpg","https://i.imgur.com/auZftfT.jpg","https://i.imgur.com/6HgxeER.jpg",
      "https://i.imgur.com/V87MvMv.jpg","https://i.imgur.com/zooYfXs.jpg","https://i.imgur.com/oLraQCj.jpg",
      "https://i.imgur.com/PoZOPu5.jpg","https://i.imgur.com/nkJkTrq.jpg","https://i.imgur.com/9Fw6aNL.jpg",
      "https://i.imgur.com/yQy69wT.jpg","https://i.imgur.com/9kCSEAw.jpg","https://i.imgur.com/9OZ0pfc.jpg",
      "https://i.imgur.com/Q9zEVHQ.jpg","https://i.imgur.com/iyMfLOj.jpg","https://i.imgur.com/r7w7bcD.jpg",
      "https://i.imgur.com/k5T6i51.jpg","https://i.imgur.com/7a0GApL.jpg","https://i.imgur.com/WCdJDmm.jpg"
    ];

    const keplerSlides = [
      { label: "The Brief", text: "J.Crew hired Kepler to run paid social during the post-bankruptcy rebrand. Six platforms, a $250K monthly budget, two years. The brand was in public recovery — the campaigns were live while J.Crew was still figuring out what it was again." },
      { label: "The Work", text: "Daily optimization against a ROAS floor. Weekly client reporting. Asset coordination, QA, and constant decisions about where the money should go. The job was keeping six live campaigns accountable while the brand rebuilt around them." },
      { label: "The Channels", text: "Meta carried the acquisition load: lookalike audiences, retargeting, direct response. TikTok and Snapchat were reach and brand memory for audiences who didn't have a J.Crew relationship yet. Pinterest pulled high-intent traffic — different click quality than anywhere else." },
      { label: "The Lesson", text: "A brand recovery isn't won on one channel. Each platform does a different job, and knowing which job belongs where is the whole game. I spent two years learning that from the data, then proving it in client presentations every week." }
    ];

    // --- Detail panel ---
    const detail = document.getElementById('detail');
    const detailHeader = document.getElementById('detail-header');
    const detailTitle = document.getElementById('detail-title');
    const detailBody = document.getElementById('detail-body');
    document.getElementById('close-btn').addEventListener('click', () => {
      detail.classList.remove('visible');
      setTimeout(() => { detail.style.display = 'none'; }, 400);
    });

    function openDetail(roleKey) {
      const role = roles[roleKey];
      detailTitle.textContent = role.title;
      detailHeader.style.background = role.color;
      detailBody.innerHTML = role.sections.map(s => `
        <div class="detail-section">
          <h3>${s.heading}</h3>
          <p>${s.text}</p>
        </div>
      `).join('');
      detail.style.display = 'flex';
      requestAnimationFrame(() => detail.classList.add('visible'));
    }

    // --- Kepler popup ---
    const overlay = document.getElementById('overlay');
    let keplerActivePopups = [];
    let keplerCurrentSlide = 0;

    function clampPos(x, y, w, h) {
      const pad = 16;
      return {
        x: Math.max(pad, Math.min(x, window.innerWidth - w - pad)),
        y: Math.max(pad, Math.min(y, window.innerHeight - h - pad))
      };
    }

    function rnd(a, b) { return a + Math.random() * (b - a); }

    function closeAllKeplerPopups(callback) {
      if (!keplerActivePopups.length) { if (callback) callback(); return; }
      let rem = keplerActivePopups.length;
      keplerActivePopups.forEach(p => {
        p.classList.add('closing');
        p.addEventListener('animationend', () => {
          p.remove();
          if (--rem === 0) { keplerActivePopups = []; if (callback) callback(); }
        }, { once: true });
      });
    }

    function openKeplerSlideSet(idx) {
      const slide = keplerSlides[idx];
      const isLast = idx === keplerSlides.length - 1;
      keplerCurrentSlide = idx;
      const vw = window.innerWidth, vh = window.innerHeight;

      // Five image popups scattered around the edges
      const imgW = Math.min(vw > 900 ? 420 : 190, vw * 0.30);
      const imgH = Math.min(vw > 900 ? 540 : 245, vh * 0.62);
      const imgTilts = [rnd(-14,-5), rnd(5,14), rnd(-10,-2), rnd(3,12), rnd(-6,6)];
      const zones = [
        clampPos(rnd(vw*0.02, vw*0.10), rnd(vh*0.06, vh*0.18), imgW, imgH),
        clampPos(rnd(vw*0.67, vw*0.78), rnd(vh*0.06, vh*0.18), imgW, imgH),
        clampPos(rnd(vw*0.01, vw*0.08), rnd(vh*0.46, vh*0.60), imgW, imgH),
        clampPos(rnd(vw*0.72, vw*0.82), rnd(vh*0.46, vh*0.60), imgW, imgH),
        clampPos(rnd(vw*0.36, vw*0.46), rnd(vh*0.68, vh*0.78), imgW, imgH)
      ];

      const slidePhotos = [0,1,2,3,4].map(i => keplerPhotos[(idx * 5 + i) % keplerPhotos.length]);

      slidePhotos.forEach((url, i) => {
        const p = document.createElement('div');
        p.className = 'popup kimg-popup';
        p.style.cssText = `--tilt:${imgTilts[i]}deg;left:${zones[i].x}px;top:${zones[i].y}px;width:${imgW}px;height:${imgH}px;z-index:100;cursor:move;`;
        p.innerHTML = `
          <button class="kimg-x" style="position:absolute;top:5px;right:5px;z-index:10;background:rgba(21,89,48,0.85);border:1px solid rgba(255,255,255,0.3);color:rgba(255,255,255,0.85);width:20px;height:20px;border-radius:50%;cursor:pointer;font-size:10px;display:flex;align-items:center;justify-content:center;line-height:1;padding:0;">✕</button>
          <div class="popup-photo" style="background:#1B6B3A;width:100%;height:100%;"><img src="${url}" alt="" loading="lazy"></div>`;
        p.querySelector('.kimg-x').addEventListener('click', () => {
          p.classList.add('closing');
          p.addEventListener('animationend', () => {
            p.remove();
            keplerActivePopups = keplerActivePopups.filter(x => x !== p);
            if (!keplerActivePopups.length) overlay.classList.remove('active');
          }, { once: true });
        });
        makeDraggable(p, p);
        document.body.appendChild(p);
        keplerActivePopups.push(p);
      });

      // Text popup — centered, always on top
      const txtW = Math.min(vw > 900 ? 600 : 370, vw * 0.60);
      const txtPos = clampPos(vw / 2 - txtW / 2, vh / 2 - 150, txtW, 300);
      const tp = document.createElement('div');
      tp.className = 'popup';
      tp.style.cssText = `--tilt:0deg;left:${txtPos.x}px;top:${txtPos.y}px;width:${txtW}px;height:auto;min-height:0;z-index:102;`;
      tp.innerHTML = `
        <div class="popup-titlebar" data-drag style="background:#155930;border-bottom:1px solid rgba(255,255,255,0.2);">
          <div class="popup-title" style="color:#fff;letter-spacing:0.06em;">Digital Marketing Analyst — Kepler</div>
          <div class="popup-controls">
            <button class="popup-btn" style="background:rgba(255,255,255,0.15);border-color:rgba(255,255,255,0.4);color:#fff;">_</button>
            <button class="popup-btn" style="background:rgba(255,255,255,0.15);border-color:rgba(255,255,255,0.4);color:#fff;">□</button>
            <button class="popup-btn ktxt-x" style="background:rgba(255,255,255,0.15);border-color:rgba(255,255,255,0.4);color:#fff;">✕</button>
          </div>
        </div>
        <div class="popup-body" style="background:#1B6B3A;border-top:1px solid rgba(255,255,255,0.15);">
          <div class="popup-label" style="color:rgba(255,255,255,0.65);">${slide.label}</div>
          <div class="popup-text" style="color:#ffffff;">${slide.text}</div>
        </div>
        <div class="popup-footer" style="background:#155930;border-top:1px solid rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:space-between;padding:8px 12px;">
          <span style="color:rgba(255,255,255,0.5);font-size:0.75rem;font-family:'Segoe UI',sans-serif;">${idx + 1} of ${keplerSlides.length}</span>
          ${!isLast
            ? `<button class="knext-btn" style="background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.4);color:#fff;padding:4px 16px;border-radius:3px;cursor:pointer;font-family:'Segoe UI',sans-serif;font-size:0.8rem;letter-spacing:0.05em;">Next →</button>`
            : `<button class="kclose-btn" style="background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.4);color:#fff;padding:4px 16px;border-radius:3px;cursor:pointer;font-family:'Segoe UI',sans-serif;font-size:0.8rem;">Close</button>`}
        </div>`;
      tp.querySelector('.ktxt-x').addEventListener('click', () => history.back());
      const nb = tp.querySelector('.knext-btn');
      if (nb) nb.addEventListener('click', () => closeAllKeplerPopups(() => openKeplerSlideSet(idx + 1)));
      const cb = tp.querySelector('.kclose-btn');
      if (cb) cb.addEventListener('click', () => history.back());
      makeDraggable(tp, tp.querySelector('[data-drag]'));
      document.body.appendChild(tp);
      keplerActivePopups.push(tp);

      overlay.classList.add('active');
    }


    function makeDraggable(popup, handle) {
      let ox = 0, oy = 0, startX = 0, startY = 0, dragging = false;
      handle.addEventListener('mousedown', e => {
        if (e.target.classList.contains('popup-btn') || e.target.classList.contains('kimg-x') || e.target.closest('.kimg-x')) return;
        dragging = true;
        startX = e.clientX; startY = e.clientY;
        ox = parseInt(popup.style.left) || 0;
        oy = parseInt(popup.style.top) || 0;
        e.preventDefault();
      });
      document.addEventListener('mousemove', e => {
        if (!dragging) return;
        popup.style.left = (ox + e.clientX - startX) + 'px';
        popup.style.top  = (oy + e.clientY - startY) + 'px';
      });
      document.addEventListener('mouseup', () => { dragging = false; });
    }

    // --- Gmail (NBI) ---
    const gmailEl = document.getElementById('gmail');
    const gmInbox = document.getElementById('gm-inbox');
    const gmEmailView = document.getElementById('gm-email-view');

    const gmEmails = [
      {
        id: 1,
        from: 'Sherry Currency',
        addr: 'sherry.currency@newblueinteractive.com',
        color: '#EA4335',
        subject: 'Campaign Results — 1.2 Million Raised, Target Exceeded',
        time: '9:14 AM',
        date: 'Mar 18, 2020, 9:14 AM',
        snippet: 'Lucius, the Q3 digital fundraising push hit $1.2M — well above target...',
        photo: `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="auto" viewBox="0 0 320 240" overflow="hidden" style="background:#fff8f7;border-radius:8px">
          <clipPath id="cp1"><rect width="320" height="240"/></clipPath>
          <g clip-path="url(#cp1)">
          <text x="160" y="14" font-family="Arial" font-size="9" fill="#aaa" letter-spacing="1.5" text-anchor="middle">FUNDRAISING TOTALS — Q3 2020</text>
          <line x1="12" y1="162" x2="308" y2="162" stroke="#eee" stroke-width="1"/>
          <line x1="12" y1="128" x2="308" y2="128" stroke="#f0f0f0" stroke-width="1" stroke-dasharray="4,3"/>
          <line x1="12" y1="94"  x2="308" y2="94"  stroke="#f0f0f0" stroke-width="1" stroke-dasharray="4,3"/>
          <line x1="12" y1="60"  x2="308" y2="60"  stroke="#f0f0f0" stroke-width="1" stroke-dasharray="4,3"/>
          <rect x="22"  y="142" width="14" height="20" fill="#EA4335" opacity=".3" rx="2"/>
          <rect x="38"  y="137" width="14" height="25" fill="#4285F4" opacity=".3" rx="2"/>
          <rect x="54"  y="140" width="14" height="22" fill="#34A853" opacity=".3" rx="2"/>
          <rect x="114" y="111" width="14" height="51" fill="#EA4335" opacity=".5" rx="2"/>
          <rect x="130" y="103" width="14" height="59" fill="#4285F4" opacity=".5" rx="2"/>
          <rect x="146" y="107" width="14" height="55" fill="#34A853" opacity=".5" rx="2"/>
          <rect x="218" y="36"  width="18" height="126" fill="#EA4335" rx="3"/>
          <rect x="240" y="46"  width="18" height="116" fill="#4285F4" rx="3"/>
          <rect x="262" y="40"  width="18" height="122" fill="#34A853" rx="3"/>
          <line x1="12" y1="94" x2="294" y2="94" stroke="#FBBC05" stroke-width="1.5" stroke-dasharray="5,3"/>
          <rect x="254" y="86" width="40" height="13" fill="#fff8f7"/>
          <text x="274" y="97" font-family="Arial" font-size="9" fill="#FBBC05" text-anchor="middle">TARGET</text>
          <rect x="193" y="18" width="90" height="20" fill="#EA4335" rx="4"/>
          <text x="238" y="32" font-family="Arial" font-size="12" fill="#fff" font-weight="bold" text-anchor="middle">$1.2M ↑</text>
          <text x="42"  y="177" font-family="Arial" font-size="13" fill="#bbb" text-anchor="middle">Q1</text>
          <text x="134" y="177" font-family="Arial" font-size="13" fill="#bbb" text-anchor="middle">Q2</text>
          <text x="248" y="177" font-family="Arial" font-size="14" fill="#EA4335" font-weight="bold" text-anchor="middle">Q3</text>
          <rect x="8"   y="184" width="95" height="52" fill="#ffeeed" rx="6"/>
          <text x="55"  y="200" font-family="Arial" font-size="12" fill="#EA4335" letter-spacing="1" text-anchor="middle">RAISED</text>
          <text x="55"  y="225" font-family="Arial" font-size="20" fill="#EA4335" font-weight="bold" text-anchor="middle">$1.2M</text>
          <rect x="112" y="184" width="95" height="52" fill="#f0f4ff" rx="6"/>
          <text x="159" y="200" font-family="Arial" font-size="12" fill="#4285F4" letter-spacing="1" text-anchor="middle">GOAL</text>
          <text x="159" y="225" font-family="Arial" font-size="20" fill="#4285F4" font-weight="bold" text-anchor="middle">$900K</text>
          <rect x="216" y="184" width="96" height="52" fill="#f0fff4" rx="6"/>
          <text x="264" y="200" font-family="Arial" font-size="12" fill="#34A853" letter-spacing="1" text-anchor="middle">BEAT BY</text>
          <text x="264" y="225" font-family="Arial" font-size="20" fill="#34A853" font-weight="bold" text-anchor="middle">+33%</text>
          </g>
        </svg>`,
        photoLabel: 'Campaign results dashboard',
        body: `Lucius,\n\nWrapping up Q3 — wanted to get these numbers to you directly.\n\nThe fundraising total landed at $1.2M across the three campaigns you were running. Our stretch goal was $900K. You beat it by a third.\n\nWhat you built here wasn't just execution — it was a full acquisition operation. You owned the strategy, the sequencing, and the donor targeting from start to finish. The results speak for themselves, but so does the process you put in place.\n\nWorth noting for your records.\n\n— Sherry\nCampaign Director, New Blue Interactive`
      },
      {
        id: 2,
        from: 'Tilapiana Bronco',
        addr: 'tilapiana.bronco@newblueinteractive.com',
        color: '#4285F4',
        subject: 'A/B Test Results — "Tuna is taking it at the market" +22% Open Rate, 18% CTR',
        time: 'Yesterday',
        date: 'Mar 17, 2020, 4:51 PM',
        snippet: 'Lucius — Variant B outperformed on every metric. Your subject line call was right...',
        photo: `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="auto" viewBox="0 0 320 240" overflow="hidden" style="background:#f5f8ff;border-radius:8px">
          <clipPath id="cp2"><rect width="320" height="240"/></clipPath>
          <g clip-path="url(#cp2)">
          <text x="160" y="14" font-family="Arial" font-size="9" fill="#aaa" letter-spacing="1.5" text-anchor="middle">A/B TEST — OCTOBER SEND</text>
          <rect x="6" y="20" width="144" height="212" fill="#fff" rx="8" stroke="#e8eaed" stroke-width="1.5"/>
          <text x="78" y="60" font-family="Arial" font-size="28" fill="#ccc" font-weight="bold" text-anchor="middle">A</text>
          <text x="78" y="75" font-family="Arial" font-size="9" fill="#aaa" letter-spacing="1.5" text-anchor="middle">ORIGINAL</text>
          <line x1="18" y1="85" x2="138" y2="85" stroke="#f0f0f0" stroke-width="1"/>
          <text x="20" y="103" font-family="Arial" font-size="12" fill="#ccc" letter-spacing="0.5">OPEN RATE</text>
          <text x="20" y="127" font-family="Arial" font-size="24" fill="#ccc" font-weight="bold">18%</text>
          <text x="20" y="146" font-family="Arial" font-size="12" fill="#ccc" letter-spacing="0.5">CLICK-THRU</text>
          <text x="20" y="170" font-family="Arial" font-size="24" fill="#ccc" font-weight="bold">6%</text>
          <text x="20" y="189" font-family="Arial" font-size="12" fill="#ccc" letter-spacing="0.5">CONVERSIONS</text>
          <text x="20" y="213" font-family="Arial" font-size="24" fill="#ccc" font-weight="bold">3%</text>
          <rect x="170" y="20" width="144" height="212" fill="#fff" rx="8" stroke="#4285F4" stroke-width="2.5"/>
          <rect x="170" y="20" width="144" height="32" fill="#4285F4" rx="8"/>
          <rect x="170" y="38" width="144" height="14" fill="#4285F4"/>
          <text x="242" y="41" font-family="Arial" font-size="12" fill="#fff" font-weight="bold" letter-spacing="0.5" text-anchor="middle">WINNER ✓</text>
          <text x="242" y="76" font-family="Arial" font-size="28" fill="#4285F4" font-weight="bold" text-anchor="middle">B</text>
          <text x="242" y="91" font-family="Arial" font-size="9" fill="#4285F4" letter-spacing="1.5" text-anchor="middle">VARIANT</text>
          <line x1="182" y1="101" x2="302" y2="101" stroke="#e8f0fe" stroke-width="1"/>
          <text x="184" y="119" font-family="Arial" font-size="12" fill="#4285F4" letter-spacing="0.5">OPEN RATE</text>
          <text x="184" y="143" font-family="Arial" font-size="24" fill="#4285F4" font-weight="bold">22% ↑</text>
          <text x="184" y="162" font-family="Arial" font-size="12" fill="#4285F4" letter-spacing="0.5">CLICK-THRU</text>
          <text x="184" y="186" font-family="Arial" font-size="24" fill="#4285F4" font-weight="bold">18% ↑↑</text>
          <text x="184" y="205" font-family="Arial" font-size="12" fill="#4285F4" letter-spacing="0.5">CONVERSIONS</text>
          <text x="184" y="229" font-family="Arial" font-size="22" fill="#4285F4" font-weight="bold">11% ↑↑↑</text>
          <text x="160" y="238" font-family="Arial" font-size="9" fill="#aaa" text-anchor="middle">Subject line test · 104,211 subscribers</text>
          </g>
        </svg>`,
        photoLabel: 'A/B test comparison chart',
        body: `Lucius,\n\nNumbers are in from the October test. Your version won on every metric:\n\n• Opens: up 22%\n• Clicks: up 18%\n• Donor conversions: up 11%\n\nYou called the tone problem two weeks before we had the data to confirm it. The way you structured the test — isolating the subject line variable, controlling for send time and list segment — meant the results were actually usable. A lot of people run "tests" that prove nothing.\n\nI'm rewriting our internal playbook around your approach. This is the new baseline.\n\n— Tilapiana\nAccount Manager`
      },
      {
        id: 3,
        from: 'Prayfah Her',
        addr: 'prayfah.her@newblueinteractive.com',
        color: '#34A853',
        subject: 'QA Sign-Off Needed — October Broadcast (104,211 subscribers)',
        time: 'Oct 28',
        date: 'Oct 28, 2019, 11:02 AM',
        snippet: 'Template staged and ready. Nothing deploys until you sign off...',
        photo: `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="auto" viewBox="0 0 320 240" overflow="hidden" style="background:#f6fff8;border-radius:8px">
          <clipPath id="cp3"><rect width="320" height="240"/></clipPath>
          <g clip-path="url(#cp3)">
          <text x="160" y="14" font-family="Arial" font-size="9" fill="#aaa" letter-spacing="1.5" text-anchor="middle">QA CHECKLIST — OCTOBER BROADCAST</text>
          <rect x="6" y="20" width="200" height="202" fill="#fff" rx="7" stroke="#e8eaed" stroke-width="1"/>
          <circle cx="30" cy="52" r="11" fill="#34A853"/><text x="30" y="57" font-family="Arial" font-size="11" fill="#fff" text-anchor="middle">✓</text>
          <text x="50" y="48" font-family="Arial" font-size="12" fill="#202124">Rendering</text>
          <text x="50" y="62" font-family="Arial" font-size="9" fill="#888">Gmail · Outlook · Apple Mail</text>
          <circle cx="30" cy="102" r="11" fill="#34A853"/><text x="30" y="107" font-family="Arial" font-size="11" fill="#fff" text-anchor="middle">✓</text>
          <text x="50" y="98" font-family="Arial" font-size="12" fill="#202124">All links verified</text>
          <text x="50" y="112" font-family="Arial" font-size="9" fill="#888">84 links across 6 sections</text>
          <circle cx="30" cy="152" r="11" fill="#34A853"/><text x="30" y="157" font-family="Arial" font-size="11" fill="#fff" text-anchor="middle">✓</text>
          <text x="50" y="148" font-family="Arial" font-size="12" fill="#202124">Unsubscribe footer</text>
          <text x="50" y="162" font-family="Arial" font-size="9" fill="#888">CAN-SPAM compliant · active</text>
          <circle cx="30" cy="200" r="11" fill="#FBBC05"/><text x="30" y="205" font-family="Arial" font-size="11" fill="#fff" text-anchor="middle" font-weight="bold">!</text>
          <text x="50" y="196" font-family="Arial" font-size="12" fill="#FBBC05" font-weight="bold">Personalization</text>
          <text x="50" y="210" font-family="Arial" font-size="9" fill="#FBBC05">tokens — needs review</text>
          <rect x="212" y="20" width="102" height="58" fill="#f0fdf4" rx="7" stroke="#34A853" stroke-width="1.5"/>
          <text x="263" y="50" font-family="Arial" font-size="20" fill="#34A853" font-weight="bold" text-anchor="middle">104K</text>
          <text x="263" y="66" font-family="Arial" font-size="9" fill="#34A853" letter-spacing="1" text-anchor="middle">SUBSCRIBERS</text>
          <rect x="212" y="86" width="102" height="50" fill="#fff9e6" rx="7" stroke="#FBBC05" stroke-width="1.5"/>
          <text x="263" y="110" font-family="Arial" font-size="15" fill="#FBBC05" font-weight="bold" text-anchor="middle">2:00 PM</text>
          <text x="263" y="126" font-family="Arial" font-size="9" fill="#FBBC05" letter-spacing="1" text-anchor="middle">DEPLOY WINDOW</text>
          <rect x="212" y="144" width="102" height="78" fill="#fff" rx="7" stroke="#e8eaed" stroke-width="1"/>
          <text x="263" y="163" font-family="Arial" font-size="9" fill="#aaa" letter-spacing="1" text-anchor="middle">QA STATUS</text>
          <text x="263" y="190" font-family="Arial" font-size="20" fill="#34A853" font-weight="bold" text-anchor="middle">3 / 4</text>
          <text x="263" y="207" font-family="Arial" font-size="9" fill="#aaa" text-anchor="middle">items cleared</text>
          <text x="263" y="218" font-family="Arial" font-size="8" fill="#FBBC05" text-anchor="middle">1 pending review</text>
          <rect x="6" y="226" width="308" height="10" fill="#e8f5e9" rx="4"/>
          <rect x="6" y="226" width="231" height="10" fill="#34A853" rx="4" opacity=".8"/>
          <text x="119" y="235" font-family="Arial" font-size="8" fill="#fff" text-anchor="middle" font-weight="bold">75% READY FOR DEPLOY</text>
          </g>
        </svg>`,
        photoLabel: 'Email QA checklist screenshot',
        body: `Lucius,\n\nOctober broadcast is staged and waiting on you. 104,211 people on this list — we don't touch the deploy button until you've been through it.\n\nHere's where we are:\n• Client rendering checked across Gmail, Outlook, Apple Mail ✓\n• Every link tested ✓\n• Unsubscribe flow confirmed active ✓\n• Personalization tokens — needs your eyes\n• Subject line and preview text locked ✓\n\nYou've caught things at this stage that would've been ugly at scale. That's exactly why this process exists. Aiming for a 2PM window — let me know when you're clear.\n\n— Prayfah\nContent Manager`
      },
      {
        id: 4,
        from: 'Connie Codedit',
        addr: 'connie.codedit@newblueinteractive.com',
        color: '#FBBC05',
        subject: 'HTML Email Build Complete — Responsive Template v3 in CRM',
        time: 'Sep 12',
        date: 'Sep 12, 2019, 3:38 PM',
        snippet: 'Your HTML/CSS spec is built, QA\'d, and loaded. Renders clean on all clients...',
        photo: `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="auto" viewBox="0 0 320 240" overflow="hidden" style="background:#1e1e1e;border-radius:8px">
          <clipPath id="cp4"><rect width="320" height="240"/></clipPath>
          <g clip-path="url(#cp4)">
          <rect width="320" height="24" fill="#252526"/>
          <rect x="0" y="0" width="110" height="24" fill="#1e1e1e"/>
          <rect x="108" y="0" width="2" height="24" fill="#333"/>
          <text x="55" y="16" font-family="monospace" font-size="10" fill="#ccc" text-anchor="middle">template_v3.html</text>
          <text x="10" y="38" font-family="monospace" font-size="11" fill="#555">1</text>
          <text x="10" y="57" font-family="monospace" font-size="11" fill="#555">2</text>
          <text x="10" y="76" font-family="monospace" font-size="11" fill="#555">3</text>
          <text x="10" y="95" font-family="monospace" font-size="11" fill="#555">4</text>
          <text x="10" y="114" font-family="monospace" font-size="11" fill="#555">5</text>
          <text x="10" y="133" font-family="monospace" font-size="11" fill="#555">6</text>
          <text x="10" y="152" font-family="monospace" font-size="11" fill="#555">7</text>
          <text x="24" y="38" font-family="monospace" font-size="11" fill="#6a9955">&lt;!-- responsive email v3 --&gt;</text>
          <text x="24" y="57" font-family="monospace" font-size="11" fill="#569cd6">&lt;table</text>
          <text x="65" y="57" font-family="monospace" font-size="11" fill="#9cdcfe"> class</text>
          <text x="106" y="57" font-family="monospace" font-size="11" fill="#d4d4d4">=</text>
          <text x="113" y="57" font-family="monospace" font-size="11" fill="#ce9178">"responsive-wrap"&gt;</text>
          <text x="24" y="76" font-family="monospace" font-size="11" fill="#569cd6">  &lt;td</text>
          <text x="58" y="76" font-family="monospace" font-size="11" fill="#9cdcfe"> style</text>
          <text x="99" y="76" font-family="monospace" font-size="11" fill="#ce9178">="width:600px;max-width:100%"</text>
          <text x="24" y="95" font-family="monospace" font-size="11" fill="#6a9955">  /* dark mode safe ✓ */</text>
          <text x="24" y="114" font-family="monospace" font-size="11" fill="#c586c0">@media</text>
          <text x="65" y="114" font-family="monospace" font-size="11" fill="#d4d4d4"> (max-width: 480px) {</text>
          <text x="24" y="133" font-family="monospace" font-size="11" fill="#9cdcfe">  .two-col</text>
          <text x="90" y="133" font-family="monospace" font-size="11" fill="#d4d4d4"> { display:</text>
          <text x="160" y="133" font-family="monospace" font-size="11" fill="#ce9178"> block</text>
          <text x="200" y="133" font-family="monospace" font-size="11" fill="#d4d4d4">; }</text>
          <text x="24" y="152" font-family="monospace" font-size="11" fill="#d4d4d4">}</text>
          <rect x="24" y="158" width="7" height="11" fill="#aeafad"/>
          <line x1="0" y1="172" x2="320" y2="172" stroke="#333" stroke-width="1"/>
          <rect x="0" y="172" width="320" height="68" fill="#007acc"/>
          <rect x="10" y="182" width="64" height="46" fill="rgba(255,255,255,.15)" rx="3"/>
          <rect x="15" y="188" width="54" height="7" fill="rgba(255,255,255,.5)" rx="1"/>
          <rect x="15" y="199" width="54" height="5" fill="rgba(255,255,255,.25)" rx="1"/>
          <rect x="15" y="208" width="40" height="5" fill="rgba(255,255,255,.25)" rx="1"/>
          <rect x="15" y="217" width="46" height="5" fill="rgba(255,255,255,.25)" rx="1"/>
          <text x="42" y="232" font-family="Arial" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">DESKTOP</text>
          <rect x="80" y="186" width="28" height="42" fill="rgba(255,255,255,.15)" rx="3"/>
          <rect x="84" y="194" width="20" height="5" fill="rgba(255,255,255,.5)" rx="1"/>
          <rect x="84" y="203" width="20" height="4" fill="rgba(255,255,255,.25)" rx="1"/>
          <rect x="84" y="211" width="14" height="4" fill="rgba(255,255,255,.25)" rx="1"/>
          <text x="94" y="232" font-family="Arial" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">320PX</text>
          <text x="118" y="188" font-family="Arial" font-size="11" fill="rgba(255,255,255,.95)" font-weight="bold">Responsive Template v3</text>
          <text x="118" y="203" font-family="Arial" font-size="9" fill="rgba(255,255,255,.6)">Outlook · Gmail · Apple Mail · Dark mode</text>
          <text x="118" y="216" font-family="Arial" font-size="9" fill="rgba(255,255,255,.6)">Inline CSS · 600px · Mobile-first</text>
          <text x="118" y="231" font-family="Arial" font-size="10" fill="#4ec9b0">✓ QA&apos;d — in the template library</text>
          </g>
        </svg>`,
        photoLabel: 'Responsive email template mockup',
        body: `Lucius,\n\nv3 is done. Your spec translated cleanly — here's what shipped:\n\n• Responsive across all breakpoints (320px through desktop)\n• Inline CSS throughout for Outlook\n• Dark mode tested on iOS Mail and the Gmail app — holds fine\n• Two-column layout folds to single-column on mobile without breaking\n\nHonestly, this was the easiest build we've had in a while. The structure you wrote was clean enough that we barely had to interpret anything — just execute. It's now the default template in the library.\n\n— Connie\nDev Desk`
      },
      {
        id: 5,
        from: 'Teaness Sippa',
        addr: 'teaness.sippa@newblueinteractive.com',
        color: '#9C27B0',
        subject: 'Creative Package Delivered — PSD, AI, and All Platform Exports',
        time: 'Aug 5',
        date: 'Aug 5, 2019, 1:22 PM',
        snippet: 'All final creative files are ready. Everything built in Photoshop and Illustrator...',
        photo: `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="auto" viewBox="0 0 320 240" overflow="hidden" style="background:#faf5ff;border-radius:8px">
          <clipPath id="cp5"><rect width="320" height="240"/></clipPath>
          <g clip-path="url(#cp5)">
          <text x="160" y="14" font-family="Arial" font-size="9" fill="#aaa" letter-spacing="1.5" text-anchor="middle">CREATIVE PACKAGE — FINAL DELIVERY</text>
          <rect x="6" y="20" width="72" height="72" fill="#9C27B0" rx="6"/>
          <text x="42" y="57" font-family="Arial" font-size="14" fill="rgba(255,255,255,.9)" text-anchor="middle" font-weight="bold">PSD</text>
          <text x="42" y="70" font-family="Arial" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">Hero Banner</text>
          <rect x="82" y="20" width="72" height="72" fill="#E91E63" rx="6"/>
          <text x="118" y="57" font-family="Arial" font-size="14" fill="rgba(255,255,255,.9)" text-anchor="middle" font-weight="bold">AI</text>
          <text x="118" y="70" font-family="Arial" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">Icon Set</text>
          <rect x="158" y="20" width="72" height="72" fill="#FF9800" rx="6"/>
          <text x="194" y="57" font-family="Arial" font-size="14" fill="rgba(255,255,255,.9)" text-anchor="middle" font-weight="bold">PNG</text>
          <text x="194" y="70" font-family="Arial" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">Social Cuts</text>
          <rect x="234" y="20" width="80" height="72" fill="#3F51B5" rx="6"/>
          <text x="274" y="52" font-family="Arial" font-size="13" fill="rgba(255,255,255,.9)" text-anchor="middle" font-weight="bold">PSD</text>
          <text x="274" y="66" font-family="Arial" font-size="8" fill="rgba(255,255,255,.7)" text-anchor="middle">Email Headers</text>
          <text x="274" y="78" font-family="Arial" font-size="7" fill="rgba(255,255,255,.5)" text-anchor="middle">Light + dark</text>
          <rect x="6" y="98" width="308" height="14" fill="#f3e5ff" rx="4"/>
          <rect x="6" y="98" width="61" height="14" fill="#9C27B0" rx="4"/>
          <rect x="67" y="98" width="62" height="14" fill="#E91E63" rx="0"/>
          <rect x="129" y="98" width="62" height="14" fill="#FF9800" rx="0"/>
          <rect x="191" y="98" width="62" height="14" fill="#3F51B5" rx="0"/>
          <rect x="253" y="98" width="61" height="14" fill="#4CAF50" rx="0" style="border-radius:0 4px 4px 0"/>
          <rect x="6" y="118" width="308" height="96" fill="#fff" rx="7" stroke="#e0d4f5" stroke-width="1.5"/>
          <text x="160" y="136" font-family="Arial" font-size="11" fill="#9C27B0" text-anchor="middle" letter-spacing="1" font-weight="bold">DELIVERABLES</text>
          <line x1="109" y1="142" x2="109" y2="204" stroke="#f0e8ff" stroke-width="1"/>
          <line x1="211" y1="142" x2="211" y2="204" stroke="#f0e8ff" stroke-width="1"/>
          <text x="57" y="162" font-family="Arial" font-size="10" fill="#555" text-anchor="middle">4 file formats</text>
          <text x="57" y="175" font-family="Arial" font-size="8" fill="#aaa" text-anchor="middle">PSD · AI · PNG · PDF</text>
          <text x="160" y="162" font-family="Arial" font-size="9" fill="#555" text-anchor="middle">4 sizes / platform</text>
          <text x="160" y="175" font-family="Arial" font-size="8" fill="#aaa" text-anchor="middle">1080 · 1200 · 628px</text>
          <text x="263" y="162" font-family="Arial" font-size="10" fill="#555" text-anchor="middle">Light + dark</text>
          <text x="263" y="175" font-family="Arial" font-size="8" fill="#aaa" text-anchor="middle">All variants</text>
          <text x="160" y="200" font-family="Arial" font-size="8" fill="#9C27B0" text-anchor="middle" font-style="italic">Brand guide · named layers · copy-edit ready</text>
          <rect x="6" y="220" width="308" height="16" fill="#f3e5ff" rx="4"/>
          <text x="160" y="232" font-family="Arial" font-size="8" fill="#9C27B0" text-anchor="middle" font-weight="bold">✓ Photoshop · ✓ Illustrator · ✓ Named files · ✓ Copy-edit ready</text>
          </g>
        </svg>`,
        photoLabel: 'Creative asset package preview',
        body: `Lucius,\n\nEverything's packaged and ready to hand off.\n\nWhat's in there:\n• Hero banner — layered PSD, every element separated\n• Icons — live vector AI files, nothing rasterized\n• Social formats — PNG exports cut to spec for each platform (4 sizes each)\n• Email headers — light and dark versions, both PSD\n\nAll the Photoshop and Illustrator work is built so the next person can actually use it. Live text, organized layers, named files. Copy changes are a two-minute job.\n\nThis campaign would've slipped two weeks without the production pace you kept.\n\n— Teaness\nCreative Director`
      }
    ];

    const spamEmails = [
      { color: '#F4B400', from: 'Prince Adebayo Okonkwo', subject: '🤝 CONFIDENTIAL BUSINESS PROPOSAL — $4.7M USD Awaiting Transfer', time: 'Mar 14', snippet: 'Dear Friend, I am a Nigerian prince in urgent need of your bank account...' },
      { color: '#DB4437', from: 'LinkedIn', subject: 'Lucius, you have 847 profile views this week! 🔥', time: 'Mar 13', snippet: 'Recruiters are looking at your profile. Upgrade to Premium to see who...' },
      { color: '#4285F4', from: 'Groupon', subject: '94% OFF Laser Hair Removal — TODAY ONLY (Expires in 00:47:22)', time: 'Mar 12', snippet: 'Don\'t miss this deal! 47 people are looking at this right now...' },
      { color: '#0F9D58', from: 'Amazon', subject: 'Your package has been delayed 🚨 Action Required', time: 'Mar 11', snippet: 'We were unable to deliver your package. Click here to reschedule. (You have no order)' },
      { color: '#AA00FF', from: 'DoorDash', subject: 'Lucius, your Chipotle is getting COLD 🌯 We\'re concerned', time: 'Mar 10', snippet: 'We noticed you haven\'t ordered in 3 days. Are you okay? Your burrito misses you...' },
      { color: '#E91E63', from: 'Shutterstock', subject: 'You left something behind... 👀', time: 'Mar 9', snippet: 'Those stock photos you were looking at are still available. They\'re thinking about you.' },
      { color: '#FF6D00', from: 'Geico', subject: 'Lucius — 15 minutes could save you 15% or more. Or you could just read this email forever', time: 'Mar 8', snippet: 'You\'ve received this email because you exist. Click to get a quote for something.' },
      { color: '#607D8B', from: 'Ancestry.com', subject: 'We found a SHOCKING family secret 😱 (subscribe to find out)', time: 'Mar 7', snippet: 'One of your ancestors did something. Click to reveal their identity for just $29.99/mo...' }
    ];

    function renderInbox() {
      const allEmails = [...gmEmails.map(e => ({ ...e, isQualification: true }))];
      // Intersperse spam between real emails
      const spamCopy = [...spamEmails];
      const mixed = [];
      allEmails.forEach((e, i) => {
        mixed.push(e);
        if (spamCopy.length && (i === 1 || i === 3)) mixed.push({ ...spamCopy.shift(), isQualification: false });
      });
      while (spamCopy.length) mixed.push({ ...spamCopy.shift(), isQualification: false });

      gmInbox.innerHTML = mixed.map(e => `
        <div class="gm-email-row${e.isQualification ? '' : ' gm-spam'}" ${e.isQualification ? `data-id="${e.id}"` : ''}>
          <div class="gm-unread-dot" style="${e.isQualification ? '' : 'visibility:hidden'}"></div>
          <div class="gm-avatar" style="background:${e.color}">${e.from[0]}</div>
          <div class="gm-email-sender" style="${e.isQualification ? '' : 'font-weight:400;color:#5f6368'}">${e.from}</div>
          <div class="gm-email-preview">
            <span class="gm-subject" style="${e.isQualification ? '' : 'font-weight:400;color:#5f6368'}">${e.subject}</span>
            <span class="gm-snippet"> — ${e.snippet}</span>
          </div>
          <div class="gm-email-time" style="${e.isQualification ? '' : 'font-weight:400;color:#5f6368'}">${e.time}</div>
        </div>
      `).join('');

      gmInbox.querySelectorAll('.gm-email-row:not(.gm-spam)').forEach(row => {
        row.addEventListener('click', () => openEmail(parseInt(row.dataset.id)));
      });
    }

    function openEmail(id) {
      const e = gmEmails.find(x => x.id === id);
      document.getElementById('gm-ev-subject').textContent = e.subject;
      document.getElementById('gm-ev-avatar').textContent = e.from[0];
      document.getElementById('gm-ev-avatar').style.background = e.color;
      document.getElementById('gm-ev-from').textContent = e.from;
      document.getElementById('gm-ev-addr').textContent = `<${e.addr}>`;
      document.getElementById('gm-ev-date').textContent = e.date;

      const photoEl = document.getElementById('gm-ev-photo');
      photoEl.innerHTML = e.photo || `📷 &nbsp;${e.photoLabel}`;

      document.getElementById('gm-ev-body').innerHTML = e.body.replace(/\n/g, '<br>');

      // Mark as read (remove bold + dot)
      const row = gmInbox.querySelector(`[data-id="${id}"]`);
      if (row) {
        row.querySelector('.gm-unread-dot').style.visibility = 'hidden';
        row.querySelector('.gm-email-sender').style.fontWeight = '400';
        row.querySelector('.gm-subject').style.fontWeight = '400';
        row.querySelector('.gm-email-time').style.fontWeight = '400';
      }

      gmInbox.style.display = 'none';
      gmEmailView.classList.add('open');
    }

    document.getElementById('gm-inbox-btn').addEventListener('click', () => {
      gmEmailView.classList.remove('open');
      gmInbox.style.display = 'flex';
      gmInbox.style.flexDirection = 'column';
    });

    document.getElementById('gm-back-btn').addEventListener('click', () => history.back());

    function openGmail() {
      renderInbox();
      gmEmailView.classList.remove('open');
      gmInbox.style.display = 'flex';
      gmInbox.style.flexDirection = 'column';
      gmailEl.style.display = 'flex';
      requestAnimationFrame(() => gmailEl.classList.add('visible'));
    }

    function closeGmail() {
      gmailEl.classList.remove('visible');
      setTimeout(() => { gmailEl.style.display = 'none'; }, 300);
    }

    // --- Reservation Book (Lock Stock) ---
    const bookviewEl = document.getElementById('bookview');

    const reservations = [
      { time: '11:00 AM', pax: 2, guest: 'FOH Team Leadership', note: 'Stewarded team of 5 from open to close', table: 'Tbl 3', status: 'completed', slides: [
        { label: 'The Skill', text: 'Stewarded a front-of-house team of 5 through every service period, active on the floor from open to close, working directly alongside staff rather than directing from a distance.' },
        { label: 'How It Worked', text: 'The team knew where the standard was because they could see it being held every shift. I was the last line of quality control for the guest experience, the team\'s execution, and the energy of the room.' }
      ]},
      { time: '11:30 AM', pax: 4, guest: 'Staff Training & Development', note: 'Onboarding programs & performance reviews', table: 'Tbl 7', status: 'completed', slides: [
        { label: 'The Skill', text: 'Designed and executed onboarding and training for incoming FOH staff, covering service standards, product knowledge, and what it means to steward a members club.' },
        { label: 'How It Worked', text: 'Training wasn\'t a one-time event. It was ongoing. Real-time feedback during shifts, formal performance reviews each season. Small corrections compounded into real improvement.' }
      ]},
      { time: '12:00 PM', pax: 2, guest: 'VIP Guest Relations', note: 'Primary contact for founding members & regulars', table: 'Tbl 1', status: 'vip', photos: ['https://i.imgur.com/3SM2sT5.jpg','https://i.imgur.com/G1PYxXJ.jpg'], slides: [
        { label: 'The Skill', text: 'Stewarded relationships with founding members, regulars, and high-value guests. Primary point of contact across every service period.' },
        { label: 'How It Worked', text: 'Tracked preferences, remembered names, and made every returning guest feel like the room was set up for them. Joy is the strongest engine of brand memory. That was the strategy.' }
      ]},
      { time: '12:00 PM', pax: 6, guest: 'Studio Skate — Ice Activation', note: 'Five-event series · 1,000+ invite list · Chalet → rink conversion', table: 'Event', status: 'completed', slides: [
        { label: 'The Activation', text: 'Produced Studio Skate — a five-event ice skating series built to convert Chalet dinner guests into a second-half-of-night experience. Owned vendor coordination, programming, and day-of execution start to finish.' },
        { label: 'The Audience Build', text: 'Built a 1,000+ person invite list from scratch and managed live conversion of pop-up walk-bys into rink guests on the night. The event was the marketing.' }
      ]},
      { time: '12:30 PM', pax: 2, guest: 'Reservation Management', note: 'Daily oversight via Resy & OpenTable', table: 'Tbl 4', status: 'completed', slides: [
        { label: 'The Skill', text: 'Managed the full reservation flow daily using Resy and OpenTable, balancing capacity, pacing, and the guest experience from the host stand.' },
        { label: 'How It Worked', text: 'I actively supported the host throughout each shift, making real-time adjustments to seating assignments to keep covers moving without guests feeling rushed.' }
      ]},
      { time: '1:00 PM', pax: 3, guest: 'Guest Recovery', note: 'De-escalation & service recovery on the floor', table: 'Tbl 6', status: 'seated', photos: ['https://i.imgur.com/xMJo2FG.jpg','https://i.imgur.com/cXqqkq2.jpg'], slides: [
        { label: 'The Skill', text: 'Handled all escalated guest concerns on the floor: resolving complaints, de-escalating tension, and converting a negative experience into a reason to return.' },
        { label: 'How It Worked', text: 'Speed and ownership. Never passed a problem to someone else. Made the call on the floor, handled it personally, and followed up before the guest left. A guest who got it handled right often becomes more loyal than one who never had an issue.' }
      ]},
      { time: '1:00 PM', pax: 8, guest: 'Corporate Activations', note: 'Multi-property coordination with HR & Comms', table: 'Tbl 12', status: 'completed', slides: [
        { label: 'The Skill', text: 'Produced corporate events across multiple Happier properties, coordinating cross-functionally with HR, Facilities, and Communications from first contact through execution.' },
        { label: 'How It Worked', text: 'These weren\'t dinner reservations. They were full activations involving space setup, custom programming, and internal stakeholder alignment before a single guest arrived.' }
      ]},
      { time: '1:30 PM', pax: 2, guest: 'Real-Time Seating Flow', note: 'Adjusted assignments to maintain service pacing', table: 'Tbl 2', status: 'arrived', photos: ['https://i.imgur.com/9eoB4jd.jpg','https://i.imgur.com/biMncas.jpg'], slides: [
        { label: 'The Skill', text: 'Maintained live control of seating flow throughout each shift, reading the room, anticipating bottlenecks, and adjusting table assignments before problems developed.' },
        { label: 'How It Worked', text: 'I stayed at or near the host stand during peak periods, tracking turn times, kitchen pacing, and server sections to keep everything balanced in real time.' }
      ]},
      { time: '2:00 PM', pax: 4, guest: 'Member Onboarding', note: 'New member experience & relationship building', table: 'Tbl 8', status: 'reserved', photos: ['https://i.imgur.com/sbxAUZl.jpg','https://i.imgur.com/yTlUbxT.jpg'], slides: [
        { label: 'The Skill', text: 'Led the in-person onboarding experience for new Happier members, introducing them to the space, the team, and the standard of service they could expect.' },
        { label: 'How It Worked', text: 'First impressions set the tone for the entire membership. I personally greeted new members, walked them through the space, and made sure their first visit was memorable.' }
      ]},
      { time: '2:00 PM', pax: 2, guest: 'Toast POS Operations', note: 'Daily platform management & reporting', table: 'Tbl 1', status: 'completed', slides: [
        { label: 'The Skill', text: 'Operated Toast POS daily for order management, payment processing, and end-of-shift reporting, alongside Resy and OpenTable for reservations.' },
        { label: 'How It Worked', text: 'Knowing the systems meant the team could lean on me for troubleshooting during service, and I could pull accurate reporting at close without delays.' }
      ]},
      { time: '3:00 PM', pax: 20, guest: 'Tyla · OBJ · Luar', note: 'Release parties, birthdays, fashion activations — floor-level', table: 'Main Floor', status: 'reserved', photos: ['https://i.imgur.com/NYxXVd2.jpg','https://i.imgur.com/RB3kxOp.jpg'], slides: [
        { label: 'In the Room', text: 'Worked events on the floor including Tyla\'s release party, Odell Beckham Jr.\'s birthday, and Luar fashion shows. The members club was where the culture was happening — the job was making sure it felt that way for everyone in it.' },
        { label: 'What That Requires', text: 'High-profile events don\'t run themselves. Seating, flow, VIP handling, real-time problem solving — the floor work is what makes the room feel effortless. Nobody in the room should ever see the coordination behind it.' }
      ]},
      { time: '5:00 PM', pax: 2, guest: 'Service Standards', note: 'Brand delivery from first cover to last', table: 'Tbl 5', status: 'completed', slides: [
        { label: 'The Skill', text: 'Held Happier\'s brand standard across every service period, from the first cover of the day through the last. The brand doesn\'t live in a deck. It lives in the room.' },
        { label: 'How It Worked', text: 'Standards don\'t enforce themselves. Active floor presence, in-the-moment coaching, and setting the expectation through my own behavior. Every shift, every cover.' }
      ]},
      { time: '5:30 PM', pax: 4, guest: 'Performance Management', note: 'Ongoing feedback & staff development', table: 'Tbl 9', status: 'reserved', photos: ['https://i.imgur.com/tgnJSKo.jpg','https://i.imgur.com/UUfdzuI.jpg'], slides: [
        { label: 'The Skill', text: 'Provided ongoing performance feedback to FOH staff and contributed to formal reviews, keeping the team accountable and growing throughout each season.' },
        { label: 'How It Worked', text: 'Feedback happened in real time, not just at review cycles. A quick note after service about what went well or what to adjust is more effective than a quarterly conversation.' }
      ]},
      { time: '6:00 PM', pax: 10, guest: 'Cross-Functional Coordination', note: 'Aligned ops across HR, Facilities & Communications', table: 'Tbl 12', status: 'reserved', photos: ['https://i.imgur.com/FPLyO64.jpg','https://i.imgur.com/jW8Su7Y.jpg'], slides: [
        { label: 'The Skill', text: 'Coordinated regularly with HR, Facilities, and Communications teams to execute events and resolve operational issues across Happier\'s properties.' },
        { label: 'How It Worked', text: 'Hospitality doesn\'t operate in a silo. Getting the right things done meant knowing who to call, communicating clearly, and following through without being chased.' }
      ]},
      { time: '8:00 PM', pax: 4, guest: 'Chalet · 4 top', note: 'Member mentioned Studio Skate after dinner', table: 'Tbl 6', status: 'reserved', photos: ['https://i.imgur.com/J7oOK2g.jpg','https://i.imgur.com/OPATVq7.jpg'], slides: [
        { label: 'The Setup', text: 'Chalet was Happier\'s winter dining experience, running alongside Studio Skate in the same building on the same nights. My job was managing the Chalet floor while pitching the transition — moving dinner guests into the skating activation at the right moment.' },
        { label: 'The Conversion', text: 'The pitch window was 9:00–9:15, after the main course. Soft, not pushy — the ones who went almost always came back. That\'s the job: make a dinner into an evening, and an evening into a membership story.' }
      ]}
    ];

    const shifts = [
      { label: '— Morning Service  11:00 AM – 12:30 PM', from: '11:00 AM', to: '12:59 PM' },
      { label: '— Afternoon Service  1:00 PM – 3:00 PM', from: '1:00 PM', to: '3:59 PM' },
      { label: '— Evening Service  5:00 PM – Close', from: '4:00 PM', to: '11:59 PM' }
    ];

    function timeToMin(t) {
      const [time, ampm] = t.split(' ');
      let [h, m] = time.split(':').map(Number);
      if (ampm === 'PM' && h !== 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      return h * 60 + m;
    }

    function renderBook() {
      const panel = document.getElementById('bk-resv-panel');
      let html = '';
      shifts.forEach(shift => {
        const rows = reservations.filter(r => {
          const t = timeToMin(r.time);
          return t >= timeToMin(shift.from) && t < timeToMin(shift.to);
        });
        if (!rows.length) return;
        html += `<div class="bk-shift-label">${shift.label}</div>`;
        rows.forEach((r) => {
          const idx = reservations.indexOf(r);
          const clickable = r.status !== 'completed';
          html += `<div class="bk-resv-row ${r.status}${clickable ? ' clickable' : ''}" data-resv="${idx}">
            <div class="bk-time">${r.time}</div>
            <div class="bk-pax">${r.pax}👤</div>
            <div class="bk-guest">${r.guest}${r.note ? `<div class="bk-note">${r.note}</div>` : ''}</div>
            <div class="bk-table">${r.table}</div>
            <div class="bk-status ${r.status}">${r.status}</div>
          </div>`;
        });
      });
      panel.innerHTML = html;

      panel.querySelectorAll('.bk-resv-row.clickable').forEach(row => {
        row.addEventListener('click', () => {
          const resv = reservations[parseInt(row.dataset.resv)];
          openResvPopup(resv);
        });
      });
    }

    let resvPopup = null;
    let resvSlideIndex = 0;

    function openResvPopup(resv) {
      if (resvPopup) { resvPopup.remove(); resvPopup = null; }

      const popup = document.createElement('div');
      popup.className = 'popup resv-popup';
      popup.style.setProperty('--tilt', '0deg');
      popup.style.visibility = 'hidden';
      popup.style.left = '-9999px';
      popup.style.top = '0';
      resvSlideIndex = 0;

      popup.innerHTML = buildResvPopupHTML(resv, 0);
      document.body.appendChild(popup);

      requestAnimationFrame(() => {
        const w = popup.offsetWidth;
        const h = popup.offsetHeight;
        popup.style.left = Math.round((window.innerWidth - w) / 2) + 'px';
        popup.style.top = Math.round((window.innerHeight - h) / 2) + 'px';
        popup.style.visibility = 'visible';
      });

      bindResvPopupBtns(popup, resv);
      makeDraggable(popup, popup.querySelector('[data-drag]'));
      resvPopup = popup;
    }

    function buildResvPopupHTML(resv, idx) {
      const slide = resv.slides[idx];
      const isLast = idx === resv.slides.length - 1;
      return `
        <div class="popup-titlebar" data-drag style="background:linear-gradient(to right,#111,#2a1f00);border-bottom:1px solid #c8a96e;">
          <div class="popup-title" style="color:#c8a96e;font-family:'Segoe UI',sans-serif;letter-spacing:0.08em;">${resv.guest}</div>
          <div class="popup-controls">
            <button class="popup-btn resv-close-btn" style="background:#2a2a2a;border-color:#555;color:#aaa;">✕</button>
          </div>
        </div>
        <div class="popup-photo" style="background:#111;border-bottom:1px solid #2a2a2a;">
          ${(resv.photos && resv.photos[idx]) ? `<img src="${resv.photos[idx]}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:contain;background:#111;">` : `<div class="popup-photo-placeholder" style="border-color:rgba(200,169,110,0.2);color:rgba(200,169,110,0.3);">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            Add photo
          </div>`}
        </div>
        <div class="popup-body" style="background:#1a1008;border-top:none;">
          <div class="popup-label" style="color:#c8a96e;">${slide.label}</div>
          <div class="popup-text" style="color:#e8e0d0;">${slide.text}</div>
        </div>
        <div class="popup-footer" style="background:#111;border-top:1px solid #2a2a2a;">
          <span class="popup-counter" style="color:#666;">${idx + 1} of ${resv.slides.length}</span>
          ${!isLast
            ? `<button class="popup-next-btn resv-next-btn" style="color:#c8a96e;">Next →</button>`
            : '<span style="font-size:0.7rem;color:#555;letter-spacing:0.05em;">Done</span>'}
        </div>
      `;
    }

    function bindResvPopupBtns(popup, resv) {
      popup.querySelector('.resv-close-btn').addEventListener('click', () => {
        popup.classList.add('closing');
        popup.addEventListener('animationend', () => { popup.remove(); resvPopup = null; }, { once: true });
      });
      const nextBtn = popup.querySelector('.resv-next-btn');
      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          resvSlideIndex++;
          popup.innerHTML = buildResvPopupHTML(resv, resvSlideIndex);
          bindResvPopupBtns(popup, resv);
          const handle = popup.querySelector('[data-drag]');
          if (handle) makeDraggable(popup, handle);
        });
      }
    }

    document.getElementById('bk-close-btn').addEventListener('click', () => history.back());

    document.querySelectorAll('.bk-checklist-item').forEach(item => {
      item.addEventListener('click', () => {
        const box = item.querySelector('.bk-checkbox');
        const isDone = item.classList.toggle('done');
        box.classList.toggle('checked', isDone);
        box.textContent = isDone ? '✓' : '';
      });
    });

    const bkSideToggle = document.getElementById('bk-side-toggle');
    const bkSidePanel  = document.getElementById('bk-side-panel');
    bkSideToggle.addEventListener('click', () => {
      const isOpen = bkSidePanel.classList.toggle('expanded');
      bkSideToggle.classList.toggle('open', isOpen);
    });

    function openBook() {
      renderBook();
      bookviewEl.style.display = 'flex';
      requestAnimationFrame(() => bookviewEl.classList.add('visible'));
    }

    function closeBook() {
      bookviewEl.classList.remove('visible');
      setTimeout(() => { bookviewEl.style.display = 'none'; }, 300);
    }

    // --- Bar Menu (Lock Stock) ---
    const barmenuEl = document.getElementById('barmenu');

    const barSections = [
      {
        title: 'On Draft', ornament: '— ⬥ —',
        items: [
          { name: 'No Playbook', desc: 'Lock Stock was a new restaurant. The floor protocols didn\'t exist yet — we wrote them.', detail: 'Year One', slides: [
            { label: 'The Reality', text: 'When a new restaurant opens, there\'s no established way of doing things. There\'s only what works and what doesn\'t, discovered in real time. We figured out service flow, table pacing, and FOH-BOH coordination through repetition and adjustment, shift by shift.' },
            { label: 'How It Worked', text: 'Every issue that surfaced became a protocol. A table waited too long once — so we built a check system. The kitchen got backed up during a rush — so we changed how we paced tickets. The floor improved because we paid attention to what it was telling us.' },
            { label: 'The Result', text: 'By the end of the first year, we had something that looked like a real operation. Not because we copied it from somewhere else — because we built it ourselves.' }
          ]},
          { name: 'Learning the Room', desc: 'You can\'t manage a floor you\'ve never seen at full capacity — until you have.', detail: 'All Shifts', slides: [
            { label: 'The Reality', text: 'You can\'t manage a room you\'ve never seen fully booked. The early months were about learning the space — which sections got overwhelming, where the choke points were, how the floor changed when the bar got busy.' },
            { label: 'How It Worked', text: 'Active presence wasn\'t optional. I was in the room every shift, watching, adjusting, staying ahead of problems before guests felt them. That awareness compounded — the more shifts I ran, the more I could see what was coming.' },
            { label: 'The Result', text: 'A floor you understand is a floor you can control. It took time to get there. We got there.' }
          ]},
          { name: 'Holding the Standard', desc: 'Standards are only real if they hold when everything is in motion.', detail: 'Every Table', slides: [
            { label: 'The Reality', text: 'A new restaurant has a gap between what it aspires to be and what it actually is on a slammed Friday. Closing that gap required enforcing the same standard on a chaotic night that we had on a slow one.' },
            { label: 'How It Worked', text: 'Every table got the experience we\'d committed to, regardless of what else was happening. That\'s not easy when you\'re running a room that\'s still figuring itself out — but it\'s the only way to build a reputation.' },
            { label: 'The Result', text: 'The standard held. Guests came back. That\'s the whole job.' }
          ]}
        ]
      },
      {
        title: 'Cocktails', ornament: '— ⬥ —',
        items: [
          { name: 'Hiring Into Something New', desc: 'You can\'t train people into a system that hasn\'t been written yet.', detail: 'All Roles', slides: [
            { label: 'The Reality', text: 'Staffing a new restaurant means asking people to join something still being built. You\'re not teaching them how we do things here — you\'re figuring that out alongside them.' },
            { label: 'How It Worked', text: 'Cross-training was built in from day one. Every FOH staff member learned every role because the operation needed flexibility the playbook couldn\'t provide yet. No one could be a single point of failure in a place still finding its shape.' },
            { label: 'The Result', text: 'What got built wasn\'t just a staff. It was a team that could adapt — which mattered more than anyone knew at the time.' }
          ]},
          { name: 'Feedback as Foundation', desc: 'In a new operation, how you give feedback is how culture gets made.', detail: 'In-Shift · Weekly', slides: [
            { label: 'The Reality', text: 'There was no established culture to inherit. Whatever the team became, it became because of how we ran it — and that started with honest, real-time feedback every shift.' },
            { label: 'How It Worked', text: 'Small corrections compounded. A note after a table became a habit two weeks later. We didn\'t wait for formal review cycles — if something needed to be said, it got said that night.' },
            { label: 'The Result', text: 'By year one, the team was coaching itself. Because we\'d built the expectation that getting better was part of the job.' }
          ]},
          { name: 'Scheduling a Floor in Progress', desc: 'The schedule was one of the first things that told staff what kind of operation this was.', detail: 'Weekly', slides: [
            { label: 'The Reality', text: 'In a new restaurant, everything is provisional — including how many people you need on a given night. The schedule required constant adjustment as we learned the volume patterns and figured out where coverage gaps were actually happening.' },
            { label: 'How It Worked', text: 'We tracked patterns closely and built in what we learned. Which nights ran long. Which sections needed double coverage. When to cut early. The schedule became a document that reflected what the floor actually needed.' },
            { label: 'The Result', text: 'Staff got consistent hours. Labor costs stayed in line. The floor was always appropriately covered. That predictability built trust faster than almost anything else we did.' }
          ]}
        ]
      },
      {
        title: 'Spirits', ornament: '— ⬥ —',
        items: [
          { name: 'The Close, Every Night', desc: 'Financial discipline isn\'t inherited in a new operation — it\'s built from the first shift.', detail: 'Nightly Close', slides: [
            { label: 'The Reality', text: 'There were no established close procedures when we opened. We built the routine from scratch — cash reconciliation, comps, voids, documentation — and held to it every single night regardless of how late it ran.' },
            { label: 'How It Worked', text: 'The report was filed before anyone went home. Clean books meant management had accurate information every morning. You can\'t make decisions for a young business on guesswork.' },
            { label: 'The Result', text: 'That financial discipline became infrastructure. It was part of the culture before we even called it that.' }
          ]},
          { name: 'Compliance From Day One', desc: 'A new restaurant gets inspected. We made sure we were always ready.', detail: 'DOH Standards', slides: [
            { label: 'The Reality', text: 'Opening a new food service operation means starting the compliance clock immediately. We built regulatory standards into the close routine from the first week — not as a response to inspections, but as part of how the operation ran.' },
            { label: 'How It Worked', text: 'Food storage, temperature logs, sanitation stations — checked every night as habit. The philosophy was simple: nothing about our operation should change when the inspector shows up.' },
            { label: 'The Result', text: 'No violations. No surprises. A clean inspection is a byproduct of consistent nightly habits.' }
          ]},
          { name: 'Keeping the Space Operational', desc: 'A new build means constant maintenance. The job was staying ahead of it.', detail: 'As Needed', slides: [
            { label: 'The Reality', text: 'A newly opened restaurant is a construction project that never fully ends. Equipment fails, systems need adjustment, the building reveals itself over time. The job was making sure none of that became the guest\'s problem.' },
            { label: 'How It Worked', text: 'We built a triage system — logged everything, sorted by urgency, actioned before issues cascaded. Staff worked in a functional space because we made that a priority, not an afterthought.' },
            { label: 'The Result', text: 'The operation ran clean. That made everything else easier.' }
          ]}
        ]
      },
      {
        title: "Tonight's Special", ornament: '— ✦ —',
        items: [
          { name: 'The COVID Pivot', desc: 'COVID closed the dining room overnight. Everything we\'d built for in-house service had to be rebuilt for a model we\'d never run.', detail: 'March 2020', slides: [
            { label: 'Before', text: 'By early 2020, Lock Stock had the systems any well-run restaurant puts in place — floor protocols, trained staff, close procedures, compliance built into the nightly routine. The operation was running the way it was supposed to.' },
            { label: 'The Pivot', text: 'COVID closed the dining room in March 2020. None of those systems applied anymore. We rebuilt the operation for takeout from scratch — online ordering stood up, kitchen-to-curb fulfillment designed, new SOPs written for a model we\'d never operated. Every management process had to be rethought for a fundamentally different kind of service.' },
            { label: 'The Shift', text: 'Managing a takeout operation isn\'t managing a dining room with the tables removed. The pacing is different, the handoffs are different, the quality control points are different. We figured out what the new version of each system needed to look like — and we did it fast.' }
          ]},
          { name: 'Marketing a Restaurant That Couldn\'t Open', desc: 'We had to give people a reason to come back when coming in wasn\'t an option.', detail: 'Digital · Social', slides: [
            { label: 'The Problem', text: 'A restaurant that can\'t seat guests still has rent, staff, and a kitchen. The only path through was volume — and volume meant making sure the community knew we were still operating, still worth ordering from, and still worth supporting.' },
            { label: 'The Work', text: 'Ran digital marketing across social and local channels to promote the takeout program — positioning Lock Stock as the go-to option in Canandaigua for the duration of restrictions. Built campaigns around the menu, turnaround times, and the fact that we were local and staying open.' },
            { label: 'The Result', text: 'The marketing worked. Takeout volume sustained the business through the closure period. Customers who found us through that channel came back when the dining room reopened — the pivot extended the customer base rather than just preserving it.' }
          ]},
          { name: 'Rebuilding the Team', desc: 'Every reopening phase meant a different version of the operation — and a different version of the staff.', detail: 'Phased Return', slides: [
            { label: 'The Reality', text: 'Restrictions didn\'t lift all at once. Each phase — outdoor only, limited indoor, full capacity — required a different staffing model, different floor protocols, and a team that had to be retrained for a new set of rules every few months.' },
            { label: 'The Work', text: 'Staff had been reduced, cross-trained for takeout, and then gradually brought back as each phase allowed more service. Every return meant reestablishing the dine-in systems we\'d had before — table flow, section coverage, service standards — with a team that was partially new and partially coming back from a long time away from full restaurant work.' },
            { label: 'The Result', text: 'The operation came back intact. The standards held. What made it possible wasn\'t any single decision — it was having built a team that knew how to adapt, and systems flexible enough to be rebuilt more than once.' }
          ]}
        ]
      }
    ];

    let bmPopup = null;
    let bmSlideIndex = 0;
    let bmCurrentPage = 0;

    const p = lsSlidePhotos;
    const bmSpreads = [
      { type: 'cover' },
      { type: 'text-photo', section: barSections[0], photos: [p[0],  p[2]]  },
      { type: 'photo-text', photos: [p[7], p[10]], positions: ['50% 33%', null], section: barSections[1] },
      { type: 'text-photo', section: barSections[2], photos: [p[13], p[27]] },
      { type: 'photo-text', photos: [p[9], p[20]], section: barSections[3] },
    ];

    function renderSpread(idx, direction) {
      const spreadEl = document.getElementById('bm-spread');
      const spread = bmSpreads[idx];

      // 3D page flip — fold out current, swap, fold in next
      const outClass = direction === 'next' ? 'fold-out-next' : 'fold-out-prev';
      const inClass  = direction === 'next' ? 'fold-in-next'  : 'fold-in-prev';
      spreadEl.classList.add(outClass);

      setTimeout(() => {
        spreadEl.innerHTML = buildSpreadHTML(spread);
        spreadEl.classList.remove(outClass);
        spreadEl.classList.add(inClass);
        spreadEl.addEventListener('animationend', () => spreadEl.classList.remove(inClass), { once: true });
        bindSpreadItems(spreadEl);
        updateNav(idx);
      }, 220);
    }

    function buildTextPage(sec) {
      return `<div class="bm-text-page${sec.special ? ' special' : ''}">
        <div class="bm-text-page-title">${sec.title}</div>
        <div class="bm-text-page-orn">${sec.ornament}</div>
        ${sec.items.map((item, i) => `
          <div class="bm-page-item" data-sec="${sec.title}" data-item="${i}">
            <div class="bm-page-item-header">
              <span class="bm-page-item-name">${item.name}</span>
              ${item.detail ? `<span class="bm-page-item-detail">${item.detail}</span>` : ''}
            </div>
            <div class="bm-page-item-sub">${item.desc}</div>
          </div>`).join('')}
      </div>`;
    }

    function buildSpreadHTML(spread) {
      const im = (url, pos) => `<img src="${url}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover;object-position:${pos||'center'};background:#0a0500;display:block;">`;
      const photoGrid = (photos, positions) => `<div class="bm-ps-photo-grid">${photos.map((u, i) => `<div class="bm-ps-cell">${im(u, positions && positions[i])}</div>`).join('')}</div>`;
      if (spread.type === 'text-photo') {
        return `<div class="bm-ps">${buildTextPage(spread.section)}<div class="bm-ps-gutter"></div>${photoGrid(spread.photos, spread.positions)}</div>`;
      }
      if (spread.type === 'photo-text') {
        return `<div class="bm-ps">${photoGrid(spread.photos, spread.positions)}<div class="bm-ps-gutter"></div>${buildTextPage(spread.section)}</div>`;
      }
      if (spread.type === 'cover') {
        return `<div class="bm-ps-cover bm-leather-cover">
          <div class="bm-ps-cover-overlay">
            <div class="bm-cover-name">Lock Stock<br>Bar &amp; Grill</div>
            <div class="bm-cover-rule"></div>
            <div class="bm-cover-sub">Canandaigua, NY &nbsp;·&nbsp; Est. 2020</div>
            <div class="bm-cover-sub" style="margin-top:4px">Floor &amp; Closing Manager</div>
            <div class="bm-cover-tap" style="margin-top:20px">Open ›</div>
          </div>
        </div>`;
      }
      if (spread.type === 'full') {
        return `<div class="bm-ps-full">
          ${im(spread.photo)}
          ${spread.caption ? `<div class="bm-ps-caption">${spread.caption}</div>` : ''}
        </div>`;
      }
      if (spread.type === 'l1r2') {
        const [p1,p2,p3] = spread.photos;
        return `<div class="bm-ps">
          <div class="bm-ps-half">${im(p1)}</div>
          <div class="bm-ps-gutter"></div>
          <div class="bm-ps-col">
            <div class="bm-ps-photo">${im(p2)}</div>
            <div class="bm-ps-photo">${im(p3)}</div>
          </div>
        </div>`;
      }
      if (spread.type === 'l2r1') {
        const [p1,p2,p3] = spread.photos;
        return `<div class="bm-ps">
          <div class="bm-ps-col">
            <div class="bm-ps-photo">${im(p1)}</div>
            <div class="bm-ps-photo">${im(p2)}</div>
          </div>
          <div class="bm-ps-gutter"></div>
          <div class="bm-ps-half">${im(p3)}</div>
        </div>`;
      }
      if (spread.type === '2x2') {
        const [p1,p2,p3,p4] = spread.photos;
        return `<div class="bm-ps-grid">
          <div class="bm-ps-cell">${im(p1)}</div>
          <div class="bm-ps-cell">${im(p2)}</div>
          <div class="bm-ps-cell">${im(p3)}</div>
          <div class="bm-ps-cell">${im(p4)}</div>
        </div>`;
      }
      if (spread.type === 'back') {
        const [p1,p2] = spread.photos;
        return `<div class="bm-ps">
          <div class="bm-ps-half" style="position:relative;">${im(p1)}
            <div class="bm-ps-caption">Floor &amp; Closing Manager<br><span style="opacity:0.55;letter-spacing:0.12em">2019 – 2023</span></div>
          </div>
          <div class="bm-ps-gutter"></div>
          <div class="bm-ps-half" style="position:relative;">${im(p2)}
            <div class="bm-ps-caption">Lock Stock Bar &amp; Grill<br><span style="opacity:0.55;letter-spacing:0.12em">Canandaigua, NY</span></div>
          </div>
        </div>`;
      }
      return '';
    }

    function bindSpreadItems(spreadEl) {
      const cover = spreadEl.querySelector('.bm-ps-cover');
      if (cover) cover.addEventListener('click', () => {
        if (bmCurrentPage < bmSpreads.length - 1) {
          bmCurrentPage++;
          renderSpread(bmCurrentPage, 'next');
        }
      });
    }

    function updateNav(idx) {
      document.getElementById('bm-prev').disabled = idx === 0;
      document.getElementById('bm-next').disabled = idx === bmSpreads.length - 1;
    }

    document.getElementById('bm-prev').addEventListener('click', () => {
      if (bmCurrentPage > 0) { bmCurrentPage--; renderSpread(bmCurrentPage, 'prev'); }
    });
    document.getElementById('bm-next').addEventListener('click', () => {
      if (bmCurrentPage < bmSpreads.length - 1) { bmCurrentPage++; renderSpread(bmCurrentPage, 'next'); }
    });

    function openBmPopup(item) {
      if (bmPopup) { bmPopup.remove(); bmPopup = null; }
      bmSlideIndex = 0;
      const popup = document.createElement('div');
      popup.className = 'popup bm-popup';
      popup.style.setProperty('--tilt', '0deg');
      popup.style.visibility = 'hidden';
      popup.style.left = '-9999px';
      popup.style.top = '0';
      popup.innerHTML = buildBmPopupHTML(item, 0);
      document.body.appendChild(popup);
      requestAnimationFrame(() => {
        const w = popup.offsetWidth, h = popup.offsetHeight;
        popup.style.left = Math.round((window.innerWidth - w) / 2) + 'px';
        popup.style.top = Math.round((window.innerHeight - h) / 2) + 'px';
        popup.style.visibility = 'visible';
      });
      bindBmPopupBtns(popup, item);
      makeDraggable(popup, popup.querySelector('[data-drag]'));
      bmPopup = popup;
    }

    function buildBmPopupHTML(item, idx) {
      const slide = item.slides[idx];
      const isLast = idx === item.slides.length - 1;
      return `
        <div class="popup-titlebar" data-drag style="background:#0d0a07;border-bottom:1px solid #3a2a15;">
          <div class="popup-title" style="color:#c8a96e;font-family:Georgia,serif;letter-spacing:0.06em;">${item.name}</div>
          <div class="popup-controls">
            <button class="popup-btn bm-close-btn" style="background:#1a1005;border-color:#3a2a15;color:#6a5a3a;">✕</button>
          </div>
        </div>
        <div class="popup-photo" style="background:#0a0805;border-bottom:1px solid #1e160a;">
          <div class="popup-photo-placeholder" style="border-color:rgba(200,169,110,0.15);color:rgba(200,169,110,0.25);font-family:'Segoe UI',sans-serif;">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            Add photo
          </div>
        </div>
        <div class="popup-body" style="background:#110d08;border-top:none;">
          <div class="popup-label" style="color:#5a4a2a;font-family:'Segoe UI',sans-serif;">${slide.label}</div>
          <div class="popup-text" style="color:#c8b88a;font-family:Georgia,serif;line-height:1.7;">${slide.text}</div>
        </div>
        <div class="popup-footer" style="background:#0d0a07;border-top:1px solid #1e160a;">
          <span class="popup-counter" style="color:#3a2a15;font-family:'Segoe UI',sans-serif;">${idx + 1} of ${item.slides.length}</span>
          ${!isLast
            ? `<button class="popup-next-btn bm-next-btn" style="color:#c8a96e;font-family:'Segoe UI',sans-serif;text-decoration:none;border:1px solid #3a2a15;padding:3px 12px;border-radius:3px;background:none;cursor:pointer;">Next →</button>`
            : '<span style="font-size:0.7rem;color:#3a2a15;font-family:\'Segoe UI\',sans-serif;letter-spacing:0.1em;">— fin —</span>'}
        </div>`;
    }

    function bindBmPopupBtns(popup, item) {
      popup.querySelector('.bm-close-btn').addEventListener('click', () => {
        popup.classList.add('closing');
        popup.addEventListener('animationend', () => { popup.remove(); bmPopup = null; }, { once: true });
      });
      const nextBtn = popup.querySelector('.bm-next-btn');
      if (nextBtn) nextBtn.addEventListener('click', () => {
        bmSlideIndex++;
        popup.innerHTML = buildBmPopupHTML(item, bmSlideIndex);
        bindBmPopupBtns(popup, item);
        makeDraggable(popup, popup.querySelector('[data-drag]'));
      });
    }

    document.getElementById('bm-back-btn').addEventListener('click', () => history.back());

    function openBarMenu() {
      bmCurrentPage = 0;
      const spreadEl = document.getElementById('bm-spread');
      spreadEl.innerHTML = buildSpreadHTML(bmSpreads[0]);
      bindSpreadItems(spreadEl);
      updateNav(0);
      barmenuEl.style.display = 'flex';
      requestAnimationFrame(() => barmenuEl.classList.add('visible'));
    }

    function closeBarMenu() {
      if (bmPopup) { bmPopup.remove(); bmPopup = null; }
      barmenuEl.classList.remove('visible');
      setTimeout(() => { barmenuEl.style.display = 'none'; }, 300);
    }

    // --- Client-side routing ---
    const roleToSlug = { marketing: 'kepler', digital: 'nbi', maitre: 'happier', manager: 'lockstock' };
    const slugToRole = { kepler: 'marketing', nbi: 'digital', happier: 'maitre', lockstock: 'manager' };

    function openPage(roleKey) {
      if (roleKey === 'marketing') {
        closeAllKeplerPopups(() => openKeplerSlideSet(0));
      } else if (roleKey === 'digital') {
        openGmail();
      } else if (roleKey === 'maitre') {
        openBook();
      } else if (roleKey === 'manager') {
        openBarMenu();
      }
    }

    function closeCurrent() {
      if (keplerActivePopups.length) { closeAllKeplerPopups(() => overlay.classList.remove('active')); return; }
      if (detail.classList.contains('visible')) {
        detail.classList.remove('visible');
        setTimeout(() => { detail.style.display = 'none'; }, 400);
        return;
      }
      if (gmailEl.classList.contains('visible'))    { closeGmail();    return; }
      if (bookviewEl.classList.contains('visible')) { closeBook();     return; }
      if (barmenuEl.classList.contains('visible'))  { closeBarMenu();  return; }
    }

    function isAnyViewOpen() {
      return keplerActivePopups.length > 0 ||
        detail.classList.contains('visible') ||
        gmailEl.classList.contains('visible') ||
        bookviewEl.classList.contains('visible') ||
        barmenuEl.classList.contains('visible');
    }

    // Tile clicks push URL + open view
    document.querySelectorAll('.tile').forEach(tile => {
      tile.addEventListener('click', () => {
        const roleKey = tile.dataset.role;
        const slug = roleToSlug[roleKey] || roleKey;
        history.pushState({ page: roleKey }, '', '/' + slug);
        openPage(roleKey);
      });
    });

    overlay.addEventListener('click', e => {
      if (e.target === overlay && keplerActivePopups.length) history.back();
    });

    // Escape → back only when a view is open
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && isAnyViewOpen()) history.back();
    });

    // Back button → close current view
    window.addEventListener('popstate', () => closeCurrent());

    // Set base history state
    history.replaceState({ page: 'home' }, '', window.location.pathname || '/');

    // Direct URL load (e.g. luciuscampany.com/nbi)
    const initSlug = window.location.pathname.replace(/^\//, '').toLowerCase();
    if (initSlug && slugToRole[initSlug]) openPage(slugToRole[initSlug]);

    // Scroll hint: hide once user scrolls past the grid
    const scrollHint = document.getElementById('scroll-hint');
    window.addEventListener('scroll', () => {
      scrollHint.classList.toggle('hidden', window.scrollY > 60);
    }, { passive: true });
