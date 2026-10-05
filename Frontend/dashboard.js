// ======================================
// Voice CRM Dashboard
// ======================================

const API_URL = "https://voice-crm-mehd.onrender.com/records";


// ======================================
// DOM ELEMENTS
// ======================================

const tableBody = document.getElementById("tableBody");
const totalReports = document.getElementById("totalReports");
const negotiationCount = document.getElementById("negotiationCount");
const todayReports = document.getElementById("todayReports");
const companyCount = document.getElementById("companyCount");

const searchInput = document.getElementById("searchInput");
const refreshBtn = document.getElementById("refreshBtn");

const modal = document.getElementById("detailsModal");
const modalBody = document.getElementById("modalBody");
const closeBtn = document.querySelector(".close");


let allRecords = [];


// ======================================
// MANAGER MAP VARIABLES
// ======================================

let visitMapInstance = null;
let visitMarker = null;


// ======================================
// PAGE LOAD
// ======================================

document.addEventListener("DOMContentLoaded", () => {

    console.log("====================================");
    console.log("📊 Voice CRM Dashboard Started");
    console.log("====================================");

    loadRecords();
});


// ======================================
// ESCAPE HTML
// ======================================

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ======================================
// SAFE VALUE
// ======================================

function safeValue(value) {

    if (
        value === null ||
        value === undefined ||
        String(value).trim() === ""
    ) {
        return "-";
    }

    return escapeHtml(value);
}


// ======================================
// LOAD RECORDS FROM BACKEND
// ======================================

async function loadRecords() {

    console.log("📡 Fetching CRM records...");
    console.log("API:", API_URL);

    if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.textContent = "Loading...";
    }

    try {

        const response = await fetch(API_URL, {
            method: "GET",
            headers: {
                "Accept": "application/json"
            },
            cache: "no-store"
        });


        // ==================================
        // RESPONSE STATUS CHECK
        // ==================================

        if (!response.ok) {

            const errorText = await response.text();

            console.error(
                "❌ Backend returned error:",
                response.status,
                errorText
            );

            throw new Error(
                `Backend error ${response.status}: ${errorText}`
            );
        }


        // ==================================
        // JSON RESPONSE
        // ==================================

        const result = await response.json();

        console.log("✅ Backend response received:");
        console.log(result);


        // ==================================
        // CHECK RESPONSE FORMAT
        // ==================================

        if (!result) {
            throw new Error("Backend returned an empty response.");
        }

        if (!Array.isArray(result.data)) {

            console.error(
                "❌ Unexpected response format:",
                result
            );

            throw new Error(
                "Backend response does not contain a valid 'data' array."
            );
        }


        // ==================================
        // SAVE RECORDS
        // ==================================

        allRecords = result.data;

        console.log(
            `✅ ${allRecords.length} CRM records loaded.`
        );


        // ==================================
        // UPDATE DASHBOARD
        // ==================================

        populateTable(allRecords);
        updateCards(allRecords);

    } catch (error) {

        console.error(
            "❌ Unable to load CRM records:"
        );

        console.error(error);

        allRecords = [];

        populateTable([]);
        updateCards([]);

        alert(
            "Unable to load CRM records.\n\n" +
            "Please check that the backend is running.\n\n" +
            "Check the browser Console for the exact error."
        );

    } finally {

        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.textContent = "Refresh";
        }
    }
}


// ======================================
// POPULATE TABLE
// ======================================

function populateTable(records) {

    if (!tableBody) {

        console.error(
            "❌ tableBody element not found."
        );

        return;
    }

    tableBody.innerHTML = "";


    // ==================================
    // NO RECORDS
    // ==================================

    if (!records || records.length === 0) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    No CRM records found.
                </td>
            </tr>
        `;

        return;
    }


    // ==================================
    // RECORDS
    // ==================================

    records.forEach((record) => {

        const recordKey =
            record.Record_ID ||
            record.id ||
            "";


        // ==================================
        // STATUS BADGE
        // ==================================

        let badgeClass = "default";

        const rawStatus =
            record.SPANCOP_Status;

        const status =
            rawStatus
                ? String(rawStatus).trim().toLowerCase()
                : "";

        if (status === "negotiation") {

            badgeClass = "negotiation";

        } else if (status === "close") {

            badgeClass = "close";

        } else if (status === "order") {

            badgeClass = "order";

        } else if (status === "prospect") {

            badgeClass = "prospect";

        } else if (status === "approach") {

            badgeClass = "approach";

        } else if (status === "suspect") {

            badgeClass = "suspect";

        } else if (status === "post-sale") {

            badgeClass = "post-sale";
        }


        // ==================================
        // TABLE ROW
        // ==================================

        const row = document.createElement("tr");

        row.innerHTML = `

            <td>
                ${safeValue(record.Record_ID)}
            </td>

            <td>
                ${safeValue(record.Created_By)}
            </td>

            <td>
                ${safeValue(record.Company)}
            </td>

            <td>
                ${safeValue(record.NameDesignationofPersonMet)}
            </td>

            <td>
                ${safeValue(record.DateofVisit)}
            </td>

            <td>
                ${safeValue(record.Item_Type)}
            </td>

            <td>
                <span class="status ${badgeClass}">
                    ${safeValue(record.SPANCOP_Status)}
                </span>
            </td>

            <td>
                <button
                    type="button"
                    class="view-btn"
                    data-record-id="${escapeHtml(recordKey)}"
                >
                    View
                </button>
            </td>
        `;


        // ==================================
        // VIEW BUTTON
        // ==================================

        const viewButton =
            row.querySelector(".view-btn");

        if (viewButton) {

            viewButton.addEventListener(
                "click",
                () => {

                    showDetails(recordKey);
                }
            );
        }

        tableBody.appendChild(row);
    });
}


// ======================================
// UPDATE DASHBOARD CARDS
// ======================================

function updateCards(records) {

    const safeRecords =
        Array.isArray(records)
            ? records
            : [];


    // ==================================
    // TOTAL REPORTS
    // ==================================

    if (totalReports) {

        totalReports.textContent =
            safeRecords.length;
    }


    // ==================================
    // NEGOTIATION COUNT
    // ==================================

    const negotiation =
        safeRecords.filter((record) => {

            return String(
                record.SPANCOP_Status ?? ""
            )
                .trim()
                .toLowerCase() === "negotiation";
        });

    if (negotiationCount) {

        negotiationCount.textContent =
            negotiation.length;
    }


    // ==================================
    // COMPANY COUNT
    // ==================================

    const companies =
        new Set(

            safeRecords
                .map(
                    (record) =>
                        record.Company
                )
                .filter(
                    (company) =>
                        company !== null &&
                        company !== undefined &&
                        String(company).trim() !== ""
                )
                .map(
                    (company) =>
                        String(company).trim().toLowerCase()
                )
        );

    if (companyCount) {

        companyCount.textContent =
            companies.size;
    }


    // ==================================
    // TODAY'S REPORTS
    // ==================================

    const today =
        new Date()
            .toISOString()
            .split("T")[0];

    const todayCount =
        safeRecords.filter((record) => {

            if (!record.Created_Date) {
                return false;
            }

            return String(
                record.Created_Date
            ).substring(0, 10) === today;
        });

    if (todayReports) {

        todayReports.textContent =
            todayCount.length;
    }
}


// ======================================
// SEARCH
// ======================================

if (searchInput) {

    searchInput.addEventListener(
        "input",
        function () {

            const value =
                this.value
                    .trim()
                    .toLowerCase();

            if (!value) {

                populateTable(allRecords);
                return;
            }

            const filtered =
                allRecords.filter((record) => {

                    const searchableFields = [

                        record.Company,
                        record.Record_ID,
                        record.Created_By,
                        record.NameDesignationofPersonMet,
                        record.Item_Type,
                        record.DateofVisit,
                        record.SPANCOP_Status,
                        record.ObjectiveofVisit,
                        record.RemarksWayForward

                    ];

                    return searchableFields
                        .filter(
                            (field) =>
                                field !== null &&
                                field !== undefined
                        )
                        .some(
                            (field) =>
                                String(field)
                                    .toLowerCase()
                                    .includes(value)
                        );
                });

            populateTable(filtered);
        }
    );
}


// ======================================
// REFRESH BUTTON
// ======================================

if (refreshBtn) {

    refreshBtn.addEventListener(
        "click",
        () => {

            console.log(
                "🔄 Refreshing CRM records..."
            );

            loadRecords();
        }
    );
}


// ======================================
// RENDER VISIT LOCATION MAP
// ======================================

function renderVisitLocationMap(record) {

    const latitude = parseFloat(record.Latitude);
    const longitude = parseFloat(record.Longitude);
    const accuracy = parseFloat(record.Location_Accuracy);


    // ==================================
    // CHECK VALID LOCATION
    // ==================================

    const hasValidLocation =
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180;


    // ==================================
    // LOCATION SECTION
    // ==================================

    const locationSection =
        document.createElement("div");

    locationSection.className =
        "visit-location-section";


    const heading =
        document.createElement("h3");

    heading.textContent =
        "📍 Visit Location";

    locationSection.appendChild(heading);


    // ==================================
    // NO LOCATION
    // ==================================

    if (!hasValidLocation) {

        const message =
            document.createElement("p");

        message.textContent =
            "Location not available for this visit.";

        locationSection.appendChild(message);

        modalBody.appendChild(locationSection);

        return;
    }


    // ==================================
    // ACCURACY
    // ==================================

    const locationInfo =
        document.createElement("p");

    if (
        Number.isFinite(accuracy) &&
        accuracy > 0
    ) {

        locationInfo.textContent =
            `Accuracy: approximately ${Math.round(accuracy)} meters`;

    } else {

        locationInfo.textContent =
            "Accuracy not available";
    }

    locationSection.appendChild(locationInfo);


    // ==================================
    // MAP CONTAINER
    // ==================================

    const mapContainer =
        document.createElement("div");

    mapContainer.id =
        "managerVisitMap";

    mapContainer.style.width =
        "100%";

    mapContainer.style.height =
        "350px";

    mapContainer.style.marginTop =
        "15px";

    mapContainer.style.borderRadius =
        "14px";

    mapContainer.style.overflow =
        "hidden";

    locationSection.appendChild(
        mapContainer
    );

    modalBody.appendChild(
        locationSection
    );


    // ==================================
    // CHECK LEAFLET
    // ==================================

    if (typeof L === "undefined") {

        mapContainer.innerHTML =
            "<p style='padding:16px;'>Map library could not be loaded.</p>";

        return;
    }


    // ==================================
    // REMOVE OLD MAP
    // ==================================

    if (visitMapInstance) {

        visitMapInstance.remove();

        visitMapInstance = null;
        visitMarker = null;
    }


    // ==================================
    // CREATE MAP
    // ==================================

    visitMapInstance =
        L.map("managerVisitMap")
            .setView(
                [latitude, longitude],
                16
            );


    // ==================================
    // OPENSTREETMAP TILES
    // ==================================

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,
            attribution:
                "&copy; OpenStreetMap contributors"
        }
    ).addTo(
        visitMapInstance
    );

// ==================================
// PROFESSIONAL VISIT MARKER
// ==================================

const visitIcon = L.divIcon({
    className: "custom-visit-marker",
    html: `
        <div class="visit-pin">
            <div class="visit-pin-dot"></div>
        </div>
    `,
    iconSize: [42, 42],
    iconAnchor: [21, 42]
});

visitMarker =
    L.marker(
        [latitude, longitude],
        { icon: visitIcon }
    )
    .addTo(visitMapInstance);
 



    // ==================================
    // ACCURACY CIRCLE
    // ==================================

    if (
        Number.isFinite(accuracy) &&
        accuracy > 0
    ) {

       L.circle(
    [latitude, longitude],
    {
        radius: accuracy,
        color: "#0057B8",
        weight: 1.5,
        opacity: 0.55,
        fillColor: "#00AEEF",
        fillOpacity: 0.10
    }
).addTo(
    visitMapInstance
);
    }


    // ==================================
// FIX MAP SIZE INSIDE MODAL
// ==================================

const fixMapSize = () => {

    if (!visitMapInstance) {
        return;
    }

    visitMapInstance.invalidateSize({
        pan: false,
        animate: false
    });

    visitMapInstance.setView(
        [latitude, longitude],
        16,
        {
            animate: false
        }
    );

    visitMapInstance.eachLayer((layer) => {
        if (layer instanceof L.TileLayer) {
            layer.redraw();
        }
    });
};


// Run after the modal has become visible
requestAnimationFrame(() => {

    requestAnimationFrame(() => {

        fixMapSize();

    });

});


// Run again after the browser finishes layout
setTimeout(fixMapSize, 150);

setTimeout(fixMapSize, 400);

setTimeout(fixMapSize, 800);
}


// ======================================
// SHOW DETAILS
// ======================================

function showDetails(id) {

    const record =
        allRecords.find(
            (item) => {

                const recordId =
                    item.Record_ID ||
                    item.id ||
                    "";

                return String(recordId) === String(id);
            }
        );


    if (!record) {

        console.error(
            "❌ Record not found:",
            id
        );

        return;
    }


    if (!modal || !modalBody) {

        console.error(
            "❌ Details modal elements not found."
        );

        return;
    }


    // ==================================
    // REMOVE PREVIOUS MAP
    // ==================================

    if (visitMapInstance) {

        visitMapInstance.remove();

        visitMapInstance = null;
        visitMarker = null;
    }


    modal.style.display =
        "block";

    modalBody.innerHTML =
        "";


    // ==================================
    // SHOW ALL RECORD FIELDS
    // ==================================

    Object.keys(record).forEach((key) => {

        // Don't show raw coordinates as normal rows.
        // They will be shown visually on the map instead.

        if (
            key === "Latitude" ||
            key === "Longitude" ||
            key === "Location_Accuracy"
        ) {
            return;
        }


        const row =
            document.createElement("div");

        row.className =
            "detail-row";


        row.innerHTML = `

            <div class="detail-label">
                ${escapeHtml(key)}
            </div>

            <div class="detail-value">
                ${safeValue(record[key])}
            </div>

        `;


        modalBody.appendChild(row);
    });


    // ==================================
    // SHOW MANAGER-ONLY MAP
    // ==================================

    renderVisitLocationMap(record);
}


// ======================================
// CLOSE MODAL
// ======================================

function closeDetailsModal() {

    if (modal) {

        modal.style.display =
            "none";
    }

    if (visitMapInstance) {

        visitMapInstance.remove();

        visitMapInstance = null;
        visitMarker = null;
    }
}


if (closeBtn) {

    closeBtn.addEventListener(
        "click",
        () => {

            closeDetailsModal();
        }
    );
}


// ======================================
// CLOSE MODAL WHEN CLICKING OUTSIDE
// ======================================

window.addEventListener(
    "click",
    (event) => {

        if (
            modal &&
            event.target === modal
        ) {

            closeDetailsModal();
        }
    }
);


// ======================================
// ESC KEY CLOSE MODAL
// ======================================

document.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key === "Escape" &&
            modal
        ) {

            closeDetailsModal();
        }
    }
);