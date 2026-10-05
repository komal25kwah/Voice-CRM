// =====================================
// Voice CRM - Employee Frontend
// =====================================


const API_BASE_URL = "https://voice-crm-mehd.onrender.com";

// =====================================
// DOM ELEMENTS
// =====================================

const form = document.getElementById("uploadForm");
const employeeName = document.getElementById("employeeName");
const audioFile = document.getElementById("audioFile");

const loading = document.getElementById("loading");
const success = document.getElementById("success");
const recordId = document.getElementById("recordId");

const recordBtn = document.getElementById("recordBtn");
const stopBtn = document.getElementById("stopBtn");

const audioPreview = document.getElementById("audioPreview");
const audioPlayer = document.getElementById("audioPlayer");
const deleteRecording = document.getElementById("deleteRecording");

const crmSection = document.getElementById("crmSection");
const crmSummary = document.getElementById("crmSummary");

const missingFieldsSection = document.getElementById("missingFieldsSection");
const missingFieldsMessage = document.getElementById("missingFieldsMessage");
const missingFieldsForm = document.getElementById("missingFieldsForm");

const crmStatus = document.getElementById("crmStatus");

const recordAgainBtn = document.getElementById("recordAgainBtn");
const submitReportBtn = document.getElementById("submitReportBtn");

// =====================================



// =====================================
// CRM FIELDS TO DISPLAY
// =====================================

const SUMMARY_FIELDS = [
    ["Created_By", "Employee"],
    ["Company", "Company"],
    ["Attendees", "Attendees"],
    ["DateofVisit", "Date of Visit"],
    ["ObjectiveofVisit", "Objective of Visit"],
    ["NameDesignationofPersonMet", "Doctor / Person"],
    ["Current_Consumption", "Current Consumption"],
    ["PotentialAccountVol_CM", "Potential Account Volume"],
    ["Current_Supplier", "Current Supplier"],
    ["CommercialOfferingBy_Competition", "Competition / Commercial Offering"],
    ["RemarksWayForward", "Remarks / Way Forward"],
    ["MOMActionItems", "MOM / Action Items"],
    ["SPANCOP_Status", "SPANCOP Status"],
    ["Created_Date", "Created Date"],
    ["CompanyCustomerCode", "Customer Code"],
    ["Company_Segment", "Company Segment"],
    ["CompanyCustomerSince", "Customer Since"],
    ["Sub_Department", "Sub Department"],
    ["Item_Type", "Medicine / Item"],
    ["Path", "Path"]
];


// =====================================
// REQUIRED FIELDS
// =====================================

const REQUIRED_FIELD_CONFIG = {
    NameDesignationofPersonMet: {
        label: "Doctor / Person Name",
        type: "text"
    },

    Item_Type: {
        label: "Medicine / Item Name",
        type: "text"
    },

    DateofVisit: {
        label: "Date of Visit",
        type: "date"
    }
};


// =====================================
// VARIABLES
// =====================================

let mediaRecorder = null;
let audioChunks = [];
let recordedBlob = null;
let currentAudioObjectUrl = "";

let currentCrmData = null;
let currentMissingFieldKeys = [];

// =====================================
// LOCATION STATE
// =====================================

let visitLatitude = null;
let visitLongitude = null;
let visitAccuracy = null;




// =====================================
// HELPER FUNCTIONS
// =====================================

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}


// =====================================
// LOADING
// =====================================

function setLoadingMessage(title, body) {
    loading.innerHTML = `${title}<br><br>${body}`;
}


function showLoading(title, body) {
    setLoadingMessage(title, body);
    loading.classList.remove("hidden");
}


function hideLoading() {
    loading.classList.add("hidden");
}


// =====================================
// CRM STATUS
// =====================================

function setCrmStatus(message, className = "") {
    // FIX: make sure the status line is actually visible even if we
    // haven't rendered CRM data yet (e.g. an error before extraction
    // finishes). Previously crmSection could still be hidden here,
    // silently swallowing the message.
    crmSection.classList.remove("hidden");

    crmStatus.textContent = message;

    crmStatus.className = className
        ? `status-line ${className}`
        : "status-line";
}


// =====================================
// AUDIO PREVIEW
// =====================================

function clearAudioPreview() {

    if (currentAudioObjectUrl) {
        URL.revokeObjectURL(currentAudioObjectUrl);
        currentAudioObjectUrl = "";
    }

    audioPlayer.src = "";
    audioPreview.classList.add("hidden");
}


function showAudioPreview(blobOrFile) {

    clearAudioPreview();

    currentAudioObjectUrl = URL.createObjectURL(blobOrFile);

    audioPlayer.src = currentAudioObjectUrl;

    audioPreview.classList.remove("hidden");
}


// =====================================
// CLEAR AUDIO STATE
// =====================================

function clearAudioState({ clearFile = false } = {}) {

    if (
        mediaRecorder &&
        mediaRecorder.state === "recording"
    ) {
        try {
            mediaRecorder.stop();
        } catch (error) {
            console.warn(
                "Unable to stop active recorder.",
                error
            );
        }
    }

    audioChunks = [];
    recordedBlob = null;

    clearAudioPreview();

    if (clearFile) {
        audioFile.value = "";
    }

    recordBtn.disabled = false;
    stopBtn.disabled = true;

    recordBtn.textContent = "🎤 Start Recording";
}


// =====================================
// RESET CRM STATE
// =====================================
// =====================================
// CAPTURE VISIT LOCATION
// =====================================

function captureVisitLocation() {

    // Check if browser supports location
    if (!navigator.geolocation) {

        locationStatus.textContent =
            "❌ Location is not supported by this browser.";

        return;
    }

    

    // Ask browser for current GPS location
    navigator.geolocation.getCurrentPosition(

        // SUCCESS
        (position) => {

            visitLatitude = position.coords.latitude;
            visitLongitude = position.coords.longitude;
            visitAccuracy = position.coords.accuracy;

            

            console.log("📍 Location captured:", {
                latitude: visitLatitude,
                longitude: visitLongitude,
                accuracy: visitAccuracy
            });
        },

        // ERROR
        (error) => {

            console.error(
                "Location error:",
                error
            );

            
        },

        // OPTIONS
        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        }
    );
}



function resetCRMState() {

    crmSection.classList.add("hidden");

    success.classList.add("hidden");

    crmSummary.innerHTML = "";

    missingFieldsSection.classList.add("hidden");

    missingFieldsMessage.textContent = "";

    missingFieldsForm.innerHTML = "";

    currentCrmData = null;

    currentMissingFieldKeys = [];

    submitReportBtn.disabled = true;

    recordId.textContent = "---";

    crmStatus.textContent = "";
    crmStatus.className = "status-line";

    hideLoading();
}


// =====================================
// RESET COMPLETE WORKFLOW
// =====================================

function resetEntireWorkflow() {

    clearAudioState({
        clearFile: true
    });

    resetCRMState();

visitLatitude = null;
visitLongitude = null;
visitAccuracy = null;


}


// =====================================
// GET AUDIO
// =====================================

function getAudioFileToSubmit() {

    if (
        audioFile.files &&
        audioFile.files.length > 0
    ) {
        return audioFile.files[0];
    }

    return recordedBlob;
}


// =====================================
// RENDER CRM DATA
// =====================================

function renderCrmSummary(data) {

    const summaryHtml = SUMMARY_FIELDS.map(
        ([key, label]) => {

            const rawValue = data?.[key];

            const isMissing =
                rawValue === null ||
                rawValue === undefined ||
                String(rawValue).trim() === "";

            const value = isMissing
                ? "Not extracted"
                : escapeHtml(rawValue);

            const missingClass =
                isMissing
                    ? " is-missing"
                    : "";

            return `
                <div class="summary-item">

                    <span class="summary-label">
                        ${escapeHtml(label)}
                    </span>

                    <div class="summary-value${missingClass}">
                        ${value}
                    </div>

                </div>
            `;
        }
    ).join("");

    crmSummary.innerHTML = summaryHtml;
}


// =====================================
// RENDER MISSING FIELDS
// =====================================

function renderMissingFields(
    fieldKeys,
    data
) {

    if (!fieldKeys.length) {

        missingFieldsSection.classList.add(
            "hidden"
        );

        missingFieldsMessage.textContent = "";

        missingFieldsForm.innerHTML = "";

        return;
    }


    missingFieldsSection.classList.remove(
        "hidden"
    );


    missingFieldsMessage.textContent =
        "The following required information could not be extracted. Please enter it manually.";


    missingFieldsForm.innerHTML =
        fieldKeys.map(
            (fieldKey) => {

                const config =
                    REQUIRED_FIELD_CONFIG[fieldKey] ||
                    {
                        label: fieldKey,
                        type: "text"
                    };


                const value =
                    data?.[fieldKey] ?? "";


                return `
                    <div class="missing-field">

                        <label for="manual-${fieldKey}">
                            ${escapeHtml(config.label)}
                        </label>

                        <input
                            id="manual-${fieldKey}"
                            class="missing-input"
                            type="${config.type}"
                            value="${escapeHtml(value)}"
                            placeholder="Enter ${escapeHtml(config.label)}"
                        >

                    </div>
                `;
            }
        ).join("");
}


// =====================================
// GET MANUAL FIELDS
// =====================================

function getManualFields() {

    const manualFields = {};

    currentMissingFieldKeys.forEach(
        (fieldKey) => {

            const input =
                document.getElementById(
                    `manual-${fieldKey}`
                );

            if (!input) {
                return;
            }

            const value =
                input.value.trim();

            if (value) {
                manualFields[fieldKey] = value;
            }
        }
    );

    return manualFields;
}


// =====================================
// SHOW CRM REVIEW
// =====================================

function showCrmReview(
    data,
    missingFieldLabels,
    missingFieldKeys,
    status
) {

    currentCrmData = data || {};

    currentMissingFieldKeys =
        missingFieldKeys || [];


    crmSection.classList.remove(
        "hidden"
    );


    renderCrmSummary(
        currentCrmData
    );


    renderMissingFields(
        currentMissingFieldKeys,
        currentCrmData
    );


    /*
     * IMPORTANT:
     *
     * Even if fields are missing,
     * user can see the extracted data.
     *
     * If everything is complete,
     * Submit Report is enabled.
     *
     * If something is missing,
     * user fills the missing fields
     * and then submits.
     */

    submitReportBtn.disabled = false;


    if (
        status === "missing_fields"
    ) {

        setCrmStatus(
            `⚠️ Missing required information: ${missingFieldLabels.join(", ")}`,
            "error"
        );

    } else {

        setCrmStatus(
            "✅ All required CRM information was extracted. Review and submit the report.",
            "success"
        );
    }
}

let currentLatitude = null;
let currentLongitude = null;
let currentLocationAccuracy = null;
// =====================================
// START RECORDING
// =====================================

recordBtn.addEventListener(
    "click",
    async () => {

        try {

            resetEntireWorkflow();
            // Capture employee's current visit location
            captureVisitLocation();

            const position = await new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
});

currentLatitude = position.coords.latitude;
currentLongitude = position.coords.longitude;
currentLocationAccuracy = position.coords.accuracy;

console.log(
    "Location:",
    currentLatitude,
    currentLongitude,
    currentLocationAccuracy
);


            const stream =
                await navigator.mediaDevices.getUserMedia({
                    audio: true
                });


            audioFile.value = "";

            clearAudioState();


            mediaRecorder =
                new MediaRecorder(stream);


            audioChunks = [];

            recordedBlob = null;


            mediaRecorder.ondataavailable =
                (event) => {

                    if (
                        event.data.size > 0
                    ) {

                        audioChunks.push(
                            event.data
                        );
                    }
                };


            mediaRecorder.onstop =
                () => {

                    recordedBlob =
                        new Blob(
                            audioChunks,
                            {
                                type: "audio/webm"
                            }
                        );


                    if (
                        recordedBlob.size === 0
                    ) {

                        clearAudioState({
                            clearFile: false
                        });

                        alert(
                            "Recording failed."
                        );

                        return;
                    }


                    showAudioPreview(
                        recordedBlob
                    );


                    if (
                        mediaRecorder &&
                        mediaRecorder.stream
                    ) {

                        mediaRecorder.stream
                            .getTracks()
                            .forEach(
                                (track) =>
                                    track.stop()
                            );
                    }


                    recordBtn.disabled = false;

                    stopBtn.disabled = true;

                    recordBtn.textContent =
                        "🎤 Start Recording";


                    console.log(
                        "🎙 Recording created successfully"
                    );
                };


            mediaRecorder.start();


            recordBtn.disabled = true;

            stopBtn.disabled = false;

            recordBtn.textContent =
                "🔴 Recording...";


        } catch (error) {

            console.error(error);

            alert(
                "Microphone permission denied."
            );
        }
    }
);


// =====================================
// STOP RECORDING
// =====================================

stopBtn.addEventListener(
    "click",
    () => {

        if (
            mediaRecorder &&
            mediaRecorder.state === "recording"
        ) {

            mediaRecorder.stop();

            console.log(
                "⏹ Recording stopped"
            );
        }
    }
);


// =====================================
// DELETE RECORDING
// =====================================

deleteRecording.addEventListener(
    "click",
    () => {

        resetEntireWorkflow();

        console.log(
            "🗑 Recording deleted"
        );
    }
);


// =====================================
// AUDIO FILE SELECTED
// =====================================

audioFile.addEventListener(
    "change",
    () => {

        if (
            audioFile.files.length === 0
        ) {
            return;
        }


        if (
            mediaRecorder &&
            mediaRecorder.state === "recording"
        ) {

            mediaRecorder.stop();
        }


        recordedBlob = null;

        audioChunks = [];


        resetCRMState();


        showAudioPreview(
            audioFile.files[0]
        );


        console.log(
            "📁 Audio file selected:",
            audioFile.files[0].name
        );
    }
);


// =====================================
// SUBMIT AUDIO
// =====================================

form.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        console.log(
            "🎙 Submitting audio..."
        );


        // ---------------------------------
        // CHECK EMPLOYEE NAME
        // ---------------------------------

        if (
            !employeeName.value.trim()
        ) {

            alert(
                "Please enter employee name."
            );

            employeeName.focus();

            return;
        }


        // ---------------------------------
        // CHECK AUDIO
        // ---------------------------------

        const audioSource =
            getAudioFileToSubmit();


        if (!audioSource) {

            alert(
                "Please upload an audio file or record audio first."
            );

            return;
        }


        // ---------------------------------
        // RESET PREVIOUS RESULTS
        // ---------------------------------

        resetCRMState();


        showLoading(
            "⏳ Processing audio...",
            "AI is transcribing your audio. This can take a moment."
        );


        // ---------------------------------
        // CREATE FORM DATA
        // ---------------------------------

        const formData =
            new FormData();


        if (
            audioFile.files.length > 0
        ) {

            formData.append(
                "file",
                audioFile.files[0]
            );

        } else {

            formData.append(
                "file",
                recordedBlob,
                "recording.webm"
            );
        }


        // ---------------------------------
        // SEND AUDIO TO BACKEND
        // ---------------------------------

        try {

            console.log(
                "Calling /transcribe-audio..."
            );


            const response =
                await fetch(
                    `${API_BASE_URL}/transcribe-audio`,
                    {
                        method: "POST",
                        body: formData
                    }
                );


            if (!response.ok) {

                const errorText =
                    await response.text();

                throw new Error(
                    `Audio processing failed: ${response.status} ${errorText}`
                );
            }


            const data =
                await response.json();


            console.log(
                "Audio processing response:",
                data
            );


            if (!data.transcript) {

                throw new Error(
                    "Transcript was not returned by backend."
                );
            }


            // ---------------------------------
            // STEP 2:
            // CRM EXTRACTION (automatic — the
            // transcript itself is never shown
            // to the user)
            // ---------------------------------

            // FIX: update the loading message so the
            // user gets feedback that we've moved on
            // to CRM extraction, instead of the same
            // "Processing audio..." text the whole time.
            showLoading(
                "🧠 Extracting CRM information...",
                "AI is reviewing the conversation and filling in the CRM fields."
            );

            console.log(
                "Calling /process-transcript..."
            );

            console.log(
    "Location being sent to backend:",
    currentLatitude,
    currentLongitude,
    currentLocationAccuracy
);


            const crmResponse =
                await fetch(
                    `${API_BASE_URL}/process-transcript`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({

    employee_name:
        employeeName.value.trim(),

    transcript:
        data.transcript,

    Latitude:
        currentLatitude,

    Longitude:
        currentLongitude,

    Location_Accuracy:
        currentLocationAccuracy
})
                    }
                );


            if (!crmResponse.ok) {

                const errorText =
                    await crmResponse.text();

                throw new Error(
                    `CRM extraction failed: ${crmResponse.status} ${errorText}`
                );
            }


            const crmData =
                await crmResponse.json();


            console.log(
                "CRM extraction response:",
                crmData
            );

            crmData.data.Latitude = currentLatitude;
            crmData.data.Longitude = currentLongitude;
            crmData.data.Location_Accuracy = currentLocationAccuracy;


            // ---------------------------------
            // SHOW CRM RESULT
            // ---------------------------------

            hideLoading();


            showCrmReview(
                crmData.data || {},

                crmData.missing_required_fields || [],

                crmData.missing_required_field_keys || [],

                crmData.status
            );


        } catch (error) {

            hideLoading();

            console.error(
                "❌ Processing error:",
                error
            );


            setCrmStatus(
                error.message,
                "error"
            );


            alert(
                `❌ ${error.message}`
            );
        }
    }
);


// =====================================
// SUBMIT FINAL CRM REPORT
// =====================================
// =====================================



submitReportBtn.addEventListener(
    "click",
    async () => {

        if (!currentCrmData) {

            setCrmStatus(
                "Please process the audio first.",
                "error"
            );

            return;
        }


        // ---------------------------------
        // GET MANUAL VALUES
        // ---------------------------------

        const manualFields =
            getManualFields();


        // ---------------------------------
        // CHECK STILL MISSING
        // ---------------------------------

        const missingInputs =
            currentMissingFieldKeys.filter(
                (fieldKey) =>
                    !manualFields[fieldKey]
            );


        if (
            missingInputs.length > 0
        ) {

            const labels =
                missingInputs.map(
                    (fieldKey) =>
                        REQUIRED_FIELD_CONFIG[
                            fieldKey
                        ]?.label ||
                        fieldKey
                );


            setCrmStatus(
                `Please complete: ${labels.join(", ")}`,
                "error"
            );

            return;
        }


        // ---------------------------------
        // SAVE
        // ---------------------------------

        // ---------------------------------
// ADD VISIT LOCATION
// ---------------------------------

if (currentCrmData) {

    currentCrmData.Latitude =
        visitLatitude !== null
            ? visitLatitude
            : "-";

    currentCrmData.Longitude =
        visitLongitude !== null
            ? visitLongitude
            : "-";

    currentCrmData.Location_Accuracy =
        visitAccuracy !== null
            ? Math.round(visitAccuracy)
            : "-";
}

        console.log(
            "💾 Saving final CRM report..."
        );

        console.log(
    "Location inside currentCrmData before save:",
    currentCrmData?.Latitude,
    currentCrmData?.Longitude,
    currentCrmData?.Location_Accuracy
);


        submitReportBtn.disabled = true;

        recordAgainBtn.disabled = true;


        showLoading(
            "💾 Saving CRM report...",
            "The final report is being saved to Supabase."
        );


        setCrmStatus(
            "Submitting final CRM report...",
            "loading"
        );


        let savedSuccessfully = false;


        try {

            const response =
                await fetch(
                    `${API_BASE_URL}/save-crm`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({

                            employee_name:
                                employeeName.value.trim(),

                            transcript:
                                "",

                            data:
                                currentCrmData,

                            manual_fields:
                                manualFields
                        })
                    }
                );


            if (!response.ok) {

                const errorText =
                    await response.text();

                throw new Error(
                    `CRM save failed: ${response.status} ${errorText}`
                );
            }


            const result =
                await response.json();


            console.log(
                "Save response:",
                result
            );


            // ---------------------------------
            // STILL INCOMPLETE
            // ---------------------------------

            if (
                result.status === "incomplete"
            ) {

                currentCrmData =
                    result.data ||
                    currentCrmData;


                currentMissingFieldKeys =
                    result.missing_required_field_keys ||
                    currentMissingFieldKeys;


                renderCrmSummary(
                    currentCrmData
                );


                renderMissingFields(
                    currentMissingFieldKeys,
                    currentCrmData
                );


                hideLoading();


                setCrmStatus(
                    `⚠️ Still missing: ${(result.missing_required_fields || []).join(", ")}`,
                    "error"
                );


                return;
            }


            // ---------------------------------
            // SUCCESS
            // ---------------------------------

            hideLoading();


            currentCrmData =
                result.data ||
                currentCrmData;


            recordId.textContent =
                result.record_id ||
                currentCrmData?.Record_ID ||
                "Generated Successfully";


            success.classList.remove(
                "hidden"
            );
        // =====================================
    

            setCrmStatus(
                "✅ Report saved successfully to Supabase.",
                "success"
            );


            submitReportBtn.disabled = true;

            savedSuccessfully = true;


        } catch (error) {

            hideLoading();


            console.error(
                "❌ CRM save error:",
                error
            );


            setCrmStatus(
                error.message,
                "error"
            );


            alert(
                `❌ ${error.message}`
            );


        } finally {

            if (!savedSuccessfully) {
                submitReportBtn.disabled = false;
            }

            recordAgainBtn.disabled = false;
        }
    }
);


// =====================================
// RECORD AGAIN
// =====================================

recordAgainBtn.addEventListener(
    "click",
    () => {

        resetEntireWorkflow();

        console.log(
            "🔁 Workflow reset for a new recording."
        );
    }
);