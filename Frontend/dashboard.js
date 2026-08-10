// ======================================
// Voice CRM Dashboard
// ======================================

const API_URL = "http://127.0.0.1:8000/records";

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
// Load Dashboard
// ======================================

window.onload = () => {

    loadRecords();

};


// ======================================
// Fetch Records
// ======================================

async function loadRecords() {

    try {

        const response = await fetch(API_URL);

        const result = await response.json();

        allRecords = result.data;

        populateTable(allRecords);

        updateCards(allRecords);

    }

    catch (error) {

        alert("Unable to load CRM records.");

        console.log(error);

    }

}


// ======================================
// Populate Table
// ======================================

function populateTable(records) {

    tableBody.innerHTML = "";

    records.forEach(record => {

        let badgeClass = "default";

        if(record.SPANCOP_Status){

            const status = record.SPANCOP_Status.toLowerCase();

            if(status === "negotiation") badgeClass = "negotiation";
            else if(status === "close") badgeClass = "close";
            else if(status === "order") badgeClass = "order";

        }

        tableBody.innerHTML += `

        <tr>

            <td>${record.Record_ID}</td>

            <td>${record.Company}</td>

            <td>${record.DateofVisit}</td>

            <td>

                <span class="status ${badgeClass}">
                    ${record.SPANCOP_Status}
                </span>

            </td>

            <td>${record.Path}</td>

            <td>${record.Item_Type}</td>

            <td>

                <button
                    class="view-btn"
                    onclick="showDetails(${record.id})">

                    View

                </button>

            </td>

        </tr>

        `;

    });

}


// ======================================
// Summary Cards
// ======================================

function updateCards(records){

    totalReports.textContent = records.length;

    const negotiation = records.filter(r =>
        r.SPANCOP_Status === "Negotiation"
    );

    negotiationCount.textContent = negotiation.length;

    const companies = new Set(
        records.map(r => r.Company)
    );

    companyCount.textContent = companies.size;

    const today = new Date().toISOString().split("T")[0];

    const todayCount = records.filter(r =>
        r.Created_Date === today
    );

    todayReports.textContent = todayCount.length;

}


// ======================================
// Search
// ======================================

searchInput.addEventListener("keyup", function(){

    const value = this.value.toLowerCase();

    const filtered = allRecords.filter(record =>

        (record.Company || "").toLowerCase().includes(value)

        ||

        (record.Record_ID || "").toLowerCase().includes(value)

    );

    populateTable(filtered);

});

// ======================================
// Refresh
// ======================================

refreshBtn.addEventListener("click", () => {

    loadRecords();

});


// ======================================
// Modal
// ======================================

function showDetails(id){

    const record = allRecords.find(r => r.id === id);

    modal.style.display = "block";

    modalBody.innerHTML = "";

    for(const key in record){

        modalBody.innerHTML += `

        <div class="detail-row">

            <div class="detail-label">

                ${key}

            </div>

            <div class="detail-value">

                ${record[key]}

            </div>

        </div>

        `;

    }

}


// ======================================
// Close Modal
// ======================================

closeBtn.onclick = () => {

    modal.style.display = "none";

}

window.onclick = function(event){

    if(event.target == modal){

        modal.style.display = "none";

    }

}