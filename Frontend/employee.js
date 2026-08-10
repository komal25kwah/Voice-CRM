// =====================================
// Voice CRM - Employee Frontend
// =====================================

// =====================================
// HTML ELEMENTS
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

// =====================================
// STEP 2 ELEMENTS
// =====================================

const transcriptSection =
    document.getElementById("transcriptSection");

const transcriptText =
    document.getElementById("transcriptText");

const editTranscriptBtn =
    document.getElementById("editTranscriptBtn");

const continueTranscriptBtn =
    document.getElementById("continueTranscriptBtn");

const transcriptStatus =
    document.getElementById("transcriptStatus");


// =====================================
// RECORDING VARIABLES
// =====================================

let mediaRecorder = null;

let audioChunks = [];

let recordedBlob = null;


// =====================================
// STORE TRANSCRIPT
// =====================================

let currentTranscript = "";


// =====================================
// BACKEND URL
// =====================================

const API_BASE_URL = "http://127.0.0.1:8000";


// =====================================
// START RECORDING
// =====================================

recordBtn.addEventListener("click", async () => {

    try {

        const stream =
            await navigator.mediaDevices.getUserMedia({
                audio: true
            });


        mediaRecorder =
            new MediaRecorder(stream);


        audioChunks = [];

        recordedBlob = null;


        audioPlayer.src = "";

        audioPreview.classList.add("hidden");


        // ---------------------------------
        // Receive audio chunks
        // ---------------------------------

        mediaRecorder.ondataavailable = (event) => {

            if (event.data.size > 0) {

                audioChunks.push(event.data);

            }

        };


        // ---------------------------------
        // Recording stopped
        // ---------------------------------

        mediaRecorder.onstop = () => {

            recordedBlob = new Blob(
                audioChunks,
                {
                    type: "audio/webm"
                }
            );


            if (recordedBlob.size === 0) {

                alert("Recording failed.");

                return;

            }


            console.log(
                "🎙 Recording created successfully"
            );


            const audioURL =
                URL.createObjectURL(recordedBlob);


            audioPlayer.src = audioURL;


            audioPreview.classList.remove(
                "hidden"
            );


            // Stop microphone
            mediaRecorder.stream
                .getTracks()
                .forEach(track => track.stop());

        };


        // Start recording
        mediaRecorder.start();


        recordBtn.disabled = true;

        stopBtn.disabled = false;

        recordBtn.textContent =
            "🔴 Recording...";


    }

    catch (error) {

        console.error(error);

        alert(
            "Microphone permission denied."
        );

    }

});


// =====================================
// STOP RECORDING
// =====================================

stopBtn.addEventListener("click", () => {

    if (
        mediaRecorder &&
        mediaRecorder.state === "recording"
    ) {

        mediaRecorder.stop();

        console.log(
            "⏹ Recording stopped"
        );

    }


    recordBtn.disabled = false;

    stopBtn.disabled = true;

    recordBtn.textContent =
        "🎤 Start Recording";

});


// =====================================
// DELETE RECORDING
// =====================================

deleteRecording.addEventListener(
    "click",
    () => {

        recordedBlob = null;

        audioChunks = [];

        audioPlayer.src = "";

        audioPreview.classList.add(
            "hidden"
        );

        audioFile.value = "";

        recordBtn.disabled = false;

        stopBtn.disabled = true;

        recordBtn.textContent =
            "🎤 Start Recording";


        // Hide transcript if deleting audio
        transcriptSection.classList.add(
            "hidden"
        );

        transcriptText.value = "";

        currentTranscript = "";


        console.log(
            "🗑 Recording deleted"
        );

    }
);


// =====================================
// AUDIO UPLOAD
// =====================================

audioFile.addEventListener(
    "change",
    () => {

        if (audioFile.files.length > 0) {

            // Hide previous transcript
            transcriptSection.classList.add(
                "hidden"
            );

            transcriptText.value = "";

            currentTranscript = "";

            console.log(
                "📁 Audio file selected:",
                audioFile.files[0].name
            );

        }

    }
);


// =====================================
// SUBMIT AUDIO
// =====================================

form.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        // ---------------------------------
        // Validate Employee Name
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
        // Hide previous results
        // ---------------------------------

        success.classList.add(
            "hidden"
        );

        transcriptSection.classList.add(
            "hidden"
        );


        loading.classList.remove(
            "hidden"
        );


        // ---------------------------------
        // Prepare FormData
        // ---------------------------------

        const formData = new FormData();


        // ---------------------------------
        // Uploaded File
        // ---------------------------------

        if (
            audioFile.files.length > 0
        ) {

            formData.append(
                "file",
                audioFile.files[0]
            );

        }


        // ---------------------------------
        // Recorded Audio
        // ---------------------------------

        else if (recordedBlob) {

            formData.append(
                "file",
                recordedBlob,
                "recording.webm"
            );

        }


        // ---------------------------------
        // No Audio
        // ---------------------------------

        else {

            loading.classList.add(
                "hidden"
            );

            alert(
                "Please upload an audio file or record audio first."
            );

            return;

        }


        try {

            console.log(
                "📤 Sending audio for transcription..."
            );


            // =================================
            // STEP 1
            // AUDIO → ENGLISH TRANSCRIPT
            // =================================

            const response =
                await fetch(
                    `${API_BASE_URL}/transcribe-audio`,
                    {
                        method: "POST",
                        body: formData
                    }
                );


            if (!response.ok) {

                throw new Error(
                    "Transcription server error: " +
                    response.status
                );

            }


            const data =
                await response.json();


            console.log(
                "✅ Transcription response:",
                data
            );


            // ---------------------------------
            // Check transcript
            // ---------------------------------

            if (
                !data.transcript
            ) {

                throw new Error(
                    "Transcript was not returned by backend."
                );

            }


            // =================================
            // STEP 2
            // SHOW ENGLISH TRANSCRIPT
            // =================================

            currentTranscript =
                data.transcript;


            transcriptText.value =
                currentTranscript;


            loading.classList.add(
                "hidden"
            );


            transcriptSection.classList.remove(
                "hidden"
            );


            transcriptStatus.textContent =
                "Transcript generated successfully. Please review it.";


            transcriptStatus.className =
                "transcript-status success";


            console.log(
                "✅ English transcript displayed."
            );

        }

        catch (error) {

            loading.classList.add(
                "hidden"
            );


            console.error(
                "❌ Transcription error:",
                error
            );


            alert(
                "❌ " + error.message
            );

        }

    }
);


// =====================================
// EDIT TRANSCRIPT
// =====================================

editTranscriptBtn.addEventListener(
    "click",
    () => {

        // ---------------------------------
        // Enable editing
        // ---------------------------------

        transcriptText.disabled = false;

        transcriptText.focus();


        editTranscriptBtn.textContent =
            "✓ Editing";


        transcriptStatus.textContent =
            "You can now edit the transcript.";


        transcriptStatus.className =
            "transcript-status editing";


        console.log(
            "✏️ Transcript editing enabled"
        );

    }
);


// =====================================
// CONTINUE TO CRM EXTRACTION
// =====================================

continueTranscriptBtn.addEventListener(
    "click",
    async () => {

        // ---------------------------------
        // Get edited transcript
        // ---------------------------------

        const editedTranscript =
            transcriptText.value.trim();


        // ---------------------------------
        // Validate transcript
        // ---------------------------------

        if (!editedTranscript) {

            transcriptStatus.textContent =
                "Please enter a transcript before continuing.";

            transcriptStatus.className =
                "transcript-status error";

            return;

        }


        // ---------------------------------
        // Update stored transcript
        // ---------------------------------

        currentTranscript =
            editedTranscript;


        // ---------------------------------
        // Disable button
        // ---------------------------------

        continueTranscriptBtn.disabled =
            true;


        editTranscriptBtn.disabled =
            true;


        transcriptStatus.textContent =
            "⏳ AI is extracting CRM fields...";


        transcriptStatus.className =
            "transcript-status loading";


        console.log(
            "➡️ Sending edited transcript to AI..."
        );


        try {

            // =================================
            // SEND TRANSCRIPT TO BACKEND
            // =================================

            const response =
                await fetch(
                    `${API_BASE_URL}/extract-crm`,
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
                                editedTranscript

                        })

                    }
                );


            // ---------------------------------
            // Server error
            // ---------------------------------

            if (!response.ok) {

                const errorText =
                    await response.text();

                throw new Error(
                    "CRM extraction failed: " +
                    response.status +
                    " " +
                    errorText
                );

            }


            const data =
                await response.json();


            console.log(
                "✅ CRM extraction response:",
                data
            );


            // =================================
            // CRM EXTRACTION SUCCESS
            // =================================

            transcriptStatus.textContent =
                "✅ CRM fields extracted successfully.";


            transcriptStatus.className =
                "transcript-status success";


            // ---------------------------------
            // Show success
            // ---------------------------------

            success.classList.remove(
                "hidden"
            );


            if (data.Record_ID) {

                recordId.textContent =
                    data.Record_ID;

            }

            else if (
                data.record_id
            ) {

                recordId.textContent =
                    data.record_id;

            }

            else {

                recordId.textContent =
                    "Generated Successfully";

            }


            console.log(
                "🎉 CRM process completed."
            );


        }

        catch (error) {

            console.error(
                "❌ CRM extraction error:",
                error
            );


            transcriptStatus.textContent =
                "❌ " + error.message;


            transcriptStatus.className =
                "transcript-status error";


            alert(
                "❌ " + error.message
            );

        }

        finally {

            continueTranscriptBtn.disabled =
                false;

            editTranscriptBtn.disabled =
                false;

        }

    }
);