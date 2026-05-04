const medidasIniciais = [
  "175/60/14", "175/65/14", "175/70/14", "185/60/15", "185/65/15",
  "195/55/16", "195/60/15", "195/60/16", "195/65/15", "205/45/17",
  "205/50/17", "205/55/16", "205/60/15", "205/60/16", "205/65/16",
  "215/45/18", "215/50/17", "215/55/17", "215/60/17", "215/65/17",
  "225/55/18", "225/60/18", "225/70/14", "235/45/17", "235/55/18",
  "235/60/17", "235/65/17", "235/70/18", "255/70/18"
];

const marcasIniciais = [
  "Bridgestone", "Chengshan", "Continental", "Dunlop", "Firestone",
  "Goodyear", "GT Radial", "Michelin", "Pirelli", "Pirelli P1",
  "Pirelli P6", "Pirelli P7", "Pirelli HT", "Pirelli TM", "Scorpion ATR", "Scorpion HT"
];

let lancamentos = JSON.parse(localStorage.getItem("lancamentosPneus") || "[]");
let editandoId = null;

const el = id => document.getElementById(id);
const normalizar = texto => texto.trim().replace(/\s+/g, " ");
const chave = item => `${item.medida.toLowerCase()}|${item.marca.toLowerCase()}|${(item.observacao || "").toLowerCase()}`;

function preencherDatalists() {
  const medidas = [...new Set([...medidasIniciais, ...lancamentos.map(i => i.medida)])].sort();
  const marcas = [...new Set([...marcasIniciais, ...lancamentos.map(i => i.marca)])].sort();
  el("listaMedidas").innerHTML = medidas.map(m => `<option value="${m}"></option>`).join("");
  el("listaMarcas").innerHTML = marcas.map(m => `<option value="${m}"></option>`).join("");
}

function salvar() {
  localStorage.setItem("lancamentosPneus", JSON.stringify(lancamentos));
}

function toast(msg) {
  const t = el("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2200);
}

function limparCampos() {
  el("medida").value = "";
  el("marca").value = "";
  el("quantidade").value = 1;
  el("observacao").value = "";
  editandoId = null;
  el("btnAdicionar").textContent = "Adicionar";
  el("medida").focus();
}

function adicionarOuAtualizar() {
  const medida = normalizar(el("medida").value);
  const marca = normalizar(el("marca").value);
  const quantidade = Number(el("quantidade").value);
  const observacao = normalizar(el("observacao").value);

  if (!medida || !marca || !quantidade || quantidade < 1) {
    toast("Preencha medida, marca e quantidade corretamente.");
    return;
  }

  if (editandoId) {
    const idx = lancamentos.findIndex(i => i.id === editandoId);
    if (idx >= 0) {
      lancamentos[idx] = { ...lancamentos[idx], medida, marca, quantidade, observacao };
      toast("Lançamento atualizado.");
    }
  } else {
    const novo = { id: crypto.randomUUID(), medida, marca, quantidade, observacao, criadoEm: new Date().toISOString() };
    const existente = lancamentos.find(i => chave(i) === chave(novo));
    if (existente) {
      existente.quantidade += quantidade;
      toast("Item já existia. Quantidade somada automaticamente.");
    } else {
      lancamentos.push(novo);
      toast("Lançamento adicionado.");
    }
  }

  salvar();
  preencherDatalists();
  renderizar();
  limparCampos();
}

function editar(id) {
  const item = lancamentos.find(i => i.id === id);
  if (!item) return;
  el("medida").value = item.medida;
  el("marca").value = item.marca;
  el("quantidade").value = item.quantidade;
  el("observacao").value = item.observacao || "";
  editandoId = id;
  el("btnAdicionar").textContent = "Salvar alteração";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function excluir(id) {
  if (!confirm("Deseja excluir este lançamento?")) return;
  lancamentos = lancamentos.filter(i => i.id !== id);
  salvar();
  renderizar();
  toast("Lançamento excluído.");
}

function agruparPor(campo) {
  return lancamentos.reduce((acc, item) => {
    acc[item[campo]] = (acc[item[campo]] || 0) + Number(item.quantidade);
    return acc;
  }, {});
}

function listaResumo(obj) {
  const itens = Object.entries(obj).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (!itens.length) return `<p class="empty">Sem dados.</p>`;
  return itens.map(([nome, total]) => `<div class="summary-item"><span>${nome}</span><strong>${total}</strong></div>`).join("");
}

function renderizar() {
  const busca = (el("busca").value || "").toLowerCase();
  const filtrados = lancamentos.filter(i => `${i.medida} ${i.marca} ${i.observacao || ""}`.toLowerCase().includes(busca));

  el("tbodyLancamentos").innerHTML = filtrados.map(i => `
    <tr>
      <td>${i.medida}</td>
      <td>${i.marca}</td>
      <td>${i.quantidade}</td>
      <td>${i.observacao || "-"}</td>
      <td>
        <div class="row-actions">
          <button class="secondary" onclick="editar('${i.id}')">Editar</button>
          <button class="danger" onclick="excluir('${i.id}')">Excluir</button>
        </div>
      </td>
    </tr>
  `).join("");

  el("mensagemVazia").style.display = lancamentos.length ? "none" : "block";

  const total = lancamentos.reduce((s, i) => s + Number(i.quantidade), 0);
  el("totalGeral").textContent = total;
  el("totalMedidas").textContent = Object.keys(agruparPor("medida")).length;
  el("totalMarcas").textContent = Object.keys(agruparPor("marca")).length;
  el("resumoMedidas").innerHTML = listaResumo(agruparPor("medida"));
  el("resumoMarcas").innerHTML = listaResumo(agruparPor("marca"));
}

function gerarPDF() {
  if (!lancamentos.length) {
    toast("Adicione pelo menos um lançamento antes de gerar o PDF.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const data = new Date().toLocaleString("pt-BR");
  const responsavel = el("responsavel").value || "Não informado";
  const local = el("local").value || "Não informado";
  const total = lancamentos.reduce((s, i) => s + Number(i.quantidade), 0);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Relatório de Contagem de Pneus", 14, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Responsável: ${responsavel}`, 14, 24);
  doc.text(`Local / Setor: ${local}`, 14, 30);
  doc.text(`Data e hora: ${data}`, 14, 36);
  doc.text(`Total geral: ${total} pneus`, 14, 42);

  doc.autoTable({
    startY: 50,
    head: [["Medida", "Marca / Modelo", "Quantidade", "Observação"]],
    body: lancamentos.map(i => [i.medida, i.marca, i.quantidade, i.observacao || ""]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [22, 78, 159] }
  });

  const y1 = doc.lastAutoTable.finalY + 8;
  doc.setFont("helvetica", "bold");
  doc.text("Resumo por medida", 14, y1);
  doc.autoTable({
    startY: y1 + 4,
    head: [["Medida", "Total"]],
    body: Object.entries(agruparPor("medida")).sort((a,b) => a[0].localeCompare(b[0])),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [22, 78, 159] }
  });

  const y2 = doc.lastAutoTable.finalY + 8;
  doc.setFont("helvetica", "bold");
  doc.text("Resumo por marca", 14, y2);
  doc.autoTable({
    startY: y2 + 4,
    head: [["Marca / Modelo", "Total"]],
    body: Object.entries(agruparPor("marca")).sort((a,b) => a[0].localeCompare(b[0])),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [22, 78, 159] }
  });

  doc.save(`contagem-pneus-${new Date().toISOString().slice(0,10)}.pdf`);
}

function exportarCSV() {
  if (!lancamentos.length) {
    toast("Não há dados para exportar.");
    return;
  }
  const linhas = [["Medida", "Marca/Modelo", "Quantidade", "Observação"]];
  lancamentos.forEach(i => linhas.push([i.medida, i.marca, i.quantidade, i.observacao || ""]));
  const csv = linhas.map(l => l.map(c => `"${String(c).replaceAll('"', '""')}"`).join(";")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `contagem-pneus-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function novaContagem() {
  if (!confirm("Deseja apagar todos os lançamentos e iniciar uma nova contagem?")) return;
  lancamentos = [];
  salvar();
  renderizar();
  toast("Nova contagem iniciada.");
}

el("btnAdicionar").addEventListener("click", adicionarOuAtualizar);
el("btnLimparCampos").addEventListener("click", limparCampos);
el("btnPdf").addEventListener("click", gerarPDF);
el("btnCsv").addEventListener("click", exportarCSV);
el("btnNovaContagem").addEventListener("click", novaContagem);
el("busca").addEventListener("input", renderizar);

document.querySelectorAll("[data-qtd]").forEach(btn => {
  btn.addEventListener("click", () => {
    el("quantidade").value = Number(el("quantidade").value || 0) + Number(btn.dataset.qtd);
  });
});

preencherDatalists();
renderizar();
