// En script.js
const PATH = 'https://development-phoenix-api.ws.solera.pe';
// const PATH = 'http://localhost:8890';

window.onload = () => {
  loadLocationSelect('department');
};

const departmentSelect = document.getElementById("department");
const provinceSelect = document.getElementById("province");
const districtSelect = document.getElementById("district");

const clearMapButton = document.getElementById('clearMap');

const addressInput = document.getElementById('address');
const submitButton = document.querySelector('#formAddress button[type="submit"]');

let map;
let geocoder;
let markers = [];

async function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: -9.2698933, lng: -74.5096555},
    zoom: 6,
    streetViewControl: false,
    mapTypeControl: false,
  });

  // MAP GEOCODER
  geocoder = new google.maps.Geocoder();

  await fetch(`${PATH}/api/coverage/polygons`, {method: "POST", headers: {"Content-Type": "application/json",}})
    .then(response => response.json())
    .then(polygons => {
      if (polygons.polygons.length) {
        polygons.polygons.forEach(polygon => {
          const coordinates = polygon.coordinates[0];
          const googlePolygon = new google.maps.Polygon({
            paths: coordinates.map(point => ({ lat: point[1], lng: point[0] })),
            strokeColor: '#000000',
            strokeOpacity: 0.8,
            strokeWeight: 1,
            fillColor: '#000000',
            fillOpacity: 0.7,
            map: map
          });
          clearMapButton.disabled = false;
          clearMapButton.classList.remove("opacity-50", "cursor-not-allowed");
        });
      } else {
        clearMapButton.disabled = true;
        clearMapButton.classList.add("opacity-50", "cursor-not-allowed");
      }
    })
    .catch(error => {
      console.error('Error al obtener los polígonos: ', error);
    });
}

const uploadMapFile = async () => {
  const fileInput = document.getElementById('fileInput');
  const wrapperFile = document.getElementById('wrapperFile');
  const wrapperForm = document.getElementById('wrapperForm');
  const selectedFile = fileInput.files[0];

  if (selectedFile) {
    const formData = new FormData();
    formData.append('files', selectedFile);

    await fetch(`${PATH}/api/coverage/upload_map`, {
      method: "POST",
      headers: {
        "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6MSwiaWF0IjoxNjkxMDg5Njg0ODQ5fQ.HRZWgh9RCH5E25zwkDgmDX0ncPC7a7v18_JvKT3hI4U"
      },
      body: formData
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          // wrapperFile.classList.add("hidden");
          // wrapperForm.classList.remove("hidden");
          initMap();
        }
      })
  }
}

const activateSubmit = () => {
  const fileInput = document.getElementById('fileInput');
  const fileBtnSubmit = document.querySelector('#fileBtnSubmit');

  if (fileInput.files.length > 0) {
    fileBtnSubmit.disabled = false;
    fileBtnSubmit.classList.remove("opacity-50", "cursor-not-allowed");
  } else {
    fileBtnSubmit.disabled = true;
    fileBtnSubmit.classList.add("opacity-50", "cursor-not-allowed");
  }
}

const loadLocationSelect = async () => {
  const path = 'location'
  const selectedDepartment = departmentSelect.value;
  await fetchLocation(path, departmentSelect);
  localStorage.setItem("idDepartment", selectedDepartment);
}

const fetchLocation = async (path, selectElement) => {
  await fetch(`${PATH}/api/coverage/${path}`)
    .then((response) => response.json())
    .then((data) => {
      const { location } = data;
      location.forEach((option) => {
        const optionElement = document.createElement("option");
        optionElement.value = option.value;
        optionElement.textContent = option.label;
        selectElement.appendChild(optionElement);
        selectElement.removeAttribute("disabled");
      });
    })
    .catch(err => {
      console.log('🚀 ~ file: main.js:86 ~ loadLocationSelect ~ err:', err);
    });
}

departmentSelect.addEventListener('change', async () => {
  const selectedDepartment = departmentSelect.value;
  const storageSelectedDepartment = localStorage.getItem("idDepartment");
  if (selectedDepartment) {
    if (storageSelectedDepartment !== selectedDepartment) {
      provinceSelect.setAttribute("disabled", "true");
      districtSelect.setAttribute("disabled", "true");
      provinceSelect.innerHTML = "<option value>Seleccione</option>";
      districtSelect.innerHTML = "<option value>Seleccione</option>";
    }
    const path = `location?id_parent_location=${selectedDepartment}`;
    await fetchLocation(path, provinceSelect);
  } else {
    provinceSelect.setAttribute("disabled", "true");
    districtSelect.setAttribute("disabled", "true");
    provinceSelect.innerHTML = "<option value>Seleccione</option>";
    districtSelect.innerHTML = "<option value>Seleccione</option>";
  }
});

provinceSelect.addEventListener('change', async () => {
  const selectedDepartment = departmentSelect.value;
  const selectedProvince = provinceSelect.value;
  const storageSelectedProvince = localStorage.getItem("idProvince");
  if (selectedProvince) {
    if (storageSelectedProvince !== selectedProvince) {
      districtSelect.setAttribute("disabled", "true");
      districtSelect.innerHTML = "<option value>Seleccione</option>";
    }
    const path = `location?id_parent_location=${selectedDepartment}${selectedProvince}`;
    await fetchLocation(path, districtSelect);
    localStorage.setItem("idProvince", selectedProvince);
  } else {
    districtSelect.setAttribute("disabled", "true");
    districtSelect.innerHTML = "<option value>Seleccione</option>";
  }
});

districtSelect.addEventListener('change', async () => {
  const selectedDistrict = districtSelect.value;
  if (selectedDistrict) {
    addressInput.removeAttribute("disabled");
    addressInput.classList.remove("opacity-70", "cursor-not-allowed");
  } else {
    districtSelect.setAttribute("disabled", "true");
    districtSelect.innerHTML = "<option value>Seleccione</option>";
  }
});

submitButton.addEventListener('click', function (event) {
  event.preventDefault();

  clearMarkers();

  const address = addressInput.value;

  const labelDistrict = districtSelect.options[districtSelect.selectedIndex].text;

  const fullAddress = `${address}, ${labelDistrict}`;

  const geocodeOptions = {
    address: fullAddress,
    componentRestrictions: {
      country: 'PE',
    },
  }

  // Realizar la búsqueda geográfica
  geocoder.geocode(geocodeOptions, async function (results, status) {
    if (status === 'OK' && results[0]) {
      const location = results[0].geometry.location;

      const marker = new google.maps.Marker({
        position: location,
        map: map,
        title: address,
      });

      markers.push(marker);

      map.setCenter(location);
      map.setZoom(18);

      await fetch(`${PATH}/api/coverage/validate?lat=${location.lat()}&lng=${location.lng()}`)
        .then((response) => response.json())
        .then((data) => {
          const { inside } = data;
          let message = 'La dirección no cuenta con cobertura';

          if (inside) message = 'HAY COBERTURA EN ESTA DIRECCIÓN';

          alert(message);
          
        })
        .catch(err => {
          console.log('🚀 ~ file: main.js:86 ~ loadLocationSelect ~ err:', err);
        });
    } else {
      // Manejar errores de búsqueda geográfica
      console.error('Error al buscar la dirección:', status);
    }
  });
});

const clearMarkers = () => {
  markers.forEach(function (marker) {
    marker.setMap(null);
  });

  markers = [];
}

clearMapButton.addEventListener('click', async (event) => {
  await fetch(`${PATH}/api/coverage/clean_map`, {
    method: "DELETE",
    headers: {
      "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6MSwiaWF0IjoxNjkxMDg5Njg0ODQ5fQ.HRZWgh9RCH5E25zwkDgmDX0ncPC7a7v18_JvKT3hI4U"
    },
  })
    .then(response => response.json())
    .then(data => {
      console.log('🚀 ~ file: main.js:219 ~ clearMapButton.addEventListener ~ data:', data);
      if (data.success) {
        initMap();
      }
    })
});