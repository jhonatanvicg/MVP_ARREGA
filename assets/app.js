(function () {
  "use strict";

  var SESSION_KEY = "arrega_session_user";
  var API_BASE_KEY = "arrega_api_base_url";
  var DEFAULT_API_BASE = "http://localhost:3000";

  function getApiBase() {
    return (localStorage.getItem(API_BASE_KEY) || DEFAULT_API_BASE).replace(/\/+$/, "");
  }

  // ---------- Login page ----------
  var loginForm = document.getElementById("loginForm");
  if (loginForm) {
    var errorBox = document.getElementById("loginError");

    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var username = document.getElementById("username").value.trim();
      var password = document.getElementById("password").value;

      if (!username || !password) {
        errorBox.textContent = "Ingresa usuario y contraseña.";
        errorBox.classList.add("visible");
        return;
      }

      // MVP: no hay backend de autenticación todavía, se acepta cualquier credencial.
      sessionStorage.setItem(SESSION_KEY, username);
      window.location.href = "dashboard.html";
    });
  }

  // ---------- Dashboard page ----------
  var sidebar = document.getElementById("sidebar");
  if (sidebar) {
    var storedUser = sessionStorage.getItem(SESSION_KEY);
    if (!storedUser) {
      window.location.href = "index.html";
      return;
    }
    document.getElementById("topbarUsername").textContent = storedUser;

    var toggleBtn = document.getElementById("sidebarToggle");
    toggleBtn.addEventListener("click", function () {
      sidebar.classList.toggle("collapsed");
    });

    var navItems = document.querySelectorAll(".nav-item[data-view]");
    var views = document.querySelectorAll(".view[data-view]");
    var topbarTitle = document.getElementById("topbarTitle");
    var titles = { home: "Home", cmc: "CMC Eléctrica", config: "Configuraciones" };

    navItems.forEach(function (item) {
      item.addEventListener("click", function () {
        var target = item.getAttribute("data-view");

        navItems.forEach(function (i) { i.classList.remove("active"); });
        item.classList.add("active");

        views.forEach(function (v) {
          v.classList.toggle("active", v.getAttribute("data-view") === target);
        });

        topbarTitle.textContent = titles[target] || "";
      });
    });

    document.getElementById("logoutBtn").addEventListener("click", function () {
      sessionStorage.removeItem(SESSION_KEY);
      window.location.href = "index.html";
    });

    // ---------- CMC Eléctrica: calculadora de incertidumbre ----------
    var MAGNITUDES = [
      {
        id: "dc-voltage-measure",
        label: "DC Voltage – Measure",
        subtitle: "Agilent 3458A · (10 mV – 1000 V)",
        icon: "⚡",
        mode: "api",
        backendParametro: "DC Voltage – Measure",
        ranges: [
          { label: "10 - 100", unit: "mV", hint: "50" },
          { label: "0.1 - 1", unit: "V", hint: "0.5" },
          { label: "1 - 10", unit: "V", hint: "5" },
          { label: "10 - 100", unit: "V", hint: "50" },
          { label: "100 - 1000", unit: "V", hint: "500" },
        ],
      },
      {
        id: "dc-voltage-source-5560a",
        label: "DC Voltage – Source (5560A)",
        subtitle: "0 – 1020 V",
        icon: "⚡",
        mode: "local",
        equipo: "5560A",
        metodo: "Source",
        ranges: [
          {
            label: "0 - 120",
            unit: "mV",
            hint: "60",
            rangeText: "(0 to 120) mV",
            coefficientPpm: 9.5,
            fixedValue: 0.62,
            fixedUnit: "µV",
          },
          {
            label: ">0.12 - 1020",
            unit: "V",
            hint: "500",
            rangeText: "(>0.12 to 1020) V",
            coefficientPpm: 8.7,
            fixedValue: 0.78,
            fixedUnit: "mV",
          },
        ],
      },
    ];

    var cmcForm = document.getElementById("cmcForm");
    var cmcError = document.getElementById("cmcError");
    var cmcSubmit = document.getElementById("cmcSubmit");
    var cmcLectura = document.getElementById("cmcLectura");
    var cmcUnitBadge = document.getElementById("cmcUnitBadge");
    var cmcRangeGrid = document.getElementById("cmcRangeGrid");
    var cmcResultEmpty = document.getElementById("cmcResultEmpty");
    var cmcResultBody = document.getElementById("cmcResultBody");
    var cmcStatusBadge = document.getElementById("cmcStatusBadge");
    var cmcStatusText = document.getElementById("cmcStatusText");
    var cmcPrecisionValue = document.getElementById("cmcPrecisionValue");
    var cmcPrecisionFill = document.getElementById("cmcPrecisionFill");
    var cmcExportBtn = document.getElementById("cmcExportBtn");

    var cmcMagnitudeSearch = document.getElementById("cmcMagnitudeSearch");
    var cmcMagnitudeInput = document.getElementById("cmcMagnitudeInput");
    var cmcMagnitudeResults = document.getElementById("cmcMagnitudeResults");
    var cmcSelectedMagnitude = document.getElementById("cmcSelectedMagnitude");
    var cmcSelectedIcon = document.getElementById("cmcSelectedIcon");
    var cmcSelectedLabel = document.getElementById("cmcSelectedLabel");
    var cmcSelectedSub = document.getElementById("cmcSelectedSub");

    var selectedMagnitudeId = null;
    var lastResult = null;

    function showCmcError(message) {
      cmcError.textContent = message;
      cmcError.classList.add("visible");
    }

    function hideCmcError() {
      cmcError.classList.remove("visible");
    }

    function setStatusBadge(state) {
      cmcStatusBadge.classList.remove("online", "error", "local");
      if (state === "online") {
        cmcStatusBadge.classList.add("online");
        cmcStatusText.textContent = "SISTEMA EN LÍNEA";
      } else if (state === "error") {
        cmcStatusBadge.classList.add("error");
        cmcStatusText.textContent = "SIN CONEXIÓN";
      } else if (state === "local") {
        cmcStatusBadge.classList.add("local");
        cmcStatusText.textContent = "CÁLCULO LOCAL (DEMO)";
      } else {
        cmcStatusText.textContent = "SIN VERIFICAR";
      }
    }

    function setCalculationState(state) {
      if (state === "done") {
        cmcPrecisionValue.textContent = "VALIDADO";
        cmcPrecisionFill.style.width = "100%";
      } else {
        cmcPrecisionValue.textContent = "PENDIENTE";
        cmcPrecisionFill.style.width = "0%";
      }
    }

    function resetResultState() {
      hideCmcError();
      cmcResultEmpty.hidden = false;
      cmcResultBody.hidden = true;
      setCalculationState("idle");
      cmcExportBtn.disabled = true;
      lastResult = null;
    }

    // Parsea "Agilent 3458A Opt. 002 (Comparison) — 8.5 Digit Multimeter"
    function parseEstandar(text) {
      var match = /^(.*)\s\((.*)\)\s—\s(.*)$/.exec(text || "");
      if (!match) return { equipo: text || "—", metodo: "—" };
      return { equipo: match[1] + " — " + match[3], metodo: match[2] };
    }

    function currentMagnitude() {
      for (var i = 0; i < MAGNITUDES.length; i++) {
        if (MAGNITUDES[i].id === selectedMagnitudeId) return MAGNITUDES[i];
      }
      return null;
    }

    function selectedRangeData(magnitude) {
      var checked = cmcRangeGrid.querySelector('input[name="cmcRange"]:checked');
      if (!checked) return null;
      return magnitude.ranges[parseInt(checked.dataset.index, 10)];
    }

    function renderRanges(magnitude) {
      if (!magnitude.ranges.length) {
        cmcRangeGrid.innerHTML = '<p class="cmc-range-empty">No hay rangos definidos para esta magnitud.</p>';
        return;
      }

      cmcRangeGrid.innerHTML = magnitude.ranges
        .map(function (range, index) {
          return (
            '<label class="cmc-range-chip">' +
            '<input type="radio" name="cmcRange" data-index="' +
            index +
            '" data-unit="' +
            range.unit +
            '" data-hint="' +
            range.hint +
            '"' +
            (index === 0 ? " checked" : "") +
            ">" +
            '<div class="cmc-range-chip-body">' +
            '<div class="cmc-range-chip-value">' +
            range.label +
            "</div>" +
            '<div class="cmc-range-chip-unit">' +
            range.unit +
            "</div>" +
            "</div>" +
            "</label>"
          );
        })
        .join("");

      cmcUnitBadge.textContent = magnitude.ranges[0].unit;
      cmcLectura.placeholder = magnitude.ranges[0].hint;
    }

    cmcRangeGrid.addEventListener("change", function (e) {
      if (!e.target || e.target.name !== "cmcRange") return;
      cmcUnitBadge.textContent = e.target.dataset.unit;
      cmcLectura.placeholder = e.target.dataset.hint;
      resetResultState();
    });

    function selectMagnitude(id) {
      var magnitude = null;
      for (var i = 0; i < MAGNITUDES.length; i++) {
        if (MAGNITUDES[i].id === id) magnitude = MAGNITUDES[i];
      }
      if (!magnitude) return;

      selectedMagnitudeId = id;

      cmcSelectedMagnitude.classList.remove("is-empty");
      cmcSelectedIcon.textContent = magnitude.icon;
      cmcSelectedLabel.textContent = magnitude.label;
      cmcSelectedSub.textContent = magnitude.subtitle;

      renderRanges(magnitude);
      cmcLectura.value = "";
      cmcLectura.disabled = false;
      cmcSubmit.disabled = false;
      resetResultState();
      setStatusBadge("idle");

      cmcMagnitudeInput.value = "";
      hideMagnitudeResults();
    }

    function renderMagnitudeResults(query) {
      var q = (query || "").trim().toLowerCase();
      var matches = MAGNITUDES.filter(function (m) {
        return !q || m.label.toLowerCase().indexOf(q) !== -1 || m.subtitle.toLowerCase().indexOf(q) !== -1;
      });

      if (!matches.length) {
        cmcMagnitudeResults.innerHTML = '<li class="cmc-search-empty">Sin coincidencias</li>';
      } else {
        cmcMagnitudeResults.innerHTML = matches
          .map(function (m) {
            return (
              '<li class="cmc-search-result" data-id="' +
              m.id +
              '"><span class="cmc-search-result-icon">' +
              m.icon +
              '</span><div><div class="cmc-search-result-label">' +
              m.label +
              '</div><div class="cmc-search-result-sub">' +
              m.subtitle +
              "</div></div></li>"
            );
          })
          .join("");
      }
      cmcMagnitudeResults.hidden = false;
    }

    function hideMagnitudeResults() {
      cmcMagnitudeResults.hidden = true;
    }

    cmcMagnitudeInput.addEventListener("focus", function () {
      renderMagnitudeResults(cmcMagnitudeInput.value);
    });

    cmcMagnitudeInput.addEventListener("input", function () {
      renderMagnitudeResults(cmcMagnitudeInput.value);
    });

    cmcMagnitudeResults.addEventListener("click", function (e) {
      var item = e.target.closest(".cmc-search-result");
      if (item && item.dataset.id) selectMagnitude(item.dataset.id);
    });

    document.addEventListener("click", function (e) {
      if (!cmcMagnitudeSearch.contains(e.target)) hideMagnitudeResults();
    });

    function applyResult(opts) {
      document.getElementById("cmcResultNumber").textContent = opts.valor;
      document.getElementById("cmcResultUnitLabel").textContent = opts.unidad;
      document.getElementById("cmcResultRango").textContent = opts.rango;
      document.getElementById("cmcResultLectura").textContent = opts.lecturaText;
      document.getElementById("cmcMetaFormula").textContent = opts.formula;
      document.getElementById("cmcMetaEquipo").textContent = opts.equipo;
      document.getElementById("cmcMetaMetodo").textContent = opts.metodo;
      document.getElementById("cmcMetaTimestamp").textContent = opts.timestamp;

      cmcResultEmpty.hidden = true;
      cmcResultBody.hidden = false;
      setCalculationState("done");
      cmcExportBtn.disabled = false;

      lastResult = {
        parametro: opts.parametro,
        lectura: opts.lecturaText,
        incertidumbre: opts.valor + " " + opts.unidad,
        formula: opts.formula,
        rango: opts.rango,
        estandar: opts.equipo + (opts.metodo && opts.metodo !== "—" ? " (" + opts.metodo + ")" : ""),
        timestamp: opts.timestamp,
      };
    }

    function runApiCalculation(magnitude, range, lectura) {
      var payload = {
        nombreParametro: magnitude.backendParametro,
        lectura: lectura,
        unidadLectura: range.unit,
      };

      cmcSubmit.disabled = true;
      cmcSubmit.textContent = "Calculando...";

      fetch(getApiBase() + "/evaluar-incertidumbre", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": storedUser,
        },
        body: JSON.stringify(payload),
      })
        .then(function (res) {
          return res.json().then(function (data) {
            if (!res.ok) {
              var msg =
                (data && data.error && data.error.formErrors && data.error.formErrors.join(", ")) ||
                (data && typeof data.error === "string" && data.error) ||
                "No se pudo calcular la incertidumbre.";
              throw new Error(msg);
            }
            return data;
          });
        })
        .then(function (data) {
          setStatusBadge("online");
          var estandar = parseEstandar(data.estandarReferencia);
          applyResult({
            valor: data.incertidumbreCalculadaValor,
            unidad: data.incertidumbreCalculadaUnidad,
            rango: data.rangoAplicado,
            lecturaText: lectura + " " + payload.unidadLectura,
            formula: data.formulaUtilizada,
            equipo: estandar.equipo,
            metodo: estandar.metodo,
            timestamp: new Date().toLocaleString(),
            parametro: payload.nombreParametro,
          });
        })
        .catch(function (err) {
          var isNetworkError = err instanceof TypeError;
          setStatusBadge(isNetworkError ? "error" : "online");
          setCalculationState("idle");
          var message = isNetworkError
            ? "No se pudo conectar con el backend en " + getApiBase() + ". Verifica que el servidor esté corriendo."
            : err.message;
          showCmcError(message);
        })
        .finally(function () {
          cmcSubmit.disabled = false;
          cmcSubmit.textContent = "Calcular →";
        });
    }

    // Modo local: la magnitud aún no existe en el backend (datos dummy),
    // así que la incertidumbre se calcula en el cliente con la misma
    // convención que usa la API (coeficiente en µV/V + término fijo).
    function runLocalCalculation(magnitude, range, lectura) {
      cmcSubmit.disabled = true;
      cmcSubmit.textContent = "Calculando...";

      setTimeout(function () {
        var readingVolts = range.unit === "mV" ? lectura / 1000 : lectura;
        var fixedUv = range.fixedUnit === "mV" ? range.fixedValue * 1000 : range.fixedValue;
        var valor = Number((readingVolts * range.coefficientPpm + fixedUv).toFixed(6));
        var fixedExp = range.fixedUnit === "mV" ? "e-3" : "e-6";
        var formula = "reading * " + range.coefficientPpm + "e-6 + " + range.fixedValue + fixedExp;

        setStatusBadge("local");
        applyResult({
          valor: valor,
          unidad: "µV",
          rango: range.rangeText,
          lecturaText: lectura + " " + range.unit,
          formula: formula,
          equipo: magnitude.equipo || "—",
          metodo: magnitude.metodo || "—",
          timestamp: new Date().toLocaleString(),
          parametro: magnitude.label,
        });

        cmcSubmit.disabled = false;
        cmcSubmit.textContent = "Calcular →";
      }, 200);
    }

    cmcForm.addEventListener("submit", function (e) {
      e.preventDefault();
      hideCmcError();

      var magnitude = currentMagnitude();
      if (!magnitude) {
        showCmcError("Selecciona una magnitud antes de calcular.");
        return;
      }

      var range = selectedRangeData(magnitude);
      if (!range) {
        showCmcError("Selecciona un rango operativo.");
        return;
      }

      var lecturaRaw = cmcLectura.value;
      var lectura = parseFloat(lecturaRaw);
      if (lecturaRaw === "" || Number.isNaN(lectura)) {
        showCmcError("Ingresa una lectura numérica válida.");
        return;
      }

      if (magnitude.mode === "api") {
        runApiCalculation(magnitude, range, lectura);
      } else {
        runLocalCalculation(magnitude, range, lectura);
      }
    });

    // Magnitud por defecto al cargar el panel
    selectMagnitude(MAGNITUDES[0].id);

    cmcExportBtn.addEventListener("click", function () {
      if (!lastResult) return;

      var lines = [
        "Arrega Industrial — Reporte de incertidumbre",
        "----------------------------------------------",
        "Parámetro: " + lastResult.parametro,
        "Lectura: " + lastResult.lectura,
        "Incertidumbre calculada: " + lastResult.incertidumbre,
        "Fórmula utilizada: " + lastResult.formula,
        "Rango aplicado: " + lastResult.rango,
        "Estándar de referencia: " + lastResult.estandar,
        "Generado por: " + storedUser,
        "Fecha: " + lastResult.timestamp,
      ];

      var blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "reporte-incertidumbre.txt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });

    // ---------- Configuraciones: URL base de la API ----------
    var configForm = document.getElementById("configForm");
    var apiBaseInput = document.getElementById("apiBaseUrl");
    var configSaved = document.getElementById("configSaved");

    apiBaseInput.value = getApiBase();

    configForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var value = apiBaseInput.value.trim() || DEFAULT_API_BASE;
      localStorage.setItem(API_BASE_KEY, value);
      apiBaseInput.value = value;

      configSaved.classList.add("visible");
      setTimeout(function () {
        configSaved.classList.remove("visible");
      }, 2000);
    });
  }
})();
