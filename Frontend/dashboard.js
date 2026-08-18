// ======================================
// Voice CRM Dashboard
// ======================================

const API_URL = "http://127.0.0.1:8000/records";

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


        // ==================================
        // USER MESSAGE
        // ==================================

        alert(
            "Unable to load CRM records.\n\n" +
            "Please make sure the FastAPI backend is running on:\n" +
            "http://127.0.0.1:8000\n\n" +
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


    modal.style.display = "block";

    modalBody.innerHTML = "";


    // ==================================
    // SHOW ALL RECORD FIELDS
    // ==================================

    Object.keys(record).forEach((key) => {

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
}


// ======================================
// CLOSE MODAL
// ======================================

if (closeBtn) {

    closeBtn.addEventListener(
        "click",
        () => {

            modal.style.display = "none";
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

            modal.style.display =
                "none";
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

            modal.style.display =
                "none";
        }
    }
);