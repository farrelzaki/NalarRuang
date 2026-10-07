/* @ds-bundle: {"format":4,"namespace":"NalarRuang","components":[{"name":"Ikon"},{"name":"Bintang"},{"name":"SearchBar"},{"name":"PanelTop3"},{"name":"PointInspector"},{"name":"BarisSkorPersona"},{"name":"BadgeProfil"},{"name":"KartuKesimpulan"},{"name":"SimulatorRute"},{"name":"PanelLayer"},{"name":"KartuLayer"},{"name":"Toggle"},{"name":"PanelProfilPersona"},{"name":"TombolMerek"},{"name":"TombolLayerPersona"},{"name":"SliderTahun"},{"name":"DrawerMenu"},{"name":"KartuCheckboxPersona"},{"name":"DialogPersona"},{"name":"PopupPeta"},{"name":"LabelPeta"},{"name":"KontrolZoom"},{"name":"SimbolPeta"},{"name":"CuplikanPeta"},{"name":"StateKosongMuatGalat"},{"name":"Toast"},{"name":"HeroLanding"},{"name":"JudulSeksi"},{"name":"KolomFitur"},{"name":"VisiKami"},{"name":"MisiKami"},{"name":"KartuFotoPersona"},{"name":"KartuFitur"},{"name":"TileLayer"},{"name":"StripSumberData"},{"name":"KartuLangkah"},{"name":"CobaSekarang"},{"name":"AccordionFAQ"},{"name":"BandCTA"}]} */
(function () {
  "use strict";
  var React = window.React;
  var h = React.createElement;
  var useState = React.useState;

  function cx() {
    var out = [];
    for (var i = 0; i < arguments.length; i++) if (arguments[i]) out.push(arguments[i]);
    return out.join(" ");
  }

  /* ---------- Data bersama ---------- */
  var PERSONA = {
    commuter: { label: "Commuter", icon: "tram-front", no: "01", tag: "Akses transit paling utama", desc: "Mengutamakan akses transit, seperti stasiun dan halte." },
    driver: { label: "Driver", icon: "car", no: "02", tag: "Jalan lancar, tol dekat", desc: "Mengutamakan akses jalan utama dan gerbang tol." },
    social: { label: "Social & Vibe", icon: "coffee", no: "03", tag: "Dekat seru-serunya kota", desc: "Mengutamakan hiburan, kafe, dan restoran." },
    zen: { label: "Zen", icon: "leaf", no: "04", tag: "Tenang, hijau, lega", desc: "Mengutamakan keamanan, minim polusi, dan ruang terbuka hijau." }
  };
  var PKEYS = ["commuter", "driver", "social", "zen"];
  var FRASA = ["Belum mendukung aktivitasmu, pertimbangkan lokasi lain.", "Mungkin kurang optimal, pertimbangkan lokasi lain.", "Cukup mendukung aktivitasmu.", "Sangat mendukung aktivitasmu!"];
  var LAYERS = [
    { key: "historis", title: "Historis & Risiko", desc: "Area rawan banjir dan risiko bencana lain.",
      legend: [["banjir", "Area rawan banjir (merah). Mengindikasikan area historis genangan air."]] },
    { key: "ekosistem", title: "Ekosistem Mikro", desc: "Kafe, restoran, ritel, dan ruang hijau.",
      legend: [["hijau", "Ruang terbuka hijau, taman, dan fasilitas gaya hidup."]] },
    { key: "inklusivitas", title: "Inklusivitas", desc: "Aksesibilitas pedestrian dan fasilitas umum.",
      legend: [["trotoar", "Trotoar dan akses pedestrian layak."], ["akses", "Titik akses ramah disabilitas."]] },
    { key: "mobilitas", title: "Mobilitas & Transit", desc: "Halte, stasiun KRL/MRT, dan jalur arteri.", grid: true,
      legend: [["mrt", "Jalur MRT (oranye)."], ["krl-bogor", "KRL Merah (Bogor)."], ["krl-rangkas", "KRL Hijau (Rangkas)."], ["krl-cikarang", "KRL Biru (Cikarang)."], ["lrt", "Jalur LRT (ungu)."], ["stasiun", "Stasiun transit."]] },
    { key: "waktu", title: "Mesin Waktu", desc: "Proyek infrastruktur dan tata ruang masa depan.",
      legend: [["waktu", "Proyek transportasi/LRT masa depan yang sedang dibangun."]] },
    { key: "legalitas", title: "Legalitas Lahan", desc: "Gambaran status kepemilikan dan peruntukan.",
      legend: [["legal", "Pemetaan bidang tanah dan zona legal (ungu muda)."]] }
  ];
  function layerByKey(k) { for (var i = 0; i < LAYERS.length; i++) if (LAYERS[i].key === k) return LAYERS[i]; return LAYERS[0]; }
  var SUMBER = ["InaRISK (BNPB)", "DEMNAS (BIG)", "IQAir", "BPS", "Overpass API (OSM)", "GTFS Transjakarta", "Jakarta Satu Data", "ATR/BPN", "JUTPI Phase 3"];

  /* ---------- Dasar ---------- */
  function Ikon(p) {
    var node = ICONS[p.name];
    if (!node) return null;
    var size = p.size || 16;
    return h("svg", {
      className: cx("nr-svg", p.className), width: size, height: size, viewBox: "0 0 24 24",
      fill: p.fill || "none", stroke: p.color || "currentColor", strokeWidth: p.strokeWidth || 2,
      strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": p.label ? undefined : "true",
      role: p.label ? "img" : undefined, "aria-label": p.label, style: p.style
    }, node.map(function (el, i) {
      var a = {}; for (var k in el[1]) a[k] = el[1][k];
      a.key = i; return h(el[0], a);
    }));
  }

  function Wordmark(p) {
    return h("span", { className: "nr-wordmark", style: p && p.size ? { fontSize: p.size } : undefined }, "Nalar", h("i", null, "Ruang"));
  }

  function Bintang(p) {
    var score = Math.max(0, Math.min(3, p.score || 0));
    var on = p.muted ? "var(--star-muted)" : "var(--star-on)";
    var stars = [];
    for (var i = 0; i < 3; i++) {
      var filled = i < score;
      stars.push(h(Ikon, { key: i, name: "star", size: 16, strokeWidth: 2, color: filled ? on : "var(--slate-200)", fill: filled ? on : "none" }));
    }
    return h("span", { className: "nr-stars", "aria-hidden": "true" },
      score === 0 && p.showZero !== false ? h("span", { className: "nr-stars__zero" }, "0 dari 3") : null, stars);
  }

  /* Simbol legenda 16 px */
  function SimbolPeta(p) {
    var k = p.kind;
    var s = p.size || 16;
    var body;
    function dash(color, d) { return h("line", { x1: 1, x2: 15, y1: 8, y2: 8, style: { stroke: color, strokeWidth: 3, strokeDasharray: d || "4 2.5" } }); }
    function bar(color) { return h("rect", { x: 0, y: 6, width: 16, height: 4, rx: 2, style: { fill: color } }); }
    if (k === "banjir") body = h("rect", { x: 1.5, y: 2.5, width: 13, height: 11, rx: 2, style: { fill: "var(--map-banjir)", fillOpacity: 0.3, stroke: "var(--map-banjir)", strokeWidth: 1.5 } });
    else if (k === "legal") body = h("rect", { x: 1.5, y: 2.5, width: 13, height: 11, rx: 2, style: { fill: "var(--map-legal)", fillOpacity: 0.2, stroke: "var(--map-legal)", strokeWidth: 1.5, strokeOpacity: 0.8 } });
    else if (k === "rth") body = h("rect", { x: 1.5, y: 2.5, width: 13, height: 11, rx: 2, style: { fill: "var(--map-hijau)", fillOpacity: 0.25, stroke: "var(--map-hijau)", strokeWidth: 1.5 } });
    else if (k === "hijau") body = h("circle", { cx: 8, cy: 8, r: 6, style: { fill: "var(--map-hijau)", fillOpacity: 0.8, stroke: "var(--white)", strokeWidth: 2 } });
    else if (k === "akses") body = h("circle", { cx: 8, cy: 8, r: 6, style: { fill: "var(--map-akses)", stroke: "var(--white)", strokeWidth: 2 } });
    else if (k === "halte") body = h("circle", { cx: 8, cy: 8, r: 3.5, style: { fill: "var(--navy-900)", stroke: "var(--white)", strokeWidth: 1.5 } });
    else if (k === "trotoar") body = dash("var(--map-akses)", "3 2.5");
    else if (k === "mrt") body = bar("var(--map-mrt)");
    else if (k === "lrt") body = bar("var(--map-lrt)");
    else if (k === "krl-bogor") body = dash("var(--map-krl-bogor)");
    else if (k === "krl-rangkas") body = dash("var(--map-krl-rangkas)");
    else if (k === "krl-cikarang") body = dash("var(--map-krl-cikarang)");
    else if (k === "krl-lain") body = dash("var(--map-krl-lain)");
    else if (k === "waktu") body = dash("var(--map-waktu)", "4 3");
    else if (k === "stasiun") body = h("circle", { cx: 8, cy: 8, r: 5, style: { fill: "var(--map-stasiun)", stroke: "var(--navy-900)", strokeWidth: 2 } });
    else if (k === "rute") body = h("g", null, h("line", { x1: 1, x2: 15, y1: 8, y2: 8, style: { stroke: "var(--navy-900)", strokeWidth: 4, strokeLinecap: "round" } }), h("path", { d: "M6.5 5.5 9 8 6.5 10.5", style: { fill: "none", stroke: "var(--white)", strokeWidth: 1.4, strokeLinecap: "round", strokeLinejoin: "round" } }));
    else if (k === "jalan-kaki") body = h("line", { x1: 2, x2: 15, y1: 8, y2: 8, style: { stroke: "var(--navy-900)", strokeWidth: 3, strokeDasharray: "0.1 5", strokeLinecap: "round" } });
    else if (k === "terpilih") body = h("rect", { x: 1.5, y: 2.5, width: 13, height: 11, rx: 2, style: { fill: "var(--navy-900)", fillOpacity: 0.08, stroke: "var(--navy-900)", strokeWidth: 2 } });
    if (!body) {
      var all = ["banjir", "hijau", "rth", "akses", "trotoar", "mrt", "lrt", "krl-bogor", "krl-rangkas", "krl-cikarang", "krl-lain", "stasiun", "halte", "waktu", "legal", "rute", "jalan-kaki", "terpilih"];
      return h("div", { style: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "10px 20px" } }, all.map(function (a) {
        return h("span", { key: a, className: "nr-legend", style: { alignItems: "center" } }, h(SimbolPeta, { kind: a }), a);
      }));
    }
    return h("svg", { className: "nr-svg", width: s, height: s, viewBox: "0 0 16 16", "aria-hidden": "true" }, body);
  }

  /* ---------- Pencarian ---------- */
  function SearchBar(p) {
    return h("div", { className: "nr-search nr-float", role: "search" },
      h(Ikon, { name: p.loading ? "loader-circle" : "search", size: 16, className: p.loading ? "nr-spin" : undefined }),
      h("input", { className: "nr-search__input", placeholder: "Telusuri kawasan atau alamat...", defaultValue: p.value, "aria-label": "Cari kawasan hunian", role: "combobox", "aria-expanded": !!p.expanded, "aria-autocomplete": "list" }),
      h("span", { className: "nr-search__tools" },
        p.focused || p.filter ? h("button", { className: "nr-search__btn", "aria-pressed": !!p.filter, "aria-label": "Pilih kota dan persona", title: "Pilih kota dan persona" }, h(Ikon, { name: "sliders-horizontal", size: 16 })) : null,
        h("button", { className: "nr-search__btn", "aria-pressed": !!p.commute, "aria-label": "Beralih ke Commute Simulator", title: "Commute Simulator", onClick: p.onToggleCommute }, h(Ikon, { name: "car", size: 16 }))));
  }

  function StateKosongMuatGalat(p) {
    if (p.kind === "memuat") {
      return h("div", { className: "nr-state", "aria-busy": "true", "aria-label": p.title || "Memuat", style: { flexDirection: "column", gap: 10 } },
        h("span", { className: "nr-skeleton", style: { width: "40%" } }), h("span", { className: "nr-skeleton", style: { width: "85%" } }), h("span", { className: "nr-skeleton", style: { width: "70%" } }));
    }
    var map = { kosong: ["search-x", "var(--ink-60)"], peringatan: ["triangle-alert", "var(--amber-600)"], galat: ["circle-alert", "var(--red-600)"] };
    var m = map[p.kind] || map.kosong;
    return h("div", { className: "nr-state", role: p.kind === "galat" ? "alert" : "status" },
      h("span", { className: "nr-state__icon", style: { color: m[1] } }, h(Ikon, { name: m[0], size: 16 })),
      h("div", null, h("p", { className: "nr-state__title" }, p.title), h("p", { className: "nr-state__text" }, p.text),
        p.action ? h("button", { className: "nr-linkcaps nr-state__action" }, p.action) : null));
  }

  function PanelTop3(p) {
    var mode = p.mode || "hasil";
    var persona = p.persona || "Commuter";
    if (mode === "filter") {
      var cities = ["Jakarta", "Bogor", "Depok", "Tangerang", "Bekasi"];
      var chosen = p.cities || ["Bogor"];
      var sel = p.selected || ["commuter"];
      return h("section", { className: "nr-top3 nr-float", "aria-label": "Pilih kota dan persona" },
        h("div", { className: "nr-top3__head" }, h("span", { className: "nr-label" }, "Pilih Kota dan Persona"), h("span", { className: "nr-desc" }, "Centang kota dan persona, lalu cari.")),
        h("div", { className: "nr-filter" },
          h("div", { className: "nr-filter__cities", role: "group", "aria-label": "Kota" }, cities.map(function (c) {
            return h("button", { key: c, className: "nr-chipbtn", "aria-pressed": chosen.indexOf(c) >= 0 }, c);
          })),
          h("div", { role: "group", "aria-label": "Persona", style: { display: "flex", flexDirection: "column", gap: 4 } }, PKEYS.map(function (k) {
            var on = sel.indexOf(k) >= 0;
            return h("button", { key: k, className: "nr-popt nr-popt--sm", role: "checkbox", "aria-checked": on },
              PERSONA[k].label, h("span", { className: "nr-cbox" }, on ? h(Ikon, { name: "check", size: 12, strokeWidth: 3 }) : null));
          })),
          h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" } },
            h("button", { className: "nr-linkcaps" }, "Pakai persona sesi"),
            h("button", { className: "nr-btn" }, "Cari"))));
    }
    var body;
    if (mode === "kosong") body = h(StateKosongMuatGalat, { kind: "kosong", title: "Belum ada kawasan yang cocok", text: "Coba longgarkan kata kunci atau pilih kota lain." });
    else if (mode === "memuat") body = h(StateKosongMuatGalat, { kind: "memuat", title: "Mencari kawasan" });
    else body = (p.results || []).slice(0, 3).map(function (r, i) {
      return h("button", { key: i, className: "nr-top3__item", role: "option", "aria-selected": p.active === i, "aria-label": "Peringkat " + (i + 1) + " dari 3, " + r.name + ", " + r.match + " persen cocok" },
        h("span", { className: "nr-top3__num" }, i + 1),
        h("span", { className: "nr-top3__text" }, h("span", { className: "nr-top3__name" }, r.name), h("span", { className: "nr-top3__type" }, r.type)),
        h("span", { className: "nr-top3__match" }, h("span", { className: cx("nr-top3__pct", r.match < 50 && "nr-top3__pct--low") }, r.match + "%"), h("span", { className: "nr-top3__lbl" }, "Match")));
    });
    return h("section", { className: "nr-top3 nr-float", "aria-label": "Top 3 rekomendasi", style: p.style },
      h("div", { className: "nr-top3__head" }, h("span", { className: "nr-label" }, "Top 3 Rekomendasi"), h("span", { className: "nr-desc" }, "Kawasan ideal berdasarkan profil " + persona + ".")),
      h("div", { className: "nr-top3__list", role: mode === "hasil" ? "listbox" : undefined }, body));
  }

  /* ---------- Detail Lokasi ---------- */
  function BadgeProfil() {
    return h("span", { className: "nr-badge", "aria-hidden": "true" }, "Profil Anda");
  }

  function BarisSkorPersona(p) {
    var info = PERSONA[p.persona] || PERSONA.commuter;
    var area = p.match !== undefined && p.match !== null;
    var label = info.label + ", " + (p.incomplete ? "data kurang" : area ? (p.match ? "cocok" : "belum cocok") : (p.score || 0) + " dari 3 bintang") + (p.session ? ", profil anda" : "");
    return h("div", { className: cx("nr-persona-row", p.session && "nr-persona-row--session"), role: "listitem", "aria-label": label },
      h("span", { className: "nr-persona-row__icon" }, h(Ikon, { name: info.icon, size: 18, strokeWidth: 2 })),
      h("span", { className: "nr-persona-row__name" }, info.label),
      p.session ? h(BadgeProfil) : null,
      p.incomplete ? h("span", { className: "nr-stars__na" }, "Data kurang")
        : area ? h("span", { className: cx("nr-match", !p.match && "nr-match--no", !p.session && "nr-match--muted"), "aria-hidden": "true" },
          h("span", { className: "nr-match__dot" }, h(Ikon, { name: p.match ? "check" : "minus", size: 12, strokeWidth: 3 })), p.match ? "Cocok" : "Belum cocok")
        : h(Bintang, { score: p.score, muted: !p.session }));
  }

  function KartuKesimpulan(p) {
    var items = p.items || [];
    return h("div", { className: "nr-summary" },
      h("div", { className: "nr-summary__label" }, "Kesimpulan Singkat"),
      items.map(function (it, i) {
        var info = PERSONA[it.persona] || PERSONA.commuter;
        if (it.match !== undefined && it.match !== null) return h("p", { key: i, className: "nr-summary__text" }, (it.match ? "Cocok" : "Belum cocok") + " untuk gaya hidup " + info.label + ".");
        return h("p", { key: i, className: "nr-summary__text" }, "Buat gaya hidup " + info.label + ": " + FRASA[Math.max(0, Math.min(3, it.score || 0))]);
      }),
      p.incomplete ? h("p", { className: "nr-summary__note" }, "Sebagian data di lokasi ini belum lengkap, jadi skornya bisa berubah.") : null);
  }

  function PointInspector(p) {
    var session = p.session || ["commuter"];
    var scores = p.scores || { commuter: 0, driver: 0, social: 0, zen: 0 };
    var kind = p.kind === "titik" ? "Titik Terpilih" : "Area Terpilih";
    var matches = p.kind !== "titik" ? p.matches : null;
    return h("aside", { className: "nr-inspector nr-float", "aria-labelledby": "nr-inspector-name", style: p.style },
      h("div", { className: "nr-inspector__head" },
        h("h2", { className: "nr-inspector__title" }, "Detail Lokasi"),
        h("button", { className: "nr-iconbtn", "aria-label": "Tutup detail lokasi", onClick: p.onClose, style: { color: "var(--navy-900)" } }, h(Ikon, { name: "x", size: 18, strokeWidth: 2 }))),
      h("div", { className: "nr-inspector__place" },
        h("span", { className: "nr-inspector__pin" }, h(Ikon, { name: "map-pin", size: 22, strokeWidth: 2 })),
        h("div", null,
          h("div", { className: "nr-eyebrow" }, kind, p.nonResidential ? " · bukan kawasan hunian" : ""),
          h("h3", { className: "nr-inspector__name", id: "nr-inspector-name" }, p.name || "Bojong Baru"),
          h("div", { className: "nr-inspector__addr" }, p.address || "Bojong Gede, Kabupaten Bogor"))),
      p.nonResidential ? h("p", { className: "nr-inspector__note" }, "Titik ini bukan kawasan hunian. Skor tetap dihitung dari jarak ke fasilitas.") : null,
      h("div", { className: "nr-inspector__section", role: "list", "aria-label": "Kecocokan gaya hidup" },
        h("h4", { className: "nr-inspector__subtitle" }, "Kecocokan Gaya Hidup"),
        PKEYS.map(function (k) {
          return h(BarisSkorPersona, { key: k, persona: k, score: scores[k], match: matches ? !!matches[k] : undefined, session: session.indexOf(k) >= 0, incomplete: p.incomplete && (matches ? matches[k] == null : scores[k] == null) });
        })),
      p.layers && p.layers.length ? h("div", { className: "nr-layer-summary", "aria-label": "Data layer di lokasi ini" },
        p.layers.map(function (l, i) { return h("span", { key: i, className: "nr-legend" }, h(SimbolPeta, { kind: l.kind }), l.text); })) : null,
      h(KartuKesimpulan, { items: session.map(function (k) { return matches ? { persona: k, match: !!matches[k] } : { persona: k, score: scores[k] }; }), incomplete: p.incomplete }));
  }

  /* ---------- Simulator Rute ---------- */
  function SimulatorRute(p) {
    var state = p.state || "isi";
    var empty = state === "kosong";
    var modes = p.modes || { mobil: { time: 12, cost: "Rp 34.033" }, transit: { time: 38, cost: "Rp 6.000", detail: "Jalan 6 mnt · KRL Bogor 26 mnt · Jalan 6 mnt" } };
    var selected = p.selected || "mobil";
    function row(letter, value, placeholder) {
      return h("div", { className: "nr-route__row" },
        h("span", { className: cx("nr-route__dot", letter === "A" && "nr-route__dot--a"), "aria-hidden": "true" }, letter),
        h("label", { className: "nr-route__field" },
          h("span", { className: "nr-sr" }, letter === "A" ? "Titik asal" : "Titik tujuan"),
          h("input", { className: "nr-route__input", defaultValue: value, placeholder: placeholder }),
          value ? null : h("button", { className: "nr-linkcaps", type: "button" }, "Pilih di peta")));
    }
    function mode(key, icon, label) {
      var m = modes[key] || {};
      var na = state === "tidak-tersedia" && key === "transit";
      return h("button", { className: "nr-mode", "aria-pressed": !empty && selected === key, disabled: empty, "aria-label": label + (empty ? "" : na ? ", tidak tersedia" : ", " + m.time + " menit, " + m.cost) },
        h("span", { className: "nr-mode__label" }, h(Ikon, { name: icon, size: 12, strokeWidth: 2 }), label),
        empty ? h("span", { className: "nr-mode__time", style: { color: "var(--ink-40)" } }, "—")
          : na ? h(React.Fragment, null, h("span", { className: "nr-mode__na" }, "Tidak tersedia"), h("span", { className: "nr-mode__cost" }, "Coba titik yang lebih dekat ke jalan"))
          : h(React.Fragment, null,
            h("span", null, h("span", { className: "nr-mode__time" }, m.time), h("span", { className: "nr-mode__unit" }, "mnt")),
            h("span", { className: "nr-mode__cost" }, m.cost)));
    }
    var detail = !empty && selected === "transit" && modes.transit && modes.transit.detail && state !== "tidak-tersedia" ? modes.transit.detail + ". " : "";
    return h("section", { className: "nr-route nr-float", "aria-label": "Simulator Rute", style: p.style },
      h("div", { className: "nr-route__head" },
        h("span", { className: "nr-label" }, "Simulator Rute"),
        !empty && p.distance ? h("span", { className: "nr-route__dist" }, p.distance) : null,
        !empty ? h("button", { className: "nr-iconbtn", "aria-label": "Reset rute", title: "Reset" }, h(Ikon, { name: "rotate-ccw", size: 14, strokeWidth: 2 })) : null,
        h("button", { className: "nr-iconbtn", "aria-label": "Tutup Simulator Rute", onClick: p.onClose }, h(Ikon, { name: "x", size: 14, strokeWidth: 2 }))),
      h("div", { className: "nr-route__points" },
        row("A", empty ? "" : p.from || "Jalan Alternatif GOR Pemda, Pakansari", "Ketik alamat atau pilih di peta"),
        row("B", empty ? "" : p.to || "Bogor Tengah, Bogor", "Ketik alamat atau pilih di peta")),
      h("div", { className: "nr-route__modes", role: "group", "aria-label": "Moda" }, mode("mobil", "car", "Mobil"), mode("transit", "tram-front", "Transit")),
      empty ? null : h("p", { className: "nr-route__foot" }, detail + "Estimasi tanpa lalu lintas real-time."));
  }

  /* ---------- Layer ---------- */
  function Toggle(p) {
    return h("button", { className: "nr-toggle", role: "switch", "aria-checked": !!p.checked, "aria-label": p.label, disabled: p.disabled, onClick: p.onChange });
  }

  function KartuLayer(p) {
    var l = layerByKey(p.layer);
    var st = useState(!!p.active); var on = st[0], setOn = st[1];
    var active = on && p.status !== "error";
    return h("div", { className: cx("nr-layer", active && "nr-layer--active") },
      h("div", { className: "nr-layer__top" },
        h("span", { className: "nr-layer__title" }, l.title),
        p.status === "loading" ? h(Ikon, { name: "loader-circle", size: 16, className: "nr-spin", label: "Memuat layer" })
          : h(Toggle, { checked: active, label: l.title, disabled: p.status === "error", onChange: function () { setOn(!on); } })),
      p.status === "error" ? h("span", null, h("span", { className: "nr-layer__error" }, "Layer gagal dimuat."), h("button", { className: "nr-linkcaps" }, "Coba lagi"))
        : active ? h("div", { className: cx("nr-layer__legend", l.grid && "nr-layer__legend--grid") },
          l.legend.map(function (g) { return h("span", { key: g[0], className: "nr-legend" }, h(SimbolPeta, { kind: g[0] }), g[1]); }))
        : h("span", { className: "nr-layer__desc" }, l.desc));
  }

  function PanelKanan(p) {
    return h("section", { className: cx("nr-rpanel", p.className), "aria-label": p.title, style: p.style },
      h("div", { className: "nr-panelhead" }, h("span", { className: "nr-label" }, p.title),
        h("button", { className: "nr-iconbtn", "aria-label": "Tutup " + p.title.toLowerCase(), onClick: p.onClose }, h(Ikon, { name: "x", size: 14, strokeWidth: 2 }))),
      h("div", { className: "nr-rpanel__body" }, p.children));
  }

  function PanelLayer(p) {
    var active = p.active || {};
    return h(PanelKanan, { title: "Layer Spasial", style: p.style, onClose: p.onClose },
      LAYERS.map(function (l) { return h(KartuLayer, { key: l.key, layer: l.key, active: active[l.key], status: (p.status || {})[l.key] }); }));
  }

  function PanelProfilPersona(p) {
    var st = useState(p.selected || ["commuter"]); var sel = st[0], setSel = st[1];
    var tw = useState(false); var warn = tw[0], setWarn = tw[1];
    function flip(k) {
      var i = sel.indexOf(k);
      if (i >= 0 && sel.length === 1) { setWarn(true); return; }
      setWarn(false);
      setSel(i >= 0 ? sel.filter(function (x) { return x !== k; }) : sel.concat([k]));
    }
    return h("div", { style: { display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-end" } },
      h(PanelKanan, { title: "Profil Persona", className: "nr-rpanel--persona", style: p.style, onClose: p.onClose },
        PKEYS.map(function (k) {
          var on = sel.indexOf(k) >= 0;
          return h("button", { key: k, className: "nr-popt", role: "checkbox", "aria-checked": on, onClick: function () { flip(k); } },
            PERSONA[k].label, h("span", { className: "nr-cbox" }, on ? h(Ikon, { name: "check", size: 12, strokeWidth: 3 }) : null));
        })),
      warn ? h(Toast, { tone: "warning" }, "Pilih minimal satu persona dulu, ya.") : null);
  }

  /* ---------- Kontrol di atas peta ---------- */
  function TombolMerek(p) {
    return h("button", { className: "nr-brandbtn", "aria-label": "Buka menu NalarRuang", "aria-expanded": !!p.expanded, onClick: p.onClick },
      h(Wordmark), h(Ikon, { name: "menu", size: 16, strokeWidth: 2, color: "var(--ink-40)" }));
  }

  function TombolLayerPersona(p) {
    var st = useState(p.open === undefined ? "layer" : p.open); var open = st[0], setOpen = st[1];
    function btn(key, icon, label) {
      return h("button", { className: "nr-capsbtn", "aria-expanded": open === key, onClick: function () { setOpen(open === key ? null : key); } },
        h(Ikon, { name: icon, size: 16, strokeWidth: 2 }), label);
    }
    return h("div", { className: "nr-capsgroup" }, btn("layer", "map", "Layer"), btn("persona", "users", "Persona"));
  }

  function SliderTahun(p) {
    var min = 2026, max = 2030;
    var st = useState(p.year || 2026); var year = st[0], setYear = st[1];
    var pct = (year - min) / (max - min) * 100;
    var ticks = []; for (var y = min; y <= max; y++) ticks.push(h("span", { key: y, className: "nr-slider__tick", style: { left: ((y - min) / (max - min) * 100) + "%" } }));
    return h("div", { className: "nr-slider", style: p.style },
      h("div", { className: "nr-slider__row" },
        h("span", { className: "nr-slider__min" }, min),
        h("span", { className: "nr-slider__track" },
          h("span", { className: "nr-slider__rail" }), h("span", { className: "nr-slider__fill", style: { width: pct + "%" } }), ticks,
          h("span", { className: "nr-slider__knob", style: { left: pct + "%" } }),
          h("input", { type: "range", min: min, max: max, step: 1, value: year, onChange: function (e) { setYear(+e.target.value); }, "aria-label": "Tahun proyek infrastruktur", "aria-valuetext": "Tahun " + year })),
        h("span", { className: "nr-slider__value" }, year)),
      p.empty ? h("p", { className: "nr-slider__empty" }, "Belum ada proyek di tahun ini.") : null);
  }

  function LabelPeta(p) { return h("span", { className: "nr-maplabel" }, p.children); }

  function PopupPeta(p) {
    return h("div", { className: "nr-popup", role: "dialog", "aria-label": p.title },
      h("div", { className: "nr-popup__top" },
        h("div", null, h("div", { className: "nr-eyebrow" }, p.kind || "Stasiun"), h("h3", { className: "nr-popup__title" }, p.title)),
        h("button", { className: "nr-iconbtn", "aria-label": "Tutup", style: { alignSelf: "flex-start" } }, h(Ikon, { name: "x", size: 14, strokeWidth: 2 }))),
      h("p", { className: "nr-popup__body" }, p.body),
      h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 } },
        h("span", { className: "nr-popup__src" }, p.source || "Sumber: OSM"),
        h("button", { className: "nr-linkcaps" }, "Lihat detail", h(Ikon, { name: "arrow-right", size: 12, strokeWidth: 2.5 }))));
  }

  function KontrolZoom(p) {
    return h("div", { style: { display: "inline-flex", flexDirection: "column", alignItems: "flex-end", gap: 10 } },
      h("div", { className: "nr-zoom" }, h("button", { "aria-label": "Perbesar peta" }, "+"), h("button", { "aria-label": "Perkecil peta" }, "−")),
      p.attribution === false ? null : h("span", { className: "nr-attrib" }, h("a", { href: "#" }, "Leaflet"), " | © ", h("a", { href: "#" }, "OpenStreetMap"), " contributors"));
  }

  /* ---------- Menu & onboarding ---------- */
  function KartuCheckboxPersona(p) {
    var info = PERSONA[p.persona] || PERSONA.commuter;
    var on = !!p.checked;
    return h("button", { className: "nr-pcard", role: "checkbox", "aria-checked": on, onClick: p.onChange },
      h("span", { className: "nr-pcard__box" }, h(Ikon, { name: on ? "check" : info.icon, size: 14, strokeWidth: on ? 3 : 2 })),
      h("span", null, h("span", { className: "nr-pcard__name" }, info.label), h("span", { className: "nr-pcard__desc" }, info.desc)));
  }

  function IsiLegenda() {
    var rows = [
      ["Historis & Risiko", ["banjir"], "Area rawan banjir historis (merah)."],
      ["Ekosistem Mikro", ["hijau"], "Ruang hijau, taman & fasilitas gaya hidup (hijau)."],
      ["Legalitas Lahan", ["legal"], "Pemetaan zona bidang tanah legal (ungu)."],
      ["Mobilitas & Transit", ["mrt", "krl-bogor", "krl-rangkas", "lrt", "stasiun", "waktu"], null],
      ["Inklusivitas", ["trotoar", "akses"], "Trotoar layak (biru putus-putus) & titik akses disabilitas (biru)."]
    ];
    return h(React.Fragment, null,
      h("h3", { className: "nr-drawer__heading" }, "Legenda Peta"),
      h("p", { className: "nr-drawer__text" }, "Panduan membaca simbol dan warna pada Visual Explorer."),
      rows.map(function (r) {
        return h("div", { key: r[0], className: "nr-lgrow" },
          h("span", { className: "nr-lgrow__syms" }, r[1].map(function (k) { return h(SimbolPeta, { key: k, kind: k }); })),
          h("span", null, h("span", { className: "nr-lgrow__title" }, r[0]),
            r[2] ? h("span", { className: "nr-lgrow__text" }, r[2])
              : h(React.Fragment, null,
                h("span", { className: "nr-lgrow__text" }, "MRT (oranye solid) · KRL Merah · KRL Hijau · LRT (ungu solid) · Stasiun (titik putih)."),
                h("span", { className: "nr-lgrow__text", style: { marginTop: 4 } }, "Garis putus-putus ungu = ", h("b", null, "Mesin Waktu"), " (proyek 2026–2030)."))));
      }));
  }

  function Istilah(p) {
    return h("div", { className: "nr-term" }, h("p", { className: "nr-term__title" }, p.title), h("p", { className: "nr-term__text" }, p.children));
  }

  function IsiTentang() {
    return h(React.Fragment, null,
      h("h3", { className: "nr-drawer__heading" }, "Tentang NalarRuang 2.0"),
      h("p", { className: "nr-drawer__text", style: { color: "var(--ink-55)" } }, "Platform analitik spasial untuk membantu keputusan memilih tempat tinggal di kawasan Jabodetabek berdasarkan data terbuka."),
      h(Istilah, { title: "Isochrone" }, "Area yang bisa dijangkau dalam batas waktu tertentu dari satu titik."),
      h(Istilah, { title: "Point Inspector" }, "Panel evaluasi kawasan (0–3 Bintang) yang muncul saat klik peta."),
      h(Istilah, { title: "Commute Simulator" }, "Kalkulator waktu & biaya estimasi kendaraan pribadi vs transportasi umum."),
      h(Istilah, { title: "Persona Grading" }, "3★ Sangat Cocok · 2★ Cukup · 1★ Kurang Cocok."),
      h(Istilah, { title: "Sumber data" }, SUMBER.join(" · ") + ". Peta dasar © OpenStreetMap contributors."),
      h(Istilah, { title: "Catatan" }, "Skor dan rekomendasi merupakan estimasi dari data sekunder publik, bukan penilaian resmi. Dibuat oleh Kelompok 4 — Developer Rumah, IPB University."));
  }

  function DrawerMenu(p) {
    var ts = useState(p.tab || "persona"); var tab = ts[0], setTab = ts[1];
    var ss = useState(p.selected || ["commuter"]); var sel = ss[0], setSel = ss[1];
    var tabs = [["persona", "Persona", "users"], ["legenda", "Legenda", "map"], ["tentang", "Tentang", "info"]];
    function flip(k) {
      var i = sel.indexOf(k);
      if (i >= 0 && sel.length === 1) return;
      setSel(i >= 0 ? sel.filter(function (x) { return x !== k; }) : sel.concat([k]));
    }
    return h("div", { className: "nr-drawer", role: "dialog", "aria-modal": "true", "aria-label": "Menu", style: p.style },
      h("div", { className: "nr-drawer__head" }, h(Wordmark), h("button", { className: "nr-drawer__close", "aria-label": "Tutup menu" }, h(Ikon, { name: "x", size: 15, strokeWidth: 2 }))),
      h("div", { className: "nr-tabs", role: "tablist" }, tabs.map(function (t) {
        return h("button", { key: t[0], className: "nr-tab", role: "tab", "aria-selected": tab === t[0], onClick: function () { setTab(t[0]); } }, h(Ikon, { name: t[2], size: 12, strokeWidth: 2 }), t[1]);
      })),
      h("div", { className: "nr-drawer__body", role: "tabpanel" },
        tab === "persona" ? h(React.Fragment, null,
          h("h3", { className: "nr-drawer__heading" }, "Ubah Preferensi Persona"),
          h("p", { className: "nr-drawer__text" }, "Pilih persona yang mewakili keseharianmu. Ini akan mengubah rekomendasi di peta secara instan."),
          h("div", { style: { display: "flex", flexDirection: "column", gap: 12 } }, PKEYS.map(function (k) {
            return h(KartuCheckboxPersona, { key: k, persona: k, checked: sel.indexOf(k) >= 0, onChange: function () { flip(k); } });
          })))
          : tab === "legenda" ? h(IsiLegenda) : h(IsiTentang)));
  }

  function DialogPersona(p) {
    var ss = useState(p.selected || []); var sel = ss[0], setSel = ss[1];
    var ws = useState(!!p.warn); var warn = ws[0], setWarn = ws[1];
    function flip(k) {
      setWarn(false);
      setSel(sel.indexOf(k) >= 0 ? sel.filter(function (x) { return x !== k; }) : sel.concat([k]));
    }
    return h("div", { className: "nr-dialog", role: "dialog", "aria-modal": "true", "aria-labelledby": "nr-dialog-title", style: p.style },
      h("div", null,
        h("h2", { className: "nr-dialog__title", id: "nr-dialog-title" }, "Pilih Persona mu!"),
        h("p", { className: "nr-dialog__lead" }, "Pilih minimal satu persona yang menggambarkan keseharianmu untuk mendapatkan rekomendasi dan kurasi hunian yang tepat sasaran.")),
      h("div", null,
        h("div", { className: "nr-dialog__cards" }, PKEYS.map(function (k) {
          var info = PERSONA[k]; var on = sel.indexOf(k) >= 0;
          return h("button", { key: k, className: "nr-dcard", role: "checkbox", "aria-checked": on, onClick: function () { flip(k); } },
            h("span", { className: "nr-dcard__top" }, h(Ikon, { name: info.icon, size: 32, strokeWidth: 1.5 }), h("span", { className: "nr-dcard__check" }, on ? h(Ikon, { name: "check", size: 16, strokeWidth: 3 }) : null)),
            h("span", { className: "nr-dcard__meta" }, info.no, h("span", { className: "nr-dcard__tag" }, info.tag)),
            h("span", { className: "nr-dcard__name" }, info.label),
            h("span", { className: "nr-dcard__desc" }, info.desc));
        })),
        h("div", { className: "nr-dialog__foot" },
          warn ? h("p", { className: "nr-dialog__warn", role: "alert" }, "Pilih minimal satu persona dulu, ya.") : null,
          h("button", { className: "nr-dialog__go", "aria-disabled": sel.length === 0, onClick: function () { if (!sel.length) setWarn(true); } },
            "Mulai Jelajah", h(Ikon, { name: "arrow-right", size: 40, strokeWidth: 1.75 })))));
  }

  /* ---------- Status ---------- */
  function Toast(p) {
    var color = { success: "var(--status-success)", danger: "var(--status-danger)", warning: "var(--status-warning)", info: "var(--navy-900)" }[p.tone || "info"];
    return h("div", { className: "nr-toast", role: p.tone === "danger" ? "alert" : "status" },
      h("span", { className: "nr-toast__dot", style: { background: color } }), p.children);
  }


  /* ---------- Cuplikan peta nyata ----------
     Basemap: tile OpenStreetMap asli z15 (Bojong Gede–Citayam–Cibinong) yang dirangkai menjadi satu gambar (aset "Peta").
     Overlay dari data nyata dalam koordinat piksel gambar itu (SCENE): batas kelurahan OSM, rel & stasiun OSM,
     RTH & POI OSM, rute mobil OSRM, rute jalan kaki OSRM, jalur KRL dari graf rel OSM, bahaya banjir InaRISK (gambar). */
  function pts(list) { return list.map(function (p) { return p[0] + "," + p[1]; }).join(" "); }
  function line(list) { return "M" + list.map(function (p) { return p[0] + " " + p[1]; }).join(" L"); }
  function ringsPath(rings) { return rings.map(function (r) { return line(r) + " Z"; }).join(" "); }
  function bboxOf(lists) {
    var b = [1e9, 1e9, -1e9, -1e9];
    lists.forEach(function (l) { l.forEach(function (p) { if (p[0] < b[0]) b[0] = p[0]; if (p[1] < b[1]) b[1] = p[1]; if (p[0] > b[2]) b[2] = p[0]; if (p[1] > b[3]) b[3] = p[1]; }); });
    return b;
  }
  function centroid(r) { var x = 0, y = 0; r.forEach(function (p) { x += p[0]; y += p[1]; }); return [x / r.length, y / r.length]; }
  function mainRing(rings) { return rings.reduce(function (a, b) { return b.length > a.length ? b : a; }); }
  function kel(name) { return SCENE.kelurahan[name] || []; }
  function stationP(name) { for (var i = 0; i < SCENE.stations.length; i++) if (SCENE.stations[i].name === name) return SCENE.stations[i].p; return null; }

  function fitWindow(b, full) {
    var W, H, x, y, pad = full ? 60 : 90, bw = b[2] - b[0] + 2 * pad, bh = b[3] - b[1] + 2 * pad;
    if (full) {
      var asp = 1536 / 770, rl = 392 / 1536, rr = 70 / 1536, rt = 76 / 770, rb = 70 / 770, fx = 1 - rl - rr, fy = 1 - rt - rb;
      W = Math.min(Math.max(bw / fx, bh / fy * asp, 1536), SCENE.w, SCENE.h * asp); H = W / asp;
      x = b[0] - pad - rl * W - (fx * W - bw) / 2; y = b[1] - pad - rt * H - (fy * H - bh) / 2;
    } else {
      W = Math.min(Math.max(bw, bh * 4 / 3, 480), SCENE.w, SCENE.h * 4 / 3); H = W * 3 / 4;
      x = (b[0] + b[2]) / 2 - W / 2; y = (b[1] + b[3]) / 2 - H / 2;
    }
    x = W >= SCENE.w ? (SCENE.w - W) / 2 : Math.max(0, Math.min(SCENE.w - W, x));
    y = H >= SCENE.h ? (SCENE.h - H) / 2 : Math.max(0, Math.min(SCENE.h - H, y));
    return [Math.round(x), Math.round(y), Math.round(W), Math.round(H)];
  }
  function arrowsAlong(list, every, key) {
    var out = [], next = every * K / 2; every = every * K;
    for (var i = 0; i < list.length - 1; i++) {
      var a = list[i], c = list[i + 1], dx = c[0] - a[0], dy = c[1] - a[1], len = Math.sqrt(dx * dx + dy * dy);
      while (next <= len) {
        var f = next / len;
        out.push(h("path", { key: key + out.length, d: "M-4 -4 L1.5 0 L-4 4", transform: "translate(" + (a[0] + dx * f) + " " + (a[1] + dy * f) + ") rotate(" + (Math.atan2(dy, dx) * 180 / Math.PI) + ") scale(" + K + ")", style: { fill: "none", stroke: "var(--white)", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", vectorEffect: NS } }));
        next += every;
      }
      next -= len;
    }
    return out;
  }
  function mapLabel(at, text, key, dy) {
    var w = text.length * 6.6 + 14, y = -(dy == null ? 30 : dy);
    return h("g", { key: key, transform: "translate(" + at[0] + " " + at[1] + ") scale(" + K + ") translate(" + (-w / 2) + " " + y + ")" },
      h("rect", { width: w, height: 20, rx: 3, style: { fill: "rgba(255,255,255,0.92)", stroke: "var(--white)", filter: "drop-shadow(0 1px 1.5px rgba(0,0,0,.4))" } }),
      h("text", { x: w / 2, y: 14, textAnchor: "middle", style: { font: "400 12px var(--font-sans)", fill: "var(--navy-900)" } }, text));
  }
  function abDot(at, letter, key) {
    var a = letter === "A";
    return h("g", { key: key, transform: "translate(" + at[0] + " " + at[1] + ") scale(" + K + ")" },
      h("circle", { r: 12, style: { fill: a ? "var(--navy-900)" : "var(--white)", stroke: a ? "var(--white)" : "var(--navy-900)", strokeWidth: 2, filter: "drop-shadow(0 4px 6px rgba(0,0,0,.2))" } }),
      h("text", { y: 4, textAnchor: "middle", style: { font: "700 10px var(--font-sans)", fill: a ? "var(--white)" : "var(--navy-900)" } }, letter));
  }
  function pinMark(at, key) {
    return h("g", { key: key, transform: "translate(" + at[0] + " " + at[1] + ") scale(" + K + ")" },
      h("path", { d: "M0 0 C-3.5 -8 -13 -14 -13 -23 A13 13 0 1 1 13 -23 C13 -14 3.5 -8 0 0Z", style: { fill: "var(--navy-900)", stroke: "var(--white)", strokeWidth: 2, filter: "drop-shadow(0 3px 4px rgba(0,0,0,.3))" } }),
      h("circle", { cy: -23, r: 4.5, style: { fill: "var(--white)" } }));
  }
  function stationDot(p, key) { return h("circle", { key: key, cx: p[0], cy: p[1], r: 6 * K, style: { fill: "var(--map-stasiun)", stroke: "var(--navy-900)", strokeWidth: 2.5, vectorEffect: NS } }); }

  var K = 1; /* skala penanda terhadap layar, diset tiap render */
  var NS = "non-scaling-stroke";
  var TOP3 = ["Kedungwaringin", "Bojonggede", "Rawapanjang"];

  function CuplikanPeta(p) {
    var variant = p.variant || "layer";
    var layers = p.layers || (variant === "layer" ? ["historis", "ekosistem", "mobilitas"] : []);
    var on = function (k) { return layers.indexOf(k) >= 0; };
    var uid = (React.useId ? React.useId() : "m").replace(/[^a-zA-Z0-9]/g, "");
    var R = SCENE.route, over = [], i;
    var top = p.top || TOP3, area = p.area || "Kedungwaringin";

    /* Jendela tampilan menurut isi */
    var content;
    if (variant === "search") content = bboxOf(top.map(function (k) { return mainRing(kel(k)); }));
    else if (variant === "wilayah") content = bboxOf([mainRing(kel(area))]);
    else if (variant === "commute") content = bboxOf([R.car, R.walk1, R.walk2, R.krl]);
    else if (variant === "inspector") content = bboxOf([[SCENE.pinA, stationP("Bojonggede")], [[SCENE.pinA[0] - 180, SCENE.pinA[1] - 140], [SCENE.pinA[0] + 180, SCENE.pinA[1] + 120]]]);
    else content = bboxOf([[SCENE.pinA, stationP("Bojonggede"), [SCENE.pinA[0] - 360, SCENE.pinA[1] - 330], [SCENE.pinA[0] + 420, SCENE.pinA[1] + 250]]]);
    var vb = fitWindow(content, p.view === "full");
    K = vb[2] / (p.view === "full" ? 1536 : 480);

    /* Overlay, urut 9.4: poligon → garis → titik → stasiun → label */
    if (variant === "search" || variant === "wilayah") Object.keys(SCENE.kelurahan).forEach(function (k, n) {
      over.push(h("path", { key: "ko" + n, d: ringsPath(SCENE.kelurahan[k]), style: { fill: "none", stroke: "var(--navy-900)", strokeOpacity: 0.35, strokeWidth: 1.2, strokeDasharray: "4 4", vectorEffect: NS } }));
    });
    if (on("historis") && p.flood) over.push(h("image", { key: "flood", href: p.flood, x: 0, y: 0, width: SCENE.w, height: SCENE.h, preserveAspectRatio: "none" }));
    if (on("ekosistem")) SCENE.rth.forEach(function (r, n) { over.push(h("polygon", { key: "rth" + n, points: pts(r), style: { fill: "var(--map-hijau)", fillOpacity: 0.25, stroke: "var(--map-hijau)", strokeWidth: 1.2, vectorEffect: NS } })); });
    if (variant === "search") top.forEach(function (k, n) {
      over.push(h("path", { key: "top" + n, d: ringsPath(kel(k)), style: { fill: "var(--navy-900)", fillOpacity: 0.08, stroke: "var(--navy-900)", strokeWidth: 2.5, strokeLinejoin: "round", vectorEffect: NS } }));
    });
    if (variant === "wilayah") over.push(h("path", { key: "area", d: ringsPath(kel(area)), style: { fill: "var(--navy-900)", fillOpacity: 0.08, stroke: "var(--navy-900)", strokeWidth: 2.5, strokeLinejoin: "round", vectorEffect: NS } }));
    if (variant === "inspector" || p.pin) {
      var selK = null;
      Object.keys(SCENE.kelurahan).some(function (k) { if (k === "Bojonggede") { selK = k; return true; } return false; });
      if (variant === "inspector" && selK) over.push(h("path", { key: "pinkel", d: ringsPath(kel(selK)), style: { fill: "none", stroke: "var(--navy-900)", strokeOpacity: 0.5, strokeWidth: 1.5, strokeDasharray: "5 4", vectorEffect: NS } }));
    }
    if (on("mobilitas") || variant === "commute") SCENE.rail.forEach(function (r, n) {
      over.push(h("path", { key: "rc" + n, d: line(r), style: { fill: "none", stroke: "var(--white)", strokeWidth: 6, strokeLinejoin: "round", vectorEffect: NS } }));
      over.push(h("path", { key: "rl" + n, d: line(r), style: { fill: "none", stroke: "var(--map-krl-bogor)", strokeWidth: 4, strokeDasharray: "10 6", strokeLinejoin: "round", vectorEffect: NS } }));
    });
    if (on("ekosistem")) SCENE.poi.forEach(function (q, n) { over.push(h("circle", { key: "poi" + n, cx: q[0], cy: q[1], r: 5 * K, style: { fill: "var(--map-hijau)", fillOpacity: 0.8, stroke: "var(--white)", strokeWidth: 2, vectorEffect: NS } })); });
    if (variant === "commute") {
      var mode = p.mode || "mobil";
      var dim = function (m) { return mode === m ? 1 : 0.4; };
      var wCar = mode === "mobil" ? 5 : 3.5, wTr = mode === "transit" ? 5 : 3.5;
      var carG = h("g", { key: "car", style: { opacity: dim("mobil") } },
        h("path", { d: line(R.car), style: { fill: "none", stroke: "var(--white)", strokeWidth: wCar + 3, strokeLinejoin: "round", strokeLinecap: "round", vectorEffect: NS } }),
        h("path", { d: line(R.car), style: { fill: "none", stroke: "var(--navy-900)", strokeWidth: wCar, strokeLinejoin: "round", strokeLinecap: "round", vectorEffect: NS } }),
        mode === "mobil" ? arrowsAlong(R.car, 150, "ac") : null);
      var trG = h("g", { key: "tr", style: { opacity: dim("transit") } },
        h("path", { d: line(R.krl), style: { fill: "none", stroke: "var(--white)", strokeWidth: wTr + 3, strokeLinejoin: "round", vectorEffect: NS } }),
        h("path", { d: line(R.krl), style: { fill: "none", stroke: "var(--map-krl-bogor)", strokeWidth: wTr, strokeLinejoin: "round", vectorEffect: NS } }),
        [R.walk1, R.walk2].map(function (w, n) { return h("path", { key: "w" + n, d: line(w), style: { fill: "none", stroke: "var(--navy-900)", strokeWidth: 3, strokeDasharray: "0.1 7", strokeLinecap: "round", strokeLinejoin: "round", vectorEffect: NS } }); }),
        mode === "transit" ? arrowsAlong(R.krl, 150, "at") : null,
        stationDot(stationP("Bojonggede"), "s1"), stationDot(stationP("Citayam"), "s2"));
      over.push(mode === "mobil" ? [trG, carG] : [carG, trG]);
    }
    if (on("mobilitas")) SCENE.stations.forEach(function (s, n) { over.push(stationDot(s.p, "st" + n)); });
    if (variant === "search") top.forEach(function (k, n) {
      var c = centroid(mainRing(kel(k)));
      over.push(h("g", { key: "tn" + n, transform: "translate(" + c[0] + " " + c[1] + ") scale(" + K + ")" },
        h("circle", { r: 13, style: { fill: "var(--navy-900)", stroke: "var(--white)", strokeWidth: 2, vectorEffect: NS } }),
        h("text", { y: 4.5, textAnchor: "middle", style: { font: "700 12px var(--font-sans)", fill: "var(--white)" } }, n + 1)));
    });
    if (variant === "wilayah") over.push(mapLabel(centroid(mainRing(kel(area))), "Kel. " + area, "al", 0));
    if (on("mobilitas")) SCENE.stations.forEach(function (s, n) { over.push(mapLabel(s.p, s.name === "Bojonggede" ? "Bojong Gede" : s.name, "sl" + n)); });
    if (variant === "commute") {
      over.push(mapLabel(stationP("Bojonggede"), "Bojong Gede", "cl1"), mapLabel(stationP("Citayam"), "Citayam", "cl2"));
      over.push(abDot(R.car[0], "A", "A"), abDot(R.car[R.car.length - 1], "B", "B"));
    }
    if (variant === "inspector" || p.pin) {
      over.push(pinMark(SCENE.pinA, "pin"));
      if (variant === "inspector") {
        var tw = 124, pa = SCENE.pinA;
        over.push(h("g", { key: "tag", transform: "translate(" + pa[0] + " " + pa[1] + ") scale(" + K + ") translate(" + (-tw / 2) + " -66)" },
          h("rect", { width: tw, height: 26, rx: 13, style: { fill: "var(--white)", stroke: "var(--line)", filter: "drop-shadow(0 4px 6px rgba(0,0,0,.12))" } }),
          h("text", { x: tw / 2, y: 17, textAnchor: "middle", style: { font: "700 11px var(--font-sans)", fill: "var(--navy-900)" } }, h("tspan", { style: { fill: "var(--star-on)" } }, "★"), " 3/3 Sangat Cocok")));
      }
    }

    var filt = p.bw ? "url(#bw" + uid + ")" : undefined;
    return h("svg", { className: "nr-mapsvg", viewBox: vb.join(" "), preserveAspectRatio: "xMidYMid slice", role: "img", "aria-label": p.label || "Cuplikan peta Bojong Gede", style: p.style },
      p.bw ? h("defs", null, h("filter", { id: "bw" + uid }, h("feColorMatrix", { type: "saturate", values: "0" }))) : null,
      h("rect", { x: -2000, y: -2000, width: SCENE.w + 4000, height: SCENE.h + 4000, style: { fill: "var(--map-ground)" } }),
      p.basemap ? h("image", { href: p.basemap, x: 0, y: 0, width: SCENE.w, height: SCENE.h, preserveAspectRatio: "none", filter: filt }) : null,
      h("g", null, over));
  }

  /* ---------- Landing ---------- */
  function photoStyle(ph) {
    if (!ph) return {};
    if (typeof ph === "string") ph = { src: ph };
    if (ph.x == null) return { backgroundImage: "url(" + ph.src + ")", backgroundSize: "cover", backgroundPosition: ph.position || "center" };
    return { backgroundImage: "url(" + ph.src + ")", backgroundSize: (ph.size || 1440) + "px auto", backgroundPosition: "-" + ph.x + "px -" + ph.y + "px" };
  }

  function HeroLanding(p) {
    var st = photoStyle(p.photo); st.height = p.height || 773;
    return h("div", null,
      h("div", { className: "ed-hero ed-photo", style: st },
        h("div", { className: "ed-header" },
          h("button", { className: "ed-hbtn" }, "MENU", h("span", { style: { color: "var(--hero-muted)" } }, "∷")),
          h("span", { className: "ed-brand" }, p.logo ? h("img", { src: p.logo, width: 31, height: 31, alt: "" }) : h(Ikon, { name: "landmark", size: 28 }), "NalarRuang"),
          h("a", { className: "ed-hbtn ed-hbtn--sm", href: "#peta" }, "Menuju Peta")),
        h("div", { style: { paddingTop: 158 } },
          h("div", { className: "ed-kicker" }, h("span", null, "Data Spasial"), h("span", { className: "ed-kicker__x" }, "×"), h("span", null, "Persona"), h("span", { className: "ed-kicker__x" }, "×"), h("span", null, "Rekomendasi")),
          h("h1", { className: "ed-hero__title" }, "Hunian yang cocok.", h("br"), "Kota yang terbaca."),
          h("p", { className: "ed-hero__sub" }, "Temukan ruang hidup idealmu dengan analisis data spasial perkotaan yang komprehensif."))),
      h("div", { className: "ed-marquee", "aria-hidden": "true" },
        ["Commute Simulator", "Visual Explorer", "Requirement Search", "Smart Point Inspector", "Commute Simulator"].map(function (t, i) {
          return h(React.Fragment, { key: i }, i ? (p.sparkle ? h("img", { src: p.sparkle, width: 20, height: 20, alt: "" }) : h("span", { className: "ed-marquee__sep" }, "✦")) : null, h("span", null, t));
        })));
  }

  function JudulSeksi(p) {
    if (p.variant === "kiri") return h("div", null, h("div", { className: "ed-eyebrow" }, p.eyebrow), h("h2", { className: "ed-title", style: { fontSize: 60, lineHeight: "57.6px" } }, p.title));
    if (p.variant === "kurung") return h("div", { style: { textAlign: "center" } }, h("div", { className: "ed-bracket" }, p.eyebrow), h("h2", { className: "ed-title", style: { fontSize: 60, lineHeight: "57.6px" } }, p.title));
    return h("div", { style: { textAlign: "center" } }, p.intro ? h("div", { className: "ed-intro" }, p.intro) : null, h("h2", { className: "ed-title", style: { fontSize: 88, lineHeight: "88px" } }, p.title));
  }

  function KolomFitur(p) {
    var cols = p.columns || [];
    return h("div", { className: "ed-cols" }, cols.map(function (c, i) {
      return h("div", { key: i, className: "ed-col" }, h("h3", { className: "ed-col__title" }, c.title), h("p", { className: "ed-body", style: { maxWidth: 280, margin: "0 auto" } }, c.text));
    }));
  }

  function VisiKami(p) {
    return h("section", { className: "ed-vision" },
      h("div", null,
        h("h2", { className: "ed-vision__title" }, "Our Vision"),
        h("p", { className: "ed-vision__text" }, p.text || "Menjadi pionir platform inteligensi tata ruang yang meredefinisi standar eksplorasi hunian di Jabodetabek, mengonversi kompleksitas data spasial menjadi wawasan terpersonalisasi guna memberdayakan keputusan hidup yang presisi.")),
      h("div", { className: "ed-vision__frame" }, h("div", { className: "ed-vision__photo ed-photo ed-bw", style: photoStyle(p.photo) })));
  }

  function MisiKami(p) {
    var items = p.items || [
      "Menyediakan integrasi pemetaan data spasial multi-layer (mencakup historis & risiko, ekosistem mikro, inklusivitas, dan mobilitas) yang transparan dan mudah diakses oleh publik.",
      "Menghadirkan pengalaman pencarian kawasan hunian yang berpusat pada pengguna (user-centric) melalui sistem grading berbasis persona gaya hidup (Commuter, Driver, Social & Vibe, Zen).",
      "Mendobrak asimetri informasi tata ruang dengan menyajikan alat analitik interaktif, seperti Smart Point Inspector dan Commute Simulator, guna mendukung pengambilan keputusan yang tepat dan berbasis data."
    ];
    return h("section", { className: "ed-mission" },
      h("h2", { className: "ed-mission__title" }, "Mission"),
      h("div", { className: "ed-mission__cols" }, items.map(function (t, i) {
        return h("div", { key: i, className: "ed-mission__col" }, h("span", { className: "ed-mission__num" }, "0" + (i + 1)), h("p", { className: "ed-mission__text" }, t));
      })));
  }

  function KartuFotoPersona(p) {
    var st = photoStyle(p.photo); st.transform = p.rotate ? "rotate(" + p.rotate + "deg)" : undefined;
    return h("div", { className: "ed-persona-card ed-photo", style: st },
      h("div", { className: "ed-persona-card__text" }, h("p", { className: "ed-persona-card__name" }, p.name), h("p", { className: "ed-persona-card__desc" }, p.desc)));
  }

  function KartuFitur(p) {
    return h("article", { className: "ed-feature" },
      h("div", { className: "ed-feature__frame" }, h("div", { className: "ed-feature__img" }, h(CuplikanPeta, { variant: p.variant || "search", basemap: p.basemap, bw: true, label: "Cuplikan peta " + p.title }))),
      h("h3", { className: "ed-feature__title" }, p.title),
      h("p", { className: "ed-body" }, p.desc),
      h("a", { className: "ed-link", href: "#", style: { marginTop: 20 } }, "Pelajari", h(Ikon, { name: "arrow-up-right", size: 16 })));
  }

  function TileLayer(p) {
    return h("div", { className: "ed-tile ed-photo ed-bw", style: Object.assign(photoStyle(p.photo), { height: p.height || 236 }) },
      h("div", { className: "ed-tile__shade" }), h("p", { className: "ed-tile__title" }, p.title));
  }

  function StripSumberData(p) {
    var logos = p.logos || {};
    return h("div", { style: { textAlign: "center" } },
      h("h2", { className: "ed-title", style: { fontSize: 36, lineHeight: "40px", marginBottom: 40, color: "var(--navy-ink)" } }, "Sumber Data Terbuka"),
      h("div", { className: "ed-logos" }, SUMBER.map(function (s) {
        return h("span", { key: s }, logos[s] ? h("img", { src: logos[s], height: 24, alt: "" }) : h(Ikon, { name: "database", size: 20 }), s);
      })),
      h("a", { className: "ed-link", href: "#peta", style: { marginTop: 48, paddingBottom: 6, borderBottom: "2px solid var(--line)" } }, "Buka Peta Interaktif", h(Ikon, { name: "arrow-up-right", size: 16 })));
  }

  function KartuLangkah(p) {
    var steps = p.steps || [];
    return h("div", { style: { display: "grid", gridTemplateColumns: "repeat(" + steps.length + ", 1fr)", borderTop: "0.8px solid var(--line)", borderBottom: "0.8px solid var(--line)" } },
      steps.map(function (s, i) {
        var last = i === steps.length - 1 && p.highlightLast;
        return h("div", { key: i, className: cx("ed-step", last && "ed-step--current", last && "ed-photo"), style: Object.assign(last ? photoStyle(s.photo) : {}, i < steps.length - 1 ? { borderRight: "0.8px solid var(--line)" } : {}) },
          h("div", null, h("h3", { className: "ed-step__title" }, s.title), h("p", { className: "ed-step__text" }, s.text)),
          h("span", { className: "ed-step__num" }, s.num));
      }));
  }

  function CobaSekarang(p) {
    return h("section", { className: "ed-try" },
      h("div", { className: "ed-try__card" },
        h("div", { className: "ed-try__shot", style: p.shot ? { backgroundImage: "url(" + p.shot + ")" } : { background: "var(--map-ground)" } }),
        h("div", { className: "ed-try__veil" }),
        h("div", { className: "ed-try__inner" },
          h("span", { className: "ed-try__tag" }, "Interaktif"),
          h("h2", { className: "ed-try__title" }, "Coba Sekarang"),
          h("p", { className: "ed-try__text" }, "Gunakan fitur pencarian, filter layer, dan persona untuk mensimulasikan pencarian kawasan idealmu."),
          h("a", { className: "ed-try__btn", href: "#peta" }, "Buka Peta", h(Ikon, { name: "arrow-right", size: 14, strokeWidth: 2.5 })))));
  }

  function AccordionFAQ(p) {
    var items = p.items || [];
    var st = useState(p.open == null ? 0 : p.open); var open = st[0], setOpen = st[1];
    return h("div", { className: "ed-faq" }, items.map(function (it, i) {
      var isOpen = open === i;
      return h("div", { key: i, className: "ed-faq__item" },
        h("button", { className: "ed-faq__q", "aria-expanded": isOpen, onClick: function () { setOpen(isOpen ? -1 : i); } }, it.q, h(Ikon, { name: isOpen ? "minus" : "plus", size: 28, strokeWidth: 1.5 })),
        isOpen ? h("p", { className: "ed-faq__a" }, it.a) : null);
    }));
  }

  function BandCTA(p) {
    return h("div", { className: "ed-cta ed-photo", style: photoStyle(p.photo) },
      h("div", { style: { padding: "150px 23px 120px" } },
        h("h2", { className: "ed-title", style: { fontSize: 76, lineHeight: "73px", color: "var(--stone-50)" } }, "Siap membaca", h("br"), "kotamu sendiri?"),
        h("p", { style: { margin: "19px 0", font: "400 19px/30.9px var(--font-inter)", color: "var(--stone-50-80)" } }, "Pilih persona, buka peta, dan lihat kotamu dari sudut yang berbeda."),
        h("a", { className: "ed-btn", href: "#peta" }, "Mulai Cari Hunian")),
      h("div", { style: { padding: "0 73px 38px" } },
        h("div", { className: "ed-footer" },
          h("div", null, h("div", { className: "ed-footer__label" }, "Hubungi Kami"), "Sekolah Vokasi IPB", h("br"), "Bogor, Jawa Barat, Indonesia"),
          h("div", null, h("div", { className: "ed-footer__label" }, "Kontak"), "Kerja Sama", h("br"), "kolaborasi@nalaruang.id", h("br"), "Media", h("br"), "media@nalaruang.id"),
          h("div", null, h("div", { className: "ed-footer__label" }, "Ikuti"), ["instagram", "linkedin", "youtube"].map(function (s) { return h("span", { key: s, className: "ed-social" }, h(Ikon, { name: s, size: 18, label: s })); }))),
        h("div", { className: "ed-footer__base" },
          h("span", { className: "nr-wordmark", style: { color: "var(--cream-100)", fontSize: 12.9 } }, "Nalar", h("i", null, "Ruang")),
          h("span", null, "Skor dan rekomendasi merupakan estimasi dari data sekunder publik."),
          h("span", null, "© 2026"))));
  }

  window.NalarRuang = {
    Ikon: Ikon, Bintang: Bintang, SearchBar: SearchBar, PanelTop3: PanelTop3, PointInspector: PointInspector, BarisSkorPersona: BarisSkorPersona, BadgeProfil: BadgeProfil, KartuKesimpulan: KartuKesimpulan, SimulatorRute: SimulatorRute, PanelLayer: PanelLayer, KartuLayer: KartuLayer, Toggle: Toggle, PanelProfilPersona: PanelProfilPersona, TombolMerek: TombolMerek, TombolLayerPersona: TombolLayerPersona, SliderTahun: SliderTahun, DrawerMenu: DrawerMenu, KartuCheckboxPersona: KartuCheckboxPersona, DialogPersona: DialogPersona, PopupPeta: PopupPeta, LabelPeta: LabelPeta, KontrolZoom: KontrolZoom, SimbolPeta: SimbolPeta, CuplikanPeta: CuplikanPeta, StateKosongMuatGalat: StateKosongMuatGalat, Toast: Toast, HeroLanding: HeroLanding, JudulSeksi: JudulSeksi, KolomFitur: KolomFitur, VisiKami: VisiKami, MisiKami: MisiKami, KartuFotoPersona: KartuFotoPersona, KartuFitur: KartuFitur, TileLayer: TileLayer, StripSumberData: StripSumberData, KartuLangkah: KartuLangkah, CobaSekarang: CobaSekarang, AccordionFAQ: AccordionFAQ, BandCTA: BandCTA
  };
})();
