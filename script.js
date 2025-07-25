let cachedQuestions = [];
let responses = {};

async function loadQuestions() {
    try {
        const response = await fetch('questions.json');
        cachedQuestions = await response.json();
        renderPage(-1);
    } catch (error) {
        console.error("Failed to load questions.json:", error);
    }
}

function renderPage(index) {
    if (index === -1) {
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        document.getElementById('page-1').classList.add('active');
    } else if (index === -2) {
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        document.getElementById('last_page').classList.add('active');
    } else if (index >= 0 && index < cachedQuestions.length) {
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        const container = document.getElementById('quiz-container');
        const question = cachedQuestions[index];
        container.querySelector('.dynamic-question')?.remove();

        const savedBehavior = responses[question.questionNumber]?.behavior || "";
        const savedComments = responses[question.questionNumber]?.comments || "";
        const savedSliderValue = responses[question.questionNumber]?.sliderValue || 0.5;
        const savedStdDev = responses[question.questionNumber]?.standardDeviation || 0.1;

        const questionDiv = document.createElement('div');
        questionDiv.className = 'page active dynamic-question';

        questionDiv.innerHTML = `
            <div class="question-header">
                <h2>Question ${question.questionNumber}/20</h2>
            </div>
            <div class="navigation-buttons" style="margin-top:-10px">
                <button onclick="saveAnswer(${question.questionNumber}); navigatePage(${index - 1})" ${index === 0 ? 'disabled' : ''}>Back</button>
                <button onclick="saveAnswer(${question.questionNumber}); ${index === cachedQuestions.length - 1 ? 'navigatePage(-2)' : `navigatePage(${index + 1})`}">Next</button>
            </div>
            <div style="justify-items:center">
                <table class="image-table" style="width:1100px">
                    <thead>
                        <tr>
                            <th>Last Cycle</th>
                            <th>3% Strain Cycle</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><img width="200px" height="200px" src="${question.lastCycleImage}" alt="Last Cycle Image"></td>
                            <td><img width="200px" height="200px" src="${question.strainCycleImage}" alt="3% Strain Cycle Image"></td>
                        </tr>
                        <tr>
                            <td colspan="2" style="text-align: center;"><b>Number of Cycles:</b> ${question.cycleNumber}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div style="display:flex; margin-top:-40px">
                <div class="multiple-choice" style="padding-left:10%">
                    <p>Please select the behavior type:</p>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <label>Clay-like (0.03)</label>
                        <input type="range" id="slider_${question.questionNumber}" min="0.03" max="0.97" step="0.01" value="${savedSliderValue}" ${savedBehavior === "data not usable" ? "disabled" : ""}>
                        <label>Sand-like (0.97)</label>
                    </div>
                    <p>Current Value: 
                        <input type="number" id="slider_input_${question.questionNumber}" value="${savedSliderValue}" min="0.03" max="0.97" step="0.01" style="width: 60px;" ${savedBehavior === "data not usable" ? "disabled" : ""}>
                        <span id="mean_range_${question.questionNumber}" style="margin-left:10px; font-size: 14px; color: #888;"></span>
                    </p>
                    <label>
                        <input type="checkbox" name="behavior_${question.questionNumber}" value="data not usable" ${savedBehavior === "data not usable" ? "checked" : ""}>
                        Data is not usable
                    </label>
                    <div style="margin-top:10px">
                        <label><b>Standard Deviation:</b></label>
                        <input type="number" id="stddev_${question.questionNumber}" value="${savedStdDev}" min = "0.02" step="0.01" style="width:100px;" ${savedBehavior === "data not usable" ? "disabled" : ""}>
                        <span id="max_stddev_${question.questionNumber}" style="margin-left:10px; font-size: 14px; color: #888;"></span>
                    </div>
                </div>
                <div id="plot_${question.questionNumber}" style="width:500px;height:300px;margin:30px;"></div>
                <div class="comments-section" style="margin-right: auto; width: 400px;">
                    <h3>Comments</h3>
                    <textarea id="comments_${question.questionNumber}" rows="5" placeholder="Enter your comments here...">${savedComments}</textarea>
                </div>
            </div>
            <div class="navigation-buttons" style="margin-top:-10px">
                <button onclick="saveAnswer(${question.questionNumber}); navigatePage(${index - 1})" ${index === 0 ? 'disabled' : ''}>Back</button>
                <button onclick="saveAnswer(${question.questionNumber}); ${index === cachedQuestions.length - 1 ? 'navigatePage(-2)' : `navigatePage(${index + 1})`}">Next</button>
            </div>
        `;
        container.appendChild(questionDiv);

        const slider = document.getElementById(`slider_${question.questionNumber}`);
        const sliderInput = document.getElementById(`slider_input_${question.questionNumber}`);
        const stddevInput = document.getElementById(`stddev_${question.questionNumber}`);
        const radioButton = document.querySelector(`input[name="behavior_${question.questionNumber}"][value="data not usable"]`);

        const maxStdSpan = document.getElementById(`max_stddev_${question.questionNumber}`);

        function updateMaxStddevDisplay() {
            const mean = parseFloat(slider.value);
            if (!isNaN(mean) && mean > 0 && mean < 1) {
                const maxStdev = getMaxStd(mean);
                maxStdSpan.textContent = `(max: ${maxStdev.toFixed(3)})`;
            } else {
                maxStdSpan.textContent = "";
            }
        }

        function getMaxStd(mean) {
            let bestStd = 0;
            for (let alpha = 1.01; alpha <= 100; alpha += 0.05) {
                const beta = alpha * (1 - mean) / mean;
                if (beta <= 1) continue;
                const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
                const std = Math.sqrt(variance);
                if (std > bestStd) bestStd = std;
            }
            return bestStd;
        }
 

        slider.addEventListener('input', () => (sliderInput.value = slider.value));
        sliderInput.addEventListener('input', () => (slider.value = sliderInput.value));
        slider.addEventListener('input', updateMaxStddevDisplay);
        sliderInput.addEventListener('input', updateMaxStddevDisplay);
        updateMaxStddevDisplay();  // call once on load
        
        radioButton.addEventListener('change', (event) => {
            const isDisabled = event.target.checked;
            slider.disabled = isDisabled;
            sliderInput.disabled = isDisabled;
            stddevInput.disabled = isDisabled;
        });

    slider.addEventListener('input', () => {
        sliderInput.value = slider.value;
        plotBeta(question.questionNumber);
    });

    sliderInput.addEventListener('input', () => {
        slider.value = sliderInput.value;
        plotBeta(question.questionNumber);
    });

    stddevInput.addEventListener('input', () => {
        plotBeta(question.questionNumber);
    });
    plotBeta(question.questionNumber);
    } else {
        console.error(`Invalid page index: ${index}`);
    }

}


function plotBeta(questionNumber) {
    const meanInput = document.getElementById(`slider_${questionNumber}`);
    const stddevInput = document.getElementById(`stddev_${questionNumber}`);
    const plotDiv = document.getElementById(`plot_${questionNumber}`);

    if (!meanInput || !stddevInput || !plotDiv) return;

    const mean = parseFloat(meanInput.value);
    const stddev = parseFloat(stddevInput.value);

    if (isNaN(mean) || isNaN(stddev) || stddev <= 0 || mean <= 0 || mean >= 1) {
        // alert("Please provide a valid mean (0–1) and a positive standard deviation.");
        return;
    }

    const variance = stddev ** 2;

    // Compute alpha and beta parameters
    const common = (mean * (1 - mean) / variance - 1);
    const alpha = mean * common;
    const beta = (1 - mean) * common;

    if (alpha <= 1 || beta <= 1) {
        Plotly.newPlot(plotDiv, [{
            x: [0.5],
            y: [0.5],
            mode: 'text',
            text: [`Invalid parameters:<br>α = ${alpha.toFixed(2)}, β = ${beta.toFixed(2)}<br>Please adjust mean or std.`],
            textposition: 'middle center',
            type: 'scatter'
        }], {
            xaxis: { visible: false },
            yaxis: { visible: false },
            margin: { t: 10, r: 30 },
            showlegend: false
        });
        return;
    }

    const x = [];
    const y = [];

    for (let i = 0; i <= 1000; i++) {
        const xi = i / 1000;
        const yi = jStat.beta.pdf(xi, alpha, beta);
        x.push(xi);  // convert to percentage for plotting on 0–100 scale
        y.push(yi);
    }

    Plotly.newPlot(plotDiv, [
        {
            x: x,
            y: y,
            mode: 'lines',
            line: { color: 'black', width: 3 },
            name: `Beta PDF`,
        },
    ], {
        margin: { t: 10, r: 30 },
        xaxis: {
            title: 'Susceptibility',
            range: [-0.05, 1.05],
            tickmode: 'linear',
            tick0: 0,
            dtick: 0.1  // or 5 for finer ticks
        },
        yaxis: {
                title: 'Density',
                range: [0, Math.max(...y) * 1.1]
            },
        legend: {
            title: {
                    text: `Mean: ${mean.toFixed(2)} | Std: ${stddev.toFixed(2)}<br>Alpha: ${alpha.toFixed(2)} | Beta: ${beta.toFixed(2)}` },
            x: -0.2,
            y: -0.5
        },
        showlegend: true
    });
}


function saveAnswer(questionNumber) {
    const selectedBehavior = document.querySelector(`input[name="behavior_${questionNumber}"]:checked`);
    const slider = document.getElementById(`slider_${questionNumber}`);
    const commentInput = document.getElementById(`comments_${questionNumber}`);
    const stddevInput = document.getElementById(`stddev_${questionNumber}`);

    if (!responses[questionNumber]) {
        responses[questionNumber] = {};
    }

    if (selectedBehavior && selectedBehavior.value === "data not usable") {
        responses[questionNumber].behavior = "data not usable";
        responses[questionNumber].sliderValue = "";
        responses[questionNumber].standardDeviation = "";
    } else {
        responses[questionNumber].behavior = slider ? slider.value : "";
        responses[questionNumber].sliderValue = slider ? slider.value : "";
        responses[questionNumber].standardDeviation = stddevInput ? stddevInput.value.trim() : "";
    }

    responses[questionNumber].comments = commentInput ? commentInput.value.trim() : "";

    console.log(`Saved for Question ${questionNumber}:`, responses[questionNumber]);
}

function submitForm() {
    console.log(responses);
    const data = [];

    const researcherNameInput = document.getElementById("researcher-name");
    const researcherName = researcherNameInput ? researcherNameInput.value.trim() : "Researcher";

    data.push({
        Question: "Researcher Name",
        Answer: researcherName
    });

    Object.keys(responses).forEach(questionNumber => {
        const response = responses[questionNumber];
        if (response.behavior || response.comments || response.standardDeviation) {
            data.push({
                Question: `Question_Number_${questionNumber}_Behavior`,
                Answer: response.behavior || "No selection",
            });

            data.push({
                Question: `Question_Number_${questionNumber}_Comments`,
                Answer: response.comments || "No comments",
            });

            data.push({
                Question: `Question_Number_${questionNumber}_Standard_Deviation`,
                Answer: response.standardDeviation || "N/A",
            });
        }
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Responses");

    const fileName = `${researcherName.replace(/ /g, "_")}_Responses.xlsx`;

    XLSX.writeFile(workbook, fileName);
    alert("Your answers have been saved to an Excel file!");
}

function navigatePage(index) {
    console.log(`Navigating to index: ${index}`);
    if (index >= 0 && index < cachedQuestions.length) {
        renderPage(index);
    } else if (index === -1) {
        renderPage(-1);
    } else if (index === -2) {
        renderPage(-2);
    } else {
        console.error(`Invalid navigation request. Index: ${index}`);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const lastPage = document.getElementById('last_page');
    console.log("Last Page Test:", lastPage ? "Found" : "Missing");
    loadQuestions();
});