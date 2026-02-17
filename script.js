// @ts-nocheck
// ── Colores por país (inspirados en bandera) ──────────────
const COUNTRY_COLORS = {
    'México': '#006847',
    'Argentina': '#74ACDF',
    'Brasil': '#E8C900', 'Brazil': '#E8C900',
    'España': '#C60B1E', 'Spain': '#C60B1E',
    'Portugal': '#7B2D47',
    'Ecuador': '#C8A600',
    'Chile': '#8B0000',
    'Colombia': '#A07800',
    'Venezuela': '#007A3D',
    'Perú': '#D91023', 'Peru': '#D91023',
    'Uruguay': '#5B8BE0',
    'Bolivia': '#F4C430',
    'Paraguay': '#D52B1E',
    'Guatemala': '#4997D0',
    'Honduras': '#338FD1',
    'El Salvador': '#0F47AF',
    'Nicaragua': '#003476',
    'Costa Rica': '#002B7F',
    'Panamá': '#DA121A',
    'Cuba': '#CF142B',
    'República Dominicana': '#002D62',
    'Puerto Rico': '#ED0C0C',
};
const DEFAULT_COLOR = '#888888';

function getCountryColor(pais) {
    return COUNTRY_COLORS[pais] || DEFAULT_COLOR;
}

function createCustomMarker(lat, lng, color) {
    const icon = L.divIcon({
        className: '',
        html: '<div class="custom-marker" style="background:' + color + ';"></div>',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
        popupAnchor: [0, -10],
    });
    return L.marker([lat, lng], { icon });
}

// ── Inicializar mapa ──────────────────────────────────────
var map = L.map('map').setView([-10, -60], 3);

L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
}).addTo(map);


// ── Estado global ─────────────────────────────────────────
let labs = [];
let markers = [];
let countries = new Set();
let fuse = null;

// ── Referencias DOM ───────────────────────────────────────
const countryFilter = document.getElementById('country-filter');
const modalOverlay = document.getElementById('modal-overlay');
const modalContent = document.getElementById('modal-content');
const modalClose = document.getElementById('modal-close');
const searchInput = document.getElementById('search-input');

// ── Carga CSV ─────────────────────────────────────────────
fetch('data.csv')
    .then(response => {
        if (!response.ok) throw new Error('Error al cargar el archivo CSV');
        return response.text();
    })
    .then(data => {
        Papa.parse(data, {
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                results.data.forEach((row) => {
                    const latKey = Object.keys(row).find(k => k.trim() === 'Latitud');
                    const lngKey = Object.keys(row).find(k => k.trim() === 'Longitud');
                    const latValue = latKey ? row[latKey] : null;
                    const lngValue = lngKey ? row[lngKey] : null;

                    if (!latValue || !lngValue) return;
                    const lat = parseFloat(latValue);
                    const lng = parseFloat(lngValue);
                    if (isNaN(lat) || isNaN(lng)) return;

                    const nombre = row['Nombre del laboratorio'] || 'Sin nombre';
                    const ciudad = row.Ciudad || '';
                    const pais = row.Pais || '';
                    const descripcion = row['Descripción del laboratorio'] || '';
                    const fechaComienzo = row['Fecha de comienzo del Laboratorio'] || '';
                    const paginaWeb = row['Página web'] || '';
                    const instagram = row.Instagram || '';
                    const facebook = row.Facebook || '';
                    const twitter = row.Twitter || '';
                    const spotify = row.Spotify || '';
                    const linkedin = row.Linkedin || '';
                    const tiktokKey = Object.keys(row).find(k => k.trim() === 'Tik Tok');
                    const tiktok = tiktokKey ? row[tiktokKey] || '' : '';
                    const twitch = row.Twitch || '';
                    const youtube = row.Youtube || '';
                    const representante = row['Persona que viaja a Monterrey'] || '';
                    const cargoRepresentante = row['Cargo del representante'] || '';
                    const semblanza = row['Semblanza del representante'] || '';
                    const imagen = row.Imagen || '';
                    const flickr = row.Flickr || '';

                    if (pais) countries.add(pais);

                    const labIndex = labs.length;
                    labs.push({
                        nombre, ciudad, pais, descripcion, fechaComienzo,
                        paginaWeb, instagram, facebook, twitter, spotify,
                        linkedin, tiktok, twitch, youtube, representante,
                        cargoRepresentante, semblanza, imagen, flickr, lat, lng,
                    });

                    // Popup con DOM seguro
                    const color = getCountryColor(pais);
                    const popupDiv = document.createElement('div');
                    if (imagen) {
                        const img = document.createElement('img');
                        img.src = imagen;
                        img.alt = nombre;
                        img.style.cssText = 'width:100px;height:auto;';
                        img.onerror = function() { this.style.display = 'none'; };
                        popupDiv.appendChild(img);
                    }
                    const h3 = document.createElement('h3');
                    h3.textContent = nombre;
                    h3.style.cursor = 'pointer';
                    h3.addEventListener('click', () => showLabInfo(labIndex));
                    popupDiv.appendChild(h3);

                    const marker = createCustomMarker(lat, lng, color)
                        .bindPopup(popupDiv)
                        .addTo(map);
                    markers.push({ marker, labIndex });
                });

                populateCountryFilter();

                fuse = new Fuse(labs, {
                    keys: ['nombre', 'ciudad', 'pais', 'descripcion', 'representante'],
                    threshold: 0.4,
                    ignoreLocation: true,
                });

                renderPanel(labs.map((_, i) => i));
                updateResultsCount(labs.length);
            }
        });
    })
    .catch(error => console.error('Error cargando el CSV:', error));

// ── Filtros ───────────────────────────────────────────────
function getFilteredIndices(selectedCountry, searchQuery) {
    let indices;
    if (searchQuery && fuse) {
        indices = fuse.search(searchQuery).map(r => r.refIndex);
    } else {
        indices = labs.map((_, i) => i);
    }
    if (selectedCountry) {
        indices = indices.filter(i => labs[i].pais === selectedCountry);
    }
    return indices;
}

function filterMarkers() {
    if (!labs.length) return;
    const selectedCountry = countryFilter.value;
    const searchQuery = searchInput ? searchInput.value.trim() : '';
    const visibleIndices = getFilteredIndices(selectedCountry, searchQuery);
    const visibleSet = new Set(visibleIndices);

    markers.forEach(({ marker, labIndex }) => {
        if (visibleSet.has(labIndex)) {
            if (!map.hasLayer(marker)) marker.addTo(map);
        } else {
            if (map.hasLayer(marker)) map.removeLayer(marker);
        }
    });

    updateResultsCount(visibleIndices.length);
    renderPanel(visibleIndices);
}

function updateResultsCount(visible) {
    const el = document.getElementById('results-count');
    if (el) el.textContent = 'Mostrando ' + visible + ' de ' + labs.length + ' laboratorios';
}

// ── Panel lateral ─────────────────────────────────────────
function renderPanel(indices) {
    const list = document.getElementById('lab-list');
    if (!list) return;
    list.textContent = '';

    const sorted = [...indices].sort((a, b) => labs[a].pais.localeCompare(labs[b].pais));

    sorted.forEach(i => {
        const lab = labs[i];
        const color = getCountryColor(lab.pais);

        const li = document.createElement('li');
        li.className = 'lab-item';
        li.style.color = color;
        li.dataset.index = i;

        if (lab.imagen) {
            const img = document.createElement('img');
            img.className = 'lab-item-img';
            img.src = lab.imagen;
            img.alt = lab.nombre;
            img.onerror = function() {
                if (!this.parentNode) return;
                const placeholder = document.createElement('div');
                placeholder.className = 'lab-item-img-placeholder';
                this.parentNode.replaceChild(placeholder, this);
            };
            li.appendChild(img);
        } else {
            const placeholder = document.createElement('div');
            placeholder.className = 'lab-item-img-placeholder';
            li.appendChild(placeholder);
        }

        const info = document.createElement('div');
        info.className = 'lab-item-info';

        const nameEl = document.createElement('div');
        nameEl.className = 'lab-item-name';
        nameEl.textContent = lab.nombre;

        const locationEl = document.createElement('div');
        locationEl.className = 'lab-item-location';
        locationEl.textContent = [lab.ciudad, lab.pais].filter(Boolean).join(', ');

        info.appendChild(nameEl);
        info.appendChild(locationEl);
        li.appendChild(info);

        li.addEventListener('click', () => {
            document.querySelectorAll('.lab-item').forEach(el => el.classList.remove('active'));
            li.classList.add('active');
            showLabInfo(i);
        });

        list.appendChild(li);
    });
}

// ── Toggle panel ──────────────────────────────────────────
const panelToggleBtn = document.getElementById('panel-toggle');
if (panelToggleBtn) {
    panelToggleBtn.addEventListener('click', () => {
        const panel = document.getElementById('side-panel');
        panel.classList.toggle('collapsed');
        setTimeout(() => map.invalidateSize(), 310);
    });
}

// ── Poblar filtro de países ───────────────────────────────
function populateCountryFilter() {
    Array.from(countries).sort().forEach(country => {
        const option = document.createElement('option');
        option.value = country;
        option.textContent = country;
        countryFilter.appendChild(option);
    });
}

// ── Event listeners filtros ───────────────────────────────
countryFilter.addEventListener('change', filterMarkers);

let searchDebounce = null;
if (searchInput) {
    searchInput.addEventListener('input', () => {
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(filterMarkers, 200);
    });
}

// ── Modal ─────────────────────────────────────────────────
function showLabInfo(index) {
    const lab = labs[index];
    map.closePopup();
    map.setView([lab.lat, lab.lng], 10, { animate: true });

    // Sincronizar panel
    document.querySelectorAll('.lab-item').forEach(el => el.classList.remove('active'));
    const activeItem = document.querySelector('.lab-item[data-index="' + index + '"]');
    if (activeItem) {
        activeItem.classList.add('active');
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Construir contenido modal con DOM seguro
    const container = document.createDocumentFragment();

    const h2 = document.createElement('h2');
    h2.id = 'modal-title';
    h2.textContent = lab.nombre;
    container.appendChild(h2);

    if (lab.imagen) {
        const img = document.createElement('img');
        img.src = lab.imagen;
        img.alt = lab.nombre;
        img.onerror = function() { this.style.display = 'none'; };
        container.appendChild(img);
    }

    if (lab.ciudad || lab.pais) {
        const p = document.createElement('p');
        const strong = document.createElement('strong');
        strong.textContent = 'Ubicación: ';
        p.appendChild(strong);
        p.appendChild(document.createTextNode([lab.ciudad, lab.pais].filter(Boolean).join(', ')));
        container.appendChild(p);
    }

    if (lab.descripcion) {
        const p = document.createElement('p');
        const strong = document.createElement('strong');
        strong.textContent = 'Descripción: ';
        p.appendChild(strong);
        p.appendChild(document.createTextNode(lab.descripcion));
        container.appendChild(p);
    }

    if (lab.fechaComienzo) {
        const p = document.createElement('p');
        const strong = document.createElement('strong');
        strong.textContent = 'Fecha de comienzo: ';
        p.appendChild(strong);
        p.appendChild(document.createTextNode(lab.fechaComienzo));
        container.appendChild(p);
    }

    // Redes sociales
    const socialDefs = [
        { key: 'paginaWeb', cls: 'website', icon: 'fas fa-globe', title: 'Sitio web' },
        { key: 'instagram', cls: 'instagram', icon: 'fab fa-instagram', title: 'Instagram' },
        { key: 'facebook', cls: 'facebook', icon: 'fab fa-facebook-f', title: 'Facebook' },
        { key: 'twitter', cls: 'twitter', icon: 'fab fa-x-twitter', title: 'X (Twitter)' },
        { key: 'linkedin', cls: 'linkedin', icon: 'fab fa-linkedin-in', title: 'LinkedIn' },
        { key: 'youtube', cls: 'youtube', icon: 'fab fa-youtube', title: 'YouTube' },
        { key: 'spotify', cls: 'spotify', icon: 'fab fa-spotify', title: 'Spotify' },
        { key: 'tiktok', cls: 'tiktok', icon: 'fab fa-tiktok', title: 'TikTok' },
        { key: 'twitch', cls: 'twitch', icon: 'fab fa-twitch', title: 'Twitch' },
        { key: 'flickr', cls: 'flickr', icon: 'fab fa-flickr', title: 'Flickr' },
    ];

    const activeSocials = socialDefs.filter(s => lab[s.key]);
    if (activeSocials.length > 0) {
        const div = document.createElement('div');
        div.className = 'social-links';
        activeSocials.forEach(s => {
            const a = document.createElement('a');
            a.href = lab[s.key];
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.className = 'social-link ' + s.cls;
            a.title = s.title;
            const i = document.createElement('i');
            i.className = s.icon;
            a.appendChild(i);
            div.appendChild(a);
        });
        container.appendChild(div);
    }

    // Representante
    if (lab.representante) {
        const section = document.createElement('div');
        section.className = 'representative-section';

        const h3 = document.createElement('h3');
        h3.textContent = 'Representante';
        section.appendChild(h3);

        const pName = document.createElement('p');
        const strong = document.createElement('strong');
        strong.textContent = lab.representante;
        pName.appendChild(strong);
        section.appendChild(pName);

        if (lab.cargoRepresentante) {
            const p = document.createElement('p');
            p.textContent = lab.cargoRepresentante;
            section.appendChild(p);
        }

        if (lab.semblanza) {
            const p = document.createElement('p');
            p.textContent = lab.semblanza;
            section.appendChild(p);
        }

        container.appendChild(section);
    }

    modalContent.textContent = '';
    modalContent.appendChild(container);
    openModal();
}

function openModal() {
    modalOverlay.classList.add('active');
}

function closeModal() {
    modalOverlay.classList.remove('active');
}

modalClose.addEventListener('click', closeModal);

modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay.classList.contains('active')) closeModal();
});
