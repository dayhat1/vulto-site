/* Gate de lead do blog da Vulto.
   O HTML do post traz só o começo. O resto vem da API da Vulto (POST /blog/liberar) quando a pessoa
   deixa e-mail + WhatsApp (ou já tem o código de acesso de 30 dias salvo neste navegador). */
(function () {
  var box = document.querySelector("[data-gate]");
  var body = document.querySelector("[data-gate-body]");
  if (!box || !body) return;
  var CHAVE = "vulto_lead_token";
  var slug = box.getAttribute("data-slug");
  var endpoint = box.getAttribute("data-endpoint");
  var key = box.getAttribute("data-key");
  var form = box.querySelector("form");
  var msg = box.querySelector(".gate-msg");
  var botao = form.querySelector("button");

  function ler() { try { return localStorage.getItem(CHAVE); } catch (e) { return null; } }
  function gravar(t) { try { localStorage.setItem(CHAVE, t); } catch (e) {} }
  function apagar() { try { localStorage.removeItem(CHAVE); } catch (e) {} }

  var q = new URLSearchParams(location.search);
  var utm = { source: q.get("utm_source") || "", medium: q.get("utm_medium") || "", campaign: q.get("utm_campaign") || "" };

  function chamar(dados) {
    var h = { "Content-Type": "application/json" };
    if (key) { h.apikey = key; }
    return fetch(endpoint, { method: "POST", headers: h, body: JSON.stringify(dados) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, status: r.status, j: j }; }); });
  }

  function liberar(html) {
    body.innerHTML = html;
    box.parentNode.removeChild(box);
    document.documentElement.classList.add("gate-ok");
  }

  function aviso(t, erro) {
    msg.textContent = t;
    msg.classList.toggle("erro", !!erro);
  }

  // já é lead neste navegador: libera direto, sem mostrar o formulário
  var token = ler();
  if (token) {
    box.classList.add("gate-carregando");
    chamar({ slug: slug, token: token, utm: utm }).then(function (r) {
      if (r.ok && r.j.html) {
        if (r.j.token) gravar(r.j.token);
        liberar(r.j.html);
      } else {
        if (r.status === 401) apagar();
        box.classList.remove("gate-carregando");
      }
    }).catch(function () { box.classList.remove("gate-carregando"); });
  }

  function soDigitos(s) { return (s || "").replace(/\D/g, ""); }
  function whatsBR(s) {
    var d = soDigitos(s);
    if (d.length === 11) d = "55" + d;
    return /^55[1-9][1-9]9\d{8}$/.test(d) ? "+" + d : "";
  }

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var email = form.email.value.trim().toLowerCase();
    var wa = whatsBR(form.whatsapp.value);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { aviso("Confira o e-mail.", true); form.email.focus(); return; }
    if (!wa) { aviso("WhatsApp com DDD e 9 dígitos, ex.: (21) 99999-9999.", true); form.whatsapp.focus(); return; }
    if (!form.consentimento.checked) { aviso("Marque a caixa de aceite para liberar.", true); return; }
    botao.disabled = true;
    aviso("Liberando…");
    chamar({
      email: email, whatsapp: wa, slug: slug, utm: utm, consentimento: true,
      consentimento_texto: form.querySelector(".check span").textContent.replace(/\s+/g, " ").trim(),
      site: form.site.value
    }).then(function (r) {
      botao.disabled = false;
      if (r.ok && r.j.html) {
        if (r.j.token) gravar(r.j.token);
        liberar(r.j.html);
      } else {
        aviso(r.j.erro || "Não deu certo agora. Tente de novo em instantes.", true);
      }
    }).catch(function () {
      botao.disabled = false;
      aviso("Sem conexão. Tente de novo.", true);
    });
  });
})();
