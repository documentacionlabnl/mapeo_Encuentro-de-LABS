// Inicializar el mapa centrado en América Latina
var map = L.map('map').setView([-10, -60], 3);

// Agregar capa de tiles
L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
}).addTo(map);

let labs = [];
// Array para almacenar referencias a los marcadores
let markers = [];
// Set para países únicos
let countries = new Set();

// Referencias a elementos del DOM
const countryFilter = document.getElementById('country-filter');
const modalOverlay = document.getElementById('modal-overlay');
const modalContent = document.getElementById('modal-content');
const modalClose = document.getElementById('modal-close');

fetch('data.csv')
    .then(response => {
        if (!response.ok) {
            throw new Error('Error al cargar el archivo CSV');
        }
        return response.text();
    })
    .then(data => {
        Papa.parse(data, {
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                results.data.forEach((row, index) => {
                    // Buscar columnas de coordenadas (pueden tener espacios extra)
                    const latKey = Object.keys(row).find(k => k.trim() === 'Latitud');
                    const lngKey = Object.keys(row).find(k => k.trim() === 'Longitud');

                    const latValue = latKey ? row[latKey] : null;
                    const lngValue = lngKey ? row[lngKey] : null;

                    if (latValue && lngValue) {
                        const lat = parseFloat(latValue);
                        const lng = parseFloat(lngValue);

                        if (isNaN(lat) || isNaN(lng)) return;

                        const nombre = row['Nombre del laboratorio'] || 'Sin nombre';
                        const ciudad = row.Ciudad || '';
                        const pais = row.Pais || '';
                        const descripcion = row['Descripción del laboratorio'] || 'Sin descripción';
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

                        // Agregar país al set
                        if (pais) {
                            countries.add(pais);
                        }

                        // Almacenar datos en array
                        const labIndex = labs.length;
                        labs.push({
                            nombre, ciudad, pais, descripcion, fechaComienzo,
                            paginaWeb, instagram, facebook, twitter, spotify, linkedin, tiktok, twitch, youtube,
                            representante, cargoRepresentante, semblanza, imagen, flickr, lat, lng
                        });

                        let popupContent = '';
                        if (imagen) {
                            popupContent += `<img src="${imagen}" alt="${nombre}" style="width:100px; height:auto;" onerror="this.style.display='none'">`;
                        }
                        popupContent += `<h3 style="cursor:pointer;" onclick="showLabInfo(${labIndex})">${nombre}</h3>`;

                        const marker = L.marker([lat, lng])
                            .addTo(map)
                            .bindPopup(popupContent);

                        // Almacenar referencia al marcador con su índice
                        markers.push({
                            marker: marker,
                            labIndex: labIndex
                        });
                    }
                });

                // Poblar el dropdown de países
                populateCountryFilter();
            }
        });
    })
    .catch(error => console.error('Error cargando el CSV:', error));

// Poblar el filtro de países
function populateCountryFilter() {
    const sortedCountries = Array.from(countries).sort();
    sortedCountries.forEach(country => {
        const option = document.createElement('option');
        option.value = country;
        option.textContent = country;
        countryFilter.appendChild(option);
    });
}

// Función para filtrar marcadores por país
function filterMarkers() {
    const selectedCountry = countryFilter.value;

    markers.forEach(({ marker, labIndex }) => {
        const lab = labs[labIndex];
        const matchesCountry = !selectedCountry || lab.pais === selectedCountry;

        if (matchesCountry) {
            if (!map.hasLayer(marker)) {
                marker.addTo(map);
            }
        } else {
            if (map.hasLayer(marker)) {
                map.removeLayer(marker);
            }
        }
    });
}

// Event listener para filtro de país
countryFilter.addEventListener('change', filterMarkers);

// Función para mostrar información completa del laboratorio en modal
function showLabInfo(index) {
    const lab = labs[index];

    // Cerrar popup abierto
    map.closePopup();

    // Zoom a la ubicación del laboratorio
    map.setView([lab.lat, lab.lng], 10, { animate: true });

    // Construir contenido del modal
    let content = `<h2>${lab.nombre}</h2>`;

    if (lab.imagen) {
        content += `<img src="${lab.imagen}" alt="${lab.nombre}" onerror="this.style.display='none'">`;
    }

    if (lab.ciudad || lab.pais) {
        content += `<p><strong>Ubicación:</strong> ${[lab.ciudad, lab.pais].filter(Boolean).join(', ')}</p>`;
    }

    if (lab.descripcion && lab.descripcion !== 'Sin descripción') {
        content += `<p><strong>Descripción:</strong> ${lab.descripcion}</p>`;
    }

    if (lab.fechaComienzo) {
        content += `<p><strong>Fecha de comienzo:</strong> ${lab.fechaComienzo}</p>`;
    }

    // Construir sección de redes sociales con iconos
    const socialLinks = [];

    if (lab.paginaWeb) {
        socialLinks.push(`<a href="${lab.paginaWeb}" target="_blank" class="social-link website" title="Sitio web"><i class="fas fa-globe"></i></a>`);
    }
    if (lab.instagram) {
        socialLinks.push(`<a href="${lab.instagram}" target="_blank" class="social-link instagram" title="Instagram"><i class="fab fa-instagram"></i></a>`);
    }
    if (lab.facebook) {
        socialLinks.push(`<a href="${lab.facebook}" target="_blank" class="social-link facebook" title="Facebook"><i class="fab fa-facebook-f"></i></a>`);
    }
    if (lab.twitter) {
        socialLinks.push(`<a href="${lab.twitter}" target="_blank" class="social-link twitter" title="X (Twitter)"><i class="fab fa-x-twitter"></i></a>`);
    }
    if (lab.linkedin) {
        socialLinks.push(`<a href="${lab.linkedin}" target="_blank" class="social-link linkedin" title="LinkedIn"><i class="fab fa-linkedin-in"></i></a>`);
    }
    if (lab.youtube) {
        socialLinks.push(`<a href="${lab.youtube}" target="_blank" class="social-link youtube" title="YouTube"><i class="fab fa-youtube"></i></a>`);
    }
    if (lab.spotify) {
        socialLinks.push(`<a href="${lab.spotify}" target="_blank" class="social-link spotify" title="Spotify"><i class="fab fa-spotify"></i></a>`);
    }
    if (lab.tiktok) {
        socialLinks.push(`<a href="${lab.tiktok}" target="_blank" class="social-link tiktok" title="TikTok"><i class="fab fa-tiktok"></i></a>`);
    }
    if (lab.twitch) {
        socialLinks.push(`<a href="${lab.twitch}" target="_blank" class="social-link twitch" title="Twitch"><i class="fab fa-twitch"></i></a>`);
    }
    if (lab.flickr) {
        socialLinks.push(`<a href="${lab.flickr}" target="_blank" class="social-link flickr" title="Flickr"><i class="fab fa-flickr"></i></a>`);
    }

    if (socialLinks.length > 0) {
        content += `<div class="social-links">${socialLinks.join('')}</div>`;
    }

    // Sección del representante
    if (lab.representante) {
        content += `<div class="representative-section">`;
        content += `<h3>Representante</h3>`;
        content += `<p><strong>${lab.representante}</strong></p>`;
        if (lab.cargoRepresentante) {
            content += `<p>${lab.cargoRepresentante}</p>`;
        }
        if (lab.semblanza) {
            content += `<p>${lab.semblanza}</p>`;
        }
        content += `</div>`;
    }

    modalContent.innerHTML = content;
    openModal();
}

// Funciones del modal
function openModal() {
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

// Event listeners para cerrar el modal
modalClose.addEventListener('click', closeModal);

modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
        closeModal();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay.classList.contains('active')) {
        closeModal();
    }
});
