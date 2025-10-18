// Datos de productos: edita, agrega o quita
const productos = [
  {
    id: "papa",
    nombre: "Papa",
    tipo: "hortaliza",
    temporada: "Todo el año",
    beneficios: ["Fuente de potasio", "Energía de liberación lenta"],
    usos: ["Purés", "Hervida", "Al horno"],
    img: "img/papa.jpg",
    alt: "Papas frescas recién cosechadas"
  },
  {
    id: "zanahoria",
    nombre: "Zanahoria",
    tipo: "hortaliza",
    temporada: "Todo el año",
    beneficios: ["Vitamina A", "Antioxidantes"],
    usos: ["Ensaladas", "Sopas", "Jugos"],
    img: "img/zanahoria.jpg",
    alt: "Zanahorias naranjas con hojas verdes"
  },
  {
    id: "cebollin",
    nombre: "Cebollín",
    tipo: "hortaliza",
    temporada: "Todo el año",
    beneficios: ["Vitamina K", "Sabor aromático"],
    usos: ["Guarniciones", "Arepas", "Salteados"],
    img: "img/cebollin.jpg",
    alt: "Manojo de cebollín fresco"
  },
  {
    id: "fresa",
    nombre: "Fresa",
    tipo: "fruta",
    temporada: "Octubre–Mayo",
    beneficios: ["Vitamina C", "Baja en calorías"],
    usos: ["Batidos", "Postres", "Mermeladas"],
    img: "img/fresa.jpg",
    alt: "Fresas rojas en canasta"
  },
  {
    id: "mora",
    nombre: "Mora",
    tipo: "fruta",
    temporada: "Junio–Noviembre",
    beneficios: ["Antocianinas", "Fibra"],
    usos: ["Jugos", "Salsas", "Helados"],
    img: "img/mora.jpg",
    alt: "Moras frescas sobre hojas"
  },
  {
    id: "aji",
    nombre: "Ají",
    tipo: "hortaliza",
    temporada: "Todo el año",
    beneficios: ["Vitamina C", "Capasaicina"],
    usos: ["Salsas", "Encurtidos", "Guisos"],
    img: "img/aji.jpg",
    alt: "Ajíes rojos y verdes"
  }
];

const d = document;
const grid = d.getElementById("grid");
const chips = d.querySelectorAll(".chip");

// Render de tarjetas
function cardHTML(p){
  const beneficios = p.beneficios.map(b => `<li>${b}</li>`).join("");
  const usos = p.usos.join(" • ");
  return `
  <article class="card" data-kind="${p.tipo}">
    <img src="${p.img}" alt="${p.alt}" loading="lazy" width="640" height="420">
    <div class="body">
      <span class="badge">Temporada: ${p.temporada}</span>
      <h3>${p.nombre}</h3>
      <ul>${beneficios}</ul>
      <p class="meta">Usos: ${usos}</p>
    </div>
    <div class="actions">
  <a class="btn ghost" href="https://wa.me/584247394025?text=Hola,%20quiero%20${encodeURIComponent(p.nombre)}" target="_blank" rel="noopener">Consultar</a>
      <button class="btn" aria-label="Más info de ${p.nombre}">Guardar</button>
    </div>
  </article>`;
}

function render(filter = "all"){
  grid.innerHTML = productos
    .filter(p => filter === "all" ? true : p.tipo === filter)
    .map(cardHTML)
    .join("");

  revealOnScroll();
}

// Filtros
chips.forEach(chip => {
  chip.addEventListener("click", () => {
    chips.forEach(c => { c.classList.remove("is-active"); c.setAttribute("aria-selected","false"); });
    chip.classList.add("is-active");
    chip.setAttribute("aria-selected","true");
    render(chip.dataset.filter);
  });
});

// Intersección para animación
function revealOnScroll(){
  const cards = d.querySelectorAll(".card");
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced){
    cards.forEach(c => c.classList.add("reveal"));
    return;
  }
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if(e.isIntersecting){ e.target.classList.add("reveal"); io.unobserve(e.target); } });
  }, {threshold: .12});
  cards.forEach(c => io.observe(c));
}

// Menú móvil
const navToggle = d.querySelector(".nav-toggle");
const menu = d.querySelector(".menu");
navToggle?.addEventListener("click", () => {
  const open = menu.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", open ? "true" : "false");
});

// Tema claro/oscuro
const root = d.documentElement;
const themeBtn = d.getElementById("themeToggle");
function setTheme(t){ root.setAttribute("data-theme", t); localStorage.setItem("theme", t); themeBtn.textContent = t === "light" ? "🌞" : "🌙"; }
const saved = localStorage.getItem("theme");
setTheme(saved || "dark");
themeBtn?.addEventListener("click", () => {
  const t = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
  setTheme(t);
});

// Año en footer
d.getElementById("year").textContent = new Date().getFullYear();

// Inicial
render("all");
